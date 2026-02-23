/**
 * Omnichannel Service
 *
 * Client-side service for:
 *  - Fetching paginated omnichannel message history
 *  - Retrieving active patient MCP sessions
 *  - Dispatching replies to patients via their registered channel
 *  - Subscribing to real-time Socket.io events for live message feeds
 */

import { config } from './config';

// socket.io-client is imported dynamically to match the existing portal pattern.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketIOSocket = any;

// ─── Types ────────────────────────────────────────────────────────────────────

export type OmnichannelChannel = 'line' | 'whatsapp' | 'telegram' | 'messages' | 'all';

export interface OmnichannelMessage {
  id: string;
  patientId: string;
  channel: OmnichannelChannel;
  text: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  entities?: {
    symptoms?: string[];
    medications?: string[];
    vitalSigns?: Record<string, unknown>;
  };
  consentStatus?: 'consented' | 'pending' | 'revoked';
}

export interface OmnichannelSession {
  patientId: string;
  channel: OmnichannelChannel;
  symptomCount: number;
  messageCount: number;
  updatedAt: string;
  consentStatus?: 'consented' | 'pending' | 'revoked';
}

export interface OmnichannelMessagesFilter {
  channel?: OmnichannelChannel;
  patientId?: string;
  since?: string;
  page?: number;
  limit?: number;
}

export interface OmnichannelReplyPayload {
  patientId: string;
  channel: OmnichannelChannel;
  text: string;
  replyToken?: string;
}

// ─── Base URL ─────────────────────────────────────────────────────────────────

const API_BASE = config.api?.baseUrl || '';

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Message history ──────────────────────────────────────────────────────────

/**
 * Fetch paginated omnichannel message history with optional filters.
 */
export async function getMessages(
  filters: OmnichannelMessagesFilter = {}
): Promise<{ messages: OmnichannelMessage[]; total: number; page: number }> {
  const params = new URLSearchParams();
  if (filters.channel && filters.channel !== 'all') params.set('channel', filters.channel);
  if (filters.patientId) params.set('patientId', filters.patientId);
  if (filters.since) params.set('since', filters.since);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/api/omnichannel/messages${qs}`);
}

// ─── Session list ─────────────────────────────────────────────────────────────

/**
 * Fetch all active omnichannel patient sessions.
 */
export async function getSessions(): Promise<OmnichannelSession[]> {
  const data = await apiFetch<{ sessions: OmnichannelSession[] }>('/api/omnichannel/sessions');
  return data.sessions;
}

// ─── Reply dispatch ───────────────────────────────────────────────────────────

/**
 * Send a reply message to a patient via their registered channel.
 */
export async function replyToPatient(
  payload: OmnichannelReplyPayload
): Promise<{ success: boolean; channel: string; patientId: string }> {
  return apiFetch('/api/omnichannel/reply', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// ─── Real-time Socket.io subscription ────────────────────────────────────────
// Uses a Set of callbacks per event to avoid race conditions from async imports.

let socket: SocketIOSocket | null = null;
let socketInitPromise: Promise<SocketIOSocket> | null = null;

const messageCallbacks = new Set<(message: OmnichannelMessage) => void>();
const consentCallbacks = new Set<(event: { patientId: string; channel: string; consented: boolean }) => void>();

function getOrCreateSocket(): Promise<SocketIOSocket> {
  if (socket) return Promise.resolve(socket);
  if (socketInitPromise) return socketInitPromise;

  const wsUrl = config.api?.websocketUrl || 'ws://localhost:3009/ws';

  socketInitPromise = import('socket.io-client').then(({ io }) => {
    socket = io(wsUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => console.log('[Omnichannel] Socket connected'));
    socket.on('disconnect', () => console.log('[Omnichannel] Socket disconnected'));
    socket.on('connect_error', (err: Error) => console.error('[Omnichannel] Socket error:', err.message));

    // Dispatch to all registered callbacks
    socket.on('omnichannel:message', (msg: OmnichannelMessage) => {
      messageCallbacks.forEach((cb) => cb(msg));
    });
    socket.on('omnichannel:consent', (event: { patientId: string; channel: string; consented: boolean }) => {
      consentCallbacks.forEach((cb) => cb(event));
    });

    return socket;
  }).catch((err: Error) => {
    console.error('[Omnichannel] Failed to load socket.io-client:', err.message);
    socketInitPromise = null;
    throw err;
  });

  return socketInitPromise;
}

function teardownSocketIfEmpty() {
  if (messageCallbacks.size === 0 && consentCallbacks.size === 0 && socket) {
    socket.disconnect();
    socket = null;
    socketInitPromise = null;
  }
}

/**
 * Subscribe to live omnichannel message events via Socket.io.
 *
 * @param callback  Called with each new OmnichannelMessage event
 * @returns         Unsubscribe function — call to clean up listener
 */
export function subscribeToMessages(
  callback: (message: OmnichannelMessage) => void
): () => void {
  messageCallbacks.add(callback);
  getOrCreateSocket().catch(() => {/* error already logged */});

  return () => {
    messageCallbacks.delete(callback);
    teardownSocketIfEmpty();
  };
}

/**
 * Subscribe to consent status change events.
 *
 * @param callback  Called with { patientId, channel, consented }
 * @returns         Unsubscribe function
 */
export function subscribeToConsentEvents(
  callback: (event: { patientId: string; channel: string; consented: boolean }) => void
): () => void {
  consentCallbacks.add(callback);
  getOrCreateSocket().catch(() => {/* error already logged */});

  return () => {
    consentCallbacks.delete(callback);
    teardownSocketIfEmpty();
  };
}

// ─── Channel display helpers ──────────────────────────────────────────────────

export const CHANNEL_LABELS: Record<OmnichannelChannel, string> = {
  line: 'LINE',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  messages: 'Messages',
  all: 'All Channels'
};

export const CHANNEL_COLORS: Record<OmnichannelChannel, string> = {
  line: '#06C755',
  whatsapp: '#25D366',
  telegram: '#2AABEE',
  messages: '#007AFF',
  all: '#6B7280'
};

// ─── Default export ───────────────────────────────────────────────────────────

export const omnichannelService = {
  getMessages,
  getSessions,
  replyToPatient,
  subscribeToMessages,
  subscribeToConsentEvents,
  CHANNEL_LABELS,
  CHANNEL_COLORS
};

export default omnichannelService;
