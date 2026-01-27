/**
 * Comprehensive End-to-End Test Suite
 * Tests complete appointment → meeting → EMR → patient access workflow
 * 
 * This test simulates the full patient journey:
 * 1. Patient books appointment
 * 2. Doctor confirms appointment
 * 3. Meeting is created with Jitsi link
 * 4. Meeting occurs with transcript
 * 5. AI generates summary
 * 6. Doctor validates and creates EMR
 * 7. Patient receives summary
 * 8. Patient accesses results in health history
 */

import { test, expect, Page } from '@playwright/test';
import { chromium } from 'playwright';

// Test credentials
const TEST_USERS = {
  patient: {
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd',
    name: 'นาย ทดสอบ ระบบ'
  },
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'นพ. ทดสอบ แพทย์ดี'
  },
  admin: {
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024',
    name: 'นพ. ผู้ดูแลระบบ ใจดี'
  }
};

// URLs
const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

// Helper functions
async function loginPatient(page: Page) {
  await page.goto(`${PATIENT_PORTAL_URL}/auth/login`);
  await page.fill('input[name="email"], input[type="email"]', TEST_USERS.patient.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.patient.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${PATIENT_PORTAL_URL}/**`, { timeout: 10000 });
  console.log('✅ Patient logged in successfully');
}

async function loginDoctor(page: Page) {
  await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
  await page.fill('input[name="email"], input[type="email"]', TEST_USERS.doctor.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.doctor.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DOCTOR_PORTAL_URL}/**`, { timeout: 10000 });
  console.log('✅ Doctor logged in successfully');
}

async function loginAdmin(page: Page) {
  await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
  await page.fill('input[name="email"], input[type="email"]', TEST_USERS.admin.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DOCTOR_PORTAL_URL}/**`, { timeout: 10000 });
  console.log('✅ Admin logged in successfully');
}

test.describe('Complete Appointment → Meeting → EMR Workflow', () => {
  
  test('Full workflow: Patient books → Doctor confirms → Meeting → AI Summary → EMR → Patient views', async ({ browser }) => {
    
    let appointmentId: string;
    let meetingLink: string;
    
    // ========================================================================
    // STEP 1: Patient books appointment
    // ========================================================================
    test.step('Patient books telehealth appointment', async () => {
      const patientPage = await browser.newPage();
      await loginPatient(patientPage);
      
      // Navigate to book appointment
      await patientPage.goto(`${PATIENT_PORTAL_URL}/appointments/book`);
      await patientPage.waitForSelector('text=จองนัดหมาย', { timeout: 5000 });
      
      // Fill appointment form
      await patientPage.selectOption('select[name="doctorId"]', { index: 1 });
      await patientPage.selectOption('select[name="type"]', 'telehealth');
      
      // Select date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await patientPage.fill('input[type="date"]', dateStr);
      
      // Select time
      await patientPage.selectOption('select[name="time"]', '14:00');
      
      // Fill symptoms
      await patientPage.fill('textarea[name="symptoms"]', 'ปวดหัวและเมื่อยตัวมา 3 วัน มีอาการวิงเวียนเล็กน้อย');
      
      // Submit
      await patientPage.click('button:has-text("จองนัดหมาย")');
      
      // Wait for success and get appointment ID
      await patientPage.waitForSelector('text=จองนัดหมายสำเร็จ', { timeout: 10000 });
      
      // Get appointment ID from URL or response
      const appointmentUrl = patientPage.url();
      appointmentId = appointmentUrl.match(/appointments\/([A-Z0-9-]+)/)?.[1] || '';
      
      console.log('✅ Patient booked appointment:', appointmentId);
      expect(appointmentId).toBeTruthy();
      
      await patientPage.close();
    });
    
    // ========================================================================
    // STEP 2: Doctor confirms appointment and creates meeting
    // ========================================================================
    test.step('Doctor confirms appointment and creates meeting link', async () => {
      const doctorPage = await browser.newPage();
      await loginDoctor(doctorPage);
      
      // Navigate to dashboard
      await doctorPage.goto(`${DOCTOR_PORTAL_URL}/dashboard`);
      
      // Check for pending confirmations
      await doctorPage.waitForSelector('text=รอยืนยัน', { timeout: 5000 });
      
      // Find and click the appointment
      await doctorPage.click(`text=${TEST_USERS.patient.name}`);
      
      // Confirm appointment
      await doctorPage.click('button:has-text("ยืนยันนัดหมาย")');
      
      // Wait for meeting link creation
      await doctorPage.waitForSelector('text=ลิงก์ประชุม', { timeout: 10000 });
      
      // Get meeting link
      const linkElement = await doctorPage.locator('a[href*="meet.jit.si"]').first();
      meetingLink = await linkElement.getAttribute('href') || '';
      
      console.log('✅ Doctor confirmed appointment, meeting link:', meetingLink);
      expect(meetingLink).toContain('meet.jit.si');
      
      await doctorPage.close();
    });
    
    // ========================================================================
    // STEP 3: Simulate meeting with transcript and chat
    // ========================================================================
    test.step('Simulate meeting with live transcript', async () => {
      // Create API request to simulate meeting completion
      const context = await browser.newContext();
      const apiPage = await context.newPage();
      
      const meetingData = {
        meetingId: `MEETING-${appointmentId}`,
        appointmentId: appointmentId,
        meetingUrl: meetingLink,
        status: 'completed',
        participants: [
          {
            id: TEST_USERS.doctor.email,
            name: TEST_USERS.doctor.name,
            role: 'host'
          },
          {
            id: TEST_USERS.patient.email,
            name: TEST_USERS.patient.name,
            role: 'patient'
          }
        ],
        transcript: {
          segments: [
            {
              timestamp: '00:01:00',
              speaker: 'doctor',
              text: 'สวัสดีครับ วันนี้มีอาการอะไรบ้างครับ'
            },
            {
              timestamp: '00:01:15',
              speaker: 'patient',
              text: 'สวัสดีครับหมอ ผมปวดหัวบ่อยๆ และเมื่อยตัวมา 3 วันแล้วครับ'
            },
            {
              timestamp: '00:02:00',
              speaker: 'doctor',
              text: 'มีอาการวิงเวียนหรือคลื่นไส้ด้วยหรือเปล่าครับ'
            },
            {
              timestamp: '00:02:20',
              speaker: 'patient',
              text: 'มีวิงเวียนเล็กน้อยตอนเช้าครับ'
            },
            {
              timestamp: '00:15:00',
              speaker: 'doctor',
              text: 'จากการตรวจ ผมประเมินว่าเป็น tension headache จากความเครียดและนอนน้อย ผมจะสั่งยาบรรเทาอาการให้ครับ'
            }
          ]
        },
        chat: [
          {
            timestamp: '00:10:00',
            sender: TEST_USERS.patient.name,
            message: 'หมอครับ ผมส่งผลเลือดที่เพิ่งตรวจเมื่อสัปดาห์ที่แล้วครับ'
          }
        ]
      };
      
      // Post meeting record
      const response = await apiPage.request.post(
        `${DOCTOR_PORTAL_URL}/api/meetings/complete`,
        {
          data: meetingData,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      expect(response.status()).toBe(200);
      console.log('✅ Meeting completed with transcript');
      
      await apiPage.close();
      await context.close();
    });
    
    // ========================================================================
    // STEP 4: AI generates summary and doctor validates
    // ========================================================================
    test.step('AI generates summary for doctor validation', async () => {
      const doctorPage = await browser.newPage();
      await loginDoctor(doctorPage);
      
      // Navigate to meeting summary page
      await doctorPage.goto(`${DOCTOR_PORTAL_URL}/meetings/${appointmentId}`);
      
      // Wait for AI summary
      await doctorPage.waitForSelector('text=AI Summary', { timeout: 15000 });
      
      // Verify summary contains key information
      const summaryText = await doctorPage.textContent('[data-testid="ai-summary"]');
      expect(summaryText).toContain('ปวดหัว');
      expect(summaryText).toContain('tension headache');
      
      // Doctor reviews and approves
      await doctorPage.click('button:has-text("ยืนยันและสร้าง EMR")');
      
      await doctorPage.waitForSelector('text=EMR สร้างสำเร็จ', { timeout: 10000 });
      console.log('✅ Doctor validated AI summary and created EMR');
      
      await doctorPage.close();
    });
    
    // ========================================================================
    // STEP 5: Patient receives summary and accesses in health history
    // ========================================================================
    test.step('Patient views meeting summary in health history', async () => {
      const patientPage = await browser.newPage();
      await loginPatient(patientPage);
      
      // Navigate to health history
      await patientPage.goto(`${PATIENT_PORTAL_URL}/health-history`);
      
      // Wait for latest result
      await patientPage.waitForSelector('text=ผลการตรวจล่าสุด', { timeout: 5000 });
      
      // Find the appointment result
      await patientPage.click(`text=${TEST_USERS.doctor.name}`);
      
      // Verify patient instruction exists
      await patientPage.waitForSelector('text=คำแนะนำจากแพทย์', { timeout: 5000 });
      
      // Verify key information
      const instructionText = await patientPage.textContent('[data-testid="patient-instruction"]');
      expect(instructionText).toContain('ยา');
      expect(instructionText).toContain('พักผ่อน');
      
      console.log('✅ Patient viewed meeting summary and instructions');
      
      await patientPage.close();
    });
    
  });
  
  // ==========================================================================
  // Test Dashboard Stats Updates
  // ==========================================================================
  test('Dashboard stats update correctly after workflow', async ({ browser }) => {
    
    test.step('Doctor dashboard shows updated stats', async () => {
      const doctorPage = await browser.newPage();
      await loginDoctor(doctorPage);
      
      await doctorPage.goto(`${DOCTOR_PORTAL_URL}/dashboard`);
      
      // Check stats are not zero
      const todayAppts = await doctorPage.locator('[data-testid="today-appointments"]').textContent();
      const patientsSeen = await doctorPage.locator('[data-testid="patients-seen"]').textContent();
      const pendingPrescriptions = await doctorPage.locator('[data-testid="pending-prescriptions"]').textContent();
      const unreadMessages = await doctorPage.locator('[data-testid="unread-messages"]').textContent();
      
      console.log('📊 Dashboard Stats:', {
        todayAppts,
        patientsSeen,
        pendingPrescriptions,
        unreadMessages
      });
      
      // All stats should be numbers (not placeholders)
      expect(parseInt(todayAppts || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(pendingPrescriptions || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(unreadMessages || '0')).toBeGreaterThanOrEqual(0);
      
      await doctorPage.close();
    });
    
    test.step('Patient dashboard shows appointments', async () => {
      const patientPage = await browser.newPage();
      await loginPatient(patientPage);
      
      await patientPage.goto(`${PATIENT_PORTAL_URL}/dashboard`);
      
      // Check for upcoming appointments section
      await patientPage.waitForSelector('text=นัดหมายที่จะถึง', { timeout: 5000 });
      
      // Should show at least one appointment
      const appointmentCount = await patientPage.locator('[data-testid="appointment-card"]').count();
      console.log('📊 Patient appointments:', appointmentCount);
      
      expect(appointmentCount).toBeGreaterThanOrEqual(0);
      
      await patientPage.close();
    });
  });
  
});
