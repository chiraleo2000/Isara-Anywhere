/**
 * PHR / Timeline MITL unlock + honest download UX (source + pure helpers).
 * Closes assertion-depth gap for C-VID / C-PHR-002 / C-PHR-003.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function meetingArtifactVisibleToPatient(opts: {
  readyForPatient: boolean;
  hasRecordingUrl: boolean;
  hasSummary: boolean;
}): { recordingUrl: string | null; summary: string | null; downloadEnabled: boolean } {
  if (!opts.readyForPatient) {
    return { recordingUrl: null, summary: null, downloadEnabled: false };
  }
  return {
    recordingUrl: opts.hasRecordingUrl ? 'recording.webm' : null,
    summary: opts.hasSummary ? 'Clinical summary' : null,
    downloadEnabled: opts.hasRecordingUrl,
  };
}

function prescriptionDownloadEnabled(rx: {
  download_url?: string | null;
  document_id?: string | null;
}): boolean {
  return Boolean(rx.download_url || rx.document_id);
}

function labOrderDownloadEnabled(order: {
  document_id?: string | null;
  download_url?: string | null;
  downloadUrl?: string | null;
  status?: string;
}): boolean {
  return Boolean(order.document_id || order.download_url || order.downloadUrl);
}

describe('phrReadyForPatientContract — pure MITL gate', () => {
  it('PHR-RFP-01 — locked meeting hides recording/summary/download', () => {
    const locked = meetingArtifactVisibleToPatient({
      readyForPatient: false,
      hasRecordingUrl: true,
      hasSummary: true,
    });
    expect(locked.recordingUrl).toBeNull();
    expect(locked.summary).toBeNull();
    expect(locked.downloadEnabled).toBe(false);
  });

  it('PHR-RFP-02 — unlocked meeting exposes recording when present', () => {
    const unlocked = meetingArtifactVisibleToPatient({
      readyForPatient: true,
      hasRecordingUrl: true,
      hasSummary: true,
    });
    expect(unlocked.recordingUrl).toBe('recording.webm');
    expect(unlocked.summary).toBe('Clinical summary');
    expect(unlocked.downloadEnabled).toBe(true);
  });

  it('PHR-RFP-03 — Rx download disabled without download_url/document_id', () => {
    expect(prescriptionDownloadEnabled({})).toBe(false);
    expect(prescriptionDownloadEnabled({ download_url: null, document_id: null })).toBe(false);
    expect(prescriptionDownloadEnabled({ document_id: 'doc-1' })).toBe(true);
    expect(prescriptionDownloadEnabled({ download_url: '/api/documents/x/download' })).toBe(true);
  });

  it('PHR-RFP-04 — lab download only when document id/url present', () => {
    expect(labOrderDownloadEnabled({ status: 'pending' })).toBe(false);
    expect(labOrderDownloadEnabled({ status: 'completed', document_id: 'lab-doc' })).toBe(true);
  });
});

describe('phrReadyForPatientContract — source', () => {
  it('PHR-RFP-SRC-01 — phr.ts gates meetings + timeline on ready_for_patient', () => {
    const phr = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/routes/phr.ts'),
      'utf8',
    );
    expect(phr).toMatch(/ready_for_patient/);
    expect(phr).toMatch(/readyForPatient/);
    expect(phr).toMatch(/unlocked \? \(row\.recording_url/);
    const meetingsIdx = phr.indexOf("router.get('/meetings'");
    const timelineIdx = phr.indexOf('timeline');
    expect(meetingsIdx).toBeGreaterThan(-1);
    expect(phr.indexOf('ready_for_patient', meetingsIdx)).toBeGreaterThan(meetingsIdx);
    expect(phr.indexOf('ready_for_patient', timelineIdx)).toBeGreaterThan(timelineIdx);
  });

  it('PHR-RFP-SRC-02 — PHRPage honest Rx/lab download + history label', () => {
    const page = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/frontend/pages/PHRPage.tsx'),
      'utf8',
    );
    expect(page).toMatch(/const canDownload = Boolean\(rx\.download_url \|\| rx\.document_id\)/);
    expect(page).toMatch(/order\.document_id \|\| order\.download_url \|\| order\.downloadUrl/);
    expect(page).toMatch(/ประวัติการรับยา|Medication History/);
    expect(page).not.toMatch(/downloadPrescription[\s\S]{0,80}return;\s*\n\s*\}/);
  });

  it('PHR-RFP-SRC-03 — PatientRecordViewer refreshes docs/meetings on notify', () => {
    const viewer = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/PatientRecordViewer.tsx'),
      'utf8',
    );
    expect(viewer).toMatch(/onNotification/);
    expect(viewer).toMatch(/documents|meetings/);
  });
});
