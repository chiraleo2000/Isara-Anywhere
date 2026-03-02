/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — UNIT TEST CONFIGURATION v1.5.2
 * ═══════════════════════════════════════════════════════════════════════
 * All unit tests live here in tests/unit/ — completely isolated from
 * project source. Tests validate pure logic, data transforms, and
 * security functions without requiring running servers.
 *
 * Parallel execution: Vitest uses thread pool (default) for max speed.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'mobile/**'],
    testTimeout: 30_000,
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: 8,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      '@doctor': path.resolve(__dirname, '../../Isara-doctor-portal/src'),
      '@patient': path.resolve(__dirname, '../../Isara-patient-portal/src'),
      '@meeting': path.resolve(__dirname, '../../Izara-jitsi-server/server'),
    },
  },
});
