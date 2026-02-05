/**
 * =============================================================================
 * IZARA TELEMEDICINE - SHARED TEST CONFIGURATION
 * =============================================================================
 * Version: 1.0.0
 * Updated: January 29, 2026
 * 
 * Centralized configuration for all E2E tests.
 * Credentials can be overridden via environment variables for CI/CD.
 * =============================================================================
 */

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

export const TEST_ENV = process.env.TEST_ENV || 'local';

export const URLS = {
    local: {
        patient: process.env.LOCAL_PATIENT_URL || 'http://localhost:3005',
        doctor: process.env.LOCAL_DOCTOR_URL || 'http://localhost:3010',
        meeting: process.env.LOCAL_MEETING_URL || 'http://localhost:3020'
    },
    cloud: {
        // Cloud Run URLs (project hash: hvht4obouq, project: izara-telemedicine)
        patient: process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-hvht4obouq-as.a.run.app',
        doctor: process.env.CLOUD_DOCTOR_URL || 'https://izara-doctor-portal-hvht4obouq-as.a.run.app',
        meeting: process.env.CLOUD_MEETING_URL || 'https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app'
    }
};

// Current URLs based on TEST_ENV
export const PATIENT_PORTAL_URL = URLS[TEST_ENV as keyof typeof URLS]?.patient || URLS.local.patient;
export const DOCTOR_PORTAL_URL = URLS[TEST_ENV as keyof typeof URLS]?.doctor || URLS.local.doctor;
export const MEETING_URL = URLS[TEST_ENV as keyof typeof URLS]?.meeting || URLS.local.meeting;

// =============================================================================
// TEST CREDENTIALS
// Use environment variables for CI/CD, with defaults for local development
// =============================================================================

export const CREDENTIALS = {
    patient1: {
        email: process.env.TEST_PATIENT1_EMAIL || 'demo.test@gmail.com',
        password: process.env.TEST_PATIENT_PASSWORD || process.env.IZARA_PATIENT_PASSWORD || 'P@ssw0rd',
        id: 'PATIENT-DEMO',
        name: 'Demo Test Patient'
    },
    patient2: {
        email: process.env.TEST_PATIENT2_EMAIL || 'Somchai.Mankong@gmail.com',
        password: process.env.TEST_PATIENT_PASSWORD || process.env.IZARA_PATIENT_PASSWORD || 'P@ssw0rd',
        id: 'PATIENT-SOMCHAI',
        name: 'Somchai Mankong'
    },
    patient3: {
        email: process.env.TEST_PATIENT3_EMAIL || 'Anan.Khayanrian@gmail.com',
        password: process.env.TEST_PATIENT_PASSWORD || process.env.IZARA_PATIENT_PASSWORD || 'P@ssw0rd',
        id: 'PATIENT-ANAN',
        name: 'Anan Khayanrian'
    },
    doctor: {
        email: process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com',
        password: process.env.TEST_DOCTOR_PASSWORD || process.env.IZARA_DOCTOR_PASSWORD || 'IzaraDoctor@2024',
        id: 'DOC-TEST-001',
        name: 'Dr. Test Good'
    },
    admin: {
        email: process.env.TEST_ADMIN_EMAIL || 'admin.test@izara.com',
        password: process.env.TEST_ADMIN_PASSWORD || process.env.IZARA_ADMIN_PASSWORD || 'IzaraAdmin@2024',
        id: 'ADMIN-TEST-001',
        name: 'Dr. Admin Kind'
    }
};

// =============================================================================
// NEW USER REGISTRATION TEST DATA
// =============================================================================
export const REGISTRATION_DATA = {
    newPatient: {
        name: 'ทดสอบ ผู้ป่วยใหม่',
        email: `test.patient.${Date.now()}@gmail.com`,
        password: 'Test@12345678',
        phone: '0891234567',
        dateOfBirth: '1990-05-15',
        gender: 'male',
        height: '175',
        weight: '70',
        bloodType: 'O+',
        allergies: 'ไม่มี',
        chronicConditions: '',
        emergencyContactName: 'คุณแม่ ทดสอบ',
        emergencyContactPhone: '0898765432',
        emergencyContactRelation: 'แม่'
    },
    newDoctor: {
        name: 'นพ. ทดสอบ แพทย์ใหม่',
        email: `test.doctor.${Date.now()}@izara.com`,
        password: 'Test@12345678',
        medicalLicenseNumber: `MD.TEST${Date.now()}`,
        specialty: 'General Practice',
        phone: '0812345678',
        dateOfBirth: '1985-03-20'
    }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get auth token from API
 */
export async function getAuthToken(
    request: any,
    baseUrl: string,
    creds: { email: string; password: string }
): Promise<string> {
    const response = await request.post(`${baseUrl}/api/auth/login`, {
        data: creds,
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.status() === 200) {
        const data = await response.json();
        return data.token || data.accessToken || '';
    }
    return '';
}

/**
 * Get authorization headers
 */
export function authHeaders(token: string): Record<string, string> {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Log test info
 */
export function logTestInfo(message: string): void {
    console.log(`ℹ️  ${message}`);
}

/**
 * Log test success
 */
export function logTestSuccess(message: string): void {
    console.log(`✅ ${message}`);
}

/**
 * Log test warning
 */
export function logTestWarning(message: string): void {
    console.log(`⚠️  ${message}`);
}

// =============================================================================
// TIMEOUTS
// =============================================================================

export const TIMEOUTS = {
    short: 5000,
    medium: 10000,
    long: 30000,
    cloud: 60000
};

// =============================================================================
// API ENDPOINTS
// =============================================================================

export const ENDPOINTS = {
    health: '/api/health',
    healthDb: '/api/health/db',
    login: '/api/auth/login',
    appointments: '/api/appointments',
    phr: '/api/phr',
    consultants: '/api/consultants',
    doctors: '/api/doctors',
    notifications: '/api/notifications',
    medicalContent: '/api/content/medical',
    clinicalResources: '/api/clinical-resources',
    videoMeeting: {
        health: '/api/video-meeting/health',
        config: '/api/video-meeting/config'
    },
    ai: {
        health: '/api/ai/health',
        chat: '/api/ai/chat'
    }
};
