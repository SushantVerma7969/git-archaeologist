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
exports.registerOwnershipCommand = registerOwnershipCommand;
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const gitParser_1 = require("./core/gitParser");
function registerOwnershipCommand(program) {
    program
        .command('ownership [repoPath]')
        .alias('own')
        .description('Show who owns what — by folder and overall')
        .option('-s, --since <date>', 'Only analyze commits after this date')
        .action(async (repoPath, options) => {
        const resolvedPath = path.resolve(repoPath ?? '.');
        try {
            (0, gitParser_1.validateRepo)(resolvedPath);
            const commits = (0, gitParser_1.parseCommits)(resolvedPath, options.since);
            if (commits.length === 0) {
                console.log(chalk_1.default.grey('\n  No commits found.\n'));
                return;
            }
            // Build ownership map: author -> files -> line count approximation via commit count
            const authorFileCount = new Map();
            const authorTotalCommits = new Map();
            const folderOwnership = new Map();
            for (const commit of commits) {
                const author = commit.authorName;
                authorTotalCommits.set(author, (authorTotalCommits.get(author) ?? 0) + 1);
                if (!authorFileCount.has(author))
                    authorFileCount.set(author, new Map());
                const fileMap = authorFileCount.get(author);
                for (const file of commit.filesChanged) {
                    fileMap.set(file, (fileMap.get(file) ?? 0) + 1);
                    // Folder ownership
                    const folder = file.includes('/') ? file.split('/')[0] : '(root)';
                    if (!folderOwnership.has(folder))
                        folderOwnership.set(folder, new Map());
                    const fm = folderOwnership.get(folder);
                    fm.set(author, (fm.get(author) ?? 0) + 1);
                }
            }
            const totalCommits = commits.length;
            // Overall ownership
            const overall = Array.from(authorTotalCommits.entries())
                .map(([name, count]) => ({ name, count, pct: Math.round((count / totalCommits) * 100) }))
                .sort((a, b) => b.pct - a.pct);
            // Count files each author primarily owns (most commits on that file)
            const fileOwners = new Map();
            const allFiles = new Set(commits.flatMap(c => c.filesChanged));
            for (const file of allFiles) {
                let maxCount = 0;
                let owner = 'nobody';
                for (const [author, fileMap] of authorFileCount) {
                    const count = fileMap.get(file) ?? 0;
                    if (count > maxCount) {
                        maxCount = count;
                        owner = author;
                    }
                }
                fileOwners.set(file, owner);
            }
            const ownedFiles = new Map();
            for (const owner of fileOwners.values()) {
                ownedFiles.set(owner, (ownedFiles.get(owner) ?? 0) + 1);
            }
            // Nobody owns = files where top author has <= 30% of commits on that file
            let nobodyCount = 0;
            for (const file of allFiles) {
                const fileCounts = Array.from(authorFileCount.values())
                    .map(fm => fm.get(file) ?? 0);
                const total = fileCounts.reduce((a, b) => a + b, 0);
                const max = Math.max(...fileCounts);
                if (total > 0 && max / total <= 0.3)
                    nobodyCount++;
            }
            console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('⛏  git-arch ownership')} — ${chalk_1.default.grey(resolvedPath.split('/').pop())}`);
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log();
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Total commits')}   ${chalk_1.default.yellow.bold(String(totalCommits))}`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Contributors')}    ${chalk_1.default.yellow.bold(String(overall.length))}`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Total files')}     ${chalk_1.default.yellow.bold(String(allFiles.size))}`);
            console.log(`  ${chalk_1.default.hex('#A78BFA')('Unowned files')}   ${chalk_1.default.red.bold(String(nobodyCount))} ${chalk_1.default.grey('(no single author > 30% of commits)')}`);
            console.log();
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('Overall ownership by commit activity')}`);
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log();
            for (const { name, count, pct } of overall.slice(0, 15)) {
                const bar = '█'.repeat(Math.round(pct / 2)).padEnd(35);
                const pctColor = pct >= 40 ? chalk_1.default.red : pct >= 20 ? chalk_1.default.yellow : pct >= 10 ? chalk_1.default.white : chalk_1.default.grey;
                const owned = ownedFiles.get(name) ?? 0;
                console.log(`  ${pctColor(bar)} ${pctColor.bold((pct + '%').padStart(4))}  ${chalk_1.default.white(name.padEnd(28))} ${chalk_1.default.grey(count + ' commits · ' + owned + ' files primarily owned')}`);
            }
            if (overall.length > 15) {
                console.log(chalk_1.default.grey(`  ... and ${overall.length - 15} more contributors`));
            }
            // Folder breakdown
            console.log();
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log(` ${chalk_1.default.bold.white('Ownership by folder')}`);
            console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
            console.log();
            const folders = Array.from(folderOwnership.entries())
                .filter(([, fm]) => Array.from(fm.values()).reduce((a, b) => a + b, 0) >= 3)
                .sort((a, b) => {
                const ta = Array.from(a[1].values()).reduce((x, y) => x + y, 0);
                const tb = Array.from(b[1].values()).reduce((x, y) => x + y, 0);
                return tb - ta;
            })
                .slice(0, 12);
            for (const [folder, fm] of folders) {
                const total = Array.from(fm.values()).reduce((a, b) => a + b, 0);
                const top = Array.from(fm.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
                const topOwner = top[0];
                const ownerPct = Math.round((topOwner[1] / total) * 100);
                const bf = top.length === 1 || (top[0][1] / total) > 0.7 ? chalk_1.default.red(' ⚠ bus factor 1') : '';
                console.log(`  ${chalk_1.default.cyan(folder.padEnd(25))} ${chalk_1.default.white(topOwner[0].padEnd(25))} ${chalk_1.default.yellow(ownerPct + '%')}${bf}`);
                for (const [name, count] of top.slice(1)) {
                    const pct2 = Math.round((count / total) * 100);
                    console.log(`  ${' '.repeat(25)} ${chalk_1.default.grey(name.padEnd(25))} ${chalk_1.default.grey(pct2 + '%')}`);
                }
                console.log();
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
//# sourceMappingURL=ownership.js.map