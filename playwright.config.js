// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Izara Telemedicine - Playwright Configuration
 * Comprehensive E2E Tests for Admin, Doctor, and Patient Portals
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './scripts/tests/e2e',
  testMatch: '**/*.spec.js',
  
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
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/playwright-results.json' }]
  ],
  
  /* Global timeout - increased for headed mode stability */
  timeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 15000
  },
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL */
    baseURL: 'http://localhost:3010',
    
    /* Headless false for UI visibility */
    headless: !!process.env.CI,
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video off for speed */
    video: 'off',
    
    /* Action timeout - increased for headed mode */
    actionTimeout: 15000,
    
    /* Locale */
    locale: 'th-TH',
    
    /* Timezone */
    timezoneId: 'Asia/Bangkok',
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Launch options for speed */
    launchOptions: {
      slowMo: 0,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'admin-tests',
      testMatch: 'admin.spec.js',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
    {
      name: 'doctor-tests',
      testMatch: 'doctor.spec.js',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
    {
      name: 'patient-tests',
      testMatch: 'patient.spec.js',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
    {
      name: 'workflow-tests',
      testMatch: 'workflows.spec.js',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
    {
      name: 'all-tests',
      testMatch: '*.spec.js',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
  ],

  /* Folder for test artifacts */
  outputDir: 'test-results/playwright-output',

  /* Run your local dev server before starting the tests */
  /* Commented out - assuming Docker containers are already running
  webServer: [
    {
      command: 'docker-compose up -d',
      url: 'http://localhost:3010/health',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
  */
});
