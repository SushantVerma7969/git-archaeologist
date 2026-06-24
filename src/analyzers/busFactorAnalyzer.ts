import { FileStats, BusFactor, CouplingPair } from '../types';
import { isBot } from '../utils/botFilter';
import { isSourceScope } from '../utils/scopeFilter';

export function analyzeBusFactor(
  fileStatsMap: Map<string, FileStats>,
  authorNameMap: Map<string, string>,
): BusFactor[] {
  const folderMap = new Map<string, Map<string, number>>();
  for (const [, stats] of fileStatsMap) {
    const parts = stats.filepath.split('/');
    const folder = parts.length > 1 ? parts[0] : '(root)';
    if (!folderMap.has(folder)) {
      folderMap.set(folder, new Map());
    }
    const authorTotals = folderMap.get(folder)!;
    for (const [email, count] of stats.authorChanges) {
      const name = authorNameMap.get(email) ?? email;
      if (isBot(name, email)) continue;
      authorTotals.set(email, (authorTotals.get(email) ?? 0) + count);
    }
  }

  const results: BusFactor[] = [];
  for (const [folder, authorTotals] of folderMap) {
    if (!isSourceScope(folder)) {
      continue;
    }
    const totalChanges = Array.from(authorTotals.values()).reduce((a, b) => a + b, 0);
    if (totalChanges === 0) continue;
    const sorted = Array.from(authorTotals.entries()).sort((a, b) => b[1] - a[1]);
    let cumulative = 0;
    let busFactor = 0;
    const atRiskAuthors: string[] = [];
    for (const [email, count] of sorted) {
      cumulative += count;
      busFactor += 1;
      atRiskAuthors.push(authorNameMap.get(email) ?? email);
      if (cumulative / totalChanges >= 0.5) break;
    }
    const filesAtRisk =
      folder === '(root)'
        ? Array.from(fileStatsMap.values()).filter((s) => !s.filepath.includes('/'))
            .length
        : Array.from(fileStatsMap.values()).filter((s) =>
            s.filepath.startsWith(folder + '/'),
          ).length;
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
  minCoChanges: number = 5,
): CouplingPair[] {
  const coChangeMap = new Map<string, number>();
  const fileChangeCount = new Map<string, number>();
  for (const commit of commits) {
    const files = commit.filesChanged.filter((f) => f.length > 0);
    for (const file of files) {
      fileChangeCount.set(file, (fileChangeCount.get(file) ?? 0) + 1);
    }
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
    // Coupling between fixtures, config, generated, or snapshot/test files is
    // not an actionable hidden dependency — these co-change by design. Skip a
    // pair if either side is non-source or a test fixture.
    if (
      !isSourceScope(scopeOf(fileA)) ||
      !isSourceScope(scopeOf(fileB)) ||
      isTestFixture(fileA) ||
      isTestFixture(fileB)
    ) {
      continue;
    }
    const maxChanges = Math.max(
      fileChangeCount.get(fileA) ?? 1,
      fileChangeCount.get(fileB) ?? 1,
    );
    const couplingScore = Math.round((coChanges / maxChanges) * 1000) / 10;
    results.push({ fileA, fileB, coChanges, couplingScore });
  }
  // Rank by score, but break ties by raw co-change count so a 30/30 pair
  // outranks a trivially-perfect 5/5 one. A high score on tiny evidence is
  // weaker than the same score backed by many co-changes.
  return results
    .sort((a, b) => b.couplingScore - a.couplingScore || b.coChanges - a.coChanges)
    .slice(0, 30);
}

function scopeOf(filepath: string): string {
  return filepath.includes('/') ? filepath.split('/')[0] : '(root)';
}

// Snapshot, fixture, and test files co-change by design (a snapshot updates
// whenever its test does), so they swamp the coupling table with expected
// pairs rather than the hidden, code-level dependencies the view exists to find.
const TEST_FIXTURE_PATTERNS = [
  /\.expect\.[a-z]+$/i,
  /\.snap$/i,
  /__snapshots__\//,
  /\/__tests__\//,
  /\/fixtures?\//,
  /\.test\.[a-z]+$/i,
  /\.spec\.[a-z]+$/i,
];

function isTestFixture(filepath: string): boolean {
  return TEST_FIXTURE_PATTERNS.some((p) => p.test(filepath));
}
