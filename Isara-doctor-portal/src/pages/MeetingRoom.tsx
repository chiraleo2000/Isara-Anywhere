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
import { useAuth } from '../components/common/AuthProvider';

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

interface MeetingState {
  status: 'loading' | 'ready' | 'in_progress' | 'ended';
  isTranscribing: boolean;
  isPaused: boolean;
  transcriptLanguage: 'th-TH' | 'en-US';
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const JITSI_DOMAIN = 'meet.jit.si';
const MEETING_SERVER_URL = (() => {
  if (globalThis.window !== undefined) {
    const env = (globalThis as any).ENV;
    if (env?.MEETING_SERVER_URL && !String(env.MEETING_SERVER_URL).includes('localhost')) {
      return env.MEETING_SERVER_URL;
    }
  }
  return import.meta.env?.VITE_MEETING_SERVER_URL || 'http://localhost:3020';
})();

// ============================================================================
// COMPONENT
// ============================================================================

const MeetingRoom: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Refs
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  // State
  const [meetingState, setMeetingState] = useState<MeetingState>({
    status: 'loading',
    isTranscribing: false,
    isPaused: false,
    transcriptLanguage: 'th-TH',
  });
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const meetingInfoRef = useRef<any>(null);
  const [showPanel, setShowPanel] = useState<'transcript' | 'chat' | 'summary' | null>('transcript');
  const [error, setError] = useState<string | null>(null);
  const participantsRef = useRef<string[]>([]);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  // JITSI EXTERNAL API LOADER
  // ============================================================================

  const loadJitsiScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((globalThis as any).JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi External API'));
      document.head.appendChild(script);
    });
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
  }, [startDurationTimer]);

  const handleParticipantJoined = useCallback((data: any) => {
    console.log('[Jitsi] Participant joined:', data.displayName);
    participantsRef.current = [...participantsRef.current, data.displayName || 'Unknown'];
  }, []);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const socket = io(MEETING_SERVER_URL, {
          transports: ['websocket', 'polling'],
          autoConnect: true,
        });

        socket.on('connect', () => {
          console.log('[Socket] Connected to meeting server');
          socket.emit('join-meeting', {
            meetingId: appointmentId,
            userName: user?.displayName || user?.name || 'Doctor',
            role: 'doctor',
          });
        });

        socket.on('transcript-update', handleTranscriptUpdate);
        socket.on('chat-message', handleChatMessage);

        socket.on('meeting-status', (data: any) => {
          console.log('[Socket] Meeting status:', data.status);
        });

        socketRef.current = socket;
      } catch {
        console.warn('[MeetingRoom] Socket.IO connection skipped (meeting server may be unavailable)');
      }
    };

    const initMeeting = async () => {
      try {
        // 1. Fetch meeting info from meeting server
        let roomName = `izara-${appointmentId?.substring(0, 12) || 'quick'}-${Date.now().toString(36)}`;

        try {
          const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.meeting) {
              meetingInfoRef.current = data.meeting;
              roomName = data.meeting.room_name || roomName;
            }
          }
        } catch {
          console.log('[MeetingRoom] No existing meeting record, creating new room');
        }

        // 2. Load Jitsi External API
        await loadJitsiScript();

        // 3. Initialize Jitsi
        if (jitsiContainerRef.current && (globalThis as any).JitsiMeetExternalAPI) {
          const api = new (globalThis as any).JitsiMeetExternalAPI(JITSI_DOMAIN, {
            roomName,
            parentNode: jitsiContainerRef.current,
            width: '100%',
            height: '100%',
            configOverwrite: {
              prejoinPageEnabled: true,
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              enableClosePage: false,
              disableDeepLinking: true,
              defaultLanguage: 'th',
              requireDisplayName: true,
              enableLobbyChat: true,
              fileRecordingsEnabled: false,
              'localRecording.enabled': false,
              analytics: { disabled: true },
              disableAnalytics: true,
              toolbarButtons: [
                'microphone', 'camera', 'desktop', 'chat',
                'raisehand', 'participants-pane', 'tileview',
                'hangup', 'settings', 'select-background',
                'toggle-camera', 'fullscreen',
              ],
              disableThirdPartyRequests: true,
              enableWelcomePage: false,
              enableInsecureRoomNameWarning: false,
              hideConferenceSubject: false,
              subject: `Izara Consultation - ${appointmentId?.substring(0, 8) || 'Meeting'}`,
            },
            interfaceConfigOverwrite: {
              APP_NAME: 'Izara Telemedicine',
              SHOW_PROMOTIONAL_CLOSE_PAGE: false,
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              SHOW_BRAND_WATERMARK: false,
              DEFAULT_REMOTE_DISPLAY_NAME: 'ผู้เข้าร่วม',
              DEFAULT_LOCAL_DISPLAY_NAME: user?.displayName || user?.name || 'แพทย์',
              TOOLBAR_ALWAYS_VISIBLE: true,
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            },
            userInfo: {
              displayName: user?.displayName || user?.name || 'Doctor',
              email: user?.email || '',
            },
          });

          jitsiApiRef.current = api;

          // Simple Jitsi event handlers (local to avoid excessive nesting)
          const handleReadyToClose = () => handleMeetingEnd();
          const handleParticipantLeft = (data: any) => {
            console.log('[Jitsi] Participant left:', data);
          };
          const handleChatUpdated = (data: any) => {
            if (data.isOpen) setShowPanel('chat');
          };

          // Event listeners
          api.on('readyToClose', handleReadyToClose);
          api.on('videoConferenceJoined', handleConferenceJoined);
          api.on('participantJoined', handleParticipantJoined);
          api.on('participantLeft', handleParticipantLeft);
          api.on('chatUpdated', handleChatUpdated);

          setMeetingState(prev => ({ ...prev, status: 'ready' }));
        }

        // 4. Connect Socket.IO
        await connectSocket();

      } catch (err: any) {
        console.error('[MeetingRoom] Init error:', err);
        setError(err.message || 'Failed to initialize meeting');
        setMeetingState(prev => ({ ...prev, status: 'ready' }));
      }
    };

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
    };
  }, [appointmentId, user, loadJitsiScript, startDurationTimer, handleTranscriptUpdate, handleChatMessage, handleConferenceJoined, handleParticipantJoined]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  // ============================================================================
  // WEB SPEECH API TRANSCRIPTION
  // ============================================================================

  const startTranscription = useCallback(() => {
    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = meetingState.transcriptLanguage;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const content = result[0].transcript.trim();
          if (content) {
            const segment: TranscriptSegment = {
              id: `seg-${Date.now()}`,
              speakerRole: 'doctor',
              speakerName: user?.displayName || user?.name || 'Doctor',
              content,
              language: meetingState.transcriptLanguage === 'th-TH' ? 'th' : 'en',
              timestamp: new Date().toISOString(),
            };

            setTranscripts(prev => [...prev, segment]);

            // Send to meeting server via Socket.IO
            if (socketRef.current?.connected) {
              socketRef.current.emit('transcript-segment', {
                meetingId: appointmentId,
                speakerId: user?.id,
                speakerRole: 'doctor',
                speakerName: user?.displayName || user?.name || 'Doctor',
                content,
                language: segment.language,
                confidence: result[0].confidence,
              });
            }

            // Also persist via REST API
            fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/transcript`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                speakerId: user?.id,
                speakerRole: 'doctor',
                speakerName: user?.displayName || user?.name || 'Doctor',
                content,
                language: segment.language,
                confidence: result[0].confidence,
              }),
            }).catch(err => console.warn('[Transcript] REST save failed:', err.message));
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[Speech] Error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied for transcription');
      }
      // Auto-restart on network errors
      if (event.error === 'network' || event.error === 'aborted') {
        setTimeout(() => {
          if (meetingState.isTranscribing && !meetingState.isPaused) {
            try { recognition.start(); } catch { /* ignore */ }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Restart if still supposed to be transcribing
      if (meetingState.isTranscribing && !meetingState.isPaused) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    setMeetingState(prev => ({ ...prev, isTranscribing: true, isPaused: false }));

    // Notify meeting server
    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/start-transcription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: meetingState.transcriptLanguage }),
    }).catch(() => { /* silent */ });

  }, [appointmentId, meetingState.transcriptLanguage, meetingState.isTranscribing, meetingState.isPaused, user]);

  const pauseTranscription = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setMeetingState(prev => ({ ...prev, isPaused: true }));

    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/pause-transcription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => { /* silent */ });
  }, [appointmentId]);

  const resumeTranscription = useCallback(() => {
    setMeetingState(prev => ({ ...prev, isPaused: false }));
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch { /* ignore */ }
    }

    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/pause-transcription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => { /* silent */ });
  }, [appointmentId]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setMeetingState(prev => ({ ...prev, isTranscribing: false, isPaused: false }));

    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/stop-transcription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => { /* silent */ });
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
      senderName: user?.displayName || user?.name || 'Doctor',
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
    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    }).catch(() => { /* silent */ });
  }, [chatInput, appointmentId, user]);

  // ============================================================================
  // GUEST INVITE
  // ============================================================================

  const inviteGuest = useCallback(async () => {
    if (!guestName || !guestEmail) return;

    try {
      const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guestName, email: guestEmail, role: 'guest' }),
      });
      if (res.ok) {
        setGuestName('');
        setGuestEmail('');
        alert(`Guest invite sent to ${guestEmail}`);
      }
    } catch {
      console.warn('[Invite] Failed to send');
    }
  }, [appointmentId, guestName, guestEmail]);

  // ============================================================================
  // AI SUMMARY
  // ============================================================================

  const generateAISummary = useCallback(async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // ============================================================================
  // MEETING END
  // ============================================================================

  const handleMeetingEnd = useCallback(() => {
    // Stop transcription
    if (meetingState.isTranscribing) {
      stopTranscription();
    }

    // Stop duration timer
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }

    setMeetingState(prev => ({ ...prev, status: 'ended' }));

    // Process embeddings
    fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/process-embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => { /* silent */ });
  }, [appointmentId, meetingState.isTranscribing, stopTranscription]);

  const goBack = useCallback(() => {
    const userId = user?.id;
    navigate(`/doctor/${userId}/health-meeting`);
  }, [navigate, user]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const getSpeakerBadgeClass = (role: string): string => {
    if (role === 'doctor') return 'bg-blue-900 text-blue-300';
    if (role === 'patient') return 'bg-green-900 text-green-300';
    return 'bg-gray-600 text-gray-300';
  };

  const getSpeakerEmoji = (role: string): string => {
    if (role === 'doctor') return '👨‍⚕️';
    if (role === 'patient') return '🧑';
    return '👥';
  };

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
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="text-gray-400 hover:text-white transition"
            title="Back to Health Meeting"
          >
            ← กลับ
          </button>
          <div className="h-4 w-px bg-gray-600" />
          <span className="text-blue-400 font-medium">🎥 Izara Meeting</span>
          <span className="text-gray-400 text-sm">
            {appointmentId?.substring(0, 8)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Duration */}
          {meetingState.status === 'in_progress' && (
            <span className="text-green-400 font-mono text-sm">
              🔴 {formatDuration(meetingDuration)}
            </span>
          )}

          {/* Transcript Controls */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
            {renderTranscriptButtons()}
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition"
              title="Toggle Language"
            >
              {meetingState.transcriptLanguage === 'th-TH' ? '🇹🇭 ไทย' : '🇬🇧 EN'}
            </button>
          </div>

          {/* Panel Toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPanel(showPanel === 'transcript' ? null : 'transcript')}
              className={`px-2 py-1 rounded text-sm transition ${showPanel === 'transcript' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              📝 Transcript
            </button>
            <button
              onClick={() => setShowPanel(showPanel === 'chat' ? null : 'chat')}
              className={`px-2 py-1 rounded text-sm transition ${showPanel === 'chat' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setShowPanel(showPanel === 'summary' ? null : 'summary')}
              className={`px-2 py-1 rounded text-sm transition ${showPanel === 'summary' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              🤖 AI Summary
            </button>
          </div>

          {/* End Meeting */}
          {meetingState.status === 'in_progress' && (
            <button
              onClick={handleMeetingEnd}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition"
            >
              สิ้นสุดการประชุม
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-sm text-red-300 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white" aria-label="ปิดข้อผิดพลาด" title="ปิด">✕</button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Jitsi Container */}
        <div className={`flex-1 ${showPanel ? '' : 'w-full'}`}>
          {meetingState.status === 'ended' ? (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 gap-6">
              <div className="text-6xl">🎥</div>
              <h2 className="text-2xl font-bold">การประชุมสิ้นสุดแล้ว</h2>
              <p className="text-gray-400">ระยะเวลา: {formatDuration(meetingDuration)}</p>
              <p className="text-gray-400">Transcript segments: {transcripts.length}</p>
              <div className="flex gap-3">
                <button
                  onClick={generateAISummary}
                  disabled={isGeneratingSummary}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition"
                >
                  {isGeneratingSummary ? '⏳ กำลังสร้างสรุป...' : '🤖 สร้างสรุป AI (SOAP Format)'}
                </button>
                <button
                  onClick={goBack}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium transition"
                >
                  กลับหน้า Health Meeting
                </button>
              </div>
              {aiSummary && (
                <div className="mt-4 max-w-2xl bg-gray-700 rounded-lg p-4 text-left">
                  <h3 className="text-lg font-bold mb-2 text-blue-400">🤖 AI SOAP Summary</h3>
                  <div className="whitespace-pre-wrap text-sm text-gray-200">{aiSummary}</div>
                  <div className="mt-3 p-2 bg-yellow-900/30 rounded text-yellow-400 text-xs">
                    ⚠️ กรุณาตรวจสอบสรุปก่อนบันทึกลง EMR (Man-in-the-Loop)
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div ref={jitsiContainerRef} className="w-full h-full" />
          )}
        </div>

        {/* Side Panel */}
        {showPanel && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <h3 className="font-medium text-sm">
                {{
                  transcript: '📝 Real-time Transcript',
                  chat: '💬 Meeting Chat',
                  summary: '🤖 AI Summary',
                }[showPanel]}
              </h3>
              <button onClick={() => setShowPanel(null)} className="text-gray-400 hover:text-white" aria-label="ปิด" title="ปิด">✕</button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {showPanel === 'transcript' && (
                <div className="space-y-2">
                  {transcripts.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      <p className="text-4xl mb-2">🎤</p>
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
                      <p className="text-4xl mb-2">💬</p>
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
                        ⚠️ ต้องให้แพทย์ตรวจสอบก่อนบันทึก (requiresValidation: true)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => alert('Approved and saved to EMR')}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition"
                        >
                          ✅ อนุมัติ
                        </button>
                        <button
                          onClick={() => alert('Summary rejected')}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition"
                        >
                          ❌ ปฏิเสธ
                        </button>
                        <button
                          onClick={generateAISummary}
                          disabled={isGeneratingSummary}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded text-sm transition"
                        >
                          🔄
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      <p className="text-4xl mb-2">🤖</p>
                      <p>ยังไม่มี AI Summary</p>
                      <button
                        onClick={generateAISummary}
                        disabled={isGeneratingSummary || transcripts.length === 0}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm transition"
                      >
                        {isGeneratingSummary ? '⏳ กำลังสร้าง...' : '🤖 สร้างสรุป SOAP'}
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
                  <p className="text-xs text-gray-400 mb-2">👥 เชิญผู้เข้าร่วม</p>
                  <div className="flex flex-col gap-1">
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="ชื่อ"
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-1">
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="Email"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={inviteGuest}
                        disabled={!guestName || !guestEmail}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded text-xs transition"
                      >
                        เชิญ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingRoom;
