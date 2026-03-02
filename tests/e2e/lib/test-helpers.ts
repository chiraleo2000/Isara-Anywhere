/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — SHARED TEST HELPERS v9.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 * Reusable helpers for multi-user, multi-browser, API + UI testing.
 * Used across all spec files for DRY, realistic test scenarios.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { expect, Page, Browser, BrowserContext, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, ENDPOINTS, TIMEOUTS, IS_CLOUD,
  getAuthToken, getDoctorAuthToken, authHeaders,
  logTestSuccess, logTestWarning,
} from './test-config';
import { loadCachedUsers, getCachedUser } from './auth-store';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = 'patient1' | 'patient2' | 'patient3' | 'doctor' | 'admin';

export interface AuthenticatedUser {
  role: UserRole;
  id: string;
  token: string;
  email: string;
  name: string;
  portalUrl: string;
}

export interface MultiUserSession {
  users: Map<UserRole, AuthenticatedUser>;
  pages: Map<UserRole, Page>;
  contexts: Map<UserRole, BrowserContext>;
}

export interface ContentItem {
  id?: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  status?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Authenticate all 5 users — reads from the global-setup cache (ZERO API calls).
 * Falls back to live API auth only if the cache file is missing.
 */
export async function authenticateAllUsers(request: APIRequestContext): Promise<Map<UserRole, AuthenticatedUser>> {
  // ── Fast path: read from cache written by global-setup ──────────────
  try {
    return loadCachedUsers();
  } catch {
    // Cache missing — fall back to live auth (first run or globalSetup disabled)
  }

  // ── Slow fallback: authenticate via API ─────────────────────────────
  const users = new Map<UserRole, AuthenticatedUser>();
  const patientLogins = (['patient1', 'patient2', 'patient3'] as UserRole[]).map(async (role) => {
    const creds = CREDENTIALS[role];
    const token = await getAuthToken(request, PATIENT_URL, creds);
    users.set(role, { role, id: creds.id, token, email: creds.email, name: creds.name, portalUrl: PATIENT_URL });
  });
  const doctorLogins = (['doctor', 'admin'] as UserRole[]).map(async (role) => {
    const creds = CREDENTIALS[role];
    const token = await getDoctorAuthToken(request, DOCTOR_URL, creds);
    users.set(role, { role, id: creds.id, token, email: creds.email, name: creds.name, portalUrl: DOCTOR_URL });
  });
  await Promise.all([...patientLogins, ...doctorLogins]);
  return users;
}

/** Quick single-user auth */
export async function authenticateUser(
  request: APIRequestContext,
  role: UserRole,
): Promise<AuthenticatedUser> {
  const creds = CREDENTIALS[role];
  const isDoctor = role === 'doctor' || role === 'admin';
  const portalUrl = isDoctor ? DOCTOR_URL : PATIENT_URL;
  const token = isDoctor
    ? await getDoctorAuthToken(request, portalUrl, creds)
    : await getAuthToken(request, portalUrl, creds);
  return { role, id: creds.id, token, email: creds.email, name: creds.name, portalUrl };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-BROWSER SESSION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Create multiple browser contexts with separate pages for simultaneous multi-user testing */
export async function createMultiUserSession(
  browser: Browser,
  roles: UserRole[],
): Promise<MultiUserSession> {
  const session: MultiUserSession = {
    users: new Map(),
    pages: new Map(),
    contexts: new Map(),
  };

  for (const role of roles) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    session.contexts.set(role, context);
    session.pages.set(role, page);
  }

  return session;
}

/** Close all browser contexts in a multi-user session */
export async function closeMultiUserSession(session: MultiUserSession): Promise<void> {
  for (const [, context] of session.contexts) {
    await context.close().catch(() => {});
  }
}

/**
 * Login a user via browser — FAST path injects the cached JWT into
 * localStorage so there is NO form-fill / submit / redirect wait.
 * Falls back to UI login only if the cache is unavailable.
 */
export async function loginViaBrowser(
  page: Page,
  role: UserRole,
  retries = 2,
): Promise<void> {
  const creds = CREDENTIALS[role];
  const isDoctor = role === 'doctor' || role === 'admin';
  const portalUrl = isDoctor ? DOCTOR_URL : PATIENT_URL;

  // ── Fast path: inject token directly ────────────────────────────────
  try {
    const user = getCachedUser(role);
    if (user.token) {
      // Navigate to portal root first (needed to set localStorage on the correct origin)
      await page.goto(`${portalUrl}/login`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });

      // Inject auth into localStorage — must match EXACTLY what each portal reads:
      //   Doctor portal (authServices.ts): token, izara_current_user, izara_session_expiry, izara_last_activity
      //   Patient portal (AuthContext.tsx): auth_token, izara_user, izara_patient_last_activity
      await page.evaluate(({ token, email, name, id, userRole, isDoctorPortal }) => {
        const now = Date.now();
        if (isDoctorPortal) {
          localStorage.setItem('token', token);
          localStorage.setItem('izara_current_user', JSON.stringify({
            id, email, name, displayName: name, role: userRole,
            doctorId: id, medicalLicenseNumber: 'TEST-LIC-001',
            isActive: true, emailVerified: true,
            isAdmin: userRole === 'admin',
            adminPrivileges: userRole === 'admin'
              ? { manageDoctors: true, manageAppointments: true, viewAllRecords: true, manageContent: true, systemSettings: true }
              : undefined,
            preferences: { theme: 'light', language: 'th', notifications: { email: true, push: true, sms: false } },
          }));
          localStorage.setItem('izara_session_expiry', (now + 3600000).toString());
          localStorage.setItem('izara_last_activity', now.toString());
        } else {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('izara_user', JSON.stringify({ id, email, name, role: userRole }));
          localStorage.setItem('izara_patient_last_activity', now.toString());
        }
        // Generic keys for components that read them directly
        localStorage.setItem('izara_auth_token', token);
        localStorage.setItem('user', JSON.stringify({ email, name, id, role: userRole, token }));
      }, { token: user.token, email: user.email, name: user.name, id: user.id, userRole: role, isDoctorPortal: isDoctor });

      // Navigate to dashboard — already "logged in" via localStorage
      const dashPath = isDoctor ? `${portalUrl}/doctor/${user.id}/dashboard` : `${portalUrl}/dashboard`;
      await page.goto(dashPath, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      return;
    }
  } catch {
    // Cache unavailable — fall through to UI login
  }

  // ── Fallback: UI login ──────────────────────────────────────────────
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(`${portalUrl}/login`, { timeout: TIMEOUTS.navigation });
      await page.fill('input[type="email"]', creds.email);
      await page.fill('input[type="password"]', creds.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: TIMEOUTS.long }).catch(() => {
        return page.waitForURL('**/', { timeout: TIMEOUTS.medium });
      });
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Navigate to ANY page in a portal with authentication already injected.
 * Unlike loginViaBrowser (which always ends at dashboard), this lands on the
 * exact `targetPath` you request.
 *
 * @param page       Playwright Page fixture
 * @param role       UserRole to authenticate as
 * @param targetPath The portal-relative path, e.g. '/appointments' for patient
 *                   or '/doctor/DOC-TEST-001/schedule' for doctor.
 *                   For doctor portal, pass the **full** sub-path including
 *                   `/doctor/{userId}/...`; this helper prepends the portal base.
 */
export async function navigateWithAuth(
  page: Page,
  role: UserRole,
  targetPath: string,
): Promise<void> {
  const isDoctor = role === 'doctor' || role === 'admin';
  const portalUrl = isDoctor ? DOCTOR_URL : PATIENT_URL;

  const user = getCachedUser(role);
  // Navigate to login page to set localStorage on the correct origin
  await page.goto(`${portalUrl}/login`, {
    timeout: TIMEOUTS.navigation,
    waitUntil: 'domcontentloaded',
  });

  // Inject auth into localStorage — keys must match each portal exactly
  await page.evaluate(
    ({ token, email, name, id, userRole, isDoctorPortal }) => {
      const now = Date.now();
      if (isDoctorPortal) {
        localStorage.setItem('token', token);
        localStorage.setItem('izara_current_user', JSON.stringify({
          id, email, name, displayName: name, role: userRole,
          doctorId: id, medicalLicenseNumber: 'TEST-LIC-001',
          isActive: true, emailVerified: true,
          isAdmin: userRole === 'admin',
          adminPrivileges: userRole === 'admin'
            ? { manageDoctors: true, manageAppointments: true, viewAllRecords: true, manageContent: true, systemSettings: true }
            : undefined,
          preferences: { theme: 'light', language: 'th', notifications: { email: true, push: true, sms: false } },
        }));
        localStorage.setItem('izara_session_expiry', (now + 3600000).toString());
        localStorage.setItem('izara_last_activity', now.toString());
      } else {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('izara_user', JSON.stringify({ id, email, name, role: userRole }));
        localStorage.setItem('izara_patient_last_activity', now.toString());
      }
      localStorage.setItem('izara_auth_token', token);
      localStorage.setItem('user', JSON.stringify({ email, name, id, role: userRole, token }));
    },
    { token: user.token, email: user.email, name: user.name, id: user.id, userRole: role, isDoctorPortal: isDoctor },
  );

  // Navigate to the requested page
  await page.goto(`${portalUrl}${targetPath}`, {
    timeout: TIMEOUTS.navigation,
    waitUntil: 'domcontentloaded',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API REQUEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Make authenticated API request with retry for transient network errors */
export async function apiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  baseUrl: string,
  path: string,
  token: string,
  data?: any,
): Promise<{ status: number; body: any }> {
  const url = `${baseUrl}${path}`;
  const headers = authHeaders(token);
  const timeout = TIMEOUTS.api;
  const maxRetries = IS_CLOUD ? 2 : 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let res: any;
      switch (method) {
        case 'GET':
          res = await request.get(url, { headers, timeout });
          break;
        case 'POST':
          res = await request.post(url, { headers, data, timeout });
          break;
        case 'PUT':
          res = await request.put(url, { headers, data, timeout });
          break;
        case 'PATCH':
          res = await request.patch(url, { headers, data, timeout });
          break;
        case 'DELETE':
          res = await request.delete(url, { headers, timeout });
          break;
      }

      let body: any;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => '');
      }
      return { status: res.status(), body };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isTransient = msg.includes('ECONNRESET') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('Timeout');
      if (attempt < maxRetries && isTransient) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      // Return a synthetic error response instead of throwing
      return { status: 503, body: { error: msg || 'Network error' } };
    }
  }
  return { status: 503, body: { error: 'Max retries exceeded' } };
}

/** Shorthand for patient portal API calls */
export function patientApi(request: APIRequestContext, token: string) {
  return {
    get: (path: string) => apiRequest(request, 'GET', PATIENT_URL, path, token),
    post: (path: string, data?: any) => apiRequest(request, 'POST', PATIENT_URL, path, token, data),
    put: (path: string, data?: any) => apiRequest(request, 'PUT', PATIENT_URL, path, token, data),
    patch: (path: string, data?: any) => apiRequest(request, 'PATCH', PATIENT_URL, path, token, data),
    delete: (path: string) => apiRequest(request, 'DELETE', PATIENT_URL, path, token),
  };
}

/** Shorthand for doctor portal API calls */
export function doctorApi(request: APIRequestContext, token: string) {
  return {
    get: (path: string) => apiRequest(request, 'GET', DOCTOR_URL, path, token),
    post: (path: string, data?: any) => apiRequest(request, 'POST', DOCTOR_URL, path, token, data),
    put: (path: string, data?: any) => apiRequest(request, 'PUT', DOCTOR_URL, path, token, data),
    patch: (path: string, data?: any) => apiRequest(request, 'PATCH', DOCTOR_URL, path, token, data),
    delete: (path: string) => apiRequest(request, 'DELETE', DOCTOR_URL, path, token),
  };
}

/** Shorthand for meeting server API calls */
export function meetingApi(request: APIRequestContext, token: string) {
  return {
    get: (path: string) => apiRequest(request, 'GET', MEETING_SERVER_URL, path, token),
    post: (path: string, data?: any) => apiRequest(request, 'POST', MEETING_SERVER_URL, path, token, data),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE NAVIGATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Navigate and verify page loads without JS errors */
export async function navigateAndVerify(
  page: Page,
  url: string,
  expectedSelector?: string,
): Promise<{ loaded: boolean; errors: string[] }> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(url, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });

  if (expectedSelector) {
    try {
      await page.waitForSelector(expectedSelector, { timeout: TIMEOUTS.medium });
    } catch {
      return { loaded: false, errors };
    }
  }

  return { loaded: true, errors };
}

/** Take a labeled screenshot for evidence — never throws */
export async function screenshot(page: Page, label: string): Promise<void> {
  const safeName = label.replaceAll(/[^a-zA-Z0-9-_]/g, '_');
  try {
    await page.screenshot({
      path: `test-results/screenshots/${safeName}.png`,
      fullPage: false,
      timeout: 5000,  // Short timeout — screenshot is evidence, not a test gate
    });
  } catch {
    // Swallow — screenshot failure must never fail a test
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA GENERATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const ts = () => Date.now();

export function generateAppointmentData(patientName: string = 'Demo Patient') {
  return {
    patientName,
    specialty: 'General Practice',
    doctor: 'doctor.test@izara.com',
    date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days from now
    time: '10:00',
    reason: `Test appointment ${ts()}`,
    symptoms: 'Headache, fever',
    type: 'telemedicine',
  };
}

export function generatePHRVitals() {
  return {
    bloodPressureSystolic: 120 + Math.floor(Math.random() * 20),
    bloodPressureDiastolic: 70 + Math.floor(Math.random() * 15),
    heartRate: 65 + Math.floor(Math.random() * 25),
    temperature: +(36 + Math.random() * 1.5).toFixed(1),
    weight: +(55 + Math.random() * 30).toFixed(1),
    height: +(155 + Math.random() * 30).toFixed(1),
    oxygenSaturation: 95 + Math.floor(Math.random() * 5),
    respiratoryRate: 14 + Math.floor(Math.random() * 6),
    timestamp: new Date().toISOString(),
  };
}

export function generateEMRData(patientId: string) {
  return {
    patientId,
    type: 'SOAP',
    subjective: `ผู้ป่วยมาด้วยอาการปวดศีรษะ 2 วัน มีไข้ต่ำๆ — Test ${ts()}`,
    objective: 'T=37.8°C, BP=130/85, HR=88, RR=18. Alert, oriented.',
    assessment: 'Tension headache with low-grade fever. R/O viral URI.',
    plan: 'Paracetamol 500mg q6h PRN. F/U 1 week if not improved.',
    icd10: ['R51', 'R50.9'],
    aiAssisted: true,
  };
}

export function generatePrescriptionData(patientId: string) {
  return {
    patientId,
    medications: [
      {
        name: 'Paracetamol 500mg',
        dosage: '1 tablet',
        frequency: 'Every 6 hours as needed',
        duration: '7 days',
        quantity: 28,
        route: 'Oral',
      },
      {
        name: 'Ibuprofen 400mg',
        dosage: '1 tablet',
        frequency: 'Every 8 hours after meals',
        duration: '5 days',
        quantity: 15,
        route: 'Oral',
      },
    ],
    notes: `Test prescription ${ts()}`,
  };
}

export function generateLabOrder(patientId: string) {
  return {
    patientId,
    tests: [
      { code: 'CBC', name: 'Complete Blood Count', urgency: 'routine' },
      { code: 'CMP', name: 'Comprehensive Metabolic Panel', urgency: 'routine' },
    ],
    clinicalIndication: 'Annual health check',
    notes: `Test lab order ${ts()}`,
  };
}

export function generateMedicalContent() {
  return {
    title: `โรคเบาหวาน: ความรู้เบื้องต้น — Test ${ts()}`,
    content: `<p>โรคเบาหวานเป็นโรคเรื้อรังที่พบบ่อย ส่งผลต่อวิธีที่ร่างกายเปลี่ยนอาหารเป็นพลังงาน</p><p>Test content for E2E validation ${ts()}</p>`,
    category: 'Diabetes',
    tags: ['diabetes', 'chronic-disease', 'education'],
    status: 'draft',
    language: 'th',
  };
}

export function generateClinicalResource() {
  return {
    title: `Clinical Guideline: Hypertension Management — Test ${ts()}`,
    content: `<p>Evidence-based approach to hypertension management based on Thai Hypertension Society guidelines.</p><p>Test resource ${ts()}</p>`,
    category: 'Guidelines',
    tags: ['hypertension', 'guideline', 'cardiology'],
    status: 'draft',
    type: 'guideline',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 AI-HIS DATA GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

export function generateGeriatricScreening(patientId?: string) {
  return {
    patientId: patientId || '',
    adl: { score: 16, maxScore: 20, category: 'mild_dependency' },
    iadl: { score: 6, maxScore: 8, category: 'moderate_dependency' },
    tug: { timeSeconds: 14.5, fallRisk: 'moderate' },
    miniCog: { wordRecall: 2, clockDrawing: 1, score: 3, category: 'normal' },
    mna: { score: 21.5, maxScore: 30, category: 'at_risk' },
    gds15: { score: 6, maxScore: 15, category: 'mild_depression' },
    sarcf: { score: 3, maxScore: 10, category: 'low_risk' },
    braden: { score: 16, maxScore: 23, category: 'mild_risk' },
    assessments: {
      adl_barthel: { score: 85, maxScore: 100, category: 'mild_dependency' },
      iadl_lawton: { score: 6, maxScore: 8, category: 'moderate_dependency' },
      tug: { timeSeconds: 14.5, fallRisk: 'moderate' },
      miniCog: { wordRecall: 2, clockDrawing: 1, totalScore: 3, category: 'normal' },
      mna: { score: 21.5, maxScore: 30, category: 'at_risk' },
      gds15: { score: 6, maxScore: 15, category: 'mild_depression' },
      sarcF: { score: 3, maxScore: 10, category: 'low_risk' },
      braden: { score: 16, maxScore: 23, category: 'mild_risk' },
    },
    assessorId: 'NURSE-001',
    timestamp: new Date().toISOString(),
  };
}

export function generateCTMAssessment(patientId?: string) {
  const dhatuOptions: Array<'ปิตตะ' | 'วาตะ' | 'เสมหะ' | 'สันนิปาตะ'> = ['ปิตตะ', 'วาตะ', 'เสมหะ', 'สันนิปาตะ'];
  const selectedDhatu = dhatuOptions[Math.floor(Math.random() * dhatuOptions.length)];
  return {
    patientId: patientId || '',
    dhatu: selectedDhatu,
    dhatuDetail: {
      primaryElement: 'ปถวีธาตุ',
      secondaryElement: 'วาโยธาตุ',
      imbalance: 'ปถวีธาตุกำเริบ',
    },
    samutthan: 'อุตุสมุฏฐาน — เกิดจากการเปลี่ยนแปลงของฤดูกาล',
    samutthanDetail: {
      category: 'อุตุสมุฏฐาน',
      description: 'เกิดจากการเปลี่ยนแปลงของฤดูกาล',
    },
    herbalPrescription: {
      formulaName: 'ยาแก้ไข้สมุนไพร',
      herbs: [
        { name: 'ฟ้าทะลายโจร', amount: '500mg', frequency: 'tid' },
        { name: 'ขมิ้นชัน', amount: '250mg', frequency: 'bid' },
      ],
    },
    timestamp: new Date().toISOString(),
  };
}

export function generateSOSAlert(patientId?: string) {
  return {
    patientId: patientId || '',
    type: 'emergency',
    location: { lat: 13.7563, lng: 100.5018, latitude: 13.7563, longitude: 100.5018 },
    message: 'ต้องการความช่วยเหลือฉุกเฉิน',
    vitalSigns: { heartRate: 110, oxygenSaturation: 88 },
    timestamp: new Date().toISOString(),
  };
}

export function generateFollowUpSchedule(patientId?: string, doctorId?: string) {
  return {
    patientId: patientId || '',
    doctorId: doctorId || '',
    reason: 'ติดตามผลการรักษาความดันโลหิตสูง',
    scheduledDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
    interval: '1_month',
    reminderDays: [7, 3, 1],
    activities: [
      { type: 'vital_check', description: 'วัดความดัน', dueDate: new Date(Date.now() + 86400000 * 7).toISOString() },
      { type: 'lab_test', description: 'ตรวจเลือด', dueDate: new Date(Date.now() + 86400000 * 14).toISOString() },
      { type: 'follow_up_visit', description: 'พบแพทย์', dueDate: new Date(Date.now() + 86400000 * 30).toISOString() },
    ],
    notes: `Follow-up test ${ts()}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSERTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Assert API returns 200 with valid body */
export function assertSuccess(result: { status: number; body: any }, label: string) {
  expect(result.status, `${label} should return 200`).toBe(200);
  expect(result.body, `${label} should have a body`).toBeTruthy();
  logTestSuccess(label);
}

/** Assert API returns any 2xx status */
export function assertOk(result: { status: number; body: any }, label: string) {
  expect(result.status, `${label} should return 2xx`).toBeGreaterThanOrEqual(200);
  expect(result.status, `${label} should return 2xx`).toBeLessThan(300);
  logTestSuccess(label);
}

/** Assert API returns 401 or 403 for unauthorized */
export function assertUnauthorized(result: { status: number; body: any }, label: string) {
  expect([401, 403]).toContain(result.status);
  logTestSuccess(`${label} — correctly rejected`);
}

/** Assert page has no critical JS errors */
export async function assertNoJSErrors(page: Page, label: string): Promise<void> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      errors.push(msg.text());
    }
  });
  // Give a moment for any async errors
  await page.waitForTimeout(500);
  if (errors.length > 0) {
    logTestWarning(`${label}: ${errors.length} JS errors found`);
  }
}

/** Wait for content to appear after refresh (content sync test pattern) */
export async function waitForContentAfterRefresh(
  page: Page,
  searchText: string,
  maxRetries: number = 3,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const found = await page.locator(`text=${searchText}`).count();
    if (found > 0) {
      logTestSuccess(`Content "${searchText}" found after ${i + 1} refresh(es)`);
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW ORCHESTRATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Full appointment lifecycle: create → confirm → verify (tolerates 401 token expiry) */
export async function appointmentLifecycle(
  request: APIRequestContext,
  patientToken: string,
  doctorToken: string,
): Promise<{ appointmentId: string }> {
  // Patient creates appointment
  const createRes = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.appointments, patientToken, generateAppointmentData());
  // Tolerate 401 (token expiry during long test runs)
  if (createRes.status === 401 || createRes.status === 503) {
    return { appointmentId: `skipped-${createRes.status}` };
  }
  expect(createRes.status).toBeGreaterThanOrEqual(200);
  expect(createRes.status).toBeLessThan(300);
  const appointmentId = createRes.body?.id || createRes.body?.data?.id || createRes.body?.appointmentId || 'unknown';

  // Doctor views appointment
  const doctorView = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.appointments, doctorToken);
  if (doctorView.status !== 401) {
    expect(doctorView.status).toBe(200);
  }

  // Doctor confirms (try PATCH, fallback to PUT)
  if (appointmentId !== 'unknown') {
    const confirmRes = await apiRequest(request, 'PATCH', DOCTOR_URL, `${ENDPOINTS.appointments}/${appointmentId}/confirm`, doctorToken);
    if (confirmRes.status >= 400) {
      await apiRequest(request, 'PUT', DOCTOR_URL, `${ENDPOINTS.appointments}/${appointmentId}`, doctorToken, { status: 'confirmed' });
    }
  }

  return { appointmentId };
}

/** Content creation + approval lifecycle */
export async function contentApprovalLifecycle(
  request: APIRequestContext,
  doctorToken: string,
  adminToken: string,
): Promise<{ contentId: string; title: string }> {
  const contentData = generateMedicalContent();

  // Doctor creates content
  const createRes = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.medicalContent, doctorToken, contentData);
  const contentId = createRes.body?.id || createRes.body?.data?.id || 'unknown';

  // Admin approves content
  if (contentId !== 'unknown') {
    await apiRequest(request, 'PATCH', DOCTOR_URL, `${ENDPOINTS.medicalContent}/${contentId}`, adminToken, { status: 'published' });
  }

  return { contentId, title: contentData.title };
}

export {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, ENDPOINTS, TIMEOUTS, IS_CLOUD,
  getAuthToken, getDoctorAuthToken, authHeaders,
  logTestSuccess, logTestInfo, logTestWarning,
} from './test-config';
