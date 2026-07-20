/**
 * Shared clinical history + document delivery contracts (July 2026).
 * Asserts current product wiring — doctor EHR/Rx/meetings, patient PHR/timeline, docs.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const anywhereRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = path.resolve(__dirname, '../../..');

function readPortal(rel: string): string {
  return fs.readFileSync(path.join(anywhereRoot, rel), 'utf8');
}

function readWorkspace(rel: string): string {
  return fs.readFileSync(path.join(workspaceRoot, rel), 'utf8');
}

describe('Shared clinical history — doctor APIs', () => {
  const api = readPortal('issara-doctor/backend/mainApiServer.cjs');

  it('SCH-D01 — EHR returns imagingGroups and delivered documents (listDocuments)', () => {
    expect(api).toContain('imagingGroups');
    expect(api).toContain('mapDocumentToExternalRecord');
    expect(api).toMatch(/listDocuments\(/);
    expect(api).not.toMatch(/External health records — stub[\s\S]{0,80}const externalRecords = \[\]/);
  });

  it('SCH-D02 — patient meetings endpoint for PatientRecordViewer', () => {
    expect(api).toContain("/api/patients/:patientId/meetings");
    expect(api).toContain('validateDoctorPatientAccess');
    expect(api).toContain('meeting_records');
  });

  it('SCH-D03 — prescriptions patient list endpoint', () => {
    expect(api).toContain("/api/prescriptions/patient/:patientId");
    expect(api).toContain('FROM prescriptions');
  });

  it('SCH-D04 — document_delivered notification helper used on clinical publish', () => {
    expect(api).toContain('notifyDocumentDelivered');
    expect(api).toContain('DOCUMENT_DELIVERED_TYPE');
    expect(api).toContain("document_delivered");
  });

  it('SCH-D05 — patient EHR is PDPA-gated', () => {
    expect(api).toMatch(/app\.get\('\/api\/patients\/:patientId\/ehr'[\s\S]{0,80}validateDoctorPatientAccess/);
  });
});

describe('Shared clinical history — doctor PatientRecordViewer', () => {
  const viewer = readPortal('issara-doctor/frontend/components/PatientRecordViewer.tsx');
  const service = readPortal('issara-doctor/frontend/services/patientRecordService.ts');

  it('SCH-D10 — tabs include Rx, Docs, Meetings', () => {
    expect(viewer).toContain("key: 'meetings'");
    expect(viewer).toContain('patient-record-tab-${tab.key}');
    expect(viewer).toContain("key: 'rx'");
    expect(viewer).toContain("key: 'docs'");
    // Tab label is Thai per process doc (11_Patient_Record_Viewer.md): การประชุม
    expect(viewer).toContain("label: 'การประชุม'");
  });

  it('SCH-D11 — RxView uses prescriptions API', () => {
    expect(viewer).toContain('RxView');
    expect(viewer).toContain('getPrescriptions');
    expect(viewer).toContain('prescriptions');
    // Path lives in patientRecordService (RxView calls getPrescriptions)
    expect(service).toContain('/api/prescriptions/patient/');
  });

  it('SCH-D12 — Labs and Docs views render EHR data', () => {
    expect(viewer).toContain('LabsView');
    expect(viewer).toContain('DocsView');
    expect(viewer).toContain('ehrData');
    expect(service).toContain('imagingGroups');
  });

  it('SCH-D13 — Meetings tab panel present', () => {
    expect(viewer).toContain('patient-record-meetings-panel');
    expect(viewer).toContain("key: 'meetings'");
    expect(service).toContain('/api/patients/');
  });

  it('SCH-D14 — DoctorPortal hosts PatientRecordViewer', () => {
    const portal = readPortal('issara-doctor/frontend/pages/DoctorPortal.tsx');
    expect(portal).toContain('PatientRecordViewer');
    expect(portal).toContain('showPatientRecord');
  });
});

describe('Shared clinical history — patient PHR + Timeline', () => {
  const phr = readPortal('issara-patient/frontend/pages/PHRPage.tsx');
  const i18n = readPortal('issara-patient/frontend/contexts/SettingsContext.tsx');
  const timeline = readPortal('issara-patient/frontend/pages/TimelinePage.tsx');
  const phrRoutes = readPortal('issara-patient/backend/routes/phr.ts');
  const patientIndex = readPortal('issara-patient/backend/index.ts');

  it('SCH-P01 — medications i18n + MedicationsTab', () => {
    expect(i18n).toMatch(/phr\.medications/);
    expect(i18n).toMatch(/Medications|ยาที่ใช้ประจำ/);
    expect(phr).toContain('MedicationsTab');
  });

  it('SCH-P02 — medications tab loads prescription history', () => {
    expect(phr).toContain('MedicationsTab');
    expect(phr).toMatch(/prescriptions|ใบสั่งยา/);
    expect(phr).toMatch(/\/api\/internal\/prescriptions\/patient\//);
  });

  it('SCH-P03 — Rx download does not use broken query fallback', () => {
    expect(phr).toMatch(/canDownload|download_url|\/api\/phr\/download-file/);
    expect(phr).not.toContain('/api/documents?source=prescription');
  });

  it('SCH-P04 — meds persist via medications field / API', () => {
    expect(phr).toMatch(/\/api\/phr\/|medications|currentMedications/);
  });

  it('SCH-P05 — timeline includes appointment/diagnosis/medication/lab types', () => {
    expect(phrRoutes).toContain("type: 'appointment'");
    expect(phrRoutes).toContain("type: 'diagnosis'");
    expect(phrRoutes).toContain("type: 'medication'");
    expect(phrRoutes).toContain("type: 'lab'");
    expect(timeline).toMatch(/getTimeline|TimelineEvent|loadTimeline/);
  });

  it('SCH-P06 — patient meetings API + recording download proxy', () => {
    expect(phrRoutes).toContain("router.get('/meetings'");
    expect(phrRoutes).toContain('readyForPatient');
    expect(patientIndex).toMatch(/\/api\/meetings\/:id\/recording-download|recording-download/);
  });

  it('SCH-P07 — lab download gating present on PHR page', () => {
    expect(phr).toMatch(/canDownloadLabOrder|download_url|document_id/);
  });
});

describe('Shared clinical history — recording download disposition', () => {
  it('SCH-R01 — meeting-server serves recordings with Content-Disposition', () => {
    const idx = readPortal('issara-jitsi/backend/index.js');
    expect(idx).toContain('Content-Disposition');
  });

  it('SCH-R02 — doctor BFF meeting proxy routes are registered', () => {
    const meetings = readPortal('issara-doctor/backend/routes/meetings.cjs');
    expect(meetings).toMatch(/registerMeetingProxyRoutes|proxyMeetingServer/);
  });
});

describe('Shared clinical history — process docs', () => {
  it('SCH-DOC01 — Clinical_Document_Delivery covers meetings + document_delivered', () => {
    const doc = readWorkspace('Processes/Clinical_Document_Delivery_Workflows.md');
    expect(doc).toContain('document_delivered');
    expect(doc).toMatch(/Meeting video|meeting video/i);
    expect(doc).toContain('useRealtimeSync');
  });

  it('SCH-DOC02 — Patient Record Viewer process doc lists meetings / Rx', () => {
    const doc = readWorkspace('Processes/Pages/Doctor-Portal/11_Patient_Record_Viewer.md');
    expect(doc).toMatch(/patient-record-tab-meetings|meetings/);
    expect(doc).toMatch(/ประวัติการจ่ายยา|Rx/);
  });
});

/** Pure helpers mirroring download URL construction */
describe('Shared clinical history — download URL helpers', () => {
  function recordingDownloadUrl(recordingUrl: string | null): string | null {
    if (!recordingUrl) return null;
    return recordingUrl.includes('?')
      ? `${recordingUrl}&download=1`
      : `${recordingUrl}?download=1`;
  }

  function patientRecordingProxy(recordingUrl: string | null): string | null {
    if (!recordingUrl) return null;
    return `/api/meetings/recording-download?path=${encodeURIComponent(recordingUrl)}`;
  }

  function prescriptionDownloadUrl(documentId: string | null | undefined): string | null {
    return documentId ? `/api/documents/${documentId}/download` : null;
  }

  it('SCH-H01 — appends download=1 without duplicating query incorrectly', () => {
    expect(recordingDownloadUrl('/api/recordings/meetings/d1/m1/video.webm'))
      .toBe('/api/recordings/meetings/d1/m1/video.webm?download=1');
    expect(recordingDownloadUrl('/api/recordings/x?token=1'))
      .toBe('/api/recordings/x?token=1&download=1');
    expect(recordingDownloadUrl(null)).toBeNull();
  });

  it('SCH-H02 — patient proxy encodes path', () => {
    expect(patientRecordingProxy('/api/recordings/meetings/d/m/v.webm'))
      .toBe('/api/meetings/recording-download?path=%2Fapi%2Frecordings%2Fmeetings%2Fd%2Fm%2Fv.webm');
  });

  it('SCH-H03 — prescription download only when document linked', () => {
    expect(prescriptionDownloadUrl('doc-abc')).toBe('/api/documents/doc-abc/download');
    expect(prescriptionDownloadUrl(null)).toBeNull();
    expect(prescriptionDownloadUrl(undefined)).toBeNull();
  });
});
