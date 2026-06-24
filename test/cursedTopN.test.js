const assert = require('node:assert/strict');
const test = require('node:test');
const { scoreCursedFiles } = require('../dist/analyzers/curseScorer');

function fileStats(n) {
  const map = new Map();
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < n; i++) {
    const fp = `src/file${i}.js`;
    const timeline = [];
    for (let j = 0; j < 10; j++) timeline.push(now - j * 86400);
    map.set(fp, {
      filepath: fp,
      totalChanges: 10 + i,
      uniqueAuthors: new Set(['a@a', 'b@b', 'c@c']),
      authorChanges: new Map([
        ['a@a', 5],
        ['b@b', 3],
        ['c@c', 2],
      ]),
      authorChangesByYear: new Map(),
      firstChanged: now - 200 * 86400,
      lastChanged: now,
      changeTimeline: timeline,
    });
  }
  return map;
}

test('scoreCursedFiles returns more than 20 when topN > 20', () => {
  const top50 = scoreCursedFiles(fileStats(40), 50);
  assert.ok(top50.length > 20, `expected >20, got ${top50.length}`);
});
test('scoreCursedFiles respects a small topN', () => {
  assert.equal(scoreCursedFiles(fileStats(40), 5).length, 5);
});
test('default topN is bounded at 20', () => {
  assert.equal(scoreCursedFiles(fileStats(40)).length, 20);
});
