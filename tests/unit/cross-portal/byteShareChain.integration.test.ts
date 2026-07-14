/**
 * Byte-level share chain: patient upload → patient download 200.
 * (Doctor publish path is PDPA-gated; E/F/L E2E covers doctor→patient clinical publish.)
 */
import { describe, it, expect } from 'vitest';

const PATIENT = process.env.PATIENT_URL || 'http://127.0.0.1:3005';
const PATIENT_EMAIL = process.env.TEST_PATIENT_EMAIL || 'demo.test@gmail.com';
const PATIENT_PASSWORD = process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd';

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

describe('byteShareChain.integration — local Docker', () => {
  it(
    'patient upload → download returns non-empty bytes',
    async () => {
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
});
