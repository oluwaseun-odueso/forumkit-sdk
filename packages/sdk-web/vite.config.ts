import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@forumkit/types': resolve(__dirname, '../types/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        react: resolve(__dirname, 'react.html'),
        vue: resolve(__dirname, 'vue.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
