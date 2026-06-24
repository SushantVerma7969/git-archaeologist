// This module was split into focused files under ./risk for readability.
// It remains as the public entry point so existing imports keep working —
// all risk-analysis functions are still imported from './riskExplanation'.
export { isSourceScope } from './utils/scopeFilter';
export {
  classifyScopeRisk,
  buildRiskExplanation,
  buildScopeRisks,
} from './risk/scopeRisk';
export { buildTemporalScopeRisks, buildYearlyConcentrationSeries } from './risk/temporal';
export { buildOwnershipTransitions, buildEvolutionSummary } from './risk/evolution';
export { buildContributorChurn, buildAbandonedScopes } from './risk/churn';
export { buildHotspots } from './risk/hotspots';
