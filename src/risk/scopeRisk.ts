import { AnalysisResult, RiskExplanation, RiskLevel, ScopeRisk } from '../types';
import { calculateConcentration } from '../utils/concentration';
import { formatTimeAgo } from '../utils/activity';
import { buildRiskRecommendations } from '../recommendations';
import { buildNonBotEmailSet } from './shared';

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
    const summary =
      input.busFactor === 1
        ? 'One contributor still accounts for enough history to create continuity risk.'
        : 'Knowledge is shared, but still concentrated across a small contributor set.';
    return { reasons, summary };
  }

  return {
    reasons,
    summary: `Knowledge appears distributed across ${input.contributors} contributor identities.`,
  };
}

interface ScopeRiskOptions {
  minFilesAtRisk?: number;
}

export function buildScopeRisks(
  result: AnalysisResult,
  options: ScopeRiskOptions = {},
  now: number = Date.now() / 1000,
): ScopeRisk[] {
  const minFilesAtRisk = options.minFilesAtRisk ?? 3;
  const nonBotEmails = buildNonBotEmailSet(result);
  const folderAuthorChanges = new Map<string, Map<string, number>>();
  for (const [, stats] of result.fileStats) {
    const parts = stats.filepath.split('/');
    const folder = parts.length > 1 ? parts[0] : '(root)';
    if (!folderAuthorChanges.has(folder)) folderAuthorChanges.set(folder, new Map());
    const authorTotals = folderAuthorChanges.get(folder)!;
    for (const [email, count] of stats.authorChanges) {
      if (!nonBotEmails.has(email)) continue;
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

    const concentration = calculateConcentration(authorTotals);
    if (concentration === null) continue;

    const contributors = authorTotals.size;
    const topOwner = bf.atRiskAuthors[0] ?? 'unknown';
    const level = classifyScopeRisk(bf.busFactor, concentration);
    const explanationInput = {
      level,
      busFactor: bf.busFactor,
      concentration,
      contributors,
    };

    const ownerEmail = nameToEmail.get(topOwner);
    const lastActiveTs = ownerEmail
      ? result.lastActiveByAuthor.get(ownerEmail)
      : undefined;
    let lastActive: string | undefined;
    let lastActiveDays: number | undefined;

    if (lastActiveTs !== undefined) {
      lastActive = formatTimeAgo(lastActiveTs);

      lastActiveDays = Math.floor((now - lastActiveTs) / 86400);
    }
    const recommendations = buildRiskRecommendations(level, bf.busFactor, lastActive);

    risks.push({
      scope: folder,
      level,
      busFactor: bf.busFactor,
      concentration,
      contributors,
      totalFileTouches: total,
      topOwner,
      filesAtRisk: bf.filesAtRisk,
      explanation: buildRiskExplanation(explanationInput),
      recommendations,
      lastActive,
      lastActiveDays,
    });
  }

  const order: Record<'HIGH' | 'MEDIUM' | 'LOW', number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };
  return risks.sort(
    (a, b) => order[a.level] - order[b.level] || b.concentration - a.concentration,
  );
}
