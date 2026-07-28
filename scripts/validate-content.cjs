#!/usr/bin/env node
const { loadContent } = require('./content/load-content.cjs');

try {
  const content = loadContent();
  const portfolio = content.portfolio
    ? `${content.portfolio.projects.length} portfolio projects`
    : 'no portfolio (route disabled)';
  console.log(
    `Content is valid: About, GitHub, Resume, ${portfolio}, `
      + `${content.greece.sections.length} Greece sections.`,
  );
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
