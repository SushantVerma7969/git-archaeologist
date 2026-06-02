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
exports.generateHtmlReport = generateHtmlReport;
const fs = __importStar(require("fs"));
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function scoreColor(score) {
    if (score >= 800)
        return '#f87171';
    if (score >= 400)
        return '#fbbf24';
    if (score >= 100)
        return '#34d399';
    return '#6ee7b7';
}
function busColor(n) {
    if (n === 1)
        return '#f87171';
    if (n === 2)
        return '#fbbf24';
    return '#34d399';
}
function pctColor(p) {
    if (p >= 90)
        return '#c084fc';
    if (p >= 70)
        return '#60a5fa';
    return '#94a3b8';
}
function generateHtmlReport(result, outputPath) {
    const from = result.dateRange.from.toISOString().split('T')[0];
    const to = result.dateRange.to.toISOString().split('T')[0];
    const cursedRows = result.cursedFiles.slice(0, 20).map((f, i) => `
    <tr>
      <td class="rank">${i + 1}</td>
      <td class="filepath" title="${escapeHtml(f.filepath)}">${escapeHtml(f.filepath)}</td>
      <td><span class="badge" style="background:${scoreColor(f.curseScore)}">${f.curseScore.toFixed(1)}</span></td>
      <td>${f.totalChanges}</td>
      <td>${f.uniqueAuthors}</td>
      <td class="muted">${escapeHtml(f.reasons.join(', '))}</td>
    </tr>`).join('');
    const busRows = result.busFactor.map((b) => `
    <tr>
      <td>${escapeHtml(b.scope)}</td>
      <td><span class="badge" style="background:${busColor(b.busFactor)}">${b.busFactor}</span></td>
      <td>${b.filesAtRisk}</td>
      <td>${escapeHtml(b.atRiskAuthors.slice(0, 3).join(', '))}</td>
      <td class="muted">${escapeHtml(b.warning.replace(/[⚠️⚡✓]/gu, ''))}</td>
    </tr>`).join('');
    const ownerRows = result.ownership
        .filter((o) => o.ownershipPercent >= 60)
        .slice(0, 20)
        .map((o) => `
    <tr>
      <td class="filepath" title="${escapeHtml(o.filepath)}">${escapeHtml(o.filepath)}</td>
      <td>${escapeHtml(o.owner)}</td>
      <td><span class="badge" style="background:${pctColor(o.ownershipPercent)}">${o.ownershipPercent}%</span></td>
      <td class="muted">${o.contributors.slice(1, 3).map(c => escapeHtml(`${c.name} (${c.percent}%)`)).join(', ') || '—'}</td>
    </tr>`).join('');
    const couplingRows = result.coupling.slice(0, 15).map((c) => `
    <tr>
      <td class="filepath" title="${escapeHtml(c.fileA)}">${escapeHtml(c.fileA)}</td>
      <td class="filepath" title="${escapeHtml(c.fileB)}">${escapeHtml(c.fileB)}</td>
      <td>${c.coChanges}</td>
      <td><span class="badge" style="background:${scoreColor(c.couplingScore * 8)}">${c.couplingScore}%</span></td>
    </tr>`).join('');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>⛏ Git Archaeologist — ${escapeHtml(result.repoName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f1117; --surface: #1a1d27; --border: #2a2d3a;
      --text: #e2e8f0; --muted: #64748b; --accent: #a78bfa;
    }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; font-size: 14px; line-height: 1.6; }
    header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 24px 40px; display: flex; align-items: center; gap: 16px; }
    header h1 { font-size: 20px; font-weight: 600; color: var(--accent); }
    header p { color: var(--muted); font-size: 13px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; padding: 32px 40px 0; }
    .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; }
    .stat-card .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
    .stat-card .value { font-size: 28px; font-weight: 700; color: var(--accent); }
    .stat-card .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
    main { padding: 32px 40px; display: flex; flex-direction: column; gap: 40px; }
    section h2 { font-size: 15px; font-weight: 600; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
    th { background: #12151f; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; padding: 10px 14px; text-align: left; font-weight: 500; }
    td { padding: 10px 14px; border-top: 1px solid var(--border); vertical-align: middle; }
    tr:hover td { background: #1e2130; }
    .rank { color: var(--muted); font-size: 12px; width: 40px; }
    .filepath { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .muted { color: var(--muted); font-size: 12px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #0f1117; }
    footer { text-align: center; padding: 32px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>⛏ Git Archaeologist</h1>
      <p>${escapeHtml(result.repoName)} &nbsp;·&nbsp; ${result.totalCommits.toLocaleString()} commits &nbsp;·&nbsp; ${from} → ${to} &nbsp;·&nbsp; analyzed ${result.analyzedAt.toLocaleString()}</p>
    </div>
  </header>

  <div class="stats-grid">
    <div class="stat-card"><div class="label">Total Commits</div><div class="value">${result.totalCommits.toLocaleString()}</div></div>
    <div class="stat-card"><div class="label">Files Tracked</div><div class="value">${result.totalFiles.toLocaleString()}</div></div>
    <div class="stat-card"><div class="label">Contributors</div><div class="value">${result.totalAuthors.toLocaleString()}</div></div>
    <div class="stat-card"><div class="label">Cursed Files</div><div class="value" style="color:#f87171">${result.cursedFiles.length}</div><div class="sub">top instability</div></div>
    <div class="stat-card"><div class="label">Bus Factor 1</div><div class="value" style="color:#f87171">${result.busFactor.filter(b => b.busFactor === 1).length}</div><div class="sub">single-owner modules</div></div>
    <div class="stat-card"><div class="label">Coupled Pairs</div><div class="value" style="color:#fbbf24">${result.coupling.length}</div><div class="sub">implicit links</div></div>
  </div>

  <main>
    <section>
      <h2>💀 Cursed Files — highest instability score</h2>
      <table>
        <thead><tr><th>#</th><th>File</th><th>Score</th><th>Changes</th><th>Authors</th><th>Why</th></tr></thead>
        <tbody>${cursedRows}</tbody>
      </table>
    </section>

    <section>
      <h2>🚌 Bus Factor — single points of failure</h2>
      <table>
        <thead><tr><th>Module</th><th>Bus Factor</th><th>Files</th><th>Key People</th><th>Risk</th></tr></thead>
        <tbody>${busRows}</tbody>
      </table>
    </section>

    <section>
      <h2>👑 Ownership — who truly owns each file</h2>
      <table>
        <thead><tr><th>File</th><th>Owner</th><th>Ownership</th><th>Other Contributors</th></tr></thead>
        <tbody>${ownerRows}</tbody>
      </table>
    </section>

    <section>
      <h2>🔗 Implicit Coupling — files that always change together</h2>
      <table>
        <thead><tr><th>File A</th><th>File B</th><th>Co-changes</th><th>Coupling</th></tr></thead>
        <tbody>${couplingRows}</tbody>
      </table>
    </section>
  </main>
  <footer>Generated by ⛏ Git Archaeologist</footer>
</body>
</html>`;
    fs.writeFileSync(outputPath, html, 'utf8');
}
//# sourceMappingURL=htmlReport.js.map