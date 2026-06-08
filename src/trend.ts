import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { parseCommits, validateRepo, buildFileStats } from './core/gitParser';
import { scoreCursedFiles } from './analyzers/curseScorer';

export function registerTrendCommand(program: Command): void {
  program
    .command('trend [repoPath]')
    .alias('t')
    .description('Show which files are getting more dangerous over time')
    .option('-n, --top <number>', 'Number of files to show', '10')
    .action(async (repoPath: string | undefined, options: { top: string }) => {
      const resolvedPath = path.resolve(repoPath ?? '.');
      const topN = parseInt(options.top, 10);

      try {
        validateRepo(resolvedPath);

        function dateStr(daysAgo: number): string {
          const d = new Date();
          d.setDate(d.getDate() - daysAgo);
          return d.toISOString().split('T')[0];
        }

        // Period A: 180 to 90 days ago (older)
        const olderCommits = parseCommits(resolvedPath, dateStr(180))
          .filter(c => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 90);
            return c.timestamp < cutoff.getTime() / 1000;
          });

        // Period B: last 90 days (recent)
        const recentCommits = parseCommits(resolvedPath, dateStr(90));

        if (recentCommits.length === 0) {
          console.log(chalk.grey('\n  No commits in the last 90 days.\n'));
          return;
        }

        // Count changes per file in each period
        const olderCount = new Map<string, number>();
        for (const c of olderCommits) {
          for (const f of c.filesChanged) {
            olderCount.set(f, (olderCount.get(f) ?? 0) + 1);
          }
        }

        const recentCount = new Map<string, number>();
        for (const c of recentCommits) {
          for (const f of c.filesChanged) {
            recentCount.set(f, (recentCount.get(f) ?? 0) + 1);
          }
        }

        // Find files with increasing activity
        const allFiles = new Set([...olderCount.keys(), ...recentCount.keys()]);
        const trends: Array<{ file: string; older: number; recent: number; delta: number }> = [];

        for (const file of allFiles) {
          const older = olderCount.get(file) ?? 0;
          const recent = recentCount.get(file) ?? 0;
          if (older + recent < 3) continue;
          trends.push({ file, older, recent, delta: recent - older });
        }

        const worse = trends.sort((a, b) => b.delta - a.delta).slice(0, topN);
        const better = trends.sort((a, b) => a.delta - b.delta).slice(0, 5);

        console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(' ' + chalk.bold.white('⛏  git-arch trend') + chalk.grey(' — activity shift: 90d ago vs last 90d'));
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(chalk.grey('  Older period commits: ' + olderCommits.length + '  |  Recent commits: ' + recentCommits.length));

        if (worse.filter(t => t.delta > 0).length === 0) {
          console.log(chalk.green('\n  ✓ No files significantly more active recently.\n'));
        } else {
          console.log('\n' + chalk.red.bold('  ⬆ More active recently (potential risk increase):'));
          for (const t of worse.filter(t => t.delta > 0)) {
            const file = t.file.length > 50 ? '...' + t.file.slice(-47) : t.file;
            const delta = chalk.red.bold('+' + t.delta);
            const detail = chalk.grey(`(${t.older} → ${t.recent} changes)`);
            console.log('  ' + chalk.red('↑') + ' ' + chalk.white(file.padEnd(52)) + delta + ' ' + detail);
          }
        }

        const gettingBetter = better.filter(t => t.delta < 0).slice(0, 5);
        if (gettingBetter.length > 0) {
          console.log('\n' + chalk.green.bold('  ⬇ Less active recently (stabilizing):'));
          for (const t of gettingBetter) {
            const file = t.file.length > 50 ? '...' + t.file.slice(-47) : t.file;
            const delta = chalk.green.bold(String(t.delta));
            const detail = chalk.grey(`(${t.older} → ${t.recent} changes)`);
            console.log('  ' + chalk.green('↓') + ' ' + chalk.white(file.padEnd(52)) + delta + ' ' + detail);
          }
        }

        console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red('\n  ✖  Error: ') + message);
        process.exit(1);
      }
    });
}
