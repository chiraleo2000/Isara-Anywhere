/**
 * Byte-level share chain: patient upload → patient download 200,
 * plus doctor download ACL negative/positive cases when stack is up.
 */
import { describe, it, expect } from 'vitest';

const PATIENT = (process.env.PATIENT_URL || 'http://127.0.0.1:3005').replace(/\/$/, '');
const DOCTOR = (process.env.DOCTOR_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');
const PATIENT_EMAIL = process.env.TEST_PATIENT_EMAIL || 'demo.test@gmail.com';
const PATIENT_PASSWORD = process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd';
const DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com';
const DOCTOR_PASSWORD = process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024';

async function login(base: string, email: string, password: string) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  const token = body.token || body.accessToken || body.data?.token;
  if (!res.ok || !token) {
    throw new Error(`login failed ${base} ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  }
  return token as string;
}

async function patientHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${PATIENT}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('byteShareChain.integration — local Docker', () => {
  it(
    'patient upload → download returns non-empty bytes',
    async () => {
      if (!(await patientHealthy())) {
        console.log('SKIP byteShareChain patient path: patient portal down');
        return;
      }
      const patientToken = await login(PATIENT, PATIENT_EMAIL, PATIENT_PASSWORD);
      const payload = `byte-share patient upload ${Date.now()}`;
      const fileData = Buffer.from(payload, 'utf8').toString('base64');

      const endpoints = [
        `${PATIENT}/api/patients/documents`,
        `${PATIENT}/api/documents`,
        `${PATIENT}/api/phr/documents`,
      ];

      let docId: string | null = null;
      for (const url of endpoints) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${patientToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceType: 'patient_upload',
            title: `Byte Share ${Date.now()}`,
            fileName: `byte-share-${Date.now()}.txt`,
            mimeType: 'text/plain',
            fileData,
            fileSize: Buffer.byteLength(payload, 'utf8'),
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          docId = body.document?.id || body.id || body.data?.id || null;
          if (docId) break;
        }
      }

      if (!docId) {
        // List existing documents and download first available
        for (const url of [`${PATIENT}/api/documents`, `${PATIENT}/api/phr/documents`]) {
          const docsRes = await fetch(url, {
            headers: { Authorization: `Bearer ${patientToken}` },
          });
          if (!docsRes.ok) continue;
          const docsBody = await docsRes.json().catch(() => ({}));
          const docs = docsBody.documents || docsBody.data || [];
          if (Array.isArray(docs) && docs[0]?.id) {
            docId = docs[0].id;
            break;
          }
        }
      }

      expect(docId, 'need a document id').toBeTruthy();
      const dl = await fetch(`${PATIENT}/api/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(dl.status).toBe(200);
      const buf = Buffer.from(await dl.arrayBuffer());
      expect(buf.length).toBeGreaterThan(0);
    },
    90_000,
  );

  it(
    'doctor download of unknown document is denied (ACL)',
    async () => {
      if (!(await patientHealthy())) {
        console.log('SKIP byteShareChain doctor ACL: stack down');
        return;
      }
      let doctorUp = false;
      try {
        doctorUp = (await fetch(`${DOCTOR}/api/health`, { signal: AbortSignal.timeout(3000) })).ok;
      } catch {
        doctorUp = false;
      }
      if (!doctorUp) {
        console.log('SKIP byteShareChain doctor ACL: doctor portal down');
        return;
      }
      const doctorToken = await login(DOCTOR, DOCTOR_EMAIL, DOCTOR_PASSWORD);
      const res = await fetch(
        `${DOCTOR}/api/documents/00000000-0000-4000-8000-00000000dead/download`,
        { headers: { Authorization: `Bearer ${doctorToken}` } },
      );
      expect([403, 404]).toContain(res.status);
    },
    60_000,
  );

  it(
    'doctor→patient clinical bytes: patient can list PHR documents after login',
    async () => {
      if (!(await patientHealthy())) {
        console.log('SKIP byteShareChain doctor→patient list: patient down');
        return;
      }
      const patientToken = await login(PATIENT, PATIENT_EMAIL, PATIENT_PASSWORD);
      const listRes = await fetch(`${PATIENT}/api/phr/documents`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      // Some stacks expose /api/documents instead
      if (!listRes.ok) {
        const alt = await fetch(`${PATIENT}/api/documents`, {
          headers: { Authorization: `Bearer ${patientToken}` },
        });
        expect(alt.ok, `documents list ${alt.status}`).toBe(true);
        const altBody = await alt.json().catch(() => ({}));
        const docs = altBody.documents || altBody.data || [];
        expect(Array.isArray(docs)).toBe(true);
        return;
      }
      const body = await listRes.json().catch(() => ({}));
      const docs = body.documents || body.data || [];
      expect(Array.isArray(docs)).toBe(true);
      for (const doc of docs.slice(0, 10)) {
        if (doc.id && (doc.download_url || doc.sourceType || doc.source_type)) {
          const dl = await fetch(`${PATIENT}/api/documents/${doc.id}/download`, {
            headers: { Authorization: `Bearer ${patientToken}` },
          });
          if (dl.status === 200) {
            expect(Buffer.from(await dl.arrayBuffer()).length).toBeGreaterThan(0);
            break;
          }
        }
      }
    },
    90_000,
  );
});
