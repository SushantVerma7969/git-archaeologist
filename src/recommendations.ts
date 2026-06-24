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
    title: 'Continuity risk',
    action:
      'Would development continue smoothly if the dominant contributor became unavailable?',
  });
}

  if (
    lastActive &&
    (lastActive.includes('year') || lastActive.includes('years'))
  ) {
    recommendations.push({
  title: 'Current reality',
  action:
    'Does historical concentration still reflect how this area is maintained today?',
});
  }

  if (level === 'HIGH') {
    recommendations.push({
  title: 'Shared understanding',
  action:
    'Is responsibility for this scope shared beyond what commit history can reveal?',
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
      title: 'Continuity risk',
      action:
        'Would development continue smoothly if key contributors became unavailable?',
    },
    {
      title: 'Shared understanding',
      action:
        'Is responsibility for this area shared beyond what commit history can reveal?',
    },
  ];

    case 'Historical concentration':
  return [
    {
      title: 'Current reality',
action:
  'Does historical concentration still reflect how this area is maintained today?',
    },
  ];

    case 'Emerging concentration':
  return [
    {
      title: 'Concentration trend',
action:
  'Is concentration increasing recently, or does this reflect a temporary burst of activity?',
    },
  ];

    case 'No recent activity':
  return [
    {
      title: 'Project status',
      action:
        'Is this area intentionally stable, dormant, or maintained through activity not visible in Git history?',
    },
  ];

    case 'Insufficient recent evidence':
  return [
    {
      title: 'Limited evidence',
      action:
        'Is there enough recent activity to support a meaningful interpretation of concentration patterns?',
    },
  ];

    default:
      return [];
  }
}

export function buildHotspotRecommendations(
  signalNames: string[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const has = (s: string) => signalNames.includes(s);

  if (has('bus-factor')) {
    recommendations.push({
      title: 'Continuity risk',
      action:
        'Would work in this area continue smoothly if the dominant contributor became unavailable?',
    });
  }

  if (has('churn')) {
    recommendations.push({
      title: 'Departing knowledge',
      action:
        'As contributors to this area became inactive, did their understanding transfer to anyone still active?',
    });
  }

  if (has('owner-inactive')) {
    recommendations.push({
      title: 'Current reality',
      action:
        'Does the historical concentration here still reflect how this area is maintained today?',
    });
  }

  if (has('rising-concentration')) {
    recommendations.push({
      title: 'Concentration trend',
      action:
        'Is responsibility narrowing toward fewer people recently, or is this a temporary burst of activity?',
    });
  }

  if (has('ownership-transition')) {
    recommendations.push({
      title: 'Handover quality',
      action:
        'When primary responsibility for this area shifted, was the transition deliberate and well understood?',
    });
  }

  return recommendations;
}
