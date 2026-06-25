const assert = require('node:assert/strict');
const test = require('node:test');

const { parseSince } = require('../dist/utils/timeRange');

// R-4: the MCP server must resolve the "12m" recent window to a concrete date
// exactly like the CLI, instead of handing the literal "12m" to git (which git
// approxidate reads as minutes, not months).

test('parseSince resolves the Nm shorthand to a concrete ISO date, not "12m"', () => {
  const out = parseSince('12m');
  assert.notEqual(out, '12m', 'shorthand must not be passed through verbatim');
  assert.match(out, /^\d{4}-\d{2}-\d{2}$/, 'should be a YYYY-MM-DD date');
});

test('parseSince("12m") is roughly 12 months ago', () => {
  const out = parseSince('12m');
  const then = new Date(out + 'T00:00:00Z');
  const now = new Date();
  const months =
    (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
  assert.ok(months >= 11 && months <= 13, `expected ~12 months ago, got ${months}`);
});

test('parseSince supports days and years', () => {
  assert.match(parseSince('90d'), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(parseSince('2y'), /^\d{4}-\d{2}-\d{2}$/);
});

test('parseSince passes an explicit date through unchanged', () => {
  assert.equal(parseSince('2024-01-01'), '2024-01-01');
});
