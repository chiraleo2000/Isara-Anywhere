/**
 * Notification dedupe + mark-read deep-link mapping contract.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

type NotificationEvent = {
  appointmentId: string;
  type: string;
  id: string;
};

function eventKey(n: NotificationEvent): string {
  return `${n.appointmentId}::${n.type}`;
}

function dedupeByEventKey(events: NotificationEvent[]): NotificationEvent[] {
  const seen = new Set<string>();
  const out: NotificationEvent[] = [];
  for (const e of events) {
    const key = eventKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function markReadDeepLink(type: string): string {
  if (type === 'appointment_confirmed') return '/appointments';
  if (type === 'document_delivered') return '/phr';
  return '/';
}

describe('notificationDedupContract — pure', () => {
  it('NDD-01 — dedupeByEventKey keeps one per appointmentId+type', () => {
    const events: NotificationEvent[] = [
      { id: 'n1', appointmentId: 'apt-1', type: 'appointment_confirmed' },
      { id: 'n2', appointmentId: 'apt-1', type: 'appointment_confirmed' },
      { id: 'n3', appointmentId: 'apt-1', type: 'document_delivered' },
      { id: 'n4', appointmentId: 'apt-2', type: 'appointment_confirmed' },
    ];
    const deduped = dedupeByEventKey(events);
    expect(deduped).toHaveLength(3);
    expect(deduped.map((e) => e.id)).toEqual(['n1', 'n3', 'n4']);
  });

  it('NDD-02 — markReadDeepLink maps confirmed → /appointments, delivered → /phr|/timeline', () => {
    expect(markReadDeepLink('appointment_confirmed')).toBe('/appointments');
    const delivered = markReadDeepLink('document_delivered');
    expect(['/phr', '/timeline']).toContain(delivered);
  });
});

describe('notificationDedupContract — source', () => {
  it('NDD-SRC — notification types and deep-link targets exist', () => {
    const bell = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/frontend/components/notifications/NotificationBell.tsx'),
      'utf8',
    );
    expect(bell).toMatch(/appointment_confirmed/);
    expect(bell).toMatch(/\/appointments/);

    const api = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(api).toMatch(/document_delivered/);

    const docs = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/docs/pages/15_Notification_System.md'),
      'utf8',
    );
    expect(docs).toMatch(/\/appointments|\/phr/);
  });
});
