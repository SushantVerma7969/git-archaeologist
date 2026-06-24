"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSourceScope = void 0;
exports.classifyScopeRisk = classifyScopeRisk;
exports.buildRiskExplanation = buildRiskExplanation;
exports.buildScopeRisks = buildScopeRisks;
exports.buildTemporalScopeRisks = buildTemporalScopeRisks;
exports.buildYearlyConcentrationSeries = buildYearlyConcentrationSeries;
exports.buildOwnershipTransitions = buildOwnershipTransitions;
exports.buildEvolutionSummary = buildEvolutionSummary;
exports.buildContributorChurn = buildContributorChurn;
exports.buildAbandonedScopes = buildAbandonedScopes;
exports.buildHotspots = buildHotspots;
const activity_1 = require("./utils/activity");
const concentration_1 = require("./utils/concentration");
const scopeFilter_1 = require("./utils/scopeFilter");
Object.defineProperty(exports, "isSourceScope", { enumerable: true, get: function () { return scopeFilter_1.isSourceScope; } });
const recommendations_1 = require("./recommendations");
function classifyScopeRisk(busFactor, concentration) {
    if (busFactor === 1 && concentration >= 80) {
        return 'HIGH';
    }
    if (busFactor === 1 || (busFactor === 2 && concentration >= 50)) {
        return 'MEDIUM';
    }
    return 'LOW';
}
function isConcentrated(level) {
    return level === 'HIGH' || level === 'MEDIUM';
}
function buildRiskExplanation(input) {
    const reasons = [
        `Bus factor is ${input.busFactor}`,
        `Top contributor owns ${input.concentration}% of touches`,
    ];
    if (input.level === 'HIGH') {
        return {
            reasons,
            summary: 'Knowledge remains concentrated in a single contributor.',
        };
    }
    if (input.level === 'MEDIUM') {
        const summary = input.busFactor === 1
            ? 'One contributor still accounts for enough history to create continuity risk.'
            : 'Knowledge is shared, but still concentrated across a small contributor set.';
        return { reasons, summary };
    }
    return {
        reasons,
        summary: `Knowledge appears distributed across ${input.contributors} contributor identities.`,
    };
}
function buildNonBotEmailSet(result) {
    const emails = new Set();
    for (const o of result.ownership) {
        for (const c of o.contributors) {
            emails.add(c.email);
        }
    }
    return emails;
}
function buildScopeRisks(result, options = {}) {
    const minFilesAtRisk = options.minFilesAtRisk ?? 3;
    const nonBotEmails = buildNonBotEmailSet(result);
    const folderAuthorChanges = new Map();
    for (const [, stats] of result.fileStats) {
        const parts = stats.filepath.split('/');
        const folder = parts.length > 1 ? parts[0] : '(root)';
        if (!folderAuthorChanges.has(folder))
            folderAuthorChanges.set(folder, new Map());
        const authorTotals = folderAuthorChanges.get(folder);
        for (const [email, count] of stats.authorChanges) {
            if (!nonBotEmails.has(email))
                continue;
            authorTotals.set(email, (authorTotals.get(email) ?? 0) + count);
        }
    }
    const bfMap = new Map(result.busFactor.map((b) => [b.scope, b]));
    const risks = [];
    const nameToEmail = new Map();
    for (const o of result.ownership) {
        for (const c of o.contributors) {
            if (!nameToEmail.has(c.name))
                nameToEmail.set(c.name, c.email);
        }
    }
    for (const [folder, authorTotals] of folderAuthorChanges) {
        const bf = bfMap.get(folder);
        if (!bf)
            continue;
        if (bf.filesAtRisk < minFilesAtRisk)
            continue;
        const total = Array.from(authorTotals.values()).reduce((a, b) => a + b, 0);
        if (total === 0)
            continue;
        const concentration = (0, concentration_1.calculateConcentration)(authorTotals);
        if (concentration === null)
            continue;
        const contributors = authorTotals.size;
        const topOwner = bf.atRiskAuthors[0] ?? 'unknown';
        const level = classifyScopeRisk(bf.busFactor, concentration);
        const explanationInput = {
            level,
            busFactor: bf.busFactor,
            concentration,
            contributors,
        };
        const ownerEmail = nameToEmail.get(topOwner);
        const lastActiveTs = ownerEmail ? result.lastActiveByAuthor.get(ownerEmail) : undefined;
        let lastActive;
        let lastActiveDays;
        if (lastActiveTs !== undefined) {
            lastActive = (0, activity_1.formatTimeAgo)(lastActiveTs);
            lastActiveDays = Math.floor((Date.now() / 1000 - lastActiveTs) / 86400);
        }
        const recommendations = (0, recommendations_1.buildRiskRecommendations)(level, bf.busFactor, lastActive);
        risks.push({
            scope: folder,
            level,
            busFactor: bf.busFactor,
            concentration,
            contributors,
            totalFileTouches: total,
            topOwner,
            filesAtRisk: bf.filesAtRisk,
            explanation: buildRiskExplanation(explanationInput),
            recommendations,
            lastActive,
            lastActiveDays,
        });
    }
    const order = {
        HIGH: 0,
        MEDIUM: 1,
        LOW: 2,
    };
    return risks.sort((a, b) => order[a.level] - order[b.level] || b.concentration - a.concentration);
}
function countNonBotTouchesByScope(result, nonBotEmails) {
    const touches = new Map();
    for (const [, stats] of result.fileStats) {
        const parts = stats.filepath.split('/');
        const folder = parts.length > 1 ? parts[0] : '(root)';
        let total = 0;
        for (const [email, count] of stats.authorChanges) {
            if (!nonBotEmails.has(email))
                continue;
            total += count;
        }
        touches.set(folder, (touches.get(folder) ?? 0) + total);
    }
    return touches;
}
function classifyTemporalRisk(lifetime, recent, recentTouches = 0) {
    if (recentTouches === 0) {
        return 'No recent activity';
    }
    if (recentTouches < 10 || recent === undefined) {
        return 'Insufficient recent evidence';
    }
    const lifetimeConcentrated = isConcentrated(lifetime.level);
    const recentConcentrated = isConcentrated(recent.level);
    if (lifetimeConcentrated && recentConcentrated) {
        return 'Persistent concentration';
    }
    if (lifetimeConcentrated && !recentConcentrated) {
        return 'Historical concentration';
    }
    if (!lifetimeConcentrated && recentConcentrated) {
        return 'Emerging concentration';
    }
    return 'Persistently distributed';
}
function buildTemporalSummary(lifetime, recent, category) {
    if (category === 'No recent activity') {
        return 'This scope has lifetime history but no non-bot touches in the recent window.';
    }
    if (category === 'Insufficient recent evidence') {
        return 'This scope has recent activity, but fewer than 10 non-bot touches in the recent window.';
    }
    const recentLabel = recent
        ? `${recent.level} risk, ${recent.concentration}% concentration`
        : 'no comparable recent risk';
    return `Lifetime is ${lifetime.level} risk at ${lifetime.concentration}% concentration; recent is ${recentLabel}.`;
}
function buildTemporalScopeRisks(lifetimeResult, recentResult) {
    const lifetimeRisks = buildScopeRisks(lifetimeResult);
    const recentRisks = buildScopeRisks(recentResult, { minFilesAtRisk: 0 });
    const recentByScope = new Map(recentRisks.map((risk) => [risk.scope, risk]));
    const recentTouchesByScope = countNonBotTouchesByScope(recentResult, buildNonBotEmailSet(recentResult));
    const categoryOrder = {
        'Persistent concentration': 0,
        'Historical concentration': 1,
        'Emerging concentration': 2,
        'Persistently distributed': 3,
        'No recent activity': 4,
        'Insufficient recent evidence': 5,
    };
    return lifetimeRisks
        .filter((lifetime) => (0, scopeFilter_1.isSourceScope)(lifetime.scope))
        .map((lifetime) => {
        const recent = recentByScope.get(lifetime.scope);
        const recentTouches = recentTouchesByScope.get(lifetime.scope) ?? 0;
        const category = classifyTemporalRisk(lifetime, recent, recentTouches);
        const series = buildYearlyConcentrationSeries(lifetimeResult)
            .find((s) => s.scope === lifetime.scope);
        return {
            scope: lifetime.scope,
            category,
            lifetime,
            recent,
            recentTouches,
            delta: recent
                ? Number((recent.concentration -
                    lifetime.concentration).toFixed(1))
                : null,
            trend: series?.direction ?? 'insufficient_data',
            summary: buildTemporalSummary(lifetime, recent, category),
            recommendations: (0, recommendations_1.buildTemporalRecommendations)(category),
        };
    })
        .sort((a, b) => {
        return categoryOrder[a.category] - categoryOrder[b.category]
            || b.lifetime.concentration - a.lifetime.concentration;
    });
}
function classifySeriesDirection(points) {
    const valid = points.filter((p) => p.concentration !== null);
    if (valid.length < 2) {
        return 'insufficient_data';
    }
    const first = valid[0].concentration;
    const last = valid[valid.length - 1].concentration;
    const diff = last - first;
    if (Math.abs(diff) < 10) {
        return 'stable';
    }
    return diff > 0 ? 'rising' : 'declining';
}
function buildYearlyConcentrationSeries(result) {
    const series = [];
    const scopeData = new Map();
    for (const [, stats] of result.fileStats) {
        const scope = stats.filepath.includes('/')
            ? stats.filepath.split('/')[0]
            : '(root)';
        if (!scopeData.has(scope)) {
            scopeData.set(scope, new Map());
        }
        const yearlyScopeData = scopeData.get(scope);
        for (const [year, authors] of stats.authorChangesByYear) {
            if (!yearlyScopeData.has(year)) {
                yearlyScopeData.set(year, new Map());
            }
            const scopeAuthors = yearlyScopeData.get(year);
            for (const [author, count] of authors) {
                scopeAuthors.set(author, (scopeAuthors.get(author) ?? 0) + count);
            }
        }
    }
    for (const [scope, yearlyData] of scopeData) {
        const years = Array.from(yearlyData.keys()).sort((a, b) => a - b);
        const points = [];
        for (const year of years) {
            const authors = yearlyData.get(year);
            points.push({
                year,
                commitCount: Array.from(authors.values()).reduce((a, b) => a + b, 0),
                concentration: (0, concentration_1.calculateConcentration)(authors),
            });
        }
        series.push({
            scope,
            points,
            direction: classifySeriesDirection(points),
        });
    }
    return series;
}
function buildOwnershipTransitions(result) {
    const transitions = [];
    const scopeData = new Map();
    for (const [, stats] of result.fileStats) {
        const scope = stats.filepath.includes('/')
            ? stats.filepath.split('/')[0]
            : '(root)';
        if (!scopeData.has(scope)) {
            scopeData.set(scope, new Map());
        }
        const yearlyScopeData = scopeData.get(scope);
        for (const [year, authors] of stats.authorChangesByYear) {
            if (!yearlyScopeData.has(year)) {
                yearlyScopeData.set(year, new Map());
            }
            const scopeAuthors = yearlyScopeData.get(year);
            for (const [author, count] of authors) {
                scopeAuthors.set(author, (scopeAuthors.get(author) ?? 0) + count);
            }
        }
    }
    for (const [scope, yearlyData] of scopeData) {
        const years = Array.from(yearlyData.keys()).sort((a, b) => a - b);
        const dominantOwners = [];
        for (const year of years) {
            const authors = yearlyData.get(year);
            const sorted = Array.from(authors.entries()).sort((a, b) => b[1] - a[1]);
            if (sorted.length === 0) {
                continue;
            }
            const total = Array.from(authors.values()).reduce((a, b) => a + b, 0);
            const share = total === 0
                ? 0
                : (sorted[0][1] / total) * 100;
            dominantOwners.push({
                year,
                owner: sorted[0][0],
                share,
            });
        }
        for (let i = 1; i < dominantOwners.length; i++) {
            const previous = dominantOwners[i - 1];
            const current = dominantOwners[i];
            let severity;
            if (current.share >= 80) {
                severity = 'HIGH';
            }
            else if (current.share >= 50) {
                severity = 'MEDIUM';
            }
            else {
                severity = 'LOW';
            }
            if (previous.owner === current.owner) {
                continue;
            }
            const explanation = severity === 'HIGH'
                ? 'Ownership shifted and remains highly concentrated in a single contributor.'
                : severity === 'MEDIUM'
                    ? 'Ownership shifted and responsibility is concentrated across a small contributor group.'
                    : 'Ownership shifted while work remained relatively distributed.';
            transitions.push({
                scope,
                fromOwner: previous.owner,
                toOwner: current.owner,
                fromYear: previous.year,
                toYear: current.year,
                severity,
                explanation,
            });
        }
    }
    return transitions.filter((t) => (0, scopeFilter_1.isSourceScope)(t.scope));
}
function buildEvolutionSummary(temporalRisks, ownershipTransitions) {
    return {
        ownershipTransitions: ownershipTransitions.length,
        highSeverityTransitions: ownershipTransitions.filter((t) => t.severity === 'HIGH').length,
        emergingConcentration: temporalRisks.filter((r) => r.category === 'Emerging concentration').length,
        historicalConcentration: temporalRisks.filter((r) => r.category === 'Historical concentration').length,
        persistentConcentration: temporalRisks.filter((r) => r.category === 'Persistent concentration').length,
        distributedScopes: temporalRisks.filter((r) => r.category === 'Persistently distributed').length,
    };
}
function buildContributorChurn(result) {
    const now = Date.now() / 1000;
    const twelveMonths = 365 * 24 * 60 * 60;
    const nonBotEmails = buildNonBotEmailSet(result);
    const scopeContributors = new Map();
    for (const [, stats] of result.fileStats) {
        const parts = stats.filepath.split('/');
        const scope = parts.length > 1 ? parts[0] : '(root)';
        if (!scopeContributors.has(scope)) {
            scopeContributors.set(scope, new Set());
        }
        const contributors = scopeContributors.get(scope);
        for (const email of stats.uniqueAuthors) {
            if (!nonBotEmails.has(email)) {
                continue;
            }
            contributors.add(email);
        }
    }
    const churn = [];
    for (const [scope, contributors] of scopeContributors) {
        if (contributors.size === 0) {
            continue;
        }
        let inactiveContributors = 0;
        for (const email of contributors) {
            const lastActive = result.lastActiveByAuthor.get(email);
            if (lastActive !== undefined &&
                now - lastActive > twelveMonths) {
                inactiveContributors++;
            }
        }
        const churnPercent = Number((inactiveContributors /
            contributors.size *
            100).toFixed(1));
        let level;
        if (churnPercent >= 50) {
            level = 'HIGH';
        }
        else if (churnPercent >= 25) {
            level = 'MEDIUM';
        }
        else {
            level = 'LOW';
        }
        churn.push({
            scope,
            contributors: contributors.size,
            inactiveContributors,
            churnPercent,
            level,
        });
    }
    return churn
        .filter((c) => (0, scopeFilter_1.isSourceScope)(c.scope))
        .sort((a, b) => b.churnPercent - a.churnPercent);
}
function buildAbandonedScopes(risks, churn) {
    const churnMap = new Map(churn.map((c) => [c.scope, c]));
    const results = [];
    for (const risk of risks) {
        if (!(0, scopeFilter_1.isSourceScope)(risk.scope)) {
            continue;
        }
        const scopeChurn = churnMap.get(risk.scope);
        if (!scopeChurn ||
            risk.lastActiveDays === undefined) {
            continue;
        }
        let severity;
        if (risk.concentration >= 50 &&
            risk.lastActiveDays > 365 &&
            scopeChurn.churnPercent >= 50) {
            severity = 'HIGH';
        }
        else if (risk.concentration >= 40 &&
            risk.lastActiveDays > 180 &&
            scopeChurn.churnPercent >= 25) {
            severity = 'MEDIUM';
        }
        else {
            severity = 'LOW';
        }
        if (severity === 'LOW') {
            continue;
        }
        results.push({
            scope: risk.scope,
            severity,
            ownerInactiveDays: risk.lastActiveDays,
            churnPercent: scopeChurn.churnPercent,
            concentration: risk.concentration,
            explanation: severity === 'HIGH'
                ? 'Owner inactive for over a year and contributor churn is high.'
                : 'Owner inactivity and contributor churn may indicate declining stewardship.',
        });
    }
    return results.sort((a, b) => {
        const order = {
            HIGH: 0,
            MEDIUM: 1,
            LOW: 2,
        };
        return order[a.severity] - order[b.severity];
    });
}
// A hotspot is an explainable AGGREGATION of signals already computed
// elsewhere — never a new opaque score. Each scope accumulates the
// independent signals that fired for it, every one carrying its own
// evidence string. Ranking is by how many signals fired (tie-broken by
// concentration), so the output stays fully auditable: the reader can
// always see WHY a scope surfaced, not just that it did.
function buildHotspots(inputs, options = {}) {
    const minSignals = options.minSignals ?? 2;
    const churnByScope = new Map(inputs.churn.map((c) => [c.scope, c]));
    const abandonedByScope = new Map(inputs.abandoned.map((a) => [a.scope, a]));
    const temporalByScope = new Map(inputs.temporal.map((t) => [t.scope, t]));
    const transitionsByScope = new Map();
    for (const t of inputs.transitions) {
        // Keep the highest-severity transition per scope as the representative
        const existing = transitionsByScope.get(t.scope);
        if (!existing || severityRank(t.severity) < severityRank(existing.severity)) {
            transitionsByScope.set(t.scope, t);
        }
    }
    const hotspots = [];
    for (const risk of inputs.scopeRisks) {
        if (!(0, scopeFilter_1.isSourceScope)(risk.scope)) {
            continue;
        }
        const signals = [];
        const signalNames = [];
        // Signal: bus factor of 1 (concentration of activity in one identity)
        if (risk.busFactor === 1) {
            signals.push({
                name: 'bus-factor',
                reason: `Bus factor is 1 (${risk.concentration}% of touches from one identity)`,
            });
            signalNames.push('bus-factor');
        }
        // Signal: contributor churn, but only where the scope is also
        // concentrated. In long-lived repos almost every folder has high
        // lifetime churn (most past contributors stop committing eventually),
        // so churn alone does not discriminate. Paired with a low bus factor
        // it points at a real continuity gap: the people who knew this area
        // have moved on and few hands remain.
        const churn = churnByScope.get(risk.scope);
        if (churn &&
            (churn.level === 'HIGH' || churn.level === 'MEDIUM') &&
            risk.busFactor <= 2) {
            signals.push({
                name: 'churn',
                reason: `Contributor churn ${churn.churnPercent}% with bus factor ${risk.busFactor} (${churn.inactiveContributors} of ${churn.contributors} inactive >12 months)`,
            });
            signalNames.push('churn');
        }
        // Signal: dominant contributor inactive (abandoned-scope evidence)
        const abandoned = abandonedByScope.get(risk.scope);
        if (abandoned) {
            signals.push({
                name: 'owner-inactive',
                reason: `Dominant contributor inactive ${abandoned.ownerInactiveDays} days [${abandoned.severity}]`,
            });
            signalNames.push('owner-inactive');
        }
        else if (risk.lastActiveDays !== undefined &&
            risk.lastActiveDays > 365) {
            signals.push({
                name: 'owner-inactive',
                reason: `Latest analyzed activity from the dominant contributor was ${risk.lastActiveDays} days ago`,
            });
            signalNames.push('owner-inactive');
        }
        // Signal: concentration rising recently
        const temporal = temporalByScope.get(risk.scope);
        if (temporal &&
            temporal.trend === 'rising' &&
            (temporal.category === 'Emerging concentration' ||
                temporal.category === 'Persistent concentration')) {
            const deltaLabel = temporal.delta !== null
                ? ` (${temporal.delta > 0 ? '+' : ''}${temporal.delta} pts vs lifetime)`
                : '';
            signals.push({
                name: 'rising-concentration',
                reason: `Concentration rising recently${deltaLabel}`,
            });
            signalNames.push('rising-concentration');
        }
        // Signal: an ownership transition occurred in this scope
        const transition = transitionsByScope.get(risk.scope);
        if (transition) {
            signals.push({
                name: 'ownership-transition',
                reason: `Ownership shifted ${transition.fromYear} → ${transition.toYear} [${transition.severity}]`,
            });
            signalNames.push('ownership-transition');
        }
        if (signals.length < minSignals) {
            continue;
        }
        hotspots.push({
            scope: risk.scope,
            signalsFired: signals.length,
            signals,
            concentration: risk.concentration,
            busFactor: risk.busFactor,
            explanation: {
                reasons: signals.map((s) => s.reason),
                summary: `${signals.length} independent maintenance-risk signals fired for this scope. These are starting points for investigation, not conclusions about ownership or maintainership.`,
            },
            recommendations: (0, recommendations_1.buildHotspotRecommendations)(signalNames),
        });
    }
    return hotspots.sort((a, b) => b.signalsFired - a.signalsFired ||
        b.concentration - a.concentration);
}
function severityRank(severity) {
    return severity === 'HIGH' ? 0 : severity === 'MEDIUM' ? 1 : 2;
}
//# sourceMappingURL=riskExplanation.js.map