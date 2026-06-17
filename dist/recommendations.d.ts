export interface Recommendation {
    title: string;
    action: string;
}
export declare function buildRiskRecommendations(level: 'HIGH' | 'MEDIUM' | 'LOW', busFactor: number, lastActive?: string): Recommendation[];
export declare function buildTemporalRecommendations(category: 'Persistent concentration' | 'Historical concentration' | 'Emerging concentration' | 'Persistently distributed' | 'No recent activity' | 'Insufficient recent evidence'): Recommendation[];
//# sourceMappingURL=recommendations.d.ts.map