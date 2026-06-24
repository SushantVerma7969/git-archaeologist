import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as path from 'path';
import { analyze } from '../core/orchestrator';
import {
  buildScopeRisks,
  buildContributorChurn,
  buildAbandonedScopes,
  buildOwnershipTransitions,
  buildTemporalScopeRisks,
  buildHotspots,
} from '../riskExplanation';
import { AnalysisResult } from '../types';

// The git-archaeologist MCP server exposes the same git-history analysis the
// CLI produces, but as structured tools an AI coding agent can call directly.
// Where the CLI renders colored tables for humans, these tools return compact
// JSON the agent reasons over.
//
// Design notes:
// - Five focused tools, not one-per-CLI-command. Agents do worse with tool
//   sprawl, so the human-presentation commands (HTML, trend) are omitted and
//   blame/blast are folded into who_owns / find_coupled_files.
// - repoPath defaults to the server's working directory, since an agent almost
//   always operates inside one repo. It can be overridden per call.
// - Every analysis runs fresh (stateless). Agents call these occasionally, so
//   correctness beats caching; a per-repo cache can be added later if needed.

const SIGNALS_DISCLAIMER =
  'These are investigation signals derived from git commit history, not ' +
  'conclusions about code quality, ownership, or who should be assigned work. ' +
  'Commit authorship is not the same as knowledge ownership.';

function resolveRepo(repoPath?: string): string {
  return path.resolve(repoPath ?? process.cwd());
}

function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify({ error: message }, null, 2) },
    ],
    isError: true,
  };
}

// Shared analysis runner with a friendly error if the path isn't a git repo.
async function runAnalysis(repoPath: string, since?: string): Promise<AnalysisResult> {
  return analyze(repoPath, since, /* silent */ true);
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'git-archaeologist', version: '1.0.0' },
    {
      instructions:
        'git-archaeologist analyzes a local git repository for maintenance risk ' +
        'from commit history: bus factor, ownership concentration, owner activity, ' +
        'hidden file coupling, and risk hotspots. ' +
        SIGNALS_DISCLAIMER +
        ' All tools accept an optional repoPath (defaults to the current working ' +
        'directory). Start with analyze_repo for an overview, then drill in with ' +
        'who_owns, get_bus_factor, find_coupled_files, or get_risk_hotspots.',
    },
  );

  // --- Tool 1: analyze_repo — the lay of the land ---
  server.tool(
    'analyze_repo',
    'Overview of a repository: commit/contributor totals, the scopes with bus ' +
      'factor 1 (single-point-of-failure risk), the highest-risk ("cursed") files, ' +
      'and any merged contributor identities. Start here.',
    {
      repoPath: z
        .string()
        .optional()
        .describe('Path to the git repository. Defaults to the current directory.'),
      since: z
        .string()
        .optional()
        .describe(
          'Only analyze commits after this date (e.g. "90d", "1y", "2024-01-01").',
        ),
    },
    async ({ repoPath, since }) => {
      try {
        const repo = resolveRepo(repoPath);
        const r = await runAnalysis(repo, since);
        const busFactorOne = r.busFactor
          .filter((b) => b.busFactor === 1)
          .map((b) => ({
            scope: b.scope,
            owner: b.atRiskAuthors[0],
            filesAtRisk: b.filesAtRisk,
          }));
        return jsonResult({
          repo: r.repoName,
          totalCommits: r.totalCommits,
          totalFiles: r.totalFiles,
          totalContributors: r.totalAuthors,
          dateRange: { from: r.dateRange.from, to: r.dateRange.to },
          busFactorOneScopes: busFactorOne,
          topCursedFiles: r.cursedFiles.slice(0, 10).map((f) => ({
            file: f.filepath,
            curseScore: f.curseScore,
            changes: f.totalChanges,
            authors: f.uniqueAuthors,
            reasons: f.reasons,
          })),
          mergedIdentities: r.identityMerges.map((m) => ({
            person: m.name,
            emails: m.members,
          })),
          note: SIGNALS_DISCLAIMER,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  // --- Tool 2: who_owns — ownership of a specific file ---
  server.tool(
    'who_owns',
    'For a specific file, show who has touched it most over its history: the ' +
      'dominant contributor, their share, the full contributor breakdown, and how ' +
      'recently the dominant contributor was active anywhere in the repo. Use before ' +
      'editing an unfamiliar file.',
    {
      filepath: z
        .string()
        .describe('Repository-relative path of the file, e.g. "src/core/parser.ts".'),
      repoPath: z
        .string()
        .optional()
        .describe('Path to the git repository. Defaults to the current directory.'),
    },
    async ({ filepath, repoPath }) => {
      try {
        const repo = resolveRepo(repoPath);
        const r = await runAnalysis(repo);
        const row = r.ownership.find((o) => o.filepath === filepath);
        if (!row) {
          // The file may exist but lack enough history to rank, or the path may be wrong.
          return jsonResult({
            file: filepath,
            found: false,
            note:
              'No ownership signal for this file. It may have too little history ' +
              '(fewer than 5 changes), a single contributor, or the path may not match. ' +
              SIGNALS_DISCLAIMER,
          });
        }
        const lastActiveTs = r.lastActiveByAuthor.get(row.ownerEmail);
        return jsonResult({
          file: row.filepath,
          dominantOwner: row.owner,
          ownershipPercent: row.ownershipPercent,
          ownerLastActive: lastActiveTs
            ? new Date(lastActiveTs * 1000).toISOString()
            : null,
          contributors: row.contributors.map((c) => ({
            name: c.name,
            changes: c.changes,
            percent: c.percent,
          })),
          note: SIGNALS_DISCLAIMER,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  // --- Tool 3: get_bus_factor — single-point-of-failure map ---
  server.tool(
    'get_bus_factor',
    'Per-folder bus factor: how many contributors account for the majority of a ' +
      "folder's changes. A bus factor of 1 means one person's departure would orphan " +
      'that area. Optionally filter to a single scope (top-level folder).',
    {
      scope: z
        .string()
        .optional()
        .describe('Limit to one top-level folder, e.g. "src". Omit for all scopes.'),
      repoPath: z
        .string()
        .optional()
        .describe('Path to the git repository. Defaults to the current directory.'),
    },
    async ({ scope, repoPath }) => {
      try {
        const repo = resolveRepo(repoPath);
        const r = await runAnalysis(repo);
        let rows = r.busFactor;
        if (scope) rows = rows.filter((b) => b.scope === scope);
        return jsonResult({
          scopes: rows.map((b) => ({
            scope: b.scope,
            busFactor: b.busFactor,
            keyContributors: b.atRiskAuthors,
            filesInScope: b.filesAtRisk,
          })),
          note: SIGNALS_DISCLAIMER,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  // --- Tool 4: find_coupled_files — hidden change dependencies ---
  server.tool(
    'find_coupled_files',
    'Files that have historically changed together (implicit coupling), even with ' +
      'no code-level dependency. Useful before editing a file: it surfaces other files ' +
      'that have tended to need changes at the same time. Optionally filter to one file.',
    {
      filepath: z
        .string()
        .optional()
        .describe(
          'Only return pairs involving this file. Omit for the top coupled pairs overall.',
        ),
      repoPath: z
        .string()
        .optional()
        .describe('Path to the git repository. Defaults to the current directory.'),
    },
    async ({ filepath, repoPath }) => {
      try {
        const repo = resolveRepo(repoPath);
        const r = await runAnalysis(repo);
        let pairs = r.coupling;
        if (filepath) {
          pairs = pairs.filter((c) => c.fileA === filepath || c.fileB === filepath);
        }
        return jsonResult({
          query: filepath ?? '(top pairs)',
          coupledPairs: pairs.slice(0, 20).map((c) => ({
            fileA: c.fileA,
            fileB: c.fileB,
            coChanges: c.coChanges,
            couplingPercent: c.couplingScore,
          })),
          note: SIGNALS_DISCLAIMER,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  // --- Tool 5: get_risk_hotspots — scopes where multiple signals agree ---
  server.tool(
    'get_risk_hotspots',
    'Folders ranked by how many distinct maintenance-risk signals fired for ' +
      'them (bus factor 1, high contributor churn, an inactive dominant contributor, ' +
      'rising concentration, ownership transitions). A scope where several signals ' +
      'agree is a stronger investigation target than one where a single number looks high.',
    {
      minSignals: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe('Minimum number of signals a scope must trigger to appear. Default 2.'),
      repoPath: z
        .string()
        .optional()
        .describe('Path to the git repository. Defaults to the current directory.'),
    },
    async ({ minSignals, repoPath }) => {
      try {
        const repo = resolveRepo(repoPath);
        // Hotspots need both a lifetime view and a recent (12-month) view.
        const lifetime = await runAnalysis(repo);
        const recent = await runAnalysis(repo, '12m');
        const scopeRisks = buildScopeRisks(lifetime);
        const churn = buildContributorChurn(lifetime);
        const abandoned = buildAbandonedScopes(scopeRisks, churn);
        const transitions = buildOwnershipTransitions(lifetime);
        const temporal = buildTemporalScopeRisks(lifetime, recent);
        const hotspots = buildHotspots(
          { scopeRisks, churn, abandoned, transitions, temporal },
          { minSignals: minSignals ?? 2 },
        );
        return jsonResult({
          hotspots: hotspots.map((h) => ({
            scope: h.scope,
            signalsFired: h.signalsFired,
            signals: h.signals.map((s) => s.reason),
            concentration: h.concentration,
            busFactor: h.busFactor,
          })),
          note: SIGNALS_DISCLAIMER,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  return server;
}

// Entry point: start the server over stdio (the transport agents spawn locally).
export async function startMcpServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio servers run until the parent process closes the pipe.
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}
