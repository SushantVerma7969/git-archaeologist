import { AnalysisResult, RiskExplanation, RiskLevel, ScopeRisk } from './types';
interface ExplanationInput {
    level: RiskLevel;
    busFactor: number;
    concentration: number;
    contributors: number;
}
export declare function classifyScopeRisk(busFactor: number, concentration: number): RiskLevel;
export declare function buildRiskExplanation(input: ExplanationInput): RiskExplanation;
export declare function buildScopeRisks(result: AnalysisResult): ScopeRisk[];
export {};
//# sourceMappingURL=riskExplanation.d.ts.map