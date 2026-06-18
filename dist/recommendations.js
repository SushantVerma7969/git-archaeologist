"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRiskRecommendations = buildRiskRecommendations;
exports.buildTemporalRecommendations = buildTemporalRecommendations;
function buildRiskRecommendations(level, busFactor, lastActive) {
    const recommendations = [];
    if (busFactor === 1) {
        recommendations.push({
            title: 'Continuity risk',
            action: 'Would development continue smoothly if the dominant contributor became unavailable?',
        });
    }
    if (lastActive &&
        (lastActive.includes('year') || lastActive.includes('years'))) {
        recommendations.push({
            title: 'Current reality',
            action: 'Does historical concentration still reflect how this area is maintained today?',
        });
    }
    if (level === 'HIGH') {
        recommendations.push({
            title: 'Shared understanding',
            action: 'Is responsibility for this scope shared beyond what commit history can reveal?',
        });
    }
    return recommendations;
}
function buildTemporalRecommendations(category) {
    switch (category) {
        case 'Persistent concentration':
            return [
                {
                    title: 'Continuity risk',
                    action: 'Would development continue smoothly if key contributors became unavailable?',
                },
                {
                    title: 'Shared understanding',
                    action: 'Is responsibility for this area shared beyond what commit history can reveal?',
                },
            ];
        case 'Historical concentration':
            return [
                {
                    title: 'Current reality',
                    action: 'Does historical concentration still reflect how this area is maintained today?',
                },
            ];
        case 'Emerging concentration':
            return [
                {
                    title: 'Concentration trend',
                    action: 'Is concentration increasing recently, or does this reflect a temporary burst of activity?',
                },
            ];
        case 'No recent activity':
            return [
                {
                    title: 'Project status',
                    action: 'Is this area intentionally stable, dormant, or maintained through activity not visible in Git history?',
                },
            ];
        case 'Insufficient recent evidence':
            return [
                {
                    title: 'Limited evidence',
                    action: 'Is there enough recent activity to support a meaningful interpretation of concentration patterns?',
                },
            ];
        default:
            return [];
    }
}
//# sourceMappingURL=recommendations.js.map