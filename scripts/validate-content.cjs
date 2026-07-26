#!/usr/bin/env node
const { loadContent } = require('./content/load-content.cjs');

try {
  const content = loadContent();
  console.log(
    `Content is valid: About, GitHub, Resume, ${content.portfolio.projects.length} portfolio projects, `
      + `${content.greece.sections.length} Greece sections.`,
  );
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
