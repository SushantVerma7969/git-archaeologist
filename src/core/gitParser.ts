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

// Parse "Co-authored-by: Name <email>" trailers from a commit body. These are
// the GitHub/Git standard for crediting multiple people on one commit (squash
// merges, pair programming). We dedupe and drop any that equal the primary
// author so a self-trailer can't double-count.
function parseCoAuthors(
  body: string,
  primaryEmail: string,
): Array<{ email: string; name: string }> {
  if (!body || !/co-authored-by/i.test(body)) return [];
  const out: Array<{ email: string; name: string }> = [];
  const seen = new Set<string>([primaryEmail.trim().toLowerCase()]);
  const re = /co-authored-by:\s*(.+?)\s*<([^>]+)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const name = m[1].trim();
    const email = m[2].trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({ email, name });
  }
  return out;
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
  // The body (%b) is appended last, after the file list would normally go —
  // but with -z and --name-only the body lands on the header line before the
  // NUL-separated paths. We capture it via the delimiter so trailer parsing
  // (Co-authored-by:) is unambiguous and the path-parsing below is untouched.
  const args = [
    'log',
    `--pretty=format:${BEGIN_MARKER}%H${DELIMITER}%ae${DELIMITER}%an${DELIMITER}%at${DELIMITER}%b${DELIMITER}ENDBODY`,
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
    // Header layout: <hash>|<email>|<name>|<ts>|<body...>|ENDBODY\n<paths NUL-sep>
    // The body may contain newlines, so we locate the ENDBODY sentinel rather
    // than splitting on the first newline.
    const endBodyIdx = block.indexOf(`${DELIMITER}ENDBODY`);
    if (endBodyIdx === -1) continue;

    const headerAndBody = block.slice(0, endBodyIdx);
    const afterEndBody = block.slice(endBodyIdx + `${DELIMITER}ENDBODY`.length);
    // paths begin after the newline that follows ENDBODY
    const nlIdx = afterEndBody.indexOf('\n');
    const filesRaw = nlIdx === -1 ? '' : afterEndBody.slice(nlIdx + 1);

    // Split header from body: first 4 delimiters are fixed fields, the rest is body.
    const segments = headerAndBody.split(DELIMITER);
    if (segments.length < 4) continue;
    const [hash, authorEmail, authorName, tsRaw] = segments;
    const body = segments.slice(4).join(DELIMITER);

    const timestamp = parseInt(tsRaw, 10);
    if (isNaN(timestamp)) continue;

    const coAuthors = parseCoAuthors(body, authorEmail);

    const filesChanged = filesRaw
      .split('\0')
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .filter(
        (f) =>
          !f.startsWith('node_modules/') &&
          !f.startsWith('.git/') &&
          !f.startsWith('dist/') &&
          !f.startsWith('build/') &&
          !f.startsWith('coverage/') &&
          !f.endsWith('.map') &&
          !f.endsWith('.d.ts'),
      );

    commits.push({ hash, authorEmail, authorName, timestamp, filesChanged, coAuthors });
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
        (stats.authorChanges.get(commit.authorEmail) ?? 0) + 1,
      );
      const year = new Date(commit.timestamp * 1000).getUTCFullYear();

      if (!stats.authorChangesByYear.has(year)) {
        stats.authorChangesByYear.set(year, new Map());
      }

      const yearlyAuthors = stats.authorChangesByYear.get(year)!;

      yearlyAuthors.set(
        commit.authorEmail,
        (yearlyAuthors.get(commit.authorEmail) ?? 0) + 1,
      );

      // Co-authors share OWNERSHIP credit (authorChanges, uniqueAuthors, yearly)
      // but do NOT increment totalChanges or the change timeline: the file
      // changed once, by N people. This de-biases concentration and bus factor
      // toward the truth (a pair-programmed module is not single-owner) without
      // distorting the curse score, whose change-count input must stay = commits.
      for (const co of commit.coAuthors ?? []) {
        // Skip a co-author who is the primary author (some squash workflows
        // emit a self-trailer); they're already credited above.
        if (co.email === commit.authorEmail) continue;
        stats.uniqueAuthors.add(co.email);
        stats.authorChanges.set(co.email, (stats.authorChanges.get(co.email) ?? 0) + 1);
        yearlyAuthors.set(co.email, (yearlyAuthors.get(co.email) ?? 0) + 1);
      }

      if (commit.timestamp < stats.firstChanged) stats.firstChanged = commit.timestamp;
      if (commit.timestamp > stats.lastChanged) stats.lastChanged = commit.timestamp;
      stats.changeTimeline.push(commit.timestamp);
    }
  }

  return statsMap;
}
