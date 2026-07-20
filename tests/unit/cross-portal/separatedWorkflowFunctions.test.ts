/**
 * @process Processes/Separated_Workflows_And_Functions.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

const domainFiles: Record<string, string> = {
  auth: 'issara-patient/backend/routes/auth.ts',
  appointments: 'issara-doctor/backend/appointmentPoolQuery.cjs',
  meeting: 'issara-jitsi/backend/index.js',
  emr: 'issara-doctor/frontend/components/CompleteEMREditor.tsx',
  phr: 'issara-patient/backend/routes/phr.ts',
  livingWill: 'issara-patient/backend/routes/pdpa.ts',
  notifications: 'issara-patient/backend/routes/notifications.ts',
  queue: 'issara-doctor/frontend/pages/meetings/HealthMeeting.tsx',
};

describe('Separated workflow functions (SWF)', () => {
  it('SWF-01 — auth domain route', () => {
    expect(fs.existsSync(path.join(root, domainFiles.auth))).toBe(true);
  });

  it('SWF-02 — appointment pool query', () => {
    expect(fs.readFileSync(path.join(root, domainFiles.appointments), 'utf8')).toMatch(/pool/i);
  });

  it('SWF-03 — meeting server create endpoint', () => {
    expect(fs.readFileSync(path.join(root, domainFiles.meeting), 'utf8')).toMatch(/persistedToDb|\/api\/meetings/i);
  });

  it('SWF-04 — EMR editor component', () => {
    expect(fs.readFileSync(path.join(root, domainFiles.emr), 'utf8')).toMatch(/EMR|emr/i);
  });

  it('SWF-05 — PHR route', () => {
    expect(fs.readFileSync(path.join(root, domainFiles.phr), 'utf8')).toMatch(/router/);
  });

  it('SWF-06 — living will route', () => {
    expect(fs.existsSync(path.join(root, domainFiles.livingWill))).toBe(true);
  });

  it('SWF-07 — notifications route', () => {
    expect(fs.readFileSync(path.join(root, domainFiles.notifications), 'utf8')).toMatch(/router/);
  });

  it('SWF-08 — queue management UI in health meeting', () => {
    expect(fs.readFileSync(path.join(root, domainFiles.queue), 'utf8')).toMatch(/accepted-queue-list|queue/i);
  });

  it('SWF-09 — patient workflow vitest group', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/patient-portal/dashboardWorkflow.test.ts'))).toBe(true);
  });

  it('SWF-10 — workflow contract test', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/cross-portal/workflowContract.test.ts'))).toBe(true);
  });
});
