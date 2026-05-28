import { describe, it, expect } from 'vitest';

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof breakpoints;

function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  return 'sm';
}

function layoutFlags(width: number) {
  return {
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    breakpoint: getCurrentBreakpoint(width),
  };
}

describe('Responsive layout breakpoints (useResponsive parity)', () => {
  it('phone-xs 320px is mobile sm', () => {
    const f = layoutFlags(320);
    expect(f.isMobile).toBe(true);
    expect(f.isTablet).toBe(false);
    expect(f.breakpoint).toBe('sm');
  });

  it('phone-lg 428px is mobile sm', () => {
    expect(layoutFlags(428).isMobile).toBe(true);
  });

  it('tablet 768px is md not mobile', () => {
    const f = layoutFlags(768);
    expect(f.isMobile).toBe(false);
    expect(f.isTablet).toBe(true);
    expect(f.breakpoint).toBe('md');
  });

  it('desktop 1280px is lg+', () => {
    const f = layoutFlags(1280);
    expect(f.isDesktop).toBe(true);
    expect(f.breakpoint).toBe('xl');
  });
});
