/**
 * Responsive Hooks for Mobile/Tablet/Desktop Detection
 */

import { useState, useEffect } from 'react';

// Breakpoints matching Tailwind CSS defaults
const breakpoints = {
  sm: 640,   // Mobile landscape / Small tablet
  md: 768,   // Tablet
  lg: 1024,  // Desktop
  xl: 1280,  // Large desktop
  '2xl': 1536, // Extra large desktop
};

export type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to detect current screen size
 */
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once to set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < breakpoints.md;
  const isTablet = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg;
  const isDesktop = windowSize.width >= breakpoints.lg;
  const isLargeDesktop = windowSize.width >= breakpoints.xl;

  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint: getCurrentBreakpoint(windowSize.width),
  };
};

/**
 * Get current breakpoint based on width
 */
const getCurrentBreakpoint = (width: number): Breakpoint => {
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  return 'sm';
};

/**
 * Hook to check if screen is at least a certain breakpoint
 */
export const useMediaQuery = (minWidth: Breakpoint): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = `(min-width: ${breakpoints[minWidth]}px)`;
    const media = window.matchMedia(query);

    const updateMatch = () => setMatches(media.matches);
    updateMatch();

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    } else {
      // Legacy browsers
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, [minWidth]);

  return matches;
};

/**
 * Hook for touch device detection
 */
export const useTouchDevice = (): boolean => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
};

/**
 * Hook for orientation detection
 */
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
};

/**
 * Hook for safe area insets (iPhone notch, etc.)
 */
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setSafeArea({
        top: Number.parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
        right: Number.parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
        bottom: Number.parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
        left: Number.parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);

    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  return safeArea;
};
