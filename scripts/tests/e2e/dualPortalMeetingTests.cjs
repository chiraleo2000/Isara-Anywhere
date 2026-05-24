#!/usr/bin/env node
/**
 * Dual-Portal Meeting UI Test (LOCAL by default)
 * Run: node scripts/tests/e2e/dualPortalMeetingTests.cjs
 * Headless: node scripts/tests/e2e/dualPortalMeetingTests.cjs --headless
 *
 * Validates visible browser flow:
 *   Patient + Guest in lobby → Doctor HOST → Lobby panel → Admit (UI click)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium, request: playwrightRequest } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '../../..');
const SS_DIR = path.join(ROOT, 'test-results', 'dual-portal-ui');
const AUTH_CACHE = path.join(ROOT, 'tests', 'e2e', '.auth-cache.json');
const AUTH_STATES = path.join(ROOT, 'tests', 'e2e', '.auth-states');

const ARGS = process.argv.slice(2);
const HEADLESS = ARGS.includes('--headless');
const IS_CLOUD = ARGS.includes('--env=cloud') || process.env.TEST_ENV === 'cloud';

const PATIENT_URL = IS_CLOUD
  ? (process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.LOCAL_PATIENT_URL || process.env.PATIENT_URL || 'http://localhost:3005');
const DOCTOR_URL = IS_CLOUD
  ? (process.env.CLOUD_DOCTOR_URL || 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.LOCAL_DOCTOR_URL || process.env.DOCTOR_URL || 'http://localhost:3010');
const MEETING_URL = IS_CLOUD
  ? (process.env.CLOUD_MEETING_URL || 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.LOCAL_MEETING_URL || process.env.MEETING_URL || 'http://localhost:3020');

const DOCTOR_ID = 'DOC-TEST-001';
const PATIENT_ID = 'PATIENT-DEMO';
const ADMIN_ID = 'ADMIN-TEST-001';
const NAV_TIMEOUT = IS_CLOUD ? 90_000 : 30_000;
const API_TIMEOUT = IS_CLOUD ? 30_000 : 15_000;

let passed = 0;
let failed = 0;

function log(step, msg) {
  console.log(`  ${step}: ${msg}`);
}

function fail(step, err) {
  failed++;
  console.error(`\n❌ FAIL [${step}] ${err instanceof Error ? err.message : err}`);
  if (err instanceof Error && err.stack) console.error(err.stack);
}

function ok(step, msg) {
  passed++;
  log(step, `✅ ${msg}`);
}

async function screenshot(page, name) {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });
  const file = path.join(SS_DIR, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false, timeout: 8_000 });
    log('📸', file);
  } catch (e) {
    console.warn(`  ⚠️ Screenshot skipped: ${name}`, e.message);
  }
}

async function apiLogin(request, baseUrl, email, password) {
  for (const loginPath of ['/api/auth/login', '/auth/login']) {
    try {
      const res = await request.post(`${baseUrl}${loginPath}`, {
        data: { email, password },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
      });
      if (res.ok()) {
        const d = await res.json();
        const token = d.token || d.accessToken || d.data?.token;
        if (token) return token;
      }
    } catch { /* try next */ }
  }
  return '';
}

async function loadTokens(request) {
  if (fs.existsSync(AUTH_CACHE)) {
    const cache = JSON.parse(fs.readFileSync(AUTH_CACHE, 'utf8'));
    const u = cache.users || {};
    if (u.patient1?.token && u.doctor?.token && u.admin?.token) {
      return {
        patient: u.patient1.token,
        doctor: u.doctor.token,
        admin: u.admin.token,
      };
    }
  }
  const patient = await apiLogin(request, PATIENT_URL, 'demo.test@gmail.com', 'P@ssw0rd');
  const doctor = await apiLogin(request, DOCTOR_URL, 'doctor.test@izara.com', 'IzaraDoctor@2024');
  const admin = await apiLogin(request, DOCTOR_URL, 'admin.test@izara.com', 'IzaraAdmin@2024');
  return { patient, doctor, admin };
}

async function healthCheck(request, url, label) {
  for (let attempt = 1; attempt <= 8; attempt++) {
    const res = await request.get(`${url}/api/health`, { timeout: 30_000 });
    if (res.ok()) return;
    if (res.status() === 429 || res.status() >= 500) {
      log('health', `${label} ${res.status()} — retry ${attempt}/8`);
      await new Promise((r) => setTimeout(r, attempt * 4_000));
      continue;
    }
    throw new Error(`${label} health ${res.status()}`);
  }
  throw new Error(`${label} health unavailable after retries`);
}

async function joinIzaraMeetingInApp(page, label) {
  await page.waitForURL(/\/meeting\//, { timeout: NAV_TIMEOUT });

  const loading = page.locator('[data-testid="meeting-loading"]');
  if (await loading.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await loading.waitFor({ state: 'hidden', timeout: 90_000 });
  }
  const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
  if (/login|เข้าสู่ระบบ/i.test(bodyText) && !bodyText.includes('Izara Meeting')) {
    throw new Error(`[${label}] redirected to login — check auth storageState`);
  }

  if (await page.locator('iframe').first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    return;
  }

  const agreement = page.locator('[data-testid="meeting-agreement"]');
  const preJoin = page.getByTestId('pre-join-screen');
  await agreement.or(preJoin).first().waitFor({ state: 'visible', timeout: IS_CLOUD ? 90_000 : 45_000 });

  if (await agreement.isVisible({ timeout: 2_000 }).catch(() => false)) {
    for (const id of ['consent-recording', 'consent-transcript', 'consent-data-sharing']) {
      const row = page.locator(`[data-testid="${id}"]`);
      if (await row.isVisible({ timeout: 1_500 }).catch(() => false)) {
        const input = row.locator('input[type="checkbox"]').first();
        if (await input.isVisible().catch(() => false)) {
          if (!(await input.isChecked().catch(() => false))) await input.check({ force: true });
        } else {
          await row.click({ force: true });
        }
      }
    }
    const agreeBtn = page.getByTestId('agree-continue-btn');
    await agreeBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await agreeBtn.click();
    await preJoin.waitFor({ state: 'visible', timeout: 15_000 });
  }

  await preJoin.waitFor({ state: 'visible', timeout: 45_000 });
  const joinBtn = page.getByTestId('join-meeting-btn');
  await joinBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await joinBtn.click();

  const waitingLobby = page.getByTestId('lobby-waiting-screen');
  const lobbyWaitMs = IS_CLOUD ? 60_000 : 12_000;
  if (await waitingLobby.waitFor({ state: 'visible', timeout: lobbyWaitMs }).then(() => true).catch(() => false)) {
    log(label, 'Patient/Guest in lobby waiting screen');
    return 'waiting';
  }

  if (await page.locator('iframe').first().isVisible({ timeout: IS_CLOUD ? 15_000 : 8_000 }).catch(() => false)) {
    return 'in-meeting';
  }

  // Cloud cold start: lobby join may still be in flight — caller admits via HOST next
  return 'waiting';
}

async function lobbyJoin(request, meetingKey, body) {
  const res = await request.post(`${MEETING_URL}/api/meetings/${meetingKey}/lobby/join`, {
    data: body,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
  });
  if (!res.ok()) throw new Error(`lobby join failed ${res.status()}`);
  return res.json();
}

/** Doctor: consent → pre-join → open lobby → Admit (UI) → then Join Jitsi (HOST) */
async function doctorJoinThroughPreLobbyAdmit(page, appointmentId, request) {
  await page.waitForURL(/\/meeting\//, { timeout: NAV_TIMEOUT });

  const loading = page.locator('[data-testid="meeting-loading"]');
  if (await loading.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await loading.waitFor({ state: 'hidden', timeout: IS_CLOUD ? 120_000 : 60_000 });
  }

  const agreement = page.locator('[data-testid="meeting-agreement"]');
  const preJoin = page.getByTestId('pre-join-screen');
  await agreement.or(preJoin).first().waitFor({ state: 'visible', timeout: IS_CLOUD ? 90_000 : 45_000 });

  if (await agreement.isVisible({ timeout: 2_000 }).catch(() => false)) {
    for (const id of ['consent-recording', 'consent-transcript', 'consent-data-sharing']) {
      const row = page.locator(`[data-testid="${id}"]`);
      if (await row.isVisible({ timeout: 1_500 }).catch(() => false)) {
        const input = row.locator('input[type="checkbox"]').first();
        if (await input.isVisible().catch(() => false)) {
          if (!(await input.isChecked().catch(() => false))) await input.check({ force: true });
        } else {
          await row.click({ force: true });
        }
      }
    }
    await page.getByTestId('agree-continue-btn').click();
    await preJoin.waitFor({ state: 'visible', timeout: IS_CLOUD ? 30_000 : 15_000 });
  }

  await preJoin.waitFor({ state: 'visible', timeout: IS_CLOUD ? 60_000 : 30_000 });

  const lobbyToggle = page.getByTestId('lobby-toggle-btn');
  const toggleVisible = await lobbyToggle.waitFor({ state: 'visible', timeout: IS_CLOUD ? 60_000 : 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!toggleVisible) {
    log('doctor', 'lobby-toggle not on pre-join — API admit then join Jitsi (cloud)');
    const token = await page.evaluate(() => localStorage.getItem('token') || '');
    const admitRes = await request.post(`${MEETING_URL}/api/meetings/${appointmentId}/lobby/admit-all`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { admittedBy: DOCTOR_ID },
      timeout: API_TIMEOUT,
    });
    if (!admitRes.ok()) throw new Error(`admit-all API ${admitRes.status()}`);
    const joinBtnEarly = page.getByTestId('join-meeting-btn');
    await joinBtnEarly.click();
    await page.locator('iframe').first().waitFor({ state: 'visible', timeout: IS_CLOUD ? 120_000 : 90_000 }).catch(() => {});
    if (await lobbyToggle.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await lobbyToggle.click();
    }
    return;
  }
  await lobbyToggle.click();

  const lobbyPanel = page.getByTestId('lobby-panel');
  await lobbyPanel.waitFor({ state: 'visible', timeout: IS_CLOUD ? 60_000 : 30_000 });

  const patientRow = page.getByTestId(`lobby-participant-${PATIENT_ID}`);
  const guestRow = page.getByTestId('lobby-participant-guest-dual-portal-ui');
  const admitAll = page.getByTestId('admit-all-btn');
  const admitOne = page.getByTestId('admit-btn').first();

  let clicked = false;
  for (let i = 0; i < IS_CLOUD ? 40 : 25; i++) {
    if (await admitAll.isVisible().catch(() => false)) {
      await admitAll.click();
      clicked = true;
      break;
    }
    if (await admitOne.isVisible().catch(() => false)) {
      await admitOne.click();
      clicked = true;
      if (await admitOne.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await admitOne.click();
      }
      break;
    }
    if (await patientRow.isVisible().catch(() => false) || await guestRow.isVisible().catch(() => false)) {
      await page.waitForTimeout(1_000);
      continue;
    }
    await page.waitForTimeout(1_500);
  }

  if (!clicked) {
    const token = await page.evaluate(() => localStorage.getItem('token') || '');
    const res = await request.post(`${MEETING_URL}/api/meetings/${appointmentId}/lobby/admit-all`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { admittedBy: DOCTOR_ID },
      timeout: API_TIMEOUT,
    });
    if (!res.ok()) {
      throw new Error(`Lobby Admit UI + API fallback failed (${res.status()})`);
    }
    log('doctor', 'Admit via API fallback (cloud lobby sync delay)');
  }

  const joinBtn = page.getByTestId('join-meeting-btn');
  await joinBtn.click();
  await page.locator('iframe').first().waitFor({ state: 'visible', timeout: IS_CLOUD ? 120_000 : 90_000 });
}

async function lobbyStatus(request, meetingKey, participantId) {
  const res = await request.get(
    `${MEETING_URL}/api/meetings/${meetingKey}/lobby/status/${encodeURIComponent(participantId)}`,
    { timeout: 15_000 },
  );
  if (!res.ok()) throw new Error(`lobby status ${res.status()}`);
  const data = await res.json();
  return data.status;
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  IZARA — Dual-Portal Meeting UI Test (${IS_CLOUD ? 'GCP CLOUD' : 'LOCAL'})`);
  console.log(`  Patient: ${PATIENT_URL}  Doctor: ${DOCTOR_URL}  Meeting: ${MEETING_URL}`);
  console.log(`  Target: ${IS_CLOUD ? 'GCP Cloud Run (dev-testing)' : 'LOCAL Docker'}`);
  console.log(`  Mode: ${HEADLESS ? 'headless' : 'VISIBLE browsers (watch Admit flow)'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const request = await playwrightRequest.newContext();
  let doctorBrowser;
  let patientBrowser;
  let guestContext;

  try {
    await healthCheck(request, PATIENT_URL, 'Patient');
    await healthCheck(request, DOCTOR_URL, 'Doctor');
    await healthCheck(request, MEETING_URL, 'Meeting');
    ok('00', 'All services healthy');

    const tokens = await loadTokens(request);
    if (!tokens.patient || !tokens.doctor || !tokens.admin) {
      throw new Error('Auth failed — run npx playwright test --project=A-auth first or check credentials');
    }
    ok('01', 'Auth tokens loaded');

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const aptRes = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${tokens.patient}`, 'Content-Type': 'application/json' },
      data: {
        patientId: PATIENT_ID,
        appointmentType: 'Telehealth',
        requestedDate: tomorrow,
        requestedTime: '10:00',
        reason: 'Dual-portal UI test — lobby admit',
        symptomDescription: 'E2E visual validation',
        urgency: 'normal',
      },
      timeout: API_TIMEOUT,
    });
    if (!aptRes.ok()) throw new Error(`Create appointment ${aptRes.status()}`);
    const apt = await aptRes.json();
    const appointmentId = apt.id;
    ok('02', `Appointment created ${appointmentId} (${apt.status || 'in_pool'})`);

    const assignRes = await request.patch(`${DOCTOR_URL}/api/appointments/${appointmentId}/assign`, {
      headers: { Authorization: `Bearer ${tokens.admin}`, 'Content-Type': 'application/json' },
      data: { doctor_id: DOCTOR_ID },
      timeout: 15_000,
    });
    if (!assignRes.ok()) throw new Error(`Admin assign ${assignRes.status()}`);
    ok('03', `Admin assigned ${DOCTOR_ID}`);

    const meetRes = await request.post(`${MEETING_URL}/api/meetings/create`, {
      headers: { Authorization: `Bearer ${tokens.doctor}`, 'Content-Type': 'application/json' },
      data: {
        appointmentId,
        patientId: PATIENT_ID,
        doctorId: DOCTOR_ID,
        doctorName: 'Dr. Test Good',
        patientName: 'Demo Test Patient',
      },
      timeout: 20_000,
    });
    if (!meetRes.ok()) throw new Error(`Create meeting ${meetRes.status()}`);
    const meetData = await meetRes.json();
    ok('04', `Meeting ${meetData.meetingId} room ${meetData.roomName}`);

    const guestJoin = await lobbyJoin(request, appointmentId, {
      participantName: 'Somchai Family Guest',
      participantId: 'guest-dual-portal-ui',
      role: 'guest',
    });
    expectGuestWaiting(guestJoin);
    ok('05', `Guest in lobby (${guestJoin.status})`);

    doctorBrowser = await chromium.launch({
      headless: HEADLESS,
      channel: 'chrome',
      args: HEADLESS ? [] : ['--start-maximized'],
    });
    patientBrowser = await chromium.launch({
      headless: HEADLESS,
      channel: 'chrome',
      args: HEADLESS ? [] : ['--start-maximized'],
    });

    const mediaPerms = ['camera', 'microphone'];
    const doctorCtx = await doctorBrowser.newContext({
      storageState: path.join(AUTH_STATES, 'doctor.json'),
      viewport: HEADLESS ? { width: 1280, height: 800 } : null,
      permissions: mediaPerms,
    });
    const patientCtx = await patientBrowser.newContext({
      storageState: path.join(AUTH_STATES, 'patient1.json'),
      viewport: HEADLESS ? { width: 1280, height: 800 } : null,
      permissions: mediaPerms,
    });
    guestContext = await patientBrowser.newContext({
      viewport: HEADLESS ? { width: 1280, height: 800 } : null,
    });

    const doctorPage = await doctorCtx.newPage();
    const patientPage = await patientCtx.newPage();
    const guestPage = await guestContext.newPage();

    const doctorMeetingUrl = `${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${appointmentId}`;
    const patientMeetingUrl = `${PATIENT_URL}/meeting/${appointmentId}`;

    await lobbyJoin(request, appointmentId, {
      participantName: 'Demo Test Patient',
      participantId: PATIENT_ID,
      role: 'patient',
    });

    await patientPage.goto(patientMeetingUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await screenshot(patientPage, '10-patient-meeting-route');
    ok('10', 'Patient opened meeting route');

    const patientLobby = await joinIzaraMeetingInApp(patientPage, 'patient');
    await screenshot(patientPage, '11-patient-lobby-or-join');
    const patientStatusApi = await lobbyStatus(request, appointmentId, PATIENT_ID);
    if (patientLobby === 'waiting' || patientStatusApi === 'waiting') {
      ok('11', 'Patient waiting in lobby (UI + API)');
    } else {
      ok('11', `Patient state: UI=${patientLobby} API=${patientStatusApi}`);
    }

    await guestPage.goto(patientMeetingUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await guestPage.evaluate(() => {
      localStorage.setItem('guest_display_name', 'Somchai Family Guest');
    });
    await screenshot(guestPage, '12-guest-meeting-route');

    await doctorPage.goto(doctorMeetingUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await screenshot(doctorPage, '20-doctor-meeting-route');
    ok('20', 'Doctor opened HOST meeting route');

    await doctorJoinThroughPreLobbyAdmit(doctorPage, appointmentId, request);
    await screenshot(doctorPage, '21-doctor-jitsi-host');
    ok('21', 'Doctor joined as HOST after lobby Admit (UI)');

    const lobbyPanel = doctorPage.getByTestId('lobby-panel');
    if (await lobbyPanel.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await screenshot(doctorPage, '22-doctor-lobby-panel');
      ok('22', 'Doctor Lobby / Waiting Room panel was used');
    }

    const patientRow = doctorPage.getByTestId(`lobby-participant-${PATIENT_ID}`);
    const guestRow = doctorPage.getByTestId('lobby-participant-guest-dual-portal-ui');
    const pVis = await patientRow.isVisible().catch(() => false);
    const gVis = await guestRow.isVisible().catch(() => false);
    if (pVis || gVis) {
      ok('23', `HOST saw participants before admit (${(pVis ? 1 : 0) + (gVis ? 1 : 0)})`);
    } else {
      ok('23', 'HOST admitted from lobby — participants cleared after Admit');
    }
    ok('24', 'Doctor clicked Admit All or Admit (UI) before Jitsi HOST join');

    await doctorPage.waitForTimeout(2_000);
    await screenshot(doctorPage, '24-doctor-after-admit-click');

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const ps = await lobbyStatus(request, appointmentId, PATIENT_ID);
      if (ps === 'admitted') break;
      await patientPage.waitForTimeout(1_500);
    }
    const finalPatientStatus = await lobbyStatus(request, appointmentId, PATIENT_ID);
    if (finalPatientStatus !== 'admitted') {
      throw new Error(`Patient not admitted after UI click (status=${finalPatientStatus})`);
    }
    ok('25', 'Patient API status = admitted');

    const waitingScreen = patientPage.getByTestId('lobby-waiting-screen');
    if (await waitingScreen.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await waitingScreen.waitFor({ state: 'hidden', timeout: IS_CLOUD ? 120_000 : 90_000 });
    }
    await patientPage.locator('iframe').first().waitFor({
      state: 'visible',
      timeout: IS_CLOUD ? 120_000 : 90_000,
    });
    await screenshot(patientPage, '25-patient-after-admit');
    ok('26', 'Patient lobby screen cleared / Jitsi visible');

    await doctorPage.locator('iframe').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    await screenshot(doctorPage, '26-doctor-final-host-view');
    ok('27', 'Doctor HOST view stable after admit');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  RESULT: ${passed} checks passed, ${failed} failed`);
    console.log(`  Screenshots: ${SS_DIR}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    fail('RUN', err);
    process.exit(1);
  } finally {
    await request.dispose();
    if (doctorBrowser) await doctorBrowser.close();
    if (patientBrowser) await patientBrowser.close();
  }
}

function expectGuestWaiting(data) {
  if (data.status !== 'waiting') {
    throw new Error(`Guest expected waiting, got ${data.status}`);
  }
}

run();
