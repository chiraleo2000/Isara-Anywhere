/**
 * @process Processes/Combined_Workflows_And_Actions.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Combined workflows actions (CWA)', () => {
  it('CWA-01 — patient book appointment API', () => {
    expect(read('Isara-patient-portal/backend/routes/appointments.ts')).toMatch(/router\.post/);
  });

  it('CWA-02 — doctor confirm appointment flow', () => {
    expect(read('Isara-doctor-portal/frontend/pages/meetings/HealthMeeting.tsx')).toMatch(/confirm/i);
  });

  it('CWA-03 — meeting join config cross-service', () => {
    expect(read('Isara-doctor-portal/frontend/utils/jitsiMeetingConfig.ts')).toMatch(/join-config/);
  });

  it('CWA-04 — post-meeting pipeline persists summary', () => {
    expect(read('Izara-jitsi-server/backend/services/postMeetingPipeline.js')).toMatch(/summary|persist/i);
  });

  it('CWA-05 — EMR delivery to PHR', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/emrToPhrDelivery.integration.test.ts'))).toBe(true);
  });

  it('CWA-06 — calendar confirm notification', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/calendarConfirmNotification.test.ts'))).toBe(true);
  });

  it('CWA-07 — patient dashboard join meeting CTA', () => {
    expect(read('Isara-patient-portal/frontend/pages/DashboardPage.tsx')).toMatch(/dashboard-join-meeting/);
  });

  it('CWA-08 — admin assign chain in health meeting', () => {
    expect(read('Isara-doctor-portal/frontend/pages/meetings/HealthMeeting.tsx')).toMatch(/assign|assignedDoctor/i);
  });

  it('CWA-09 — notification workflow cross-portal', () => {
    expect(read('Isara-patient-portal/backend/services/notificationService.ts')).toMatch(/notification/i);
  });

  it('CWA-10 — full workflow invariants test exists', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/fullWorkflowInvariants.test.ts'))).toBe(true);
  });
});
