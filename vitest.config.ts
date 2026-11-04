import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const projectRoot = new URL('.', import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, './src'),
      '@components': path.resolve(projectRoot, './src/components'),
      '@hooks': path.resolve(projectRoot, './src/hooks'),
      '@models': path.resolve(projectRoot, './src/models'),
      '@services': path.resolve(projectRoot, './src/services'),
      '@context': path.resolve(projectRoot, './src/context'),
      '@utils': path.resolve(projectRoot, './src/utils'),
      '@assets': path.resolve(projectRoot, './src/assets'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 65,
        lines: 75,
      },
    },
  },
});
