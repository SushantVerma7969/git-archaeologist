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
exports.registerBlastCommand = registerBlastCommand;
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const gitParser_1 = require("./core/gitParser");
function registerBlastCommand(program) {
    program
        .command('blast <filepath> [repoPath]')
        .description('Show what else breaks when you touch this file')
        .option('-s, --since <date>', 'Limit to commits after this date')
        .action(async (filepath, repoPath, options) => {
        const resolvedPath = path.resolve(repoPath ?? '.');
        try {
            (0, gitParser_1.validateRepo)(resolvedPath);
            const commits = (0, gitParser_1.parseCommits)(resolvedPath, options.since);
            const normalizedTarget = filepath.replace(/\\/g, '/').replace(/^\.\//, '');
            // Find all commits that touched this file
            const targetCommits = commits.filter(c => c.filesChanged.some(f => f === normalizedTarget || f.endsWith('/' + normalizedTarget)));
            if (targetCommits.length === 0) {
                console.error(chalk_1.default.red(`\n  No commits found for: ${filepath}\n`));
                process.exit(1);
            }
            // Count co-changes
            const coChanges = new Map();
            for (const commit of targetCommits) {
                for (const f of commit.filesChanged) {
                    const norm = f.replace(/\\/g, '/');
                    if (norm === normalizedTarget || norm.endsWith('/' + normalizedTarget))
                        continue;
                    coChanges.set(f, (coChanges.get(f) ?? 0) + 1);
                }
            }
            // Calculate blast radius scores
            const results = Array.from(coChanges.entries())
                .map(([file, count]) => ({
                file,
                count,
                pct: Math.round((count / targetCommits.length) * 100)
            }))
                .filter(r => r.pct >= 10)
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 15);
            const totalAffected = Array.from(coChanges.values()).filter(v => Math.round((v / targetCommits.length) * 100) >= 10).length;
            console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('⛏  git-arch blast')} — ${chalk_1.default.cyan(filepath)}`);
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log();
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Based on')}       ${chalk_1.default.yellow.bold(String(targetCommits.length))} commits touching this file`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Blast radius')}   ${chalk_1.default.yellow.bold(String(totalAffected))} files historically change together with it`);
            console.log();
            if (results.length === 0) {
                console.log(chalk_1.default.green('  ✓ This file changes independently — low blast radius.\n'));
                return;
            }
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('Files that change with it')}`);
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log();
            for (const r of results) {
                const bar = '█'.repeat(Math.round(r.pct / 5)).padEnd(20);
                const pctColor = r.pct >= 75 ? chalk_1.default.red
                    : r.pct >= 50 ? chalk_1.default.yellow
                        : r.pct >= 25 ? chalk_1.default.white
                            : chalk_1.default.grey;
                const file = r.file.length > 45 ? '...' + r.file.slice(-42) : r.file;
                console.log(`  ${pctColor(bar)} ${pctColor.bold((r.pct + '%').padStart(4))}  ${chalk_1.default.white(file)}`);
            }
            console.log();
            console.log(chalk_1.default.grey('  Percentage = how often this file changed in the same commit'));
            console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)) + '\n');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(chalk_1.default.red('\n  ✖  Error: ') + message);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=blast.js.map