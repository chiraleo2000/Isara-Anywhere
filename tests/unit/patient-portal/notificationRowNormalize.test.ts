import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/** Mirrors patient + doctor postgresDataService normalizeNotificationRow */
function normalizeNotificationRow(row: Record<string, unknown>): Record<string, unknown> {
  let data = row.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const appointmentId = payload.appointmentId ?? payload.appointment_id ?? undefined;
  const createdAt = row.created_at ?? row.createdAt ?? null;
  const readAt = row.read_at ?? row.readAt ?? null;
  return {
    ...row,
    data: payload,
    ...(createdAt ? { createdAt } : {}),
    isRead: Boolean(readAt),
    ...(appointmentId ? { appointmentId } : {}),
  };
}

const patientService = path.resolve(
  __dirname,
  '../../../issara-patient/backend/services/postgresDataService.ts',
);
const doctorService = path.resolve(
  __dirname,
  '../../../issara-doctor/backend/services/postgresDataService.cjs',
);

describe('notification row normalize (P5, D1)', () => {
  it('maps unread row to isRead false', () => {
    const out = normalizeNotificationRow({ id: '1', read_at: null });
    expect(out.isRead).toBe(false);
  });

  it('maps read_at to isRead true', () => {
    const out = normalizeNotificationRow({ id: '2', read_at: '2026-01-01T00:00:00Z' });
    expect(out.isRead).toBe(true);
  });

  it('maps created_at to createdAt', () => {
    const out = normalizeNotificationRow({ id: '3', created_at: '2026-01-02' });
    expect(out.createdAt).toBe('2026-01-02');
  });

  it('extracts appointmentId from JSON data string', () => {
    const out = normalizeNotificationRow({
      id: '4',
      data: JSON.stringify({ appointmentId: 'apt-99' }),
    });
    expect(out.appointmentId).toBe('apt-99');
  });

  it('patient and doctor services both implement isRead mapping', () => {
    const patientSrc = fs.readFileSync(patientService, 'utf8');
    const doctorSrc = fs.readFileSync(doctorService, 'utf8');
    expect(patientSrc).toMatch(/isRead:\s*Boolean\(readAt\)/);
    expect(doctorSrc).toMatch(/isRead:\s*Boolean\(readAt\)/);
  });
});
