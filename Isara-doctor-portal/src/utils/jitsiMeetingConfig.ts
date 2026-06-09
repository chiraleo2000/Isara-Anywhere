/**
 * Jitsi External API options — Izara lobby only (no Jitsi moderator gate on meet.jit.si).
 */

import { getIzaraDisplayName, type IzaraUserLike } from './jitsiDisplayName';

export type JitsiMeetingRole = 'doctor' | 'patient' | 'guest' | 'admin' | 'host';

export interface MeetingJoinConfig {
  success?: boolean;
  domain?: string;
  hostDomain?: string;
  guestDomain?: string;
  roomName?: string;
  displayName?: string;
  email?: string;
  participantId?: string;
  registered?: boolean;
  jwt?: string | null;
  tokenAuthEnabled?: boolean;
  hostReady?: boolean;
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
}

export function resolveJitsiDomain(fallback = 'meet.jit.si'): string {
  const fromMeta = import.meta.env?.VITE_JITSI_DOMAIN;
  const fromEnv = (globalThis as { ENV?: { JITSI_DOMAIN?: string } }).ENV?.JITSI_DOMAIN;
  const raw = fromMeta ?? fromEnv ?? '';
  const trimmed = String(raw).trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return trimmed || fallback;
}

function mergeRecord<T extends Record<string, unknown>>(base: T, extra?: Record<string, unknown>): T {
  if (!extra) return base;
  return { ...base, ...extra };
}

/** Deterministic room name when appointment has no persisted jitsi_room_name yet. */
export function stableRoomNameForAppointment(appointmentId: string): string {
  const id = String(appointmentId || 'room');
  return `izara-${id.substring(0, 12)}-meeting`;
}

/** Canonical room name — must match server jitsiMeetingLinks.cjs and meeting-server create. */
export function generateIzaraRoomName(appointmentId: string): string {
  const id = String(appointmentId || 'room');
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `izara-${id.substring(0, 12)}-${timestamp}-${randomPart}`;
}

export function pickJitsiJwt(
  cfg: MeetingJoinConfig | null | undefined,
  explicit?: string | null,
): string | undefined {
  if (cfg?.tokenAuthEnabled === false) return undefined;
  const domain = cfg?.domain || resolveJitsiDomain();
  if (domain === 'meet.jit.si' || domain.endsWith('.jit.si')) return undefined;
  const token = cfg?.jwt || explicit;
  return token && String(token).length > 10 ? String(token) : undefined;
}

/** JWT removed — Izara lobby + configOverwrite enforce roles. */
export function resolveMountJwt(): string | undefined {
  return undefined;
}

/**
 * Layout-first join: render meeting shell (with iframe container) before embedding Jitsi.
 * Prevents silent failure when join is triggered from pre_join screen.
 */
async function waitForLayoutPaint(): Promise<void> {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    await new Promise<void>((resolve) => {
      globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(() => resolve()));
    });
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export async function prepareLayoutThenMount(
  setStatus: (status: string) => void,
  getContainer: () => HTMLElement | null,
  readyStatus: string,
  preJoinStatus: string,
  mountFn: () => Promise<void>,
  layoutDelayMs = 150,
): Promise<{ ok: boolean; error?: string }> {
  setStatus(readyStatus);
  await waitForLayoutPaint();
  if (layoutDelayMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, layoutDelayMs));
  }
  if (!getContainer()) {
    setStatus(preJoinStatus);
    return { ok: false, error: 'Meeting container not ready — please try again' };
  }
  if (!(globalThis as any).JitsiMeetExternalAPI) {
    setStatus(preJoinStatus);
    return { ok: false, error: 'Failed to load Jitsi — check your connection' };
  }
  await mountFn();
  return { ok: true };
}

/** Build JitsiMeetExternalAPI options for doctor host join (moderator on public Jitsi). */
export function buildDoctorJitsiMountOptions(input: {
  user: IzaraUserLike;
  joinCfg?: MeetingJoinConfig | null;
  roomName: string;
  domain?: string;
  storedJwt?: string | null;
  micOn?: boolean;
  cameraOn?: boolean;
  displayName?: string;
  appointmentLabel?: string;
}) {
  const displayName = input.displayName || getIzaraDisplayName(input.user, 'Doctor');
  const joinCfg = input.joinCfg;
  const domain = joinCfg?.domain || input.domain || resolveJitsiDomain();
  const roomName = joinCfg?.roomName || input.roomName;
  const jwt = resolveMountJwt();
  const jitsiOpts = getJitsiExternalApiOptions('doctor', displayName);

  const configOverwrite = mergeRecord(
    {
      ...jitsiOpts.configOverwrite,
      prejoinPageEnabled: false,
      requireDisplayName: false,
      moderator: true,
      startWithAudioMuted: input.micOn === false,
      startWithVideoMuted: input.cameraOn === false,
      subject: input.appointmentLabel || 'Izara Consultation',
    },
    joinCfg?.configOverwrite,
  );

  const interfaceConfigOverwrite = mergeRecord(
    {
      ...jitsiOpts.interfaceConfigOverwrite,
      DEFAULT_LOCAL_DISPLAY_NAME: displayName,
      DEFAULT_REMOTE_DISPLAY_NAME: 'ผู้เข้าร่วม',
    },
    joinCfg?.interfaceConfigOverwrite,
  );

  const userInfo: { displayName: string; email?: string } = { displayName };
  const email = input.user?.email?.trim();
  if (email) userInfo.email = email;

  return {
    domain,
    roomName,
    jwt,
    displayName,
    apiOptions: {
      configOverwrite,
      interfaceConfigOverwrite,
      userInfo,
    },
  };
}

/** Reduce Jitsi console noise (analytics, debug, local recording). */
export const JITSI_QUIET_CONFIG = {
  analytics: { disabled: true },
  disableAnalytics: true,
  debug: false,
  debugAudioLevels: false,
  apiLogLevels: ['error'],
  fileRecordingsEnabled: false,
  'localRecording.enabled': false,
  liveStreamingEnabled: false,
};

export function getJitsiExternalApiOptions(role: JitsiMeetingRole, displayName: string) {
  const isHost = role === 'doctor' || role === 'admin' || role === 'host';
  return {
    configOverwrite: {
      ...JITSI_QUIET_CONFIG,
      prejoinPageEnabled: false,
      requireDisplayName: false,
      ...(isHost ? { moderator: true } : {}),
      startWithAudioMuted: !isHost,
      startWithVideoMuted: false,
      enableClosePage: false,
      disableDeepLinking: true,
      defaultLanguage: 'th',
      enableWelcomePage: false,
      enableInsecureRoomNameWarning: false,
      disableThirdPartyRequests: true,
      enableLobby: false,
      lobbyModeEnabled: false,
      enableLobbyChat: false,
      hideLobbyButton: true,
      toolbarButtons: isHost
        ? ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'participants-pane', 'tileview', 'hangup', 'settings', 'select-background', 'toggle-camera', 'fullscreen', 'recording']
        : ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'hangup', 'settings', 'fullscreen'],
    },
    interfaceConfigOverwrite: {
      APP_NAME: 'Izara Telemedicine',
      SHOW_PROMOTIONAL_CLOSE_PAGE: false,
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      TOOLBAR_ALWAYS_VISIBLE: true,
      MOBILE_APP_PROMO: false,
      DEFAULT_LOCAL_DISPLAY_NAME: displayName,
    },
  };
}

export async function fetchMeetingJoinConfig(
  meetingServerUrl: string,
  meetingId: string,
  role: JitsiMeetingRole,
  displayName?: string,
  token?: string | null,
): Promise<MeetingJoinConfig | null> {
  try {
    const q = new URLSearchParams({ role });
    if (displayName?.trim()) q.set('name', displayName.trim());
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${meetingServerUrl}/api/meetings/${meetingId}/join-config?${q}`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function notifyHostPresent(
  meetingServerUrl: string,
  meetingId: string,
  token?: string | null,
): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch(`${meetingServerUrl}/api/meetings/${meetingId}/host-present`, { method: 'POST', headers });
  } catch { /* silent */ }
}

export async function isHostReady(meetingServerUrl: string, meetingId: string): Promise<boolean> {
  try {
    const res = await fetch(`${meetingServerUrl}/api/meetings/${meetingId}/host-ready`);
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.ready);
  } catch {
    return false;
  }
}

export async function waitForHostReady(
  meetingServerUrl: string,
  meetingId: string,
  maxMs = 120_000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isHostReady(meetingServerUrl, meetingId)) return true;
    await new Promise<void>(r => setTimeout(r, 2000));
  }
  return false;
}

export function loadJitsiExternalApiScript(domain = resolveJitsiDomain()): Promise<void> {
  const expectedSrc = `https://${domain}/external_api.js`;
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Jitsi loader requires a browser document'));
  }
  return new Promise((resolve, reject) => {
    if ((globalThis as any).JitsiMeetExternalAPI) {
      const loaded = document.querySelector(`script[src="${expectedSrc}"]`);
      if (loaded) {
        resolve();
        return;
      }
    }
    const stale = document.querySelectorAll('script[src*="external_api"]');
    stale.forEach((node) => {
      if (node.getAttribute('src') !== expectedSrc) node.remove();
    });
    const existing = document.querySelector(`script[src="${expectedSrc}"]`);
    if (existing) {
      if ((globalThis as any).JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Jitsi')));
      return;
    }
    const script = document.createElement('script');
    script.src = expectedSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Jitsi'));
    document.head.appendChild(script);
  });
}

export async function mountGuestJitsiMeeting(opts: {
  meetingServerUrl: string;
  meetingId: string;
  roomName: string;
  displayName: string;
  domain?: string;
  container: HTMLDivElement;
  startWithVideo?: boolean;
  startWithAudio?: boolean;
  hostReadyConfirmed?: boolean;
  jwt?: string | null;
}): Promise<any> {
  const domain = opts.domain || resolveJitsiDomain();
  if (!opts.hostReadyConfirmed) {
    const ready = await waitForHostReady(opts.meetingServerUrl, opts.meetingId, 120_000);
    if (!ready) throw new Error('Doctor has not started the meeting yet');
  }
  const cfg = await fetchMeetingJoinConfig(
    opts.meetingServerUrl,
    opts.meetingId,
    'guest',
    opts.displayName,
    opts.jwt,
  );
  const resolvedRoom = cfg?.roomName || opts.roomName;
  const resolvedDomain = cfg?.domain || domain;
  await loadJitsiExternalApiScript(resolvedDomain);
  const jitsiOpts = getJitsiExternalApiOptions('guest', opts.displayName);
  await new Promise<void>((r) => {
    requestAnimationFrame(() => requestAnimationFrame(() => r()));
  });
  opts.container.style.minHeight = '70vh';
  opts.container.style.width = '100%';
  const api = new (globalThis as any).JitsiMeetExternalAPI(resolvedDomain, {
    roomName: resolvedRoom,
    parentNode: opts.container,
    width: '100%',
    height: '100%',
    jwt: pickJitsiJwt(cfg, opts.jwt),
    configOverwrite: mergeRecord(
      {
        ...jitsiOpts.configOverwrite,
        startWithAudioMuted: opts.startWithAudio !== true,
        startWithVideoMuted: opts.startWithVideo !== true,
      },
      cfg?.configOverwrite,
    ),
    interfaceConfigOverwrite: mergeRecord(
      { ...jitsiOpts.interfaceConfigOverwrite },
      cfg?.interfaceConfigOverwrite,
    ),
    userInfo: { displayName: cfg?.displayName || opts.displayName },
  });
  const iframe = opts.container.querySelector('iframe');
  if (iframe) {
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.minHeight = '480px';
    iframe.setAttribute(
      'allow',
      'camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *',
    );
  }
  return api;
}

export async function connectMeetingSocket(
  meetingServerUrl: string,
  meetingId: string,
  handlers: {
    onHostReady?: () => void;
    onLobbyUpdate?: (data: { action?: string; participant?: { participantId?: string }; hostReady?: boolean }) => void;
  },
  meta?: { userName?: string; role?: string },
): Promise<import('socket.io-client').Socket> {
  const { io } = await import('socket.io-client');
  const socket = io(meetingServerUrl, { transports: ['websocket', 'polling'] });
  socket.on('connect', async () => {
    let rooms = [meetingId];
    try {
      const res = await fetch(`${meetingServerUrl}/api/meetings/${meetingId}/socket-rooms`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms) && data.rooms.length) rooms = data.rooms;
        if (data.hostReady && handlers.onHostReady) handlers.onHostReady();
      }
    } catch { /* fallback */ }
    for (const room of rooms) {
      socket.emit('join-meeting', { meetingId: room, userName: meta?.userName, role: meta?.role });
    }
  });
  socket.on('host-ready', () => handlers.onHostReady?.());
  socket.on('lobby-update', (data) => {
    if (data?.hostReady && handlers.onHostReady) handlers.onHostReady();
    handlers.onLobbyUpdate?.(data);
  });
  return socket;
}
