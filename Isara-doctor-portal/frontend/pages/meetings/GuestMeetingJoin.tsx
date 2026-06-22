/**
 * GuestMeetingJoin.tsx — Public guest join page (Doctor Portal)
 * Patient, family, or admin may join as guest (camera/mic) after host admits.
 * Route: /guest-join/:meetingId  (public, outside ProtectedRoute)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import {
  connectMeetingSocket,
  isHostReady,
  mountGuestJitsiMeeting,
  resolveJitsiDomain,
} from '../../utils/jitsiMeetingConfig';
import { resolveMeetingServerUrl } from '../../utils/resolveMeetingServerUrl';

const meetingServerBase = () => resolveMeetingServerUrl();

type GuestStatus = 'form' | 'joining' | 'waiting' | 'admitted' | 'in_meeting' | 'rejected' | 'error';

function afterLayoutPaint(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function guestHeaderStatusLabel(
  status: GuestStatus,
  opts: { waitingHost: boolean; connectingVideo: boolean },
): string {
  if (opts.waitingHost) return 'Waiting for host…';
  if (opts.connectingVideo) return 'Connecting…';
  if (status === 'in_meeting') return '✓ In meeting';
  return 'Approved';
}

const GuestMeetingJoin: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const guestRoleLabel = searchParams.get('guestType') || searchParams.get('role') || 'guest';
  const nameFromUrl = searchParams.get('name') || '';
  const [guestName, setGuestName] = useState(nameFromUrl);
  const [status, setStatus] = useState<GuestStatus>('form');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
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

  useEffect(() => {
    if (!meetingId) return;
    const fallback = `izara-${meetingId.substring(0, 12)}-meeting`;
    fetch(`${meetingServerBase()}/api/meetings/${meetingId}`)
      .then(r => r.json())
      .then(d => setRoomName(d.meeting?.room_name || fallback))
      .catch(() => setRoomName(fallback));
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    const setup = async () => {
      const socket = await connectMeetingSocket(
        meetingServerBase(),
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

  useEffect(() => {
    if (status !== 'admitted' && status !== 'in_meeting') return;
    if (!meetingId) return;
    let cancelled = false;
    const check = async () => {
      if (cancelled) return;
      if (await isHostReady(meetingServerBase(), meetingId)) setHostReady(true);
    };
    void check();
    const id = setInterval(() => void check(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status, meetingId]);

  useEffect(() => {
    if (status !== 'waiting' || !meetingId || !participantId) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${meetingServerBase()}/api/meetings/${meetingId}/lobby/status/${participantId}`);
        const d = await r.json();
        if (d.status === 'admitted') setStatus('admitted');
        if (d.status === 'rejected') setStatus('rejected');
      } catch { /* keep polling */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, meetingId, participantId]);

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
      const ready = hostReady || (await isHostReady(meetingServerBase(), meetingId));
      if (!ready) {
        setVideoError('รอแพทย์เริ่มการประชุมก่อน (Waiting for doctor host…)');
        return;
      }
      setHostReady(true);
      let resolvedRoom = roomName;
      if (!resolvedRoom) {
        const meta = await fetch(`${meetingServerBase()}/api/meetings/${meetingId}`).then(r => r.json()).catch(() => null);
        resolvedRoom = meta?.meeting?.room_name || `izara-${meetingId.substring(0, 12)}-meeting`;
        setRoomName(resolvedRoom);
      }
      await afterLayoutPaint();
      if (!jitsiContainerRef.current) return;
      jitsiApiRef.current?.dispose?.();
      jitsiApiRef.current = null;
      const api = await mountGuestJitsiMeeting({
        meetingServerUrl: meetingServerBase(),
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
      const res = await fetch(`${meetingServerBase()}/api/meetings/${meetingId}/lobby/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: guestName.trim(),
          role: guestRoleLabel === 'admin' ? 'admin' : 'guest',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setParticipantId(data.participantId);
        setStatus(data.status === 'admitted' ? 'admitted' : 'waiting');
      } else {
        setErrorMsg(data.error || 'Failed to join lobby');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Cannot connect to meeting server');
      setStatus('error');
    }
  }, [guestName, meetingId, guestRoleLabel]);

  useEffect(() => {
    if (autoJoinFromUrlRef.current || !nameFromUrl.trim() || !meetingId) return;
    if (status !== 'form') return;
    autoJoinFromUrlRef.current = true;
    void handleJoinLobby();
  }, [meetingId, nameFromUrl, status, handleJoinLobby]);

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

  if (status === 'admitted' || status === 'in_meeting') {
    const waitingHost =
      !jitsiIframeMounted &&
      status !== 'in_meeting' &&
      !hostReady &&
      !connectingVideo &&
      !videoError;
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col" data-testid="guest-meeting-room">
        <div className="bg-emerald-800 text-white px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-sm font-medium">
            Izara Meeting — {guestName} ({guestRoleLabel === 'admin' ? 'Admin Guest' : 'Guest'})
          </span>
          <span className="text-xs text-green-300">
            {guestHeaderStatusLabel(status, { waitingHost, connectingVideo })}
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
              <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mb-4" />
              <p className="text-gray-200 text-center px-4">
                {waitingHost
                  ? 'รอแพทย์เริ่มการประชุม… / Waiting for doctor to start'
                  : 'กำลังเชื่อมต่อวิดีโอ… / Connecting video'}
              </p>
            </div>
          )}
          {videoError && !connectingVideo && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900/95 p-6">
              <p className="text-red-300 text-center mb-4">{videoError}</p>
              <button
                type="button"
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
                onClick={() => {
                  setMountAttempt(n => n + 1);
                  void mountJitsi();
                }}
              >
                ลองใหม่ / Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-emerald-700/30" data-testid="guest-join-form">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-600/30">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-white">เข้าร่วมประชุม</h1>
          <p className="text-gray-400 mt-1 text-sm">Join Meeting as Guest</p>
          <p className="text-xs text-gray-500 mt-2 font-mono">Meeting: {meetingId.substring(0, 8)}...</p>
        </div>

        {status === 'form' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="guest-name" className="block text-sm font-medium text-gray-300 mb-1">ชื่อของคุณ</label>
              <input
                id="guest-name"
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg focus:ring-2 focus:ring-emerald-500"
                data-testid="guest-name-input"
                maxLength={100}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleJoinLobby()}
              />
            </div>
            <button
              onClick={handleJoinLobby}
              disabled={!guestName.trim()}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-emerald-700 disabled:opacity-50"
              data-testid="guest-join-btn"
            >
              ขอเข้าร่วม (Request to Join)
            </button>
          </div>
        )}

        {status === 'joining' && (
          <div className="text-center py-8">
            <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Connecting...</p>
          </div>
        )}

        {status === 'waiting' && (
          <div className="text-center py-6" data-testid="guest-lobby-waiting" data-participant-id={participantId || ''}>
            <div className="w-20 h-20 bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl animate-pulse">⏳</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">รอการอนุมัติ</h2>
            <p className="text-gray-400 mb-1">Waiting for host to approve...</p>
            <p className="text-sm text-gray-500 font-mono">{formatWait(waitSeconds)}</p>
          </div>
        )}

        {status === 'rejected' && (
          <div className="text-center py-6" data-testid="guest-lobby-rejected">
            <h2 className="text-xl font-semibold text-red-400 mb-2">ถูกปฏิเสธ</h2>
            <button onClick={() => setStatus('form')} className="bg-gray-700 text-white px-6 py-2 rounded-lg">
              Try Again
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6">
            <p className="text-red-400 mb-4">{errorMsg}</p>
            <button onClick={() => setStatus('form')} className="bg-emerald-600 text-white px-6 py-2 rounded-lg">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestMeetingJoin;
