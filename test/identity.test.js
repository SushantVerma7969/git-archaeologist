const assert = require('node:assert/strict');
const test = require('node:test');

const { buildIdentityMap } = require('../dist/utils/identity');

function ids(...pairs) {
  return pairs.map(([email, name]) => ({ email, name }));
}

test('GitHub noreply id+handle merges with bare handle form', () => {
  const r = buildIdentityMap(
    ids(
      ['6425824+josephsavona@users.noreply.github.com', 'Joseph Savona'],
      ['josephsavona@users.noreply.github.com', 'Joseph Savona'],
    ),
  );
  assert.equal(r.merges.length, 1);
  assert.equal(r.merges[0].members.length, 2);
});

test('noreply handle links to a real email with the same local-part', () => {
  const r = buildIdentityMap(
    ids(
      ['josephsavona@users.noreply.github.com', 'Joseph Savona'],
      ['josephsavona@gmail.com', 'Joseph Savona'],
    ),
  );
  assert.equal(r.merges.length, 1);
  const canon = r.emailToCanonical.get('josephsavona@gmail.com');
  assert.equal(r.emailToCanonical.get('josephsavona@users.noreply.github.com'), canon);
});

test('same name AND same local-part merges across companies (joe@fb / joe@meta)', () => {
  const r = buildIdentityMap(
    ids(['joe@fb.com', 'Joe Savona'], ['joe@meta.com', 'Joe Savona']),
  );
  assert.equal(r.merges.length, 1);
});

test('CONSERVATIVE: same name but DIFFERENT local-part does NOT merge', () => {
  // Two real people who happen to share a common display name must stay split.
  const r = buildIdentityMap(
    ids(['alex.chen@a.com', 'Alex Chen'], ['achen2024@b.com', 'Alex Chen']),
  );
  assert.equal(r.merges.length, 0);
});

test('CONSERVATIVE: same local-part but different name does NOT merge on its own', () => {
  // Different people can both have local-part "dev"; name disagreement blocks it.
  const r = buildIdentityMap(
    ids(['dev@a.com', 'Alice Smith'], ['dev@b.com', 'Bob Jones']),
  );
  assert.equal(r.merges.length, 0);
});

test('generic display names are never used to merge', () => {
  const r = buildIdentityMap(ids(['ci@a.com', 'CI'], ['ci@b.com', 'CI']));
  assert.equal(r.merges.length, 0);
});

test('override merge: forces two unrelated emails into one identity', () => {
  const r = buildIdentityMap(
    ids(['person@home.com', 'Pat Random'], ['p.work@corp.com', 'Pat Random']),
    { mergeGroups: [['person@home.com', 'p.work@corp.com']] },
  );
  assert.equal(r.merges.length, 1);
  assert.equal(r.merges[0].members.length, 2);
});

test('override split: keeps a shared account separate from heuristic merges', () => {
  // Without the split, the noreply handle rule would merge these.
  const r = buildIdentityMap(
    ids(
      ['shared@users.noreply.github.com', 'Shared'],
      ['shared@gmail.com', 'Shared Person'],
    ),
    { splitEmails: ['shared@users.noreply.github.com'] },
  );
  assert.equal(r.merges.length, 0);
});

test('canonical representative is the email with the most commits', () => {
  // three commits under fb, one under gmail -> fb is canonical
  const r = buildIdentityMap(
    ids(
      ['rep@fb.com', 'Rep Person'],
      ['rep@fb.com', 'Rep Person'],
      ['rep@fb.com', 'Rep Person'],
      ['rep@gmail.com', 'Rep Person'],
    ),
  );
  assert.equal(r.emailToCanonical.get('rep@gmail.com'), 'rep@fb.com');
});

test('unrelated identities are left untouched', () => {
  const r = buildIdentityMap(
    ids(['a@x.com', 'Alice'], ['b@y.com', 'Bob'], ['c@z.com', 'Carol']),
  );
  assert.equal(r.merges.length, 0);
  assert.equal(r.emailToCanonical.get('a@x.com'), 'a@x.com');
});

// --- Rule 2b regression: variant-name + normalized-local-part merge ---
// Locks the jotai "Daishi Kato"/"daishi" fix and guards the over-merge edge.

test('Rule 2b: variant name + separator-different local-part merges (Daishi case)', () => {
  // "Daishi Kato" <dai-shi@noreply> and "daishi" <daishi@axlight> are one person:
  // local-parts match once separators are normalized (dai-shi -> daishi) AND the
  // short name is the first token of the full name.
  const r = buildIdentityMap(
    ids(
      ['dai-shi@users.noreply.github.com', 'Daishi Kato'],
      ['daishi@axlight.com', 'daishi'],
    ),
  );
  assert.equal(r.merges.length, 1);
  assert.equal(r.merges[0].members.length, 2);
});

test('CONSERVATIVE: normalized-local-part match but INCOMPATIBLE names does NOT merge', () => {
  // Two different people whose local-parts collide after separator-stripping
  // (a-smith -> asmith) but whose full names disagree must stay split.
  const r = buildIdentityMap(
    ids(['a-smith@a.com', 'Alex Smith'], ['asmith@b.com', 'Andrea Jones']),
  );
  assert.equal(r.merges.length, 0);
});

test('Rule 2b: substring name variant merges on normalized local-part', () => {
  // "Jon" is a substring of "Jonathan"; same normalized local-part -> one person.
  const r = buildIdentityMap(
    ids(['jon.doe@a.com', 'Jonathan Doe'], ['jondoe@b.com', 'Jon']),
  );
  assert.equal(r.merges.length, 1);
});
