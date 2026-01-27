/**
 * Global Setup for Playwright Tests
 * Pre-authenticates users and stores auth state
 */

import { chromium, FullConfig } from '@playwright/test';

const TEST_USERS = {
  patient1: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' },
  patient2: { email: 'Somchai.Mankong@gmail.com', password: 'P@ssw0rd' },
  patient3: { email: 'Anan.Khayanrian@gmail.com', password: 'P@ssw0rd' },
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' },
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' },
};

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch({ headless: true });
  
  console.log('🔐 Setting up authentication states...');
  
  // Create auth states for patient portal
  try {
    const patientPage = await browser.newPage();
    try {
      await patientPage.goto('http://localhost:3005/login');
      await patientPage.fill('input[type="email"]', TEST_USERS.patient1.email);
      await patientPage.fill('input[type="password"]', TEST_USERS.patient1.password);
      await patientPage.click('button[type="submit"]');
      await patientPage.waitForURL('**/dashboard**', { timeout: 10000 });
      await patientPage.context().storageState({ path: 'tests/e2e/.auth/patient.json' });
      console.log('✅ Patient auth state saved');
    } catch (e) {
      console.log('⚠️ Patient auth setup skipped:', (e as Error).message);
    } finally {
      await patientPage.close();
    }
  } catch (e) {
    console.log('⚠️ Patient page creation failed');
  }
  
  // Create auth states for doctor portal
  try {
    const doctorPage = await browser.newPage();
    try {
      await doctorPage.goto('http://localhost:3010/login');
      await doctorPage.fill('input[type="email"]', TEST_USERS.doctor.email);
      await doctorPage.fill('input[type="password"]', TEST_USERS.doctor.password);
      await doctorPage.click('button[type="submit"]');
      await doctorPage.waitForURL('**/dashboard**', { timeout: 10000 });
      await doctorPage.context().storageState({ path: 'tests/e2e/.auth/doctor.json' });
      console.log('✅ Doctor auth state saved');
    } catch (e) {
      console.log('⚠️ Doctor auth setup skipped:', (e as Error).message);
    } finally {
      await doctorPage.close();
    }
  } catch (e) {
    console.log('⚠️ Doctor page creation failed');
  }
  
  // Admin auth
  try {
    const adminPage = await browser.newPage();
    try {
      await adminPage.goto('http://localhost:3010/login');
      await adminPage.fill('input[type="email"]', TEST_USERS.admin.email);
      await adminPage.fill('input[type="password"]', TEST_USERS.admin.password);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL('**/dashboard**', { timeout: 10000 });
      await adminPage.context().storageState({ path: 'tests/e2e/.auth/admin.json' });
      console.log('✅ Admin auth state saved');
    } catch (e) {
      console.log('⚠️ Admin auth setup skipped:', (e as Error).message);
    } finally {
      await adminPage.close();
    }
  } catch (e) {
    console.log('⚠️ Admin page creation failed');
  }
  
  await browser.close();
  console.log('🎉 Global setup complete');
}

export default globalSetup;
