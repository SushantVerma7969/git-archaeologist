const assert = require('node:assert/strict');
const test = require('node:test');

const {
  calculateConcentration,
} = require('../dist/utils/concentration');

test('calculateConcentration returns 100 for single author ownership', () => {
  const authors = new Map([
    ['alice@example.com', 10],
  ]);

  assert.equal(
    calculateConcentration(authors),
    100
  );
});

test('calculateConcentration returns 50 for equal ownership', () => {
  const authors = new Map([
    ['alice@example.com', 10],
    ['bob@example.com', 10],
  ]);

  assert.equal(
    calculateConcentration(authors),
    50
  );
});

test('calculateConcentration returns null for empty input', () => {
  assert.equal(
    calculateConcentration(new Map()),
    null
  );
});
