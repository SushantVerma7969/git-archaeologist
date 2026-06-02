#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { analyze } from './core/orchestrator';
import { renderReport } from './output/terminalRenderer';

const program = new Command();

program
  .name('git-arch')
  .description(
    chalk.hex('#A78BFA')('⛏  Git Archaeologist') +
    ' — uncover history, ownership & tech debt in any git repo'
  )
  .version('1.0.0');

program
  .command('analyze [repoPath]')
  .alias('a')
  .description('Analyze a git repository and print the full report')
  .option('-j, --json', 'Output raw JSON instead of the terminal report')
  .action(async (repoPath: string | undefined, options: { json?: boolean }) => {
    const resolvedPath = path.resolve(repoPath ?? '.');

    try {
      const result = await analyze(resolvedPath);

      if (options.json) {
        // JSON output — convert Maps and Sets to plain objects first
        const serializable = {
          ...result,
          fileStats: Object.fromEntries(
            Array.from(result.fileStats.entries()).map(([k, v]) => [
              k,
              {
                ...v,
                uniqueAuthors: Array.from(v.uniqueAuthors),
                authorChanges: Object.fromEntries(v.authorChanges),
              },
            ])
          ),
        };
        console.log(JSON.stringify(serializable, null, 2));
      } else {
        renderReport(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red('\n  ✖  Error: ') + message);
      process.exit(1);
    }
  });

program
  .command('cursed [repoPath]')
  .alias('c')
  .description('Show only the cursed files ranking')
  .option('-n, --top <number>', 'How many files to show', '10')
  .action(async (repoPath: string | undefined, options: { top: string }) => {
    const resolvedPath = path.resolve(repoPath ?? '.');
    try {
      const result = await analyze(resolvedPath);
      const topN = parseInt(options.top, 10);
      result.cursedFiles = result.cursedFiles.slice(0, topN);
      // Re-render only the cursed section by importing directly
      const { renderReport } = await import('./output/terminalRenderer');
      renderReport({ ...result, busFactor: [], ownership: [], coupling: [] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red('\n  ✖  Error: ') + message);
      process.exit(1);
    }
  });

// Default command — running `git-arch` with no subcommand analyzes current dir
program
  .action(async () => {
    const resolvedPath = path.resolve('.');
    try {
      const result = await analyze(resolvedPath);
      renderReport(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red('\n  ✖  Error: ') + message);
      process.exit(1);
    }
  });

program.parse(process.argv);
