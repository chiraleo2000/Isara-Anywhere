/**
 * Doctor → patient messaging API contract
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('patientDoctorMessages contract', () => {
  it('PDM-01 — PatientMessageComposer posts to /api/patients/:id/messages', () => {
    const src = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/PatientMessageComposer.tsx'),
      'utf8',
    );
    expect(src).toContain('/api/patients/${patient.id}/messages');
    expect(src).toContain('data-testid="patient-message-send-btn"');
  });

  it('PDM-02 — doctor API registers messages routes', () => {
    const api = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(api).toMatch(/\/api\/patients\/:patientId\/messages/);
    expect(api).toContain('patient_doctor_messages');
  });

  it('PDM-03 — notification type doctor_message in workflows doc', () => {
    const notif = fs.readFileSync(path.join(root, 'Processes/Notification_Workflows.md'), 'utf8');
    expect(notif).toMatch(/doctor_message/i);
  });
});
