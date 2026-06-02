import { FileStats, FileOwnership } from '../types';
export declare function analyzeOwnership(fileStatsMap: Map<string, FileStats>, authorNameMap: Map<string, string>): FileOwnership[];
export declare function buildAuthorNameMap(commits: Array<{
    authorEmail: string;
    authorName: string;
}>): Map<string, string>;
//# sourceMappingURL=ownershipAnalyzer.d.ts.map