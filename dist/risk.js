"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRiskCommand = registerRiskCommand;
const htmlReport_1 = require("./output/htmlReport");
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const orchestrator_1 = require("./core/orchestrator");
const riskExplanation_1 = require("./riskExplanation");
function parseSince(input) {
    const match = input.match(/^(\d+)\s*(d|day|days|m|month|months|y|year|years)$/i);
    if (match) {
        const n = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        const date = new Date();
        if (unit.startsWith('d'))
            date.setDate(date.getDate() - n);
        else if (unit.startsWith('m'))
            date.setMonth(date.getMonth() - n);
        else if (unit.startsWith('y'))
            date.setFullYear(date.getFullYear() - n);
        return date.toISOString().split('T')[0];
    }
    return input;
}
function registerRiskCommand(program) {
    program
        .command('risk [repoPath]')
        .description('Identify maintenance risk areas — risk map, not a leaderboard')
        .option('-s, --since <date>', 'Only analyze commits after this date')
        .option('-a, --all', 'Show LOW risk scopes too (default: only MEDIUM/HIGH)')
        .option('--temporal', 'Compare lifetime risk with the last 12 months')
        .option('--series', 'Show yearly concentration trajectory')
        .option('-j, --json', 'Output risk report as JSON')
        .option('--html <file>', 'Write report as HTML')
        .action(async (repoPath, options) => {
        const resolvedPath = path.resolve(repoPath ?? '.');
        const since = options.since ? parseSince(options.since) : undefined;
        try {
            if (options.temporal) {
                if (options.since) {
                    console.error(chalk_1.default.red('\n  ✖  Error: ') + '--since cannot be used with --temporal. Temporal risk uses a fixed 12-month recent window.');
                    process.exit(1);
                }
                const recentSince = parseSince('12m');
                const lifetimeResult = await (0, orchestrator_1.analyze)(resolvedPath, undefined, options.json === true);
                if (options.series) {
                    const series = (0, riskExplanation_1.buildYearlyConcentrationSeries)(lifetimeResult);
                    if (options.json) {
                        console.log(JSON.stringify(series, null, 2));
                        return;
                    }
                    let displayed = 0;
                    for (const s of series) {
                        const activeYears = s.points.filter((p) => p.commitCount > 0).length;
                        if (activeYears < 2) {
                            continue;
                        }
                        displayed++;
                        console.log();
                        console.log(chalk_1.default.cyan.bold(s.scope));
                        for (const p of s.points) {
                            const value = p.concentration === null
                                ? '-'
                                : `${p.concentration}%`;
                            console.log(`  ${p.year}: ${value} (${p.commitCount} touches)`);
                        }
                        console.log(chalk_1.default.grey(`  Trend: ${s.direction}`));
                    }
                    if (displayed === 0) {
                        console.log(chalk_1.default.yellow('No files have enough multi-year history for trajectory analysis.'));
                    }
                    return;
                }
                const recentResult = await (0, orchestrator_1.analyze)(resolvedPath, recentSince, options.json === true);
                const temporalRisks = (0, riskExplanation_1.buildTemporalScopeRisks)(lifetimeResult, recentResult);
                if (options.html) {
                    (0, htmlReport_1.generateHtmlReport)(lifetimeResult, options.html, temporalRisks);
                    console.log(chalk_1.default.green(`✔ HTML report written to ${options.html}`));
                    return;
                }
                if (options.json) {
                    console.log(JSON.stringify(temporalRisks, null, 2));
                    return;
                }
                console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
                console.log(` ${chalk_1.default.bold.white('⛏  git-arch risk --temporal')} — ${chalk_1.default.grey(resolvedPath.split('/').pop())}`);
                console.log(chalk_1.default.grey('  Lifetime vs recent ownership concentration'));
                console.log(chalk_1.default.grey(`  Recent window: since ${recentSince} (12 months)`));
                console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)) + '\n');
                if (temporalRisks.length === 0) {
                    console.log(chalk_1.default.green('  ✓ No eligible lifetime scopes found.\n'));
                }
                for (const r of temporalRisks) {
                    const color = r.category === 'Persistent concentration' || r.category === 'Emerging concentration'
                        ? chalk_1.default.red
                        : r.category === 'Historical concentration'
                            ? chalk_1.default.yellow
                            : chalk_1.default.green;
                    console.log(color.bold(`  ${r.category}`));
                    console.log(`  ${chalk_1.default.cyan(r.scope)}`);
                    console.log(`  Lifetime: ${chalk_1.default.bold(r.lifetime.level)} risk, `
                        + `${chalk_1.default.bold(r.lifetime.concentration + '%')} concentration, `
                        + `bus factor ${chalk_1.default.bold(String(r.lifetime.busFactor))}`);
                    if (r.category === 'No recent activity' || r.category === 'Insufficient recent evidence') {
                        console.log(`  Recent:   ${chalk_1.default.bold(String(r.recentTouches))} non-bot file touches`);
                    }
                    else if (r.recent) {
                        console.log(`  Recent:   ${chalk_1.default.bold(r.recent.level)} risk, `
                            + `${chalk_1.default.bold(r.recent.concentration + '%')} concentration, `
                            + `bus factor ${chalk_1.default.bold(String(r.recent.busFactor))}`);
                    }
                    else {
                        console.log(`  Recent:   ${chalk_1.default.bold(String(r.recentTouches))} non-bot file touches`);
                    }
                    console.log(chalk_1.default.grey(`  ${r.summary}`));
                    if (r.recommendations && r.recommendations.length > 0) {
                        console.log();
                        console.log(chalk_1.default.grey('  Questions to investigate:'));
                        for (const rec of r.recommendations) {
                            console.log(chalk_1.default.cyan(`    • ${rec.title}`));
                            console.log(chalk_1.default.grey(`      ${rec.action}`));
                        }
                    }
                    console.log();
                }
                console.log(chalk_1.default.grey('  HIGH and MEDIUM are treated as concentrated; LOW is treated as distributed.'));
                console.log(chalk_1.default.grey('  Recent scopes with 1-9 non-bot touches are marked insufficient recent evidence.'));
                console.log(chalk_1.default.grey('  These signals do not prove ownership, expertise, or maintainership.'));
                console.log();
                console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)) + '\n');
                return;
            }
            const result = await (0, orchestrator_1.analyze)(resolvedPath, since, options.json === true);
            if (options.html) {
                (0, htmlReport_1.generateHtmlReport)(result, options.html);
                console.log(chalk_1.default.green(`✔ HTML report written to ${options.html}`));
                return;
            }
            const risks = (0, riskExplanation_1.buildScopeRisks)(result);
            const shown = options.all ? risks : risks.filter((r) => r.level !== 'LOW');
            if (options.json) {
                console.log(JSON.stringify(shown, null, 2));
                return;
            }
            const lowCount = risks.filter((r) => r.level === 'LOW').length;
            console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('⛏  git-arch risk')} — ${chalk_1.default.grey(resolvedPath.split('/').pop())}`);
            console.log(chalk_1.default.grey('  Maintenance risk map — not an ownership leaderboard'));
            console.log(chalk_1.default.grey(`  Analysis window: ${since ? `since ${since}` : 'all available history'}`));
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)) + '\n');
            if (shown.length === 0) {
                console.log(chalk_1.default.green('  ✓ No high or medium risk areas found.\n'));
            }
            for (const r of shown) {
                const color = r.level === 'HIGH' ? chalk_1.default.red : r.level === 'MEDIUM' ? chalk_1.default.yellow : chalk_1.default.green;
                console.log(color.bold(`  ${r.level} RISK`));
                console.log(`  ${chalk_1.default.cyan(r.scope)}`);
                console.log(`  Historical commit-touch concentration: ${chalk_1.default.bold(r.concentration + '%')}`);
                console.log(`  Bus Factor: ${chalk_1.default.bold(String(r.busFactor))}`);
                console.log(`  Historical file paths: ${r.filesAtRisk}`);
                console.log(`  Contributor identities: ${r.contributors}`);
                console.log(`  Total file-touch evidence: ${r.totalFileTouches}`);
                console.log();
                console.log(`  Top historical contributor: ${chalk_1.default.cyan(r.topOwner)}`);
                if (r.lastActive) {
                    console.log();
                    console.log(chalk_1.default.grey('  Activity context:'));
                    console.log(`  Latest analyzed activity: ${chalk_1.default.bold(r.lastActive)}`);
                }
                console.log();
                console.log(chalk_1.default.grey('  Why:'));
                for (const reason of r.explanation.reasons) {
                    console.log(chalk_1.default.grey(`    * ${reason}`));
                }
                console.log(chalk_1.default.grey('  Interpretation:'));
                console.log(chalk_1.default.grey(`    ${r.explanation.summary}`));
                if (r.recommendations && r.recommendations.length > 0) {
                    console.log();
                    console.log(chalk_1.default.grey('  Questions to investigate:'));
                    for (const rec of r.recommendations) {
                        console.log(chalk_1.default.cyan(`    • ${rec.title}`));
                        console.log(chalk_1.default.grey(`      ${rec.action}`));
                    }
                }
                if (r.lastActive) {
                    console.log();
                    const inactive = r.lastActive.includes('year') ||
                        r.lastActive.includes('years');
                    if (inactive) {
                        console.log(chalk_1.default.yellow(`    Historical concentration may not reflect current maintainership (${r.lastActive}).`));
                    }
                    else {
                        console.log(chalk_1.default.green(`    Dominant contributor remains active (${r.lastActive}).`));
                    }
                    console.log();
                }
            }
            if (!options.all && lowCount > 0) {
                console.log(chalk_1.default.grey(`  ${lowCount} additional scope(s) marked LOW risk — use --all to show them.\n`));
            }
            console.log(chalk_1.default.grey('  Based on commit touches.'));
            console.log(chalk_1.default.grey('  Contributor identities are Git email addresses.'));
            console.log(chalk_1.default.grey('  These signals do not prove ownership, expertise, or maintainership.'));
            console.log();
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)) + '\n');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(chalk_1.default.red('\n  ✖  Error: ') + message);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=risk.js.map