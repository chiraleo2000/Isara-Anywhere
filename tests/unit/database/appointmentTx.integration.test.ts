/**
 * Appointment booking transaction contract — Processes/PostgreSQL_Database_Architecture.md
 */
import { describe, it, expect } from 'vitest';

type Tx = {
  appointmentRow: boolean;
  queueRow: boolean;
  notificationRow: boolean;
};

async function bookWithNotifications(
  failNotification: boolean,
): Promise<{ committed: boolean; state: Tx }> {
  const state: Tx = { appointmentRow: false, queueRow: false, notificationRow: false };
  try {
    state.appointmentRow = true;
    state.queueRow = true;
    if (failNotification) throw new Error('notification insert failed');
    state.notificationRow = true;
    return { committed: true, state };
  } catch {
    state.appointmentRow = false;
    state.queueRow = false;
    state.notificationRow = false;
    return { committed: false, state };
  }
}

describe('Appointment transaction rollback contract', () => {
  it('rolls back appointment and queue when notification fails', async () => {
    const r = await bookWithNotifications(true);
    expect(r.committed).toBe(false);
    expect(r.state.appointmentRow).toBe(false);
    expect(r.state.queueRow).toBe(false);
  });

  it('commits all rows when notification succeeds', async () => {
    const r = await bookWithNotifications(false);
    expect(r.committed).toBe(true);
    expect(r.state).toEqual({
      appointmentRow: true,
      queueRow: true,
      notificationRow: true,
    });
  });
});
