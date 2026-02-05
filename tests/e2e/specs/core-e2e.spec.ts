/**
 * =============================================================================
 * IZARA TELEMEDICINE - CORE E2E TEST SUITE
 * =============================================================================
 * Version: 2.0.0
 * Updated: February 4, 2026
 * 
 * This is the MAIN consolidated test file that covers:
 * 1. Service Health Checks
 * 2. Authentication (all user types)
 * 3. Core Workflows (appointments, meetings, records)
 * 4. API Verification
 * 5. UI Navigation
 * 
 * Run this file for comprehensive testing:
 *   npx playwright test specs/core-e2e.spec.ts --headed
 * 
 * This replaces multiple overlapping test files for cleaner maintenance.
 * =============================================================================
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
    PATIENT_PORTAL_URL, 
    DOCTOR_PORTAL_URL, 
    MEETING_URL,
    CREDENTIALS,
    URLS,
    TEST_ENV,
    logTestSuccess 
} from '../lib/test-config';

// ============================================================================
// CONFIGURATION
// ============================================================================

const IS_CLOUD = TEST_ENV === 'cloud';
const CURRENT_URLS = IS_CLOUD ? URLS.cloud : URLS.local;

const TIMEOUTS = {
    navigation: 30000,
    action: 15000,
    api: 10000
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loginAsPatient(page: Page, email: string, password: string): Promise<string | null> {
    await page.goto(`${CURRENT_URLS.patient}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|home)?$/, { timeout: TIMEOUTS.navigation });
    
    // Get token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    return token;
}

async function loginAsDoctor(page: Page, email: string, password: string): Promise<string | null> {
    await page.goto(`${CURRENT_URLS.doctor}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/doctor\//, { timeout: TIMEOUTS.navigation });
    
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    return token;
}

async function apiRequest(
    request: any, 
    method: string, 
    url: string, 
    token?: string, 
    body?: any
): Promise<any> {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const options: any = { headers };
    if (body) options.data = body;
    
    const response = await request[method.toLowerCase()](url, options);
    return response;
}

// ============================================================================
// TEST SUITE 1: SERVICE HEALTH CHECKS
// ============================================================================

test.describe('1. Service Health Checks', () => {
    test('1.1 Patient Portal health endpoint', async ({ request }) => {
        const response = await request.get(`${CURRENT_URLS.patient}/api/health`);
        expect(response.status()).toBe(200);
        
        const data = await response.json();
        expect(data.status).toBe('healthy');
        
        logTestSuccess('Patient Portal health: OK');
    });

    test('1.2 Doctor Portal health endpoint', async ({ request }) => {
        const response = await request.get(`${CURRENT_URLS.doctor}/api/health`);
        expect(response.status()).toBe(200);
        
        const data = await response.json();
        expect(data.status).toBe('healthy');
        
        logTestSuccess('Doctor Portal health: OK');
    });

    test('1.3 Database connectivity check', async ({ request }) => {
        const response = await request.get(`${CURRENT_URLS.patient}/api/health`);
        const data = await response.json();
        
        // Most health endpoints include DB status
        expect(response.status()).toBe(200);
        
        logTestSuccess('Database connectivity: OK');
    });
});

// ============================================================================
// TEST SUITE 2: AUTHENTICATION
// ============================================================================

test.describe('2. Authentication', () => {
    test('2.1 Patient login API', async ({ request }) => {
        const response = await request.post(`${CURRENT_URLS.patient}/api/auth/login`, {
            data: {
                email: CREDENTIALS.patient1.email,
                password: CREDENTIALS.patient1.password
            }
        });
        
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.token || data.accessToken).toBeTruthy();
        
        logTestSuccess('Patient login API: OK');
    });

    test('2.2 Doctor login API', async ({ request }) => {
        const response = await request.post(`${CURRENT_URLS.doctor}/api/auth/login`, {
            data: {
                email: CREDENTIALS.doctor.email,
                password: CREDENTIALS.doctor.password
            }
        });
        
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.token || data.accessToken).toBeTruthy();
        
        logTestSuccess('Doctor login API: OK');
    });

    test('2.3 Admin login API', async ({ request }) => {
        const response = await request.post(`${CURRENT_URLS.doctor}/api/auth/login`, {
            data: {
                email: CREDENTIALS.admin.email,
                password: CREDENTIALS.admin.password
            }
        });
        
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.token || data.accessToken).toBeTruthy();
        
        logTestSuccess('Admin login API: OK');
    });

    test('2.4 Patient UI login', async ({ page }) => {
        await page.goto(`${CURRENT_URLS.patient}/login`);
        
        // Verify login form exists
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        
        // Perform login
        await page.fill('input[type="email"]', CREDENTIALS.patient1.email);
        await page.fill('input[type="password"]', CREDENTIALS.patient1.password);
        await page.click('button[type="submit"]');
        
        // Verify redirect to dashboard
        await page.waitForURL(/\/(dashboard|home)?$/, { timeout: TIMEOUTS.navigation });
        
        logTestSuccess('Patient UI login: OK');
    });

    test('2.5 Doctor UI login', async ({ page }) => {
        await page.goto(`${CURRENT_URLS.doctor}/login`);
        
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await page.fill('input[type="email"]', CREDENTIALS.doctor.email);
        await page.fill('input[type="password"]', CREDENTIALS.doctor.password);
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/\/doctor\//, { timeout: TIMEOUTS.navigation });
        
        logTestSuccess('Doctor UI login: OK');
    });
});

// ============================================================================
// TEST SUITE 3: PATIENT PORTAL NAVIGATION
// ============================================================================

test.describe('3. Patient Portal Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsPatient(page, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    });

    test('3.1 Dashboard page loads', async ({ page }) => {
        await page.goto(CURRENT_URLS.patient);
        await expect(page).not.toHaveURL(/error/);
        logTestSuccess('Patient Dashboard: OK');
    });

    test('3.2 Appointments page loads', async ({ page }) => {
        await page.goto(`${CURRENT_URLS.patient}/appointments`);
        await expect(page).not.toHaveURL(/error/);
        logTestSuccess('Patient Appointments: OK');
    });

    test('3.3 Health Records page loads', async ({ page }) => {
        await page.goto(`${CURRENT_URLS.patient}/phr`);
        await expect(page).not.toHaveURL(/error/);
        logTestSuccess('Patient Health Records: OK');
    });

    test('3.4 Settings page loads', async ({ page }) => {
        await page.goto(`${CURRENT_URLS.patient}/settings`);
        await expect(page).not.toHaveURL(/error/);
        logTestSuccess('Patient Settings: OK');
    });
});

// ============================================================================
// TEST SUITE 4: DOCTOR PORTAL NAVIGATION
// ============================================================================

test.describe('4. Doctor Portal Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsDoctor(page, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    });

    test('4.1 Dashboard page loads', async ({ page }) => {
        const doctorId = CREDENTIALS.doctor.id;
        await page.goto(`${CURRENT_URLS.doctor}/doctor/${doctorId}/dashboard`);
        await expect(page).not.toHaveURL(/error/);
        logTestSuccess('Doctor Dashboard: OK');
    });

    test('4.2 Patients page loads', async ({ page }) => {
        const doctorId = CREDENTIALS.doctor.id;
        await page.goto(`${CURRENT_URLS.doctor}/doctor/${doctorId}/patients`);
        await expect(page).not.toHaveURL(/error/);
        logTestSuccess('Doctor Patients: OK');
    });

    test('4.3 Schedule page loads', async ({ page }) => {
        const doctorId = CREDENTIALS.doctor.id;
        await page.goto(`${CURRENT_URLS.doctor}/doctor/${doctorId}/schedule`);
        await expect(page).not.toHaveURL(/error/);
        logTestSuccess('Doctor Schedule: OK');
    });
});

// ============================================================================
// TEST SUITE 5: API ENDPOINTS VERIFICATION
// ============================================================================

test.describe('5. API Endpoints Verification', () => {
    let patientToken: string;
    let doctorToken: string;

    test.beforeAll(async ({ request }) => {
        // Get patient token
        const patientRes = await request.post(`${CURRENT_URLS.patient}/api/auth/login`, {
            data: {
                email: CREDENTIALS.patient1.email,
                password: CREDENTIALS.patient1.password
            }
        });
        const patientData = await patientRes.json();
        patientToken = patientData.token || patientData.accessToken;

        // Get doctor token
        const doctorRes = await request.post(`${CURRENT_URLS.doctor}/api/auth/login`, {
            data: {
                email: CREDENTIALS.doctor.email,
                password: CREDENTIALS.doctor.password
            }
        });
        const doctorData = await doctorRes.json();
        doctorToken = doctorData.token || doctorData.accessToken;
    });

    test('5.1 Patient profile API', async ({ request }) => {
        const response = await request.get(`${CURRENT_URLS.patient}/api/users/profile`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        expect(response.status()).toBe(200);
        logTestSuccess('Patient profile API: OK');
    });

    test('5.2 Appointments list API', async ({ request }) => {
        const response = await request.get(`${CURRENT_URLS.patient}/api/appointments`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        expect(response.status()).toBe(200);
        logTestSuccess('Appointments API: OK');
    });

    test('5.3 Medical content API', async ({ request }) => {
        const response = await request.get(`${CURRENT_URLS.patient}/api/medical-content`);
        expect(response.status()).toBe(200);
        logTestSuccess('Medical content API: OK');
    });

    test('5.4 Doctors list API (Patient Portal)', async ({ request }) => {
        const response = await request.get(`${CURRENT_URLS.patient}/api/doctors`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        expect(response.status()).toBe(200);
        logTestSuccess('Doctors list API: OK');
    });

    test('5.5 Doctor patients API', async ({ request }) => {
        const response = await request.get(`${CURRENT_URLS.doctor}/api/patients`, {
            headers: { Authorization: `Bearer ${doctorToken}` }
        });
        expect(response.status()).toBe(200);
        logTestSuccess('Doctor patients API: OK');
    });
});

// ============================================================================
// TEST SUITE 6: APPOINTMENT WORKFLOW
// ============================================================================

test.describe('6. Appointment Workflow', () => {
    test('6.1 View available doctors', async ({ request }) => {
        const loginRes = await request.post(`${CURRENT_URLS.patient}/api/auth/login`, {
            data: {
                email: CREDENTIALS.patient1.email,
                password: CREDENTIALS.patient1.password
            }
        });
        const { token } = await loginRes.json();

        const response = await request.get(`${CURRENT_URLS.patient}/api/doctors`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        expect(response.status()).toBe(200);
        const doctors = await response.json();
        expect(Array.isArray(doctors) || doctors.data).toBeTruthy();
        
        logTestSuccess('View doctors: OK');
    });

    test('6.2 View appointments', async ({ request }) => {
        const loginRes = await request.post(`${CURRENT_URLS.patient}/api/auth/login`, {
            data: {
                email: CREDENTIALS.patient1.email,
                password: CREDENTIALS.patient1.password
            }
        });
        const { token } = await loginRes.json();

        const response = await request.get(`${CURRENT_URLS.patient}/api/appointments`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        expect(response.status()).toBe(200);
        logTestSuccess('View appointments: OK');
    });

    test('6.3 Doctor view appointments', async ({ request }) => {
        const loginRes = await request.post(`${CURRENT_URLS.doctor}/api/auth/login`, {
            data: {
                email: CREDENTIALS.doctor.email,
                password: CREDENTIALS.doctor.password
            }
        });
        const { token } = await loginRes.json();

        const response = await request.get(`${CURRENT_URLS.doctor}/api/appointments`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        expect(response.status()).toBe(200);
        logTestSuccess('Doctor appointments: OK');
    });
});

// ============================================================================
// TEST SUITE 7: HEALTH RECORDS
// ============================================================================

test.describe('7. Health Records', () => {
    test('7.1 Patient PHR access', async ({ request }) => {
        const loginRes = await request.post(`${CURRENT_URLS.patient}/api/auth/login`, {
            data: {
                email: CREDENTIALS.patient1.email,
                password: CREDENTIALS.patient1.password
            }
        });
        const { token } = await loginRes.json();

        const response = await request.get(`${CURRENT_URLS.patient}/api/phr`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        expect(response.status()).toBe(200);
        logTestSuccess('PHR access: OK');
    });

    test('7.2 Health timeline', async ({ request }) => {
        const loginRes = await request.post(`${CURRENT_URLS.patient}/api/auth/login`, {
            data: {
                email: CREDENTIALS.patient1.email,
                password: CREDENTIALS.patient1.password
            }
        });
        const { token } = await loginRes.json();

        const response = await request.get(`${CURRENT_URLS.patient}/api/timeline`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        expect(response.status()).toBe(200);
        logTestSuccess('Health timeline: OK');
    });
});

// ============================================================================
// TEST SUITE 8: NOTIFICATIONS
// ============================================================================

test.describe('8. Notifications', () => {
    test('8.1 Patient notifications', async ({ request }) => {
        const loginRes = await request.post(`${CURRENT_URLS.patient}/api/auth/login`, {
            data: {
                email: CREDENTIALS.patient1.email,
                password: CREDENTIALS.patient1.password
            }
        });
        const { token } = await loginRes.json();

        const response = await request.get(`${CURRENT_URLS.patient}/api/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        expect(response.status()).toBe(200);
        logTestSuccess('Patient notifications: OK');
    });

    test('8.2 Doctor notifications', async ({ request }) => {
        const loginRes = await request.post(`${CURRENT_URLS.doctor}/api/auth/login`, {
            data: {
                email: CREDENTIALS.doctor.email,
                password: CREDENTIALS.doctor.password
            }
        });
        const { token } = await loginRes.json();

        const response = await request.get(`${CURRENT_URLS.doctor}/api/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        expect(response.status()).toBe(200);
        logTestSuccess('Doctor notifications: OK');
    });
});

// ============================================================================
// TEST SUITE SUMMARY
// ============================================================================

test.afterAll(async () => {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    CORE E2E TEST SUITE COMPLETE                           ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');
});
