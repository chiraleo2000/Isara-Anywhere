/**
 * Seed Admin and Doctor Users Script
 * Creates test users for the Izara Doctor Portal with exact credentials from MOCK_DATA_REFERENCE
 * 
 * Test Users:
 * | ID | Email | Password | Role | Status |
 * |----|-------|----------|------|--------|
 * | ADMIN-001 | admin.test@izara.com | IzaraAdmin@2024 | Admin | ✅ Approved |
 * | DOC-001 | doctor.test@izara.com | IzaraDoctor@2024 | Doctor | ✅ Approved |
 * | DOC-002 | doctor02.test@izara.com | IzaraDoctor@2024 | Doctor | ⏳ Pending |
 * | DOC-003 | cardio.doctor@izara.com | IzaraDoctor@2024 | Doctor | ✅ Approved |
 * | DOC-INACTIVE-001 | inactive.doctor@izara.com | InactiveDoc@2024 | Doctor | 🚫 Inactive |
 * | DOC-REJECTED-001 | rejected.doctor@izara.com | RejectedDoc@2024 | Doctor | ❌ Rejected |
 * | DOC-LOCKED-001 | locked.doctor@izara.com | LockedDoc@2024 | Doctor | 🔒 Locked |
 * 
 * Usage: node scripts/seedUsers.cjs
 */

const bcrypt = require('bcryptjs');

const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
};

async function writeToGCS(bucket, path, data) {
  try {
    const url = `${GCS_API_URL}/api/storage/write`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path, data })
    });

    if (!response.ok) {
      throw new Error(`GCS write failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error writing ${bucket}/${path}:`, error.message);
    throw error;
  }
}

async function fetchFromGCS(bucket, path) {
  try {
    const url = `${GCS_API_URL}/api/storage/read?bucket=${bucket}&path=${encodeURIComponent(path)}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GCS read failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error fetching ${bucket}/${path}:`, error.message);
    return null;
  }
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// ============================================================================
// TEST USERS - Matching MOCK_DATA_REFERENCE
// ============================================================================

const testUsers = [
  // ADMIN
  {
    id: 'ADMIN-001',
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024',
    role: 'admin',
    status: 'approved',
    name: 'System Administrator',
    phone: '+66 2 123 4567',
    dateOfBirth: '1985-03-15',
    isActive: true,
    isApproved: true,
    emailVerified: true,
    adminPrivileges: {
      canManageDoctors: true,
      canManagePatients: true,
      canManageAppointments: true,
      canViewAnalytics: true,
      canManageSettings: true,
      canAssignRoles: true,
      level: 'super_admin'
    }
  },
  
  // DOCTORS
  {
    id: 'DOC-001',
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    role: 'doctor',
    status: 'approved',
    name: 'Dr. Somchai Prasert',
    phone: '+66 81 234 5678',
    dateOfBirth: '1980-06-20',
    specialty: 'General Practice',
    medicalLicenseNumber: 'MD-123456',
    hospital: 'Bangkok General Hospital',
    yearsOfExperience: 15,
    isActive: true,
    isApproved: true,
    emailVerified: true
  },
  {
    id: 'DOC-002',
    email: 'doctor02.test@izara.com',
    password: 'IzaraDoctor@2024',
    role: 'doctor',
    status: 'pending',
    name: 'Dr. Sukanya Wongchai',
    phone: '+66 82 345 6789',
    dateOfBirth: '1988-09-10',
    specialty: 'Pediatrics',
    medicalLicenseNumber: 'MD-234567',
    hospital: 'Bumrungrad International Hospital',
    yearsOfExperience: 8,
    isActive: true,
    isApproved: false,
    emailVerified: true
  },
  {
    id: 'DOC-003',
    email: 'cardio.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    role: 'doctor',
    status: 'approved',
    name: 'Dr. Preecha Cardiac',
    phone: '+66 83 456 7890',
    dateOfBirth: '1975-12-05',
    specialty: 'Cardiology',
    medicalLicenseNumber: 'MD-345678',
    hospital: 'Samitivej Hospital',
    yearsOfExperience: 20,
    isActive: true,
    isApproved: true,
    emailVerified: true
  },
  {
    id: 'DOC-INACTIVE-001',
    email: 'inactive.doctor@izara.com',
    password: 'InactiveDoc@2024',
    role: 'doctor',
    status: 'inactive',
    name: 'Dr. Inactive Status',
    phone: '+66 84 567 8901',
    dateOfBirth: '1982-04-18',
    specialty: 'Dermatology',
    medicalLicenseNumber: 'MD-456789',
    hospital: 'BNH Hospital',
    yearsOfExperience: 12,
    isActive: false,
    isApproved: true,
    emailVerified: true
  },
  {
    id: 'DOC-REJECTED-001',
    email: 'rejected.doctor@izara.com',
    password: 'RejectedDoc@2024',
    role: 'doctor',
    status: 'rejected',
    name: 'Dr. Rejected Application',
    phone: '+66 85 678 9012',
    dateOfBirth: '1990-07-22',
    specialty: 'Psychiatry',
    medicalLicenseNumber: 'MD-567890',
    hospital: 'Vejthani Hospital',
    yearsOfExperience: 5,
    isActive: false,
    isApproved: false,
    emailVerified: true,
    rejectionReason: 'Incomplete documentation'
  },
  {
    id: 'DOC-LOCKED-001',
    email: 'locked.doctor@izara.com',
    password: 'LockedDoc@2024',
    role: 'doctor',
    status: 'locked',
    name: 'Dr. Locked Account',
    phone: '+66 86 789 0123',
    dateOfBirth: '1983-11-30',
    specialty: 'Orthopedics',
    medicalLicenseNumber: 'MD-678901',
    hospital: 'Bangkok Hospital',
    yearsOfExperience: 10,
    isActive: false,
    isApproved: true,
    emailVerified: true,
    lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    lockReason: 'Multiple failed login attempts'
  }
];

// ============================================================================
// DOCTOR PROFILE GENERATOR
// ============================================================================

function generateDoctorProfile(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    specialty: user.specialty,
    medicalLicenseNumber: user.medicalLicenseNumber,
    hospital: user.hospital,
    phone: user.phone,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`,
    rating: Math.random() * 1 + 4,
    yearsOfExperience: user.yearsOfExperience || 10,
    qualifications: ['MD', `Board Certified - ${user.specialty}`],
    languages: ['Thai', 'English'],
    medicalSchool: 'Mahidol University Faculty of Medicine',
    boardCertifications: [user.specialty],
    consultationFee: Math.floor(Math.random() * 1000 + 500),
    availability: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
      saturday: [{ start: '09:00', end: '13:00' }],
      sunday: []
    },
    bio: `Dr. ${user.name.split(' ').slice(1).join(' ')} is a dedicated ${user.specialty} specialist with ${user.yearsOfExperience || 10} years of experience.`,
    isApproved: user.isApproved,
    isActive: user.isActive,
    approvalStatus: user.status,
    statistics: {
      totalPatients: Math.floor(Math.random() * 500 + 100),
      totalConsultations: Math.floor(Math.random() * 1000 + 200),
      averageRating: Math.random() * 0.5 + 4.5,
      responseTime: Math.floor(Math.random() * 30 + 5)
    }
  };
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedUsers() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🌱 SEEDING TEST USERS FOR IZARA DOCTOR PORTAL');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Check GCS connection
    console.log(`📡 Checking GCS API connection at ${GCS_API_URL}...`);
    const healthResponse = await fetch(`${GCS_API_URL}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`GCS API Server is not running on ${GCS_API_URL}. Please start it first.`);
    }
    console.log('✅ GCS API Server is healthy\n');

    // Get existing users index
    let usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    console.log(`📋 Found ${usersIndex.length} existing users\n`);

    // Doctors list
    let doctorsList = await fetchFromGCS(BUCKETS.doctor, 'doctors.json') || [];
    let pendingApprovals = [];

    console.log('👥 Creating users...\n');

    // Process each test user
    for (const user of testUsers) {
      console.log(`   Processing: ${user.name} (${user.email})`);

      // Create user credential
      const userCredential = {
        id: user.id,
        email: user.email,
        passwordHash: hashPassword(user.password),
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved,
        emailVerified: user.emailVerified,
        approvalStatus: user.status,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginAttempts: 0,
        lockedUntil: user.lockedUntil || null,
        name: user.name,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        preferences: {
          theme: 'light',
          language: 'th',
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        }
      };

      // Add role-specific data
      if (user.role === 'admin') {
        userCredential.adminPrivileges = user.adminPrivileges;
        userCredential.isAdmin = true;
      } else if (user.role === 'doctor') {
        userCredential.doctorId = user.id;
        userCredential.medicalLicenseNumber = user.medicalLicenseNumber;
        userCredential.specialty = user.specialty;
        userCredential.hospital = user.hospital;
        userCredential.rejectionReason = user.rejectionReason;
        userCredential.lockReason = user.lockReason;
      }

      // Save user credential
      await writeToGCS(BUCKETS.credentials, `users/${user.id}.json`, userCredential);

      // Update users index (remove existing entry first)
      usersIndex = usersIndex.filter(u => u.id !== user.id && u.email !== user.email);
      usersIndex.push({
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        approvalStatus: user.status
      });

      // Generate doctor profile
      if (user.role === 'doctor') {
        const doctorProfile = generateDoctorProfile(user);
        await writeToGCS(BUCKETS.doctor, `doctors/${user.id}.json`, doctorProfile);
        
        // Update doctors list
        doctorsList = doctorsList.filter(d => d.id !== user.id);
        doctorsList.push(doctorProfile);

        // Add to pending approvals if status is pending
        if (user.status === 'pending') {
          pendingApprovals.push({
            id: user.id,
            email: user.email,
            name: user.name,
            specialty: user.specialty,
            medicalLicenseNumber: user.medicalLicenseNumber,
            submittedDate: new Date().toISOString(),
            status: 'pending'
          });
        }
      }

      console.log(`      ✅ ${user.name} created successfully`);
    }

    // Save indexes
    console.log('\n📋 Saving indexes...');
    await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
    await writeToGCS(BUCKETS.doctor, 'doctors.json', doctorsList);
    await writeToGCS(BUCKETS.credentials, 'pending-approvals.json', pendingApprovals);
    console.log('   ✅ All indexes saved');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ USERS SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📋 TEST USERS SUMMARY:\n');
    
    console.log('═══ ADMIN ═══');
    console.log('Email: admin.test@izara.com');
    console.log('Password: IzaraAdmin@2024');
    console.log('Status: ✅ Approved\n');
    
    console.log('═══ DOCTORS ═══');
    console.log('1. Email: doctor.test@izara.com');
    console.log('   Password: IzaraDoctor@2024');
    console.log('   Status: ✅ Approved (General Practice)\n');
    
    console.log('2. Email: doctor02.test@izara.com');
    console.log('   Password: IzaraDoctor@2024');
    console.log('   Status: ⏳ Pending Approval (Pediatrics)\n');
    
    console.log('3. Email: cardio.doctor@izara.com');
    console.log('   Password: IzaraDoctor@2024');
    console.log('   Status: ✅ Approved (Cardiology)\n');
    
    console.log('4. Email: inactive.doctor@izara.com');
    console.log('   Password: InactiveDoc@2024');
    console.log('   Status: 🚫 Inactive (Dermatology)\n');
    
    console.log('5. Email: rejected.doctor@izara.com');
    console.log('   Password: RejectedDoc@2024');
    console.log('   Status: ❌ Rejected (Psychiatry)\n');
    
    console.log('6. Email: locked.doctor@izara.com');
    console.log('   Password: LockedDoc@2024');
    console.log('   Status: 🔒 Locked (Orthopedics)\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ SEED FAILED:', error.message);
    console.error('   Make sure the GCS API Server is running on', GCS_API_URL);
    process.exit(1);
  }
}

// Run seed
seedUsers();
