"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIdentityMap = buildIdentityMap;
exports.loadIdentityOverrides = loadIdentityOverrides;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const botFilter_1 = require("./botFilter");
// GitHub noreply form: "6425824+josephsavona@users.noreply.github.com"
// or the older "josephsavona@users.noreply.github.com". The local-part
// (after any leading "id+") identifies the GitHub username.
function githubHandle(email) {
    const m = email.match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/);
    return m ? m[1].toLowerCase() : null;
}
function emailLocalPart(email) {
    const at = email.indexOf('@');
    return (at === -1 ? email : email.slice(0, at)).toLowerCase();
}
// ---- union-find ----
class UnionFind {
    parent = new Map();
    find(x) {
        let root = x;
        while (this.parent.get(root) !== undefined && this.parent.get(root) !== root) {
            root = this.parent.get(root);
        }
        // path compression
        let cur = x;
        while (this.parent.get(cur) !== undefined && this.parent.get(cur) !== cur) {
            const next = this.parent.get(cur);
            this.parent.set(cur, root);
            cur = next;
        }
        return this.parent.has(x) ? root : x;
    }
    union(a, b) {
        if (!this.parent.has(a))
            this.parent.set(a, a);
        if (!this.parent.has(b))
            this.parent.set(b, b);
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra !== rb)
            this.parent.set(ra, rb);
    }
    add(x) {
        if (!this.parent.has(x))
            this.parent.set(x, x);
    }
}
function buildIdentityMap(identities, options = {}) {
    // Collapse raw identities to unique (email) records, keeping the most
    // common display name and a commit count.
    const byEmail = new Map();
    for (const id of identities) {
        const email = id.email.trim().toLowerCase();
        if (!email)
            continue;
        const existing = byEmail.get(email);
        if (existing) {
            existing.count += 1;
            // keep the longer name as the more complete display form
            if (id.name.trim().length > existing.name.length) {
                existing.name = id.name.trim();
                existing.nameKey = id.name.trim().toLowerCase();
            }
        }
        else {
            byEmail.set(email, {
                email,
                name: id.name.trim(),
                nameKey: id.name.trim().toLowerCase(),
                count: 1,
            });
        }
    }
    const uf = new UnionFind();
    for (const email of byEmail.keys())
        uf.add(email);
    const splitSet = new Set((options.splitEmails ?? []).map((e) => e.trim().toLowerCase()));
    // --- Rule 1: GitHub noreply handle links to a real email with the same
    // local-part or the same name. This is the strongest real-world case
    // (the React data is full of it) and is unambiguous.
    const handleToEmails = new Map();
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
        if (splitSet.has(noreplyEmails[0]))
            continue;
        for (const other of byEmail.values()) {
            if (githubHandle(other.email))
                continue;
            if (splitSet.has(other.email))
                continue;
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
        'github', 'github action', 'github actions', 'unknown', 'dev', 'developer',
        'admin', 'root', 'user', 'ci', 'build', 'release', 'bot', 'none', 'n/a',
    ]);
    const records = Array.from(byEmail.values());
    for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
            const a = records[i];
            const b = records[j];
            if (splitSet.has(a.email) || splitSet.has(b.email))
                continue;
            if (!a.nameKey || a.nameKey.length < 3)
                continue;
            if (GENERIC_NAMES.has(a.nameKey))
                continue;
            if ((0, botFilter_1.isBot)(a.name, a.email) || (0, botFilter_1.isBot)(b.name, b.email))
                continue;
            // Same person only when the display name AND the email local-part agree.
            if (a.nameKey === b.nameKey && emailLocalPart(a.email) === emailLocalPart(b.email)) {
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
    const clusters = new Map();
    for (const email of byEmail.keys()) {
        const root = uf.find(email);
        const arr = clusters.get(root) ?? [];
        arr.push(email);
        clusters.set(root, arr);
    }
    const emailToCanonical = new Map();
    const merges = [];
    for (const members of clusters.values()) {
        // pick representative: highest commit count, then alphabetical for stability
        const rep = members
            .map((e) => byEmail.get(e))
            .sort((a, b) => b.count - a.count || a.email.localeCompare(b.email))[0];
        for (const e of members)
            emailToCanonical.set(e, rep.email);
        if (members.length > 1) {
            merges.push({
                canonical: rep.email,
                name: rep.name || rep.email,
                members: members.slice().sort(),
            });
        }
    }
    merges.sort((a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name));
    return { emailToCanonical, merges };
}
// Load a .git-arch-identities override file from the repo root, if present.
// Format (simple, line-based):
//   merge: a@x.com, b@y.com, c@z.com
//   split: shared-ci@x.com
// Lines starting with # are comments.
function loadIdentityOverrides(repoPath) {
    const file = path.join(repoPath, '.git-arch-identities');
    const options = { mergeGroups: [], splitEmails: [] };
    let raw;
    try {
        raw = fs.readFileSync(file, 'utf8');
    }
    catch {
        return options; // no override file is the common case
    }
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const colon = trimmed.indexOf(':');
        if (colon === -1)
            continue;
        const kind = trimmed.slice(0, colon).trim().toLowerCase();
        const rest = trimmed.slice(colon + 1);
        const emails = rest.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
        if (kind === 'merge' && emails.length >= 2) {
            options.mergeGroups.push(emails);
        }
        else if (kind === 'split') {
            options.splitEmails.push(...emails);
        }
    }
    return options;
}
//# sourceMappingURL=identity.js.map