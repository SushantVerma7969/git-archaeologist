import Table from 'cli-table3';
import chalk from 'chalk';
import { AnalysisResult } from '../types';
import {
  formatPath,
  formatDate,
  formatScore,
  formatBusFactor,
  formatOwnershipPercent,
  formatCouplingScore,
  sectionHeader,
  summaryBox,
} from './formatter';

export function renderReport(result: AnalysisResult): void {
  renderSummary(result);
  renderCursedFiles(result);
  renderBusFactor(result);
  renderOwnership(result);
  renderCoupling(result);
  renderFooter();
}

function renderSummary(r: AnalysisResult): void {
  console.log('\n');
  const from = formatDate(Math.floor(r.dateRange.from.getTime() / 1000));
  const to   = formatDate(Math.floor(r.dateRange.to.getTime()   / 1000));
  console.log(
    summaryBox([
      chalk.bold.white('⛏  Git Archaeologist — Repository Analysis'),
      '',
      `  ${chalk.hex('#A78BFA')('Repo')}          ${chalk.white(r.repoName)}`,
      `  ${chalk.hex('#A78BFA')('Path')}          ${chalk.white(r.repoPath)}`,
      `  ${chalk.hex('#A78BFA')('Analyzed at')}   ${chalk.white(r.analyzedAt.toLocaleString())}`,
      '',
      `  ${chalk.hex('#A78BFA')('Total commits')} ${chalk.yellow.bold(String(r.totalCommits))}`,
      `  ${chalk.hex('#A78BFA')('Total files')}   ${chalk.yellow.bold(String(r.totalFiles))}`,
      `  ${chalk.hex('#A78BFA')('Total authors')} ${chalk.yellow.bold(String(r.totalAuthors))}`,
      `  ${chalk.hex('#A78BFA')('Date range')}    ${chalk.white(from)} → ${chalk.white(to)}`,
    ])
  );
}

function renderCursedFiles(r: AnalysisResult): void {
  console.log(sectionHeader('💀  CURSED FILES  —  highest instability score'));

  const table = new Table({
    head: [
      chalk.bold('Rank'),
      chalk.bold('File'),
      chalk.bold('Score'),
      chalk.bold('Changes'),
      chalk.bold('Authors'),
      chalk.bold('Last touched'),
      chalk.bold('Why'),
    ],
    colWidths: [6, 42, 10, 9, 9, 14, 38],
    style: { head: [], border: ['grey'] },
    wordWrap: true,
  });

  r.cursedFiles.slice(0, 15).forEach((f, i) => {
    const stats = r.fileStats.get(f.filepath);
    const lastTouched = stats ? formatDate(stats.lastChanged) : 'unknown';
    table.push([
      chalk.grey(String(i + 1)),
      formatPath(f.filepath, 40),
      formatScore(f.curseScore),
      chalk.white(String(f.totalChanges)),
      chalk.white(String(f.uniqueAuthors)),
      chalk.grey(lastTouched),
      chalk.grey(f.reasons.join(', ')),
    ]);
  });

  console.log(table.toString());
}

function renderBusFactor(r: AnalysisResult): void {
  console.log(sectionHeader('🚌  BUS FACTOR  —  who leaving would hurt the most'));

  const table = new Table({
    head: [
      chalk.bold('Module'),
      chalk.bold('Bus Factor'),
      chalk.bold('Files'),
      chalk.bold('Key people'),
      chalk.bold('Risk'),
    ],
    colWidths: [22, 12, 8, 32, 44],
    style: { head: [], border: ['grey'] },
    wordWrap: true,
  });

  r.busFactor.forEach((b) => {
    table.push([
      chalk.cyan(b.scope),
      formatBusFactor(b.busFactor),
      chalk.white(String(b.filesAtRisk)),
      chalk.white(b.atRiskAuthors.slice(0, 3).join(', ')),
      b.warning,
    ]);
  });

  console.log(table.toString());
}

function renderOwnership(r: AnalysisResult): void {
  console.log(sectionHeader('👑  OWNERSHIP  —  who truly owns each file'));

  // Show only files with a dominant owner (>= 60%) — most interesting
  const dominated = r.ownership
    .filter((o) => o.ownershipPercent >= 60)
    .slice(0, 15);

  if (dominated.length === 0) {
    console.log(chalk.grey('  No files with dominant ownership found (all well-shared).'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('File'),
      chalk.bold('Owner'),
      chalk.bold('Ownership'),
      chalk.bold('Contributors'),
    ],
    colWidths: [42, 22, 12, 42],
    style: { head: [], border: ['grey'] },
    wordWrap: true,
  });

  dominated.forEach((o) => {
    const others = o.contributors
      .slice(1, 3)
      .map((c) => `${c.name} (${c.percent}%)`)
      .join(', ');
    table.push([
      formatPath(o.filepath, 40),
      chalk.white(o.owner),
      formatOwnershipPercent(o.ownershipPercent),
      chalk.grey(others || '—'),
    ]);
  });

  console.log(table.toString());
}

function renderCoupling(r: AnalysisResult): void {
  console.log(sectionHeader('🔗  IMPLICIT COUPLING  —  files that always change together'));

  if (r.coupling.length === 0) {
    console.log(chalk.grey('  No significant file coupling detected.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('File A'),
      chalk.bold('File B'),
      chalk.bold('Co-changes'),
      chalk.bold('Coupling'),
    ],
    colWidths: [38, 38, 12, 12],
    style: { head: [], border: ['grey'] },
    wordWrap: true,
  });

  r.coupling.slice(0, 12).forEach((c) => {
    table.push([
      formatPath(c.fileA, 36),
      formatPath(c.fileB, 36),
      chalk.white(String(c.coChanges)),
      formatCouplingScore(c.couplingScore),
    ]);
  });

  console.log(table.toString());
}

function renderFooter(): void {
  console.log('\n' + chalk.hex('#A78BFA')('─'.repeat(70)));
  console.log(
    chalk.grey('  ⛏  Git Archaeologist  |  github.com/SushantVerma7969/git-archaeologist')
  );
  console.log(chalk.hex('#A78BFA')('─'.repeat(70)) + '\n');
}
