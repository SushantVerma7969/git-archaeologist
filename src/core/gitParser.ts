import { execFileSync, execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
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
  // A freshly `git init`'d repo passes the check above but has no commits, so
  // every later `HEAD`-based git call would fail with a cryptic message. Detect
  // it here and fail with a clear, actionable error instead.
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], {
      cwd: repoPath,
      stdio: 'pipe',
    });
  } catch {
    throw new Error(`Repository has no commits yet: ${repoPath}`);
  }
  let isShallow = 'false';
  try {
    isShallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: repoPath,
      stdio: 'pipe',
    })
      .toString()
      .trim();
  } catch {
    // Ignore errors from old git versions that lack this flag
  }

  if (isShallow === 'true') {
    throw new Error(
      `Repository is a shallow clone (e.g. fetch-depth: 1). Git Archaeologist requires full history to analyze risk. Please run: git fetch --unshallow`,
    );
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

// Build a map from any historical path to the file's CURRENT (final) path, by
// following git's rename detection across all of history. Without this, a file
// renamed lib/old.js -> lib/new.js reads as two separate files, each with half
// the history — which halves its change count and corrupts its curse score,
// concentration, and bus factor. Folding the history onto the final path fixes
// that.
//
// This is a SEPARATE, additive parse (`--name-status -M`) so the main
// parseCommits path — and its co-author logic — is untouched. The map is then
// applied as a path transform after the normal parse.
export async function buildRenameMap(
  repoPath: string,
  since?: string,
): Promise<Map<string, string>> {
  const args = ['log', '-M', '--name-status', '-z', '--pretty=format:'];
  if (since) args.push(`--since=${since}`);

  let raw: string;
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: repoPath,
      maxBuffer: 512 * 1024 * 1024,
    });
    raw = stdout.toString();
  } catch {
    return new Map(); // rename detection is best-effort; never break analysis over it
  }

  // Collect raw rename edges old -> new. Tokens are NUL-separated; a rename is
  // the triple R<sim> \0 <old> \0 <new>. Non-rename entries are <status>\0<path>
  // and are skipped. We can't rely on whitespace; we walk tokens by shape.
  const tokens = raw.split('\0').filter((t) => t.length > 0);
  const edges: Array<{ from: string; to: string }> = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // rename/copy status tokens look like R100, R087, C100 etc.
    if (/^[RC]\d{1,3}$/.test(t) && i + 2 < tokens.length) {
      const from = tokens[i + 1];
      const to = tokens[i + 2];
      edges.push({ from, to });
      i += 2; // consume old + new
    }
  }

  // Resolve each path to its FINAL name by following the chain forward.
  // git log default order is newest-first, so a later edge in the stream is an
  // OLDER rename. We resolve transitively in either direction by repeatedly
  // collapsing from -> to until no `from` is itself the `to` of another edge.
  const direct = new Map<string, string>();
  for (const { from, to } of edges) {
    // if `to` was already renamed onward, point straight at the latest target
    direct.set(from, to);
  }

  function resolveFinal(path: string, guard = 0): string {
    if (guard > 1000) return path; // cycle safety
    const next = direct.get(path);
    if (next === undefined || next === path) return path;
    return resolveFinal(next, guard + 1);
  }

  const finalMap = new Map<string, string>();
  for (const from of direct.keys()) {
    finalMap.set(from, resolveFinal(from));
  }
  return finalMap;
}

export async function parseCommits(
  repoPath: string,
  since?: string,
  followRenames: boolean = true,
): Promise<CommitRecord[]> {
  const DELIMITER = '||GITARCH||';
  const BEGIN_MARKER = 'BEGINCOMMIT' + DELIMITER;

  // Map every historical path to its final name so a renamed file's history is
  // folded onto one path instead of split across two. Built once, applied below.
  const renameMap = followRenames ? await buildRenameMap(repoPath, since) : new Map();

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

  const { stdout } = await execFileAsync('git', args, {
    cwd: repoPath,
    maxBuffer: 512 * 1024 * 1024,
  });
  const raw = stdout.toString();

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
      // fold each historical path onto its final (current) name so renamed
      // files accumulate one continuous history instead of splitting in two
      .map((f) => renameMap.get(f) ?? f)
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
