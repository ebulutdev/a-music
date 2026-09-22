import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@agents': fileURLToPath(new URL('./agents/index.ts', import.meta.url)),
      '@db': fileURLToPath(new URL('./database', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/kie-api': {
        target: 'https://api.kie.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kie-api/, ''),
      },
    },
  },
});
