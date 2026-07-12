/**
 * GuestMeetingJoin.tsx — Public guest join page for meetings
 * Allows external users (no account needed) to join a meeting via lobby.
 * Doctor (host) must approve before guest can enter the Jitsi room.
 * 
 * Routes:
 *   /guest-join/:meetingId     — Basic guest join (name form → lobby)
 *   /guest/join/:token         — Opaque invite token join (auto-validated)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import {
  connectMeetingSocket,
  isHostReady,
  mountGuestJitsiMeeting,
  resolveJitsiDomain,
} from '../utils/jitsiMeetingConfig';
import { resolveMeetingServerUrl } from '../utils/resolveMeetingServerUrl';

function getMeetingServerUrl(): string {
  return resolveMeetingServerUrl();
}

type GuestStatus = 'form' | 'joining' | 'waiting' | 'admitted' | 'in_meeting' | 'rejected' | 'error' | 'validating';

function resolveInitialGuestStatus(hasToken: boolean, blocked: boolean): GuestStatus {
  if (hasToken) return 'validating';
  if (blocked) return 'error';
  return 'form';
}

function waitTwoAnimationFrames(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function guestHeaderStatusLine(
  waitingHost: boolean,
  connectingVideo: boolean,
  currentStatus: GuestStatus,
): string {
  if (waitingHost) return 'Waiting for host…';
  if (connectingVideo) return 'Connecting…';
  if (currentStatus === 'in_meeting') return '✓ In meeting';
  return 'Approved';
}

const GuestMeetingJoin: React.FC = () => {
  const { meetingId: paramMeetingId, token } = useParams<{ meetingId?: string; token?: string }>();
  const [searchParams] = useSearchParams();
  const guestRoleLabel = searchParams.get('guestType') || searchParams.get('role') || 'guest';
  const nameFromUrl = searchParams.get('name') || '';
  const [meetingId, setMeetingId] = useState<string | undefined>(paramMeetingId);
  const [guestName, setGuestName] = useState(nameFromUrl);
  const openGuestJoinBlocked = Boolean(paramMeetingId && !token);
  const [status, setStatus] = useState<GuestStatus>(
    resolveInitialGuestStatus(Boolean(token), openGuestJoinBlocked),
  );
  const [tokenData, setTokenData] = useState<{ guestName: string; guestType: string; roomName: string | null } | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState(
    openGuestJoinBlocked ? 'Anonymous guest access is disabled — use the invite link from your host' : '',
  );
  const [roomName, setRoomName] = useState('');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [connectingVideo, setConnectingVideo] = useState(false);
  const [hostReady, setHostReady] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [mountAttempt, setMountAttempt] = useState(0);
  const [jitsiIframeMounted, setJitsiIframeMounted] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoJoinFromUrlRef = useRef(false);

  // Resolve Jitsi room name from meeting server
  useEffect(() => {
    if (!meetingId) return;
    const fallback = `izara-${meetingId.substring(0, 12)}-meeting`;
    fetch(`${getMeetingServerUrl()}/api/meetings/${meetingId}`)
      .then(r => r.json())
      .then(d => setRoomName(d.meeting?.room_name || fallback))
      .catch(() => setRoomName(fallback));
  }, [meetingId]);

  // JWT token validation flow
  useEffect(() => {
    if (!token || status !== 'validating') return;
    const validate = async () => {
      try {
        const res = await fetch(`${getMeetingServerUrl()}/api/guest/meeting/${encodeURIComponent(token)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Invalid invite link' }));
          setErrorMsg(data.error || 'Invalid or expired invite link');
          setStatus('error');
          return;
        }
        const data = await res.json();
        const resolvedName = String(data.guestName || '').trim();
        setMeetingId(data.meetingId);
        setGuestName(resolvedName);
        setTokenData({ guestName: data.guestName, guestType: data.guestType, roomName: data.roomName });
        if (data.roomName) setRoomName(data.roomName);
        if (resolvedName && token) {
          setStatus('joining');
          const joinRes = await fetch(
            `${getMeetingServerUrl()}/api/guest/meeting/${encodeURIComponent(token)}/join`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ displayName: resolvedName }),
            },
          );
          const joinData = await joinRes.json().catch(() => ({}));
          if (joinRes.ok && joinData.success) {
            setParticipantId(joinData.participantId);
            setStatus('waiting');
            return;
          }
          setErrorMsg(joinData.error || 'Failed to join lobby');
          setStatus('error');
          return;
        }
        setStatus('form');
      } catch {
        setErrorMsg('Cannot connect to meeting server');
        setStatus('error');
      }
    };
    validate();
  }, [token, status]);

  // Socket.IO — all meeting room aliases (lobby + host-ready)
  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    const setup = async () => {
      const socket = await connectMeetingSocket(
        getMeetingServerUrl(),
        meetingId,
        {
          onHostReady: () => { if (!cancelled) setHostReady(true); },
          onLobbyUpdate: (data) => {
            const pid = data.participant?.participantId;
            if (!participantId || pid !== participantId) return;
            if (data.action === 'admit') {
              setStatus('admitted');
              if (data.hostReady) setHostReady(true);
            }
            if (data.action === 'reject') setStatus('rejected');
          },
        },
        { userName: guestName, role: 'guest' },
      );
      if (cancelled) {
        socket.disconnect();
        return;
      }
      socketRef.current = socket;
    };
    void setup();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [meetingId, guestName]);

  // Poll host-ready after lobby admit
  useEffect(() => {
    if (status !== 'admitted' && status !== 'in_meeting') return;
    if (!meetingId) return;
    let cancelled = false;
    const check = async () => {
      if (cancelled) return;
      if (await isHostReady(getMeetingServerUrl(), meetingId)) setHostReady(true);
    };
    void check();
    const id = setInterval(() => void check(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status, meetingId]);

  // Polling fallback — check lobby status every 3s
  useEffect(() => {
    if (status !== 'waiting' || !meetingId || !participantId) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${getMeetingServerUrl()}/api/meetings/${meetingId}/lobby/status/${participantId}`);
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

  const mountJitsi = useCallback(async () => {
    if (!meetingId || !guestName.trim()) return;
    setConnectingVideo(true);
    setVideoError('');
    try {
      const ready = hostReady || (await isHostReady(getMeetingServerUrl(), meetingId));
      if (!ready) {
        setVideoError('รอแพทย์เริ่มการประชุมก่อน');
        return;
      }
      setHostReady(true);
      let resolvedRoom = roomName;
      if (!resolvedRoom) {
        const meta = await fetch(`${getMeetingServerUrl()}/api/meetings/${meetingId}`).then(r => r.json()).catch(() => null);
        resolvedRoom = meta?.meeting?.room_name || `izara-${meetingId.substring(0, 12)}-meeting`;
        setRoomName(resolvedRoom);
      }
      await waitTwoAnimationFrames();
      if (!jitsiContainerRef.current) return;
      jitsiApiRef.current?.dispose?.();
      jitsiApiRef.current = null;
      const api = await mountGuestJitsiMeeting({
        meetingServerUrl: getMeetingServerUrl(),
        meetingId,
        roomName: resolvedRoom,
        displayName: guestName,
        domain: resolveJitsiDomain(),
        container: jitsiContainerRef.current,
        startWithVideo: true,
        startWithAudio: true,
        hostReadyConfirmed: true,
      });
      jitsiApiRef.current = api;
      setJitsiIframeMounted(Boolean(jitsiContainerRef.current?.querySelector('iframe')));
      api.addListener?.('videoConferenceJoined', () => setStatus('in_meeting'));
      api.on?.('videoConferenceJoined', () => setStatus('in_meeting'));
      api.on?.('readyToClose', () => setStatus('form'));
      setStatus('in_meeting');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot connect to video';
      setVideoError(msg);
    } finally {
      setConnectingVideo(false);
    }
  }, [meetingId, roomName, guestName, hostReady]);

  useEffect(() => {
    if (status !== 'admitted' || !meetingId) return;
    void mountJitsi();
    return () => {
      jitsiApiRef.current?.dispose?.();
      jitsiApiRef.current = null;
    };
  }, [status, meetingId, mountAttempt, mountJitsi, hostReady]);

  const handleJoinLobby = useCallback(async () => {
    if (!guestName.trim() || !meetingId) return;
    setStatus('joining');
    try {
      let res: Response;
      if (token) {
        // Token-based join — uses JWT validation
        res = await fetch(`${getMeetingServerUrl()}/api/guest/meeting/${encodeURIComponent(token)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: guestName.trim() }),
        });
      } else {
        // Basic join — direct lobby entry
        res = await fetch(`${getMeetingServerUrl()}/api/meetings/${meetingId}/lobby/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          participantName: guestName.trim(),
          role: guestRoleLabel === 'admin' ? 'admin' : 'guest',
        }),
        });
      }
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
  }, [guestName, meetingId, token]);

  // Pre-filled name (?name= or invite token) — auto-submit lobby (E2E + invite UX)
  useEffect(() => {
    if (autoJoinFromUrlRef.current || !meetingId || status !== 'form') return;
    const resolvedName = guestName.trim() || nameFromUrl.trim();
    if (!resolvedName) return;
    if (!token && !nameFromUrl.trim()) return;
    autoJoinFromUrlRef.current = true;
    void handleJoinLobby();
  }, [meetingId, nameFromUrl, token, status, guestName, handleJoinLobby]);

  const formatWait = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  if (!meetingId && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500 text-lg">Invalid meeting link</p>
      </div>
    );
  }

  // Token validation in progress
  if (status === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="guest-token-validating">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">กำลังตรวจสอบลิงก์เชิญ...</p>
        </div>
      </div>
    );
  }

  if (status === 'admitted' || status === 'in_meeting') {
    const waitingHost =
      !jitsiIframeMounted &&
      status !== 'in_meeting' &&
      !hostReady &&
      !connectingVideo &&
      !videoError;
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col" data-testid="guest-meeting-room">
        <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-sm font-medium">
            Izara Meeting — {guestName} ({guestRoleLabel === 'admin' ? 'Admin Guest' : 'Guest'})
          </span>
          <span className="text-xs text-green-400">
            {guestHeaderStatusLine(waitingHost, connectingVideo, status)}
          </span>
        </div>
        <div className="relative flex-1 min-h-[70vh] w-full">
          <div
            ref={jitsiContainerRef}
            className="absolute inset-0 w-full h-full min-h-[70vh]"
            data-testid="jitsi-guest-container"
          />
          {(waitingHost || connectingVideo) && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/90"
              data-testid={waitingHost ? 'host-waiting-screen' : 'guest-connecting-overlay'}
            >
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
              <p className="text-gray-200 text-center px-4">
                {waitingHost
                  ? 'รอแพทย์เริ่มการประชุม…'
                  : 'กำลังเชื่อมต่อวิดีโอ…'}
              </p>
            </div>
          )}
          {videoError && !connectingVideo && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900/95 p-6">
              <p className="text-red-300 text-center mb-4">{videoError}</p>
              <button
                type="button"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                onClick={() => {
                  setMountAttempt((n) => n + 1);
                  void mountJitsi();
                }}
              >
                ลองใหม่
              </button>
            </div>
          )}
        </div>
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
            {tokenData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 text-center">
                ✓ คุณได้รับเชิญเข้าร่วมประชุมในฐานะ <strong>{tokenData.guestType === 'family' ? 'ครอบครัว' : tokenData.guestType}</strong>
              </div>
            )}
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
          <div className="text-center py-6" data-testid="guest-lobby-waiting" data-participant-id={participantId || ''}>
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
          <div className="text-center py-6" data-testid="guest-access-denied">
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
