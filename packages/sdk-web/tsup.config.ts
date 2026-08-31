import { defineConfig } from 'tsup';

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
});
