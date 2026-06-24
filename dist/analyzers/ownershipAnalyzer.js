"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeOwnership = analyzeOwnership;
exports.buildAuthorNameMap = buildAuthorNameMap;
const botFilter_1 = require("../utils/botFilter");
const scopeFilter_1 = require("../utils/scopeFilter");
// A file is only interesting for ownership if it has real history and more
// than one contributor. A file changed once by one person is "100% owned"
// but says nothing; the signal worth surfacing is a file many hands have
// touched where one person still dominates.
const MIN_CHANGES_FOR_OWNERSHIP = 5;
function analyzeOwnership(fileStatsMap, authorNameMap) {
    const results = [];
    for (const [, stats] of fileStatsMap) {
        if (stats.totalChanges < MIN_CHANGES_FOR_OWNERSHIP)
            continue;
        const scope = stats.filepath.includes('/')
            ? stats.filepath.split('/')[0]
            : '(root)';
        if (!(0, scopeFilter_1.isSourceScope)(scope))
            continue;
        const contributors = Array.from(stats.authorChanges.entries())
            .map(([email, changes]) => ({
            name: authorNameMap.get(email) ?? email,
            email,
            changes,
            percent: Math.round((changes / stats.totalChanges) * 1000) / 10,
        }))
            .filter((c) => !(0, botFilter_1.isBot)(c.name, c.email))
            .sort((a, b) => b.changes - a.changes);
        // Need contested ownership: a single-author file is 100% by definition
        // and carries no concentration signal.
        if (contributors.length < 2)
            continue;
        const top = contributors[0];
        results.push({
            filepath: stats.filepath,
            owner: top.name,
            ownerEmail: top.email,
            ownershipPercent: top.percent,
            contributors,
        });
    }
    // Rank by the dominant contributor's raw volume of changes, so a heavily
    // edited file with one clear owner outranks a lightly edited one that is
    // technically more concentrated.
    return results.sort((a, b) => b.contributors[0].changes - a.contributors[0].changes);
}
function buildAuthorNameMap(commits) {
    const map = new Map();
    for (const c of commits) {
        const existing = map.get(c.authorEmail);
        if (!existing || c.authorName.length > existing.length) {
            map.set(c.authorEmail, c.authorName);
        }
    }
    return map;
}
//# sourceMappingURL=ownershipAnalyzer.js.map