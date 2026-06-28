const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { parseCommits } = require('../dist/core/gitParser');

test('path filtering regression', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-arch-path-'));

  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });

  // Commit 1: fileA
  fs.writeFileSync(path.join(tempDir, 'fileA.txt'), 'A1');
  spawnSync('git', ['add', 'fileA.txt'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'Add A'], { cwd: tempDir });

  // Commit 2: fileB
  fs.writeFileSync(path.join(tempDir, 'fileB.txt'), 'B1');
  spawnSync('git', ['add', 'fileB.txt'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'Add B'], { cwd: tempDir });

  // Commit 3: fileA again
  fs.writeFileSync(path.join(tempDir, 'fileA.txt'), 'A2');
  spawnSync('git', ['add', 'fileA.txt'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'Update A'], { cwd: tempDir });

  await t.test('returns only commits touching the target file', async () => {
    const commitsAll = await parseCommits(tempDir, undefined, false);
    const commitsFiltered = await parseCommits(tempDir, undefined, false, 'fileA.txt');

    // JS filtering behavior (old)
    const jsFiltered = commitsAll.filter((c) => c.filesChanged.includes('fileA.txt'));

    // Should exactly match Native Git filtering behavior (new)
    assert.strictEqual(commitsFiltered.length, 2);
    assert.strictEqual(jsFiltered.length, 2);
    assert.deepStrictEqual(
      commitsFiltered.map((c) => c.hash),
      jsFiltered.map((c) => c.hash),
    );
  });
});
