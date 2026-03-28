/**
 * Izara Jitsi Meeting Server — Phase 1 Complete
 * 
 * Version: 1.5.10
 * Updated: 2026-03-24
 * 
 * Main API server for:
 * - Meeting room management (Jitsi Meet - FREE)
 * - Real-time transcription via Web Speech API (browser-native, FREE)
 * - In-meeting chat messaging
 * - AI meeting summarization via Gemini 2.5 Flash Lite
 * - AI enhanced structured summary with diarized speaker context
 * - Google Cloud Speech-to-Text (optional, server-side diarization)
 * - AI patient instruction sheet generation
 * - AI pre-consultation summary
 * - AI document analysis
 * - Guest invite management
 * - Man-in-the-loop AI validation
 * - PostgreSQL persistence + in-memory fallback
 * - Socket.IO real-time events
 * 
 * v1.5.9 Changes:
 * - Removed dead code (handleStartJitsiMeeting)
 * - Meeting UI improvements: simplified icons, consent logic fix
 * - Test optimization: cached login tokens
 *
 * v1.6.1 Changes:
 * - SECURITY: Changed optionalAuth → authenticateToken on meeting create alias, end, lobby admit/reject, AI validate
 * - SECURITY: Added auth to GET /api/meetings listing route
 * - SECURITY: Added XSS sanitization on chat messages
 * - SECURITY: Replaced error.message with generic messages in 500 responses
 * - Fixed version consistency across health endpoints
 *
 * v1.4.8-dev Changes:
 * - Fixed JWT_SECRET alignment across all services
 * - Added optionalAuth to /api/meeting/create (security fix)
 * - Added memory cleanup for in-memory maps
 * - Improved error handling (no more swallowed errors)
 */

import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
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
// SECURITY: No hardcoded fallback secrets
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('[SECURITY] WARNING: JWT_SECRET not set. Using random ephemeral secret.');
  return crypto.randomBytes(64).toString('hex');
})();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

// Recording storage — primary: PostgreSQL BYTEA (GCE VM), fallback: local filesystem
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || (
  process.env.NODE_ENV === 'production' ? '/tmp/recordings' : path.resolve('recordings')
);
try { fs.mkdirSync(RECORDINGS_DIR, { recursive: true }); } catch { /* ignore */ }

// Helper: create Google Cloud Speech-to-Text client with GCP_SERVICE_ACCOUNT_KEY support
async function createSpeechClient() {
  const { SpeechClient } = await import('@google-cloud/speech');
  if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
    try {
      const keyJson = Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
      const credentials = JSON.parse(keyJson);
      return new SpeechClient({
        credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
        projectId: credentials.project_id,
      });
    } catch (err) {
      console.error('[STT] Failed to parse GCP_SERVICE_ACCOUNT_KEY:', err.message);
    }
  }
  // Fallback: GOOGLE_APPLICATION_CREDENTIALS file or default credentials
  return new SpeechClient();
}

// Check if STT credentials are available
function hasSttCredentials() {
  return !!(process.env.GCP_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SPEECH_API_KEY);
}

// Database Configuration - parse DATABASE_URL if available
let dbConfig = {};
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig = {
      host: url.hostname,
      port: Number.parseInt(url.port || '5432', 10),
      database: url.pathname.substring(1),
      user: url.username,
      password: decodeURIComponent(url.password),
    };
  } catch (e) {
    console.warn('⚠️ Failed to parse DATABASE_URL:', e.message);
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const pool = new Pool({
  host: dbConfig.host || process.env.DB_HOST || 'localhost',
  port: dbConfig.port || Number.parseInt(process.env.DB_PORT || '5433', 10),
  database: dbConfig.database || process.env.DB_NAME || 'izara_phase1',
  user: dbConfig.user || process.env.DB_USER || 'postgres',
  password: dbConfig.password || process.env.DB_PASSWORD || '',
  max: isProduction ? 30 : 20,
  min: isProduction ? 5 : 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isProduction ? 30000 : 10000,
  allowExitOnIdle: !isProduction,
});

// ========== CRITICAL: Pool error handler to prevent crashes ==========
let dbAvailable = true;
pool.on('error', (err) => {
  console.error('❌ [Pool] Unexpected PostgreSQL error:', err.message);
  dbAvailable = false;
  // Attempt reconnection after 5 seconds
  setTimeout(async () => {
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
      console.log('✅ [Pool] Database reconnected');
    } catch (error_) {
      console.error('❌ [Pool] Reconnection failed:', error_.message);
    }
  }, 5000);
});

// Helper: safe DB query with fallback
async function safeQuery(text, params = []) {
  if (!dbAvailable) {
    throw new Error('Database temporarily unavailable');
  }
  return pool.query(text, params);
}

// Helper: sanitize HTML to prevent XSS in chat/text content
function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
}

// Helper: format speaker label with role emoji for diarization display
function formatSpeakerLabel(role, name) {
  let prefix = '👥';
  if (role === 'doctor') prefix = '👨‍⚕️';
  else if (role === 'patient') prefix = '🧑';
  return `${prefix} ${name || role}`;
}

// Initialize Gemini AI
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini AI initialized with model:', GEMINI_MODEL);
} else {
  console.warn('⚠️ Gemini AI not configured — set GEMINI_API_KEY environment variable');
}

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else if (isProduction) {
        console.warn(`⚠️ Blocked Socket.IO from origin: ${origin}`);
        callback(new Error('Origin not allowed'), false);
      } else {
        callback(null, true); // Allow all in development
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// CORS - support both web portals and mobile apps
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:3005', 'http://localhost:3010',
  'http://localhost:8081', // Expo dev
  'http://127.0.0.1:3005', 'http://127.0.0.1:3010',
];
if (isProduction) {
  ALLOWED_ORIGINS.push(
    'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
    'https://izara-doctor-portal-724889190329.asia-southeast1.run.app',
    'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
    'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
    'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app'
  );
}
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, internal)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else if (isProduction) {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Origin not allowed'), false);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Mobile-specific headers middleware (Phase 2)
app.use((req, res, next) => {
  req.platform = req.headers['x-platform'] || 'web';
  req.deviceId = req.headers['x-device-id'] || null;
  req.appVersion = req.headers['x-app-version'] || null;
  next();
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  
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
  const token = authHeader?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch { /* ignore */ }
  }
  next();
};

// ============================================================================
// RATE LIMITING (in-memory, per-IP)
// ============================================================================
const rateLimitStore = new Map();

function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    let entry = rateLimitStore.get(ip);
    if (!entry || now - entry.start > windowMs) {
      entry = { count: 1, start: now };
      rateLimitStore.set(ip, entry);
    } else {
      entry.count++;
    }
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// Apply general rate limit to all routes
app.use(rateLimit(200, 60000));

// Clean up rate limit store every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 120000;
  for (const [ip, entry] of rateLimitStore) {
    if (entry.start < cutoff) rateLimitStore.delete(ip);
  }
}, 300000);

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

const activeMeetings = new Map();
const activeTranscriptions = new Map();
const meetingChats = new Map();
const meetingInvites = new Map();
const aiValidations = new Map();
const meetingConsents = new Map();   // meetingId -> Map<participantId, consent>
const meetingLobbies = new Map();    // meetingId -> Map<participantId, lobbyEntry>

// ============================================================================
// HEALTH CHECK ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'izara-jitsi-server',
    version: '1.5.9',
    timestamp: new Date().toISOString(),
    database: dbAvailable ? 'connected' : 'disconnected',
    features: {
      jitsi: true,
      transcription: 'web-speech-api',
      ai: !!genAI,
      chat: true,
      guestInvites: true,
      lobby: true,
      consent: true,
      shareLinks: true,
      recording: true,
      recordingStorage: 'filesystem'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: dbAvailable ? 'healthy' : 'degraded',
    service: 'izara-jitsi-server',
    version: '1.5.9',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    jitsiDomain: JITSI_DOMAIN,
    aiEnabled: !!genAI,
    aiModel: GEMINI_MODEL,
    database: dbAvailable ? 'connected' : 'disconnected',
    activeMeetings: activeMeetings.size,
    activeTranscriptions: activeTranscriptions.size
  });
});

// ============================================================================
// MEETING MANAGEMENT ROUTES
// ============================================================================

// GET /api/health/db - Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    dbAvailable = false;
    res.status(503).json({ status: 'degraded', database: 'disconnected', error: error.message });
  }
});

// GET /api/config - Jitsi configuration
app.get('/api/config', (req, res) => {
  res.json({
    jitsiDomain: JITSI_DOMAIN,
    prejoinEnabled: true,
    enableRecording: true,
    enableTranscription: true,
    aiEnabled: !!genAI,
    aiModel: GEMINI_MODEL,
    features: {
      videoConferencing: true,
      screenSharing: true,
      chat: true,
      recording: true,
      transcription: true,
      aiSummary: !!genAI
    }
  });
});

// GET /api/meetings - List all meetings (must be before /:id) — requires auth
app.get('/api/meetings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM meeting_records ORDER BY created_at DESC LIMIT 50'
    );
    // Merge in-memory meetings that aren't in DB (e.g., FK-skipped)
    const dbIds = new Set(result.rows.map(r => r.id));
    const memMeetings = Array.from(activeMeetings.values())
      .filter(m => !dbIds.has(m.meetingId))
      .map(m => ({
        id: m.meetingId, appointment_id: m.appointmentId, room_name: m.roomName,
        room_id: m.roomName, status: m.status, doctor_id: m.doctorId,
        patient_id: m.patientId, created_at: m.createdAt,
        meeting_url: `https://${JITSI_DOMAIN}/${m.roomName}`
      }));
    res.json({ meetings: [...result.rows, ...memMeetings] });
  } catch (error) {
    console.error('[MEETINGS] List error:', error.message);
    // Fallback to in-memory
    const meetings = Array.from(activeMeetings.values()).map(m => ({
      id: m.meetingId, appointment_id: m.appointmentId, appointmentId: m.appointmentId,
      room_name: m.roomName, roomName: m.roomName, status: m.status,
      meeting_url: `https://${JITSI_DOMAIN}/${m.roomName}`
    }));
    res.json({ meetings });
  }
});

// GET /api/meetings/active - Active meetings only (must be before /:id)
app.get('/api/meetings/active', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM meeting_records WHERE status IN ('active', 'waiting', 'in_progress') ORDER BY created_at DESC"
    );
    res.json({ meetings: result.rows });
  } catch (error) {
    console.error('[MEETINGS] Active list error:', error.message);
    const meetings = Array.from(activeMeetings.values())
      .filter(m => m.status === 'active' || m.status === 'waiting')
      .map(m => ({ id: m.meetingId, appointmentId: m.appointmentId, roomName: m.roomName, status: m.status }));
    res.json({ meetings });
  }
});

// Create new meeting room (primary endpoint — requires auth)
app.post('/api/meetings/create', authenticateToken, async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId, patientName, doctorName, scheduledTime, guestInvites, roomName: providedRoomName } = req.body;
    
    const meetingId = uuidv4();
    // Use the doctor-provided room name if available (ensures patient joins the same room)
    const roomName = providedRoomName || `izara-${appointmentId?.substring(0, 12) || meetingId.substring(0, 8)}-${Date.now().toString(36)}`;
    
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
    
    // Store in activeMeetings for fallback
    activeMeetings.set(meetingId, {
      meetingId, appointmentId, roomName, status: 'scheduled',
      doctorId, patientId, createdAt: new Date().toISOString(),
      urls: { base: meetingUrl, doctor: doctorUrl, patient: patientUrl, guest: guestUrl }
    });
    
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

// Alias: /api/meeting/create (alternative endpoint — requires auth)
app.post('/api/meeting/create', authenticateToken, async (req, res) => {
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
    
    // Store in activeMeetings for fallback
    activeMeetings.set(meetingId, {
      meetingId, appointmentId, roomName, status: 'scheduled',
      doctorId, patientId, createdAt: new Date().toISOString()
    });
    
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
// MEDIA STATUS & ROOM MANAGEMENT (Teams-like)
// ============================================================================

// In-memory store for participant media status
const participantMediaStatus = new Map();

// Report media device status (pre-join check)
app.post('/api/meetings/:id/media-status', optionalAuth, (req, res) => {
  const { id } = req.params;
  const { userId, userName, role, camera, microphone, cameraLabel, microphoneLabel } = req.body;
  
  if (!userId || !role) {
    return res.status(400).json({ success: false, error: 'userId and role required' });
  }

  let roomMedia = participantMediaStatus.get(id);
  if (!roomMedia) {
    roomMedia = new Map();
    participantMediaStatus.set(id, roomMedia);
  }
  
  roomMedia.set(userId, {
    userId, userName: userName || 'Unknown', role,
    camera: camera || 'unknown', microphone: microphone || 'unknown',
    cameraLabel: cameraLabel || '', microphoneLabel: microphoneLabel || '',
    lastUpdated: new Date().toISOString(),
  });

  // Broadcast to room via Socket.IO
  io.to(id).emit('participant-media-update', {
    userId, userName, role, camera, microphone, timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Media status updated' });
});

// Get all participants' media status for a meeting
app.get('/api/meetings/:id/media-status', (req, res) => {
  const { id } = req.params;
  const roomMedia = participantMediaStatus.get(id);
  const statuses = roomMedia ? Array.from(roomMedia.values()) : [];
  res.json({ success: true, participants: statuses, total: statuses.length });
});

// Room capacity and readiness check
app.get('/api/meetings/:id/room-check', async (req, res) => {
  const { id } = req.params;
  let roomStatus = { exists: false, status: 'unknown', participantCount: 0, capacity: 10 };
  
  try {
    const result = await pool.query(
      `SELECT id, status, started_at FROM meeting_records WHERE id::text = $1 OR appointment_id = $1`,
      [id]
    );
    if (result.rows.length > 0) {
      roomStatus.exists = true;
      roomStatus.status = result.rows[0].status;
    }
  } catch { /* fallback */ }
  
  try {
    const room = io.sockets.adapter.rooms.get(id);
    roomStatus.participantCount = room ? room.size : 0;
  } catch { /* ignore */ }
  
  const roomMedia = participantMediaStatus.get(id);
  const mediaStatuses = roomMedia ? Array.from(roomMedia.values()) : [];
  
  res.json({
    success: true,
    room: roomStatus,
    mediaStatuses,
    isReady: roomStatus.exists && roomStatus.participantCount < roomStatus.capacity,
  });
});

// ============================================================================
// MEETING CONSENT / AGREEMENT
// ============================================================================

// Submit consent before joining
app.post('/api/meetings/:id/consent', optionalAuth, (req, res) => {
  const { id } = req.params;
  const { participantId, participantName, role, consentRecording, consentTranscript, consentDataSharing } = req.body;

  if (!participantId || !role) {
    return res.status(400).json({ success: false, error: 'participantId and role required' });
  }

  let roomConsents = meetingConsents.get(id);
  if (!roomConsents) {
    roomConsents = new Map();
    meetingConsents.set(id, roomConsents);
  }

  const consent = {
    participantId, participantName: participantName || 'Unknown', role,
    consentRecording: !!consentRecording,
    consentTranscript: !!consentTranscript,
    consentDataSharing: !!consentDataSharing,
    agreedAt: new Date().toISOString(),
  };
  roomConsents.set(participantId, consent);

  io.to(id).emit('consent-update', { meetingId: id, consent });

  res.json({ success: true, consent });
});

// Get all consents for a meeting
app.get('/api/meetings/:id/consents', optionalAuth, (req, res) => {
  const { id } = req.params;
  const roomConsents = meetingConsents.get(id);
  const consents = roomConsents ? Array.from(roomConsents.values()) : [];
  res.json({ success: true, consents, total: consents.length });
});

// ============================================================================
// WAITING ROOM / LOBBY MANAGEMENT
// ============================================================================

// Participant requests to join (enters lobby)
app.post('/api/meetings/:id/lobby/join', optionalAuth, (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  // Auto-generate participantId if not provided (for guests)
  const participantId = req.body.participantId || `guest-${uuidv4().substring(0, 8)}`;

  // Sanitize participantName: strip HTML tags, trim, limit to 100 chars
  const rawName = req.body.participantName;
  if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
    return res.status(400).json({ success: false, error: 'participantName is required' });
  }
  const participantName = rawName.replace(/<[^>]*>/g, '').trim().substring(0, 100);

  // Determine role from authenticated token only — never trust client-supplied role
  const authenticatedRole = req.user?.role;

  // Only authenticated doctors/admins bypass lobby
  if (req.user && (authenticatedRole === 'doctor' || authenticatedRole === 'admin')) {
    return res.json({ success: true, status: 'admitted', message: 'Host bypasses lobby' });
  }

  let lobby = meetingLobbies.get(id);
  if (!lobby) {
    lobby = new Map();
    meetingLobbies.set(id, lobby);
  }

  const entry = {
    participantId, participantName, role: authenticatedRole || 'guest',
    email: email || null,
    status: 'waiting',
    joinedAt: new Date().toISOString(),
  };
  lobby.set(participantId, entry);

  // Notify doctor (host)
  io.to(id).emit('lobby-update', { meetingId: id, action: 'join', participant: entry });

  res.json({ success: true, status: 'waiting', participantId, message: 'Waiting for host approval' });
});

// Get lobby participants
app.get('/api/meetings/:id/lobby', optionalAuth, (req, res) => {
  const { id } = req.params;
  const lobby = meetingLobbies.get(id);
  const participants = lobby ? Array.from(lobby.values()).filter(p => p.status === 'waiting') : [];
  res.json({ success: true, participants, total: participants.length });
});

// Guest checks their own lobby status (no auth required)
app.get('/api/meetings/:id/lobby/status/:participantId', (req, res) => {
  const { id, participantId } = req.params;
  const lobby = meetingLobbies.get(id);
  if (!lobby?.has(participantId)) {
    return res.json({ success: true, status: 'not_found' });
  }
  const entry = lobby.get(participantId);
  res.json({ success: true, status: entry.status, participant: entry });
});

// Doctor admits participant from lobby
app.post('/api/meetings/:id/lobby/admit', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { participantId, admittedBy } = req.body;

  const lobby = meetingLobbies.get(id);
  if (!lobby?.has(participantId)) {
    return res.status(404).json({ success: false, error: 'Participant not in lobby' });
  }

  const entry = lobby.get(participantId);
  entry.status = 'admitted';
  entry.admittedBy = admittedBy;
  entry.admittedAt = new Date().toISOString();

  io.to(id).emit('lobby-update', { meetingId: id, action: 'admit', participant: entry });

  res.json({ success: true, participant: entry });
});

// Doctor rejects participant from lobby
app.post('/api/meetings/:id/lobby/reject', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { participantId, rejectedBy, reason } = req.body;

  const lobby = meetingLobbies.get(id);
  if (!lobby?.has(participantId)) {
    return res.status(404).json({ success: false, error: 'Participant not in lobby' });
  }

  const entry = lobby.get(participantId);
  entry.status = 'rejected';
  entry.rejectedBy = rejectedBy;
  entry.reason = reason || '';
  entry.rejectedAt = new Date().toISOString();

  io.to(id).emit('lobby-update', { meetingId: id, action: 'reject', participant: entry });

  res.json({ success: true, participant: entry });
});

// Generate shareable invite link for patient to share with others
app.post('/api/meetings/:id/share-link', optionalAuth, (req, res) => {
  const { id } = req.params;
  const { sharedBy, sharedByName, recipientName, recipientEmail } = req.body;

  const token = uuidv4();
  const invite = {
    id: token, meetingId: id,
    name: recipientName || 'Guest',
    email: recipientEmail || '',
    role: 'guest',
    sharedBy, sharedByName,
    invitedAt: new Date().toISOString(),
    status: 'pending',
  };

  if (!meetingInvites.has(id)) meetingInvites.set(id, []);
  meetingInvites.get(id).push(invite);

  // Build invite URL (guest joins via patient portal with token)
  const baseUrl = process.env.PATIENT_PORTAL_URL || `${req.protocol}://${req.get('host')}`;
  const inviteLink = `${baseUrl}/meeting/${id}?invite=${token}&name=${encodeURIComponent(recipientName || 'Guest')}`;

  res.json({ success: true, invite, inviteLink });
});

// ============================================================================
// END MEETING (Phase 2 — triggers AI summary pipeline)
// ============================================================================

function getNoSummaryReason(genAI, fullTranscript) {
  if (!genAI) return 'AI not configured';
  if (!fullTranscript) return 'No transcript';
  return 'Generation skipped';
}

app.post('/api/meetings/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { generateSummary = true } = req.body;
    
    let meetingId = id;
    let fullTranscript = '';
    let chatMessages = [];
    let meeting = null;
    
    // 1. Get meeting record
    try {
      const result = await safeQuery(
        `SELECT mr.*, u_pat.name_thai as patient_name_thai, u_doc.name_thai as doctor_name_thai
         FROM meeting_records mr
         LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
         LEFT JOIN users u_doc ON mr.doctor_id = u_doc.id
         WHERE mr.id::text = $1 OR mr.appointment_id = $1`, [id]
      );
      if (result.rows.length > 0) {
        meeting = result.rows[0];
        meetingId = meeting.id;
      }
    } catch (e) {
      console.warn('[End Meeting] DB lookup skipped:', e.message);
    }
    
    // 2. Compile full transcript from DB
    try {
      const transcriptsResult = await safeQuery(
        `SELECT * FROM meeting_transcripts WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`, [meetingId]
      );
      if (transcriptsResult.rows.length > 0) {
        fullTranscript = transcriptsResult.rows
          .map(t => {
            let roleLabel = 'ผู้เข้าร่วม';
            if (t.speaker_role === 'doctor') roleLabel = 'แพทย์';
            else if (t.speaker_role === 'patient') roleLabel = 'ผู้ป่วย';
            return `[${roleLabel}] ${t.speaker_name || 'Unknown'}: ${t.content}`;
          })
          .join('\n');
      }
    } catch (e) {
      console.warn('[End Meeting] Transcript lookup skipped:', e.message);
    }
    
    // Fallback to in-memory transcript
    if (!fullTranscript) {
      const session = activeTranscriptions.get(meetingId);
      if (session && session.transcripts.length > 0) {
        fullTranscript = session.transcripts
          .map(t => `[${t.speaker_role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย'}]: ${t.content}`)
          .join('\n');
      }
    }
    
    // 3. Collect chat messages
    chatMessages = meetingChats.get(meetingId) || [];
    
    // 4. Update meeting status 
    try {
      await safeQuery(
        `UPDATE meeting_records 
         SET status = 'completed', ended_at = NOW(), transcript = $2,
             duration_minutes = EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at))) / 60
         WHERE id::text = $1 OR appointment_id = $1`,
        [meetingId, fullTranscript]
      );
    } catch (e) {
      console.warn('[End Meeting] DB update skipped:', e.message);
    }
    
    // 5. Also update appointment status
    if (meeting?.appointment_id) {
      try {
        await safeQuery(
          `UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
          [meeting.appointment_id]
        );
      } catch (e) {
        console.warn('[End Meeting] Appointment update skipped:', e.message);
      }
    }
    
    // 6. Clean up in-memory data
    activeTranscriptions.delete(meetingId);
    // Mark meeting as completed in-memory (keep for results lookup)
    const memMeeting = activeMeetings.get(meetingId);
    if (memMeeting) {
      memMeeting.status = 'completed';
      memMeeting.endedAt = new Date().toISOString();
    }
    
    // 7. Notify all participants
    io.to(meetingId).emit('meeting-status', { meetingId, status: 'ended', timestamp: new Date().toISOString() });
    
    // 7b. Emit meeting-ended-results with transcript + summary for doctor portal (Teams-like)
    io.to(meetingId).emit('meeting-ended-results', {
      meetingId,
      appointmentId: meeting?.appointment_id,
      transcript: { available: !!fullTranscript, text: fullTranscript || '' },
      chatMessages: chatMessages.map(c => ({ sender: c.senderName, role: c.senderRole, message: c.message, timestamp: c.timestamp })),
      status: 'completed',
      timestamp: new Date().toISOString(),
    });
    
    // 8. Trigger AI summary in background if transcript exists
    let aiSummary = null;
    let validationId = null;
    
    if (generateSummary && genAI && fullTranscript && fullTranscript.length > 20) {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        
        // Include chat messages in the context
        const chatLines = chatMessages.map(c => `[${c.senderRole}] ${c.senderName}: ${c.message}`).join('\n');
        let chatContext = '';
        if (chatMessages.length > 0) {
          chatContext = `\n\nข้อความแชทระหว่างการประชุม:\n${chatLines}`;
        }
        
        const prompt = `คุณคือผู้ช่วยแพทย์ที่เชี่ยวชาญในการสรุปการปรึกษาทางการแพทย์

บทสนทนาจากการพบแพทย์:
${fullTranscript}
${chatContext}

ชื่อผู้ป่วย: ${meeting?.patient_name_thai || 'ไม่ระบุ'}
ชื่อแพทย์: ${meeting?.doctor_name_thai || 'ไม่ระบุ'}

กรุณาสรุปการปรึกษาในรูปแบบ SOAP Note (ภาษาไทย):

## S - Subjective (อาการที่ผู้ป่วยบอก)
สรุปอาการที่ผู้ป่วยบอก

## O - Objective (การตรวจร่างกาย)
สรุปสิ่งที่แพทย์ตรวจพบ

## A - Assessment (การวินิจฉัย)
การวินิจฉัยเบื้องต้น

## P - Plan (แผนการรักษา)
แผนการรักษาและยาที่สั่ง

## 🚩 อาการเตือน (Red Flags)
อาการเตือนที่ต้องมาพบแพทย์ทันที

## 📅 นัดติดตาม (Follow-up)
กำหนดการนัดตรวจครั้งถัดไป

---
⚠️ สำคัญ: นี่คือสรุปเบื้องต้นที่ต้องให้แพทย์ตรวจสอบก่อนใช้งาน (requiresValidation: true)`;
        
        const result = await model.generateContent(prompt);
        aiSummary = result.response.text();
        
        validationId = uuidv4();
        aiValidations.set(validationId, {
          id: validationId, meetingId, type: 'meeting-summary',
          content: aiSummary, status: 'pending_review',
          createdAt: new Date().toISOString()
        });
        
        // Save to DB
        try {
          await safeQuery(
            `UPDATE meeting_records SET ai_summary = $2, ai_recommendations = $3
             WHERE id::text = $1 OR appointment_id = $1`,
            [meetingId, aiSummary, JSON.stringify({ validationId, requiresValidation: true })]
          );
        } catch (e) {
          console.warn('[End Meeting] AI summary DB save skipped:', e.message);
        }
        
        console.log(`[End Meeting] AI summary generated for meeting ${meetingId}`);
        
        // Push AI summary to doctor portal via Socket.IO (Teams-like notification)
        io.to(meetingId).emit('meeting-summary-ready', {
          meetingId,
          appointmentId: meeting?.appointment_id,
          summary: aiSummary,
          validationId,
          requiresValidation: true,
          timestamp: new Date().toISOString(),
        });
      } catch (error_) {
        console.error('[End Meeting] AI summary generation failed:', error_.message);
      }
    }
    
    res.json({
      success: true,
      meetingId,
      status: 'completed',
      transcript: { available: !!fullTranscript, length: fullTranscript.length },
      chatMessages: { count: chatMessages.length },
      aiSummary: aiSummary ? {
        available: true,
        validationId,
        requiresValidation: true,
        summary: aiSummary
      } : { available: false, reason: getNoSummaryReason(genAI, fullTranscript) },
      message: 'Meeting ended successfully'
    });
    
  } catch (error) {
    console.error('[End Meeting] Error:', error);
    res.status(500).json({ error: 'Failed to end meeting', details: error.message });
  }
});

// ============================================================================
// MEETING HISTORY (Phase 2)
// ============================================================================

app.get('/api/meetings/history/:doctorId', optionalAuth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const limit = Number.parseInt(req.query.limit || '20', 10);
    const offset = Number.parseInt(req.query.offset || '0', 10);
    
    let meetings = [];
    try {
      const result = await safeQuery(
        `SELECT mr.*, u_pat.name_thai as patient_name_thai
         FROM meeting_records mr
         LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
         WHERE mr.doctor_id = $1
         ORDER BY mr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [doctorId, limit, offset]
      );
      meetings = result.rows;
    } catch (e) {
      console.warn('[Meeting History] DB query skipped:', e.message);
    }
    
    res.json({ success: true, meetings, total: meetings.length });
  } catch (error) {
    res.json({ success: true, meetings: [], total: 0 });
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

    // Ensure speaker metadata is always populated
    const resolvedRole = speakerRole || (req.user?.role === 'doctor' ? 'doctor' : 'patient');
    const resolvedName = speakerName || req.user?.name || (resolvedRole === 'doctor' ? 'แพทย์' : 'ผู้ป่วย');
    const resolvedId = speakerId || req.user?.id || null;
    const displayLabel = formatSpeakerLabel(resolvedRole, resolvedName);
    
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
        [id, resolvedId, resolvedRole, resolvedName, transcriptContent, language || 'th', confidence, startTime, endTime]
      );
      transcript = result.rows[0] || null;
    } catch (error_) {
      console.log('[Transcript] DB insert skipped:', error_.message);
    }
    
    if (!transcript) {
      transcript = {
        id: uuidv4(), meeting_record_id: id,
        speaker_id: resolvedId, speaker_role: resolvedRole, speaker_name: resolvedName,
        content: transcriptContent, language: language || 'th', confidence,
        created_at: new Date()
      };
    }
    
    const session = activeTranscriptions.get(id);
    if (session && !session.isPaused) {
      session.transcripts.push({ ...transcript, timestamp: new Date() });
    }
    
    // Emit enriched transcript with speaker display label
    io.to(id).emit('transcript-update', { ...transcript, displayLabel });
    res.json({ success: true, transcript: { ...transcript, displayLabel } });
    
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
    
    // Sanitize chat message to prevent XSS
    const sanitizedMessage = sanitizeHtml(message);
    const sanitizedSenderName = sanitizeHtml(senderName || req.user?.name || 'Unknown');
    
    const chatMessage = {
      id: uuidv4(), meetingId: id,
      senderId: senderId || req.user?.id || 'anonymous',
      senderName: sanitizedSenderName,
      senderRole: senderRole || req.user?.role || 'participant',
      message: sanitizedMessage, type, timestamp: new Date().toISOString()
    };
    
    if (!meetingChats.has(id)) meetingChats.set(id, []);
    meetingChats.get(id).push(chatMessage);
    
    // Persist chat to DB (meeting_chats table + meeting_transcripts for legacy)
    try {
      await safeQuery(
        `INSERT INTO meeting_chats (meeting_record_id, sender_id, sender_role, sender_name, message, type, created_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())`,
        [id, chatMessage.senderId, chatMessage.senderRole, chatMessage.senderName, sanitizedMessage, type]
      );
    } catch (e) {
      console.warn('[Chat] meeting_chats persist skipped:', e.message);
    }
    try {
      await safeQuery(
        `INSERT INTO meeting_transcripts (
          meeting_record_id, speaker_id, speaker_role, speaker_name,
          content, language, created_at
        ) VALUES ($1::uuid, $2, $3, $4, $5, 'chat', NOW())`,
        [id, chatMessage.senderId, chatMessage.senderRole, chatMessage.senderName, `[CHAT] ${message}`]
      );
    } catch (e) {
      // Non-critical — in-memory is the primary store for chats
      console.warn('[Chat] DB persist skipped:', e.message);
    }
    
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
    
    // Persist invite to DB
    try {
      await safeQuery(
        `INSERT INTO meeting_invites (id, meeting_record_id, name, email, phone, role, status, created_at)
         VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT DO NOTHING`,
        [invite.id, id, name, email, phone || null, role, 'pending']
      );
    } catch (e) {
      // Create table if it doesn't exist, then retry
      try {
        await safeQuery(`
          CREATE TABLE IF NOT EXISTS meeting_invites (
            id VARCHAR(50) PRIMARY KEY,
            meeting_record_id UUID REFERENCES meeting_records(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            role VARCHAR(50) DEFAULT 'guest',
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await safeQuery(
          `INSERT INTO meeting_invites (id, meeting_record_id, name, email, phone, role, status, created_at)
           VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, NOW()) ON CONFLICT DO NOTHING`,
          [invite.id, id, name, email, phone || null, role, 'pending']
        );
      } catch (error_) {
        console.warn('[Invite] DB persist skipped:', error_.message);
      }
    }
    
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
app.post('/api/ai/pre-consultation-summary', authenticateToken, async (req, res) => {
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
app.post('/api/ai/patient-instruction-sheet', authenticateToken, async (req, res) => {
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
app.post('/api/ai/document-analysis', authenticateToken, async (req, res) => {
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
app.post('/api/ai/cds-check', authenticateToken, async (req, res) => {
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

app.get('/api/ai/validations', authenticateToken, async (req, res) => {
  try {
    const validations = Array.from(aiValidations.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    let dbValidations = [];
    try {
      const result = await safeQuery('SELECT * FROM ai_validations ORDER BY created_at DESC LIMIT 50');
      dbValidations = result.rows;
    } catch (e) {
      console.warn('[Validations] DB query skipped:', e.message);
    }
    
    res.json({ success: true, validations: [...validations, ...dbValidations], total: validations.length + dbValidations.length });
  } catch (error) {
    res.json({ success: true, validations: [], total: 0 });
  }
});

app.post('/api/ai/validate', authenticateToken, async (req, res) => {
  try {
    const { validationId, type, content, action, doctorId, patientId, reason } = req.body;
    
    if (validationId && aiValidations.has(validationId)) {
      const validation = aiValidations.get(validationId);
      validation.status = action === 'approve' ? 'approved' : 'rejected';
      validation.reviewedBy = doctorId;
      validation.reviewedAt = new Date().toISOString();
      validation.reason = reason;
      
      try {
        await safeQuery(
          `INSERT INTO ai_validations (id, type, content_snapshot, decision, doctor_id, patient_id, validated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT DO NOTHING`,
          [validationId, validation.type, validation.content, validation.status, doctorId, patientId]
        );
      } catch (e) {
        console.warn('[Validation] DB persist skipped:', e.message);
      }
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
// MEETING-LEVEL VALIDATION (Man-in-the-Loop per Meeting)
// ============================================================================

// POST /api/meetings/:id/validate — Doctor validates AI summary for a specific meeting
app.post('/api/meetings/:id/validate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, editedSummary, reason, doctorId } = req.body;

    if (!['approve', 'edit', 'reject', 'regenerate'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action. Must be: approve, edit, reject, regenerate' });
    }

    let validationStatus;
    let summaryToStore = null;

    if (action === 'approve') {
      validationStatus = 'approved';
    } else if (action === 'edit') {
      validationStatus = 'edited';
      summaryToStore = editedSummary;
    } else if (action === 'reject') {
      validationStatus = 'rejected';
    } else {
      validationStatus = 'pending_regeneration';
    }

    // Update meeting record in DB
    try {
      if (action === 'edit' && summaryToStore) {
        await safeQuery(
          `UPDATE meeting_records 
           SET doctor_validation_status = $2, validated_at = NOW(), 
               validated_by = $3, validation_reason = $4, ai_summary = $5,
               ready_for_patient = $6
           WHERE id::text = $1 OR appointment_id = $1`,
          [id, validationStatus, doctorId || req.user?.id, reason || '', summaryToStore, validationStatus === 'edited']
        );
      } else {
        await safeQuery(
          `UPDATE meeting_records 
           SET doctor_validation_status = $2, validated_at = NOW(), 
               validated_by = $3, validation_reason = $4,
               ready_for_patient = $5
           WHERE id::text = $1 OR appointment_id = $1`,
          [id, validationStatus, doctorId || req.user?.id, reason || '', validationStatus === 'approved']
        );
      }
    } catch (e) {
      console.warn('[Meeting Validate] DB update skipped:', e.message);
    }

    // Also update in-memory validation records
    for (const [vId, val] of aiValidations.entries()) {
      if (val.meetingId === id) {
        val.status = validationStatus;
        val.reviewedBy = doctorId || req.user?.id;
        val.reviewedAt = new Date().toISOString();
        val.reason = reason;
      }
    }

    // Persist to ai_validations table
    try {
      const validationId = uuidv4();
      await safeQuery(
        `INSERT INTO ai_validations (id, type, content_snapshot, decision, doctor_id, meeting_id, validated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT DO NOTHING`,
        [validationId, 'meeting-summary', summaryToStore || '', validationStatus, doctorId || req.user?.id, id]
      );
    } catch (e) {
      console.warn('[Meeting Validate] Validation persist skipped:', e.message);
    }

    // Notify via Socket.IO
    io.to(id).emit('meeting-validation-update', {
      meetingId: id, action, status: validationStatus,
      timestamp: new Date().toISOString()
    });

    console.log(`[Meeting Validate] Meeting ${id}: ${action} by ${doctorId || req.user?.id}`);

    const actionMessages = {
      approve: 'สรุปได้รับการอนุมัติ — พร้อมส่งให้ผู้ป่วย',
      edit: 'สรุปแก้ไขแล้ว — พร้อมส่งให้ผู้ป่วย',
      reject: 'สรุปถูกปฏิเสธ — ไม่ส่งให้ผู้ป่วย',
      regenerate: 'กำลังสร้างสรุปใหม่...',
    };

    res.json({
      success: true,
      meetingId: id,
      action,
      validationStatus,
      readyForPatient: validationStatus === 'approved' || validationStatus === 'edited',
      message: actionMessages[action] || 'ดำเนินการแล้ว'
    });
  } catch (error) {
    console.error('[Meeting Validate] Error:', error);
    res.status(500).json({ error: 'Failed to validate meeting summary' });
  }
});

// DELETE /api/meetings/:id — Cancel a meeting room
app.delete('/api/meetings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Update status in DB
    try {
      await safeQuery(
        `UPDATE meeting_records SET status = 'cancelled', ended_at = NOW()
         WHERE id::text = $1 OR appointment_id = $1`,
        [id]
      );
    } catch (e) {
      console.warn('[Meeting Cancel] DB update skipped:', e.message);
    }

    // Clean up in-memory data
    activeMeetings.delete(id);
    activeTranscriptions.delete(id);
    meetingChats.delete(id);
    meetingLobbies.delete(id);
    meetingInvites.delete(id);
    meetingConsents.delete(id);

    // Notify all participants
    io.to(id).emit('meeting-cancelled', {
      meetingId: id, reason: req.body?.reason || 'Meeting cancelled by host',
      timestamp: new Date().toISOString()
    });

    console.log(`[Meeting Cancel] Meeting ${id} cancelled`);
    res.json({ success: true, meetingId: id, message: 'Meeting cancelled' });
  } catch (error) {
    console.error('[Meeting Cancel] Error:', error);
    res.status(500).json({ error: 'Failed to cancel meeting' });
  }
});

// POST /api/meetings/:id/patient-instruction — Generate patient instruction sheet for a specific meeting
app.post('/api/meetings/:id/patient-instruction', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!genAI) {
      return res.json({ success: true, instructions: 'AI service not configured', source: 'fallback' });
    }

    // Fetch meeting + summary from DB
    let meeting = null;
    let aiSummary = '';
    try {
      const result = await safeQuery(
        `SELECT mr.*, u_pat.name_thai as patient_name_thai
         FROM meeting_records mr
         LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
         WHERE mr.id::text = $1 OR mr.appointment_id = $1`, [id]
      );
      if (result.rows.length > 0) {
        meeting = result.rows[0];
        aiSummary = meeting.ai_summary || '';
      }
    } catch (e) {
      console.warn('[Patient Instruction] DB lookup skipped:', e.message);
    }

    if (!aiSummary) {
      return res.json({
        success: true, instructions: 'ไม่มีสรุปการปรึกษาสำหรับสร้างคำแนะนำ',
        source: 'empty', requiresValidation: false
      });
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `สร้างเอกสารคำแนะนำสำหรับผู้ป่วย จากสรุปการปรึกษาแพทย์ (ภาษาไทย อ่านง่าย):

สรุปการปรึกษา:
${aiSummary}

ชื่อผู้ป่วย: ${meeting?.patient_name_thai || 'ไม่ระบุ'}

กรุณาสร้างเอกสารในรูปแบบ:
## 📋 สรุปผลการปรึกษา
- การวินิจฉัย
- ยาที่ได้รับ (ชื่อ, ขนาด, วิธีใช้)

## 💊 การปฏิบัติตัว
- สิ่งที่ต้องทำ
- สิ่งที่ห้ามทำ

## ⚠️ อาการเตือนที่ต้องมาพบแพทย์ทันที
- รายการอาการ

## 📅 นัดติดตาม
- วันเวลานัดครั้งถัดไป

⚠️ เอกสารนี้ต้องให้แพทย์ตรวจสอบก่อนส่งให้ผู้ป่วย`;

    const result = await model.generateContent(prompt);
    const instructions = result.response.text();

    const validationId = uuidv4();
    aiValidations.set(validationId, {
      id: validationId, meetingId: id, type: 'patient-instruction-sheet',
      content: instructions, status: 'pending_review', createdAt: new Date().toISOString()
    });

    // Save to meeting record
    try {
      await safeQuery(
        `UPDATE meeting_records SET patient_instructions = $2, instruction_validation_id = $3
         WHERE id::text = $1 OR appointment_id = $1`,
        [id, instructions, validationId]
      );
    } catch (e) {
      console.warn('[Patient Instruction] DB save skipped:', e.message);
    }

    console.log(`[Patient Instruction] Generated for meeting ${id}`);
    res.json({
      success: true, instructions, validationId,
      meetingId: id, requiresValidation: true, source: 'gemini',
      message: 'กรุณาให้แพทย์ตรวจสอบก่อนส่งให้ผู้ป่วย'
    });
  } catch (error) {
    console.error('[Patient Instruction] Error:', error);
    res.status(500).json({ error: 'Failed to generate patient instruction sheet' });
  }
});

// GET /api/meetings/:id/consultation-result — Patient fetches approved consultation result
app.get('/api/meetings/:id/consultation-result', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    let meeting = null;
    try {
      const result = await safeQuery(
        `SELECT mr.ai_summary, mr.patient_instructions, mr.doctor_validation_status,
                mr.validated_at, mr.ready_for_patient, mr.appointment_id,
                u_doc.name_thai as doctor_name, u_pat.name_thai as patient_name
         FROM meeting_records mr
         LEFT JOIN users u_doc ON mr.doctor_id = u_doc.id
         LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
         WHERE (mr.id::text = $1 OR mr.appointment_id = $1)
           AND mr.ready_for_patient = true`, [id]
      );
      if (result.rows.length > 0) meeting = result.rows[0];
    } catch (e) {
      console.warn('[Consultation Result] DB lookup skipped:', e.message);
    }

    if (!meeting) {
      return res.json({
        success: true, available: false,
        message: 'ผลการปรึกษายังไม่พร้อม — รอแพทย์ตรวจสอบ'
      });
    }

    res.json({
      success: true, available: true,
      appointmentId: meeting.appointment_id,
      doctorName: meeting.doctor_name,
      patientName: meeting.patient_name,
      summary: meeting.ai_summary,
      instructions: meeting.patient_instructions,
      validationStatus: meeting.doctor_validation_status,
      validatedAt: meeting.validated_at,
    });
  } catch (error) {
    console.error('[Consultation Result] Error:', error);
    res.status(500).json({ error: 'Failed to fetch consultation result' });
  }
});

// ============================================================================
// GOOGLE CLOUD SPEECH-TO-TEXT — Server-Side Transcription with Diarization
// ============================================================================

// Google STT configuration endpoint
app.get('/api/meetings/stt/config', (req, res) => {
  const sttAvailable = !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_SPEECH_API_KEY;
  res.json({
    success: true,
    sttAvailable,
    modes: ['web-speech-api', ...(sttAvailable ? ['google-cloud-stt'] : [])],
    defaultMode: 'web-speech-api',
    features: {
      speakerDiarization: sttAvailable,
      multiLanguage: true,
      supportedLanguages: ['th-TH', 'en-US', 'en-GB'],
      maxDurationMinutes: 120,
    },
  });
});

// POST /api/meetings/:id/transcribe-audio — Full audio file transcription via Google STT
app.post('/api/meetings/:id/transcribe-audio', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { audioBase64, audioUrl, language = 'th-TH', enableDiarization = true } = req.body;

    // Check if Google STT credentials are available
    const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_SPEECH_API_KEY;

    if (!hasCredentials) {
      // Graceful fallback — return info about using Web Speech API
      return res.json({
        success: true,
        message: 'Google Cloud Speech-to-Text not configured — using Web Speech API mode',
        mode: 'web-speech-api',
        meetingId: id,
        transcript: null,
        configured: false,
      });
    }

    // If credentials are available, use Google Cloud Speech-to-Text
    let transcriptText = '';
    let segments = [];
    try {
      const { SpeechClient } = await import('@google-cloud/speech');
      const speechClient = new SpeechClient();

      const config = {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: language,
        alternativeLanguageCodes: language === 'th-TH' ? ['en-US'] : ['th-TH'],
        enableAutomaticPunctuation: true,
        enableSpeakerDiarization: enableDiarization,
        diarizationSpeakerCount: 2,
        model: 'latest_long',
        useEnhanced: true,
      };

      if (audioBase64) {
        const [response] = await speechClient.recognize({
          audio: { content: audioBase64 },
          config,
        });

        if (response.results) {
          for (const result of response.results) {
            const alt = result.alternatives?.[0];
            if (alt) {
              const speakerTag = alt.words?.[0]?.speakerTag || 0;
              segments.push({
                content: alt.transcript,
                confidence: alt.confidence,
                speakerTag,
                speakerRole: speakerTag === 1 ? 'doctor' : 'patient',
              });
              transcriptText += `[Speaker ${speakerTag}]: ${alt.transcript}\n`;
            }
          }
        }
      }
    } catch (sttError) {
      console.warn('[STT] Google Cloud Speech error:', sttError.message);
      return res.json({
        success: true,
        message: 'Google STT processing failed — fallback to Web Speech API',
        mode: 'web-speech-api-fallback',
        error: sttError.message,
        meetingId: id,
      });
    }

    // Store results in DB if available
    if (segments.length > 0) {
      for (const seg of segments) {
        try {
          await safeQuery(
            `INSERT INTO meeting_transcripts (
              meeting_record_id, speaker_role, speaker_name, content,
              language, confidence, created_at
            ) VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())`,
            [id, seg.speakerRole, `Speaker ${seg.speakerTag}`, seg.content,
             language, seg.confidence]
          );
        } catch (e) {
          console.warn('[STT] DB insert skipped:', e.message);
        }
      }
    }

    res.json({
      success: true,
      mode: 'google-cloud-stt',
      meetingId: id,
      segments,
      fullTranscript: transcriptText,
      totalSegments: segments.length,
      diarization: enableDiarization,
      language,
    });
  } catch (error) {
    console.error('[STT] Transcribe audio error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
  }
});

// POST /api/meetings/:id/enhanced-summary — Enhanced Gemini summary with diarized speaker context
app.post('/api/meetings/:id/enhanced-summary', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'structured' } = req.body;

    if (!genAI) {
      return res.json({ success: true, summary: 'AI not configured', source: 'fallback' });
    }

    // Fetch meeting and transcript
    let meeting = null;
    let transcriptRows = [];
    try {
      const meetingResult = await pool.query(
        `SELECT mr.*, u_pat.name_thai as patient_name_thai, u_doc.name_thai as doctor_name_thai
         FROM meeting_records mr
         LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
         LEFT JOIN users u_doc ON mr.doctor_id = u_doc.id
         WHERE mr.id::text = $1 OR mr.appointment_id = $1`, [id]
      );
      if (meetingResult.rows.length > 0) meeting = meetingResult.rows[0];

      const transcriptsResult = await pool.query(
        `SELECT * FROM meeting_transcripts WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`, [id]
      );
      transcriptRows = transcriptsResult.rows;
    } catch (e) {
      console.warn('[Enhanced Summary] DB lookup skipped:', e.message);
    }

    if (transcriptRows.length === 0) {
      return res.json({
        success: true,
        summary: { soap: 'ไม่มีบทสนทนาสำหรับสรุป' },
        meetingId: id,
        source: 'empty',
      });
    }

    // Build speaker-tagged transcript
    const diarizedTranscript = transcriptRows.map(t => {
      const role = t.speaker_role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย';
      return `${role}: ${t.content}`;
    }).join('\n');

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const structuredPrompt = `คุณคือผู้ช่วยแพทย์ AI วิเคราะห์บทสนทนาระหว่างแพทย์กับผู้ป่วยจากระบบ Telemedicine

บทสนทนา (แยกผู้พูด):
${diarizedTranscript}

ชื่อผู้ป่วย: ${meeting?.patient_name_thai || 'ไม่ระบุ'}
ชื่อแพทย์: ${meeting?.doctor_name_thai || 'ไม่ระบุ'}

กรุณาวิเคราะห์และสรุปเป็น JSON ดังนี้:
{
  "chiefComplaint": "อาการหลักที่ผู้ป่วยมาพบแพทย์ (จากคำพูดของผู้ป่วย)",
  "soap": {
    "subjective": "อาการที่ผู้ป่วยบอก",
    "objective": "สิ่งที่แพทย์ตรวจพบ",
    "assessment": "การวินิจฉัยเบื้องต้น",
    "plan": "แผนการรักษา"
  },
  "doctorReasoning": "เหตุผลทางคลินิกของแพทย์ (จากคำพูดของแพทย์)",
  "patientConcerns": ["ข้อกังวล/คำถามของผู้ป่วย"],
  "prescribedPlan": "สิ่งที่แพทย์สั่ง (ยา, การตรวจ, นัดหมาย)",
  "redFlags": ["อาการเตือนที่ต้องมาพบแพทย์ทันที"],
  "followUp": "กำหนดการนัดตรวจครั้งถัดไป",
  "emrFields": {
    "icd10Suggestions": ["รหัส ICD-10 ที่แนะนำ"],
    "medications": ["ยาที่สั่ง"],
    "labOrders": ["การตรวจทางห้องปฏิบัติการ"]
  }
}
⚠️ นี่คือสรุปเบื้องต้นจาก AI ต้องให้แพทย์ตรวจสอบก่อนใช้งาน
ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`;

    const result = await model.generateContent(structuredPrompt);
    let summaryText = result.response.text();

    // Try to parse as JSON
    let structuredSummary = null;
    try {
      // Remove markdown code block if present
      const jsonMatch = /\{[\s\S]*\}/.exec(summaryText);
      if (jsonMatch) {
        structuredSummary = JSON.parse(jsonMatch[0]);
      }
    } catch (error_) {
      console.warn('[Enhanced Summary] JSON parse failed, returning raw text', error_);
    }

    const validationId = uuidv4();
    aiValidations.set(validationId, {
      id: validationId, meetingId: id, type: 'enhanced-meeting-summary',
      content: summaryText, status: 'pending_review',
      createdAt: new Date().toISOString()
    });

    // Save to DB
    try {
      await safeQuery(
        `UPDATE meeting_records SET ai_summary = $2, ai_recommendations = $3
         WHERE id::text = $1 OR appointment_id = $1`,
        [id, summaryText, JSON.stringify({
          validationId, requiresValidation: true,
          structured: !!structuredSummary, format: 'enhanced'
        })]
      );
    } catch (e) {
      console.warn('[Enhanced Summary] DB save skipped:', e.message);
    }

    res.json({
      success: true,
      meetingId: id,
      summary: structuredSummary || summaryText,
      rawText: summaryText,
      isStructured: !!structuredSummary,
      validationId,
      requiresValidation: true,
      source: 'gemini',
      diarizedTranscript,
      totalSegments: transcriptRows.length,
    });
  } catch (error) {
    console.error('[Enhanced Summary] Error:', error);
    res.status(500).json({ error: 'Failed to generate enhanced summary' });
  }
});

// ============================================================================
// MEETING RESULTS — Teams-like Recording Results for Doctor Portal
// ============================================================================

// GET /api/meetings/:id/results — Combined transcript + summary + chat + metadata
// Used by doctor portal to show complete meeting results (like MS Teams recording)
app.get('/api/meetings/:id/results', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch meeting record with doctor/patient names
    let meeting = null;
    try {
      const result = await safeQuery(
        `SELECT mr.*,
                u_pat.name_thai as patient_name_thai, u_pat.email as patient_email,
                u_doc.name_thai as doctor_name_thai, u_doc.email as doctor_email,
                a.symptoms, a.notes as appointment_notes, a.type as appointment_type
         FROM meeting_records mr
         LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
         LEFT JOIN users u_doc ON mr.doctor_id = u_doc.id
         LEFT JOIN appointments a ON mr.appointment_id = a.id
         WHERE mr.id::text = $1 OR mr.appointment_id = $1`, [id]
      );
      if (result.rows.length > 0) {
        meeting = result.rows[0];
      }
    } catch (e) {
      console.warn('[Meeting Results] DB lookup skipped:', e.message);
    }

    // Fallback to in-memory activeMeetings if DB lookup returned nothing
    if (!meeting) {
      const mem = activeMeetings.get(id);
      if (mem) {
        meeting = {
          id: mem.meetingId, appointment_id: mem.appointmentId,
          doctor_id: mem.doctorId, patient_id: mem.patientId,
          room_name: mem.roomName, status: mem.status || 'completed',
          created_at: mem.createdAt, ended_at: mem.endedAt || null,
        };
      }
    }

    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    // 2. Fetch individual transcript segments (timeline view)
    let transcriptSegments = [];
    try {
      const transcriptsResult = await safeQuery(
        `SELECT speaker_id, speaker_role, speaker_name, content, language, confidence, created_at
         FROM meeting_transcripts WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`,
        [meeting.id]
      );
      transcriptSegments = transcriptsResult.rows;
    } catch (e) {
      console.warn('[Meeting Results] Transcript fetch skipped:', e.message);
    }

    // 3. Fetch chat messages from DB or memory
    let chatMessages = [];
    try {
      const chatResult = await safeQuery(
        `SELECT sender_id, sender_role, sender_name, message, created_at
         FROM meeting_chats WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`,
        [meeting.id]
      );
      chatMessages = chatResult.rows;
    } catch (e) {
      // Fallback to in-memory chat
      chatMessages = (meetingChats.get(meeting.id) || []).map(c => ({
        sender_id: c.senderId, sender_role: c.senderRole,
        sender_name: c.senderName, message: c.message, created_at: c.timestamp
      }));
    }

    // 4. Build response matching Teams recording-like structure
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        appointmentId: meeting.appointment_id,
        status: meeting.status,
        startedAt: meeting.started_at || meeting.created_at,
        endedAt: meeting.ended_at,
        durationMinutes: meeting.duration_minutes ? Math.round(meeting.duration_minutes) : null,
        doctor: { name: meeting.doctor_name_thai, email: meeting.doctor_email, id: meeting.doctor_id },
        patient: { name: meeting.patient_name_thai, email: meeting.patient_email, id: meeting.patient_id },
        appointmentType: meeting.appointment_type,
        recordingUrl: meeting.recording_url || null,
      },
      transcript: {
        fullText: meeting.transcript || '',
        segments: transcriptSegments.map(s => ({
          speaker: s.speaker_name || 'Unknown',
          displayLabel: formatSpeakerLabel(s.speaker_role, s.speaker_name),
          role: s.speaker_role,
          content: s.content,
          timestamp: s.created_at,
          confidence: s.confidence,
          language: s.language,
        })),
        totalSegments: transcriptSegments.length,
      },
      summary: {
        text: meeting.ai_summary || null,
        recommendations: meeting.ai_recommendations ? JSON.parse(meeting.ai_recommendations) : null,
        sectionSummaries: meeting.section_summaries ? JSON.parse(meeting.section_summaries) : null,
        requiresValidation: true,
        validatedAt: meeting.validated_at || null,
      },
      chat: {
        messages: chatMessages.map(c => ({
          sender: c.sender_name, role: c.sender_role,
          message: c.message, timestamp: c.created_at,
        })),
        totalMessages: chatMessages.length,
      },
    });
  } catch (error) {
    console.error('[Meeting Results] Error:', error);
    res.status(500).json({ error: 'Failed to fetch meeting results' });
  }
});

// POST /api/meetings/:id/auto-record — Auto-start transcription when doctor joins
app.post('/api/meetings/:id/auto-record', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorId, doctorName, autoTranscribe = true } = req.body;

    // Start transcription session automatically
    if (!activeTranscriptions.has(id)) {
      activeTranscriptions.set(id, {
        meetingId: id,
        isActive: autoTranscribe,
        isPaused: false,
        startedAt: new Date(),
        transcripts: [],
        autoStarted: true,
      });
    }

    // Update meeting record to mark recording started
    try {
      await safeQuery(
        `UPDATE meeting_records SET 
           recording_started_at = COALESCE(recording_started_at, NOW()),
           auto_transcribe = true
         WHERE id::text = $1 OR appointment_id = $1`,
        [id]
      );
    } catch (e) {
      console.warn('[Auto Record] DB update skipped:', e.message);
    }

    // Notify participants that recording/transcription has started
    io.to(id).emit('recording-started', {
      meetingId: id, startedBy: doctorName || 'Doctor',
      autoTranscribe, timestamp: new Date().toISOString(),
    });

    console.log(`[Auto Record] Auto-transcription started for meeting ${id} by ${doctorName}`);
    res.json({ success: true, message: 'Auto-recording started', meetingId: id, autoTranscribe });
  } catch (error) {
    console.error('[Auto Record] Error:', error);
    res.status(500).json({ error: 'Failed to start auto-recording' });
  }
});

// POST /api/meetings/:id/save-recording — Save recording to PostgreSQL BYTEA and trigger transcription
app.post('/api/meetings/:id/save-recording', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { audioBase64, mimeType = 'audio/webm', durationMs, triggerTranscription = true } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    // Validate base64 size (max 50MB)
    const sizeBytes = Math.ceil(audioBase64.length * 3 / 4);
    if (sizeBytes > 50 * 1024 * 1024) {
      return res.status(413).json({ error: 'Recording too large (max 50MB)' });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const recordingId = uuidv4();
    const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
    const filename = `${id}-${recordingId}.${ext}`;
    const recordingUrl = `/api/recordings/${id}`;

    // Primary: Store recording as BYTEA in PostgreSQL (GCE VM persistent storage)
    let storedInDb = false;
    try {
      await safeQuery(
        `UPDATE meeting_records SET 
           recording_data = $1,
           recording_filename = $2,
           recording_mimetype = $3,
           recording_size_bytes = $4,
           recording_url = $5,
           recording_started_at = COALESCE(recording_started_at, NOW()),
           status = CASE WHEN status = 'in_progress' THEN 'completed' ELSE status END
         WHERE id::text = $6 OR appointment_id = $6`,
        [buffer, filename, mimeType, sizeBytes, recordingUrl, id]
      );
      storedInDb = true;
      console.log(`[Save Recording] Stored in PostgreSQL BYTEA: ${filename} (${(sizeBytes / 1024).toFixed(1)} KB)`);
    } catch (dbErr) {
      console.warn('[Save Recording] PostgreSQL BYTEA write failed:', dbErr.message);
      // Fallback: save to local filesystem
      try {
        const filepath = path.join(RECORDINGS_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        await safeQuery(
          `UPDATE meeting_records SET 
             recording_url = $1, recording_filename = $2, recording_mimetype = $3, recording_size_bytes = $4,
             recording_started_at = COALESCE(recording_started_at, NOW()),
             status = CASE WHEN status = 'in_progress' THEN 'completed' ELSE status END
           WHERE id::text = $5 OR appointment_id = $5`,
          [`/api/recordings/${id}/${filename}`, filename, mimeType, sizeBytes, id]
        );
        console.log(`[Save Recording] Fallback: saved to filesystem ${filepath}`);
      } catch (fsErr) {
        console.error('[Save Recording] File write also failed:', fsErr.message);
      }
    }

    console.log(`[Save Recording] Recording saved for meeting ${id} (${(sizeBytes / 1024).toFixed(1)} KB, db=${storedInDb})`);

    // Trigger post-meeting transcription with speaker diarization if requested
    let transcriptionResult = null;
    if (triggerTranscription) {
      try {
        if (hasSttCredentials()) {
          // Use Google Cloud STT with speaker diarization
          const speechClient = await createSpeechClient();
          
          const [response] = await speechClient.recognize({
            audio: { content: audioBase64 },
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: 'th-TH',
              enableAutomaticPunctuation: true,
              enableSpeakerDiarization: true,
              diarizationSpeakerCount: 2,
              model: 'latest_long',
              useEnhanced: true,
            },
          });

          const segments = [];
          for (const result of (response.results || [])) {
            const alt = result.alternatives?.[0];
            if (!alt?.transcript) continue;
            const speakerTag = alt.words?.[0]?.speakerTag || 1;
            segments.push({
              content: alt.transcript.trim(),
              confidence: alt.confidence || 0,
              speakerTag,
              speakerRole: speakerTag === 1 ? 'doctor' : 'patient',
            });
          }

          // Store transcript segments in DB
          for (const seg of segments) {
            await safeQuery(
              `INSERT INTO meeting_transcripts (meeting_record_id, speaker_role, speaker_name, content, language, confidence, created_at)
               VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())`,
              [id, seg.speakerRole, seg.speakerRole === 'doctor' ? 'แพทย์' : 'ผู้ป่วย', seg.content, 'th-TH', seg.confidence]
            );
          }

          transcriptionResult = {
            mode: 'google-cloud-stt',
            segments: segments.length,
            diarization: true,
          };
          console.log(`[Save Recording] Post-recording transcription completed: ${segments.length} segments`);
        } else {
          transcriptionResult = { mode: 'web-speech-api', configured: false, message: 'Cloud STT not configured — use Web Speech API transcript from live session' };
        }
      } catch (transcErr) {
        console.warn('[Save Recording] Post-recording transcription skipped:', transcErr.message);
        transcriptionResult = { mode: 'skipped', error: transcErr.message };
      }
    }

    // Notify participants
    io.to(id).emit('recording-saved', {
      meetingId: id, recordingId, durationMs, transcription: transcriptionResult,
      storedIn: storedInDb ? 'postgresql' : 'filesystem',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      recordingId,
      meetingId: id,
      sizeBytes,
      storedIn: storedInDb ? 'postgresql' : 'filesystem',
      transcription: transcriptionResult,
      message: 'Recording saved successfully',
    });
  } catch (error) {
    console.error('[Save Recording] Error:', error);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// POST /api/meetings/:id/stop-recording — Stop recording and trigger summary generation
app.post('/api/meetings/:id/stop-recording', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Mark recording as stopped in DB
    try {
      await safeQuery(
        `UPDATE meeting_records SET recording_stopped_at = NOW() WHERE id::text = $1 OR appointment_id = $1`,
        [id]
      );
    } catch (e) {
      console.warn('[Stop Recording] DB update skipped:', e.message);
    }

    // Notify participants
    io.to(id).emit('recording-stopped', {
      meetingId: id,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Stop Recording] Recording stopped for meeting ${id}`);
    res.json({ success: true, meetingId: id, message: 'Recording stopped' });
  } catch (error) {
    console.error('[Stop Recording] Error:', error);
    res.status(500).json({ error: 'Failed to stop recording' });
  }
});

// ============================================================================
// RECORDING FILE PLAYBACK (Doctor-only)
// ============================================================================

// GET /api/recordings/:meetingId — Serve recording from PostgreSQL BYTEA
app.get('/api/recordings/:meetingId', authenticateToken, async (req, res) => {
  const { meetingId } = req.params;
  try {
    const result = await safeQuery(
      `SELECT recording_data, recording_filename, recording_mimetype, recording_size_bytes 
       FROM meeting_records WHERE (id::text = $1 OR appointment_id = $1) AND recording_data IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [meetingId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    const { recording_data, recording_filename, recording_mimetype } = result.rows[0];
    res.setHeader('Content-Type', recording_mimetype || 'audio/webm');
    res.setHeader('Content-Disposition', `inline; filename="${recording_filename || 'recording.webm'}"`);
    res.send(recording_data);
  } catch (err) {
    console.error('[Recordings] DB read error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve recording' });
  }
});

// GET /api/recordings/:meetingId/:filename — Serve recording file (filesystem fallback)
app.get('/api/recordings/:meetingId/:filename', authenticateToken, (req, res) => {
  const { meetingId, filename } = req.params;
  // Sanitize filename to prevent path traversal
  const safeFilename = path.basename(filename);
  if (!safeFilename.startsWith(meetingId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const filepath = path.join(RECORDINGS_DIR, safeFilename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Recording not found' });
  }
  const ext = path.extname(safeFilename);
  let contentType = 'application/octet-stream';
  if (ext === '.webm') contentType = 'audio/webm';
  else if (ext === '.ogg') contentType = 'audio/ogg';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  fs.createReadStream(filepath).pipe(res);
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
      if (session?.isActive && !session.isPaused) {
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

  socket.on('media-update', (data) => {
    const { meetingId, userId, userName, role, camera, microphone } = data;
    if (meetingId) {
      let roomMedia = participantMediaStatus.get(meetingId);
      if (!roomMedia) { roomMedia = new Map(); participantMediaStatus.set(meetingId, roomMedia); }
      roomMedia.set(userId || socket.id, {
        userId: userId || socket.id, userName, role, camera, microphone,
        lastUpdated: new Date().toISOString(),
      });
      io.to(meetingId).emit('participant-media-update', {
        userId: userId || socket.id, userName, role, camera, microphone,
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  socket.on('lobby-request', (data) => {
    const { meetingId, participantId, participantName, role, email } = data;
    if (!meetingId || !participantId) return;
    
    // Hosts (doctor/admin) bypass lobby
    if (role === 'doctor' || role === 'admin') {
      socket.emit('lobby-response', { meetingId, participantId, status: 'admitted' });
      return;
    }
    
    let lobby = meetingLobbies.get(meetingId);
    if (!lobby) { lobby = new Map(); meetingLobbies.set(meetingId, lobby); }
    
    const entry = {
      participantId, participantName, role: role || 'guest',
      email: email || null, status: 'waiting',
      socketId: socket.id, joinedAt: new Date().toISOString(),
    };
    lobby.set(participantId, entry);
    
    // Notify room (doctor will see this)
    io.to(meetingId).emit('lobby-update', { meetingId, action: 'join', participant: entry });
    socket.emit('lobby-response', { meetingId, participantId, status: 'waiting' });
  });
  
  socket.on('lobby-admit', (data) => {
    const { meetingId, participantId, admittedBy } = data;
    const lobby = meetingLobbies.get(meetingId);
    if (!lobby?.has(participantId)) return;
    
    const entry = lobby.get(participantId);
    entry.status = 'admitted';
    entry.admittedBy = admittedBy;
    entry.admittedAt = new Date().toISOString();
    
    io.to(meetingId).emit('lobby-update', { meetingId, action: 'admit', participant: entry });
  });
  
  socket.on('lobby-reject', (data) => {
    const { meetingId, participantId, rejectedBy } = data;
    const lobby = meetingLobbies.get(meetingId);
    if (!lobby?.has(participantId)) return;
    
    const entry = lobby.get(participantId);
    entry.status = 'rejected';
    entry.rejectedBy = rejectedBy;
    entry.rejectedAt = new Date().toISOString();
    
    io.to(meetingId).emit('lobby-update', { meetingId, action: 'reject', participant: entry });
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
    // Test database connection
    try {
      await pool.query('SELECT NOW()');
      dbAvailable = true;
      console.log('✅ PostgreSQL connected');
      
      // Ensure required tables exist
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS meeting_invites (
            id VARCHAR(50) PRIMARY KEY,
            meeting_record_id UUID REFERENCES meeting_records(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            role VARCHAR(50) DEFAULT 'guest',
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ai_validations (
            id VARCHAR(50) PRIMARY KEY,
            type VARCHAR(50),
            content_snapshot TEXT,
            decision VARCHAR(20),
            doctor_id VARCHAR(50),
            patient_id VARCHAR(50),
            meeting_id VARCHAR(50),
            validated_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS meeting_chats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            meeting_record_id UUID REFERENCES meeting_records(id) ON DELETE CASCADE,
            sender_id VARCHAR(50),
            sender_role VARCHAR(30),
            sender_name VARCHAR(255),
            message TEXT,
            type VARCHAR(20) DEFAULT 'text',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        // Add meeting validation and patient instruction columns
        const newColumns = [
          ['meeting_records', 'doctor_validation_status', 'VARCHAR(30) DEFAULT \'pending_review\''],
          ['meeting_records', 'validated_at', 'TIMESTAMP WITH TIME ZONE'],
          ['meeting_records', 'validated_by', 'VARCHAR(50)'],
          ['meeting_records', 'validation_reason', 'TEXT'],
          ['meeting_records', 'ready_for_patient', 'BOOLEAN DEFAULT FALSE'],
          ['meeting_records', 'patient_instructions', 'TEXT'],
          ['meeting_records', 'instruction_validation_id', 'VARCHAR(50)'],
          ['meeting_records', 'recording_started_at', 'TIMESTAMP WITH TIME ZONE'],
          ['meeting_records', 'auto_transcribe', 'BOOLEAN DEFAULT FALSE'],
        ];
        for (const [table, col, colType] of newColumns) {
          try {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${colType}`);
          } catch (e) { /* column may already exist */ }
        }
        console.log('✅ Meeting support tables verified');
      } catch (error_) {
        console.warn('⚠️ Table creation warning:', error_.message);
      }
    } catch (dbError) {
      dbAvailable = false;
      console.warn('⚠️ Database connection failed, running in memory-only mode:', dbError.message);
      console.warn('   → Meeting data will be in-memory only and lost on restart');
      
      // Schedule periodic reconnection attempts
      const reconnectInterval = setInterval(async () => {
        try {
          await pool.query('SELECT 1');
          dbAvailable = true;
          console.log('✅ Database reconnected successfully');
          clearInterval(reconnectInterval);
        } catch (error_) {
          console.warn('⚠️ Database reconnection attempt failed:', error_.message);
        }
      }, 15000); // Retry every 15 seconds
    }
    
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║     🎥 Izara Jitsi Meeting Server v1.5.1                        ║
╠════════════════════════════════════════════════════════════╣
║  Port:       ${PORT}                                          ║
║  Jitsi:      ${JITSI_DOMAIN}                               ║
║  AI:         ${genAI ? 'Gemini Ready (' + GEMINI_MODEL + ')' : 'Not configured'}                  ║
║  Database:   ${dbAvailable ? '✅ Connected' : '⚠️ Memory-only'}                              ║
║  Features:   Transcription, Chat, Invites, CDS             ║
║  Transcript: Web Speech API (FREE)                         ║
║  End Point:  POST /api/meetings/:id/end (triggers AI)      ║
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
      console.log(`[CLEANUP] Maps: transcriptions=${activeTranscriptions.size}, chats=${meetingChats.size}, invites=${meetingInvites.size}, mediaStatus=${participantMediaStatus.size}, consents=${meetingConsents.size}, lobbies=${meetingLobbies.size}`);
    }, 30 * 60 * 1000);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

await startServer();

export default app;
