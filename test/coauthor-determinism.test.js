const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildFileStats } = require('../dist/core/gitParser.js');
const { scoreCursedFiles } = require('../dist/analyzers/curseScorer.js');

// --- co-author ownership credit ---

test('co-authors get ownership credit but do NOT inflate totalChanges', () => {
  const commits = [
    {
      hash: 'a',
      authorEmail: 'primary@example.com',
      authorName: 'Primary Dev',
      timestamp: 1700000000,
      filesChanged: ['src/app.ts'],
      coAuthors: [{ email: 'pair@example.com', name: 'Pair Dev' }],
    },
  ];
  const stats = buildFileStats(commits);
  const file = stats.get('src/app.ts');

  // the file changed ONCE — totalChanges must not double for two people
  assert.equal(file.totalChanges, 1, 'totalChanges should count commits, not authors');
  // but BOTH people own it
  assert.equal(file.uniqueAuthors.size, 2, 'both primary and co-author should be owners');
  assert.equal(file.authorChanges.get('primary@example.com'), 1);
  assert.equal(
    file.authorChanges.get('pair@example.com'),
    1,
    'co-author missing ownership credit',
  );
  // the timeline (curse-score input) reflects one change, not two
  assert.equal(file.changeTimeline.length, 1, 'co-author must not add a timeline entry');
});

test('a commit with no co-authors behaves exactly as before', () => {
  const commits = [
    {
      hash: 'b',
      authorEmail: 'solo@example.com',
      authorName: 'Solo',
      timestamp: 1700000000,
      filesChanged: ['src/x.ts'],
      // coAuthors omitted entirely
    },
  ];
  const stats = buildFileStats(commits);
  const file = stats.get('src/x.ts');
  assert.equal(file.totalChanges, 1);
  assert.equal(file.uniqueAuthors.size, 1);
});

test('a self-referential co-author trailer does not double-count', () => {
  // primary lists themselves as co-author (happens in some squash workflows)
  const commits = [
    {
      hash: 'c',
      authorEmail: 'dev@example.com',
      authorName: 'Dev',
      timestamp: 1700000000,
      filesChanged: ['src/y.ts'],
      coAuthors: [{ email: 'dev@example.com', name: 'Dev' }],
    },
  ];
  const stats = buildFileStats(commits);
  const file = stats.get('src/y.ts');
  assert.equal(
    file.authorChanges.get('dev@example.com'),
    1,
    'self co-author double-counted',
  );
  assert.equal(file.uniqueAuthors.size, 1);
});

// --- determinism via injected now ---

test('scoreCursedFiles is deterministic when now is pinned', () => {
  const commits = [];
  // build a file with enough history to exercise recency + acceleration
  for (let i = 0; i < 12; i++) {
    commits.push({
      hash: 'h' + i,
      authorEmail: `dev${i % 3}@example.com`,
      authorName: 'Dev ' + (i % 3),
      timestamp: 1650000000 + i * 1000000,
      filesChanged: ['src/churny.ts'],
      coAuthors: [],
    });
  }
  const stats = buildFileStats(commits);
  const pinned = 1700000000;

  const a = scoreCursedFiles(stats, 20, pinned);
  const b = scoreCursedFiles(stats, 20, pinned);

  assert.equal(a.length, b.length);
  assert.equal(
    a[0].curseScore,
    b[0].curseScore,
    'same pinned now must give identical score',
  );
});

test('a later now lowers an old file’s score (recency decay is real)', () => {
  const commits = [];
  for (let i = 0; i < 12; i++) {
    commits.push({
      hash: 'g' + i,
      authorEmail: `dev${i % 3}@example.com`,
      authorName: 'Dev ' + (i % 3),
      timestamp: 1650000000 + i * 100000,
      filesChanged: ['src/old.ts'],
      coAuthors: [],
    });
  }
  const stats = buildFileStats(commits);
  const lastChange = 1650000000 + 11 * 100000;

  const soonAfter = scoreCursedFiles(stats, 20, lastChange + 86400)[0].curseScore;
  const longAfter = scoreCursedFiles(stats, 20, lastChange + 5 * 365 * 86400)[0]
    .curseScore;

  assert.ok(longAfter < soonAfter, 'an older file should score lower as now advances');
});
