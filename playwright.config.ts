/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — FULL COVERAGE PLAYWRIGHT CONFIG (GROUPS A → J)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Orchestration strategy:
 *
 *   1) Group A (auth) runs FIRST — all other groups depend on it.
 *
 *   2) PARALLEL groups (independent — no data dependencies):
 *      B  Patient Portal pages
 *      C  Doctor & Admin Portal pages
 *      G  Living Will & PDPA
 *      H  Content, Resources & Consultants
 *      I  Admin, Users & Notifications
 *      J  AI Doctor, Timeline, Map & Find Doctors
 *
 *   3) SEQUENTIAL pipeline (data flows between groups):
 *      D  Appointment Workflows   → creates appointment
 *      E  Meeting & Clinical      → uses appointment from D
 *      F  PHR & Health Records    → doctor sends EMR/lab from E
 *
 *   Dependency graph:
 *     A ──┬── B (parallel)
 *         ├── C (parallel)
 *         ├── G (parallel)
 *         ├── H (parallel)
 *         ├── I (parallel)
 *         ├── J (parallel)
 *         └── D (sequential) → E → F
 *
 * Workers: 4 for parallel groups, 1 enforced for D→E→F chain.
 * Each worker opens 3 browsers (patient=Chrome, doctor=Chrome, admin=Firefox).
 * ═══════════════════════════════════════════════════════════════════════
 */
import { defineConfig } from '@playwright/test';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
// Local: 1 worker — ensures only one 3-browser fixture instance runs at a time (avoids 6+ Chrome contention)
const workers = Number.parseInt(process.env.PW_WORKERS || (IS_CLOUD ? '1' : '1'), 10);

const sharedUse = {
  headless: false,
  viewport: { width: 1440, height: 900 } as const,
  screenshot: 'on' as const,
  trace: 'off' as const,
  actionTimeout: IS_CLOUD ? 20_000 : 15_000,
  navigationTimeout: IS_CLOUD ? 90_000 : 15_000,
  launchOptions: {
    slowMo: IS_CLOUD ? 200 : 50,
    args: [
      '--start-maximized',
      '--auto-accept-camera-and-microphone-capture',
    ],
  },
  browserName: 'chromium' as const,
  baseURL: IS_CLOUD
    ? (process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app')
    : 'http://localhost:3005',
};

export default defineConfig({
  testDir: './tests',
  timeout: IS_CLOUD ? 420_000 : 300_000,
  retries: 0,
  workers,
  maxFailures: 10,
  // Increase fixture timeout to 3 min — 3 browser launches + navigations can be slow
  globalTimeout: IS_CLOUD ? 3_600_000 : 1_800_000,
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/full-coverage-results.json' }],
  ],
  use: sharedUse,

  projects: [
    /* ── AUTH GATE (runs first) ──────────────────────────────────── */
    {
      name: 'A-auth',
      testMatch: 'group-A-auth-access.ui-test.ts',
    },

    /* ── PARALLEL GROUPS (B, C, G, H, I, J) ─────────────────────── */
    {
      name: 'B-patient-portal',
      testMatch: 'group-B-patient-portal.ui-test.ts',
      dependencies: ['A-auth'],
    },
    {
      name: 'C-doctor-portal',
      testMatch: 'group-C-doctor-portal.ui-test.ts',
      dependencies: ['A-auth'],
    },
    {
      name: 'G-livingwill-pdpa',
      testMatch: 'group-G-livingwill-pdpa.ui-test.ts',
      dependencies: ['A-auth'],
    },
    {
      name: 'H-content-resources',
      testMatch: 'group-H-content-resources-consultants.ui-test.ts',
      dependencies: ['A-auth'],
    },
    {
      name: 'I-admin-notifications',
      testMatch: 'group-I-admin-users-notifications.ui-test.ts',
      dependencies: ['A-auth'],
    },
    {
      name: 'J-ai-timeline-map',
      testMatch: 'group-J-ai-timeline-map.ui-test.ts',
      dependencies: ['A-auth'],
    },

    /* ── SEQUENTIAL PIPELINE (D → E → F) ────────────────────────── */
    {
      name: 'D-appointments',
      testMatch: 'group-D-appointment-workflows.ui-test.ts',
      dependencies: ['A-auth'],
    },
    {
      name: 'E-meeting-clinical',
      testMatch: 'group-E-meeting-clinical.ui-test.ts',
      dependencies: ['D-appointments'],  // must run AFTER D creates appointments
    },
    {
      name: 'F-phr-health-records',
      testMatch: 'group-F-phr-health-records.ui-test.ts',
      dependencies: ['E-meeting-clinical'],  // must run AFTER E completes meeting
    },

    /* ── A11Y GATE (runs after auth, independent) ───────────────── */
    {
      name: 'K-accessibility',
      testMatch: 'group-K-accessibility.ui-test.ts',
      dependencies: ['A-auth'],
    },
  ],
});
