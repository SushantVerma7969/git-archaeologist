import * as fs from 'fs';
import * as path from 'path';
import { isBot } from './botFilter';

// Identity canonicalization merges the multiple git identities a single
// person commits under — joe@fb.com, joe@meta.com, and the GitHub noreply
// form 6425824+josephsavona@users.noreply.github.com are one person. Without
// this, that person reads as three contributors, which inflates bus factor
// and deflates ownership concentration: a true single-point-of-failure can
// hide as a "healthy spread".
//
// The default is deliberately CONSERVATIVE. A false split (two rows for one
// person) is visible and recoverable; a false merge silently corrupts every
// downstream metric — and the tool's headline signal is bus-factor-1
// detection, which a bad merge would distort. So we only merge on strong,
// unambiguous signals and never on a shared common name alone. Anything the
// heuristic gets wrong can be corrected with a .git-arch-identities file.

export interface IdentityInput {
  email: string;
  name: string;
}

export interface IdentityMerge {
  canonical: string; // canonical email
  name: string; // display name for the merged identity
  members: string[]; // all raw emails merged into this identity
}

export interface IdentityResult {
  // raw lowercased email -> canonical lowercased email
  emailToCanonical: Map<string, string>;
  // canonical email -> the merge it represents (only multi-member merges)
  merges: IdentityMerge[];
}

interface RawIdentity {
  email: string; // lowercased
  name: string; // original-case display name
  nameKey: string; // lowercased, trimmed name
  count: number; // how many commits, for picking the canonical representative
}

// GitHub noreply form: "6425824+josephsavona@users.noreply.github.com"
// or the older "josephsavona@users.noreply.github.com". The local-part
// (after any leading "id+") identifies the GitHub username.
function githubHandle(email: string): string | null {
  const m = email.match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/);
  return m ? m[1].toLowerCase() : null;
}

function emailLocalPart(email: string): string {
  const at = email.indexOf('@');
  return (at === -1 ? email : email.slice(0, at)).toLowerCase();
}

// ---- union-find ----
class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    let root = x;
    while (this.parent.get(root) !== undefined && this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // path compression
    let cur = x;
    while (this.parent.get(cur) !== undefined && this.parent.get(cur) !== cur) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return this.parent.has(x) ? root : x;
  }

  union(a: string, b: string): void {
    if (!this.parent.has(a)) this.parent.set(a, a);
    if (!this.parent.has(b)) this.parent.set(b, b);
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }

  add(x: string): void {
    if (!this.parent.has(x)) this.parent.set(x, x);
  }
}

export interface BuildIdentityOptions {
  // explicit overrides: each group of emails is forced to one identity
  mergeGroups?: string[][];
  // emails forced to stay separate from everything else
  splitEmails?: string[];
}

export function buildIdentityMap(
  identities: IdentityInput[],
  options: BuildIdentityOptions = {},
): IdentityResult {
  // Collapse raw identities to unique (email) records, keeping the most
  // common display name and a commit count.
  const byEmail = new Map<string, RawIdentity>();
  for (const id of identities) {
    const email = id.email.trim().toLowerCase();
    if (!email) continue;
    const existing = byEmail.get(email);
    if (existing) {
      existing.count += 1;
      // keep the longer name as the more complete display form
      if (id.name.trim().length > existing.name.length) {
        existing.name = id.name.trim();
        existing.nameKey = id.name.trim().toLowerCase();
      }
    } else {
      byEmail.set(email, {
        email,
        name: id.name.trim(),
        nameKey: id.name.trim().toLowerCase(),
        count: 1,
      });
    }
  }

  const uf = new UnionFind();
  for (const email of byEmail.keys()) uf.add(email);

  const splitSet = new Set(
    (options.splitEmails ?? []).map((e) => e.trim().toLowerCase()),
  );

  // --- Rule 1: GitHub noreply handle links to a real email with the same
  // local-part or the same name. This is the strongest real-world case
  // (the React data is full of it) and is unambiguous.
  const handleToEmails = new Map<string, string[]>();
  for (const { email } of byEmail.values()) {
    const handle = githubHandle(email);
    if (handle) {
      const arr = handleToEmails.get(handle) ?? [];
      arr.push(email);
      handleToEmails.set(handle, arr);
    }
  }
  for (const [handle, noreplyEmails] of handleToEmails) {
    // all noreply emails sharing a handle are the same GitHub user
    for (let i = 1; i < noreplyEmails.length; i++) {
      if (!splitSet.has(noreplyEmails[i]) && !splitSet.has(noreplyEmails[0])) {
        uf.union(noreplyEmails[0], noreplyEmails[i]);
      }
    }
    // link the handle to any non-noreply email whose local-part matches the
    // handle (e.g. josephsavona@users.noreply ↔ josephsavona@gmail.com)
    if (splitSet.has(noreplyEmails[0])) continue;
    for (const other of byEmail.values()) {
      if (githubHandle(other.email)) continue;
      if (splitSet.has(other.email)) continue;
      if (emailLocalPart(other.email) === handle) {
        uf.union(noreplyEmails[0], other.email);
      }
    }
  }

  // --- Rule 2: same non-generic display name + same email local-part.
  // Catches joe@fb.com ↔ joe@meta.com (same person, company changed) without
  // merging unrelated people: BOTH the name and the local-part must match,
  // and the name must not be generic. We never merge on name alone.
  const GENERIC_NAMES = new Set([
    'github',
    'github action',
    'github actions',
    'unknown',
    'dev',
    'developer',
    'admin',
    'root',
    'user',
    'ci',
    'build',
    'release',
    'bot',
    'none',
    'n/a',
  ]);
  const records = Array.from(byEmail.values());
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i];
      const b = records[j];
      if (splitSet.has(a.email) || splitSet.has(b.email)) continue;
      if (!a.nameKey || a.nameKey.length < 3) continue;
      if (GENERIC_NAMES.has(a.nameKey)) continue;
      if (isBot(a.name, a.email) || isBot(b.name, b.email)) continue;
      // Same person only when the display name AND the email local-part agree.
      if (
        a.nameKey === b.nameKey &&
        emailLocalPart(a.email) === emailLocalPart(b.email)
      ) {
        uf.union(a.email, b.email);
      }
    }
  }

  // --- explicit override merges (always win, even over splits) ---
  for (const group of options.mergeGroups ?? []) {
    const emails = group.map((e) => e.trim().toLowerCase()).filter(Boolean);
    for (let i = 1; i < emails.length; i++) {
      uf.add(emails[0]);
      uf.add(emails[i]);
      uf.union(emails[0], emails[i]);
    }
  }

  // --- build the canonical map: each cluster's representative is the email
  // with the most commits (most established identity) ---
  const clusters = new Map<string, string[]>();
  for (const email of byEmail.keys()) {
    const root = uf.find(email);
    const arr = clusters.get(root) ?? [];
    arr.push(email);
    clusters.set(root, arr);
  }

  const emailToCanonical = new Map<string, string>();
  const merges: IdentityMerge[] = [];

  for (const members of clusters.values()) {
    // pick representative: highest commit count, then alphabetical for stability
    const rep = members
      .map((e) => byEmail.get(e)!)
      .sort((a, b) => b.count - a.count || a.email.localeCompare(b.email))[0];

    for (const e of members) emailToCanonical.set(e, rep.email);

    if (members.length > 1) {
      merges.push({
        canonical: rep.email,
        name: rep.name || rep.email,
        members: members.slice().sort(),
      });
    }
  }

  merges.sort(
    (a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name),
  );

  return { emailToCanonical, merges };
}

// Load a .git-arch-identities override file from the repo root, if present.
// Format (simple, line-based):
//   merge: a@x.com, b@y.com, c@z.com
//   split: shared-ci@x.com
// Lines starting with # are comments.
export function loadIdentityOverrides(repoPath: string): BuildIdentityOptions {
  const file = path.join(repoPath, '.git-arch-identities');
  const options: BuildIdentityOptions = { mergeGroups: [], splitEmails: [] };
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return options; // no override file is the common case
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const kind = trimmed.slice(0, colon).trim().toLowerCase();
    const rest = trimmed.slice(colon + 1);
    const emails = rest
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (kind === 'merge' && emails.length >= 2) {
      options.mergeGroups!.push(emails);
    } else if (kind === 'split') {
      options.splitEmails!.push(...emails);
    }
  }
  return options;
}
