/**
 * @process Processes/GATE0_IMPLEMENTATION_STATUS.md
 * Maps G1–G10 acceptance gates to verify scripts + Playwright groups.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('GATE0 implementation contract (G1–G10)', () => {
  it('G0-01 — verify:gate0:local script exists for G1–G5 API chain', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['verify:gate0:local']).toMatch(/verify-cloud-appointment-sync/);
    expect(fs.existsSync(path.join(root, 'scripts/verify-cloud-appointment-sync.mjs'))).toBe(true);
  });

  it('G0-02 — pool + queue mapper in doctor backend', () => {
    const api = read('Isara-doctor-portal/backend/mainApiServer.cjs');
    expect(api).toMatch(/in_pool|awaiting_doctor_response/);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/backend/appointmentQueueMapper.cjs'))).toBe(true);
  });

  it('G0-03 — realtime sync hooks for G6–G8', () => {
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/frontend/services/useRealtimeSync.ts'))).toBe(true);
    const meeting = read('Isara-doctor-portal/frontend/pages/meetings/HealthMeeting.tsx');
    expect(meeting).toMatch(/useRealtimeSync|socket|meeting/i);
  });

  it('G0-04 — Playwright Group D + D-host for appointment workflow', () => {
    const specs = fs.readdirSync(path.join(root, 'tests')).filter((f) => f.startsWith('group-D'));
    expect(specs.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(root, 'tests/group-D-doctor-host-workflow.ui-test.ts'))).toBe(true);
  });

  it('G0-05 — Group Q meeting lifecycle for G9–G10', () => {
    expect(fs.existsSync(path.join(root, 'tests/group-Q-meeting-lifecycle.ui-test.ts'))).toBe(true);
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['test:local:pre-deploy-gate']).toBeTruthy();
  });

  it('G0-06 — meeting room test IDs documented in GATE0 doc', () => {
    const gate0 = read('Processes/GATE0_IMPLEMENTATION_STATUS.md');
    expect(gate0).toMatch(/patient-meeting-room/);
    expect(gate0).toMatch(/doctor-meeting-room/);
    expect(gate0).toMatch(/jitsi-meeting-container/);
  });
});
