import { defineConfig, devices } from '@playwright/test';

/**
 * Cloud Test Configuration
 * Tests against deployed Cloud Run services
 */
export default defineConfig({
  testDir: './scripts/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 120000, // Longer timeout for cloud
});
