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
        .action(async (repoPath, options) => {
        const resolvedPath = path.resolve(repoPath ?? '.');
        const since = options.since ? parseSince(options.since) : undefined;
        try {
            const result = await (0, orchestrator_1.analyze)(resolvedPath, since);
            const risks = (0, riskExplanation_1.buildScopeRisks)(result);
            const shown = options.all ? risks : risks.filter((r) => r.level !== 'LOW');
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
                console.log();
                console.log(chalk_1.default.grey('  Interpretation:'));
                console.log(chalk_1.default.grey(`    ${r.explanation.summary}`));
                console.log();
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