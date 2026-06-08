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
exports.registerPrRiskCommand = registerPrRiskCommand;
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const gitParser_1 = require("./core/gitParser");
const ownershipAnalyzer_1 = require("./analyzers/ownershipAnalyzer");
const curseScorer_1 = require("./analyzers/curseScorer");
const busFactorAnalyzer_1 = require("./analyzers/busFactorAnalyzer");
function registerPrRiskCommand(program) {
    program
        .command('pr-risk [repoPath]')
        .alias('pr')
        .description('Score the risk of your current uncommitted/staged changes before pushing')
        .option('-b, --base <branch>', 'Base branch to compare against', 'main')
        .option('-s, --since <date>', 'Limit historical analysis to commits after this date')
        .action(async (repoPath, options) => {
        const resolvedPath = path.resolve(repoPath ?? '.');
        try {
            (0, gitParser_1.validateRepo)(resolvedPath);
            // Get changed files vs base branch
            let changedFiles = [];
            const tryCmd = (cmd) => {
                try {
                    return (0, child_process_1.execSync)(cmd, { encoding: 'utf8', cwd: resolvedPath }).trim();
                }
                catch {
                    return '';
                }
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
                console.log(chalk_1.default.grey('\n  No changed files detected vs ' + options.base + '.'));
                console.log(chalk_1.default.grey('  Make sure you have commits or staged changes.\n'));
                return;
            }
            // Run historical analysis
            const commits = (0, gitParser_1.parseCommits)(resolvedPath, options.since);
            const fileStats = (0, gitParser_1.buildFileStats)(commits);
            const cursedFiles = (0, curseScorer_1.scoreCursedFiles)(fileStats, 100);
            const authorNameMap = (0, ownershipAnalyzer_1.buildAuthorNameMap)(commits);
            const busFactor = (0, busFactorAnalyzer_1.analyzeBusFactor)(fileStats, authorNameMap);
            const cursedMap = new Map(cursedFiles.map(f => [f.filepath, f]));
            const busFactor1 = busFactor.filter(b => b.busFactor === 1);
            // Score each changed file
            let totalRisk = 0;
            const riskFactors = [];
            const fileRisks = [];
            for (const file of changedFiles) {
                let fileRisk = 0;
                const reasons = [];
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
                const coChanges = new Map();
                for (const commit of fileCommits) {
                    for (const f of commit.filesChanged) {
                        if (f === file)
                            continue;
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
                }
                else if (blastRadius > 5) {
                    fileRisk += 10;
                    const coupled = topCoupled.map(x => `${x.f} (${x.pct}%)`).join(', ');
                    reasons.push(`blast radius ${blastRadius} files — also check: ${coupled}`);
                }
                else if (topCoupled.length > 0) {
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
            const riskColor = totalRisk >= 75 ? chalk_1.default.red : totalRisk >= 40 ? chalk_1.default.yellow : chalk_1.default.green;
            console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('⛏  git-arch pr-risk')} — ${chalk_1.default.grey(options.base + '...HEAD')}`);
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log();
            console.log(`  ${riskEmoji}  ${riskColor.bold('Risk Score: ' + totalRisk + '/100 — ' + riskLabel)}`);
            console.log();
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Files changed')}   ${chalk_1.default.yellow.bold(String(changedFiles.length))}`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('High-risk files')} ${chalk_1.default.yellow.bold(String(fileRisks.length))}`);
            console.log();
            if (fileRisks.length === 0) {
                console.log(chalk_1.default.green('  ✓ No high-risk files in this change. Safe to push.\n'));
            }
            else {
                fileRisks.sort((a, b) => b.risk - a.risk);
                console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
                console.log(` ${chalk_1.default.bold.white('Risk breakdown by file')}`);
                console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
                console.log();
                for (const { file, risk, reasons } of fileRisks) {
                    const fc = risk >= 75 ? chalk_1.default.red : risk >= 40 ? chalk_1.default.yellow : chalk_1.default.white;
                    console.log(`  ${fc.bold(file)}`);
                    for (const r of reasons) {
                        console.log(`    ${chalk_1.default.grey('→')} ${chalk_1.default.white(r)}`);
                    }
                    console.log();
                }
                // Safe files
                const safeFiles = changedFiles.filter(f => !fileRisks.find(r => r.file === f));
                if (safeFiles.length > 0) {
                    console.log(chalk_1.default.green(`  ✓ Safe files (${safeFiles.length}): `) + chalk_1.default.grey(safeFiles.slice(0, 5).join(', ') + (safeFiles.length > 5 ? ` +${safeFiles.length - 5} more` : '')));
                    console.log();
                }
            }
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)) + '\n');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(chalk_1.default.red('\n  ✖  Error: ') + message);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=pr-risk.js.map