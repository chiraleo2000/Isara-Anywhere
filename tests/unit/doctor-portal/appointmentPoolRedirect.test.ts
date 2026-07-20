/**
 * Appointment pool → Health Meeting queue consolidation contract.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Appointment pool redirect → Health Meeting queue', () => {
  it('APR-01 — DoctorPortal redirects /appointment-pool to health-meeting?tab=queue', () => {
    const src = fs.readFileSync(
      path.join(root, 'issara-doctor/frontend/pages/DoctorPortal.tsx'),
      'utf8',
    );
    expect(src).toMatch(/path="appointment-pool"[\s\S]*Navigate[\s\S]*health-meeting\?tab=queue/);
  });

  it('APR-02 — DoctorPortal redirects admin/pool to health-meeting?tab=queue', () => {
    const src = fs.readFileSync(
      path.join(root, 'issara-doctor/frontend/pages/DoctorPortal.tsx'),
      'utf8',
    );
    expect(src).toMatch(/path="admin\/pool"[\s\S]*Navigate[\s\S]*health-meeting\?tab=queue/);
  });

  it('APR-03 — sidebar path /appointment-pool maps to health-meeting nav id', () => {
    const src = fs.readFileSync(
      path.join(root, 'issara-doctor/frontend/pages/DoctorPortal.tsx'),
      'utf8',
    );
    expect(src).toContain("if (path.includes('/appointment-pool')) return 'health-meeting';");
  });

  it('APR-04 — HealthMeeting honors ?tab=queue deep link', () => {
    const src = fs.readFileSync(
      path.join(root, 'issara-doctor/frontend/pages/meetings/HealthMeeting.tsx'),
      'utf8',
    );
    expect(src).toMatch(/tab=queue|searchParams[\s\S]*queue|activeTab[\s\S]*queue/);
  });
});
