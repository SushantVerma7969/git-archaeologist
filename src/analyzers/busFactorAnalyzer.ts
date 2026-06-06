import { FileStats, BusFactor, CouplingPair } from '../types';

export function analyzeBusFactor(
  fileStatsMap: Map<string, FileStats>,
  authorNameMap: Map<string, string>
): BusFactor[] {
  // Group files by top-level folder
  const folderMap = new Map<string, Map<string, number>>();

  for (const [, stats] of fileStatsMap) {
    const parts = stats.filepath.split('/');
    const folder = parts.length > 1 ? parts[0] : '(root)';

    if (!folderMap.has(folder)) {
      folderMap.set(folder, new Map());
    }

    const authorTotals = folderMap.get(folder)!;
    for (const [email, count] of stats.authorChanges) {
      authorTotals.set(email, (authorTotals.get(email) ?? 0) + count);
    }
  }

  const results: BusFactor[] = [];

  for (const [folder, authorTotals] of folderMap) {
    const totalChanges = Array.from(authorTotals.values()).reduce((a, b) => a + b, 0);
    if (totalChanges === 0) continue;

    const sorted = Array.from(authorTotals.entries())
      .sort((a, b) => b[1] - a[1]);

    // Bus factor = how many top authors account for >50% of all changes
    let cumulative = 0;
    let busFactor = 0;
    const atRiskAuthors: string[] = [];

    for (const [email, count] of sorted) {
      cumulative += count;
      busFactor += 1;
      atRiskAuthors.push(authorNameMap.get(email) ?? email);
      if (cumulative / totalChanges >= 0.5) break;
    }

    const filesAtRisk = folder === '(root)'
      ? Array.from(fileStatsMap.values()).filter((s) => !s.filepath.includes('/')).length
      : Array.from(fileStatsMap.values()).filter((s) => s.filepath.startsWith(folder + '/')).length;

    let warning = '';
    if (busFactor === 1) {
      warning = `⚠️  Single point of failure — only ${atRiskAuthors[0]} owns this module`;
    } else if (busFactor === 2) {
      warning = `⚡ High risk — only 2 people understand this module`;
    } else {
      warning = `✓ Healthy ownership spread`;
    }

    results.push({ scope: folder, busFactor, atRiskAuthors, filesAtRisk, warning });
  }

  return results.sort((a, b) => a.busFactor - b.busFactor);
}

export function analyzeCoupling(
  commits: Array<{ filesChanged: string[] }>,
  minCoChanges: number = 3
): CouplingPair[] {
  const coChangeMap = new Map<string, number>();
  const fileChangeCount = new Map<string, number>();

  for (const commit of commits) {
    const files = commit.filesChanged.filter((f) => f.length > 0);

    for (const file of files) {
      fileChangeCount.set(file, (fileChangeCount.get(file) ?? 0) + 1);
    }

    // For every pair of files in this commit, increment their co-change count
    // Skip commits touching too many files (bulk commits, merges) — they add noise
    if (files.length > 50) continue;
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const key = [files[i], files[j]].sort().join('|||');
        coChangeMap.set(key, (coChangeMap.get(key) ?? 0) + 1);
      }
    }
  }

  const results: CouplingPair[] = [];

  for (const [key, coChanges] of coChangeMap) {
    if (coChanges < minCoChanges) continue;

    const [fileA, fileB] = key.split('|||');
    const maxChanges = Math.max(
      fileChangeCount.get(fileA) ?? 1,
      fileChangeCount.get(fileB) ?? 1
    );

    // Coupling score = how often they change together relative to how often each changes
    const couplingScore = Math.round((coChanges / maxChanges) * 1000) / 10;

    results.push({ fileA, fileB, coChanges, couplingScore });
  }

  return results
    .sort((a, b) => b.couplingScore - a.couplingScore)
    .slice(0, 30);
}
