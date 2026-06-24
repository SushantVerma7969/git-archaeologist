"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSourceScope = isSourceScope;
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
    'fixtures',
    'flow-typed',
    'flow',
    'node_modules',
    'vendor',
    'third_party',
    'examples',
    'example',
    'mocks',
    '(root)',
]);
function isSourceScope(scope) {
    if (NON_SOURCE_SCOPES.has(scope)) {
        return false;
    }
    // Any dot-prefixed top-level directory is tooling/config, not source.
    if (scope.startsWith('.')) {
        return false;
    }
    return true;
}
//# sourceMappingURL=scopeFilter.js.map