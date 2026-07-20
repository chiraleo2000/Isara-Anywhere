#!/usr/bin/env node
/**
 * GATE 0 — Cloud appointment sync smoke (G1–G6 API chain).
 * Usage: PATIENT_URL=... DOCTOR_URL=... PATIENT_TOKEN=... DOCTOR_TOKEN=... ADMIN_TOKEN=... node scripts/verify-cloud-appointment-sync.mjs
 */
const fetch = globalThis.fetch;

const PATIENT_URL = (
  process.env.PATIENT_URL ||
  process.env.CLOUD_PATIENT_URL ||
  'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app'
).replace(/\/$/, '');
const DOCTOR_URL = (
  process.env.DOCTOR_URL ||
  process.env.CLOUD_DOCTOR_URL ||
  'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app'
).replace(/\/$/, '');

async function apiLogin(baseUrl, email, password) {
  for (const loginPath of ['/api/auth/login', '/auth/login']) {
    try {
      const resp = await fetch(`${baseUrl}${loginPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          deviceId: process.env.VERIFY_DEVICE_ID || 'gate0-verify',
          userAgent: 'gate0-verify-script/1.0',
        }),
      });
      if (resp.ok) {
        const d = await resp.json();
        const token = d.token || d.accessToken || d.data?.token || '';
        if (token) return token;
      }
    } catch {
      /* try next */
    }
  }
  return '';
}

let PATIENT_TOKEN = process.env.PATIENT_TOKEN || '';
let ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
let DOCTOR_TOKEN = process.env.DOCTOR_TOKEN || '';

function auth(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function json(method, url, token, body) {
  const resp = await fetch(url, {
    method,
    headers: auth(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: resp.ok, status: resp.status, data };
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function pass(msg) {
  console.log(`✅ ${msg}`);
}

async function main() {
  if (!PATIENT_TOKEN) {
    PATIENT_TOKEN = await apiLogin(
      PATIENT_URL,
      process.env.TEST_PATIENT1_EMAIL || 'demo.test@gmail.com',
      process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd',
    );
  }
  if (!ADMIN_TOKEN) {
    ADMIN_TOKEN = await apiLogin(
      DOCTOR_URL,
      process.env.TEST_ADMIN_EMAIL || 'admin.test@izara.com',
      process.env.TEST_ADMIN_PASSWORD || 'IzaraAdmin@2024',
    );
  }
  if (!DOCTOR_TOKEN) {
    DOCTOR_TOKEN = await apiLogin(
      DOCTOR_URL,
      process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com',
      process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024',
    );
  }
  if (!PATIENT_URL || !DOCTOR_URL || !PATIENT_TOKEN || !ADMIN_TOKEN || !DOCTOR_TOKEN) {
    fail('Could not resolve PATIENT_URL/DOCTOR_URL or login tokens (set TEST_*_EMAIL/PASSWORD in .env)');
  }

  console.log('GATE 0 verify — appointment sync\n');

  const create = await json('POST', `${PATIENT_URL}/api/appointments`, PATIENT_TOKEN, {
    patientId: process.env.VERIFY_PATIENT_ID || 'PATIENT-DEMO',
    appointmentType: 'Telehealth',
    requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    requestedTime: '11:00',
    reason: 'GATE0 verify script',
    symptomDescription: 'Verify sync headache fever',
    urgency: 'normal',
    status: 'pending',
  });
  if (!create.ok || !create.data?.id) fail(`G1 create failed: ${create.status} ${JSON.stringify(create.data)}`);
  const appointmentId = create.data.id;
  pass(`G1 created appointment ${appointmentId} status=${create.data.status || '?'}`);

  let poolHit = null;
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const pool = await json('GET', `${DOCTOR_URL}/api/appointment-pool`, ADMIN_TOKEN);
    if (pool.ok) {
      const list = Array.isArray(pool.data) ? pool.data : [];
      poolHit = list.find((r) => r.id === appointmentId);
      if (poolHit) break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!poolHit) fail(`G2 pool did not show ${appointmentId} within 45s`);
  pass(`G2 admin pool visible status=${poolHit.status || poolHit.poolStatus}`);

  const assign = await json('PATCH', `${DOCTOR_URL}/api/appointments/${appointmentId}/assign`, ADMIN_TOKEN, {
    doctor_id: process.env.VERIFY_DOCTOR_ID || 'DOC-TEST-001',
    doctorId: process.env.VERIFY_DOCTOR_ID || 'DOC-TEST-001',
    assignmentMethod: 'admin_manual',
  });
  if (!assign.ok) fail(`G3 assign failed: ${assign.status}`);
  pass('G3 admin assigned doctor');

  const doctorToken = DOCTOR_TOKEN;
  const doctorId = process.env.VERIFY_DOCTOR_ID || 'DOC-TEST-001';
  let doctorHit = null;
  const dDeadline = Date.now() + 60_000;
  while (Date.now() < dDeadline) {
    const appts = await json('GET', `${DOCTOR_URL}/api/appointments?doctorId=${doctorId}`, doctorToken);
    if (appts.ok) {
      const list = Array.isArray(appts.data) ? appts.data : (appts.data?.appointments || []);
      doctorHit = list.find((r) => r.id === appointmentId);
      if (doctorHit) break;
    }
    const awaiting = await json(
      'GET',
      `${DOCTOR_URL}/api/appointments?doctorId=${doctorId}&status=awaiting_doctor_response`,
      doctorToken,
    );
    if (awaiting.ok) {
      const list = Array.isArray(awaiting.data) ? awaiting.data : (awaiting.data?.appointments || []);
      doctorHit = list.find((r) => r.id === appointmentId);
      if (doctorHit) break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!doctorHit) fail(`G4 doctor queue missing ${appointmentId} (checked all + awaiting_doctor_response)`);
  pass(`G4 doctor queue status=${doctorHit.status}`);

  const confirm = await json('POST', `${DOCTOR_URL}/api/appointments/${appointmentId}/confirm`, doctorToken, {
    doctorId,
    confirmedDate: new Date().toISOString().split('T')[0],
    confirmedTime: '11:00',
  });
  if (!confirm.ok) fail(`G5 doctor confirm failed: ${confirm.status}`);
  pass('G5 doctor confirmed (not admin)');

  console.log('\n🎉 GATE 0 API chain passed (G1–G5). Run Playwright Group D/E for G6–G10 UI.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
