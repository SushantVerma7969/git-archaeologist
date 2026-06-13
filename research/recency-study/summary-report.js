#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const CATEGORIES = [
  'Persistent concentration',
  'Historical concentration',
  'Emerging concentration',
  'Persistently distributed',
  'No recent activity',
  'Insufficient recent evidence',
];

function usage() {
  console.error('Usage: node research/recency-study/summary-report.js [runs-dir]');
}

function loadRows(studyDir, runsDir) {
  const masterJson = path.join(studyDir, 'master-recency-study.json');
  if (fs.existsSync(masterJson)) {
    return JSON.parse(fs.readFileSync(masterJson, 'utf8'));
  }

  if (!fs.existsSync(runsDir)) return [];
  const rows = [];
  const files = fs.readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(runsDir, entry.name, 'recency-study.json'))
    .filter((file) => fs.existsSync(file))
    .sort();

  for (const file of files) {
    rows.push(...JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  return rows;
}

function countTrue(rows, field) {
  return rows.filter((row) => row[field] === true || row[field] === 'true').length;
}

function main() {
  const studyDir = __dirname;
  const runsDir = path.resolve(process.argv[2] || path.join(studyDir, 'runs'));
  const rows = loadRows(studyDir, runsDir);
  const repositories = Array.from(new Set(rows.map((row) => row.repository))).sort();
  const categoryCounts = new Map(CATEGORIES.map((category) => [category, 0]));

  for (const row of rows) {
    if (!categoryCounts.has(row.category)) {
      categoryCounts.set(row.category, 0);
    }
    categoryCounts.set(row.category, categoryCounts.get(row.category) + 1);
  }

  const lines = [
    '# Recency Study Summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Coverage',
    '',
    `- Repositories analyzed: ${repositories.length}`,
    `- Scopes analyzed: ${rows.length}`,
    '',
    '## Repositories',
    '',
    ...repositories.map((repository) => `- ${repository}`),
    '',
    '## Category Counts',
    '',
    ...CATEGORIES.map((category) => `- ${category}: ${categoryCounts.get(category) || 0}`),
    '',
    '## Change Counts',
    '',
    `- Top identity changes: ${countTrue(rows, 'top_identity_changed')}`,
    `- Bus factor changes: ${countTrue(rows, 'bus_factor_changed')}`,
    `- Risk increases: ${countTrue(rows, 'risk_level_increased')}`,
    `- Risk decreases: ${countTrue(rows, 'risk_level_decreased')}`,
    '',
  ];

  const summaryPath = path.join(studyDir, 'summary.md');
  fs.writeFileSync(summaryPath, `${lines.join('\n')}`, 'utf8');
  console.log(summaryPath);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}
