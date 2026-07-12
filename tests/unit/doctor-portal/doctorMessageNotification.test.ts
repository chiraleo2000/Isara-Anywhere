/**
 * Doctor → patient message creates doctor_message notification (source contract).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Doctor message → doctor_message notification', () => {
  it('DMN-01 — mainApiServer POST messages creates patient_doctor_messages', () => {
    const api = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(api).toMatch(/\/api\/patients\/:patientId\/messages/);
    expect(api).toContain('patient_doctor_messages');
  });

  it('DMN-02 — message POST fires doctor_message notification type', () => {
    const api = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(api).toMatch(/doctor_message/);
    expect(api).toMatch(/createNotification|NotificationService/);
  });

  it('DMN-03 — Notification_Workflows documents doctor_message', () => {
    const doc = fs.readFileSync(
      path.join(root, 'Processes/Notification_Workflows.md'),
      'utf8',
    );
    expect(doc).toMatch(/doctor_message/);
  });

  it('DMN-04 — PatientMessageComposer posts to patient messages API', () => {
    const ui = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/PatientMessageComposer.tsx'),
      'utf8',
    );
    expect(ui).toMatch(/\/api\/patients\/\$\{patient\.id\}\/messages/);
  });
});
