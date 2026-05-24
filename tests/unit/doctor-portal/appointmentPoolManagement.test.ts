/**
 * @process Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md
 */
import { describe, it, expect } from 'vitest';

type PoolStatus = 'in_pool' | 'awaiting_doctor_response' | 'confirmed' | 'cancelled';

function canAssignFromPool(status: PoolStatus): boolean {
  return status === 'in_pool';
}

function transitionOnAdminAssign(current: PoolStatus): PoolStatus {
  if (current !== 'in_pool') return current;
  return 'awaiting_doctor_response';
}

function transitionOnDoctorConfirm(current: PoolStatus): PoolStatus {
  if (current !== 'awaiting_doctor_response') return current;
  return 'confirmed';
}

describe('appointmentPoolManagement — pool lifecycle', () => {
  it('AP01 — only in_pool appointments assignable', () => {
    expect(canAssignFromPool('in_pool')).toBe(true);
    expect(canAssignFromPool('confirmed')).toBe(false);
  });

  it('AP02 — admin assign moves to awaiting_doctor_response', () => {
    expect(transitionOnAdminAssign('in_pool')).toBe('awaiting_doctor_response');
    expect(transitionOnAdminAssign('confirmed')).toBe('confirmed');
  });

  it('AP03 — doctor confirm moves to confirmed', () => {
    expect(transitionOnDoctorConfirm('awaiting_doctor_response')).toBe('confirmed');
  });
});
