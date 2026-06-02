import { FileStats, BusFactor, CouplingPair } from '../types';
export declare function analyzeBusFactor(fileStatsMap: Map<string, FileStats>, authorNameMap: Map<string, string>): BusFactor[];
export declare function analyzeCoupling(commits: Array<{
    filesChanged: string[];
}>, minCoChanges?: number): CouplingPair[];
//# sourceMappingURL=busFactorAnalyzer.d.ts.map