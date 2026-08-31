import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'esbuild';

// Resolves @import statements in a CSS file into one concatenated string,
// one level deep (none of the imported files import anything themselves -
// verified against the current stylesheet tree, not assumed).
function inlineCssImports(filePath: string): string {
  const raw = readFileSync(filePath, 'utf-8');
  const dir = path.dirname(filePath);
  return raw.replace(/@import\s+['"]([^'"]+)['"];/g, (_match: string, importPath: string) =>
    readFileSync(path.resolve(dir, importPath), 'utf-8'),
  );
}

// Replicates Vite's `?inline` CSS import (used by src/components/forum-kit.ts
// to get a single bundled CSS string to adopt into the shadow root) - esbuild
// has no built-in equivalent, so without this, tsup silently resolves the
// import to an empty object rather than erroring, and the shadow root ends up
// with `<style>[object Object]</style>` instead of real styles.
const inlineCssPlugin: Plugin = {
  name: 'inline-css',
  setup(build) {
    // Keep the `?inline` suffix in the resolved path (rather than stripping
    // it to a clean .css path) - tsup has its own extension-based CSS
    // handling that intercepts anything resolving to a literal .css path
    // regardless of namespace, before onLoad ever runs. Ending in ?inline
    // avoids that.
    build.onResolve({ filter: /\.css\?inline$/ }, (args) => ({
      path: path.resolve(args.resolveDir, args.path),
      namespace: 'inline-css',
    }));
    build.onLoad({ filter: /.*/, namespace: 'inline-css' }, (args) => ({
      contents: inlineCssImports(args.path.replace(/\?inline$/, '')),
      loader: 'text',
    }));
  },
};

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'wrappers/react': 'src/wrappers/react.tsx',
    'wrappers/vue': 'src/wrappers/vue.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Packages in "dependencies"/"peerDependencies" are externalized by tsup
  // automatically; react/react-dom/vue are peer-only so need declaring here.
  external: ['react', 'react-dom', 'vue'],
  esbuildPlugins: [inlineCssPlugin],
});
