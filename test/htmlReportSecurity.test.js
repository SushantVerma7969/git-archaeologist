const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { generateHtmlReport } = require('../dist/output/htmlReport');

// C-3: file/folder paths flow into a JSON blob embedded inside a <script> tag.
// JSON.stringify does NOT escape "</script>", so a maliciously named path in an
// untrusted repo could break out of the script context and execute. The
// generator must escape "<" in that embedded JSON.

function resultWithPath(filepath) {
  return {
    repoPath: '/tmp/x',
    repoName: 'x',
    analyzedAt: new Date(),
    totalCommits: 1,
    totalFiles: 1,
    totalAuthors: 1,
    dateRange: { from: new Date(0), to: new Date(0) },
    cursedFiles: [],
    ownership: [],
    busFactor: [],
    coupling: [],
    fileStats: new Map([
      [
        filepath,
        { totalChanges: 3, uniqueAuthors: new Set(['a@b.com']), lastChanged: 0 },
      ],
    ]),
    lastActiveByAuthor: new Map(),
  };
}

test('embedded report data cannot break out of the <script> block', () => {
  const evil = 'src/</script><img src=x onerror=alert(1)>.js';
  const out = path.join(
    os.tmpdir(),
    `ga-sec-${Date.now()}-${Math.random().toString(36).slice(2)}.html`,
  );
  generateHtmlReport(resultWithPath(evil), out, undefined, undefined);
  const html = fs.readFileSync(out, 'utf8');
  fs.unlinkSync(out);

  // The literal breakout sequence must not survive into the document.
  assert.ok(
    !html.includes('</script><img'),
    'malicious "</script><img" sequence must be escaped, not emitted verbatim',
  );
  // The "<" of the payload must have been escaped to its < form.
  assert.ok(
    html.includes('\\u003c/script>'),
    'expected the embedded path to be escaped as \\u003c/script>',
  );
});
