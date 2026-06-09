/**
 * Jitsi External API options — Izara lobby only (no Jitsi moderator gate on meet.jit.si).
 */

import {
  getIzaraDisplayName,
  type IzaraUserLike,
} from './jitsiDisplayName';

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

/** Jitsi host from build-time env (falls back to meet.jit.si). */
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

/** Never pass custom JWT to public meet.jit.si — it causes a blank iframe. */
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

/** JWT safe for JitsiMeetExternalAPI on public meet.jit.si (never pass custom JWT). */
/** JWT removed — Izara lobby + configOverwrite enforce roles. */
export function resolveMountJwt(): string | undefined {
  return undefined;
}

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

/** Resolve patient display name: server identity > URL param > auth profile > fallback. */
export function resolvePatientMeetingDisplayName(opts: {
  user: IzaraUserLike;
  resolvedName?: string;
  urlName?: string | null;
  fallback?: string;
}): string {
  const fromServer = opts.resolvedName?.trim();
  if (fromServer) return fromServer;
  const fromUrl = opts.urlName?.trim();
  if (fromUrl) return fromUrl;
  return getIzaraDisplayName(opts.user, opts.fallback ?? 'Patient');
}

export interface PatientJitsiMountInput {
  user: IzaraUserLike;
  joinCfg?: MeetingJoinConfig | null;
  roomName: string;
  domain?: string;
  micOn?: boolean;
  cameraOn?: boolean;
  resolvedName?: string;
  urlName?: string | null;
}

/** Build JitsiMeetExternalAPI options for authenticated patient join (no pre-join name prompt). */
export function buildPatientJitsiMountOptions(input: PatientJitsiMountInput) {
  const displayName = resolvePatientMeetingDisplayName({
    user: input.user,
    resolvedName: input.resolvedName,
    urlName: input.urlName,
  });
  const joinCfg = input.joinCfg;
  const domain = joinCfg?.domain || input.domain || resolveJitsiDomain();
  const roomName = joinCfg?.roomName || input.roomName;
  const jitsiOpts = getJitsiExternalApiOptions('patient', displayName);
  const jwt = resolveMountJwt();

  const configOverwrite = {
    ...mergeRecord(
      {
        ...jitsiOpts.configOverwrite,
        prejoinPageEnabled: false,
        requireDisplayName: false,
        startWithAudioMuted: input.micOn === false,
        startWithVideoMuted: input.cameraOn === false,
        subject: 'Izara Consultation',
      },
      joinCfg?.configOverwrite,
    ),
    prejoinPageEnabled: false,
    requireDisplayName: false,
  };

  const interfaceConfigOverwrite = mergeRecord(
    {
      ...jitsiOpts.interfaceConfigOverwrite,
      DEFAULT_LOCAL_DISPLAY_NAME: displayName,
      DEFAULT_REMOTE_DISPLAY_NAME: 'แพทย์',
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

export function getJitsiExternalApiOptions(role: JitsiMeetingRole, displayName: string) {
  const isHost = role === 'doctor' || role === 'admin' || role === 'host';
  return {
    configOverwrite: {
      ...JITSI_QUIET_CONFIG,
      prejoinPageEnabled: false,
      requireDisplayName: false,
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
        ? ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'participants-pane', 'tileview', 'hangup', 'settings', 'fullscreen']
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

export interface MeetingIdentity {
  displayName?: string;
  email?: string;
  participantId?: string;
  registered?: boolean;
}

export async function fetchMeetingIdentity(
  meetingServerUrl: string,
  meetingId: string,
  role: JitsiMeetingRole,
  token?: string | null,
): Promise<MeetingIdentity | null> {
  try {
    const q = new URLSearchParams({ role });
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${meetingServerUrl}/api/meetings/${meetingId}/identity?${q}`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
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
  return new Promise((resolve, reject) => {
    if ((globalThis as any).JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="external_api"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Jitsi'));
    document.head.appendChild(script);
  });
}

/** Guest / admin observer — Izara lobby admit then host-ready, no Jitsi login. */
export async function mountGuestJitsiMeeting(opts: {
  meetingServerUrl: string;
  meetingId: string;
  roomName: string;
  displayName: string;
  domain?: string;
  container: HTMLDivElement;
  startWithVideo?: boolean;
  startWithAudio?: boolean;
  /** When true, skip blocking wait (caller already confirmed host-ready). */
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
  // Ensure layout is painted before iframe attach (fixes blank guest video on some browsers)
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

/** Join all Socket.IO rooms for meeting id aliases (host-ready + lobby events). */
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
    } catch { /* use meetingId only */ }
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
