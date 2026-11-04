import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const projectRoot = new URL('.', import.meta.url).pathname;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(projectRoot, 'index.html'),
        dashboard: path.resolve(projectRoot, 'dashboard.html'),
      },
    },
  },
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
});
