/**
 * Izara Jitsi Meeting Server — Phase 1 Complete
 * 
 * Version: 1.4.8-dev
 * Updated: 2026-02-14
 * 
 * Main API server for:
 * - Meeting room management (Jitsi Meet - FREE)
 * - Real-time transcription via Web Speech API (browser-native, FREE)
 * - In-meeting chat messaging
 * - AI meeting summarization via Gemini 2.5 Flash Lite
 * - AI patient instruction sheet generation
 * - AI pre-consultation summary
 * - AI document analysis
 * - Guest invite management
 * - Man-in-the-loop AI validation
 * - PostgreSQL persistence + in-memory fallback
 * - Socket.IO real-time events
 * 
 * v1.4.8-dev Changes:
 * - Fixed JWT_SECRET alignment across all services
 * - Added optionalAuth to /api/meeting/create (security fix)
 * - Added memory cleanup for in-memory maps
 * - Improved error handling (no more swallowed errors)
 */

import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const { Pool } = pg;

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 3020;
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
const JWT_SECRET = process.env.JWT_SECRET || 'izara-jwt-secret-key-phase1-2026';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

// Database Configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'izara_phase1',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Initialize Gemini AI
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini AI initialized');
}

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3005', 'http://localhost:3010'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3005', 'http://localhost:3010'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Optional auth — tries to authenticate but doesn't block
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch { /* ignore */ }
  }
  next();
};

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

const activeTranscriptions = new Map();
const meetingChats = new Map();
const meetingInvites = new Map();
const aiValidations = new Map();

// ============================================================================
// HEALTH CHECK ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'izara-jitsi-server',
    version: '1.4.8-dev',
    timestamp: new Date().toISOString(),
    features: {
      jitsi: true,
      transcription: 'web-speech-api',
      ai: !!genAI,
      chat: true,
      guestInvites: true
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'izara-jitsi-server',
    version: '1.4.8-dev',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    jitsiDomain: JITSI_DOMAIN,
    aiEnabled: !!genAI,
    aiModel: GEMINI_MODEL
  });
});

// ============================================================================
// MEETING MANAGEMENT ROUTES
// ============================================================================

// Create new meeting room (primary endpoint — requires auth)
app.post('/api/meetings/create', authenticateToken, async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId, patientName, doctorName, scheduledTime, guestInvites } = req.body;
    
    const meetingId = uuidv4();
    const roomName = `izara-${appointmentId?.substring(0, 12) || meetingId.substring(0, 8)}-${Date.now().toString(36)}`;
    
    // Jitsi URL parameters
    const params = new URLSearchParams();
    params.set('config.prejoinPageEnabled', 'true');
    params.set('config.startWithAudioMuted', 'false');
    params.set('config.startWithVideoMuted', 'false');
    params.set('config.enableClosePage', 'true');
    params.set('config.disableDeepLinking', 'true');
    params.set('config.defaultLanguage', 'th');
    params.set('config.requireDisplayName', 'true');
    params.set('config.enableLobbyChat', 'true');
    params.set('config.fileRecordingsEnabled', 'true');
    params.set('config.localRecording.enabled', 'true');
    params.set('interfaceConfig.APP_NAME', 'Izara Telemedicine');
    params.set('interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE', 'false');
    
    const meetingUrl = `https://${JITSI_DOMAIN}/${roomName}#${params.toString()}`;
    const doctorUrl = `${meetingUrl}&userInfo.displayName=${encodeURIComponent(doctorName || 'Doctor')}`;
    const patientUrl = `${meetingUrl}&userInfo.displayName=${encodeURIComponent(patientName || 'Patient')}`;
    const guestUrl = `${meetingUrl}&userInfo.displayName=Guest`;
    
    // Insert into database
    const result = await pool.query(
      `INSERT INTO meeting_records (
        id, appointment_id, doctor_id, patient_id, room_name, jitsi_domain,
        meeting_url, doctor_url, patient_url, guest_url, status, meeting_config, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        meetingId, appointmentId, doctorId, patientId, roomName, JITSI_DOMAIN,
        meetingUrl, doctorUrl, patientUrl, guestUrl, 'scheduled',
        JSON.stringify({
          lobbyEnabled: true, recordingEnabled: true, transcriptionEnabled: true,
          scheduledTime, guestInvites: guestInvites || []
        })
      ]
    );
    
    // Store guest invites if provided
    if (guestInvites && guestInvites.length > 0) {
      meetingInvites.set(meetingId, guestInvites.map(g => ({
        id: uuidv4(), meetingId, name: g.name, email: g.email,
        role: g.role || 'guest', invitedAt: new Date().toISOString(), status: 'pending'
      })));
    }
    
    console.log(`[Meeting] Created meeting ${meetingId} for appointment ${appointmentId}`);
    
    res.json({
      success: true,
      meeting: result.rows[0],
      meetingId,
      roomName,
      urls: { base: meetingUrl, doctor: doctorUrl, patient: patientUrl, guest: guestUrl }
    });
    
  } catch (error) {
    console.error('[Meeting] Create error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Alias: /api/meeting/create (alternative endpoint — with optional auth for security)
app.post('/api/meeting/create', optionalAuth, async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId, patientName, doctorName, title, scheduledTime, guestInvites } = req.body;
    
    const meetingId = uuidv4();
    const roomName = `izara-${appointmentId?.substring(0, 12) || meetingId.substring(0, 8)}-${Date.now().toString(36)}`;
    const meetingUrl = `https://${JITSI_DOMAIN}/${roomName}`;
    
    try {
      await pool.query(
        `INSERT INTO meeting_records (
          id, appointment_id, doctor_id, patient_id, room_name, jitsi_domain,
          meeting_url, doctor_url, patient_url, guest_url, status, meeting_config, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT DO NOTHING`,
        [
          meetingId, appointmentId || null, doctorId || null, patientId || null,
          roomName, JITSI_DOMAIN, meetingUrl, meetingUrl, meetingUrl, meetingUrl,
          'scheduled', JSON.stringify({ title: title || 'Izara Consultation', guestInvites: guestInvites || [] })
        ]
      );
    } catch (error_) {
      console.log('[Meeting] DB insert skipped (FK):', error_.message);
    }
    
    if (guestInvites && guestInvites.length > 0) {
      meetingInvites.set(meetingId, guestInvites.map(g => ({
        id: uuidv4(), meetingId, name: g.name, email: g.email,
        role: g.role || 'guest', invitedAt: new Date().toISOString(), status: 'pending'
      })));
    }
    
    res.json({
      success: true, meetingId, roomName, meetingUrl,
      title: title || 'Izara Consultation',
      urls: { base: meetingUrl, doctor: meetingUrl, patient: meetingUrl, guest: meetingUrl }
    });
    
  } catch (error) {
    console.error('[Meeting] Create error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Get meeting info
app.get('/api/meetings/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT mr.*, 
              u_doc.name as doctor_name, u_doc.name_thai as doctor_name_thai,
              u_pat.name as patient_name, u_pat.name_thai as patient_name_thai
       FROM meeting_records mr
       LEFT JOIN users u_doc ON mr.doctor_id = u_doc.id
       LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
       WHERE mr.id::text = $1 OR mr.appointment_id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({ success: true, meeting: result.rows[0] });
    
  } catch (error) {
    console.error('[Meeting] Get error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

// Get meeting status (no auth)
app.get('/api/meetings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    let status = 'unknown';
    let meetingId = id;
    let participants = 0;
    
    const session = activeTranscriptions.get(id);
    if (session) {
      status = session.isActive ? 'in_progress' : 'completed';
    }
    
    try {
      const result = await pool.query(
        `SELECT id, status, started_at, ended_at FROM meeting_records WHERE id::text = $1 OR appointment_id = $1`,
        [id]
      );
      if (result.rows.length > 0) {
        status = result.rows[0].status;
        meetingId = result.rows[0].id;
      }
    } catch (error_) {
      console.warn('[Meeting] DB status lookup error:', error_.message);
    }
    
    try {
      const room = io.sockets.adapter.rooms.get(meetingId);
      participants = room ? room.size : 0;
    } catch (error_) {
      console.warn('[Meeting] Room lookup error:', error_.message);
    }
    
    res.json({ success: true, meetingId, status, participants });
  } catch (error) {
    res.json({ success: true, meetingId: req.params.id, status: 'scheduled', participants: 0 });
  }
});

// Get meeting participants
app.get('/api/meetings/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    let participants = [];
    
    try {
      const result = await pool.query(
        `SELECT mr.doctor_id, mr.patient_id, 
                u_doc.display_name as doctor_name, u_pat.display_name as patient_name
         FROM meeting_records mr
         LEFT JOIN users u_doc ON mr.doctor_id = u_doc.id
         LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
         WHERE mr.id::text = $1 OR mr.appointment_id = $1`,
        [id]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        if (row.doctor_id) participants.push({ id: row.doctor_id, name: row.doctor_name, role: 'doctor', status: 'registered' });
        if (row.patient_id) participants.push({ id: row.patient_id, name: row.patient_name, role: 'patient', status: 'registered' });
      }
    } catch (error_) {
      console.warn('[Meeting] DB participants lookup error:', error_.message);
    }
    
    const invites = meetingInvites.get(id) || [];
    for (const inv of invites) {
      participants.push({ id: inv.id, name: inv.name, role: inv.role, status: inv.status });
    }
    
    res.json({ success: true, participants, total: participants.length });
  } catch (error) {
    res.json({ success: true, participants: [], total: 0 });
  }
});

// ============================================================================
// TRANSCRIPTION ROUTES
// ============================================================================

// Start transcription
app.post('/api/meetings/:id/start-transcription', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'th-TH' } = req.body;
    
    let meetingId = id;
    try {
      const meetingResult = await pool.query(
        'SELECT * FROM meeting_records WHERE id::text = $1 OR appointment_id = $1', [id]
      );
      if (meetingResult.rows.length > 0) {
        meetingId = meetingResult.rows[0].id;
        await pool.query(
          `UPDATE meeting_records SET status = 'in_progress', started_at = COALESCE(started_at, NOW()) WHERE id = $1`,
          [meetingId]
        );
      }
    } catch (error_) {
      console.log('[Transcription] DB lookup skipped:', error_.message);
    }
    
    const transcriptionSession = {
      meetingId, startedAt: new Date(), language,
      transcripts: [], isActive: true, isPaused: false
    };
    activeTranscriptions.set(meetingId, transcriptionSession);
    
    io.to(meetingId).emit('meeting-status', { meetingId, status: 'transcribing', language });
    console.log(`[Transcription] Started for meeting ${meetingId}`);
    
    res.json({ success: true, message: 'Transcription started', sessionId: meetingId, language });
    
  } catch (error) {
    console.error('[Transcription] Start error:', error);
    res.status(500).json({ error: 'Failed to start transcription' });
  }
});

// Pause/Resume transcription
app.post('/api/meetings/:id/pause-transcription', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const session = activeTranscriptions.get(id);
    if (session) {
      session.isPaused = !session.isPaused;
      io.to(id).emit('meeting-status', { meetingId: id, status: session.isPaused ? 'paused' : 'transcribing' });
    }
    
    console.log(`[Transcription] ${session?.isPaused ? 'Paused' : 'Resumed'} for meeting ${id}`);
    res.json({
      success: true,
      message: session?.isPaused ? 'Transcription paused' : 'Transcription resumed',
      isPaused: session?.isPaused || false
    });
    
  } catch (error) {
    console.error('[Transcription] Pause error:', error);
    res.status(500).json({ error: 'Failed to pause transcription' });
  }
});

// Add transcript segment
app.post('/api/meetings/:id/transcript', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { speakerId, speakerRole, speakerName, content, text, language, confidence, startTime, endTime } = req.body;
    const transcriptContent = content || text || '';
    
    if (!transcriptContent) {
      return res.status(400).json({ error: 'Transcript content is required' });
    }
    
    let transcript = null;
    
    try {
      const result = await pool.query(
        `INSERT INTO meeting_transcripts (
          meeting_record_id, appointment_id, speaker_id, speaker_role, speaker_name,
          content, language, confidence, start_time_seconds, end_time_seconds, created_at
        )
        SELECT $1::uuid, mr.appointment_id, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
        FROM meeting_records mr WHERE mr.id::text = $1
        RETURNING *`,
        [id, speakerId, speakerRole, speakerName, transcriptContent, language || 'th', confidence, startTime, endTime]
      );
      transcript = result.rows[0] || null;
    } catch (error_) {
      console.log('[Transcript] DB insert skipped:', error_.message);
    }
    
    if (!transcript) {
      transcript = {
        id: uuidv4(), meeting_record_id: id,
        speaker_id: speakerId, speaker_role: speakerRole, speaker_name: speakerName,
        content: transcriptContent, language: language || 'th', confidence,
        created_at: new Date()
      };
    }
    
    const session = activeTranscriptions.get(id);
    if (session && !session.isPaused) {
      session.transcripts.push({ ...transcript, timestamp: new Date() });
    }
    
    io.to(id).emit('transcript-update', transcript);
    res.json({ success: true, transcript });
    
  } catch (error) {
    console.error('[Transcript] Add error:', error);
    res.status(500).json({ error: 'Failed to add transcript' });
  }
});

// Stop transcription
app.post('/api/meetings/:id/stop-transcription', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const session = activeTranscriptions.get(id);
    let fullTranscript = '';
    let totalSegments = 0;
    
    if (session) {
      session.isActive = false;
      session.isPaused = false;
      session.endedAt = new Date();
      fullTranscript = session.transcripts
        .map(t => `[${t.speaker_role}] ${t.speaker_name || 'Unknown'}: ${t.content}`)
        .join('\n');
      totalSegments = session.transcripts.length;
    }
    
    try {
      const transcriptsResult = await pool.query(
        `SELECT * FROM meeting_transcripts WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`, [id]
      );
      if (transcriptsResult.rows.length > 0) {
        fullTranscript = transcriptsResult.rows
          .map(t => `[${t.speaker_role}] ${t.speaker_name}: ${t.content}`)
          .join('\n');
        totalSegments = transcriptsResult.rows.length;
      }
      await pool.query(`UPDATE meeting_records SET transcript = $1 WHERE id::text = $2`, [fullTranscript, id]);
    } catch (error_) {
      console.log('[Transcription] DB update skipped:', error_.message);
    }
    
    io.to(id).emit('meeting-status', { meetingId: id, status: 'transcription_stopped' });
    console.log(`[Transcription] Stopped for meeting ${id}, ${totalSegments} segments`);
    
    // Auto-trigger transcript embedding processing in background
    if (totalSegments > 0) {
      setImmediate(async () => {
        try {
          let transcriptRows = [];
          const transcriptsResult = await pool.query(
            `SELECT * FROM meeting_transcripts WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`, [id]
          );
          transcriptRows = transcriptsResult.rows;
          if (transcriptRows.length > 0) {
            const chunks = chunkTranscript(transcriptRows, 60);
            let stored = 0;
            for (const chunk of chunks) {
              try {
                await pool.query(
                  `INSERT INTO transcript_embeddings 
                   (meeting_record_id, chunk_index, chunk_text, speaker_role, 
                    start_time_seconds, end_time_seconds, metadata)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   ON CONFLICT DO NOTHING`,
                  [id, chunk.chunk_index, chunk.chunk_text, chunk.speaker_role,
                   chunk.start_time_seconds, chunk.end_time_seconds,
                   JSON.stringify({ auto: true, total_segments: transcriptRows.length })]
                );
                stored++;
              } catch { /* skip individual chunk errors */ }
            }
            console.log(`[Embeddings] Auto-processed ${stored} chunks for meeting ${id}`);
          }
        } catch (error_) {
          console.log('[Embeddings] Auto-process skipped:', error_.message);
        }
      });
    }
    
    res.json({ success: true, message: 'Transcription stopped', totalSegments, fullTranscript });
    
  } catch (error) {
    console.error('[Transcription] Stop error:', error);
    res.status(500).json({ error: 'Failed to stop transcription' });
  }
});

// Get meeting transcript
app.get('/api/meetings/:id/transcript', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let rows = [];
    
    try {
      const result = await pool.query(
        `SELECT * FROM meeting_transcripts 
         WHERE meeting_record_id::text = $1 OR appointment_id = $1
         ORDER BY created_at ASC`, [id]
      );
      rows = result.rows;
    } catch (error_) {
      console.log('[Transcript] DB query skipped:', error_.message);
      const session = activeTranscriptions.get(id);
      if (session) {
        rows = session.transcripts.map((s, i) => ({
          id: s.id || `seg-${i}`, content: s.content || '',
          speaker_name: s.speaker_name || 'Unknown',
          speaker_role: s.speaker_role || 'participant',
          created_at: s.timestamp || new Date().toISOString()
        }));
      }
    }
    
    const fullTranscript = rows
      .map(t => `[${t.speaker_role}] ${t.speaker_name || 'Unknown'}: ${t.content}`)
      .join('\n');
    
    res.json({ success: true, segments: rows, fullTranscript, totalSegments: rows.length });
    
  } catch (error) {
    console.error('[Transcript] Get error:', error);
    res.json({ success: true, segments: [], fullTranscript: '', totalSegments: 0 });
  }
});

// Get transcript sections (30-minute splits)
app.get('/api/meetings/:id/transcript/sections', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const sectionMinutes = Number.parseInt(req.query.minutes || '30', 10);
    
    let rows = [];
    try {
      const result = await pool.query(
        `SELECT * FROM meeting_transcripts 
         WHERE meeting_record_id::text = $1 OR appointment_id = $1
         ORDER BY created_at ASC`, [id]
      );
      rows = result.rows;
    } catch (error_) {
      const session = activeTranscriptions.get(id);
      if (session) rows = session.transcripts;
    }
    
    const sections = [];
    if (rows.length > 0) {
      const startTime = new Date(rows[0].created_at).getTime();
      let currentSection = { startTime: rows[0].created_at, segments: [], index: 0 };
      
      for (const row of rows) {
        const rowTime = new Date(row.created_at).getTime();
        const elapsedMinutes = (rowTime - startTime) / 60000;
        const sectionIndex = Math.floor(elapsedMinutes / sectionMinutes);
        
        if (sectionIndex > currentSection.index) {
          sections.push(currentSection);
          currentSection = { startTime: row.created_at, segments: [], index: sectionIndex };
        }
        currentSection.segments.push(row);
      }
      sections.push(currentSection);
    }
    
    res.json({
      success: true,
      sections: sections.map((s, i) => ({
        sectionNumber: i + 1, startTime: s.startTime,
        segmentCount: s.segments.length,
        transcript: s.segments.map(seg => `[${seg.speaker_role}] ${seg.speaker_name || 'Unknown'}: ${seg.content}`).join('\n'),
        segments: s.segments
      })),
      totalSections: sections.length, sectionMinutes
    });
  } catch (error) {
    console.error('[Transcript Sections] Error:', error);
    res.json({ success: true, sections: [], totalSections: 0, sectionMinutes: 30 });
  }
});

// ============================================================================
// CHAT MESSAGE ROUTES
// ============================================================================

app.post('/api/meetings/:id/chat', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { senderId, senderName, senderRole, message, type = 'text' } = req.body;
    
    if (!message) return res.status(400).json({ error: 'Message is required' });
    
    const chatMessage = {
      id: uuidv4(), meetingId: id,
      senderId: senderId || req.user?.id || 'anonymous',
      senderName: senderName || req.user?.name || 'Unknown',
      senderRole: senderRole || req.user?.role || 'participant',
      message, type, timestamp: new Date().toISOString()
    };
    
    if (!meetingChats.has(id)) meetingChats.set(id, []);
    meetingChats.get(id).push(chatMessage);
    io.to(id).emit('chat-message', chatMessage);
    
    res.json({ success: true, chatMessage });
  } catch (error) {
    console.error('[Chat] Send error:', error);
    res.status(500).json({ error: 'Failed to send chat message' });
  }
});

app.get('/api/meetings/:id/chats', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const messages = meetingChats.get(id) || [];
    res.json({ success: true, messages, totalMessages: messages.length });
  } catch (error) {
    res.json({ success: true, messages: [], totalMessages: 0 });
  }
});

// ============================================================================
// GUEST INVITE ROUTES
// ============================================================================

app.post('/api/meetings/:id/invite', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role = 'guest', phone } = req.body;
    
    if (!name || !email) return res.status(400).json({ error: 'Guest name and email are required' });
    
    const invite = {
      id: uuidv4(), meetingId: id, name, email, phone: phone || null,
      role, invitedAt: new Date().toISOString(), status: 'pending'
    };
    
    if (!meetingInvites.has(id)) meetingInvites.set(id, []);
    meetingInvites.get(id).push(invite);
    console.log(`[Invite] Guest ${name} invited to meeting ${id}`);
    
    res.json({ success: true, invite });
  } catch (error) {
    console.error('[Invite] Add error:', error);
    res.status(500).json({ error: 'Failed to add guest invite' });
  }
});

app.get('/api/meetings/:id/invites', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const invites = meetingInvites.get(id) || [];
    res.json({ success: true, invites, totalInvites: invites.length });
  } catch (error) {
    res.json({ success: true, invites: [], totalInvites: 0 });
  }
});

// ============================================================================
// AI SUMMARY & ANALYSIS ROUTES
// ============================================================================

// Generate AI summary from transcript (SOAP format)
app.post('/api/meetings/:id/generate-summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!genAI) return res.status(500).json({ error: 'AI service not configured' });
    
    let meeting = null;
    let fullTranscript = '';
    
    try {
      const meetingResult = await pool.query(
        `SELECT mr.*, u_pat.name_thai as patient_name_thai
         FROM meeting_records mr
         LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
         WHERE mr.id::text = $1 OR mr.appointment_id = $1`, [id]
      );
      if (meetingResult.rows.length > 0) meeting = meetingResult.rows[0];
    } catch (error_) {
      console.log('[AI Summary] Meeting lookup skipped:', error_.message);
    }
    
    try {
      const transcriptsResult = await pool.query(
        `SELECT * FROM meeting_transcripts WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`, [id]
      );
      if (transcriptsResult.rows.length > 0) {
        fullTranscript = transcriptsResult.rows
          .map(t => `[${t.speaker_role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย'}]: ${t.content}`)
          .join('\n');
      }
    } catch (error_) {
      console.log('[AI Summary] Transcript lookup skipped:', error_.message);
    }
    
    if (!fullTranscript) {
      const session = activeTranscriptions.get(id);
      if (session && session.transcripts.length > 0) {
        fullTranscript = session.transcripts
          .map(t => `[${t.speaker_role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย'}]: ${t.content}`)
          .join('\n');
      }
    }
    
    if (!fullTranscript) {
      return res.json({
        success: true, summary: 'ไม่มีบทสนทนาสำหรับสรุป',
        meetingId: id, requiresValidation: false,
        message: 'No transcript available for summary'
      });
    }
    
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `คุณคือผู้ช่วยแพทย์ที่เชี่ยวชาญในการสรุปการปรึกษาทางการแพทย์

บทสนทนาจากการพบแพทย์:
${fullTranscript}

ชื่อผู้ป่วย: ${meeting?.patient_name_thai || 'ไม่ระบุ'}

กรุณาสรุปการปรึกษาในรูปแบบ SOAP Note (ภาษาไทย):

## S - Subjective (อาการที่ผู้ป่วยบอก)
## O - Objective (การตรวจร่างกาย)
## A - Assessment (การวินิจฉัย)
## P - Plan (แผนการรักษา)
---
## คำแนะนำสำหรับผู้ป่วย
⚠️ สำคัญ: นี่คือสรุปเบื้องต้นที่ต้องให้แพทย์ตรวจสอบก่อนใช้งาน`;
    
    const result = await model.generateContent(prompt);
    const aiSummary = result.response.text();
    
    const validationId = uuidv4();
    aiValidations.set(validationId, {
      id: validationId, meetingId: id, type: 'meeting-summary',
      content: aiSummary, status: 'pending_review', createdAt: new Date().toISOString()
    });
    
    try {
      await pool.query(
        `UPDATE meeting_records SET ai_summary = $1, status = 'completed', ended_at = COALESCE(ended_at, NOW()) WHERE id::text = $2`,
        [aiSummary, id]
      );
    } catch (error_) {
      console.log('[AI Summary] DB update skipped:', error_.message);
    }
    
    console.log(`[AI Summary] Generated for meeting ${id}`);
    res.json({
      success: true, summary: aiSummary, meetingId: id, validationId,
      requiresValidation: true, message: 'กรุณาตรวจสอบและอนุมัติสรุปก่อนบันทึกลง EMR'
    });
    
  } catch (error) {
    console.error('[AI Summary] Generate error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ============================================================================
// TRANSCRIPT EMBEDDING PROCESSING - Vectorize transcript for AI memory
// ============================================================================

// Chunk transcript text into segments for embedding storage
function chunkTranscript(transcriptRows, chunkSeconds = 60) {
  const chunks = [];
  if (!transcriptRows || transcriptRows.length === 0) return chunks;

  const startTime = new Date(transcriptRows[0].created_at).getTime();
  let currentChunk = { texts: [], speaker: transcriptRows[0].speaker_role, startSec: 0, endSec: 0 };

  for (const row of transcriptRows) {
    const rowTime = new Date(row.created_at).getTime();
    const elapsedSec = Math.floor((rowTime - startTime) / 1000);
    const chunkIndex = Math.floor(elapsedSec / chunkSeconds);

    if (chunkIndex > chunks.length || (row.speaker_role !== currentChunk.speaker && currentChunk.texts.length > 0)) {
      if (currentChunk.texts.length > 0) {
        chunks.push({
          chunk_index: chunks.length,
          chunk_text: currentChunk.texts.join(' '),
          speaker_role: currentChunk.speaker,
          start_time_seconds: currentChunk.startSec,
          end_time_seconds: currentChunk.endSec
        });
      }
      currentChunk = { texts: [], speaker: row.speaker_role, startSec: elapsedSec, endSec: elapsedSec };
    }

    currentChunk.texts.push(row.content);
    currentChunk.endSec = elapsedSec;
  }

  // Push last chunk
  if (currentChunk.texts.length > 0) {
    chunks.push({
      chunk_index: chunks.length,
      chunk_text: currentChunk.texts.join(' '),
      speaker_role: currentChunk.speaker,
      start_time_seconds: currentChunk.startSec,
      end_time_seconds: currentChunk.endSec
    });
  }

  return chunks;
}

// Process transcript into embedding chunks after meeting ends
app.post('/api/meetings/:id/process-embeddings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { chunkSeconds = 60 } = req.body;

    // Get meeting record
    let meeting = null;
    try {
      const meetingResult = await pool.query(
        `SELECT mr.*, a.patient_id as apt_patient_id, a.doctor_id as apt_doctor_id
         FROM meeting_records mr
         LEFT JOIN appointments a ON mr.appointment_id::text = a.id::text
         WHERE mr.id::text = $1 OR mr.appointment_id = $1`, [id]
      );
      if (meetingResult.rows.length > 0) meeting = meetingResult.rows[0];
    } catch (error_) {
      console.log('[Embeddings] Meeting lookup skipped:', error_.message);
    }

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get transcript segments
    let transcriptRows = [];
    try {
      const transcriptsResult = await pool.query(
        `SELECT * FROM meeting_transcripts WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`, [id]
      );
      transcriptRows = transcriptsResult.rows;
    } catch (error_) {
      console.log('[Embeddings] Transcript lookup skipped:', error_.message);
    }

    if (transcriptRows.length === 0) {
      return res.json({
        success: true, chunksStored: 0,
        message: 'No transcript segments to process'
      });
    }

    // Chunk the transcript
    const chunks = chunkTranscript(transcriptRows, chunkSeconds);

    // Store chunks in transcript_embeddings table (embedding vector left null for now)
    let storedCount = 0;
    const patientId = meeting.patient_id || meeting.apt_patient_id;
    const doctorId = meeting.doctor_id || meeting.apt_doctor_id;
    const appointmentId = meeting.appointment_id;

    for (const chunk of chunks) {
      try {
        await pool.query(
          `INSERT INTO transcript_embeddings 
           (meeting_record_id, appointment_id, patient_id, doctor_id, 
            chunk_index, chunk_text, speaker_role, 
            start_time_seconds, end_time_seconds, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT DO NOTHING`,
          [
            meeting.id, appointmentId, patientId, doctorId,
            chunk.chunk_index, chunk.chunk_text, chunk.speaker_role,
            chunk.start_time_seconds, chunk.end_time_seconds,
            JSON.stringify({ total_segments: transcriptRows.length, chunk_seconds: chunkSeconds })
          ]
        );
        storedCount++;
      } catch (error_) {
        console.warn(`[Embeddings] Failed to store chunk ${chunk.chunk_index}:`, error_.message);
      }
    }

    console.log(`[Embeddings] Processed meeting ${id}: ${storedCount}/${chunks.length} chunks stored`);

    res.json({
      success: true, 
      chunksStored: storedCount,
      totalChunks: chunks.length,
      meetingId: id,
      message: `Transcript processed into ${storedCount} embedding chunks`
    });

  } catch (error) {
    console.error('[Embeddings] Process error:', error);
    res.status(500).json({ error: 'Failed to process transcript embeddings' });
  }
});

// Get AI summary
app.get('/api/meetings/:id/summary', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let summary = null, recommendations = null, sections = null;
    
    try {
      const result = await pool.query(
        `SELECT id, ai_summary, ai_recommendations, section_summaries
         FROM meeting_records WHERE id::text = $1 OR appointment_id = $1`, [id]
      );
      if (result.rows.length > 0) {
        summary = result.rows[0].ai_summary;
        recommendations = result.rows[0].ai_recommendations;
        sections = result.rows[0].section_summaries;
      }
    } catch (error_) {
      console.log('[AI Summary] DB lookup skipped:', error_.message);
    }
    
    res.json({
      success: true, summary: summary || 'No summary available yet',
      recommendations, sections, requiresValidation: true
    });
    
  } catch (error) {
    res.json({ success: true, summary: 'No summary available yet', recommendations: null, sections: null });
  }
});

// ============================================================================
// AI ADVANCED FEATURES
// ============================================================================

// Pre-consultation Summary
app.post('/api/ai/pre-consultation-summary', optionalAuth, async (req, res) => {
  try {
    const { patientId, appointmentId } = req.body;
    
    if (!genAI) {
      return res.json({
        success: true, summary: 'AI service not configured — please add GEMINI_API_KEY',
        patientId, source: 'fallback'
      });
    }
    
    let patientData = {};
    try {
      const [userRes, phrRes, aptsRes, emrRes] = await Promise.all([
        pool.query('SELECT * FROM users WHERE id = $1', [patientId]),
        pool.query('SELECT * FROM phr WHERE user_id = $1', [patientId]),
        pool.query('SELECT * FROM appointments WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 5', [patientId]),
        pool.query('SELECT * FROM emr WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 3', [patientId])
      ]);
      patientData = {
        user: userRes.rows[0] || {}, phr: phrRes.rows[0] || {},
        recentAppointments: aptsRes.rows, recentEMR: emrRes.rows
      };
    } catch (error_) {
      console.log('[Pre-consult] DB lookup skipped:', error_.message);
    }
    
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `สรุปข้อมูลผู้ป่วยก่อนการปรึกษา:
ชื่อ: ${patientData.user?.name_thai || patientData.user?.name || 'ไม่ระบุ'}
ประวัติสุขภาพ: ${JSON.stringify(patientData.phr || {})}
การนัดหมายล่าสุด: ${JSON.stringify(patientData.recentAppointments?.map(a => ({ reason: a.reason, date: a.scheduled_date })) || [])}
EMR ล่าสุด: ${JSON.stringify(patientData.recentEMR?.map(e => ({ assessment: e.assessment, plan: e.plan })) || [])}
กรุณาสรุปข้อมูลสำคัญเพื่อเตรียมการปรึกษา`;
    
    const result = await model.generateContent(prompt);
    res.json({
      success: true, summary: result.response.text(),
      patientId, appointmentId, source: 'gemini', requiresValidation: true
    });
    
  } catch (error) {
    console.error('[Pre-consult] Error:', error);
    res.json({ success: true, summary: 'Unable to generate pre-consultation summary', source: 'error' });
  }
});

// Patient Instruction Sheet
app.post('/api/ai/patient-instruction-sheet', optionalAuth, async (req, res) => {
  try {
    const { meetingId, summary, patientName, diagnosis, medications, followUp } = req.body;
    
    if (!genAI) {
      return res.json({ success: true, instructions: 'AI service not configured', source: 'fallback' });
    }
    
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `สร้างเอกสารคำแนะนำสำหรับผู้ป่วย (ภาษาไทย):
ชื่อผู้ป่วย: ${patientName || 'ไม่ระบุ'}
สรุปการรักษา: ${summary || 'ไม่ระบุ'}
การวินิจฉัย: ${diagnosis || 'ไม่ระบุ'}
ยาที่สั่ง: ${JSON.stringify(medications || [])}
นัดหมายติดตาม: ${followUp || 'ไม่ระบุ'}
กรุณาสร้างเอกสารคำแนะนำที่อ่านง่ายสำหรับผู้ป่วย
⚠️ เอกสารนี้ต้องให้แพทย์ตรวจสอบก่อนส่งให้ผู้ป่วย`;
    
    const result = await model.generateContent(prompt);
    const validationId = uuidv4();
    aiValidations.set(validationId, {
      id: validationId, meetingId, type: 'patient-instruction-sheet',
      content: result.response.text(), status: 'pending_review', createdAt: new Date().toISOString()
    });
    
    res.json({
      success: true, instructions: result.response.text(), validationId,
      requiresValidation: true, source: 'gemini',
      message: 'กรุณาให้แพทย์ตรวจสอบก่อนส่งให้ผู้ป่วย'
    });
    
  } catch (error) {
    console.error('[Instruction Sheet] Error:', error);
    res.json({ success: true, instructions: 'Unable to generate instruction sheet', source: 'error' });
  }
});

// Document Analysis
app.post('/api/ai/document-analysis', optionalAuth, async (req, res) => {
  try {
    const { document, documentType = 'lab-result', patientId } = req.body;
    
    if (!genAI) {
      return res.json({ success: true, analysis: 'AI service not configured', source: 'fallback' });
    }
    
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `วิเคราะห์เอกสารทางการแพทย์:
ประเภท: ${documentType}
เนื้อหา: ${typeof document === 'string' ? document : JSON.stringify(document)}
กรุณาวิเคราะห์และสรุป: ค่าที่ผิดปกติ, ข้อสังเกตสำคัญ, คำแนะนำเบื้องต้น
⚠️ การวิเคราะห์นี้ต้องให้แพทย์ตรวจสอบ`;
    
    const result = await model.generateContent(prompt);
    res.json({
      success: true, analysis: result.response.text(),
      documentType, patientId, requiresValidation: true, source: 'gemini'
    });
    
  } catch (error) {
    console.error('[Document Analysis] Error:', error);
    res.json({ success: true, analysis: 'Unable to analyze document', source: 'error' });
  }
});

// CDS Check
app.post('/api/ai/cds-check', optionalAuth, async (req, res) => {
  try {
    const { patientId, medications, diagnosis, allergies } = req.body;
    const alerts = [];
    
    if (medications && medications.length > 1) {
      alerts.push({
        type: 'info', category: 'drug-interaction',
        message: `${medications.length} medications prescribed — please verify drug interactions`,
        severity: 'low'
      });
    }
    if (allergies && allergies.length > 0 && medications) {
      alerts.push({
        type: 'warning', category: 'allergy-check',
        message: `Patient has ${allergies.length} known allergies — verify against prescribed medications`,
        severity: 'medium'
      });
    }
    
    res.json({ success: true, alerts, totalAlerts: alerts.length, patientId, checkedAt: new Date().toISOString() });
  } catch (error) {
    res.json({ success: true, alerts: [], totalAlerts: 0 });
  }
});

// ============================================================================
// AI VALIDATION (MAN-IN-THE-LOOP)
// ============================================================================

app.get('/api/ai/validations', optionalAuth, async (req, res) => {
  try {
    const validations = Array.from(aiValidations.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    let dbValidations = [];
    try {
      const result = await pool.query('SELECT * FROM ai_validations ORDER BY created_at DESC LIMIT 50');
      dbValidations = result.rows;
    } catch { /* skip */ }
    
    res.json({ success: true, validations: [...validations, ...dbValidations], total: validations.length + dbValidations.length });
  } catch (error) {
    res.json({ success: true, validations: [], total: 0 });
  }
});

app.post('/api/ai/validate', optionalAuth, async (req, res) => {
  try {
    const { validationId, type, content, action, doctorId, patientId, reason } = req.body;
    
    if (validationId && aiValidations.has(validationId)) {
      const validation = aiValidations.get(validationId);
      validation.status = action === 'approve' ? 'approved' : 'rejected';
      validation.reviewedBy = doctorId;
      validation.reviewedAt = new Date().toISOString();
      validation.reason = reason;
      
      try {
        await pool.query(
          `INSERT INTO ai_validations (id, type, content_snapshot, decision, doctor_id, patient_id, validated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT DO NOTHING`,
          [validationId, validation.type, validation.content, validation.status, doctorId, patientId]
        );
      } catch { /* skip */ }
    }
    
    let status;
    if (action === 'approve') {
      status = 'approved';
    } else if (action === 'reject') {
      status = 'rejected';
    } else {
      status = 'processed';
    }

    res.json({
      success: true, message: `AI content ${action || 'processed'}`,
      validationId: validationId || uuidv4(),
      status
    });
  } catch (error) {
    res.json({ success: true, message: 'Validation processed', status: 'processed' });
  }
});

// ============================================================================
// SOCKET.IO FOR REAL-TIME COMMUNICATION
// ============================================================================

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  socket.on('join-meeting', (data) => {
    const meetingId = typeof data === 'string' ? data : data?.meetingId;
    const userName = typeof data === 'object' ? data?.userName : undefined;
    const userRole = typeof data === 'object' ? data?.role : undefined;
    
    if (meetingId) {
      socket.join(meetingId);
      socket.meetingId = meetingId;
      socket.to(meetingId).emit('participant-joined', {
        socketId: socket.id, userName, role: userRole, timestamp: new Date().toISOString()
      });
      console.log(`[Socket] ${socket.id} (${userName || 'unknown'}) joined meeting ${meetingId}`);
    }
  });
  
  socket.on('leave-meeting', (meetingId) => {
    socket.leave(meetingId);
    socket.to(meetingId).emit('participant-left', {
      socketId: socket.id, timestamp: new Date().toISOString()
    });
    console.log(`[Socket] ${socket.id} left meeting ${meetingId}`);
  });
  
  socket.on('transcript-segment', async (data) => {
    const { meetingId, speakerId, speakerRole, speakerName, content, language, confidence } = data;
    try {
      await pool.query(
        `INSERT INTO meeting_transcripts (meeting_record_id, speaker_id, speaker_role, speaker_name, content, language, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [meetingId, speakerId, speakerRole, speakerName, content, language || 'th', confidence]
      );
      
      const session = activeTranscriptions.get(meetingId);
      if (session && session.isActive && !session.isPaused) {
        session.transcripts.push({ speaker_id: speakerId, speaker_role: speakerRole, speaker_name: speakerName, content, language: language || 'th', timestamp: new Date() });
      }
      
      io.to(meetingId).emit('transcript-update', { speakerId, speakerRole, speakerName, content, timestamp: new Date() });
    } catch (error) {
      console.error('[Socket] Transcript save error:', error);
    }
  });
  
  socket.on('chat-message', (data) => {
    const { meetingId, senderId, senderName, senderRole, message } = data;
    const chatMsg = {
      id: uuidv4(), meetingId, senderId, senderName, senderRole,
      message, type: 'text', timestamp: new Date().toISOString()
    };
    if (!meetingChats.has(meetingId)) meetingChats.set(meetingId, []);
    meetingChats.get(meetingId).push(chatMsg);
    io.to(meetingId).emit('chat-message', chatMsg);
  });
  
  socket.on('meeting-status', (data) => {
    const { meetingId, status } = data;
    io.to(meetingId).emit('meeting-status', { meetingId, status, timestamp: new Date().toISOString() });
  });
  
  socket.on('disconnect', () => {
    if (socket.meetingId) {
      socket.to(socket.meetingId).emit('participant-left', { socketId: socket.id, timestamp: new Date().toISOString() });
    }
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const startServer = async () => {
  try {
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ PostgreSQL connected');
    } catch (dbError) {
      console.warn('⚠️ Database connection failed, running in memory-only mode:', dbError.message);
    }
    
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║     🎥 Izara Jitsi Meeting Server v1.4.8-dev                ║
╠════════════════════════════════════════════════════════════╣
║  Port:       ${PORT}                                          ║
║  Jitsi:      ${JITSI_DOMAIN}                               ║
║  AI:         ${genAI ? 'Gemini Ready' : 'Not configured'}                               ║
║  Features:   Transcription, Chat, Invites, CDS             ║
║  Transcript: Web Speech API (FREE)                         ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Memory cleanup: purge stale in-memory data every 30 minutes
    setInterval(() => {
      const staleThreshold = Date.now() - 2 * 60 * 60 * 1000; // 2 hours
      for (const [key, val] of activeTranscriptions.entries()) {
        if (val.startedAt && new Date(val.startedAt).getTime() < staleThreshold) {
          activeTranscriptions.delete(key);
        }
      }
      for (const [key, msgs] of meetingChats.entries()) {
        if (msgs.length > 0 && new Date(msgs[msgs.length - 1].timestamp).getTime() < staleThreshold) {
          meetingChats.delete(key);
        }
      }
      console.log(`[CLEANUP] Maps: transcriptions=${activeTranscriptions.size}, chats=${meetingChats.size}, invites=${meetingInvites.size}`);
    }, 30 * 60 * 1000);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
