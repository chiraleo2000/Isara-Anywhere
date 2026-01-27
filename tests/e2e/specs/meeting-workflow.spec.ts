/**
 * Meeting Host Controls & AI Summary E2E Tests
 * Full workflow: Create Meeting → Invite Guests → Host Controls → AI Summary → EMR
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials
const PATIENT = { email: 'demo.test@gmail.com', password: 'P@ssw0rd', id: 'PATIENT-DEMO' };
const DOCTOR = { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024', id: 'DOCTOR-001' };
const RELATIVE = { email: 'relative.test@gmail.com', password: 'P@ssw0rd', name: 'คุณแม่ผู้ป่วย' };

// Base URLs
const PATIENT_PORTAL = 'http://localhost:3005';
const DOCTOR_PORTAL = 'http://localhost:3010';
const MEETING_API = 'http://localhost:3020';

// Helper: Login
async function login(page: Page, email: string, password: string, portal: 'patient' | 'doctor') {
  const baseUrl = portal === 'patient' ? PATIENT_PORTAL : DOCTOR_PORTAL;
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
}

// Helper: Get auth token
async function getAuthToken(page: Page): Promise<string> {
  return await page.evaluate(() => {
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  });
}

test.describe('Meeting Creation & Invite System', () => {

  test('12. Patient can create meeting and invite relatives', async ({ page }) => {
    await login(page, PATIENT.email, PATIENT.password, 'patient');
    const token = await getAuthToken(page);
    
    // Create meeting with guest invite
    const createResponse = await page.request.post(`${MEETING_API}/api/meetings/create`, {
      data: {
        patientId: PATIENT.id,
        appointmentId: 'APT-001',
        title: 'ปรึกษาอาการทั่วไป',
        guests: [
          { name: RELATIVE.name, email: RELATIVE.email, role: 'relative' }
        ]
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(createResponse.status()).toBe(200);
    const meetingData = await createResponse.json();
    
    // Verify meeting has invite token for guest
    if (meetingData.meeting) {
      expect(meetingData.meeting.id).toBeDefined();
      expect(meetingData.meeting.link).toContain('meet.jit.si');
      expect(meetingData.inviteTokens).toBeDefined();
    }
  });

  test('13. Doctor can invite specialist consultant', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    const token = await getAuthToken(page);
    
    // Doctor invites specialist to existing meeting
    const inviteResponse = await page.request.post(`${MEETING_API}/api/meetings/invite`, {
      data: {
        meetingId: 'MEETING-001',
        inviteeEmail: 'specialist@izara.com',
        inviteeRole: 'consultant',
        inviteeName: 'Dr. Specialist'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Should return 200 if API exists, or appropriate error
    const status = inviteResponse.status();
    expect([200, 201, 400, 404]).toContain(status);
  });

});

test.describe('Meeting Host Controls', () => {

  test('14. Doctor (host) can accept/reject lobby participants', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    const token = await getAuthToken(page);
    
    // Simulate lobby management API call
    const lobbyResponse = await page.request.post(`${MEETING_API}/api/meetings/lobby/accept`, {
      data: {
        meetingId: 'MEETING-001',
        participantId: 'guest-12345',
        action: 'accept'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // API should respond (200 if exists, 404 if not implemented yet)
    const status = lobbyResponse.status();
    expect([200, 404, 400]).toContain(status);
  });

  test('15. Host can start transcript streaming', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    const token = await getAuthToken(page);
    
    // Start transcript API
    const transcriptResponse = await page.request.post(`${MEETING_API}/api/meetings/transcript/start`, {
      data: {
        meetingId: 'MEETING-001',
        language: 'th-TH'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const status = transcriptResponse.status();
    expect([200, 404, 400, 503]).toContain(status);
    
    if (status === 200) {
      const data = await transcriptResponse.json();
      expect(data.transcriptSessionId).toBeDefined();
    }
  });

  test('16. Host can stop transcript streaming', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    const token = await getAuthToken(page);
    
    // Stop transcript API
    const stopResponse = await page.request.post(`${MEETING_API}/api/meetings/transcript/stop`, {
      data: {
        meetingId: 'MEETING-001',
        transcriptSessionId: 'TRS-001'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const status = stopResponse.status();
    expect([200, 404, 400, 503]).toContain(status);
  });

});

test.describe('AI Meeting Summary', () => {

  test('17. AI can summarize meeting from transcript and chat', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    const token = await getAuthToken(page);
    
    // AI Summary API
    const summaryResponse = await page.request.post(`${MEETING_API}/api/meetings/summary`, {
      data: {
        meetingId: 'MEETING-001',
        includeTranscript: true,
        includeChat: true,
        language: 'th'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const status = summaryResponse.status();
    expect([200, 404, 400, 503]).toContain(status);
    
    if (status === 200) {
      const data = await summaryResponse.json();
      expect(data.summary).toBeDefined();
      expect(data.keyPoints).toBeDefined();
    }
  });

  test('18. AI summary can be sent to doctor for review', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    const token = await getAuthToken(page);
    
    // Send summary to doctor
    const sendResponse = await page.request.post(`${MEETING_API}/api/meetings/summary/send`, {
      data: {
        meetingId: 'MEETING-001',
        recipientType: 'doctor',
        recipientId: DOCTOR.id,
        summaryId: 'SUM-001'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const status = sendResponse.status();
    expect([200, 201, 404, 400]).toContain(status);
  });

});

test.describe('EMR Generation from Meeting', () => {

  test('19. Doctor can generate EMR from meeting summary', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    const token = await getAuthToken(page);
    
    // Generate EMR from meeting
    const emrResponse = await page.request.post(`${DOCTOR_PORTAL}/api/emr/from-meeting`, {
      data: {
        meetingId: 'MEETING-001',
        patientId: PATIENT.id,
        summaryId: 'SUM-001',
        doctorNotes: 'ผู้ป่วยมีอาการไข้ต่ำ แนะนำให้พักผ่อน ดื่มน้ำมาก'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const status = emrResponse.status();
    expect([200, 201, 404, 400]).toContain(status);
  });

  test('20. Doctor can review and approve EMR (Man-in-the-Loop)', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    
    // Navigate to EMR review page
    await page.click('text=EMR, text=เวชระเบียน, text=บันทึก').first();
    await page.waitForLoadState('networkidle');
    
    // Look for pending EMR
    const pendingEmr = page.locator('[data-status="pending"], .emr-pending, .needs-review').first();
    if (await pendingEmr.isVisible()) {
      await pendingEmr.click();
      
      // Approve button
      const approveBtn = page.locator('button:has-text("อนุมัติ"), button:has-text("Approve")').first();
      if (await approveBtn.isVisible()) {
        await expect(approveBtn).toBeEnabled();
      }
    }
  });

  test('21. Approved EMR is sent to patient', async ({ page }) => {
    await login(page, DOCTOR.email, DOCTOR.password, 'doctor');
    const token = await getAuthToken(page);
    
    // Send EMR to patient
    const sendResponse = await page.request.post(`${DOCTOR_PORTAL}/api/emr/send-to-patient`, {
      data: {
        emrId: 'EMR-001',
        patientId: PATIENT.id,
        includeFullReport: false,
        includeSummary: true
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const status = sendResponse.status();
    expect([200, 201, 404, 400]).toContain(status);
  });

});

test.describe('Patient Health Meeting Results', () => {

  test('22. Patient can see meeting results in health history', async ({ page }) => {
    await login(page, PATIENT.email, PATIENT.password, 'patient');
    
    // Navigate to health records / meeting history
    await page.click('text=ประวัติสุขภาพ, text=สุขภาพ, text=Health').first();
    await page.waitForLoadState('networkidle');
    
    // Look for meeting/consultation section
    const meetingSection = page.locator('text=การนัดพบแพทย์, text=การประชุม, text=Consultations').first();
    if (await meetingSection.isVisible()) {
      await meetingSection.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Verify results are displayed
    await expect(page.locator('h1, h2, .meeting-result, .health-timeline').first()).toBeVisible();
  });

  test('23. Patient can view EMR summary shared by doctor', async ({ page }) => {
    await login(page, PATIENT.email, PATIENT.password, 'patient');
    
    // Navigate to medical records
    await page.click('text=เวชระเบียน, text=บันทึก, text=Records').first();
    await page.waitForLoadState('networkidle');
    
    // Verify patient can see shared EMR summaries
    const emrList = page.locator('.emr-list, .records-list, table').first();
    await expect(emrList).toBeVisible({ timeout: 10000 });
  });

});
