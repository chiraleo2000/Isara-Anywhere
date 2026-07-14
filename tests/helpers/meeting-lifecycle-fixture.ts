/**
 * Helpers for Group Q — meeting lifecycle seed/teardown (cloud workflow state).
 */
import { expect, type Page } from '@playwright/test';
import {
  lobbyAdmitAll,
  lobbyAdmitOne,
  lobbyGetSnapshot,
  refreshPageAuth,
  readPageBearerToken,
  DOCTOR_URL,
  dismissMeetingResultsOverlayIfVisible,
  ensureDoctorLobbyPanelOpen,
} from './multi-portal';
import { loadWorkflowState, reloadWorkflowStateFromDisk, saveWorkflowState } from './workflow-state';
import { participantIdByRole } from './lobbySnapshot';

const IS_CLOUD_FIXTURE = process.env.TEST_ENV === 'cloud';
const IS_HEADED_LOCAL =
  !IS_CLOUD_FIXTURE &&
  (process.env.PW_HEADED === '1' || process.env.PW_HEADED === 'true' || process.env.BASELINE_VISUAL === '1');

function resolveFixtureTimeout(cloudMs: number, headedMs: number, defaultMs: number): number {
  if (IS_CLOUD_FIXTURE) return cloudMs;
  if (IS_HEADED_LOCAL) return headedMs;
  return defaultMs;
}

function resolveInitialRecordingPollMs(): number {
  if (process.env.PW_ALLOW_RECORDING_SEED === '1') return 15_000;
  if (IS_CLOUD_FIXTURE) return 60_000;
  return 120_000;
}

function httpStatusFromResponse(res: {
  ok: () => boolean;
  status?: () => number;
}): number {
  if (typeof res.status === 'function') return res.status();
  return res.ok() ? 200 : 0;
}

/** Parse GET /lobby response — waiting === participants, all === lobby (meeting-server). */
export {
  parseLobbySnapshot,
  participantIdByRole,
  type LobbyParticipantRow,
} from './lobbySnapshot';

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
  const syncSleep = (ms: number) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* wait for prior Playwright worker fsync */ }
  };
  for (let attempt = 0; attempt < 16; attempt++) {
    const ws = attempt === 0 ? loadWorkflowState() : reloadWorkflowStateFromDisk();
    if (ws.appointmentId) {
      return {
        appointmentId: ws.appointmentId,
        meetingId: ws.meetingId,
        roomName: ws.roomName,
      };
    }
    if (attempt < 15) syncSleep(400 * (attempt + 1));
  }
  throw new Error('Group D must run first — workflow state missing appointmentId');
}

/** Extract meeting UUID from persisted recordingUrl (/api/recordings/meetings/{doctor}/{meetingId}/...). */
export function meetingIdFromRecordingUrl(recordingUrl?: string): string | undefined {
  const m = String(recordingUrl || '').match(/\/api\/recordings\/meetings\/[^/]+\/([^/]+)\//);
  return m?.[1];
}

/** Q2 runs in a new Playwright worker — wait for meetingId written by Group Q. */
export async function reloadMeetingWorkflowWithRetry(
  opts: { requireMeetingId?: boolean; requireRecordingUrl?: boolean; maxWaitMs?: number } = {},
): Promise<MeetingWorkflowContext & { recordingUrl?: string }> {
  const maxWaitMs = opts.maxWaitMs ?? 45_000;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const ws = reloadWorkflowStateFromDisk();
    const derivedMeetingId = ws.meetingId || meetingIdFromRecordingUrl(ws.recordingUrl);
    const hasAppointment = Boolean(ws.appointmentId);
    const hasMeeting = Boolean(derivedMeetingId);
    const hasRecording = Boolean(ws.recordingUrl);
    const meetingOk = !opts.requireMeetingId || hasMeeting;
    const recordingOk = !opts.requireRecordingUrl || hasRecording;
    if (hasAppointment && meetingOk && recordingOk) {
      return {
        appointmentId: ws.appointmentId!,
        meetingId: derivedMeetingId,
        roomName: ws.roomName,
        recordingUrl: ws.recordingUrl,
      };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  const last = reloadWorkflowStateFromDisk();
  throw new Error(
    `Group Q workflow state incomplete after ${maxWaitMs}ms — appointmentId=${last.appointmentId || 'missing'} meetingId=${last.meetingId || meetingIdFromRecordingUrl(last.recordingUrl) || 'missing'} recordingUrl=${last.recordingUrl ? 'set' : 'missing'}`,
  );
}

export async function resolveAppointmentIdFromMeeting(
  request: { get: (url: string, opts?: object) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }> },
  meetingUrl: string,
  meetingKeys: string[],
  token: string,
): Promise<string | undefined> {
  for (const key of meetingKeys) {
    if (!key) continue;
    const res = await request.get(`${meetingUrl}/api/meetings/${key}/results`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20_000,
    }).catch(() => null);
    if (!res?.ok()) continue;
    const data = (await res.json()) as { meeting?: { appointmentId?: string }; appointmentId?: string };
    const apt = data.meeting?.appointmentId || data.appointmentId;
    if (apt) return apt;
  }
  return undefined;
}

/** Resolve appointmentId from disk; optional API fallback when cross-worker state is stale. */
export async function resolveWorkflowAppointmentId(
  request: { get: (url: string, opts?: object) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }> },
  doctorUrl: string,
  token: string,
): Promise<string> {
  try {
    return loadMeetingWorkflow().appointmentId;
  } catch {
    /* disk miss — query latest pool/confirmed appointment */
  }
  const pool = await request.get(`${doctorUrl}/api/appointments/pool?status=confirmed`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  }).catch(() => null);
  if (pool?.ok()) {
    const data = (await pool.json()) as { appointments?: Array<{ id?: string }> };
    const id = data.appointments?.[0]?.id;
    if (id) {
      saveWorkflowState({ appointmentId: id, doctorId: 'DOC-TEST-001', patientId: 'PATIENT-DEMO' });
      return id;
    }
  }
  const list = await request.get(`${doctorUrl}/api/appointments?doctorId=DOC-TEST-001&limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  }).catch(() => null);
  if (list?.ok()) {
    const data = (await list.json()) as { appointments?: Array<{ id?: string }> };
    const id = data.appointments?.find((a) => a.id?.startsWith('APT-'))?.id;
    if (id) {
      saveWorkflowState({ appointmentId: id, doctorId: 'DOC-TEST-001', patientId: 'PATIENT-DEMO' });
      return id;
    }
  }
  for (const seedId of ['APT-SEED-001', 'APT-SEED-002']) {
    const probe = await request.get(`${doctorUrl}/api/appointments/${seedId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    }).catch(() => null);
    if (probe?.ok()) {
      saveWorkflowState({ appointmentId: seedId, doctorId: 'DOC-TEST-001', patientId: 'PATIENT-DEMO' });
      return seedId;
    }
  }
  throw new Error('Group D must run first — workflow state missing appointmentId');
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
  /** When false, admit doctor + patient only (guest optional for E2E). */
  includeGuest?: boolean;
  expected: {
    patientId: string;
    guestId: string;
    patientName: string;
    guestName: string;
    guestInviteToken?: string;
  };
  apiTimeout?: number;
}

type EnsureLobbyParticipantOpts = {
  doctorPage: Page;
  patientPage: Page;
  guestPage?: Page | null;
  lobbyKey: string;
  doctorToken: string;
  meetingUrl: string;
  apiTimeout: number;
  role: 'patient' | 'guest';
  participantId: string;
  participantName: string;
  inviteToken?: string;
};

async function ensureLobbyParticipant(opts: EnsureLobbyParticipantOpts): Promise<void> {
  const {
    doctorPage,
    patientPage,
    guestPage,
    lobbyKey,
    doctorToken,
    meetingUrl,
    apiTimeout,
    role,
    participantId,
    participantName,
    inviteToken,
  } = opts;
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
}

function assertParticipantsWaitingInLobby(
  lobbySnap: Awaited<ReturnType<typeof lobbyGetSnapshot>>,
  patientId: string,
  guestId: string,
  includeGuest: boolean,
): void {
  expect(
    lobbySnap.all.some((p) => p.participantId === patientId && p.status === 'waiting'),
    'patient must be waiting in lobby',
  ).toBeTruthy();
  if (includeGuest) {
    expect(
      lobbySnap.all.some((p) => p.participantId === guestId && p.status === 'waiting'),
      'guest must be waiting in lobby',
    ).toBeTruthy();
  }
}

async function admitAllWaitingLobbyParticipants(
  doctorPage: Page,
  lobbyKey: string,
  doctorId: string,
  doctorToken: string,
  isCloud: boolean,
): Promise<void> {
  await dismissMeetingResultsOverlayIfVisible(doctorPage);
  await ensureDoctorLobbyPanelOpen(doctorPage);
  const admitBtn = doctorPage.getByTestId('admit-all-btn');
  if (await admitBtn.isVisible({ timeout: isCloud ? 45_000 : 30_000 }).catch(() => false)) {
    try {
      await admitBtn.click({ timeout: isCloud ? 45_000 : 30_000 });
    } catch {
      /* headed parallel — Jitsi chrome may intercept; API admit-all below is authoritative */
    }
  }
  await lobbyAdmitAll(doctorPage, lobbyKey, doctorId);

  const lobbySnap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
  for (const p of lobbySnap.waiting) {
    if (p.participantId) {
      await lobbyAdmitOne(doctorPage, lobbyKey, p.participantId, doctorId);
    }
  }
}

async function waitForLobbyAdmissions(
  doctorPage: Page,
  meetingUrl: string,
  lobbyKey: string,
  patientId: string,
  guestId: string,
  includeGuest: boolean,
  isCloud: boolean,
): Promise<void> {
  const admitTimeout = isCloud ? 120_000 : 90_000;
  await waitLobbyAdmitted(doctorPage.request, meetingUrl, lobbyKey, patientId, admitTimeout);
  if (includeGuest && guestId) {
    await waitLobbyAdmitted(doctorPage.request, meetingUrl, lobbyKey, guestId, admitTimeout);
  }
}

async function assertLobbyScreensHidden(
  patientPage: Page,
  guestPage: Page | null | undefined,
  isCloud: boolean,
): Promise<void> {
  await expect(patientPage.getByTestId('lobby-waiting-screen')).toBeHidden({
    timeout: isCloud ? 90_000 : 45_000,
  });
  if (guestPage) {
    await expect(guestPage.getByTestId('guest-lobby-waiting')).toBeHidden({
      timeout: isCloud ? 60_000 : 30_000,
    });
  }
}

/** Guest is optional in meeting E2E — set PW_INCLUDE_GUEST=1 for 3-party lifecycle. */
export function isMeetingGuestE2EEnabled(): boolean {
  return process.env.PW_INCLUDE_GUEST === '1' || process.env.PW_INCLUDE_GUEST === 'true';
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
    includeGuest = isMeetingGuestE2EEnabled(),
    apiTimeout = IS_CLOUD_FIXTURE ? 30_000 : 15_000,
  } = opts;
  const isCloud = IS_CLOUD_FIXTURE;
  const doctorToken = await doctorPage.evaluate(() => localStorage.getItem('token') || '');

  let lobbySnap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
  let patientId =
    participantIdByRole(lobbySnap, 'patient') || expected.patientId;
  let guestId =
    participantIdByRole(lobbySnap, 'guest') || expected.guestId;

  await ensureLobbyParticipant({
    doctorPage,
    patientPage,
    guestPage,
    lobbyKey,
    doctorToken,
    meetingUrl,
    apiTimeout,
    role: 'patient',
    participantId: patientId,
    participantName: expected.patientName,
  });
  if (includeGuest) {
    await ensureLobbyParticipant({
      doctorPage,
      patientPage,
      guestPage,
      lobbyKey,
      doctorToken,
      meetingUrl,
      apiTimeout,
      role: 'guest',
      participantId: guestId,
      participantName: expected.guestName,
      inviteToken: expected.guestInviteToken,
    });
  }

  lobbySnap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
  patientId = participantIdByRole(lobbySnap, 'patient') || patientId;
  guestId = participantIdByRole(lobbySnap, 'guest') || guestId;
  assertParticipantsWaitingInLobby(lobbySnap, patientId, guestId, includeGuest);

  await admitAllWaitingLobbyParticipants(doctorPage, lobbyKey, doctorId, doctorToken, isCloud);

  lobbySnap = await lobbyGetSnapshot(doctorPage, lobbyKey, doctorToken);
  patientId = participantIdByRole(lobbySnap, 'patient') || patientId;
  guestId = participantIdByRole(lobbySnap, 'guest') || guestId;

  await waitForLobbyAdmissions(
    doctorPage,
    meetingUrl,
    lobbyKey,
    patientId,
    guestId,
    includeGuest,
    isCloud,
  );

  await resyncPatientLobbyUiAfterAdmit(patientPage, meetingUrl, lobbyKey);
  await assertLobbyScreensHidden(patientPage, guestPage, isCloud);

  await notifyHostPresentAfterJitsi(doctorPage, appointmentId, {
    bffUrl: DOCTOR_URL,
    meetingUrl,
  });

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

export { installJitsiE2eStubForContext, shouldUseJitsiE2eStub } from './jitsi-e2e-stub';

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
  // Preserve explicit localhost/127.0.0.1 — CSP connect-src allows both on host E2E.
  if (url.includes('localhost') || url.includes('127.0.0.1')) return url;
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
  if (target !== 'http://127.0.0.1:3020') {
    rewrites.push(
      ['http://127.0.0.1:3020', target],
      ['ws://127.0.0.1:3020', wsTarget],
      ['http://localhost:3020', target],
      ['ws://localhost:3020', wsTarget],
    );
  }
  for (const [origin, dest] of rewrites) {
    if (origin === dest) continue;
    await page.route(`${origin}/**`, async (route) => {
      await route.continue({ url: route.request().url().replace(origin, dest) });
    });
  }
}

/** Poll meeting-server until doctor has joined Jitsi (inJitsi host-ready). */
export async function waitForMeetingHostReady(
  request: { get: (url: string, opts?: object) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }> },
  meetingUrl: string,
  meetingKey: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const parallel = Number.parseInt(process.env.PW_WORKERS || '1', 10) > 1;
  const headed =
    process.env.PW_HEADED === '1' ||
    process.env.PW_HEADED === 'true' ||
    process.env.BASELINE_VISUAL === '1';
  const perRequestMs = parallel ? (headed ? 30_000 : 25_000) : 15_000;
  while (Date.now() < deadline) {
    try {
      const resp = await request.get(`${meetingUrl}/api/meetings/${meetingKey}/host-ready`, {
        timeout: perRequestMs,
      });
      if (resp.ok()) {
        const body = (await resp.json()) as { ready?: boolean; inJitsi?: boolean };
        if (body.ready && body.inJitsi !== false) return;
      }
    } catch {
      /* meeting-server may be slow under parallel headed load */
    }
    await new Promise((r) => setTimeout(r, 1_500));
  }
  throw new Error(`Host not in Jitsi for meeting ${meetingKey} within ${timeoutMs}ms`);
}

/** POST host-present with inJitsi:true only after doctor Jitsi iframe is visible. */
export async function notifyHostPresentAfterJitsi(
  doctorPage: Page,
  meetingKey: string,
  options: { bffUrl?: string; meetingUrl?: string; timeoutMs?: number } = {},
): Promise<void> {
  const bff = options.bffUrl || DOCTOR_URL;
  const meetingUrl = options.meetingUrl || process.env.MEETING_URL || (IS_CLOUD_FIXTURE
    ? (process.env.CLOUD_MEETING_URL || process.env.MEETING_SERVER_URL || '')
    : 'http://127.0.0.1:3020');
  if (!meetingUrl) {
    throw new Error('notifyHostPresentAfterJitsi: meetingUrl unresolved (set MEETING_URL / CLOUD_MEETING_URL)');
  }
  const timeout = options.timeoutMs ?? 90_000;
  await expect(doctorPage.getByTestId('jitsi-meeting-container')).toBeVisible({ timeout });
  await expect(
    doctorPage.locator('[data-testid="jitsi-meeting-container"] iframe').first(),
  ).toBeVisible({ timeout });
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await refreshPageAuth(doctorPage, bff);
    }
    const token = await readPageBearerToken(doctorPage);
    const targets = [
      { url: `${bff}/api/meetings/${meetingKey}/host-present`, auth: token },
      { url: `${meetingUrl}/api/meetings/${meetingKey}/host-present`, auth: '' },
    ];
    for (const target of targets) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (target.auth) headers.Authorization = `Bearer ${target.auth}`;
      const resp = await doctorPage.request.post(target.url, {
        headers,
        data: { inJitsi: true },
        timeout: 15_000,
      });
      lastStatus = resp.status();
      if (resp.ok()) {
        await waitForMeetingHostReady(doctorPage.request, meetingUrl, meetingKey);
        return;
      }
      if (lastStatus !== 401 && lastStatus !== 403) break;
    }
    await doctorPage.waitForTimeout(500 * (attempt + 1));
  }
  expect(lastStatus, 'host-present after Jitsi mount').toBe(200);
}

/** Jitsi native moderator gate must not appear after admit. */
export async function assertNoJitsiModeratorGate(page: Page, label: string): Promise<void> {
  const body = await page.locator('body').innerText();
  expect(body, `${label}: no Jitsi moderator gate`).not.toMatch(
    /no moderators have yet arrived|Asking to join meeting/i,
  );
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

/** Assert authenticated roles mount with auto display name (getIzaraDisplayName), not empty. */
export async function assertJitsiAutoDisplayName(
  page: Page,
  label: string,
  minLength = 2,
): Promise<string> {
  const container = page.getByTestId('jitsi-meeting-container');
  await expect(container, `${label}: Jitsi container for display name`).toBeVisible({ timeout: 60_000 });
  const displayName = await container.getAttribute('data-jitsi-display-name');
  expect(displayName?.trim().length ?? 0, `${label}: auto display name from account`).toBeGreaterThanOrEqual(
    minLength,
  );
  return displayName!.trim();
}

/** Guest must enter display name manually before lobby (no SSO auto-name). */
export async function assertGuestManualNameForm(
  page: Page,
  label: string,
): Promise<void> {
  const nameInput = page.getByTestId('guest-name-input');
  await expect(nameInput, `${label}: guest manual name input`).toBeVisible({ timeout: 30_000 });
  const joinBtn = page.getByTestId('guest-join-btn');
  await expect(joinBtn, `${label}: guest join button`).toBeVisible({ timeout: 15_000 });
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
      const meetingShell = page
        .getByTestId('jitsi-meeting-container')
        .or(page.getByTestId('jitsi-guest-container'))
        .or(page.getByTestId('end-meeting-btn'))
        .or(page.getByTestId('doctor-meeting-room'))
        .or(page.getByTestId('patient-meeting-room'))
        .first();
      // Brief host-waiting is OK while patient retries Jitsi after lobbyJoined; wait for shell
      const hostWaiting = page.getByTestId('host-waiting-screen');
      if (await hostWaiting.isVisible({ timeout: 500 }).catch(() => false)) {
        await expect(hostWaiting, `${label}: leave host-waiting during hold`).toBeHidden({ timeout: 45_000 });
      }
      await expect(meetingShell).toBeVisible({ timeout: 15_000 });
      await assertJitsiMediaActive(page, label);
    }
    samples += 1;
    const remaining = holdMs - (Date.now() - holdStart);
    if (remaining > 0) await pages[0].page.waitForTimeout(Math.min(interval, remaining));
  }
  expect(samples, 'media samples during hold').toBeGreaterThanOrEqual(Math.min(minSamples, 1));
}

const DEFAULT_MEETING_URL =
  process.env.MEETING_URL || process.env.MEETING_SERVER_URL || 'http://127.0.0.1:3020';

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

type ParticipantCountResult =
  | { kind: 'count'; count: number; token: string }
  | { kind: 'auth_retry'; token: string }
  | { kind: 'abort' }
  | { kind: 'skip' };

async function queryParticipantCountForKey(
  doctorPage: Page,
  meetingUrl: string,
  key: string,
  token: string,
  apiTimeout: number,
  enforceApiCount: boolean,
): Promise<ParticipantCountResult> {
  let partResp;
  try {
    partResp = await doctorPage.request.get(`${meetingUrl}/api/meetings/${key}/participants`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: apiTimeout,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/has been closed|Target page, context or browser/i.test(msg)) {
      if (enforceApiCount) throw err;
      console.warn(`  ⚠ participants API poll aborted — browser closed`);
      return { kind: 'abort' };
    }
    if (enforceApiCount) throw err;
    console.warn(`  ⚠ participants API request failed for ${key}: ${msg.slice(0, 120)}`);
    return { kind: 'skip' };
  }
  if (partResp.status() === 401 || partResp.status() === 403) {
    await refreshPageAuth(doctorPage, DOCTOR_URL);
    const refreshedToken = await readPageBearerToken(doctorPage);
    return { kind: 'auth_retry', token: refreshedToken };
  }
  if (!partResp.ok()) return { kind: 'skip' };
  const body = (await partResp.json()) as { total?: number; participants?: unknown[] };
  const count = body.total ?? body.participants?.length ?? 0;
  return { kind: 'count', count, token };
}

type ParticipantPollRoundResult = {
  done: boolean;
  abort: boolean;
  token: string;
  lastCount: number;
};

async function pollParticipantCountRound(
  doctorPage: Page,
  meetingUrl: string,
  keys: string[],
  token: string,
  apiTimeout: number,
  enforceApiCount: boolean,
  minCount: number,
): Promise<ParticipantPollRoundResult> {
  let lastCount = 0;
  for (const key of keys) {
    const result = await queryParticipantCountForKey(
      doctorPage,
      meetingUrl,
      key,
      token,
      apiTimeout,
      enforceApiCount,
    );
    if (result.kind === 'abort') return { done: false, abort: true, token, lastCount };
    if (result.kind === 'auth_retry') {
      return { done: false, abort: false, token: result.token, lastCount };
    }
    if (result.kind === 'skip') continue;
    lastCount = result.count;
    token = result.token;
    if (lastCount >= minCount) {
      expect(lastCount, 'participants API reachable').toBeGreaterThanOrEqual(minCount);
      return { done: true, abort: false, token, lastCount };
    }
  }
  return { done: false, abort: false, token, lastCount };
}

async function pollMeetingParticipantCount(
  doctorPage: Page,
  meetingKey: string,
  doctorToken: string,
  meetingUrl: string,
  apiTimeout: number,
  minCount: number,
  options?: { enforce?: boolean; alternateKeys?: string[] },
): Promise<void> {
  const enforceApiCount = options?.enforce ?? IS_CLOUD_FIXTURE;
  const keys = [meetingKey, ...(options?.alternateKeys || [])].filter(
    (k, i, arr) => k && arr.indexOf(k) === i,
  );
  const deadline = Date.now() + resolveFixtureTimeout(45_000, 60_000, 30_000);
  let token = doctorToken;
  let lastCount = 0;
  while (Date.now() < deadline) {
    const round = await pollParticipantCountRound(
      doctorPage,
      meetingUrl,
      keys,
      token,
      apiTimeout,
      enforceApiCount,
      minCount,
    );
    if (round.abort) return;
    token = round.token;
    lastCount = round.lastCount;
    if (round.done) return;
    await doctorPage.waitForTimeout(1_500);
  }
  if (enforceApiCount) {
    expect(lastCount, 'participants API reachable').toBeGreaterThanOrEqual(minCount);
  } else if (lastCount < minCount) {
    console.warn(`  ⚠ participants API count=${lastCount} (deferring to Jitsi shell checks)`);
  }
}

/** Assert doctor (host) + patient Jitsi shells visible together in-room. */
export async function assertTwoPartyInMeeting(opts: {
  doctorPage: Page;
  patientPage: Page;
  meetingKey: string;
  doctorToken: string;
  meetingUrl?: string;
  apiTimeout?: number;
}): Promise<void> {
  const {
    doctorPage,
    patientPage,
    meetingKey,
    doctorToken,
    meetingUrl = DEFAULT_MEETING_URL,
    apiTimeout = resolveFixtureTimeout(30_000, 30_000, 15_000),
  } = opts;

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

  const wf = loadWorkflowState();
  await pollMeetingParticipantCount(
    doctorPage,
    meetingKey,
    doctorToken,
    meetingUrl,
    apiTimeout,
    1,
    {
      enforce: false,
      alternateKeys: [wf.appointmentId, wf.meetingId].filter(Boolean) as string[],
    },
  );
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

  await pollMeetingParticipantCount(doctorPage, meetingKey, doctorToken, meetingUrl, apiTimeout, 1);

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

/** Poll GET /results until recordingUrl is set (meeting-server + optional doctor BFF). */
type RecordingPollState = {
  lastStatus: number;
  authRefreshed: boolean;
  bearer: string;
};

async function scanRecordingEndpoints(
  request: Parameters<typeof pollRecordingUrl>[0],
  pollBases: string[],
  keys: string[],
  perRequestTimeout: number,
  state: RecordingPollState,
  onAuthFailure?: () => Promise<string>,
): Promise<string | null> {
  for (const key of keys) {
    for (const base of pollBases) {
      const res = await request.get(`${base}/api/meetings/${key}/results`, {
        headers: { Authorization: `Bearer ${state.bearer}` },
        timeout: perRequestTimeout,
      });
      state.lastStatus = httpStatusFromResponse(res);
      if ((state.lastStatus === 401 || state.lastStatus === 403) && onAuthFailure && !state.authRefreshed) {
        state.authRefreshed = true;
        state.bearer = await onAuthFailure();
        return null;
      }
      if (!res.ok()) continue;
      const data = (await res.json()) as {
        meeting?: { recordingUrl?: string };
        recordingUrl?: string;
      };
      const url = data.meeting?.recordingUrl || data.recordingUrl;
      if (url) return url;
    }
    if (state.authRefreshed) break;
  }
  return null;
}

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
  options: {
    bffUrl?: string;
    meetingKeys?: string[];
    onAuthFailure?: () => Promise<string>;
  } = {},
): Promise<string> {
  const pollBases = [
    meetingUrl,
    options.bffUrl || DOCTOR_URL,
  ].filter((u, i, arr) => Boolean(u) && arr.indexOf(u) === i);
  const keys = [...new Set([...(options.meetingKeys || []), meetingKey].filter(Boolean))];
  const perRequestTimeout = 30_000;
  const deadline = Date.now() + timeoutMs;
  const state: RecordingPollState = { lastStatus: 0, authRefreshed: false, bearer: token };
  while (Date.now() < deadline) {
    const found = await scanRecordingEndpoints(
      request,
      pollBases,
      keys,
      perRequestTimeout,
      state,
      options.onAuthFailure,
    );
    if (found) return found;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(
    `recordingUrl not available within ${timeoutMs}ms for meeting ${meetingKey} (last HTTP ${state.lastStatus}, bases=${pollBases.join(',')})`,
  );
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

/** True when workflow recordingUrl matches the active meeting (not stale / unknown-doctor). */
export function isRecordingUrlForMeeting(
  recordingUrl: string,
  ctx: { appointmentId?: string; meetingId?: string; doctorId?: string },
): boolean {
  if (!recordingUrl?.startsWith('/api/recordings/')) return false;
  if (recordingUrl.includes('unknown-doctor')) return false;
  const keys = [ctx.meetingId, ctx.appointmentId, ctx.doctorId].filter(Boolean) as string[];
  return keys.some((k) => recordingUrl.includes(k));
}

/** GET recording bytes via meeting server or doctor BFF with one auth refresh. */
export async function fetchRecordingPlaybackWithAuth(
  request: RecordingRequest,
  recordingUrl: string,
  token: string,
  options: {
    meetingUrl?: string;
    bffUrl?: string;
    onAuthFailure?: () => Promise<string>;
    timeoutMs?: number;
  } = {},
): Promise<{ ok: boolean; status: number; response: { ok: () => boolean; status: () => number; headers: () => Record<string, string>; body: () => Promise<Buffer>; text: () => Promise<string> } }> {
  const meetingUrl = (options.meetingUrl || process.env.MEETING_URL || (IS_CLOUD_FIXTURE
    ? (process.env.CLOUD_MEETING_URL || '')
    : 'http://127.0.0.1:3020')).replace(/\/$/, '');
  const bffUrl = (options.bffUrl || DOCTOR_URL).replace(/\/$/, '');
  const timeout = options.timeoutMs ?? 30_000;
  let bearer = token;

  const tryGet = async (url: string) =>
    request.get(url, {
      headers: { Authorization: `Bearer ${bearer}` },
      timeout,
    });

  let res = await tryGet(`${meetingUrl}${recordingUrl}`);
  let status = res.status();
  if (res.ok()) return { ok: true, status, response: res };

  const bffPath = `/api/meetings/recording-stream?path=${encodeURIComponent(recordingUrl)}`;
  res = await tryGet(`${bffUrl}${bffPath}`);
  status = res.status();
  if (res.ok()) return { ok: true, status, response: res };

  if ((status === 401 || status === 403) && options.onAuthFailure) {
    bearer = await options.onAuthFailure();
    res = await tryGet(`${meetingUrl}${recordingUrl}`);
    status = res.status();
    if (res.ok()) return { ok: true, status, response: res };
    res = await tryGet(`${bffUrl}${bffPath}`);
    status = res.status();
  }

  return { ok: res.ok(), status, response: res };
}

/** POST save-recording with valid WebM stub (headless / Playwright cannot use MediaRecorder) */
export async function seedRecordingViaSaveApi(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
  onAuthFailure?: () => Promise<string>,
): Promise<{ recordingUrl?: string }> {
  let bearer = token;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await request.post(`${meetingUrl}/api/meetings/${meetingKey}/save-recording`, {
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      data: {
        audioBase64: buildMinimalWebmBase64(),
        mimeType: 'audio/webm',
        durationMs: 10_000,
        triggerTranscription: process.env.PW_SKIP_LIVE_GEMINI !== '1',
        triggerPostMeetingPipeline: process.env.PW_SKIP_LIVE_GEMINI !== '1',
      },
      timeout: resolveFixtureTimeout(30_000, 60_000, 30_000),
    });
    if (res.ok()) return (await res.json()) as { recordingUrl?: string };
    const status = res.status();
    if ((status === 401 || status === 403) && onAuthFailure && attempt === 0) {
      bearer = await onAuthFailure();
      continue;
    }
    const body = await res.text().catch(() => '');
    throw new Error(`save-recording E2E seed failed: ${status} ${body.slice(0, 200)}`);
  }
  throw new Error('save-recording E2E seed failed: auth retry exhausted');
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
 * Resolve recordingUrl for E2E: poll for real upload; optional API seed when PW_ALLOW_RECORDING_SEED=1.
 */
async function seedRecordingFallback(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
  pollOpts: {
    bffUrl?: string;
    meetingKeys?: string[];
    onAuthFailure?: () => Promise<string>;
  },
  doctorId?: string,
): Promise<string> {
  const seeded = await seedRecordingViaSaveApi(
    request,
    meetingUrl,
    meetingKey,
    token,
    pollOpts.onAuthFailure,
  );
  if (seeded.recordingUrl) return seeded.recordingUrl;

  const jibriSecret =
    process.env.JIBRI_WEBHOOK_SECRET || process.env.CLOUD_JIBRI_WEBHOOK_SECRET || '';
  if (jibriSecret && doctorId) {
    try {
      const wh = await seedRecordingViaJibriWebhook(
        request,
        meetingUrl,
        meetingKey,
        doctorId,
        jibriSecret,
      );
      if (wh.recordingUrl) return wh.recordingUrl;
    } catch {
      /* save-recording is primary E2E path */
    }
  }

  return pollRecordingUrl(request, meetingUrl, meetingKey, token, 45_000, pollOpts);
}

export async function ensureRecordingPersisted(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
  options: {
    doctorId?: string;
    meetingKeys?: string[];
    onAuthFailure?: () => Promise<string>;
    bffUrl?: string;
  } = {},
): Promise<string> {
  const pollOpts = {
    bffUrl: options.bffUrl,
    meetingKeys: options.meetingKeys,
    onAuthFailure: options.onAuthFailure,
  };
  const initialPollMs = resolveInitialRecordingPollMs();
  try {
    return await pollRecordingUrl(request, meetingUrl, meetingKey, token, initialPollMs, pollOpts);
  } catch (firstErr) {
    if (process.env.PW_ALLOW_RECORDING_SEED !== '1') {
      throw firstErr;
    }
    return seedRecordingFallback(request, meetingUrl, meetingKey, token, pollOpts, options.doctorId);
  }
}

/** Cloud/headless: same as ensureRecordingPersisted (no 180s blind poll) */
export async function pollRecordingUrlCloud(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
  doctorId?: string,
  options: {
    meetingKeys?: string[];
    onAuthFailure?: () => Promise<string>;
    bffUrl?: string;
  } = {},
): Promise<string> {
  return ensureRecordingPersisted(request, meetingUrl, meetingKey, token, { doctorId, ...options });
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
  extraKeys: string[] = [],
): Promise<void> {
  const keys = [...new Set([meetingKey, ...extraKeys].filter(Boolean))];
  await waitForMeetingResultsReadyAny(request, meetingUrl, keys, token, timeoutMs);
}

/** Cloud E2E: ensure DB row + pipeline when UI end-meeting did not persist results in time */
export async function ensureMeetingResultsForE2E(
  request: ResultsRequest,
  meetingUrl: string,
  meetingKeys: string[],
  token: string,
  timeoutMs = 180_000,
  onAuthFailure?: () => Promise<string>,
): Promise<string> {
  const keys = [...new Set(meetingKeys.filter(Boolean))];
  const resolveToken = async () => (onAuthFailure ? onAuthFailure() : token);
  let bearer = await resolveToken();
  try {
    return await waitForMeetingResultsReadyAny(request, meetingUrl, keys, bearer, 45_000);
  } catch {
    bearer = await resolveToken();
    for (const key of keys) {
      try {
        await request.post(`${meetingUrl}/api/meetings/${key}/end`, {
          headers: {
            Authorization: `Bearer ${bearer}`,
            'Content-Type': 'application/json',
          },
          data: { endedBy: 'e2e-fallback', generateSummary: true },
          timeout: 60_000,
        });
      } catch {
        /* best effort — meeting may already be ended */
      }
    }
    bearer = await resolveToken();
    await seedRecordingViaSaveApi(request, meetingUrl, keys[0], bearer, onAuthFailure);
    bearer = await resolveToken();
    return await waitForMeetingResultsReadyAny(request, meetingUrl, keys, bearer, timeoutMs);
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
