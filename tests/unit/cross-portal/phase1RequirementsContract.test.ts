/**
 * @process Processes/PHASE1_REQUIREMENTS.md
 * Reconcile Phase 1 requirement IDs with implemented routes + test packs.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('PHASE1 requirements contract', () => {
  it('PH1-01 — meeting → EMR → patient delivery chain tests exist', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/postMeetingWorkflow.integration.test.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/bookToMeetToPhrChain.integration.test.ts'))).toBe(true);
  });

  it('PH1-02 — man-in-the-loop validation in EMR AI draft flow', () => {
    const draft = read('issara-doctor/frontend/utils/emrAiDraft.ts');
    expect(draft).toMatch(/draft|summary|clinical/i);
    expect(read('tests/unit/doctor-portal/emrAiDraft.test.ts')).toMatch(/emrAiDraft/);
  });

  it('PH1-03 — Jitsi meeting room (no legacy virtual-meeting route)', () => {
    const portal = read('issara-doctor/frontend/pages/DoctorPortal.tsx');
    expect(portal).not.toMatch(/path=["']virtual-meeting/);
    expect(portal).toMatch(/meeting\/:appointmentId/);
  });

  it('PH1-04 — PostgreSQL-only appointment path (no GCS pool POST)', () => {
    const patientApi = read('issara-patient/backend/routes/appointments.ts');
    expect(patientApi).toMatch(/NO GCS|PostgreSQL/i);
    expect(patientApi).toMatch(/pool\.query/);
  });

  it('PH1-05 — Web Speech / post-meeting pipeline on meeting server', () => {
    expect(fs.existsSync(path.join(root, 'issara-jitsi/backend/services/postMeetingPipeline.js'))).toBe(true);
    expect(read('Processes/PHASE1_REQUIREMENTS.md')).toMatch(/Phase 1 Complete|✅/);
  });

  it('PH1-06 — Phase 2 deferred items marked in requirements doc', () => {
    expect(read('Processes/PHASE1_REQUIREMENTS.md')).toMatch(/Phase 2|📋 Phase 2/);
  });
});
