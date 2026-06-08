import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { parseCommits, validateRepo, buildFileStats } from './core/gitParser';
import { analyzeCoupling } from './analyzers/busFactorAnalyzer';

export function registerBlastCommand(program: Command): void {
  program
    .command('blast <filepath> [repoPath]')
    .description('Show what else breaks when you touch this file')
    .option('-s, --since <date>', 'Limit to commits after this date')
    .action(async (filepath: string, repoPath: string | undefined, options: { since?: string }) => {
      const resolvedPath = path.resolve(repoPath ?? '.');

      try {
        validateRepo(resolvedPath);

        const commits = parseCommits(resolvedPath, options.since);
        const normalizedTarget = filepath.replace(/\\/g, '/').replace(/^\.\//,'');

        // Find all commits that touched this file
        const targetCommits = commits.filter(c =>
          c.filesChanged.some(f => f === normalizedTarget || f.endsWith('/' + normalizedTarget))
        );

        if (targetCommits.length === 0) {
          console.error(chalk.red(`\n  No commits found for: ${filepath}\n`));
          process.exit(1);
        }

        // Count co-changes
        const coChanges = new Map<string, number>();
        for (const commit of targetCommits) {
          for (const f of commit.filesChanged) {
            const norm = f.replace(/\\/g, '/');
            if (norm === normalizedTarget || norm.endsWith('/' + normalizedTarget)) continue;
            coChanges.set(f, (coChanges.get(f) ?? 0) + 1);
          }
        }

        // Calculate blast radius scores
        const results = Array.from(coChanges.entries())
          .map(([file, count]) => ({
            file,
            count,
            pct: Math.round((count / targetCommits.length) * 100)
          }))
          .filter(r => r.pct >= 10)
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 15);

        const totalAffected = Array.from(coChanges.values()).filter(v =>
          Math.round((v / targetCommits.length) * 100) >= 10
        ).length;

        console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(` ${chalk.bold.white('⛏  git-arch blast')} — ${chalk.cyan(filepath)}`);
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log();
        console.log(`  ${chalk.hex('#A78BFA')('Based on')}       ${chalk.yellow.bold(String(targetCommits.length))} commits touching this file`);
        console.log(`  ${chalk.hex('#A78BFA')('Blast radius')}   ${chalk.yellow.bold(String(totalAffected))} files historically change together with it`);
        console.log();

        if (results.length === 0) {
          console.log(chalk.green('  ✓ This file changes independently — low blast radius.\n'));
          return;
        }

        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(` ${chalk.bold.white('Files that change with it')}`);
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log();

        for (const r of results) {
          const bar = '█'.repeat(Math.round(r.pct / 5)).padEnd(20);
          const pctColor = r.pct >= 75 ? chalk.red
            : r.pct >= 50 ? chalk.yellow
            : r.pct >= 25 ? chalk.white
            : chalk.grey;
          const file = r.file.length > 45 ? '...' + r.file.slice(-42) : r.file;
          console.log(`  ${pctColor(bar)} ${pctColor.bold((r.pct + '%').padStart(4))}  ${chalk.white(file)}`);
        }

        console.log();
        console.log(chalk.grey('  Percentage = how often this file changed in the same commit'));
        console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red('\n  ✖  Error: ') + message);
        process.exit(1);
      }
    });
}
