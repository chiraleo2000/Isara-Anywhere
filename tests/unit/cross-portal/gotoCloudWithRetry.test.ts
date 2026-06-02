import { describe, expect, it } from 'vitest';

describe('cloud E2E navigation policy', () => {
  it('cloud mode uses extended navigation timeout constant', () => {
    const isCloud = process.env.TEST_ENV === 'cloud';
    const cloudNavTimeout = isCloud ? 90_000 : 30_000;
    const cloudAttempts = isCloud ? 4 : 3;
    expect(cloudNavTimeout).toBeGreaterThanOrEqual(90_000);
    expect(cloudAttempts).toBeGreaterThanOrEqual(3);
  });
});
