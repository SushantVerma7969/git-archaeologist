import { ContributorChurn, AnalysisResult, RiskExplanation, AbandonedScope, RiskLevel, ScopeRisk, TemporalScopeRisk, YearlyConcentrationSeries, OwnershipTransition, EvolutionSummary, HotspotScope } from './types';
import { isSourceScope } from './utils/scopeFilter';
export { isSourceScope };
interface ExplanationInput {
    level: RiskLevel;
    busFactor: number;
    concentration: number;
    contributors: number;
}
export declare function classifyScopeRisk(busFactor: number, concentration: number): RiskLevel;
export declare function buildRiskExplanation(input: ExplanationInput): RiskExplanation;
interface ScopeRiskOptions {
    minFilesAtRisk?: number;
}
export declare function buildScopeRisks(result: AnalysisResult, options?: ScopeRiskOptions): ScopeRisk[];
export declare function buildTemporalScopeRisks(lifetimeResult: AnalysisResult, recentResult: AnalysisResult): TemporalScopeRisk[];
export declare function buildYearlyConcentrationSeries(result: AnalysisResult): YearlyConcentrationSeries[];
export declare function buildOwnershipTransitions(result: AnalysisResult): OwnershipTransition[];
export declare function buildEvolutionSummary(temporalRisks: TemporalScopeRisk[], ownershipTransitions: OwnershipTransition[]): EvolutionSummary;
export declare function buildContributorChurn(result: AnalysisResult): ContributorChurn[];
export declare function buildAbandonedScopes(risks: ScopeRisk[], churn: ContributorChurn[]): AbandonedScope[];
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
export declare function buildHotspots(inputs: HotspotInputs, options?: BuildHotspotsOptions): HotspotScope[];
//# sourceMappingURL=riskExplanation.d.ts.map