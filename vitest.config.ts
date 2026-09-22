import { defineConfig } from 'vitest/config';
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
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['agents/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    css: true,
  },
});
