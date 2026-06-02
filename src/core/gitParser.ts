import { execSync } from 'child_process';
import * as path from 'path';
import { CommitRecord, FileStats } from '../types';

export function validateRepo(repoPath: string): void {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: repoPath,
      stdio: 'pipe',
    });
  } catch {
    throw new Error(`Not a valid git repository: ${repoPath}`);
  }
}

export function getRepoName(repoPath: string): string {
  try {
    const remote = execSync('git remote get-url origin', {
      cwd: repoPath,
      stdio: 'pipe',
    })
      .toString()
      .trim();
    const match = remote.match(/\/([^/]+?)(\.git)?$/);
    if (match) return match[1];
  } catch {
    // no remote, fall back to folder name
  }
  return path.basename(path.resolve(repoPath));
}

export function getTotalCommitCount(repoPath: string): number {
  const out = execSync('git rev-list --count HEAD', {
    cwd: repoPath,
    stdio: 'pipe',
  })
    .toString()
    .trim();
  return parseInt(out, 10);
}

export function parseCommits(repoPath: string): CommitRecord[] {
  const DELIMITER = '||GITARCH||';
  const RAW_SEP = '||COMMIT_END||';

  const raw = execSync(
    `git log --pretty=format:"%H${DELIMITER}%ae${DELIMITER}%an${DELIMITER}%at${RAW_SEP}" --name-only`,
    { cwd: repoPath, stdio: 'pipe', maxBuffer: 512 * 1024 * 1024 }
  ).toString();

  const commits: CommitRecord[] = [];
  const blocks = raw.split(RAW_SEP).map((b) => b.trim()).filter(Boolean);

  for (const block of blocks) {
    const newlineIdx = block.indexOf('\n');
    if (newlineIdx === -1) continue;

    const header = block.substring(0, newlineIdx).trim();
    const filesRaw = block.substring(newlineIdx + 1).trim();

    const parts = header.split(DELIMITER);
    if (parts.length !== 4) continue;

    const [hash, authorEmail, authorName, tsRaw] = parts;
    const timestamp = parseInt(tsRaw, 10);
    if (isNaN(timestamp)) continue;

    const filesChanged = filesRaw
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0 && !f.includes(DELIMITER));

    commits.push({ hash, authorEmail, authorName, timestamp, filesChanged });
  }

  return commits;
}

export function buildFileStats(commits: CommitRecord[]): Map<string, FileStats> {
  const statsMap = new Map<string, FileStats>();

  for (const commit of commits) {
    for (const filepath of commit.filesChanged) {
      if (!statsMap.has(filepath)) {
        statsMap.set(filepath, {
          filepath,
          totalChanges: 0,
          uniqueAuthors: new Set(),
          authorChanges: new Map(),
          firstChanged: commit.timestamp,
          lastChanged: commit.timestamp,
          changeTimeline: [],
        });
      }

      const stats = statsMap.get(filepath)!;
      stats.totalChanges += 1;
      stats.uniqueAuthors.add(commit.authorEmail);
      stats.authorChanges.set(
        commit.authorEmail,
        (stats.authorChanges.get(commit.authorEmail) ?? 0) + 1
      );
      if (commit.timestamp < stats.firstChanged) {
        stats.firstChanged = commit.timestamp;
      }
      if (commit.timestamp > stats.lastChanged) {
        stats.lastChanged = commit.timestamp;
      }
      stats.changeTimeline.push(commit.timestamp);
    }
  }

  return statsMap;
}
