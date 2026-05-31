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
 * Workers: PW_WORKERS (default 1 local, 4 cloud) for parallel groups; D→E→F stay serial.
 * Jitsi multi-party fixture (parallel launch): Patient=Chrome, Doctor=Chrome, Admin=Firefox.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { defineConfig } from '@playwright/test';
import { chromiumLaunchArgs } from './tests/helpers/browser-matrix';

const CLOUD_DEFAULTS = {
  patient: 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
  doctor: 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
  meeting: 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app',
};

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const BASELINE_VISUAL =
  process.env.BASELINE_VISUAL === '1' ||
  process.env.BASELINE_VISUAL === 'true';
const FORCE_HEADED =
  process.env.PW_HEADED === '1' ||
  process.env.PW_HEADED === 'true' ||
  BASELINE_VISUAL;
const USE_HEADLESS =
  process.env.PW_HEADLESS === '1' ||
  (IS_CLOUD && !FORCE_HEADED && !BASELINE_VISUAL);
const BASELINE_SCREENSHOT =
  BASELINE_VISUAL ? ('on' as const) : ('only-on-failure' as const);
const PRE_DEBUG_OUTPUT = BASELINE_VISUAL
  ? 'test-results/pre-debug'
  : 'test-results';
if (IS_CLOUD) {
  process.env.CLOUD_PATIENT_URL ||= CLOUD_DEFAULTS.patient;
  process.env.CLOUD_DOCTOR_URL ||= CLOUD_DEFAULTS.doctor;
  process.env.CLOUD_MEETING_URL ||= CLOUD_DEFAULTS.meeting;
}
// Local default 1 worker (one 3-browser fixture). Set PW_WORKERS=4 to parallelize B/C/G/H/I/J.
const workers = Number.parseInt(process.env.PW_WORKERS || (IS_CLOUD ? '4' : '1'), 10);

function resolveSlowMo(headless: boolean, isCloud: boolean): number {
  if (headless) return 0;
  return isCloud ? 300 : 150;
}

function resolvePlaywrightChannel(headless: boolean): string | undefined {
  if (headless) return undefined;
  return process.platform === 'win32' ? 'chrome' : undefined;
}

const sharedUse = {
  headless: USE_HEADLESS,
  viewport: { width: 1440, height: 900 } as const,
  screenshot: BASELINE_SCREENSHOT,
  trace: 'off' as const,
  actionTimeout: IS_CLOUD ? 20_000 : 15_000,
  navigationTimeout: IS_CLOUD ? 90_000 : 15_000,
  launchOptions: {
    slowMo: resolveSlowMo(USE_HEADLESS, IS_CLOUD),
    args: chromiumLaunchArgs(USE_HEADLESS),
  },
  browserName: 'chromium' as const,
  baseURL: IS_CLOUD
    ? (process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app')
    : 'http://localhost:3005',
};

/** 5" phone through 13" tablet matrix (Group S). */
const RESPONSIVE_VIEWPORTS = {
  phoneXs: { width: 320, height: 568 },
  phoneSm: { width: 360, height: 780 },
  phoneMd: { width: 390, height: 844 },
  phoneLg: { width: 430, height: 932 },
  tabletSm: { width: 600, height: 960 },
  tabletMd: { width: 768, height: 1024 },
  tabletLg: { width: 1024, height: 1366 },
  desktop: { width: 1440, height: 900 },
} as const;

const RESPONSIVE_PROJECTS = [
  { name: 'S-phone-xs', viewport: RESPONSIVE_VIEWPORTS.phoneXs },
  { name: 'S-phone-sm', viewport: RESPONSIVE_VIEWPORTS.phoneSm },
  { name: 'S-phone-md', viewport: RESPONSIVE_VIEWPORTS.phoneMd },
  { name: 'S-phone-lg', viewport: RESPONSIVE_VIEWPORTS.phoneLg },
  { name: 'S-tablet-sm', viewport: RESPONSIVE_VIEWPORTS.tabletSm },
  { name: 'S-tablet-md', viewport: RESPONSIVE_VIEWPORTS.tabletMd },
  { name: 'S-tablet-lg', viewport: RESPONSIVE_VIEWPORTS.tabletLg },
] as const;

export default defineConfig({
  testDir: './tests',
  outputDir: PRE_DEBUG_OUTPUT,
  timeout: IS_CLOUD ? 420_000 : 300_000,
  retries: 0,
  workers,
  maxFailures: 10,
  forbidOnly: true,
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
    {
      name: 'Defect-regression',
      testMatch: /group-Defect-.*\.ui-test\.ts/,
      dependencies: ['A-auth'],
    },

    /* ── SEQUENTIAL PIPELINE (D → E → F) ────────────────────────── */
    {
      name: 'D-appointments',
      testMatch: 'group-D-appointment-workflows.ui-test.ts',
      dependencies: ['A-auth'],
    },
    {
      name: 'D-doctor-host',
      testMatch: 'group-D-doctor-host-workflow.ui-test.ts',
      dependencies: ['D-appointments'],
      use: {
        channel: resolvePlaywrightChannel(USE_HEADLESS),
      },
    },
    {
      name: 'Q-meeting-lifecycle',
      testMatch: 'group-Q-meeting-lifecycle.ui-test.ts',
      dependencies: ['D-appointments', 'D-doctor-host'],
      timeout: IS_CLOUD ? 900_000 : 600_000,
    },
    {
      name: 'R1-code-breaker-network',
      testMatch: 'group-R1-code-breaker-network.ui-test.ts',
      dependencies: ['D-appointments'],
      timeout: IS_CLOUD ? 600_000 : 300_000,
    },
    {
      name: 'E-meeting-clinical',
      testMatch: /group-E-(meeting-clinical|cross-browser-matrix)\.ui-test\.ts/,
      dependencies: ['D-appointments', 'Q-meeting-lifecycle'],  // Q validates 3-party lifecycle before E clinical extras
      // Jitsi multi-party: Chrome (patient) + Chrome (doctor) + Firefox (admin) — parallel launch in multi-portal.ts
    },
    {
      name: 'F-phr-health-records',
      testMatch: 'group-F-phr-health-records.ui-test.ts',
      dependencies: ['E-meeting-clinical'],  // must run AFTER E completes meeting
    },
    {
      name: 'L-lab-ordering',
      testMatch: 'group-L-lab-ordering.ui-test.ts',
      dependencies: ['E-meeting-clinical'],
    },

    /* ── A11Y GATE (runs after auth, independent) ───────────────── */
    {
      name: 'K-accessibility',
      testMatch: 'group-K-accessibility.ui-test.ts',
      dependencies: ['A-auth'],
    },

    /* ── HARDENING + SSO (no data dependencies — API + UI smoke) ── */
    {
      name: 'M-hardening',
      testMatch: 'group-M-hardening.ui-test.ts',
    },
    {
      name: 'N-google-sso',
      testMatch: 'group-N-google-sso.ui-test.ts',
    },
    {
      name: 'O-sso-screenshots',
      testMatch: 'group-O-sso-screenshots.ui-test.ts',
      dependencies: ['A-auth'],
    },
    {
      name: 'P-workflow-screenshots',
      testMatch: 'group-P-workflow-screenshots.ui-test.ts',
      dependencies: ['A-auth', 'D-appointments'],
    },

    /* ── RESPONSIVE LAYOUT (7 viewports: 5" phone – 13" tablet) ─── */
    ...RESPONSIVE_PROJECTS.map((rp) => ({
      name: rp.name,
      testMatch: 'group-S-responsive.ui-test.ts',
      dependencies: ['A-auth'],
      use: {
        ...sharedUse,
        viewport: rp.viewport,
      },
    })),
  ],
});
