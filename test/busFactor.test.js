const assert = require('node:assert/strict');
const test = require('node:test');

const { analyzeBusFactor } = require('../dist/analyzers/busFactorAnalyzer');

function fileStats(filepath, authors) {
  return [
    filepath,
    {
      filepath,
      totalChanges: Object.values(authors).reduce((a, b) => a + b, 0),
      uniqueAuthors: new Set(Object.keys(authors)),
      authorChanges: new Map(Object.entries(authors)),
      authorChangesByYear: new Map(),
      firstChanged: 1,
      lastChanged: 2,
      changeTimeline: [],
    },
  ];
}

test('bus factor excludes non-source folders', () => {
  const map = new Map([
    fileStats('.claude/settings.json', { 'a@x.com': 10 }),
    fileStats('.circleci/config.yml', { 'a@x.com': 5 }),
    fileStats('vendor/lib.js', { 'a@x.com': 8 }),
    fileStats('src/index.ts', { 'a@x.com': 6, 'b@x.com': 4 }),
    fileStats('compiler/core.ts', { 'a@x.com': 9 }),
  ]);
  const names = new Map([
    ['a@x.com', 'A'],
    ['b@x.com', 'B'],
  ]);
  const scopes = analyzeBusFactor(map, names).map((r) => r.scope);
  assert.ok(scopes.includes('src'));
  assert.ok(scopes.includes('compiler'));
  for (const bad of ['.claude', '.circleci', 'vendor']) {
    assert.ok(!scopes.includes(bad), `${bad} should be excluded`);
  }
});
