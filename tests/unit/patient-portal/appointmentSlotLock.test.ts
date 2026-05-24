/**
 * Appointment slot locking — Processes/Pages/Patient-Portal/05_Appointments_Page.md
 */
import { describe, it, expect } from 'vitest';

type Slot = { doctorId: string; date: string; time: string; lockedBy?: string };

const slots = new Map<string, Slot>();

function slotKey(doctorId: string, date: string, time: string) {
  return `${doctorId}|${date}|${time}`;
}

function tryLockSlot(doctorId: string, date: string, time: string, patientId: string): { ok: boolean; code?: number } {
  const key = slotKey(doctorId, date, time);
  const existing = slots.get(key);
  if (existing?.lockedBy && existing.lockedBy !== patientId) {
    return { ok: false, code: 409 };
  }
  slots.set(key, { doctorId, date, time, lockedBy: patientId });
  return { ok: true };
}

describe('Appointment slot lock', () => {
  it('second patient gets 409 on same slot', () => {
    slots.clear();
    expect(tryLockSlot('DOC-1', '2026-06-01', '10:00', 'PAT-A').ok).toBe(true);
    const second = tryLockSlot('DOC-1', '2026-06-01', '10:00', 'PAT-B');
    expect(second.ok).toBe(false);
    expect(second.code).toBe(409);
  });

  it('same patient can re-lock', () => {
    slots.clear();
    tryLockSlot('DOC-1', '2026-06-01', '11:00', 'PAT-A');
    expect(tryLockSlot('DOC-1', '2026-06-01', '11:00', 'PAT-A').ok).toBe(true);
  });
});
