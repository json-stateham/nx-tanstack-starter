import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/admin',
  plugins: [tanstackStart(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../../dist/apps/admin',
    emptyOutDir: true,
  },
  server: {
    port: 4200,
    proxy: {
      '/api': {
        target: process.env['VITE_API_URL'] ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
