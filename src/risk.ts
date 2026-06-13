import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { analyze } from './core/orchestrator';
import { buildScopeRisks, buildTemporalScopeRisks } from './riskExplanation';

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

export function registerRiskCommand(program: Command): void {
  program
    .command('risk [repoPath]')
    .description('Identify maintenance risk areas — risk map, not a leaderboard')
    .option('-s, --since <date>', 'Only analyze commits after this date')
    .option('-a, --all', 'Show LOW risk scopes too (default: only MEDIUM/HIGH)')
    .option('--temporal', 'Compare lifetime risk with the last 12 months')
    .action(async (repoPath: string | undefined, options: { since?: string; all?: boolean; temporal?: boolean }) => {
      const resolvedPath = path.resolve(repoPath ?? '.');
      const since = options.since ? parseSince(options.since) : undefined;

      try {
        if (options.temporal) {
          if (options.since) {
            console.error(chalk.red('\n  ✖  Error: ') + '--since cannot be used with --temporal. Temporal risk uses a fixed 12-month recent window.');
            process.exit(1);
          }

          const recentSince = parseSince('12m');
          const lifetimeResult = await analyze(resolvedPath);
          const recentResult = await analyze(resolvedPath, recentSince);
          const temporalRisks = buildTemporalScopeRisks(lifetimeResult, recentResult);

          console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
          console.log(` ${chalk.bold.white('⛏  git-arch risk --temporal')} — ${chalk.grey(resolvedPath.split('/').pop())}`);
          console.log(chalk.grey('  Lifetime vs recent ownership concentration'));
          console.log(chalk.grey(`  Recent window: since ${recentSince} (12 months)`));
          console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');

          if (temporalRisks.length === 0) {
            console.log(chalk.green('  ✓ No eligible lifetime scopes found.\n'));
          }

          for (const r of temporalRisks) {
            const color =
              r.category === 'Persistent concentration' || r.category === 'Emerging concentration'
                ? chalk.red
                : r.category === 'Historical concentration'
                  ? chalk.yellow
                  : chalk.green;
            console.log(color.bold(`  ${r.category}`));
            console.log(`  ${chalk.cyan(r.scope)}`);
            console.log(
              `  Lifetime: ${chalk.bold(r.lifetime.level)} risk, `
              + `${chalk.bold(r.lifetime.concentration + '%')} concentration, `
              + `bus factor ${chalk.bold(String(r.lifetime.busFactor))}`
            );
            if (r.category === 'No recent activity' || r.category === 'Insufficient recent evidence') {
              console.log(`  Recent:   ${chalk.bold(String(r.recentTouches))} non-bot file touches`);
            } else if (r.recent) {
              console.log(
                `  Recent:   ${chalk.bold(r.recent.level)} risk, `
                + `${chalk.bold(r.recent.concentration + '%')} concentration, `
                + `bus factor ${chalk.bold(String(r.recent.busFactor))}`
              );
            } else {
              console.log(`  Recent:   ${chalk.bold(String(r.recentTouches))} non-bot file touches`);
            }
            console.log(chalk.grey(`  ${r.summary}`));
            console.log();
          }

          console.log(chalk.grey('  HIGH and MEDIUM are treated as concentrated; LOW is treated as distributed.'));
          console.log(chalk.grey('  Recent scopes with 1-9 non-bot touches are marked insufficient recent evidence.'));
          console.log(chalk.grey('  These signals do not prove ownership, expertise, or maintainership.'));
          console.log();
          console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');
          return;
        }

        const result = await analyze(resolvedPath, since);
        const risks = buildScopeRisks(result);

        const shown = options.all ? risks : risks.filter((r) => r.level !== 'LOW');
        const lowCount = risks.filter((r) => r.level === 'LOW').length;

        console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
        console.log(` ${chalk.bold.white('⛏  git-arch risk')} — ${chalk.grey(resolvedPath.split('/').pop())}`);
        console.log(chalk.grey('  Maintenance risk map — not an ownership leaderboard'));
        console.log(chalk.grey(`  Analysis window: ${since ? `since ${since}` : 'all available history'}`));
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');

        if (shown.length === 0) {
          console.log(chalk.green('  ✓ No high or medium risk areas found.\n'));
        }

        for (const r of shown) {
          const color = r.level === 'HIGH' ? chalk.red : r.level === 'MEDIUM' ? chalk.yellow : chalk.green;
          console.log(color.bold(`  ${r.level} RISK`));
          console.log(`  ${chalk.cyan(r.scope)}`);
          console.log(`  Historical commit-touch concentration: ${chalk.bold(r.concentration + '%')}`);
          console.log(`  Bus Factor: ${chalk.bold(String(r.busFactor))}`);
          console.log(`  Historical file paths: ${r.filesAtRisk}`);
          console.log(`  Contributor identities: ${r.contributors}`);
          console.log(`  Total file-touch evidence: ${r.totalFileTouches}`);
          console.log();
          console.log(`  Top historical contributor: ${chalk.cyan(r.topOwner)}`);
          if (r.lastActive) {
            console.log();
            console.log(chalk.grey('  Activity context:'));
            console.log(`  Latest analyzed activity: ${chalk.bold(r.lastActive)}`);
          }
          console.log();
          console.log(chalk.grey('  Why:'));
          for (const reason of r.explanation.reasons) {
            console.log(chalk.grey(`    * ${reason}`));
          }
          console.log();
          console.log(chalk.grey('  Interpretation:'));
          console.log(chalk.grey(`    ${r.explanation.summary}`));
          console.log();
        }

        if (!options.all && lowCount > 0) {
          console.log(chalk.grey(`  ${lowCount} additional scope(s) marked LOW risk — use --all to show them.\n`));
        }

        console.log(chalk.grey('  Based on commit touches.'));
        console.log(chalk.grey('  Contributor identities are Git email addresses.'));
        console.log(chalk.grey('  These signals do not prove ownership, expertise, or maintainership.'));
        console.log();
        console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red('\n  ✖  Error: ') + message);
        process.exit(1);
      }
    });
}
