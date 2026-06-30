/**
 * Code Breaker Round 2 — live cloud corruption probes (no auth → 401/400, never 500)
 * Skips meeting-server probes when :3020 is not up (local unit gate has no Docker).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** Host-side contract tests: docker DNS `meeting-server` is not resolvable outside compose network. */
function resolveMeetingBaseUrl() {
  const raw =
    process.env.MEETING_SERVER_URL ||
    'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app';
  if (/meeting-server(?::\d+)?/i.test(raw) && !process.env.TEST_ENV?.includes('cloud')) {
    return 'http://127.0.0.1:3020';
  }
  return raw.replace(/\/$/, '');
}

const MEETING = resolveMeetingBaseUrl();

/** Prefer local doctor portal in unit gate; cloud URL only when TEST_ENV=cloud. */
function resolveDoctorBaseUrl() {
  const raw =
    process.env.DOCTOR_PORTAL_URL ||
    process.env.DOCTOR_URL ||
    (process.env.TEST_ENV?.includes('cloud')
      ? 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app'
      : 'http://127.0.0.1:3010');
  if (/doctor-portal(?::\d+)?/i.test(raw) && !process.env.TEST_ENV?.includes('cloud')) {
    return 'http://127.0.0.1:3010';
  }
  return raw.replace(/\/$/, '');
}

const DOCTOR = resolveDoctorBaseUrl();

async function isMeetingServerUp() {
  try {
    const res = await fetch(`${MEETING}/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    const body = await res.json();
    return body.status === 'healthy' || body.features?.lobby === true;
  } catch {
    return false;
  }
}

async function isDoctorPortalUp() {
  try {
    const res = await fetch(`${DOCTOR}/health`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('Code Breaker Round 2 — cloud corruption', () => {
  it('CB2-C01 — meeting server rejects malformed JSON with 400', async () => {
    if (!(await isMeetingServerUp())) {
      console.log('[skip] meeting-server not reachable at', MEETING);
      return;
    }
    const res = await fetch(`${MEETING}/api/meetings/apt-test/save-recording`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer invalid' },
      body: '{"broken":',
    });
    assert.ok(res.status === 400 || res.status === 401, `expected 400/401 got ${res.status}`);
    assert.notEqual(res.status, 500);
  });

  it('CB2-C02 — join-config rejects invalid id chars with 400', async () => {
    if (!(await isMeetingServerUp())) {
      console.log('[skip] meeting-server not reachable at', MEETING);
      return;
    }
    const badId = `apt-${String.fromCodePoint(0)}evil`;
    const res = await fetch(
      `${MEETING}/api/meetings/${encodeURIComponent(badId)}/join-config?role=guest`,
    );
    assert.equal(res.status, 400);
  });

  it('CB2-C03 — jibri webhook rejects empty body with 400', async () => {
    if (!(await isMeetingServerUp())) {
      console.log('[skip] meeting-server not reachable at', MEETING);
      return;
    }
    const res = await fetch(`${MEETING}/api/webhooks/jibri-recording`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.ok([400, 401].includes(res.status), `expected 400/401 got ${res.status}`);
  });

  it('CB2-C04 — doctor EMR rejects non-object with 401/400 (not 500)', async () => {
    if (!(await isDoctorPortalUp())) {
      console.log('[skip] doctor-portal not reachable at', DOCTOR);
      return;
    }
    const res = await fetch(`${DOCTOR}/api/emr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '[]',
    });
    assert.ok([400, 401].includes(res.status), `status=${res.status}`);
    assert.notEqual(res.status, 500);
  });

  it('CB2-C05 — doctor EMR missing fields returns 401 or 400', async () => {
    if (!(await isDoctorPortalUp())) {
      console.log('[skip] doctor-portal not reachable at', DOCTOR);
      return;
    }
    const res = await fetch(`${DOCTOR}/api/emr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
      body: JSON.stringify({ subjective: 'only' }),
    });
    assert.ok([400, 401].includes(res.status));
    assert.notEqual(res.status, 500);
  });
});
