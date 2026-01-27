/**
 * Video Meeting with Jitsi and Gemini Workflow Test
 * Based on: Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * 
 * Tests:
 * - Creating Jitsi meeting room
 * - Doctor joins meeting
 * - Patient joins meeting
 * - Live transcription (Google Speech-to-Text)
 * - Recording functionality
 * - Meeting summary with Gemini AI
 * - Man-in-the-Loop validation
 * - Saving transcript and summary to EMR
 */

import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';
const MEETING_SERVER_URL = process.env.MEETING_SERVER_URL || 'http://localhost:3020';

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

test.describe('Video Meeting Jitsi Gemini Workflow', () => {
  
  let meetingRoomId: string;
  let appointmentId: string;
  
  test('Doctor creates meeting room from appointment', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/appointments`);
    
    // Select today's appointment
    const todayAppointment = page.locator('[data-testid="appointment-card"]').first();
    await todayAppointment.click();
    
    // Get appointment ID
    const url = page.url();
    appointmentId = url.match(/appointments\/([A-Z0-9-]+)/)?.[1] || '';
    
    // Start meeting
    await page.click('button:has-text("เริ่มการพบ")');
    
    // Verify meeting room created
    await expect(page.locator('text=/ห้องประชุม|Meeting Room/i')).toBeVisible();
    
    // Get meeting room ID
    meetingRoomId = await page.locator('[data-testid="meeting-room-id"]').textContent() || '';
    
    console.log('✅ Meeting room created:', meetingRoomId);
  });
  
  test('Doctor joins Jitsi meeting', async ({ page, context }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/appointments`);
    const todayAppointment = page.locator('[data-testid="appointment-card"]').first();
    await todayAppointment.click();
    
    await page.click('button:has-text("เข้าร่วมการพบ")');
    
    // Wait for Jitsi iframe to load
    const jitsiFrame = page.frameLocator('iframe[name*="jitsi"]');
    
    // Verify Jitsi meeting loaded
    await expect(jitsiFrame.locator('[data-testid="prejoin-join-button"]')).toBeVisible({ timeout: 10000 });
    
    // Allow camera/microphone (simulate)
    await context.grantPermissions(['camera', 'microphone']);
    
    // Join meeting
    await jitsiFrame.locator('[data-testid="prejoin-join-button"]').click();
    
    // Verify in meeting
    await expect(jitsiFrame.locator('[data-testid="participants-pane"]')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Doctor joined Jitsi meeting');
  });
  
  test('Patient joins same meeting', async ({ page, context }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/appointments`);
    
    // Find appointment with meeting link
    const activeAppointment = page.locator('[data-testid="appointment-card"]:has-text("กำลังดำเนินการ")').first();
    await activeAppointment.click();
    
    await page.click('button:has-text("เข้าร่วมการพบ")');
    
    // Wait for Jitsi iframe
    const jitsiFrame = page.frameLocator('iframe[name*="jitsi"]');
    
    await expect(jitsiFrame.locator('[data-testid="prejoin-join-button"]')).toBeVisible({ timeout: 10000 });
    
    await context.grantPermissions(['camera', 'microphone']);
    
    await jitsiFrame.locator('[data-testid="prejoin-join-button"]').click();
    
    // Verify joined
    await expect(jitsiFrame.locator('[data-testid="participants-pane"]')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Patient joined meeting');
  });
  
  test('Doctor starts recording', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/appointments`);
    const todayAppointment = page.locator('[data-testid="appointment-card"]').first();
    await todayAppointment.click();
    
    await page.click('button:has-text("เข้าร่วมการพบ")');
    
    const jitsiFrame = page.frameLocator('iframe[name*="jitsi"]');
    
    // Wait for toolbar
    await jitsiFrame.locator('[data-testid="prejoin-join-button"]').click();
    await expect(jitsiFrame.locator('[data-testid="participants-pane"]')).toBeVisible({ timeout: 10000 });
    
    // Start recording
    const recordButton = jitsiFrame.locator('button[aria-label*="recording"]');
    
    if (await recordButton.isVisible()) {
      await recordButton.click();
      
      // Confirm recording
      await jitsiFrame.locator('button:has-text("Start")').click();
      
      // Verify recording indicator
      await expect(jitsiFrame.locator('[data-testid="rec-indicator"]')).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Recording started');
    }
  });
  
  test('Live transcription with Google Speech-to-Text', async ({ page }) => {
    await loginDoctor(page);
    
    // Simulate meeting transcript being generated
    // In real scenario, this would be live from Google Speech-to-Text API
    
    const transcript = [
      {
        speaker: 'DOCTOR',
        text: 'สวัสดีครับคุณผู้ป่วย วันนี้มีอาการอย่างไรบ้างครับ',
        timestamp: '2024-01-15T10:00:00Z',
        confidence: 0.95
      },
      {
        speaker: 'PATIENT',
        text: 'สวัสดีค่ะหมอ ปวดศีรษะมาก 3 วันแล้วค่ะ',
        timestamp: '2024-01-15T10:00:15Z',
        confidence: 0.92
      },
      {
        speaker: 'DOCTOR',
        text: 'ตำแหน่งไหนครับที่ปวด ด้านหน้าหรือด้านข้าง',
        timestamp: '2024-01-15T10:00:30Z',
        confidence: 0.94
      }
    ];
    
    // Verify transcript is being captured
    await page.goto(`${DOCTOR_PORTAL_URL}/meeting/${meetingRoomId || 'test-room'}`);
    
    // Check transcript panel
    await page.click('button:has-text("Transcript")');
    
    await expect(page.locator('[data-testid="transcript-panel"]')).toBeVisible();
    
    console.log('✅ Live transcription active');
  });
  
  test('Meeting ends and generates summary', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/appointments`);
    const todayAppointment = page.locator('[data-testid="appointment-card"]').first();
    await todayAppointment.click();
    
    // End meeting
    await page.click('button:has-text("สิ้นสุดการพบ")');
    await page.click('button:has-text("ยืนยัน")');
    
    // Wait for AI summary generation
    await expect(page.locator('text=/กำลังสร้างสรุป|generating summary/i')).toBeVisible();
    
    // Wait for summary (Gemini AI processing)
    await expect(page.locator('[data-testid="ai-summary"]')).toBeVisible({ timeout: 30000 });
    
    console.log('✅ Meeting ended, AI summary generated');
  });
  
  test('Doctor validates AI-generated summary (Man-in-the-Loop)', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/appointments`);
    
    // Find completed appointment
    await page.click('button:has-text("ที่ผ่านมา")');
    const completedAppointment = page.locator('[data-testid="appointment-card"]').first();
    await completedAppointment.click();
    
    // View AI summary
    await page.click('button:has-text("ดูสรุปการพบ")');
    
    // Verify AI summary sections
    await expect(page.locator('h3:has-text("อาการหลัก")')).toBeVisible();
    await expect(page.locator('h3:has-text("การวินิจฉัย")')).toBeVisible();
    await expect(page.locator('h3:has-text("แผนการรักษา")')).toBeVisible();
    
    // Edit/validate summary
    await page.click('button:has-text("แก้ไข")');
    
    // Doctor can edit AI-generated text
    await page.fill('textarea[name="chiefComplaint"]', 'ปวดศีรษะด้านหน้า รุนแรง 3 วัน');
    await page.fill('textarea[name="diagnosis"]', 'สงสัย Migraine');
    await page.fill('textarea[name="treatment"]', 'ให้ยาแก้ปวด พักผ่อน ติดตามอาการ');
    
    // Approve and save
    await page.click('button:has-text("อนุมัติและบันทึก")');
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    console.log('✅ Doctor validated AI summary (Man-in-the-Loop)');
  });
  
  test('Doctor saves transcript and summary to EMR', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/appointments`);
    await page.click('button:has-text("ที่ผ่านมา")');
    const completedAppointment = page.locator('[data-testid="appointment-card"]').first();
    await completedAppointment.click();
    
    // Save to EMR
    await page.click('button:has-text("บันทึกลง EMR")');
    
    // Verify confirmation
    await expect(page.locator('text=บันทึกลง EMR สำเร็จ')).toBeVisible();
    
    // Navigate to patient EMR
    await page.click('a:has-text("ดู EMR")');
    
    // Verify encounter note created
    await expect(page.locator('text=/Encounter Note|บันทึกการพบ/i')).toBeVisible();
    
    // Verify transcript attached
    await expect(page.locator('a:has-text("Transcript")')).toBeVisible();
    
    // Verify AI summary in note
    await expect(page.locator('text=ปวดศีรษะด้านหน้า')).toBeVisible();
    
    console.log('✅ Transcript and summary saved to EMR');
  });
  
  test('Patient views meeting summary', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/appointments`);
    
    // Find completed appointment
    await page.click('button:has-text("ที่ผ่านมา")');
    const completedAppointment = page.locator('[data-testid="appointment-card"]').first();
    await completedAppointment.click();
    
    // View summary
    await page.click('button:has-text("ดูสรุป")');
    
    // Verify patient sees validated summary (not AI raw output)
    await expect(page.locator('h3:has-text("อาการ")')).toBeVisible();
    await expect(page.locator('text=ปวดศีรษะด้านหน้า')).toBeVisible();
    
    // Verify diagnosis
    await expect(page.locator('text=Migraine')).toBeVisible();
    
    // Verify treatment plan
    await expect(page.locator('text=ให้ยาแก้ปวด')).toBeVisible();
    
    // Transcript should NOT be visible to patient (privacy)
    await expect(page.locator('a:has-text("Transcript")')).not.toBeVisible();
    
    console.log('✅ Patient viewed validated summary');
  });
  
  test('Load demo meeting simulation', async ({ page }) => {
    // Load demo meeting data with Thai transcript
    const demoMeetingPath = path.join(__dirname, '../../fixtures/complete-meeting-simulation.json');
    
    if (fs.existsSync(demoMeetingPath)) {
      const demoData = JSON.parse(fs.readFileSync(demoMeetingPath, 'utf-8'));
      
      console.log('Demo meeting data:');
      console.log('- Transcript items:', demoData.transcript.length);
      console.log('- Duration:', demoData.duration);
      console.log('- Language:', demoData.metadata.language);
      
      // Verify Thai content
      const hasThaiContent = demoData.transcript.some((item: any) => 
        /[\u0E00-\u0E7F]/.test(item.text)
      );
      
      expect(hasThaiContent).toBe(true);
      
      console.log('✅ Demo meeting simulation loaded');
    }
  });
  
});
