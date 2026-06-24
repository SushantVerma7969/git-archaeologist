// Single source of truth for which top-level scopes count as "source".
//
// Risk views (hotspots, temporal, bus factor, the treemap) are about
// engineering continuity, so tooling, CI config, docs, fixtures, vendored
// and generated trees are excluded. One-person ownership of .github or
// flow-typed is not a maintenance gap worth surfacing, and including it
// drowns the scopes that are.
const NON_SOURCE_SCOPES = new Set([
  '.github',
  '.circleci',
  '.husky',
  '.vscode',
  '.claude',
  '.codesandbox',
  'docs',
  'doc',
  'documentation',
  'website',
  'changelog',
  'changelogs',
  'fixtures',
  'flow-typed',
  'flow',
  'node_modules',
  'vendor',
  'third_party',
  'examples',
  'example',
  'demo',
  'demos',
  'mocks',
  // assets / branding — one person owning the logo is not a maintenance gap
  'media',
  'assets',
  'asset',
  'images',
  'image',
  'img',
  'logo',
  'logos',
  'brand',
  'branding',
  // tests / benchmarks — continuity risk is about shipped source, not the
  // test or perf harness, which is typically touched by one author
  'test',
  'tests',
  'test-d',
  '__tests__',
  'spec',
  'specs',
  'e2e',
  'cypress',
  'benchmark',
  'benchmarks',
  'bench',
  'perf',
  'perf-testing',
  'performance',
  // build / CI artifacts and meta
  '_artifacts',
  'artifacts',
  'tooling',
  'ci',
  '(root)',
]);

export function isSourceScope(scope: string): boolean {
  if (NON_SOURCE_SCOPES.has(scope)) {
    return false;
  }
  // Any dot-prefixed top-level directory is tooling/config, not source.
  if (scope.startsWith('.')) {
    return false;
  }
  // Underscore-prefixed top-level directories are conventionally generated or
  // build artifacts (e.g. _artifacts, _site, _build), not maintained source.
  if (scope.startsWith('_')) {
    return false;
  }
  return true;
}
