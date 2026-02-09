/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — PLAYWRIGHT E2E CONFIG v1.4.6
 * ═══════════════════════════════════════════════════════════════════════
 * Single unified spec: 00-unified-comprehensive.spec.ts
 * Projects: Local (Docker), Cloud (Google Cloud Run)
 * Mode: HEADED — UI visible for all tests
 * Updated: February 9, 2026
 * ═══════════════════════════════════════════════════════════════════════
 */
import { defineConfig, devices } from '@playwright/test';

const isCloud = process.env.TEST_ENV === 'cloud';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,          // Serial execution for workflow tests
  forbidOnly: !!process.env.CI,
  retries: 0,                    // No retries — must pass first time
  workers: 1,                    // Single worker for serial multi-user flows
  timeout: 180_000,              // 3 min per test
  expect: { timeout: 30_000 },
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: './test-results/results.json' }],
  ],
  use: {
    headless: false,             // ★ UI VISIBLE — HEADED MODE
    screenshot: 'on',
    video: 'on',
    trace: 'on-first-retry',
    launchOptions: { slowMo: 50 },
    actionTimeout: 20_000,
    navigationTimeout: isCloud ? 60_000 : 30_000,
  },
  outputDir: './test-results',
  projects: [
    {
      name: 'Local',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
      testMatch: ['**/00-unified-comprehensive.spec.ts'],
    },
    {
      name: 'Cloud',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-hvht4obouq-as.a.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
      testMatch: ['**/00-unified-comprehensive.spec.ts'],
    },
  ],
});
