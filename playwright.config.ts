import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.ui-test.ts',
  timeout: 120000,
  retries: 0,
  fullyParallel: true,
  workers: 3,
  use: {
    ...devices['Desktop Chrome'],
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'off',
    actionTimeout: 15000,
    navigationTimeout: 20000,
    permissions: ['camera', 'microphone', 'notifications'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    },
  },
  projects: [
    {
      name: 'UI-Verification',
      use: { browserName: 'chromium' },
    },
  ],
});
