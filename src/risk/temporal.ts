import {
  AnalysisResult,
  ScopeRisk,
  TemporalRiskCategory,
  TemporalScopeRisk,
  YearlyConcentrationPoint,
  YearlyConcentrationSeries,
} from '../types';
import { calculateConcentration } from '../utils/concentration';
import { isSourceScope } from '../utils/scopeFilter';
import { buildTemporalRecommendations } from '../recommendations';
import { isConcentrated, buildNonBotEmailSet } from './shared';
import { buildScopeRisks } from './scopeRisk';

function countNonBotTouchesByScope(
  result: AnalysisResult,
  nonBotEmails: Set<string>,
): Map<string, number> {
  const touches = new Map<string, number>();

  for (const [, stats] of result.fileStats) {
    const parts = stats.filepath.split('/');
    const folder = parts.length > 1 ? parts[0] : '(root)';
    let total = 0;

    for (const [email, count] of stats.authorChanges) {
      if (!nonBotEmails.has(email)) continue;
      total += count;
    }

    touches.set(folder, (touches.get(folder) ?? 0) + total);
  }

  return touches;
}

function classifyTemporalRisk(
  lifetime: ScopeRisk,
  recent?: ScopeRisk,
  recentTouches = 0,
): TemporalRiskCategory {
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

function buildTemporalSummary(
  lifetime: ScopeRisk,
  recent: ScopeRisk | undefined,
  category: TemporalRiskCategory,
): string {
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
  recentResult: AnalysisResult,
): TemporalScopeRisk[] {
  const lifetimeRisks = buildScopeRisks(lifetimeResult);
  const recentRisks = buildScopeRisks(recentResult, { minFilesAtRisk: 0 });
  const recentByScope = new Map(recentRisks.map((risk) => [risk.scope, risk]));
  const recentTouchesByScope = countNonBotTouchesByScope(
    recentResult,
    buildNonBotEmailSet(recentResult),
  );

  const categoryOrder: Record<TemporalRiskCategory, number> = {
    'Persistent concentration': 0,
    'Historical concentration': 1,
    'Emerging concentration': 2,
    'Persistently distributed': 3,
    'No recent activity': 4,
    'Insufficient recent evidence': 5,
  };

  return lifetimeRisks
    .filter((lifetime) => isSourceScope(lifetime.scope))
    .map((lifetime) => {
      const recent = recentByScope.get(lifetime.scope);
      const recentTouches = recentTouchesByScope.get(lifetime.scope) ?? 0;
      const category = classifyTemporalRisk(lifetime, recent, recentTouches);

      const series = buildYearlyConcentrationSeries(lifetimeResult).find(
        (s) => s.scope === lifetime.scope,
      );

      return {
        scope: lifetime.scope,
        category,
        lifetime,
        recent,
        recentTouches,
        delta: recent
          ? Number((recent.concentration - lifetime.concentration).toFixed(1))
          : null,
        trend: series?.direction ?? 'insufficient_data',
        summary: buildTemporalSummary(lifetime, recent, category),
        recommendations: buildTemporalRecommendations(category),
      };
    })
    .sort((a, b) => {
      return (
        categoryOrder[a.category] - categoryOrder[b.category] ||
        b.lifetime.concentration - a.lifetime.concentration
      );
    });
}

function classifySeriesDirection(
  points: YearlyConcentrationPoint[],
): 'rising' | 'declining' | 'stable' | 'insufficient_data' {
  const valid = points.filter((p) => p.concentration !== null);

  if (valid.length < 2) {
    return 'insufficient_data';
  }

  const first = valid[0].concentration!;
  const last = valid[valid.length - 1].concentration!;

  const diff = last - first;

  if (Math.abs(diff) < 10) {
    return 'stable';
  }

  return diff > 0 ? 'rising' : 'declining';
}

export function buildYearlyConcentrationSeries(
  result: AnalysisResult,
): YearlyConcentrationSeries[] {
  const series: YearlyConcentrationSeries[] = [];
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

    const points: YearlyConcentrationPoint[] = [];

    for (const year of years) {
      const authors = yearlyData.get(year)!;

      points.push({
        year,
        commitCount: Array.from(authors.values()).reduce((a, b) => a + b, 0),
        concentration: calculateConcentration(authors),
      });
    }

    series.push({
      scope,
      points,
      direction: classifySeriesDirection(points),
    });
  }

  return series;
}
