/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — PLAYWRIGHT E2E CONFIG v16.0.0
 * ═══════════════════════════════════════════════════════════════════════
 * Reorganized: March 13, 2026
 *
 * KEY CHANGES (v16):
 * - ALL runs are HEADED (no headless) — UI always visible
 * - Local (Docker): full 20-spec suite, parallel for speed
 * - Cloud: essential 12-spec suite, serial sequential workflow,
 *   single auth flow (global-setup caches 5 tokens ONCE)
 * - Removed 10 redundant specs absorbed into parent specs
 * - Cloud-Dev: same as Local but against dev cloud URLs
 *
 * ── REMOVED SPECS (absorbed into parent specs) ─────────────────────
 *   18-appointment-pipeline  → absorbed by 03 appointment-lifecycle
 *   19-phr-cross-portal-sync → absorbed by 04 + 15 health-records
 *   20-ai-pipeline-man-in-loop → absorbed by 07 ai-features
 *   21-content-rejection-recovery → absorbed by 06 content-sync
 *   22-notification-triggers → absorbed by 17 notification-settings
 *   23-mixed-simultaneous-workflows → absorbed by 08 multi-user
 *   28a/28b page verification → absorbed by 01 user-accounts
 *   28c api-health → absorbed by 02 auth-health
 *
 * ── LOCAL (20 specs, ~1200 tests) ──────────────────────────────────
 *   01: User Accounts, Pages & Navigation            (91 tests)
 *   02: System Health & Multi-User Auth               (82 tests)
 *   03: Appointment Full Lifecycle                    (92 tests)
 *   04: Health Records & EMR                          (95 tests)
 *   05: Video Meeting & Transcription                 (91 tests)
 *   06: Content Sync & Approval                       (82 tests)
 *   07: AI Features & CDS                             (72 tests)
 *   08: Multi-User Concurrent — 5 browsers            (60 tests)
 *   09: Phase 2 AI-HIS — CTM, Geriatric, SOS          (72 tests)
 *   10: Lab Orders, Imaging, Map Features             (80 tests)
 *   11: Doctor Portal Workflows                       (50 tests)
 *   12: Patient Portal Workflows                      (50 tests)
 *   13: Multi-User Appointment & Meeting              (40 tests)
 *   14: Admin Management Workflows                    (40 tests)
 *   15: PHR/EMR Data Flow                             (40 tests)
 *   16: Medical Content & Clinical Resources          (40 tests)
 *   17: Notification, Settings & Living Will          (40 tests)
 *   24: Registration Approval Metadata                (10 tests)
 *   25: Register + Login Doctor                       (24 tests)
 *   26: Register + Login Patient                      (25 tests)
 *
 * ── CLOUD (12 specs, serial one-go workflow) ───────────────────────
 *   Step 1: 02 Health & Auth (API health + auth validation)
 *   Step 2: 25 Register Doctor → 26 Register Patient → 24 Approval
 *   Step 3: 01 All Pages Navigation (patient + doctor)
 *   Step 4: 03 Appointment Full Lifecycle
 *   Step 5: 04 Health Records & EMR
 *   Step 6: 10 Lab & Imaging Orders
 *   Step 7: 06 Content Sync & Approval
 *   Step 8: 07 AI Features & CDS
 *   Step 9: 14 Admin Management
 *   Step 10: 30 Full Pipeline (Appointment→Meeting→AI→EMR→Patient)
 *
 * Auth strategy:
 *   - global-setup.ts logs in ALL 5 users via API ONCE
 *   - Tokens cached to .auth-cache.json + storageState per role
 *   - Specs read cache — ZERO re-authentication
 *   - Only specs 25+26 test login UI explicitly (coverage)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { defineConfig, devices } from '@playwright/test';

const isCloud = process.env.TEST_ENV === 'cloud';
const isCloudDev = process.env.TEST_ENV === 'cloud-dev';
const parallelWorkers = Number.parseInt(process.env.PW_WORKERS || '2', 10);

// ── LOCAL: Full 20-spec coverage (parallel, headed) ─────────────────
const LOCAL_SPECS = [
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
  '**/24-registration-approval-e2e.spec.ts',
  '**/25-register-login-doctor.spec.ts',
  '**/26-register-login-patient.spec.ts',
  '**/99-unified-single-login.spec.ts',
];

// Browser-role mapping is handled INSIDE tests via getBrowserForRole():
//   Patient → Chrome, Doctor → Edge, Admin → Firefox
// The Playwright project runs ALL specs once; tests open the right browser per role.

// ── CLOUD: Essential 12-spec one-go workflow (serial, headed) ───────
// Ordered as a user-journey: health → register → pages → workflows → pipeline
const CLOUD_SPECS = [
  '**/02-auth-health-multiuser.spec.ts',
  '**/25-register-login-doctor.spec.ts',
  '**/26-register-login-patient.spec.ts',
  '**/24-registration-approval-e2e.spec.ts',
  '**/01-user-accounts-demo-pages.spec.ts',
  '**/03-appointment-lifecycle.spec.ts',
  '**/04-health-records-emr.spec.ts',
  '**/10-lab-imaging-map-features.spec.ts',
  '**/06-content-sync-approval.spec.ts',
  '**/07-ai-features-cds.spec.ts',
  '**/14-admin-management-workflows.spec.ts',
  '**/30-appointment-meeting-ai-pipeline.spec.ts',
];

// ── Shared browser launch args ──────────────────────────────────────
const LAUNCH_ARGS = ['--start-maximized', '--disable-gpu', '--no-sandbox'];

export default defineConfig({
  globalSetup: './global-setup.ts',
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: isCloud || isCloudDev ? 1 : 0,
  workers: isCloud ? 1 : parallelWorkers,  // Cloud: serial (1 worker) | Local: parallel
  timeout: isCloud ? 180_000 : 60_000,    // Local: 60s per test | Cloud: 180s
  expect: { timeout: isCloud ? 30_000 : 15_000 },
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: './test-results/results.json' }],
  ],
  use: {
    headless: false,              // UI always visible for full visual testing
    screenshot: 'on',             // Screenshot every test for visual proof
    video: 'retain-on-failure',   // Video on failures for debugging
    trace: 'on-first-retry',
    launchOptions: {
      args: LAUNCH_ARGS,
      timeout: 60_000,
    },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  outputDir: './test-results',
  projects: [
    // ── LOCAL: Chrome default, all 20 specs run ONCE ──────────────
    // Tests use getBrowserForRole() for multi-browser within a test:
    //   Patient → Chrome, Doctor → Edge, Admin → Firefox
    {
      name: 'Local',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: 'http://localhost:3005',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
      testMatch: LOCAL_SPECS,
    },
    {
      name: 'Cloud',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: false,
        screenshot: 'on',
        video: 'on',
        trace: 'on',
        launchOptions: {
          args: LAUNCH_ARGS,
          slowMo: 300,              // Slight delay for cloud network + snapshot visibility
          timeout: 120_000,
        },
      },
      testMatch: CLOUD_SPECS,
    },
    {
      name: 'Cloud-Dev',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
      testMatch: LOCAL_SPECS,       // Cloud-Dev runs full suite like Local
    },
  ],
});
