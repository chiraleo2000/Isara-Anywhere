/**
 * @process Processes/Notification_Workflows.md, Processes/Pages/Patient-Portal/15_Notification_System.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Notification workflow contract (NTF)', () => {
  it('NTF-01 — notification service module', () => {
    expect(fs.existsSync(path.join(root, 'Isara-patient-portal/server/services/notificationService.ts'))).toBe(true);
  });

  it('NTF-02 — mark all read behavior test', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/patient-portal/notificationMarkAllRead.behavior.test.ts'))).toBe(true);
  });

  it('NTF-03 — notifications API route', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-patient-portal/server/routes/notifications.ts'), 'utf8');
    expect(src).toMatch(/router\.(get|post|put|patch)/);
  });

  it('NTF-04 — doctor notification bell component', () => {
    const bell = path.join(root, 'Isara-doctor-portal/src/components/notifications/DoctorNotificationBell.tsx');
    expect(fs.existsSync(bell)).toBe(true);
  });

  it('NTF-05 — queue socket toast on NOTIFY', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/socket|toast|notification/i);
  });

  it('NTF-06 — notification workflow vitest', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/patient-portal/notificationWorkflow.test.ts'))).toBe(true);
  });
});
