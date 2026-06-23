import { generateHtmlReport } from './output/htmlReport';
import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { analyze } from './core/orchestrator';
import {
  buildScopeRisks,
  buildTemporalScopeRisks,
  buildYearlyConcentrationSeries,
  buildOwnershipTransitions,
  buildEvolutionSummary,
  buildAbandonedScopes,
  buildContributorChurn,
} from './riskExplanation';

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
    .option('--series', 'Show yearly concentration trajectory')
    .option('-j, --json', 'Output risk report as JSON')
    .option('--html <file>', 'Write report as HTML')
    .action(async (repoPath: string | undefined, options: {
  since?: string;
  all?: boolean;
  temporal?: boolean;
  series?: boolean;
  json?: boolean;
  html?: string;
}) => {
      const resolvedPath = path.resolve(repoPath ?? '.');
      const since = options.since ? parseSince(options.since) : undefined;

      try {
        if (options.temporal) {
          if (options.since) {
            console.error(chalk.red('\n  ✖  Error: ') + '--since cannot be used with --temporal. Temporal risk uses a fixed 12-month recent window.');
            process.exit(1);
          }

          const recentSince = parseSince('12m');
          const lifetimeResult = await analyze(
  resolvedPath,
  undefined,
  options.json === true
);
if (options.series) {
  const series = buildYearlyConcentrationSeries(lifetimeResult);

  if (options.json) {
    console.log(JSON.stringify(series, null, 2));
    return;
  }

  let displayed = 0;

for (const s of series) {
  const activeYears =
  s.points.filter((p) => p.commitCount > 0).length;

if (activeYears < 2) {
  continue;
}
displayed++;
  console.log();
  console.log(chalk.cyan.bold(s.scope));

  for (const p of s.points) {
    const value =
      p.concentration === null
        ? '-'
        : `${p.concentration}%`;

    console.log(
      `  ${p.year}: ${value} (${p.commitCount} touches)`
    );
  }

  console.log(
    chalk.grey(`  Trend: ${s.direction}`)
  );
}

if (displayed === 0) {
  console.log(
    chalk.yellow(
      'No files have enough multi-year history for trajectory analysis.'
    )
  );
}

return;
}



          const recentResult = await analyze(
  resolvedPath,
  recentSince,
  options.json === true
);
          const temporalRisks = buildTemporalScopeRisks(
  lifetimeResult,
  recentResult
);

const ownershipTransitions =
  buildOwnershipTransitions(lifetimeResult);

const contributorChurn =
  buildContributorChurn(lifetimeResult);

const abandonedScopes =
  buildAbandonedScopes(
    buildScopeRisks(lifetimeResult),
    contributorChurn
  );

const evolutionSummary =
  buildEvolutionSummary(
    temporalRisks,
    ownershipTransitions
  );
if (options.html) {
  generateHtmlReport(
    lifetimeResult,
    options.html,
    temporalRisks
  );

  console.log(
    chalk.green(
      `✔ HTML report written to ${options.html}`
    )
  );

  return;
}
          
          if (options.json) {
  console.log(
    JSON.stringify(
       {
  evolutionSummary,
  temporalRisks,
  ownershipTransitions,
  contributorChurn,
},
      null,
      2
    )
  );

  return;
}

          console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
          console.log(` ${chalk.bold.white('⛏  git-arch risk --temporal')} — ${chalk.grey(resolvedPath.split('/').pop())}`);
          console.log(chalk.grey('  Lifetime vs recent ownership concentration'));
          console.log(chalk.grey(`  Recent window: since ${recentSince} (12 months)`));
          console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');

          console.log(chalk.bold.cyan('  Repository Evolution Summary'));
console.log(
  chalk.grey(
    `  • ${evolutionSummary.ownershipTransitions} ownership transitions detected`
  )
);
console.log(
  chalk.grey(
    `  • ${evolutionSummary.highSeverityTransitions} high-severity transitions`
  )
);
console.log(
  chalk.grey(
    `  • ${evolutionSummary.emergingConcentration} scopes became more concentrated`
  )
);
console.log(
  chalk.grey(
    `  • ${evolutionSummary.historicalConcentration} scopes became less concentrated`
  )
);
console.log(
  chalk.grey(
    `  • ${evolutionSummary.distributedScopes} scopes remained distributed`
  )
);
console.log();

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
            console.log(
  color.bold(
    `  ${r.category} [${r.trend.toUpperCase()}]`
  )
);
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
if (r.delta !== null) {
  const sign = r.delta > 0 ? '+' : '';

  console.log(
    `  Delta:    ${chalk.bold(
      `${sign}${r.delta} percentage points`
    )}`
  );
}
            } else {
              console.log(`  Recent:   ${chalk.bold(String(r.recentTouches))} non-bot file touches`);
            }
            console.log(chalk.grey(`  ${r.summary}`));

if (r.recommendations && r.recommendations.length > 0) {
  console.log();
  console.log(chalk.grey('  Questions to investigate:'));

  for (const rec of r.recommendations) {
    console.log(chalk.cyan(`    • ${rec.title}`));
    console.log(chalk.grey(`      ${rec.action}`));
  }
}

console.log();
          }
console.log();



if (contributorChurn.length > 0) {
  console.log(
    chalk.magenta.bold('  Contributor Churn')
  );

  console.log();

  for (const c of contributorChurn.slice(0, 10)) {
    console.log(`  ${chalk.cyan(c.scope)}`);

    console.log(
      `    Contributors: ${c.contributors}`
    );

    console.log(
      `    Inactive (>12 months): ${c.inactiveContributors}`
    );

    console.log(
      `    Churn: ${c.churnPercent}% [${c.level}]`
    );

    console.log();
  }
}

if (abandonedScopes.length > 0) {
  console.log(
    chalk.magenta.bold('  Potentially Abandoned Areas')
  );

  console.log();

  for (const a of abandonedScopes) {
    console.log(
      `  ${chalk.cyan(a.scope)}`
    );

    console.log(
      `    [${a.severity}]`
    );

    console.log(
      `    Owner inactive: ${a.ownerInactiveDays} days`
    );

    console.log(
      `    Churn: ${a.churnPercent}%`
    );

    console.log(
      `    Concentration: ${a.concentration}%`
    );

    console.log(
      chalk.grey(`    ${a.explanation}`)
    );

    console.log();
  }
}
if (ownershipTransitions.length > 0) {
  console.log(
    chalk.magenta.bold('  Ownership Transitions')
  );

  for (const t of ownershipTransitions) {
    console.log(
      `  ${chalk.cyan(t.scope)}`
    );

    console.log(
  `    [${t.severity}]`
);

console.log(
  `    ${t.fromOwner} → ${t.toOwner}`
);

    console.log(
  `    ${t.fromYear} → ${t.toYear}`
);

console.log(
  chalk.grey(`    ${t.explanation}`)
);

console.log();
  }
}
          console.log(chalk.grey('  HIGH and MEDIUM are treated as concentrated; LOW is treated as distributed.'));
          console.log(chalk.grey('  Recent scopes with 1-9 non-bot touches are marked insufficient recent evidence.'));
          console.log(chalk.grey('  These signals do not prove ownership, expertise, or maintainership.'));
          console.log();
          console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');
          return;
        }

        const result = await analyze(
  resolvedPath,
  since,
  options.json === true
);
if (options.html) {
  generateHtmlReport(result, options.html);

  console.log(
    chalk.green(
      `✔ HTML report written to ${options.html}`
    )
  );

  return;
}
        const risks = buildScopeRisks(result);

        const shown = options.all ? risks : risks.filter((r) => r.level !== 'LOW');
        if (options.json) {
  console.log(JSON.stringify(shown, null, 2));
  return;
}
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
          console.log(chalk.grey('  Interpretation:'));
          console.log(chalk.grey(`    ${r.explanation.summary}`));
          if (r.recommendations && r.recommendations.length > 0) {
  console.log();
  console.log(chalk.grey('  Questions to investigate:'));

  for (const rec of r.recommendations) {
    console.log(chalk.cyan(`    • ${rec.title}`));
    console.log(chalk.grey(`      ${rec.action}`));
  }
}

          if (r.lastActive) {
          console.log();

          const inactive =
          r.lastActive.includes('year') ||
          r.lastActive.includes('years');

  if (inactive) {
    console.log(
      chalk.yellow(
        `    Historical concentration may not reflect current maintainership (${r.lastActive}).`
      )
    );
  } else {
    console.log(
      chalk.green(
        `    Dominant contributor remains active (${r.lastActive}).`
      )
    );
  }
console.log();
}


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
