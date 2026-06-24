import { AnalysisResult } from './types';
import { isBot } from './utils/botFilter';
import { isSourceScope } from './utils/scopeFilter';

// Builds the folder-level ownership view from a CANONICAL AnalysisResult — the
// same result `analyze` produces, which has already merged contributor
// identities and filtered bots. This replaces the old standalone `ownership`
// logic, which keyed by display name (splitting one person across two names,
// merging two people who share a name) and never filtered bots. Reusing the
// canonical pipeline makes this command agree with `risk` and `analyze`.

export interface FolderOwnership {
  folder: string;
  topOwner: string;
  topOwnerPercent: number;
  // null when analyze() produced no bus factor for this scope. We never
  // substitute contributor count for bus factor — they are different metrics.
  busFactor: number | null;
  contributors: Array<{ name: string; percent: number }>;
}

export interface OwnershipReport {
  totalCommits: number;
  totalContributors: number;
  totalFiles: number;
  folders: FolderOwnership[];
}

export function buildOwnershipReport(
  result: AnalysisResult,
  minFolderTouches = 3,
): OwnershipReport {
  const folderAuthors = new Map<string, Map<string, number>>();

  for (const [, stats] of result.fileStats) {
    const folder = stats.filepath.includes('/')
      ? stats.filepath.split('/')[0]
      : '(root)';
    if (!isSourceScope(folder)) continue;

    if (!folderAuthors.has(folder)) {
      folderAuthors.set(folder, new Map());
    }
    const authors = folderAuthors.get(folder)!;

    for (const [email, count] of stats.authorChanges) {
      const display = result.authorNameMap.get(email) ?? email;
      if (isBot(display, email)) continue; // never report bots as owners
      authors.set(email, (authors.get(email) ?? 0) + count);
    }
  }

  const busFactorByScope = new Map(
    result.busFactor.map((b) => [b.scope, b.busFactor]),
  );

  const folders: FolderOwnership[] = [];
  for (const [folder, authors] of folderAuthors) {
    const total = Array.from(authors.values()).reduce((a, b) => a + b, 0);
    if (total < minFolderTouches) continue;

    const sorted = Array.from(authors.entries()).sort((a, b) => b[1] - a[1]);
    const contributors = sorted.map(([email, count]) => ({
      name: result.authorNameMap.get(email) ?? email,
      percent: Math.round((count / total) * 1000) / 10,
    }));

    folders.push({
      folder,
      topOwner: contributors[0].name,
      topOwnerPercent: contributors[0].percent,
      busFactor: busFactorByScope.get(folder) ?? null,
      contributors,
    });
  }

  folders.sort((a, b) => b.topOwnerPercent - a.topOwnerPercent);

  return {
    totalCommits: result.totalCommits,
    totalContributors: result.totalAuthors,
    totalFiles: result.totalFiles,
    folders,
  };
}
