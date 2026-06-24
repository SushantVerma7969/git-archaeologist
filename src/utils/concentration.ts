export function calculateConcentration(authorTotals: Map<string, number>): number | null {
  const total = Array.from(authorTotals.values()).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return null;
  }

  const sorted = Array.from(authorTotals.entries()).sort((a, b) => b[1] - a[1]);

  const topShare = sorted[0][1] / total;

  return Math.round(topShare * 1000) / 10;
}
