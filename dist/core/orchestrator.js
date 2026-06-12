"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze = analyze;
const ora_1 = __importDefault(require("ora"));
const gitParser_1 = require("./gitParser");
const curseScorer_1 = require("../analyzers/curseScorer");
const ownershipAnalyzer_1 = require("../analyzers/ownershipAnalyzer");
const busFactorAnalyzer_1 = require("../analyzers/busFactorAnalyzer");
const activity_1 = require("../utils/activity");
async function analyze(repoPath, since) {
    const spinner = (0, ora_1.default)({ text: 'Validating repository...', color: 'magenta' }).start();
    try {
        // Step 1 — validate
        (0, gitParser_1.validateRepo)(repoPath);
        const repoName = (0, gitParser_1.getRepoName)(repoPath);
        const totalCommits = (0, gitParser_1.getTotalCommitCount)(repoPath, since);
        const sinceLabel = since ? ` (since ${since})` : '';
        spinner.text = `Parsing ${totalCommits.toLocaleString()} commits in ${repoName}${sinceLabel}...`;
        // Step 2 — parse all commits
        const commits = (0, gitParser_1.parseCommits)(repoPath, since);
        spinner.text = 'Building file statistics...';
        // Step 3 — build per-file stats
        const fileStats = (0, gitParser_1.buildFileStats)(commits);
        // Step 4 — build author name lookup
        const authorNameMap = (0, ownershipAnalyzer_1.buildAuthorNameMap)(commits);
        spinner.text = 'Scoring cursed files...';
        // Step 5 — run all analyzers
        const cursedFiles = (0, curseScorer_1.scoreCursedFiles)(fileStats);
        spinner.text = 'Analyzing ownership...';
        const ownership = (0, ownershipAnalyzer_1.analyzeOwnership)(fileStats, authorNameMap);
        spinner.text = 'Calculating bus factor...';
        const busFactor = (0, busFactorAnalyzer_1.analyzeBusFactor)(fileStats, authorNameMap);
        spinner.text = 'Detecting implicit coupling...';
        const coupling = (0, busFactorAnalyzer_1.analyzeCoupling)(commits);
        // Step 6 — collect date range
        const allTimestamps = commits.map((c) => c.timestamp);
        const minTs = allTimestamps.length > 0 ? allTimestamps.reduce((a, b) => a < b ? a : b) : 0;
        const maxTs = allTimestamps.length > 0 ? allTimestamps.reduce((a, b) => a > b ? a : b) : 0;
        // Step 7 — count unique authors
        const allAuthors = new Set(commits.map((c) => c.authorEmail));
        const lastActiveByAuthor = (0, activity_1.buildLastActiveMap)(commits);
        spinner.succeed(`Analysis complete — ${fileStats.size.toLocaleString()} files scanned`);
        return {
            repoPath,
            repoName,
            analyzedAt: new Date(),
            totalCommits,
            totalFiles: fileStats.size,
            totalAuthors: allAuthors.size,
            dateRange: {
                from: new Date(minTs * 1000),
                to: new Date(maxTs * 1000),
            },
            cursedFiles,
            ownership,
            busFactor,
            coupling,
            fileStats,
            lastActiveByAuthor,
        };
    }
    catch (err) {
        spinner.fail('Analysis failed');
        throw err;
    }
}
//# sourceMappingURL=orchestrator.js.map