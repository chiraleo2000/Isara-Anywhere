/**
 * Seed Appointments Script for Izara Doctor Portal
 * 
 * Creates test appointments and pool items in GCS
 * These will be visible in both patient portal and doctor portal
 * 
 * Usage: node scripts/seedAppointments.cjs
 */

const fetch = require('node-fetch');

// Configuration
const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';
const BUCKETS = {
  appointments: 'izara-appointments',
  patients: 'izara-patients-data',
  doctors: 'izara-doctors-data'
};

// Test patients to create appointments for
const TEST_PATIENTS = [
  {
    id: 'PAT-001',
    name: 'สมชาย ใจดี',
    email: 'somchai@example.com',
    phone: '081-111-1111'
  },
  {
    id: 'PAT-002',
    name: 'สมหญิง รักสุขภาพ',
    email: 'somying@example.com',
    phone: '082-222-2222'
  },
  {
    id: 'PAT-003',
    name: 'วิชัย เข็มแข็ง',
    email: 'wichai@example.com',
    phone: '083-333-3333'
  },
  {
    id: 'PAT-004',
    name: 'นภา สวัสดิ์',
    email: 'napa@example.com',
    phone: '084-444-4444'
  }
];

// Test doctors (matching seeded users in doctor portal)
const TEST_DOCTORS = [
  {
    id: 'DOC-001',
    name: 'Dr. Sarah Chen',
    specialty: 'Internal Medicine',
    email: 'sarah.chen@izara.health'
  },
  {
    id: 'DOC-002',
    name: 'Dr. Michael Tanaka',
    specialty: 'Gastroenterology',
    email: 'michael.tanaka@izara.health'
  },
  {
    id: 'DOC-003',
    name: 'Dr. Emily Wong',
    specialty: 'Cardiology',
    email: 'emily.wong@izara.health'
  }
];

// Helper functions
async function writeToGCS(bucket, path, data) {
  const response = await fetch(`${GCS_API_URL}/api/storage/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, path, data })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GCS write failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function readFromGCS(bucket, path) {
  const response = await fetch(
    `${GCS_API_URL}/api/storage/read?bucket=${bucket}&path=${encodeURIComponent(path)}`
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`GCS read failed: ${response.status}`);
  }

  return await response.json();
}

// Generate test data
function generateTestAppointments() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const formatDate = (d) => d.toISOString().split('T')[0];

  return [
    // Confirmed appointment for today (should appear in queue)
    {
      id: `apt_${Date.now()}_001`,
      patientId: TEST_PATIENTS[0].id,
      patientName: TEST_PATIENTS[0].name,
      patientEmail: TEST_PATIENTS[0].email,
      doctorId: TEST_DOCTORS[0].id,
      doctorName: TEST_DOCTORS[0].name,
      appointmentDate: formatDate(today),
      appointmentTime: '09:00',
      status: 'confirmed',
      reason: 'ไข้ ปวดหัว 3 วัน',
      symptoms: {
        description: 'ไข้ ปวดหัว 3 วัน',
        additionalSymptoms: ['ไข้', 'ปวดหัว', 'อ่อนเพลีย']
      },
      urgency: 'normal',
      appointmentType: 'telehealth',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Confirmed appointment for today (different doctor)
    {
      id: `apt_${Date.now()}_002`,
      patientId: TEST_PATIENTS[1].id,
      patientName: TEST_PATIENTS[1].name,
      patientEmail: TEST_PATIENTS[1].email,
      doctorId: TEST_DOCTORS[1].id,
      doctorName: TEST_DOCTORS[1].name,
      appointmentDate: formatDate(today),
      appointmentTime: '10:30',
      status: 'confirmed',
      reason: 'ปวดท้อง กรดไหลย้อน',
      symptoms: {
        description: 'ปวดท้อง กรดไหลย้อน',
        additionalSymptoms: ['ปวดท้อง', 'กรดไหลย้อน', 'คลื่นไส้']
      },
      urgency: 'urgent',
      appointmentType: 'telehealth',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Pending appointment awaiting doctor response
    {
      id: `apt_${Date.now()}_003`,
      patientId: TEST_PATIENTS[2].id,
      patientName: TEST_PATIENTS[2].name,
      patientEmail: TEST_PATIENTS[2].email,
      doctorId: TEST_DOCTORS[0].id,
      doctorName: TEST_DOCTORS[0].name,
      appointmentDate: formatDate(tomorrow),
      appointmentTime: '14:00',
      status: 'awaiting_doctor_response',
      reason: 'ปวดหลัง เรื้อรัง',
      symptoms: {
        description: 'ปวดหลัง เรื้อรัง 2 สัปดาห์',
        additionalSymptoms: ['ปวดหลัง', 'ปวดกล้ามเนื้อ']
      },
      urgency: 'normal',
      appointmentType: 'telehealth',
      preferredDates: [formatDate(tomorrow), formatDate(nextWeek)],
      preferredTimeSlot: 'afternoon',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Another confirmed for tomorrow
    {
      id: `apt_${Date.now()}_004`,
      patientId: TEST_PATIENTS[3].id,
      patientName: TEST_PATIENTS[3].name,
      patientEmail: TEST_PATIENTS[3].email,
      doctorId: TEST_DOCTORS[2].id,
      doctorName: TEST_DOCTORS[2].name,
      appointmentDate: formatDate(tomorrow),
      appointmentTime: '11:00',
      status: 'confirmed',
      reason: 'เจ็บหน้าอก หายใจลำบาก',
      symptoms: {
        description: 'เจ็บหน้าอก หายใจลำบาก',
        additionalSymptoms: ['เจ็บหน้าอก', 'หายใจลำบาก', 'ใจสั่น']
      },
      urgency: 'emergency',
      appointmentType: 'telehealth',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

function generateTestPoolItems() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const formatDate = (d) => d.toISOString().split('T')[0];

  return [
    // Pool item - no doctor selected (system assignment)
    {
      id: `pool_${Date.now()}_001`,
      appointmentId: `apt_pool_${Date.now()}_001`,
      patientId: 'PAT-005',
      patientName: 'ประเสริฐ มั่นคง',
      patientEmail: 'prasert@example.com',
      originalDoctorId: null,
      originalDoctorName: null,
      requiredSpecialty: 'Internal Medicine',
      matchedSpecialties: ['Internal Medicine', 'General Practitioner'],
      symptoms: ['ไข้', 'ปวดหัว', 'อ่อนเพลีย'],
      symptomDescription: 'ไข้สูง 39 องศา ปวดหัวมาก',
      urgency: 'urgent',
      preferredDates: [formatDate(tomorrow), formatDate(nextWeek)],
      preferredTimeSlot: 'morning',
      appointmentType: 'telehealth',
      poolReason: 'no_doctor_selected',
      poolStatus: 'pending',
      adminApprovalRequired: false,
      missedCount: 0,
      maxMissedAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Pool item - doctor unavailable
    {
      id: `pool_${Date.now()}_002`,
      appointmentId: `apt_pool_${Date.now()}_002`,
      patientId: 'PAT-006',
      patientName: 'สุดา แสนดี',
      patientEmail: 'suda@example.com',
      originalDoctorId: TEST_DOCTORS[1].id,
      originalDoctorName: TEST_DOCTORS[1].name,
      requiredSpecialty: 'Gastroenterology',
      matchedSpecialties: ['Gastroenterology', 'Internal Medicine'],
      symptoms: ['ปวดท้อง', 'ท้องเสีย', 'คลื่นไส้'],
      symptomDescription: 'ปวดท้องรุนแรง ท้องเสียหลายครั้ง',
      urgency: 'emergency',
      preferredDates: [formatDate(today), formatDate(tomorrow)],
      preferredTimeSlot: 'afternoon',
      appointmentType: 'telehealth',
      poolReason: 'doctor_unavailable',
      poolStatus: 'pending',
      adminApprovalRequired: false,
      missedCount: 0,
      maxMissedAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Pool item - AI matched (waiting for doctor to claim)
    {
      id: `pool_${Date.now()}_003`,
      appointmentId: `apt_pool_${Date.now()}_003`,
      patientId: 'PAT-007',
      patientName: 'มานพ ยืนยง',
      patientEmail: 'manop@example.com',
      originalDoctorId: null,
      originalDoctorName: null,
      requiredSpecialty: 'Cardiology',
      matchedSpecialties: ['Cardiology', 'Internal Medicine'],
      symptoms: ['เจ็บหน้าอก', 'หายใจลำบาก'],
      symptomDescription: 'เจ็บหน้าอกเวลาออกกำลังกาย',
      urgency: 'normal',
      preferredDates: [formatDate(nextWeek)],
      preferredTimeSlot: 'evening',
      appointmentType: 'telehealth',
      poolReason: 'no_doctor_selected',
      poolStatus: 'ai_matched',
      aiMatchedDoctorId: TEST_DOCTORS[2].id,
      aiMatchedDoctorName: TEST_DOCTORS[2].name,
      aiMatchReason: 'Matched by specialty: Cardiology',
      adminApprovalRequired: false,
      missedCount: 0,
      maxMissedAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

// Main seeding function
async function seedAppointments() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🏥 IZARA - SEED APPOINTMENTS DATA');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Test GCS connection
    console.log('🔍 Testing GCS connection...');
    const healthResponse = await fetch(`${GCS_API_URL}/api/health`);
    if (!healthResponse.ok) {
      throw new Error('GCS API Server not responding. Make sure it\'s running on port 3012');
    }
    console.log('✅ GCS API Server is healthy\n');

    // Generate test data
    const appointments = generateTestAppointments();
    const poolItems = generateTestPoolItems();

    // Read existing appointments (merge with new ones)
    console.log('📖 Reading existing appointments...');
    let existingAppointments = await readFromGCS(BUCKETS.appointments, 'appointments.json') || [];
    if (!Array.isArray(existingAppointments)) existingAppointments = [];
    console.log(`   Found ${existingAppointments.length} existing appointments`);

    // Merge - avoid duplicates by checking IDs
    const existingIds = new Set(existingAppointments.map(a => a.id));
    const newAppointments = appointments.filter(a => !existingIds.has(a.id));
    const mergedAppointments = [...existingAppointments, ...newAppointments];

    // Write appointments
    console.log(`\n📝 Writing ${mergedAppointments.length} appointments...`);
    await writeToGCS(BUCKETS.appointments, 'appointments.json', mergedAppointments);
    console.log('✅ Appointments saved');

    // Write individual appointment details
    for (const apt of newAppointments) {
      await writeToGCS(
        BUCKETS.appointments,
        `appointments/${apt.id}/details.json`,
        apt
      );
    }
    console.log(`✅ Saved ${newAppointments.length} new appointment details`);

    // Read existing pool items
    console.log('\n📖 Reading existing pool items...');
    let existingPool = await readFromGCS(BUCKETS.appointments, 'appointment-pool/pool.json') || [];
    if (!Array.isArray(existingPool)) existingPool = [];
    console.log(`   Found ${existingPool.length} existing pool items`);

    // Merge pool items
    const existingPoolIds = new Set(existingPool.map(p => p.id));
    const newPoolItems = poolItems.filter(p => !existingPoolIds.has(p.id));
    const mergedPool = [...existingPool, ...newPoolItems];

    // Write pool items
    console.log(`\n📝 Writing ${mergedPool.length} pool items...`);
    await writeToGCS(BUCKETS.appointments, 'appointment-pool/pool.json', mergedPool);
    console.log('✅ Pool items saved');

    // Write individual pool item details
    for (const item of newPoolItems) {
      await writeToGCS(
        BUCKETS.appointments,
        `appointment-pool/items/${item.id}.json`,
        item
      );
    }
    console.log(`✅ Saved ${newPoolItems.length} new pool item details`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 SEEDING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('✅ Appointments:');
    mergedAppointments.forEach(apt => {
      console.log(`   ${apt.id}: ${apt.patientName} → ${apt.doctorName || 'No doctor'} (${apt.status})`);
      console.log(`      Date: ${apt.appointmentDate} ${apt.appointmentTime}`);
    });
    
    console.log('\n✅ Pool Items:');
    mergedPool.forEach(item => {
      console.log(`   ${item.id}: ${item.patientName} - ${item.requiredSpecialty} (${item.poolStatus})`);
      console.log(`      Reason: ${item.poolReason}, Urgency: ${item.urgency}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎉 SEEDING COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('ℹ️  Test the sync by:');
    console.log('   1. Start patient portal: cd Isara-patient-portal && npm run dev');
    console.log('   2. Start doctor portal: cd Isara-doctor-portal && npm run start:all');
    console.log('   3. Login to doctor portal with DOC-001, DOC-002, or DOC-003');
    console.log('   4. Check Queue Management page for today\'s appointments');
    console.log('   5. Check Appointment Pool page for pending requests\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error('\nMake sure:');
    console.error('  1. GCS API Server is running: npm run api');
    console.error('  2. You have valid GCS credentials configured');
    process.exit(1);
  }
}

// Run the seeding
seedAppointments();
