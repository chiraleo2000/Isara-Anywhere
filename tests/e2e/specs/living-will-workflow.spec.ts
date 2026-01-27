/**
 * Living Will Workflow Test
 * Based on: Processes/Living_Will_Processes.md
 * 
 * Tests:
 * - Patient creates Living Will
 * - Patient sets PDPA sharing preferences
 * - Doctor views shared Living Will
 * - Patient updates Living Will
 * - Audit trail verification
 */

import { test, expect, Page } from '@playwright/test';

const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

const TEST_USERS = {
  patient: {
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd'
  },
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024'
  }
};

async function loginPatient(page: Page) {
  await page.goto(`${PATIENT_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USERS.patient.email);
  await page.fill('input[type="password"]', TEST_USERS.patient.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${PATIENT_PORTAL_URL}/**`);
}

async function loginDoctor(page: Page) {
  await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USERS.doctor.email);
  await page.fill('input[type="password"]', TEST_USERS.doctor.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DOCTOR_PORTAL_URL}/**`);
}

test.describe('Living Will Workflow', () => {
  
  test('Patient creates Living Will', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/phr/living-will`);
    
    await page.click('button:has-text("สร้างพินัยกรรมชีวิต")');
    
    // Medical treatment preferences
    await page.check('input[name="resuscitation"]'); // DNR
    await page.check('input[name="lifeSustaining"]'); // No life support
    
    // Pain management
    await page.selectOption('select[name="painManagement"]', 'maximum');
    
    // Organ donation
    await page.check('input[name="organDonation"]');
    await page.fill('textarea[name="organDonationDetails"]', 'ยินยอมบริจาคอวัยวะทั้งหมด');
    
    // Healthcare proxy
    await page.fill('input[name="proxyName"]', 'นาง สมหญิง ระบบดี');
    await page.fill('input[name="proxyRelation"]', 'คู่สมรส');
    await page.fill('input[name="proxyPhone"]', '081-234-5678');
    
    // Additional wishes
    await page.fill('textarea[name="additionalWishes"]', 'ขอให้ครอบครัวอยู่เคียงข้างในช่วงเวลาสุดท้าย');
    
    await page.click('button:has-text("บันทึกและลงนาม")');
    
    // Digital signature
    await page.fill('input[name="signatureName"]', TEST_USERS.patient.email);
    await page.click('button:has-text("ยืนยันลายเซ็น")');
    
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    console.log('✅ Patient created Living Will');
  });
  
  test('Patient sets PDPA sharing preferences for Living Will', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/phr/living-will`);
    
    // Enable sharing with all authorized doctors
    await page.click('button:has-text("ตั้งค่าการแชร์")');
    await page.check('input[name="isSharedWithDoctors"]');
    
    // Verify warning message
    await expect(page.locator('text=จะสามารถเข้าถึงได้โดยแพทย์และผู้ดูแลทุกคน')).toBeVisible();
    
    await page.click('button:has-text("บันทึก")');
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    console.log('✅ Patient enabled Living Will sharing');
  });
  
  test('Doctor views shared Living Will', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/patients`);
    
    // Search patient
    await page.fill('input[name="search"]', 'ทดสอบ');
    await page.click('text=นาย ทดสอบ ระบบ');
    
    // Navigate to PHR tab
    await page.click('button:has-text("ประวัติสุขภาพ")');
    
    // Verify Living Will card is visible
    await expect(page.locator('[data-testid="living-will-card"]')).toBeVisible();
    
    // Verify key preferences are shown
    await expect(page.locator('text=DNR')).toBeVisible();
    await expect(page.locator('text=บริจาคอวัยวะ')).toBeVisible();
    
    // Verify healthcare proxy information
    await expect(page.locator('text=นาง สมหญิง ระบบดี')).toBeVisible();
    
    // Verify doctor can see but not edit
    await expect(page.locator('button:has-text("แก้ไข")')).not.toBeVisible();
    
    console.log('✅ Doctor viewed shared Living Will');
  });
  
  test('Doctor CANNOT view private Living Will', async ({ browser }) => {
    // First, patient disables sharing
    const patientPage = await browser.newPage();
    await loginPatient(patientPage);
    
    await patientPage.goto(`${PATIENT_PORTAL_URL}/phr/living-will`);
    await patientPage.click('button:has-text("ตั้งค่าการแชร์")');
    await patientPage.uncheck('input[name="isSharedWithDoctors"]');
    await patientPage.click('button:has-text("บันทึก")');
    await patientPage.waitForSelector('text=บันทึกสำเร็จ');
    await patientPage.close();
    
    // Now doctor tries to view
    const doctorPage = await browser.newPage();
    await loginDoctor(doctorPage);
    
    await doctorPage.goto(`${DOCTOR_PORTAL_URL}/patients`);
    await doctorPage.fill('input[name="search"]', 'ทดสอบ');
    await doctorPage.click('text=นาย ทดสอบ ระบบ');
    await doctorPage.click('button:has-text("ประวัติสุขภาพ")');
    
    // Living Will should not be visible
    await expect(doctorPage.locator('[data-testid="living-will-card"]')).not.toBeVisible();
    
    // Or shows privacy message
    await expect(doctorPage.locator('text=ผู้ป่วยไม่ได้แชร์พินัยกรรมชีวิต')).toBeVisible();
    
    await doctorPage.close();
    console.log('✅ Doctor cannot view private Living Will');
  });
  
  test('Patient updates Living Will', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/phr/living-will`);
    
    await page.click('button:has-text("แก้ไข")');
    
    // Update pain management preference
    await page.selectOption('select[name="painManagement"]', 'comfort');
    
    // Update additional wishes
    await page.fill('textarea[name="additionalWishes"]', 'อัพเดท: ขอให้ครอบครัวและเพื่อนสนิทอยู่เคียงข้าง');
    
    await page.click('button:has-text("บันทึก")');
    
    // Re-sign updated version
    await page.fill('input[name="signatureName"]', TEST_USERS.patient.email);
    await page.click('button:has-text("ยืนยันลายเซ็น")');
    
    await page.waitForSelector('text=อัพเดทสำเร็จ');
    
    // Verify version number incremented
    await expect(page.locator('text=เวอร์ชัน 2')).toBeVisible();
    
    console.log('✅ Patient updated Living Will');
  });
  
  test('Audit trail records all access', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/phr/living-will`);
    
    // View audit log
    await page.click('button:has-text("ประวัติการเข้าถึง")');
    
    // Verify audit entries
    await expect(page.locator('text=สร้างพินัยกรรมชีวิต')).toBeVisible();
    await expect(page.locator('text=แก้ไขพินัยกรรมชีวิต')).toBeVisible();
    
    // If shared, should see doctor access
    await expect(page.locator('text=ดูโดยแพทย์')).toBeVisible();
    
    // Verify timestamps
    await expect(page.locator('[data-testid="audit-timestamp"]')).toHaveCount({ minimum: 1 });
    
    console.log('✅ Audit trail verified');
  });
  
});
