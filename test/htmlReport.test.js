const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { generateHtmlReport } = require('../dist/output/htmlReport');

function emptyResult() {
  return {
    repoPath: '/tmp/x',
    repoName: 'x',
    analyzedAt: new Date(),
    totalCommits: 0,
    totalFiles: 0,
    totalAuthors: 0,
    dateRange: { from: new Date(0), to: new Date(0) },
    cursedFiles: [],
    ownership: [],
    busFactor: [],
    coupling: [],
    fileStats: new Map(),
    lastActiveByAuthor: new Map(),
  };
}

function writeReport(temporalRisks, extras) {
  const out = path.join(
    os.tmpdir(),
    `ga-html-${Date.now()}-${Math.random().toString(36).slice(2)}.html`,
  );
  generateHtmlReport(emptyResult(), out, temporalRisks, extras);
  const html = fs.readFileSync(out, 'utf8');
  fs.unlinkSync(out);
  return html;
}

test('generates a report without throwing on a temporal result', () => {
  const html = writeReport(
    [
      {
        scope: 'lib',
        category: 'Persistent concentration',
        lifetime: { level: 'HIGH', concentration: 90 },
        recent: { level: 'HIGH', concentration: 92 },
        recentTouches: 50,
        delta: 2,
        trend: 'rising',
      },
    ],
    {
      evolutionSummary: {
        ownershipTransitions: 1,
        highSeverityTransitions: 0,
        emergingConcentration: 0,
        historicalConcentration: 0,
        persistentConcentration: 1,
        distributedScopes: 0,
      },
      hotspots: [],
    },
  );
  assert.ok(html.includes('Temporal Risk Analysis'));
  assert.ok(html.includes('lib'));
});

test('escapes scope and category names to prevent HTML injection', () => {
  const html = writeReport(
    [
      {
        scope: '<img src=x onerror=alert(1)>',
        category: '<script>bad()</script>',
        lifetime: { level: 'HIGH', concentration: 90 },
        recent: null,
        recentTouches: 0,
        delta: null,
        trend: 'stable',
      },
    ],
    undefined,
  );
  // Raw injection must not survive into the document.
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.ok(!html.includes('<script>bad()</script>'));
  // Escaped forms should be present instead.
  assert.ok(html.includes('&lt;img src=x'));
});

test('escapes hotspot scope and signal reasons', () => {
  const html = writeReport(undefined, {
    hotspots: [
      {
        signalsFired: 2,
        scope: '<b>x</b>',
        signals: [{ name: 'churn', reason: '<i>reason</i>' }],
      },
    ],
  });
  assert.ok(html.includes('Maintenance Hotspots'));
  assert.ok(!html.includes('<b>x</b>'));
  assert.ok(!html.includes('<i>reason</i>'));
  assert.ok(html.includes('&lt;b&gt;x'));
});

test('omits temporal and hotspot sections when no data is supplied', () => {
  const html = writeReport(undefined, undefined);
  assert.ok(!html.includes('Temporal Risk Analysis'));
  assert.ok(!html.includes('Maintenance Hotspots'));
});
