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
exports.registerBlameCommand = registerBlameCommand;
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const gitParser_1 = require("./core/gitParser");
function registerBlameCommand(program) {
    program
        .command('blame <filepath> [repoPath]')
        .alias('b')
        .description('Deep dive on a single file — full author history and timeline')
        .action((filepath, repoPath) => {
        const resolvedRepo = repoPath ? path.resolve(repoPath) : process.cwd();
        const resolvedPath = resolvedRepo;
        try {
            (0, gitParser_1.validateRepo)(resolvedPath);
            const commits = (0, gitParser_1.parseCommits)(resolvedPath);
            const normalizedTarget = filepath.replace(/\\\\/g, '/').replace(/^\.\//, '');
            // Filter to only commits touching this file
            const fileCommits = commits.filter((c) => c.filesChanged.some(f => f === normalizedTarget || f.endsWith('/' + normalizedTarget)));
            if (fileCommits.length === 0) {
                console.error(chalk_1.default.red(`\n  No commits found for: ${filepath}`));
                process.exit(1);
            }
            // Author breakdown
            const authorMap = new Map();
            for (const c of fileCommits) {
                const existing = authorMap.get(c.authorEmail);
                if (existing) {
                    existing.count++;
                    if (c.timestamp < existing.first)
                        existing.first = c.timestamp;
                    if (c.timestamp > existing.last)
                        existing.last = c.timestamp;
                    // Keep longest name for this email
                    if (c.authorName.length > existing.name.length)
                        existing.name = c.authorName;
                }
                else {
                    authorMap.set(c.authorEmail, { name: c.authorName, count: 1, first: c.timestamp, last: c.timestamp });
                }
            }
            const totalChanges = fileCommits.length;
            const authors = Array.from(authorMap.values())
                .sort((a, b) => b.count - a.count);
            const timestamps = fileCommits.map((c) => c.timestamp);
            const firstTs = timestamps.reduce((a, b) => a < b ? a : b, timestamps[0]);
            const lastTs = timestamps.reduce((a, b) => a > b ? a : b, timestamps[0]);
            const firstDate = new Date(firstTs * 1000).toISOString().split('T')[0];
            const lastDate = new Date(lastTs * 1000).toISOString().split('T')[0];
            // Acceleration: last 6 months vs prior 6 months
            const now = Date.now() / 1000;
            const sixMonths = 182 * 24 * 60 * 60;
            const recent = fileCommits.filter((c) => c.timestamp >= now - sixMonths).length;
            const prior = fileCommits.filter((c) => c.timestamp >= now - sixMonths * 2 && c.timestamp < now - sixMonths).length;
            const accel = prior === 0 ? (recent > 0 ? 'accelerating' : 'stable') : (recent > prior ? `accelerating ${(recent / prior).toFixed(1)}x` : recent < prior ? 'slowing down' : 'stable');
            console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('⛏  git-arch blame')} — ${chalk_1.default.cyan(filepath)}`);
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log();
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Total changes')}   ${chalk_1.default.yellow.bold(String(totalChanges))}`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Unique authors')}  ${chalk_1.default.yellow.bold(String(authors.length))}`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('First changed')}   ${chalk_1.default.white(firstDate)}`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Last changed')}    ${chalk_1.default.white(lastDate)}`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Trend')}           ${recent > prior ? chalk_1.default.red(accel) : chalk_1.default.green(accel)}`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Recent (6mo)')}   ${chalk_1.default.white(String(recent))} commits`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Prior (6mo)')}    ${chalk_1.default.white(String(prior))} commits`);
            console.log();
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('Authors')}`);
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            for (const data of authors) {
                const pct = Math.round((data.count / totalChanges) * 100);
                const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20);
                const firstD = new Date(data.first * 1000).toISOString().split('T')[0];
                const lastD = new Date(data.last * 1000).toISOString().split('T')[0];
                const pctColor = pct >= 50 ? chalk_1.default.red : pct >= 25 ? chalk_1.default.yellow : chalk_1.default.white;
                console.log(`  ${pctColor(bar)} ${pctColor(pct + '%')}  ${chalk_1.default.white(data.name.padEnd(28))} ${chalk_1.default.grey(data.count + ' commits  ' + firstD + ' → ' + lastD)}`);
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
//# sourceMappingURL=blame.js.map