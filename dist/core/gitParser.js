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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRepo = validateRepo;
exports.getRepoName = getRepoName;
exports.getTotalCommitCount = getTotalCommitCount;
exports.parseCommits = parseCommits;
exports.buildFileStats = buildFileStats;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
function validateRepo(repoPath) {
    try {
        (0, child_process_1.execSync)('git rev-parse --is-inside-work-tree', {
            cwd: repoPath,
            stdio: 'pipe',
        });
    }
    catch {
        throw new Error(`Not a valid git repository: ${repoPath}`);
    }
}
function getRepoName(repoPath) {
    try {
        const remote = (0, child_process_1.execSync)('git remote get-url origin', {
            cwd: repoPath,
            stdio: 'pipe',
        })
            .toString()
            .trim();
        const match = remote.match(/\/([^/]+?)(\.git)?$/);
        if (match)
            return match[1];
    }
    catch {
        // no remote, fall back to folder name
    }
    return path.basename(path.resolve(repoPath));
}
function getTotalCommitCount(repoPath, since) {
    const sinceFlag = since ? ` --after="${since}"` : '';
    const out = (0, child_process_1.execSync)(`git rev-list --count HEAD${sinceFlag}`, {
        cwd: repoPath,
        stdio: 'pipe',
    })
        .toString()
        .trim();
    return parseInt(out, 10);
}
function sanitizeFilePath(raw) {
    // git sometimes wraps paths containing special chars in double quotes
    // e.g. "test/some file.js" — strip the surrounding quotes
    let p = raw.trim();
    if (p.startsWith('"') && p.endsWith('"')) {
        p = p.slice(1, -1);
    }
    return p;
}
function parseCommits(repoPath, since) {
    const DELIMITER = '||GITARCH||';
    const BEGIN_MARKER = 'BEGINCOMMIT' + DELIMITER;
    const sinceFlag = since ? ` --after="${since}"` : '';
    const raw = (0, child_process_1.execSync)(`git log --pretty=format:"${BEGIN_MARKER}%H${DELIMITER}%ae${DELIMITER}%an${DELIMITER}%at" --name-only${sinceFlag}`, { cwd: repoPath, stdio: 'pipe', maxBuffer: 512 * 1024 * 1024 }).toString();
    const commits = [];
    const blocks = raw
        .split(BEGIN_MARKER)
        .map((b) => b.trim())
        .filter(Boolean);
    for (const block of blocks) {
        const newlineIdx = block.indexOf('\n');
        const header = newlineIdx === -1 ? block.trim() : block.substring(0, newlineIdx).trim();
        const filesRaw = newlineIdx === -1 ? '' : block.substring(newlineIdx + 1).trim();
        const parts = header.split(DELIMITER);
        if (parts.length !== 4)
            continue;
        const [hash, authorEmail, authorName, tsRaw] = parts;
        const timestamp = parseInt(tsRaw, 10);
        if (isNaN(timestamp))
            continue;
        const filesChanged = filesRaw
            .split('\n')
            .map((f) => sanitizeFilePath(f))
            .filter((f) => f.length > 0)
            .filter((f) => !f.startsWith('node_modules/') &&
            !f.startsWith('.git/') &&
            !f.startsWith('dist/') &&
            !f.startsWith('build/') &&
            !f.startsWith('coverage/') &&
            !f.endsWith('.map') &&
            !f.endsWith('.d.ts'));
        commits.push({ hash, authorEmail, authorName, timestamp, filesChanged });
    }
    return commits;
}
function buildFileStats(commits) {
    const statsMap = new Map();
    for (const commit of commits) {
        for (const filepath of commit.filesChanged) {
            if (!statsMap.has(filepath)) {
                statsMap.set(filepath, {
                    filepath,
                    totalChanges: 0,
                    uniqueAuthors: new Set(),
                    authorChanges: new Map(),
                    firstChanged: commit.timestamp,
                    lastChanged: commit.timestamp,
                    changeTimeline: [],
                });
            }
            const stats = statsMap.get(filepath);
            stats.totalChanges += 1;
            stats.uniqueAuthors.add(commit.authorEmail);
            stats.authorChanges.set(commit.authorEmail, (stats.authorChanges.get(commit.authorEmail) ?? 0) + 1);
            if (commit.timestamp < stats.firstChanged)
                stats.firstChanged = commit.timestamp;
            if (commit.timestamp > stats.lastChanged)
                stats.lastChanged = commit.timestamp;
            stats.changeTimeline.push(commit.timestamp);
        }
    }
    return statsMap;
}
//# sourceMappingURL=gitParser.js.map