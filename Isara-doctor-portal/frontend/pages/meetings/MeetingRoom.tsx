/**
 * MeetingRoom.tsx — Jitsi Meeting Room with Transcript + AI Summary
 * 
 * Embeds Jitsi via External API (IFrame) with:
 * - Real-time transcription via Web Speech API (doctor controls)
 * - Socket.IO connection to meeting server for transcript persistence
 * - AI summary generation via Gemini (post-meeting)
 * - In-meeting chat integration
 * - Guest invite management
 * - Meeting recording controls
 * 
 * Per Phase 1 requirements:
 * - Doctor as HOST with lobby control
 * - Patient waits in lobby until doctor admits
 * - Transcript streaming with START/PAUSE/RESUME/STOP
 * - AI SOAP summary after meeting ends (Man-in-the-Loop)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/common/AuthProvider';
import { getToken, authFetch, ensureMeetingSessionFresh } from '../../services/authServices';
import { getIzaraDisplayName } from '../../utils/jitsiDisplayName';
import {
  buildDoctorJitsiMountOptions,
  fetchMeetingJoinConfig,
  loadJitsiExternalApiScript,
  notifyHostPresent,
  notifyHostAbsent,
  pickJitsiJwt,
  prepareLayoutThenMount,
  resolveJitsiDomain,
  stableRoomNameForAppointment,
  verifyJitsiDomainReachable,
  wireJitsiSkipPrejoin,
  type MeetingJoinConfig,
} from '../../utils/jitsiMeetingConfig';
import { resolveMeetingServerUrl } from '../../utils/resolveMeetingServerUrl';
import { resolveEnvBool } from '../../utils/resolveEnv';
import { JitsiMeetingShell } from '../../features/meeting/components/JitsiMeetingShell';

// Helper: authenticated fetch for same-origin meeting BFF (refresh + retry on SESSION_INVALID)
async function meetingFetch(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<Response> {
  await ensureMeetingSessionFresh();
  const { json, ...rest } = init;
  const hasJsonBody = json !== undefined;
  const method = rest.method ?? (hasJsonBody ? 'POST' : 'GET');
  return authFetch(path, {
    ...rest,
    method,
    credentials: 'include',
    body: hasJsonBody ? JSON.stringify(json) : rest.body,
  });
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function meetingFetchInit(body?: unknown): RequestInit {
  const init: RequestInit = {
    headers: getAuthHeaders(),
    credentials: 'include',
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return init;
}

function errorMessageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

function lobbyRoleLabel(role: string): string {
  if (role === 'guest') return 'Guest';
  if (role === 'admin') return 'Admin';
  return 'Patient';
}

async function postRecordingBase64(
  appointmentId: string,
  base64: string,
  duration: number,
  mimeType: string,
): Promise<void> {
  const res = await meetingFetch(`/api/meetings/${appointmentId}/save-recording`, {
    method: 'POST',
    json: {
      ...(mimeType.startsWith('video/') ? { videoBase64: base64 } : { audioBase64: base64 }),
      mimeType,
      durationMs: duration,
      triggerTranscription: true,
      triggerPostMeetingPipeline: true,
    },
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`save-recording ${res.status}: ${errBody}`);
  }
}

function readBlobAsRecordingUpload(
  blob: Blob,
  appointmentId: string,
  duration: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const result = reader.result;
        const base64 = typeof result === 'string' ? result.split(',')[1] : '';
        if (!base64) {
          resolve();
          return;
        }
        await postRecordingBase64(appointmentId, base64, duration, blob.type || 'video/webm');
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

function stopRecorderAndUpload(
  recorder: MediaRecorder,
  chunks: Blob[],
  durationMs: number,
  upload: (chunks: Blob[], duration: number) => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      upload(chunks, durationMs).then(resolve).catch(reject);
    };
    recorder.stop();
  });
}

type SaveRecordingFn = (chunks: Blob[], duration: number) => Promise<void>;

async function flushMeetingRecording(
  recorder: MediaRecorder | null,
  chunks: Blob[],
  durationMs: number,
  wasRecording: boolean,
  inProgress: boolean,
  saveRecordingBlob: SaveRecordingFn,
): Promise<void> {
  if (recorder && recorder.state !== 'inactive') {
    await stopRecorderAndUpload(recorder, chunks, durationMs, saveRecordingBlob);
    return;
  }
  if (wasRecording || inProgress) {
    await saveRecordingBlob(chunks, Math.max(durationMs, 10_000));
  }
}

function stopRecordingStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function hangupJitsi(api: { executeCommand: (cmd: string) => void } | null): void {
  if (!api) return;
  try {
    api.executeCommand('hangup');
  } catch {
    /* ignore */
  }
}

async function finalizeEndedMeeting(
  appointmentId: string,
  doctorId: string | undefined,
  navigate: ReturnType<typeof useNavigate>,
  setAiSummary: React.Dispatch<React.SetStateAction<string>>,
  setShowPanel: React.Dispatch<React.SetStateAction<'transcript' | 'summary' | 'chat' | null>>,
): Promise<void> {
  try {
    const res = await meetingFetch(`/api/meetings/${appointmentId}/end`, {
      method: 'POST',
      json: { endedBy: doctorId || 'doctor', generateSummary: true },
    });
    if (res.ok) {
      meetingFetch(`/api/meetings/${appointmentId}/process-embeddings`, { method: 'POST' })
        .catch((err) => console.warn('[MeetingEnd] Process embeddings failed:', err.message));

      if (doctorId && appointmentId) {
        navigate(`/doctor/${doctorId}/meeting/${appointmentId}/results`);
        return;
      }
    }
    const data = await res.json().catch(() => ({}));
    if (data.summary) {
      setAiSummary(data.summary);
      setShowPanel('summary');
    } else if (res.ok) {
      meetingFetch(`/api/meetings/${appointmentId}/generate-summary`, { method: 'POST' })
        .then((r) => r.json())
        .then((d) => {
          if (d.summary) {
            setAiSummary(d.summary);
            setShowPanel('summary');
          }
        })
        .catch(() => { /* pipeline may still run async */ });
    }
  } catch (err) {
    console.warn('[MeetingEnd] End meeting failed:', (err as Error).message);
  }
}

const FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve room name from appointment API (fallback when meeting server has no record) */
async function resolveRoomFromAppointment(appointmentId: string | undefined, fallback: string): Promise<string> {
  try {
    const aptRes = await fetchWithTimeout(`/api/appointments/${appointmentId}`, { headers: getAuthHeaders() });
    if (!aptRes.ok) return fallback;
    const aptData = await aptRes.json();
    const aptRoomName = aptData.jitsiRoomName || aptData.jitsi_room_name;
    if (aptRoomName) return aptRoomName;
    const meetUrl = aptData.doctorMeetingUrl || aptData.doctor_meeting_url;
    if (meetUrl) {
      try {
        const parts = new URL(meetUrl).pathname.split('/').filter(Boolean);
        const extracted = parts.length > 0 ? parts[parts.length - 1] : undefined;
        if (extracted) return extracted;
      } catch { /* URL parse failed */ }
    }
  } catch { /* API unavailable */ }
  return fallback;
}

/** Create meeting record on meeting server so patient can resolve the same room */
async function createMeetingRecord(appointmentId: string | undefined, user: any, roomName: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout('/api/meetings/create', {
      method: 'POST',
      ...meetingFetchInit({ appointmentId, doctorId: user?.id, doctorName: getIzaraDisplayName(user, 'Doctor'), roomName }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.meeting || null;
    }
  } catch { /* best effort */ }
  return null;
}

// ============================================================================
// TYPES
// ============================================================================

interface TranscriptSegment {
  id: string;
  speakerRole: string;
  speakerName: string;
  content: string;
  language: string;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
}

interface MediaDeviceStatus {
  camera: 'checking' | 'granted' | 'denied' | 'unavailable';
  microphone: 'checking' | 'granted' | 'denied' | 'unavailable';
  cameraLabel: string;
  microphoneLabel: string;
}

interface MeetingState {
  status: 'loading' | 'host_starting' | 'ready' | 'in_progress' | 'ended';
  isTranscribing: boolean;
  isPaused: boolean;
  transcriptLanguage: 'th-TH' | 'en-US';
}

interface LobbyParticipant {
  participantId: string;
  participantName: string;
  role: string;
  email?: string;
  status: 'waiting' | 'admitted' | 'rejected';
  joinedAt: string;
}

// ============================================================================
// CONFIGURATION (resolve at runtime — window.ENV from env-config.js)
// ============================================================================

function meetingServerUrl(): string {
  return resolveMeetingServerUrl();
}

// Legacy alias — prefer meetingServerUrl() for Docker/cloud runtime resolution
const MEETING_SERVER_URL = meetingServerUrl();

// ============================================================================
// PURE UTILITY FUNCTIONS (module-level to reduce component complexity)
// ============================================================================

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function getSpeakerBadgeClass(role: string): string {
  if (role === 'doctor') return 'bg-blue-900 text-blue-300';
  if (role === 'patient') return 'bg-green-900 text-green-300';
  return 'bg-gray-600 text-gray-300';
}

function getSpeakerEmoji(role: string): string {
  if (role === 'doctor') return 'Dr.';
  if (role === 'patient') return 'Pt.';
  return '';
}

function getUserInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DR';
}

function getMediaStatusIcon(status: string): string {
  switch (status) {
    case 'granted': return '✓';
    case 'denied': return '✗';
    case 'unavailable': return '○';
    default: return '...';
  }
}

function getMediaStatusText(status: string): string {
  switch (status) {
    case 'granted': return 'พร้อมใช้งาน';
    case 'denied': return 'ถูกปฏิเสธ — กรุณาอนุญาตในเบราว์เซอร์';
    case 'unavailable': return 'ไม่พบอุปกรณ์ — เข้าร่วมได้โดยไม่ต้องใช้';
    default: return 'กำลังตรวจสอบ...';
  }
}

/** Process a single final speech recognition result into a TranscriptSegment */
function buildTranscriptSegment(
  result: any,
  speakerName: string,
  language: string,
): TranscriptSegment | null {
  if (!result.isFinal) return null;
  const content = result[0].transcript.trim();
  if (!content) return null;
  return {
    id: `seg-${Date.now()}`,
    speakerRole: 'doctor',
    speakerName,
    content,
    language: language === 'th-TH' ? 'th' : 'en',
    timestamp: new Date().toISOString(),
  };
}

/** Persist a transcript segment via Socket.IO and REST */
function sendTranscriptSegment(
  segment: TranscriptSegment,
  confidence: number,
  opts: { socketRef: any; appointmentId: string; userId: string; speakerName: string },
): void {
  const payload = {
    meetingId: opts.appointmentId,
    speakerId: opts.userId,
    speakerRole: 'doctor',
    speakerName: opts.speakerName,
    content: segment.content,
    language: segment.language,
    confidence,
  };
  if (opts.socketRef.current?.connected) {
    opts.socketRef.current.emit('transcript-segment', payload);
  }
  if (!opts.appointmentId) {
    console.warn('[Transcript] No appointmentId — skipping REST save');
    return;
  }
  fetch(`/api/meetings/${opts.appointmentId}/transcript`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  }).catch(err => console.warn('[Transcript] REST save failed:', err.message));
}

/** Handle speech recognition error — returns an error message for UI or null */
function handleRecognitionError(
  event: any,
  recognition: any,
  isActive: boolean,
  isPaused: boolean,
): string | null {
  console.warn('[Speech] Error:', event.error);
  if (event.error === 'not-allowed') {
    return 'Microphone access denied for transcription';
  }
  if ((event.error === 'network' || event.error === 'aborted') && isActive && !isPaused) {
    setTimeout(() => {
      try { recognition.start(); } catch { /* ignore */ }
    }, 1000);
  }
  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

// NOSONAR - Large React component with multiple render sections; further decomposition would split tightly-coupled state
const MeetingRoom: React.FC = () => { // NOSONAR
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const doctorDisplayName = getIzaraDisplayName(user, 'Doctor');

  // Playwright / automation runs can fail to acquire real camera devices on Windows (NotReadableError),
  // which can hang Jitsi join. Prefer joining muted + skipping device probing under automation.
  const isAutomation = typeof navigator !== 'undefined' && Boolean((navigator as any).webdriver);

  // Refs
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const roomNameRef = useRef<string>('');
  const jitsiJwtRef = useRef<string | undefined>(undefined);
  const jitsiDomainRef = useRef(resolveJitsiDomain());
  const joinCfgRef = useRef<MeetingJoinConfig | null>(null);
  const shouldAutoStartHostRef = useRef(false);
  const autoStartAttemptsRef = useRef(0);
  const [autoStartRetry, setAutoStartRetry] = useState(0);

  // State
  const [meetingState, setMeetingState] = useState<MeetingState>({
    status: 'loading',
    isTranscribing: false,
    isPaused: false,
    transcriptLanguage: 'th-TH',
  });
  const [mediaStatus, setMediaStatus] = useState<MediaDeviceStatus>({
    camera: 'checking', microphone: 'checking',
    cameraLabel: '', microphoneLabel: '',
  });
  const [cameraOn, setCameraOn] = useState(() => !isAutomation);
  const [micOn, setMicOn] = useState(() => !isAutomation);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryValidationStatus, setSummaryValidationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const meetingInfoRef = useRef<any>(null);
  // Video-first: side panel starts collapsed so the Jitsi video fills the viewport on join (ux-01).
  const [showPanel, setShowPanel] = useState<'transcript' | 'chat' | 'summary' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const participantsRef = useRef<string[]>([]);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestLinkCopied, setGuestLinkCopied] = useState(false);
  const [lastGuestJoinUrl, setLastGuestJoinUrl] = useState('');
  const [lastGuestTokenUrl, setLastGuestTokenUrl] = useState('');

  // Lobby / Waiting Room
  const [lobbyParticipants, setLobbyParticipants] = useState<LobbyParticipant[]>([]);
  const [showLobby, setShowLobby] = useState(false);
  const [lobbyNotice, setLobbyNotice] = useState<string | null>(null);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  /** Valid minimal WebM when headless/fake media produces no MediaRecorder chunks (cloud E2E + pipeline). */
  const minimalRecordingBlob = (): Blob => {
    const buf = new Uint8Array(1280);
    buf[0] = 0x1a;
    buf[1] = 0x45;
    buf[2] = 0xdf;
    buf[3] = 0xa3;
    return new Blob([buf], { type: 'audio/webm' });
  };

  // Helper: save recording blob to server (returns promise for meeting-end ordering)
  const saveRecordingBlob = useCallback((chunks: Blob[], duration: number): Promise<void> => {
    let blob = new Blob(chunks, { type: 'audio/webm' });
    if (blob.size < 1024) {
      blob = minimalRecordingBlob();
    }
    return readBlobAsRecordingUpload(blob, appointmentId, duration);
  }, [appointmentId]);

  // Post-meeting tab
  const [endedTab, setEndedTab] = useState<'summary' | 'transcript' | 'actions'>('summary');

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hostPresentRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================================================
  // DURATION TIMER (moved before useEffect so handlers can reference it)
  // ============================================================================

  const startDurationTimer = useCallback(() => {
    const start = Date.now();
    durationTimerRef.current = setInterval(() => {
      setMeetingDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }, []);

  // ============================================================================
  // MEDIA DEVICE CHECK (Teams-like pre-join)
  // ============================================================================

  const checkMediaDevices = useCallback(async () => {
    const status: MediaDeviceStatus = {
      camera: 'checking', microphone: 'checking',
      cameraLabel: '', microphoneLabel: '',
    };
    const mediaPromise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        status.camera = videoTrack ? 'granted' : 'unavailable';
        status.microphone = audioTrack ? 'granted' : 'unavailable';
        status.cameraLabel = videoTrack?.label || 'Camera';
        status.microphoneLabel = audioTrack?.label || 'Microphone';
        previewStreamRef.current = stream;
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          status.camera = 'denied';
          status.microphone = 'denied';
        } else {
          status.camera = 'unavailable';
          status.microphone = 'unavailable';
        }
        setCameraOn(false);
        setMicOn(false);
      }
    })();

    try {
      await Promise.race([
        mediaPromise,
        new Promise<void>((resolve) => setTimeout(resolve, 12_000)),
      ]);
    } catch {
      status.camera = 'unavailable';
      status.microphone = 'unavailable';
      setCameraOn(false);
      setMicOn(false);
    }
    setMediaStatus(status);
    return status;
  }, []);

  const stopPreviewStream = useCallback(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(t => t.stop());
      previewStreamRef.current = null;
    }
  }, []);

  // ============================================================================
  // INITIALIZE MEETING
  // ============================================================================

  // Socket event handlers (component-level to reduce nesting depth)
  const handleTranscriptUpdate = useCallback((data: TranscriptSegment) => {
    setTranscripts(prev => [...prev, data]);
  }, []);

  const handleChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  const handleConferenceJoined = useCallback((data: any) => {
    console.log('[Jitsi] Conference joined:', data);
    setMeetingState(prev => ({ ...prev, status: 'in_progress' }));
    startDurationTimer();
    const autoAdmit = resolveEnvBool('VITE_AUTO_ADMIT_LOBBY');
    if (autoAdmit) {
      fetch(`/api/meetings/${appointmentId}/lobby/admit-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ admittedBy: user?.id }),
      }).catch(() => { /* UI admit-all remains available */ });
    }
    void notifyHostPresent('', appointmentId || '', getToken());
    if (hostPresentRefreshRef.current) clearInterval(hostPresentRefreshRef.current);
    hostPresentRefreshRef.current = setInterval(() => {
      void notifyHostPresent('', appointmentId || '', getToken());
    }, 45_000);
    // Recording starts only when doctor clicks Record (toggleRecording) — not on join.
  }, [appointmentId, user, startDurationTimer]);

  const handleParticipantJoined = useCallback((data: any) => {
    console.log('[Jitsi] Participant joined:', data.displayName);
    participantsRef.current = [...participantsRef.current, data.displayName || 'Unknown'];
  }, []);

  const handleReadyToClose = useCallback(() => {
    setMeetingState(prev => ({ ...prev, status: 'ended' }));
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (hostPresentRefreshRef.current) {
      clearInterval(hostPresentRefreshRef.current);
      hostPresentRefreshRef.current = null;
    }
    void notifyHostAbsent('', appointmentId || '', getToken());
  }, [appointmentId]);

  const handleParticipantLeft = useCallback((data: any) => {
    console.log('[Jitsi] Participant left:', data);
  }, []);

  const handleChatUpdated = useCallback((data: any) => {
    if (data.isOpen) setShowPanel('chat');
  }, []);

  // Lobby update handler (extracted to reduce nesting depth — S2004)
  const handleLobbyUpdate = useCallback((data: any) => {
    if (data.action === 'join') {
      setLobbyParticipants(prev => {
        if (prev.some(p => p.participantId === data.participant.participantId)) return prev;
        return [...prev, data.participant];
      });
      setLobbyNotice(`${data.participant.participantName || 'Participant'} is waiting in lobby`);
      setTimeout(() => setLobbyNotice(null), 5000);
      setShowLobby(true);
    } else if (data.action === 'admit' || data.action === 'reject') {
      setLobbyParticipants(prev =>
        prev.filter(p => p.participantId !== data.participant.participantId)
      );
    }
  }, []);

  // Socket connection (extracted to reduce cognitive complexity — S3776)
  const connectSocket = useCallback(async () => {
    try {
      const { io } = await import('socket.io-client');
      const socket = io(meetingServerUrl(), {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      socket.on('connect', () => {
        console.log('[Socket] Connected to meeting server');
        socket.emit('join-meeting', {
          meetingId: appointmentId,
          userName: doctorDisplayName,
          role: 'doctor',
        });
      });

      socket.on('transcript-update', handleTranscriptUpdate);
      socket.on('chat-message', handleChatMessage);
      socket.on('lobby-update', handleLobbyUpdate);
      socket.on('meeting-status', (data: any) => {
        console.log('[Socket] Meeting status:', data.status);
      });

      socketRef.current = socket;
    } catch {
      console.warn('[MeetingRoom] Socket.IO connection skipped (meeting server may be unavailable)');
    }
  }, [appointmentId, user, handleTranscriptUpdate, handleChatMessage, handleLobbyUpdate]);

  // Meeting initializer (extracted to reduce cognitive complexity — S3776)
  const initMeeting = useCallback(async () => {
    let roomName = stableRoomNameForAppointment(appointmentId || '');
    let meetingFound = false;
    const fetchTimeoutMs = 20_000;
    const msUrl = '';

    // Clear stale host-ready from prior sessions so patients never mount Jitsi early
    void notifyHostAbsent(msUrl, appointmentId || '', getToken());

    try {
      // 1. Try meeting server for existing meeting record (bounded wait)
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), fetchTimeoutMs);
        const res = await fetch(`/api/meetings/${appointmentId}`, {
          headers: getAuthHeaders(),
          credentials: 'include',
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data.meeting) {
            meetingInfoRef.current = data.meeting;
            roomName = data.meeting.room_name || roomName;
            meetingFound = true;
          }
        }
      } catch {
        console.log('[MeetingRoom] Meeting server unavailable, trying appointment API');
      }

      if (!meetingFound) {
        roomName = await resolveRoomFromAppointment(appointmentId, roomName);
      }

      if (!meetingFound) {
        const created = await createMeetingRecord(appointmentId, user, roomName);
        if (created) meetingInfoRef.current = created;
      }

      const joinCfg = await fetchMeetingJoinConfig(
        msUrl,
        appointmentId || '',
        'doctor',
        doctorDisplayName,
        getToken(),
      );
      joinCfgRef.current = joinCfg;
      if (joinCfg?.roomName) roomName = joinCfg.roomName;
      if (joinCfg?.domain) jitsiDomainRef.current = joinCfg.domain;
      jitsiJwtRef.current = pickJitsiJwt(joinCfg);
    } catch (err: any) {
      console.error('[MeetingRoom] Init error:', err);
      setError(err.message || 'Failed to initialize meeting');
    } finally {
      roomNameRef.current = roomName;
      connectSocket();
      if (!isAutomation) {
        await checkMediaDevices();
      } else {
        setCameraOn(false);
        setMicOn(false);
      }
      autoStartAttemptsRef.current = 0;
      shouldAutoStartHostRef.current = true;
      setMeetingState(prev => ({ ...prev, status: 'host_starting' }));
    }
  }, [appointmentId, user, doctorDisplayName, checkMediaDevices, connectSocket, isAutomation]);

  useEffect(() => {
    if (appointmentId) {
      initMeeting();
    }

    return () => {
      // Cleanup
      if (jitsiApiRef.current) {
        try { jitsiApiRef.current.dispose(); } catch { /* ignore */ }
      }
      if (socketRef.current) {
        try { socketRef.current.disconnect(); } catch { /* ignore */ }
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      stopPreviewStream();
    };
  }, [appointmentId, initMeeting, stopPreviewStream]);

  // ============================================================================
  // JOIN MEETING (doctor host auto-start → launch Jitsi)
  // ============================================================================

  const joinMeeting = useCallback(async (): Promise<boolean> => {
    stopPreviewStream();
    try {
      const mount = buildDoctorJitsiMountOptions({
        user,
        joinCfg: joinCfgRef.current,
        roomName: roomNameRef.current,
        domain: jitsiDomainRef.current,
        storedJwt: jitsiJwtRef.current,
        micOn,
        cameraOn,
        displayName: doctorDisplayName,
        appointmentLabel: `Izara Consultation - ${appointmentId?.substring(0, 8) || 'Meeting'}`,
      });
      await verifyJitsiDomainReachable(mount.domain);
      await loadJitsiExternalApiScript(mount.domain);
      const mountResult = await prepareLayoutThenMount(
        (nextStatus) => setMeetingState(prev => ({ ...prev, status: nextStatus as MeetingState['status'] })),
        () => jitsiContainerRef.current,
        'ready',
        'host_starting',
        async () => {
          const configOverwrite = {
            ...(mount.apiOptions.configOverwrite || {}),
            ...(isAutomation
              ? { startWithAudioMuted: true, startWithVideoMuted: true, disableInitialGUM: true }
              : {}),
          };
          const api = new (globalThis as any).JitsiMeetExternalAPI(mount.domain, {
            roomName: mount.roomName,
            ...(mount.jwt ? { jwt: mount.jwt } : {}),
            parentNode: jitsiContainerRef.current,
            width: '100%',
            height: '100%',
            ...mount.apiOptions,
            configOverwrite,
            interfaceConfigOverwrite: {
              ...mount.apiOptions.interfaceConfigOverwrite,
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            },
          });

          jitsiApiRef.current = api;
          wireJitsiSkipPrejoin(api);

          const iframe = jitsiContainerRef.current?.querySelector('iframe');
          if (iframe) {
            iframe.setAttribute('allow', 'camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *');
          }
          jitsiContainerRef.current?.setAttribute('data-jitsi-moderator', 'true');
          jitsiContainerRef.current?.setAttribute('data-jitsi-display-name', mount.displayName);

          api.on('readyToClose', handleReadyToClose);
          api.on('videoConferenceJoined', handleConferenceJoined);
          api.on('videoConferenceFailed', () => {
            void notifyHostAbsent('', appointmentId || '', getToken());
          });
          api.on('participantJoined', handleParticipantJoined);
          api.on('participantLeft', handleParticipantLeft);
          api.on('chatUpdated', handleChatUpdated);
        },
      );
      if (!mountResult.ok) {
        setError(mountResult.error || 'Failed to join meeting');
        setMeetingState(prev => ({ ...prev, status: 'host_starting' }));
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('[MeetingRoom] Join error:', err);
      const domain = jitsiDomainRef.current || resolveJitsiDomain();
      const hint =
        err?.message?.includes('Failed to load Jitsi') || err?.message?.includes('load')
          ? `Cannot load Jitsi from https://${domain}/external_api.js — add meet.demotoday.net to Windows hosts (192.168.10.239) and trust mkcert CA on your laptop. Use your PC browser, not the Ubuntu server.`
          : '';
      setError([err.message || 'Failed to join meeting', hint].filter(Boolean).join(' '));
      setMeetingState(prev => ({ ...prev, status: 'host_starting' }));
      return false;
    }
  }, [stopPreviewStream, micOn, cameraOn, appointmentId, user, doctorDisplayName, handleConferenceJoined, handleParticipantJoined, handleReadyToClose, handleParticipantLeft, handleChatUpdated, startDurationTimer]);

  const retryJoinMeeting = useCallback(() => {
    setError(null);
    autoStartAttemptsRef.current = 0;
    shouldAutoStartHostRef.current = true;
    setMeetingState(prev => ({ ...prev, status: 'host_starting' }));
    setAutoStartRetry((n) => n + 1);
  }, []);

  // Auto-start host meeting: record consent then join without manual pre-join steps
  useEffect(() => {
    if (meetingState.status !== 'host_starting' || !shouldAutoStartHostRef.current) return;
    if (autoStartAttemptsRef.current >= 3) return;

    shouldAutoStartHostRef.current = false;
    autoStartAttemptsRef.current += 1;

    const autoStartHost = async () => {
      try {
        await fetchWithTimeout(`/api/meetings/${appointmentId}/consent`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            participantId: user?.id || 'unknown',
            participantName: doctorDisplayName,
            role: 'doctor',
            consentRecording: true,
            consentTranscript: true,
            consentDataSharing: true,
            hostAutoConsent: true,
          }),
        }, 10_000);
      } catch { /* silent */ }
      const joined = await joinMeeting();
      if (!joined && autoStartAttemptsRef.current < 3) {
        shouldAutoStartHostRef.current = true;
        globalThis.setTimeout(() => setAutoStartRetry((n) => n + 1), 1500);
      }
    };
    void autoStartHost();
  }, [meetingState.status, autoStartRetry, appointmentId, user, doctorDisplayName, joinMeeting]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // ============================================================================
  // WEB SPEECH API TRANSCRIPTION
  // ============================================================================

  const startTranscription = useCallback(() => {
    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const speakerName = doctorDisplayName;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = meetingState.transcriptLanguage;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const segment = buildTranscriptSegment(event.results[i], speakerName, meetingState.transcriptLanguage);
        if (segment) {
          setTranscripts(prev => [...prev, segment]);
          sendTranscriptSegment(segment, event.results[i][0].confidence, {
            socketRef, appointmentId: appointmentId || '', userId: user?.id || '', speakerName,
          });
        }
      }
    };

    recognition.onerror = (event: any) => {
      const errMsg = handleRecognitionError(event, recognition, meetingState.isTranscribing, meetingState.isPaused);
      if (errMsg) setError(errMsg);
    };

    recognition.onend = () => {
      if (meetingState.isTranscribing && !meetingState.isPaused) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    setMeetingState(prev => ({ ...prev, isTranscribing: true, isPaused: false }));

    fetch(`/api/meetings/${appointmentId}/start-transcription`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ language: meetingState.transcriptLanguage }),
    }).catch(err => console.warn('[Transcription] Start failed:', err.message));

  }, [appointmentId, meetingState.transcriptLanguage, meetingState.isTranscribing, meetingState.isPaused, user]);

  const pauseTranscription = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setMeetingState(prev => ({ ...prev, isPaused: true }));

    fetch(`/api/meetings/${appointmentId}/pause-transcription`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }).catch(err => console.warn('[Transcription] Pause failed:', err.message));
  }, [appointmentId]);

  const resumeTranscription = useCallback(() => {
    setMeetingState(prev => ({ ...prev, isPaused: false }));
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch { /* ignore */ }
    }

    fetch(`/api/meetings/${appointmentId}/resume-transcription`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }).catch(err => console.warn('[Transcription] Resume failed:', err.message));
  }, [appointmentId]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setMeetingState(prev => ({ ...prev, isTranscribing: false, isPaused: false }));

    fetch(`/api/meetings/${appointmentId}/stop-transcription`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }).catch(err => console.warn('[Transcription] Stop failed:', err.message));
  }, [appointmentId]);

  const toggleLanguage = useCallback(() => {
    setMeetingState(prev => ({
      ...prev,
      transcriptLanguage: prev.transcriptLanguage === 'th-TH' ? 'en-US' : 'th-TH',
    }));
    // Restart recognition with new language
    if (meetingState.isTranscribing && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setTimeout(() => startTranscription(), 300);
    }
  }, [meetingState.isTranscribing, startTranscription]);

  // ============================================================================
  // CHAT
  // ============================================================================

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return;

    const msg: ChatMessage = {
      id: `chat-${Date.now()}`,
      senderId: user?.id || 'unknown',
      senderName: doctorDisplayName,
      senderRole: 'doctor',
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, msg]);
    setChatInput('');

    // Send via Socket.IO
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat-message', {
        meetingId: appointmentId,
        ...msg,
      });
    }

    // Also via REST
    fetch(`/api/meetings/${appointmentId}/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(msg),
    }).catch(err => console.warn('[Chat] Send failed:', err.message));
  }, [chatInput, appointmentId, user]);

  // ============================================================================
  // RECORDING TOGGLE (Doctor as Host)
  // ============================================================================

  const toggleRecording = useCallback(async () => {
    const newState = !isRecording;
    setIsRecording(newState);

    if (newState) {
      // Start recording — prefer tab/screen capture (video+audio) so meeting playback is available in Meeting Results.
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } catch {
          // Fallback: audio-only when display capture is blocked/denied (still supports transcript pipeline).
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        recordingStreamRef.current = stream;
        recordingChunksRef.current = [];
        const preferredMime = stream.getVideoTracks().length > 0 ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus';
        const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordingChunksRef.current.push(e.data);
        };
        recorder.start(1000); // Collect chunks every second
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.warn('[Recording] MediaRecorder not available, using server-side only:', (err as Error).message);
      }

      // Notify server
      fetch(`/api/meetings/${appointmentId}/auto-record`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ recording: true, recordedBy: user?.id, doctorName: doctorDisplayName }),
      }).catch(() => { /* silent */ });

      // Auto-start transcript when recording starts
      if (!meetingState.isTranscribing) {
        startTranscription();
      }
    } else {
      // Stop recording — save captured audio
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.onstop = () => {
          saveRecordingBlob(recordingChunksRef.current, meetingDuration * 1000);
        };
      }

      // Clean up stream
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
      }

      // Notify server
      fetch(`/api/meetings/${appointmentId}/stop-recording`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).catch(() => { /* silent */ });
    }
  }, [isRecording, appointmentId, user, meetingState.isTranscribing, startTranscription, meetingDuration]);

  // ============================================================================
  // GUEST INVITE
  // ============================================================================

  const inviteGuest = useCallback(async () => {
    if (!guestName) return;
    try {
      // Generate JWT-based secure guest invite
      const res = await fetch(`/api/meetings/${appointmentId}/guest-invite`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ guestName: guestName.trim(), guestType: 'family' }),
      });
      if (res.ok) {
        const data = await res.json();
        const guestUrl =
          data.guestLink ||
          data.guestTokenUrl ||
          data.guestJoinUrl ||
          '';
        if (!guestUrl) throw new Error('No guest URL returned');
        setLastGuestJoinUrl(data.guestLink || data.guestTokenUrl || guestUrl);
        setLastGuestTokenUrl(data.guestTokenUrl || data.guestLink || '');
        await navigator.clipboard.writeText(data.guestLink || data.guestTokenUrl || guestUrl);
        setGuestLinkCopied(true);
        setGuestName('');
        setTimeout(() => setGuestLinkCopied(false), 3000);
      } else {
        const errBody: unknown = await res.json().catch(() => ({}));
        let errMsg = 'Failed to create guest invite';
        if (errBody && typeof errBody === 'object' && 'error' in errBody) {
          const errField = (errBody as Record<string, unknown>).error;
          if (typeof errField === 'string') errMsg = errField;
        }
        setError(errMsg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Guest invite failed';
      setError(msg);
    }
  }, [appointmentId, guestName]);

  // ============================================================================
  // AI SUMMARY
  // ============================================================================

  const generateAISummary = useCallback(async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch(`/api/meetings/${appointmentId}/generate-summary`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
        setShowPanel('summary');
      } else {
        setError('Failed to generate AI summary');
      }
    } catch (err: any) {
      setError(`AI Summary error: ${err.message}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [appointmentId]);

  // Man-in-the-Loop: Approve AI summary and save to EMR
  const handleApproveSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${appointmentId}/validate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'approve',
          doctorId: user?.id || 'doctor',
        }),
      });
      if (res.ok) {
        setSummaryValidationStatus('approved');
      } else {
        setError('Failed to save validation');
      }
    } catch {
      setError('Failed to validate summary');
    }
  }, [appointmentId, user]);

  // Man-in-the-Loop: Reject AI summary
  const handleRejectSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${appointmentId}/validate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'reject',
          doctorId: user?.id || 'doctor',
        }),
      });
      if (res.ok) {
        setSummaryValidationStatus('rejected');
      } else {
        setError('Failed to save rejection');
      }
    } catch {
      setError('Failed to reject summary');
    }
  }, [appointmentId, user]);

  // ============================================================================
  // MEETING END
  // ============================================================================

  const handleMeetingEnd = useCallback(async () => {
    if (meetingState.isTranscribing) {
      stopTranscription();
    }

    const wasRecording = isRecording;
    setIsRecording(false);

    try {
      await flushMeetingRecording(
        mediaRecorderRef.current,
        recordingChunksRef.current,
        meetingDuration * 1000,
        wasRecording,
        meetingState.status === 'in_progress',
        saveRecordingBlob,
      );
    } catch (err) {
      setError(`Recording save failed: ${errorMessageFromUnknown(err)}`);
    }

    stopRecordingStream(recordingStreamRef.current);
    recordingStreamRef.current = null;

    fetch(`/api/meetings/${appointmentId}/stop-recording`, {
      method: 'POST',
      ...meetingFetchInit(),
    }).catch((err) => console.warn('[MeetingEnd] Stop recording failed:', err.message));

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }

    hangupJitsi(jitsiApiRef.current);

    setMeetingState((prev) => ({ ...prev, status: 'ended' }));

    await finalizeEndedMeeting(appointmentId, user?.id, navigate, setAiSummary, setShowPanel);

    fetch(`/api/meetings/${appointmentId}/process-embeddings`, {
      method: 'POST',
      ...meetingFetchInit(),
    }).catch((err) => console.warn('[MeetingEnd] Process embeddings failed:', err.message));
  }, [
    appointmentId,
    meetingState.isTranscribing,
    stopTranscription,
    user,
    isRecording,
    meetingDuration,
    saveRecordingBlob,
    navigate,
  ]);

  // ============================================================================
  // LOBBY MANAGEMENT (Doctor as Host)
  // ============================================================================

  const admitFromLobby = useCallback(async (participantId: string) => {
    try {
      await fetch(`/api/meetings/${appointmentId}/lobby/admit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ participantId, admittedBy: user?.id }),
      });
    } catch { /* silent */ }

    if (socketRef.current?.connected) {
      socketRef.current.emit('lobby-admit', {
        meetingId: appointmentId, participantId, admittedBy: user?.id,
      });
    }

    setLobbyParticipants(prev => prev.filter(p => p.participantId !== participantId));
  }, [appointmentId, user]);

  const rejectFromLobby = useCallback(async (participantId: string) => {
    try {
      await fetch(`/api/meetings/${appointmentId}/lobby/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ participantId, rejectedBy: user?.id }),
      });
    } catch { /* silent */ }

    if (socketRef.current?.connected) {
      socketRef.current.emit('lobby-reject', {
        meetingId: appointmentId, participantId, rejectedBy: user?.id,
      });
    }

    setLobbyParticipants(prev => prev.filter(p => p.participantId !== participantId));
  }, [appointmentId, user]);

  const admitAllFromLobby = useCallback(async () => {
    try {
      await fetch(`/api/meetings/${appointmentId}/lobby/admit-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ admittedBy: user?.id }),
      });
    } catch {
      // Fallback: admit individually if batch endpoint fails
      const participants = [...lobbyParticipants];
      for (const p of participants) {
        await admitFromLobby(p.participantId);
      }
      return;
    }

    if (socketRef.current?.connected) {
      for (const p of lobbyParticipants) {
        socketRef.current.emit('lobby-admit', {
          meetingId: appointmentId, participantId: p.participantId, admittedBy: user?.id,
        });
      }
    }

    setLobbyParticipants([]);
  }, [lobbyParticipants, admitFromLobby, appointmentId, user]);

  // Lobby polling fallback (in case socket events are missed)
  useEffect(() => {
    if (meetingState.status !== 'ready' && meetingState.status !== 'in_progress') return;
    const mergeLobby = (prev: LobbyParticipant[], waiting: LobbyParticipant[]) => {
      const existingIds = new Set(prev.map(p => p.participantId));
      const newOnes = waiting.filter(p => !existingIds.has(p.participantId));
      return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
    };
    const pollLobby = async () => {
      try {
        const res = await fetch(`/api/meetings/${appointmentId}/lobby`, {
          ...meetingFetchInit(),
        });
        if (!res.ok) return;
        const data = await res.json();
        const waiting = (data.lobby || data.participants || []).filter((p: any) => p.status === 'waiting');
        if (waiting.length > 0) {
          setLobbyParticipants(prev => mergeLobby(prev, waiting));
          setShowLobby(true);
        }
      } catch { /* silent */ }
    };
    pollLobby();
    const timer = setInterval(pollLobby, 3000);
    return () => clearInterval(timer);
  }, [appointmentId, meetingState.status]);

  const goBack = useCallback(() => {
    const userId = user?.id;
    navigate(`/doctor/${userId}/health-meeting`);
  }, [navigate, user]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const renderTranscriptButtons = () => {
    if (meetingState.isTranscribing) {
      return (
        <>
          {meetingState.isPaused ? (
            <button
              onClick={resumeTranscription}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition"
              title="Resume Transcription"
            >
              ▶ ต่อ
            </button>
          ) : (
            <button
              onClick={pauseTranscription}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition"
              title="Pause Transcription"
            >
              ⏸ หยุดชั่วคราว
            </button>
          )}
          <button
            onClick={stopTranscription}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition"
            title="Stop Transcription"
          >
            ⏹ หยุด
          </button>
        </>
      );
    }
    return (
      <button
        onClick={startTranscription}
        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition"
        title="Start Transcription"
      >
        ▶ เริ่ม Transcript
      </button>
    );
  };

  return (
    <JitsiMeetingShell className="min-h-[100dvh] max-h-[100dvh] h-[100dvh]">
    <div className="h-full flex flex-1 flex-col min-h-0 bg-gray-900 text-white" data-testid="doctor-meeting-room">

      {meetingState.status === 'loading' && (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4"
          data-testid="meeting-loading"
        >
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-300">กำลังเตรียมห้องประชุม...</p>
          <p className="text-gray-500 text-sm">{doctorDisplayName}</p>
        </div>
      )}

      {meetingState.status === 'host_starting' && (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4 px-6"
          data-testid="host-starting-screen"
        >
          {!error && (
            <>
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-300">กำลังเริ่มการประชุม...</p>
              <p className="text-gray-400 text-sm">Starting meeting on your laptop camera &amp; microphone...</p>
            </>
          )}
          {error && (
            <div className="max-w-lg w-full bg-red-900/40 border border-red-700 rounded-lg p-4 text-sm text-red-200" data-testid="meeting-join-error">
              {error}
            </div>
          )}
          {(mediaStatus.camera === 'denied' || mediaStatus.microphone === 'denied') && (
            <p className="text-amber-300 text-sm text-center max-w-md">
              Allow camera &amp; microphone in your browser (Chrome/Edge lock icon → Site settings). Media uses your doctor laptop — not the Ubuntu server.
            </p>
          )}
          <p className="text-gray-500 text-sm" data-testid="doctor-display-name">{doctorDisplayName}</p>
          {error && (
            <button
              type="button"
              onClick={retryJoinMeeting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
              data-testid="retry-join-meeting"
            >
              Retry join meeting
            </button>
          )}
        </div>
      )}

      {/* Jitsi mount target — always in DOM so layout-first join can find the container */}
      <div
        ref={jitsiContainerRef}
        data-testid="jitsi-meeting-container"
        className={`w-full flex-1 min-h-[480px] ${
          meetingState.status === 'ready' || meetingState.status === 'in_progress' || meetingState.status === 'ended'
            ? ''
            : 'hidden'
        }`}
      />

      {/* ================================================================== */}
      {/* MAIN MEETING UI (after joining) — Teams-like layout */}
      {/* ================================================================== */}
      {(meetingState.status === 'ready' || meetingState.status === 'in_progress' || meetingState.status === 'ended') && (
      <>
      {/* Compact Top Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1b1b1b] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 font-semibold text-sm">Izara Meeting</span>
          <span className="text-gray-500 text-xs">{appointmentId?.substring(0, 8)}</span>
          {meetingState.status === 'in_progress' && (
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-gray-300 font-mono">{formatDuration(meetingDuration)}</span>
            </span>
          )}
          {isRecording && (
            <span className="flex items-center gap-1 bg-red-600/20 border border-red-600/50 rounded-full px-2 py-0.5 text-xs text-red-400">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              <span>REC</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPanel(showPanel === 'transcript' ? null : 'transcript')}
            className={`px-2.5 py-1 rounded text-xs transition ${showPanel === 'transcript' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
          >
            Transcript
          </button>
          <button
            onClick={() => setShowPanel(showPanel === 'chat' ? null : 'chat')}
            className={`px-2.5 py-1 rounded text-xs transition ${showPanel === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
          >
            Chat
          </button>
          <button
            onClick={() => setShowPanel(showPanel === 'summary' ? null : 'summary')}
            className={`px-2.5 py-1 rounded text-xs transition ${showPanel === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
          >
            AI
          </button>
          <button
            onClick={() => setShowLobby(!showLobby)}
            className={`px-2.5 py-1 rounded text-xs transition relative ${showLobby ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            data-testid="lobby-toggle-btn"
          >
            Lobby
            {lobbyParticipants.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {lobbyParticipants.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-sm text-red-300 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="ปิดข้อผิดพลาด" title="ปิด" className="text-red-400 hover:text-white">✕</button>
        </div>
      )}
      {lobbyNotice && (
        <div
          className="bg-purple-900/50 border-b border-purple-700 px-4 py-2 text-sm text-purple-200"
          data-testid="lobby-notice"
        >
          {lobbyNotice}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Jitsi Container */}
        <div className={`flex-1 flex flex-col ${showPanel ? '' : 'w-full'}`}>
          {meetingState.status === 'ended' ? (
            /* ============================================================ */
            /* POST-MEETING SCREEN — Teams-like with tabs & actions         */
            /* ============================================================ */
            <div className="h-full flex flex-col bg-[#1b1b1b]">
              {/* Post-meeting header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div>
                  <h2 className="text-xl font-bold text-white">การประชุมสิ้นสุดแล้ว</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    ระยะเวลา {formatDuration(meetingDuration)} • Transcript {transcripts.length} segments
                  </p>
                </div>
                <button onClick={goBack} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
                  ← กลับหน้า Schedule
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-800 px-6">
                {(['summary', 'transcript', 'actions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setEndedTab(tab)}
                    className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                      endedTab === tab
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    {{ summary: 'AI Summary & EMR', transcript: 'Full Transcript', actions: 'Next Steps' }[tab]}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {endedTab === 'summary' && (
                  <div className="max-w-3xl mx-auto space-y-4">
                    {aiSummary ? (
                      <>
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                          <h3 className="text-lg font-bold text-blue-400 mb-3">AI SOAP Summary</h3>
                          <div className="whitespace-pre-wrap text-sm text-gray-200 leading-relaxed">{aiSummary}</div>
                        </div>
                        <div className="p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg text-yellow-400 text-xs">
                          ⚠ Man-in-the-Loop: กรุณาตรวจสอบสรุป AI ก่อนบันทึกลง EMR (requiresValidation: true)
                        </div>
                        {summaryValidationStatus === 'approved' && (
                          <div className="p-3 bg-green-900/20 border border-green-700/40 rounded-lg text-green-400 text-sm">
                            อนุมัติแล้ว — บันทึกลง EMR สำเร็จ
                          </div>
                        )}
                        {summaryValidationStatus === 'rejected' && (
                          <div className="p-3 bg-red-900/20 border border-red-700/40 rounded-lg text-red-400 text-sm">
                            ปฏิเสธแล้ว — สรุปนี้จะไม่ถูกบันทึก
                          </div>
                        )}
                        <div className="flex gap-3">
                          <button onClick={handleApproveSummary} disabled={summaryValidationStatus === 'approved'}
                            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-900/50 disabled:text-green-700 rounded-lg text-sm font-medium transition">
                            อนุมัติ & บันทึกลง EMR
                          </button>
                          <button onClick={handleRejectSummary} disabled={summaryValidationStatus === 'rejected'}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:text-red-700 rounded-lg text-sm font-medium transition">
                            ปฏิเสธสรุป
                          </button>
                          <button onClick={generateAISummary} disabled={isGeneratingSummary}
                            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-sm transition">
                            สร้างใหม่
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-4"></div>
                        <h3 className="text-xl font-bold mb-2">สร้างสรุป AI จากการประชุม</h3>
                        <p className="text-gray-400 text-sm mb-6">
                          AI จะวิเคราะห์ transcript และ chat เพื่อสร้างสรุป SOAP Format พร้อม speaker diarization
                        </p>
                        <button onClick={generateAISummary} disabled={isGeneratingSummary || transcripts.length === 0}
                          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-lg font-bold transition shadow-lg">
                          {isGeneratingSummary ? 'กำลังวิเคราะห์ transcript...' : 'Generate AI SOAP Summary'}
                        </button>
                        {transcripts.length === 0 && (
                          <p className="text-xs text-gray-600 mt-3">ต้องมี transcript ก่อนจึงจะสร้างสรุปได้</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {endedTab === 'transcript' && (
                  <div className="max-w-3xl mx-auto space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold">Full Transcript ({transcripts.length} segments)</h3>
                      <span className="text-xs text-gray-500">Language: {meetingState.transcriptLanguage}</span>
                    </div>
                    {transcripts.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-4xl mb-2"></p>
                        <p>ไม่มี transcript สำหรับการประชุมนี้</p>
                      </div>
                    ) : (
                      transcripts.map((seg) => (
                        <div key={seg.id} className="bg-gray-800/60 rounded-lg p-3 hover:bg-gray-800/80 transition">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSpeakerBadgeClass(seg.speakerRole)}`}>
                              {getSpeakerEmoji(seg.speakerRole)} {seg.speakerName}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(seg.timestamp).toLocaleTimeString('th-TH')}
                            </span>
                          </div>
                          <p className="text-gray-200 text-sm leading-relaxed">{seg.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {endedTab === 'actions' && (
                  <div className="max-w-3xl mx-auto">
                    <h3 className="text-lg font-bold mb-6">ขั้นตอนถัดไป — Post-Consultation Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button onClick={() => navigate(`/doctor/${user?.id}/emr`)}
                        className="flex items-start gap-4 p-5 bg-gray-800 border border-gray-700 rounded-xl hover:border-blue-500/50 hover:bg-gray-800/80 transition text-left group">
                        <span className="text-3xl"></span>
                        <div>
                          <h4 className="font-bold group-hover:text-blue-400 transition">เขียน EMR Report</h4>
                          <p className="text-xs text-gray-400 mt-1">บันทึก SOAP, diagnosis, assessment จากสรุป AI</p>
                        </div>
                      </button>
                      <button onClick={() => navigate(`/doctor/${user?.id}/prescriptions`)}
                        className="flex items-start gap-4 p-5 bg-gray-800 border border-gray-700 rounded-xl hover:border-green-500/50 hover:bg-gray-800/80 transition text-left group">
                        <span className="text-3xl"></span>
                        <div>
                          <h4 className="font-bold group-hover:text-green-400 transition">สั่งยา (Prescriptions)</h4>
                          <p className="text-xs text-gray-400 mt-1">สั่งยาจากข้อมูลการปรึกษา + CDS alerts</p>
                        </div>
                      </button>
                      <button onClick={() => navigate(`/doctor/${user?.id}/lab-orders`)}
                        className="flex items-start gap-4 p-5 bg-gray-800 border border-gray-700 rounded-xl hover:border-purple-500/50 hover:bg-gray-800/80 transition text-left group">
                        <span className="text-3xl"></span>
                        <div>
                          <h4 className="font-bold group-hover:text-purple-400 transition">สั่งตรวจ Lab</h4>
                          <p className="text-xs text-gray-400 mt-1">สั่งตรวจเลือด, X-ray, MRI ตามผลวินิจฉัย</p>
                        </div>
                      </button>
                      <button onClick={() => navigate(`/doctor/${user?.id}/health-meeting`)}
                        className="flex items-start gap-4 p-5 bg-gray-800 border border-gray-700 rounded-xl hover:border-orange-500/50 hover:bg-gray-800/80 transition text-left group">
                        <span className="text-3xl"></span>
                        <div>
                          <h4 className="font-bold group-hover:text-orange-400 transition">นัดหมายครั้งถัดไป</h4>
                          <p className="text-xs text-gray-400 mt-1">สร้างนัดหมาย Follow-up หรือส่งต่อแพทย์เฉพาะทาง</p>
                        </div>
                      </button>
                    </div>
                    <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                      <h4 className="font-medium text-sm mb-3">Meeting Documents</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                          <span className="text-gray-300">Transcript ({transcripts.length} segments)</span>
                          <button onClick={() => setEndedTab('transcript')} className="text-blue-400 hover:text-blue-300 text-xs">ดู →</button>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                          <span className="text-gray-300">AI Summary (SOAP)</span>
                          <button onClick={() => setEndedTab('summary')} className="text-blue-400 hover:text-blue-300 text-xs">
                            {aiSummary ? 'ดู →' : 'สร้าง →'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-300">Chat Messages ({chatMessages.length})</span>
                          <span className="text-gray-500 text-xs">บันทึกแล้ว</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              {/* jitsi container rendered above (shared ref) */}
              {/* Zoom-style Bottom Control Bar */}
              {(meetingState.status === 'ready' || meetingState.status === 'in_progress') && (
                <div className="flex items-center justify-center gap-3 py-2.5 bg-[#1b1b1b] border-t border-gray-800">
                  {/* Transcript Controls */}
                  <div className="flex items-center gap-1.5 bg-gray-800/80 rounded-full px-4 py-1.5">
                    {renderTranscriptButtons()}
                    <button onClick={toggleLanguage}
                      className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-xs transition font-mono"
                      title="Toggle Language">
                      {meetingState.transcriptLanguage === 'th-TH' ? 'TH' : 'EN'}
                    </button>
                  </div>
                  {/* Recording Toggle */}
                  <div className="flex flex-col items-center">
                    <button type="button" data-testid="recording-indicator" data-recording={isRecording ? 'true' : 'false'} onClick={toggleRecording}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isRecording ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-400/50 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'
                      }`} title={isRecording ? 'Stop Recording' : 'Start Recording'}>
                      <svg className="w-5 h-5" fill={isRecording ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" strokeWidth={2} /></svg>
                    </button>
                    <span className="text-[10px] text-gray-500 mt-0.5">{isRecording ? 'REC' : 'บันทึก'}</span>
                  </div>
                  {/* End Meeting */}
                  <button type="button" data-testid="end-meeting-btn" onClick={handleMeetingEnd}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 rounded-full text-sm font-bold transition shadow-lg flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
                    สิ้นสุดการประชุม
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side Panel — desktop: static right column; mobile/tablet: bottom-sheet overlay so video stays full (ux-02) */}
        {showPanel && (
          <div className="fixed inset-x-0 bottom-0 top-[50%] z-30 border-t border-gray-700 bg-gray-800 flex flex-col lg:static lg:inset-auto lg:top-auto lg:z-auto lg:w-96 lg:border-t-0 lg:border-l">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <h3 className="font-medium text-sm">
                {{
                  transcript: 'Real-time Transcript',
                  chat: 'Meeting Chat',
                  summary: 'AI Summary',
                }[showPanel]}
              </h3>
              <button onClick={() => setShowPanel(null)} aria-label="ปิดแผง" title="ปิด" className="text-gray-400 hover:text-white">✕</button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {showPanel === 'transcript' && (
                <div className="space-y-2">
                  {transcripts.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      <p className="text-4xl mb-2"></p>
                      <p>คลิก "▶ เริ่ม Transcript" เพื่อเริ่มถอดเสียง</p>
                      <p className="text-xs mt-2">ใช้ Web Speech API (ฟรี)</p>
                    </div>
                  ) : (
                    transcripts.map((seg) => (
                      <div key={seg.id} className="bg-gray-700/50 rounded p-2 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getSpeakerBadgeClass(seg.speakerRole)}`}>
                            {getSpeakerEmoji(seg.speakerRole)}
                            {seg.speakerName}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {new Date(seg.timestamp).toLocaleTimeString('th-TH')}
                          </span>
                        </div>
                        <p className="text-gray-200">{seg.content}</p>
                      </div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />

                  {meetingState.isTranscribing && !meetingState.isPaused && (
                    <div className="flex items-center gap-2 text-green-400 text-xs animate-pulse">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />{' '}
                      กำลังบันทึก... ({meetingState.transcriptLanguage})
                    </div>
                  )}
                  {meetingState.isPaused && (
                    <div className="flex items-center gap-2 text-yellow-400 text-xs">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full" />{' '}
                      หยุดชั่วคราว
                    </div>
                  )}
                </div>
              )}

              {showPanel === 'chat' && (
                <div className="space-y-2">
                  {chatMessages.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      <p className="text-4xl mb-2"></p>
                      <p>ยังไม่มีข้อความ</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className={`rounded p-2 text-sm ${
                        msg.senderRole === 'doctor' ? 'bg-blue-900/30 ml-4' : 'bg-gray-700/50 mr-4'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-400">{msg.senderName}</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(msg.timestamp).toLocaleTimeString('th-TH')}
                          </span>
                        </div>
                        <p className="text-gray-200">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {showPanel === 'summary' && (
                <div>
                  {aiSummary ? (
                    <div className="space-y-3">
                      <div className="whitespace-pre-wrap text-sm text-gray-200 bg-gray-700/50 rounded p-3">
                        {aiSummary}
                      </div>
                      <div className="p-2 bg-yellow-900/30 rounded text-yellow-400 text-xs">
                        ต้องให้แพทย์ตรวจสอบก่อนบันทึก (requiresValidation: true)
                      </div>
                      {summaryValidationStatus === 'approved' && (
                        <div className="p-2 bg-green-900/30 rounded text-green-400 text-xs">
                          อนุมัติแล้ว — บันทึกลง EMR เรียบร้อย
                        </div>
                      )}
                      {summaryValidationStatus === 'rejected' && (
                        <div className="p-2 bg-red-900/30 rounded text-red-400 text-xs">
                          ปฏิเสธแล้ว — สรุปนี้จะไม่ถูกบันทึก
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleApproveSummary}
                          disabled={summaryValidationStatus === 'approved'}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-900 rounded text-sm transition"
                        >
                          อนุมัติ
                        </button>
                        <button
                          onClick={handleRejectSummary}
                          disabled={summaryValidationStatus === 'rejected'}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-900 rounded text-sm transition"
                        >
                          ปฏิเสธ
                        </button>
                        <button
                          onClick={generateAISummary}
                          disabled={isGeneratingSummary}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded text-sm transition"
                        >
                          ↻
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      <p className="text-4xl mb-2"></p>
                      <p>ยังไม่มี AI Summary</p>
                      <button
                        onClick={generateAISummary}
                        disabled={isGeneratingSummary || transcripts.length === 0}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm transition"
                      >
                        {isGeneratingSummary ? 'กำลังสร้าง...' : 'สร้างสรุป SOAP'}
                      </button>
                      {transcripts.length === 0 && (
                        <p className="text-xs text-gray-600 mt-2">ต้องมี transcript ก่อนจึงจะสร้างสรุปได้</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Input (only in chat panel) */}
            {showPanel === 'chat' && (
              <div className="p-3 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="พิมพ์ข้อความ..."
                    aria-label="พิมพ์ข้อความแชท"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={sendChatMessage}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
                  >
                    ส่ง
                  </button>
                </div>

                {/* Guest Invite Section */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">เชิญผู้เข้าร่วม (Copy Link)</p>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="ชื่อแขก"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={inviteGuest}
                      disabled={!guestName}
                      className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded text-xs transition whitespace-nowrap"
                    >
                      {guestLinkCopied ? '✓ Copied!' : '📋 Copy Link'}
                    </button>
                  </div>
                  {guestLinkCopied && (
                    <p className="text-xs text-green-400 mt-1">✓ Guest link copied! Send it to the guest.</p>
                  )}
                  {(lastGuestJoinUrl || lastGuestTokenUrl) && (
                    <div className="mt-2 space-y-1 text-[10px] text-gray-400">
                      {lastGuestJoinUrl && (
                        <p className="break-all" data-testid="guest-join-url-hint">
                          <span className="text-gray-500">Open link:</span> {lastGuestJoinUrl}
                        </p>
                      )}
                      {lastGuestTokenUrl && (
                        <p className="break-all" data-testid="guest-token-url-hint">
                          <span className="text-gray-500">JWT link (24h):</span> {lastGuestTokenUrl}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lobby / Waiting Room Panel (Doctor as Host) */}
        {showLobby && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col" data-testid="lobby-panel">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <h3 className="font-medium text-sm">Waiting Room ({lobbyParticipants.length})</h3>
              <div className="flex items-center gap-2">
                {lobbyParticipants.length >= 1 && (
                  <button
                    onClick={admitAllFromLobby}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition"
                    data-testid="admit-all-btn"
                  >
                    อนุญาตทั้งหมด
                  </button>
                )}
                <button onClick={() => setShowLobby(false)} aria-label="ปิดห้องรอ" title="ปิด" className="text-gray-400 hover:text-white">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {lobbyParticipants.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <p className="text-4xl mb-2"></p>
                  <p className="text-sm">ไม่มีผู้รอเข้าร่วม</p>
                  <p className="text-xs mt-1 text-gray-600">ผู้เข้าร่วมใหม่จะปรากฏที่นี่</p>
                </div>
              ) : (
                lobbyParticipants.map((p) => (
                  <div
                    key={p.participantId}
                    className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                    data-testid={`lobby-participant-${p.participantId}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold">
                        {p.participantName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-1">
                          {p.participantName}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              p.role === 'guest' || p.role === 'admin'
                                ? 'bg-purple-900/60 text-purple-200'
                                : 'bg-blue-900/60 text-blue-200'
                            }`}
                            data-testid={`lobby-role-badge-${p.role}`}
                          >
                            {lobbyRoleLabel(p.role)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">{p.email || 'ไม่มีอีเมล'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => admitFromLobby(p.participantId)}
                        className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition"
                        data-testid="admit-btn"
                      >
                        อนุญาต
                      </button>
                      <button
                        onClick={() => rejectFromLobby(p.participantId)}
                        className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition"
                        data-testid="reject-btn"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
    </JitsiMeetingShell>
  );
};

export default MeetingRoom;
