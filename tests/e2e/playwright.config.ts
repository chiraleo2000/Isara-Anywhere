/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — PLAYWRIGHT E2E CONFIG v15.0.0
 * ═══════════════════════════════════════════════════════════════════════
 * 29 spec files (01-29) | ~1400 tests | 3 projects: Local, Cloud, Cloud-Dev
 * Updated: March 9, 2026
 *
 * Suite:
 *   01: User Accounts Demo, Password Reset & All Pages (91 tests)
 *   02: System Health & Multi-User Auth (82 tests)
 *   03: Appointment Full Lifecycle (92 tests)
 *   04: Health Records & EMR (95 tests)
 *   05: Video Meeting & Transcription (91 tests)
 *   06: Content Sync & Approval (82 tests)
 *   07: AI Features & CDS (72 tests)
 *   08: Multi-User Concurrent — 5 browser windows (60 tests)
 *   09: Phase 2 AI-HIS — CTM, Geriatric, SOS (72 tests)
 *   10: Lab Orders, Imaging Orders, Map & v1.5.2 Features (80 tests)
 *   11: Doctor Portal Workflows — Browser (50 tests)
 *   12: Patient Portal Workflows — Browser (50 tests)
 *   13: Multi-User Appointment & Meeting (40 tests)
 *   14: Admin Management Workflows (40 tests)
 *   15: PHR/EMR Data Flow (40 tests)
 *   16: Medical Content & Clinical Resources (40 tests)
 *   17: Notification, Settings & Living Will (40 tests)
 *   18: Appointment Pipeline E2E (10 tests)
 *   19: PHR Cross-Portal Sync (12 tests)
 *   20: AI Pipeline Man-in-Loop (10 tests)
 *   21: Content Rejection Recovery (12 tests)
 *   22: Notification Triggers (12 tests)
 *   23: Mixed Simultaneous Workflows (10 tests)
 *   24: Registration Approval Metadata (10 tests)
 *
 * Parallel strategy:
 * - All specs run with fullyParallel=true across workers
 * - Spec 08 (multi-user concurrent) requires serial execution
 * ═══════════════════════════════════════════════════════════════════════
 */
import { defineConfig, devices } from '@playwright/test';

const isCloud = process.env.TEST_ENV === 'cloud';
const isCI = process.env.CI === 'true';
// Headed mode: fewer workers to avoid browser launch timeouts
const parallelWorkers = parseInt(process.env.PW_WORKERS || (isCI ? '6' : '3'), 10);

const SPEC_FILES = [
  '**/01-user-accounts-demo-pages.spec.ts',
  '**/02-auth-health-multiuser.spec.ts',
  '**/03-appointment-lifecycle.spec.ts',
  '**/04-health-records-emr.spec.ts',
  '**/05-video-meeting-transcription.spec.ts',
  '**/06-content-sync-approval.spec.ts',
  '**/07-ai-features-cds.spec.ts',
  '**/08-multi-user-concurrent.spec.ts',
  '**/09-phase2-ai-his.spec.ts',
  '**/10-lab-imaging-map-features.spec.ts',
  '**/11-doctor-portal-workflows.spec.ts',
  '**/12-patient-portal-workflows.spec.ts',
  '**/13-multi-user-appointment-workflow.spec.ts',
  '**/14-admin-management-workflows.spec.ts',
  '**/15-phr-emr-data-flow.spec.ts',
  '**/16-medical-content-workflows.spec.ts',
  '**/17-notification-settings-workflows.spec.ts',
  '**/18-appointment-pipeline-e2e.spec.ts',
  '**/19-phr-cross-portal-sync.spec.ts',
  '**/20-ai-pipeline-man-in-loop.spec.ts',
  '**/21-content-rejection-recovery.spec.ts',
  '**/22-notification-triggers.spec.ts',
  '**/23-mixed-simultaneous-workflows.spec.ts',
  '**/24-registration-approval-e2e.spec.ts',
  '**/25-register-login-doctor.spec.ts',
  '**/26-register-login-patient.spec.ts',
  '**/27-lab-data-doctor-to-patient.spec.ts',
  '**/28-all-pages-data-verification.spec.ts',
  '**/29-chat-ai-summary-cloud.spec.ts',
];

// Cloud: essential specs + new critical specs (register, lab, pages, chat/summary)
const CLOUD_SPEC_FILES = [
  '**/01-user-accounts-demo-pages.spec.ts',
  '**/02-auth-health-multiuser.spec.ts',
  '**/10-lab-imaging-map-features.spec.ts',
  '**/25-register-login-doctor.spec.ts',
  '**/26-register-login-patient.spec.ts',
  '**/27-lab-data-doctor-to-patient.spec.ts',
  '**/28-all-pages-data-verification.spec.ts',
  '**/29-chat-ai-summary-cloud.spec.ts',
];

export default defineConfig({
  globalSetup: './global-setup.ts',
  testDir: './specs',
  fullyParallel: true,            // PARALLEL — each spec's tests run concurrently
  forbidOnly: !!process.env.CI,
  retries: isCloud ? 1 : 0,       // 1 retry on cloud for transient network issues
  workers: parallelWorkers,       // Multiple workers for speed (default 4)
  timeout: 180_000,               // 3 min per test
  expect: { timeout: 30_000 },
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: './test-results/results.json' }],
  ],
  use: {
    headless: isCI,               // HEADED by default! Only headless in CI
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--start-maximized', '--disable-gpu', '--no-sandbox'],
      timeout: 120_000,   // 2 min to launch browser (avoid timeout on multi-context)
    },
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  outputDir: './test-results',
  projects: [
    {
      name: 'Local',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false,            // ALWAYS show browser for Local
      },
      testMatch: SPEC_FILES,
    },
    {
      name: 'Cloud',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: false,
        screenshot: 'on',               // Capture EVERY action for cloud verification
        video: 'on',                     // Full video recording
        trace: 'on',                     // Full trace for debugging
        launchOptions: {
          args: ['--start-maximized', '--disable-gpu', '--no-sandbox'],
          slowMo: 500,                   // 500ms between actions for snapshots
          timeout: 120_000,
        },
      },
      testMatch: CLOUD_SPEC_FILES,
    },
    {
      name: 'Cloud-Dev',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
      testMatch: SPEC_FILES,
    },
  ],
});
