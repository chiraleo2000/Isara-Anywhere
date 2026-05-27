/**
 * Socket.IO handlers extracted from index.js (incremental refactor).
 */
export function registerSocketHandlers(io, deps) {
  const {
    meetingSocketRoomIds,
    markHostOnline,
    isHostReadyForMeeting,
    resolveLobbyKeySync,
    getLobbyMap,
    syncLobbyAliasMaps,
    meetingLobbies,
    pool,
    activeTranscriptions,
    participantMediaStatus,
    meetingChats,
    uuidv4,
  } = deps;

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join-meeting', (data) => {
      const meetingId = typeof data === 'string' ? data : data?.meetingId;
      const userName = typeof data === 'object' ? data?.userName : undefined;
      const userRole = typeof data === 'object' ? data?.role : undefined;

      if (meetingId) {
        const rooms = meetingSocketRoomIds(meetingId);
        for (const room of rooms) socket.join(room);
        socket.meetingId = meetingId;
        socket.meetingRooms = rooms;
        if (userRole === 'doctor' || userRole === 'admin' || userRole === 'host') {
          markHostOnline(meetingId);
        }
        if (isHostReadyForMeeting(meetingId)) {
          socket.emit('host-ready', { meetingId, ready: true, at: new Date().toISOString() });
        }
        for (const room of rooms) {
          socket.to(room).emit('participant-joined', {
            socketId: socket.id,
            userName,
            role: userRole,
            timestamp: new Date().toISOString(),
          });
        }
        console.log(`[Socket] ${socket.id} (${userName || 'unknown'}) joined rooms ${rooms.join(',')}`);
      }
    });

    socket.on('leave-meeting', (meetingId) => {
      socket.leave(meetingId);
      socket.to(meetingId).emit('participant-left', {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
      console.log(`[Socket] ${socket.id} left meeting ${meetingId}`);
    });

    socket.on('transcript-segment', async (data) => {
      const {
        meetingId,
        speakerId,
        speakerRole,
        speakerName,
        content,
        language,
        confidence,
        isFinal,
        startTimeSeconds,
      } = data;
      const isSegmentFinal = isFinal !== false;
      try {
        if (isSegmentFinal) {
          await pool.query(
            `INSERT INTO meeting_transcripts (meeting_record_id, speaker_id, speaker_role, speaker_name, content, language, confidence, start_time_seconds, is_final)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
            [
              meetingId,
              speakerId,
              speakerRole,
              speakerName,
              content,
              language || 'th',
              confidence,
              startTimeSeconds,
            ],
          );
          const session = activeTranscriptions.get(meetingId);
          if (session?.isActive && !session.isPaused) {
            session.transcripts.push({
              speaker_id: speakerId,
              speaker_role: speakerRole,
              speaker_name: speakerName,
              content,
              language: language || 'th',
              start_time_seconds: startTimeSeconds,
              timestamp: new Date(),
            });
          }
        }
        io.to(meetingId).emit('transcript-update', {
          speakerId,
          speakerRole,
          speakerName,
          content,
          language,
          isFinal: isSegmentFinal,
          startTimeSeconds,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Socket] Transcript segment error:', error);
        io.to(meetingId).emit('transcript-update', {
          speakerId,
          speakerRole,
          speakerName,
          content,
          isFinal: isSegmentFinal,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('chat-message', (data) => {
      const { meetingId, senderId, senderName, senderRole, message } = data;
      const chatMsg = {
        id: uuidv4(),
        meetingId,
        senderId,
        senderName,
        senderRole,
        message,
        type: 'text',
        timestamp: new Date().toISOString(),
      };
      if (!meetingChats.has(meetingId)) meetingChats.set(meetingId, []);
      meetingChats.get(meetingId).push(chatMsg);
      io.to(meetingId).emit('chat-message', chatMsg);
    });

    socket.on('meeting-status', (data) => {
      const { meetingId, status } = data;
      io.to(meetingId).emit('meeting-status', { meetingId, status, timestamp: new Date().toISOString() });
    });

    socket.on('media-update', (data) => {
      const { meetingId, userId, userName, role, camera, microphone } = data;
      if (meetingId) {
        let roomMedia = participantMediaStatus.get(meetingId);
        if (!roomMedia) {
          roomMedia = new Map();
          participantMediaStatus.set(meetingId, roomMedia);
        }
        roomMedia.set(userId || socket.id, {
          userId: userId || socket.id,
          userName,
          role,
          camera,
          microphone,
          lastUpdated: new Date().toISOString(),
        });
        io.to(meetingId).emit('participant-media-update', {
          userId: userId || socket.id,
          userName,
          role,
          camera,
          microphone,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('lobby-request', (data) => {
      const { meetingId, participantId, participantName, role, email } = data;
      if (!meetingId || !participantId) return;
      const lobbyKey = resolveLobbyKeySync(meetingId);
      if (role === 'doctor' || role === 'admin') {
        socket.emit('lobby-response', { meetingId: lobbyKey, participantId, status: 'admitted' });
        return;
      }
      const { lobby } = getLobbyMap(lobbyKey);
      const entry = {
        participantId,
        participantName,
        role: role || 'guest',
        email: email || null,
        status: 'waiting',
        socketId: socket.id,
        joinedAt: new Date().toISOString(),
      };
      lobby.set(participantId, entry);
      syncLobbyAliasMaps(lobbyKey, lobby);
      io.to(lobbyKey).emit('lobby-update', { meetingId: lobbyKey, action: 'join', participant: entry });
      io.to(meetingId).emit('lobby-update', { meetingId: lobbyKey, action: 'join', participant: entry });
      socket.emit('lobby-response', { meetingId: lobbyKey, participantId, status: 'waiting' });
    });

    socket.on('lobby-admit', (data) => {
      const { meetingId, participantId, admittedBy } = data;
      const lobbyKey = resolveLobbyKeySync(meetingId);
      const lobby = meetingLobbies.get(lobbyKey);
      if (!lobby?.has(participantId)) return;
      const entry = lobby.get(participantId);
      entry.status = 'admitted';
      entry.admittedBy = admittedBy;
      entry.admittedAt = new Date().toISOString();
      syncLobbyAliasMaps(lobbyKey, lobby);
      io.to(lobbyKey).emit('lobby-update', { meetingId: lobbyKey, action: 'admit', participant: entry });
    });

    socket.on('lobby-reject', (data) => {
      const { meetingId, participantId, rejectedBy } = data;
      const lobbyKey = resolveLobbyKeySync(meetingId);
      const lobby = meetingLobbies.get(lobbyKey);
      if (!lobby?.has(participantId)) return;
      const entry = lobby.get(participantId);
      entry.status = 'rejected';
      entry.rejectedBy = rejectedBy;
      entry.rejectedAt = new Date().toISOString();
      syncLobbyAliasMaps(lobbyKey, lobby);
      io.to(lobbyKey).emit('lobby-update', { meetingId: lobbyKey, action: 'reject', participant: entry });
    });

    socket.on('disconnect', () => {
      if (socket.meetingId) {
        socket.to(socket.meetingId).emit('participant-left', {
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        });
      }
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}
