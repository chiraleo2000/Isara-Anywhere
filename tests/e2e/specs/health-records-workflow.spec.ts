/**
 * Health Records (PHR/EMR) Workflow Test
 * Based on: Processes/Health_Records_Processes.md
 * 
 * Tests:
 * - Patient creates/updates PHR profile
 * - Patient adds vital signs
 * - Patient uploads medical documents
 * - Doctor views patient health records
 * - Doctor creates EMR after consultation
 * - Patient views EMR summary
 * - PDPA consent management
 */

import { test, expect, Page } from '@playwright/test';

const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

const TEST_USERS = {
  patient: {
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd',
    name: 'นาย ทดสอบ ระบบ'
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

test.describe('Health Records Workflow', () => {
  
  test('Patient creates and updates PHR profile', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/phr`);
    
    // Update basic information
    await page.click('button:has-text("แก้ไขข้อมูล")');
    
    await page.fill('input[name="bloodType"]', 'O+');
    await page.fill('input[name="weight"]', '70');
    await page.fill('input[name="height"]', '175');
    
    // Add allergies
    await page.click('button:has-text("เพิ่มการแพ้ยา")');
    await page.fill('input[name="allergyName"]', 'Penicillin');
    await page.selectOption('select[name="severity"]', 'high');
    
    // Add chronic conditions
    await page.click('button:has-text("เพิ่มโรคประจำตัว")');
    await page.fill('input[name="condition"]', 'Hypertension');
    await page.fill('input[name="diagnosedYear"]', '2020');
    
    await page.click('button:has-text("บันทึก")');
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    console.log('✅ Patient updated PHR profile');
  });
  
  test('Patient adds vital signs', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/phr/vitals`);
    
    await page.click('button:has-text("บันทึกสัญญาณชีพ")');
    
    // Fill vital signs
    await page.fill('input[name="bloodPressureSystolic"]', '120');
    await page.fill('input[name="bloodPressureDiastolic"]', '80');
    await page.fill('input[name="heartRate"]', '72');
    await page.fill('input[name="temperature"]', '36.8');
    await page.fill('input[name="weight"]', '70');
    await page.fill('input[name="bloodSugar"]', '95');
    
    await page.click('button:has-text("บันทึก")');
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    // Verify vitals appear in chart
    await page.waitForSelector('[data-testid="vitals-chart"]');
    
    console.log('✅ Patient added vital signs');
  });
  
  test('Patient uploads medical documents', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/phr/documents`);
    
    await page.click('button:has-text("อัปโหลดเอกสาร")');
    
    // Upload file (simulated)
    await page.setInputFiles('input[type="file"]', {
      name: 'lab-results.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content')
    });
    
    await page.fill('input[name="documentName"]', 'ผลตรวจเลือด 2026-01-27');
    await page.selectOption('select[name="documentType"]', 'lab_result');
    
    await page.click('button:has-text("อัปโหลด")');
    await page.waitForSelector('text=อัปโหลดสำเร็จ');
    
    console.log('✅ Patient uploaded medical document');
  });
  
  test('Doctor views patient health records', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/patients`);
    
    // Search and select patient
    await page.fill('input[name="search"]', TEST_USERS.patient.name);
    await page.click(`text=${TEST_USERS.patient.name}`);
    
    // Verify PHR tab shows data
    await page.click('button:has-text("ประวัติสุขภาพ")');
    
    // Verify vital signs chart
    await expect(page.locator('[data-testid="vitals-chart"]')).toBeVisible();
    
    // Verify allergies
    await expect(page.locator('text=Penicillin')).toBeVisible();
    
    // Verify chronic conditions
    await expect(page.locator('text=Hypertension')).toBeVisible();
    
    // Verify uploaded documents
    await expect(page.locator('text=ผลตรวจเลือด')).toBeVisible();
    
    console.log('✅ Doctor viewed patient health records');
  });
  
  test('Doctor creates EMR after consultation', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/patients`);
    await page.fill('input[name="search"]', TEST_USERS.patient.name);
    await page.click(`text=${TEST_USERS.patient.name}`);
    
    // Create new EMR
    await page.click('button:has-text("สร้าง EMR")');
    
    // Fill EMR form
    await page.fill('textarea[name="chiefComplaint"]', 'ปวดหัวและเมื่อยตัว');
    await page.fill('textarea[name="presentIllness"]', 'ผู้ป่วยมีอาการปวดหัวมา 3 วัน มีอาการวิงเวียนเล็กน้อย');
    await page.fill('textarea[name="physicalExam"]', 'BP 130/85, HR 75, Temp 37.0');
    await page.fill('textarea[name="assessment"]', 'Tension headache');
    await page.fill('textarea[name="plan"]', 'Paracetamol 500mg PO TID, นัดติดตามใน 1 สัปดาห์');
    
    // Add ICD-10 code
    await page.fill('input[name="icd10"]', 'R51');
    
    await page.click('button:has-text("บันทึก EMR")');
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    console.log('✅ Doctor created EMR');
  });
  
  test('Patient views EMR summary', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/health-history`);
    
    // Find latest EMR
    await page.click('text=ผลการตรวจล่าสุด');
    
    // Verify summary information (not full EMR details)
    await expect(page.locator('text=ปวดหัว')).toBeVisible();
    await expect(page.locator('text=Tension headache')).toBeVisible();
    
    // Verify patient can see recommendations
    await expect(page.locator('text=คำแนะนำจากแพทย์')).toBeVisible();
    
    // Patient should NOT see full clinical details
    await expect(page.locator('text=Physical Exam')).not.toBeVisible();
    
    console.log('✅ Patient viewed EMR summary');
  });
  
  test('PDPA consent management', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/settings/privacy`);
    
    // Verify PDPA consent options
    await expect(page.locator('text=การยินยอมให้ใช้ข้อมูล')).toBeVisible();
    
    // Toggle health data sharing
    await page.click('input[name="shareHealthData"]');
    
    // Verify confirmation dialog
    await expect(page.locator('text=ยืนยันการเปลี่ยนแปลง')).toBeVisible();
    await page.click('button:has-text("ยืนยัน")');
    
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    console.log('✅ Patient updated PDPA consent');
  });
  
});
