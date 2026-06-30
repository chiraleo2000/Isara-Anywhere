/**
 * PatientMeetingRoom.tsx — Patient-side Jitsi Meeting Room
 * 
 * Embeds Jitsi via External API for patient to join doctor consultations.
 * - Patient enters lobby and waits for doctor (HOST) approval
 * - Real-time transcript display (view only, doctor controls transcription)
 * - Chat integration via Socket.IO
 * - Post-meeting: view AI summary when doctor approves
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getIzaraDisplayName } from '../utils/jitsiDisplayName';
import {
  buildPatientJitsiMountOptions,
  connectMeetingSocket,
  fetchMeetingJoinConfig,
  loadJitsiExternalApiScript,
  resolveJitsiDomain,
  resolvePatientMeetingDisplayName,
  waitForHostReady,
  wireJitsiSkipPrejoin,
  type MeetingJoinConfig,
} from '../utils/jitsiMeetingConfig';
import { JitsiMeetingShell } from '../features/meeting/JitsiMeetingShell';
import { resolveMeetingServerUrl } from '../utils/resolveMeetingServerUrl';
import { isDemoAutoLoginEnabled } from '../utils/demoAutoAuth';
import { patientMeetingUrl, resolvePatientMeetingApiBase } from '../utils/resolvePatientMeetingApi';

const JITSI_DOMAIN = resolveJitsiDomain();

interface TranscriptSegment {
  id: string;
  speakerRole: string;
  speakerName: string;
  content: string;
  language: string;
  timestamp: string;
}

/** Load the Jitsi Meet External API script for the resolved domain */
function loadJitsiScript(domain: string): Promise<void> {
  return loadJitsiExternalApiScript(domain);
}

/** Extract room name from a Jitsi meeting URL */
function extractRoomFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const room = parsed.pathname.replace(/^\//, '').split('/')[0];
    return room || null;
  } catch { return null; }
}

/** Try to resolve room name from meeting server */
async function tryMeetingServer(appointmentId: string, authToken?: string | null): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(patientMeetingUrl(appointmentId, ''), {
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.meeting?.room_name) return data.meeting.room_name;
    }
  } catch { /* unavailable */ }
  return null;
}

/** Try to resolve room name from appointment API */
async function tryAppointmentApi(appointmentId: string, authToken?: string | null): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const aptRes = await fetch(`/api/appointments/${appointmentId}`, { headers, credentials: 'include' });
    if (aptRes.ok) {
      const aptData = await aptRes.json();
      return aptData.jitsiRoomName || aptData.jitsi_room_name || aptData.meetCode
        || extractRoomFromUrl(aptData.patientMeetingUrl) || extractRoomFromUrl(aptData.doctorMeetingUrl)
        || null;
    }
  } catch { /* unavailable */ }
  return null;
}

/** Fetch the room name with retries to allow doctor to create meeting record */
async function fetchRoomName(appointmentId: string, authToken?: string | null): Promise<string> {
  const fallback = `izara-${appointmentId.substring(0, 12)}-meeting`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const fromServer = await tryMeetingServer(appointmentId, authToken);
    if (fromServer) return fromServer;

    const fromAppointment = await tryAppointmentApi(appointmentId, authToken);
    if (fromAppointment) return fromAppointment;

    if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
  }
  console.warn('[PatientMeeting] Could not resolve room name after retries, using fallback');
  return fallback;
}

interface MediaDeviceStatus {
  camera: 'checking' | 'granted' | 'denied' | 'unavailable';
  microphone: 'checking' | 'granted' | 'denied' | 'unavailable';
  cameraLabel: string;
  microphoneLabel: string;
}

// ── PURE UTILITY FUNCTIONS (module-level to reduce component complexity) ──

async function probeMediaDevices(): Promise<{ status: MediaDeviceStatus; stream: MediaStream | null }> {
  const ms: MediaDeviceStatus = { camera: 'checking', microphone: 'checking', cameraLabel: '', microphoneLabel: '' };
  const mediaPromise = (async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const vt = stream.getVideoTracks()[0];
    const at = stream.getAudioTracks()[0];
    ms.camera = vt ? 'granted' : 'unavailable';
    ms.microphone = at ? 'granted' : 'unavailable';
    ms.cameraLabel = vt?.label || 'Camera';
    ms.microphoneLabel = at?.label || 'Microphone';
    return { status: ms, stream };
  })();
  const timeoutMs = 8_000;
  try {
    return await Promise.race([
      mediaPromise,
      new Promise<{ status: MediaDeviceStatus; stream: MediaStream | null }>((resolve) => {
        setTimeout(() => {
          ms.camera = 'unavailable';
          ms.microphone = 'unavailable';
          resolve({ status: ms, stream: null });
        }, timeoutMs);
      }),
    ]);
  } catch (err: any) {
    ms.camera = err.name === 'NotAllowedError' ? 'denied' : 'unavailable';
    ms.microphone = err.name === 'NotAllowedError' ? 'denied' : 'unavailable';
    return { status: ms, stream: null };
  }
}

// NOSONAR - Large React component with meeting lifecycle states; further decomposition would split tightly-coupled state
function guestParticipantId(appointmentId: string): string {
  const key = `izara-patient-${appointmentId}`;
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `guest-${crypto.randomUUID().slice(0, 12)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `guest-${appointmentId.slice(0, 8)}`;
  }
}

const PatientMeetingRoom: React.FC = () => { // NOSONAR
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [searchParams] = useSearchParams();
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const roomNameRef = useRef<string>('');
  const jitsiDomainRef = useRef(JITSI_DOMAIN);
  const joinCfgRef = useRef<MeetingJoinConfig | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [status, setStatus] = useState<
    'loading' | 'lobby_starting' | 'lobby_waiting' | 'waiting_host' | 'ready' | 'in_meeting' | 'ended'
  >('loading');
  const [autoStartRetry, setAutoStartRetry] = useState(0);
  const shouldAutoStartLobbyRef = useRef(false);
  const autoStartAttemptsRef = useRef(0);
  const [resolvedName, setResolvedName] = useState<string>('');
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  // Consultation result (shown after meeting ends and doctor approves)
  const [consultationResult, setConsultationResult] = useState<{
    available: boolean;
    summary?: string;
    instructions?: string;
    doctorName?: string;
    validatedAt?: string;
  } | null>(null);

  const [lobbyStatus, setLobbyStatus] = useState<'none' | 'waiting' | 'admitted' | 'rejected'>('none');

  const participantId = user?.id || guestParticipantId(appointmentId || 'room');
  const patientName = resolvePatientMeetingDisplayName({
    user,
    resolvedName,
    urlName: searchParams.get('name'),
  });

  const stopPreviewStream = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(t => t.stop());
      previewStreamRef.current = null;
    }
  };

  const checkMediaDevices = async () => {
    const { status: ms, stream } = await probeMediaDevices();
    if (stream) {
      previewStreamRef.current = stream;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
    } else {
      // Permission denied or devices unavailable — sync toggle states
      if (ms.camera === 'denied' || ms.camera === 'unavailable') setCameraOn(false);
      if (ms.microphone === 'denied' || ms.microphone === 'unavailable') setMicOn(false);
    }
  };

  // Poll for consultation result after meeting ends
  const pollConsultationResult = useCallback(async () => {
    try {
      const r = await fetch(`${resolveMeetingServerUrl()}/api/meetings/${appointmentId}/consultation-result`, {
        credentials: 'include',
      });
      const data = await r.json();
      if (data.success) setConsultationResult(data);
      if (data.success && !data.available) {
        setTimeout(pollConsultationResult, 10000);
      }
    } catch { /* retry later */ }
  }, [appointmentId]);

  // Lobby update handler (extracted to reduce nesting — S3776)
  const handleLobbyUpdate = useCallback((data: any) => {
    const pid = data.participant?.participantId || data.participantId;
    if (pid === participantId) {
      if (data.action === 'admit') {
        setLobbyStatus('admitted');
        if (data.hostReady) setStatus((s) => (s === 'lobby_waiting' ? 'waiting_host' : s));
      } else if (data.action === 'reject') {
        setLobbyStatus('rejected');
      }
    }
  }, [participantId]);

  const handleLobbyResponse = useCallback((data: any) => {
    if (data.status === 'admitted') {
      setLobbyStatus('admitted');
      setStatus((s) => (s === 'lobby_waiting' ? 'waiting_host' : s));
    } else if (data.status === 'waiting') setLobbyStatus('waiting');
  }, []);

  const connectPatientSocket = useCallback(async (appendTranscript: (data: TranscriptSegment) => void) => {
    try {
      const socket = await connectMeetingSocket(
        resolveMeetingServerUrl(),
        appointmentId || '',
        {
          onHostReady: () => {
            setStatus((s) => (s === 'waiting_host' || s === 'lobby_waiting' ? 'waiting_host' : s));
          },
          onLobbyUpdate: handleLobbyUpdate,
        },
        { userName: patientName, role: 'patient' },
      );
      socket.on('transcript-update', appendTranscript);
      socket.on('lobby-response', handleLobbyResponse);
      socketRef.current = socket;
    } catch {
      console.warn('[PatientMeeting] Socket.IO skipped');
    }
  }, [appointmentId, patientName, handleLobbyUpdate, handleLobbyResponse]);

  useEffect(() => {
    const appendTranscript = (data: TranscriptSegment) => {
      setTranscripts(prev => [...prev, data]);
    };

    const init = async () => {
      try {
        const apiBase = resolvePatientMeetingApiBase();
        const roomName = await fetchRoomName(appointmentId || 'room', token);
        roomNameRef.current = roomName;
        const displayNameForConfig = getIzaraDisplayName(user, 'Patient');
        const joinCfg = await fetchMeetingJoinConfig(
          apiBase,
          appointmentId || 'room',
          'patient',
          displayNameForConfig,
          token,
        );
        joinCfgRef.current = joinCfg;
        if (joinCfg?.displayName) setResolvedName(joinCfg.displayName);
        if (joinCfg?.roomName) roomNameRef.current = joinCfg.roomName;
        if (joinCfg?.domain) jitsiDomainRef.current = joinCfg.domain;
        await checkMediaDevices();
        await connectPatientSocket(appendTranscript);
        autoStartAttemptsRef.current = 0;
        shouldAutoStartLobbyRef.current = true;
        setStatus('lobby_starting');
      } catch (err: any) {
        setError(err.message);
        autoStartAttemptsRef.current = 0;
        shouldAutoStartLobbyRef.current = true;
        setStatus('lobby_starting');
      }
    };

    if (!appointmentId) return;
    if (authLoading) return;
    // Wait for demo/session auth before patient lobby (avoids 401 on meeting-server)
    if (!user && isDemoAutoLoginEnabled()) return;

    init();

    return () => {
      if (jitsiApiRef.current) try { jitsiApiRef.current.dispose(); } catch { /* */ }
      if (socketRef.current) try { socketRef.current.disconnect(); } catch { /* */ }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      stopPreviewStream();
    };
  }, [appointmentId, user, token, authLoading]);

  const videoConnectStartedRef = useRef(false);
  const retryVideoConnectRef = useRef<() => void>(() => {});

  const mountJitsiMeeting = useCallback(async () => {
    try {
      const joinCfg = joinCfgRef.current;
      const mount = buildPatientJitsiMountOptions({
        user,
        joinCfg,
        roomName: roomNameRef.current,
        domain: jitsiDomainRef.current,
        micOn,
        cameraOn,
        resolvedName,
        urlName: searchParams.get('name'),
      });
      await loadJitsiScript(mount.domain);
      if (jitsiContainerRef.current && (globalThis as any).JitsiMeetExternalAPI) {
        const api = new (globalThis as any).JitsiMeetExternalAPI(mount.domain, {
          roomName: mount.roomName,
          ...(mount.jwt ? { jwt: mount.jwt } : {}),
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          ...mount.apiOptions,
        });

        jitsiApiRef.current = api;
        wireJitsiSkipPrejoin(api);

        const iframe = jitsiContainerRef.current?.querySelector('iframe');
        if (iframe) {
          iframe.setAttribute('allow', 'camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *');
        }
        jitsiContainerRef.current?.setAttribute('data-jitsi-moderator', 'false');
        jitsiContainerRef.current?.setAttribute('data-jitsi-participant', 'true');
        jitsiContainerRef.current?.setAttribute('data-jitsi-display-name', mount.displayName);

        api.on('readyToClose', () => {
          setStatus('ended');
          if (durationTimerRef.current) clearInterval(durationTimerRef.current);
          // Fetch consultation result after meeting ends
          setTimeout(pollConsultationResult, 3000);
        });
        api.on('videoConferenceJoined', () => {
          setStatus('in_meeting');
          const start = Date.now();
          durationTimerRef.current = setInterval(() => {
            setMeetingDuration(Math.floor((Date.now() - start) / 1000));
          }, 1000);
        });
        api.on('videoConferenceFailed', (err: { error?: string }) => {
          const reason = String(err?.error || '');
          if (reason.includes('membersOnly') || reason.includes('connectionError')) {
            try { api.dispose(); } catch { /* */ }
            jitsiApiRef.current = null;
            videoConnectStartedRef.current = false;
            setStatus('waiting_host');
            setError('รอแพทย์เข้าห้องประชุมก่อน — แพทย์ต้องเป็นผู้ดำเนินการห้อง');
            globalThis.setTimeout(() => {
              setError(null);
              retryVideoConnectRef.current();
            }, 3000);
          }
        });
        api.on('lobbyJoined', () => {
          try { api.dispose(); } catch { /* */ }
          jitsiApiRef.current = null;
          videoConnectStartedRef.current = false;
          setStatus('waiting_host');
          setError('รอแพทย์อนุมัติห้องประชุม — อย่าใช้หน้า Log-in ของ Jitsi');
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [patientName, micOn, cameraOn, user, resolvedName, searchParams, appointmentId]);

  const connectVideoWhenReady = useCallback(async () => {
    const hostReady = await waitForHostReady(resolvePatientMeetingApiBase(), appointmentId || '', 120_000);
    if (!hostReady) {
      setError('รอแพทย์เข้าห้องประชุม — แพทย์ต้องเข้าก่อนจึงจะเชื่อมต่อวิดีโอได้');
      return;
    }
    stopPreviewStream();
    setStatus('ready');
    await new Promise<void>(resolve => setTimeout(resolve, 150));
    await mountJitsiMeeting();
    setStatus('in_meeting');
  }, [appointmentId, stopPreviewStream, mountJitsiMeeting]);

  retryVideoConnectRef.current = () => {
    videoConnectStartedRef.current = false;
    void connectVideoWhenReady();
  };

  useEffect(() => {
    if (lobbyStatus !== 'admitted') return;
    if (status !== 'lobby_waiting' && status !== 'waiting_host') return;
    if (videoConnectStartedRef.current) return;
    videoConnectStartedRef.current = true;
    setStatus('waiting_host');
    void connectVideoWhenReady();
  }, [lobbyStatus, status, connectVideoWhenReady]);

  useEffect(() => {
    videoConnectStartedRef.current = false;
  }, [appointmentId]);

  // HTTP poll when Socket.IO admit event is missed (headless E2E / flaky networks)
  useEffect(() => {
    if (lobbyStatus !== 'waiting' || !appointmentId || !participantId) return;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(
          patientMeetingUrl(appointmentId, `/lobby/status/${encodeURIComponent(participantId)}`),
          { credentials: 'include' },
        );
        if (!r.ok) return;
        const d = await r.json();
        if (d.status === 'admitted') {
          setLobbyStatus('admitted');
          setStatus((s) => (s === 'lobby_waiting' ? 'waiting_host' : s));
        } else if (d.status === 'rejected') {
          setLobbyStatus('rejected');
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [lobbyStatus, appointmentId, participantId]);

  const joinMeeting = useCallback(async (): Promise<boolean> => {
    setError(null);
    setStatus('lobby_waiting');
    setLobbyStatus('waiting');

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const lobbyRes = await fetch(patientMeetingUrl(appointmentId || '', '/join'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          participantName: patientName,
          participantId,
          email: user?.email || '',
          role: 'patient',
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (lobbyRes.ok) {
        const lobbyData = await lobbyRes.json();
        if (lobbyData.status === 'admitted') {
          setLobbyStatus('admitted');
          setStatus('waiting_host');
        } else {
          setLobbyStatus('waiting');
        }
        return true;
      }
    } catch {
      /* lobby request failed — handled below; never bypass the host gate */
    }

    setLobbyStatus('none');
    setStatus('lobby_waiting');
    setError('ไม่สามารถเข้าห้องรอได้ในขณะนี้ กรุณารอให้แพทย์เริ่มห้องประชุมแล้วลองใหม่อีกครั้ง');
    return false;
  }, [appointmentId, token, patientName, participantId, user?.email]);

  // Auto-start patient lobby: record consent then join without manual steps
  useEffect(() => {
    if (status !== 'lobby_starting' || !shouldAutoStartLobbyRef.current) return;
    if (autoStartAttemptsRef.current >= 3) return;

    shouldAutoStartLobbyRef.current = false;
    autoStartAttemptsRef.current += 1;

    const autoStartLobby = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10_000);
        await fetch(patientMeetingUrl(appointmentId || '', '/consent'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            participantId,
            participantName: patientName,
            role: 'patient',
            consentRecording: true,
            consentTranscript: true,
            consentDataSharing: true,
            patientAutoConsent: true,
          }),
          signal: ctrl.signal,
          credentials: 'include',
        });
        clearTimeout(timer);
      } catch { /* silent */ }
      const joined = await joinMeeting();
      if (!joined && autoStartAttemptsRef.current < 3) {
        shouldAutoStartLobbyRef.current = true;
        setStatus('lobby_starting');
        globalThis.setTimeout(() => setAutoStartRetry((n) => n + 1), 1500);
      }
    };
    void autoStartLobby();
  }, [status, autoStartRetry, appointmentId, token, participantId, patientName, joinMeeting]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  if (authLoading || (!user && isDemoAutoLoginEnabled())) {
    return (
      <JitsiMeetingShell className="fixed inset-0 z-50 min-h-[100dvh] max-h-[100dvh]">
        <div
          className="flex flex-1 flex-col items-center justify-center min-h-[100dvh] bg-gray-900 text-white"
          data-testid="meeting-auth-starting"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-4" />
          <p className="text-gray-300 text-sm">กำลังเข้าสู่ระบบ...</p>
        </div>
      </JitsiMeetingShell>
    );
  }

  return (
    <JitsiMeetingShell className="fixed inset-0 z-50 min-h-[100dvh] max-h-[100dvh]">
    <main
      className="flex flex-1 flex-col min-h-0 bg-gray-900 text-white"
      data-lobby-status={lobbyStatus}
      data-testid="patient-meeting-room"
    >

      {status === 'loading' && (
        <div
          className="flex-1 flex flex-col items-center justify-center"
          data-testid="meeting-loading"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-4" />
          <p className="text-gray-400 text-sm">กำลังเตรียมห้องประชุม...</p>
        </div>
      )}

      {status === 'lobby_starting' && (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4"
          data-testid="lobby-starting-screen"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400" />
          <p className="text-gray-300">กำลังเข้าห้องรอ...</p>
          <p className="text-gray-400 text-sm">Joining lobby...</p>
          <p className="text-gray-500 text-sm" data-testid="patient-display-name">{patientName}</p>
          {error && <p className="text-red-400 text-sm max-w-md text-center px-4">{error}</p>}
        </div>
      )}

      {/* LOBBY REJECTED (shown over waiting / pre-meeting states) */}
      {/* ================================================================== */}
      {lobbyStatus === 'rejected' && (
        <div
          className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-red-900 via-gray-900 to-gray-900"
          data-testid="lobby-rejected-screen"
        >
          <div className="max-w-md w-full px-8 text-center space-y-4">
            <div className="text-5xl">🚫</div>
            <h1 className="text-2xl font-bold text-white">คุณถูกปฏิเสธการเข้าร่วมประชุม</h1>
            <p className="text-red-200 text-sm">แพทย์ปฏิเสธคำขอเข้าร่วมประชุมของคุณ</p>
            <button
              onClick={() => navigate('/appointments')}
              className="mt-4 px-6 py-2.5 bg-white text-red-900 font-medium rounded-lg hover:bg-gray-100 transition"
            >
              ← กลับหน้านัดหมาย
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LOBBY WAITING ROOM (Teams-like) */}
      {/* ================================================================== */}
      {status === 'lobby_waiting' && lobbyStatus !== 'rejected' && (
        <div
          className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900"
          data-testid="lobby-waiting-screen"
        >
          <div className="max-w-md w-full px-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-600/20 flex items-center justify-center">
              <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold mb-2">ห้องรอ (Lobby)</h1>
            <p className="text-gray-400 text-sm mb-6">
              กรุณารอแพทย์อนุมัติก่อนเข้าห้องประชุม
            </p>
            <p className="text-yellow-400 text-sm animate-pulse">รอแพทย์อนุมัติ...</p>
          </div>
        </div>
      )}

      {status === 'waiting_host' && (
        <div
          className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900"
          data-testid="host-waiting-screen"
        >
          <div className="max-w-md w-full px-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-600/20 flex items-center justify-center">
              <span className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold mb-2">กำลังเชื่อมต่อห้องประชุม</h1>
            <p className="text-gray-400 text-sm mb-6">รอแพทย์เข้าห้องก่อน — ไม่ต้องล็อกอิน Jitsi</p>
            <p className="text-blue-400 text-sm animate-pulse">ชื่อของคุณ: {patientName}</p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MAIN MEETING UI (Jitsi iframe visible in ready / in_meeting) */}
      {/* ================================================================== */}
      {(status === 'ready' || status === 'in_meeting' || status === 'ended') && (
      <>
      {/* Compact Top Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1b1b1b] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-semibold text-sm">Izara Meeting</span>
          {status === 'in_meeting' && (
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-gray-300 font-mono">{fmt(meetingDuration)}</span>
            </span>
          )}
          {lobbyStatus === 'waiting' && (
            <span className="flex items-center gap-1 bg-yellow-600/20 border border-yellow-600/50 rounded-full px-2 py-0.5 text-xs text-yellow-400">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
              <span>รอแพทย์อนุมัติ...</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`px-2.5 py-1 rounded text-xs transition ${showTranscript ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
          >
            Transcript
          </button>
          <button onClick={() => navigate('/appointments')} className="text-gray-500 hover:text-white text-xs transition">
            ← กลับ
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 px-4 py-2 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} aria-label="ปิดข้อผิดพลาด" title="ปิด" className="ml-2 text-red-400">✕</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {status === 'ended' ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#1b1b1b] gap-6 overflow-y-auto py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center"><svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
            <h2 className="text-2xl font-bold">การประชุมสิ้นสุดแล้ว</h2>
            <p className="text-gray-400">ระยะเวลา: {fmt(meetingDuration)}</p>

            {consultationResult?.available ? (
              <div className="max-w-2xl w-full space-y-4 px-4">
                {/* Doctor info */}
                <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4 text-sm">
                  <p className="text-emerald-300 font-medium">ผลการปรึกษาจาก {consultationResult.doctorName || 'แพทย์'}</p>
                  {consultationResult.validatedAt && (
                    <p className="text-gray-500 text-xs mt-1">อนุมัติเมื่อ: {new Date(consultationResult.validatedAt).toLocaleString('th-TH')}</p>
                  )}
                </div>

                {/* AI Summary */}
                {consultationResult.summary && (
                  <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
                    <h3 className="text-sm font-semibold text-emerald-400 mb-3">สรุปการปรึกษา</h3>
                    <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">{consultationResult.summary}</div>
                  </div>
                )}

                {/* Patient Instructions */}
                {consultationResult.instructions && (
                  <div className="bg-blue-900/20 rounded-xl p-5 border border-blue-700/50">
                    <h3 className="text-sm font-semibold text-blue-400 mb-3">คำแนะนำสำหรับผู้ป่วย</h3>
                    <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">{consultationResult.instructions}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-md w-full bg-gray-800/60 rounded-xl p-5 border border-gray-700 text-sm text-gray-300 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                  <p>แพทย์กำลังสร้างสรุปจากการประชุม</p>
                </div>
                <p>ผลการตรวจ ใบสั่งยา และนัดหมายถัดไปจะแจ้งเตือนผ่านแอป</p>
                <p>ท่านสามารถดูผล EMR ได้ที่หน้า "ประวัติสุขภาพ"</p>
              </div>
            )}

            <button
              onClick={() => navigate('/appointments')}
              className="min-h-11 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium transition shadow-lg"
            >
              กลับหน้านัดหมาย
            </button>
          </div>
        ) : (
          <div className="relative flex-1 h-full min-h-[480px]">
            <div
              ref={jitsiContainerRef}
              data-testid="jitsi-meeting-container"
              data-jitsi-moderator="false"
              data-jitsi-participant="true"
              data-jitsi-display-name={patientName}
              className={`${showTranscript ? 'flex-1' : 'w-full'} h-full min-h-[480px]`}
            />
            {lobbyStatus === 'rejected' && (
              <div
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-sm"
                data-testid="lobby-rejected-screen"
              >
                <div className="text-center space-y-4">
                  <div className="text-5xl">🚫</div>
                  <h2 className="text-xl font-bold text-white">คุณถูกปฏิเสธการเข้าร่วมประชุม</h2>
                  <p className="text-red-200 text-sm">แพทย์ปฏิเสธคำขอเข้าร่วมประชุมของคุณ</p>
                  <button
                    onClick={() => navigate('/appointments')}
                    className="mt-4 px-6 py-2.5 bg-white text-red-900 font-medium rounded-lg hover:bg-gray-100 transition"
                  >
                    ← กลับหน้านัดหมาย
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showTranscript && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700 flex justify-between">
              <h3 className="font-medium text-sm">Live Transcript</h3>
              <button onClick={() => setShowTranscript(false)} aria-label="ปิดถอดเสียง" title="ปิด" className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {transcripts.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <p className="text-sm">Waiting for doctor to start transcription...</p>
                </div>
              ) : (
                transcripts.map(seg => (
                  <div key={seg.id} className="bg-gray-700/50 rounded p-2 text-sm">
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        seg.speakerRole === 'doctor' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'
                      }`}>
                        {seg.speakerRole === 'doctor' ? 'Dr.' : 'Pt.'} {seg.speakerName}
                      </span>
                    </div>
                    <p className="text-gray-200">{seg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </main>
    </JitsiMeetingShell>
  );
};

export default PatientMeetingRoom;
