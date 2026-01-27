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
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Capture video for debugging
    video: 'on-first-retry',
    
    // Trace on failure
    trace: 'on-first-retry',
    
    // Slow down for visibility
    launchOptions: {
      slowMo: 500,
    },
  },

  projects: [
    {
      name: 'Local E2E Tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
      },
    },
    {
      name: 'Cloud E2E Tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
      },
    },
  ],

  // Global setup for auth
  globalSetup: require.resolve('./global-setup.ts'),
});
