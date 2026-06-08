import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { parseCommits, validateRepo } from './core/gitParser';
import { execSync } from 'child_process';

export function registerOwnershipCommand(program: Command): void {
  program
    .command('ownership [repoPath]')
    .alias('own')
    .description('Show who owns what — by folder and overall')
    .option('-s, --since <date>', 'Only analyze commits after this date')
    .action(async (repoPath: string | undefined, options: { since?: string }) => {
      const resolvedPath = path.resolve(repoPath ?? '.');

      try {
        validateRepo(resolvedPath);

        const commits = parseCommits(resolvedPath, options.since);

        if (commits.length === 0) {
          console.log(chalk.grey('\n  No commits found.\n'));
          return;
        }

        // Build ownership map: author -> files -> line count approximation via commit count
        const authorFileCount = new Map<string, Map<string, number>>();
        const authorTotalCommits = new Map<string, number>();
        const folderOwnership = new Map<string, Map<string, number>>();

        for (const commit of commits) {
          const author = commit.authorName;
          authorTotalCommits.set(author, (authorTotalCommits.get(author) ?? 0) + 1);

          if (!authorFileCount.has(author)) authorFileCount.set(author, new Map());
          const fileMap = authorFileCount.get(author)!;

          for (const file of commit.filesChanged) {
            fileMap.set(file, (fileMap.get(file) ?? 0) + 1);

            // Folder ownership
            const folder = file.includes('/') ? file.split('/')[0] : '(root)';
            if (!folderOwnership.has(folder)) folderOwnership.set(folder, new Map());
            const fm = folderOwnership.get(folder)!;
            fm.set(author, (fm.get(author) ?? 0) + 1);
          }
        }

        const totalCommits = commits.length;

        // Overall ownership
        const overall = Array.from(authorTotalCommits.entries())
          .map(([name, count]) => ({ name, count, pct: Math.round((count / totalCommits) * 100) }))
          .sort((a, b) => b.pct - a.pct);

        // Count files each author primarily owns (most commits on that file)
        const fileOwners = new Map<string, string>();
        const allFiles = new Set(commits.flatMap(c => c.filesChanged));
        for (const file of allFiles) {
          let maxCount = 0;
          let owner = 'nobody';
          for (const [author, fileMap] of authorFileCount) {
            const count = fileMap.get(file) ?? 0;
            if (count > maxCount) { maxCount = count; owner = author; }
          }
          fileOwners.set(file, owner);
        }

        const ownedFiles = new Map<string, number>();
        for (const owner of fileOwners.values()) {
          ownedFiles.set(owner, (ownedFiles.get(owner) ?? 0) + 1);
        }

        // Nobody owns = files where top author has <= 30% of commits on that file
        let nobodyCount = 0;
        for (const file of allFiles) {
          const fileCounts = Array.from(authorFileCount.values())
            .map(fm => fm.get(file) ?? 0);
          const total = fileCounts.reduce((a, b) => a + b, 0);
          const max = Math.max(...fileCounts);
          if (total > 0 && max / total <= 0.3) nobodyCount++;
        }

        console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(` ${chalk.bold.white('⛏  git-arch ownership')} — ${chalk.grey(resolvedPath.split('/').pop())}`);
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log();
        console.log(`  ${chalk.hex('#A78BFA')('Total commits')}   ${chalk.yellow.bold(String(totalCommits))}`);
        console.log(`  ${chalk.hex('#A78BFA')('Contributors')}    ${chalk.yellow.bold(String(overall.length))}`);
        console.log(`  ${chalk.hex('#A78BFA')('Total files')}     ${chalk.yellow.bold(String(allFiles.size))}`);
        console.log(`  ${chalk.hex('#A78BFA')('Unowned files')}   ${chalk.red.bold(String(nobodyCount))} ${chalk.grey('(no single author > 30% of commits)')}`);
        console.log();

        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(` ${chalk.bold.white('Overall ownership by commit activity')}`);
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log();

        for (const { name, count, pct } of overall.slice(0, 15)) {
          const bar = '█'.repeat(Math.round(pct / 2)).padEnd(35);
          const pctColor = pct >= 40 ? chalk.red : pct >= 20 ? chalk.yellow : pct >= 10 ? chalk.white : chalk.grey;
          const owned = ownedFiles.get(name) ?? 0;
          console.log(`  ${pctColor(bar)} ${pctColor.bold((pct + '%').padStart(4))}  ${chalk.white(name.padEnd(28))} ${chalk.grey(count + ' commits · ' + owned + ' files primarily owned')}`);
        }

        if (overall.length > 15) {
          console.log(chalk.grey(`  ... and ${overall.length - 15} more contributors`));
        }

        // Folder breakdown
        console.log();
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(` ${chalk.bold.white('Ownership by folder')}`);
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log();

        const folders = Array.from(folderOwnership.entries())
          .filter(([, fm]) => Array.from(fm.values()).reduce((a, b) => a + b, 0) >= 3)
          .sort((a, b) => {
            const ta = Array.from(a[1].values()).reduce((x, y) => x + y, 0);
            const tb = Array.from(b[1].values()).reduce((x, y) => x + y, 0);
            return tb - ta;
          })
          .slice(0, 12);

        for (const [folder, fm] of folders) {
          const total = Array.from(fm.values()).reduce((a, b) => a + b, 0);
          const top = Array.from(fm.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
          const topOwner = top[0];
          const ownerPct = Math.round((topOwner[1] / total) * 100);
          const bf = top.length === 1 || (top[0][1] / total) > 0.7 ? chalk.red(' ⚠ bus factor 1') : '';
          console.log(`  ${chalk.cyan(folder.padEnd(25))} ${chalk.white(topOwner[0].padEnd(25))} ${chalk.yellow(ownerPct + '%')}${bf}`);
          for (const [name, count] of top.slice(1)) {
            const pct2 = Math.round((count / total) * 100);
            console.log(`  ${' '.repeat(25)} ${chalk.grey(name.padEnd(25))} ${chalk.grey(pct2 + '%')}`);
          }
          console.log();
        }

        console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red('\n  ✖  Error: ') + message);
        process.exit(1);
      }
    });
}
