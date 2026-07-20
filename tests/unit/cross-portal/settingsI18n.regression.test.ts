import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const patientSettingsPath = path.resolve(
  __dirname,
  '../../../issara-patient/frontend/contexts/SettingsContext.tsx',
);
const doctorSettingsPath = path.resolve(
  __dirname,
  '../../../issara-doctor/frontend/hooks/useSettings.tsx',
);

describe('cross-portal i18n regression guard', () => {
  it('keeps key login/notification labels present in EN + TH maps', () => {
    const patientSource = fs.readFileSync(patientSettingsPath, 'utf8');
    const doctorSource = fs.readFileSync(doctorSettingsPath, 'utf8');

    expect(patientSource).toContain("'auth.login': { en: 'Login', th: 'เข้าสู่ระบบ' }");
    expect(patientSource).toContain("'notifications.title': { en: 'Notifications', th: 'การแจ้งเตือน' }");
    expect(doctorSource).toContain("'notif.notifications': { en: 'Notifications', th: 'การแจ้งเตือน' }");
    expect(doctorSource).toContain("'settings.language': { en: 'Language', th: 'ภาษา' }");
  });
});
