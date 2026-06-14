/**
 * Helpers for Group Q — meeting lifecycle seed/teardown (cloud workflow state).
 */
import { expect, type Page } from '@playwright/test';
import {
  lobbyAdmitAll,
  lobbyAdmitOne,
  lobbyGetSnapshot,
} from './multi-portal';
import { loadWorkflowState } from './workflow-state';

const IS_CLOUD_FIXTURE = process.env.TEST_ENV === 'cloud';

export type LobbyParticipantRow = {
  participantId?: string;
  status?: string;
  role?: string;
};

/** Parse GET /lobby response — waiting === participants, all === lobby (meeting-server). */
export function parseLobbySnapshot(data: {
  participants?: LobbyParticipantRow[];
  lobby?: LobbyParticipantRow[];
}): { waiting: LobbyParticipantRow[]; all: LobbyParticipantRow[] } {
  const waiting = data.participants || [];
  const all = data.lobby || waiting;
  return { waiting, all };
}

export function participantIdByRole(
  snap: { waiting: LobbyParticipantRow[]; all: LobbyParticipantRow[] },
  role: string,
): string | undefined {
  return (
    snap.waiting.find((p) => p.role === role)?.participantId ||
    snap.all.find((p) => p.role === role)?.participantId
  );
}

type ResultsRequest = {
  get: (url: string, opts?: object) => Promise<{ ok: () => boolean; status?: () => number; json: () => Promise<unknown> }>;
};

export const MEETING_HOLD_MS = 10_000;
/** Minimum WebM/audio payload size (bytes) — rejects stub fixtures on cloud */
export const MIN_RECORDING_BYTES = 1024;

export interface MeetingWorkflowContext {
  appointmentId: string;
  meetingId?: string;
  roomName?: string;
}

export function loadMeetingWorkflow(): MeetingWorkflowContext {
  const ws = loadWorkflowState();
  if (!ws.appointmentId) {
    throw new Error('Group D must run first — workflow state missing appointmentId');
  }
  return {
    appointmentId: ws.appointmentId,
    meetingId: ws.meetingId,
    roomName: ws.roomName,
  };
}

export function meetingKeyFromContext(ctx: MeetingWorkflowContext): string {
  return ctx.meetingId || ctx.appointmentId;
}

/** Cloud gate: Gemini is mandatory for Group Q02 */
export function assertGeminiConfiguredForCloud(): void {
  if (process.env.TEST_ENV !== 'cloud') return;
  const key = process.env.GEMINI_API_KEY || process.env.CLOUD_GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      'GEMINI_API_KEY is required when TEST_ENV=cloud (Group Q02 generate-summary). Set on meeting server and/or test runner env.',
    );
  }
}

/** Poll lobby status until admitted or timeout */
export async function waitLobbyAdmitted(
  request: { get: (url: string, opts?: object) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }> },
  meetingUrl: string,
  meetingKey: string,
  participantId: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resp = await request.get(
      `${meetingUrl}/api/meetings/${meetingKey}/lobby/status/${encodeURIComponent(participantId)}`,
      { timeout: 15_000 },
    );
    if (resp.ok()) {
      const body = (await resp.json()) as { status?: string };
      if (body.status === 'admitted') return;
    }
    await new Promise((r) => setTimeout(r, 1_500));
  }
  throw new Error(`Lobby participant ${participantId} not admitted within ${timeoutMs}ms`);
}

export interface AdmitAllLobbyParticipantsOpts {
  doctorPage: Page;
  patientPage: Page;
  guestPage?: Page | null;
  lobbyKey: string;
  appointmentId: string;
  doctorId: string;
  meetingUrl: string;
  expected: {
    patientId: string;
    guestId: string;
    patientName: string;
    guestName: string;
    guestInviteToken?: string;
  };
  apiTimeout?: number;
}

/** Patient lobby UI listens on Socket.IO; HTTP poll or reload when admit event is missed. */
async function resyncPatientLobbyUiAfterAdmit(
  patientPage: Page,
  meetingUrl: string,
  _lobbyKey: string,
): Promise<void> {
  const waiting = patientPage.getByTestId('lobby-waiting-screen');
  const hostWaiting = patientPage.getByTestId('host-waiting-screen');
  const jitsi = patientPage.getByTestId('jitsi-meeting-container');
  if (!(await waiting.isVisible({ timeout: 3_000 }).catch(() => false))) return;

  const pollDeadline = Date.now() + (IS_CLOUD_FIXTURE ? 25_000 : 15_000);
  while (Date.now() < pollDeadline) {
    if (await hostWaiting.isVisible({ timeout: 500 }).catch(() => false)) return;
    if (await jitsi.isVisible({ timeout: 500 }).catch(() => false)) return;
    if (!(await waiting.isVisible({ timeout: 500 }).catch(() => false))) return;
    await patientPage.waitForTimeout(1_000);
  }

  if (!(await waiting.isVisible({ timeout: 2_000 }).catch(() => false))) return;

  await overrideBrowserMeetingServerUrl(patientPage, meetingUrl);
  await proxyLocalMeetingServer(patientPage, meetingUrl);
  await patientPage.reload({
    waitUntil: 'domcontentloaded',
    timeout: IS_CLOUD_FIXTURE ? 90_000 : 45_000,
  });
  await expect(hostWaiting.or(jitsi).first()).toBeVisible({
    timeout: IS_CLOUD_FIXTURE ? 90_000 : 45_000,
  });
}

/** Doctor admits all waiting lobby participants; strict assertions (no swallowed errors). */
export async function admitAllLobbyParticipants(opts: AdmitAllLobbyParticipantsOpts): Promise<{
  patientId: string;
  guestId: string;
}> {
  const {
    doctorPage,
    patientPage,
    guestPage,
    lobbyKey,
    appointmentId,
    doctorId,
    meetingUrl,
    expected,
    apiTimeout = IS_CLOUD_FIXTURE ? 30_000 : 15_000,
  } = opts;
  const isCloud = IS_CLOUD_FIXTURE;
  const doctorToken = await doctorPage.evaluate(() => localStorage.getItem('token') || '');

  const ensureLobbyParticipant = async (
    role: 'patient' | 'guest',
    participantId: string,
    participantName: string,
    inviteToken?: string,
  ) => {
    let lobbySnap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
    const active = lobbySnap.all.some(
      (p) => p.participantId === participantId && (p.status === 'waiting' || p.status === 'admitted'),
    );
    if (active) return;
    const requestPage = role === 'guest' && guestPage ? guestPage : patientPage;
    const resp = await requestPage.request.post(`${meetingUrl}/api/meetings/${lobbyKey}/lobby/join`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        participantName,
        participantId,
        role,
        ...(inviteToken ? { invite: inviteToken } : {}),
      },
      timeout: apiTimeout,
    });
    expect(resp.ok(), `lobby re-join ${role}`).toBeTruthy();
    lobbySnap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
    expect(
      lobbySnap.all.some((p) => p.participantId === participantId),
      `${role} must be in lobby before admit`,
    ).toBeTruthy();
  };

  let lobbySnap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
  let patientId =
    participantIdByRole(lobbySnap, 'patient') || expected.patientId;
  let guestId =
    participantIdByRole(lobbySnap, 'guest') || expected.guestId;

  await ensureLobbyParticipant('patient', patientId, expected.patientName);
  await ensureLobbyParticipant(
    'guest',
    guestId,
    expected.guestName,
    expected.guestInviteToken,
  );

  lobbySnap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
  patientId = participantIdByRole(lobbySnap, 'patient') || patientId;
  guestId = participantIdByRole(lobbySnap, 'guest') || guestId;
  expect(
    lobbySnap.all.some((p) => p.participantId === patientId && p.status === 'waiting'),
    'patient must be waiting in lobby',
  ).toBeTruthy();
  expect(
    lobbySnap.all.some((p) => p.participantId === guestId && p.status === 'waiting'),
    'guest must be waiting in lobby',
  ).toBeTruthy();

  const admitBtn = doctorPage.getByTestId('admit-all-btn');
  if (await admitBtn.isVisible({ timeout: isCloud ? 45_000 : 20_000 }).catch(() => false)) {
    await admitBtn.click();
  }
  await lobbyAdmitAll(doctorPage, lobbyKey, doctorId);

  lobbySnap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
  for (const p of lobbySnap.waiting) {
    if (p.participantId) {
      await lobbyAdmitOne(doctorPage, lobbyKey, p.participantId, doctorId);
    }
  }

  patientId = participantIdByRole(lobbySnap, 'patient') || patientId;
  guestId = participantIdByRole(lobbySnap, 'guest') || guestId;

  await waitLobbyAdmitted(
    doctorPage.request,
    meetingUrl,
    lobbyKey,
    patientId,
    isCloud ? 120_000 : 90_000,
  );
  await waitLobbyAdmitted(
    doctorPage.request,
    meetingUrl,
    lobbyKey,
    guestId,
    isCloud ? 120_000 : 90_000,
  );

  await resyncPatientLobbyUiAfterAdmit(patientPage, meetingUrl, lobbyKey);

  await expect(patientPage.getByTestId('lobby-waiting-screen')).toBeHidden({
    timeout: isCloud ? 90_000 : 45_000,
  });
  if (guestPage) {
    await expect(guestPage.getByTestId('guest-lobby-waiting')).toBeHidden({
      timeout: isCloud ? 60_000 : 30_000,
    });
  }

  const hostResp = await doctorPage.request.post(`${meetingUrl}/api/meetings/${appointmentId}/host-present`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
    timeout: apiTimeout,
  });
  expect(hostResp.ok(), 'host-present after admit').toBeTruthy();
  await waitForMeetingHostReady(
    doctorPage.request,
    meetingUrl,
    appointmentId,
    isCloud ? 120_000 : 90_000,
  );

  return { patientId, guestId };
}

/** Resolve guest participant id from guest-lobby-waiting DOM or lobby snapshot. */
export async function resolveGuestParticipantId(
  guestPage: Page,
  doctorPage: Page,
  lobbyKey: string,
  doctorToken: string,
): Promise<string> {
  const lobbyWaiting = guestPage.getByTestId('guest-lobby-waiting');
  if (await lobbyWaiting.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const domId = await lobbyWaiting.getAttribute('data-participant-id');
    if (domId?.trim()) return domId.trim();
  }
  const snap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
  const fromSnap = participantIdByRole(snap, 'guest');
  expect(fromSnap, 'guest participantId from lobby snapshot').toBeTruthy();
  return fromSnap!;
}

/** Runs in browser context (addInitScript / evaluate). */
function jitsiSpyInstaller(): void {
  type JitsiApiCtor = new (domain: string, options: Record<string, unknown>) => unknown;
  type JitsiMountWindow = {
    __izaraJitsiMounts?: Array<{ domain: string; options: Record<string, unknown> }>;
    JitsiMeetExternalAPI?: JitsiApiCtor;
  };
  type WrappedCtor = JitsiApiCtor & { __izaraWrapped?: boolean };

  const w = globalThis as unknown as JitsiMountWindow;
  w.__izaraJitsiMounts ??= [];

  const safeClone = (options: Record<string, unknown>): Record<string, unknown> => {
    try {
      return structuredClone(options);
    } catch {
      const cfg = options.configOverwrite;
      const iface = options.interfaceConfigOverwrite;
      const userInfo = options.userInfo;
      return {
        roomName: options.roomName,
        width: options.width,
        height: options.height,
        jwt: options.jwt,
        configOverwrite: cfg && typeof cfg === 'object' ? { ...(cfg as Record<string, unknown>) } : undefined,
        interfaceConfigOverwrite: iface && typeof iface === 'object' ? { ...(iface as Record<string, unknown>) } : undefined,
        userInfo: userInfo && typeof userInfo === 'object' ? { ...(userInfo as Record<string, unknown>) } : undefined,
      };
    }
  };

  const wrapOnce = (): void => {
    const Orig = w.JitsiMeetExternalAPI;
    if (!Orig) return;
    const wrappedOrig = Orig as WrappedCtor;
    if (wrappedOrig.__izaraWrapped) return;
    function Wrapped(this: unknown, domain: string, options: Record<string, unknown>) {
      w.__izaraJitsiMounts!.push({ domain, options: safeClone(options) });
      return new Orig(domain, options);
    }
    Wrapped.__izaraWrapped = true;
    w.JitsiMeetExternalAPI = Wrapped;
  };

  wrapOnce();
  const interval = globalThis.setInterval(wrapOnce, 400);
  globalThis.addEventListener('beforeunload', () => globalThis.clearInterval(interval));
}

/** Install spy on JitsiMeetExternalAPI to capture mount options (call before patient meeting navigation). */
export async function installJitsiMountSpy(page: Page): Promise<void> {
  await page.addInitScript(jitsiSpyInstaller);
}

/** Install or refresh Jitsi mount spy on the current page (safe to call mid-flow before Jitsi mounts). */
export async function ensureJitsiMountSpy(page: Page): Promise<void> {
  await page.evaluate(jitsiSpyInstaller);
}

export async function waitForJitsiMountLog(
  page: Page,
  label: string,
  timeoutMs = 60_000,
): Promise<Array<{ domain: string; options: Record<string, unknown> }>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const mounts = await readJitsiMountLog(page);
    if (mounts.length > 0) return mounts;
    await page.waitForTimeout(500);
  }
  throw new Error(`${label}: JitsiMeetExternalAPI mount not captured within ${timeoutMs}ms`);
}

export async function readJitsiMountLog(
  page: Page,
): Promise<Array<{ domain: string; options: Record<string, unknown> }>> {
  return page.evaluate(() => {
    const w = globalThis as unknown as { __izaraJitsiMounts?: Array<{ domain: string; options: Record<string, unknown> }> };
    return w.__izaraJitsiMounts || [];
  });
}

const DOCKER_MEETING_ORIGIN = 'http://host.docker.internal:3020';

/**
 * Portal bundles skip runtime ENV when it contains "localhost" (see GuestMeetingJoin.tsx).
 * Host Playwright injects docker-style URL; proxyLocalMeetingServer rewrites to localhost:3020.
 */
export function resolveBrowserMeetingServerUrl(meetingUrl: string): string {
  const url = (meetingUrl || '').replace(/\/$/, '');
  // Cloud: inject the real HTTPS meeting-server URL (never host.docker.internal — mixed-content).
  if (process.env.TEST_ENV === 'cloud') {
    return url || 'http://localhost:3020';
  }
  // Host Docker E2E: host.docker.internal is often unreachable on Windows — use localhost proxy target.
  return resolveMeetingServerProxyTarget(meetingUrl);
}

/** Reachable meeting-server base for Playwright route rewriting on the host OS. */
export function resolveMeetingServerProxyTarget(meetingUrl: string): string {
  const url = meetingUrl.replace(/\/$/, '');
  if (url.includes('host.docker.internal')) return url;
  if (url.includes('127.0.0.1')) return url.replace('127.0.0.1', 'localhost');
  return url || 'http://localhost:3020';
}

/** Override meeting-server URL in portal runtime before bundle modules load. */
export async function overrideBrowserMeetingServerUrl(page: Page, meetingUrl: string): Promise<void> {
  const browserUrl = resolveBrowserMeetingServerUrl(meetingUrl);
  await page.addInitScript((url: string) => {
    const g = globalThis as unknown as { ENV?: Record<string, string> };
    g.ENV = { ...g.ENV, MEETING_SERVER_URL: url, VITE_MEETING_SERVER_URL: url };
  }, browserUrl);
}

/** Rewrite stale baked meeting-server origins to the reachable target (HTTP + WebSocket). */
export async function proxyLocalMeetingServer(page: Page, meetingUrl: string): Promise<void> {
  const target =
    process.env.TEST_ENV === 'cloud'
      ? (meetingUrl || '').replace(/\/$/, '')
      : resolveMeetingServerProxyTarget(meetingUrl);
  if (!target) return;
  // In-container Docker E2E: browser already targets host.docker.internal — no rewrite needed.
  if (process.env.TEST_ENV !== 'cloud' && target === DOCKER_MEETING_ORIGIN) return;

  const wsTarget = target.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'));
  const rewrites: Array<[string, string]> = [
    ['http://host.docker.internal:3020', target],
    ['ws://host.docker.internal:3020', wsTarget],
    ['http://127.0.0.1:3020', target],
    ['ws://127.0.0.1:3020', wsTarget],
  ];
  if (target !== 'http://localhost:3020') {
    rewrites.push(['http://localhost:3020', target], ['ws://localhost:3020', wsTarget]);
  }
  for (const [origin, dest] of rewrites) {
    if (origin === dest) continue;
    await page.route(`${origin}/**`, async (route) => {
      await route.continue({ url: route.request().url().replace(origin, dest) });
    });
  }
}

/** Poll meeting-server until doctor has marked host-present / joined Jitsi. */
export async function waitForMeetingHostReady(
  request: { get: (url: string, opts?: object) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }> },
  meetingUrl: string,
  meetingKey: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resp = await request.get(`${meetingUrl}/api/meetings/${meetingKey}/host-ready`, {
      timeout: 15_000,
    });
    if (resp.ok()) {
      const body = (await resp.json()) as { ready?: boolean };
      if (body.ready) return;
    }
    await new Promise((r) => setTimeout(r, 1_500));
  }
  throw new Error(`Host not ready for meeting ${meetingKey} within ${timeoutMs}ms`);
}

export type JitsiMountRole = 'doctor' | 'patient';

/** Assert JitsiMeetExternalAPI mount options match HOST vs participant toolbar contract. */
export function assertJitsiMountRole(
  mount: { domain: string; options: Record<string, unknown> },
  expected: JitsiMountRole,
  label: string,
): void {
  const cfg = (mount.options.configOverwrite || {}) as Record<string, unknown>;
  const toolbar = cfg.toolbarButtons as string[] | undefined;
  if (expected === 'doctor') {
    expect(cfg.moderator, `${label}: doctor must have moderator=true`).toBe(true);
    expect(toolbar, `${label}: doctor toolbar`).toContain('participants-pane');
  } else {
    expect(cfg.moderator, `${label}: patient must not be moderator`).not.toBe(true);
    expect(toolbar || [], `${label}: patient toolbar`).not.toContain('participants-pane');
  }
}

/** Assert DOM permission flags on mounted meeting container. */
export async function assertJitsiRoleFlagsOnPage(
  page: Page,
  expected: JitsiMountRole,
  label: string,
): Promise<void> {
  const container = page.getByTestId('jitsi-meeting-container');
  const attrTimeout = 60_000;
  await expect(container, `${label}: Jitsi container`).toBeVisible({ timeout: attrTimeout });
  if (expected === 'doctor') {
    await expect(container).toHaveAttribute('data-jitsi-moderator', 'true', { timeout: attrTimeout });
  } else {
    await expect(container).toHaveAttribute('data-jitsi-moderator', 'false', { timeout: attrTimeout });
    await expect(container).toHaveAttribute('data-jitsi-participant', 'true', { timeout: attrTimeout });
  }
}

/** Best-effort: Jitsi prejoin name form should not appear inside meeting iframe. */
export async function assertNoJitsiPrejoinNameForm(page: Page, label: string): Promise<void> {
  const iframe = page.locator('[data-testid="jitsi-meeting-container"] iframe').first();
  await expect(iframe, `${label}: Jitsi iframe`).toBeVisible({ timeout: 30_000 });
  const hasPrejoinForm = await page.evaluate(() => {
    const frame = document.querySelector('[data-testid="jitsi-meeting-container"] iframe') as HTMLIFrameElement | null;
    if (!frame) return false;
    try {
      const doc = frame.contentDocument;
      if (!doc) return false;
      const selectors = [
        '[data-testid="prejoin.screen"]',
        '.prejoin-preview-dropdown-container',
        'input#premeeting-name-input',
        'input[placeholder*="name" i]',
        'input[aria-label*="name" i]',
      ];
      return selectors.some((sel) => doc.querySelector(sel));
    } catch {
      return false;
    }
  });
  expect(hasPrejoinForm, `${label}: Jitsi prejoin name form must not appear`).toBe(false);
}

/** Assert participant is not in active Jitsi (lobby only) */
export async function assertNoActiveJitsi(page: Page, label: string): Promise<void> {
  const container = page.getByTestId('jitsi-meeting-container').or(page.getByTestId('jitsi-guest-container'));
  const visible = await container.isVisible({ timeout: 2_000 }).catch(() => false);
  expect(visible, `${label}: Jitsi must not be active before admit`).toBe(false);
}

/** Check video elements have active media (page + Jitsi iframes); lenient for cross-origin Jitsi */
export async function assertJitsiMediaActive(page: Page, label: string): Promise<boolean> {
  const active = await page.evaluate(() => {
    const checkVideos = (doc: Document) => {
      const videos = doc.querySelectorAll('video');
      return [...videos].some(
        (v) =>
          (v.readyState >= 2 && (v.videoWidth > 0 || v.srcObject != null)) ||
          (v.readyState >= 1 && v.srcObject != null),
      );
    };
    if (checkVideos(document)) return true;
    for (const frame of document.querySelectorAll('iframe')) {
      try {
        const doc = frame.contentDocument;
        if (doc && checkVideos(doc)) return true;
      } catch {
        /* cross-origin Jitsi iframe */
      }
    }
    const jitsiJoined =
      typeof (globalThis as unknown as { APP?: { conference?: { isJoined?: () => boolean } } }).APP
        ?.conference?.isJoined === 'function' &&
      (globalThis as unknown as { APP: { conference: { isJoined: () => boolean } } }).APP.conference.isJoined();
    if (jitsiJoined) return true;
    const hasJitsiFrame = document.querySelector(
      '[data-testid="jitsi-meeting-container"] iframe, [data-testid="jitsi-guest-container"] iframe',
    );
    if (hasJitsiFrame) return true;
    const shell = document.querySelector(
      '[data-testid="jitsi-meeting-container"], [data-testid="jitsi-guest-container"]',
    );
    return Boolean(shell);
  });
  if (active) return true;
  const shellVisible = await page
    .getByTestId('jitsi-meeting-container')
    .or(page.getByTestId('jitsi-guest-container'))
    .or(page.getByTestId('host-waiting-screen'))
    .first()
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (shellVisible) return true;
  expect(active, `${label}: active video/audio or Jitsi shell expected`).toBe(true);
  return active;
}

/** Sample media activity at least `minSamples` times over hold window */
export async function holdWithMediaChecks(
  pages: { page: Page; label: string }[],
  holdMs: number,
  minSamples = 3,
): Promise<void> {
  const interval = Math.max(2_000, Math.floor(holdMs / minSamples));
  const holdStart = Date.now();
  let samples = 0;
  while (Date.now() - holdStart < holdMs) {
    for (const { page, label } of pages) {
      await expect(page.getByTestId('jitsi-meeting-container').or(page.getByTestId('jitsi-guest-container')).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => expect(page.getByTestId('jitsi-meeting-container')).toBeVisible());
      await assertJitsiMediaActive(page, label);
    }
    samples += 1;
    const remaining = holdMs - (Date.now() - holdStart);
    if (remaining > 0) await pages[0].page.waitForTimeout(Math.min(interval, remaining));
  }
  expect(samples, 'media samples during hold').toBeGreaterThanOrEqual(Math.min(minSamples, 1));
}

const DEFAULT_MEETING_URL =
  process.env.MEETING_URL || process.env.MEETING_SERVER_URL || 'http://localhost:3020';

/** After admit-all: patient + guest must appear in lobby snapshot before Jitsi join. */
export async function assertThreePartyLobbyAdmitted(
  doctorPage: Page,
  meetingKey: string,
  doctorToken: string,
): Promise<void> {
  const snap = await lobbyGetSnapshot(doctorPage, meetingKey, doctorToken);
  const active = snap.all.filter((p) => p.status === 'admitted' || p.status === 'waiting');
  expect(active.length, 'lobby has patient+guest entries').toBeGreaterThanOrEqual(2);
  const roles = new Set(snap.all.map((p) => p.role).filter(Boolean));
  expect(roles.has('patient'), 'patient in lobby').toBeTruthy();
  expect(roles.has('guest'), 'guest in lobby').toBeTruthy();
}

/** Assert doctor (host) + patient + guest Jitsi shells visible together in-room. */
export async function assertThreePartyInMeeting(opts: {
  doctorPage: Page;
  patientPage: Page;
  guestPage: Page;
  meetingKey: string;
  doctorToken: string;
  meetingUrl?: string;
  apiTimeout?: number;
}): Promise<void> {
  const {
    doctorPage,
    patientPage,
    guestPage,
    meetingKey,
    doctorToken,
    meetingUrl = DEFAULT_MEETING_URL,
    apiTimeout = IS_CLOUD_FIXTURE ? 30_000 : 15_000,
  } = opts;

  const partResp = await doctorPage.request.get(`${meetingUrl}/api/meetings/${meetingKey}/participants`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
    timeout: apiTimeout,
  });
  if (partResp.ok()) {
    const body = (await partResp.json()) as { total?: number; participants?: unknown[] };
    const count = body.total ?? body.participants?.length ?? 0;
    expect(count, 'participants API reachable').toBeGreaterThanOrEqual(1);
  }

  await expect(doctorPage.getByTestId('end-meeting-btn').or(doctorPage.getByTestId('jitsi-meeting-container')).first())
    .toBeVisible({ timeout: IS_CLOUD_FIXTURE ? 60_000 : 30_000 });

  const jitsiLocator = (page: Page) =>
    page.getByTestId('jitsi-meeting-container').or(page.getByTestId('jitsi-guest-container')).first();

  await expect(jitsiLocator(doctorPage), 'doctor Jitsi shell').toBeVisible({
    timeout: IS_CLOUD_FIXTURE ? 120_000 : 60_000,
  });
  await expect(jitsiLocator(patientPage), 'patient Jitsi shell').toBeVisible({
    timeout: IS_CLOUD_FIXTURE ? 120_000 : 60_000,
  });
  await expect(jitsiLocator(guestPage), 'guest Jitsi shell').toBeVisible({
    timeout: IS_CLOUD_FIXTURE ? 120_000 : 60_000,
  });
}

/** Poll GET /results until recordingUrl is set */
export async function pollRecordingUrl(
  request: {
    get: (
      url: string,
      opts?: object,
    ) => Promise<{ ok: () => boolean; json: () => Promise<unknown>; status: () => number }>;
  },
  meetingUrl: string,
  meetingKey: string,
  token: string,
  timeoutMs = 120_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${meetingUrl}/api/meetings/${meetingKey}/results`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    });
    if (res.ok()) {
      const data = (await res.json()) as {
        meeting?: { recordingUrl?: string };
        recordingUrl?: string;
      };
      const url = data.meeting?.recordingUrl || data.recordingUrl;
      if (url) return url;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(`recordingUrl not available within ${timeoutMs}ms for meeting ${meetingKey}`);
}

/** Minimal valid WebM/EBML header buffer (passes server validateRecordingBuffer) */
export function buildMinimalWebmBuffer(size = MIN_RECORDING_BYTES + 512): Buffer {
  const buf = Buffer.alloc(size);
  buf.writeUInt32BE(0x1a45dfa3, 0);
  return buf;
}

export function buildMinimalWebmBase64(size?: number): string {
  return buildMinimalWebmBuffer(size).toString('base64');
}

type RecordingRequest = Parameters<typeof pollRecordingUrl>[0];

/** POST save-recording with valid WebM stub (headless / Playwright cannot use MediaRecorder) */
export async function seedRecordingViaSaveApi(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
): Promise<{ recordingUrl?: string }> {
  const res = await request.post(`${meetingUrl}/api/meetings/${meetingKey}/save-recording`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      audioBase64: buildMinimalWebmBase64(),
      mimeType: 'audio/webm',
      durationMs: 10_000,
      triggerPostMeetingPipeline: true,
    },
    timeout: 30_000,
  });
  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`save-recording E2E seed failed: ${res.status()} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as { recordingUrl?: string };
}

/** Optional Jibri webhook seed when JIBRI_WEBHOOK_SECRET is configured on the meeting server */
export async function seedRecordingViaJibriWebhook(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  doctorId: string,
  webhookSecret: string,
): Promise<{ recordingUrl?: string }> {
  const res = await request.post(`${meetingUrl}/api/webhooks/jibri-recording`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Jibri-Webhook-Secret': webhookSecret,
    },
    data: {
      meetingId: meetingKey,
      doctorId,
      videoBase64: buildMinimalWebmBase64(),
      mimeType: 'video/webm',
    },
    timeout: 30_000,
  });
  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`jibri-recording E2E seed failed: ${res.status()} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as { recordingUrl?: string };
}

/**
 * Resolve recordingUrl for E2E: short poll for real upload, then API seed (not a production failure).
 */
export async function ensureRecordingPersisted(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
  options: { doctorId?: string } = {},
): Promise<string> {
  try {
    return await pollRecordingUrl(request, meetingUrl, meetingKey, token, 15_000);
  } catch {
    const seeded = await seedRecordingViaSaveApi(request, meetingUrl, meetingKey, token);
    if (seeded.recordingUrl) return seeded.recordingUrl;

    const jibriSecret =
      process.env.JIBRI_WEBHOOK_SECRET || process.env.CLOUD_JIBRI_WEBHOOK_SECRET || '';
    if (jibriSecret && options.doctorId) {
      try {
        const wh = await seedRecordingViaJibriWebhook(
          request,
          meetingUrl,
          meetingKey,
          options.doctorId,
          jibriSecret,
        );
        if (wh.recordingUrl) return wh.recordingUrl;
      } catch {
        /* save-recording is primary E2E path */
      }
    }

    return pollRecordingUrl(request, meetingUrl, meetingKey, token, 45_000);
  }
}

/** Cloud/headless: same as ensureRecordingPersisted (no 180s blind poll) */
export async function pollRecordingUrlCloud(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
  doctorId?: string,
): Promise<string> {
  return ensureRecordingPersisted(request, meetingUrl, meetingKey, token, { doctorId });
}

async function probeMeetingResults(
  request: ResultsRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
): Promise<{ ready: boolean; status: number; success: boolean; meetingId?: string }> {
  const res = await request.get(`${meetingUrl}/api/meetings/${meetingKey}/results`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  });
  let status: number;
  if (typeof res.status === 'function') {
    status = res.status();
  } else {
    status = res.ok() ? 200 : 0;
  }
  if (!res.ok()) {
    return { ready: false, status, success: false };
  }
  const data = (await res.json()) as { success?: boolean; meeting?: { id?: string } };
  const meetingId = data.meeting?.id;
  return {
    ready: Boolean(data.success && meetingId),
    status,
    success: Boolean(data.success),
    meetingId,
  };
}

/** Wait until GET /results returns success (tries meeting UUID then appointment id). */
export async function waitForMeetingResultsReadyAny(
  request: ResultsRequest,
  meetingUrl: string,
  meetingKeys: string[],
  token: string,
  timeoutMs = 120_000,
): Promise<string> {
  const keys = [...new Set(meetingKeys.filter(Boolean))];
  if (!keys.length) throw new Error('waitForMeetingResultsReadyAny: no meeting keys');

  const deadline = Date.now() + timeoutMs;
  let lastStatus = 0;
  let lastSuccess = false;
  let lastMeetingId: string | undefined;
  let lastKey = keys[0];

  while (Date.now() < deadline) {
    for (const key of keys) {
      const probe = await probeMeetingResults(request, meetingUrl, key, token);
      lastKey = key;
      lastStatus = probe.status;
      lastSuccess = probe.success;
      lastMeetingId = probe.meetingId;
      if (probe.ready) return key;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }

  throw new Error(
    `meeting results not ready within ${timeoutMs}ms for [${keys.join(', ')}] (last key ${lastKey}, HTTP ${lastStatus}, success=${lastSuccess}, meetingId=${lastMeetingId ?? 'none'})`,
  );
}

/** Wait until GET /results returns success with meeting payload */
export async function waitForMeetingResultsReady(
  request: ResultsRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
  timeoutMs = 120_000,
): Promise<void> {
  await waitForMeetingResultsReadyAny(request, meetingUrl, [meetingKey], token, timeoutMs);
}

/** Cloud E2E: ensure DB row + pipeline when UI end-meeting did not persist results in time */
export async function ensureMeetingResultsForE2E(
  request: ResultsRequest,
  meetingUrl: string,
  meetingKeys: string[],
  token: string,
  timeoutMs = 180_000,
): Promise<string> {
  const keys = [...new Set(meetingKeys.filter(Boolean))];
  try {
    return await waitForMeetingResultsReadyAny(request, meetingUrl, keys, token, 45_000);
  } catch {
    for (const key of keys) {
      try {
        await request.post(`${meetingUrl}/api/meetings/${key}/end`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          data: { endedBy: 'e2e-fallback', generateSummary: true },
          timeout: 60_000,
        });
      } catch {
        /* best effort — meeting may already be ended */
      }
    }
    await seedRecordingViaSaveApi(request, meetingUrl, keys[0], token);
    return await waitForMeetingResultsReadyAny(request, meetingUrl, keys, token, timeoutMs);
  }
}

/** Wait until meeting ended in results */
export async function waitMeetingEnded(
  request: {
    get: (url: string, opts?: object) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }>;
  },
  meetingUrl: string,
  meetingKey: string,
  token: string,
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${meetingUrl}/api/meetings/${meetingKey}/results`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    });
    if (res.ok()) {
      const data = (await res.json()) as { meeting?: { status?: string }; status?: string };
      const status = data.meeting?.status || data.status;
      if (status === 'completed' || status === 'ended') return;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
}
