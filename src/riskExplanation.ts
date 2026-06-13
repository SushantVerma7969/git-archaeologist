import { AnalysisResult, RiskExplanation, RiskLevel, ScopeRisk } from './types';
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

export function buildScopeRisks(result: AnalysisResult): ScopeRisk[] {
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
    if (bf.filesAtRisk < 3) continue;

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
