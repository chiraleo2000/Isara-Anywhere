import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const postgresDataServicePath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/backend/services/postgresDataService.ts',
);

describe('notification normalize regression guard', () => {
  it('maps read_at into isRead for client rendering consistency', () => {
    const source = fs.readFileSync(postgresDataServicePath, 'utf8');

    // Frontend uses `notification.isRead`; without mapping, read state resets on refresh.
    const hasIsReadMapping = /isRead\s*:\s*Boolean\(\s*row\.read_at\s*\)/.test(source)
      || /isRead\s*:\s*!!\s*row\.read_at/.test(source)
      || /isRead\s*:\s*row\.read_at\s*\?\s*true\s*:\s*false/.test(source)
      || /isRead\s*:\s*Boolean\(\s*readAt\s*\)/.test(source);

    expect(hasIsReadMapping).toBe(true);
  });
});
