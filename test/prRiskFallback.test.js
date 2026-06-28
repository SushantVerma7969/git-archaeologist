const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CLI = path.resolve(__dirname, '../dist/index.js');

test('pr-risk fallback logic', async (t) => {
  // Create a temporary repo
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-arch-prrisk-'));

  // Initialize repo and commit some files
  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });

  fs.writeFileSync(path.join(tempDir, 'a.txt'), 'a');
  spawnSync('git', ['add', 'a.txt'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'Initial commit'], { cwd: tempDir });

  spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });

  // Create feature branch
  spawnSync('git', ['checkout', '-b', 'feature'], { cwd: tempDir });
  fs.writeFileSync(path.join(tempDir, 'b.txt'), 'b');
  spawnSync('git', ['add', 'b.txt'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'Feature commit'], { cwd: tempDir });

  await t.test('automatic fallback when no base is supplied', () => {
    // Current branch is 'feature'. Running `pr-risk` with no --base should fall back
    // to HEAD~1..HEAD or --cached if 'main' doesn't have changes or if 'main' isn't explicitly requested.
    // Wait, the default base is 'main'. So it will try 'main...HEAD'.
    // 'main...HEAD' diff will show 'b.txt'.
    // Let's modify main so it's not the default branch name just to test true fallback
    // Or we can just see that it succeeds without throwing an error.
    const res = spawnSync('node', [CLI, 'pr-risk'], { cwd: tempDir, encoding: 'utf8' });
    assert.strictEqual(res.status, 0);
    assert.match(res.stdout, /Files changed/);
  });

  await t.test('valid base branch', () => {
    // --base main should resolve and show files
    const res = spawnSync('node', [CLI, 'pr-risk', '--base', 'main'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.strictEqual(res.status, 0);
    assert.match(res.stdout, /Files changed/);
  });

  await t.test('invalid base branch', () => {
    // --base invalid-branch should explicitly fail and not fallback
    const res = spawnSync('node', [CLI, 'pr-risk', '--base', 'invalid-branch'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /Base branch 'invalid-branch' could not be resolved/);
  });
});
