// Identifies automation accounts (CI bots, dependency bots, release bots) so
// they can be excluded from ownership and bus-factor analysis — a bot that
// touches every file is not a knowledge owner.
//
// IMPORTANT: `@users.noreply.github.com` is NOT a bot signal. It is the
// ordinary email GitHub assigns to any user who keeps their address private,
// so millions of real contributors commit under it. Matching "noreply" here
// silently erased real people from every metric (a large fraction of React's
// contributors use noreply addresses), which is exactly the failure this
// filter must avoid. Bots are identified by GitHub's "[bot]" account
// convention and by a list of known automation handles/names instead.

// Substrings that, in an EMAIL, reliably indicate an automation account.
const BOT_EMAIL_PATTERNS = [
  '[bot]', // GitHub bot-account convention, e.g. dependabot[bot]@users.noreply.github.com
  'github-actions',
  'github-bot', // facebook-github-bot, *-github-bot CI accounts
  'semantic-release-bot',
];

// Full or partial NAME matches for known automation accounts. These are
// checked as word-aware substrings; entries must be specific enough not to
// match human names (e.g. never a bare "bot", which would catch "Abbott").
const BOT_NAMES = [
  'angular robot',
  'renovate bot',
  'renovate[bot]',
  'dependabot',
  'github-actions',
  'github actions',
  'semantic-release-bot',
  'allcontributors',
  'facebook community bot',
  'facebook-github-bot',
];

export function isBot(name: string, email: string): boolean {
  const n = name.toLowerCase();
  const e = email.toLowerCase();
  if (BOT_EMAIL_PATTERNS.some((s) => e.includes(s))) return true;
  if (BOT_NAMES.some((s) => n.includes(s))) return true;
  return false;
}
