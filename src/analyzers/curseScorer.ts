import { FileStats, CursedFile } from '../types';

const NOW = Date.now() / 1000;
const ONE_YEAR_SECS = 365 * 24 * 60 * 60;

function recencyWeight(lastChangedTimestamp: number): number {
  const ageInYears = (NOW - lastChangedTimestamp) / ONE_YEAR_SECS;
  // Files touched recently score higher — exponential decay
  return Math.exp(-0.5 * ageInYears);
}

function churnRate(timeline: number[]): number {
  if (timeline.length < 2) return 0;
  const sorted = [...timeline].sort((a, b) => a - b);
  const spanYears = (sorted[sorted.length - 1] - sorted[0]) / ONE_YEAR_SECS;
  if (spanYears === 0) return timeline.length;
  return timeline.length / spanYears;
}

export function scoreCursedFiles(
  fileStatsMap: Map<string, FileStats>,
  topN: number = 20
): CursedFile[] {
  const results: CursedFile[] = [];

  for (const [, stats] of fileStatsMap) {
    const authorCount = stats.uniqueAuthors.size;
    const recency = recencyWeight(stats.lastChanged);
    const churn = churnRate(stats.changeTimeline);

    // Curse score formula:
    // Base = total changes × author count
    // Multiplied by recency (recent files are more dangerous)
    // Multiplied by churn rate (files changed frequently per year)
    const curseScore = Math.round(
      stats.totalChanges * Math.log2(authorCount + 1) * recency * Math.log2(churn + 2) * 100
    ) / 100;

    const reasons: string[] = [];
    if (stats.totalChanges > 50) reasons.push(`Changed ${stats.totalChanges} times`);
    if (authorCount > 5) reasons.push(`Touched by ${authorCount} different authors`);
    if (churn > 20) reasons.push(`High churn rate (${Math.round(churn)}x/year)`);
    if (recency > 0.8) reasons.push('Modified very recently');

    results.push({
      filepath: stats.filepath,
      curseScore,
      totalChanges: stats.totalChanges,
      uniqueAuthors: authorCount,
      recencyWeight: Math.round(recency * 100) / 100,
      reasons: reasons.length > 0 ? reasons : ['Mild instability'],
    });
  }

  return results
    .sort((a, b) => b.curseScore - a.curseScore)
    .slice(0, topN);
}
