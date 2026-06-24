import {
  ScopeRisk,
  ContributorChurn,
  AbandonedScope,
  OwnershipTransition,
  TemporalScopeRisk,
  HotspotScope,
  HotspotSignal,
} from '../types';
import { buildHotspotRecommendations } from '../recommendations';
import { isSourceScope } from '../utils/scopeFilter';
import { severityRank } from './shared';

interface HotspotInputs {
  scopeRisks: ScopeRisk[];
  churn: ContributorChurn[];
  abandoned: AbandonedScope[];
  transitions: OwnershipTransition[];
  temporal: TemporalScopeRisk[];
}

interface BuildHotspotsOptions {
  minSignals?: number;
}

// A hotspot is an explainable AGGREGATION of signals already computed
// elsewhere — never a new opaque score. Each scope accumulates the
// independent signals that fired for it, every one carrying its own
// evidence string. Ranking is by how many signals fired (tie-broken by
// concentration), so the output stays fully auditable: the reader can
// always see WHY a scope surfaced, not just that it did.
export function buildHotspots(
  inputs: HotspotInputs,
  options: BuildHotspotsOptions = {},
): HotspotScope[] {
  const minSignals = options.minSignals ?? 2;

  const churnByScope = new Map(inputs.churn.map((c) => [c.scope, c]));
  const abandonedByScope = new Map(inputs.abandoned.map((a) => [a.scope, a]));
  const temporalByScope = new Map(inputs.temporal.map((t) => [t.scope, t]));
  const transitionsByScope = new Map<string, OwnershipTransition>();
  for (const t of inputs.transitions) {
    // Keep the highest-severity transition per scope as the representative
    const existing = transitionsByScope.get(t.scope);
    if (!existing || severityRank(t.severity) < severityRank(existing.severity)) {
      transitionsByScope.set(t.scope, t);
    }
  }

  const hotspots: HotspotScope[] = [];

  for (const risk of inputs.scopeRisks) {
    if (!isSourceScope(risk.scope)) {
      continue;
    }

    const signals: HotspotSignal[] = [];
    const signalNames: string[] = [];

    // Signal: bus factor of 1 (concentration of activity in one identity)
    if (risk.busFactor === 1) {
      signals.push({
        name: 'bus-factor',
        reason: `Bus factor is 1 (${risk.concentration}% of touches from one identity)`,
      });
      signalNames.push('bus-factor');
    }

    // Signal: contributor churn, but only where the scope is also
    // concentrated. In long-lived repos almost every folder has high
    // lifetime churn (most past contributors stop committing eventually),
    // so churn alone does not discriminate. Paired with a low bus factor
    // it points at a real continuity gap: the people who knew this area
    // have moved on and few hands remain.
    const churn = churnByScope.get(risk.scope);
    if (
      churn &&
      (churn.level === 'HIGH' || churn.level === 'MEDIUM') &&
      risk.busFactor <= 2
    ) {
      signals.push({
        name: 'churn',
        reason: `Contributor churn ${churn.churnPercent}% with bus factor ${risk.busFactor} (${churn.inactiveContributors} of ${churn.contributors} inactive >12 months)`,
      });
      signalNames.push('churn');
    }

    // Signal: dominant contributor inactive (abandoned-scope evidence)
    const abandoned = abandonedByScope.get(risk.scope);
    if (abandoned) {
      signals.push({
        name: 'owner-inactive',
        reason: `Dominant contributor inactive ${abandoned.ownerInactiveDays} days [${abandoned.severity}]`,
      });
      signalNames.push('owner-inactive');
    } else if (risk.lastActiveDays !== undefined && risk.lastActiveDays > 365) {
      signals.push({
        name: 'owner-inactive',
        reason: `Latest analyzed activity from the dominant contributor was ${risk.lastActiveDays} days ago`,
      });
      signalNames.push('owner-inactive');
    }

    // Signal: concentration rising recently
    const temporal = temporalByScope.get(risk.scope);
    if (
      temporal &&
      temporal.trend === 'rising' &&
      (temporal.category === 'Emerging concentration' ||
        temporal.category === 'Persistent concentration')
    ) {
      const deltaLabel =
        temporal.delta !== null
          ? ` (${temporal.delta > 0 ? '+' : ''}${temporal.delta} pts vs lifetime)`
          : '';
      signals.push({
        name: 'rising-concentration',
        reason: `Concentration rising recently${deltaLabel}`,
      });
      signalNames.push('rising-concentration');
    }

    // Signal: an ownership transition occurred in this scope
    const transition = transitionsByScope.get(risk.scope);
    if (transition) {
      signals.push({
        name: 'ownership-transition',
        reason: `Ownership shifted ${transition.fromYear} → ${transition.toYear} [${transition.severity}]`,
      });
      signalNames.push('ownership-transition');
    }

    if (signals.length < minSignals) {
      continue;
    }

    hotspots.push({
      scope: risk.scope,
      signalsFired: signals.length,
      signals,
      concentration: risk.concentration,
      busFactor: risk.busFactor,
      explanation: {
        reasons: signals.map((s) => s.reason),
        summary: `${signals.length} distinct maintenance-risk signals fired for this scope. These are starting points for investigation, not conclusions about ownership or maintainership.`,
      },
      recommendations: buildHotspotRecommendations(signalNames),
    });
  }

  return hotspots.sort(
    (a, b) => b.signalsFired - a.signalsFired || b.concentration - a.concentration,
  );
}
