import { execFileSync } from 'child_process';
import * as path from 'path';
import { CommitRecord, FileStats } from '../types';

export function validateRepo(repoPath: string): void {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: repoPath,
      stdio: 'pipe',
    });
  } catch {
    throw new Error(`Not a valid git repository: ${repoPath}`);
  }
}

export function getRepoName(repoPath: string): string {
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
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

export function getTotalCommitCount(repoPath: string, since?: string): number {
  // Args passed as an array so `since` is never interpolated into a shell.
  const args = ['rev-list', '--count', 'HEAD'];
  if (since) args.push(`--since=${since}`);
  const out = execFileSync('git', args, {
    cwd: repoPath,
    stdio: 'pipe',
  })
    .toString()
    .trim();
  return parseInt(out, 10);
}

export function parseCommits(repoPath: string, since?: string): CommitRecord[] {
  const DELIMITER = '||GITARCH||';
  const BEGIN_MARKER = 'BEGINCOMMIT' + DELIMITER;

  // NUL-terminated output (`-z`) makes parsing unambiguous: git separates
  // each pathname with a NUL and each commit's path list ends with an extra
  // NUL. Because pathnames are delimited by NUL rather than newline, a file
  // whose name contains spaces, newlines, or looks like a timestamp can never
  // be confused with anything else — which is why no downstream "is this a
  // real path?" guard is needed. The args are passed as an array (not a shell
  // string) so `since` cannot be interpolated into a shell command.
  const args = [
    'log',
    `--pretty=format:${BEGIN_MARKER}%H${DELIMITER}%ae${DELIMITER}%an${DELIMITER}%at`,
    '--name-only',
    '-z',
  ];
  if (since) args.push(`--since=${since}`);

  const raw = execFileSync('git', args, {
    cwd: repoPath,
    stdio: 'pipe',
    maxBuffer: 512 * 1024 * 1024,
  }).toString();

  const commits: CommitRecord[] = [];

  // With -z, the stream is: <header>\n<path>\0<path>\0...\0\0<header>\n...
  // Split on the BEGIN_MARKER to get per-commit blocks, then within each
  // block the header is the first line and the remaining NUL-separated
  // tokens are pathnames.
  const blocks = raw.split(BEGIN_MARKER).filter((b) => b.length > 0);

  for (const block of blocks) {
    const newlineIdx = block.indexOf('\n');
    const header = (newlineIdx === -1 ? block : block.slice(0, newlineIdx)).trim();
    const filesRaw = newlineIdx === -1 ? '' : block.slice(newlineIdx + 1);

    const parts = header.split(DELIMITER);
    if (parts.length !== 4) continue;

    const [hash, authorEmail, authorName, tsRaw] = parts;
    const timestamp = parseInt(tsRaw, 10);
    if (isNaN(timestamp)) continue;

    const filesChanged = filesRaw
      .split('\0')
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .filter((f) =>
        !f.startsWith('node_modules/') &&
        !f.startsWith('.git/') &&
        !f.startsWith('dist/') &&
        !f.startsWith('build/') &&
        !f.startsWith('coverage/') &&
        !f.endsWith('.map') &&
        !f.endsWith('.d.ts')
      );

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
          authorChangesByYear: new Map(),
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
      const year = new Date(commit.timestamp * 1000).getUTCFullYear();

if (!stats.authorChangesByYear.has(year)) {
  stats.authorChangesByYear.set(year, new Map());
}

const yearlyAuthors = stats.authorChangesByYear.get(year)!;

yearlyAuthors.set(
  commit.authorEmail,
  (yearlyAuthors.get(commit.authorEmail) ?? 0) + 1
);
      if (commit.timestamp < stats.firstChanged) stats.firstChanged = commit.timestamp;
      if (commit.timestamp > stats.lastChanged) stats.lastChanged = commit.timestamp;
      stats.changeTimeline.push(commit.timestamp);
    }
  }

  return statsMap;
}
