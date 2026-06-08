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
exports.registerTrendCommand = registerTrendCommand;
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const gitParser_1 = require("./core/gitParser");
function registerTrendCommand(program) {
    program
        .command('trend [repoPath]')
        .alias('t')
        .description('Show which files are getting more dangerous over time')
        .option('-n, --top <number>', 'Number of files to show', '10')
        .action(async (repoPath, options) => {
        const resolvedPath = path.resolve(repoPath ?? '.');
        const topN = parseInt(options.top, 10);
        try {
            (0, gitParser_1.validateRepo)(resolvedPath);
            function dateStr(daysAgo) {
                const d = new Date();
                d.setDate(d.getDate() - daysAgo);
                return d.toISOString().split('T')[0];
            }
            // Period A: 180 to 90 days ago (older)
            const olderCommits = (0, gitParser_1.parseCommits)(resolvedPath, dateStr(180))
                .filter(c => {
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 90);
                return c.timestamp < cutoff.getTime() / 1000;
            });
            // Period B: last 90 days (recent)
            const recentCommits = (0, gitParser_1.parseCommits)(resolvedPath, dateStr(90));
            if (recentCommits.length === 0) {
                console.log(chalk_1.default.grey('\n  No commits in the last 90 days.\n'));
                return;
            }
            // Count changes per file in each period
            const olderCount = new Map();
            for (const c of olderCommits) {
                for (const f of c.filesChanged) {
                    olderCount.set(f, (olderCount.get(f) ?? 0) + 1);
                }
            }
            const recentCount = new Map();
            for (const c of recentCommits) {
                for (const f of c.filesChanged) {
                    recentCount.set(f, (recentCount.get(f) ?? 0) + 1);
                }
            }
            // Find files with increasing activity
            const allFiles = new Set([...olderCount.keys(), ...recentCount.keys()]);
            const trends = [];
            for (const file of allFiles) {
                const older = olderCount.get(file) ?? 0;
                const recent = recentCount.get(file) ?? 0;
                if (older + recent < 3)
                    continue;
                trends.push({ file, older, recent, delta: recent - older });
            }
            const worse = trends.sort((a, b) => b.delta - a.delta).slice(0, topN);
            const better = trends.sort((a, b) => a.delta - b.delta).slice(0, 5);
            console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(' ' + chalk_1.default.bold.white('⛏  git-arch trend') + chalk_1.default.grey(' — activity shift: 90d ago vs last 90d'));
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(chalk_1.default.grey('  Older period commits: ' + olderCommits.length + '  |  Recent commits: ' + recentCommits.length));
            if (worse.filter(t => t.delta > 0).length === 0) {
                console.log(chalk_1.default.green('\n  ✓ No files significantly more active recently.\n'));
            }
            else {
                console.log('\n' + chalk_1.default.red.bold('  ⬆ More active recently (potential risk increase):'));
                for (const t of worse.filter(t => t.delta > 0)) {
                    const file = t.file.length > 50 ? '...' + t.file.slice(-47) : t.file;
                    const delta = chalk_1.default.red.bold('+' + t.delta);
                    const detail = chalk_1.default.grey(`(${t.older} → ${t.recent} changes)`);
                    console.log('  ' + chalk_1.default.red('↑') + ' ' + chalk_1.default.white(file.padEnd(52)) + delta + ' ' + detail);
                }
            }
            const gettingBetter = better.filter(t => t.delta < 0).slice(0, 5);
            if (gettingBetter.length > 0) {
                console.log('\n' + chalk_1.default.green.bold('  ⬇ Less active recently (stabilizing):'));
                for (const t of gettingBetter) {
                    const file = t.file.length > 50 ? '...' + t.file.slice(-47) : t.file;
                    const delta = chalk_1.default.green.bold(String(t.delta));
                    const detail = chalk_1.default.grey(`(${t.older} → ${t.recent} changes)`);
                    console.log('  ' + chalk_1.default.green('↓') + ' ' + chalk_1.default.white(file.padEnd(52)) + delta + ' ' + detail);
                }
            }
            console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)) + '\n');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(chalk_1.default.red('\n  ✖  Error: ') + message);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=trend.js.map