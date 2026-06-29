import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@forumkit/types': new URL('../types/src/index.ts', import.meta.url).pathname,
    },
  },
  server: { port: 5174 },
});
