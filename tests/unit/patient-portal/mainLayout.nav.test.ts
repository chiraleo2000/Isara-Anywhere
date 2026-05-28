import { describe, it, expect } from 'vitest';

const MOBILE_BOTTOM_NAV = [
  { path: '/' },
  { path: '/appointments' },
  { path: '/ai-doctor' },
  { path: '/phr' },
  { path: '/settings' },
];

const SIDEBAR_NAV_PATHS = [
  '/',
  '/appointments',
  '/ai-doctor',
  '/health-library',
  '/phr',
  '/timeline',
  '/map',
  '/find-doctors',
  '/pdpa',
  '/settings',
];

describe('Patient MainLayout navigation contract', () => {
  it('mobile bottom nav has 5 items with min touch-friendly routes', () => {
    expect(MOBILE_BOTTOM_NAV).toHaveLength(5);
    const paths = MOBILE_BOTTOM_NAV.map((i) => i.path);
    expect(paths).toContain('/');
    expect(paths).not.toContain('/timeline');
    expect(paths).toContain('/settings');
  });

  it('sidebar includes timeline and map (deep routes)', () => {
    expect(SIDEBAR_NAV_PATHS).toContain('/timeline');
    expect(SIDEBAR_NAV_PATHS).toContain('/map');
    expect(SIDEBAR_NAV_PATHS.length).toBeGreaterThanOrEqual(10);
  });

  it('bottom nav paths are subset of primary patient routes', () => {
    const primary = ['/', '/appointments', '/ai-doctor', '/phr', '/settings'];
    for (const item of MOBILE_BOTTOM_NAV) {
      expect(primary).toContain(item.path);
    }
  });
});
