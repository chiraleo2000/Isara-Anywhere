import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'group-*.ui-test.ts',
  timeout: 300000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    headless: false,
    viewport: { width: 1440, height: 900 },
    screenshot: 'on',
    trace: 'off',
    actionTimeout: 15000,
    navigationTimeout: 15000,
    launchOptions: {
      slowMo: 300,
      args: [
        '--start-maximized',
        '--auto-accept-camera-and-microphone-capture',
      ],
    },
  },
  projects: [
    {
      name: 'Multi-Portal',
      use: {
        browserName: 'chromium',
        baseURL: 'http://localhost:3005',
      },
    },
  ],
});
