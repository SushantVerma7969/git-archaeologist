#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import { analyze } from './core/orchestrator';
import { renderReport } from './output/terminalRenderer';
import { generateHtmlReport } from './output/htmlReport';
import { registerBlameCommand } from './blame';


function parseSince(input: string): string {
  // Accept: 90d, 30days, 6months, 1year, or ISO date like 2024-01-01
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
  // Already a date string
  return input;
}

const program = new Command();

program
  .name('git-arch')
  .description(
    chalk.hex('#A78BFA')('⛏  Git Archaeologist') +
    ' — uncover history, ownership & tech debt in any git repo'
  )
  .version('1.4.2');

program
  .command('analyze [repoPath]')
  .alias('a')
  .description('Analyze a git repository and print the full report')
  .option('-j, --json', 'Output raw JSON instead of the terminal report')
  .option('-H, --html [outputFile]', 'Generate an HTML report file')
  .option('-s, --since <date>', 'Only analyze commits after this date (e.g. 90d, 2024-01-01, 6months)')
  .action(async (repoPath: string | undefined, options: { json?: boolean; html?: boolean | string; since?: string }) => {
    const resolvedPath = path.resolve(repoPath ?? '.');
    const since = options.since ? parseSince(options.since) : undefined;
    try {
      const result = await analyze(resolvedPath, since);

      if (options.json) {
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
      } else if (options.html !== undefined) {
        const defaultName = `git-arch-report-${result.repoName}.html`;
        const outFile = typeof options.html === 'string' ? options.html : defaultName;
        const outPath = path.resolve(outFile);
        generateHtmlReport(result, outPath);
        renderReport(result);
        console.log(chalk.hex('#A78BFA')(`\n  📄 HTML report saved → ${outPath}\n`));
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
      renderReport({ ...result, busFactor: [], ownership: [], coupling: [] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red('\n  ✖  Error: ') + message);
      process.exit(1);
    }
  });

program
  .action(async () => {
    const resolvedPath = path.resolve('.');
    try {
      const result = await analyze(resolvedPath, undefined);
      renderReport(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red('\n  ✖  Error: ') + message);
      process.exit(1);
    }
  });

registerBlameCommand(program);
program.parse(process.argv);
