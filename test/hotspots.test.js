const assert = require('node:assert/strict');
const test = require('node:test');

const { buildHotspots, isSourceScope } = require('../dist/riskExplanation');

function scopeRisk(scope, overrides = {}) {
  return {
    scope,
    level: 'HIGH',
    busFactor: 1,
    concentration: 90,
    contributors: 5,
    totalFileTouches: 100,
    topOwner: 'a@x.com',
    filesAtRisk: 5,
    explanation: { reasons: [], summary: '' },
    lastActiveDays: 30,
    ...overrides,
  };
}

test('scope with fewer than minSignals is excluded', () => {
  // Only bus-factor fires (1 signal); default threshold is 2.
  const hotspots = buildHotspots({
    scopeRisks: [scopeRisk('lib', { busFactor: 1, lastActiveDays: 30 })],
    churn: [],
    abandoned: [],
    transitions: [],
    temporal: [],
  });
  assert.equal(hotspots.length, 0);
});

test('minSignals: 1 surfaces a single-signal scope', () => {
  const hotspots = buildHotspots(
    {
      scopeRisks: [scopeRisk('lib', { busFactor: 1, lastActiveDays: 30 })],
      churn: [],
      abandoned: [],
      transitions: [],
      temporal: [],
    },
    { minSignals: 1 }
  );
  assert.equal(hotspots.length, 1);
  assert.equal(hotspots[0].signalsFired, 1);
});

test('multiple signals accumulate and every signal carries a reason', () => {
  const hotspots = buildHotspots({
    scopeRisks: [scopeRisk('lib', { busFactor: 1, concentration: 90, lastActiveDays: 400 })],
    churn: [{ scope: 'lib', contributors: 4, inactiveContributors: 3, churnPercent: 75, level: 'HIGH' }],
    abandoned: [{ scope: 'lib', severity: 'HIGH', ownerInactiveDays: 400, churnPercent: 75, concentration: 90, explanation: '' }],
    transitions: [],
    temporal: [],
  });
  assert.equal(hotspots.length, 1);
  // bus-factor + churn + owner-inactive = 3
  assert.equal(hotspots[0].signalsFired, 3);
  // Explainability invariant: no hotspot without reasons, one reason per signal.
  assert.equal(hotspots[0].explanation.reasons.length, hotspots[0].signalsFired);
  for (const s of hotspots[0].signals) {
    assert.ok(s.reason && s.reason.length > 0);
  }
});

test('ranking: more signals first, concentration breaks ties', () => {
  const hotspots = buildHotspots({
    scopeRisks: [
      scopeRisk('two-signal', { busFactor: 1, concentration: 95, lastActiveDays: 400 }),
      scopeRisk('three-signal', { busFactor: 1, concentration: 60, lastActiveDays: 400 }),
      scopeRisk('tie-low', { busFactor: 1, concentration: 70, lastActiveDays: 400 }),
    ],
    churn: [
      { scope: 'three-signal', contributors: 4, inactiveContributors: 3, churnPercent: 75, level: 'HIGH' },
    ],
    abandoned: [],
    transitions: [],
    temporal: [],
  });
  // three-signal: bus-factor + churn + owner-inactive(>365) = 3
  // two-signal:   bus-factor + owner-inactive = 2
  // tie-low:      bus-factor + owner-inactive = 2
  assert.equal(hotspots[0].scope, 'three-signal');
  // tie between the two 2-signal scopes broken by concentration (95 > 70)
  assert.equal(hotspots[1].scope, 'two-signal');
  assert.equal(hotspots[2].scope, 'tie-low');
});

test('rising-concentration signal only fires on rising emerging/persistent trend', () => {
  const base = {
    scopeRisks: [scopeRisk('lib', { busFactor: 1, lastActiveDays: 30 })],
    churn: [],
    abandoned: [],
    transitions: [],
  };
  const rising = buildHotspots(
    { ...base, temporal: [{ scope: 'lib', category: 'Emerging concentration', trend: 'rising', delta: 18, lifetime: {}, recentTouches: 50, summary: '' }] },
    { minSignals: 2 }
  );
  assert.equal(rising.length, 1);
  assert.ok(rising[0].signals.some((s) => s.name === 'rising-concentration'));

  const stable = buildHotspots(
    { ...base, temporal: [{ scope: 'lib', category: 'Emerging concentration', trend: 'stable', delta: 2, lifetime: {}, recentTouches: 50, summary: '' }] },
    { minSignals: 2 }
  );
  assert.equal(stable.length, 0);
});

test('churn does not fire on a distributed scope (high bus factor)', () => {
  // High lifetime churn but bus factor 5 — churn should NOT count as a signal.
  const hotspots = buildHotspots(
    {
      scopeRisks: [scopeRisk('lib', { busFactor: 5, lastActiveDays: 30 })],
      churn: [{ scope: 'lib', contributors: 100, inactiveContributors: 90, churnPercent: 90, level: 'HIGH' }],
      abandoned: [],
      transitions: [],
      temporal: [],
    },
    { minSignals: 1 }
  );
  // bus factor 5 => no bus-factor signal; churn gated out => 0 signals
  assert.equal(hotspots.length, 0);
});

test('churn fires when paired with a low bus factor', () => {
  const hotspots = buildHotspots(
    {
      scopeRisks: [scopeRisk('lib', { busFactor: 2, lastActiveDays: 30 })],
      churn: [{ scope: 'lib', contributors: 10, inactiveContributors: 6, churnPercent: 60, level: 'HIGH' }],
      abandoned: [],
      transitions: [],
      temporal: [],
    },
    { minSignals: 1 }
  );
  assert.equal(hotspots.length, 1);
  assert.ok(hotspots[0].signals.some((s) => s.name === 'churn'));
});

test('non-source scopes are excluded from hotspot ranking', () => {
  const excluded = ['.github', 'docs', 'fixtures', 'flow-typed', '(root)'];
  for (const scope of excluded) {
    const hotspots = buildHotspots(
      {
        scopeRisks: [scopeRisk(scope, { busFactor: 1, lastActiveDays: 400 })],
        churn: [{ scope, contributors: 4, inactiveContributors: 3, churnPercent: 75, level: 'HIGH' }],
        abandoned: [],
        transitions: [],
        temporal: [],
      },
      { minSignals: 1 }
    );
    assert.equal(hotspots.length, 0, `${scope} should be excluded`);
  }
});

test('isSourceScope rejects tooling, config, and generated scopes', () => {
  // These should never appear as risk scopes in any view.
  for (const scope of ['.claude', '.github', '.circleci', 'docs', 'fixtures', 'flow-typed', 'vendor', '(root)', '.vscode']) {
    assert.equal(isSourceScope(scope), false, `${scope} should be non-source`);
  }
  // Real source trees should pass.
  for (const scope of ['compiler', 'src', 'packages', 'lib', 'scripts']) {
    assert.equal(isSourceScope(scope), true, `${scope} should be source`);
  }
});
