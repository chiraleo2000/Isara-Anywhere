#!/usr/bin/env node
/**
 * Meeting API smoke — verifies :3020 health, config, create, host-present, lobby join, join-config.
 * Usage: node scripts/docker/meeting-api-smoke.mjs
 * Env: MEETING_URL (default http://127.0.0.1:3020), DOCTOR_URL (default http://127.0.0.1:3010)
 */
import { createHash } from 'node:crypto';

const MEETING_URL = (process.env.MEETING_URL || 'http://127.0.0.1:3020').replace(/\/$/, '');
const DOCTOR_URL = (process.env.DOCTOR_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');
const DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com';
// NOSONAR — E2E seed default; override via TEST_DOCTOR_PASSWORD in CI
const DOCTOR_PASSWORD = process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024';
const PATIENT_ID = process.env.TEST_PATIENT_ID || 'PAT-TEST-001';
const DOCTOR_ID = process.env.TEST_DOCTOR_ID || 'DOC-TEST-001';
const PATIENT_EMAIL = process.env.TEST_PATIENT_EMAIL || 'demo.test@gmail.com';
// NOSONAR — E2E seed default; override via TEST_PATIENT_PASSWORD in CI
const PATIENT_PASSWORD = process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd';

const failures = [];

function fail(step, detail) {
  failures.push({ step, detail });
  console.error(`FAIL [${step}] ${detail}`);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, body };
}

async function loginPortal(baseUrl, email, password) {
  const deadline = Date.now() + 30_000;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    for (const authPath of ['/api/auth/login', '/auth/login']) {
      const { ok, body } = await fetchJson(`${baseUrl}${authPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          // doctor portal auth accepts these and it improves parity with real clients
          deviceId: `smoke-${attempt}`,
          userAgent: 'meeting-api-smoke',
        }),
      });
      const token = body?.token || body?.accessToken || body?.data?.token;
      if (ok && token) return token;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

function assertOk(step, result, detail) {
  if (result.ok) return true;
  fail(step, detail ?? `HTTP ${result.status}`);
  return false;
}

function buildMinimalWebmBase64() {
  const size = 2048;
  const buf = Buffer.alloc(size);
  buf.writeUInt32BE(0x1a45dfa3, 0);
  return buf.toString('base64');
}

async function smokeCreateFlow(token) {
  const appointmentId = `SMOKE-${createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 12)}`;
  const create = await fetchJson(`${MEETING_URL}/api/meetings/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      appointmentId,
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      patientName: 'Smoke Patient',
      doctorName: 'Smoke Doctor',
    }),
  });
  if (!assertOk('create', create, `HTTP ${create.status} ${JSON.stringify(create.body).slice(0, 200)}`)) {
    return;
  }

  const meetingId = create.body?.meetingId || create.body?.meeting?.id;
  const roomName = create.body?.roomName || create.body?.meeting?.room_name;
  console.log(`OK create meetingId=${meetingId} roomName=${roomName}`);
  if (!roomName) fail('create', 'missing roomName');

  const hostPresent = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/host-present`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inJitsi: true }),
  });
  if (assertOk('host-present', hostPresent)) console.log('OK host-present');

  const hostAbsent = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/host-absent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (assertOk('host-absent', hostAbsent)) console.log('OK host-absent');

  const hostPresentAgain = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/host-present`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inJitsi: true }),
  });
  if (!assertOk('host-present', hostPresentAgain)) return;

  const hostReady = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/host-ready`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (assertOk('host-ready', hostReady)) {
    console.log('OK host-ready', JSON.stringify(hostReady.body).slice(0, 120));
  }

  const patientToken = await loginPortal(process.env.PATIENT_URL || 'http://127.0.0.1:3005', PATIENT_EMAIL, PATIENT_PASSWORD);
  const lobbyJoin = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/lobby/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(patientToken ? { Authorization: `Bearer ${patientToken}` } : {}),
    },
    body: JSON.stringify({
      participantName: 'Smoke Patient',
      participantId: PATIENT_ID,
      role: 'patient',
    }),
  });
  if (assertOk('lobby-join', lobbyJoin)) console.log('OK lobby join');

  const joinConfig = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/join-config`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (assertOk('join-config', joinConfig)) {
    const domain = joinConfig.body?.domain || joinConfig.body?.jitsiDomain;
    const room = joinConfig.body?.roomName || joinConfig.body?.room;
    console.log(`OK join-config domain=${domain} room=${room}`);
    if (!domain) fail('join-config', 'missing domain');
  }

  const admitAll = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/lobby/admit-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ admittedBy: DOCTOR_ID }),
  });
  if (assertOk('lobby-admit-all', admitAll)) {
    console.log(`OK lobby-admit-all admitted=${admitAll.body?.total ?? 0}`);
  }

  const autoRecord = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/auto-record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ doctorName: 'Smoke Doctor', recording: true }),
  });
  if (assertOk('auto-record', autoRecord)) console.log('OK auto-record');

  const saveRec = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/save-recording`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      audioBase64: buildMinimalWebmBase64(),
      mimeType: 'audio/webm',
      durationMs: 10_000,
      triggerPostMeetingPipeline: true,
    }),
  });
  if (assertOk('save-recording', saveRec)) {
    console.log(`OK save-recording recordingUrl=${saveRec.body?.recordingUrl || 'pending'}`);
  }

  let recordingUrl = saveRec.body?.recordingUrl;
  const resultsDeadline = Date.now() + 30_000;
  while (!recordingUrl && Date.now() < resultsDeadline) {
    const results = await fetchJson(`${MEETING_URL}/api/meetings/${appointmentId}/results`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (results.ok) {
      recordingUrl = results.body?.recordingUrl || results.body?.meeting?.recordingUrl;
      if (recordingUrl) break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (recordingUrl) {
    console.log(`OK results recordingUrl=${recordingUrl}`);
  } else {
    fail('results-recordingUrl', 'recordingUrl not available within 30s');
  }

  return appointmentId;
}

console.log(`== meeting-api-smoke ==\nMEETING_URL=${MEETING_URL}\nDOCTOR_URL=${DOCTOR_URL}`);

const health = await fetchJson(`${MEETING_URL}/health`);
if (health.ok) console.log('OK health', JSON.stringify(health.body).slice(0, 120));
else fail('health', `HTTP ${health.status}`);

const config = await fetchJson(`${MEETING_URL}/api/config`);
if (config.ok && config.body?.jitsiDomain) {
  console.log(`OK config jitsiDomain=${config.body.jitsiDomain}`);
} else if (config.ok) {
  fail('config', 'missing jitsiDomain');
} else {
  fail('config', `HTTP ${config.status}`);
}

const token = await loginPortal(DOCTOR_URL, DOCTOR_EMAIL, DOCTOR_PASSWORD);
if (token) {
  console.log('OK doctor login');
  await smokeCreateFlow(token);
} else {
  fail('login', `could not login ${DOCTOR_EMAIL} at ${DOCTOR_URL}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f.step}: ${f.detail}`);
  process.exit(1);
}
console.log('\nPASS — meeting API smoke');
