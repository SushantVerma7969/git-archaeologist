"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreCursedFiles = scoreCursedFiles;
const ONE_YEAR_SECS = 365 * 24 * 60 * 60;
function recencyWeight(lastChangedTimestamp) {
    const now = Date.now() / 1000;
    const ageInYears = (now - lastChangedTimestamp) / ONE_YEAR_SECS;
    // Files touched recently score higher — exponential decay
    return Math.exp(-0.5 * ageInYears);
}
function churnRate(timeline) {
    if (timeline.length < 2)
        return 0;
    const sorted = [...timeline].sort((a, b) => a - b);
    const spanYears = (sorted[sorted.length - 1] - sorted[0]) / ONE_YEAR_SECS;
    if (spanYears === 0)
        return timeline.length;
    return timeline.length / spanYears;
}
// Files that are structurally noisy — they change with every release
// and dominate curse scores without being genuinely dangerous code
const NOISE_PATTERNS = [
    /^package\.json$/,
    /^package-lock\.json$/,
    /^yarn\.lock$/,
    /^pnpm-lock\.yaml$/,
    /^CHANGELOG(\.md)?$/i,
    /^History(\.md)?$/i,
    /^HISTORY(\.md)?$/i,
    /^\.travis\.yml$/,
    /^appveyor\.yml$/,
    /^Readme(\.md)?$/i,
    /^README(\.md)?$/i,
    /^\.github\/workflows\//,
];
function isNoise(filepath) {
    const filename = filepath.split('/').pop() ?? filepath;
    return NOISE_PATTERNS.some((p) => p.test(filename) || p.test(filepath));
}
function accelerationScore(timeline) {
    if (timeline.length < 4)
        return 1.0;
    const sorted = [...timeline].sort((a, b) => a - b);
    const now = Date.now() / 1000;
    const oneYearAgo = now - ONE_YEAR_SECS;
    const sixMonthsAgo = now - (ONE_YEAR_SECS / 2);
    const recentChanges = sorted.filter((t) => t >= sixMonthsAgo).length;
    const olderChanges = sorted.filter((t) => t >= oneYearAgo && t < sixMonthsAgo).length;
    if (olderChanges === 0)
        return recentChanges > 0 ? 1.5 : 1.0;
    const ratio = recentChanges / olderChanges;
    // ratio > 1 means accelerating, < 1 means slowing down
    // cap between 0.5 and 2.0 so it doesn't dominate the score
    return Math.min(2.0, Math.max(0.5, ratio));
}
function scoreCursedFiles(fileStatsMap, topN = 20) {
    const results = [];
    for (const [, stats] of fileStatsMap) {
        const authorCount = stats.uniqueAuthors.size;
        const recency = recencyWeight(stats.lastChanged);
        const churn = churnRate(stats.changeTimeline);
        const acceleration = accelerationScore(stats.changeTimeline);
        // Curse score formula:
        // Base = total changes × author count
        // Multiplied by recency, churn rate, and acceleration
        // Acceleration > 1 means the file is getting MORE changes recently — more dangerous
        const curseScore = Math.round(stats.totalChanges * Math.log2(authorCount + 1) * recency * Math.log2(churn + 2) * acceleration * 100) / 100;
        const reasons = [];
        if (stats.totalChanges > 50)
            reasons.push(`Changed ${stats.totalChanges} times`);
        if (authorCount > 5)
            reasons.push(`Touched by ${authorCount} different authors`);
        if (churn > 20)
            reasons.push(`High churn rate (${Math.round(churn)}x/year)`);
        if (recency > 0.8)
            reasons.push('Modified very recently');
        if (acceleration > 1.3)
            reasons.push(`Change rate accelerating (${acceleration.toFixed(1)}x recent vs prior period)`);
        const noisy = isNoise(stats.filepath);
        results.push({
            filepath: stats.filepath,
            curseScore: noisy ? 0 : curseScore,
            totalChanges: stats.totalChanges,
            uniqueAuthors: authorCount,
            recencyWeight: Math.round(recency * 100) / 100,
            reasons: noisy ? ['Excluded — structural noise (changelog/lockfile)'] : (reasons.length > 0 ? reasons : ['Mild instability']),
            noisy,
        });
    }
    return results
        .filter((f) => !f.noisy)
        .sort((a, b) => b.curseScore - a.curseScore)
        .slice(0, topN);
}
//# sourceMappingURL=curseScorer.js.map