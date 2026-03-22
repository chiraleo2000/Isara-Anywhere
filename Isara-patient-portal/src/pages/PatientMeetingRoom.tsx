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
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

/** Fetch the room name from the meeting server, with appointment API fallback */
async function fetchRoomName(appointmentId: string, authToken?: string | null): Promise<string> {
  const fallback = `izara-${appointmentId.substring(0, 12)}-meeting`;
  // Try 1: Meeting server lookup (returns room_name if meeting was registered)
  try {
    const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.meeting?.room_name) return data.meeting.room_name;
    }
  } catch {
    console.log('[PatientMeeting] Meeting server unavailable, trying appointment API');
  }
  // Try 2: Patient portal appointment API (returns jitsiRoomName set by doctor)
  try {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const aptRes = await fetch(`/api/appointments/${appointmentId}`, { headers });
    if (aptRes.ok) {
      const aptData = await aptRes.json();
      const roomName = aptData.jitsiRoomName || aptData.jitsi_room_name || aptData.meetCode;
      if (roomName) return roomName;
    }
  } catch {
    console.log('[PatientMeeting] Appointment API unavailable, using fallback');
  }
  return fallback;
}

interface MediaDeviceStatus {
  camera: 'checking' | 'granted' | 'denied' | 'unavailable';
  microphone: 'checking' | 'granted' | 'denied' | 'unavailable';
  cameraLabel: string;
  microphoneLabel: string;
}

// ── PURE UTILITY FUNCTIONS (module-level to reduce component complexity) ──

function getUserInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'PT';
}

function getMediaStatusIcon(s: string): string {
  switch (s) { case 'granted': return 'OK'; case 'denied': return 'X'; case 'unavailable': return '!'; default: return '...'; }
}

function getMediaStatusText(s: string): string {
  switch (s) { case 'granted': return 'พร้อมใช้งาน'; case 'denied': return 'ถูกปฏิเสธ'; case 'unavailable': return 'ไม่พบอุปกรณ์'; default: return 'กำลังตรวจสอบ...'; }
}

async function probeMediaDevices(): Promise<{ status: MediaDeviceStatus; stream: MediaStream | null }> {
  const ms: MediaDeviceStatus = { camera: 'checking', microphone: 'checking', cameraLabel: '', microphoneLabel: '' };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const vt = stream.getVideoTracks()[0];
    const at = stream.getAudioTracks()[0];
    ms.camera = vt ? 'granted' : 'unavailable';
    ms.microphone = at ? 'granted' : 'unavailable';
    ms.cameraLabel = vt?.label || 'Camera';
    ms.microphoneLabel = at?.label || 'Microphone';
    return { status: ms, stream };
  } catch (err: any) {
    ms.camera = err.name === 'NotAllowedError' ? 'denied' : 'unavailable';
    ms.microphone = err.name === 'NotAllowedError' ? 'denied' : 'unavailable';
    return { status: ms, stream: null };
  }
}

// NOSONAR - Large React component with meeting lifecycle states; further decomposition would split tightly-coupled state
const PatientMeetingRoom: React.FC = () => { // NOSONAR
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const roomNameRef = useRef<string>('');
  const previewStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [status, setStatus] = useState<'loading' | 'agreement' | 'pre_join' | 'ready' | 'in_meeting' | 'ended'>('loading');
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [mediaStatus, setMediaStatus] = useState<MediaDeviceStatus>({
    camera: 'checking', microphone: 'checking',
    cameraLabel: '', microphoneLabel: '',
  });
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  // Agreement / Consent
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentTranscript, setConsentTranscript] = useState(false);
  const [consentDataSharing, setConsentDataSharing] = useState(false);

  // Invite sharing
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [lobbyStatus, setLobbyStatus] = useState<'none' | 'waiting' | 'admitted' | 'rejected'>('none');

  // Consultation result (shown after meeting ends and doctor approves)
  const [consultationResult, setConsultationResult] = useState<{
    available: boolean;
    summary?: string;
    instructions?: string;
    doctorName?: string;
    validatedAt?: string;
  } | null>(null);

  // Helper functions
  const patientName = user?.name || (user as any)?.displayName || 'Patient';

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
    }
    setMediaStatus(ms);
  };

  const togglePreviewCamera = () => {
    if (previewStreamRef.current) {
      const vt = previewStreamRef.current.getVideoTracks()[0];
      if (vt) vt.enabled = !vt.enabled;
    }
    setCameraOn(prev => !prev);
  };

  const togglePreviewMic = () => {
    if (previewStreamRef.current) {
      const at = previewStreamRef.current.getAudioTracks()[0];
      if (at) at.enabled = !at.enabled;
    }
    setMicOn(prev => !prev);
  };

  // Poll for consultation result after meeting ends
  const pollConsultationResult = useCallback(async () => {
    try {
      const r = await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/consultation-result`);
      const data = await r.json();
      if (data.success) setConsultationResult(data);
      if (data.success && !data.available) {
        setTimeout(pollConsultationResult, 10000);
      }
    } catch { /* retry later */ }
  }, [appointmentId]);

  // Lobby update handler (extracted to reduce nesting — S3776)
  const handleLobbyUpdate = useCallback((data: any) => {
    if (data.participant?.participantId === user?.id) {
      if (data.action === 'admit') setLobbyStatus('admitted');
      else if (data.action === 'reject') setLobbyStatus('rejected');
    }
  }, [user]);

  const handleLobbyResponse = useCallback((data: any) => {
    if (data.status === 'admitted') setLobbyStatus('admitted');
    else if (data.status === 'waiting') setLobbyStatus('waiting');
  }, []);

  // Socket connection (extracted to reduce cognitive complexity — S3776)
  const connectPatientSocket = useCallback(async (appendTranscript: (data: TranscriptSegment) => void) => {
    try {
      const { io } = await import('socket.io-client');
      const socket = io(MEETING_SERVER_URL, { transports: ['websocket', 'polling'] });
      socket.on('connect', () => {
        socket.emit('join-meeting', {
          meetingId: appointmentId,
          userName: patientName,
          role: 'patient',
        });
      });
      socket.on('transcript-update', appendTranscript);
      socket.on('lobby-update', handleLobbyUpdate);
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
        const roomName = await fetchRoomName(appointmentId || 'room', token);
        roomNameRef.current = roomName;
        await checkMediaDevices();
        await connectPatientSocket(appendTranscript);
        setStatus('agreement');
      } catch (err: any) {
        setError(err.message);
        setStatus('agreement');
      }
    };

    if (appointmentId) init();

    return () => {
      if (jitsiApiRef.current) try { jitsiApiRef.current.dispose(); } catch { /* */ }
      if (socketRef.current) try { socketRef.current.disconnect(); } catch { /* */ }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      stopPreviewStream();
    };
  }, [appointmentId, user]);

  const handleAgreeAndContinue = async () => {
    try {
      await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: user?.id || 'unknown',
          participantName: patientName,
          role: 'patient',
          consentRecording, consentTranscript, consentDataSharing,
        }),
      });
    } catch { /* silent */ }
    setStatus('pre_join');
  };

  const shareInviteLink = async () => {
    if (!inviteName) return;
    try {
      const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${appointmentId}/share-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharedBy: user?.id, sharedByName: patientName,
          recipientName: inviteName, recipientEmail: inviteEmail,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.inviteLink);
        setInviteName('');
        setInviteEmail('');
      }
    } catch { /* silent */ }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink).catch(() => {});
    }
  };

  const joinMeeting = async () => {
    stopPreviewStream();
    try {
      await loadJitsiScript();
      if (jitsiContainerRef.current && (globalThis as any).JitsiMeetExternalAPI) {
        const api = new (globalThis as any).JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: roomNameRef.current,
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: !micOn,
            startWithVideoMuted: !cameraOn,
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
            subject: 'Izara Consultation',
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

        // Ensure Jitsi iframe has camera/microphone permissions
        const iframe = jitsiContainerRef.current?.querySelector('iframe');
        if (iframe) {
          iframe.setAttribute('allow', 'camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *');
        }

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
        setStatus('ready');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white" data-lobby-status={lobbyStatus}>

      {/* ================================================================== */}
      {/* MEETING AGREEMENT SCREEN */}
      {/* ================================================================== */}
      {status === 'agreement' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" data-testid="meeting-agreement">
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-400">Izara Meeting</span>
            </div>
            <button onClick={() => navigate('/appointments')} className="text-gray-400 hover:text-white text-sm transition">← กลับ</button>
          </div>

          <div className="max-w-lg w-full px-8">
            <div className="bg-gray-800/80 rounded-2xl p-8 border border-gray-700 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-600/20 flex items-center justify-center"><svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                <h1 className="text-2xl font-bold mb-2">ข้อตกลงก่อนเข้าประชุม</h1>
                <p className="text-gray-400 text-sm">กรุณายอมรับข้อตกลงก่อนเข้าร่วมการประชุมกับแพทย์</p>
              </div>

              <div className="space-y-4 mb-6">
                <label className="flex items-start gap-3 cursor-pointer group" data-testid="consent-recording" aria-label="ยินยอมการบันทึกวิดีโอ">
                  <input type="checkbox" checked={consentRecording} onChange={e => setConsentRecording(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500" />
                  <div>
                    <span className="font-medium group-hover:text-emerald-300 transition">ยินยอมการบันทึกวิดีโอ</span>
                    <p className="text-xs text-gray-400 mt-1">การประชุมอาจถูกบันทึกเพื่อวัตถุประสงค์ทางการแพทย์</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group" data-testid="consent-transcript" aria-label="ยินยอมการึอดเสียง">
                  <input type="checkbox" checked={consentTranscript} onChange={e => setConsentTranscript(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500" />
                  <div>
                    <span className="font-medium group-hover:text-emerald-300 transition">ยินยอมการถอดเสียง (Transcript)</span>
                    <p className="text-xs text-gray-400 mt-1">บทสนทนาจะถูกถอดเสียงเป็นข้อความเพื่อบันทึกประวัติการรักษา</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group" data-testid="consent-data-sharing" aria-label="ยินยอมการแบ่งปันข้อมูล">
                  <input type="checkbox" checked={consentDataSharing} onChange={e => setConsentDataSharing(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500" />
                  <div>
                    <span className="font-medium group-hover:text-emerald-300 transition">ยินยอมการแบ่งปันข้อมูล</span>
                    <p className="text-xs text-gray-400 mt-1">ข้อมูลจะถูกจัดเก็บในระบบสุขภาพอย่างปลอดภัย ตาม PDPA</p>
                  </div>
                </label>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3 mb-6 text-xs text-gray-300">
                <p className="font-medium text-yellow-400 mb-1">หมายเหตุ</p>
                <p>ข้อมูลทั้งหมดจะถูกเข้ารหัสและจัดเก็บตามมาตรฐาน PDPA ท่านสามารถเพิกถอนความยินยอมได้ทุกเมื่อ</p>
              </div>

              <button
                onClick={handleAgreeAndContinue}
                disabled={!consentRecording || !consentTranscript || !consentDataSharing}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-lg font-bold transition-all shadow-lg"
                data-testid="agree-continue-btn"
              >
                ยอมรับและดำเนินการต่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* PRE-JOIN SCREEN (Teams-like) */}
      {/* ================================================================== */}
      {status === 'pre_join' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" data-testid="pre-join-screen">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-400">Izara Meeting</span>
            </div>
            <button onClick={() => navigate('/appointments')} className="text-gray-400 hover:text-white text-sm transition">
              ← กลับ
            </button>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl w-full px-8">
            {/* Video Preview / Avatar */}
            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="relative w-[480px] h-[320px] bg-gray-800 rounded-2xl overflow-hidden border-2 border-gray-600 shadow-2xl">
                {cameraOn && mediaStatus.camera === 'granted' ? (
                  <video ref={previewVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg mb-3">
                      {getUserInitials(patientName)}
                    </div>
                    <span className="text-lg font-medium text-white">{patientName}</span>
                    <span className="text-sm text-emerald-300 mt-1">ผู้ป่วย</span>
                  </div>
                )}
              </div>

              {/* Zoom-style Media Controls */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <button
                    onClick={togglePreviewMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      micOn && mediaStatus.microphone === 'granted'
                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                    title={micOn ? 'ปิดไมค์' : 'เปิดไมค์'}
                  >
                    {micOn && mediaStatus.microphone === 'granted' ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" /></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" /></svg>
                    )}
                  </button>
                  <span className="text-xs text-gray-400 mt-1">{micOn ? 'ไมค์เปิด' : 'ปิดเสียง'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <button
                    onClick={togglePreviewCamera}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      cameraOn && mediaStatus.camera === 'granted'
                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                    title={cameraOn ? 'ปิดกล้อง' : 'เปิดกล้อง'}
                  >
                    {cameraOn && mediaStatus.camera === 'granted' ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" /></svg>
                    )}
                  </button>
                  <span className="text-xs text-gray-400 mt-1">{cameraOn ? 'กล้องเปิด' : 'ปิดกล้อง'}</span>
                </div>
              </div>
            </div>

            {/* Meeting Info & Device Status */}
            <div className="flex-1 flex flex-col items-center lg:items-start gap-6 max-w-sm">
              <div>
                <h1 className="text-2xl font-bold mb-2">เข้าร่วมการประชุม</h1>
                <p className="text-gray-400 text-sm">
                  นัดหมายแพทย์ — {appointmentId?.substring(0, 8)}
                </p>
              </div>

              {/* Participant Info */}
              <div className="w-full bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">ข้อมูลผู้เข้าร่วม</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-lg font-bold shadow">
                    {getUserInitials(patientName)}
                  </div>
                  <div>
                    <div className="font-medium">{patientName}</div>
                    <div className="text-sm text-emerald-400">ผู้ป่วย</div>
                    <div className="text-xs text-gray-500">{user?.email || ''}</div>
                  </div>
                </div>
              </div>

              {/* Device Status */}
              <div className="w-full bg-gray-800/60 rounded-xl p-4 border border-gray-700" data-testid="device-status">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">สถานะอุปกรณ์</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ไมโครโฟน</span>
                    <span className="text-xs">{getMediaStatusIcon(mediaStatus.microphone)} {getMediaStatusText(mediaStatus.microphone)}</span>
                  </div>
                  {mediaStatus.microphoneLabel && (
                    <div className="text-xs text-gray-500 pl-6">{mediaStatus.microphoneLabel}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">กล้อง</span>
                    <span className="text-xs">{getMediaStatusIcon(mediaStatus.camera)} {getMediaStatusText(mediaStatus.camera)}</span>
                  </div>
                  {mediaStatus.cameraLabel && (
                    <div className="text-xs text-gray-500 pl-6">{mediaStatus.cameraLabel}</div>
                  )}
                </div>
              </div>

              {/* Invite Others Section */}
              <div className="w-full bg-gray-800/60 rounded-xl p-4 border border-gray-700" data-testid="invite-section">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">เชิญผู้อื่นเข้าร่วม</h3>
                  <button onClick={() => setShowInvite(!showInvite)} className="text-xs text-emerald-400 hover:text-emerald-300">
                    {showInvite ? 'ซ่อน' : 'แสดง'}
                  </button>
                </div>
                {showInvite && (
                  <div className="space-y-2">
                    <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                      placeholder="ชื่อผู้เข้าร่วม" data-testid="invite-name-input"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      placeholder="อีเมล (ถ้ามี)" data-testid="invite-email-input"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                    <button onClick={shareInviteLink} disabled={!inviteName}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-sm font-medium transition"
                      data-testid="generate-invite-btn">
                      สร้างลิงก์เชิญ
                    </button>
                    {inviteLink && (
                      <div className="bg-gray-700/50 rounded-lg p-2 text-xs" data-testid="invite-link-display">
                        <p className="text-gray-400 mb-1">ลิงก์เชิญ:</p>
                        <div className="flex gap-1">
                          <input type="text" readOnly value={inviteLink}
                            className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-emerald-300" />
                          <button onClick={copyInviteLink}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs">
                            คัดลอก
                          </button>
                        </div>
                        <p className="text-yellow-400 text-xs mt-1">ผู้ที่ได้รับลิงก์จะต้องรอแพทย์อนุมัติก่อนเข้าประชุม</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Join Button */}
              <button
                onClick={joinMeeting}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-lg font-bold transition-all shadow-lg hover:shadow-emerald-600/30"
                data-testid="join-meeting-btn"
              >
                เข้าร่วมการประชุม
              </button>

              {(mediaStatus.camera === 'denied' || mediaStatus.microphone === 'denied') && (
                <div className="w-full bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-yellow-300 text-xs">
                  กรุณาอนุญาตการเข้าถึงกล้องและไมโครโฟนในเบราว์เซอร์เพื่อใช้งานวิดีโอคอล
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MAIN MEETING UI (after joining) — Teams-like */}
      {/* ================================================================== */}
      {status !== 'pre_join' && status !== 'loading' && status !== 'agreement' && (
      <>
      {/* Compact Top Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1b1b1b] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-semibold text-sm">ra Meeting</span>
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
            nscript
          </button>
          <button onClick={() => navigate('/appointments')} className="text-gray-500 hover:text-white text-xs transition">
            ← กลับ
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
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium transition shadow-lg"
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
              <h3 className="font-medium text-sm">e Transcript</h3>
              <button onClick={() => setShowTranscript(false)} className="text-gray-400 hover:text-white">✕</button>
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
    </div>
  );
};

export default PatientMeetingRoom;
