import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3010,
        host: '0.0.0.0',
        strictPort: true,
        open: true,
        proxy: {
          // /api/storage removed — GCS API server no longer exists.
          // Proxy /api/content requests to Main API server (medical content, clinical resources — PostgreSQL)
          '/api/content': {
            target: 'http://localhost:3009',
            changeOrigin: true,
            secure: false,
          },
          // Proxy /api/consultants requests to Main API server (PostgreSQL)
          '/api/consultants': {
            target: 'http://localhost:3009',
            changeOrigin: true,
            secure: false,
          },
          // /api/doctors handled by main API server via /api proxy below
          // Proxy /api requests to Main API server (clinical operations)
          '/api': {
            target: 'http://localhost:3009',
            changeOrigin: true,
            secure: false,
          },
          // Proxy /auth requests to Auth server
          '/auth': {
            target: 'http://localhost:3011',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor': ['react', 'react-dom'],
              'ui': ['@headlessui/react'],
            }
          }
        }
      },
      optimizeDeps: {
        include: ['react', 'react-dom']
      },
    };
});
