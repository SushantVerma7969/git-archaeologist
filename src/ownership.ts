import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { analyze } from './core/orchestrator';
import { buildOwnershipReport } from './ownership-core';

function parseSince(input: string): string {
  const match = input.match(/^(\d+)\s*(d|day|days|m|month|months|y|year|years)$/i);
  if (match) {
    const n = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const date = new Date();
    if (unit.startsWith('d')) date.setDate(date.getDate() - n);
    else if (unit.startsWith('m')) date.setMonth(date.getMonth() - n);
    else if (unit.startsWith('y')) date.setFullYear(date.getFullYear() - n);
    return date.toISOString().split('T')[0];
  }
  return input;
}

export function registerOwnershipCommand(program: Command): void {
  program
    .command('ownership [repoPath]')
    .alias('own')
    .description('Show who owns what by folder (commit-touch share, bots excluded)')
    .option('-s, --since <date>', 'Only analyze commits after this date')
    .option('-j, --json', 'Output raw JSON')
    .action(
      async (
        repoPath: string | undefined,
        options: { since?: string; json?: boolean },
      ) => {
        const resolvedPath = path.resolve(repoPath ?? '.');
        const since = options.since ? parseSince(options.since) : undefined;

        try {
          const result = await analyze(resolvedPath, since, options.json === true);
          const report = buildOwnershipReport(result);

          if (options.json) {
            console.log(JSON.stringify(report, null, 2));
            return;
          }

          console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
          console.log(
            ` ${chalk.bold.white('⛏  git-arch ownership')} — ${chalk.grey(result.repoName)}`,
          );
          console.log(
            chalk.grey('  Folder ownership by commit-touch share — bots excluded'),
          );
          console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
          console.log();
          console.log(
            `  ${chalk.hex('#A78BFA')('Total commits')}   ${chalk.yellow.bold(String(report.totalCommits))}`,
          );
          console.log(
            `  ${chalk.hex('#A78BFA')('Contributors')}    ${chalk.yellow.bold(String(report.totalContributors))} ${chalk.grey('(after identity merge)')}`,
          );
          console.log(
            `  ${chalk.hex('#A78BFA')('Total files')}     ${chalk.yellow.bold(String(report.totalFiles))}`,
          );
          console.log();

          console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
          console.log(` ${chalk.bold.white('Ownership by folder')}`);
          console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
          console.log();

          if (report.folders.length === 0) {
            console.log(chalk.grey('  No source folders with enough history.\n'));
          }

          for (const f of report.folders) {
            const pctColor =
              f.topOwnerPercent >= 70
                ? chalk.red
                : f.topOwnerPercent >= 40
                  ? chalk.yellow
                  : chalk.white;
            const bf = f.busFactor === 1 ? chalk.red(' ⚠ bus factor 1') : '';
            console.log(
              `  ${chalk.cyan(f.folder.padEnd(25))} ${chalk.white(f.topOwner.padEnd(25))} ${pctColor(f.topOwnerPercent + '%')}${bf}`,
            );
            for (const c of f.contributors.slice(1, 3)) {
              console.log(
                `  ${' '.repeat(25)} ${chalk.grey(c.name.padEnd(25))} ${chalk.grey(c.percent + '%')}`,
              );
            }
            console.log();
          }

          console.log(
            chalk.grey(
              '  Commit-touch share is not knowledge ownership; reviewers leave no commit trace.',
            ),
          );
          console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(chalk.red('\n  ✖  Error: ') + message);
          process.exit(1);
        }
      },
    );
}
