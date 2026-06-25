// Convert a compact relative window (e.g. "12m", "90d", "2y") into a concrete
// ISO date (YYYY-MM-DD) that git's --since understands unambiguously. The
// `Nm`/`Nd`/`Ny` shorthand is this tool's own convention, NOT git approxidate
// (git reads a bare "12m" as minutes, not months), so it must be resolved to a
// date before being handed to git. A value that isn't the shorthand is returned
// unchanged so explicit dates ("2024-01-01") pass straight through.
//
// This mirrors the CLI's parseSince exactly so the MCP server's recent-window
// analysis matches `git-arch risk --hotspots`/`--temporal` instead of silently
// using a different (minutes-based) window.
export function parseSince(input: string): string {
  const match = input.match(/^(\d+)\s*(d|day|days|m|month|months|y|year|years)$/i);
  if (match) {
    const n = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const date = new Date();
    if (unit.startsWith('d')) date.setDate(date.getDate() - n);
    else if (unit.startsWith('m')) date.setMonth(date.getMonth() - n);
    else if (unit.startsWith('y')) date.setFullYear(date.getFullYear() - n);
    return date.toISOString().split('T')[0];
  }
  return input;
}
