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
const botFilter_1 = require("./utils/botFilter");
const activity_1 = require("./utils/activity");
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
            // Aggregate per top-level folder: total changes per author
            const folderAuthorChanges = new Map();
            for (const [, stats] of result.fileStats) {
                const parts = stats.filepath.split('/');
                const folder = parts.length > 1 ? parts[0] : '(root)';
                if (!folderAuthorChanges.has(folder))
                    folderAuthorChanges.set(folder, new Map());
                const authorTotals = folderAuthorChanges.get(folder);
                for (const [email, count] of stats.authorChanges) {
                    if ((0, botFilter_1.isBot)(email, email))
                        continue;
                    authorTotals.set(email, (authorTotals.get(email) ?? 0) + count);
                }
            }
            const bfMap = new Map(result.busFactor.map((b) => [b.scope, b]));
            const risks = [];
            // Build a name -> email map from ownership contributor data,
            // so we can look up lastActiveByAuthor (keyed by email) for a
            // given display name (as stored in atRiskAuthors).
            const nameToEmail = new Map();
            for (const o of result.ownership) {
                for (const c of o.contributors) {
                    if (!nameToEmail.has(c.name))
                        nameToEmail.set(c.name, c.email);
                }
            }
            for (const [folder, authorTotals] of folderAuthorChanges) {
                const bf = bfMap.get(folder);
                if (!bf)
                    continue;
                if (bf.filesAtRisk < 3)
                    continue; // skip tiny/noise scopes
                const total = Array.from(authorTotals.values()).reduce((a, b) => a + b, 0);
                if (total === 0)
                    continue;
                const sorted = Array.from(authorTotals.entries()).sort((a, b) => b[1] - a[1]);
                const topShare = sorted[0][1] / total;
                const concentration = Math.round(topShare * 1000) / 10;
                const contributors = sorted.length;
                const topOwner = bf.atRiskAuthors[0] ?? 'unknown';
                let level;
                let reason;
                if (bf.busFactor === 1 && concentration >= 80) {
                    level = 'HIGH';
                    reason = `Single dominant maintainer (${topOwner}) with limited contributor redundancy.`;
                }
                else if (bf.busFactor === 1 || (bf.busFactor === 2 && concentration >= 50)) {
                    level = 'MEDIUM';
                    reason = bf.busFactor === 1
                        ? `Ownership concentrated in ${topOwner}, but other contributors exist.`
                        : `Ownership concentrated across a small group led by ${topOwner}.`;
                }
                else {
                    level = 'LOW';
                    reason = `Ownership reasonably distributed across ${contributors} contributors.`;
                }
                const ownerEmail = nameToEmail.get(topOwner);
                const lastActiveTs = ownerEmail ? result.lastActiveByAuthor.get(ownerEmail) : undefined;
                let lastActive;
                if (lastActiveTs !== undefined) {
                    lastActive = (0, activity_1.formatTimeAgo)(lastActiveTs);
                    const monthsAgo = (Date.now() / 1000 - lastActiveTs) / (86400 * 30);
                    if (monthsAgo > 18) {
                        reason += ` Dominant owner last committed ${lastActive}.`;
                    }
                }
                risks.push({
                    scope: folder,
                    level,
                    busFactor: bf.busFactor,
                    concentration,
                    contributors,
                    topOwner,
                    filesAtRisk: bf.filesAtRisk,
                    reason,
                    lastActive,
                });
            }
            const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            risks.sort((a, b) => order[a.level] - order[b.level] || b.concentration - a.concentration);
            const shown = options.all ? risks : risks.filter((r) => r.level !== 'LOW');
            const lowCount = risks.filter((r) => r.level === 'LOW').length;
            console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('⛏  git-arch risk')} — ${chalk_1.default.grey(resolvedPath.split('/').pop())}`);
            console.log(chalk_1.default.grey('  Maintenance risk map — not an ownership leaderboard'));
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)) + '\n');
            if (shown.length === 0) {
                console.log(chalk_1.default.green('  ✓ No high or medium risk areas found.\n'));
            }
            for (const r of shown) {
                const color = r.level === 'HIGH' ? chalk_1.default.red : r.level === 'MEDIUM' ? chalk_1.default.yellow : chalk_1.default.green;
                console.log(color.bold(`  ${r.level} RISK`));
                console.log(`  ${chalk_1.default.cyan(r.scope)}`);
                console.log(`  Bus Factor: ${chalk_1.default.bold(String(r.busFactor))}   Ownership Concentration: ${chalk_1.default.bold(r.concentration + '%')}   Contributors: ${r.contributors}   Files: ${r.filesAtRisk}`);
                if (r.lastActive) {
                    console.log(`  Owner: ${chalk_1.default.cyan(r.topOwner)}   Last active: ${chalk_1.default.bold(r.lastActive)}`);
                }
                console.log(chalk_1.default.grey(`  Reason: ${r.reason}`));
                console.log();
            }
            if (!options.all && lowCount > 0) {
                console.log(chalk_1.default.grey(`  ${lowCount} additional scope(s) marked LOW risk — use --all to show them.\n`));
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
//# sourceMappingURL=risk.js.map