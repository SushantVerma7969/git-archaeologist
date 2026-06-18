import { AnalysisResult, RiskExplanation, RiskLevel, ScopeRisk, TemporalScopeRisk, YearlyConcentrationSeries } from './types';
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
export {};
//# sourceMappingURL=riskExplanation.d.ts.map