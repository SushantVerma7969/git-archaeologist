import { CommitRecord, FileStats } from '../types';
export declare function validateRepo(repoPath: string): void;
export declare function getRepoName(repoPath: string): string;
export declare function getTotalCommitCount(repoPath: string): number;
export declare function parseCommits(repoPath: string): CommitRecord[];
export declare function buildFileStats(commits: CommitRecord[]): Map<string, FileStats>;
//# sourceMappingURL=gitParser.d.ts.map