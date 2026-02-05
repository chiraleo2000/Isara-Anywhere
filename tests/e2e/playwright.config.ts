/**
 * Playwright E2E Test Configuration
 * Izara Telemedicine Platform v2.0.0
 * 
 * Tests full workflows with VISIBLE UI (headed mode)
 * Supports both Local and Cloud environments
 * Multiple parallel browser windows for comprehensive testing
 */

import { defineConfig, devices } from '@playwright/test';

// Environment detection
const isCloud = process.env.TEST_ENV === 'cloud';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true, // Enable parallel execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 3, // Multiple workers for parallel tests
  timeout: 180000, // 3 minutes per test for complex workflows
  expect: {
    timeout: 30000, // 30 seconds for assertions
  },
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: './test-results/results.json' }]
  ],

  use: {
    // VISIBLE UI - NOT HEADLESS
    headless: false,

    // Base URL - can be overridden by environment
    baseURL: process.env.TEST_URL || 'http://localhost:3005',

    // Capture screenshot on ALL tests (for documentation)
    screenshot: 'on',

    // Capture video on all tests
    video: 'on',

    // Trace on failure
    trace: 'on-first-retry',

    // Slow down for visibility (make UI interactions visible)
    launchOptions: {
      slowMo: 100, // Reduced for faster tests
    },

    // Action timeout
    actionTimeout: 20000,

    // Navigation timeout
    navigationTimeout: 60000,
  },

  // Output directory for screenshots and videos
  outputDir: './test-results',

  projects: [
    // ====================================================================
    // CORE E2E TESTS - Main consolidated tests (RUN THIS FIRST)
    // ====================================================================
    {
      name: 'Core E2E Tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
      testMatch: ['**/core-e2e.spec.ts', '**/smoke-test.spec.ts'],
    },
    // ====================================================================
    // LOCAL E2E TESTS (all local specs)
    // ====================================================================
    {
      name: 'Local E2E Tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false, // VISIBLE UI
      },
      testIgnore: ['**/cloud-*.spec.ts', '**/cloud*.spec.ts'],
    },
    // ====================================================================
    // PHASE 1 PARALLEL UI - Multi-window tests
    // ====================================================================
    {
      name: 'Phase1-Parallel-UI',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false, // VISIBLE UI
      },
      testMatch: ['**/phase1-parallel-ui-workflow.spec.ts', '**/comprehensive-parallel-ui.spec.ts'],
    },
    // ====================================================================
    // CLOUD E2E TESTS
    // ====================================================================
    {
      name: 'Cloud E2E Tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: false, // VISIBLE UI
      },
      testMatch: ['**/cloud-*.spec.ts', '**/cloud*.spec.ts', '**/core-e2e.spec.ts'],
    },
  ],
});
