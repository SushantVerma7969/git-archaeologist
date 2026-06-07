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
function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function col(score, max) {
    const r = Math.min(score / Math.max(max, 1), 1);
    if (r > 0.7)
        return '#ef4444';
    if (r > 0.4)
        return '#f97316';
    if (r > 0.2)
        return '#eab308';
    if (r > 0.05)
        return '#22c55e';
    return '#3b82f6';
}
function buildTree(result) {
    const sm = new Map();
    for (const f of result.cursedFiles)
        sm.set(f.filepath, f.curseScore);
    const fm = new Map();
    for (const [fp, stats] of result.fileStats) {
        const parts = fp.split('/');
        const folder = parts.length > 1 ? parts[0] : '(root)';
        const score = sm.get(fp) ?? 0;
        const last = new Date(stats.lastChanged * 1000).toISOString().split('T')[0];
        if (!fm.has(folder))
            fm.set(folder, []);
        fm.get(folder).push({ name: parts[parts.length - 1], filepath: fp, value: Math.max(stats.totalChanges, 1), score, changes: stats.totalChanges, authors: stats.uniqueAuthors.size, lastTouched: last });
    }
    return { name: result.repoName, children: Array.from(fm.entries()).map(([f, files]) => ({ name: f, children: files })) };
}
function generateHtmlReport(result, outputPath) {
    const from = result.dateRange.from.toISOString().split('T')[0];
    const to = result.dateRange.to.toISOString().split('T')[0];
    const maxS = Math.max(1, ...result.cursedFiles.map(f => f.curseScore));
    const treeJSON = JSON.stringify(buildTree(result));
    const cursedRows = result.cursedFiles.slice(0, 20).map((f, i) => {
        const c = col(f.curseScore, maxS);
        const stats = result.fileStats.get(f.filepath);
        const last = stats ? new Date(stats.lastChanged * 1000).toISOString().split('T')[0] : '—';
        return `<tr onclick="hl('${esc(f.filepath)}')" style="cursor:pointer">
      <td style="color:#64748b;width:32px">${i + 1}</td>
      <td style="font-family:monospace;font-size:12px">${esc(f.filepath)}</td>
      <td><span style="background:${c};color:#000;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700">${f.curseScore.toFixed(0)}</span></td>
      <td style="color:#94a3b8">${f.totalChanges}</td>
      <td style="color:#94a3b8">${f.uniqueAuthors}</td>
      <td style="color:#64748b;font-size:12px">${last}</td>
    </tr>`;
    }).join('');
    const busRows = result.busFactor.map(b => {
        const bc = b.busFactor === 1 ? '#ef4444' : b.busFactor === 2 ? '#f97316' : '#22c55e';
        const icon = b.busFactor === 1 ? '⚠' : b.busFactor === 2 ? '⚡' : '✓';
        return `<tr>
      <td style="font-family:monospace;font-size:12px">${esc(b.scope)}</td>
      <td><span style="background:${bc};color:#000;padding:2px 10px;border-radius:20px;font-weight:700">${icon} ${b.busFactor}</span></td>
      <td style="color:#94a3b8">${b.filesAtRisk}</td>
      <td style="color:#94a3b8;font-size:12px">${esc(b.atRiskAuthors.slice(0, 2).join(', '))}</td>
    </tr>`;
    }).join('');
    const couplingRows = result.coupling.slice(0, 15).map(c2 => {
        const cc = c2.couplingScore >= 80 ? '#ef4444' : c2.couplingScore >= 50 ? '#f97316' : '#eab308';
        return `<tr>
      <td style="font-family:monospace;font-size:11px">${esc(c2.fileA)}</td>
      <td style="color:#475569;text-align:center;padding:0 8px">↔</td>
      <td style="font-family:monospace;font-size:11px">${esc(c2.fileB)}</td>
      <td><span style="background:${cc};color:#000;padding:2px 10px;border-radius:20px;font-weight:600">${c2.couplingScore}%</span></td>
    </tr>`;
    }).join('');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>⛏ ${esc(result.repoName)} — Git Archaeologist</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"><\/script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0d14;--s1:#111520;--s2:#161b28;--bd:#1e2535;--tx:#e2e8f0;--mu:#64748b;--ac:#a78bfa}
body{background:var(--bg);color:var(--tx);font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6}
header{background:var(--s1);border-bottom:1px solid var(--bd);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
header h1{font-size:18px;font-weight:700;color:var(--ac)}
header p{font-size:12px;color:var(--mu);margin-top:2px}
.legend{font-size:12px;color:var(--mu);display:flex;gap:12px;align-items:center}
.legend span{display:flex;align-items:center;gap:4px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.stats{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;padding:24px 32px 0}
.stat{background:var(--s1);border:1px solid var(--bd);border-radius:12px;padding:16px;text-align:center}
.stat .n{font-size:30px;font-weight:800;color:var(--ac);letter-spacing:-0.03em}
.stat .l{font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
.stat.d .n{color:#ef4444}
.tm-wrap{padding:20px 32px}
.tm-wrap h2{font-size:12px;font-weight:600;color:var(--mu);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
#tm{width:100%;height:500px;background:var(--s1);border:1px solid var(--bd);border-radius:12px;overflow:hidden}
#tip{position:fixed;background:rgba(10,13,20,.97);border:1px solid var(--bd);border-radius:10px;padding:12px 16px;pointer-events:none;font-size:12px;z-index:999;max-width:300px;display:none;box-shadow:0 8px 32px rgba(0,0,0,.5)}
.tn{font-family:monospace;font-weight:600;color:var(--ac);margin-bottom:8px;word-break:break-all;font-size:11px}
.tr{display:flex;justify-content:space-between;gap:20px;color:var(--mu);margin-top:3px}
.tr span:last-child{color:var(--tx);font-weight:500}
.tables{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:20px 32px 32px}
.full{grid-column:1/-1}
.card{background:var(--s1);border:1px solid var(--bd);border-radius:12px;overflow:hidden}
.ch{padding:14px 20px;border-bottom:1px solid var(--bd);font-size:13px;font-weight:600;color:var(--ac)}
table{width:100%;border-collapse:collapse}
th{padding:9px 20px;text-align:left;font-size:11px;font-weight:500;color:var(--mu);text-transform:uppercase;letter-spacing:.06em;background:var(--s2)}
td{padding:10px 20px;border-top:1px solid var(--bd);vertical-align:middle}
tr:hover td{background:rgba(167,139,250,.04)}
footer{text-align:center;padding:24px;color:var(--mu);font-size:12px;border-top:1px solid var(--bd)}
footer a{color:var(--ac);text-decoration:none}
@media(max-width:900px){.stats{grid-template-columns:repeat(3,1fr)}.tables{grid-template-columns:1fr}}
</style>
</head>
<body>
<header>
  <div>
    <h1>⛏ Git Archaeologist</h1>
    <p>${esc(result.repoName)} · ${result.totalCommits.toLocaleString()} commits · ${from} → ${to} · analyzed ${result.analyzedAt.toLocaleString()}</p>
  </div>
  <div class="legend">
    <span><i class="dot" style="background:#ef4444"></i>Critical</span>
    <span><i class="dot" style="background:#f97316"></i>High</span>
    <span><i class="dot" style="background:#eab308"></i>Medium</span>
    <span><i class="dot" style="background:#22c55e"></i>Low</span>
    <span><i class="dot" style="background:#3b82f6"></i>Safe</span>
  </div>
</header>
<div class="stats">
  <div class="stat"><div class="n">${result.totalCommits.toLocaleString()}</div><div class="l">Commits</div></div>
  <div class="stat"><div class="n">${result.totalFiles.toLocaleString()}</div><div class="l">Files</div></div>
  <div class="stat"><div class="n">${result.totalAuthors.toLocaleString()}</div><div class="l">Authors</div></div>
  <div class="stat d"><div class="n">${result.cursedFiles.length}</div><div class="l">Cursed Files</div></div>
  <div class="stat d"><div class="n">${result.busFactor.filter((b) => b.busFactor === 1).length}</div><div class="l">Bus Factor 1</div></div>
  <div class="stat d"><div class="n">${result.coupling.length}</div><div class="l">Coupled Pairs</div></div>
</div>
<div class="tm-wrap">
  <h2>🗺 Codebase Risk Map — size = commit frequency · color = curse score</h2>
  <div id="tm"></div>
</div>
<div id="tip">
  <div class="tn" id="tt-fp"></div>
  <div class="tr"><span>Curse score</span><span id="tt-sc"></span></div>
  <div class="tr"><span>Changes</span><span id="tt-ch"></span></div>
  <div class="tr"><span>Authors</span><span id="tt-au"></span></div>
  <div class="tr"><span>Last touched</span><span id="tt-lt"></span></div>
</div>
<div class="tables">
  <div class="card full"><div class="ch">💀 Cursed Files — highest instability score</div>
    <table><thead><tr><th>#</th><th>File</th><th>Score</th><th>Changes</th><th>Authors</th><th>Last touched</th></tr></thead>
    <tbody>${cursedRows}</tbody></table></div>
  <div class="card"><div class="ch">🚌 Bus Factor — single points of failure</div>
    <table><thead><tr><th>Module</th><th>Factor</th><th>Files</th><th>Key people</th></tr></thead>
    <tbody>${busRows}</tbody></table></div>
  <div class="card"><div class="ch">🔗 Implicit Coupling</div>
    <table><thead><tr><th>File A</th><th></th><th>File B</th><th>Score</th></tr></thead>
    <tbody>${couplingRows}</tbody></table></div>
</div>
<footer>Generated by <a href="https://github.com/SushantVerma7969/git-archaeologist">⛏ git-archaeologist</a> · <a href="https://www.npmjs.com/package/git-archaeologist">npm</a></footer>
<script>
const DATA=${treeJSON};
const MAX=${maxS};
function sc(s){const r=Math.min(s/Math.max(MAX,1),1);if(r>.7)return"#ef4444";if(r>.4)return"#f97316";if(r>.2)return"#eab308";if(r>.05)return"#22c55e";return"#3b82f6";}
function dk(h,a){const n=parseInt(h.slice(1),16);return"#"+[Math.max(0,(n>>16)-a),Math.max(0,((n>>8)&255)-a),Math.max(0,(n&255)-a)].map(v=>v.toString(16).padStart(2,"0")).join("");}
const el=document.getElementById("tm");
const W=el.getBoundingClientRect().width||el.offsetWidth||800;
const H=el.getBoundingClientRect().height||el.offsetHeight||500;
const svg=d3.select("#tm").append("svg").attr("width",W).attr("height",H);
const root=d3.hierarchy(DATA).sum(d=>d.value||0).sort((a,b)=>(b.value||0)-(a.value||0));
d3.treemap().size([W,H]).padding(2).paddingTop(22).round(true)(root);
const tip=document.getElementById("tip");
function show(e,d){
  if(!d.data.filepath)return;
  document.getElementById("tt-fp").textContent=d.data.filepath;
  document.getElementById("tt-sc").textContent=d.data.score?d.data.score.toFixed(1):"—";
  document.getElementById("tt-ch").textContent=d.data.changes||"—";
  document.getElementById("tt-au").textContent=d.data.authors||"—";
  document.getElementById("tt-lt").textContent=d.data.lastTouched||"—";
  tip.style.display="block";mv(e);
}
function mv(e){
  const x=e.clientX+16,y=e.clientY-10;
  const tw=tip.offsetWidth,th=tip.offsetHeight;
  tip.style.left=(x+tw>window.innerWidth?x-tw-32:x)+"px";
  tip.style.top=(y+th>window.innerHeight?y-th:y)+"px";
}
svg.selectAll("g.fd").data(root.children||[]).join("g").attr("class","fd").call(g=>{
  g.append("rect").attr("x",d=>d.x0).attr("y",d=>d.y0).attr("width",d=>d.x1-d.x0).attr("height",d=>d.y1-d.y0).attr("fill","none").attr("stroke","#1e2535").attr("stroke-width",1);
  g.append("text").attr("x",d=>d.x0+6).attr("y",d=>d.y0+15).attr("fill","#64748b").attr("font-size","11px").attr("font-weight","600").attr("font-family","monospace").text(d=>d.data.name);
});
const lv=svg.selectAll("g.lf").data(root.leaves()).join("g").attr("class","lf");
lv.append("rect")
  .attr("x",d=>d.x0+1).attr("y",d=>d.y0+1)
  .attr("width",d=>Math.max(0,d.x1-d.x0-2)).attr("height",d=>Math.max(0,d.y1-d.y0-2))
  .attr("rx",3).attr("fill",d=>sc(d.data.score||0)).attr("fill-opacity",.82)
  .attr("stroke",d=>dk(sc(d.data.score||0),40)).attr("stroke-width",.5)
  .style("cursor","pointer")
  .on("mouseenter",function(e,d){d3.select(this).attr("fill-opacity",1).attr("stroke-width",2);show(e,d);})
  .on("mousemove",mv)
  .on("mouseleave",function(){d3.select(this).attr("fill-opacity",.82).attr("stroke-width",.5);tip.style.display="none";});
lv.filter(d=>(d.x1-d.x0)>55&&(d.y1-d.y0)>22).append("text")
  .attr("x",d=>d.x0+5).attr("y",d=>d.y0+14)
  .attr("fill","rgba(0,0,0,.85)").attr("font-size","10px").attr("font-family","monospace").attr("pointer-events","none")
  .text(d=>{const nm=d.data.name;const mx=Math.floor((d.x1-d.x0-10)/6);return nm.length>mx?nm.slice(0,mx-1)+"…":nm;});
window.hl=function(fp){
  lv.selectAll("rect").attr("stroke-width",d=>d.data.filepath===fp?3:.5).attr("stroke",d=>d.data.filepath===fp?"#fff":dk(sc(d.data.score||0),40)).attr("fill-opacity",d=>d.data.filepath===fp?1:.82);

};
<\/script>
</body>
</html>`;
    fs.writeFileSync(outputPath, html, 'utf8');
}
//# sourceMappingURL=htmlReport.js.map