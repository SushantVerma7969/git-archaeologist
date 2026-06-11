"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeBusFactor = analyzeBusFactor;
exports.analyzeCoupling = analyzeCoupling;
const botFilter_1 = require("../utils/botFilter");
function analyzeBusFactor(fileStatsMap, authorNameMap) {
    const folderMap = new Map();
    for (const [, stats] of fileStatsMap) {
        const parts = stats.filepath.split('/');
        const folder = parts.length > 1 ? parts[0] : '(root)';
        if (!folderMap.has(folder)) {
            folderMap.set(folder, new Map());
        }
        const authorTotals = folderMap.get(folder);
        for (const [email, count] of stats.authorChanges) {
            const name = authorNameMap.get(email) ?? email;
            if ((0, botFilter_1.isBot)(name, email))
                continue;
            authorTotals.set(email, (authorTotals.get(email) ?? 0) + count);
        }
    }
    const results = [];
    for (const [folder, authorTotals] of folderMap) {
        const totalChanges = Array.from(authorTotals.values()).reduce((a, b) => a + b, 0);
        if (totalChanges === 0)
            continue;
        const sorted = Array.from(authorTotals.entries())
            .sort((a, b) => b[1] - a[1]);
        let cumulative = 0;
        let busFactor = 0;
        const atRiskAuthors = [];
        for (const [email, count] of sorted) {
            cumulative += count;
            busFactor += 1;
            atRiskAuthors.push(authorNameMap.get(email) ?? email);
            if (cumulative / totalChanges >= 0.5)
                break;
        }
        const filesAtRisk = folder === '(root)'
            ? Array.from(fileStatsMap.values()).filter((s) => !s.filepath.includes('/')).length
            : Array.from(fileStatsMap.values()).filter((s) => s.filepath.startsWith(folder + '/')).length;
        let warning = '';
        if (busFactor === 1) {
            warning = `⚠️  Single point of failure — only ${atRiskAuthors[0]} owns this module`;
        }
        else if (busFactor === 2) {
            warning = `⚡ High risk — only 2 people understand this module`;
        }
        else {
            warning = `✓ Healthy ownership spread`;
        }
        results.push({ scope: folder, busFactor, atRiskAuthors, filesAtRisk, warning });
    }
    return results.sort((a, b) => a.busFactor - b.busFactor);
}
function analyzeCoupling(commits, minCoChanges = 3) {
    const coChangeMap = new Map();
    const fileChangeCount = new Map();
    for (const commit of commits) {
        const files = commit.filesChanged.filter((f) => f.length > 0);
        for (const file of files) {
            fileChangeCount.set(file, (fileChangeCount.get(file) ?? 0) + 1);
        }
        if (files.length > 50)
            continue;
        for (let i = 0; i < files.length; i++) {
            for (let j = i + 1; j < files.length; j++) {
                const key = [files[i], files[j]].sort().join('|||');
                coChangeMap.set(key, (coChangeMap.get(key) ?? 0) + 1);
            }
        }
    }
    const results = [];
    for (const [key, coChanges] of coChangeMap) {
        if (coChanges < minCoChanges)
            continue;
        const [fileA, fileB] = key.split('|||');
        const maxChanges = Math.max(fileChangeCount.get(fileA) ?? 1, fileChangeCount.get(fileB) ?? 1);
        const couplingScore = Math.round((coChanges / maxChanges) * 1000) / 10;
        results.push({ fileA, fileB, coChanges, couplingScore });
    }
    return results
        .sort((a, b) => b.couplingScore - a.couplingScore)
        .slice(0, 30);
}
//# sourceMappingURL=busFactorAnalyzer.js.map