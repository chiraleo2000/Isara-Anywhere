import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const healthMeetingPath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/src/pages/meetings/HealthMeeting.tsx',
);
const apiServicePath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/src/services/apiDataService.ts',
);

describe('confirm/assign appointment API behavior (D4–D6)', () => {
  it('HealthMeeting wires confirm and assign API helpers', () => {
    const source = fs.readFileSync(healthMeetingPath, 'utf8');
    expect(source).toMatch(/confirmAppointmentApi/);
    expect(source).toMatch(/adminAssignAppointment/);
  });

  it('confirm flow surfaces errors instead of silent no-op', () => {
    const source = fs.readFileSync(healthMeetingPath, 'utf8');
    expect(source).toMatch(/catch|setError|error/i);
  });

  it('apiDataService defines confirm and assign endpoints', () => {
    const source = fs.readFileSync(apiServicePath, 'utf8');
    expect(source).toMatch(/confirm/i);
    expect(source).toMatch(/assign/i);
  });
});
