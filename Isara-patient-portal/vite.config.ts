import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { VITE_CLIENT_ENV_PREFIXES } from './vite-client-env-prefixes.mjs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  loadEnv(mode, path.resolve(__dirname), VITE_CLIENT_ENV_PREFIXES);
  return {
  root: 'frontend',
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend'),
    },
  },
  server: {
    port: 3005,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      // Only proxy exact /health endpoint, not /health-library etc
      '^/health$': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3004',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'google-vendor': ['@google/generative-ai'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@google/generative-ai'],
  },
  envPrefix: VITE_CLIENT_ENV_PREFIXES,
};
});
