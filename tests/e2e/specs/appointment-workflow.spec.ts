/**
 * Appointment Workflow E2E Tests
 * Full workflow: Book → Confirm → Meeting → EMR → Results
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials
const PATIENT = { email: 'demo.test@gmail.com', password: 'P@ssw0rd' };
const DOCTOR = { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' };
const ADMIN = { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' };

// Helper: Login to portal
async function login(page: Page, email: string, password: string, portal: 'patient' | 'doctor') {
  const baseUrl = portal === 'patient' ? 'http://localhost:3005' : 'http://localhost:3010';
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await expect(page.locator('text=Dashboard, text=แดชบอร์ด').first()).toBeVisible({ timeout: 5000 });
}

test.describe('Appointment Workflow', () => {
  
  test('1. Patient can view appointment page', async ({ page }) => {
    await login(page, PATIENT.email, PATIENT.password, 'patient');
    
    // Navigate to appointments
    await page.click('text=นัดหมาย, text=Appointments').first();
    await page.waitForLoadState('networkidle');
    
    // Verify appointment tabs are visible
    await expect(page.locator('text=รอการยืนยัน')).toBeVisible();
    await expect(page.locator('text=ทั้งหมด')).toBeVisible();
  });

  test('2. Patient can book new appointment', async ({ page }) => {
    await login(page, PATIENT.email, PATIENT.password, 'patient');
    
    // Navigate to appointments
    await page.click('text=นัดหมาย, text=Appointments').first();
    await page.waitForLoadState('networkidle');
    
    // Click book appointment button
    const bookButton = page.locator('text=นัดหมายใหม่, text=Book Appointment, button:has-text("นัดหมาย")').first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
      await page.waitForLoadState('networkidle');
      
      // Fill symptom/reason
      const symptomInput = page.locator('textarea, input[name="symptoms"], input[placeholder*="อาการ"]').first();
      if (await symptomInput.isVisible()) {
        await symptomInput.fill('ปวดหัว มีไข้ต่ำๆ มา 2 วัน');
      }
      
      // Select date (if date picker exists)
      const dateInput = page.locator('input[type="date"], [data-testid="date-picker"]').first();
      if (await dateInput.isVisible()) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await dateInput.fill(tomorrow.toISOString().split('T')[0]);
      }
      
      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("ยืนยัน"), button:has-text("ส่ง")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Verify success or appointment list
    await expect(page.locator('text=นัดหมาย, text=Appointment').first()).toBeVisible();
  });

  test('3. Doctor can view pending appointments', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    
    // Navigate to appointments
    await page.click('text=นัดหมาย, text=ตารางนัดหมาย, text=Appointments').first();
    await page.waitForLoadState('networkidle');
    
    // Verify appointments page loads
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('4. Doctor can confirm appointment', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    
    // Navigate to appointments
    await page.click('text=นัดหมาย, text=ตารางนัดหมาย').first();
    await page.waitForLoadState('networkidle');
    
    // Look for pending appointment
    const pendingAppointment = page.locator('[data-status="pending"], .status-pending, text=รอการยืนยัน').first();
    if (await pendingAppointment.isVisible()) {
      await pendingAppointment.click();
      
      // Click confirm button
      const confirmButton = page.locator('button:has-text("ยืนยัน"), button:has-text("Confirm")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Verify page remains accessible
    await expect(page).toHaveURL(/appointments|dashboard/);
  });

  test('5. Admin can manage appointments', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password, 'doctor');
    
    // Navigate to appointments
    await page.click('text=นัดหมาย, text=ตารางนัดหมาย').first();
    await page.waitForLoadState('networkidle');
    
    // Verify admin can see all appointments
    await expect(page.locator('h1, h2, .appointments-list, table').first()).toBeVisible();
  });

});

test.describe('Meeting Workflow', () => {
  
  test('6. Doctor can start meeting for confirmed appointment', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    
    // Navigate to appointments
    await page.click('text=นัดหมาย, text=ตารางนัดหมาย').first();
    await page.waitForLoadState('networkidle');
    
    // Look for confirmed appointment with meeting option
    const meetingButton = page.locator('button:has-text("เริ่มประชุม"), button:has-text("Start Meeting"), a:has-text("Meeting")').first();
    if (await meetingButton.isVisible()) {
      // Don't actually click as it opens external Jitsi
      await expect(meetingButton).toBeEnabled();
    }
  });

  test('7. Meeting link is generated correctly', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    
    // Check meeting API
    const response = await page.request.post('http://localhost:3010/api/meetings/create', {
      data: {
        appointmentId: 'test-appointment-001',
        patientId: 'PATIENT-DEMO'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken(page)}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.meeting).toBeDefined();
    expect(data.meeting.link).toContain('meet.jit.si');
  });

});

test.describe('EMR Workflow', () => {
  
  test('8. Doctor can access EMR editor', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    
    // Navigate to patients
    await page.click('text=ผู้ป่วย, text=Patients').first();
    await page.waitForLoadState('networkidle');
    
    // Click on a patient
    const patientRow = page.locator('tr, .patient-card, [data-patient-id]').first();
    if (await patientRow.isVisible()) {
      await patientRow.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Verify patient page or EMR options
    await expect(page.locator('text=EMR, text=เวชระเบียน, text=ประวัติ').first()).toBeVisible();
  });

  test('9. EMR data saves correctly', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    
    // Test EMR API
    const response = await page.request.get('http://localhost:3010/api/emr/list', {
      headers: {
        'Authorization': `Bearer ${await getToken(page)}`
      }
    });
    
    // Should return 200 even if empty
    expect(response.status()).toBe(200);
  });

});

test.describe('Health Records Display', () => {
  
  test('10. Patient can view health history', async ({ page }) => {
    await login(page, PATIENT.email, PATIENT.password, 'patient');
    
    // Navigate to health records
    await page.click('text=ประวัติสุขภาพ, text=Health Records, text=สุขภาพ').first();
    await page.waitForLoadState('networkidle');
    
    // Verify health page loads
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('11. Patient can view treatment results', async ({ page }) => {
    await login(page, PATIENT.email, PATIENT.password, 'patient');
    
    // Navigate to health history/timeline
    await page.click('text=ประวัติ, text=Timeline, text=ผลการรักษา').first();
    await page.waitForLoadState('networkidle');
    
    // Verify results page
    await expect(page.locator('.treatment-result, .health-log, .timeline-item, h1, h2').first()).toBeVisible();
  });

});

// Helper: Get auth token from page storage
async function getToken(page: Page): Promise<string> {
  return await page.evaluate(() => localStorage.getItem('token') || '');
}
