const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPOS = [
  { name: 'yargs', url: 'https://github.com/yargs/yargs.git', file: 'lib/usage.ts' },
  { name: 'jest', url: 'https://github.com/jestjs/jest.git', file: 'packages/jest-core/src/TestScheduler.ts' },
  { name: 'undici', url: 'https://github.com/nodejs/undici.git', file: 'lib/dispatcher/client-h1.js' },
  { name: 'eslint', url: 'https://github.com/eslint/eslint.git', file: 'lib/linter/linter.js' },
  { name: 'express', url: 'https://github.com/expressjs/express.git', file: 'lib/router/index.js' },
  { name: 'fastify', url: 'https://github.com/fastify/fastify.git', file: 'lib/reply.js' },
  { name: 'opensauced', url: 'https://github.com/open-sauced/hot.git', file: 'src/components/RepoCard.tsx' }
];

const BASE_DIR = '/home/sushantv/.gemini/antigravity/scratch/deep_eval';

function runBlast(repoName, file, semantic) {
  const repoPath = path.join(BASE_DIR, repoName);
  const cmd = `node /home/sushantv/.gemini/antigravity/scratch/git-archaeologist/dist/index.js blast ${file} . ${semantic ? '--semantic' : ''}`;
  try {
    const start = Date.now();
    const output = execSync(cmd, { cwd: repoPath, stdio: 'pipe' }).toString();
    const runtime = Date.now() - start;

    // Parse output for coupling %
    // E.g. "█████                 25%  lib/command.ts"
    const cleanOutput = output.replace(/[\\u001b\\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    const lines = cleanOutput.split('\\n');
    let topCoupling = '0%';
    let totalFiles = 0;
    
    for (const line of lines) {
      if (line.includes('%  ')) {
        const match = line.match(/(\\d+)%\\s+(.+)$/);
        if (match) {
          if (topCoupling === '0%') topCoupling = match[1] + '%';
        }
      }
      if (line.includes('Blast radius')) {
        const match = line.match(/(\\d+)\\s+files/);
        if (match) {
          totalFiles = parseInt(match[1], 10);
        }
      }
    }
    
    return { topCoupling, totalFiles, runtime, raw: cleanOutput };
  } catch (err) {
    return { topCoupling: 'ERROR', totalFiles: 0, runtime: 0, raw: err.toString() };
  }
}

function main() {
  const results = [];
  
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
  }

  for (const repo of REPOS) {
    const repoPath = path.join(BASE_DIR, repo.name);
    console.log(`Setting up ${repo.name}...`);
    if (!fs.existsSync(repoPath)) {
      console.log(`Cloning ${repo.name}...`);
      execSync(`git clone ${repo.url} ${repo.name}`, { cwd: BASE_DIR });
    }
    
    console.log(`Benchmarking ${repo.name}...`);
    const before = runBlast(repo.name, repo.file, false);
    const after = runBlast(repo.name, repo.file, true);
    
    results.push({
      repo: repo.name,
      file: repo.file,
      before: { coupling: before.topCoupling, files: before.totalFiles, time: before.runtime },
      after: { coupling: after.topCoupling, files: after.totalFiles, time: after.runtime }
    });
  }
  
  fs.writeFileSync(path.join(BASE_DIR, 'bench_results.json'), JSON.stringify(results, null, 2));
  console.log('Done.');
}

main();
