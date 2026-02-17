/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — PLAYWRIGHT E2E CONFIG v2.0.0
 * ═══════════════════════════════════════════════════════════════════════
 * Test specs: 15 spec files (00-14) covering ALL pages, features, workflows + Phase 2 + Meeting
 * Projects: Local-API, Local (headed UI), Cloud, Cloud-Dev
 * Updated: February 15, 2026
 *
 * Features:
 * - Multi-user parallel testing (patient, doctor, admin)
 * - Full meeting lifecycle simulation
 * - AI features testing (Req 2.1-2.5, 4.1-4.5)
 * - 500+ comprehensive tests across 40+ sections, 5 users, 10 specs
 * - Patient Portal (15 pages) + Doctor Portal (21 pages) + Meeting Server
 * - ALL FREE TIER: Jitsi Meet, Web Speech API, Gemini, PostgreSQL
 * ═══════════════════════════════════════════════════════════════════════
 */
import { defineConfig, devices } from '@playwright/test';

const isCloud = process.env.TEST_ENV === 'cloud';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,          // Serial execution for workflow tests
  forbidOnly: !!process.env.CI,
  retries: 0,                    // No retries — must pass first time
  workers: 1,                    // Single worker for serial multi-user flows
  timeout: 180_000,              // 3 min per test
  expect: { timeout: 30_000 },
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: './test-results/results.json' }],
  ],
  use: {
    headless: false,             // ★★★ UI VISIBLE — HEADED MODE ★★★
    screenshot: 'on',
    video: 'on',
    trace: 'on-first-retry',
    launchOptions: { 
      slowMo: 50,
      args: ['--start-maximized'],
    },
    actionTimeout: 20_000,
    navigationTimeout: isCloud ? 60_000 : 30_000,
  },
  outputDir: './test-results',
  projects: [
    {
      name: 'Local-API',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false,         // ★★★ HEADED — show UI actions ★★★
      },
      testMatch: ['**/00-unified-comprehensive.spec.ts', '**/01-meeting-workflows.spec.ts', '**/02-v350-workflows.spec.ts', '**/03-v360-comprehensive.spec.ts', '**/04-advanced-coverage.spec.ts', '**/05-multi-user-browser.spec.ts', '**/06-patient-portal-complete.spec.ts', '**/07-doctor-portal-complete.spec.ts', '**/08-workflow-processes-complete.spec.ts', '**/09-meeting-ai-complete.spec.ts', '**/10-admin-metadata-complete.spec.ts', '**/11-phase2-features.spec.ts', '**/12-phase2-ui-browser.spec.ts', '**/13-meeting-workflow-integration.spec.ts', '**/14-multi-browser-meeting.spec.ts'],
    },
    {
      name: 'Local',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false,         // ★★★ HEADED — show UI actions ★★★
      },
      testMatch: ['**/00-unified-comprehensive.spec.ts', '**/01-meeting-workflows.spec.ts', '**/02-v350-workflows.spec.ts', '**/03-v360-comprehensive.spec.ts', '**/04-advanced-coverage.spec.ts', '**/05-multi-user-browser.spec.ts', '**/06-patient-portal-complete.spec.ts', '**/07-doctor-portal-complete.spec.ts', '**/08-workflow-processes-complete.spec.ts', '**/09-meeting-ai-complete.spec.ts', '**/10-admin-metadata-complete.spec.ts', '**/11-phase2-features.spec.ts', '**/12-phase2-ui-browser.spec.ts', '**/13-meeting-workflow-integration.spec.ts', '**/14-multi-browser-meeting.spec.ts'],
    },
    {
      name: 'Cloud',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-hvht4obouq-as.a.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: false,         // ★★★ HEADED — show UI actions ★★★
      },
      testMatch: ['**/00-unified-comprehensive.spec.ts', '**/01-meeting-workflows.spec.ts', '**/02-v350-workflows.spec.ts', '**/03-v360-comprehensive.spec.ts', '**/04-advanced-coverage.spec.ts', '**/05-multi-user-browser.spec.ts', '**/06-patient-portal-complete.spec.ts', '**/07-doctor-portal-complete.spec.ts', '**/08-workflow-processes-complete.spec.ts', '**/09-meeting-ai-complete.spec.ts', '**/10-admin-metadata-complete.spec.ts', '**/11-phase2-features.spec.ts', '**/12-phase2-ui-browser.spec.ts', '**/13-meeting-workflow-integration.spec.ts', '**/14-multi-browser-meeting.spec.ts'],
    },
    {
      name: 'Cloud-Dev',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: false,         // ★★★ HEADED — show UI actions ★★★
      },
      testMatch: ['**/00-unified-comprehensive.spec.ts', '**/01-meeting-workflows.spec.ts', '**/02-v350-workflows.spec.ts', '**/03-v360-comprehensive.spec.ts', '**/04-advanced-coverage.spec.ts', '**/05-multi-user-browser.spec.ts', '**/06-patient-portal-complete.spec.ts', '**/07-doctor-portal-complete.spec.ts', '**/08-workflow-processes-complete.spec.ts', '**/09-meeting-ai-complete.spec.ts', '**/10-admin-metadata-complete.spec.ts', '**/11-phase2-features.spec.ts', '**/12-phase2-ui-browser.spec.ts', '**/13-meeting-workflow-integration.spec.ts', '**/14-multi-browser-meeting.spec.ts'],
    },
  ],
});
