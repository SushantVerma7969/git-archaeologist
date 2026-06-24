import { AnalysisResult, RiskLevel } from '../types';

export function isConcentrated(level: RiskLevel): boolean {
  return level === 'HIGH' || level === 'MEDIUM';
}

export function buildNonBotEmailSet(result: AnalysisResult): Set<string> {
  const emails = new Set<string>();
  for (const o of result.ownership) {
    for (const c of o.contributors) {
      emails.add(c.email);
    }
  }
  return emails;
}

export function severityRank(severity: 'LOW' | 'MEDIUM' | 'HIGH'): number {
  return severity === 'HIGH' ? 0 : severity === 'MEDIUM' ? 1 : 2;
}
