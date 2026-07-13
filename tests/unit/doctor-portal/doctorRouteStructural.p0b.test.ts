/**
 * P0b structural routes — Doctor 07 removed; Doctor 20 pool → Health Meeting queue.
 * @process Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md
 * @process Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const portalPath = path.join(root, 'Isara-doctor-portal/frontend/pages/DoctorPortal.tsx');
const process07 = path.join(root, 'Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md');
const process20 = path.join(root, 'Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md');

describe('P0b — Doctor 07 Virtual Meeting removed', () => {
  it('D07-01 — no virtual-meeting route or VirtualMeeting import in DoctorPortal', () => {
    const src = fs.readFileSync(portalPath, 'utf8');
    expect(src).not.toMatch(/path=["']virtual-meeting/);
    expect(src).not.toMatch(/import\s+VirtualMeeting/);
    expect(src).toMatch(/virtual-meeting route removed/i);
  });

  it('D07-02 — VirtualMeeting.tsx page files do not exist', () => {
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/VirtualMeeting.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/frontend/pages/VirtualMeeting.tsx'))).toBe(false);
  });

  it('D07-03 — process stub documents Removed status and Meeting-Server/01 replacement', () => {
    expect(fs.existsSync(process07)).toBe(true);
    const doc = fs.readFileSync(process07, 'utf8');
    expect(doc).toMatch(/Removed|REMOVED/i);
    expect(doc).toMatch(/Meeting-Server\/01_Meeting_Room/);
  });

  it('D07-04 — canonical meeting routes remain /meeting/:appointmentId(+ /results)', () => {
    const src = fs.readFileSync(portalPath, 'utf8');
    expect(src).toMatch(/path="meeting\/:appointmentId"/);
    expect(src).toMatch(/path="meeting\/:appointmentId\/results"/);
  });
});

describe('P0b — Doctor 20 Appointment Pool redirect', () => {
  it('D20-01 — /appointment-pool Navigate → health-meeting?tab=queue', () => {
    const src = fs.readFileSync(portalPath, 'utf8');
    expect(src).toMatch(/path="appointment-pool"[\s\S]*Navigate[\s\S]*health-meeting\?tab=queue/);
  });

  it('D20-02 — /admin/pool Navigate → health-meeting?tab=queue', () => {
    const src = fs.readFileSync(portalPath, 'utf8');
    expect(src).toMatch(/path="admin\/pool"[\s\S]*Navigate[\s\S]*health-meeting\?tab=queue/);
  });

  it('D20-03 — process doc marks DEPRECATED redirect to Health Meeting queue', () => {
    expect(fs.existsSync(process20)).toBe(true);
    const doc = fs.readFileSync(process20, 'utf8');
    expect(doc).toMatch(/DEPRECATED|redirect/i);
    expect(doc).toMatch(/health-meeting\?tab=queue/);
  });
});
