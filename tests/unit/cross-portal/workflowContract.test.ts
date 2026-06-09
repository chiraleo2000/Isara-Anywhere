/**
 * Machine-readable checklist from Processes/FULL_WORKFLOW_CONTRACT.md
 */
import { describe, it, expect } from 'vitest';

const FULL_WORKFLOW_CONTRACT = [
  { id: 'auth-login', domain: 'Auth', playwright: 'A-auth', vitest: 'authServer' },
  { id: 'appointments-lifecycle', domain: 'Appointments', playwright: 'D-appointments', vitest: 'appointmentWorkflow' },
  { id: 'meeting-host-lobby', domain: 'Meeting', playwright: 'Q-meeting-lifecycle', vitest: 'lobbyFlow' },
  { id: 'meeting-recording-ai', domain: 'Meeting', playwright: 'Q-meeting-lifecycle', vitest: 'aiSummary' },
  { id: 'meeting-jitsi-mount', domain: 'Meeting', playwright: 'Q-meeting-lifecycle', vitest: 'meetingWorkflowHardening' },
  { id: 'meeting-layout-first', domain: 'Meeting', playwright: 'Q-meeting-lifecycle', vitest: 'virtualMeetingLayoutFirst' },
  { id: 'defect-pdf-queue', domain: 'Appointments', playwright: 'D-appointments', vitest: 'defectIsaraPdfMeetingQueue' },
  { id: 'defect-pdf-jitsi-name', domain: 'Meeting', playwright: 'Q-meeting-lifecycle', vitest: 'jitsiDisplayName' },
  { id: 'process-page-coverage', domain: 'All', playwright: 'M-hardening', vitest: 'processPageCoverage' },
  { id: 'clinical-emr', domain: 'Clinical', playwright: 'E-meeting-clinical', vitest: 'emrAutosave' },
  { id: 'clinical-prescribe', domain: 'Clinical', playwright: 'E-meeting-clinical', vitest: 'prescribingAllergy' },
  { id: 'phr-lab', domain: 'PHR', playwright: 'F-phr-health-records', vitest: 'phrRoute' },
  { id: 'pdpa-audit', domain: 'Compliance', playwright: 'G-livingwill-pdpa', vitest: 'pdpaAudit' },
  { id: 'offline-sync', domain: 'Sync', playwright: 'M-hardening', vitest: 'offlineEmrSync' },
] as const;

describe('FULL_WORKFLOW_CONTRACT coverage map', () => {
  it('defines P0 domains with Playwright + Vitest hooks', () => {
    const domains = new Set(FULL_WORKFLOW_CONTRACT.map((r) => r.domain));
    expect(domains.has('Meeting')).toBe(true);
    expect(domains.has('Appointments')).toBe(true);
    FULL_WORKFLOW_CONTRACT.forEach((row) => {
      expect(row.playwright.length).toBeGreaterThan(0);
      expect(row.vitest.length).toBeGreaterThan(0);
    });
  });

  it('includes Group Q for meeting P0', () => {
    const q = FULL_WORKFLOW_CONTRACT.filter((r) => r.playwright === 'Q-meeting-lifecycle');
    expect(q.length).toBeGreaterThanOrEqual(2);
  });
});
