/**
 * Izara Jitsi Meeting Server
 * 
 * Main API server for:
 * - Meeting room management
 * - Real-time transcription via Google Speech-to-Text
 * - AI meeting summarization via Gemini
 * - PostgreSQL persistence
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
const JWT_SECRET = process.env.JWT_SECRET || 'izara-jitsi-jwt-secret';
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
app.use(express.json());

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

// ============================================================================
// IN-MEMORY TRANSCRIPT STORAGE
// ============================================================================

const activeTranscriptions = new Map();

// ============================================================================
// MEETING ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'izara-jitsi-server', timestamp: new Date().toISOString() });
});

// API Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'izara-jitsi-server', timestamp: new Date().toISOString() });
});

// Create new meeting room (primary endpoint)
app.post('/api/meetings/create', authenticateToken, async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId, patientName, doctorName, scheduledTime } = req.body;
    
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
    
    // Insert into database
    const result = await pool.query(
      `INSERT INTO meeting_records (
        id, appointment_id, doctor_id, patient_id, room_name, jitsi_domain,
        meeting_url, doctor_url, patient_url, status, meeting_config, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        meetingId,
        appointmentId,
        doctorId,
        patientId,
        roomName,
        JITSI_DOMAIN,
        meetingUrl,
        doctorUrl,
        patientUrl,
        'scheduled',
        JSON.stringify({
          lobbyEnabled: true,
          recordingEnabled: true,
          transcriptionEnabled: true,
          scheduledTime
        })
      ]
    );
    
    console.log(`[Meeting] Created meeting ${meetingId} for appointment ${appointmentId}`);
    
    res.json({
      success: true,
      meeting: result.rows[0],
      urls: {
        base: meetingUrl,
        doctor: doctorUrl,
        patient: patientUrl,
        guest: meetingUrl
      }
    });
    
  } catch (error) {
    console.error('[Meeting] Create error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Alias: /api/meeting/create (alternative endpoint for tests)
app.post('/api/meeting/create', async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId, title } = req.body;
    
    const meetingId = uuidv4();
    const roomName = `izara-${appointmentId?.substring(0, 12) || meetingId.substring(0, 8)}-${Date.now().toString(36)}`;
    const meetingUrl = `https://${JITSI_DOMAIN}/${roomName}`;
    
    res.json({
      success: true,
      meetingId,
      roomName,
      meetingUrl,
      title: title || 'Izara Consultation',
      urls: {
        base: meetingUrl,
        doctor: meetingUrl,
        patient: meetingUrl
      }
    });
    
  } catch (error) {
    console.error('[Meeting] Create error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Get meeting info
app.get('/api/meetings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT mr.*, 
              u_doc.name as doctor_name, u_doc.name_thai as doctor_name_thai,
              u_pat.name as patient_name, u_pat.name_thai as patient_name_thai
       FROM meeting_records mr
       LEFT JOIN users u_doc ON mr.doctor_id = u_doc.id
       LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
       WHERE mr.id = $1 OR mr.appointment_id = $1`,
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

// Start transcription for a meeting
app.post('/api/meetings/:id/start-transcription', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'th-TH' } = req.body;
    
    // Check if meeting exists
    const meetingResult = await pool.query(
      'SELECT * FROM meeting_records WHERE id = $1 OR appointment_id = $1',
      [id]
    );
    
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const meeting = meetingResult.rows[0];
    
    // Initialize transcription session
    const transcriptionSession = {
      meetingId: meeting.id,
      startedAt: new Date(),
      language,
      transcripts: [],
      isActive: true
    };
    
    activeTranscriptions.set(meeting.id, transcriptionSession);
    
    // Update meeting status
    await pool.query(
      `UPDATE meeting_records SET status = 'in_progress', started_at = NOW() WHERE id = $1`,
      [meeting.id]
    );
    
    console.log(`[Transcription] Started for meeting ${meeting.id}`);
    
    res.json({
      success: true,
      message: 'Transcription started',
      sessionId: meeting.id,
      language
    });
    
  } catch (error) {
    console.error('[Transcription] Start error:', error);
    res.status(500).json({ error: 'Failed to start transcription' });
  }
});

// Add transcript segment
app.post('/api/meetings/:id/transcript', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { speakerId, speakerRole, speakerName, content, language, confidence, startTime, endTime } = req.body;
    
    // Insert transcript segment into database
    const result = await pool.query(
      `INSERT INTO meeting_transcripts (
        meeting_record_id, appointment_id, speaker_id, speaker_role, speaker_name,
        content, language, confidence, start_time_seconds, end_time_seconds, created_at
      )
      SELECT $1, mr.appointment_id, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
      FROM meeting_records mr WHERE mr.id = $1
      RETURNING *`,
      [id, speakerId, speakerRole, speakerName, content, language || 'th', confidence, startTime, endTime]
    );
    
    // Also store in active transcription session
    const session = activeTranscriptions.get(id);
    if (session) {
      session.transcripts.push({
        ...result.rows[0],
        timestamp: new Date()
      });
    }
    
    // Emit to connected clients
    io.to(id).emit('transcript-update', result.rows[0]);
    
    res.json({ success: true, transcript: result.rows[0] });
    
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
    if (session) {
      session.isActive = false;
      session.endedAt = new Date();
    }
    
    // Get all transcripts for this meeting
    const transcriptsResult = await pool.query(
      `SELECT * FROM meeting_transcripts WHERE meeting_record_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    
    // Combine all transcripts into full text
    const fullTranscript = transcriptsResult.rows
      .map(t => `[${t.speaker_role}] ${t.speaker_name}: ${t.content}`)
      .join('\n');
    
    // Update meeting record with full transcript
    await pool.query(
      `UPDATE meeting_records SET transcript = $1 WHERE id = $2`,
      [fullTranscript, id]
    );
    
    console.log(`[Transcription] Stopped for meeting ${id}, ${transcriptsResult.rows.length} segments`);
    
    res.json({
      success: true,
      message: 'Transcription stopped',
      totalSegments: transcriptsResult.rows.length,
      fullTranscript
    });
    
  } catch (error) {
    console.error('[Transcription] Stop error:', error);
    res.status(500).json({ error: 'Failed to stop transcription' });
  }
});

// Get meeting transcript
app.get('/api/meetings/:id/transcript', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM meeting_transcripts 
       WHERE meeting_record_id = $1 OR appointment_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    
    const fullTranscript = result.rows
      .map(t => `[${t.speaker_role}] ${t.speaker_name || 'Unknown'}: ${t.content}`)
      .join('\n');
    
    res.json({
      success: true,
      segments: result.rows,
      fullTranscript,
      totalSegments: result.rows.length
    });
    
  } catch (error) {
    console.error('[Transcript] Get error:', error);
    res.status(500).json({ error: 'Failed to get transcript' });
  }
});

// Generate AI summary from transcript
app.post('/api/meetings/:id/generate-summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'soap' } = req.body;
    
    if (!genAI) {
      return res.status(500).json({ error: 'AI service not configured' });
    }
    
    // Get meeting and transcript
    const meetingResult = await pool.query(
      `SELECT mr.*, u_pat.name_thai as patient_name_thai
       FROM meeting_records mr
       LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
       WHERE mr.id = $1`,
      [id]
    );
    
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const meeting = meetingResult.rows[0];
    
    const transcriptsResult = await pool.query(
      `SELECT * FROM meeting_transcripts WHERE meeting_record_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    
    if (transcriptsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No transcript available' });
    }
    
    const fullTranscript = transcriptsResult.rows
      .map(t => `[${t.speaker_role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย'}]: ${t.content}`)
      .join('\n');
    
    // Generate AI summary using Gemini
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    const prompt = `คุณคือผู้ช่วยแพทย์ที่เชี่ยวชาญในการสรุปการปรึกษาทางการแพทย์

บทสนทนาจากการพบแพทย์:
${fullTranscript}

ชื่อผู้ป่วย: ${meeting.patient_name_thai || 'ไม่ระบุ'}

กรุณาสรุปการปรึกษาในรูปแบบ SOAP Note (ภาษาไทย):

## S - Subjective (อาการที่ผู้ป่วยบอก)
สรุปอาการหลักและประวัติที่ผู้ป่วยแจ้ง

## O - Objective (การตรวจร่างกาย)
สรุปผลการตรวจที่แพทย์พบ (ถ้ามี)

## A - Assessment (การวินิจฉัย)
สรุปการวินิจฉัยหรือข้อสังเกตของแพทย์

## P - Plan (แผนการรักษา)
สรุปแผนการรักษา ยาที่สั่ง และนัดหมายติดตามผล

---

## คำแนะนำสำหรับผู้ป่วย
(สรุปง่ายๆ สำหรับผู้ป่วยนำกลับไปอ่าน)

⚠️ สำคัญ: นี่คือสรุปเบื้องต้นที่ต้องให้แพทย์ตรวจสอบก่อนใช้งาน`;
    
    const result = await model.generateContent(prompt);
    const aiSummary = result.response.text();
    
    // Update meeting record with AI summary
    await pool.query(
      `UPDATE meeting_records 
       SET ai_summary = $1, status = 'completed', ended_at = NOW()
       WHERE id = $2`,
      [aiSummary, id]
    );
    
    console.log(`[AI Summary] Generated for meeting ${id}`);
    
    res.json({
      success: true,
      summary: aiSummary,
      meetingId: id,
      requiresValidation: true,
      message: 'กรุณาตรวจสอบและอนุมัติสรุปก่อนบันทึกลง EMR'
    });
    
  } catch (error) {
    console.error('[AI Summary] Generate error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get AI summary
app.get('/api/meetings/:id/summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT id, ai_summary, ai_recommendations, section_summaries
       FROM meeting_records 
       WHERE id = $1 OR appointment_id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({
      success: true,
      summary: result.rows[0].ai_summary,
      recommendations: result.rows[0].ai_recommendations,
      sections: result.rows[0].section_summaries
    });
    
  } catch (error) {
    console.error('[AI Summary] Get error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// ============================================================================
// SOCKET.IO FOR REAL-TIME TRANSCRIPTION
// ============================================================================

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  socket.on('join-meeting', (meetingId) => {
    socket.join(meetingId);
    console.log(`[Socket] ${socket.id} joined meeting ${meetingId}`);
  });
  
  socket.on('leave-meeting', (meetingId) => {
    socket.leave(meetingId);
    console.log(`[Socket] ${socket.id} left meeting ${meetingId}`);
  });
  
  socket.on('transcript-segment', async (data) => {
    const { meetingId, speakerId, speakerRole, speakerName, content, language, confidence } = data;
    
    try {
      // Save to database
      await pool.query(
        `INSERT INTO meeting_transcripts (
          meeting_record_id, speaker_id, speaker_role, speaker_name, content, language, confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [meetingId, speakerId, speakerRole, speakerName, content, language || 'th', confidence]
      );
      
      // Broadcast to all clients in the meeting
      io.to(meetingId).emit('transcript-update', {
        speakerId,
        speakerRole,
        speakerName,
        content,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Socket] Transcript save error:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const startServer = async () => {
  try {
    // Test database connection (optional for Cloud Run)
    const DB_ENABLED = process.env.DB_HOST && process.env.DB_HOST !== 'localhost';
    if (DB_ENABLED) {
      try {
        await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL connected');
      } catch (dbError) {
        console.warn('⚠️ Database connection failed, running in memory-only mode:', dbError.message);
      }
    } else {
      console.log('ℹ️ Database not configured, running in memory-only mode');
    }
    
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║     🎥 Izara Jitsi Meeting Server                          ║
╠════════════════════════════════════════════════════════════╣
║  Status:     Running                                       ║
║  Port:       ${PORT}                                          ║
║  Jitsi:      ${JITSI_DOMAIN}                               ║
║  AI:         ${genAI ? 'Gemini Ready' : 'Not configured'}                               ║
║  Database:   ${DB_ENABLED ? 'PostgreSQL' : 'In-Memory Mode'}                          ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
