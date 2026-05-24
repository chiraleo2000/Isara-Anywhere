/**
 * Unit tests for tests/helpers/browser-matrix.ts (multi-party E2E matrix).
 */
import { describe, it, expect } from 'vitest';
import {
  ROLE_BROWSER_MATRIX,
  getRoleBrowserSpec,
  scaleTimeout,
  scaleTimeoutByBrowser,
  isConnectionRefusedError,
  CHROMIUM_LAUNCH_OPTIONS,
  chromiumLaunchArgs,
  CHROMIUM_MEDIA_PERMISSIONS,
  FIREFOX_LAUNCH_OPTIONS,
} from '../../helpers/browser-matrix';

describe('browser-matrix — role assignment', () => {
  it('BM01 — patient Chrome, doctor Edge', () => {
    expect(getRoleBrowserSpec('patient').channel).toBe('chrome');
    expect(getRoleBrowserSpec('doctor').channel).toBe('msedge');
    expect(getRoleBrowserSpec('doctor').browserName).toBe('edge');
  });

  it('BM02 — admin uses Firefox engine', () => {
    expect(getRoleBrowserSpec('admin').engine).toBe('firefox');
    expect(getRoleBrowserSpec('admin').channel).toBeUndefined();
  });

  it('BM03 — admin has longer nav timeout multiplier (BR-02)', () => {
    expect(getRoleBrowserSpec('admin').navTimeoutMultiplier).toBeGreaterThan(1);
    expect(scaleTimeout(10_000, 'admin')).toBe(15_000);
    expect(scaleTimeout(10_000, 'patient')).toBe(10_000);
  });

  it('BM04 — Firefox launch has more retries than Chrome roles', () => {
    expect(getRoleBrowserSpec('admin').launchRetries).toBeGreaterThan(
      getRoleBrowserSpec('patient').launchRetries,
    );
  });
});

describe('browser-matrix — launch options separation', () => {
  it('BM05 — Chromium args are not applied to Firefox prefs module', () => {
    expect(CHROMIUM_LAUNCH_OPTIONS.args).toContain('--use-fake-device-for-media-capture');
    expect(chromiumLaunchArgs(true)).toContain('--no-sandbox');
    expect(FIREFOX_LAUNCH_OPTIONS.firefoxUserPrefs).toBeDefined();
    expect(FIREFOX_LAUNCH_OPTIONS.args).toContain('--use-fake-device-for-media-stream');
  });

  it('BM10 — media permissions list is Chromium-only contract', () => {
    expect(CHROMIUM_MEDIA_PERMISSIONS).toEqual(['camera', 'microphone']);
  });
});

describe('browser-matrix — connection errors (BR-01)', () => {
  it('BM06 — detects Chrome connection refused', () => {
    expect(isConnectionRefusedError('net::ERR_CONNECTION_REFUSED')).toBe(true);
  });

  it('BM07 — detects Firefox connection refused', () => {
    expect(isConnectionRefusedError('NS_ERROR_CONNECTION_REFUSED')).toBe(true);
  });

  it('BM08 — scaleTimeoutByBrowser applies firefox multiplier', () => {
    expect(scaleTimeoutByBrowser(60_000, 'firefox')).toBe(90_000);
    expect(scaleTimeoutByBrowser(60_000, 'chrome')).toBe(60_000);
    expect(scaleTimeoutByBrowser(60_000, 'edge')).toBe(60_000);
  });
});

describe('browser-matrix — matrix completeness', () => {
  it('BM09 — all portal roles defined', () => {
    expect(Object.keys(ROLE_BROWSER_MATRIX).sort()).toEqual(['admin', 'doctor', 'patient']);
  });
});
