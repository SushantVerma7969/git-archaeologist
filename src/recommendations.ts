export interface Recommendation {
  title: string;
  action: string;
}

export function buildRiskRecommendations(
  level: 'HIGH' | 'MEDIUM' | 'LOW',
  busFactor: number,
  lastActive?: string
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (busFactor === 1) {
    recommendations.push({
      title: 'Increase knowledge sharing',
      action:
        'Ensure at least one additional contributor reviews and understands this scope.',
    });
  }

  if (
    lastActive &&
    (lastActive.includes('year') || lastActive.includes('years'))
  ) {
    recommendations.push({
      title: 'Verify active ownership',
      action:
        'Historical ownership may not reflect current maintainership. Confirm who currently owns this area.',
    });
  }

  if (level === 'HIGH') {
    recommendations.push({
      title: 'Require additional review',
      action:
        'Changes in this scope should receive review from multiple contributors.',
    });
  }

  return recommendations;
}
export function buildTemporalRecommendations(
  category:
    | 'Persistent concentration'
    | 'Historical concentration'
    | 'Emerging concentration'
    | 'Persistently distributed'
    | 'No recent activity'
    | 'Insufficient recent evidence'
): Recommendation[] {
  switch (category) {
    case 'Persistent concentration':
      return [
        {
          title: 'Schedule knowledge transfer',
          action:
            'Ownership remains concentrated over time. Share knowledge before this becomes a continuity risk.',
        },
        {
          title: 'Require secondary reviewer',
          action:
            'Ensure at least one additional contributor reviews changes in this area.',
        },
      ];

    case 'Historical concentration':
      return [
        {
          title: 'Verify current maintainer',
          action:
            'Historical ownership may no longer reflect active ownership.',
        },
      ];

    case 'Emerging concentration':
      return [
        {
          title: 'Broaden contributor involvement',
          action:
            'Recent work is becoming concentrated. Encourage additional contributors before dependency forms.',
        },
      ];

    case 'No recent activity':
      return [
        {
          title: 'Treat ownership as historical',
          action:
            'Recent activity is absent. Use ownership data cautiously.',
        },
      ];

    case 'Insufficient recent evidence':
      return [
        {
          title: 'Collect more activity data',
          action:
            'Recent activity is too limited to draw strong conclusions.',
        },
      ];

    default:
      return [];
  }
}
