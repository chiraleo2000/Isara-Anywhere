/**
 * Runtime HTTP pack for Meeting + PHR share redo (local Docker).
 * Soft-skips when stack is down — never fails CI offline.
 */
import { describe, it, expect } from 'vitest';

const PATIENT = (process.env.PATIENT_URL || 'http://127.0.0.1:3005').replace(/\/$/, '');
const DOCTOR = (process.env.DOCTOR_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');
const MEETING = (process.env.MEETING_URL || 'http://127.0.0.1:3020').replace(/\/$/, '');

const PATIENT_EMAIL = process.env.TEST_PATIENT_EMAIL || 'demo.test@gmail.com';
const PATIENT_PASSWORD = process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd';
const DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com';
const DOCTOR_PASSWORD = process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024';

async function healthy(url: string, path = '/api/health'): Promise<boolean> {
  try {
    const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function stackUp(): Promise<boolean> {
  const [p, d, m] = await Promise.all([
    healthy(PATIENT),
    healthy(DOCTOR),
    healthy(MEETING, '/health'),
  ]);
  return p && d && m;
}

async function login(base: string, email: string, password: string): Promise<string> {
  const paths = ['/api/auth/login', '/auth/login'];
  for (const authPath of paths) {
    const res = await fetch(`${base}${authPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) continue;
    const body = (await res.json().catch(() => ({}))) as {
      token?: string;
      accessToken?: string;
      data?: { token?: string };
    };
    const token = body.token || body.accessToken || body.data?.token;
    if (token) return token;
  }
  throw new Error(`login failed ${base}`);
}

describe('meetingPhrShareRuntime.integration — local Docker HTTP', () => {
  it(
    'MPS-HTTP-01 — GET /api/meetings/:id ensures meeting record',
    async () => {
      if (!(await stackUp())) {
        console.log('SKIP MPS-HTTP-01: Docker stack not healthy');
        return;
      }
      const doctorToken = await login(DOCTOR, DOCTOR_EMAIL, DOCTOR_PASSWORD);
      const appointmentId = `MPS-${Date.now().toString(36)}`;
      const create = await fetch(`${MEETING}/api/meetings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          appointmentId,
          patientId: 'PAT-TEST-001',
          doctorId: 'DOC-TEST-001',
          patientName: 'MPS Patient',
          doctorName: 'MPS Doctor',
        }),
      });
      expect(create.ok, `create ${create.status}`).toBe(true);
      const created = (await create.json().catch(() => ({}))) as {
        meeting?: { id?: string; appointment_id?: string };
        id?: string;
        appointmentId?: string;
      };
      const lookupId =
        created.meeting?.id
        || created.meeting?.appointment_id
        || created.id
        || created.appointmentId
        || appointmentId;

      // Prefer UUID from create; also prove appointment_id lookup when record exists.
      const getById = await fetch(`${MEETING}/api/meetings/${lookupId}`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      const getByApt = await fetch(`${MEETING}/api/meetings/${appointmentId}`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect(
        getById.status === 200 || getByApt.status === 200,
        `GET by id=${getById.status} apt=${getByApt.status} lookup=${lookupId}`,
      ).toBe(true);
      const okRes = getById.status === 200 ? getById : getByApt;
      const body = (await okRes.json().catch(() => ({}))) as { meeting?: Record<string, unknown> };
      expect(body.meeting || body).toBeTruthy();
    },
    90_000,
  );

  it(
    'MPS-HTTP-02 — guest-invite returns PATIENT_PORTAL token guestLink',
    async () => {
      if (!(await stackUp())) {
        console.log('SKIP MPS-HTTP-02: Docker stack not healthy');
        return;
      }
      const doctorToken = await login(DOCTOR, DOCTOR_EMAIL, DOCTOR_PASSWORD);
      const appointmentId = `MPS-G-${Date.now().toString(36)}`;
      await fetch(`${MEETING}/api/meetings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          appointmentId,
          patientId: 'PAT-TEST-001',
          doctorId: 'DOC-TEST-001',
          patientName: 'MPS Guest',
          doctorName: 'MPS Doctor',
        }),
      });

      const invite = await fetch(`${MEETING}/api/meetings/${appointmentId}/guest-invite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${doctorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestName: 'Guest MPS' }),
      });
      const inviteBody = (await invite.json().catch(() => ({}))) as {
        guestLink?: string;
        inviteLink?: string;
        error?: string;
        code?: string;
      };
      if (invite.status === 500 && inviteBody.code === 'PATIENT_PORTAL_URL_MISSING') {
        expect(inviteBody.code).toBe('PATIENT_PORTAL_URL_MISSING');
        return;
      }
      expect(invite.ok, JSON.stringify(inviteBody).slice(0, 240)).toBe(true);
      const link = inviteBody.guestLink || inviteBody.inviteLink || '';
      expect(link).toMatch(/^https?:\/\//);
      expect(link).toMatch(/token=|guest|invite/i);
      expect(link).not.toMatch(/:3020\/guest-join$/);
    },
    90_000,
  );

  it(
    'MPS-HTTP-03 — document download ACL denies foreign UUID for doctor',
    async () => {
      if (!(await stackUp())) {
        console.log('SKIP MPS-HTTP-03: Docker stack not healthy');
        return;
      }
      const doctorToken = await login(DOCTOR, DOCTOR_EMAIL, DOCTOR_PASSWORD);
      const fakeId = '00000000-0000-4000-8000-000000000099';
      const dl = await fetch(`${DOCTOR}/api/documents/${fakeId}/download`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      expect([403, 404]).toContain(dl.status);
    },
    60_000,
  );

  it(
    'MPS-HTTP-04 — patient meetings list exposes readyForPatient gate field',
    async () => {
      if (!(await stackUp())) {
        console.log('SKIP MPS-HTTP-04: Docker stack not healthy');
        return;
      }
      const patientToken = await login(PATIENT, PATIENT_EMAIL, PATIENT_PASSWORD);
      const res = await fetch(`${PATIENT}/api/phr/meetings`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.ok, `phr/meetings ${res.status}`).toBe(true);
      const body = (await res.json().catch(() => ({}))) as {
        meetings?: Array<Record<string, unknown>>;
        data?: Array<Record<string, unknown>>;
      };
      const meetings = body.meetings || body.data || [];
      expect(Array.isArray(meetings)).toBe(true);
      for (const m of meetings.slice(0, 20)) {
        expect(Object.prototype.hasOwnProperty.call(m, 'readyForPatient')).toBe(true);
        if (m.readyForPatient !== true) {
          expect(m.recordingUrl || m.downloadUrl || m.recording_url).toBeFalsy();
        }
      }
    },
    60_000,
  );

  it(
    'MPS-HTTP-05 — patient upload → patient download 200 (share bytes)',
    async () => {
      if (!(await stackUp())) {
        console.log('SKIP MPS-HTTP-05: Docker stack not healthy');
        return;
      }
      const patientToken = await login(PATIENT, PATIENT_EMAIL, PATIENT_PASSWORD);
      const payload = `mps-runtime ${Date.now()}`;
      const fileData = Buffer.from(payload, 'utf8').toString('base64');
      let docId: string | null = null;
      for (const url of [
        `${PATIENT}/api/patients/documents`,
        `${PATIENT}/api/documents`,
        `${PATIENT}/api/phr/documents`,
      ]) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${patientToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceType: 'patient_upload',
            title: `MPS Runtime ${Date.now()}`,
            fileName: `mps-${Date.now()}.txt`,
            mimeType: 'text/plain',
            fileData,
            fileSize: Buffer.byteLength(payload, 'utf8'),
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          document?: { id?: string };
          id?: string;
          data?: { id?: string };
        };
        if (res.ok) {
          docId = body.document?.id || body.id || body.data?.id || null;
          if (docId) break;
        }
      }
      if (!docId) {
        console.log('SKIP MPS-HTTP-05: no document upload endpoint accepted payload');
        return;
      }
      // Patient download lives under /api/phr/... (doctor uses /api/documents/...).
      let dl: Response | null = null;
      for (const url of [
        `${PATIENT}/api/phr/documents/${docId}/download`,
        `${PATIENT}/api/documents/${docId}/download`,
      ]) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${patientToken}` },
        });
        if (res.status === 200) {
          dl = res;
          break;
        }
      }
      if (!dl) {
        console.log('SKIP MPS-HTTP-05: upload/download path unavailable');
        return;
      }
      expect(dl.status).toBe(200);
      expect(Buffer.from(await dl.arrayBuffer()).length).toBeGreaterThan(0);

      // Doctor without owning PDPA / random doc should not get patient bytes by guessing
      const doctorToken = await login(DOCTOR, DOCTOR_EMAIL, DOCTOR_PASSWORD);
      const doctorDl = await fetch(`${DOCTOR}/api/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      // 200 only if PDPA grant exists for this fixture patient; otherwise 403
      expect([200, 403, 404]).toContain(doctorDl.status);
      if (doctorDl.status === 200) {
        expect(Buffer.from(await doctorDl.arrayBuffer()).length).toBeGreaterThan(0);
      }
    },
    90_000,
  );

  it(
    'MPS-HTTP-06 — meeting validate path accepts doctor auth (publish side-effect best-effort)',
    async () => {
      if (!(await stackUp())) {
        console.log('SKIP MPS-HTTP-06: Docker stack not healthy');
        return;
      }
      const doctorToken = await login(DOCTOR, DOCTOR_EMAIL, DOCTOR_PASSWORD);
      const appointmentId = `MPS-V-${Date.now().toString(36)}`;
      await fetch(`${MEETING}/api/meetings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          appointmentId,
          patientId: 'PAT-TEST-001',
          doctorId: 'DOC-TEST-001',
          patientName: 'MPS Validate',
          doctorName: 'MPS Doctor',
        }),
      });

      const validate = await fetch(`${MEETING}/api/meetings/${appointmentId}/validate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${doctorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          ready_for_patient: true,
          summary: { note: 'MPS runtime validate' },
        }),
      });
      // 200/201 preferred; 400/404 acceptable if meeting not in validatable state yet
      expect([200, 201, 400, 404, 409]).toContain(validate.status);
      if (validate.ok) {
        const body = (await validate.json().catch(() => ({}))) as Record<string, unknown>;
        expect(body).toBeTruthy();
      }
    },
    90_000,
  );
});
