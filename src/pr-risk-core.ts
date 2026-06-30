import { CommitRecord, CursedFile, BusFactor } from './types';

// Minimum prior commits a file needs before its co-change (blast) signal is
// trustworthy. A brand-new file added alongside N other new files co-changes
// with all of them 100% of the time — an artifact of being born together, not
// a real dependency. Below this floor we suppress the blast signal entirely.
export const MIN_COMMITS_FOR_BLAST = 3;

export interface PrFileRisk {
  file: string;
  risk: number; // 0..100, this file alone
  reasons: string[];
}

export interface PrRiskReport {
  // Headline = the WORST file, not the mean. A single dangerous file in a
  // large PR must not be averaged away by trivial files.
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  changedFiles: number;
  highRiskFiles: PrFileRisk[];
  safeFiles: string[];
}

export interface ScorePrRiskInput {
  changedFiles: string[];
  commits: CommitRecord[];
  cursedFiles: CursedFile[];
  busFactor: BusFactor[];
}

function levelFor(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  return score >= 75 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
}

export function scorePrRisk(input: ScorePrRiskInput): PrRiskReport {
  const { changedFiles, commits, cursedFiles, busFactor } = input;
  const cursedMap = new Map(cursedFiles.map((f) => [f.filepath, f]));
  const busFactor1 = busFactor.filter((b) => b.busFactor === 1);

  const fileRisks: PrFileRisk[] = [];
  const safeFiles: string[] = [];

  for (const file of changedFiles) {
    let fileRisk = 0;
    const reasons: string[] = [];

    const cursed = cursedMap.get(file);
    if (cursed) {
      const contribution = Math.min(40, Math.round(cursed.curseScore / 20));
      fileRisk += contribution;
      reasons.push(
        `curse score ${cursed.curseScore.toFixed(0)} (${cursed.uniqueAuthors} authors, ${cursed.totalChanges} changes)`,
      );
    }

    for (const bf of busFactor1) {
      const isInScope =
        bf.scope === '(root)' ? !file.includes('/') : file.startsWith(bf.scope + '/');
      if (isInScope) {
        fileRisk += 25;
        reasons.push(
          `in bus factor 1 module "${bf.scope}" — owned by ${bf.atRiskAuthors[0]}`,
        );
        break;
      }
    }

    const fileCommits = commits.filter((c) => c.filesChanged.includes(file));
    if (fileCommits.length >= MIN_COMMITS_FOR_BLAST) {
      const coChanges = new Map<string, number>();
      for (const commit of fileCommits) {
        for (const f of commit.filesChanged) {
          if (f === file) continue;
          coChanges.set(f, (coChanges.get(f) ?? 0) + 1);
        }
      }
      const topCoupled = Array.from(coChanges.entries())
        .map(([f, count]) => ({
          f,
          pct: Math.round((count / fileCommits.length) * 100),
        }))
        .filter((x) => x.pct >= 20)
        .sort((a, b) => b.pct - a.pct);

      const blastRadius = topCoupled.length;
      const top3 = topCoupled.slice(0, 3);

      if (blastRadius > 10) {
        fileRisk += 20;
        reasons.push(
          `blast radius ${blastRadius} files — also check: ${top3.map((x) => `${x.f} (${x.pct}%)`).join(', ')}`,
        );
      } else if (blastRadius > 5) {
        fileRisk += 10;
        reasons.push(
          `blast radius ${blastRadius} files — also check: ${top3.map((x) => `${x.f} (${x.pct}%)`).join(', ')}`,
        );
      } else if (top3.length > 0) {
        reasons.push(
          `historically changes with: ${top3.map((x) => `${x.f} (${x.pct}%)`).join(', ')}`,
        );
      }
    }

    if (fileRisk > 0) {
      fileRisks.push({ file, risk: Math.min(100, fileRisk), reasons });
    } else {
      safeFiles.push(file);
    }
  }

  fileRisks.sort((a, b) => b.risk - a.risk);

  const score = fileRisks.length > 0 ? fileRisks[0].risk : 0;

  return {
    score,
    level: levelFor(score),
    changedFiles: changedFiles.length,
    highRiskFiles: fileRisks,
    safeFiles,
  };
}
