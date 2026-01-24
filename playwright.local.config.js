// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Izara Telemedicine - Playwright Local Configuration
 * E2E Tests for Local Development
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './scripts/tests/e2e',
  testMatch: '**/*.spec.js',
  testIgnore: '**/cloud-*.spec.js',
  
  /* Run tests in parallel for speed */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* More workers for speed */
  workers: process.env.CI ? 2 : 4,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'test-results/local-playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/local-playwright-results.json' }]
  ],
  
  /* Global timeout - increased for headed mode stability */
  timeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000
  },
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL */
    baseURL: 'http://localhost:3010',
    
    /* Headless true for speed */
    headless: true,
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot settings */
    screenshot: 'only-on-failure',
    
    /* No slow motion for faster tests */
    launchOptions: {
      slowMo: 0,
    },
    
    /* Action timeout */
    actionTimeout: 10000,
    
    /* Navigation timeout */
    navigationTimeout: 30000
  },
});
