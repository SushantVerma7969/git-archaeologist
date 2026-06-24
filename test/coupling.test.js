const assert = require('node:assert/strict');
const test = require('node:test');

const { analyzeCoupling } = require('../dist/analyzers/busFactorAnalyzer');

// Build N commits that always change the given files together.
function coupledCommits(files, n) {
  return Array.from({ length: n }, () => ({ filesChanged: files }));
}

test('pairs below the co-change threshold are excluded', () => {
  // 4 co-changes < threshold of 5
  const result = analyzeCoupling(coupledCommits(['src/a.ts', 'src/b.ts'], 4));
  assert.equal(result.length, 0);
});

test('genuinely coupled source files surface', () => {
  const result = analyzeCoupling(coupledCommits(['src/a.ts', 'src/b.ts'], 10));
  assert.equal(result.length, 1);
  assert.equal(result[0].coChanges, 10);
});

test('test fixtures and snapshots are excluded even under source folders', () => {
  const cases = [
    ['compiler/__tests__/fixtures/x.expect.md', 'compiler/__tests__/fixtures/y.expect.md'],
    ['src/__snapshots__/a.snap', 'src/__snapshots__/b.snap'],
    ['src/a.test.ts', 'src/b.test.ts'],
    ['packages/fixtures/a.js', 'packages/fixtures/b.js'],
  ];
  for (const files of cases) {
    assert.equal(analyzeCoupling(coupledCommits(files, 20)).length, 0, files.join(' / '));
  }
});

test('non-source scopes are excluded from coupling', () => {
  const result = analyzeCoupling(coupledCommits(['.github/a.yml', '.github/b.yml'], 20));
  assert.equal(result.length, 0);
});

test('higher co-change count breaks ties at equal score', () => {
  const commits = [
    ...coupledCommits(['src/a.ts', 'src/b.ts'], 30), // 30/30 = 100%
    ...coupledCommits(['src/c.ts', 'src/d.ts'], 6),  // 6/6 = 100%
  ];
  const result = analyzeCoupling(commits);
  // Both 100%, but the 30-co-change pair ranks first.
  assert.equal(result[0].coChanges, 30);
});
