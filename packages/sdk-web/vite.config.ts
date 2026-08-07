import { defineConfig } from 'vite';
import { resolve } from 'path';

const API_PROXY_TARGET = process.env.VITE_DEV_API_URL ?? 'http://localhost:3000';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@forumkit/types': resolve(__dirname, '../types/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/auth': API_PROXY_TARGET,
      '/forums': API_PROXY_TARGET,
      '/threads': API_PROXY_TARGET,
      '/moderation': API_PROXY_TARGET,
      '/storage': API_PROXY_TARGET,
    },
  },
});
