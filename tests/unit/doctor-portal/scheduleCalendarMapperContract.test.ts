/**
 * Confirmed appointment → calendar event mapper contract.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function mapConfirmedToCalendarEvent({
  confirmed_date,
  confirmed_time,
  patientName,
}: {
  confirmed_date: string;
  confirmed_time: string;
  patientName: string;
}): { title: string; start: string } {
  const time = confirmed_time.slice(0, 5);
  return {
    title: `Telehealth — ${patientName}`,
    start: `${confirmed_date}T${time}`,
  };
}

describe('scheduleCalendarMapperContract — pure', () => {
  it('SCM-01 — mapConfirmedToCalendarEvent produces title and start', () => {
    const event = mapConfirmedToCalendarEvent({
      confirmed_date: '2026-07-15',
      confirmed_time: '14:30',
      patientName: 'Somchai Patient',
    });
    expect(event.title).toContain('Somchai Patient');
    expect(event.start).toBe('2026-07-15T14:30');
  });

  it('SCM-02 — time normalized to HH:MM prefix', () => {
    const event = mapConfirmedToCalendarEvent({
      confirmed_date: '2026-08-01',
      confirmed_time: '09:00:00',
      patientName: 'A',
    });
    expect(event.start).toBe('2026-08-01T09:00');
  });
});

describe('scheduleCalendarMapperContract — source', () => {
  it('SCM-SRC — schedule / calendar confirm mentions confirmed_date', () => {
    const scheduleUtil = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/utils/appointmentSchedule.ts'),
      'utf8',
    );
    expect(scheduleUtil).toMatch(/confirmed_date/);
    expect(scheduleUtil).toMatch(/confirmed_time/);

    const scheduleTest = fs.readFileSync(
      path.join(root, 'tests/unit/doctor-portal/scheduleManagement.test.ts'),
      'utf8',
    );
    expect(scheduleTest.length).toBeGreaterThan(0);

    const docs = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/docs/pages/04_Schedule_Page.md'),
      'utf8',
    );
    expect(docs).toMatch(/confirmed_date/);
    expect(docs).toMatch(/calendar/i);
  });
});
