import {
  AnalysisResult,
  OwnershipTransition,
  EvolutionSummary,
  TemporalScopeRisk,
} from '../types';
import { isSourceScope } from '../utils/scopeFilter';

export function buildOwnershipTransitions(result: AnalysisResult): OwnershipTransition[] {
  const transitions: OwnershipTransition[] = [];

  const scopeData = new Map<string, Map<number, Map<string, number>>>();
  for (const [, stats] of result.fileStats) {
    const scope = stats.filepath.includes('/') ? stats.filepath.split('/')[0] : '(root)';

    if (!scopeData.has(scope)) {
      scopeData.set(scope, new Map());
    }

    const yearlyScopeData = scopeData.get(scope)!;

    for (const [year, authors] of stats.authorChangesByYear) {
      if (!yearlyScopeData.has(year)) {
        yearlyScopeData.set(year, new Map());
      }

      const scopeAuthors = yearlyScopeData.get(year)!;

      for (const [author, count] of authors) {
        scopeAuthors.set(author, (scopeAuthors.get(author) ?? 0) + count);
      }
    }
  }
  for (const [scope, yearlyData] of scopeData) {
    const years = Array.from(yearlyData.keys()).sort((a, b) => a - b);

    const dominantOwners: {
      year: number;
      owner: string;
      share: number;
    }[] = [];

    for (const year of years) {
      const authors = yearlyData.get(year)!;

      const sorted = Array.from(authors.entries()).sort((a, b) => b[1] - a[1]);

      if (sorted.length === 0) {
        continue;
      }

      const total = Array.from(authors.values()).reduce((a, b) => a + b, 0);

      const share = total === 0 ? 0 : (sorted[0][1] / total) * 100;

      dominantOwners.push({
        year,
        owner: sorted[0][0],
        share,
      });
    }
    for (let i = 1; i < dominantOwners.length; i++) {
      const previous = dominantOwners[i - 1];
      const current = dominantOwners[i];

      let severity: 'LOW' | 'MEDIUM' | 'HIGH';

      if (current.share >= 80) {
        severity = 'HIGH';
      } else if (current.share >= 50) {
        severity = 'MEDIUM';
      } else {
        severity = 'LOW';
      }

      if (previous.owner === current.owner) {
        continue;
      }

      const explanation =
        severity === 'HIGH'
          ? 'Ownership shifted and remains highly concentrated in a single contributor.'
          : severity === 'MEDIUM'
            ? 'Ownership shifted and responsibility is concentrated across a small contributor group.'
            : 'Ownership shifted while work remained relatively distributed.';

      transitions.push({
        scope,
        fromOwner: previous.owner,
        toOwner: current.owner,
        fromYear: previous.year,
        toYear: current.year,
        severity,
        explanation,
      });
    }
  }

  return transitions.filter((t) => isSourceScope(t.scope));
}

export function buildEvolutionSummary(
  temporalRisks: TemporalScopeRisk[],
  ownershipTransitions: OwnershipTransition[],
): EvolutionSummary {
  return {
    ownershipTransitions: ownershipTransitions.length,

    highSeverityTransitions: ownershipTransitions.filter((t) => t.severity === 'HIGH')
      .length,

    emergingConcentration: temporalRisks.filter(
      (r) => r.category === 'Emerging concentration',
    ).length,

    historicalConcentration: temporalRisks.filter(
      (r) => r.category === 'Historical concentration',
    ).length,

    persistentConcentration: temporalRisks.filter(
      (r) => r.category === 'Persistent concentration',
    ).length,

    distributedScopes: temporalRisks.filter(
      (r) => r.category === 'Persistently distributed',
    ).length,
  };
}
