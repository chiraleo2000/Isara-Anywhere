/**
 * Shared clinical history + document delivery contracts (July 2026).
 * Covers doctor PatientRecordViewer parity, patient ประวัติการรับยา / Timeline,
 * meeting video download URLs, and near-real-time hooks.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Shared clinical history — doctor APIs', () => {
  const api = read('Isara-doctor-portal/backend/mainApiServer.cjs');

  it('SCH-D01 — EHR returns imagingGroups and patient_documents (not empty stub only)', () => {
    expect(api).toContain('imagingGroups');
    expect(api).toContain('mapDocumentToExternalRecord');
    expect(api).toContain("DocumentDeliveryService.listDocuments");
    expect(api).not.toMatch(/External health records — stub[\s\S]{0,80}const externalRecords = \[\]/);
  });

  it('SCH-D02 — patient meetings endpoint with recording downloadUrl', () => {
    expect(api).toContain("/api/patients/:patientId/meetings");
    expect(api).toContain('hasRecording');
    expect(api).toContain('downloadUrl');
    expect(api).toContain("status IN ('completed', 'ended')");
  });

  it('SCH-D03 — prescriptions patient list includes download_url from patient_documents', () => {
    expect(api).toContain("/api/prescriptions/patient/:patientId");
    expect(api).toContain("source_type = 'prescription'");
    expect(api).toContain('download_url');
  });

  it('SCH-D04 — document_delivered notification helper used on clinical publish', () => {
    expect(api).toContain('notifyDocumentDelivered');
    expect(api).toContain("type: 'document_delivered'");
  });

  it('SCH-D05 — doctor documents list is PDPA-gated', () => {
    expect(api).toMatch(/app\.get\('\/api\/patients\/:patientId\/documents'[\s\S]{0,80}validateDoctorPatientAccess/);
  });
});

describe('Shared clinical history — doctor PatientRecordViewer', () => {
  const viewer = read('Isara-doctor-portal/frontend/components/PatientRecordViewer.tsx');
  const service = read('Isara-doctor-portal/frontend/services/patientRecordService.ts');

  it('SCH-D10 — tabs include ประวัติการจ่ายยา, เอกสาร, การประชุม', () => {
    expect(viewer).toContain('ประวัติการจ่ายยา');
    expect(viewer).toContain("key: 'meetings'");
    expect(viewer).toContain('patient-record-tab-${tab.key}');
    expect(viewer).toContain("key: 'rx'");
    expect(viewer).toContain("key: 'docs'");
    expect(viewer).toContain('การประชุม');
  });

  it('SCH-D11 — RxView uses prescriptions API not only PHR chronic meds', () => {
    expect(viewer).toContain('prescriptions');
    expect(viewer).toContain('getPrescriptions');
    expect(viewer).toContain('patient-record-rx-download');
    expect(service).toContain('/api/prescriptions/patient/');
  });

  it('SCH-D12 — Labs view supports imaging + download; Docs upload/download', () => {
    expect(viewer).toContain('imagingGroups');
    expect(viewer).toContain('patient-record-lab-download');
    expect(viewer).toContain('patient-record-doc-download');
    expect(viewer).toContain('patient-record-doc-upload');
  });

  it('SCH-D13 — Meetings tab video download + realtime sync', () => {
    expect(viewer).toContain('MeetingsView');
    expect(viewer).toContain('patient-record-video-download');
    expect(viewer).toContain('useRealtimeSync');
    expect(viewer).toContain('invalidatePatient');
    expect(service).toContain('/api/patients/');
    expect(service).toContain('/meetings');
  });

  it('SCH-D14 — Dashboard search ประวัติการรักษา opens viewer', () => {
    const dash = read('Isara-doctor-portal/frontend/pages/DoctorDashboard.tsx');
    expect(dash).toContain('dashboard-search-treatment-history');
    expect(dash).toContain('PatientRecordViewer');
    expect(dash).toContain('showPatientRecordViewer');
  });
});

describe('Shared clinical history — patient PHR + Timeline', () => {
  const phr = read('Isara-patient-portal/frontend/pages/PHRPage.tsx');
  const i18n = read('Isara-patient-portal/frontend/contexts/SettingsContext.tsx');
  const timeline = read('Isara-patient-portal/frontend/pages/TimelinePage.tsx');
  const phrRoutes = read('Isara-patient-portal/backend/routes/phr.ts');
  const patientIndex = read('Isara-patient-portal/backend/index.ts');

  it('SCH-P01 — medications label is ประวัติการรับยา / Medication History', () => {
    expect(i18n).toMatch(/phr\.medications[\s\S]{0,80}Medication History/);
    expect(i18n).toMatch(/phr\.medications[\s\S]{0,120}ประวัติการรับยา/);
    expect(phr).toContain('ประวัติการรับยา');
  });

  it('SCH-P02 — medications tab shows prescription history + current meds subsection', () => {
    expect(phr).toContain('PrescriptionsTab');
    expect(phr).toContain('MedicationsTab');
    expect(phr).toContain('ยาที่ใช้ปัจจุบัน');
  });

  it('SCH-P03 — Rx download uses /api/documents/:id/download only (no broken query fallback)', () => {
    expect(phr).toContain('/api/documents/');
    expect(phr).not.toContain('/api/documents?source=prescription');
  });

  it('SCH-P04 — meds persist via POST /medications or medications field', () => {
    expect(phr).toMatch(/\/api\/phr\/.*\/medications|medications:/);
    expect(phr).toContain('useRealtimeSync');
  });

  it('SCH-P05 — timeline includes imaging, meeting, document + download', () => {
    expect(phrRoutes).toContain("type: 'imaging'");
    expect(phrRoutes).toContain("type: 'meeting'");
    expect(phrRoutes).toContain("type: 'document'");
    expect(phrRoutes).toContain('downloadUrl');
    expect(timeline).toContain('timeline-download');
    expect(timeline).toContain('imaging');
    expect(timeline).toContain('meeting');
    expect(timeline).toContain('useRealtimeSync');
  });

  it('SCH-P06 — patient meetings API + recording download proxy', () => {
    expect(phrRoutes).toContain("router.get('/meetings'");
    expect(phrRoutes).toContain('recording-download');
    expect(patientIndex).toContain('/api/meetings/recording-download');
  });

  it('SCH-P07 — lab orders expose download_url from patient_documents', () => {
    expect(phrRoutes).toContain('download_url');
    expect(phrRoutes).toContain("source_type = 'lab_report'");
  });
});

describe('Shared clinical history — recording download disposition', () => {
  it('SCH-R01 — meeting-server supports ?download=1 attachment', () => {
    const idx = read('Izara-jitsi-server/backend/index.js');
    expect(idx).toContain("req.query.download");
    expect(idx).toContain('attachment');
  });

  it('SCH-R02 — doctor BFF recording-stream forwards download=1', () => {
    const meetings = read('Isara-doctor-portal/backend/routes/meetings.cjs');
    expect(meetings).toContain('download=1');
  });
});

describe('Shared clinical history — process docs', () => {
  it('SCH-DOC01 — Clinical_Document_Delivery covers meetings + document_delivered + realtime', () => {
    const doc = read('Processes/Clinical_Document_Delivery_Workflows.md');
    expect(doc).toContain('document_delivered');
    expect(doc).toContain('Meeting video');
    expect(doc).toContain('useRealtimeSync');
    expect(doc).toContain('ประวัติการรับยา');
    expect(doc).toContain('ประวัติการจ่ายยา');
  });

  it('SCH-DOC02 — Patient Record Viewer process doc lists meetings / Rx history', () => {
    const doc = read('Processes/Pages/Doctor-Portal/11_Patient_Record_Viewer.md');
    expect(doc).toMatch(/patient-record-tab-meetings|meetings/);
    expect(doc).toContain('ประวัติการจ่ายยา');
    expect(doc).toContain('useRealtimeSync');
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
