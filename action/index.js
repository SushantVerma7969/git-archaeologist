const { execSync } = require('child_process');
const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const top = core.getInput('top') || '10';
    const since = core.getInput('since') || '';
    const failScore = parseInt(core.getInput('fail-on-curse-score') || '0', 10);
    const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
    const repoPath = process.env.GITHUB_WORKSPACE || '.';

    core.info('⛏ Running Git Archaeologist...');

    let cmd = `npx git-archaeologist@latest analyze ${repoPath} --json`;
    if (since) cmd += ` --since ${since}`;

    const output = execSync(cmd, { maxBuffer: 50 * 1024 * 1024 }).toString();
    const result = JSON.parse(output);

    const cursed = result.cursedFiles || [];
    const topFile = cursed[0];

    if (topFile) {
      core.setOutput('top-cursed-file', topFile.filepath);
      core.setOutput('top-curse-score', String(topFile.curseScore));
    }

    // Get files changed in this PR
    const context = github.context;
    const isPR = context.eventName === 'pull_request';
    let prFiles = [];
    let blastResults = [];

    if (isPR && token) {
      const octokit = github.getOctokit(token);
      const { data: files } = await octokit.rest.pulls.listFiles({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.payload.pull_request.number,
      });
      prFiles = files.map(f => f.filename);

      // Get blast radius for each changed file
      for (const file of prFiles.slice(0, 5)) {
        try {
          const blastOut = execSync(
            `npx git-archaeologist@latest blast ${file} ${repoPath} --json 2>/dev/null || echo '{}'`,
            { maxBuffer: 10 * 1024 * 1024 }
          ).toString();
          // blast command doesn't have --json yet, skip for now
        } catch(e) {}
      }
    }

    // Calculate PR risk score
    let prRiskScore = 0;
    let prRiskReasons = [];
    const cursedPaths = new Set(cursed.map(f => f.filepath));

    for (const file of prFiles) {
      if (cursedPaths.has(file)) {
        const cf = cursed.find(f => f.filepath === file);
        prRiskScore += Math.min(50, Math.round(cf.curseScore / 10));
        prRiskReasons.push(`\`${file}\` has curse score ${cf.curseScore.toFixed(0)}`);
      }
    }

    const busFactor1 = (result.busFactor || []).filter(b => b.busFactor === 1);
    for (const file of prFiles) {
      for (const bf of busFactor1) {
        if (file.startsWith(bf.scope + '/') || file.startsWith(bf.scope.replace('(root)',''))) {
          prRiskScore += 20;
          prRiskReasons.push(`\`${bf.scope}\` has bus factor 1 — owned by ${bf.atRiskAuthors[0]}`);
          break;
        }
      }
    }

    prRiskScore = Math.min(100, prRiskScore);

    const riskEmoji = prRiskScore >= 75 ? '🔴' : prRiskScore >= 40 ? '🟡' : '🟢';
    const riskLabel = prRiskScore >= 75 ? 'High Risk' : prRiskScore >= 40 ? 'Medium Risk' : 'Low Risk';

    // Build summary
    const sinceLabel = since ? ` (since ${since})` : '';
    let summary = `## ⛏ Git Archaeologist${sinceLabel}\n\n`;

    if (isPR && prFiles.length > 0) {
      summary += `### ${riskEmoji} PR Risk Score: ${prRiskScore}/100 — ${riskLabel}\n\n`;
      if (prRiskReasons.length > 0) {
        summary += `**Why:**\n`;
        prRiskReasons.forEach(r => { summary += `- ${r}\n`; });
        summary += '\n';
      } else {
        summary += `This PR touches no high-risk files.\n\n`;
      }
      summary += `**Files changed:** ${prFiles.slice(0, 10).map(f => `\`${f}\``).join(', ')}${prFiles.length > 10 ? ` +${prFiles.length - 10} more` : ''}\n\n`;
    }

    summary += `**${result.totalCommits} commits · ${result.totalFiles} files · ${result.totalAuthors} authors**\n\n`;

    if (cursed.length > 0) {
      summary += `### 💀 Top ${Math.min(parseInt(top), cursed.length)} Cursed Files\n\n`;
      summary += `| # | File | Score | Changes | Authors |\n`;
      summary += `|---|------|-------|---------|--------|\n`;
      cursed.slice(0, parseInt(top)).forEach((f, i) => {
        const inPR = prFiles.includes(f.filepath) ? ' ⚠️' : '';
        summary += `| ${i+1} | \`${f.filepath}\`${inPR} | **${f.curseScore.toFixed(0)}** | ${f.totalChanges} | ${f.uniqueAuthors} |\n`;
      });
      summary += '\n';
    }

    const bf1 = (result.busFactor || []).filter(b => b.busFactor === 1);
    if (bf1.length > 0) {
      summary += `### 🚌 Bus Factor 1 — Single Points of Failure\n\n`;
      bf1.forEach(b => {
        summary += `- **${b.scope}** — ${b.atRiskAuthors[0]}\n`;
      });
      summary += '\n';
    }

    summary += `---\n*[git-archaeologist](https://github.com/SushantVerma7969/git-archaeologist)*\n`;

    await core.summary.addRaw(summary).write();

    // Post PR comment if in PR context
    if (isPR && token) {
      const octokit = github.getOctokit(token);
      try {
        await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.payload.pull_request.number,
          body: summary,
        });
        core.info('Posted PR comment');
      } catch(e) {
        core.warning('Could not post PR comment: ' + e.message);
      }
    }

    if (failScore > 0 && topFile && topFile.curseScore >= failScore) {
      core.setFailed(`Curse score threshold exceeded: ${topFile.filepath} scored ${topFile.curseScore.toFixed(0)} (threshold: ${failScore})`);
    }

  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
