#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_FIELDS = [
  'repository',
  'repository_sha',
  'tool_sha',
  'cutoff_utc',
  'scope',
  'lifetime_file_paths',
  'recent_file_paths',
  'lifetime_touches',
  'recent_touches',
  'lifetime_identities',
  'recent_identities',
  'lifetime_top_email',
  'recent_top_email',
  'lifetime_top_name',
  'recent_top_name',
  'lifetime_concentration',
  'recent_concentration',
  'lifetime_bus_factor',
  'recent_bus_factor',
  'lifetime_risk',
  'recent_risk',
  'category',
  'top_identity_changed',
  'bus_factor_changed',
  'risk_level_increased',
  'risk_level_decreased',
  'identity_fragmentation_suspected',
  'notes',
];

function usage() {
  console.error('Usage: node research/recency-study/aggregate-results.js [runs-dir]');
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function findResultFiles(runsDir) {
  if (!fs.existsSync(runsDir)) return [];
  return fs.readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(runsDir, entry.name, 'recency-study.json'))
    .filter((file) => fs.existsSync(file))
    .sort();
}

function main() {
  const studyDir = __dirname;
  const runsDir = path.resolve(process.argv[2] || path.join(studyDir, 'runs'));
  const resultFiles = findResultFiles(runsDir);
  const rows = [];

  for (const file of resultFiles) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected array in ${file}`);
    }
    rows.push(...parsed);
  }

  const fieldSet = new Set(DEFAULT_FIELDS);
  for (const row of rows) {
    for (const field of Object.keys(row)) {
      fieldSet.add(field);
    }
  }
  const fields = [
    ...DEFAULT_FIELDS,
    ...Array.from(fieldSet).filter((field) => !DEFAULT_FIELDS.includes(field)).sort(),
  ];

  const jsonPath = path.join(studyDir, 'master-recency-study.json');
  const csvPath = path.join(studyDir, 'master-recency-study.csv');
  fs.writeFileSync(jsonPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

  const lines = [fields.join(',')];
  for (const row of rows) {
    lines.push(fields.map((field) => csvEscape(row[field])).join(','));
  }
  fs.writeFileSync(csvPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`Aggregated ${rows.length} rows from ${resultFiles.length} repositories`);
  console.log(jsonPath);
  console.log(csvPath);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}
