const BOT_EMAILS = ['noreply', '[bot]', 'github-actions'];
const BOT_NAMES = [
  'angular robot',
  'renovate bot',
  'renovate',
  'dependabot',
  'github-actions',
  'github actions',
  'semantic-release-bot',
  'allcontributors',
];

export function isBot(name: string, email: string): boolean {
  const n = name.toLowerCase();
  const e = email.toLowerCase();
  if (BOT_EMAILS.some((s) => e.includes(s))) return true;
  if (BOT_NAMES.some((s) => n.includes(s))) return true;
  return false;
}
