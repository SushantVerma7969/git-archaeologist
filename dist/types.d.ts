import type { Recommendation } from './recommendations';
export interface CommitRecord {
    hash: string;
    authorEmail: string;
    authorName: string;
    timestamp: number;
    filesChanged: string[];
}
export interface FileStats {
    filepath: string;
    totalChanges: number;
    uniqueAuthors: Set<string>;
    authorChanges: Map<string, number>;
    authorChangesByYear: Map<number, Map<string, number>>;
    firstChanged: number;
    lastChanged: number;
    changeTimeline: number[];
}
export interface FileOwnership {
    filepath: string;
    owner: string;
    ownerEmail: string;
    ownershipPercent: number;
    contributors: Array<{
        name: string;
        email: string;
        changes: number;
        percent: number;
    }>;
}
export interface CursedFile {
    filepath: string;
    curseScore: number;
    totalChanges: number;
    uniqueAuthors: number;
    recencyWeight: number;
    reasons: string[];
    noisy?: boolean;
}
export interface BusFactor {
    scope: string;
    busFactor: number;
    atRiskAuthors: string[];
    filesAtRisk: number;
    warning: string;
}
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export interface RiskExplanation {
    reasons: string[];
    summary: string;
}
export interface ScopeRisk {
    scope: string;
    level: RiskLevel;
    busFactor: number;
    concentration: number;
    contributors: number;
    totalFileTouches: number;
    topOwner: string;
    filesAtRisk: number;
    explanation: RiskExplanation;
    lastActive?: string;
    lastActiveDays?: number;
    recommendations?: Recommendation[];
}
export type TemporalRiskCategory = 'Persistent concentration' | 'Historical concentration' | 'Emerging concentration' | 'Persistently distributed' | 'No recent activity' | 'Insufficient recent evidence';
export interface TemporalScopeRisk {
    scope: string;
    category: TemporalRiskCategory;
    lifetime: ScopeRisk;
    recent?: ScopeRisk;
    recentTouches: number;
    delta: number | null;
    summary: string;
    trend: 'rising' | 'declining' | 'stable' | 'insufficient_data';
    recommendations?: Recommendation[];
}
export interface YearlyConcentrationPoint {
    year: number;
    commitCount: number;
    concentration: number | null;
}
export interface YearlyConcentrationSeries {
    scope: string;
    points: YearlyConcentrationPoint[];
    direction: 'rising' | 'declining' | 'stable' | 'insufficient_data';
}
export interface OwnershipTransition {
    scope: string;
    fromOwner: string;
    toOwner: string;
    fromYear: number;
    toYear: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    explanation: string;
}
export interface EvolutionSummary {
    ownershipTransitions: number;
    highSeverityTransitions: number;
    emergingConcentration: number;
    historicalConcentration: number;
    persistentConcentration: number;
    distributedScopes: number;
}
export interface ContributorChurn {
    scope: string;
    contributors: number;
    inactiveContributors: number;
    churnPercent: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
}
export interface AbandonedScope {
    scope: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    ownerInactiveDays: number;
    churnPercent: number;
    concentration: number;
    explanation: string;
}
export interface HotspotSignal {
    name: string;
    reason: string;
}
export interface HotspotScope {
    scope: string;
    signalsFired: number;
    signals: HotspotSignal[];
    concentration: number;
    busFactor: number;
    explanation: RiskExplanation;
    recommendations?: Recommendation[];
}
export interface CouplingPair {
    fileA: string;
    fileB: string;
    coChanges: number;
    couplingScore: number;
}
export interface AnalysisResult {
    repoPath: string;
    repoName: string;
    analyzedAt: Date;
    totalCommits: number;
    totalFiles: number;
    totalAuthors: number;
    dateRange: {
        from: Date;
        to: Date;
    };
    cursedFiles: CursedFile[];
    ownership: FileOwnership[];
    busFactor: BusFactor[];
    coupling: CouplingPair[];
    fileStats: Map<string, FileStats>;
    lastActiveByAuthor: Map<string, number>;
}
//# sourceMappingURL=types.d.ts.map