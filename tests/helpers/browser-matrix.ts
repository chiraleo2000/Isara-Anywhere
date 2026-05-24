/**
 * Canonical multi-party browser matrix for Izara E2E (Patient/Doctor/Admin).
 * Single source of truth — mirrored in unit tests.
 */

export type PortalRole = 'patient' | 'doctor' | 'admin';
export type BrowserEngine = 'chromium' | 'firefox';

export interface RoleBrowserSpec {
  role: PortalRole;
  engine: BrowserEngine;
  /** Chromium channel when engine is chromium */
  channel?: 'chrome' | 'msedge';
  browserName: 'chrome' | 'edge' | 'firefox';
  /** Navigation timeout multiplier vs baseline */
  navTimeoutMultiplier: number;
  /** Fixture launch retry count */
  launchRetries: number;
}

export const ROLE_BROWSER_MATRIX: Record<PortalRole, RoleBrowserSpec> = {
  patient: {
    role: 'patient',
    engine: 'chromium',
    channel: 'chrome',
    browserName: 'chrome',
    navTimeoutMultiplier: 1,
    launchRetries: 2,
  },
  doctor: {
    role: 'doctor',
    engine: 'chromium',
    channel: 'msedge',
    browserName: 'edge',
    navTimeoutMultiplier: 1,
    launchRetries: 2,
  },
  admin: {
    role: 'admin',
    engine: 'firefox',
    browserName: 'firefox',
    navTimeoutMultiplier: 1.5,
    launchRetries: 3,
  },
};

export function getRoleBrowserSpec(role: PortalRole): RoleBrowserSpec {
  return ROLE_BROWSER_MATRIX[role];
}

export function scaleTimeout(baseMs: number, role: PortalRole): number {
  return Math.round(baseMs * ROLE_BROWSER_MATRIX[role].navTimeoutMultiplier);
}

export function scaleTimeoutByBrowser(baseMs: number, browserName: string): number {
  const spec = Object.values(ROLE_BROWSER_MATRIX).find((s) => s.browserName === browserName);
  return Math.round(baseMs * (spec?.navTimeoutMultiplier ?? 1));
}

/** Chromium-only flags — must not be passed to Firefox.launch() */
export const CHROMIUM_LAUNCH_OPTIONS = {
  args: [
    '--auto-accept-camera-and-microphone-capture',
    '--use-fake-device-for-media-capture',
    '--use-fake-ui-for-media-stream',
  ],
} as const;

/** Headless: minimal args + fake media (works on chrome-headless-shell). Headed: no --start-maximized (Windows crash). */
export function chromiumLaunchArgs(headless = false): string[] {
  const media = [
    '--use-fake-device-for-media-capture',
    '--use-fake-ui-for-media-stream',
  ];
  if (headless) {
    return ['--no-sandbox', ...media];
  }
  // Headed: fake media on installed Chrome (Windows); grantPermissions alone is not enough for MediaRecorder
  return [
    '--disable-dev-shm-usage',
    '--window-size=1440,900',
    '--use-fake-device-for-media-capture',
    '--use-fake-ui-for-media-stream',
  ];
}

export const FIREFOX_LAUNCH_OPTIONS = {
  /** Firefox does not support context.grantPermissions('camera') — use prefs + fake devices */
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  firefoxUserPrefs: {
    'media.navigator.permission.disabled': true,
    'media.navigator.streams.fake': true,
    'permissions.default.camera': 1,
    'permissions.default.microphone': 1,
  },
} as const;

/** Permissions grantPermissions() supports on Chromium only */
export const CHROMIUM_MEDIA_PERMISSIONS = ['camera', 'microphone'] as const;

export function isConnectionRefusedError(message: string): boolean {
  return /ERR_CONNECTION_REFUSED|NS_ERROR_CONNECTION_REFUSED|ECONNREFUSED|Connection refused/i.test(
    message,
  );
}
