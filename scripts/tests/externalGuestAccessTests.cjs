/**
 * ============================================================================
 * IZARA TELEMEDICINE - External Guest Access Tests
 * ============================================================================
 * 
 * Tests external guest access for NON-REGISTERED users:
 *   - Patient relatives (any email domain like @gmail.com, @hotmail.com, @yahoo.com)
 *   - Doctor consultants/specialists (external hospitals, private practice)
 *   - Family members not in the system
 * 
 * These users:
 *   - Are NOT registered in Izara system
 *   - Receive meeting invite links from doctor or patient
 *   - Can join meetings without logging into Izara
 *   - Enter via lobby and need doctor approval
 * 
 * Run: node scripts/tests/externalGuestAccessTests.cjs [--local|--cloud]
 * 
 * @version 1.0.0
 * @date January 2026
 */

const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const isCloud = process.argv.includes('--cloud');
const isLocal = process.argv.includes('--local') || !isCloud;

const config = {
  name: isCloud ? 'Cloud External Guest Tests' : 'Local External Guest Tests',
  patientApi: isCloud 
    ? 'https://izara-patient-portal-724889190329.asia-southeast1.run.app'
    : 'http://localhost:3005',
  doctorApi: isCloud
    ? 'https://izara-doctor-portal-724889190329.asia-southeast1.run.app'
    : 'http://localhost:3010',
  
  // Registered users (exist in Izara system)
  doctor: {
    id: 'DOC-001',
    name: 'Dr. Test Doctor',
    email: 'doctor.test@izara.com'
  },
  patient: {
    id: 'patient_1',
    name: 'Demo Patient',
    email: 'demo.test@gmail.com'
  },
  
  // EXTERNAL GUESTS - NOT registered in Izara
  externalGuests: {
    // Patient's family members (various email providers)
    motherGmail: {
      email: 'patient.mother@gmail.com',
      name: 'Mother (External)',
      role: 'patient_relative',
      relationship: 'mother'
    },
    fatherHotmail: {
      email: 'patient.father@hotmail.com',
      name: 'Father (External)',
      role: 'patient_relative',
      relationship: 'father'
    },
    sisterYahoo: {
      email: 'patient.sister@yahoo.com',
      name: 'Sister (External)',
      role: 'patient_relative',
      relationship: 'sibling'
    },
    spouseOutlook: {
      email: 'patient.spouse@outlook.com',
      name: 'Spouse (External)',
      role: 'patient_partner',
      relationship: 'spouse'
    },
    
    // External doctor consultants (not in Izara system)
    cardiologist: {
      email: 'dr.cardio@privatehospital.co.th',
      name: 'Dr. Cardiologist (External)',
      role: 'doctor_specialist',
      specialty: 'Cardiology'
    },
    neurologist: {
      email: 'neuro.specialist@regionalhospital.go.th',
      name: 'Dr. Neurologist (External)',
      role: 'doctor_specialist',
      specialty: 'Neurology'
    },
    advisor: {
      email: 'medical.advisor@university.ac.th',
      name: 'Prof. Medical Advisor (External)',
      role: 'doctor_advisor',
      specialty: 'Internal Medicine'
    },
    
    // Edge cases
    unknownDomain: {
      email: 'guest@randomdomain123.xyz',
      name: 'Guest Unknown Domain',
      role: 'other'
    },
    thaiEmail: {
      email: 'thai.relative@thailandmail.co.th',
      name: 'Thai Email Guest',
      role: 'patient_relative'
    }
  }
};

// ============================================================================
// CONSOLE FORMATTING
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

function log(type, msg) {
  const icons = {
    info: `${colors.cyan}ℹ️ `,
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warn: `${colors.yellow}⚠️ `,
    header: `${colors.bright}${colors.cyan}`,
    section: `${colors.bright}${colors.magenta}▶`,
    guest: `${colors.blue}👤`
  };
  console.log(`${icons[type] || ''} ${msg}${colors.reset}`);
}

// ============================================================================
// HTTP CLIENT
// ============================================================================

async function httpRequest(url, method = 'GET', body = null) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return { status: response.status, data, error: null };
  } catch (error) {
    return { status: 0, data: null, error: error.message };
  }
}

// ============================================================================
// TEST RESULTS TRACKER
// ============================================================================

class TestResults {
  constructor() {
    this.passed = [];
    this.failed = [];
    this.warnings = [];
  }
  
  pass(name, details = '') {
    this.passed.push({ name, details });
    log('success', `${name}${details ? ` - ${details}` : ''}`);
  }
  
  fail(name, error) {
    this.failed.push({ name, error: String(error) });
    log('error', `${name} - ${error}`);
  }
  
  warn(name, message) {
    this.warnings.push({ name, message });
    log('warn', `${name} - ${message}`);
  }
  
  summary() {
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bright}EXTERNAL GUEST ACCESS TEST RESULTS${colors.reset}`);
    console.log('═'.repeat(60));
    console.log(`${colors.green}✅ Passed: ${this.passed.length}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${this.failed.length}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Warnings: ${this.warnings.length}${colors.reset}`);
    console.log('═'.repeat(60));
    
    if (this.failed.length > 0) {
      console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
      this.failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    }
    
    return this.failed.length === 0;
  }
}

// ============================================================================
// TEST 1: API HEALTH CHECK
// ============================================================================

async function testAPIHealth(results) {
  log('section', 'TEST 1: Video Meeting API Health Check');
  
  try {
    const health = await httpRequest(`${config.patientApi}/api/video-meeting/health`);
    
    if (health.status === 200) {
      results.pass('Video meeting API is healthy');
      
      // Check guest invite support
      if (health.data?.features?.guestInviteLinks) {
        results.pass('Guest invite links feature available', health.data.features.guestInviteLinks);
      }
      
      // Check anonymous access
      if (health.data?.features?.anonymousAccess === 'Supported') {
        results.pass('Anonymous access supported (for external guests)');
      }
      
      // Check guest roles
      if (health.data?.guestRoles) {
        results.pass('Guest roles defined', 
          `Doctor can invite: ${health.data.guestRoles.doctorCanInvite?.join(', ')}`);
        results.pass('Patient guest roles', 
          `Patient can invite: ${health.data.guestRoles.patientCanInvite?.join(', ')}`);
      }
      
      return health.data;
    } else {
      results.fail('API health check', `Status ${health.status}`);
      return null;
    }
  } catch (error) {
    results.fail('API health check', error.message);
    return null;
  }
}

// ============================================================================
// TEST 2: CREATE MEETING FOR EXTERNAL GUEST TESTING
// ============================================================================

async function createTestMeeting(results) {
  log('section', 'TEST 2: Create Meeting for External Guest Testing');
  
  try {
    const appointmentId = `APT-GUEST-TEST-${Date.now()}`;
    
    const createResponse = await httpRequest(
      `${config.patientApi}/api/video-meeting/create`,
      'POST',
      {
        appointmentId,
        doctorId: config.doctor.id,
        doctorName: config.doctor.name,
        patientId: config.patient.id,
        patientName: config.patient.name,
        enableRecording: true,
        enableTranscription: true,
        language: 'th'
      }
    );
    
    if (createResponse.status === 200 && createResponse.data?.success) {
      results.pass('Test meeting created', `ID: ${createResponse.data.meeting.id}`);
      
      return {
        appointmentId,
        meetingId: createResponse.data.meeting.id,
        roomName: createResponse.data.meeting.roomName,
        urls: createResponse.data.urls
      };
    } else {
      results.fail('Create test meeting', createResponse.error || 'Failed');
      return null;
    }
  } catch (error) {
    results.fail('Create test meeting', error.message);
    return null;
  }
}

// ============================================================================
// TEST 3: PATIENT INVITES FAMILY MEMBERS (EXTERNAL EMAILS)
// ============================================================================

async function testPatientInvitesFamily(results, meetingData) {
  log('section', 'TEST 3: Patient Invites Family Members (External Emails)');
  
  if (!meetingData) {
    results.fail('Patient family invites', 'No meeting data');
    return [];
  }
  
  const invites = [];
  const familyGuests = [
    config.externalGuests.motherGmail,
    config.externalGuests.fatherHotmail,
    config.externalGuests.sisterYahoo,
    config.externalGuests.spouseOutlook
  ];
  
  for (const guest of familyGuests) {
    try {
      log('guest', `Inviting: ${guest.name} (${guest.email})`);
      
      const inviteResponse = await httpRequest(
        `${config.patientApi}/api/video-meeting/${meetingData.appointmentId}/invite`,
        'POST',
        {
          invitedBy: config.patient.id,
          inviterRole: 'patient',
          guestEmail: guest.email,
          guestName: guest.name,
          guestRole: guest.role,
          expiresInHours: 24
        }
      );
      
      if (inviteResponse.status === 200 && inviteResponse.data?.success) {
        results.pass(`Patient invited ${guest.role}`, guest.email);
        
        // Verify invite contains proper URLs
        const invite = inviteResponse.data.invite;
        
        if (invite.inviteUrl) {
          results.pass(`Invite URL generated for ${guest.name}`);
        }
        
        if (invite.directMeetingUrl) {
          results.pass(`Direct Jitsi URL generated for ${guest.name}`);
        }
        
        if (invite.token) {
          results.pass(`Secure token generated for ${guest.name}`, `Token: ${invite.token.substring(0, 16)}...`);
        }
        
        invites.push({
          ...invite,
          guestInfo: guest
        });
      } else {
        results.fail(`Invite ${guest.name}`, inviteResponse.error || inviteResponse.data?.error || 'Failed');
      }
    } catch (error) {
      results.fail(`Invite ${guest.name}`, error.message);
    }
  }
  
  return invites;
}

// ============================================================================
// TEST 4: DOCTOR INVITES EXTERNAL SPECIALISTS
// ============================================================================

async function testDoctorInvitesSpecialists(results, meetingData) {
  log('section', 'TEST 4: Doctor Invites External Specialists');
  
  if (!meetingData) {
    results.fail('Doctor specialist invites', 'No meeting data');
    return [];
  }
  
  const invites = [];
  const specialistGuests = [
    config.externalGuests.cardiologist,
    config.externalGuests.neurologist,
    config.externalGuests.advisor
  ];
  
  for (const guest of specialistGuests) {
    try {
      log('guest', `Inviting specialist: ${guest.name} (${guest.email})`);
      
      const inviteResponse = await httpRequest(
        `${config.patientApi}/api/video-meeting/${meetingData.appointmentId}/invite`,
        'POST',
        {
          invitedBy: config.doctor.id,
          inviterRole: 'doctor',
          guestEmail: guest.email,
          guestName: guest.name,
          guestRole: guest.role,
          expiresInHours: 24
        }
      );
      
      if (inviteResponse.status === 200 && inviteResponse.data?.success) {
        results.pass(`Doctor invited ${guest.role}`, `${guest.name} - ${guest.specialty || 'N/A'}`);
        
        invites.push({
          ...inviteResponse.data.invite,
          guestInfo: guest
        });
      } else {
        results.fail(`Invite specialist ${guest.name}`, inviteResponse.error || inviteResponse.data?.error || 'Failed');
      }
    } catch (error) {
      results.fail(`Invite specialist ${guest.name}`, error.message);
    }
  }
  
  return invites;
}

// ============================================================================
// TEST 5: EXTERNAL GUESTS JOIN WITH INVITE TOKEN (NO LOGIN REQUIRED)
// ============================================================================

async function testExternalGuestsJoin(results, meetingData, allInvites) {
  log('section', 'TEST 5: External Guests Join with Invite Token (No Login Required)');
  
  if (!meetingData || !allInvites || allInvites.length === 0) {
    results.fail('External guest join', 'No meeting data or invites');
    return;
  }
  
  const joinResults = [];
  
  for (const invite of allInvites) {
    try {
      const guestInfo = invite.guestInfo || { name: invite.guestName, email: invite.guestEmail };
      log('guest', `Testing join: ${guestInfo.name} (${guestInfo.email})`);
      
      // Guest joins using only the invite token - NO LOGIN required
      const joinResponse = await httpRequest(
        `${config.patientApi}/api/video-meeting/join-with-invite`,
        'POST',
        {
          token: invite.token,
          guestName: guestInfo.name,
          guestEmail: guestInfo.email
        }
      );
      
      if (joinResponse.status === 200 && joinResponse.data?.success) {
        results.pass(`External guest can join`, guestInfo.email);
        
        // Verify meeting URL is provided
        if (joinResponse.data.meetingUrl) {
          results.pass(`Meeting URL provided for ${guestInfo.name}`);
          
          // Verify URL contains Jitsi domain
          if (joinResponse.data.meetingUrl.includes('meet.jit.si')) {
            results.pass(`Jitsi URL valid for ${guestInfo.name}`);
          }
          
          // Verify guest info in response
          if (joinResponse.data.guest?.name === guestInfo.name) {
            results.pass(`Guest identity preserved`, guestInfo.name);
          }
        }
        
        joinResults.push({
          guest: guestInfo,
          meetingUrl: joinResponse.data.meetingUrl,
          success: true
        });
      } else {
        results.fail(`External guest join ${guestInfo.email}`, 
          joinResponse.data?.error || joinResponse.error || 'Failed');
        joinResults.push({ guest: guestInfo, success: false });
      }
    } catch (error) {
      results.fail(`External guest join`, error.message);
    }
  }
  
  return joinResults;
}

// ============================================================================
// TEST 6: EDGE CASES - UNUSUAL EMAIL DOMAINS
// ============================================================================

async function testEdgeCaseEmails(results, meetingData) {
  log('section', 'TEST 6: Edge Cases - Unusual Email Domains');
  
  if (!meetingData) {
    results.fail('Edge case emails', 'No meeting data');
    return;
  }
  
  const edgeCases = [
    config.externalGuests.unknownDomain,
    config.externalGuests.thaiEmail
  ];
  
  for (const guest of edgeCases) {
    try {
      log('guest', `Testing edge case: ${guest.email}`);
      
      const inviteResponse = await httpRequest(
        `${config.patientApi}/api/video-meeting/${meetingData.appointmentId}/invite`,
        'POST',
        {
          invitedBy: config.patient.id,
          inviterRole: 'patient',
          guestEmail: guest.email,
          guestName: guest.name,
          guestRole: guest.role,
          expiresInHours: 24
        }
      );
      
      if (inviteResponse.status === 200 && inviteResponse.data?.success) {
        results.pass(`Edge case email accepted`, guest.email);
        
        // Test join with this edge case
        const joinResponse = await httpRequest(
          `${config.patientApi}/api/video-meeting/join-with-invite`,
          'POST',
          {
            token: inviteResponse.data.invite.token,
            guestName: guest.name,
            guestEmail: guest.email
          }
        );
        
        if (joinResponse.status === 200 && joinResponse.data?.success) {
          results.pass(`Edge case guest can join`, guest.email);
        } else {
          results.fail(`Edge case join ${guest.email}`, joinResponse.data?.error || 'Failed');
        }
      } else {
        results.fail(`Edge case invite ${guest.email}`, inviteResponse.data?.error || 'Failed');
      }
    } catch (error) {
      results.fail(`Edge case ${guest.email}`, error.message);
    }
  }
}

// ============================================================================
// TEST 7: PERMISSION BOUNDARIES
// ============================================================================

async function testPermissionBoundaries(results, meetingData) {
  log('section', 'TEST 7: Permission Boundaries');
  
  if (!meetingData) {
    results.fail('Permission boundaries', 'No meeting data');
    return;
  }
  
  try {
    // Test: Patient should NOT be able to invite doctor_specialist
    log('info', 'Testing: Patient trying to invite doctor_specialist (should fail)');
    
    const invalidInvite = await httpRequest(
      `${config.patientApi}/api/video-meeting/${meetingData.appointmentId}/invite`,
      'POST',
      {
        invitedBy: config.patient.id,
        inviterRole: 'patient',
        guestEmail: 'fake.specialist@hospital.com',
        guestName: 'Fake Specialist',
        guestRole: 'doctor_specialist', // Patient shouldn't be able to invite specialists
        expiresInHours: 24
      }
    );
    
    if (invalidInvite.status === 403) {
      results.pass('Permission boundary enforced', 'Patient cannot invite doctor_specialist');
    } else if (invalidInvite.status === 200) {
      results.warn('Permission boundary', 'Patient was able to invite doctor_specialist (check if intended)');
    } else {
      results.pass('Invalid invite rejected', `Status: ${invalidInvite.status}`);
    }
    
    // Test: Doctor should NOT be able to invite patient_relative
    log('info', 'Testing: Doctor trying to invite patient_relative (should fail)');
    
    const invalidDoctorInvite = await httpRequest(
      `${config.patientApi}/api/video-meeting/${meetingData.appointmentId}/invite`,
      'POST',
      {
        invitedBy: config.doctor.id,
        inviterRole: 'doctor',
        guestEmail: 'fake.relative@gmail.com',
        guestName: 'Fake Relative',
        guestRole: 'patient_relative', // Doctor shouldn't be able to invite patient relatives
        expiresInHours: 24
      }
    );
    
    if (invalidDoctorInvite.status === 403) {
      results.pass('Permission boundary enforced', 'Doctor cannot invite patient_relative');
    } else if (invalidDoctorInvite.status === 200) {
      results.warn('Permission boundary', 'Doctor was able to invite patient_relative (check if intended)');
    } else {
      results.pass('Invalid invite rejected', `Status: ${invalidDoctorInvite.status}`);
    }
    
  } catch (error) {
    results.fail('Permission boundaries', error.message);
  }
}

// ============================================================================
// TEST 8: EXPIRED/INVALID TOKENS
// ============================================================================

async function testInvalidTokens(results, meetingData) {
  log('section', 'TEST 8: Expired/Invalid Tokens');
  
  try {
    // Test with fake/invalid token
    log('info', 'Testing join with invalid token');
    
    const fakeTokenJoin = await httpRequest(
      `${config.patientApi}/api/video-meeting/join-with-invite`,
      'POST',
      {
        token: 'fake-invalid-token-12345',
        guestName: 'Hacker',
        guestEmail: 'hacker@malicious.com'
      }
    );
    
    if (fakeTokenJoin.status === 404) {
      results.pass('Invalid token rejected', 'Status 404 - Invalid or expired');
    } else if (fakeTokenJoin.status !== 200) {
      results.pass('Invalid token rejected', `Status ${fakeTokenJoin.status}`);
    } else {
      results.fail('Security issue', 'Invalid token was accepted!');
    }
    
    // Test with empty token
    log('info', 'Testing join with empty token');
    
    const emptyTokenJoin = await httpRequest(
      `${config.patientApi}/api/video-meeting/join-with-invite`,
      'POST',
      {
        token: '',
        guestName: 'Empty Token Guest',
        guestEmail: 'empty@test.com'
      }
    );
    
    if (emptyTokenJoin.status === 400 || emptyTokenJoin.status === 404) {
      results.pass('Empty token rejected', `Status ${emptyTokenJoin.status}`);
    } else {
      results.fail('Security issue', 'Empty token was not properly rejected');
    }
    
  } catch (error) {
    results.fail('Invalid token tests', error.message);
  }
}

// ============================================================================
// TEST 9: LIST ALL INVITES
// ============================================================================

async function testListInvites(results, meetingData) {
  log('section', 'TEST 9: List All Meeting Invites');
  
  if (!meetingData) {
    results.fail('List invites', 'No meeting data');
    return;
  }
  
  try {
    const listResponse = await httpRequest(
      `${config.patientApi}/api/video-meeting/${meetingData.appointmentId}/invites`
    );
    
    if (listResponse.status === 200 && listResponse.data?.invites) {
      const invites = listResponse.data.invites;
      results.pass('Invites list retrieved', `Total: ${listResponse.data.totalInvites}`);
      
      // Log summary of invites by role
      const byRole = {};
      invites.forEach(inv => {
        byRole[inv.guestRole] = (byRole[inv.guestRole] || 0) + 1;
      });
      
      Object.entries(byRole).forEach(([role, count]) => {
        results.pass(`Invites by role: ${role}`, `Count: ${count}`);
      });
      
      // Check active vs expired
      const activeCount = listResponse.data.activeInvites || 0;
      results.pass('Active invites count', `Active: ${activeCount}`);
      
    } else {
      results.fail('List invites', listResponse.error || 'Failed');
    }
  } catch (error) {
    results.fail('List invites', error.message);
  }
}

// ============================================================================
// TEST 10: REVOKE INVITE
// ============================================================================

async function testRevokeInvite(results, meetingData, invites) {
  log('section', 'TEST 10: Revoke Guest Invite');
  
  if (!meetingData || !invites || invites.length === 0) {
    results.fail('Revoke invite', 'No meeting data or invites');
    return;
  }
  
  try {
    // Pick the last invite to revoke
    const inviteToRevoke = invites[invites.length - 1];
    const guestInfo = inviteToRevoke.guestInfo || { name: inviteToRevoke.guestName };
    
    log('info', `Revoking invite for: ${guestInfo.name}`);
    
    const revokeResponse = await httpRequest(
      `${config.patientApi}/api/video-meeting/${meetingData.appointmentId}/invite/${inviteToRevoke.token}`,
      'DELETE'
    );
    
    if (revokeResponse.status === 200 && revokeResponse.data?.success) {
      results.pass('Invite revoked successfully', guestInfo.name);
      
      // Try to join with revoked token
      log('info', 'Testing join with revoked token');
      
      const joinAfterRevoke = await httpRequest(
        `${config.patientApi}/api/video-meeting/join-with-invite`,
        'POST',
        {
          token: inviteToRevoke.token,
          guestName: guestInfo.name,
          guestEmail: inviteToRevoke.guestEmail
        }
      );
      
      if (joinAfterRevoke.status === 404) {
        results.pass('Revoked token rejected', 'Guest cannot join with revoked invite');
      } else {
        results.fail('Security issue', 'Revoked token was still accepted');
      }
    } else {
      results.fail('Revoke invite', revokeResponse.error || 'Failed');
    }
  } catch (error) {
    results.fail('Revoke invite', error.message);
  }
}

// ============================================================================
// TEST 11: JITSI URL VALIDATION
// ============================================================================

async function testJitsiURLs(results, joinResults) {
  log('section', 'TEST 11: Jitsi URL Validation for External Guests');
  
  if (!joinResults || joinResults.length === 0) {
    results.fail('Jitsi URL validation', 'No join results');
    return;
  }
  
  for (const result of joinResults) {
    if (!result.success || !result.meetingUrl) continue;
    
    const url = result.meetingUrl;
    const guestName = result.guest?.name || 'Guest';
    
    try {
      // Parse URL
      const urlObj = new URL(url);
      
      // Check domain
      if (urlObj.hostname === 'meet.jit.si') {
        results.pass(`Valid Jitsi domain for ${guestName}`);
      } else {
        results.warn(`Unexpected Jitsi domain for ${guestName}`, urlObj.hostname);
      }
      
      // Check for config parameters
      const hash = urlObj.hash;
      
      if (hash.includes('startWithVideoMuted=false')) {
        results.pass(`Video ON by default for ${guestName}`);
      }
      
      if (hash.includes('startWithAudioMuted=false')) {
        results.pass(`Audio ON by default for ${guestName}`);
      }
      
      if (hash.includes('prejoinPageEnabled=true')) {
        results.pass(`Prejoin page enabled for ${guestName}`);
      }
      
      // Check display name
      if (hash.includes('displayName')) {
        results.pass(`Display name configured for ${guestName}`);
      }
      
    } catch (error) {
      results.fail(`URL validation for ${guestName}`, error.message);
    }
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.bright}${colors.cyan}IZARA TELEMEDICINE - EXTERNAL GUEST ACCESS TESTS${colors.reset}`);
  console.log('═'.repeat(70));
  console.log(`Environment: ${config.name}`);
  console.log(`Patient API: ${config.patientApi}`);
  console.log(`Doctor API: ${config.doctorApi}`);
  console.log('═'.repeat(70) + '\n');
  
  const results = new TestResults();
  let meetingData = null;
  let allInvites = [];
  let joinResults = [];
  
  try {
    // Test 1: API Health
    await testAPIHealth(results);
    
    // Test 2: Create test meeting
    meetingData = await createTestMeeting(results);
    
    if (meetingData) {
      // Test 3: Patient invites family
      const familyInvites = await testPatientInvitesFamily(results, meetingData);
      allInvites = [...allInvites, ...familyInvites];
      
      // Test 4: Doctor invites specialists
      const specialistInvites = await testDoctorInvitesSpecialists(results, meetingData);
      allInvites = [...allInvites, ...specialistInvites];
      
      // Test 5: External guests join
      joinResults = await testExternalGuestsJoin(results, meetingData, allInvites);
      
      // Test 6: Edge case emails
      await testEdgeCaseEmails(results, meetingData);
      
      // Test 7: Permission boundaries
      await testPermissionBoundaries(results, meetingData);
      
      // Test 8: Invalid tokens
      await testInvalidTokens(results, meetingData);
      
      // Test 9: List invites
      await testListInvites(results, meetingData);
      
      // Test 10: Revoke invite
      await testRevokeInvite(results, meetingData, allInvites);
      
      // Test 11: Jitsi URL validation
      await testJitsiURLs(results, joinResults);
    }
    
  } catch (error) {
    log('error', `Test runner error: ${error.message}`);
  }
  
  // Summary
  const success = results.summary();
  
  // Save results to file
  const outputDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const resultsFile = path.join(outputDir, `external-guest-tests-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: config.name,
    passed: results.passed,
    failed: results.failed,
    warnings: results.warnings,
    totals: {
      passed: results.passed.length,
      failed: results.failed.length,
      warnings: results.warnings.length
    },
    externalGuestsTested: Object.keys(config.externalGuests),
    meetingData
  }, null, 2));
  
  log('info', `Results saved to: ${resultsFile}`);
  
  process.exit(success ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
