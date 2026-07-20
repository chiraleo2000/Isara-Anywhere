/**
 * @process Processes/Combined_Workflows_And_Actions.md
 * @process Processes/POST_MEETING_WORKFLOW.md
 * @process Processes/Health_Records_Processes.md
 * Full chain: book → pool → meeting → results → EMR → PHR (file contract).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Book → meet → PHR combined chain (BMP)', () => {
  it('BMP-01 — patient books appointment', () => {
    expect(read('issara-patient/backend/routes/appointments.ts')).toMatch(/router\.(post|put)/);
    expect(read('issara-patient/frontend/pages/AppointmentPages.tsx')).toMatch(/book|wizard/i);
  });

  it('BMP-02 — pool enrollment and doctor confirm (Health Meeting queue)', () => {
    expect(read('issara-doctor/frontend/pages/meetings/HealthMeeting.tsx')).toMatch(/queue|in_pool|tab=queue/i);
    expect(read('issara-doctor/frontend/pages/DoctorPortal.tsx')).toMatch(
      /appointment-pool[\s\S]*health-meeting\?tab=queue/,
    );
    expect(read('tests/unit/cross-portal/appointmentWorkflowContract.test.ts')).toMatch(/confirmed|in_pool/);
  });

  it('BMP-03 — meeting create and join-config', () => {
    expect(read('issara-jitsi/backend/index.js')).toMatch(/join-config|host-ready/);
    expect(read('issara-doctor/frontend/pages/meetings/MeetingRoom.tsx')).toMatch(/jitsi-meeting-container/);
  });

  it('BMP-04 — post-meeting pipeline and results', () => {
    expect(read('issara-jitsi/backend/services/postMeetingPipeline.js')).toMatch(/summary|transcript/i);
    expect(read('issara-doctor/frontend/pages/meetings/MeetingResults.tsx')).toMatch(/results|transcript/i);
  });

  it('BMP-05 — EMR apply and PHR delivery', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/emrToPhrDelivery.integration.test.ts'))).toBe(true);
    expect(read('issara-patient/frontend/components/health/TreatmentResults.tsx')).toMatch(/treatment|results/i);
  });

  it('BMP-06 — no virtual-meeting route registered', () => {
    const portal = read('issara-doctor/frontend/pages/DoctorPortal.tsx');
    expect(portal).not.toMatch(/path=["']virtual-meeting/);
    expect(portal).toMatch(/meeting\/:appointmentId/);
  });

  it('BMP-07 — meeting+PHR share redo packs registered', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/meetingPhrShareRedoContract.test.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/meetingPhrShareRuntime.integration.test.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/phrReadyForPatientContract.test.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'tests/MEETING_PHR_SHARE_GAP_LEDGER.md'))).toBe(true);
  });

  it('BMP-08 — MITL unlock + EMR sign publish wired end-to-end in sources', () => {
    expect(read('issara-jitsi/backend/index.js')).toMatch(/ready_for_patient|fromValidate:\s*true/);
    expect(read('issara-doctor/backend/mainApiServer.cjs')).toMatch(/publishEmrReportDocument/);
    expect(read('issara-patient/backend/routes/phr.ts')).toMatch(/readyForPatient/);
  });
});
