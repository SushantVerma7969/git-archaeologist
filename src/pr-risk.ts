import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { parseCommits, validateRepo, buildFileStats } from './core/gitParser';
import { buildAuthorNameMap } from './analyzers/ownershipAnalyzer';
import { scoreCursedFiles } from './analyzers/curseScorer';
import { analyzeBusFactor } from './analyzers/busFactorAnalyzer';
import { scorePrRisk } from './pr-risk-core';

export function registerPrRiskCommand(program: Command): void {
  program
    .command('pr-risk [repoPath]')
    .alias('pr')
    .description(
      'Score the risk of your current uncommitted/staged changes before pushing',
    )
    .option('-b, --base <branch>', 'Base branch to compare against', 'main')
    .option('-s, --since <date>', 'Limit historical analysis to commits after this date')
    .action(
      async (repoPath: string | undefined, options: { base: string; since?: string }) => {
        const resolvedPath = path.resolve(repoPath ?? '.');

        try {
          validateRepo(resolvedPath);

          // Get changed files vs base branch. Args are passed as an array to
          // execFileSync (never a shell string) so `base` — a user-supplied
          // flag — cannot be interpolated into a shell command.
          let changedFiles: string[] = [];
          const tryArgs = (args: string[]): string => {
            try {
              return execFileSync('git', args, {
                encoding: 'utf8',
                cwd: resolvedPath,
                stdio: 'pipe',
              }).trim();
            } catch {
              return '';
            }
          };

          // Try various strategies to get changed files
          const strategies = [
            ['diff', '--name-only', `${options.base}...HEAD`],
            ['diff', '--name-only', `origin/${options.base}...HEAD`],
            ['diff', '--name-only', 'HEAD~1..HEAD'],
            ['diff', '--name-only', '--cached'],
            ['diff', '--name-only'],
          ];

          for (const strategy of strategies) {
            const result = tryArgs(strategy);
            if (result) {
              changedFiles = result.split('\n').filter(Boolean);
              break;
            }
          }

          if (changedFiles.length === 0) {
            console.log(
              chalk.grey('\n  No changed files detected vs ' + options.base + '.'),
            );
            console.log(chalk.grey('  Make sure you have commits or staged changes.\n'));
            return;
          }

          // Run historical analysis
          const commits = parseCommits(resolvedPath, options.since);
          const fileStats = buildFileStats(commits);
          const cursedFiles = scoreCursedFiles(fileStats, 100);
          const authorNameMap = buildAuthorNameMap(commits);
          const busFactor = analyzeBusFactor(fileStats, authorNameMap);

          const cursedMap = new Map(cursedFiles.map((f) => [f.filepath, f]));
          const busFactor1 = busFactor.filter((b) => b.busFactor === 1);

          // Score via the pure core: headline = worst file, not the mean.
          const report = scorePrRisk({ changedFiles, commits, cursedFiles, busFactor });
          const totalRisk = report.score;
          const fileRisks = report.highRiskFiles;

          const riskEmoji = totalRisk >= 75 ? '🔴' : totalRisk >= 40 ? '🟡' : '🟢';
          const riskLabel =
            totalRisk >= 75 ? 'HIGH RISK' : totalRisk >= 40 ? 'MEDIUM RISK' : 'LOW RISK';
          const riskColor =
            totalRisk >= 75 ? chalk.red : totalRisk >= 40 ? chalk.yellow : chalk.green;

          console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
          console.log(
            ` ${chalk.bold.white('⛏  git-arch pr-risk')} — ${chalk.grey(options.base + '...HEAD')}`,
          );
          console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
          console.log();
          console.log(
            `  ${riskEmoji}  ${riskColor.bold('Risk Score: ' + totalRisk + '/100 — ' + riskLabel)}`,
          );
          console.log();
          console.log(
            `  ${chalk.hex('#A78BFA')('Files changed')}   ${chalk.yellow.bold(String(changedFiles.length))}`,
          );
          console.log(
            `  ${chalk.hex('#A78BFA')('High-risk files')} ${chalk.yellow.bold(String(fileRisks.length))}`,
          );
          console.log();

          if (fileRisks.length === 0) {
            console.log(chalk.green('  ✓ No high-risk files detected in this change.\n'));
          } else {
            fileRisks.sort((a, b) => b.risk - a.risk);

            console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk.bold.white('Risk breakdown by file')}`);
            console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
            console.log();

            for (const { file, risk, reasons } of fileRisks) {
              const fc = risk >= 75 ? chalk.red : risk >= 40 ? chalk.yellow : chalk.white;
              console.log(`  ${fc.bold(file)}`);
              for (const r of reasons) {
                console.log(`    ${chalk.grey('→')} ${chalk.white(r)}`);
              }
              console.log();
            }

            // Safe files
            const safeFiles = report.safeFiles;
            if (safeFiles.length > 0) {
              console.log(
                chalk.green(`  ✓ Safe files (${safeFiles.length}): `) +
                  chalk.grey(
                    safeFiles.slice(0, 5).join(', ') +
                      (safeFiles.length > 5 ? ` +${safeFiles.length - 5} more` : ''),
                  ),
              );
              console.log();
            }
          }

          console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(chalk.red('\n  ✖  Error: ') + message);
          process.exit(1);
        }
      },
    );
}
