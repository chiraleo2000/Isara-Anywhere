/**
 * Playwright E2E Test Configuration
 * Izara Telemedicine Platform
 * 
 * Tests full workflows with visible UI (not headless)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential for workflow tests
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  use: {
    // Show browser UI for testing
    headless: false,

    // Base URL - can be overridden by environment
    baseURL: process.env.TEST_URL || 'http://localhost:3005',

    // Capture screenshot on all tests (for documentation)
    screenshot: 'on',

    // Capture video for debugging
    video: 'on-first-retry',

    // Trace on failure
    trace: 'on-first-retry',

    // Slow down for visibility
    launchOptions: {
      slowMo: 300,
    },
  },

  // Output directory for screenshots
  outputDir: './test-results',

  projects: [
    {
      name: 'Local E2E Tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
      },
      testIgnore: ['**/cloud-*.spec.ts', '**/cloud*.spec.ts'],
    },
    {
      name: 'Cloud E2E Tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-hvht4obouq-as.a.run.app',
      },
      testMatch: ['**/cloud-*.spec.ts', '**/cloud*.spec.ts'],
    },
    {
      name: 'Cloud Full Tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-hvht4obouq-as.a.run.app',
      },
      testIgnore: ['**/cloud-*.spec.ts', '**/cloud*.spec.ts'],
    },
  ],

  // Global setup for auth (disabled - tests handle their own auth)
  // globalSetup: require.resolve('./global-setup.ts'),
});
