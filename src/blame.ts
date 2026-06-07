import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { parseCommits, validateRepo } from './core/gitParser';

export function registerBlameCommand(program: Command): void {
  program
    .command('blame <filepath> [repoPath]')
    .alias('b')
    .description('Deep dive on a single file — full author history and timeline')
    .action((filepath: string, repoPath: string | undefined) => {
      const resolvedRepo = repoPath ? path.resolve(repoPath) : process.cwd();
      const resolvedPath = resolvedRepo;
      try {
        validateRepo(resolvedPath);
        const commits = parseCommits(resolvedPath);
        const normalizedTarget = filepath.replace(/\\\\/g, '/').replace(/^\.\//,'');

        // Filter to only commits touching this file
        const fileCommits = commits.filter((c) => c.filesChanged.some(f => f === normalizedTarget || f.endsWith('/' + normalizedTarget)));

        if (fileCommits.length === 0) {
          console.error(chalk.red(`\n  No commits found for: ${filepath}`));
          process.exit(1);
        }

        // Author breakdown
        const authorMap = new Map<string, { name: string; count: number; first: number; last: number }>();
        for (const c of fileCommits) {
          const existing = authorMap.get(c.authorEmail);
          if (existing) {
            existing.count++;
            if (c.timestamp < existing.first) existing.first = c.timestamp;
            if (c.timestamp > existing.last) existing.last = c.timestamp;
            // Keep longest name for this email
            if (c.authorName.length > existing.name.length) existing.name = c.authorName;
          } else {
            authorMap.set(c.authorEmail, { name: c.authorName, count: 1, first: c.timestamp, last: c.timestamp });
          }
        }

        const totalChanges = fileCommits.length;
        const authors = Array.from(authorMap.values())
          .sort((a, b) => b.count - a.count);

        const timestamps = fileCommits.map((c) => c.timestamp);
        const firstTs = timestamps.reduce((a, b) => a < b ? a : b, timestamps[0]);
        const lastTs  = timestamps.reduce((a, b) => a > b ? a : b, timestamps[0]);
        const firstDate = new Date(firstTs * 1000).toISOString().split('T')[0];
        const lastDate  = new Date(lastTs  * 1000).toISOString().split('T')[0];

        // Acceleration: last 6 months vs prior 6 months
        const now = Date.now() / 1000;
        const sixMonths = 182 * 24 * 60 * 60;
        const recent = fileCommits.filter((c) => c.timestamp >= now - sixMonths).length;
        const prior  = fileCommits.filter((c) => c.timestamp >= now - sixMonths * 2 && c.timestamp < now - sixMonths).length;
        const accel  = prior === 0 ? (recent > 0 ? 'accelerating' : 'stable') : (recent > prior ? `accelerating ${(recent/prior).toFixed(1)}x` : recent < prior ? 'slowing down' : 'stable');

        console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(` ${chalk.bold.white('⛏  git-arch blame')} — ${chalk.cyan(filepath)}`);
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log();
        console.log(`  ${chalk.hex('#A78BFA')('Total changes')}   ${chalk.yellow.bold(String(totalChanges))}`);
        console.log(`  ${chalk.hex('#A78BFA')('Unique authors')}  ${chalk.yellow.bold(String(authors.length))}`);
        console.log(`  ${chalk.hex('#A78BFA')('First changed')}   ${chalk.white(firstDate)}`);
        console.log(`  ${chalk.hex('#A78BFA')('Last changed')}    ${chalk.white(lastDate)}`);
        console.log(`  ${chalk.hex('#A78BFA')('Trend')}           ${recent > prior ? chalk.red(accel) : chalk.green(accel)}`);
        console.log(`  ${chalk.hex('#A78BFA')('Recent (6mo)')}   ${chalk.white(String(recent))} commits`);
        console.log(`  ${chalk.hex('#A78BFA')('Prior (6mo)')}    ${chalk.white(String(prior))} commits`);
        console.log();
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(` ${chalk.bold.white('Authors')}`);
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));

        for (const data of authors) {
          const pct = Math.round((data.count / totalChanges) * 100);
          const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20);
          const firstD = new Date(data.first * 1000).toISOString().split('T')[0];
          const lastD  = new Date(data.last  * 1000).toISOString().split('T')[0];
          const pctColor = pct >= 50 ? chalk.red : pct >= 25 ? chalk.yellow : chalk.white;
          console.log(`  ${pctColor(bar)} ${pctColor(pct + '%')}  ${chalk.white(data.name.padEnd(28))} ${chalk.grey(data.count + ' commits  ' + firstD + ' → ' + lastD)}`);
        }

        console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red('\n  ✖  Error: ') + message);
        process.exit(1);
      }
    });
}
