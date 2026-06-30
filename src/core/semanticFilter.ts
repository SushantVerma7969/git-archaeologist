import { CommitRecord } from '../types';

/**
 * Calculates the 95th percentile of file counts across all commits in a repository.
 */
function get95thPercentile(commits: CommitRecord[]): number {
  if (commits.length === 0) return 15;
  const sizes = commits.map((c) => c.filesChanged.length).sort((a, b) => a - b);
  const idx = Math.floor(sizes.length * 0.95);
  // Cap at 100 to prevent massive repos from allowing 3000-file commits
  return Math.min(Math.max(sizes[idx], 5), 100);
}

/**
 * Determines if a commit is a mechanical change or a semantic engineering change.
 */
function isMechanicalCommit(commit: CommitRecord, threshold95: number): boolean {
  // 1. Threshold Filter (Sweeping)
  if (commit.filesChanged.length > threshold95) return true;

  const msg = commit.message?.trim().toLowerCase() || '';

  // 2. Lexical Filter (Conventional Commits)
  const mechanicalPrefixes = [
    'chore',
    'style',
    'docs',
    'build',
    'ci',
    'test',
    'release',
    'lint',
    'format',
  ];
  if (
    mechanicalPrefixes.some((p) => msg.startsWith(p + ':') || msg.startsWith(p + '('))
  ) {
    return true;
  }

  // 3. Dependency / Bot Filter
  if (
    commit.authorName.toLowerCase().includes('bot') ||
    commit.authorEmail.toLowerCase().includes('bot') ||
    msg.startsWith('bump') ||
    msg.includes('dependency') ||
    msg.includes('dependabot') ||
    msg.includes('renovate')
  ) {
    return true;
  }

  // 4. Merge/Revert Filter
  if (msg.startsWith('merge ') || msg.startsWith('revert "')) {
    return true;
  }

  // 5. Formatting fallback
  if (
    msg.includes('prettier') ||
    msg.includes('eslint --fix') ||
    msg.startsWith('format:')
  ) {
    return true;
  }

  return false;
}

/**
 * Applies temporal grouping to merge adjacent commits by the same author.
 * Grouping window: 2 hours (7200 seconds).
 */
function applyTemporalGrouping(commits: CommitRecord[]): CommitRecord[] {
  // Sort chronologically
  const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp);

  const grouped: CommitRecord[] = [];
  const groupStartMap = new Map<string, number>();

  for (const commit of sorted) {
    const author = commit.authorEmail;
    if (grouped.length === 0) {
      grouped.push({ ...commit });
      groupStartMap.set(author, commit.timestamp);
      continue;
    }

    const last = grouped[grouped.length - 1];
    const groupStart = groupStartMap.get(author) ?? last.timestamp;

    // If same author and within 2 hours of the START of the group
    if (last.authorEmail === author && commit.timestamp - groupStart <= 7200) {
      // Merge files (unique)
      const mergedFiles = new Set([...last.filesChanged, ...commit.filesChanged]);
      last.filesChanged = Array.from(mergedFiles);
      // Extend timestamp to cover the window
      last.timestamp = commit.timestamp;
      // Append message
      last.message = last.message + '\\n' + commit.message;
    } else {
      grouped.push({ ...commit });
      groupStartMap.set(author, commit.timestamp);
    }
  }

  return grouped;
}

/**
 * Main entry point for semantic filtering.
 */
export function applySemanticFiltering(commits: CommitRecord[]): CommitRecord[] {
  const threshold95 = get95thPercentile(commits);

  // 1. Group commits temporally
  const grouped = applyTemporalGrouping(commits);

  // 2. Filter out mechanical commits
  const filtered = grouped.filter((c) => !isMechanicalCommit(c, threshold95));

  return filtered;
}

/**
 * Applies a TF-IDF style penalty to co-changes to suppress repository "stop-words"
 * like package.json or global lockfiles.
 *
 * @param coChanges Map of file -> co-change count
 * @param globalCommits The fully filtered list of all commits in the repo
 */
export function applyTfIdfPenalty(
  coChanges: Map<string, number>,
  globalCommits: CommitRecord[],
): Map<string, number> {
  const totalCommits = globalCommits.length;

  // Calculate global document frequency for each file
  const docFrequency = new Map<string, number>();
  for (const c of globalCommits) {
    for (const f of c.filesChanged) {
      docFrequency.set(f, (docFrequency.get(f) ?? 0) + 1);
    }
  }

  const penalizedCoChanges = new Map<string, number>();

  for (const [file, rawCoChangeCount] of coChanges.entries()) {
    const df = docFrequency.get(file) ?? rawCoChangeCount;
    // IDF: log(Total Commits / Document Frequency)
    // We add 1 to prevent division by zero or negative logs.
    const idf = Math.log10(totalCommits / (df + 1));

    // The raw co-change probability is rawCoChangeCount / targetCommits.length.
    // We penalize files with very low IDF (high global frequency).
    // An average file changing in 1% of commits has high IDF.
    // package.json changing in 40% of commits has very low IDF.
    // Let's create a multiplier based on expected baseline IDF.
    // Assume a "normal" file changes in 1% of commits:
    const normalIdf = Math.log10(totalCommits / (totalCommits * 0.01 + 1));

    // Cap multiplier at 1.0 so we don't accidentally inflate true couplings,
    // we only penalize high-frequency files.
    const penaltyMultiplier = Math.min(1.0, idf / normalIdf);

    const weightedCount = rawCoChangeCount * penaltyMultiplier;
    penalizedCoChanges.set(file, weightedCount);
  }

  return penalizedCoChanges;
}
