/**
 * Global Setup for Playwright Tests
 * Pre-authenticates users and stores auth state
 * 
 * Credentials from environment variables for CI/CD security
 */

import { chromium, FullConfig } from '@playwright/test';

// Get credentials from environment or use defaults for local development
const TEST_USERS = {
  patient1: {
    email: process.env.TEST_PATIENT1_EMAIL || 'demo.test@gmail.com',
    password: process.env.TEST_PATIENT_PASSWORD || process.env.IZARA_PATIENT_PASSWORD || 'P@ssw0rd'
  },
  patient2: {
    email: process.env.TEST_PATIENT2_EMAIL || 'Somchai.Mankong@gmail.com',
    password: process.env.TEST_PATIENT_PASSWORD || process.env.IZARA_PATIENT_PASSWORD || 'P@ssw0rd'
  },
  patient3: {
    email: process.env.TEST_PATIENT3_EMAIL || 'Anan.Khayanrian@gmail.com',
    password: process.env.TEST_PATIENT_PASSWORD || process.env.IZARA_PATIENT_PASSWORD || 'P@ssw0rd'
  },
  doctor: {
    email: process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com',
    password: process.env.TEST_DOCTOR_PASSWORD || process.env.IZARA_DOCTOR_PASSWORD || 'IzaraDoctor@2024'
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin.test@izara.com',
    password: process.env.TEST_ADMIN_PASSWORD || process.env.IZARA_ADMIN_PASSWORD || 'IzaraAdmin@2024'
  },
};

// Portal URLs from environment
const PATIENT_PORTAL = process.env.LOCAL_PATIENT_URL || 'http://localhost:3005';
const DOCTOR_PORTAL = process.env.LOCAL_DOCTOR_URL || 'http://localhost:3010';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch({ headless: true, timeout: 60000 });

  console.log('🔐 Setting up authentication states...');

  // Create auth states for patient portal
  try {
    const context = await browser.newContext();
    const patientPage = await context.newPage();
    try {
      await patientPage.goto(`${PATIENT_PORTAL}/login`, { timeout: 30000 });
      await patientPage.fill('input[type="email"]', TEST_USERS.patient1.email);
      await patientPage.fill('input[type="password"]', TEST_USERS.patient1.password);
      await patientPage.click('button[type="submit"]');
      await patientPage.waitForURL('**/dashboard**', { timeout: 15000 });
      await context.storageState({ path: 'tests/e2e/.auth/patient.json' });
      console.log('✅ Patient auth state saved');
    } catch (e) {
      console.log('⚠️ Patient auth setup skipped:', (e as Error).message);
    } finally {
      await patientPage.close();
      await context.close();
    }
  } catch (error) {
    console.log('⚠️ Patient page creation failed:', (error as Error).message);
  }

  // Create auth states for doctor portal
  try {
    const context = await browser.newContext();
    const doctorPage = await context.newPage();
    try {
      await doctorPage.goto(`${DOCTOR_PORTAL}/login`, { timeout: 30000 });
      await doctorPage.fill('input[type="email"]', TEST_USERS.doctor.email);
      await doctorPage.fill('input[type="password"]', TEST_USERS.doctor.password);
      await doctorPage.click('button[type="submit"]');
      await doctorPage.waitForURL('**/dashboard**', { timeout: 15000 });
      await context.storageState({ path: 'tests/e2e/.auth/doctor.json' });
      console.log('✅ Doctor auth state saved');
    } catch (e) {
      console.log('⚠️ Doctor auth setup skipped:', (e as Error).message);
    } finally {
      await doctorPage.close();
      await context.close();
    }
  } catch (error) {
    console.log('⚠️ Doctor page creation failed:', (error as Error).message);
  }

  // Admin auth
  try {
    const context = await browser.newContext();
    const adminPage = await context.newPage();
    try {
      await adminPage.goto(`${DOCTOR_PORTAL}/login`, { timeout: 30000 });
      await adminPage.fill('input[type="email"]', TEST_USERS.admin.email);
      await adminPage.fill('input[type="password"]', TEST_USERS.admin.password);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL('**/dashboard**', { timeout: 15000 });
      await context.storageState({ path: 'tests/e2e/.auth/admin.json' });
      console.log('✅ Admin auth state saved');
    } catch (e) {
      console.log('⚠️ Admin auth setup skipped:', (e as Error).message);
    } finally {
      await adminPage.close();
      await context.close();
    }
  } catch (error) {
    console.log('⚠️ Admin page creation failed:', (error as Error).message);
  }

  await browser.close();
  console.log('🎉 Global setup complete');
}

export default globalSetup;
