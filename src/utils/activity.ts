import { CommitRecord } from '../types';

/**
 * Build a map of email -> most recent commit timestamp (unix seconds),
 * across the full commit history regardless of `--since` filtering.
 */
export function buildLastActiveMap(commits: CommitRecord[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of commits) {
    const existing = map.get(c.authorEmail);
    if (!existing || c.timestamp > existing) {
      map.set(c.authorEmail, c.timestamp);
    }
  }
  return map;
}

/**
 * Format a unix timestamp as a human-readable "X ago" string.
 */
export function formatTimeAgo(timestamp: number, now: number = Date.now() / 1000): string {
  const diffSeconds = now - timestamp;
  const days = Math.floor(diffSeconds / 86400);

  if (days < 1) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 24) return `${months} months ago`;

  const years = Math.floor(months / 12);
  if (years === 1) return '1 year ago';
  return `${years} years ago`;
}
