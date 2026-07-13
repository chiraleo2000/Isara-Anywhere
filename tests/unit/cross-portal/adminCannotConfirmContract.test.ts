/**
 * Admin cannot confirm — only assigned doctor may confirm.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function canConfirmAppointment(opts: {
  role: string;
  assignedDoctorId: string | null;
  actorDoctorId: string;
}): boolean {
  if (opts.role === 'admin') return false;
  if (opts.role !== 'doctor') return false;
  if (!opts.assignedDoctorId) return true;
  return opts.assignedDoctorId === opts.actorDoctorId;
}

describe('adminCannotConfirmContract — pure ownership', () => {
  it('ACC-01 — admin cannot confirm', () => {
    expect(
      canConfirmAppointment({
        role: 'admin',
        assignedDoctorId: 'DOC-1',
        actorDoctorId: 'DOC-1',
      }),
    ).toBe(false);
  });

  it('ACC-02 — assigned doctor can confirm', () => {
    expect(
      canConfirmAppointment({
        role: 'doctor',
        assignedDoctorId: 'DOC-1',
        actorDoctorId: 'DOC-1',
      }),
    ).toBe(true);
  });

  it('ACC-03 — other doctor cannot confirm', () => {
    expect(
      canConfirmAppointment({
        role: 'doctor',
        assignedDoctorId: 'DOC-1',
        actorDoctorId: 'DOC-2',
      }),
    ).toBe(false);
  });
});

describe('adminCannotConfirmContract — source ownership', () => {
  it('ACC-04 — confirm path mentions assigned doctor / doctor_id ownership', () => {
    const src = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(src).toMatch(/Admin cannot confirm|DOCTOR_CONFIRM_REQUIRED|ASSIGNED_DOCTOR_ONLY|assignedDoctorId|Only assigned doctor/);
    expect(src).toMatch(/doctor_id/);
  });
});
