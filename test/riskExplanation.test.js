const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildRiskExplanation,
  buildScopeRisks,
  buildTemporalScopeRisks,
  classifyScopeRisk,
} = require('../dist/riskExplanation');

function makeStats(scope, totals) {
  const entries = Object.entries(totals);
  const files = ['a.ts', 'b.ts', 'c.ts'];
  return files.map((file, index) => {
    const authorChanges = new Map(
      entries.map(([email, count]) => [email, index === 0 ? count : 0])
    );
    return [
      `${scope}/${file}`,
      {
        filepath: `${scope}/${file}`,
        totalChanges: index === 0 ? entries.reduce((sum, [, count]) => sum + count, 0) : 0,
        uniqueAuthors: new Set(entries.map(([email]) => email)),
        authorChanges,
        firstChanged: 1,
        lastChanged: 2,
        changeTimeline: [],
      },
    ];
  });
}

function makeResult(scopes) {
  return {
    repoPath: '/repo',
    repoName: 'repo',
    analyzedAt: new Date(),
    totalCommits: 1,
    totalFiles: scopes.length * 3,
    totalAuthors: 3,
    dateRange: { from: new Date(), to: new Date() },
    cursedFiles: [],
    ownership: [],
    busFactor: scopes.map((scope) => ({
      scope: scope.scope,
      busFactor: scope.busFactor,
      atRiskAuthors: ['a@example.com'],
      filesAtRisk: scope.filesAtRisk ?? 3,
      warning: 'fixture',
    })),
    coupling: [],
    fileStats: new Map(scopes.flatMap((scope) => makeStats(scope.scope, scope.totals))),
    lastActiveByAuthor: new Map(),
  };
}

test('classifyScopeRisk preserves HIGH threshold boundary', () => {
  assert.equal(classifyScopeRisk(1, 80), 'HIGH');
  assert.equal(classifyScopeRisk(1, 79.9), 'MEDIUM');
});

test('classifyScopeRisk preserves MEDIUM bus factor 1 behavior', () => {
  assert.equal(classifyScopeRisk(1, 0), 'MEDIUM');
});

test('classifyScopeRisk preserves MEDIUM bus factor 2 concentration boundary', () => {
  assert.equal(classifyScopeRisk(2, 50), 'MEDIUM');
  assert.equal(classifyScopeRisk(2, 49.9), 'LOW');
});

test('classifyScopeRisk preserves LOW fallback', () => {
  assert.equal(classifyScopeRisk(3, 100), 'LOW');
});

test('buildRiskExplanation emits structured reasons and HIGH summary', () => {
  const explanation = buildRiskExplanation({
    level: 'HIGH',
    busFactor: 1,
    concentration: 84,
    contributors: 5,
  });

  assert.deepEqual(explanation.reasons, [
    'Bus factor is 1',
    'Top contributor owns 84% of touches',
  ]);
  assert.equal(explanation.summary, 'Knowledge remains concentrated in a single contributor.');
});

test('buildRiskExplanation emits MEDIUM and LOW summaries', () => {
  assert.equal(
    buildRiskExplanation({
      level: 'MEDIUM',
      busFactor: 2,
      concentration: 50,
      contributors: 4,
    }).summary,
    'Knowledge is shared, but still concentrated across a small contributor set.'
  );
  assert.equal(
    buildRiskExplanation({
      level: 'LOW',
      busFactor: 3,
      concentration: 40,
      contributors: 6,
    }).summary,
    'Knowledge appears distributed across 6 contributor identities.'
  );
});

test('buildScopeRisks reuses existing values and keeps whyClassified available', () => {
  const result = {
    repoPath: '/repo',
    repoName: 'repo',
    analyzedAt: new Date(),
    totalCommits: 1,
    totalFiles: 3,
    totalAuthors: 2,
    dateRange: { from: new Date(), to: new Date() },
    cursedFiles: [],
    ownership: [
      {
        filepath: 'compiler/a.ts',
        owner: 'Ada',
        ownerEmail: 'ada@example.com',
        ownershipPercent: 90,
        contributors: [
          { name: 'Ada', email: 'ada@example.com', changes: 84, percent: 84 },
          { name: 'Grace', email: 'grace@example.com', changes: 16, percent: 16 },
        ],
      },
    ],
    busFactor: [
      {
        scope: 'compiler',
        busFactor: 1,
        atRiskAuthors: ['Ada'],
        filesAtRisk: 3,
        warning: 'existing warning',
      },
    ],
    coupling: [],
    fileStats: new Map([
      ['compiler/a.ts', {
        filepath: 'compiler/a.ts',
        totalChanges: 50,
        uniqueAuthors: new Set(['ada@example.com', 'grace@example.com']),
        authorChanges: new Map([
          ['ada@example.com', 42],
          ['grace@example.com', 8],
        ]),
        firstChanged: 1,
        lastChanged: 2,
        changeTimeline: [],
      }],
      ['compiler/b.ts', {
        filepath: 'compiler/b.ts',
        totalChanges: 30,
        uniqueAuthors: new Set(['ada@example.com', 'grace@example.com']),
        authorChanges: new Map([
          ['ada@example.com', 25],
          ['grace@example.com', 5],
        ]),
        firstChanged: 1,
        lastChanged: 2,
        changeTimeline: [],
      }],
      ['compiler/c.ts', {
        filepath: 'compiler/c.ts',
        totalChanges: 20,
        uniqueAuthors: new Set(['ada@example.com', 'grace@example.com']),
        authorChanges: new Map([
          ['ada@example.com', 17],
          ['grace@example.com', 3],
        ]),
        firstChanged: 1,
        lastChanged: 2,
        changeTimeline: [],
      }],
    ]),
    lastActiveByAuthor: new Map(),
  };

  const [risk] = buildScopeRisks(result);

  assert.equal(risk.scope, 'compiler');
  assert.equal(risk.level, 'HIGH');
  assert.equal(risk.concentration, 84);
  assert.equal(risk.totalFileTouches, 100);
  assert.deepEqual(risk.explanation.reasons, [
    'Bus factor is 1',
    'Top contributor owns 84% of touches',
  ]);
  assert.equal(risk.whyClassified.length, 3);
});

test('buildTemporalScopeRisks applies protocol categories from concentration status', () => {
  const lifetimeResult = makeResult([
    { scope: 'persistent', busFactor: 1, totals: { 'a@example.com': 80, 'b@example.com': 20 } },
    { scope: 'historical', busFactor: 1, totals: { 'a@example.com': 60, 'b@example.com': 40 } },
    { scope: 'emerging', busFactor: 3, totals: { 'a@example.com': 34, 'b@example.com': 33, 'c@example.com': 33 } },
    { scope: 'distributed', busFactor: 3, totals: { 'a@example.com': 34, 'b@example.com': 33, 'c@example.com': 33 } },
    { scope: 'inactive', busFactor: 1, totals: { 'a@example.com': 80, 'b@example.com': 20 } },
    { scope: 'thin', busFactor: 1, totals: { 'a@example.com': 80, 'b@example.com': 20 } },
  ]);
  const recentResult = makeResult([
    { scope: 'persistent', busFactor: 1, totals: { 'a@example.com': 80, 'b@example.com': 20 } },
    { scope: 'historical', busFactor: 3, totals: { 'a@example.com': 34, 'b@example.com': 33, 'c@example.com': 33 } },
    { scope: 'emerging', busFactor: 1, totals: { 'a@example.com': 60, 'b@example.com': 40 } },
    { scope: 'distributed', busFactor: 3, totals: { 'a@example.com': 34, 'b@example.com': 33, 'c@example.com': 33 } },
    { scope: 'thin', busFactor: 1, filesAtRisk: 1, totals: { 'a@example.com': 9 } },
  ]);

  const categories = new Map(
    buildTemporalScopeRisks(lifetimeResult, recentResult).map((risk) => [risk.scope, risk.category])
  );

  assert.equal(categories.get('persistent'), 'Persistent concentration');
  assert.equal(categories.get('historical'), 'Historical concentration');
  assert.equal(categories.get('emerging'), 'Emerging concentration');
  assert.equal(categories.get('distributed'), 'Persistently distributed');
  assert.equal(categories.get('inactive'), 'No recent activity');
  assert.equal(categories.get('thin'), 'Insufficient recent evidence');
});
