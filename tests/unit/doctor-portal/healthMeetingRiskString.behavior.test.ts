import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const healthMeetingPath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/src/pages/meetings/HealthMeeting.tsx',
);

describe('health meeting risk stringification (S6551)', () => {
  it('uses riskToString helper instead of raw object interpolation', () => {
    const source = fs.readFileSync(healthMeetingPath, 'utf8');
    expect(source).toMatch(/const riskToString/);
    expect(source).toMatch(/\{riskToString\(r\)\}/);
    expect(source).not.toMatch(/\{r\.risk \|\| r\}/);
  });
});
