#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import packageJson from '../package.json';
import { analyze } from './core/orchestrator';
import { isDisplayableSource } from './analyzers/curseScorer';
import { renderReport } from './output/terminalRenderer';
import { generateHtmlReport } from './output/htmlReport';
import { registerBlameCommand } from './blame';
import { registerTrendCommand } from './trend';
import { registerBlastCommand } from './blast';
import { registerBlastBatchCommand } from './blast-batch';
import { registerOwnershipCommand } from './ownership';
import { registerPrRiskCommand } from './pr-risk';
import { registerRiskCommand } from './risk';
import { parseSince } from './utils/timeRange';

const program = new Command();

program
  .name('git-arch')
  .description(
    chalk.hex('#A78BFA')('⛏  Git Archaeologist') +
      ' — uncover history, ownership & tech debt in any git repo',
  )
  .version(packageJson.version);

program
  .command('analyze [repoPath]')
  .alias('a')
  .description('Analyze a git repository and print the full report')
  .option('-j, --json', 'Output raw JSON instead of the terminal report')
  .option('-H, --html [outputFile]', 'Generate an HTML report file')
  .option(
    '-s, --since <date>',
    'Only analyze commits after this date (e.g. 90d, 2024-01-01, 6months)',
  )
  .action(
    async (
      repoPath: string | undefined,
      options: { json?: boolean; html?: boolean | string; since?: string },
    ) => {
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
              ]),
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
    },
  );

program
  .command('cursed [repoPath]')
  .alias('c')
  .description('Show only the cursed files ranking')
  .option('-n, --top <number>', 'How many files to show', '10')
  .option('-s, --since <date>', 'Only analyze commits after this date')
  .action(
    async (repoPath: string | undefined, options: { top: string; since?: string }) => {
      const resolvedPath = path.resolve(repoPath ?? '.');
      const since = options.since ? parseSince(options.since) : undefined;
      try {
        const topN = parseInt(options.top, 10);
        // Request a generous ranking, then drop non-source files (docs, tests,
        // benchmarks, translated READMEs) from the DISPLAY before taking topN,
        // so the shown ranking is real code. Scores are unchanged.
        const result = await analyze(resolvedPath, since, false, topN * 5 + 50);
        result.cursedFiles = result.cursedFiles
          .filter((f) => isDisplayableSource(f.filepath))
          .slice(0, topN);
        renderReport({ ...result, busFactor: [], ownership: [], coupling: [] });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red('\n  ✖  Error: ') + message);
        process.exit(1);
      }
    },
  );

program.action(async () => {
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
registerTrendCommand(program);
registerBlastCommand(program);
registerBlastBatchCommand(program);
registerOwnershipCommand(program);
registerPrRiskCommand(program);
registerRiskCommand(program);

program
  .command('mcp')
  .description(
    'Start an MCP server (stdio) exposing the analysis as tools an AI agent can call',
  )
  .action(async () => {
    // Imported lazily so the MCP SDK is only loaded when this command runs,
    // keeping normal CLI invocations fast and dependency-light at runtime.
    const { startMcpServer } = await import('./mcp/server');
    await startMcpServer();
  });

program.parse(process.argv);
