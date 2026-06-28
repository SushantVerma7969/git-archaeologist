const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  parseCommits,
  buildFileStats,
  buildRenameMap,
} = require('../dist/core/gitParser.js');

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-rename-'));
  const git = (args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  git(['init', '-q']);
  git(['config', 'user.name', 'Dev']);
  git(['config', 'user.email', 'dev@example.com']);
  return { dir, git };
}

function write(dir, file, content) {
  fs.writeFileSync(path.join(dir, file), content);
}

test('a renamed file folds its full history onto the final path', async () => {
  const { dir, git } = makeRepo();
  write(dir, 'old.js', 'v1');
  git(['add', '-A']);
  git(['commit', '-qm', 'create']);
  write(dir, 'old.js', 'v2');
  git(['commit', '-qam', 'edit']);
  write(dir, 'old.js', 'v3');
  git(['commit', '-qam', 'edit']);
  git(['mv', 'old.js', 'new.js']);
  git(['commit', '-qm', 'rename']);
  write(dir, 'new.js', 'v4');
  git(['commit', '-qam', 'edit']);

  const follow = buildFileStats(await parseCommits(dir));
  assert.equal(follow.get('old.js'), undefined, 'old path should be folded away');
  // 3 edits as old.js + the rename commit + 1 edit as new.js = 5
  assert.equal(follow.get('new.js').totalChanges, 5, 'history not fully folded');
});

test('followRenames=false preserves the old split-history behavior', async () => {
  const { dir, git } = makeRepo();
  write(dir, 'old.js', 'v1');
  git(['add', '-A']);
  git(['commit', '-qm', 'create']);
  write(dir, 'old.js', 'v2');
  git(['commit', '-qam', 'edit']);
  git(['mv', 'old.js', 'new.js']);
  git(['commit', '-qm', 'rename']);
  write(dir, 'new.js', 'v3');
  git(['commit', '-qam', 'edit']);

  const split = buildFileStats(await parseCommits(dir, undefined, false));
  assert.ok(split.get('old.js'), 'old.js should still exist when not following renames');
  assert.ok(split.get('new.js'), 'new.js should exist separately');
});

test('a rename chain a->b->c resolves all the way to c', async () => {
  const { dir, git } = makeRepo();
  write(dir, 'a.js', 'x');
  git(['add', '-A']);
  git(['commit', '-qm', 'create a']);
  git(['mv', 'a.js', 'b.js']);
  git(['commit', '-qm', 'a to b']);
  git(['mv', 'b.js', 'c.js']);
  git(['commit', '-qm', 'b to c']);
  write(dir, 'c.js', 'y');
  git(['commit', '-qam', 'edit c']);

  const map = await buildRenameMap(dir);
  assert.equal(map.get('a.js'), 'c.js', 'chain a->b->c should resolve a to c');
  assert.equal(map.get('b.js'), 'c.js', 'chain a->b->c should resolve b to c');

  const stats = buildFileStats(await parseCommits(dir));
  assert.equal(stats.get('a.js'), undefined);
  assert.equal(stats.get('b.js'), undefined);
  // create + 2 renames + 1 edit = 4, all on c.js
  assert.equal(
    stats.get('c.js').totalChanges,
    4,
    'full chain history should land on c.js',
  );
});

test('buildRenameMap returns empty on a repo with no renames', async () => {
  const { dir, git } = makeRepo();
  write(dir, 'stable.js', 'x');
  git(['add', '-A']);
  git(['commit', '-qm', 'create']);
  write(dir, 'stable.js', 'y');
  git(['commit', '-qam', 'edit']);

  const map = await buildRenameMap(dir);
  assert.equal(map.size, 0, 'no renames should produce an empty map');
});
