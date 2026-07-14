/**
 * Source contracts for Meeting + PHR share redo fixes.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('meetingPhrShareRedoContract', () => {
  it('M-GET — GET /api/meetings/:id calls ensureMeetingRecordForAppointment', () => {
    const src = fs.readFileSync(
      path.join(root, 'Izara-jitsi-server/backend/index.js'),
      'utf8',
    );
    const getIdx = src.indexOf("app.get('/api/meetings/:id'");
    const ensureIdx = src.indexOf('ensureMeetingRecordForAppointment(id)', getIdx);
    const nextRoute = src.indexOf("app.get('/api/meetings/:id/health'", getIdx + 1);
    expect(getIdx).toBeGreaterThan(-1);
    expect(ensureIdx).toBeGreaterThan(getIdx);
    expect(ensureIdx).toBeLessThan(nextRoute);
  });

  it('M-GUEST — mountGuestJitsiMeeting wires skip-prejoin', () => {
    const src = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/frontend/utils/jitsiMeetingConfig.ts'),
      'utf8',
    );
    const mountIdx = src.indexOf('export async function mountGuestJitsiMeeting');
    const wireIdx = src.indexOf('wireJitsiSkipPrejoin(api)', mountIdx);
    expect(mountIdx).toBeGreaterThan(-1);
    expect(wireIdx).toBeGreaterThan(mountIdx);
  });

  it('M-URL — guest-invite requires PATIENT_PORTAL_URL and guestLink token URL', () => {
    const src = fs.readFileSync(
      path.join(root, 'Izara-jitsi-server/backend/index.js'),
      'utf8',
    );
    expect(src).toMatch(/PATIENT_PORTAL_URL_MISSING/);
    expect(src).toMatch(/guestLink/);
    expect(src).not.toMatch(
      /inviteLink:\s*urls\.guestJoinUrl/,
    );
  });

  it('C-EMR — /api/emr sign routes publish + notify', () => {
    const src = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    const signIdx = src.indexOf("app.post('/api/emr/:emrId/sign'");
    const publishIdx = src.indexOf('publishEmrReportDocument(pool', signIdx);
    const notifyIdx = src.indexOf('notifyDocumentDelivered({', publishIdx);
    const altSign = src.indexOf("app.post('/api/emr/sign'");
    expect(publishIdx).toBeGreaterThan(signIdx);
    expect(notifyIdx).toBeGreaterThan(publishIdx);
    expect(src.indexOf('publishEmrReportDocument(pool', altSign)).toBeGreaterThan(altSign);
  });

  it('C-VAL — meeting validate publishes emr_report', () => {
    const src = fs.readFileSync(
      path.join(root, 'Izara-jitsi-server/backend/index.js'),
      'utf8',
    );
    expect(src).toMatch(/VALUES \(\$1, 'emr_report'/);
    expect(src).toMatch(/fromValidate:\s*true/);
  });

  it('C-VID — phr meetings/timeline gate on ready_for_patient', () => {
    const src = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/routes/phr.ts'),
      'utf8',
    );
    expect(src).toMatch(/ready_for_patient/);
    expect(src).toMatch(/readyForPatient/);
    expect(src).toMatch(/unlocked \? \(row\.recording_url/);
  });

  it('C-ACL — document download scopes by role/PDPA', () => {
    const src = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    const dlIdx = src.indexOf("app.get('/api/documents/:docId/download'");
    const aclIdx = src.indexOf('resolveMedicalRecordConsent', dlIdx);
    const nextRoute = src.indexOf('// DOCTOR → PATIENT MESSAGES', dlIdx);
    expect(aclIdx).toBeGreaterThan(dlIdx);
    expect(aclIdx).toBeLessThan(nextRoute);
  });

  it('C-LAB — lab notify passes documentId', () => {
    const src = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(src).toMatch(/publishedLabDocumentId/);
    expect(src).toMatch(/documentId:\s*publishedLabDocumentId/);
  });

  it('C-IMG — imaging notify passes publishedImagingDocumentId', () => {
    const src = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(src).toMatch(/publishedImagingDocumentId/);
    expect(src).toMatch(/documentId:\s*publishedImagingDocumentId/);
  });
});
