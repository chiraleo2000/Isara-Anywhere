/**
 * @process Processes/Pages/Doctor-Portal/06_Health_Meeting_Page.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const healthMeeting = path.resolve(__dirname, '../../../issara-doctor/frontend/pages/meetings/HealthMeeting.tsx');
const meetingResults = path.resolve(__dirname, '../../../issara-doctor/frontend/pages/meetings/MeetingResults.tsx');

describe('Clinical breadcrumb hints (BREAD)', () => {
  it('BREAD-01 — health meeting breadcrumb testid', () => {
    expect(fs.readFileSync(healthMeeting, 'utf8')).toMatch(/health-meeting-breadcrumb/);
  });

  it('BREAD-02 — breadcrumb aria label', () => {
    expect(fs.readFileSync(healthMeeting, 'utf8')).toMatch(/aria-label="Breadcrumb"/);
  });

  it('BREAD-03 — meeting results next-step toward EMR', () => {
    const src = fs.readFileSync(meetingResults, 'utf8');
    expect(src).toMatch(/emr|EMR|validate|apply/i);
  });
});
