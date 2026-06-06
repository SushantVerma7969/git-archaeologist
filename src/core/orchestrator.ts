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

export async function analyze(repoPath: string, since?: string): Promise<AnalysisResult> {
  const spinner = ora({ text: 'Validating repository...', color: 'magenta' }).start();

  try {
    // Step 1 — validate
    validateRepo(repoPath);
    const repoName = getRepoName(repoPath);
    const totalCommits = getTotalCommitCount(repoPath, since);
    const sinceLabel = since ? ` (since ${since})` : '';
    spinner.text = `Parsing ${totalCommits.toLocaleString()} commits in ${repoName}${sinceLabel}...`;

    // Step 2 — parse all commits
    const commits = parseCommits(repoPath, since);
    spinner.text = 'Building file statistics...';

    // Step 3 — build per-file stats
    const fileStats = buildFileStats(commits);

    // Step 4 — build author name lookup
    const authorNameMap = buildAuthorNameMap(commits);

    spinner.text = 'Scoring cursed files...';

    // Step 5 — run all analyzers
    const cursedFiles = scoreCursedFiles(fileStats);

    spinner.text = 'Analyzing ownership...';
    const ownership = analyzeOwnership(fileStats, authorNameMap);

    spinner.text = 'Calculating bus factor...';
    const busFactor = analyzeBusFactor(fileStats, authorNameMap);

    spinner.text = 'Detecting implicit coupling...';
    const coupling = analyzeCoupling(commits);

    // Step 6 — collect date range
    const allTimestamps = commits.map((c) => c.timestamp);
    const minTs = allTimestamps.reduce((a, b) => a < b ? a : b, allTimestamps[0] ?? 0);
    const maxTs = allTimestamps.reduce((a, b) => a > b ? a : b, allTimestamps[0] ?? 0);

    // Step 7 — count unique authors
    const allAuthors = new Set(commits.map((c) => c.authorEmail));

    spinner.succeed(`Analysis complete — ${fileStats.size.toLocaleString()} files scanned`);

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
    };
  } catch (err) {
    spinner.fail('Analysis failed');
    throw err;
  }
}
