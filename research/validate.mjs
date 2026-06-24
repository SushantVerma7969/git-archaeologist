#!/usr/bin/env node
// Curse-score validation study.
//
// QUESTION: do high curse scores predict which files get bug-fixes later?
// And critically: does the curse score BEAT a dumb raw-change-count baseline?
// If it doesn't beat the baseline, the four multipliers are decoration.
//
// METHOD (lightweight SZZ approximation):
//   1. Pick a cutoff date splitting history into TRAIN (before) and TEST (after).
//   2. Compute curse scores using ONLY train commits (the tool's real formula).
//   3. In the test window, label each file by whether it received >=1 bug-fix
//      commit (message matches fix/bug/closes-issue heuristics).
//   4. Rank files by (a) curse score and (b) raw change count.
//   5. Measure precision@K, recall@K, and which ranking better concentrates
//      the future bug-fixes near the top.
//
// HONESTY GUARDS:
//   - Scores are computed train-only; test labels are never seen by the scorer.
//   - The baseline (raw totalChanges) is the thing to beat. Reporting curse
//     score "correlates with bugs" alone is meaningless; everything correlates
//     with bugs. The decision metric is curse-vs-baseline lift.

import { execFileSync } from 'node:child_process';
import { buildFileStats } from '../dist/core/gitParser.js';
import { scoreCursedFiles } from '../dist/analyzers/curseScorer.js';

const repo = process.argv[2];
const cutoffArg = process.argv[3]; // ISO date, e.g. 2023-01-01
if (!repo || !cutoffArg) {
  console.error('usage: validate.mjs <repoPath> <cutoffISODate>');
  process.exit(1);
}
const cutoff = Math.floor(new Date(cutoffArg).getTime() / 1000);

// --- parse commits ourselves with a time window + bug-fix labeling, since the
// tool's parseCommits has no `until` and doesn't read commit messages. We mirror
// the tool's path-exclude rules so the file universe matches what it scores.
function parseWindow(repoPath, sinceTs, untilTs) {
  const D = '||GA||';
  const BEGIN = 'B' + D;
  const args = [
    'log',
    `--pretty=format:${BEGIN}%H${D}%ae${D}%an${D}%at${D}%s`,
    '--name-only',
    '-z',
  ];
  if (sinceTs) args.push(`--since=${new Date(sinceTs * 1000).toISOString()}`);
  if (untilTs) args.push(`--until=${new Date(untilTs * 1000).toISOString()}`);
  const raw = execFileSync('git', args, {
    cwd: repoPath,
    stdio: 'pipe',
    maxBuffer: 1024 * 1024 * 1024,
  }).toString();

  const commits = [];
  for (const block of raw.split(BEGIN).filter((b) => b.length)) {
    const nl = block.indexOf('\n');
    const header = (nl === -1 ? block : block.slice(0, nl)).trim();
    const filesRaw = nl === -1 ? '' : block.slice(nl + 1);
    const parts = header.split(D);
    if (parts.length < 5) continue;
    const [hash, email, name, tsRaw, subject] = parts;
    const ts = parseInt(tsRaw, 10);
    if (isNaN(ts)) continue;
    const files = filesRaw
      .split('\0')
      .map((f) => f.trim())
      .filter(Boolean)
      .filter(
        (f) =>
          !f.startsWith('node_modules/') &&
          !f.startsWith('.git/') &&
          !f.startsWith('dist/') &&
          !f.startsWith('build/') &&
          !f.startsWith('coverage/') &&
          !f.endsWith('.map') &&
          !f.endsWith('.d.ts'),
      );
    commits.push({ hash, authorEmail: email, authorName: name, timestamp: ts, filesChanged: files, subject });
  }
  return commits;
}

// Bug-fix heuristic. Conservative: must look like an actual fix, not a feature.
const FIX_RE = /\b(fix(es|ed)?|bugfix|hotfix|regression)\b|closes?\s+#\d+/i;
const FEATURE_RE = /\b(feat|feature|implement)\b/i;
const NONCODE_RE = /\b(docs?|typo|readme|changelog|comment|whitespace|lint|format|chore|ci|test|spelling)\b/i;
function isBugFix(subject) {
  if (!subject) return false;
  if (NONCODE_RE.test(subject)) return false;       // exclude docs/typo/chore/test fixes
  if (FEATURE_RE.test(subject)) return false;        // exclude features
  return FIX_RE.test(subject);
}

// ---- TRAIN: compute curse scores using only pre-cutoff history ----
const trainCommits = parseWindow(repo, null, cutoff);
const trainStats = buildFileStats(trainCommits);
// score ALL files (topN huge) so we have a full ranking, not just top 20
const cursed = scoreCursedFiles(trainStats, 10 ** 9);

// raw-change-count baseline over the same train window
const rawChanges = new Map();
for (const [fp, s] of trainStats) rawChanges.set(fp, s.totalChanges);

// ---- TEST: which files actually got bug-fixes after the cutoff ----
const testCommits = parseWindow(repo, cutoff, null);
const buggyFiles = new Set();
let testBugCommits = 0;
for (const c of testCommits) {
  if (!isBugFix(c.subject)) continue;
  testBugCommits++;
  for (const f of c.filesChanged) buggyFiles.add(f);
}

// only evaluate over files that existed in train (the scorer's universe)
const universe = [...trainStats.keys()];
const buggyInUniverse = universe.filter((f) => buggyFiles.has(f));
const baseRate = buggyInUniverse.length / universe.length;

function precisionRecallAtK(rankedFiles, K) {
  const top = rankedFiles.slice(0, K);
  const hits = top.filter((f) => buggyFiles.has(f)).length;
  const precision = hits / K;
  const recall = hits / buggyInUniverse.length;
  const lift = precision / baseRate; // how many x better than random
  return { hits, precision, recall, lift };
}

const curseRanked = cursed.map((c) => c.filepath); // already sorted desc by score
const rawRanked = [...rawChanges.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);

// ---- Spearman-ish rank overlap between the two rankings (audit's claim:
// curse is ~80% a change-count sort). Jaccard of their top-K tells us how
// much the multipliers actually move things.
function topKJaccard(a, b, K) {
  const sa = new Set(a.slice(0, K));
  const sb = new Set(b.slice(0, K));
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}

console.log('='.repeat(70));
console.log(`REPO: ${repo.split('/').pop()}   cutoff: ${cutoffArg}`);
console.log('='.repeat(70));
console.log(`train commits (pre-cutoff):  ${trainCommits.length}`);
console.log(`test commits (post-cutoff):  ${testCommits.length}`);
console.log(`  of which bug-fixes:        ${testBugCommits}`);
console.log(`files in scorer universe:    ${universe.length}`);
console.log(`files that got a bug-fix:    ${buggyInUniverse.length}`);
console.log(`base rate (random pick):     ${(baseRate * 100).toFixed(1)}%`);
console.log('');
console.log('PRECISION@K / LIFT vs random  (lift = how many x better than chance)');
console.log('  K |  curse P@K  curse lift |  raw P@K  raw lift |  curse beats raw?');
console.log('  ' + '-'.repeat(64));
for (const K of [10, 20, 50, 100]) {
  if (K > universe.length) continue;
  const c = precisionRecallAtK(curseRanked, K);
  const r = precisionRecallAtK(rawRanked, K);
  const winner = c.precision > r.precision ? 'CURSE ✓' : c.precision < r.precision ? 'raw' : 'tie';
  console.log(
    `  ${String(K).padStart(3)} |` +
      `   ${(c.precision * 100).toFixed(0).padStart(3)}%     ${c.lift.toFixed(2)}x  |` +
      `   ${(r.precision * 100).toFixed(0).padStart(3)}%    ${r.lift.toFixed(2)}x |` +
      `   ${winner}`,
  );
}
console.log('');
console.log('RANKING OVERLAP (audit claim: curse ≈ raw-change-count sort)');
for (const K of [10, 20, 50]) {
  if (K > universe.length) continue;
  console.log(`  top-${K} Jaccard(curse, raw): ${(topKJaccard(curseRanked, rawRanked, K) * 100).toFixed(0)}%`);
}
console.log('');
console.log('VERDICT INPUTS:');
const c50 = precisionRecallAtK(curseRanked, Math.min(50, universe.length));
const r50 = precisionRecallAtK(rawRanked, Math.min(50, universe.length));
console.log(`  curse lift@50: ${c50.lift.toFixed(2)}x   raw lift@50: ${r50.lift.toFixed(2)}x`);
console.log(`  curse advantage over baseline: ${((c50.lift / r50.lift - 1) * 100).toFixed(0)}%`);

// ---- VALIDITY GUARD (added in hardening pass) ----
// A K=50 verdict is only meaningful when the file universe is large enough that
// "top 50" is a genuine selection, not most of the repo. Below 3*K files,
// precision@50 collapses toward the base rate for both rankings and the
// comparison is uninformative. Also require a minimum bug-fix sample.
const GUARD_MIN_UNIVERSE = 150; // 3 * K(50)
const GUARD_MIN_SAMPLE = 5;
console.log('');
console.log('VALIDITY GUARD:');
const guardFails = [];
if (universe.length < GUARD_MIN_UNIVERSE)
  guardFails.push(`universe ${universe.length} < ${GUARD_MIN_UNIVERSE} (top-50 = ${(5000 / universe.length).toFixed(0)}% of repo)`);
if (buggyInUniverse.length < GUARD_MIN_SAMPLE || testBugCommits < GUARD_MIN_SAMPLE)
  guardFails.push(`sample too small (buggy=${buggyInUniverse.length}, fixCommits=${testBugCommits})`);
if (guardFails.length) {
  console.log(`  INCONCLUSIVE — ${guardFails.join('; ')}`);
  console.log('  (verdict above is NOT counted; sample/universe insufficient)');
} else {
  const robust = buggyInUniverse.length >= 20 && testBugCommits >= 20;
  console.log(`  VALID verdict — tier: ${robust ? 'ROBUST (headline-eligible)' : 'FRAGILE (reported, not headlined)'}`);
}
