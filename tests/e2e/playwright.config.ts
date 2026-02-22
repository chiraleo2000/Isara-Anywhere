/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — PLAYWRIGHT E2E CONFIG v12.0.0
 * ═══════════════════════════════════════════════════════════════════════
 * 10 spec files (01-10) | ~800+ tests | 5 projects: Local, Cloud, Cloud-Dev, Mobile-Local, Mobile-Cloud-Dev
 * Updated: February 21, 2026
 *
 * Suite:
 *   01: Auth, Health, Multi-User (82 tests)
 *   02: Appointment Full Lifecycle (92 tests)
 *   03: Health Records & EMR (95 tests)
 *   04: Video Meeting & Transcription (87 tests)
 *   05: ★★★ Content Sync & Approval — single-refresh visibility (82 tests)
 *   06: AI Features & CDS (72 tests)
 *   07: Multi-User Concurrent — 5 browser windows (60 tests)
 *   08: Phase 2 AI-HIS — CTM, Geriatric, SOS, Follow-Up (72 tests)
 *   09: User Accounts Demo, Password Reset & All Pages (91 tests)
 *   10: Mobile Viewport & Data Streaming Sync (85 tests)
 *
 * Features:
 * - 5 simultaneous users (patient1, patient2, patient3, doctor, admin)
 * - Multi-browser real-time content sync verification
 * - Full meeting lifecycle with AI SOAP / CDS
 * - Phase 2: CTM, Geriatric Screening (8 tools), SOS, Nursing Dashboard
 * - Mobile viewport tests (Android Pixel 7, iPhone 13, iPad Mini)
 * - ALL FREE TIER: Jitsi Meet, Web Speech API, Gemini, PostgreSQL
 * ═══════════════════════════════════════════════════════════════════════
 */
import { defineConfig, devices } from '@playwright/test';

const isCloud = process.env.TEST_ENV === 'cloud';
const isHeadless = process.env.HEADLESS === '1' || process.env.CI === 'true';

const SPEC_FILES = [
  '**/01-auth-health-multiuser.spec.ts',
  '**/02-appointment-lifecycle.spec.ts',
  '**/03-health-records-emr.spec.ts',
  '**/04-video-meeting-transcription.spec.ts',
  '**/05-content-sync-approval.spec.ts',
  '**/06-ai-features-cds.spec.ts',
  '**/07-multi-user-concurrent.spec.ts',
  '**/08-phase2-ai-his.spec.ts',
  '**/09-user-accounts-demo-pages.spec.ts',
  '**/10-mobile-viewport-data-sync.spec.ts',
];

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
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--start-maximized'],
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
        headless: isHeadless,
      },
      testMatch: SPEC_FILES,
    },
    {
      name: 'Cloud',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-hvht4obouq-as.a.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: isHeadless,
      },
      testMatch: SPEC_FILES,
    },
    {
      name: 'Cloud-Dev',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app',
        viewport: { width: 1920, height: 1080 },
        headless: true,
      },
      testMatch: SPEC_FILES,
    },
    {
      name: 'Mobile-Local',
      use: {
        ...devices['Pixel 7'],
        baseURL: 'http://localhost:3005',
        headless: isHeadless,
      },
      testMatch: SPEC_FILES,
    },
    {
      name: 'Mobile-Cloud-Dev',
      use: {
        ...devices['Pixel 7'],
        baseURL: 'https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app',
        headless: true,
      },
      testMatch: SPEC_FILES,
    },
  ],
});
