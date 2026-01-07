import path from 'path';
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
          // Proxy /api/storage requests to GCS API server (storage operations)
          '/api/storage': {
            target: 'http://localhost:3012',
            changeOrigin: true,
            secure: false,
          },
          // Proxy /api/content requests to GCS API server (medical content, clinical resources)
          '/api/content': {
            target: 'http://localhost:3012',
            changeOrigin: true,
            secure: false,
          },
          // Proxy /api/consultants requests to GCS API server
          '/api/consultants': {
            target: 'http://localhost:3012',
            changeOrigin: true,
            secure: false,
          },
          // Proxy /api/doctors requests to GCS API server
          '/api/doctors': {
            target: 'http://localhost:3012',
            changeOrigin: true,
            secure: false,
          },
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
      }
    };
});
