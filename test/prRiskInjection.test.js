const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'dist', 'index.js');

// C-2: `pr-risk --base` was interpolated into a shell command (execSync), so a
// crafted base value could execute arbitrary commands. The base flag must now be
// passed as a git argument (execFileSync), never through a shell.

test('pr-risk does not execute shell metacharacters in --base', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-inj-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'a@b.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-qm', 'c1'], { cwd: dir });

  const marker = path.join(dir, 'PWNED');
  // If --base reaches a shell, this writes the marker file.
  spawnSync('node', [CLI, 'pr-risk', dir, '--base', `x; touch ${marker} #`], {
    encoding: 'utf8',
  });

  assert.ok(
    !fs.existsSync(marker),
    'pr-risk must not execute injected shell commands from --base',
  );
  fs.rmSync(dir, { recursive: true, force: true });
});
