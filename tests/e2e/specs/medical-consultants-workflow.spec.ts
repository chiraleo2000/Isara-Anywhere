/**
 * Medical Consultants Workflow Test
 * Based on: Processes/Medical_Consultants_Workflows.md
 * 
 * Tests:
 * - Admin creates consultant profile
 * - Admin updates consultant information
 * - Doctor views consultant directory
 * - Doctor rates consultant
 * - Admin toggles availability
 * - Search and filter consultants
 */

import { test, expect, Page } from '@playwright/test';

const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

const TEST_USERS = {
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024'
  },
  admin: {
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024'
  }
};

async function loginDoctor(page: Page) {
  await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USERS.doctor.email);
  await page.fill('input[type="password"]', TEST_USERS.doctor.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DOCTOR_PORTAL_URL}/**`);
}

async function loginAdmin(page: Page) {
  await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USERS.admin.email);
  await page.fill('input[type="password"]', TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DOCTOR_PORTAL_URL}/**`);
}

test.describe('Medical Consultants Workflow', () => {
  
  let consultantId: string;
  
  test('Admin creates consultant profile', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    
    await page.click('button:has-text("เพิ่มที่ปรึกษา")');
    
    // Fill basic information
    await page.fill('input[name="fullNameThai"]', 'ศ.นพ. สมชาย ใจดี');
    await page.fill('input[name="fullNameEnglish"]', 'Prof. Dr. Somchai Jaidee');
    await page.fill('input[name="title"]', 'ศาสตราจารย์');
    
    // Select specialty
    await page.selectOption('select[name="specialty"]', 'cardiology');
    
    // Add sub-specialties
    await page.fill('input[name="subSpecialties"]', 'Interventional Cardiology, Heart Failure');
    
    // Contact information
    await page.fill('input[name="email"]', 'somchai.jaidee@hospital.th');
    await page.fill('input[name="phone"]', '02-123-4567');
    await page.fill('input[name="hospitalAffiliation"]', 'โรงพยาบาลจุฬาลงกรณ์');
    
    // Availability
    await page.fill('input[name="availableDays"]', 'จันทร์-ศุกร์');
    await page.fill('input[name="availableHours"]', '9:00-17:00');
    
    // Credentials
    await page.fill('textarea[name="credentials"]', 'MD, FACC, FSCAI');
    await page.fill('textarea[name="experience"]', 'ประสบการณ์ 20 ปี ในการรักษาโรคหัวใจ');
    
    // Admin notes (internal only)
    await page.fill('textarea[name="adminNotes"]', 'รับปรึกษากรณีซับซ้อน ตอบเร็ว');
    
    await page.click('button:has-text("บันทึก")');
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    // Get consultant ID
    const url = page.url();
    consultantId = url.match(/consultants\/([A-Z0-9-]+)/)?.[1] || '';
    
    console.log('✅ Admin created consultant:', consultantId);
  });
  
  test('Doctor views consultant directory', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    
    // Verify consultant list loads
    await page.waitForSelector('[data-testid="consultant-card"]');
    
    // Verify consultant appears
    await expect(page.locator('text=ศ.นพ. สมชาย ใจดี')).toBeVisible();
    
    // View consultant details
    await page.click('text=ศ.นพ. สมชาย ใจดี');
    
    // Verify details visible (no admin notes)
    await expect(page.locator('text=Cardiology')).toBeVisible();
    await expect(page.locator('text=โรงพยาบาลจุฬาลงกรณ์')).toBeVisible();
    await expect(page.locator('text=02-123-4567')).toBeVisible();
    
    // Admin notes should NOT be visible to doctors
    await expect(page.locator('text=รับปรึกษากรณีซับซ้อน')).not.toBeVisible();
    
    console.log('✅ Doctor viewed consultant directory');
  });
  
  test('Doctor searches and filters consultants', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    
    // Search by name
    await page.fill('input[name="search"]', 'สมชาย');
    await expect(page.locator('text=ศ.นพ. สมชาย ใจดี')).toBeVisible();
    
    // Filter by specialty
    await page.selectOption('select[name="specialtyFilter"]', 'cardiology');
    await expect(page.locator('[data-testid="consultant-card"]')).toHaveCount({ minimum: 1 });
    
    // Filter by availability
    await page.check('input[name="availableOnly"]');
    
    console.log('✅ Doctor filtered consultants');
  });
  
  test('Doctor contacts consultant', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    await page.click('text=ศ.นพ. สมชาย ใจดี');
    
    // Click email
    const emailLink = page.locator('a[href^="mailto:"]');
    await expect(emailLink).toHaveAttribute('href', 'mailto:somchai.jaidee@hospital.th');
    
    // Click phone
    const phoneLink = page.locator('a[href^="tel:"]');
    await expect(phoneLink).toHaveAttribute('href', 'tel:021234567');
    
    console.log('✅ Doctor can contact consultant');
  });
  
  test('Doctor rates and reviews consultant', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    await page.click('text=ศ.นพ. สมชาย ใจดี');
    
    // Add rating
    await page.click('button:has-text("ให้คะแนน")');
    
    // Select 5 stars
    await page.click('[data-testid="star-5"]');
    
    // Add review
    await page.fill('textarea[name="review"]', 'ให้คำปรึกษาดีมาก ตอบเร็ว อธิบายชัดเจน');
    
    await page.click('button:has-text("ส่งรีวิว")');
    await page.waitForSelector('text=ขอบคุณสำหรับรีวิว');
    
    // Verify rating appears
    await expect(page.locator('text=5.0')).toBeVisible();
    await expect(page.locator('text=ให้คำปรึกษาดีมาก')).toBeVisible();
    
    console.log('✅ Doctor rated consultant');
  });
  
  test('Admin updates consultant information', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    await page.click('text=ศ.นพ. สมชาย ใจดี');
    
    await page.click('button:has-text("แก้ไข")');
    
    // Update phone number
    await page.fill('input[name="phone"]', '02-123-9999');
    
    // Update availability
    await page.fill('input[name="availableHours"]', '9:00-16:00');
    
    await page.click('button:has-text("บันทึก")');
    await page.waitForSelector('text=อัพเดทสำเร็จ');
    
    // Verify update
    await expect(page.locator('text=02-123-9999')).toBeVisible();
    
    console.log('✅ Admin updated consultant');
  });
  
  test('Admin toggles consultant availability', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    await page.click('text=ศ.นพ. สมชาย ใจดี');
    
    // Toggle availability off
    await page.click('button:has-text("ปิดการให้บริการชั่วคราว")');
    await page.click('button:has-text("ยืนยัน")');
    
    await page.waitForSelector('text=สถานะอัพเดท');
    
    // Verify status badge
    await expect(page.locator('span:has-text("ไม่พร้อมให้บริการ")')).toBeVisible();
    
    // Doctors should still see but with unavailable status
    await page.goto(`${DOCTOR_PORTAL_URL}/auth/logout`);
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    await page.click('text=ศ.นพ. สมชาย ใจดี');
    
    await expect(page.locator('text=ไม่พร้อมให้บริการ')).toBeVisible();
    
    console.log('✅ Admin toggled availability');
  });
  
  test('Admin deletes consultant', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    await page.click('text=ศ.นพ. สมชาย ใจดี');
    
    await page.click('button:has-text("ลบ")');
    
    // Confirm deletion
    await page.fill('input[name="confirmDelete"]', 'DELETE');
    await page.click('button:has-text("ยืนยันการลบ")');
    
    await page.waitForSelector('text=ลบสำเร็จ');
    
    // Verify consultant no longer in list
    await page.goto(`${DOCTOR_PORTAL_URL}/consultants`);
    await expect(page.locator('text=ศ.นพ. สมชาย ใจดี')).not.toBeVisible();
    
    console.log('✅ Admin deleted consultant');
  });
  
});
