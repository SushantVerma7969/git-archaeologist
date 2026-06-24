import ora from 'ora';
import { AnalysisResult } from '../types';
import {
  validateRepo,
  getRepoName,
  getTotalCommitCount,
  parseCommits,
  buildFileStats,
} from './gitParser';
import { scoreCursedFiles } from '../analyzers/curseScorer';
import { analyzeOwnership, buildAuthorNameMap } from '../analyzers/ownershipAnalyzer';
import { analyzeBusFactor, analyzeCoupling } from '../analyzers/busFactorAnalyzer';
import { buildLastActiveMap } from '../utils/activity';
import { buildIdentityMap, loadIdentityOverrides } from '../utils/identity';

export async function analyze(
  repoPath: string,
  since?: string,
  silent = false,
): Promise<AnalysisResult> {
  const spinner = silent
    ? null
    : ora({ text: 'Validating repository...', color: 'magenta' }).start();

  try {
    // Step 1 — validate
    validateRepo(repoPath);
    const repoName = getRepoName(repoPath);
    const totalCommits = getTotalCommitCount(repoPath, since);
    const sinceLabel = since ? ` (since ${since})` : '';
    if (spinner) {
      spinner.text = `Parsing ${totalCommits.toLocaleString()} commits in ${repoName}${sinceLabel}...`;
    }

    // Step 2 — parse all commits
    const commits = parseCommits(repoPath, since);

    // Step 2b — canonicalize contributor identities. One person who commits
    // under several emails (joe@fb.com, joe@meta.com, the GitHub noreply form)
    // would otherwise read as several contributors, inflating bus factor and
    // deflating ownership. Rewriting each commit's authorEmail to a canonical
    // email here means every downstream analyzer gets merged identities with
    // no analyzer changes. Conservative by default; correctable via a
    // .git-arch-identities file in the repo root.
    const overrides = loadIdentityOverrides(repoPath);
    const identity = buildIdentityMap(
      commits.map((c) => ({ email: c.authorEmail, name: c.authorName })),
      overrides,
    );
    for (const c of commits) {
      const canonical = identity.emailToCanonical.get(c.authorEmail.trim().toLowerCase());
      if (canonical) c.authorEmail = canonical;
    }

    if (spinner) {
      spinner.text = 'Building file statistics...';
    }

    // Step 3 — build per-file stats
    const fileStats = buildFileStats(commits);

    // Step 4 — build author name lookup
    const authorNameMap = buildAuthorNameMap(commits);

    if (spinner) {
      spinner.text = 'Scoring cursed files...';
    }

    // Step 5 — run all analyzers
    const cursedFiles = scoreCursedFiles(fileStats);

    if (spinner) {
      spinner.text = 'Analyzing ownership...';
    }
    const ownership = analyzeOwnership(fileStats, authorNameMap);

    if (spinner) {
      spinner.text = 'Calculating bus factor...';
    }
    const busFactor = analyzeBusFactor(fileStats, authorNameMap);

    if (spinner) {
      spinner.text = 'Detecting implicit coupling...';
    }
    const coupling = analyzeCoupling(commits);

    // Step 6 — collect date range
    const allTimestamps = commits.map((c) => c.timestamp);
    const minTs =
      allTimestamps.length > 0 ? allTimestamps.reduce((a, b) => (a < b ? a : b)) : 0;
    const maxTs =
      allTimestamps.length > 0 ? allTimestamps.reduce((a, b) => (a > b ? a : b)) : 0;

    // Step 7 — count unique authors
    const allAuthors = new Set(commits.map((c) => c.authorEmail));
    const lastActiveByAuthor = buildLastActiveMap(commits);

    if (spinner) {
      spinner.succeed(
        `Analysis complete — ${fileStats.size.toLocaleString()} files scanned`,
      );
    }

    return {
      repoPath,
      repoName,
      analyzedAt: new Date(),
      totalCommits,
      totalFiles: fileStats.size,
      totalAuthors: allAuthors.size,
      dateRange: {
        from: new Date(minTs * 1000),
        to: new Date(maxTs * 1000),
      },
      cursedFiles,
      ownership,
      busFactor,
      coupling,
      fileStats,
      lastActiveByAuthor,
      identityMerges: identity.merges,
    };
  } catch (err) {
    if (spinner) {
      spinner.fail('Analysis failed');
    }
    throw err;
  }
}
