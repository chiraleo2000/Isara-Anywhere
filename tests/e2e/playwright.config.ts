/**
 * =============================================================================
 * PLAYWRIGHT E2E CONFIGURATION — Izara Telemedicine v9.0.0
 * =============================================================================
 * Updated: February 7, 2026
 *
 * 24 spec files, 3 projects:
 *   • Local  — 01-08, 15, 17-24
 *   • Cloud  — 09, 12, 14, 15-24
 *   • All    — everything (all 24 specs)
 *
 * Features:
 *   - Parallel execution with 4 workers
 *   - Headed browser with video + screenshot + trace
 *   - Both portals tested simultaneously
 *   - Full process coverage (all 13 workflows)
 *   - STRICT 200-only, NO test.skip()
 *   - Deep appointment, meeting, EMR, PHR, AI, CDS, content coverage
 * =============================================================================
 */

import { defineConfig, devices } from '@playwright/test';

const isCloud = process.env.TEST_ENV === 'cloud';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  timeout: 180_000,
  expect: { timeout: 30_000 },

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: './test-results/results.json' }],
  ],

  use: {
    headless: false,
    baseURL: isCloud
      ? (process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-hvht4obouq-as.a.run.app')
      : 'http://localhost:3005',
    screenshot: 'on',
    video: 'on',
    trace: 'on-first-retry',
    launchOptions: { slowMo: 100 },
    actionTimeout: 20_000,
    navigationTimeout: isCloud ? 60_000 : 30_000,
  },

  outputDir: './test-results',

  projects: [
    // ================================================================
    // LOCAL — all local specs (01–08, 11, 13, 15)
    // ================================================================
    {
      name: 'Local',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
      testMatch: [
        '**/01-smoke.spec.ts',
        '**/02-api-status.spec.ts',
        '**/03-appointment-workflow.spec.ts',
        '**/04-meeting-workflow.spec.ts',
        '**/05-health-records-emr.spec.ts',
        '**/06-ai-features.spec.ts',
        '**/07-ui-navigation.spec.ts',
        '**/08-content-notifications.spec.ts',
        '**/15-comprehensive-all-workflows.spec.ts',
        '**/17-meeting-full-workflow.spec.ts',
        '**/18-ui-multi-portal-workflow.spec.ts',
        '**/19-deep-appointment-workflow.spec.ts',
        '**/20-deep-meeting-emr-workflow.spec.ts',
        '**/21-deep-health-records-phr.spec.ts',
        '**/22-deep-ai-features-cds.spec.ts',
        '**/23-deep-user-mgmt-notifications.spec.ts',
        '**/24-deep-content-clinical-consultants.spec.ts',
      ],
    },
    // ================================================================
    // CLOUD — cloud specs (09, 12, 14, 15, 16, 17, 18)
    // ================================================================
    {
      name: 'Cloud',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-hvht4obouq-as.a.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
      testMatch: [
        '**/09-cloud-e2e.spec.ts',
        '**/12-cloud-comprehensive.spec.ts',
        '**/14-full-workflow-cloud.spec.ts',
        '**/15-comprehensive-all-workflows.spec.ts',
        '**/16-cloud-all-workflows.spec.ts',
        '**/17-meeting-full-workflow.spec.ts',
        '**/18-ui-multi-portal-workflow.spec.ts',
        '**/19-deep-appointment-workflow.spec.ts',
        '**/20-deep-meeting-emr-workflow.spec.ts',
        '**/21-deep-health-records-phr.spec.ts',
        '**/22-deep-ai-features-cds.spec.ts',
        '**/23-deep-user-mgmt-notifications.spec.ts',
        '**/24-deep-content-clinical-consultants.spec.ts',
      ],
    },
    // ================================================================
    // ALL — every spec (01–16)
    // ================================================================
    {
      name: 'All',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: isCloud
          ? (process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-hvht4obouq-as.a.run.app')
          : 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
    },
  ],
});
