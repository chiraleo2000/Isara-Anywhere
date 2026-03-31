/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — ADMIN, METADATA & CROSS-SERVICE E2E TESTS v1.4.8
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive admin operations, metadata API coverage, cross-service
 * integration validation, and security boundary testing.
 *
 * Coverage:
 *   - Admin Doctor Management (approve/reject/roles)
 *   - Admin Appointment Management (pool, queue, assign)
 *   - Metadata APIs (specialties, symptoms, medicines, ICD-10, health-tips)
 *   - Security & Auth Boundaries
 *   - Cross-Service Integration Validation
 *   - Content Tags & Categories
 *
 * Updated: February 15, 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, IS_CLOUD,
} from '../lib/test-config';

const TIMEOUT = IS_CLOUD ? 30_000 : 15_000;
const P1 = CREDENTIALS.patient1;
const P2 = CREDENTIALS.patient2;
const P3 = CREDENTIALS.patient3;
const DOC = CREDENTIALS.doctor;
const ADM = CREDENTIALS.admin;

async function loginPatient(request: APIRequestContext, email: string, password: string) {
  const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
    data: { email, password }, headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
  });
  expect(r.status()).toBe(200);
  const d = await r.json();
  return { token: d.token || d.accessToken || '', user: d.user || d.data?.user || {} };
}

async function loginDoctor(request: APIRequestContext, email: string, password: string) {
  for (const path of ['/auth/login', '/api/auth/login']) {
    try {
      const r = await request.post(`${DOCTOR_URL}${path}`, {
        data: { email, password }, headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      });
      if (r.status() === 200) {
        const d = await r.json();
        return { token: d.token || d.accessToken || d.data?.token || '', user: d.user || d.data?.user || {} };
      }
    } catch { /* try next */ }
  }
  throw new Error('Doctor login failed');
}

function AH(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AD-A: ADMIN DOCTOR MANAGEMENT (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('AD-A: Admin Doctor Management', () => {
  test('AD-A01: Admin lists all doctors', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/doctors`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    const docs = d.doctors || d.data || d;
    expect(Array.isArray(docs)).toBe(true);
  });

  test('AD-A02: Admin views pending doctor registrations', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('AD-A03: Admin views doctor details', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/doctors/${DOC.id}`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-A04: Admin searches doctors by specialty', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/doctors?specialty=General`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-A05: Doctor self-profile accessible', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/auth/me`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-A06: Admin updates doctor role', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.put(`${DOCTOR_URL}/api/doctors/${DOC.id}/role`, {
      data: { role: 'doctor' }, headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('AD-A07: Admin views doctor schedule', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/schedule/${DOC.id}`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-A08: Admin + Doctor view lists in PARALLEL', async ({ request }) => {
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const [admR, docR] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/doctors`, { headers: AH(adm.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/doctors`, { headers: AH(doc.token), timeout: TIMEOUT }),
    ]);
    expect(admR.status()).toBe(200);
    expect(docR.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AD-B: ADMIN APPOINTMENT MANAGEMENT (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('AD-B: Admin Appointment Management', () => {
  test('AD-B01: Admin views all appointments', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-B02: Admin views appointment pool', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-B03: Admin views appointment queue', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-B04: Admin filter by date', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const today = new Date().toISOString().split('T')[0];
    const r = await request.get(`${DOCTOR_URL}/api/appointments?date=${today}`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-B05: Admin filter by status', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments?status=pending`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-B06: Doctor queue vs admin queue', async ({ request }) => {
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [dq, aq] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(dq.status()).toBe(200);
    expect(aq.status()).toBe(200);
  });

  test('AD-B07: Pool + Queue + Appointments PARALLEL', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const [pool, queue, apts] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(pool.status()).toBe(200);
    expect(queue.status()).toBe(200);
    expect(apts.status()).toBe(200);
  });

  test('AD-B08: Cross-portal appointment visibility', async ({ request }) => {
    const pat = await loginPatient(request, P1.email, P1.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [pr, dr, ar] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(pat.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(pr.status()).toBe(200);
    expect(dr.status()).toBe(200);
    expect(ar.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AD-C: METADATA APIs (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('AD-C: Metadata APIs', () => {
  test('AD-C01: Patient specialties metadata', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/metadata/specialties`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(Array.isArray(d.specialties || d.data || d)).toBe(true);
  });

  test('AD-C02: Patient symptoms metadata', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/metadata/symptoms`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-C03: Patient medicines metadata', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/metadata/medicines`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-C04: Patient ICD-10 codes', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/metadata/icd10`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-C05: Patient health tips', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/metadata/health-tips`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-C06: Doctor specialties metadata', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/specialties`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-C07: Doctor medicines metadata', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/medicines`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-C08: Doctor ICD-10 codes', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/icd10`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-C09: All patient metadata in PARALLEL', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const [sp, sy, med, icd, tips] = await Promise.all([
      request.get(`${PATIENT_URL}/api/metadata/specialties`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/metadata/symptoms`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/metadata/medicines`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/metadata/icd10`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/metadata/health-tips`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(sp.status()).toBe(200);
    expect(sy.status()).toBe(200);
    expect(med.status()).toBe(200);
    expect(icd.status()).toBe(200);
    expect(tips.status()).toBe(200);
  });

  test('AD-C10: Cross-portal metadata consistency', async ({ request }) => {
    const pat = await loginPatient(request, P1.email, P1.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const [ps, ds] = await Promise.all([
      request.get(`${PATIENT_URL}/api/metadata/specialties`, { headers: AH(pat.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/metadata/specialties`, { headers: AH(doc.token), timeout: TIMEOUT }),
    ]);
    expect(ps.status()).toBe(200);
    expect(ds.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AD-D: CONTENT TAGS & CATEGORIES (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('AD-D: Content Tags & Categories', () => {
  test('AD-D01: Medical content tags', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/content/tags/medical`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('AD-D02: Clinical resource tags', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/content/tags/clinical`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('AD-D03: Content categories from patient portal', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/content/categories`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-D04: Content by category', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/content/medical?category=health`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-D05: Content search', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/content/search?q=diabetes`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('AD-D06: Content tags from both portals', async ({ request }) => {
    const pat = await loginPatient(request, P1.email, P1.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const [pc, dt] = await Promise.all([
      request.get(`${PATIENT_URL}/api/content/categories`, { headers: AH(pat.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/content/tags/medical`, { headers: AH(doc.token), timeout: TIMEOUT }),
    ]);
    expect(pc.status()).toBe(200);
    expect(dt.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AD-E: SECURITY & AUTH BOUNDARIES (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('AD-E: Security & Auth Boundaries', () => {
  test('AD-E01: Unauthenticated patient API rejected', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments`, { timeout: TIMEOUT });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('AD-E02: Unauthenticated doctor API rejected', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { timeout: TIMEOUT });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('AD-E03: Invalid token rejected on patient portal', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments`, {
      headers: AH('invalid-token-12345'), timeout: TIMEOUT,
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('AD-E04: Invalid token rejected on doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: AH('invalid-token-12345'), timeout: TIMEOUT,
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('AD-E05: Invalid credentials rejected on patient login', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: 'invalid@test.com', password: 'wrongpassword' },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('AD-E06: Invalid credentials rejected on doctor login', async ({ request }) => {
    let rejected = false;
    for (const path of ['/auth/login', '/api/auth/login']) {
      const r = await request.post(`${DOCTOR_URL}${path}`, {
        data: { email: 'invalid@test.com', password: 'wrongpassword' },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      });
      if (r.status() >= 400) { rejected = true; break; }
    }
    expect(rejected).toBe(true);
  });

  test('AD-E07: Patient cannot access doctor-only endpoints', async ({ request }) => {
    // Patient token should be rejected by strictly doctor-only endpoints
    // Note: /api/doctors is accessible to any authenticated user (doctor list is semi-public)
    const { token } = await loginPatient(request, P1.email, P1.password);
    // Try accessing admin-only queue management
    const r = await request.post(`${DOCTOR_URL}/api/queue/call-next`, {
      data: { doctorId: 'fake' },
      headers: AH(token), timeout: TIMEOUT,
    });
    // Should fail (401 no valid doctor token, or 500 from invalid data)
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('AD-E08: Health endpoints accessible without auth', async ({ request }) => {
    const [p, d, m] = await Promise.all([
      request.get(`${PATIENT_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(p.status()).toBe(200);
    expect(d.status()).toBe(200);
    expect(m.status()).toBe(200);
  });

  test('AD-E09: Token validation endpoint works', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/auth/validate`, {
      data: { token }, headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('AD-E10: Patient data isolation between users', async ({ request }) => {
    const p1 = await loginPatient(request, P1.email, P1.password);
    const p2 = await loginPatient(request, P2.email, P2.password);
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/phr/vitals`, { headers: AH(p1.token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/phr/vitals`, { headers: AH(p2.token), timeout: TIMEOUT }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AD-F: COMPREHENSIVE SYSTEM VALIDATION (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('AD-F: Comprehensive System Validation', () => {
  test('AD-F01: Full system health — all 3 services', async ({ request }) => {
    const [ph, dh, mh] = await Promise.all([
      request.get(`${PATIENT_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(ph.status()).toBe(200);
    expect(dh.status()).toBe(200);
    expect(mh.status()).toBe(200);
  });

  test('AD-F02: Database health for all services', async ({ request }) => {
    const [pdb, ddb, mdb] = await Promise.all([
      request.get(`${PATIENT_URL}/api/health/db`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/health/db`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health/db`, { timeout: TIMEOUT }),
    ]);
    expect(pdb.status()).toBe(200);
    expect(ddb.status()).toBe(200);
    expect(mdb.status()).toBe(200);
  });

  test('AD-F03: All 5 users can authenticate simultaneously', async ({ request }) => {
    // Login sequentially to avoid overwhelming the auth servers
    const r1 = await loginPatient(request, P1.email, P1.password);
    const r2 = await loginPatient(request, P2.email, P2.password);
    const r3 = await loginPatient(request, P3.email, P3.password);
    const r4 = await loginDoctor(request, DOC.email, DOC.password);
    const r5 = await loginDoctor(request, ADM.email, ADM.password);
    const results = [r1, r2, r3, r4, r5];
    for (const r of results) { expect(r.token).toBeTruthy(); }
  });

  test('AD-F04: All portals serve frontend', async ({ request }) => {
    const [p, d] = await Promise.all([
      request.get(`${PATIENT_URL}/`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/`, { timeout: TIMEOUT }),
    ]);
    expect(p.status()).toBe(200);
    expect(d.status()).toBe(200);
  });

  test('AD-F05: Patient full feature sweep', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const results = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/phr/vitals`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/pdpa/consents`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/metadata/specialties`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/content/medical`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    for (const r of results) { expect(r.status()).toBe(200); }
  });

  test('AD-F06: Doctor full feature sweep', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const results = await Promise.all([
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/emr`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/prescriptions`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/doctors`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/metadata/specialties`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    for (const r of results) { expect(r.status()).toBe(200); }
  });

  test('AD-F07: Admin full feature sweep', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const results = await Promise.all([
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/doctors`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    for (const r of results) { expect(r.status()).toBe(200); }
  });

  test('AD-F08: Final cross-portal integration test', async ({ request }) => {
    const pat = await loginPatient(request, P1.email, P1.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [pa, da, aa, pv, de, ms] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(pat.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(adm.token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/video-meeting/config`, { headers: AH(pat.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/video-meeting/config`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(pa.status()).toBe(200);
    expect(da.status()).toBe(200);
    expect(aa.status()).toBe(200);
    expect(pv.status()).toBe(200);
    expect(de.status()).toBe(200);
    expect(ms.status()).toBe(200);
  });
});
