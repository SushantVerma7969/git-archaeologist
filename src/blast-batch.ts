import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import { parseCommits, validateRepo } from './core/gitParser';
import { applySemanticFiltering, applyTfIdfPenalty } from './core/semanticFilter';

export function registerBlastBatchCommand(program: Command): void {
  program
    .command('blast-batch [repoPath]')
    .description('Calculate blast radius for multiple files in a single pass')
    .option('--from-file <filepath>', 'Read target files from a text file (one per line)')
    .option('--files <fileList...>', 'List of files to analyze')
    .option('-s, --since <date>', 'Limit to commits after this date')
    .option(
      '--semantic',
      'Apply semantic filtering to ignore mechanical/sweeping commits',
    )
    .option('--json', 'Output raw JSON')
    .action(
      async (
        repoPath: string | undefined,
        options: {
          fromFile?: string;
          files?: string[];
          since?: string;
          semantic?: boolean;
          json?: boolean;
        },
      ) => {
        const resolvedPath = path.resolve(repoPath ?? '.');

        try {
          validateRepo(resolvedPath);

          let targetFiles: string[] = [];

          if (options.fromFile) {
            const content = fs.readFileSync(path.resolve(options.fromFile), 'utf-8');
            targetFiles = content
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l.length > 0);
          } else if (options.files && options.files.length > 0) {
            targetFiles = options.files;
          } else {
            console.error(
              chalk.red(
                '\n  ✖  Error: You must provide files via --files or --from-file\n',
              ),
            );
            process.exit(1);
          }

          if (targetFiles.length === 0) {
            if (options.json) {
              console.log(JSON.stringify({ results: {} }, null, 2));
            } else {
              console.log('No files to analyze.');
            }
            return;
          }

          let commits = await parseCommits(resolvedPath, options.since, true);

          if (options.semantic) {
            commits = applySemanticFiltering(commits);
          }

          const batchResults: Record<
            string,
            { file: string; count: number; pct: number }[]
          > = {};

          for (const filepath of targetFiles) {
            let normalizedTarget = filepath.split('\\\\').join('/');
            if (normalizedTarget.startsWith('./')) {
              normalizedTarget = normalizedTarget.substring(2);
            }

            const targetCommits = commits.filter((c) =>
              c.filesChanged.some(
                (f) => f === normalizedTarget || f.endsWith('/' + normalizedTarget),
              ),
            );

            if (targetCommits.length === 0) {
              batchResults[filepath] = [];
              continue;
            }

            let coChanges = new Map<string, number>();
            for (const commit of targetCommits) {
              for (const f of commit.filesChanged) {
                const norm = f.replace(/\\\\/g, '/');
                if (norm === normalizedTarget || norm.endsWith('/' + normalizedTarget))
                  continue;
                coChanges.set(f, (coChanges.get(f) ?? 0) + 1);
              }
            }

            if (options.semantic) {
              coChanges = applyTfIdfPenalty(coChanges, commits);
            }

            const results = Array.from(coChanges.entries())
              .map(([file, count]) => ({
                file,
                count,
                pct: Math.round((count / targetCommits.length) * 100),
              }))
              .filter((r) => r.pct >= 10)
              .sort((a, b) => b.pct - a.pct)
              .slice(0, 15);

            batchResults[filepath] = results;
          }

          if (options.json) {
            console.log(JSON.stringify({ results: batchResults }, null, 2));
            return;
          }

          // Text output
          for (const [filepath, results] of Object.entries(batchResults)) {
            console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
            console.log(
              ` ${chalk.bold.white('⛏  git-arch blast')} — ${chalk.cyan(filepath)}`,
            );
            if (results.length === 0) {
              console.log(chalk.green('  ✓ No coupled files found.'));
            } else {
              for (const r of results) {
                console.log(`  - ${chalk.yellow(r.pct + '%')} ${chalk.white(r.file)}`);
              }
            }
            console.log();
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(chalk.red('\n  ✖  Error: ') + message);
          process.exit(1);
        }
      },
    );
}
