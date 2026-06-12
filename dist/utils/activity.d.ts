import { CommitRecord } from '../types';
/**
 * Build a map of email -> most recent commit timestamp (unix seconds),
 * across the full commit history regardless of `--since` filtering.
 */
export declare function buildLastActiveMap(commits: CommitRecord[]): Map<string, number>;
/**
 * Format a unix timestamp as a human-readable "X ago" string.
 */
export declare function formatTimeAgo(timestamp: number, now?: number): string;
//# sourceMappingURL=activity.d.ts.map