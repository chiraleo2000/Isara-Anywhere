/**
 * Unit tests for issara-jitsi socket/security/clinical modules:
 * socketHandlers, requestValidation, securityHeaders, clinicalTextLimits, clinicalFallback
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { registerSocketHandlers } from '@meeting/socketHandlers.js';
import {
  sanitizeRouteId,
  assertJsonObjectBody,
  parseBase64Payload,
  sendValidationError,
} from '@meeting/requestValidation.js';
import { securityHeadersMiddleware } from '@meeting/securityHeaders.js';
import {
  clampText,
  prepareTranscriptForLlm,
  sanitizeStructuredForDb,
  prepareSummaryForDb,
  buildChaoticTranscript2Hours,
  CLINICAL_TEXT_LIMITS,
} from '@meeting/clinicalTextLimits.js';
import {
  buildRecordingOnlySoapFallback,
  formatSoapMarkdownFromStructured,
} from '@meeting/clinicalFallback.js';

type HandlerMap = Map<string, (...args: unknown[]) => unknown>;

function createMockSocket(id = 'sock-1') {
  const handlers: HandlerMap = new Map();
  const toEmit = vi.fn();
  const socket = {
    id,
    meetingId: undefined as string | undefined,
    meetingRooms: undefined as string[] | undefined,
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: toEmit })),
    on(event: string, handler: (...args: unknown[]) => unknown) {
      handlers.set(event, handler);
    },
    async trigger(event: string, data?: unknown) {
      const h = handlers.get(event);
      if (!h) throw new Error(`missing handler ${event}`);
      return h(data);
    },
    handlers,
    toEmit,
  };
  return socket;
}

function createMockIo() {
  let connectionHandler: ((socket: ReturnType<typeof createMockSocket>) => void) | null = null;
  const roomEmit = vi.fn();
  const io = {
    on(event: string, handler: (socket: ReturnType<typeof createMockSocket>) => void) {
      if (event === 'connection') connectionHandler = handler;
    },
    to(room: string) {
      return {
        emit(...args: unknown[]) {
          roomEmit(room, ...args);
        },
      };
    },
  };
  return {
    io,
    roomEmit,
    connect(socket = createMockSocket()) {
      if (!connectionHandler) throw new Error('no connection handler');
      connectionHandler(socket);
      return socket;
    },
  };
}

function buildDeps(overrides: Record<string, unknown> = {}) {
  const meetingLobbies = new Map<string, Map<string, Record<string, unknown>>>();
  const lobby = new Map<string, Record<string, unknown>>();
  meetingLobbies.set('meet-1', lobby);
  return {
    meetingSocketRoomIds: vi.fn((id: string) => [`room:${id}`, id]),
    getHostPresence: vi.fn(() => ({ meetingId: 'meet-1', ready: true })),
    isHostReadyForMeeting: vi.fn(() => false),
    resolveLobbyKeySync: vi.fn((id: string) => id),
    getLobbyMap: vi.fn((key: string) => {
      if (!meetingLobbies.has(key)) meetingLobbies.set(key, new Map());
      return { lobby: meetingLobbies.get(key)! };
    }),
    syncLobbyAliasMaps: vi.fn(),
    meetingLobbies,
    pool: { query: vi.fn(async () => ({ rows: [] })) },
    activeTranscriptions: new Map(),
    participantMediaStatus: new Map(),
    meetingChats: new Map(),
    uuidv4: () => 'uuid-fixed',
    ...overrides,
  };
}

describe('socketHandlers', () => {
  it('join-meeting joins rooms and notifies peers', async () => {
    const { io, roomEmit, connect } = createMockIo();
    const deps = buildDeps({ isHostReadyForMeeting: vi.fn(() => true) });
    registerSocketHandlers(io, deps);
    const socket = connect();

    await socket.trigger('join-meeting', {
      meetingId: 'meet-1',
      userName: 'Dr A',
      role: 'doctor',
    });

    expect(deps.meetingSocketRoomIds).toHaveBeenCalledWith('meet-1');
    expect(socket.join).toHaveBeenCalledWith('room:meet-1');
    expect(socket.join).toHaveBeenCalledWith('meet-1');
    expect(socket.meetingId).toBe('meet-1');
    expect(socket.emit).toHaveBeenCalledWith(
      'host-ready',
      expect.objectContaining({ meetingId: 'meet-1', ready: true }),
    );
    expect(socket.to).toHaveBeenCalled();
    expect(socket.toEmit).toHaveBeenCalledWith(
      'participant-joined',
      expect.objectContaining({ userName: 'Dr A', role: 'doctor' }),
    );
    expect(roomEmit).not.toHaveBeenCalledWith('meet-1', 'participant-joined', expect.anything());
  });

  it('join-meeting accepts string meetingId', async () => {
    const { io, connect } = createMockIo();
    registerSocketHandlers(io, buildDeps());
    const socket = connect();
    await socket.trigger('join-meeting', 'meet-str');
    expect(socket.meetingId).toBe('meet-str');
    expect(socket.join).toHaveBeenCalledWith('meet-str');
  });

  it('leave-meeting emits participant-left', async () => {
    const { io, connect } = createMockIo();
    registerSocketHandlers(io, buildDeps());
    const socket = connect();
    await socket.trigger('leave-meeting', 'meet-1');
    expect(socket.leave).toHaveBeenCalledWith('meet-1');
    expect(socket.toEmit).toHaveBeenCalledWith(
      'participant-left',
      expect.objectContaining({ socketId: socket.id }),
    );
  });

  it('chat-message stores and broadcasts', async () => {
    const { io, roomEmit, connect } = createMockIo();
    const deps = buildDeps();
    registerSocketHandlers(io, deps);
    const socket = connect();
    await socket.trigger('chat-message', {
      meetingId: 'meet-1',
      senderId: 'd1',
      senderName: 'Doc',
      senderRole: 'doctor',
      message: 'hello',
    });
    expect(deps.meetingChats.get('meet-1')).toHaveLength(1);
    expect(deps.meetingChats.get('meet-1')![0]).toMatchObject({
      id: 'uuid-fixed',
      message: 'hello',
      type: 'text',
    });
    expect(roomEmit).toHaveBeenCalledWith('meet-1', 'chat-message', expect.objectContaining({ message: 'hello' }));
  });

  it('transcript-segment persists final and emits update', async () => {
    const { io, roomEmit, connect } = createMockIo();
    const deps = buildDeps();
    const session = { isActive: true, isPaused: false, transcripts: [] as unknown[] };
    deps.activeTranscriptions.set('meet-1', session);
    registerSocketHandlers(io, deps);
    const socket = connect();

    await socket.trigger('transcript-segment', {
      meetingId: 'meet-1',
      speakerId: 's1',
      speakerRole: 'doctor',
      speakerName: 'Doc',
      content: 'สวัสดี',
      language: 'th',
      confidence: 0.9,
      isFinal: true,
      startTimeSeconds: 1.5,
    });

    expect(deps.pool.query).toHaveBeenCalled();
    expect(session.transcripts).toHaveLength(1);
    expect(roomEmit).toHaveBeenCalledWith(
      'meet-1',
      'transcript-update',
      expect.objectContaining({ content: 'สวัสดี', isFinal: true }),
    );
  });

  it('transcript-segment still emits on db error', async () => {
    const { io, roomEmit, connect } = createMockIo();
    const deps = buildDeps({
      pool: { query: vi.fn(async () => { throw new Error('db down'); }) },
    });
    registerSocketHandlers(io, deps);
    const socket = connect();
    await socket.trigger('transcript-segment', {
      meetingId: 'meet-1',
      speakerId: 's1',
      content: 'x',
      isFinal: true,
    });
    expect(roomEmit).toHaveBeenCalledWith(
      'meet-1',
      'transcript-update',
      expect.objectContaining({ content: 'x', isFinal: true }),
    );
  });

  it('media-update tracks participant media and broadcasts', async () => {
    const { io, roomEmit, connect } = createMockIo();
    const deps = buildDeps();
    registerSocketHandlers(io, deps);
    const socket = connect();
    await socket.trigger('media-update', {
      meetingId: 'meet-1',
      userId: 'u1',
      userName: 'Pat',
      role: 'patient',
      camera: true,
      microphone: false,
    });
    expect(deps.participantMediaStatus.get('meet-1')?.get('u1')).toMatchObject({
      camera: true,
      microphone: false,
    });
    expect(roomEmit).toHaveBeenCalledWith(
      'meet-1',
      'participant-media-update',
      expect.objectContaining({ userId: 'u1', camera: true }),
    );
  });

  it('lobby-request auto-admits doctor/admin', async () => {
    const { io, connect } = createMockIo();
    registerSocketHandlers(io, buildDeps());
    const socket = connect();
    await socket.trigger('lobby-request', {
      meetingId: 'meet-1',
      participantId: 'd1',
      participantName: 'Doc',
      role: 'doctor',
    });
    expect(socket.emit).toHaveBeenCalledWith(
      'lobby-response',
      expect.objectContaining({ status: 'admitted', participantId: 'd1' }),
    );
  });

  it('lobby-request queues guest and emits waiting', async () => {
    const { io, roomEmit, connect } = createMockIo();
    const deps = buildDeps();
    registerSocketHandlers(io, deps);
    const socket = connect();
    await socket.trigger('lobby-request', {
      meetingId: 'meet-1',
      participantId: 'g1',
      participantName: 'Guest',
      role: 'guest',
    });
    expect(deps.meetingLobbies.get('meet-1')?.get('g1')).toMatchObject({ status: 'waiting' });
    expect(socket.emit).toHaveBeenCalledWith(
      'lobby-response',
      expect.objectContaining({ status: 'waiting' }),
    );
    expect(roomEmit).toHaveBeenCalledWith(
      'meet-1',
      'lobby-update',
      expect.objectContaining({ action: 'join' }),
    );
  });

  it('lobby-admit and lobby-reject update entry status', async () => {
    const { io, roomEmit, connect } = createMockIo();
    const deps = buildDeps();
    const lobby = deps.meetingLobbies.get('meet-1')!;
    lobby.set('g1', { participantId: 'g1', status: 'waiting' });
    registerSocketHandlers(io, deps);
    const socket = connect();

    await socket.trigger('lobby-admit', { meetingId: 'meet-1', participantId: 'g1', admittedBy: 'd1' });
    expect(lobby.get('g1')).toMatchObject({ status: 'admitted', admittedBy: 'd1' });
    expect(roomEmit).toHaveBeenCalledWith(
      'meet-1',
      'lobby-update',
      expect.objectContaining({ action: 'admit' }),
    );

    lobby.set('g2', { participantId: 'g2', status: 'waiting' });
    await socket.trigger('lobby-reject', { meetingId: 'meet-1', participantId: 'g2', rejectedBy: 'd1' });
    expect(lobby.get('g2')).toMatchObject({ status: 'rejected', rejectedBy: 'd1' });
  });

  it('disconnect notifies meeting peers when joined', async () => {
    const { io, connect } = createMockIo();
    registerSocketHandlers(io, buildDeps());
    const socket = connect();
    socket.meetingId = 'meet-1';
    await socket.trigger('disconnect');
    expect(socket.to).toHaveBeenCalledWith('meet-1');
    expect(socket.toEmit).toHaveBeenCalledWith(
      'participant-left',
      expect.objectContaining({ socketId: socket.id }),
    );
  });

  it('meeting-status broadcasts status', async () => {
    const { io, roomEmit, connect } = createMockIo();
    registerSocketHandlers(io, buildDeps());
    const socket = connect();
    await socket.trigger('meeting-status', { meetingId: 'meet-1', status: 'ended' });
    expect(roomEmit).toHaveBeenCalledWith(
      'meet-1',
      'meeting-status',
      expect.objectContaining({ status: 'ended' }),
    );
  });
});

describe('requestValidation', () => {
  it('sanitizeRouteId rejects bad ids', () => {
    expect(sanitizeRouteId(null).ok).toBe(false);
    expect(sanitizeRouteId('../x').ok).toBe(false);
    expect(sanitizeRouteId('').ok).toBe(false);
    expect(sanitizeRouteId('a'.repeat(129)).ok).toBe(false);
    expect(sanitizeRouteId('meet-abc').ok).toBe(true);
    if (sanitizeRouteId('meet-abc').ok) {
      expect(sanitizeRouteId('meet-abc').id).toBe('meet-abc');
    }
  });

  it('assertJsonObjectBody', () => {
    expect(assertJsonObjectBody(undefined).ok).toBe(true);
    expect(assertJsonObjectBody(null).ok).toBe(false);
    expect(assertJsonObjectBody([]).ok).toBe(false);
    expect(assertJsonObjectBody({ a: 1 }).ok).toBe(true);
  });

  it('parseBase64Payload round-trips and rejects empty/non-string', () => {
    const b64 = Buffer.from('hello').toString('base64');
    const ok = parseBase64Payload(b64);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.buffer.toString()).toBe('hello');
    expect(parseBase64Payload('').ok).toBe(false);
    expect(parseBase64Payload(123 as unknown as string).ok).toBe(false);
  });

  it('sendValidationError writes status json', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    sendValidationError(res, { status: 400, error: 'bad', code: 'X' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'bad', code: 'X' });
  });
});

describe('securityHeaders', () => {
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
  });

  it('sets OWASP headers and calls next', () => {
    const headers: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => { headers[k] = v; } };
    const next = vi.fn();
    securityHeadersMiddleware({}, res, next);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=(self)');
    expect(next).toHaveBeenCalled();
  });

  it('adds HSTS in production', () => {
    process.env.NODE_ENV = 'production';
    const headers: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => { headers[k] = v; } };
    securityHeadersMiddleware({}, res, vi.fn());
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
  });
});

describe('clinicalTextLimits', () => {
  it('clampText truncates with marker', () => {
    const out = clampText('abcdef', 3);
    expect(out.startsWith('abc')).toBe(true);
    expect(out).toContain('truncated');
    expect(clampText(null, 10)).toBe('');
  });

  it('prepareTranscriptForLlm head/tail when oversized', () => {
    const big = 'x'.repeat(CLINICAL_TEXT_LIMITS.MAX_TRANSCRIPT_FOR_LLM + 5000);
    const prepared = prepareTranscriptForLlm(big);
    expect(prepared.length).toBeLessThan(big.length);
    expect(prepared).toContain('omitted');
    expect(prepareTranscriptForLlm('')).toBe('');
    expect(prepareTranscriptForLlm('short')).toBe('short');
  });

  it('sanitizeStructuredForDb clamps soap fields', () => {
    const long = 'z'.repeat(60_000);
    const out = sanitizeStructuredForDb({
      soap: { subjective: long },
      redFlags: ['a', 'b'],
      chiefComplaint: 'cc',
      emrFields: { notes: 'n', tags: ['t1', 't2'] },
    });
    expect(out?.soap?.subjective?.length).toBeLessThanOrEqual(CLINICAL_TEXT_LIMITS.MAX_SOAP_FIELD + 80);
    expect(out?.redFlags).toHaveLength(2);
    expect(sanitizeStructuredForDb(null)).toBeNull();
  });

  it('prepareSummaryForDb clamps narrative', () => {
    const prepared = prepareSummaryForDb('summary text', { soap: { subjective: 's' } });
    expect(prepared.narrative).toBe('summary text');
    expect(prepared.structured?.soap?.subjective).toBe('s');
  });

  it('buildChaoticTranscript2Hours reaches target size', () => {
    const t = buildChaoticTranscript2Hours(5_000);
    expect(t.length).toBeGreaterThanOrEqual(5_000);
    expect(t).toContain('แพทย์');
  });
});

describe('clinicalFallback', () => {
  it('buildRecordingOnlySoapFallback + markdown', () => {
    const fb = buildRecordingOnlySoapFallback({ patient_name_thai: 'ทดสอบ' });
    expect(fb.degraded).toBe(true);
    expect(fb.requiresValidation).toBe(true);
    expect(fb.soap.subjective).toContain('ทดสอบ');
    const md = formatSoapMarkdownFromStructured(fb);
    expect(md).toContain('## S - Subjective');
    expect(md).toContain('## P - Plan');
  });

  it('formatSoapMarkdownFromStructured handles empty', () => {
    const md = formatSoapMarkdownFromStructured({});
    expect(md).toContain('ไม่ระบุ');
  });
});
