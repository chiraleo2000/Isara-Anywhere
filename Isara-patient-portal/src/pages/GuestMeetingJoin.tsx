/**
 * GuestMeetingJoin.tsx — Public guest join page for meetings
 * Allows external users (no account needed) to join a meeting via lobby.
 * Doctor (host) must approve before guest can enter the Jitsi room.
 * Route: /guest-join/:meetingId
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
  const [guestEmail, setGuestEmail] = useState('');
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

  // Resolve Jitsi room name from meeting server
  useEffect(() => {
    if (!meetingId) return;
    const fallback = `izara-${meetingId.substring(0, 12)}-meeting`;
    fetch(`${MEETING_SERVER_URL}/api/meetings/${meetingId}`)
      .then(r => r.json())
      .then(d => setRoomName(d.meeting?.room_name || fallback))
      .catch(() => setRoomName(fallback));
  }, [meetingId]);

  // Socket.IO for real-time lobby updates
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

  // Polling fallback — check lobby status every 3s
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
        body: JSON.stringify({ participantName: guestName.trim(), email: guestEmail.trim() || undefined }),
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500 text-lg">Invalid meeting link</p>
      </div>
    );
  }

  // Admitted — show Jitsi
  if (status === 'admitted') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium">🏥 Izara Meeting — {guestName} (Guest)</span>
          <span className="text-xs text-green-400">✓ Admitted</span>
        </div>
        <div ref={jitsiContainerRef} className="flex-1" data-testid="jitsi-guest-container" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full" data-testid="guest-join-form">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">เข้าร่วมประชุม</h1>
          <p className="text-gray-500 mt-1 text-sm">Join Meeting as Guest</p>
          <p className="text-xs text-gray-400 mt-2 font-mono">Meeting: {meetingId?.substring(0, 8)}...</p>
        </div>

        {/* Form state */}
        {status === 'form' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">ชื่อของคุณ (Your Name)</label>
              <input
                id="guest-name"
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                data-testid="guest-name-input"
                maxLength={100}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleJoinLobby()}
              />
            </div>
            <div>
              <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 mb-1">อีเมล (Email) — ไม่บังคับ</label>
              <input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="guest-email-input"
                maxLength={200}
                onKeyDown={e => e.key === 'Enter' && handleJoinLobby()}
              />
            </div>
            <button
              onClick={handleJoinLobby}
              disabled={!guestName.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="guest-join-btn"
            >
              ขอเข้าร่วม (Request to Join)
            </button>
            <p className="text-xs text-gray-400 text-center">
              แพทย์ (Host) จะอนุมัติก่อนเข้าห้องประชุม
            </p>
          </div>
        )}

        {/* Joining state */}
        {status === 'joining' && (
          <div className="text-center py-8">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Connecting...</p>
          </div>
        )}

        {/* Waiting in lobby */}
        {status === 'waiting' && (
          <div className="text-center py-6" data-testid="guest-lobby-waiting">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl animate-pulse">⏳</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">รอการอนุมัติ</h2>
            <p className="text-gray-500 mb-1">Waiting for host to approve...</p>
            <p className="text-sm text-gray-400 font-mono">{formatWait(waitSeconds)}</p>
            {waitSeconds >= 300 && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">
                  รอมาแล้ว 5 นาที — แพทย์อาจยังไม่ได้เริ่มการประชุม
                </p>
                <button
                  onClick={() => setStatus('form')}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  กลับหน้าแรก
                </button>
              </div>
            )}
            <div className="mt-4 bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">{guestName}</span> — กำลังรอแพทย์อนุมัติเข้าห้องประชุม
              </p>
            </div>
          </div>
        )}

        {/* Rejected */}
        {status === 'rejected' && (
          <div className="text-center py-6" data-testid="guest-lobby-rejected">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold text-red-700 mb-2">ถูกปฏิเสธ</h2>
            <p className="text-gray-500 mb-4">Host declined your request</p>
            <button
              onClick={() => setStatus('form')}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <p className="text-red-600 mb-4">{errorMsg}</p>
            <button
              onClick={() => setStatus('form')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
