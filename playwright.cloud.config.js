// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Izara Telemedicine - Playwright Cloud Configuration
 * E2E Tests for Cloud Run Deployment
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './scripts/tests/e2e',
  testMatch: '**/cloud-*.spec.js',
  
  /* Run tests in parallel for speed */
  fullyParallel: true,
  
  /* No retries for cloud tests - we want to see all failures */
  retries: 0,
  
  /* Workers */
  workers: 2,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'test-results/cloud-playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/cloud-playwright-results.json' }]
  ],
  
  /* Global timeout - higher for cloud requests */
  timeout: 90000,
  
  /* Expect timeout */
  expect: {
    timeout: 30000
  },
  
  /* Shared settings for cloud tests */
  use: {
    /* Base URL for cloud */
    baseURL: 'https://isara-patient-portal-724889190329.asia-southeast1.run.app',
    
    /* Headless mode for cloud tests */
    headless: true,
    
    /* Collect trace on first retry */
    trace: 'on-first-retry',
    
    /* Screenshot settings */
    screenshot: 'only-on-failure',
    
    /* No slow-mo for cloud tests */
    launchOptions: {
      slowMo: 0,
    },
    
    /* Action timeout */
    actionTimeout: 30000,
    
    /* Navigation timeout */
    navigationTimeout: 60000
  },
});
