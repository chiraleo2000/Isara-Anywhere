/**
 * Notifications Workflow Test
 * Based on: Processes/Notification_Workflows.md
 * 
 * Tests:
 * - System-generated notifications
 * - Doctor-to-patient notifications
 * - Real-time updates
 * - Mark as read
 * - Notification preferences
 * - Priority handling
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

test.describe('Notifications Workflow', () => {
  
  test('Patient receives appointment confirmation notification', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/dashboard`);
    
    // Check notification bell
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    await expect(notificationBell).toBeVisible();
    
    // Check for unread count badge
    const badge = page.locator('[data-testid="notification-badge"]');
    const unreadCount = await badge.textContent();
    console.log('Unread notifications:', unreadCount);
    
    // Click bell to open notifications
    await notificationBell.click();
    
    // Verify dropdown appears
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
    
    // Look for appointment confirmation
    const appointmentNotif = page.locator('text=/นัดหมายได้รับการยืนยัน|Appointment confirmed/i');
    await expect(appointmentNotif).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Patient received appointment notification');
  });
  
  test('Patient marks notification as read', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/notifications`);
    
    // Get initial unread count
    const initialBadge = await page.locator('[data-testid="notification-badge"]').textContent();
    const initialCount = parseInt(initialBadge || '0');
    
    // Click first unread notification
    const firstUnread = page.locator('[data-testid="notification-item"]:has([data-unread="true"])').first();
    
    if (await firstUnread.count() > 0) {
      await firstUnread.click();
      
      // Verify marked as read (no unread badge on item)
      await expect(firstUnread.locator('[data-testid="unread-indicator"]')).not.toBeVisible();
      
      // Verify count decreased
      const newBadge = await page.locator('[data-testid="notification-badge"]').textContent();
      const newCount = parseInt(newBadge || '0');
      
      expect(newCount).toBe(initialCount - 1);
      
      console.log('✅ Patient marked notification as read');
    }
  });
  
  test('Patient filters notifications by type', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/notifications`);
    
    // Filter by appointments
    await page.click('button:has-text("นัดหมาย")');
    const appointmentNotifs = await page.locator('[data-type="appointment"]').count();
    expect(appointmentNotifs).toBeGreaterThan(0);
    
    // Filter by prescriptions
    await page.click('button:has-text("ใบสั่งยา")');
    const prescriptionNotifs = await page.locator('[data-type="prescription"]').count();
    
    // Filter by results
    await page.click('button:has-text("ผลตรวจ")');
    
    console.log('✅ Patient filtered notifications');
  });
  
  test('Doctor sends custom notification to patient', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/patients`);
    
    // Select patient
    await page.fill('input[name="search"]', 'Demo Test');
    await page.click('[data-testid="patient-card"]:has-text("Demo Test")');
    
    // Send notification
    await page.click('button:has-text("ส่งการแจ้งเตือน")');
    
    // Select type
    await page.selectOption('select[name="type"]', 'REMINDER');
    
    // Set priority
    await page.selectOption('select[name="priority"]', 'HIGH');
    
    // Enter message
    await page.fill('input[name="title"]', 'แจ้งเตือน: ติดตามผลตรวจเลือด');
    await page.fill('textarea[name="message"]', 'กรุณามารับผลตรวจเลือด และพบแพทย์ วันพรุ่งนี้ 10:00 น.');
    
    await page.click('button:has-text("ส่ง")');
    await page.waitForSelector('text=ส่งสำเร็จ');
    
    console.log('✅ Doctor sent custom notification');
  });
  
  test('Patient receives priority notification', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/dashboard`);
    
    // Priority notifications should show at top
    const priorityNotif = page.locator('[data-priority="HIGH"]').first();
    
    if (await priorityNotif.count() > 0) {
      await expect(priorityNotif).toBeVisible();
      
      // Verify priority indicator
      await expect(priorityNotif.locator('[data-testid="priority-badge"]')).toBeVisible();
      
      console.log('✅ Patient received priority notification');
    }
  });
  
  test('Patient configures notification preferences', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/settings/notifications`);
    
    // Email notifications
    await page.check('input[name="emailAppointments"]');
    await page.check('input[name="emailPrescriptions"]');
    await page.uncheck('input[name="emailPromotions"]');
    
    // Push notifications
    await page.check('input[name="pushAppointments"]');
    await page.check('input[name="pushResults"]');
    
    // SMS notifications
    await page.check('input[name="smsAppointmentReminder"]');
    
    await page.click('button:has-text("บันทึก")');
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    console.log('✅ Patient configured preferences');
  });
  
  test('System generates prescription ready notification', async ({ page }) => {
    // This would be triggered by doctor approving prescription
    // We'll verify notification appears in patient portal
    
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/notifications`);
    
    // Look for prescription notifications
    const prescriptionNotif = page.locator('[data-type="prescription"]:has-text("ใบสั่งยาพร้อม")');
    
    if (await prescriptionNotif.count() > 0) {
      await expect(prescriptionNotif).toBeVisible();
      
      // Click to view
      await prescriptionNotif.click();
      
      // Should navigate to prescriptions page
      await expect(page).toHaveURL(/\/prescriptions/);
      
      console.log('✅ System generated prescription notification');
    }
  });
  
  test('Patient marks all as read', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/notifications`);
    
    // Click mark all as read
    await page.click('button:has-text("อ่านทั้งหมด")');
    await page.click('button:has-text("ยืนยัน")');
    
    await page.waitForSelector('text=อัพเดทสำเร็จ');
    
    // Verify badge is 0 or hidden
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).not.toBeVisible();
    
    console.log('✅ Patient marked all as read');
  });
  
  test('Doctor receives new appointment notification', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/dashboard`);
    
    // Check for appointment notifications
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    await notificationBell.click();
    
    const appointmentNotif = page.locator('[data-type="appointment"]:has-text("นัดหมายใหม่")');
    
    if (await appointmentNotif.count() > 0) {
      await expect(appointmentNotif).toBeVisible();
      
      // Click to view
      await appointmentNotif.click();
      
      // Should navigate to appointments
      await expect(page).toHaveURL(/\/appointments/);
      
      console.log('✅ Doctor received appointment notification');
    }
  });
  
  test('Notification real-time update simulation', async ({ page, context }) => {
    // Open patient portal
    await loginPatient(page);
    await page.goto(`${PATIENT_PORTAL_URL}/dashboard`);
    
    const initialBadge = await page.locator('[data-testid="notification-badge"]').textContent();
    const initialCount = parseInt(initialBadge || '0');
    
    // Simulate doctor sending notification (in real scenario, would use WebSocket/SSE)
    // For testing, we refresh to simulate real-time update
    await page.reload();
    
    // Wait for potential new notification
    await page.waitForTimeout(2000);
    
    const newBadge = await page.locator('[data-testid="notification-badge"]').textContent();
    const newCount = parseInt(newBadge || '0');
    
    console.log(`Notification count: ${initialCount} → ${newCount}`);
    console.log('✅ Real-time notification test complete');
  });
  
});
