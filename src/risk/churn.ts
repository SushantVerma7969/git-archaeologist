import { AnalysisResult, ContributorChurn, AbandonedScope, ScopeRisk } from '../types';
import { isSourceScope } from '../utils/scopeFilter';
import { buildNonBotEmailSet } from './shared';

export function buildContributorChurn(
  result: AnalysisResult,
  now: number = Date.now() / 1000,
): ContributorChurn[] {
  const twelveMonths = 365 * 24 * 60 * 60;

  const nonBotEmails = buildNonBotEmailSet(result);

  const scopeContributors = new Map<string, Set<string>>();

  for (const [, stats] of result.fileStats) {
    const parts = stats.filepath.split('/');
    const scope = parts.length > 1 ? parts[0] : '(root)';

    if (!scopeContributors.has(scope)) {
      scopeContributors.set(scope, new Set());
    }

    const contributors = scopeContributors.get(scope)!;

    for (const email of stats.uniqueAuthors) {
      if (!nonBotEmails.has(email)) {
        continue;
      }

      contributors.add(email);
    }
  }

  const churn: ContributorChurn[] = [];

  for (const [scope, contributors] of scopeContributors) {
    if (contributors.size === 0) {
      continue;
    }

    let inactiveContributors = 0;

    for (const email of contributors) {
      const lastActive = result.lastActiveByAuthor.get(email);

      if (lastActive !== undefined && now - lastActive > twelveMonths) {
        inactiveContributors++;
      }
    }

    const churnPercent = Number(
      ((inactiveContributors / contributors.size) * 100).toFixed(1),
    );

    let level: 'LOW' | 'MEDIUM' | 'HIGH';

    if (churnPercent >= 50) {
      level = 'HIGH';
    } else if (churnPercent >= 25) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }

    churn.push({
      scope,
      contributors: contributors.size,
      inactiveContributors,
      churnPercent,
      level,
    });
  }

  return churn
    .filter((c) => isSourceScope(c.scope))
    .sort((a, b) => b.churnPercent - a.churnPercent);
}

export function buildAbandonedScopes(
  risks: ScopeRisk[],
  churn: ContributorChurn[],
): AbandonedScope[] {
  const churnMap = new Map(churn.map((c) => [c.scope, c]));

  const results: AbandonedScope[] = [];

  for (const risk of risks) {
    if (!isSourceScope(risk.scope)) {
      continue;
    }
    const scopeChurn = churnMap.get(risk.scope);

    if (!scopeChurn || risk.lastActiveDays === undefined) {
      continue;
    }

    let severity: 'LOW' | 'MEDIUM' | 'HIGH';

    if (
      risk.concentration >= 50 &&
      risk.lastActiveDays > 365 &&
      scopeChurn.churnPercent >= 50
    ) {
      severity = 'HIGH';
    } else if (
      risk.concentration >= 40 &&
      risk.lastActiveDays > 180 &&
      scopeChurn.churnPercent >= 25
    ) {
      severity = 'MEDIUM';
    } else {
      severity = 'LOW';
    }

    if (severity === 'LOW') {
      continue;
    }

    results.push({
      scope: risk.scope,
      severity,
      ownerInactiveDays: risk.lastActiveDays,
      churnPercent: scopeChurn.churnPercent,
      concentration: risk.concentration,
      explanation:
        severity === 'HIGH'
          ? 'Owner inactive for over a year and contributor churn is high.'
          : 'Owner inactivity and contributor churn may indicate declining stewardship.',
    });
  }

  return results.sort((a, b) => {
    const order = {
      HIGH: 0,
      MEDIUM: 1,
      LOW: 2,
    };

    return order[a.severity] - order[b.severity];
  });
}
