const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { validateRepo } = require('../dist/core/gitParser');

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// R-1: a freshly `git init`'d repo has no commits. Previously every command
// crashed with a raw `git rev-list --count HEAD` failure; validateRepo must now
// fail with a clear, actionable message instead.

test('validateRepo rejects a non-git directory', () => {
  const dir = tmpDir('ga-nogit-');
  assert.throws(() => validateRepo(dir), /Not a valid git repository/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('validateRepo rejects a git repo with no commits', () => {
  const dir = tmpDir('ga-empty-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  assert.throws(() => validateRepo(dir), /no commits yet/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('validateRepo accepts a repo with at least one commit', () => {
  const dir = tmpDir('ga-ok-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'a@b.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-qm', 'c1'], { cwd: dir });
  assert.doesNotThrow(() => validateRepo(dir));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('validateRepo rejects a shallow clone', () => {
  const dir = tmpDir('ga-shallow-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'a@b.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-qm', 'c1'], { cwd: dir });

  const hash = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir }).toString().trim();

  // Fake a shallow clone by writing a valid hash to .git/shallow
  fs.writeFileSync(path.join(dir, '.git', 'shallow'), hash + '\n');

  assert.throws(() => validateRepo(dir), /shallow clone/i);
  fs.rmSync(dir, { recursive: true, force: true });
});
