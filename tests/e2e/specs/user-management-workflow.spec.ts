/**
 * User Management Workflow Test
 * Based on: Processes/User_management_Workflows.md
 * 
 * Tests:
 * - Patient self-registration
 * - Email verification
 * - Doctor profile setup
 * - Admin user management
 * - Role assignments
 * - Password reset
 * - Account deactivation
 */

import { test, expect, Page } from '@playwright/test';

const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

async function loginAdmin(page: Page) {
  await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', 'admin.test@izara.com');
  await page.fill('input[type="password"]', 'IzaraAdmin@2024');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DOCTOR_PORTAL_URL}/**`);
}

test.describe('User Management Workflow', () => {
  
  const testPatient = {
    email: `patient.${Date.now()}@test.com`,
    password: 'TestPass@123',
    firstName: 'สมชาย',
    lastName: 'ทดสอบ',
    phone: '0812345678',
    citizenId: '1234567890123'
  };
  
  const testDoctor = {
    email: `doctor.${Date.now()}@test.com`,
    password: 'DoctorPass@123',
    firstName: 'นพ.สมหญิง',
    lastName: 'ใจดี',
    licenseNumber: 'MD12345',
    specialty: 'Internal Medicine'
  };
  
  test('Patient self-registration', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL_URL}/auth/register`);
    
    // Fill registration form
    await page.fill('input[name="email"]', testPatient.email);
    await page.fill('input[name="password"]', testPatient.password);
    await page.fill('input[name="confirmPassword"]', testPatient.password);
    
    // Personal info
    await page.fill('input[name="firstName"]', testPatient.firstName);
    await page.fill('input[name="lastName"]', testPatient.lastName);
    await page.fill('input[name="phone"]', testPatient.phone);
    await page.fill('input[name="citizenId"]', testPatient.citizenId);
    
    // Date of birth
    await page.fill('input[name="birthDate"]', '1990-01-15');
    
    // Gender
    await page.selectOption('select[name="gender"]', 'male');
    
    // Accept terms
    await page.check('input[name="acceptTerms"]');
    await page.check('input[name="acceptPDPA"]');
    
    await page.click('button[type="submit"]');
    
    // Should see verification message
    await expect(page.locator('text=/ส่งอีเมลยืนยัน|verification email/i')).toBeVisible();
    
    console.log('✅ Patient registered:', testPatient.email);
  });
  
  test('Patient email verification', async ({ page }) => {
    // In real scenario, would check email and click verification link
    // For testing, we simulate by directly verifying
    
    await page.goto(`${PATIENT_PORTAL_URL}/auth/verify-email?token=test-token-123`);
    
    // Verify success message or redirect
    await expect(
      page.locator('text=/อีเมลยืนยันสำเร็จ|email verified|ยืนยันสำเร็จ/i')
    ).toBeVisible({ timeout: 3000 });
    
    console.log('✅ Email verification flow tested');
  });
  
  test('Admin creates doctor account', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/admin/users`);
    
    await page.click('button:has-text("เพิ่มผู้ใช้")');
    
    // Select role
    await page.selectOption('select[name="role"]', 'DOCTOR');
    
    // Fill form
    await page.fill('input[name="email"]', testDoctor.email);
    await page.fill('input[name="password"]', testDoctor.password);
    await page.fill('input[name="firstName"]', testDoctor.firstName);
    await page.fill('input[name="lastName"]', testDoctor.lastName);
    
    // Doctor-specific fields
    await page.fill('input[name="licenseNumber"]', testDoctor.licenseNumber);
    await page.selectOption('select[name="specialty"]', 'internal-medicine');
    
    // Department
    await page.selectOption('select[name="department"]', 'outpatient');
    
    await page.click('button:has-text("สร้างบัญชี")');
    await page.waitForSelector('text=สร้างสำเร็จ');
    
    console.log('✅ Admin created doctor account:', testDoctor.email);
  });
  
  test('Doctor completes profile setup', async ({ page }) => {
    await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
    await page.fill('input[type="email"]', testDoctor.email);
    await page.fill('input[type="password"]', testDoctor.password);
    await page.click('button[type="submit"]');
    
    // First login should prompt profile completion
    await expect(page.locator('text=/ข้อมูลเพิ่มเติม|complete profile/i')).toBeVisible({ timeout: 5000 });
    
    // Upload profile photo
    await page.setInputFiles('input[type="file"][name="profilePhoto"]', 'tests/fixtures/doctor-photo.jpg');
    
    // Professional info
    await page.fill('textarea[name="bio"]', 'ประสบการณ์ 10 ปี ในการรักษาผู้ป่วยโรคเรื้อรัง');
    await page.fill('input[name="education"]', 'แพทยศาสตร์บัณฑิต จุฬาลงกรณ์มหาวิทยาลัย');
    
    // Schedule
    await page.check('input[value="monday"]');
    await page.check('input[value="wednesday"]');
    await page.check('input[value="friday"]');
    
    await page.fill('input[name="workingHours"]', '9:00-17:00');
    
    await page.click('button:has-text("บันทึก")');
    await page.waitForSelector('text=/บันทึกสำเร็จ|saved successfully/i');
    
    console.log('✅ Doctor completed profile');
  });
  
  test('Admin assigns multiple roles to user', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/admin/users`);
    
    // Search for doctor
    await page.fill('input[name="search"]', testDoctor.email);
    await page.click(`[data-testid="user-row"]:has-text("${testDoctor.email}")`);
    
    // Edit roles
    await page.click('button:has-text("แก้ไขบทบาท")');
    
    // Add RESEARCHER role
    await page.check('input[value="RESEARCHER"]');
    
    await page.click('button:has-text("บันทึก")');
    await page.waitForSelector('text=อัพเดทสำเร็จ');
    
    // Verify roles
    await expect(page.locator('text=DOCTOR')).toBeVisible();
    await expect(page.locator('text=RESEARCHER')).toBeVisible();
    
    console.log('✅ Admin assigned multiple roles');
  });
  
  test('Patient initiates password reset', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL_URL}/auth/login`);
    
    await page.click('a:has-text("ลืมรหัสผ่าน")');
    
    await page.fill('input[name="email"]', testPatient.email);
    await page.click('button:has-text("ส่งลิงก์รีเซ็ต")');
    
    await expect(page.locator('text=/ส่งลิงก์|reset link sent/i')).toBeVisible();
    
    console.log('✅ Password reset initiated');
  });
  
  test('Patient resets password', async ({ page }) => {
    // Simulate clicking reset link from email
    await page.goto(`${PATIENT_PORTAL_URL}/auth/reset-password?token=reset-token-456`);
    
    const newPassword = 'NewPass@456';
    
    await page.fill('input[name="newPassword"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);
    
    await page.click('button:has-text("รีเซ็ตรหัสผ่าน")');
    
    await expect(page.locator('text=/รีเซ็ตสำเร็จ|password reset/i')).toBeVisible();
    
    // Try logging in with new password
    await page.fill('input[type="email"]', testPatient.email);
    await page.fill('input[type="password"]', newPassword);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(`${PATIENT_PORTAL_URL}/dashboard`, { timeout: 5000 });
    
    console.log('✅ Password reset successful');
  });
  
  test('Admin deactivates user account', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/admin/users`);
    
    // Search for test patient
    await page.fill('input[name="search"]', testPatient.email);
    await page.click(`[data-testid="user-row"]:has-text("${testPatient.email}")`);
    
    // Deactivate
    await page.click('button:has-text("ปิดการใช้งาน")');
    
    // Confirm
    await page.fill('textarea[name="reason"]', 'ทดสอบระบบ');
    await page.click('button:has-text("ยืนยัน")');
    
    await page.waitForSelector('text=ปิดการใช้งานสำเร็จ');
    
    // Verify status badge
    await expect(page.locator('span:has-text("ปิดการใช้งาน")')).toBeVisible();
    
    console.log('✅ Admin deactivated account');
  });
  
  test('Deactivated user cannot login', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL_URL}/auth/login`);
    
    await page.fill('input[type="email"]', testPatient.email);
    await page.fill('input[type="password"]', 'NewPass@456');
    await page.click('button[type="submit"]');
    
    // Should see error message
    await expect(
      page.locator('text=/บัญชีถูกปิดการใช้งาน|account deactivated|disabled/i')
    ).toBeVisible();
    
    console.log('✅ Deactivated user blocked');
  });
  
  test('Admin reactivates user account', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/admin/users`);
    
    // Filter deactivated users
    await page.selectOption('select[name="statusFilter"]', 'deactivated');
    
    await page.click(`[data-testid="user-row"]:has-text("${testPatient.email}")`);
    
    // Reactivate
    await page.click('button:has-text("เปิดการใช้งาน")');
    await page.click('button:has-text("ยืนยัน")');
    
    await page.waitForSelector('text=เปิดการใช้งานสำเร็จ');
    
    await expect(page.locator('span:has-text("ใช้งานได้")')).toBeVisible();
    
    console.log('✅ Admin reactivated account');
  });
  
});
