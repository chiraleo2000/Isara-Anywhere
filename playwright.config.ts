/**
 * Issara Anywhere — Playwright config (sibling layout: issara-*)
 * Full project matrix A–W, Defect, MEET, W-core multi-browser.
 * Headed via PW_HEADED=1; screenshots on; HTML → reports/playwright-html.
 */
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(root, '.env') });

const headed = process.env.PW_HEADED === '1' || process.env.PW_HEADED === 'true';
const patientUrl = process.env.PATIENT_URL || 'http://127.0.0.1:3005';
const doctorUrl = process.env.DOCTOR_URL || 'http://127.0.0.1:3010';
const meetingUrl = process.env.MEETING_URL || 'http://127.0.0.1:3020';

const chrome = { ...devices['Desktop Chrome'] };
const edge = { ...devices['Desktop Edge'] };
const firefox = { ...devices['Desktop Firefox'] };
const webkit = { ...devices['Desktop Safari'] };
const phoneSm = { ...devices['iPhone 12'] };

export default defineConfig({
  testDir: path.join(root, 'tests'),
  testMatch: /group-.*\.ui-test\.ts$/,
  testIgnore: ['**/e2e/**', '**/unit/**', '**/node_modules/**', '**/output/**'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: Number(process.env.PW_WORKERS || 1),
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/playwright-html' }],
  ],
  outputDir: path.join(root, 'tests/output/test-results'),
  use: {
    headless: !headed,
    // Headed multi-portal runs hang on Firefox when recording traces across 3 browsers.
    trace: headed ? 'off' : 'retain-on-failure',
    screenshot: 'on',
    video: headed ? 'off' : 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    locale: 'th-TH',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'A-auth',
      testMatch: /group-A-auth-access\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'A2b-public-auth',
      testMatch: /group-A2b-public-auth\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'B-patient-portal',
      testMatch: /group-B-patient-portal\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'C-doctor-portal',
      testMatch: /group-C-doctor-portal\.ui-test\.ts$/,
      use: { ...edge, baseURL: doctorUrl },
    },
    {
      name: 'D-appointments',
      testMatch: /group-D-appointment-workflows\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'D-queue-traceability',
      testMatch: /group-D-queue-accept-traceability\.ui-test\.ts$/,
      use: { ...chrome, baseURL: doctorUrl },
    },
    {
      name: 'D-doctor-host',
      testMatch: /group-D-doctor-host-workflow\.ui-test\.ts$/,
      use: { ...edge, baseURL: doctorUrl },
    },
    {
      name: 'E-meeting-clinical',
      testMatch: /group-E-meeting-clinical\.ui-test\.ts$/,
      use: { ...chrome, baseURL: doctorUrl },
    },
    {
      name: 'E-cross-browser',
      testMatch: /group-E-cross-browser-matrix\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'F-phr-health-records',
      testMatch: /group-F-phr-health-records\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'G-livingwill-pdpa',
      testMatch: /group-G-livingwill-pdpa\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'H-content-resources',
      testMatch: /group-H-content-resources-consultants\.ui-test\.ts$/,
      use: { ...chrome, baseURL: doctorUrl },
    },
    {
      name: 'I-admin-notifications',
      testMatch: /group-I-admin-users-notifications\.ui-test\.ts$/,
      use: { ...chrome, baseURL: doctorUrl },
    },
    {
      name: 'J-ai-timeline-map',
      testMatch: /group-J-ai-timeline-map\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'J-patient-jitsi-prejoin',
      testMatch: /group-J-patient-jitsi-prejoin\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'K-accessibility',
      testMatch: /group-K-accessibility\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'L-lab-ordering',
      testMatch: /group-L-lab-ordering\.ui-test\.ts$/,
      use: { ...chrome, baseURL: doctorUrl },
    },
    {
      name: 'M-hardening',
      testMatch: /group-M-hardening\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'N-google-sso',
      testMatch: /group-N-google-sso\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'O-sso-screenshots',
      testMatch: /group-O-sso-screenshots\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'P-workflow-screenshots',
      testMatch: /group-P-workflow-screenshots\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'Q-meeting-lifecycle',
      testMatch: /group-Q-meeting-lifecycle\.ui-test\.ts$/,
      use: { ...chrome, baseURL: doctorUrl },
    },
    {
      name: 'Q2-post-meeting-doctor',
      testMatch: /group-Q2-post-meeting-doctor\.ui-test\.ts$/,
      use: { ...chrome, baseURL: doctorUrl },
    },
    {
      name: 'R-jitsi-role-permissions',
      testMatch: /group-R-jitsi-role-permissions\.ui-test\.ts$/,
      use: { ...chrome, baseURL: meetingUrl },
    },
    {
      name: 'R1-code-breaker',
      testMatch: /group-R1-code-breaker-network\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'S-responsive',
      testMatch: /group-S-responsive\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'S-phone-sm',
      testMatch: /group-S-responsive\.ui-test\.ts$/,
      use: { ...phoneSm, baseURL: patientUrl },
    },
    {
      name: 'U-ui-audit',
      testMatch: /group-U-ui-element-audit\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'W-core-chromium',
      testMatch: /group-W-core-multibrowser\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'W-core-firefox',
      testMatch: /group-W-core-multibrowser\.ui-test\.ts$/,
      use: { ...firefox, baseURL: patientUrl },
    },
    {
      name: 'W-core-webkit',
      testMatch: /group-W-core-multibrowser\.ui-test\.ts$/,
      use: { ...webkit, baseURL: patientUrl },
    },
    {
      name: 'Defect-regression',
      testMatch: /group-Defect-.*\.ui-test\.ts$/,
      use: { ...chrome, baseURL: patientUrl },
    },
    {
      name: 'MEET-auto-meeting',
      testMatch: /group-MEET-auto-meeting\.ui-test\.ts$/,
      use: { ...chrome, baseURL: doctorUrl },
    },
    {
      name: 'smoke-ux',
      testMatch: /group-local-smoke-ux\.ui-test\.ts$/,
      use: { ...chrome },
    },
  ],
  metadata: {
    patientUrl,
    doctorUrl,
    meetingUrl,
    testEnv: process.env.TEST_ENV || 'local',
  },
});
