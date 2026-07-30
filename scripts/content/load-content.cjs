const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const YAML = require('yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTENT_ROOT = path.join(ROOT, 'content');
const SCHEMA_ROOT = path.join(ROOT, 'schemas');
const HTML_TAG = /<\/?[A-Za-z][^>]*>/;
const HTML_ENTITY = /&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);/i;
const MARKDOWN_LINK = /!?\[[^\]]+\]\([^)]+\)/;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readYaml(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const document = YAML.parseDocument(source, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });

  if (document.errors.length) {
    const details = document.errors.map((error) => error.message).join('\n');
    throw new Error(`${relativePath}: invalid YAML\n${details}`);
  }

  return document.toJS({ maxAliasCount: 0 });
}

function formatAjvErrors(errors) {
  return (errors || []).map((error) => {
    const location = error.instancePath || '/';
    return `  ${location} ${error.message}`;
  }).join('\n');
}

function createValidators() {
  const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
  ajv.addFormat('https-url', {
    type: 'string',
    validate(value) {
      if (/['"\u0000-\u001f\u007f]/.test(value)) return false;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && Boolean(url.hostname);
      } catch (_error) {
        return false;
      }
    },
  });
  ajv.addFormat('map-query', {
    type: 'string',
    validate(value) {
      return value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value);
    },
  });
  return {
    about: ajv.compile(readJson('schemas/about.schema.json')),
    github: ajv.compile(readJson('schemas/github.schema.json')),
    resume: ajv.compile(readJson('schemas/resume.schema.json')),
    portfolioIndex: ajv.compile(readJson('schemas/portfolio-index.schema.json')),
    portfolioProject: ajv.compile(readJson('schemas/portfolio-project.schema.json')),
    greeceIndex: ajv.compile(readJson('schemas/greece-index.schema.json')),
    greeceSection: ajv.compile(readJson('schemas/greece-section.schema.json')),
  };
}

function validate(validator, value, relativePath) {
  if (!validator(value)) {
    throw new Error(`${relativePath}: content does not match its schema\n${formatAjvErrors(validator.errors)}`);
  }
}

function listYaml(relativeDirectory) {
  return fs.readdirSync(path.join(ROOT, relativeDirectory))
    .filter((name) => name.endsWith('.yml'))
    .sort();
}

function walkStrings(value, visit, trail = []) {
  if (typeof value === 'string') {
    visit(value, trail);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkStrings(entry, visit, trail.concat(index)));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => walkStrings(entry, visit, trail.concat(key)));
  }
}

function rejectMarkup(value, relativePath) {
  walkStrings(value, (text, trail) => {
    if (HTML_TAG.test(text) || HTML_ENTITY.test(text)) {
      throw new Error(`${relativePath}:${trail.join('.')}: use Markdown and natural Unicode, not HTML or entities`);
    }
  });
}

function rejectNestedLinkText(text, relativePath, trail) {
  if (MARKDOWN_LINK.test(text)) {
    throw new Error(`${relativePath}:${trail}: a full-card link cannot contain another Markdown link`);
  }
}

function checkGreeceBlocks(blocks, relativePath, trail = 'body') {
  blocks.forEach((block, index) => {
    const current = `${trail}[${index}]`;
    if (block.type === 'card') checkGreeceBlocks(block.blocks, relativePath, `${current}.blocks`);

    if (block.type === 'chips') {
      block.items.forEach((item, itemIndex) => {
        if (item.url || item.map) rejectNestedLinkText(item.text, relativePath, `${current}.items[${itemIndex}].text`);
      });
    }

    if (block.type === 'venues') {
      block.items.forEach((item, itemIndex) => {
        rejectNestedLinkText(item.name, relativePath, `${current}.items[${itemIndex}].name`);
        rejectNestedLinkText(item.description, relativePath, `${current}.items[${itemIndex}].description`);
      });
    }

    if (block.type === 'sights') {
      block.items.forEach((item, itemIndex) => {
        if (item.url || item.map) {
          rejectNestedLinkText(item.name, relativePath, `${current}.items[${itemIndex}].name`);
          rejectNestedLinkText(item.description, relativePath, `${current}.items[${itemIndex}].description`);
        }
        if (item.links) {
          item.links.forEach((link, linkIndex) => {
            rejectNestedLinkText(
              link.label,
              relativePath,
              `${current}.items[${itemIndex}].links[${linkIndex}].label`
            );
          });
        }
      });
    }
  });
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function loadSingle(validators, name) {
  const relativePath = `content/${name}.yml`;
  const value = readYaml(relativePath);
  validate(validators[name], value, relativePath);
  rejectMarkup(value, relativePath);
  return value;
}

/* The portfolio is optional. An absent or empty content/portfolio/ directory
   disables the route everywhere rather than rendering an empty page: this
   returns null, scripts/content/routes.cjs drops /portfolio, and the shell
   omits the section and its nav entries. The schema, renderer, theme map,
   icons, and card styles all stay in place, so restoring the directory with
   an index.yml and one project file brings the page back unchanged. */
function loadPortfolio(validators) {
  const directory = 'content/portfolio';
  if (!fs.existsSync(path.join(ROOT, directory))) return null;

  const files = listYaml(directory);
  if (!files.length) return null;
  if (!files.includes('index.yml')) {
    throw new Error(`${directory} has project files but no index.yml; add one, or empty the directory to disable the portfolio`);
  }

  const indexPath = `${directory}/index.yml`;
  const meta = readYaml(indexPath);
  validate(validators.portfolioIndex, meta, indexPath);
  rejectMarkup(meta, indexPath);

  const authoredFiles = files.filter((name) => name !== 'index.yml');
  const expectedFiles = meta.projects.map((slug) => `${slug}.yml`).sort();
  if (authoredFiles.join('\n') !== expectedFiles.join('\n')) {
    throw new Error(`${indexPath} must reference every project file exactly once`);
  }

  const projects = meta.projects.map((slug) => {
    const relativePath = `${directory}/${slug}.yml`;
    const project = readYaml(relativePath);
    validate(validators.portfolioProject, project, relativePath);
    rejectMarkup(project, relativePath);
    if (project.id !== slug) throw new Error(`${relativePath}: id must match the filename`);
    if (project.details) assertUnique(project.details.map((detail) => detail.id), `${project.id} detail id`);
    return project;
  });

  return { ...meta, projects };
}

function loadGreece(validators) {
  const indexPath = 'content/greece/index.yml';
  const meta = readYaml(indexPath);
  validate(validators.greeceIndex, meta, indexPath);
  rejectMarkup(meta, indexPath);

  const sections = listYaml('content/greece')
    .filter((name) => name !== 'index.yml')
    .map((name) => {
      const relativePath = `content/greece/${name}`;
      const section = readYaml(relativePath);
      validate(validators.greeceSection, section, relativePath);
      rejectMarkup(section, relativePath);
      if (`${section.id}.yml` !== name) throw new Error(`${relativePath}: id must match the filename`);
      checkGreeceBlocks(section.body, relativePath);
      return section;
    })
    .sort((left, right) => left.order - right.order);

  assertUnique(sections.map((section) => section.id), 'Greece section id');
  assertUnique(sections.map((section) => section.order), 'Greece section order');

  const firstIslandIndex = sections.findIndex((section) => section.kind === 'island');
  if (firstIslandIndex < 0) throw new Error('The Greece guide must contain at least one island section');

  return { meta, sections, firstIslandIndex };
}

function loadContent() {
  if (!fs.existsSync(CONTENT_ROOT)) throw new Error('Missing content directory');
  const validators = createValidators();
  return {
    about: loadSingle(validators, 'about'),
    github: loadSingle(validators, 'github'),
    resume: loadSingle(validators, 'resume'),
    portfolio: loadPortfolio(validators),
    greece: loadGreece(validators),
  };
}

module.exports = { loadContent };
