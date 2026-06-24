const assert = require('node:assert/strict');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { analyze } = require('../dist/core/orchestrator');
const { buildOwnershipReport } = require('../dist/ownership-core');
const { isBot } = require('../dist/utils/botFilter');

const git = (cwd, args) => execFileSync('git', args, { cwd, stdio: 'pipe' });
function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-own-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'seed@x.com']);
  git(dir, ['config', 'user.name', 'Seed']);
  fs.mkdirSync(path.join(dir, 'lib'));
  return dir;
}
function commitAs(dir, name, email, file, content) {
  git(dir, ['config', 'user.name', name]);
  git(dir, ['config', 'user.email', email]);
  fs.appendFileSync(path.join(dir, file), content + '\n');
  git(dir, ['add', '.']);
  git(dir, ['commit', '-q', '-m', `${name}: ${content}`]);
}

test('GitHub Copilot co-author identity is treated as a bot', () => {
  assert.equal(isBot('Copilot', '223556219+copilot@users.noreply.github.com'), true);
});
test('a human named "Copilot Jones" is NOT a bot', () => {
  assert.equal(isBot('Copilot Jones', 'cjones@gmail.com'), false);
});

test('a bot is never reported as a folder owner', async () => {
  const dir = makeRepo();
  for (let i = 0; i < 6; i++)
    commitAs(
      dir,
      'dependabot[bot]',
      '49699333+dependabot[bot]@users.noreply.github.com',
      'lib/a.js',
      'bump' + i,
    );
  for (let i = 0; i < 4; i++)
    commitAs(dir, 'Real Human', 'human@x.com', 'lib/a.js', 'feat' + i);
  const report = buildOwnershipReport(await analyze(dir, undefined, true));
  const lib = report.folders.find((f) => f.folder === 'lib');
  assert.ok(lib && !/bot/i.test(lib.topOwner));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('one person under two emails (noreply handle) is a single owner', async () => {
  const dir = makeRepo();
  for (let i = 0; i < 5; i++)
    commitAs(dir, 'Jane', 'jane@users.noreply.github.com', 'lib/b.js', 'a' + i);
  for (let i = 0; i < 5; i++)
    commitAs(dir, 'Jane', 'jane@personal.com', 'lib/b.js', 'b' + i);
  const report = buildOwnershipReport(await analyze(dir, undefined, true));
  const lib = report.folders.find((f) => f.folder === 'lib');
  assert.ok(
    lib && lib.topOwnerPercent >= 90,
    `expected merged ~100%, got ${lib && lib.topOwnerPercent}`,
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test('single-contributor folder shows display name, not raw email', async () => {
  const dir = makeRepo();
  for (let i = 0; i < 6; i++)
    commitAs(dir, 'Grace Hopper', 'ghopper@navy.mil', 'lib/d.js', 'x' + i);
  const report = buildOwnershipReport(await analyze(dir, undefined, true));
  const lib = report.folders.find((f) => f.folder === 'lib');
  assert.ok(lib && lib.topOwner === 'Grace Hopper' && !lib.topOwner.includes('@'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('busFactor is never substituted with contributor count', async () => {
  const dir = makeRepo();
  for (let i = 0; i < 3; i++) commitAs(dir, 'Ann', 'ann@x.com', 'lib/e.js', 'a' + i);
  for (let i = 0; i < 3; i++) commitAs(dir, 'Ben', 'ben@x.com', 'lib/e.js', 'b' + i);
  for (let i = 0; i < 3; i++) commitAs(dir, 'Cal', 'cal@x.com', 'lib/e.js', 'c' + i);
  const result = await analyze(dir, undefined, true);
  const lib = buildOwnershipReport(result).folders.find((f) => f.folder === 'lib');
  const bf = result.busFactor.find((b) => b.scope === 'lib');
  if (lib) {
    if (bf) assert.equal(lib.busFactor, bf.busFactor);
    else assert.equal(lib.busFactor, null);
    assert.notEqual(lib.busFactor, 3);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});
