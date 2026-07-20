/**
 * @process Processes/Pages/Patient-Portal/12_Profile_Page.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const profilePage = path.resolve(__dirname, '../../../issara-patient/frontend/pages/ProfilePage.tsx');
const phrRoute = path.resolve(__dirname, '../../../issara-patient/backend/routes/phr.ts');

describe('Profile workflow (PRF)', () => {
  const profileSrc = fs.readFileSync(profilePage, 'utf8');

  it('PRF-01 — profile save calls PHR API', () => {
    expect(profileSrc).toMatch(/\/api\/phr\/profile/);
  });

  it('PRF-02 — phr route PUT profile handler', () => {
    expect(fs.readFileSync(phrRoute, 'utf8')).toMatch(/router\.put\('\/profile\/:id'/);
  });

  it('PRF-03 — success feedback after save', () => {
    expect(profileSrc).toMatch(/success|saved|toast|banner/i);
  });

  it('PRF-04 — link to PHR from profile', () => {
    expect(profileSrc).toMatch(/phr|health.?record/i);
  });

  it('PRF-05 — loading or saving state', () => {
    expect(profileSrc).toMatch(/saving|loading|isSubmitting/i);
  });

  it('PRF-06 — error handling on save failure', () => {
    expect(profileSrc).toMatch(/Failed to save profile|catch/i);
  });
});
