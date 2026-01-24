/**
 * Izara Telemedicine - Phase 1 Comprehensive Workflow Tests
 * 
 * This test suite covers all workflows from the Process documents:
 * 1. User Management (Admin approve/reject doctors)
 * 2. Appointment Workflows (Patient booking, doctor confirmation)
 * 3. Medical Content (Doctor creates, admin approves, patient reads)
 * 4. Clinical Resources (Doctor creates, admin approves)
 * 5. Health Records (PHR, EMR, Vital Signs)
 * 6. AI Features (Chat, CDS, Pre-summary, Instructions)
 * 7. Video Meeting (Jitsi + Transcription)
 * 
 * @version 2.0.0
 * @date January 19, 2026
 */

const fetch = require('node-fetch');
const crypto = require('node:crypto');

// Configuration
const CONFIG = {
  DOCTOR_PORTAL_URL: process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010',
  PATIENT_PORTAL_URL: process.env.PATIENT_PORTAL_URL || 'http://localhost:3005',
  PATIENT_API_URL: process.env.PATIENT_API_URL || 'http://localhost:3004',
  AUTH_SERVER_URL: process.env.AUTH_SERVER_URL || 'http://localhost:3011',
  GCS_API_URL: process.env.GCS_API_URL || 'http://localhost:3012',
};

// Test credentials
const TEST_USERS = {
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' },
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' },
  patient: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' }, // Uses auto-seeded demo user
  patientAnan: { email: 'Anan.Khayanrian@gmail.com', password: 'P@ssw0rd' },
};

// Test state
let doctorToken = null;
let adminToken = null;
let patientToken = null;
let testResults = [];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateTestId() {
  return `TEST-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

async function logTest(category, testName, passed, details = '') {
  const result = { category, testName, passed, details, timestamp: new Date().toISOString() };
  testResults.push(result);
  const status = passed ? '✅' : '❌';
  const detailsStr = details ? ` - ${details}` : '';
  console.log(`${status} [${category}] ${testName}${detailsStr}`);
  return passed;
}

async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// 1. AUTHENTICATION TESTS
// ============================================================================

async function testAuthentication() {
  console.log('\n📋 ===== AUTHENTICATION TESTS =====\n');
  
  // Test 1.1: Doctor Portal Login
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USERS.doctor)
    });
    const data = await response.json();
    doctorToken = data.token;
    await logTest('AUTH', 'Doctor Login', data.success && !!doctorToken, `Token: ${doctorToken?.substring(0, 20)}...`);
  } catch (error) {
    await logTest('AUTH', 'Doctor Login', false, error.message);
  }
  
  // Test 1.2: Admin Portal Login
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USERS.admin)
    });
    const data = await response.json();
    adminToken = data.token;
    await logTest('AUTH', 'Admin Login', data.success && !!adminToken, `Role: ${data.user?.role}`);
  } catch (error) {
    await logTest('AUTH', 'Admin Login', false, error.message);
  }
  
  // Test 1.3: Patient Portal Login
  try {
    const response = await fetchWithTimeout(`${CONFIG.PATIENT_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USERS.patient)
    });
    const data = await response.json();
    // Patient portal returns { user, token } without 'success' field
    patientToken = data.token;
    await logTest('AUTH', 'Patient Login', !!patientToken && !!data.user, `Patient: ${data.user?.name || data.user?.email || 'N/A'}`);
  } catch (error) {
    await logTest('AUTH', 'Patient Login', false, error.message);
  }
  
  // Test 1.4: Invalid Login
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fake@fake.com', password: 'wrongpassword' })
    });
    const data = await response.json();
    await logTest('AUTH', 'Invalid Login Rejected', !data.success, `Error: ${data.error || data.code}`);
  } catch (error) {
    await logTest('AUTH', 'Invalid Login Rejected', true, 'Request failed as expected');
  }
}

// ============================================================================
// 2. USER MANAGEMENT TESTS (Admin Workflows)
// ============================================================================

async function testUserManagement() {
  console.log('\n👥 ===== USER MANAGEMENT TESTS =====\n');
  
  if (!adminToken) {
    console.log('⚠️ Admin token not available, skipping user management tests');
    return;
  }
  
  // Test 2.1: Get Pending Doctors
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/admin/pending-doctors`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    const pendingCount = Array.isArray(data) ? data.length : data.doctors?.length || 0;
    await logTest('USER_MGMT', 'Get Pending Doctors List', response.ok, `Found ${pendingCount} doctors in system`);
  } catch (error) {
    await logTest('USER_MGMT', 'Get Pending Doctors List', false, error.message);
  }
  
  // Test 2.2: Simulate Doctor Registration (create pending doctor)
  const testDoctorEmail = `test.doctor.${Date.now()}@izara.com`;
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testDoctorEmail,
        password: 'TestDoctor@2024',
        name: 'Dr. Test Registration',
        nameThai: 'นพ. ทดสอบ การลงทะเบียน',
        specialty: 'General Practice',
        medicalLicenseNumber: `MD-TEST-${Date.now()}`
      })
    });
    const data = await response.json();
    await logTest('USER_MGMT', 'Doctor Registration (Pending)', data.success || data.user, `Email: ${testDoctorEmail}`);
  } catch (error) {
    await logTest('USER_MGMT', 'Doctor Registration (Pending)', false, error.message);
  }
  
  // Test 2.3: Check User Index
  try {
    const response = await fetchWithTimeout(`${CONFIG.GCS_API_URL}/api/storage/read?bucket=izara-users-credentials&path=users/index.json`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    const userCount = Array.isArray(data) ? data.length : data.data?.length || 0;
    await logTest('USER_MGMT', 'User Index Available', response.ok, `${userCount} users in index`);
  } catch (error) {
    await logTest('USER_MGMT', 'User Index Available', false, error.message);
  }
}

// ============================================================================
// 3. APPOINTMENT WORKFLOW TESTS
// ============================================================================

async function testAppointmentWorkflows() {
  console.log('\n📅 ===== APPOINTMENT WORKFLOW TESTS =====\n');
  
  if (!doctorToken || !patientToken) {
    console.log('⚠️ Tokens not available, skipping appointment tests');
    return;
  }
  
  // Test 3.1: Get Patient Appointments
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/appointments/patient/PATIENT-SOMCHAI`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    const appointmentCount = Array.isArray(data) ? data.length : data.appointments?.length || 0;
    await logTest('APPOINTMENTS', 'Get Patient Appointments', response.ok, `Found ${appointmentCount} appointments`);
  } catch (error) {
    await logTest('APPOINTMENTS', 'Get Patient Appointments', false, error.message);
  }
  
  // Test 3.2: Get Doctor Appointments
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/appointments/doctor/DOC-001`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    const appointmentCount = Array.isArray(data) ? data.length : data.appointments?.length || 0;
    await logTest('APPOINTMENTS', 'Get Doctor Appointments', response.ok, `Found ${appointmentCount} appointments`);
  } catch (error) {
    await logTest('APPOINTMENTS', 'Get Doctor Appointments', false, error.message);
  }
  
  // Test 3.3: Create New Appointment
  const testAppointmentId = `APT-TEST-${Date.now()}`;
  try {
    const appointmentData = {
      id: testAppointmentId,
      patientId: 'PATIENT-SOMCHAI',
      doctorId: 'DOC-001',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      time: '10:00',
      duration: 30,
      type: 'telemedicine',
      status: 'pending',
      chiefComplaint: 'Follow-up for hypertension',
      chiefComplaintThai: 'ติดตามอาการความดันโลหิตสูง'
    };
    
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/appointments`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appointmentData)
    });
    const data = await response.json();
    await logTest('APPOINTMENTS', 'Create New Appointment', response.ok || data.success, `ID: ${testAppointmentId}`);
  } catch (error) {
    await logTest('APPOINTMENTS', 'Create New Appointment', false, error.message);
  }
  
  // Test 3.4: Update Appointment Status (Doctor Confirms)
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/appointments/${testAppointmentId}/confirm`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        doctorId: 'DOC-001',
        confirmedAt: new Date().toISOString()
      })
    });
    const data = await response.json();
    await logTest('APPOINTMENTS', 'Confirm Appointment', response.ok || data.success, `Status: ${data.status || 'confirmed'}`);
  } catch (error) {
    await logTest('APPOINTMENTS', 'Confirm Appointment', false, error.message);
  }
}

// ============================================================================
// 4. MEDICAL CONTENT WORKFLOW TESTS
// ============================================================================

async function testMedicalContentWorkflows() {
  console.log('\n📚 ===== MEDICAL CONTENT WORKFLOW TESTS =====\n');
  
  if (!doctorToken || !adminToken) {
    console.log('⚠️ Tokens not available, skipping medical content tests');
    return;
  }
  
  // Test 4.1: Get Medical Content List
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/medical-content`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    const contentCount = Array.isArray(data) ? data.length : data.articles?.length || 0;
    await logTest('MEDICAL_CONTENT', 'Get Content List', response.ok, `Found ${contentCount} articles`);
  } catch (error) {
    await logTest('MEDICAL_CONTENT', 'Get Content List', false, error.message);
  }
  
  // Test 4.2: Doctor Creates Content (Pending Approval)
  const testContentId = `MC-TEST-${Date.now()}`;
  try {
    const contentData = {
      id: testContentId,
      title: 'Test Article: Understanding Hypertension',
      titleThai: 'บทความทดสอบ: ความเข้าใจเรื่องความดันโลหิตสูง',
      content: 'This is a test article about hypertension management.',
      contentThai: 'นี่คือบทความทดสอบเกี่ยวกับการจัดการความดันโลหิตสูง\n\n[image:https://example.com/bp-diagram.jpg:แผนภาพความดันโลหิต]',
      category: 'cardiovascular',
      tags: ['hypertension', 'blood-pressure', 'ความดันโลหิต'],
      status: 'pending', // Requires admin approval
      authorId: 'DOC-001'
    };
    
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/medical-content`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contentData)
    });
    const data = await response.json();
    await logTest('MEDICAL_CONTENT', 'Doctor Creates Content (Pending)', response.ok || data.success, `ID: ${testContentId}`);
  } catch (error) {
    await logTest('MEDICAL_CONTENT', 'Doctor Creates Content (Pending)', false, error.message);
  }
  
  // Test 4.3: Get Pending Content (Admin View)
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/medical-content/pending`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    const pendingCount = Array.isArray(data) ? data.length : data.pending?.length || 0;
    await logTest('MEDICAL_CONTENT', 'Admin Gets Pending Content', response.ok, `Found ${pendingCount} pending articles`);
  } catch (error) {
    await logTest('MEDICAL_CONTENT', 'Admin Gets Pending Content', false, error.message);
  }
  
  // Test 4.4: Admin Approves Content
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/medical-content/${testContentId}/approve`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        comment: 'Good article, approved for publishing'
      })
    });
    await logTest('MEDICAL_CONTENT', 'Admin Approves Content', response.ok, `Content ${testContentId} approved`);
  } catch (error) {
    await logTest('MEDICAL_CONTENT', 'Admin Approves Content', false, error.message);
  }
  
  // Test 4.5: Patient Can Read Published Content
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/medical-content?status=published`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    const publishedCount = data.articles?.length || 0;
    await logTest('MEDICAL_CONTENT', 'Patient Reads Published Content', response.ok, `${publishedCount} published articles available`);
  } catch (error) {
    await logTest('MEDICAL_CONTENT', 'Patient Reads Published Content', false, error.message);
  }
}

// ============================================================================
// 5. CLINICAL RESOURCES WORKFLOW TESTS
// ============================================================================

async function testClinicalResourcesWorkflows() {
  console.log('\n🏥 ===== CLINICAL RESOURCES WORKFLOW TESTS =====\n');
  
  if (!doctorToken || !adminToken) {
    console.log('⚠️ Tokens not available, skipping clinical resources tests');
    return;
  }
  
  // Test 5.1: Get Clinical Resources
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/clinical-resources`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    const resourceCount = Array.isArray(data) ? data.length : data.resources?.length || 0;
    await logTest('CLINICAL_RESOURCES', 'Get Resources List', response.ok, `Found ${resourceCount} resources`);
  } catch (error) {
    await logTest('CLINICAL_RESOURCES', 'Get Resources List', false, error.message);
  }
  
  // Test 5.2: Doctor Creates Clinical Resource
  const testResourceId = `CR-TEST-${Date.now()}`;
  try {
    const resourceData = {
      id: testResourceId,
      title: 'KDIGO 2024 CKD Guidelines Summary',
      titleThai: 'สรุปแนวทาง KDIGO 2024 สำหรับโรคไตเรื้อรัง',
      content: 'Summary of KDIGO 2024 guidelines for CKD management.',
      contentThai: 'สรุปแนวทาง KDIGO 2024 สำหรับการจัดการโรคไตเรื้อรัง',
      category: 'treatment',
      resourceType: 'guideline',
      tags: ['nephrology', 'CKD', 'KDIGO'],
      source: 'KDIGO 2024',
      status: 'pending',
      authorId: 'DOC-001'
    };
    
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/clinical-resources`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resourceData)
    });
    await logTest('CLINICAL_RESOURCES', 'Doctor Creates Resource', response.ok, `ID: ${testResourceId}`);
  } catch (error) {
    await logTest('CLINICAL_RESOURCES', 'Doctor Creates Resource', false, error.message);
  }
  
  // Test 5.3: Admin Reviews Clinical Resource
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/clinical-resources/${testResourceId}/approve`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        comment: 'Excellent clinical resource'
      })
    });
    await logTest('CLINICAL_RESOURCES', 'Admin Approves Resource', response.ok, `Resource approved`);
  } catch (error) {
    await logTest('CLINICAL_RESOURCES', 'Admin Approves Resource', false, error.message);
  }
}

// ============================================================================
// 6. HEALTH RECORDS TESTS (PHR, EMR, Vitals)
// ============================================================================

async function testHealthRecordsWorkflows() {
  console.log('\n🏥 ===== HEALTH RECORDS WORKFLOW TESTS =====\n');
  
  if (!doctorToken) {
    console.log('⚠️ Doctor token not available, skipping health records tests');
    return;
  }
  
  // Test 6.1: Get Patient PHR
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/phr/patient/PATIENT-SOMCHAI`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    await logTest('HEALTH_RECORDS', 'Get Patient PHR', response.ok, `Name: ${data.demographics?.name || 'N/A'}`);
  } catch (error) {
    await logTest('HEALTH_RECORDS', 'Get Patient PHR', false, error.message);
  }
  
  // Test 6.2: Get Vital Signs History
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/phr/patient/PATIENT-SOMCHAI/vitals/history`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    const vitalCount = Array.isArray(data) ? data.length : data.history?.length || 0;
    await logTest('HEALTH_RECORDS', 'Get Vital Signs History', response.ok, `${vitalCount} records`);
  } catch (error) {
    await logTest('HEALTH_RECORDS', 'Get Vital Signs History', false, error.message);
  }
  
  // Test 6.3: Get Patient EMR
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/emr/patient/PATIENT-SOMCHAI`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    const emrCount = Array.isArray(data) ? data.length : data.records?.length || 0;
    await logTest('HEALTH_RECORDS', 'Get Patient EMR', response.ok, `${emrCount} EMR records`);
  } catch (error) {
    await logTest('HEALTH_RECORDS', 'Get Patient EMR', false, error.message);
  }
  
  // Test 6.4: Get Complex Patient (Anan - DM + CKD)
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/phr/patient/PATIENT-ANAN`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    const conditionCount = data.chronicConditions?.length || 0;
    await logTest('HEALTH_RECORDS', 'Get Complex Patient (DM+CKD)', response.ok, `${conditionCount} conditions`);
  } catch (error) {
    await logTest('HEALTH_RECORDS', 'Get Complex Patient (DM+CKD)', false, error.message);
  }
}

// ============================================================================
// 7. AI FEATURES TESTS
// ============================================================================

async function testAIFeatures() {
  console.log('\n🤖 ===== AI FEATURES TESTS =====\n');
  
  if (!doctorToken) {
    console.log('⚠️ Doctor token not available, skipping AI tests');
    return;
  }
  
  // Test 7.1: AI Chat
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'What are the first-line treatments for hypertension?',
        patientId: 'PATIENT-SOMCHAI'
      })
    });
    const data = await response.json();
    await logTest('AI_FEATURES', 'AI Chat with Patient Context', data.success, `Response length: ${data.response?.length || 0} chars`);
  } catch (error) {
    await logTest('AI_FEATURES', 'AI Chat with Patient Context', false, error.message);
  }
  
  // Test 7.2: AI Pre-Consultation Summary
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/ai/pre-summary/PATIENT-SOMCHAI`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    await logTest('AI_FEATURES', 'AI Pre-Consultation Summary', data.success, `Summary length: ${data.summary?.length || 0} chars`);
  } catch (error) {
    await logTest('AI_FEATURES', 'AI Pre-Consultation Summary', false, error.message);
  }
  
  // Test 7.3: Clinical Decision Support
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/ai/cds`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patientId: 'PATIENT-ANAN', // Complex patient with DM + CKD
        action: 'check-interactions'
      })
    });
    const data = await response.json();
    await logTest('AI_FEATURES', 'Clinical Decision Support', data.success, `Recommendations: ${data.recommendations?.length || 0} chars`);
  } catch (error) {
    await logTest('AI_FEATURES', 'Clinical Decision Support', false, error.message);
  }
  
  // Test 7.4: Patient Instruction Sheet
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/ai/patient-instructions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patientId: 'PATIENT-SOMCHAI',
        diagnosis: 'Essential Hypertension',
        medications: [{ name: 'Amlodipine', dose: '5mg', frequency: 'once daily' }],
        instructions: 'Continue current medication',
        followUp: '2 weeks'
      })
    });
    const data = await response.json();
    await logTest('AI_FEATURES', 'Patient Instruction Sheet', data.success, `Status: ${data.status}`);
  } catch (error) {
    await logTest('AI_FEATURES', 'Patient Instruction Sheet', false, error.message);
  }
}

// ============================================================================
// 8. VIDEO MEETING TESTS
// ============================================================================

async function testVideoMeetingWorkflows() {
  console.log('\n📹 ===== VIDEO MEETING WORKFLOW TESTS =====\n');
  
  if (!doctorToken) {
    console.log('⚠️ Doctor token not available, skipping video meeting tests');
    return;
  }
  
  const testMeetingAptId = `APT-MEETING-TEST-${Date.now()}`;
  
  // Test 8.1: Create Video Meeting
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/video-meeting/create`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appointmentId: testMeetingAptId,
        patientId: 'PATIENT-SOMCHAI',
        doctorId: 'DOC-001'
      })
    });
    const data = await response.json();
    await logTest('VIDEO_MEETING', 'Create Jitsi Meeting', data.success, `Room: ${data.meeting?.roomName || 'N/A'}`);
  } catch (error) {
    await logTest('VIDEO_MEETING', 'Create Jitsi Meeting', false, error.message);
  }
  
  // Test 8.2: Submit Transcript
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/video-meeting/${testMeetingAptId}/transcript`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript: 'แพทย์: สวัสดีครับคุณสมชาย วันนี้มีอาการอย่างไรบ้างครับ\nผู้ป่วย: ดีขึ้นครับหมอ ความดันลดลงแล้ว'
      })
    });
    const data = await response.json();
    await logTest('VIDEO_MEETING', 'Submit Transcript', data.success, `Transcript ID: ${data.transcriptId || 'N/A'}`);
  } catch (error) {
    await logTest('VIDEO_MEETING', 'Submit Transcript', false, error.message);
  }
  
  // Test 8.3: End Meeting with Summary
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/video-meeting/${testMeetingAptId}/end`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ generateSummary: true })
    });
    const data = await response.json();
    await logTest('VIDEO_MEETING', 'End Meeting + Generate Summary', data.success, `Status: ${data.meeting?.status || 'N/A'}`);
  } catch (error) {
    await logTest('VIDEO_MEETING', 'End Meeting + Generate Summary', false, error.message);
  }
}

// ============================================================================
// 9. NOTIFICATION WORKFLOW TESTS
// ============================================================================

async function testNotificationWorkflows() {
  console.log('\n🔔 ===== NOTIFICATION WORKFLOW TESTS =====\n');
  
  if (!doctorToken) {
    console.log('⚠️ Doctor token not available, skipping notification tests');
    return;
  }
  
  // Test 9.1: Get User Notifications
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/notifications`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await response.json();
    const notifCount = Array.isArray(data) ? data.length : data.notifications?.length || 0;
    await logTest('NOTIFICATIONS', 'Get Notifications', response.ok, `${notifCount} notifications`);
  } catch (error) {
    await logTest('NOTIFICATIONS', 'Get Notifications', false, error.message);
  }
}

// ============================================================================
// 10. CONSULTANT MANAGEMENT TESTS
// ============================================================================

async function testConsultantManagement() {
  console.log('\n👨‍⚕️ ===== CONSULTANT MANAGEMENT TESTS =====\n');
  
  if (!adminToken) {
    console.log('⚠️ Admin token not available, skipping consultant tests');
    return;
  }
  
  // Test 10.1: Get Consultants List
  try {
    const response = await fetchWithTimeout(`${CONFIG.DOCTOR_PORTAL_URL}/api/consultants`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    const consultantCount = Array.isArray(data) ? data.length : data.consultants?.length || 0;
    await logTest('CONSULTANTS', 'Get Consultants List', response.ok, `${consultantCount} consultants`);
  } catch (error) {
    await logTest('CONSULTANTS', 'Get Consultants List', false, error.message);
  }
  
  // Test 10.2: Create Consultant (Admin)
  const testConsultantId = `CONS-TEST-${Date.now()}`;
  try {
    const consultantData = {
      isAdmin: true, // Required for admin-only endpoint
      userId: 'ADMIN-001',
      userName: 'Admin Test',
      id: testConsultantId,
      name: 'Dr. Test Cardiologist',
      nameThai: 'นพ. ทดสอบ โรคหัวใจ',
      specialty: 'Cardiology',
      hospital: 'Test Hospital',
      email: `consultant.test.${Date.now()}@hospital.co.th`,
      phone: '02-123-4567',
      available: true,
      languages: ['Thai', 'English'],
      experience: 15
    };
    
    // Use GCS API directly for consultant creation
    const response = await fetchWithTimeout(`${CONFIG.GCS_API_URL}/api/consultants`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(consultantData)
    });
    const data = await response.json();
    await logTest('CONSULTANTS', 'Admin Creates Consultant', response.ok || data.id, `ID: ${data.id || testConsultantId}`);
  } catch (error) {
    await logTest('CONSULTANTS', 'Admin Creates Consultant', false, error.message);
  }
}

// ============================================================================
// TEST SUMMARY REPORT
// ============================================================================

function generateTestReport() {
  console.log('\n📊 ===== TEST SUMMARY REPORT =====\n');
  
  const categories = [...new Set(testResults.map(r => r.category))];
  
  let totalTests = testResults.length;
  let totalPassed = testResults.filter(r => r.passed).length;
  let totalFailed = totalTests - totalPassed;
  
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│           IZARA TELEMEDICINE - PHASE 1 TESTS            │');
  console.log('├─────────────────────────────────────────────────────────┤');
  
  categories.forEach(category => {
    const categoryTests = testResults.filter(r => r.category === category);
    const passed = categoryTests.filter(r => r.passed).length;
    const total = categoryTests.length;
    const status = passed === total ? '✅' : '⚠️';
    console.log(`│ ${status} ${category.padEnd(25)} ${passed}/${total} passed`.padEnd(58) + '│');
  });
  
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ TOTAL: ${totalPassed}/${totalTests} tests passed (${Math.round(totalPassed/totalTests*100)}%)`.padEnd(58) + '│');
  console.log('└─────────────────────────────────────────────────────────┘');
  
  // List failed tests
  const failedTests = testResults.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach(t => {
      console.log(`   - [${t.category}] ${t.testName}: ${t.details}`);
    });
  }
  
  return { total: totalTests, passed: totalPassed, failed: totalFailed };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   IZARA TELEMEDICINE - PHASE 1 COMPREHENSIVE WORKFLOW TESTS   ║');
  console.log('║   Date: ' + new Date().toISOString().split('T')[0] + '                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  try {
    // Run all test suites
    await testAuthentication();
    await testUserManagement();
    await testAppointmentWorkflows();
    await testMedicalContentWorkflows();
    await testClinicalResourcesWorkflows();
    await testHealthRecordsWorkflows();
    await testAIFeatures();
    await testVideoMeetingWorkflows();
    await testNotificationWorkflows();
    await testConsultantManagement();
    
    // Generate summary
    const summary = generateTestReport();
    
    console.log('\n✅ Test suite completed!');
    console.log(`   Total: ${summary.total} tests`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    
    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
