const assert = require('node:assert/strict');
const test = require('node:test');
const { scorePrRisk, MIN_COMMITS_FOR_BLAST } = require('../dist/pr-risk-core');

const commit = (files) => ({
  hash: 'h',
  authorEmail: 'a@a',
  authorName: 'A',
  timestamp: 1,
  filesChanged: files,
});

test('headline score is the WORST file, not the average (landmine not diluted)', () => {
  const changedFiles = ['hot.js', ...Array.from({ length: 18 }, (_, i) => `new${i}.js`)];
  const cursedFiles = [
    {
      filepath: 'hot.js',
      curseScore: 1600,
      totalChanges: 40,
      uniqueAuthors: 5,
      recencyWeight: 1,
      reasons: [],
    },
  ];
  const busFactor = [
    { scope: '(root)', busFactor: 1, atRiskAuthors: ['A'], filesAtRisk: 1, warning: '' },
  ];
  const commits = Array.from({ length: 40 }, () => commit(['hot.js']));
  const r = scorePrRisk({ changedFiles, commits, cursedFiles, busFactor });
  assert.equal(r.highRiskFiles[0].file, 'hot.js');
  assert.ok(r.score >= 40, `expected >=40, got ${r.score}`);
  assert.notEqual(r.level, 'LOW', 'a PR with a landmine must not be LOW');
});

test('a brand-new file (< MIN_COMMITS_FOR_BLAST) emits no blast signal', () => {
  const born = commit(['a.js', 'b.js', 'c.js', 'd.js', 'e.js']);
  const r = scorePrRisk({
    changedFiles: ['a.js'],
    commits: [born],
    cursedFiles: [],
    busFactor: [],
  });
  assert.ok(MIN_COMMITS_FOR_BLAST >= 2);
  assert.equal(
    r.highRiskFiles.find((f) => f.file === 'a.js'),
    undefined,
  );
  assert.ok(r.safeFiles.includes('a.js'));
});

test('multiple risky files: headline is the worst, sorted desc', () => {
  const changedFiles = ['med.js', 'bad.js', 'safe.js'];
  const cursedFiles = [
    {
      filepath: 'med.js',
      curseScore: 600,
      totalChanges: 20,
      uniqueAuthors: 3,
      recencyWeight: 1,
      reasons: [],
    },
    {
      filepath: 'bad.js',
      curseScore: 1600,
      totalChanges: 40,
      uniqueAuthors: 5,
      recencyWeight: 1,
      reasons: [],
    },
  ];
  const r = scorePrRisk({ changedFiles, commits: [], cursedFiles, busFactor: [] });
  assert.equal(r.highRiskFiles.length, 2);
  assert.equal(r.highRiskFiles[0].file, 'bad.js');
  assert.equal(r.score, r.highRiskFiles[0].risk);
  assert.ok(r.safeFiles.includes('safe.js'));
});

test('level thresholds: <40 LOW, 40-74 MEDIUM', () => {
  const mk = (curse) => ({
    filepath: 'f.js',
    curseScore: curse,
    totalChanges: 10,
    uniqueAuthors: 2,
    recencyWeight: 1,
    reasons: [],
  });
  const bf1 = [
    { scope: '(root)', busFactor: 1, atRiskAuthors: ['A'], filesAtRisk: 1, warning: '' },
  ];
  assert.equal(
    scorePrRisk({
      changedFiles: ['f.js'],
      commits: [],
      cursedFiles: [mk(600)],
      busFactor: [],
    }).level,
    'LOW',
  );
  assert.equal(
    scorePrRisk({
      changedFiles: ['f.js'],
      commits: [],
      cursedFiles: [mk(600)],
      busFactor: bf1,
    }).level,
    'MEDIUM',
  );
});

test('empty / all-safe PR scores LOW with zero', () => {
  const r = scorePrRisk({
    changedFiles: ['s1.js', 's2.js'],
    commits: [commit(['s1.js'])],
    cursedFiles: [],
    busFactor: [],
  });
  assert.equal(r.score, 0);
  assert.equal(r.level, 'LOW');
});
