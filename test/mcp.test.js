const assert = require('node:assert/strict');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// These tests start the real MCP server as a subprocess and drive it through
// the official MCP client over stdio — the same path an AI agent uses. They
// confirm the server speaks the protocol and returns correct, structured data,
// not just that the code compiles.

function git(repo, args) {
  execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
}

// A small repo: one file heavily owned by a noreply contributor, plus a second
// contributor, so ownership and bus factor have something real to report.
function buildRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-mcp-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.name', 'seed']);
  git(dir, ['config', 'user.email', 'seed@example.com']);
  fs.mkdirSync(path.join(dir, 'src'));
  const commit = (name, email, n) => {
    fs.writeFileSync(path.join(dir, 'src', 'main.js'), `// ${name} ${n}\n`);
    git(dir, ['add', '-A']);
    execFileSync(
      'git',
      [
        '-c',
        `user.name=${name}`,
        '-c',
        `user.email=${email}`,
        'commit',
        '-q',
        '-m',
        `c${n}`,
      ],
      { cwd: dir, stdio: 'pipe' },
    );
  };
  for (let i = 0; i < 8; i++) commit('Nora Reply', 'nora@users.noreply.github.com', i);
  for (let i = 0; i < 3; i++) commit('Otto Other', 'otto@example.com', 100 + i);
  return dir;
}

// Lazily require the SDK so the rest of the suite still runs if it's absent.
async function withClient(repoDir, fn) {
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(__dirname, '..', 'dist', 'index.js'), 'mcp'],
    cwd: repoDir,
  });
  const client = new Client({ name: 'ga-test-client', version: '1.0.0' });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

test('MCP server lists all five tools', async () => {
  const repo = buildRepo();
  try {
    await withClient(repo, async (client) => {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).sort();
      assert.deepEqual(names, [
        'analyze_repo',
        'find_coupled_files',
        'get_bus_factor',
        'get_risk_hotspots',
        'who_owns',
      ]);
      // Every tool must carry a description for the agent.
      for (const t of tools) assert.ok(t.description && t.description.length > 20);
    });
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('who_owns returns the noreply contributor as dominant owner', async () => {
  const repo = buildRepo();
  try {
    await withClient(repo, async (client) => {
      const res = await client.callTool({
        name: 'who_owns',
        arguments: { filepath: 'src/main.js' },
      });
      const data = JSON.parse(res.content[0].text);
      assert.equal(data.dominantOwner, 'Nora Reply');
      assert.ok(data.ownershipPercent > 50);
    });
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('get_bus_factor reports the src scope', async () => {
  const repo = buildRepo();
  try {
    await withClient(repo, async (client) => {
      const res = await client.callTool({
        name: 'get_bus_factor',
        arguments: { scope: 'src' },
      });
      const data = JSON.parse(res.content[0].text);
      assert.equal(data.scopes.length, 1);
      assert.equal(data.scopes[0].scope, 'src');
      assert.ok(data.scopes[0].busFactor >= 1);
    });
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('analyze_repo returns a well-formed overview', async () => {
  const repo = buildRepo();
  try {
    await withClient(repo, async (client) => {
      const res = await client.callTool({ name: 'analyze_repo', arguments: {} });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.totalCommits >= 11);
      assert.ok(Array.isArray(data.busFactorOneScopes));
      assert.ok(Array.isArray(data.topCursedFiles));
      assert.ok(data.note.includes('not'));
    });
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('who_owns on a nonexistent file returns found:false without erroring', async () => {
  const repo = buildRepo();
  try {
    await withClient(repo, async (client) => {
      const res = await client.callTool({
        name: 'who_owns',
        arguments: { filepath: 'no/such/file.js' },
      });
      const data = JSON.parse(res.content[0].text);
      assert.equal(data.found, false);
    });
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
