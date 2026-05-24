/**
 * VirtualMeeting.tsx — Time-Check Gated Jitsi Meeting Room
 *
 * Similar to MeetingRoom.tsx but with a meeting-time-window check before
 * entering the consent/pre-join/Jitsi flow. Used for scheduled appointments
 * where the doctor must only join within the appointment window.
 *
 * Flow: time_check → consent → pre_join → ready → in_progress → ended
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/common/AuthProvider';
import { getIzaraDisplayName } from '../../utils/jitsiDisplayName';
import {
  fetchMeetingJoinConfig,
  getJitsiExternalApiOptions,
  notifyHostPresent,
  pickJitsiJwt,
  resolveJitsiDomain,
} from '../../utils/jitsiMeetingConfig';
import { getToken } from '../../services/authServices';
import meetingTimeService, { MeetingTimeCheck } from '../../services/meetingTimeService';

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

interface TranscriptSegment {
  id: string;
  speakerRole: string;
  speakerName: string;
  content: string;
  language: string;
  timestamp: string;
  isFinal: boolean;
  confidence?: number;
  startTimeSeconds?: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
}

interface LobbyParticipant {
  participantId: string;
  participantName: string;
  role: string;
  status: 'waiting' | 'admitted' | 'rejected';
  joinedAt: string;
}

type MeetingStatus = 'time_check' | 'consent' | 'pre_join' | 'ready' | 'in_progress' | 'ended';

const JITSI_DOMAIN = resolveJitsiDomain();
const MEETING_SERVER_URL = (() => {
  if (globalThis.window !== undefined) {
    const env = (globalThis as any).ENV;
    if (env?.MEETING_SERVER_URL && !String(env.MEETING_SERVER_URL).includes('localhost')) {
      return env.MEETING_SERVER_URL;
    }
    const { origin, hostname } = globalThis.location;
    if (hostname.includes('run.app')) {
      return origin
        .replace('izara-doctor-portal', 'izara-meeting-server')
        .replace('izara-patient-portal', 'izara-meeting-server');
    }
  }
  return import.meta.env?.VITE_MEETING_SERVER_URL || 'http://localhost:3020';
})();

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

/** Replace interim from a speaker with a final segment */
function replaceFinalTranscript(prev: TranscriptSegment[], segment: TranscriptSegment): TranscriptSegment[] {
  return [...prev.filter(s => !(s.speakerRole === segment.speakerRole && !s.isFinal)), segment];
}

/** Update or append an interim segment for a given speaker */
function upsertInterimTranscript(prev: TranscriptSegment[], segment: TranscriptSegment): TranscriptSegment[] {
  const idx = prev.findIndex(s => s.speakerRole === segment.speakerRole && !s.isFinal);
  if (idx >= 0) { const u = [...prev]; u[idx] = segment; return u; }
  return [...prev, segment];
}

function speakerColorClass(role: string): string {
  if (role === 'doctor') return 'text-blue-400';
  if (role === 'patient') return 'text-green-400';
  return 'text-purple-400';
}

function speakerLabel(role: string): string {
  if (role === 'doctor') return '👨\u200D⚕️';
  if (role === 'patient') return '🧑';
  return '👥';
}

// NOSONAR - Large React component with tightly-coupled meeting state
const VirtualMeeting: React.FC = () => { // NOSONAR
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const doctorDisplayName = getIzaraDisplayName(user, 'Doctor');

  // Refs
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const roomNameRef = useRef<string>('');
  const meetingInfoRef = useRef<any>(null);
  const jitsiJwtRef = useRef<string | undefined>(undefined);
  const jitsiDomainRef = useRef(JITSI_DOMAIN);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  // State
  const [status, setStatus] = useState<MeetingStatus>('time_check');
  const [meetingTimeCheck, setMeetingTimeCheck] = useState<MeetingTimeCheck | null>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Consent
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentTranscript, setConsentTranscript] = useState(false);

  // Lobby
  const [lobbyParticipants, setLobbyParticipants] = useState<LobbyParticipant[]>([]);

  // Transcript + Chat
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showPanel, setShowPanel] = useState<'transcript' | 'chat' | 'lobby' | null>('transcript');
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Transcription
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcriptLanguage, setTranscriptLanguage] = useState<'th-TH' | 'en-US'>('th-TH');
  const recognitionRef = useRef<any>(null);
  const transcriptionStartRef = useRef<number>(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // TIME CHECK — Fetch appointment and validate time window
  // ============================================================================

  const initMeeting = useCallback(async () => {
    try {
      let roomName = `izara-${appointmentId?.substring(0, 12) || 'quick'}-${Date.now().toString(36)}`;
      let meetingFound = false;
      const parseMeetingUrl = (url?: string): { room?: string; jwt?: string } => {
        if (!url) return {};
        try {
          const parsed = new URL(url);
          const parts = parsed.pathname.split('/').filter(Boolean);
          return {
            room: parts[parts.length - 1] || undefined,
            jwt: parsed.searchParams.get('jwt') || undefined,
          };
        } catch {
          return {};
        }
      };

      // Try meeting server
      try {
        const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.meeting) {
            meetingInfoRef.current = data.meeting;
            const parsed = parseMeetingUrl(data.meeting.doctor_url || data.meeting.meeting_url);
            roomName = data.meeting.room_name || parsed.room || roomName;
            jitsiJwtRef.current = pickJitsiJwt(null, parsed.jwt);
            meetingFound = true;
          }
        }
      } catch { /* silent */ }

      // Create meeting record if none exists
      if (!meetingFound) {
        try {
          const createRes = await fetch(`${MEETING_SERVER_URL}/api/meetings/create`, {
            method: 'POST', headers: getAuthHeaders(),
            body: JSON.stringify({ appointmentId, doctorId: user?.id, doctorName: user?.displayName || user?.name || 'Doctor', roomName }),
          });
          if (createRes.ok) {
            const createData = await createRes.json();
            if (createData.meeting) meetingInfoRef.current = createData.meeting;
            const parsed = parseMeetingUrl(
              createData.urls?.doctor ||
              createData.meeting?.doctor_url ||
              createData.urls?.base ||
              createData.meeting?.meeting_url,
            );
            roomName = createData.roomName || createData.meeting?.room_name || parsed.room || roomName;
            jitsiJwtRef.current = pickJitsiJwt(null, createData.tokens?.doctor || parsed.jwt);
          }
        } catch { /* silent */ }
      }

      const joinCfg = await fetchMeetingJoinConfig(
        MEETING_SERVER_URL,
        appointmentId || '',
        'doctor',
        undefined,
        getToken(),
      );
      if (joinCfg?.roomName) roomName = joinCfg.roomName;
      if (joinCfg?.domain) jitsiDomainRef.current = joinCfg.domain;
      jitsiJwtRef.current = pickJitsiJwt(joinCfg);
      roomNameRef.current = roomName;
    } catch (err: any) {
      setError(err.message || 'Failed to initialize meeting');
    }
  }, [appointmentId, user]);

  const handleLobbyUpdate = useCallback((data: any) => {
    if (data.action === 'join') {
      setLobbyParticipants(prev => {
        if (prev.some(p => p.participantId === data.participantId)) return prev;
        return [...prev, { participantId: data.participantId, participantName: data.participantName, role: data.role || 'guest', status: 'waiting' as const, joinedAt: new Date().toISOString() }];
      });
    } else if (data.action === 'leave' || data.action === 'admitted') {
      setLobbyParticipants(prev => prev.filter(p => p.participantId !== data.participantId));
    }
  }, []);

  const handleTranscriptUpdate = useCallback((data: any) => {
    const isFinal = data.isFinal !== false;
    const segment: TranscriptSegment = {
      id: data.id || `seg-${Date.now()}`,
      speakerRole: data.speakerRole,
      speakerName: data.speakerName,
      content: data.content,
      language: data.language || 'th',
      timestamp: data.timestamp || new Date().toISOString(),
      isFinal,
      confidence: data.confidence,
      startTimeSeconds: data.startTimeSeconds,
    };
    setTranscripts(prev => {
      if (isFinal) return replaceFinalTranscript(prev, segment);
      return upsertInterimTranscript(prev, segment);
    });
  }, []);

  const handleChatMessage = useCallback((data: any) => {
    setChatMessages(prev => [...prev, { id: data.id || `chat-${Date.now()}`, senderId: data.senderId, senderName: data.senderName, senderRole: data.senderRole, message: data.message, timestamp: data.timestamp || new Date().toISOString() }]);
  }, []);

  const handleTranscriptStopped = useCallback(() => {
    setIsTranscribing(false);
    setIsPaused(false);
    setTranscripts(prev => prev.filter(s => s.isFinal));
  }, []);

  const connectSocket = useCallback(async () => {
    try {
      const { io } = await import('socket.io-client');
      const socket = io(MEETING_SERVER_URL, {
        query: { meetingId: appointmentId, userId: user?.id, role: 'doctor', userName: user?.displayName || user?.name || 'Doctor' },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('[VirtualMeeting] Socket connected');
        socket.emit('join-meeting', {
          meetingId: appointmentId,
          userName: user?.displayName || user?.name || 'Doctor',
          role: 'doctor',
        });
        void notifyHostPresent(MEETING_SERVER_URL, appointmentId || '', getToken());
      });
      socket.on('lobby-update', handleLobbyUpdate);
      socket.on('transcript-update', handleTranscriptUpdate);
      socket.on('chat-message', handleChatMessage);

      socket.on('meeting-ended-results', (data: any) => {
        if (data.summary) setAiSummary(data.summary);
      });

      socket.on('transcript-stopped', handleTranscriptStopped);

      socketRef.current = socket;
    } catch (err) {
      console.warn('[VirtualMeeting] Socket connection failed:', err);
    }
  }, [appointmentId, user]);

  // Auto-scroll transcript panel to bottom on new segments
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  useEffect(() => {
    if (status !== 'time_check') return;

    const checkTimeWindow = async () => {
      // Fetch appointment details
      let apt = appointmentData;
      if (!apt) {
        try {
          const res = await fetch(`/api/appointments/${appointmentId}`, { headers: getAuthHeaders() });
          if (res.ok) {
            apt = await res.json();
            setAppointmentData(apt);
          }
        } catch { /* will use defaults */ }
      }

      await meetingTimeService.loadRules();
      const scheduledDate = apt?.scheduledDate || apt?.date || new Date().toISOString();
      const scheduledTime = apt?.scheduledTime || apt?.time || '09:00';
      const check = meetingTimeService.checkMeetingWindow(scheduledDate, scheduledTime);
      setMeetingTimeCheck(check);

      if (check.canJoin) {
        setStatus('consent');
        await initMeeting();
        await connectSocket();
      }
    };

    checkTimeWindow();
    const interval = setInterval(checkTimeWindow, 60000);
    return () => clearInterval(interval);
  }, [appointmentId, status]);

  // ============================================================================
  // PRE-JOIN — camera/mic preview
  // ============================================================================

  const stopPreviewStream = useCallback(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(t => t.stop());
      previewStreamRef.current = null;
    }
  }, []);

  const startPreviewStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      previewStreamRef.current = stream;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (status === 'pre_join') startPreviewStream();
    return () => { if (status !== 'pre_join') stopPreviewStream(); };
  }, [status, startPreviewStream, stopPreviewStream]);

  // ============================================================================
  // JITSI LAUNCH
  // ============================================================================

  const loadJitsiScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((globalThis as any).JitsiMeetExternalAPI) { resolve(); return; }
      const existing = document.querySelector('script[src*="external_api"]');
      if (existing) { existing.addEventListener('load', () => resolve()); return; }
      const script = document.createElement('script');
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi'));
      document.head.appendChild(script);
    });
  }, []);

  const joinMeeting = useCallback(async () => {
    stopPreviewStream();
    void notifyHostPresent(MEETING_SERVER_URL, appointmentId || '', getToken());
    try {
      await loadJitsiScript();
      if (!jitsiContainerRef.current || !(globalThis as any).JitsiMeetExternalAPI) return;

      const jitsiOpts = getJitsiExternalApiOptions('doctor', doctorDisplayName);
      const api = new (globalThis as any).JitsiMeetExternalAPI(jitsiDomainRef.current || JITSI_DOMAIN, {
        roomName: roomNameRef.current,
        jwt: jitsiJwtRef.current,
        parentNode: jitsiContainerRef.current,
        width: '100%', height: '100%',
        configOverwrite: {
          ...jitsiOpts.configOverwrite,
          startWithAudioMuted: !micOn,
          startWithVideoMuted: !cameraOn,
          subject: `Izara Consultation — ${appointmentId?.substring(0, 8) || 'Meeting'}`,
        },
        interfaceConfigOverwrite: {
          ...jitsiOpts.interfaceConfigOverwrite,
          DEFAULT_REMOTE_DISPLAY_NAME: 'ผู้เข้าร่วม',
        },
        userInfo: {
          displayName: doctorDisplayName,
          email: user?.email || '',
        },
      });

      jitsiApiRef.current = api;

      // Ensure iframe permissions
      const iframe = jitsiContainerRef.current.querySelector('iframe');
      if (iframe) {
        iframe.setAttribute('allow', 'camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *');
      }

      api.on('readyToClose', () => setStatus('ended'));
      api.on('videoConferenceJoined', () => {
        setStatus('in_progress');
        const start = Date.now();
        durationTimerRef.current = setInterval(() => setMeetingDuration(Math.floor((Date.now() - start) / 1000)), 1000);
        if (socketRef.current?.connected) {
          socketRef.current.emit('join-meeting', { meetingId: appointmentId, userId: user?.id, role: 'doctor', userName: user?.displayName || user?.name || 'Doctor' });
        }
        void notifyHostPresent(MEETING_SERVER_URL, appointmentId || '', getToken());
      });

      setStatus('ready');
    } catch (err: any) {
      setError(err.message || 'Failed to join meeting');
    }
  }, [stopPreviewStream, loadJitsiScript, micOn, cameraOn, appointmentId, user]);

  // ============================================================================
  // TRANSCRIPTION (Web Speech API)
  // ============================================================================

  const startTranscription = useCallback(() => {
    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Speech recognition not supported'); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = transcriptLanguage;
    transcriptionStartRef.current = transcriptionStartRef.current || Date.now();

    recognition.onresult = (event: any) => {
      const startSecs = Math.floor((Date.now() - transcriptionStartRef.current) / 1000);
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const content = result[0].transcript.trim();
        if (!content) continue;

        const lang = transcriptLanguage === 'th-TH' ? 'th' : 'en';
        const speakerName = user?.displayName || user?.name || 'Doctor';

        if (result.isFinal) {
          const segment: TranscriptSegment = {
            id: `seg-${Date.now()}-${i}`, speakerRole: 'doctor', speakerName,
            content, language: lang, timestamp: new Date().toISOString(),
            isFinal: true, confidence: result[0].confidence, startTimeSeconds: startSecs,
          };
          // Replace any interim from doctor, append final
          setTranscripts(prev => replaceFinalTranscript(prev, segment));
          if (socketRef.current?.connected) {
            socketRef.current.emit('transcript-segment', {
              meetingId: appointmentId, speakerId: user?.id, speakerRole: 'doctor',
              speakerName, content, language: lang, confidence: result[0].confidence,
              isFinal: true, startTimeSeconds: startSecs,
            });
          }
          // Persist final segment to server
          fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/transcript-segment`, {
            method: 'POST', headers: getAuthHeaders(),
            body: JSON.stringify({ speakerId: user?.id, speakerRole: 'doctor', speakerName, content, language: lang, confidence: result[0].confidence, is_final: true, start_time_seconds: startSecs }),
          }).catch(() => {});
        } else {
          // Interim: update in-place, socket only (no DB)
          const interimSeg: TranscriptSegment = {
            id: `interim-${i}`, speakerRole: 'doctor', speakerName,
            content, language: lang, timestamp: new Date().toISOString(),
            isFinal: false, startTimeSeconds: startSecs,
          };
          setTranscripts(prev => upsertInterimTranscript(prev, interimSeg));
          if (socketRef.current?.connected) {
            socketRef.current.emit('transcript-segment', {
              meetingId: appointmentId, speakerId: user?.id, speakerRole: 'doctor',
              speakerName, content, language: lang, isFinal: false, startTimeSeconds: startSecs,
            });
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') setError('Microphone access denied for transcription');
      if ((event.error === 'network' || event.error === 'aborted') && isTranscribing && !isPaused) {
        setTimeout(() => { try { recognition.start(); } catch { /* ignore */ } }, 1000);
      }
    };

    recognition.onend = () => {
      if (isTranscribing && !isPaused) {
        setTimeout(() => { try { recognition.start(); } catch { /* ignore */ } }, 500);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsTranscribing(true);
    setIsPaused(false);

    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/start-transcription`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ language: transcriptLanguage, startedBy: user?.id }),
    }).catch(() => {});
  }, [transcriptLanguage, appointmentId, user, isTranscribing, isPaused]);

  const pauseTranscription = useCallback(() => {
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch { /* ignore */ }
    setIsPaused(true);
    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/pause-transcription`, {
      method: 'POST', headers: getAuthHeaders(),
    }).catch(() => {});
  }, [appointmentId]);

  const resumeTranscription = useCallback(() => {
    if (recognitionRef.current) try { recognitionRef.current.start(); } catch { /* ignore */ }
    setIsPaused(false);
    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/resume-transcription`, {
      method: 'POST', headers: getAuthHeaders(),
    }).catch(() => {});
  }, [appointmentId]);

  const stopTranscription = useCallback(async () => {
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setIsTranscribing(false);
    setIsPaused(false);
    // Remove interim segments locally
    setTranscripts(prev => prev.filter(s => s.isFinal));
    try {
      await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/stop-transcription`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ stoppedBy: user?.id }),
      });
    } catch { /* best effort */ }
  }, [appointmentId, user]);

  /** Switch transcription language without losing existing transcripts */
  const switchTranscriptionLanguage = useCallback((newLang: 'th-TH' | 'en-US') => {
    setTranscriptLanguage(newLang);
    if (!isTranscribing || !recognitionRef.current) return;
    // Stop current recognition, recreate with new lang
    try { recognitionRef.current.stop(); } catch { /* ignore */ }
    recognitionRef.current.lang = newLang;
    // onend handler will auto-restart since isTranscribing && !isPaused
  }, [isTranscribing, isPaused]);

  // ============================================================================
  // CHAT
  // ============================================================================

  const sendChat = useCallback(() => {
    const message = chatInput.trim();
    if (!message) return;
    const payload = { meetingId: appointmentId, senderId: user?.id, senderName: user?.displayName || user?.name || 'Doctor', senderRole: 'doctor', message };
    if (socketRef.current?.connected) socketRef.current.emit('chat-message', payload);
    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/chat`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload),
    }).catch(() => {});
    setChatInput('');
  }, [chatInput, appointmentId, user]);

  // ============================================================================
  // LOBBY
  // ============================================================================

  const admitFromLobby = useCallback(async (participantId: string) => {
    try { await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/lobby/admit`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ participantId, admittedBy: user?.id }) }); } catch { /* silent */ }
    if (socketRef.current?.connected) socketRef.current.emit('lobby-admit', { meetingId: appointmentId, participantId, admittedBy: user?.id });
    setLobbyParticipants(prev => prev.filter(p => p.participantId !== participantId));
  }, [appointmentId, user]);

  const rejectFromLobby = useCallback(async (participantId: string) => {
    try { await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/lobby/reject`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ participantId, rejectedBy: user?.id }) }); } catch { /* silent */ }
    if (socketRef.current?.connected) socketRef.current.emit('lobby-reject', { meetingId: appointmentId, participantId, rejectedBy: user?.id });
    setLobbyParticipants(prev => prev.filter(p => p.participantId !== participantId));
  }, [appointmentId, user]);

  const admitAllFromLobby = useCallback(async () => {
    try {
      await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/lobby/admit-all`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ admittedBy: user?.id }) });
    } catch {
      for (const p of lobbyParticipants) await admitFromLobby(p.participantId);
      return;
    }
    if (socketRef.current?.connected) {
      for (const p of lobbyParticipants) socketRef.current.emit('lobby-admit', { meetingId: appointmentId, participantId: p.participantId, admittedBy: user?.id });
    }
    setLobbyParticipants([]);
  }, [lobbyParticipants, admitFromLobby, appointmentId, user]);

  // Lobby polling fallback
  useEffect(() => {
    if (status !== 'ready' && status !== 'in_progress') return;
    const mergeLobby = (prev: LobbyParticipant[], waiting: LobbyParticipant[]) => {
      const existingIds = new Set(prev.map(p => p.participantId));
      const newOnes = waiting.filter(p => !existingIds.has(p.participantId));
      return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
    };
    const poll = async () => {
      try {
        const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/lobby`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const waiting = (data.lobby || []).filter((p: any) => p.status === 'waiting');
        if (waiting.length > 0) setLobbyParticipants(prev => mergeLobby(prev, waiting));
      } catch { /* silent */ }
    };
    const timer = setInterval(poll, 10000);
    return () => clearInterval(timer);
  }, [appointmentId, status]);

  // ============================================================================
  // END MEETING
  // ============================================================================

  const handleMeetingEnd = useCallback(() => {
    if (isTranscribing) stopTranscription();
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (jitsiApiRef.current) try { jitsiApiRef.current.executeCommand('hangup'); } catch { /* ignore */ }
    setStatus('ended');

    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/end`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ endedBy: user?.id || 'doctor', generateSummary: true }),
    }).then(res => res.json()).then(data => {
      if (data.summary) setAiSummary(data.summary);
    }).catch(() => {});
  }, [appointmentId, isTranscribing, stopTranscription, user]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) try { jitsiApiRef.current.dispose(); } catch { /* ignore */ }
      if (socketRef.current) try { socketRef.current.disconnect(); } catch { /* ignore */ }
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch { /* ignore */ }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      stopPreviewStream();
    };
  }, [stopPreviewStream]);

  const goBack = useCallback(() => {
    navigate(`/doctor/${user?.id}/health-meeting`);
  }, [navigate, user]);

  const getTimeCheckTitle = () => {
    if (meetingTimeCheck?.isEarly) return 'ยังไม่ถึงเวลานัด';
    if (meetingTimeCheck?.isLate) return 'เลยเวลานัดหมายแล้ว';
    return 'กำลังตรวจสอบเวลา...';
  };

  // ============================================================================
  // RENDER — TIME CHECK
  // ============================================================================

  if (status === 'time_check') {
    const rules = meetingTimeService.getRules();
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8">
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${meetingTimeCheck?.isEarly ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <span className="text-4xl">{meetingTimeCheck?.isEarly ? '⏳' : '⚠️'}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getTimeCheckTitle()}
            </h2>
            <p className="text-gray-600">{meetingTimeCheck?.reason || 'กรุณารอสักครู่...'}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">กฎการเข้าประชุม</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• สามารถเข้าได้ <strong>{rules.allowJoinBefore} นาที</strong> ก่อนเวลานัด</li>
              <li>• สามารถเข้าได้หลังเวลานัดภายใน <strong>{rules.allowJoinAfter} นาที</strong></li>
            </ul>
          </div>

          {meetingTimeCheck?.isEarly && meetingTimeCheck.minutesUntilStart != null && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-emerald-600 mb-1">เวลาที่เหลือก่อนเริ่ม</p>
              <p className="text-3xl font-bold text-emerald-600">{meetingTimeCheck.minutesUntilStart} นาที</p>
            </div>
          )}

          <div className="flex gap-4">
            <button onClick={goBack} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50">
              กลับ
            </button>
            {meetingTimeCheck?.isEarly && (
              <button
                onClick={async () => {
                  await meetingTimeService.loadRules();
                  const apt = appointmentData;
                  const scheduledDate = apt?.scheduledDate || apt?.date || new Date().toISOString();
                  const scheduledTime = apt?.scheduledTime || apt?.time || '09:00';
                  const check = meetingTimeService.checkMeetingWindow(scheduledDate, scheduledTime);
                  setMeetingTimeCheck(check);
                  if (check.canJoin) {
                    setStatus('consent');
                    await initMeeting();
                    await connectSocket();
                  }
                }}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
              >
                🔄 ตรวจสอบอีกครั้ง
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER — CONSENT
  // ============================================================================

  if (status === 'consent') {
    const allConsented = consentRecording && consentTranscript;
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ข้อตกลงก่อนเข้าห้องประชุม</h2>
            <p className="text-gray-600">กรุณายอมรับข้อตกลงเพื่อดำเนินการต่อ</p>
          </div>

          <div className="space-y-3 mb-6">
            <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={consentRecording} onChange={e => setConsentRecording(e.target.checked)} className="mt-1 h-5 w-5 text-emerald-600 rounded" />
              <span className="ml-3 text-sm">ยินยอมให้บันทึกการประชุม (เสียง/วิดีโอ) เพื่อประกอบเวชระเบียน</span>
            </label>
            <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={consentTranscript} onChange={e => setConsentTranscript(e.target.checked)} className="mt-1 h-5 w-5 text-emerald-600 rounded" />
              <span className="ml-3 text-sm">ยินยอมให้ถอดความ (Transcription) และวิเคราะห์ด้วย AI เพื่อสรุปผลการรักษา</span>
            </label>
          </div>

          <div className="flex gap-4">
            <button onClick={goBack} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50">
              ยกเลิก
            </button>
            <button
              onClick={() => {
                fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/consent`, {
                  method: 'POST', headers: getAuthHeaders(),
                  body: JSON.stringify({ participantId: user?.id, participantName: user?.displayName || user?.name || 'Doctor', role: 'doctor', consentRecording, consentTranscript }),
                }).catch(() => {});
                setStatus('pre_join');
              }}
              disabled={!allConsented}
              className={`flex-1 px-6 py-3 font-bold rounded-lg ${allConsented ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              ดำเนินการต่อ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER — PRE-JOIN
  // ============================================================================

  if (status === 'pre_join') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full p-8">
          <h2 className="text-xl font-bold text-white text-center mb-6">ตรวจสอบอุปกรณ์ก่อนเข้าร่วม</h2>

          <div className="flex gap-6 mb-6">
            <div className="flex-1 bg-gray-700 rounded-lg aspect-video overflow-hidden relative">
              {cameraOn ? (
                <video ref={previewVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl text-gray-400">📷</span>
                </div>
              )}
            </div>

            <div className="w-48 space-y-4">
              <button onClick={() => setCameraOn(!cameraOn)} className={`w-full py-3 rounded-lg font-medium ${cameraOn ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                {cameraOn ? '📹 กล้องเปิด' : '📹 กล้องปิด'}
              </button>
              <button onClick={() => setMicOn(!micOn)} className={`w-full py-3 rounded-lg font-medium ${micOn ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                {micOn ? '🎤 ไมค์เปิด' : '🎤 ไมค์ปิด'}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

          <div className="flex gap-4">
            <button onClick={goBack} className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-700">
              ยกเลิก
            </button>
            <button onClick={joinMeeting} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">
              เข้าร่วมประชุม
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER — ENDED
  // ============================================================================

  if (status === 'ended') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">การปรึกษาเสร็จสิ้น</h2>
          <p className="text-gray-600 mb-4">ระยะเวลา: {formatDuration(meetingDuration)}</p>

          {aiSummary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">สรุปผลการปรึกษา (AI)</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary}</p>
            </div>
          )}

          <button onClick={goBack} className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg">
            กลับหน้าการนัดหมาย
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER — IN MEETING (ready / in_progress)
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col" data-testid="doctor-meeting-room">
      {/* Top bar */}
      <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">Izara Virtual Meeting</span>
          {status === 'in_progress' && (
            <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full">{formatDuration(meetingDuration)}</span>
          )}
          {lobbyParticipants.length > 0 && (
            <button onClick={() => setShowPanel('lobby')} className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded-full">
              🔔 Lobby ({lobbyParticipants.length})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Transcription controls */}
          {isTranscribing ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-green-400 animate-pulse mr-1">● REC</span>
              {isPaused ? (
                <button onClick={resumeTranscription} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded">▶ Resume</button>
              ) : (
                <button onClick={pauseTranscription} className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded">⏸ Pause</button>
              )}
              <button onClick={stopTranscription} className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded">⏹ Stop</button>
              <select title="Transcription language" value={transcriptLanguage} onChange={e => switchTranscriptionLanguage(e.target.value as 'th-TH' | 'en-US')} className="bg-gray-700 text-white text-xs rounded px-1 py-1">
                <option value="th-TH">ไทย</option>
                <option value="en-US">English</option>
              </select>
            </div>
          ) : (
            <button onClick={startTranscription} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg">
              🎙 เริ่มถอดความ
            </button>
          )}

          <button onClick={() => setShowPanel(showPanel === 'transcript' ? null : 'transcript')} className={`text-xs px-3 py-1.5 rounded-lg ${showPanel === 'transcript' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
            📝 Transcript
          </button>
          <button onClick={() => setShowPanel(showPanel === 'chat' ? null : 'chat')} className={`text-xs px-3 py-1.5 rounded-lg ${showPanel === 'chat' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
            💬 Chat
          </button>
          <button onClick={handleMeetingEnd} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold">
            จบการประชุม
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Jitsi container */}
        <div className="flex-1 min-h-[480px]" ref={jitsiContainerRef} data-testid="jitsi-meeting-container" />

        {/* Side panel */}
        {showPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            {showPanel === 'lobby' && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-medium text-sm">Waiting Room ({lobbyParticipants.length})</h3>
                  {lobbyParticipants.length > 1 && (
                    <button onClick={admitAllFromLobby} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Admit All</button>
                  )}
                </div>
                {lobbyParticipants.length === 0 ? (
                  <p className="text-gray-400 text-sm">ไม่มีผู้รอเข้าร่วม</p>
                ) : (
                  lobbyParticipants.map(p => (
                    <div key={p.participantId} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold">
                          {p.participantName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{p.participantName}</div>
                          <div className="text-xs text-gray-400">{p.role}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => admitFromLobby(p.participantId)} className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition">
                          อนุญาต
                        </button>
                        <button onClick={() => rejectFromLobby(p.participantId)} className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition">
                          ปฏิเสธ
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {showPanel === 'transcript' && (
              <div className="flex-1 overflow-y-auto p-3">
                <h3 className="text-white font-medium text-sm mb-3">Transcript ({transcripts.filter(s => s.isFinal).length})</h3>
                {transcripts.length === 0 ? (
                  <p className="text-gray-400 text-sm">ยังไม่มีการถอดความ — กดปุ่ม &quot;เริ่มถอดความ&quot; เพื่อเริ่ม</p>
                ) : (
                  transcripts.map(seg => (
                    <div key={seg.id} className={`mb-2 rounded p-2 ${seg.isFinal ? 'bg-gray-700' : 'bg-yellow-900/40 animate-pulse'}`}>
                      <div className="flex justify-between">
                        <span className={`text-xs font-medium ${speakerColorClass(seg.speakerRole)}`}>
                          {speakerLabel(seg.speakerRole)} {seg.speakerName}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(seg.timestamp).toLocaleTimeString('th-TH')}</span>
                      </div>
                      <p className="text-gray-200 text-sm mt-1">{seg.content}</p>
                      {seg.isFinal && seg.confidence != null && seg.confidence < 0.7 && (
                        <span className="text-xs text-yellow-500 mt-0.5 inline-block">⚠ Low confidence</span>
                      )}
                    </div>
                  ))
                )}
                <div ref={transcriptEndRef} />
              </div>
            )}

            {showPanel === 'chat' && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-3">
                  <h3 className="text-white font-medium text-sm mb-3">Chat ({chatMessages.length})</h3>
                  {chatMessages.map(msg => (
                    <div key={msg.id} className="mb-2">
                      <span className="text-xs text-blue-400 font-medium">{msg.senderName}</span>
                      <p className="text-gray-200 text-sm">{msg.message}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-gray-700 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="พิมพ์ข้อความ..."
                    className="flex-1 bg-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={sendChat} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded text-sm">ส่ง</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualMeeting;
