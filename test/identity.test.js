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
      ['josephsavona@users.noreply.github.com', 'Joseph Savona']
    )
  );
  assert.equal(r.merges.length, 1);
  assert.equal(r.merges[0].members.length, 2);
});

test('noreply handle links to a real email with the same local-part', () => {
  const r = buildIdentityMap(
    ids(
      ['josephsavona@users.noreply.github.com', 'Joseph Savona'],
      ['josephsavona@gmail.com', 'Joseph Savona']
    )
  );
  assert.equal(r.merges.length, 1);
  const canon = r.emailToCanonical.get('josephsavona@gmail.com');
  assert.equal(r.emailToCanonical.get('josephsavona@users.noreply.github.com'), canon);
});

test('same name AND same local-part merges across companies (joe@fb / joe@meta)', () => {
  const r = buildIdentityMap(
    ids(
      ['joe@fb.com', 'Joe Savona'],
      ['joe@meta.com', 'Joe Savona']
    )
  );
  assert.equal(r.merges.length, 1);
});

test('CONSERVATIVE: same name but DIFFERENT local-part does NOT merge', () => {
  // Two real people who happen to share a common display name must stay split.
  const r = buildIdentityMap(
    ids(
      ['alex.chen@a.com', 'Alex Chen'],
      ['achen2024@b.com', 'Alex Chen']
    )
  );
  assert.equal(r.merges.length, 0);
});

test('CONSERVATIVE: same local-part but different name does NOT merge on its own', () => {
  // Different people can both have local-part "dev"; name disagreement blocks it.
  const r = buildIdentityMap(
    ids(
      ['dev@a.com', 'Alice Smith'],
      ['dev@b.com', 'Bob Jones']
    )
  );
  assert.equal(r.merges.length, 0);
});

test('generic display names are never used to merge', () => {
  const r = buildIdentityMap(
    ids(
      ['ci@a.com', 'CI'],
      ['ci@b.com', 'CI']
    )
  );
  assert.equal(r.merges.length, 0);
});

test('override merge: forces two unrelated emails into one identity', () => {
  const r = buildIdentityMap(
    ids(
      ['person@home.com', 'Pat Random'],
      ['p.work@corp.com', 'Pat Random']
    ),
    { mergeGroups: [['person@home.com', 'p.work@corp.com']] }
  );
  assert.equal(r.merges.length, 1);
  assert.equal(r.merges[0].members.length, 2);
});

test('override split: keeps a shared account separate from heuristic merges', () => {
  // Without the split, the noreply handle rule would merge these.
  const r = buildIdentityMap(
    ids(
      ['shared@users.noreply.github.com', 'Shared'],
      ['shared@gmail.com', 'Shared Person']
    ),
    { splitEmails: ['shared@users.noreply.github.com'] }
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
      ['rep@gmail.com', 'Rep Person']
    )
  );
  assert.equal(r.emailToCanonical.get('rep@gmail.com'), 'rep@fb.com');
});

test('unrelated identities are left untouched', () => {
  const r = buildIdentityMap(
    ids(
      ['a@x.com', 'Alice'],
      ['b@y.com', 'Bob'],
      ['c@z.com', 'Carol']
    )
  );
  assert.equal(r.merges.length, 0);
  assert.equal(r.emailToCanonical.get('a@x.com'), 'a@x.com');
});
