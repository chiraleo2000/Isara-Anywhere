/**
 * Appointment booking transaction rollback — Processes/Appointment_Workflows.md
 */
import { describe, it, expect } from 'vitest';

type TxState = { appointmentInserted: boolean; notificationsInserted: boolean };

async function bookAppointment(
  notifyFails: boolean,
): Promise<{ ok: boolean; rolledBack: boolean }> {
  const state: TxState = { appointmentInserted: false, notificationsInserted: false };
  try {
    state.appointmentInserted = true;
    if (notifyFails) throw new Error('notification insert failed');
    state.notificationsInserted = true;
    return { ok: true, rolledBack: false };
  } catch {
    if (state.appointmentInserted && !state.notificationsInserted) {
      state.appointmentInserted = false;
      return { ok: false, rolledBack: true };
    }
    return { ok: false, rolledBack: false };
  }
}

describe('Appointment booking rollback', () => {
  it('rolls back appointment when notification insert fails', async () => {
    const r = await bookAppointment(true);
    expect(r.ok).toBe(false);
    expect(r.rolledBack).toBe(true);
  });

  it('commits when notification succeeds', async () => {
    const r = await bookAppointment(false);
    expect(r.ok).toBe(true);
    expect(r.rolledBack).toBe(false);
  });
});
