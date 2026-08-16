// Monorepo-aware Metro config — the default config only resolves within
// this package's own node_modules, but @forumkit/shared and @forumkit/types
// are hoisted to the workspace root's node_modules (symlinked there by npm
// workspaces), not duplicated into this package. Metro needs to be told
// both to watch the monorepo root (so edits to sibling packages trigger a
// rebuild) and to resolve modules from both node_modules locations.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Sibling workspace packages (@forumkit/shared, @forumkit/types) ship their
// TypeScript source directly with no build step (see their package.json
// "main" fields) — same pattern sdk-web already relies on via Vite.
// disableHierarchicalLookup keeps Metro from also walking up past the
// workspace root into anything above the repo.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
