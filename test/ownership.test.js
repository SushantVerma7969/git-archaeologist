const assert = require('node:assert/strict');
const test = require('node:test');

const { analyzeOwnership } = require('../dist/analyzers/ownershipAnalyzer');

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
const names = new Map([
  ['a@x.com', 'A'],
  ['b@x.com', 'B'],
  ['c@x.com', 'C'],
]);

test('single-author files are excluded (no concentration signal)', () => {
  const map = new Map([fileStats('src/solo.ts', { 'a@x.com': 20 })]);
  assert.equal(analyzeOwnership(map, names).length, 0);
});

test('files with too little history are excluded', () => {
  const map = new Map([fileStats('src/tiny.ts', { 'a@x.com': 3, 'b@x.com': 1 })]);
  assert.equal(analyzeOwnership(map, names).length, 0);
});

test('non-source files are excluded from ownership', () => {
  const map = new Map([
    fileStats('fixtures/a.js', { 'a@x.com': 10, 'b@x.com': 5 }),
    fileStats('.github/workflows/ci.yml', { 'a@x.com': 8, 'b@x.com': 4 }),
  ]);
  assert.equal(analyzeOwnership(map, names).length, 0);
});

test('contested, substantive source files surface, ranked by dominant volume', () => {
  const map = new Map([
    fileStats('src/big.ts', { 'a@x.com': 80, 'b@x.com': 20 }), // owner volume 80
    fileStats('src/small.ts', { 'b@x.com': 9, 'a@x.com': 1 }), // owner volume 9, 90%
  ]);
  const result = analyzeOwnership(map, names);
  assert.equal(result.length, 2);
  // Ranked by dominant contributor's raw volume, not raw percent:
  // big.ts (80 changes at 80%) outranks small.ts (9 changes at 90%).
  assert.equal(result[0].filepath, 'src/big.ts');
  assert.equal(result[1].filepath, 'src/small.ts');
  // Co-contributors are present, so the table won't show "—".
  assert.ok(result[0].contributors.length >= 2);
});
