import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const servicesPath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/frontend/lib/services.ts',
);

describe('notification mark-all regression guard', () => {
  it('uses dedicated read-all endpoint instead of N per-item writes', () => {
    const source = fs.readFileSync(servicesPath, 'utf8');
    const hasReadAllEndpoint = /notifications\/\$\{userId\}\/read-all/.test(source);
    const loopsEachUnread = /unread\.map\(/.test(source);

    expect(hasReadAllEndpoint).toBe(true);
    expect(loopsEachUnread).toBe(false);
  });
});
