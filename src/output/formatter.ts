import chalk from 'chalk';

export function formatPath(filepath: string, maxLen: number = 55): string {
  if (filepath.length <= maxLen) return filepath;
  const parts = filepath.split('/');
  if (parts.length <= 2) return '...' + filepath.slice(-(maxLen - 3));
  // Keep filename and one parent always visible
  const filename = parts[parts.length - 1];
  const parent = parts[parts.length - 2];
  const prefix = '.../' ;
  const short = `${prefix}${parent}/${filename}`;
  return short.length <= maxLen ? short : '...' + filename.slice(-(maxLen - 3));
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().split('T')[0];
}

export function formatScore(score: number): string {
  if (score >= 800) return chalk.red.bold(score.toFixed(1));
  if (score >= 400) return chalk.yellow.bold(score.toFixed(1));
  if (score >= 100) return chalk.cyan(score.toFixed(1));
  return chalk.green(score.toFixed(1));
}

export function formatBusFactor(n: number): string {
  if (n === 1) return chalk.red.bold('1 ⚠');
  if (n === 2) return chalk.yellow.bold('2 ⚡');
  return chalk.green.bold(String(n));
}

export function formatOwnershipPercent(pct: number): string {
  if (pct >= 90) return chalk.magenta.bold(`${pct}%`);
  if (pct >= 70) return chalk.cyan(`${pct}%`);
  return chalk.white(`${pct}%`);
}

export function formatCouplingScore(score: number): string {
  if (score >= 80) return chalk.red.bold(`${score}%`);
  if (score >= 50) return chalk.yellow.bold(`${score}%`);
  return chalk.cyan(`${score}%`);
}

export function sectionHeader(title: string): string {
  const line = '─'.repeat(70);
  return `\n${chalk.bold.hex('#A78BFA')(line)}\n ${chalk.bold.white(title)}\n${chalk.bold.hex('#A78BFA')(line)}`;
}

export function summaryBox(lines: string[]): string {
  const width = 70;
  const top    = chalk.hex('#A78BFA')('╭' + '─'.repeat(width - 2) + '╮');
  const bottom = chalk.hex('#A78BFA')('╰' + '─'.repeat(width - 2) + '╯');
  const mid = lines.map((l) => {
    const visible = l.replace(/\x1B\[[0-9;]*m/g, '');
    const pad = width - 2 - visible.length;
    return chalk.hex('#A78BFA')('│') + ' ' + l + ' '.repeat(Math.max(0, pad - 1)) + chalk.hex('#A78BFA')('│');
  });
  return [top, ...mid, bottom].join('\n');
}
