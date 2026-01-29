/**
 * UI Pages Workflow Tests - Complete Coverage
 * 
 * Tests ALL pages for:
 * - Patient Portal (9 pages) - Patient USER
 * - Doctor Portal (8 pages) - Doctor USER
 * - Doctor Portal (10 pages) - Admin USER
 * 
 * Routes:
 * - Patient Portal: http://localhost:3005
 *   - /login, /, /appointments, /ai-doctor, /health-library, /phr, /timeline, /pdpa, /settings
 * - Doctor Portal: http://localhost:3010
 *   - /login, /doctor/:userId/dashboard, /doctor/:userId/schedule, /doctor/:userId/patients, etc.
 */

import { test, expect, Page } from '@playwright/test';

const PATIENT_PORTAL = 'http://localhost:3005';
const DOCTOR_PORTAL = 'http://localhost:3010';

const USERS = {
  patient: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' },
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' },
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' }
};

// ============================================================================
// HELPER: Login via API and set cookies
// ============================================================================
async function loginPatientAPI(page: Page) {
  const response = await page.request.post(`${PATIENT_PORTAL}/auth/login`, {
    data: USERS.patient
  });
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
  return data;
}

async function loginDoctorAPI(page: Page) {
  const response = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, {
    data: USERS.doctor
  });
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
  return data;
}

async function loginAdminAPI(page: Page) {
  const response = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, {
    data: USERS.admin
  });
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
  return data;
}

// ============================================================================
// SECTION 1: API LOGIN TESTS (All 5 Users)
// ============================================================================
test.describe('1. API Login Tests - All Users', () => {
  
  test('1.1 Patient 1 login API (demo.test@gmail.com)', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL}/auth/login`, {
      data: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('demo.test@gmail.com');
    console.log('✅ Patient 1 login: ' + data.user.name);
  });

  test('1.2 Patient 2 login API (Somchai)', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL}/auth/login`, {
      data: { email: 'Somchai.Mankong@gmail.com', password: 'P@ssw0rd' }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    console.log('✅ Patient 2 login: ' + data.user.name);
  });

  test('1.3 Patient 3 login API (Anan)', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL}/auth/login`, {
      data: { email: 'Anan.Khayanrian@gmail.com', password: 'P@ssw0rd' }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    console.log('✅ Patient 3 login: ' + data.user.name);
  });

  test('1.4 Doctor login API', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL}/auth/login`, {
      data: USERS.doctor
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.role).toBe('doctor');
    console.log('✅ Doctor login: ' + data.user.name + ', role=' + data.user.role);
  });

  test('1.5 Admin login API', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL}/auth/login`, {
      data: USERS.admin
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.role).toBe('admin');
    expect(data.user.isAdmin).toBe(true);
    console.log('✅ Admin login: ' + data.user.name + ', isAdmin=' + data.user.isAdmin);
  });
});

// ============================================================================
// SECTION 2: PATIENT PORTAL UI PAGES (9 pages)
// ============================================================================
test.describe('2. Patient Portal UI Pages', () => {
  
  test('2.1 Login page (/login)', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Should show login form
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    console.log('✅ Patient login page accessible');
  });

  test('2.2 Dashboard/Home (หน้าหลัก) - /', async ({ page }) => {
    // Login via UI
    await page.goto(`${PATIENT_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.patient.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.patient.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Should be on home/dashboard
    const url = page.url();
    expect(url).toMatch(/localhost:3005/);
    
    // Page should have content
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(100);
    console.log('✅ Patient Dashboard (หน้าหลัก) accessible');
  });

  test('2.3 Appointments (นัดหมาย) - /appointments', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.patient.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.patient.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto(`${PATIENT_PORTAL}/appointments`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Appointments page (นัดหมาย) accessible');
  });

  test('2.4 AI Doctor (ปรึกษา AI) - /ai-doctor', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.patient.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.patient.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto(`${PATIENT_PORTAL}/ai-doctor`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ AI Doctor page (ปรึกษา AI) accessible');
  });

  test('2.5 Health Library (คลังความรู้สุขภาพ) - /health-library', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.patient.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.patient.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto(`${PATIENT_PORTAL}/health-library`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Health Library (คลังความรู้สุขภาพ) accessible');
  });

  test('2.6 Health Records (ประวัติสุขภาพ) - /phr', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.patient.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.patient.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto(`${PATIENT_PORTAL}/phr`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Health Records (ประวัติสุขภาพ) accessible');
  });

  test('2.7 Timeline (เส้นทางสุขภาพ) - /timeline', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.patient.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.patient.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto(`${PATIENT_PORTAL}/timeline`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Timeline (เส้นทางสุขภาพ) accessible');
  });

  test('2.8 PDPA & Living Will - /pdpa', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.patient.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.patient.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto(`${PATIENT_PORTAL}/pdpa`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ PDPA & Living Will page accessible');
  });

  test('2.9 Settings (ตั้งค่า) - /settings', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.patient.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.patient.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto(`${PATIENT_PORTAL}/settings`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Settings (ตั้งค่า) accessible');
  });
});

// ============================================================================
// SECTION 3: DOCTOR PORTAL - DOCTOR USER (8 pages)
// ============================================================================
test.describe('3. Doctor Portal - Doctor User Pages', () => {
  
  test('3.1 Login page (/login)', async ({ page }) => {
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
    console.log('✅ Doctor login page accessible');
  });

  test('3.2 Dashboard (แดชบอร์ด)', async ({ page }) => {
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"], input[name="email"]', USERS.doctor.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.doctor.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Should be redirected to dashboard
    const url = page.url();
    expect(url).toContain('dashboard');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(100);
    console.log('✅ Doctor Dashboard (แดชบอร์ด) accessible');
  });

  test('3.3 Schedule (ตารางนัดหมาย)', async ({ page }) => {
    // Login first
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.doctor });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.doctor.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.doctor.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/schedule`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Schedule (ตารางนัดหมาย) accessible');
  });

  test('3.4 Patients (ผู้ป่วย)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.doctor });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.doctor.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.doctor.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/patients`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Patients (ผู้ป่วย) accessible');
  });

  test('3.5 Health Meeting (นัดหมาย & ประชุม)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.doctor });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.doctor.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.doctor.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/health-meeting`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Health Meeting (นัดหมาย & ประชุม) accessible');
  });

  test('3.6 Medical Consultants (ที่ปรึกษาแพทย์)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.doctor });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.doctor.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.doctor.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/medical-consultants`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Medical Consultants (ที่ปรึกษาแพทย์) accessible');
  });

  test('3.7 Medical Content (เนื้อหาทางการแพทย์)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.doctor });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.doctor.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.doctor.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/medical-content`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Medical Content (เนื้อหาทางการแพทย์) accessible');
  });

  test('3.8 Clinical Resources (ทรัพยากรทางคลินิก)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.doctor });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.doctor.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.doctor.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/clinical-resources`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Clinical Resources (ทรัพยากรทางคลินิก) accessible');
  });
});

// ============================================================================
// SECTION 4: DOCTOR PORTAL - ADMIN USER (10 pages)
// ============================================================================
test.describe('4. Doctor Portal - Admin User Pages', () => {
  
  test('4.1 Admin Dashboard (แดชบอร์ด)', async ({ page }) => {
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url).toContain('dashboard');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(100);
    console.log('✅ Admin Dashboard (แดชบอร์ด) accessible');
  });

  test('4.2 Admin Schedule (ตารางนัดหมาย)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.admin });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/schedule`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Admin Schedule (ตารางนัดหมาย) accessible');
  });

  test('4.3 Admin Patients (ผู้ป่วย)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.admin });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/patients`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Admin Patients (ผู้ป่วย) accessible');
  });

  test('4.4 Admin Health Meeting (นัดหมาย & ประชุม)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.admin });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/health-meeting`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Admin Health Meeting (นัดหมาย & ประชุม) accessible');
  });

  test('4.5 Admin Medical Consultants (ที่ปรึกษาแพทย์)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.admin });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/medical-consultants`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Admin Medical Consultants (ที่ปรึกษาแพทย์) accessible');
  });

  test('4.6 Admin Medical Content (เนื้อหาทางการแพทย์)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.admin });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/medical-content`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Admin Medical Content (เนื้อหาทางการแพทย์) accessible');
  });

  test('4.7 Admin Clinical Resources (ทรัพยากรทางคลินิก)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.admin });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/clinical-resources`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Admin Clinical Resources (ทรัพยากรทางคลินิก) accessible');
  });

  test('4.8 Admin Doctor Management (จัดการแพทย์)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.admin });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/doctor-management`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Admin Doctor Management (จัดการแพทย์) accessible');
  });

  test('4.9 Admin Appointment Management (อนุมัติแพทย์ใหม่)', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.admin });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/appointment-management`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Admin Appointment Management accessible');
  });

  test('4.10 Admin Doctors List', async ({ page }) => {
    const loginResp = await page.request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.admin });
    const loginData = await loginResp.json();
    const userId = loginData.user.id;
    
    await page.goto(`${DOCTOR_PORTAL}/login`);
    await page.fill('input[type="email"], input[name="email"]', USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${DOCTOR_PORTAL}/doctor/${userId}/doctors`);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content?.length).toBeGreaterThan(50);
    console.log('✅ Admin Doctors List accessible');
  });
});

// ============================================================================
// SECTION 5: API HEALTH & DATA TESTS
// ============================================================================
test.describe('5. API Health & Data', () => {
  
  test('5.1 Patient Portal Health', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal healthy');
  });

  test('5.2 Doctor Portal Health', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal healthy');
  });

  test('5.3 Meeting Server Health', async ({ request }) => {
    const response = await request.get('http://localhost:3020/health');
    expect(response.status()).toBe(200);
    console.log('✅ Meeting Server healthy');
  });

  test('5.4 Medical Content API', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL}/api/content/medical`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    // Response has { articles: [...] } format
    expect(data.articles).toBeDefined();
    console.log(`✅ Medical Content: ${data.articles?.length || 0} articles`);
  });

  test('5.5 Consultants API', async ({ request }) => {
    // Login first to get token
    const loginResp = await request.post(`${PATIENT_PORTAL}/auth/login`, { data: USERS.patient });
    const loginData = await loginResp.json();
    
    const response = await request.get(`${PATIENT_PORTAL}/api/consultants`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    console.log(`✅ Consultants: ${data.consultants?.length || 0} consultants`);
  });

  test('5.6 Clinical Resources API', async ({ request }) => {
    const loginResp = await request.post(`${DOCTOR_PORTAL}/auth/login`, { data: USERS.doctor });
    const loginData = await loginResp.json();
    
    const response = await request.get(`${DOCTOR_PORTAL}/api/clinical-resources`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Clinical Resources API accessible');
  });
});
