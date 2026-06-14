/**
 * @process Processes/Pages/Doctor-Portal/03_Dashboard_Page.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dashboard = path.resolve(__dirname, '../../../Isara-doctor-portal/src/pages/DoctorDashboard.tsx');

describe('Telemed dashboard (TDK)', () => {
  const src = fs.readFileSync(dashboard, 'utf8');

  it('TDK-01 — dashboard meeting pipeline testids', () => {
    expect(src).toMatch(/dashboard-meeting-ai-summary|meeting-pipeline-status/);
  });

  it('TDK-02 — appointment or queue summary section', () => {
    expect(src).toMatch(/appointment|queue|schedule/i);
  });

  it('TDK-03 — pool or pending counts', () => {
    expect(src).toMatch(/pool|pending|count/i);
  });

  it('TDK-04 — navigate to health meeting', () => {
    expect(src).toMatch(/health-meeting|HealthMeeting|onNavigate/i);
  });

  it('TDK-05 — mobile nav hamburger for doctor portal', () => {
    const layout = path.resolve(__dirname, '../../../Isara-doctor-portal/src/components/common/ResponsiveLayout.tsx');
    expect(fs.readFileSync(layout, 'utf8')).toMatch(/doctor-mobile-menu-btn|doctor-mobile-nav/);
  });
});
