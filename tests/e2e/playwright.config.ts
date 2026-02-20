/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — PLAYWRIGHT E2E CONFIG v11.0.0
 * ═══════════════════════════════════════════════════════════════════════
 * 8 spec files (01-08) | ~530+ tests | 3 projects: Local, Cloud, Cloud-Dev
 * Updated: February 19, 2026
 *
 * Suite:
 *   01: Auth, Health, Multi-User (65 tests)
 *   02: Appointment Full Lifecycle (80 tests)
 *   03: Health Records & EMR (80 tests)
 *   04: Video Meeting & Transcription (65 tests)
 *   05: ★★★ Content Sync & Approval — single-refresh visibility (70 tests)
 *   06: AI Features & CDS (60 tests)
 *   07: Multi-User Concurrent — 5 browser windows (50 tests)
 *   08: Phase 2 AI-HIS — CTM, Geriatric, SOS, Follow-Up (60 tests)
 *
 * Features:
 * - 5 simultaneous users (patient1, patient2, patient3, doctor, admin)
 * - Multi-browser real-time content sync verification
 * - Full meeting lifecycle with AI SOAP / CDS
 * - Phase 2: CTM, Geriatric Screening (8 tools), SOS, Nursing Dashboard
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
  ],
});
