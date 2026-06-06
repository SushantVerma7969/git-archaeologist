"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeOwnership = analyzeOwnership;
exports.buildAuthorNameMap = buildAuthorNameMap;
function analyzeOwnership(fileStatsMap, authorNameMap) {
    const results = [];
    for (const [, stats] of fileStatsMap) {
        if (stats.totalChanges === 0)
            continue;
        const contributors = Array.from(stats.authorChanges.entries())
            .map(([email, changes]) => ({
            name: authorNameMap.get(email) ?? email,
            email,
            changes,
            percent: Math.round((changes / stats.totalChanges) * 1000) / 10,
        }))
            .sort((a, b) => b.changes - a.changes);
        const top = contributors[0];
        results.push({
            filepath: stats.filepath,
            owner: top.name,
            ownerEmail: top.email,
            ownershipPercent: top.percent,
            contributors,
        });
    }
    return results.sort((a, b) => b.ownershipPercent - a.ownershipPercent);
}
function buildAuthorNameMap(commits) {
    const map = new Map();
    for (const c of commits) {
        const existing = map.get(c.authorEmail);
        // Keep the longest name seen for this email — more complete names win
        if (!existing || c.authorName.length > existing.length) {
            map.set(c.authorEmail, c.authorName);
        }
    }
    return map;
}
//# sourceMappingURL=ownershipAnalyzer.js.map