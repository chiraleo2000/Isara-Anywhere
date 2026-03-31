import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.ui-test.ts',
  timeout: 180000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  use: {
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
        '--start-maximized',
        '--auto-accept-camera-and-microphone-capture',
      ],
    },
  },
  projects: [
    // ── PATIENT: Chrome ──────────────────────────────────────────
    {
      name: 'Patient-Chrome',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        channel: 'chrome',
        baseURL: 'http://localhost:3005',
      },
    },
    // ── DOCTOR: Edge ─────────────────────────────────────────────
    {
      name: 'Doctor-Edge',
      use: {
        ...devices['Desktop Edge'],
        browserName: 'chromium',
        channel: 'msedge',
        baseURL: 'http://localhost:3010',
      },
    },
    // ── ADMIN: Firefox ───────────────────────────────────────────
    {
      name: 'Admin-Firefox',
      use: {
        ...devices['Desktop Firefox'],
        browserName: 'firefox',
        baseURL: 'http://localhost:3010',
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.permission.disabled': true,
            'permissions.default.microphone': 1,
            'permissions.default.camera': 1,
          },
        },
      },
    },
    // ── ALL BROWSERS (legacy compatibility) ──────────────────────
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
