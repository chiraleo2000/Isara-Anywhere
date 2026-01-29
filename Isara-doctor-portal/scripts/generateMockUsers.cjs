/**
 * Generate Mock Admin and Doctor Users
 * 
 * This script creates real user accounts in GCS for testing:
 * - 1 Admin user
 * - 1 Doctor user
 * 
 * Run: node scripts/generateMockUsers.cjs
 */

const { Storage } = require('@google-cloud/storage');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const path = require('node:path');

// Initialize GCS
const storage = new Storage({
  keyFilename: path.join(__dirname, '..', 'public', 'izara-telemedicine-dd0b6abe2bc8.json'),
  projectId: 'izara-telemedicine'
});

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data'
};

// Hash password using bcrypt (same as auth server)
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Generate session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Write to GCS
async function writeToGCS(bucketName, fileName, data) {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      resumable: false
    });
    console.log(`✅ Saved: ${bucketName}/${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save ${bucketName}/${fileName}:`, error.message);
    return false;
  }
}

// Fetch from GCS
async function fetchFromGCS(bucketName, fileName) {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    const [exists] = await file.exists();

    if (!exists) {
      return null;
    }

    const [content] = await file.download();
    return JSON.parse(content.toString());
  } catch (error) {
    console.error(`Error fetching ${bucketName}/${fileName}:`, error.message);
    return null;
  }
}

// User definitions
const USERS = {
  admin: {
    id: 'ADMIN-001',
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024',
    name: 'Dr. Admin Izara',
    role: 'admin',
    isAdmin: true,
    medicalLicenseNumber: 'MD-ADMIN-001',
    specialty: 'Hospital Administration',
    phone: '+66-81-234-5678',
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin+Izara&background=059669&color=fff&size=200'
  },
  doctor: {
    id: 'DOC-001',
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Somchai Prasert',
    role: 'doctor',
    isAdmin: false,
    medicalLicenseNumber: 'MD-TH-12345',
    specialty: 'General Practice',
    phone: '+66-89-876-5432',
    avatarUrl: 'https://ui-avatars.com/api/?name=Somchai+Prasert&background=0d9488&color=fff&size=200'
  }
};

async function createUser(userDef) {
  console.log(`\n📝 Creating user: ${userDef.name} (${userDef.email})`);

  const now = new Date().toISOString();

  // Create user credential
  const userCredential = {
    id: userDef.id,
    email: userDef.email.toLowerCase().trim(),
    passwordHash: hashPassword(userDef.password),
    role: userDef.role,
    doctorId: userDef.id,
    medicalLicenseNumber: userDef.medicalLicenseNumber,
    isAdmin: userDef.isAdmin,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    emailVerified: true,
    createdAt: now,
    lastLogin: null,
    loginAttempts: 0,
    lockedUntil: null,
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false
      }
    },
    name: userDef.name,
    phone: userDef.phone,
    specialty: userDef.specialty,
    avatarUrl: userDef.avatarUrl,
    adminPrivileges: userDef.isAdmin ? {
      canManageDoctors: true,
      canManagePatients: true,
      canManageAppointments: true,
      canViewAnalytics: true,
      canManageSettings: true,
      canAssignRoles: true,
      level: 'super_admin'
    } : undefined
  };

  // Save user credential
  await writeToGCS(BUCKETS.credentials, `users/${userDef.id}.json`, userCredential);

  // Create doctor profile
  const doctorProfile = {
    id: userDef.id,
    name: userDef.name,
    specialty: userDef.specialty,
    email: userDef.email,
    medicalLicenseNumber: userDef.medicalLicenseNumber,
    avatarUrl: userDef.avatarUrl,
    phone: userDef.phone,
    rating: 4.8,
    experience: '10 years',
    qualifications: ['MD', 'Board Certified'],
    availableSlots: [],
    isApproved: true,
    isAdmin: userDef.isAdmin
  };

  await writeToGCS(BUCKETS.doctor, `doctors/${userDef.id}.json`, doctorProfile);

  console.log(`   ✅ User created successfully`);
  console.log(`   📧 Email: ${userDef.email}`);
  console.log(`   🔑 Password: ${userDef.password}`);

  return userCredential;
}

async function updateUsersIndex(users) {
  console.log('\n📋 Updating users index...');

  // Fetch existing index or create new
  let usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];

  for (const user of users) {
    // Remove existing entry if exists
    usersIndex = usersIndex.filter(u => u.id !== user.id && u.email !== user.email);

    // Add new entry
    usersIndex.push({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: true,
      isAdmin: user.isAdmin,
      approvalStatus: 'approved'
    });
  }

  await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
  console.log('✅ Users index updated');
}

async function updateDoctorsList(doctors) {
  console.log('\n📋 Updating doctors list...');

  // Fetch existing list or create new
  let doctorsList = await fetchFromGCS(BUCKETS.doctor, 'doctors.json') || [];

  for (const doc of doctors) {
    // Remove existing entry if exists
    doctorsList = doctorsList.filter(d => d.id !== doc.id && d.email !== doc.email);

    // Add new entry
    doctorsList.push({
      id: doc.id,
      name: doc.name,
      specialty: doc.specialty,
      email: doc.email,
      medicalLicenseNumber: doc.medicalLicenseNumber,
      avatarUrl: doc.avatarUrl,
      rating: 4.8,
      experience: '10 years',
      qualifications: ['MD', 'Board Certified'],
      isApproved: true,
      isAdmin: doc.isAdmin
    });
  }

  await writeToGCS(BUCKETS.doctor, 'doctors.json', doctorsList);
  console.log('✅ Doctors list updated');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🏥 IZARA - Generate Mock Users');
  console.log('═══════════════════════════════════════════════════════════════');

  const createdUsers = [];

  // Create Admin
  const admin = await createUser(USERS.admin);
  createdUsers.push({ ...admin, ...USERS.admin });

  // Create Doctor
  const doctor = await createUser(USERS.doctor);
  createdUsers.push({ ...doctor, ...USERS.doctor });

  // Update indexes
  await updateUsersIndex(createdUsers);
  await updateDoctorsList(createdUsers);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ MOCK USERS CREATED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('\n👤 ADMIN USER:');
  console.log(`   Email:    ${USERS.admin.email}`);
  console.log(`   Password: ${USERS.admin.password}`);
  console.log('\n👨‍⚕️ DOCTOR USER:');
  console.log(`   Email:    ${USERS.doctor.email}`);
  console.log(`   Password: ${USERS.doctor.password}`);
  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
