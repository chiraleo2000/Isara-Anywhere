/**
 * Test account credentials & URL constants shared across E2E tests.
 *
 * Credentials are loaded from environment variables only.
 * Set them in a `.env` file (git-ignored) or CI secrets.
 *
 * Required env vars:
 *   TEST_PATIENT_EMAIL, TEST_PATIENT_PASSWORD
 *   TEST_DOCTOR_EMAIL,  TEST_DOCTOR_PASSWORD
 *   TEST_ADMIN_EMAIL,   TEST_ADMIN_PASSWORD
 */
import { randomUUID } from 'node:crypto';

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}. Set it in .env or CI secrets.`);
  }
  return value;
}

// URLs — HTTP is acceptable for localhost-only test environments // NOSONAR
export const PATIENT_URL = requireEnv('PATIENT_PORTAL_URL', 'http://localhost:3005');
export const DOCTOR_URL  = requireEnv('DOCTOR_PORTAL_URL',  'http://localhost:3010');
export const MEETING_URL = requireEnv('MEETING_SERVER_URL', 'http://localhost:3020');

export const PATIENT_ACCOUNT = {
  email:    requireEnv('TEST_PATIENT_EMAIL', 'demo.test@gmail.com'),
  password: requireEnv('TEST_PATIENT_PASSWORD'),
  name:     'Demo Test Patient',
};

export const DOCTOR_ACCOUNT = {
  email:    requireEnv('TEST_DOCTOR_EMAIL', 'doctor.test@izara.com'),
  password: requireEnv('TEST_DOCTOR_PASSWORD'),
  name:     'Dr. Test Good',
};

export const ADMIN_ACCOUNT = {
  email:    requireEnv('TEST_ADMIN_EMAIL', 'admin.test@izara.com'),
  password: requireEnv('TEST_ADMIN_PASSWORD'),
  name:     'Dr. Admin Kind',
};

/** Generate a unique patient test email (cryptographically random) */
export const newPatientEmail = (): string => `e2e.patient.${randomUUID().slice(0, 8)}@test.com`;

/** Generate a unique doctor test email (cryptographically random) */
export const newDoctorEmail = (): string => `e2e.doctor.${randomUUID().slice(0, 8)}@test.com`;

/** Base screenshot directory */
export const ssDir = 'screenshots';
