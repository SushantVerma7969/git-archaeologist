#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const RISK_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const CATEGORY = {
  persistent: 'Persistent concentration',
  historical: 'Historical concentration',
  emerging: 'Emerging concentration',
  distributed: 'Persistently distributed',
  none: 'No recent activity',
  insufficient: 'Insufficient recent evidence',
};

function usage() {
  console.error(`Usage:
  node research/recency-calibration/scripts/parse-recency-results.js \\
    --input-dir <run-output-dir> \\
    [--output-json <file>] \\
    [--output-csv <file>]`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    args[key] = value;
    i += 1;
  }
  return args;
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function scopeFor(filepath) {
  const parts = filepath.split('/');
  return parts.length > 1 ? parts[0] : '(root)';
}

function loadBotFilter() {
  const toolRoot = path.resolve(__dirname, '..', '..', '..');
  try {
    return require(path.join(toolRoot, 'dist/utils/botFilter.js')).isBot;
  } catch {
    const botEmails = ['noreply', '[bot]', 'github-actions'];
    const botNames = [
      'angular robot',
      'renovate bot',
      'renovate',
      'dependabot',
      'github-actions',
      'github actions',
      'semantic-release-bot',
      'allcontributors',
    ];
    return (name, email) => {
      const n = String(name || '').toLowerCase();
      const e = String(email || '').toLowerCase();
      return botEmails.some((s) => e.includes(s)) || botNames.some((s) => n.includes(s));
    };
  }
}

function buildNameMap(analysis) {
  const names = new Map();
  for (const ownership of analysis.ownership || []) {
    for (const contributor of ownership.contributors || []) {
      if (!names.has(contributor.email)) names.set(contributor.email, contributor.name);
    }
    if (ownership.ownerEmail && ownership.owner && !names.has(ownership.ownerEmail)) {
      names.set(ownership.ownerEmail, ownership.owner);
    }
  }
  return names;
}

function summarizeScopes(analysis, isBot) {
  const names = buildNameMap(analysis);
  const scopes = new Map();
  const fileStats = analysis.fileStats || {};

  for (const stats of Object.values(fileStats)) {
    const scope = scopeFor(stats.filepath);
    if (!scopes.has(scope)) {
      scopes.set(scope, {
        scope,
        filePaths: 0,
        touches: 0,
        authorTotals: new Map(),
        names,
      });
    }
    const summary = scopes.get(scope);
    summary.filePaths += 1;
    const authorChanges = stats.authorChanges || {};
    for (const [email, count] of Object.entries(authorChanges)) {
      const name = names.get(email) || email;
      if (isBot(name, email)) continue;
      summary.touches += count;
      summary.authorTotals.set(email, (summary.authorTotals.get(email) || 0) + count);
    }
  }

  for (const summary of scopes.values()) {
    finishScope(summary);
  }
  return scopes;
}

function finishScope(summary) {
  const sorted = Array.from(summary.authorTotals.entries()).sort((a, b) => b[1] - a[1]);
  summary.identities = sorted.length;
  summary.topEmail = sorted[0] ? sorted[0][0] : '';
  summary.topName = summary.topEmail ? summary.names.get(summary.topEmail) || summary.topEmail : '';
  summary.concentration = summary.touches > 0 && sorted[0] ? sorted[0][1] / summary.touches : 0;
  summary.busFactor = calculateBusFactor(sorted, summary.touches);
  summary.risk = classifyRisk(summary.busFactor, summary.concentration);
  summary.concentrated = summary.risk === 'HIGH' || summary.risk === 'MEDIUM';
  summary.identityFragmentationSuspected = detectIdentityFragmentation(sorted, summary.names);
}

function calculateBusFactor(sorted, totalTouches) {
  if (totalTouches <= 0) return 0;
  let cumulative = 0;
  let busFactor = 0;
  for (const [, count] of sorted) {
    cumulative += count;
    busFactor += 1;
    if (cumulative / totalTouches >= 0.5) break;
  }
  return busFactor;
}

function classifyRisk(busFactor, concentration) {
  const percent = concentration * 100;
  if (busFactor === 1 && percent >= 80) return 'HIGH';
  if (busFactor === 1 || (busFactor === 2 && percent >= 50)) return 'MEDIUM';
  return 'LOW';
}

function detectIdentityFragmentation(sorted, names) {
  const normalized = new Map();
  for (const [email] of sorted) {
    const name = names.get(email);
    if (!name) continue;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!key) continue;
    if (!normalized.has(key)) normalized.set(key, new Set());
    normalized.get(key).add(email);
  }
  return Array.from(normalized.values()).some((emails) => emails.size > 1);
}

function categoryFor(lifetime, recent) {
  if (!recent || recent.touches === 0) return CATEGORY.none;
  if (recent.touches < 10) return CATEGORY.insufficient;
  if (lifetime.concentrated && recent.concentrated) return CATEGORY.persistent;
  if (lifetime.concentrated && !recent.concentrated) return CATEGORY.historical;
  if (!lifetime.concentrated && recent.concentrated) return CATEGORY.emerging;
  return CATEGORY.distributed;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(file, rows, fields) {
  const lines = [fields.join(',')];
  for (const row of rows) {
    lines.push(fields.map((field) => csvEscape(row[field])).join(','));
  }
  fs.writeFileSync(file, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args['input-dir']) throw new Error('Missing required argument --input-dir');

  const inputDir = path.resolve(args['input-dir']);
  const outputJson = path.resolve(args['output-json'] || path.join(inputDir, 'recency-study.json'));
  const outputCsv = path.resolve(args['output-csv'] || path.join(inputDir, 'recency-study.csv'));
  const metadata = loadJson(path.join(inputDir, 'metadata.json'));
  const lifetime = loadJson(path.join(inputDir, 'lifetime-analysis.json'));
  const recent = loadJson(path.join(inputDir, 'recent-analysis.json'));
  const isBot = loadBotFilter();

  const lifetimeScopes = summarizeScopes(lifetime, isBot);
  const recentScopes = summarizeScopes(recent, isBot);
  const rows = [];

  for (const lifetimeScope of Array.from(lifetimeScopes.values()).sort((a, b) => a.scope.localeCompare(b.scope))) {
    if (lifetimeScope.filePaths < 3) continue;
    const recentScope = recentScopes.get(lifetimeScope.scope);
    const category = categoryFor(lifetimeScope, recentScope);
    const recentRisk = recentScope && recentScope.touches > 0 ? recentScope.risk : '';
    const lifetimeRisk = lifetimeScope.risk;
    rows.push({
      repository: metadata.repository,
      repository_sha: metadata.repositorySha,
      tool_sha: metadata.toolSha,
      cutoff_utc: metadata.cutoffDate,
      scope: lifetimeScope.scope,
      lifetime_file_paths: lifetimeScope.filePaths,
      recent_file_paths: recentScope ? recentScope.filePaths : 0,
      lifetime_touches: lifetimeScope.touches,
      recent_touches: recentScope ? recentScope.touches : 0,
      lifetime_identities: lifetimeScope.identities,
      recent_identities: recentScope ? recentScope.identities : 0,
      lifetime_top_email: lifetimeScope.topEmail,
      recent_top_email: recentScope ? recentScope.topEmail : '',
      lifetime_top_name: lifetimeScope.topName,
      recent_top_name: recentScope ? recentScope.topName : '',
      lifetime_concentration: lifetimeScope.concentration,
      recent_concentration: recentScope ? recentScope.concentration : 0,
      lifetime_bus_factor: lifetimeScope.busFactor,
      recent_bus_factor: recentScope ? recentScope.busFactor : 0,
      lifetime_risk: lifetimeRisk,
      recent_risk: recentRisk,
      category,
      top_identity_changed: Boolean(recentScope && lifetimeScope.topEmail !== recentScope.topEmail),
      bus_factor_changed: Boolean(recentScope && lifetimeScope.busFactor !== recentScope.busFactor),
      risk_level_increased: Boolean(recentRisk && RISK_ORDER[recentRisk] > RISK_ORDER[lifetimeRisk]),
      risk_level_decreased: Boolean(recentRisk && RISK_ORDER[recentRisk] < RISK_ORDER[lifetimeRisk]),
      identity_fragmentation_suspected: Boolean(
        lifetimeScope.identityFragmentationSuspected ||
          (recentScope && recentScope.identityFragmentationSuspected)
      ),
      notes: '',
    });
  }

  const fields = [
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

  fs.writeFileSync(outputJson, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  writeCsv(outputCsv, rows, fields);
  console.log(`Wrote ${rows.length} rows`);
  console.log(outputJson);
  console.log(outputCsv);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}
