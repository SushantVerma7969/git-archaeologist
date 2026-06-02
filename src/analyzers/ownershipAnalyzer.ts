import { FileStats, FileOwnership } from '../types';

export function analyzeOwnership(
  fileStatsMap: Map<string, FileStats>,
  authorNameMap: Map<string, string>
): FileOwnership[] {
  const results: FileOwnership[] = [];

  for (const [, stats] of fileStatsMap) {
    if (stats.totalChanges === 0) continue;

    const contributors = Array.from(stats.authorChanges.entries())
      .map(([email, changes]) => ({
        name: authorNameMap.get(email) ?? email,
        email,
        changes,
        percent: Math.round((changes / stats.totalChanges) * 1000) / 10,
      }))
      .sort((a, b) => b.changes - a.changes);

    const top = contributors[0];

    results.push({
      filepath: stats.filepath,
      owner: top.name,
      ownerEmail: top.email,
      ownershipPercent: top.percent,
      contributors,
    });
  }

  return results.sort((a, b) => b.ownershipPercent - a.ownershipPercent);
}

export function buildAuthorNameMap(
  commits: Array<{ authorEmail: string; authorName: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of commits) {
    if (!map.has(c.authorEmail)) {
      map.set(c.authorEmail, c.authorName);
    }
  }
  return map;
}
