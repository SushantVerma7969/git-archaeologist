import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { execSync } from 'child_process';
import { parseCommits, validateRepo, buildFileStats } from './core/gitParser';
import { buildAuthorNameMap } from './analyzers/ownershipAnalyzer';
import { scoreCursedFiles } from './analyzers/curseScorer';
import { analyzeBusFactor } from './analyzers/busFactorAnalyzer';

export function registerPrRiskCommand(program: Command): void {
  program
    .command('pr-risk [repoPath]')
    .alias('pr')
    .description('Score the risk of your current uncommitted/staged changes before pushing')
    .option('-b, --base <branch>', 'Base branch to compare against', 'main')
    .option('-s, --since <date>', 'Limit historical analysis to commits after this date')
    .action(async (repoPath: string | undefined, options: { base: string; since?: string }) => {
      const resolvedPath = path.resolve(repoPath ?? '.');

      try {
        validateRepo(resolvedPath);

        // Get changed files vs base branch
        let changedFiles: string[] = [];
        const tryCmd = (cmd: string): string => {
          try { return execSync(cmd, { encoding: 'utf8', cwd: resolvedPath }).trim(); } catch { return ''; }
        };

        // Try various strategies to get changed files
        const strategies = [
          `git diff --name-only ${options.base}...HEAD`,
          `git diff --name-only origin/${options.base}...HEAD`,
          `git diff --name-only HEAD~1..HEAD`,
          `git diff --name-only --cached`,
          `git diff --name-only`,
        ];

        for (const strategy of strategies) {
          const result = tryCmd(strategy);
          if (result) {
            changedFiles = result.split('\n').filter(Boolean);
            break;
          }
        }

        if (changedFiles.length === 0) {
          console.log(chalk.grey('\n  No changed files detected vs ' + options.base + '.'));
          console.log(chalk.grey('  Make sure you have commits or staged changes.\n'));
          return;
        }

        // Run historical analysis
        const commits = parseCommits(resolvedPath, options.since);
        const fileStats = buildFileStats(commits);
        const cursedFiles = scoreCursedFiles(fileStats, 100);
        const authorNameMap = buildAuthorNameMap(commits);
        const busFactor = analyzeBusFactor(fileStats, authorNameMap);

        const cursedMap = new Map(cursedFiles.map(f => [f.filepath, f]));
        const busFactor1 = busFactor.filter(b => b.busFactor === 1);

        // Score each changed file
        let totalRisk = 0;
        const riskFactors: string[] = [];
        const fileRisks: Array<{ file: string; risk: number; reasons: string[] }> = [];

        for (const file of changedFiles) {
          let fileRisk = 0;
          const reasons: string[] = [];

          // Curse score contribution
          const cursed = cursedMap.get(file);
          if (cursed) {
            const contribution = Math.min(40, Math.round(cursed.curseScore / 20));
            fileRisk += contribution;
            reasons.push(`curse score ${cursed.curseScore.toFixed(0)} (${cursed.uniqueAuthors} authors, ${cursed.totalChanges} changes)`);
          }

          // Bus factor 1 contribution
          for (const bf of busFactor1) {
            const scope = bf.scope === '(root)' ? '' : bf.scope + '/';
            if (file.startsWith(scope)) {
              fileRisk += 25;
              reasons.push(`in bus factor 1 module "${bf.scope}" — owned by ${bf.atRiskAuthors[0]}`);
              break;
            }
          }

          // Blast radius contribution — check coupling
          const fileCommits = commits.filter(c => c.filesChanged.includes(file));
          const coChanges = new Map<string, number>();
          for (const commit of fileCommits) {
            for (const f of commit.filesChanged) {
              if (f === file) continue;
              coChanges.set(f, (coChanges.get(f) ?? 0) + 1);
            }
          }
          const blastRadius = Array.from(coChanges.values())
            .filter(count => Math.round((count / Math.max(fileCommits.length, 1)) * 100) >= 20).length;

          // Get top coupled files for display
          const topCoupled = Array.from(coChanges.entries())
            .map(([f, count]) => ({ f, pct: Math.round((count / Math.max(fileCommits.length, 1)) * 100) }))
            .filter(x => x.pct >= 20)
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 3);

          if (blastRadius > 10) {
            fileRisk += 20;
            const coupled = topCoupled.map(x => `${x.f} (${x.pct}%)`).join(', ');
            reasons.push(`blast radius ${blastRadius} files — also check: ${coupled}`);
          } else if (blastRadius > 5) {
            fileRisk += 10;
            const coupled = topCoupled.map(x => `${x.f} (${x.pct}%)`).join(', ');
            reasons.push(`blast radius ${blastRadius} files — also check: ${coupled}`);
          } else if (topCoupled.length > 0) {
            const coupled = topCoupled.map(x => `${x.f} (${x.pct}%)`).join(', ');
            reasons.push(`historically changes with: ${coupled}`);
          }

          if (fileRisk > 0) {
            totalRisk += fileRisk;
            fileRisks.push({ file, risk: Math.min(100, fileRisk), reasons });
          }
        }

        totalRisk = Math.min(100, Math.round(totalRisk / Math.max(changedFiles.length, 1)));

        const riskEmoji = totalRisk >= 75 ? '🔴' : totalRisk >= 40 ? '🟡' : '🟢';
        const riskLabel = totalRisk >= 75 ? 'HIGH RISK' : totalRisk >= 40 ? 'MEDIUM RISK' : 'LOW RISK';
        const riskColor = totalRisk >= 75 ? chalk.red : totalRisk >= 40 ? chalk.yellow : chalk.green;

        console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(` ${chalk.bold.white('⛏  git-arch pr-risk')} — ${chalk.grey(options.base + '...HEAD')}`);
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log();
        console.log(`  ${riskEmoji}  ${riskColor.bold('Risk Score: ' + totalRisk + '/100 — ' + riskLabel)}`);
        console.log();
        console.log(`  ${chalk.hex('#A78BFA')('Files changed')}   ${chalk.yellow.bold(String(changedFiles.length))}`);
        console.log(`  ${chalk.hex('#A78BFA')('High-risk files')} ${chalk.yellow.bold(String(fileRisks.length))}`);
        console.log();

        if (fileRisks.length === 0) {
          console.log(chalk.green('  ✓ No high-risk files in this change. Safe to push.\n'));
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
          const safeFiles = changedFiles.filter(f => !fileRisks.find(r => r.file === f));
          if (safeFiles.length > 0) {
            console.log(chalk.green(`  ✓ Safe files (${safeFiles.length}): `) + chalk.grey(safeFiles.slice(0, 5).join(', ') + (safeFiles.length > 5 ? ` +${safeFiles.length - 5} more` : '')));
            console.log();
          }
        }

        console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red('\n  ✖  Error: ') + message);
        process.exit(1);
      }
    });
}
