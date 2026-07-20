/**
 * PG NOTIFY → Socket.IO room mapping contract.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function roomForChange({
  table,
  doctorId,
  queueId,
}: {
  table: string;
  doctorId?: string;
  queueId?: string;
}): string[] {
  if (table === 'appointments') {
    const q = queueId ?? doctorId;
    const rooms: string[] = [];
    if (q) rooms.push(`queue-${q}`);
    if (doctorId) rooms.push(`doctor-${doctorId}`);
    if (!doctorId) rooms.push('admin-notifications');
    return rooms;
  }

  if (table === 'notifications') {
    if (doctorId) return [`doctor-${doctorId}`];
    return ['admin-notifications'];
  }

  return [];
}

describe('notifySocketRoomMapContract — pure', () => {
  it('NSR-01 — appointments map to queue-{id} and doctor-{id}', () => {
    expect(
      roomForChange({ table: 'appointments', doctorId: 'doc-1', queueId: 'doc-1' }),
    ).toEqual(['queue-doc-1', 'doctor-doc-1']);
  });

  it('NSR-02 — appointments without doctor use admin-notifications', () => {
    expect(roomForChange({ table: 'appointments' })).toEqual(['admin-notifications']);
  });

  it('NSR-03 — notifications map to doctor room or admin-notifications', () => {
    expect(roomForChange({ table: 'notifications', doctorId: 'doc-9' })).toEqual([
      'doctor-doc-9',
    ]);
    expect(roomForChange({ table: 'notifications' })).toEqual(['admin-notifications']);
  });
});

describe('notifySocketRoomMapContract — source', () => {
  it('NSR-SRC — pg notify listener mentions data_changes / NOTIFY rooms', () => {
    const doctor = fs.readFileSync(
      path.join(root, 'issara-doctor/backend/pgNotifyListener.cjs'),
      'utf8',
    );
    expect(doctor).toMatch(/data_changes/);
    expect(doctor).toMatch(/LISTEN data_changes|NOTIFY/i);
    expect(doctor).toMatch(/queue-\$\{|queue-/);
    expect(doctor).toMatch(/doctor-\$\{|doctor-/);
    expect(doctor).toMatch(/admin-notifications/);

    const patient = fs.readFileSync(
      path.join(root, 'issara-patient/backend/pgNotifyListener.ts'),
      'utf8',
    );
    expect(patient).toMatch(/data_changes/);
    expect(patient).toMatch(/LISTEN data_changes/);
  });
});
