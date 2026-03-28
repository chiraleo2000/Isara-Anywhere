/**
 * GuestMeetingJoin.tsx — Public guest join page (Doctor Portal)
 * External users enter name and wait in lobby for host (doctor) approval.
 * Route: /guest-join/:meetingId  (public, outside ProtectedRoute)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

const JITSI_DOMAIN = 'meet.jit.si';
const MEETING_SERVER_URL = (() => {
  if (globalThis.window !== undefined) {
    const env = (globalThis as any).ENV;
    if (env?.MEETING_SERVER_URL) return env.MEETING_SERVER_URL;
  }
  return import.meta.env?.VITE_MEETING_SERVER_URL || 'http://localhost:3020';
})();

type GuestStatus = 'form' | 'joining' | 'waiting' | 'admitted' | 'rejected' | 'error';

const GuestMeetingJoin: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [guestName, setGuestName] = useState('');
  const [status, setStatus] = useState<GuestStatus>('form');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [roomName, setRoomName] = useState('');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve room name
  useEffect(() => {
    if (!meetingId) return;
    const fallback = `izara-${meetingId.substring(0, 12)}-meeting`;
    fetch(`${MEETING_SERVER_URL}/api/meetings/${meetingId}`)
      .then(r => r.json())
      .then(d => setRoomName(d.meeting?.room_name || fallback))
      .catch(() => setRoomName(fallback));
  }, [meetingId]);

  // Socket.IO lobby events
  useEffect(() => {
    if (!meetingId || !participantId) return;
    const socket = io(MEETING_SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-room', meetingId));
    socket.on('lobby-update', (data: any) => {
      if (data.participant?.participantId === participantId) {
        if (data.action === 'admit') setStatus('admitted');
        if (data.action === 'reject') setStatus('rejected');
      }
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [meetingId, participantId]);

  // Polling fallback
  useEffect(() => {
    if (status !== 'waiting' || !meetingId || !participantId) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/lobby/status/${participantId}`);
        const d = await r.json();
        if (d.status === 'admitted') setStatus('admitted');
        if (d.status === 'rejected') setStatus('rejected');
      } catch { /* keep polling */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, meetingId, participantId]);

  // Wait timer
  useEffect(() => {
    if (status === 'waiting') {
      setWaitSeconds(0);
      waitTimerRef.current = setInterval(() => setWaitSeconds(s => s + 1), 1000);
    } else if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current);
    }
    return () => { if (waitTimerRef.current) clearInterval(waitTimerRef.current); };
  }, [status]);

  // Launch Jitsi when admitted
  useEffect(() => {
    if (status !== 'admitted' || !roomName || jitsiApiRef.current) return;
    const loadJitsi = () => {
      if ((globalThis as any).JitsiMeetExternalAPI) {
        initJitsi();
      } else {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.onload = () => initJitsi();
        document.head.appendChild(script);
      }
    };
    const initJitsi = () => {
      if (!jitsiContainerRef.current) return;
      const api = new (globalThis as any).JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: guestName },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          toolbarButtons: ['microphone', 'camera', 'chat', 'raisehand', 'tileview', 'hangup'],
        },
        interfaceConfigOverwrite: {
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          MOBILE_APP_PROMO: false,
        },
      });
      jitsiApiRef.current = api;
      api.addEventListener('readyToClose', () => setStatus('form'));
    };
    loadJitsi();
    return () => { jitsiApiRef.current?.dispose(); jitsiApiRef.current = null; };
  }, [status, roomName, guestName]);

  const handleJoinLobby = useCallback(async () => {
    if (!guestName.trim() || !meetingId) return;
    setStatus('joining');
    try {
      const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/lobby/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: guestName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setParticipantId(data.participantId);
        setStatus('waiting');
      } else {
        setErrorMsg(data.error || 'Failed to join lobby');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Cannot connect to meeting server');
      setStatus('error');
    }
  }, [guestName, meetingId]);

  const formatWait = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  if (!meetingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-red-400 text-lg">Invalid meeting link</p>
      </div>
    );
  }

  // Admitted — show Jitsi
  if (status === 'admitted') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <div className="bg-emerald-800 text-white px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium">🏥 Izara Meeting — {guestName} (Guest)</span>
          <span className="text-xs text-green-300">✓ Admitted by Host</span>
        </div>
        <div ref={jitsiContainerRef} className="flex-1" data-testid="jitsi-guest-container" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-emerald-700/30" data-testid="guest-join-form">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-600/30">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-white">เข้าร่วมประชุม</h1>
          <p className="text-emerald-400 mt-1 text-sm">Join Meeting as Guest</p>
          <p className="text-xs text-gray-500 mt-2 font-mono">Meeting: {meetingId?.substring(0, 8)}...</p>
        </div>

        {/* Form */}
        {status === 'form' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="guest-name" className="block text-sm font-medium text-gray-300 mb-1">ชื่อของคุณ (Your Name)</label>
              <input
                id="guest-name"
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                data-testid="guest-name-input"
                maxLength={100}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleJoinLobby()}
              />
            </div>
            <button
              onClick={handleJoinLobby}
              disabled={!guestName.trim()}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="guest-join-btn"
            >
              ขอเข้าร่วม (Request to Join)
            </button>
            <p className="text-xs text-gray-500 text-center">
              แพทย์ (Host) จะอนุมัติก่อนเข้าห้องประชุม
            </p>
          </div>
        )}

        {/* Joining */}
        {status === 'joining' && (
          <div className="text-center py-8">
            <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-300">Connecting...</p>
          </div>
        )}

        {/* Waiting */}
        {status === 'waiting' && (
          <div className="text-center py-6" data-testid="guest-lobby-waiting">
            <div className="w-20 h-20 bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-600/30">
              <span className="text-4xl animate-pulse">⏳</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">รอการอนุมัติ</h2>
            <p className="text-gray-400 mb-1">Waiting for host to approve...</p>
            <p className="text-sm text-gray-500 font-mono">{formatWait(waitSeconds)}</p>
            <div className="mt-4 bg-emerald-900/30 rounded-lg p-3 border border-emerald-700/20">
              <p className="text-sm text-emerald-300">
                <span className="font-semibold">{guestName}</span> — กำลังรอแพทย์อนุมัติเข้าห้องประชุม
              </p>
            </div>
          </div>
        )}

        {/* Rejected */}
        {status === 'rejected' && (
          <div className="text-center py-6" data-testid="guest-lobby-rejected">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold text-red-400 mb-2">ถูกปฏิเสธ</h2>
            <p className="text-gray-400 mb-4">Host declined your request</p>
            <button
              onClick={() => setStatus('form')}
              className="bg-gray-700 text-gray-200 px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <p className="text-red-400 mb-4">{errorMsg}</p>
            <button
              onClick={() => setStatus('form')}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestMeetingJoin;
