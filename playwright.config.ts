import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.ui-test.ts',
  timeout: 60000,
  retries: 0,
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'off',
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'UI-Verification',
      use: { browserName: 'chromium' },
    },
  ],
});
