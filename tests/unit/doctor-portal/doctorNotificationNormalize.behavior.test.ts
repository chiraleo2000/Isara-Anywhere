import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/** Mirrors doctor postgresDataService normalizeNotificationRow */
function normalizeDoctorNotificationRow(row: Record<string, unknown>): Record<string, unknown> {
  let data = row.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const readAt = row.read_at ?? row.readAt ?? null;
  return {
    ...row,
    data: payload,
    isRead: Boolean(readAt),
  };
}

const doctorService = path.resolve(
  __dirname,
  '../../../issara-doctor/backend/services/postgresDataService.cjs',
);

describe('doctor notification normalize behavior (D1)', () => {
  it('maps read_at to isRead for doctor notifications', () => {
    expect(normalizeDoctorNotificationRow({ id: 'd1', read_at: null }).isRead).toBe(false);
    expect(normalizeDoctorNotificationRow({ id: 'd2', read_at: '2026-05-30' }).isRead).toBe(true);
  });

  it('doctor postgresDataService implements Boolean(readAt) isRead mapping', () => {
    const source = fs.readFileSync(doctorService, 'utf8');
    expect(source).toMatch(/isRead:\s*Boolean\(readAt\)/);
    expect(source).toMatch(/read_at|readAt/);
  });
});
