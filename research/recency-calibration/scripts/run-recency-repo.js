#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function usage() {
  console.error(`Usage:
  node research/recency-calibration/scripts/run-recency-repo.js \\
    --repo-path <path> \\
    --repo-name <name> \\
    --repo-sha <sha> \\
    --cutoff-date <utc-iso> \\
    [--output-root <dir>]

Defaults:
  --output-root research/recency-calibration/runs`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function ensureRequired(args) {
  for (const key of ['repo-path', 'repo-name', 'repo-sha', 'cutoff-date']) {
    if (!args[key]) throw new Error(`Missing required argument --${key}`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });
  return {
    command: [command, ...args],
    cwd: options.cwd || process.cwd(),
    exitCode: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : undefined,
  };
}

function writeText(file, value) {
  fs.writeFileSync(file, value, 'utf8');
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function requireSuccess(label, result) {
  if (result.exitCode !== 0 || result.error) {
    throw new Error(`${label} failed with exit code ${result.exitCode}: ${result.stderr || result.error || ''}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureRequired(args);

  const toolRoot = path.resolve(__dirname, '..', '..', '..');
  const repoPath = path.resolve(args['repo-path']);
  const repoName = args['repo-name'];
  const repoSha = args['repo-sha'];
  const cutoffDate = args['cutoff-date'];
  const outputRoot = path.resolve(args['output-root'] || path.join(toolRoot, 'research/recency-calibration/runs'));
  const outputDir = path.join(outputRoot, repoName);
  fs.mkdirSync(outputDir, { recursive: true });

  const commands = {};

  commands.checkout = run('git', ['-C', repoPath, 'checkout', repoSha]);
  writeJson(path.join(outputDir, 'checkout-status.json'), commands.checkout);
  requireSuccess('checkout', commands.checkout);

  commands.repositorySha = run('git', ['-C', repoPath, 'rev-parse', 'HEAD']);
  commands.repositoryStatus = run('git', ['-C', repoPath, 'status', '--short']);
  commands.toolSha = run('git', ['-C', toolRoot, 'rev-parse', 'HEAD']);
  commands.gitVersion = run('git', ['--version']);
  commands.nodeVersion = run('node', ['--version']);
  commands.toolVersion = run('node', [path.join(toolRoot, 'dist/index.js'), '--version']);

  for (const [label, result] of Object.entries(commands)) {
    if (label === 'checkout') continue;
    requireSuccess(label, result);
  }

  const metadata = {
    repository: repoName,
    repositoryPath: repoPath,
    requestedRepositorySha: repoSha,
    repositorySha: commands.repositorySha.stdout.trim(),
    repositoryStatus: commands.repositoryStatus.stdout,
    toolSha: commands.toolSha.stdout.trim(),
    toolVersion: commands.toolVersion.stdout.trim(),
    nodeVersion: commands.nodeVersion.stdout.trim(),
    gitVersion: commands.gitVersion.stdout.trim(),
    executionDate: new Date().toISOString(),
    cutoffDate,
  };
  writeJson(path.join(outputDir, 'metadata.json'), metadata);

  const analysisEnv = {
    ...process.env,
    TZ: 'UTC',
    LC_ALL: 'C',
  };
  const cli = path.join(toolRoot, 'dist/index.js');
  const commandSpecs = [
    {
      label: 'lifetime-analysis',
      args: [cli, 'analyze', repoPath, '--json'],
      stdoutFile: 'lifetime-analysis.json',
    },
    {
      label: 'recent-analysis',
      args: [cli, 'analyze', repoPath, '--since', cutoffDate, '--json'],
      stdoutFile: 'recent-analysis.json',
    },
    {
      label: 'lifetime-risk',
      args: [cli, 'risk', repoPath, '--all'],
      stdoutFile: 'lifetime-risk.txt',
    },
    {
      label: 'recent-risk',
      args: [cli, 'risk', repoPath, '--all', '--since', cutoffDate],
      stdoutFile: 'recent-risk.txt',
    },
  ];

  const statuses = [];
  for (const spec of commandSpecs) {
    const result = run('node', spec.args, { cwd: toolRoot, env: analysisEnv });
    writeText(path.join(outputDir, spec.stdoutFile), result.stdout);
    writeText(path.join(outputDir, `${spec.label}.stderr.txt`), result.stderr);
    const status = {
      label: spec.label,
      command: ['node', ...spec.args],
      cwd: toolRoot,
      exitCode: result.exitCode,
      signal: result.signal,
      error: result.error,
      stdoutFile: spec.stdoutFile,
      stderrFile: `${spec.label}.stderr.txt`,
    };
    statuses.push(status);
    writeJson(path.join(outputDir, `${spec.label}-status.json`), status);
    requireSuccess(spec.label, result);
  }

  writeJson(path.join(outputDir, 'command-status.json'), statuses);
  console.log(outputDir);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}
