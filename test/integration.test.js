const assert = require('node:assert/strict');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { analyze } = require('../dist/core/orchestrator');

// End-to-end tests that build a real throwaway git repository, run the full
// analyze() pipeline against it, and assert on the result. These exist
// because the unit tests cover pure functions but nothing exercised the
// parse -> canonicalize -> stats -> analyzers path as a whole — which is
// exactly where the noreply-bot bug lived.

function git(repo, args) {
  execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
}

// Build a repo where `authors` is a list of {name, email} and each makes
// `commitsPerAuthor` commits. All commits touch the SAME file (src/main.js)
// so it clears the ownership analyzer's minimum-history (>=5 changes) and
// contested-ownership (>=2 contributors) thresholds.
function buildRepo(commitsByAuthor) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-it-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.name', 'seed']);
  git(dir, ['config', 'user.email', 'seed@example.com']);
  fs.mkdirSync(path.join(dir, 'src'));

  let n = 0;
  for (const { name, email, commits } of commitsByAuthor) {
    for (let i = 0; i < commits; i++) {
      const file = path.join(dir, 'src', 'main.js');
      fs.writeFileSync(file, `// edit ${n} by ${name}\n`);
      git(dir, ['add', '-A']);
      execFileSync('git', [
        '-c', `user.name=${name}`,
        '-c', `user.email=${email}`,
        'commit', '-q', '-m', `change ${n}`,
      ], { cwd: dir, stdio: 'pipe' });
      n++;
    }
  }
  return dir;
}

test('a contributor using a GitHub noreply email survives into ownership', async () => {
  const repo = buildRepo([
    { name: 'Nora Reply', email: 'nora@users.noreply.github.com', commits: 8 },
    { name: 'Otto Other', email: 'otto@example.com', commits: 3 },
  ]);
  try {
    const result = await analyze(repo, undefined, true);
    const owners = new Set(result.ownership.map((o) => o.owner));
    // The noreply human is the dominant contributor; she must appear, not be
    // silently dropped as a "bot".
    assert.ok(owners.has('Nora Reply'), 'noreply contributor was erased from ownership');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('a genuine bot is excluded from ownership', async () => {
  const repo = buildRepo([
    { name: 'Real Dev', email: 'dev@example.com', commits: 6 },
    { name: 'Second Dev', email: 'second@example.com', commits: 4 },
    { name: 'dependabot[bot]', email: 'dependabot[bot]@users.noreply.github.com', commits: 9 },
  ]);
  try {
    const result = await analyze(repo, undefined, true);
    const row = result.ownership.find((o) => o.filepath === 'src/main.js');
    assert.ok(row, 'expected an ownership row for the contested file');
    const contributorNames = row.contributors.map((c) => c.name);
    assert.ok(contributorNames.includes('Real Dev'), 'real contributor missing');
    assert.ok(
      !contributorNames.includes('dependabot[bot]'),
      'bot leaked into ownership contributors'
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('noreply contributor counts toward bus factor, bot does not', async () => {
  // src/ is the scope. One real noreply human + one bot. The bot must not
  // inflate the contributor set; bus factor should reflect the human only.
  const repo = buildRepo([
    { name: 'Solo Human', email: 'solo@users.noreply.github.com', commits: 10 },
    { name: 'renovate[bot]', email: 'renovate[bot]@users.noreply.github.com', commits: 10 },
  ]);
  try {
    const result = await analyze(repo, undefined, true);
    const src = result.busFactor.find((b) => b.scope === 'src');
    assert.ok(src, 'src scope not analyzed');
    // Only the human counts -> single point of failure.
    assert.equal(src.busFactor, 1, 'bot was counted as a real contributor in bus factor');
    assert.ok(src.atRiskAuthors.includes('Solo Human'));
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('analyze() runs end-to-end and returns a well-formed result', async () => {
  const repo = buildRepo([
    { name: 'Alice', email: 'alice@example.com', commits: 5 },
    { name: 'Bob', email: 'bob@example.com', commits: 4 },
  ]);
  try {
    const result = await analyze(repo, undefined, true);
    assert.ok(result.totalCommits >= 9);
    assert.ok(result.totalFiles >= 1);
    assert.ok(Array.isArray(result.ownership));
    assert.ok(Array.isArray(result.busFactor));
    assert.ok(result.fileStats instanceof Map);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
