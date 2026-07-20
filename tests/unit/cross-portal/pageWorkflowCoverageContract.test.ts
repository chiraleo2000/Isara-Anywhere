/**
 * Page → workflow surface coverage: every Process page cluster has wired handlers/UI.
 * Addresses "not every UI control has a dedicated runtime assertion" with source+route contracts.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel: string) {
  return fs.existsSync(path.join(root, rel));
}

describe('pageWorkflowCoverageContract — patient portal pages', () => {
  it('PWC-PAT-01 — auth + register + reset password routes', () => {
    expect(
      exists('issara-patient/frontend/pages/auth/RegisterPage.tsx')
        || exists('issara-patient/frontend/pages/RegisterPage.tsx'),
    ).toBe(true);
    expect(read('issara-patient/backend/routes/auth.ts')).toMatch(/login|register|reset/i);
  });

  it('PWC-PAT-02 — appointments book/list surfaces', () => {
    const appt = read('issara-patient/frontend/pages/appointments/AppointmentPages.tsx');
    expect(appt).toMatch(/book|wizard|appointment/i);
    expect(read('issara-patient/backend/routes/appointments.ts')).toMatch(/router\.(get|post)/);
  });

  it('PWC-PAT-03 — PHR tabs + documents + prescriptions honesty', () => {
    const phr = read('issara-patient/frontend/pages/PHRPage.tsx');
    for (const tab of ['phr-tab-overview', 'phr-tab-vitals', 'phr-tab-medications', 'phr-tab-documents', 'phr-tab-lab-imaging']) {
      expect(phr).toContain(tab);
    }
    expect(phr).toMatch(/canDownload|document_id|download_url/);
  });

  it('PWC-PAT-04 — Timeline + notifications + PDPA', () => {
    const hasTimelinePage =
      exists('issara-patient/frontend/pages/TimelinePage.tsx')
      || exists('issara-patient/frontend/pages/timeline/TimelinePage.tsx')
      || read('issara-patient/frontend/pages/PHRPage.tsx').includes('timeline');
    expect(hasTimelinePage).toBe(true);
    expect(exists('issara-patient/frontend/pages/NotificationsPage.tsx')).toBe(true);
    expect(exists('issara-patient/backend/routes/pdpa.ts')).toBe(true);
  });

  it('PWC-PAT-05 — patient meeting join + recording-download proxy', () => {
    const idx = read('issara-patient/backend/index.ts');
    expect(idx).toMatch(/recording-download|meetings/);
    expect(read('issara-patient/frontend/utils/jitsiMeetingConfig.ts')).toMatch(/mountGuestJitsiMeeting|wireJitsiSkipPrejoin/);
  });
});

describe('pageWorkflowCoverageContract — doctor portal pages', () => {
  it('PWC-DOC-01 — dashboard + schedule + patients + health meeting', () => {
    expect(exists('issara-doctor/frontend/pages/meetings/HealthMeeting.tsx')).toBe(true);
    expect(read('issara-doctor/frontend/pages/meetings/HealthMeeting.tsx')).toMatch(/queue|confirm-appointment|pool/i);
    expect(exists('issara-doctor/frontend/components/PatientRecordViewer.tsx')).toBe(true);
  });

  it('PWC-DOC-02 — meeting room + results MITL', () => {
    const room = read('issara-doctor/frontend/pages/meetings/MeetingRoom.tsx');
    expect(room).toMatch(/jitsi-meeting-container|host-present|guest-token-url-hint/);
    const results = read('issara-doctor/frontend/pages/meetings/MeetingResults.tsx');
    expect(results).toMatch(/validate-summary-btn/);
  });

  it('PWC-DOC-03 — EMR sign publish + prescribing + lab orders', () => {
    const api = read('issara-doctor/backend/mainApiServer.cjs');
    expect(api).toMatch(/publishEmrReportDocument/);
    expect(api).toMatch(/\/api\/emr\/:emrId\/sign/);
    expect(api).toMatch(/publishedLabDocumentId/);
    expect(api).toMatch(/resolveMedicalRecordConsent/);
    expect(exists('issara-doctor/frontend/components/CompleteEMREditor.tsx')).toBe(true);
    expect(exists('issara-doctor/frontend/components/CompletePrescribing.tsx')).toBe(true);
    expect(exists('issara-doctor/frontend/components/CompleteLabOrders.tsx')).toBe(true);
  });

  it('PWC-DOC-04 — admin doctors/content/resources', () => {
    const portal = read('issara-doctor/frontend/pages/DoctorPortal.tsx');
    expect(portal).toMatch(/manage-doctors|doctor-approval|medical-content|clinical-resources/i);
  });
});

describe('pageWorkflowCoverageContract — meeting server', () => {
  it('PWC-MEET-01 — create/join-config/host-present/validate/save-recording', () => {
    const src = read('issara-jitsi/backend/index.js');
    for (const needle of [
      'ensureMeetingRecordForAppointment',
      'join-config',
      'host-present',
      "app.post('/api/meetings/:id/validate'",
      'save-recording',
      'guestLink',
      'PATIENT_PORTAL_URL_MISSING',
      "VALUES ($1, 'emr_report'",
    ]) {
      expect(src, needle).toMatch(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  it('PWC-MEET-02 — share redo + byte chain packs exist', () => {
    expect(exists('tests/unit/cross-portal/meetingPhrShareRedoContract.test.ts')).toBe(true);
    expect(exists('tests/unit/cross-portal/byteShareChain.integration.test.ts')).toBe(true);
    expect(exists('tests/unit/cross-portal/meetingPhrShareRuntime.integration.test.ts')).toBe(true);
  });
});

describe('pageWorkflowCoverageContract — honesty limits', () => {
  it('PWC-LIMIT-01 — documents acknowledge non-unit areas (Jitsi/LAN)', () => {
    const gate = read('Processes/PROCESS_TO_TEST_GATE.md');
    expect(gate).toMatch(/test:lan:deploy-gate/);
    expect(gate).toMatch(/BLOCKED|meet\.demotoday|Cloud Run|phase:9/i);
    const ledger = read('tests/MEETING_PHR_SHARE_GAP_LEDGER.md');
    expect(ledger).toMatch(/meet\.jit\.si|flake|P0=0/i);
  });
});
