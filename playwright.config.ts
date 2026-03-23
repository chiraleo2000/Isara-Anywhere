import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.ui-test.ts',
  timeout: 180000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: 'on',
    trace: 'off',
    actionTimeout: 30000,
    navigationTimeout: 30000,
    permissions: ['camera', 'microphone', 'notifications'],
    launchOptions: {
      slowMo: 300,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--start-maximized',
      ],
    },
  },
  projects: [
    {
      name: 'UI-Verification',
      use: { browserName: 'chromium' },
    },
    {
      name: 'UI-Local',
      use: {
        browserName: 'chromium',
        baseURL: 'http://localhost:3005',
      },
    },
  ],
});
