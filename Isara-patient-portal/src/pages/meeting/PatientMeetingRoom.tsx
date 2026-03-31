/**
 * PatientMeetingRoom.tsx — Patient-side Jitsi Meeting Room
 * 
 * Embeds Jitsi via External API for patient to join doctor consultations.
 * - Patient enters lobby and waits for doctor (HOST) approval
 * - Real-time transcript display (view only, doctor controls transcription)
 * - Chat integration via Socket.IO
 * - Post-meeting: view AI summary when doctor approves
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const JITSI_DOMAIN = 'meet.jit.si';
const MEETING_SERVER_URL = (() => {
  if (globalThis.window !== undefined) {
    const env = (globalThis as any).ENV;
    if (env?.MEETING_SERVER_URL) return env.MEETING_SERVER_URL;
  }
  return import.meta.env?.VITE_MEETING_SERVER_URL || 'http://localhost:3020';
})();

interface TranscriptSegment {
  id: string;
  speakerRole: string;
  speakerName: string;
  content: string;
  language: string;
  timestamp: string;
}

/** Load the Jitsi Meet External API script */
function loadJitsiScript(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if ((globalThis as any).JitsiMeetExternalAPI) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Jitsi'));
    document.head.appendChild(script);
  });
}

/** Fetch the room name from the meeting server */
async function fetchRoomName(appointmentId: string): Promise<string> {
  const fallback = `izara-${appointmentId.substring(0, 12)}-meeting`;
  try {
    const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.meeting?.room_name) return data.meeting.room_name;
    }
  } catch {
    console.log('[PatientMeeting] Using default room name');
  }
  return fallback;
}

const PatientMeetingRoom: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'in_meeting' | 'ended'>('loading');
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Define handlers at useEffect level to reduce function nesting depth
    const handleJoined = () => {
      setStatus('in_meeting');
      const start = Date.now();
      durationTimerRef.current = setInterval(() => {
        setMeetingDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    };

    const handleClose = () => {
      setStatus('ended');
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };

    const appendTranscript = (data: TranscriptSegment) => {
      setTranscripts(prev => [...prev, data]);
    };

    const init = async () => {
      try {
        const roomName = await fetchRoomName(appointmentId || 'room');

        // Load Jitsi script
        await loadJitsiScript();

        // Init Jitsi
        if (jitsiContainerRef.current && (globalThis as any).JitsiMeetExternalAPI) {
          const patientName = user?.name || (user as any)?.displayName || 'Patient';
          const api = new (globalThis as any).JitsiMeetExternalAPI(JITSI_DOMAIN, {
            roomName,
            parentNode: jitsiContainerRef.current,
            width: '100%',
            height: '100%',
            configOverwrite: {
              prejoinPageEnabled: true,
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              disableDeepLinking: true,
              defaultLanguage: 'th',
              requireDisplayName: true,
              enableLobbyChat: true,
              enableClosePage: false,
              disableThirdPartyRequests: true,
              toolbarButtons: [
                'microphone', 'camera', 'desktop', 'chat',
                'raisehand', 'tileview', 'hangup', 'settings',
                'select-background', 'fullscreen',
              ],
              subject: `Izara Consultation`,
            },
            interfaceConfigOverwrite: {
              APP_NAME: 'Izara Telemedicine',
              SHOW_PROMOTIONAL_CLOSE_PAGE: false,
              SHOW_JITSI_WATERMARK: false,
              SHOW_BRAND_WATERMARK: false,
              DEFAULT_REMOTE_DISPLAY_NAME: 'แพทย์',
              DEFAULT_LOCAL_DISPLAY_NAME: patientName,
              TOOLBAR_ALWAYS_VISIBLE: true,
            },
            userInfo: {
              displayName: patientName,
              email: user?.email || '',
            },
          });

          jitsiApiRef.current = api;
          api.on('readyToClose', handleClose);
          api.on('videoConferenceJoined', handleJoined);
          setStatus('ready');
        }

        // Socket.IO for live transcript
        try {
          const { io } = await import('socket.io-client');
          const socket = io(MEETING_SERVER_URL, { transports: ['websocket', 'polling'] });
          socket.on('connect', () => {
            socket.emit('join-meeting', {
              meetingId: appointmentId,
              userName: user?.name || 'Patient',
              role: 'patient',
            });
          });
          socket.on('transcript-update', appendTranscript);
          socketRef.current = socket;
        } catch {
          console.warn('[PatientMeeting] Socket.IO skipped');
        }

      } catch (err: any) {
        setError(err.message);
        setStatus('ready');
      }
    };

    if (appointmentId) init();

    return () => {
      if (jitsiApiRef.current) try { jitsiApiRef.current.dispose(); } catch { /* */ }
      if (socketRef.current) try { socketRef.current.disconnect(); } catch { /* */ }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [appointmentId, user]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/appointments')} className="text-gray-400 hover:text-white">
            ← กลับ
          </button>
          <span className="text-emerald-400 font-medium">🎥 Izara Meeting</span>
          {status === 'in_meeting' && (
            <span className="text-green-400 font-mono text-sm">🔴 {fmt(meetingDuration)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`px-3 py-1 rounded text-sm transition ${showTranscript ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            📝 Transcript
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 px-4 py-2 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400">✕</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {status === 'ended' ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-800 gap-4">
            <div className="text-6xl">🎥</div>
            <h2 className="text-2xl font-bold">การประชุมสิ้นสุดแล้ว</h2>
            <p className="text-gray-400">ระยะเวลา: {fmt(meetingDuration)}</p>
            <button
              onClick={() => navigate('/appointments')}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium"
            >
              กลับหน้านัดหมาย
            </button>
          </div>
        ) : (
          <div ref={jitsiContainerRef} className={`${showTranscript ? 'flex-1' : 'w-full'} h-full`} />
        )}

        {showTranscript && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700 flex justify-between">
              <h3 className="font-medium text-sm">📝 Live Transcript</h3>
              <button onClick={() => setShowTranscript(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {transcripts.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <p className="text-4xl mb-2">🎤</p>
                  <p className="text-sm">Waiting for doctor to start transcription...</p>
                </div>
              ) : (
                transcripts.map(seg => (
                  <div key={seg.id} className="bg-gray-700/50 rounded p-2 text-sm">
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        seg.speakerRole === 'doctor' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'
                      }`}>
                        {seg.speakerRole === 'doctor' ? '👨‍⚕️' : '🧑'} {seg.speakerName}
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
    </div>
  );
};

export default PatientMeetingRoom;
