import {
  AnalysisResult,
  RiskExplanation,
  RiskLevel,
  ScopeRisk,
  TemporalRiskCategory,
  TemporalScopeRisk,
} from './types';
import { isBot } from './utils/botFilter';
import { formatTimeAgo } from './utils/activity';

interface ExplanationInput {
  level: RiskLevel;
  busFactor: number;
  concentration: number;
  contributors: number;
}

export function classifyScopeRisk(busFactor: number, concentration: number): RiskLevel {
  if (busFactor === 1 && concentration >= 80) {
    return 'HIGH';
  }
  if (busFactor === 1 || (busFactor === 2 && concentration >= 50)) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function isConcentrated(level: RiskLevel): boolean {
  return level === 'HIGH' || level === 'MEDIUM';
}

export function buildRiskExplanation(input: ExplanationInput): RiskExplanation {
  const reasons = [
    `Bus factor is ${input.busFactor}`,
    `Top contributor owns ${input.concentration}% of touches`,
  ];

  if (input.level === 'HIGH') {
    return {
      reasons,
      summary: 'Knowledge remains concentrated in a single contributor.',
    };
  }

  if (input.level === 'MEDIUM') {
    const summary = input.busFactor === 1
      ? 'One contributor still accounts for enough history to create continuity risk.'
      : 'Knowledge is shared, but still concentrated across a small contributor set.';
    return { reasons, summary };
  }

  return {
    reasons,
    summary: `Knowledge appears distributed across ${input.contributors} contributor identities.`,
  };
}

function buildWhyClassified(input: ExplanationInput): string[] {
  let concentrationExplanation: string;

  if (input.level === 'HIGH') {
    concentrationExplanation =
      'Historical activity is highly concentrated in a single contributor identity.';
  } else if (input.level === 'MEDIUM') {
    concentrationExplanation = input.busFactor === 1
      ? 'Historical activity is concentrated enough that one identity accounts for at least half of file touches.'
      : 'Historical activity is concentrated across a small number of contributor identities.';
  } else {
    concentrationExplanation =
      `Historical activity is distributed across ${input.contributors} contributor identities.`;
  }

  return [
    `One contributor identity accounts for ${input.concentration}% of historical file touches.`,
    `Bus Factor is ${input.busFactor}.`,
    concentrationExplanation,
  ];
}

interface ScopeRiskOptions {
  minFilesAtRisk?: number;
}

export function buildScopeRisks(result: AnalysisResult, options: ScopeRiskOptions = {}): ScopeRisk[] {
  const minFilesAtRisk = options.minFilesAtRisk ?? 3;
  const folderAuthorChanges = new Map<string, Map<string, number>>();
  for (const [, stats] of result.fileStats) {
    const parts = stats.filepath.split('/');
    const folder = parts.length > 1 ? parts[0] : '(root)';
    if (!folderAuthorChanges.has(folder)) folderAuthorChanges.set(folder, new Map());
    const authorTotals = folderAuthorChanges.get(folder)!;
    for (const [email, count] of stats.authorChanges) {
      if (isBot(email, email)) continue;
      authorTotals.set(email, (authorTotals.get(email) ?? 0) + count);
    }
  }

  const bfMap = new Map(result.busFactor.map((b) => [b.scope, b]));
  const risks: ScopeRisk[] = [];

  const nameToEmail = new Map<string, string>();
  for (const o of result.ownership) {
    for (const c of o.contributors) {
      if (!nameToEmail.has(c.name)) nameToEmail.set(c.name, c.email);
    }
  }

  for (const [folder, authorTotals] of folderAuthorChanges) {
    const bf = bfMap.get(folder);
    if (!bf) continue;
    if (bf.filesAtRisk < minFilesAtRisk) continue;

    const total = Array.from(authorTotals.values()).reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    const sorted = Array.from(authorTotals.entries()).sort((a, b) => b[1] - a[1]);
    const topShare = sorted[0][1] / total;
    const concentration = Math.round(topShare * 1000) / 10;
    const contributors = sorted.length;
    const topOwner = bf.atRiskAuthors[0] ?? 'unknown';
    const level = classifyScopeRisk(bf.busFactor, concentration);
    const explanationInput = {
      level,
      busFactor: bf.busFactor,
      concentration,
      contributors,
    };

    const ownerEmail = nameToEmail.get(topOwner);
    const lastActiveTs = ownerEmail ? result.lastActiveByAuthor.get(ownerEmail) : undefined;
    let lastActive: string | undefined;
    if (lastActiveTs !== undefined) {
      lastActive = formatTimeAgo(lastActiveTs);
    }

    risks.push({
      scope: folder,
      level,
      busFactor: bf.busFactor,
      concentration,
      contributors,
      totalFileTouches: total,
      topOwner,
      filesAtRisk: bf.filesAtRisk,
      whyClassified: buildWhyClassified(explanationInput),
      explanation: buildRiskExplanation(explanationInput),
      lastActive,
    });
  }

  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return risks.sort((a, b) => order[a.level] - order[b.level] || b.concentration - a.concentration);
}

function countNonBotTouchesByScope(result: AnalysisResult): Map<string, number> {
  const touches = new Map<string, number>();

  for (const [, stats] of result.fileStats) {
    const parts = stats.filepath.split('/');
    const folder = parts.length > 1 ? parts[0] : '(root)';
    let total = 0;

    for (const [email, count] of stats.authorChanges) {
      if (isBot(email, email)) continue;
      total += count;
    }

    touches.set(folder, (touches.get(folder) ?? 0) + total);
  }

  return touches;
}

function classifyTemporalRisk(lifetime: ScopeRisk, recent?: ScopeRisk, recentTouches = 0): TemporalRiskCategory {
  if (recentTouches === 0) {
    return 'No recent activity';
  }

  if (recentTouches < 10 || recent === undefined) {
    return 'Insufficient recent evidence';
  }

  const lifetimeConcentrated = isConcentrated(lifetime.level);
  const recentConcentrated = isConcentrated(recent.level);

  if (lifetimeConcentrated && recentConcentrated) {
    return 'Persistent concentration';
  }
  if (lifetimeConcentrated && !recentConcentrated) {
    return 'Historical concentration';
  }
  if (!lifetimeConcentrated && recentConcentrated) {
    return 'Emerging concentration';
  }
  return 'Persistently distributed';
}

function buildTemporalSummary(lifetime: ScopeRisk, recent: ScopeRisk | undefined, category: TemporalRiskCategory): string {
  if (category === 'No recent activity') {
    return 'This scope has lifetime history but no non-bot touches in the recent window.';
  }

  if (category === 'Insufficient recent evidence') {
    return 'This scope has recent activity, but fewer than 10 non-bot touches in the recent window.';
  }

  const recentLabel = recent
    ? `${recent.level} risk, ${recent.concentration}% concentration`
    : 'no comparable recent risk';

  return `Lifetime is ${lifetime.level} risk at ${lifetime.concentration}% concentration; recent is ${recentLabel}.`;
}

export function buildTemporalScopeRisks(
  lifetimeResult: AnalysisResult,
  recentResult: AnalysisResult
): TemporalScopeRisk[] {
  const lifetimeRisks = buildScopeRisks(lifetimeResult);
  const recentRisks = buildScopeRisks(recentResult, { minFilesAtRisk: 0 });
  const recentByScope = new Map(recentRisks.map((risk) => [risk.scope, risk]));
  const recentTouchesByScope = countNonBotTouchesByScope(recentResult);

  const categoryOrder: Record<TemporalRiskCategory, number> = {
    'Persistent concentration': 0,
    'Historical concentration': 1,
    'Emerging concentration': 2,
    'Persistently distributed': 3,
    'No recent activity': 4,
    'Insufficient recent evidence': 5,
  };

  return lifetimeRisks
    .map((lifetime) => {
      const recent = recentByScope.get(lifetime.scope);
      const recentTouches = recentTouchesByScope.get(lifetime.scope) ?? 0;
      const category = classifyTemporalRisk(lifetime, recent, recentTouches);

      return {
        scope: lifetime.scope,
        category,
        lifetime,
        recent,
        recentTouches,
        summary: buildTemporalSummary(lifetime, recent, category),
      };
    })
    .sort((a, b) => {
      return categoryOrder[a.category] - categoryOrder[b.category]
        || b.lifetime.concentration - a.lifetime.concentration;
    });
}
