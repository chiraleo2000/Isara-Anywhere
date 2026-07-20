/**
 * @process Processes/Pages/Doctor-Portal/06_Health_Meeting_Page.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { splitQueueSections, ACCEPTED_VISIBILITY_DAYS } from '../../../../issara-doctor/frontend/utils/appointmentPoolQuery';

describe('appointmentPoolQuery — frontend module (no backend import)', () => {
  it('APQ-FE-01 — exports splitQueueSections from frontend utils only', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../../issara-doctor/frontend/utils/appointmentPoolQuery.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/backend\/appointmentPoolQuery/);
    expect(src).toMatch(/export function splitQueueSections/);
  });

  it('APQ-FE-02 — ACCEPTED_VISIBILITY_DAYS is 7', () => {
    expect(ACCEPTED_VISIBILITY_DAYS).toBe(7);
  });

  it('APQ-FE-03 — splitQueueSections separates pending and confirmed for doctor', () => {
    const { pending, accepted } = splitQueueSections(
      [
        { id: 'A1', status: 'pending' },
        { id: 'A2', status: 'confirmed', doctorId: 'DOC-1', confirmedAt: new Date().toISOString() },
      ],
      { doctorId: 'DOC-1' },
    );
    expect(pending.map((a) => a.id)).toEqual(['A1']);
    expect(accepted.map((a) => a.id)).toEqual(['A2']);
  });
});
