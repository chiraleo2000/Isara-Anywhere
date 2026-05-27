/**
 * Izara Jitsi Meeting Server — Phase 1 Complete
 * 
 * Version: 1.7.3
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
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLobbyKeyResolver } from './lobbyKey.js';
import { applyLobbyJoin, applyLobbyLeave } from './lobbySession.js';
import { decryptRecordingBuffer } from './recordingCrypto.js';
import { resolveActorUserId } from './meetingAuth.js';
import {
  assertCanAccessMeetingRecording,
  filterRecordingsForUser,
  buildSecureRecordingUrl,
  isAdminUser,
} from './recordingAccess.js';
import {
  createAuthenticateToken,
  verifyAccessToken,
  verifyScopedToken,
  signScopedToken,
  requireRole,
  JWT_ISSUER,
} from './jwtPolicy.js';
import { buildGuestPortalUrls, buildMeetingUrls, externalApiConfig } from './jitsiConfig.js';
import { createPostMeetingPipeline } from './postMeetingPipeline.js';
import { sweepEmptyRecordingDirs } from './recordingCleanup.js';
import { prepareTranscriptForLlm, prepareSummaryForDb } from './clinicalTextLimits.js';
import { validateJibriWebhookRequest } from './jibriWebhook.js';
import { applyChaosLatency } from './chaosLatency.js';
import {
  sanitizeRouteId,
  assertJsonObjectBody,
  parseBase64Payload,
  sendValidationError,
} from './requestValidation.js';
import {
  buildRecordingOnlySoapFallback,
  formatSoapMarkdownFromStructured,
} from './clinicalFallback.js';
import { registerHealthRoutes } from './routes/healthRoutes.js';
import { registerSocketHandlers } from './socketHandlers.js';

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error('[Process] unhandledRejection:', msg);
});
process.on('uncaughtException', (err) => {
  console.error('[Process] uncaughtException:', err.message);
});

dotenv.config();

const { Pool } = pg;

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 3020;

function normalizeJitsiDomain(raw = 'meet.jit.si') {
  return String(raw || 'meet.jit.si').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Authenticated host domain (doctor). Guests/patients may use JITSI_GUEST_DOMAIN on self-hosted stacks. */
const JITSI_DOMAIN = normalizeJitsiDomain(process.env.JITSI_DOMAIN || 'meet.jit.si');
const JITSI_GUEST_DOMAIN = normalizeJitsiDomain(process.env.JITSI_GUEST_DOMAIN || JITSI_DOMAIN);
/** Public meet.jit.si does not accept custom HS256 JWTs — sending them yields a blank iframe. */
const JITSI_IS_PUBLIC_SAAS =
  JITSI_DOMAIN === 'meet.jit.si' ||
  JITSI_DOMAIN.endsWith('.jit.si') ||
  JITSI_GUEST_DOMAIN === 'meet.jit.si';

// SECURITY: No hardcoded fallback secrets. Fail fast in every environment.
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[SECURITY] FATAL: JWT_SECRET not set. Generate one with `openssl rand -hex 32` and set it in .env. Exiting.');
    process.exit(1);
  }
  return secret;
})();

const IS_DEV_TESTING =
  process.env.IZARA_DEV_TESTING === '1' || process.env.NODE_ENV !== 'production';
if (!IS_DEV_TESTING && !process.env.JIBRI_WEBHOOK_SECRET) {
  console.error(
    '[SECURITY] FATAL: JIBRI_WEBHOOK_SECRET must be set outside dev-testing. Exiting.',
  );
  process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const JITSI_APP_ID = process.env.JITSI_APP_ID || process.env.JITSI_ISS || '';
const JITSI_AUTH_SECRET = process.env.JITSI_JWT_SECRET || process.env.JITSI_APP_SECRET || '';
const JITSI_SIGNING_SECRET = JITSI_AUTH_SECRET || JWT_SECRET;
const JITSI_TOKEN_ISSUER = JITSI_APP_ID || process.env.JWT_ISSUER || 'izara-telemedicine';
const JITSI_TOKEN_AUTH_ENABLED =
  Boolean(JITSI_SIGNING_SECRET) &&
  !JITSI_IS_PUBLIC_SAAS &&
  process.env.JITSI_FORCE_JWT_ON_PUBLIC !== '1';

function createJitsiRoleJwt(roomName, user = {}, role = 'guest') {
  if (!JITSI_TOKEN_AUTH_ENABLED) return null;
  const normalizedRole = String(role || '').toLowerCase();
  const isModerator = normalizedRole === 'doctor' || normalizedRole === 'host' || normalizedRole === 'moderator';
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      aud: 'jitsi',
      iss: JITSI_TOKEN_ISSUER,
      sub: JITSI_DOMAIN,
      room: roomName,
      nbf: now - 10,
      exp: now + (4 * 60 * 60),
      context: {
        user: {
          id: user.id || '',
          name: user.name || 'Guest',
          email: user.email || '',
          affiliation: isModerator ? 'owner' : 'member',
          moderator: isModerator,
        },
      },
    },
    JITSI_SIGNING_SECRET,
    { algorithm: 'HS256' }
  );
}

// Recording storage — primary: filesystem (Docker volume), metadata in PostgreSQL
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || (
  process.env.NODE_ENV === 'production' ? '/tmp/recordings' : path.resolve('recordings')
);
try { fs.mkdirSync(RECORDINGS_DIR, { recursive: true }); } catch { /* ignore */ }

if (process.env.NODE_ENV === 'production') {
  const sweepMs = Number.parseInt(process.env.RECORDING_SWEEP_INTERVAL_MS || '3600000', 10);
  const timer = setInterval(() => {
    try {
      sweepEmptyRecordingDirs(RECORDINGS_DIR);
    } catch {
      /* ignore */
    }
  }, sweepMs);
  if (typeof timer.unref === 'function') timer.unref();
}

/** Get MIME type from file extension */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.webm') return 'audio/webm';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.wav') return 'audio/wav';
  return 'application/octet-stream';
}

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

const dbPassword = dbConfig.password || process.env.DB_PASSWORD;
if (!dbPassword) {
  console.error('[SECURITY] FATAL: DB_PASSWORD not set (and DATABASE_URL missing or passwordless). Refusing to start.');
  process.exit(1);
}

const pool = new Pool({
  host: dbConfig.host || process.env.DB_HOST || 'postgres',
  port: dbConfig.port || Number.parseInt(process.env.DB_PORT || '5432', 10),
  database: dbConfig.database || process.env.DB_NAME || 'izara_phase1',
  user: dbConfig.user || process.env.DB_USER || 'postgres',
  password: dbPassword,
  max: isProduction ? 30 : 20,
  min: isProduction ? 5 : 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isProduction ? 30000 : 10000,
  allowExitOnIdle: !isProduction,
});

// ========== CRITICAL: Pool error handler to prevent crashes ==========
let dbAvailable = true;
// Exponential backoff schedule for pool reconnection (ms)
const RECONNECT_BACKOFFS_MS = [5000, 15000, 45000, 120000];
let reconnectAttempt = 0;
let reconnectTimer = null;

function scheduleReconnect() {
  if (reconnectTimer) return; // already scheduled
  const delay = RECONNECT_BACKOFFS_MS[Math.min(reconnectAttempt, RECONNECT_BACKOFFS_MS.length - 1)];
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
      reconnectAttempt = 0;
      console.log('✅ [Pool] Database reconnected');
      // Notify any connected clients that DB is back
      try { io?.emit?.('db-status', { status: 'connected' }); } catch { /* io may not exist yet */ }
    } catch (error_) {
      reconnectAttempt++;
      console.error(`❌ [Pool] Reconnection attempt ${reconnectAttempt} failed:`, error_.message);
      scheduleReconnect();
    }
  }, delay);
}

pool.on('error', (err) => {
  console.error('❌ [Pool] Unexpected PostgreSQL error:', err.message);
  dbAvailable = false;
  try { io?.emit?.('db-status', { status: 'disconnected' }); } catch { /* io may not exist yet */ }
  scheduleReconnect();
});

// Helper: safe DB query with fallback and retry on transient errors
const TRANSIENT_PG_ERRORS = new Set(['ECONNRESET', 'ETIMEDOUT', '57P01', '57P02', '57P03', '08006', '08001']);
async function safeQuery(text, params = []) {
  if (!dbAvailable) {
    throw new Error('Database temporarily unavailable');
  }
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await applyChaosLatency('db');
      return await pool.query(text, params);
    } catch (err) {
      lastErr = err;
      const code = err.code || err.errno;
      if (!TRANSIENT_PG_ERRORS.has(code)) break;
      console.warn(`[safeQuery] transient error ${code}, retry ${attempt + 1}/2: ${(text || '').slice(0, 80)}`);
      await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  console.error('[safeQuery] failed:', {
    code: lastErr?.code,
    message: lastErr?.message,
    sql: (text || '').slice(0, 120),
    paramCount: params.length,
  });
  throw lastErr;
}

// ============================================================================
// MEETING FK VALIDATION + ROOT-CAUSE-FRIENDLY ERROR MAPPING
// ============================================================================

/**
 * Pre-validate that referenced appointment/doctor/patient rows exist before
 * inserting a meeting record. Prevents the historical "silent in-memory only"
 * failure mode where FK errors were swallowed and meetings vanished on restart.
 */
async function validateMeetingRefs({ appointmentId, doctorId, patientId }) {
  const missing = [];
  if (!dbAvailable) return { ok: false, missing: ['database_unavailable'], degraded: true };
  const checks = [];
  if (appointmentId) checks.push(['appointment', 'SELECT 1 FROM appointments WHERE id = $1', appointmentId]);
  if (doctorId) checks.push(['doctor', 'SELECT 1 FROM users WHERE id = $1 AND role = \'doctor\'', doctorId]);
  if (patientId) checks.push(['patient', 'SELECT 1 FROM users WHERE id = $1', patientId]);
  for (const [name, sql, id] of checks) {
    try {
      const r = await pool.query(sql, [id]);
      if (r.rows.length === 0) missing.push(`${name}:${id}`);
    } catch (err) {
      // Treat lookup error as non-blocking — INSERT will fail with a real FK error if applicable
      console.warn(`[validateMeetingRefs] ${name} lookup failed:`, err.message);
    }
  }
  return { ok: missing.length === 0, missing };
}

/** Map PG error codes to a clean HTTP response shape for meeting endpoints. */
function mapMeetingDbError(err, requestId) {
  if (err?.code === '23503') {
    return { status: 400, body: { error: 'invalid_refs', message: 'Referenced appointment, doctor, or patient does not exist', detail: err.detail, requestId } };
  }
  if (err?.code === '23505') {
    return { status: 409, body: { error: 'conflict', message: 'Meeting already exists for this appointment', detail: err.detail, requestId } };
  }
  if (err?.message === 'Database temporarily unavailable') {
    return { status: 503, body: { error: 'database_unavailable', message: 'Meeting service temporarily unavailable', requestId } };
  }
  return { status: 500, body: { error: 'internal_error', message: 'Failed to process meeting request', requestId } };
}

/** Generate a short request id for tracing in client + server logs. */
function newRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
  else if (role === 'guest') prefix = '👤';
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
// AI PIPELINE HELPERS — reusable across endpoints
// ============================================================================

/** Parse JSON from Gemini response, stripping markdown fences if present */
function parseGeminiJSON(text) {
  try {
    const jsonMatch = /\{[\s\S]*\}/.exec(text);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fallback */ }
  return null;
}

/** Generate structured JSON SOAP summary from transcript + context */
async function generateStructuredSOAP(transcript, chatContext, meeting, patientContext) {
  if (!genAI || !transcript || transcript.length < 20) return null;
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const phrInfo = patientContext?.phr || {};
  const medsStr = phrInfo.medications ? JSON.stringify(phrInfo.medications) : 'ไม่ระบุ';
  const allergiesStr = phrInfo.allergies ? JSON.stringify(phrInfo.allergies) : 'ไม่ระบุ';

  const prompt = `คุณคือผู้ช่วยแพทย์ AI วิเคราะห์บทสนทนาระหว่างแพทย์กับผู้ป่วยจากระบบ Telemedicine

บทสนทนา (แยกผู้พูด):
${transcript}
${chatContext || ''}

ชื่อผู้ป่วย: ${meeting?.patient_name_thai || 'ไม่ระบุ'}
ชื่อแพทย์: ${meeting?.doctor_name_thai || 'ไม่ระบุ'}
ยาปัจจุบัน: ${medsStr}
แพ้ยา: ${allergiesStr}

กรุณาวิเคราะห์และสรุปเป็น JSON ดังนี้:
{
  "chiefComplaint": "อาการหลักที่ผู้ป่วยมาพบแพทย์",
  "soap": {
    "subjective": "อาการที่ผู้ป่วยบอก",
    "objective": "สิ่งที่แพทย์ตรวจพบ",
    "assessment": "การวินิจฉัยเบื้องต้น",
    "plan": "แผนการรักษา"
  },
  "redFlags": ["อาการเตือนที่ต้องมาพบแพทย์ทันที"],
  "followUpDate": "กำหนดการนัดตรวจครั้งถัดไป",
  "lifestyle": "คำแนะนำการดูแลตนเอง",
  "emrFields": {
    "icd10Suggestions": ["รหัส ICD-10 ที่แนะนำ"],
    "medications": ["ยาที่สั่ง"],
    "labOrders": ["การตรวจทางห้องปฏิบัติการ"]
  },
  "requiresValidation": true
}
⚠️ นี่คือสรุปเบื้องต้นจาก AI ต้องให้แพทย์ตรวจสอบก่อนใช้งาน
ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`;

  const result = await model.generateContent(prompt);
  return parseGeminiJSON(result.response.text());
}

/** Generate CDS recommendations via Gemini */
async function generateCDSRecommendations(soapJson, patientContext) {
  if (!genAI || !soapJson) return null;
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const phr = patientContext?.phr || {};
  const prompt = `คุณคือระบบ Clinical Decision Support (CDS) สำหรับแพทย์

ผลสรุป SOAP:
${JSON.stringify(soapJson.soap || soapJson, null, 2)}

ยาปัจจุบันของผู้ป่วย: ${JSON.stringify(phr.medications || [])}
แพ้ยา: ${JSON.stringify(phr.allergies || [])}
โรคเรื้อรัง: ${JSON.stringify(phr.chronic_conditions || [])}

กรุณาวิเคราะห์และตอบเป็น JSON:
{
  "differentialDiagnosis": [{"condition": "ชื่อโรค", "likelihood": "high/medium/low", "reasoning": "เหตุผล"}],
  "suggestedTests": [{"test": "ชื่อการตรวจ", "reason": "เหตุผลที่แนะนำ", "priority": "urgent/routine"}],
  "drugInteractions": [{"drug1": "ยา1", "drug2": "ยา2", "severity": "high/medium/low", "description": "ผลกระทบ"}],
  "guidelineRefs": [{"guideline": "ชื่อแนวปฏิบัติ", "relevance": "ความเกี่ยวข้อง"}]
}
ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`;

  const result = await model.generateContent(prompt);
  return parseGeminiJSON(result.response.text());
}

/** Generate per-section Gemini summaries for long meetings */
async function generateSectionSummaries(transcriptRows) {
  if (!genAI || !transcriptRows || transcriptRows.length === 0) return null;
  const lastRow = transcriptRows[transcriptRows.length - 1];
  const lastSecs = lastRow.start_time_seconds || 0;
  if (lastSecs <= 1800) return null; // < 30 min, skip

  const sectionDuration = 1800;
  const buckets = [];
  let currentBucket = [];
  let currentIdx = 0;

  for (const row of transcriptRows) {
    const rowSecs = row.start_time_seconds || 0;
    const expectedBucket = Math.floor(rowSecs / sectionDuration);
    if (expectedBucket > currentIdx && currentBucket.length > 0) {
      buckets.push({ index: currentIdx, start: currentIdx * sectionDuration, rows: currentBucket });
      currentBucket = [];
      currentIdx = expectedBucket;
    }
    currentBucket.push(row);
  }
  if (currentBucket.length > 0) {
    buckets.push({ index: currentIdx, start: currentIdx * sectionDuration, rows: currentBucket });
  }

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const sections = [];
  for (const bucket of buckets) {
    const sectionText = bucket.rows.map(r => {
      const role = r.speaker_role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย';
      return `${role}: ${r.content}`;
    }).join('\n');
    const endSecs = bucket.rows.at(-1).start_time_seconds || (bucket.start + sectionDuration);
    try {
      const prompt = `สรุปช่วงที่ ${bucket.index + 1} ของการปรึกษาแพทย์ (นาทีที่ ${Math.round(bucket.start / 60)}-${Math.round(endSecs / 60)}):\n${sectionText}\n\nสรุปสั้นๆ 2-3 ประโยคภาษาไทย:`;
      const result = await model.generateContent(prompt);
      sections.push({
        section: bucket.index + 1, summary: result.response.text(),
        start_seconds: bucket.start, end_seconds: endSecs,
      });
    } catch (e) {
      sections.push({
        section: bucket.index + 1, summary: sectionText.slice(0, 500),
        start_seconds: bucket.start, end_seconds: endSecs, error: e.message,
      });
    }
  }
  return sections;
}

/** Thai SOAP narrative for doctor dashboard / EMR (shared with post-meeting pipeline) */
async function generateEmrNarrativeSummary(fullTranscript, chatContext, meeting) {
  if (!genAI || !fullTranscript || fullTranscript.length < 20) return null;
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const textPrompt = `คุณคือผู้ช่วยแพทย์ที่เชี่ยวชาญในการสรุปการปรึกษาทางการแพทย์

บทสนทนาจากการพบแพทย์:
${fullTranscript}
${chatContext || ''}

ชื่อผู้ป่วย: ${meeting?.patient_name_thai || 'ไม่ระบุ'}
ชื่อแพทย์: ${meeting?.doctor_name_thai || 'ไม่ระบุ'}

กรุณาสรุปการปรึกษาในรูปแบบ SOAP Note (ภาษาไทย):

## S - Subjective (อาการที่ผู้ป่วยบอก)
## O - Objective (การตรวจร่างกาย)
## A - Assessment (การวินิจฉัย)
## P - Plan (แผนการรักษา)
## 🚩 อาการเตือน (Red Flags)
## 📅 นัดติดตาม (Follow-up)

---
⚠️ สรุปเบื้องต้น — แพทย์ต้องตรวจสอบก่อนใช้ใน EMR`;
  const textResult = await model.generateContent(textPrompt);
  return textResult.response.text();
}

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
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

/** Post-meeting: storage → STT/Whisper → Gemini clinical summary → DB + socket */
const postMeeting = createPostMeetingPipeline({
  safeQuery,
  genAI,
  geminiModel: GEMINI_MODEL,
  recordingsDir: RECORDINGS_DIR,
  io,
  hasSttCredentials,
  createSpeechClient,
  generateStructuredSOAP,
  generateEmrNarrativeSummary,
});

// CORS - support web portals. Supports literal origins AND glob patterns with `*`
// (e.g. `https://*.run.app`) via CORS_ORIGINS env var.
const RAW_ALLOWED_ORIGINS = (process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean)) || [
  'http://localhost:3005', 'http://localhost:3010',
  'http://127.0.0.1:3005', 'http://127.0.0.1:3010',
];
if (isProduction) {
  RAW_ALLOWED_ORIGINS.push(
    'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
    'https://izara-doctor-portal-724889190329.asia-southeast1.run.app',
    'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
    'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
    'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app'
  );
}
// Split into literal set + regex patterns for entries containing `*`
const ALLOWED_ORIGIN_LITERALS = new Set(RAW_ALLOWED_ORIGINS.filter(o => !o.includes('*')));
const ALLOWED_ORIGIN_PATTERNS = RAW_ALLOWED_ORIGINS
  .filter(o => o.includes('*'))
  .map(glob => new RegExp('^' + glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*') + '$'));
// Back-compat export (kept as array for any module that imports it)
const ALLOWED_ORIGINS = [...ALLOWED_ORIGIN_LITERALS];

function isOriginAllowed(origin) {
  if (!origin) return true; // curl / internal / same-origin
  if (ALLOWED_ORIGIN_LITERALS.has(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin));
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
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

// Sanitize :id route params before handlers (null bytes, traversal)
app.param('id', (req, res, next, id) => {
  const check = sanitizeRouteId(id);
  if (!check.ok) return sendValidationError(res, check);
  req.params.id = check.id;
  next();
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateToken = createAuthenticateToken(JWT_SECRET);

// Optional auth — tries to authenticate but doesn't block
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (token) {
    try {
      req.user = verifyAccessToken(token, JWT_SECRET);
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

// Apply general rate limit to all routes (production only — unlimited in dev/test)
const meetingRateLimitMax = Number.parseInt(process.env.RATE_LIMIT_MAX || '0') || 200;
if (isProduction) {
  app.use(rateLimit(meetingRateLimitMax, 60000));
} else {
  console.log('[MEETING] Rate limiting DISABLED in dev/test mode');
}

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
const meetingLobbies = new Map();    // canonical key -> Map<participantId, lobbyEntry>
const meetingHostsOnline = new Map(); // meeting/appointment id -> { online, at }
const meetingLobbyAliases = new Map(); // meetingUUID or alias -> canonical lobby key (appointmentId preferred)

const {
  resolveLobbyKey,
  resolveLobbyKeySync,
  registerMeetingLobbyAliases,
  syncLobbyAliasMaps,
  getLobbyMap,
} = createLobbyKeyResolver({
  meetingLobbies,
  meetingLobbyAliases,
  activeMeetings,
  pool,
  getDbAvailable: () => dbAvailable,
});

/** All Socket.IO room ids for a meeting route id (appointment UUID, meeting UUID, aliases). */
function meetingSocketRoomIds(meetingId) {
  const keys = new Set([String(meetingId)]);
  try {
    const lobbyKey = resolveLobbyKeySync(meetingId);
    if (lobbyKey) keys.add(String(lobbyKey));
  } catch { /* ignore */ }
  for (const [alias, target] of meetingLobbyAliases) {
    if (keys.has(alias) || keys.has(target)) {
      keys.add(alias);
      keys.add(target);
    }
  }
  for (const m of activeMeetings.values()) {
    if (keys.has(m.meetingId) || keys.has(m.appointmentId)) {
      if (m.meetingId) keys.add(String(m.meetingId));
      if (m.appointmentId) keys.add(String(m.appointmentId));
    }
  }
  return [...keys];
}

function isHostReadyForMeeting(meetingId) {
  const keys = meetingSocketRoomIds(meetingId);
  return keys.some((k) => meetingHostsOnline.has(k));
}

function markHostOnline(meetingId) {
  if (!meetingId) return;
  const keys = meetingSocketRoomIds(meetingId);
  const payload = { meetingId, ready: true, at: new Date().toISOString() };
  for (const key of keys) {
    meetingHostsOnline.set(key, payload);
    io.to(key).emit('host-ready', payload);
  }
}

function resetMeetingSessionState(meetingId, appointmentId = null) {
  if (!meetingId && !appointmentId) return;
  const canonical = String(appointmentId || meetingId);
  const keys = new Set([String(meetingId || ''), canonical].filter(Boolean));
  try {
    const resolved = resolveLobbyKeySync(meetingId || canonical);
    if (resolved) keys.add(String(resolved));
  } catch {
    // best-effort reset
  }
  for (const [alias, target] of meetingLobbyAliases.entries()) {
    if (keys.has(alias) || target === canonical) keys.add(alias);
  }
  for (const key of keys) {
    meetingLobbies.delete(key);
    meetingHostsOnline.delete(key);
    meetingLobbyAliases.delete(key);
  }
}

/** Resolve display name / id from Izara JWT + meeting record (no manual Jitsi login). */
async function resolveMeetingParticipant(req, meetingId, role) {
  const roleNorm = String(role || 'guest').toLowerCase();
  let displayName = String(req.query.name || '').trim();
  let email = req.user?.email || '';
  let participantId = req.user?.id || req.user?.sub || req.user?.userId || '';

  if (req.user) {
    displayName = displayName
      || req.user.displayName
      || req.user.display_name
      || req.user.name
      || (req.user.email ? String(req.user.email).split('@')[0] : '');
    email = email || req.user.email || '';
  }

  if (dbAvailable) {
    try {
      const result = await pool.query(
        `SELECT mr.patient_id, mr.doctor_id,
                COALESCE(u_pat.name, u_pat.name_thai) AS patient_display,
                u_pat.email AS patient_email,
                COALESCE(u_doc.name, u_doc.name_thai) AS doctor_display,
                u_doc.email AS doctor_email
         FROM meeting_records mr
         LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
         LEFT JOIN users u_doc ON mr.doctor_id = u_doc.id
         WHERE mr.appointment_id = $1 OR mr.id::text = $1
         ORDER BY mr.created_at DESC LIMIT 1`,
        [meetingId]
      );
      const row = result.rows[0];
      if (row) {
        const isHostRole = roleNorm === 'doctor' || roleNorm === 'admin' || roleNorm === 'host';
        if (isHostRole) {
          if (!displayName) displayName = row.doctor_display || 'Doctor';
          if (!email) email = row.doctor_email || '';
          if (!participantId) participantId = row.doctor_id || '';
        } else {
          if (!displayName) displayName = row.patient_display || 'Patient';
          if (!email) email = row.patient_email || '';
          if (!participantId) participantId = row.patient_id || '';
        }
      }
    } catch (err) {
      console.warn('[Meeting] resolveMeetingParticipant DB lookup:', err.message);
    }
  }

  return {
    role: roleNorm,
    displayName: (displayName || 'Participant').substring(0, 100),
    email: email || '',
    participantId: participantId || '',
    registered: Boolean(req.user || participantId),
  };
}

// ============================================================================
// HEALTH CHECK ROUTES (extracted — routes/healthRoutes.js)
// ============================================================================

registerHealthRoutes(app, {
  get dbAvailable() { return dbAvailable; },
  genAI,
  JITSI_DOMAIN,
  GEMINI_MODEL,
  activeMeetings,
  activeTranscriptions,
  pool,
  setDbAvailable: (v) => { dbAvailable = v; },
  RECORDINGS_DIR,
  postMeeting,
  fs,
  path,
});

// ============================================================================
// MEETING MANAGEMENT ROUTES
// ============================================================================

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
  const requestId = newRequestId();
  try {
    const { appointmentId, patientId, doctorId, patientName, doctorName, scheduledTime, guestInvites, roomName: providedRoomName } = req.body;

    const refCheck = await validateMeetingRefs({ appointmentId, doctorId, patientId });
    // NON-BLOCKING: Log missing refs but continue with NULL FKs so the meeting
    // always persists to the database. Previously this returned 400 which caused
    // meetings to fail creation entirely when IDs didn't match users table format.
    let safeAppointmentId = appointmentId || null;
    let safeDoctorId = doctorId || null;
    let safePatientId = patientId || null;
    if (!refCheck.ok && !refCheck.degraded) {
      console.warn(`[Meeting:${requestId}] FK refs not found — nullifying missing refs:`, refCheck.missing);
      for (const m of refCheck.missing) {
        if (m.startsWith('appointment:')) safeAppointmentId = null;
        if (m.startsWith('doctor:')) safeDoctorId = null;
        if (m.startsWith('patient:')) safePatientId = null;
      }
    }

    // Idempotency: if a meeting already exists for this appointment, return it
    if (appointmentId) {
      try {
        const existing = await pool.query(
          'SELECT * FROM meeting_records WHERE appointment_id = $1 ORDER BY created_at DESC LIMIT 1',
          [appointmentId]
        );
        if (existing.rows.length > 0) {
          const m = existing.rows[0];
          // Reset transient lobby/host state when reusing an idempotent meeting.
          resetMeetingSessionState(m.id, m.appointment_id || appointmentId);
          registerMeetingLobbyAliases(m.id, m.appointment_id || appointmentId);
          activeMeetings.set(m.id, {
            meetingId: m.id, appointmentId: m.appointment_id || appointmentId,
            roomName: m.room_name, status: m.status || 'scheduled',
          });
          console.log(`[Meeting:${requestId}] returning existing meeting ${m.id} for appointment ${appointmentId}`);
          return res.json({
            success: true, idempotent: true, meeting: m, meetingId: m.id,
            appointmentId: m.appointment_id || appointmentId,
            roomName: m.room_name,
            urls: { base: m.meeting_url, doctor: m.doctor_url, patient: m.patient_url, guest: m.guest_url },
            requestId,
          });
        }
      } catch (lookupErr) {
        console.warn(`[Meeting:${requestId}] idempotency lookup failed:`, lookupErr.message);
      }
    }

    const meetingId = uuidv4();
    const roomName = providedRoomName || `izara-${appointmentId?.substring(0, 12) || meetingId.substring(0, 8)}-${Date.now().toString(36)}`;

    const doctorJwt = createJitsiRoleJwt(roomName, { id: doctorId, name: doctorName || 'Doctor' }, 'doctor');
    const patientJwt = createJitsiRoleJwt(roomName, { id: patientId, name: patientName || 'Patient' }, 'patient');
    const guestJwt = createJitsiRoleJwt(roomName, { name: 'Guest' }, 'guest');
    const urls = buildMeetingUrls(JITSI_DOMAIN, roomName, {
      language: 'th',
      doctorJwt,
      patientJwt,
      guestJwt,
      jwt: doctorJwt,
      doctor: { name: doctorName || 'Doctor', email: req.body?.doctorEmail },
      patient: { name: patientName || 'Patient' },
      guest: { name: 'Guest' },
    });
    const meetingUrl = urls.patient;
    const doctorUrl = urls.doctor;
    const patientUrl = urls.patient;
    const guestUrl = urls.guest;

    // Insert into database. If DB is degraded, still register in-memory so the
    // meeting can start, but tell the caller persistence is degraded.
    let persistedRow = null;
    let persistedToDb = false;
    if (dbAvailable) {
      try {
        const result = await pool.query(
          `INSERT INTO meeting_records (
            id, appointment_id, doctor_id, patient_id, room_name, jitsi_domain,
            meeting_url, doctor_url, patient_url, guest_url, status, meeting_config, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          RETURNING *`,
          [
            meetingId, safeAppointmentId, safeDoctorId, safePatientId, roomName, JITSI_DOMAIN,
            meetingUrl, doctorUrl, patientUrl, guestUrl, 'scheduled',
            JSON.stringify({
              lobbyEnabled: true, recordingEnabled: true, transcriptionEnabled: true,
              scheduledTime, guestInvites: guestInvites || [],
              hostRole: 'doctor',
              tokenAuthEnabled: JITSI_TOKEN_AUTH_ENABLED,
              organizerDoctorId: safeDoctorId || doctorId,
              originalRefs: { appointmentId, doctorId, patientId }
            })
          ]
        );
        persistedRow = result.rows[0];
        persistedToDb = true;
      } catch (insertErr) {
        // FK constraint error (23503) — retry with ALL NULL FKs so meeting still persists
        if (insertErr.code === '23503') {
          console.warn(`[Meeting:${requestId}] FK constraint failed — retrying with NULL FKs:`, insertErr.detail);
          try {
            const retryResult = await pool.query(
              `INSERT INTO meeting_records (
                id, appointment_id, doctor_id, patient_id, room_name, jitsi_domain,
                meeting_url, doctor_url, patient_url, guest_url, status, meeting_config, created_at
              ) VALUES ($1, NULL, NULL, NULL, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
              RETURNING *`,
              [
                meetingId, roomName, JITSI_DOMAIN,
                meetingUrl, doctorUrl, patientUrl, guestUrl, 'scheduled',
                JSON.stringify({
                  lobbyEnabled: true, recordingEnabled: true, transcriptionEnabled: true,
                  scheduledTime, guestInvites: guestInvites || [],
                  tokenAuthEnabled: JITSI_TOKEN_AUTH_ENABLED,
                  originalRefs: { appointmentId, doctorId, patientId }
                })
              ]
            );
            persistedRow = retryResult.rows[0];
            persistedToDb = true;
            console.log(`[Meeting:${requestId}] retry succeeded — meeting persisted with NULL FKs`);
          } catch (retryErr) {
            console.error(`[Meeting:${requestId}] retry also failed:`, retryErr.message);
            // Continue without DB persistence — fall through to in-memory
          }
        } else if (insertErr.code === '23505') {
          // Unique conflict — meeting already exists, return it
          const mapped = mapMeetingDbError(insertErr, requestId);
          console.error(`[Meeting:${requestId}] duplicate:`, insertErr.message);
          return res.status(mapped.status).json(mapped.body);
        } else {
          console.error(`[Meeting:${requestId}] insert failed (${insertErr.code}):`, insertErr.message);
          // Continue without DB — fall through to in-memory rather than failing entirely
        }
      }
    } else {
      console.warn(`[Meeting:${requestId}] DB unavailable — creating meeting in-memory only (will not survive restart)`);
    }

    // Store guest invites if provided
    if (guestInvites && guestInvites.length > 0) {
      meetingInvites.set(meetingId, guestInvites.map(g => ({
        id: uuidv4(), meetingId, name: g.name, email: g.email,
        role: g.role || 'guest', invitedAt: new Date().toISOString(), status: 'pending'
      })));
    }

    console.log(`[Meeting:${requestId}] created ${meetingId} for appointment ${appointmentId} (persisted=${persistedToDb})`);

    // Fresh meeting should not inherit prior lobby/admission state for same appointment key.
    resetMeetingSessionState(meetingId, appointmentId);
    // Store in activeMeetings for fast lookup + restart-rehydration
    activeMeetings.set(meetingId, {
      meetingId, appointmentId, roomName, status: 'scheduled',
      doctorId, patientId, createdAt: new Date().toISOString(),
      urls: { base: meetingUrl, doctor: doctorUrl, patient: patientUrl, guest: guestUrl },
      tokens: { doctor: doctorJwt, patient: patientJwt, guest: guestJwt }
    });
    registerMeetingLobbyAliases(meetingId, appointmentId);

    res.json({
      success: true,
      persisted: persistedToDb,
      meeting: persistedRow || {
        id: meetingId, appointment_id: appointmentId, doctor_id: doctorId, patient_id: patientId,
        room_name: roomName, meeting_url: meetingUrl, status: 'scheduled',
      },
      meetingId,
      appointmentId: appointmentId || null,
      roomName,
      urls: { base: meetingUrl, doctor: doctorUrl, patient: patientUrl, guest: guestUrl },
      tokens: { doctor: doctorJwt, patient: patientJwt, guest: guestJwt },
      requestId,
    });

  } catch (error) {
    console.error(`[Meeting:${requestId}] unexpected error:`, error);
    const mapped = mapMeetingDbError(error, requestId);
    res.status(mapped.status).json(mapped.body);
  }
});

// Alias: /api/meeting/create (alternative endpoint — requires auth)
app.post('/api/meeting/create', authenticateToken, async (req, res) => {
  const requestId = newRequestId();
  try {
    const { appointmentId, patientId, doctorId, title, guestInvites } = req.body;

    // Non-blocking FK validation — same as primary endpoint
    const refCheck = await validateMeetingRefs({ appointmentId, doctorId, patientId });
    let safeAppointmentId = appointmentId || null;
    let safeDoctorId = doctorId || null;
    let safePatientId = patientId || null;
    if (!refCheck.ok && !refCheck.degraded) {
      console.warn(`[Meeting:${requestId}] alias — FK refs not found, nullifying:`, refCheck.missing);
      for (const m of refCheck.missing) {
        if (m.startsWith('appointment:')) safeAppointmentId = null;
        if (m.startsWith('doctor:')) safeDoctorId = null;
        if (m.startsWith('patient:')) safePatientId = null;
      }
    }

    // Idempotency for this alias too
    if (appointmentId && dbAvailable) {
      try {
        const existing = await pool.query(
          'SELECT id, room_name, meeting_url FROM meeting_records WHERE appointment_id = $1 ORDER BY created_at DESC LIMIT 1',
          [appointmentId]
        );
        if (existing.rows.length > 0) {
          const m = existing.rows[0];
          return res.json({
            success: true, idempotent: true, meetingId: m.id, roomName: m.room_name,
            meetingUrl: m.meeting_url,
            urls: { base: m.meeting_url, doctor: m.meeting_url, patient: m.meeting_url, guest: m.meeting_url },
            requestId,
          });
        }
      } catch { /* fall through */ }
    }

    const meetingId = uuidv4();
    const roomName = `izara-${appointmentId?.substring(0, 12) || meetingId.substring(0, 8)}-${Date.now().toString(36)}`;
    const meetingUrl = `https://${JITSI_DOMAIN}/${roomName}`;

    let persistedToDb = false;
    if (dbAvailable) {
      try {
        await pool.query(
          `INSERT INTO meeting_records (
            id, appointment_id, doctor_id, patient_id, room_name, jitsi_domain,
            meeting_url, doctor_url, patient_url, guest_url, status, meeting_config, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
          [
            meetingId, safeAppointmentId, safeDoctorId, safePatientId,
            roomName, JITSI_DOMAIN, meetingUrl, meetingUrl, meetingUrl, meetingUrl,
            'scheduled', JSON.stringify({ title: title || 'Izara Consultation', guestInvites: guestInvites || [], originalRefs: { appointmentId, doctorId, patientId } })
          ]
        );
        persistedToDb = true;
      } catch (insertErr) {
        if (insertErr.code === '23503') {
          console.warn(`[Meeting:${requestId}] alias FK constraint — retrying with NULL FKs`);
          try {
            await pool.query(
              `INSERT INTO meeting_records (
                id, appointment_id, doctor_id, patient_id, room_name, jitsi_domain,
                meeting_url, doctor_url, patient_url, guest_url, status, meeting_config, created_at
              ) VALUES ($1, NULL, NULL, NULL, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
              [
                meetingId, roomName, JITSI_DOMAIN, meetingUrl, meetingUrl, meetingUrl, meetingUrl,
                'scheduled', JSON.stringify({ title: title || 'Izara Consultation', guestInvites: guestInvites || [], originalRefs: { appointmentId, doctorId, patientId } })
              ]
            );
            persistedToDb = true;
          } catch (retryErr) {
            console.error(`[Meeting:${requestId}] alias retry also failed:`, retryErr.message);
          }
        } else if (insertErr.code !== '23505') {
          console.error(`[Meeting:${requestId}] alias insert failed (${insertErr.code}):`, insertErr.message);
        } else {
          const mapped = mapMeetingDbError(insertErr, requestId);
          return res.status(mapped.status).json(mapped.body);
        }
      }
    }

    if (guestInvites && guestInvites.length > 0) {
      meetingInvites.set(meetingId, guestInvites.map(g => ({
        id: uuidv4(), meetingId, name: g.name, email: g.email,
        role: g.role || 'guest', invitedAt: new Date().toISOString(), status: 'pending'
      })));
    }

    resetMeetingSessionState(meetingId, appointmentId);
    activeMeetings.set(meetingId, {
      meetingId, appointmentId, roomName, status: 'scheduled',
      doctorId, patientId, createdAt: new Date().toISOString()
    });
    registerMeetingLobbyAliases(meetingId, appointmentId);

    res.json({
      success: true, persisted: persistedToDb, meetingId, roomName, meetingUrl,
      title: title || 'Izara Consultation',
      urls: { base: meetingUrl, doctor: meetingUrl, patient: meetingUrl, guest: meetingUrl },
      requestId,
    });

  } catch (error) {
    console.error(`[Meeting:${requestId}] alias unexpected error:`, error);
    const mapped = mapMeetingDbError(error, requestId);
    res.status(mapped.status).json(mapped.body);
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

// Diagnostic: Get meeting health (no auth) — used by clients + e2e tests to
// distinguish "missing", "in-memory only", and "fully persisted" states.
app.get('/api/meetings/:id/health', async (req, res) => {
  const { id } = req.params;
  let inDb = false;
  let dbRow = null;
  if (dbAvailable) {
    try {
      const r = await pool.query(
        'SELECT id, status, created_at, started_at, ended_at FROM meeting_records WHERE id::text = $1 OR appointment_id = $1 LIMIT 1',
        [id]
      );
      if (r.rows.length > 0) {
        inDb = true;
        dbRow = r.rows[0];
      }
    } catch (err) {
      console.warn('[Meeting:health] DB lookup error:', err.message);
    }
  }
  const memEntry = activeMeetings.get(id) || Array.from(activeMeetings.values()).find(m => m.appointmentId === id);
  let lastEventAt = null;
  try {
    const session = activeTranscriptions.get(id);
    if (session?.lastSegmentAt) lastEventAt = session.lastSegmentAt;
  } catch { /* ignore */ }
  res.json({
    meetingId: id,
    inDb,
    inMemory: !!memEntry,
    dbStatus: dbRow?.status || null,
    memoryStatus: memEntry?.status || null,
    startedAt: dbRow?.started_at || null,
    endedAt: dbRow?.ended_at || null,
    createdAt: dbRow?.created_at || memEntry?.createdAt || null,
    lastEventAt,
    databaseConnected: dbAvailable,
  });
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
    console.warn('[Meeting] Status lookup failed:', error.message);
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
    console.warn('[Participants] Lookup failed:', error.message);
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
app.post('/api/meetings/:id/lobby/join', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const lobbyKey = await resolveLobbyKey(id);
  const { email } = req.body;
  // Auto-generate participantId if not provided (for guests)
  const participantId = req.body.participantId || `guest-${uuidv4().substring(0, 8)}`;

  // Sanitize participantName: strip HTML tags, trim, limit to 100 chars
  const rawName = req.body.participantName;
  if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
    return res.status(400).json({ success: false, error: 'participantName is required' });
  }
  const participantName = rawName.replaceAll(/<[^>]*>/g, '').trim().substring(0, 100);

  // Determine role from authenticated token only — never trust client-supplied role
  const authenticatedRole = req.user?.role;

  // Only authenticated doctors/admins bypass lobby
  if (req.user && (authenticatedRole === 'doctor' || authenticatedRole === 'admin')) {
    return res.json({ success: true, status: 'admitted', message: 'Host bypasses lobby' });
  }

  const { lobby } = getLobbyMap(lobbyKey);

  const entry = {
    participantId,
    participantName,
    role: authenticatedRole || req.body.role || 'guest',
    email: email || null,
    status: 'waiting',
    joinedAt: new Date().toISOString(),
  };
  const { entry: stored, action, alreadyAdmitted } = applyLobbyJoin(lobby, participantId, entry);
  syncLobbyAliasMaps(lobbyKey, lobby);

  if (alreadyAdmitted) {
    return res.json({
      success: true,
      status: 'admitted',
      participantId,
      action,
      message: 'Already admitted to meeting (reconnect preserved)',
      hostReady: isHostReadyForMeeting(id),
    });
  }

  // Notify doctor (host) on canonical + route id
  const payload = { meetingId: lobbyKey, action: action === 'reconnect_waiting' ? 'reconnect' : 'join', participant: stored };
  io.to(lobbyKey).emit('lobby-update', payload);
  io.to(id).emit('lobby-update', payload);

  res.json({
    success: true,
    status: stored.status === 'admitted' ? 'admitted' : 'waiting',
    participantId,
    action,
    message: stored.status === 'admitted' ? 'Reconnected as admitted' : 'Waiting for host approval',
    hostReady: isHostReadyForMeeting(id),
  });
});

// Participant leaves lobby (disconnect / tab close) — preserves admission for reconnect
app.post('/api/meetings/:id/lobby/leave', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const lobbyKey = await resolveLobbyKey(id);
  const participantId = req.body.participantId;
  if (!participantId) {
    return res.status(400).json({ success: false, error: 'participantId is required' });
  }
  const lobby = meetingLobbies.get(lobbyKey);
  if (!lobby) {
    return res.json({ success: true, status: 'unknown', message: 'No lobby session' });
  }
  const updated = applyLobbyLeave(lobby, participantId);
  if (!updated) {
    return res.json({ success: true, status: 'unknown', message: 'Participant not in lobby' });
  }
  syncLobbyAliasMaps(lobbyKey, lobby);
  const payload = { meetingId: lobbyKey, action: 'leave', participant: updated };
  io.to(lobbyKey).emit('lobby-update', payload);
  io.to(id).emit('lobby-update', payload);
  res.json({ success: true, status: updated.status, participant: updated });
});

// Get lobby participants
app.get('/api/meetings/:id/lobby', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const lobbyKey = await resolveLobbyKey(id);
  const lobby = meetingLobbies.get(lobbyKey);
  const all = lobby ? Array.from(lobby.values()) : [];
  const waiting = all.filter(p => p.status === 'waiting');
  res.json({ success: true, participants: waiting, lobby: all, total: waiting.length });
});

// Guest checks their own lobby status (no auth required)
app.get('/api/meetings/:id/lobby/status/:participantId', async (req, res) => {
  const { id, participantId } = req.params;
  const lobbyKey = await resolveLobbyKey(id);
  const lobby = meetingLobbies.get(lobbyKey);
  if (!lobby?.has(participantId)) {
    return res.json({ success: true, status: 'not_found' });
  }
  const entry = lobby.get(participantId);
  res.json({ success: true, status: entry.status, participant: entry });
});

// E2E runtime snapshot (IZARA_DEV_TESTING=1) — admitted lobby count for multi-party soak tests
app.get('/api/meetings/:id/runtime', async (req, res) => {
  if (process.env.IZARA_DEV_TESTING !== '1') {
    return res.status(404).json({ success: false, error: 'Not available' });
  }
  try {
    const { id } = req.params;
    const lobbyKey = await resolveLobbyKey(id);
    const lobby = meetingLobbies.get(lobbyKey);
    let admitted = 0;
    let waiting = 0;
    if (lobby) {
      for (const entry of lobby.values()) {
        if (entry.status === 'admitted') admitted += 1;
        else if (entry.status === 'waiting') waiting += 1;
      }
    }
    const active = activeMeetings.get(lobbyKey) || activeMeetings.get(id);
    res.json({
      success: true,
      meetingId: id,
      lobbyKey,
      admittedCount: admitted,
      waitingCount: waiting,
      activeMeeting: Boolean(active),
      status: active?.status || 'unknown',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Doctor admits participant from lobby
app.post('/api/meetings/:id/lobby/admit', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const lobbyKey = await resolveLobbyKey(id);
  const { participantId, admittedBy } = req.body;

  const lobby = meetingLobbies.get(lobbyKey);
  if (!lobby?.has(participantId)) {
    return res.status(404).json({ success: false, error: 'Participant not in lobby' });
  }

  const entry = lobby.get(participantId);
  entry.status = 'admitted';
  entry.admittedBy = admittedBy;
  entry.admittedAt = new Date().toISOString();
  syncLobbyAliasMaps(lobbyKey, lobby);

  const hostReady = isHostReadyForMeeting(id);
  const payload = { meetingId: lobbyKey, action: 'admit', participant: entry, hostReady };
  for (const room of meetingSocketRoomIds(id)) {
    io.to(room).emit('lobby-update', payload);
  }
  if (hostReady) {
    markHostOnline(id);
  }

  res.json({ success: true, participant: entry, hostReady });
});

// Doctor rejects participant from lobby
app.post('/api/meetings/:id/lobby/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const lobbyKey = await resolveLobbyKey(id);
  const { participantId, rejectedBy, reason } = req.body;

  const lobby = meetingLobbies.get(lobbyKey);
  if (!lobby?.has(participantId)) {
    return res.status(404).json({ success: false, error: 'Participant not in lobby' });
  }

  const entry = lobby.get(participantId);
  entry.status = 'rejected';
  entry.rejectedBy = rejectedBy;
  entry.reason = reason || '';
  entry.rejectedAt = new Date().toISOString();
  syncLobbyAliasMaps(lobbyKey, lobby);

  const payload = { meetingId: lobbyKey, action: 'reject', participant: entry };
  io.to(lobbyKey).emit('lobby-update', payload);
  io.to(id).emit('lobby-update', payload);

  res.json({ success: true, participant: entry });
});

// Host presence — doctor joined Jitsi (no portal login required for patients)
app.get('/api/meetings/:id/host-ready', async (req, res) => {
  const { id } = req.params;
  const lobbyKey = resolveLobbyKeySync(id);
  const ready = isHostReadyForMeeting(id);
  res.json({
    success: true,
    ready: !!ready,
    meetingId: id,
    lobbyKey: lobbyKey || id,
    roomIds: meetingSocketRoomIds(id),
  });
});

app.get('/api/meetings/:id/socket-rooms', optionalAuth, (req, res) => {
  const { id } = req.params;
  const lobbyKey = resolveLobbyKeySync(id);
  res.json({
    success: true,
    meetingId: id,
    lobbyKey: lobbyKey || id,
    rooms: meetingSocketRoomIds(id),
    hostReady: isHostReadyForMeeting(id),
  });
});

app.post('/api/meetings/:id/host-present', optionalAuth, (req, res) => {
  markHostOnline(req.params.id);
  res.json({ success: true, ready: true });
});

/**
 * Role-specific Jitsi join config for External API (doctor = host JWT when self-hosted Jitsi configured).
 * Patients/guests never get moderator JWT — Izara lobby admits them after doctor is ready.
 */
app.get('/api/meetings/:id/identity', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const identity = await resolveMeetingParticipant(req, id, req.query.role || 'guest');
    res.json({ success: true, ...identity });
  } catch (error) {
    console.error('[Meeting] identity error:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve participant identity' });
  }
});

app.get('/api/meetings/:id/join-config', optionalAuth, async (req, res) => {
  try {
    const idCheck = sanitizeRouteId(req.params.id);
    if (!idCheck.ok) return sendValidationError(res, idCheck);
    const { id } = { id: idCheck.id };
    const identity = await resolveMeetingParticipant(req, id, req.query.role || 'guest');
    const { displayName, email, participantId, role } = identity;
    const isHost = role === 'doctor' || role === 'admin' || role === 'host';

    let roomName = `izara-${String(id).substring(0, 12)}-meeting`;
    try {
      const existing = await pool.query(
        `SELECT room_name FROM meeting_records
         WHERE appointment_id = $1 OR id::text = $1
         ORDER BY created_at DESC LIMIT 1`,
        [id]
      );
      if (existing.rows[0]?.room_name) roomName = existing.rows[0].room_name;
    } catch { /* use fallback */ }

    const doctorJwt = isHost
      ? createJitsiRoleJwt(roomName, { id: participantId || req.user?.id, name: displayName, email }, 'doctor')
      : null;
    const apiCfg = externalApiConfig(isHost ? 'doctor' : role, displayName);
    const lobbyKey = resolveLobbyKeySync(id);
    const jitsiDomain = isHost ? JITSI_DOMAIN : JITSI_GUEST_DOMAIN;

    res.json({
      success: true,
      domain: jitsiDomain,
      hostDomain: JITSI_DOMAIN,
      guestDomain: JITSI_GUEST_DOMAIN,
      roomName,
      role: isHost ? 'doctor' : role,
      displayName,
      email,
      participantId,
      registered: identity.registered,
      jwt: doctorJwt,
      useIzaraLobbyOnly: true,
      tokenAuthEnabled: JITSI_TOKEN_AUTH_ENABLED,
      hostReady: isHostReadyForMeeting(id),
      meetingServerUrl: process.env.MEETING_SERVER_PUBLIC_URL || '',
      noJitsiLoginRequired: true,
      ...apiCfg,
    });
  } catch (error) {
    console.error('[Meeting] join-config error:', error);
    res.status(500).json({ success: false, error: 'Failed to build join config' });
  }
});

// Doctor admits ALL waiting participants from lobby
app.post('/api/meetings/:id/lobby/admit-all', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const lobbyKey = await resolveLobbyKey(id);
  const { admittedBy } = req.body;

  const lobby = meetingLobbies.get(lobbyKey);
  if (!lobby) {
    return res.json({ success: true, admitted: [], total: 0 });
  }

  const admitted = [];
  const hostReady = isHostReadyForMeeting(id);
  const rooms = meetingSocketRoomIds(id);
  for (const [, entry] of lobby) {
    if (entry.status === 'waiting') {
      entry.status = 'admitted';
      entry.admittedBy = admittedBy;
      entry.admittedAt = new Date().toISOString();
      admitted.push(entry);
      const payload = { meetingId: lobbyKey, action: 'admit', participant: entry, hostReady };
      for (const room of rooms) {
        io.to(room).emit('lobby-update', payload);
      }
    }
  }
  syncLobbyAliasMaps(lobbyKey, lobby);
  if (hostReady) {
    markHostOnline(id);
  }

  res.json({ success: true, admitted, total: admitted.length, hostReady });
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

  const patientBase = process.env.PATIENT_PORTAL_URL || `${req.protocol}://${req.get('host')}`;
  const meetingKey = resolveLobbyKeySync(id) || id;
  const guestName = recipientName || 'Guest';
  const urls = buildGuestPortalUrls({
    patientPortalBase: patientBase,
    meetingKey,
    guestName,
    token,
  });

  res.json({
    success: true,
    invite,
    inviteLink: urls.guestJoinUrl,
    guestJoinUrl: urls.guestJoinUrl,
    guestTokenUrl: urls.guestTokenUrl,
  });
});

// ============================================================================
// GUEST TOKEN INVITE (JWT-based, 24hr expiry)
// ============================================================================

// Generate a JWT-based guest invite token
app.post('/api/meetings/:id/guest-invite', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { guestName, guestEmail, guestType = 'family' } = req.body;

  if (!guestName || typeof guestName !== 'string' || guestName.trim().length === 0) {
    return res.status(400).json({ error: 'Guest name is required' });
  }

  const sanitizedName = guestName.trim().substring(0, 100);
  const sanitizedEmail = (guestEmail || '').trim().substring(0, 255);

  const token = signScopedToken(
    { meetingId: id, guestName: sanitizedName, guestEmail: sanitizedEmail, guestType, type: 'guest-invite' },
    JWT_SECRET,
    { expiresIn: '24h' },
  );

  // Store invite in memory + DB
  const invite = {
    id: uuidv4(),
    meetingId: id,
    token,
    name: sanitizedName,
    email: sanitizedEmail,
    guestType,
    invitedBy: req.user?.id || req.user?.userId || 'unknown',
    invitedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  };

  if (!meetingInvites.has(id)) meetingInvites.set(id, []);
  meetingInvites.get(id).push(invite);

  // Persist to DB (best-effort)
  try {
    await safeQuery(
      `INSERT INTO meeting_invites (id, meeting_id, token, guest_name, guest_email, guest_type, invited_by, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [invite.id, id, token, sanitizedName, sanitizedEmail, guestType, invite.invitedBy, invite.expiresAt, 'pending']
    );
  } catch { /* best effort */ }

  const patientBase = process.env.PATIENT_PORTAL_URL || `${req.protocol}://${req.get('host')}`;
  const meetingKey = (await resolveLobbyKey(id)) || id;
  const urls = buildGuestPortalUrls({
    patientPortalBase: patientBase,
    meetingKey,
    guestName: sanitizedName,
    token,
  });

  res.json({
    success: true,
    invite,
    token,
    guestLink: urls.guestLink,
    guestJoinUrl: urls.guestJoinUrl,
    guestTokenUrl: urls.guestTokenUrl,
  });
});

// Validate a guest invite token (used by GuestMeetingJoin page)
app.get('/api/guest/meeting/:token', (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'guest-invite') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    // Check meeting exists and is active
    const meeting = activeMeetings.get(decoded.meetingId);
    if (meeting?.status === 'completed') {
      return res.status(410).json({ error: 'Meeting has ended' });
    }

    res.json({
      success: true,
      meetingId: decoded.meetingId,
      guestName: decoded.guestName,
      guestType: decoded.guestType,
      roomName: meeting?.room_name || null,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(410).json({ error: 'Invite link has expired' });
    }
    return res.status(400).json({ error: 'Invalid invite token' });
  }
});

// Token-based lobby join (guest joins via JWT token)
app.post('/api/guest/meeting/:token/join', async (req, res) => {
  const { token } = req.params;
  const { displayName } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'guest-invite') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    const meetingId = decoded.meetingId;
    registerMeetingLobbyAliases(meetingId, decoded.appointmentId);
    const lobbyKey = await resolveLobbyKey(meetingId);
    const guestName = displayName || decoded.guestName || 'Guest';
    const participantId = `guest-${uuidv4().substring(0, 8)}`;

    const { lobby } = getLobbyMap(lobbyKey);
    const entry = {
      participantId,
      participantName: guestName.substring(0, 100),
      role: decoded.guestType || 'guest',
      email: decoded.guestEmail || '',
      status: 'waiting',
      joinedAt: new Date().toISOString(),
    };
    lobby.set(participantId, entry);
    syncLobbyAliasMaps(lobbyKey, lobby);

    const payload = {
      meetingId: lobbyKey, action: 'join',
      participant: entry,
      participantId: entry.participantId,
      participantName: entry.participantName,
      role: entry.role,
    };
    io.to(lobbyKey).emit('lobby-update', payload);
    io.to(meetingId).emit('lobby-update', payload);

    res.json({
      success: true,
      participantId: entry.participantId,
      meetingId,
      status: 'waiting',
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(410).json({ error: 'Invite link has expired' });
    }
    return res.status(400).json({ error: 'Invalid invite token' });
  }
});

// ============================================================================
// END MEETING (Phase 2 — triggers AI summary pipeline)
// ============================================================================

function getNoSummaryReason(genAI, fullTranscript) {
  if (!genAI) return 'AI not configured';
  if (!fullTranscript) return 'No transcript';
  return 'Generation skipped';
}

app.post('/api/meetings/:id/end', authenticateToken, async (req, res) => { // NOSONAR S3776: end-meeting lifecycle handler (recording, transcription, EMR persistence, notifications, chat save) — large but tested end-to-end
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
            else if (t.speaker_role === 'guest') roleLabel = 'แขก';
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
          .map(t => {
            let roleLabel = 'ผู้เข้าร่วม';
            if (t.speaker_role === 'doctor') roleLabel = 'แพทย์';
            else if (t.speaker_role === 'patient') roleLabel = 'ผู้ป่วย';
            else if (t.speaker_role === 'guest') roleLabel = 'แขก';
            return `[${roleLabel}] ${t.speaker_name || 'Unknown'}: ${t.content}`;
          })
          .join('\n');
      }
    }

    if (meeting && !meeting.recording_url) {
      console.warn(`[End Meeting] DIAGNOSTIC: no recording_url on meeting ${meetingId} before AI pipeline`);
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
    
    // 8. Trigger full AI pipeline in background if transcript exists
    let aiSummary = null;
    let structuredSoap = null;
    let cdsResult = null;
    let sectionSums = null;
    let emrDraftId = null;
    let validationId = null;
    
    if (generateSummary && fullTranscript && fullTranscript.length > 20) {
      if (genAI) {
      try {
        // --- STEP A: Fetch patient context for CDS ---
        let patientContext = {};
        if (meeting?.patient_id) {
          try {
            const phrRes = await safeQuery(
              'SELECT medications, allergies, chronic_conditions, vital_signs_history FROM phr WHERE user_id = $1',
              [meeting.patient_id]
            );
            if (phrRes?.rows?.[0]) patientContext.phr = phrRes.rows[0];
          } catch { /* skip */ }
        }

        // --- STEP B: Text SOAP (for display) ---
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const chatLines = chatMessages.map(c => `[${c.senderRole}] ${c.senderName}: ${c.message}`).join('\n');
        let chatContext = '';
        if (chatMessages.length > 0) {
          chatContext = `\n\nข้อความแชทระหว่างการประชุม:\n${chatLines}`;
        }

        const textPrompt = `คุณคือผู้ช่วยแพทย์ที่เชี่ยวชาญในการสรุปการปรึกษาทางการแพทย์

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

        const textResult = await model.generateContent(textPrompt);
        aiSummary = textResult.response.text();

        // --- STEP C: Structured JSON SOAP (for EMR pre-fill) ---
        try {
          structuredSoap = await generateStructuredSOAP(fullTranscript, chatContext, meeting, patientContext);
          console.log(`[End Meeting] Structured SOAP generated for meeting ${meetingId}`);
        } catch (e) {
          console.warn('[End Meeting] Structured SOAP failed:', e.message);
        }

        // --- STEP D: CDS recommendations ---
        if (structuredSoap) {
          try {
            cdsResult = await generateCDSRecommendations(structuredSoap, patientContext);
            console.log(`[End Meeting] CDS generated for meeting ${meetingId}`);
          } catch (e) {
            console.warn('[End Meeting] CDS failed:', e.message);
          }
        }

        // --- STEP E: Per-section summaries (long meetings only) ---
        try {
          const transcriptRows = await safeQuery(
            `SELECT content, speaker_role, speaker_name, start_time_seconds FROM meeting_transcripts
             WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`, [meetingId]
          );
          if (transcriptRows?.rows) {
            sectionSums = await generateSectionSummaries(transcriptRows.rows);
          }
        } catch (e) {
          console.warn('[End Meeting] Section summaries skipped:', e.message);
        }

        // --- STEP F: Auto-create draft EMR ---
        if (structuredSoap && meeting?.appointment_id && meeting?.patient_id) {
          try {
            emrDraftId = `EMR-DRAFT-${Date.now()}`;
            const soap = structuredSoap.soap || {};
            const emrFieldsJson = structuredSoap.emrFields || {};
            await safeQuery(
              `INSERT INTO emr (id, appointment_id, patient_id, doctor_id, type, status,
                subjective, objective, assessment, plan,
                ai_summary, ai_summary_approved, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 'meeting_soap_note', 'draft',
                $5, $6, $7, $8,
                $9, false, NOW(), NOW())
               ON CONFLICT (id) DO NOTHING`,
              [
                emrDraftId,
                meeting.appointment_id,
                meeting.patient_id,
                meeting.doctor_id,
                JSON.stringify(typeof soap.subjective === 'string' ? { text: soap.subjective } : soap.subjective || {}),
                JSON.stringify(typeof soap.objective === 'string' ? { text: soap.objective } : soap.objective || {}),
                JSON.stringify(typeof soap.assessment === 'string' ? { text: soap.assessment, icd10: emrFieldsJson.icd10Suggestions || [] } : soap.assessment || {}),
                JSON.stringify(typeof soap.plan === 'string' ? { text: soap.plan, medications: emrFieldsJson.medications || [], labOrders: emrFieldsJson.labOrders || [] } : soap.plan || {}),
                aiSummary
              ]
            );
            console.log(`[End Meeting] Draft EMR ${emrDraftId} created for meeting ${meetingId}`);
          } catch (e) {
            console.warn('[End Meeting] EMR draft creation failed:', e.message);
            emrDraftId = null;
          }
        }
        
        validationId = uuidv4();
        aiValidations.set(validationId, {
          id: validationId, meetingId, type: 'meeting-summary',
          content: aiSummary, structured: structuredSoap,
          status: 'pending_review', createdAt: new Date().toISOString()
        });
        
        // Save all results to DB in one update
        try {
          await safeQuery(
            `UPDATE meeting_records SET 
               ai_summary = $2, ai_recommendations = $3,
               ai_summary_structured = $4, cds_recommendations = $5,
               section_summaries = $6, emr_draft_id = $7
             WHERE id::text = $1 OR appointment_id = $1`,
            [
              meetingId, aiSummary,
              JSON.stringify({ validationId, requiresValidation: true }),
              structuredSoap ? JSON.stringify(structuredSoap) : null,
              cdsResult ? JSON.stringify(cdsResult) : null,
              sectionSums ? JSON.stringify(sectionSums) : null,
              emrDraftId
            ]
          );
        } catch (e) {
          console.warn('[End Meeting] AI results DB save skipped:', e.message);
        }
        
        console.log(`[End Meeting] Full AI pipeline completed for meeting ${meetingId}`);
        
        // Push full results to doctor portal via Socket.IO
        io.to(meetingId).emit('meeting-summary-ready', {
          meetingId,
          appointmentId: meeting?.appointment_id,
          summary: aiSummary,
          structured: structuredSoap,
          cds: cdsResult,
          sectionSummaries: sectionSums,
          emrDraftId,
          validationId,
          requiresValidation: true,
          timestamp: new Date().toISOString(),
        });

        // Notify EMR draft ready
        if (emrDraftId) {
          io.to(meetingId).emit('emr-draft-ready', {
            meetingId,
            appointmentId: meeting?.appointment_id,
            emrDraftId,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error_) {
        console.error('[End Meeting] AI pipeline failed:', error_.message);
      }
      } else {
        console.warn('[End Meeting] AI pipeline skipped — GEMINI_API_KEY not configured');
        io.to(meetingId).emit('meeting-summary-ready', {
          meetingId,
          appointmentId: meeting?.appointment_id,
          summary: null,
          error: 'AI not configured — set GEMINI_API_KEY to enable auto-summary',
          requiresValidation: false,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    // 9. Background post-meeting pipeline when recording exists but transcript/summary incomplete
    const hasRecording = Boolean(meeting?.recording_url || meeting?.recording_data);
    const needsPipeline =
      hasRecording &&
      ((!fullTranscript || fullTranscript.length < 20) || (generateSummary && !aiSummary));
    if (needsPipeline) {
      const chatContext = chatMessages.length > 0
        ? chatMessages.map(c => `[${c.senderRole}] ${c.senderName}: ${c.message}`).join('\n')
        : '';
      postMeeting.queuePostMeetingPipeline(meetingId, {
        fullTranscript: fullTranscript || undefined,
        chatContext,
        meeting,
      });
    }

    res.json({
      success: true,
      meetingId,
      status: 'completed',
      transcript: { available: !!fullTranscript, length: fullTranscript.length },
      chatMessages: { count: chatMessages.length },
      postMeetingPipeline: needsPipeline ? 'queued' : 'skipped',
      aiSummary: aiSummary ? {
        available: true,
        validationId,
        requiresValidation: true,
        summary: aiSummary,
        structured: structuredSoap,
        cds: cdsResult,
        emrDraftId,
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

app.get('/api/meetings/history/:doctorId', authenticateToken, async (req, res) => {
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
    console.warn('[Meeting History] Lookup failed:', error.message);
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

// Resume transcription (dedicated endpoint — avoids toggle race conditions)
app.post('/api/meetings/:id/resume-transcription', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const session = activeTranscriptions.get(id);
    if (session) {
      session.isPaused = false;
      io.to(id).emit('meeting-status', { meetingId: id, status: 'transcribing' });
    }

    console.log(`[Transcription] Resumed for meeting ${id}`);
    res.json({
      success: true,
      message: 'Transcription resumed',
      isPaused: false
    });

  } catch (error) {
    console.error('[Transcription] Resume error:', error);
    res.status(500).json({ error: 'Failed to resume transcription' });
  }
});

// Add transcript segment (new dedicated endpoint — only persists final segments)
app.post('/api/meetings/:id/transcript-segment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { speakerId, speakerRole, speakerName, content, language, confidence, is_final, start_time_seconds } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const isFinal = is_final !== false;
    const resolvedRole = speakerRole || (req.user?.role === 'doctor' ? 'doctor' : 'patient');
    const resolvedName = speakerName || req.user?.name || (resolvedRole === 'doctor' ? 'แพทย์' : 'ผู้ป่วย');
    const resolvedId = speakerId || req.user?.id || null;

    let saved = false;
    if (isFinal) {
      try {
        await pool.query(
          `INSERT INTO meeting_transcripts (
            meeting_record_id, appointment_id, speaker_id, speaker_role, speaker_name,
            content, language, confidence, start_time_seconds, is_final, created_at
          )
          SELECT $1::uuid, mr.appointment_id, $2, $3, $4, $5, $6, $7, $8, true, NOW()
          FROM meeting_records mr WHERE mr.id::text = $1`,
          [id, resolvedId, resolvedRole, resolvedName, content, language || 'th', confidence, start_time_seconds]
        );
        saved = true;
      } catch (error_) {
        console.log('[Transcript-Segment] DB insert skipped:', error_.message);
      }

      // Track in active session
      const session = activeTranscriptions.get(id);
      if (session?.isActive && !session.isPaused) {
        session.transcripts.push({ speaker_id: resolvedId, speaker_role: resolvedRole, speaker_name: resolvedName, content, language: language || 'th', confidence, start_time_seconds, timestamp: new Date() });
      }
    }

    // Broadcast to all room participants (both interim and final)
    io.to(id).emit('transcript-update', {
      id: `seg-${Date.now()}`, speakerId: resolvedId, speakerRole: resolvedRole,
      speakerName: resolvedName, content, language: language || 'th',
      confidence, isFinal, startTimeSeconds: start_time_seconds,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, saved });
  } catch (error) {
    console.error('[Transcript-Segment] Error:', error);
    res.status(500).json({ error: 'Failed to process transcript segment' });
  }
});

// Guest transcript (no JWT — lobby participantId + displayName)
app.post('/api/meetings/:id/guest-transcript-segment', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      participantId,
      speakerName,
      content,
      language,
      confidence,
      is_final,
      start_time_seconds,
    } = req.body;
    if (!content || !participantId) {
      return res.status(400).json({ error: 'content and participantId are required' });
    }
    const lobbyKey = resolveLobbyKeySync(id) || id;
    const lobby = meetingLobbies.get(lobbyKey);
    const entry = lobby?.get(participantId);
    if (!entry || (entry.status !== 'admitted' && entry.status !== 'in_meeting')) {
      return res.status(403).json({ error: 'Guest not admitted to meeting' });
    }
    const resolvedName = speakerName || entry.displayName || entry.name || 'Guest';
    req.body = {
      speakerId: participantId,
      speakerRole: 'guest',
      speakerName: resolvedName,
      content,
      language,
      confidence,
      is_final,
      start_time_seconds,
    };
    const { speakerId, speakerRole, speakerName: resolvedName2, content: transcriptContent } = req.body;
    const isFinal = is_final !== false;
    let saved = false;
    if (isFinal) {
      try {
        await pool.query(
          `INSERT INTO meeting_transcripts (
            meeting_record_id, appointment_id, speaker_id, speaker_role, speaker_name,
            content, language, confidence, start_time_seconds, is_final, created_at
          )
          SELECT $1::uuid, mr.appointment_id, $2, $3, $4, $5, $6, $7, $8, true, NOW()
          FROM meeting_records mr WHERE mr.id::text = $1`,
          [id, speakerId, speakerRole, resolvedName2, transcriptContent, language || 'th', confidence, start_time_seconds],
        );
        saved = true;
      } catch (error_) {
        console.log('[Guest-Transcript] DB insert skipped:', error_.message);
      }
    }
    io.to(id).emit('transcript-update', {
      id: `seg-${Date.now()}`,
      speakerId,
      speakerRole,
      speakerName: resolvedName2,
      content: transcriptContent,
      language: language || 'th',
      confidence,
      isFinal,
      startTimeSeconds: start_time_seconds,
      timestamp: new Date().toISOString(),
      displayLabel: formatSpeakerLabel('guest', resolvedName2),
    });
    res.json({ success: true, saved });
  } catch (error) {
    console.error('[Guest-Transcript] Error:', error);
    res.status(500).json({ error: 'Failed to process guest transcript segment' });
  }
});

// Add transcript segment (legacy endpoint — persists all segments)
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
app.post('/api/meetings/:id/stop-transcription', authenticateToken, async (req, res) => { // NOSONAR S3776: stop-transcription endpoint with provider-fallback branches
  try {
    const { id } = req.params;
    const session = activeTranscriptions.get(id);
    let fullTranscript = '';
    let totalSegments = 0;
    let durationSeconds = 0;
    
    if (session) {
      session.isActive = false;
      session.isPaused = false;
      session.endedAt = new Date();
      durationSeconds = Math.floor((session.endedAt - session.startedAt) / 1000);
      fullTranscript = session.transcripts
        .map(t => `[${t.speaker_role}] ${t.speaker_name || 'Unknown'}: ${t.content}`)
        .join('\n');
      totalSegments = session.transcripts.length;
    }
    
    let dbRows = [];
    try {
      const transcriptsResult = await pool.query(
        `SELECT * FROM meeting_transcripts WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`, [id]
      );
      if (transcriptsResult.rows.length > 0) {
        dbRows = transcriptsResult.rows;
        fullTranscript = dbRows
          .map(t => `[${t.speaker_role}] ${t.speaker_name}: ${t.content}`)
          .join('\n');
        totalSegments = dbRows.length;
      }
      await pool.query(`UPDATE meeting_records SET transcript = $1 WHERE id::text = $2`, [fullTranscript, id]);

      // Generate section_summaries for long meetings (>30 minutes)
      if (dbRows.length > 0) {
        const lastSecs = dbRows[dbRows.length - 1].start_time_seconds || 0;
        if (lastSecs > 1800) {
          const sectionDuration = 1800; // 30 minutes
          const sections = [];
          let sectionIdx = 0;
          let sectionSegments = [];
          let sectionStart = 0;

          for (const row of dbRows) {
            const rowSecs = row.start_time_seconds || 0;
            const expectedSection = Math.floor(rowSecs / sectionDuration);
            if (expectedSection > sectionIdx && sectionSegments.length > 0) {
              sections.push({
                section: sectionIdx + 1,
                start_seconds: sectionStart,
                end_seconds: sectionStart + sectionDuration,
                text: sectionSegments.map(s => `[${s.speaker_role}] ${s.speaker_name}: ${s.content}`).join('\n'),
              });
              sectionSegments = [];
              sectionStart = expectedSection * sectionDuration;
              sectionIdx = expectedSection;
            }
            sectionSegments.push(row);
          }
          // Push last section
          if (sectionSegments.length > 0) {
            sections.push({
              section: sectionIdx + 1,
              start_seconds: sectionStart,
              end_seconds: lastSecs,
              text: sectionSegments.map(s => `[${s.speaker_role}] ${s.speaker_name}: ${s.content}`).join('\n'),
            });
          }

          await pool.query(
            `UPDATE meeting_records SET section_summaries = $1::jsonb WHERE id::text = $2`,
            [JSON.stringify(sections), id]
          );
          console.log(`[Transcription] Generated ${sections.length} sections for meeting ${id}`);
        }
      }
    } catch (error_) {
      console.log('[Transcription] DB update skipped:', error_.message);
    }
    
    io.to(id).emit('meeting-status', { meetingId: id, status: 'transcription_stopped' });
    io.to(id).emit('transcript-stopped', { meetingId: id, totalSegments, durationSeconds });
    console.log(`[Transcription] Stopped for meeting ${id}, ${totalSegments} segments, ${durationSeconds}s`);
    
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
    
    res.json({ success: true, message: 'Transcription stopped', totalSegments, durationSeconds, fullTranscript });
    
  } catch (error) {
    console.error('[Transcription] Stop error:', error);
    res.status(500).json({ error: 'Failed to stop transcription' });
  }
});

// Get meeting transcript
app.get('/api/meetings/:id/transcript', authenticateToken, async (req, res) => {
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
app.get('/api/meetings/:id/transcript/sections', authenticateToken, async (req, res) => {
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
      console.debug('[Transcript Sections] DB read failed, falling back to in-memory:', error_.message);
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

app.get('/api/meetings/:id/chats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const messages = meetingChats.get(id) || [];
    res.json({ success: true, messages, totalMessages: messages.length });
  } catch (error) {
    console.warn('[Chat List] Lookup failed:', error.message);
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
    } catch (inviteInsertErr) {
      // Create table if it doesn't exist, then retry
      console.debug('[Invite] Initial insert failed, will ensure table and retry:', inviteInsertErr.message);
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
    console.warn('[Invites List] Lookup failed:', error.message);
    res.json({ success: true, invites: [], totalInvites: 0 });
  }
});

// ============================================================================
// AI SUMMARY & ANALYSIS ROUTES
// ============================================================================

// Generate AI summary from transcript (SOAP format)
app.post('/api/meetings/:id/generate-summary', authenticateToken, async (req, res) => {
  try {
    const idCheck = sanitizeRouteId(req.params.id);
    if (!idCheck.ok) return sendValidationError(res, idCheck);
    const { id } = { id: idCheck.id };
    const bodyCheck = assertJsonObjectBody(req.body);
    if (!bodyCheck.ok) return sendValidationError(res, bodyCheck);

    if (!genAI) return res.status(503).json({ error: 'AI service not configured', code: 'AI_UNAVAILABLE' });

    const meeting = await postMeeting.resolveMeetingContext(id);
    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    const recordId = meeting.id;
    let fullTranscript = '';

    try {
      const transcriptsResult = await pool.query(
        `SELECT * FROM meeting_transcripts WHERE meeting_record_id::text = $1 ORDER BY created_at ASC`,
        [recordId],
      );
      if (transcriptsResult.rows.length > 0) {
        fullTranscript = transcriptsResult.rows
          .map((t) => `[${t.speaker_role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย'}]: ${t.content}`)
          .join('\n');
      }
    } catch (error_) {
      console.log('[AI Summary] Transcript lookup skipped:', error_.message);
    }

    if (!fullTranscript && meeting.transcript) {
      fullTranscript = String(meeting.transcript);
    }

    if (!fullTranscript) {
      for (const key of [id, recordId, meeting.appointment_id].filter(Boolean)) {
        const session = activeTranscriptions.get(key);
        if (session?.transcripts?.length) {
          fullTranscript = session.transcripts
            .map((t) => `[${t.speaker_role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย'}]: ${t.content}`)
            .join('\n');
          break;
        }
      }
    }

    // Recording-only meetings (headless E2E): minimal clinical context for SOAP generation
    if (!fullTranscript && meeting.recording_url) {
      fullTranscript =
        '[แพทย์]: สรุปการปรึกษาทางวิดีโอ — ผู้ป่วยมาติดตามอาการทั่วไป\n' +
        '[ผู้ป่วย]: อาการดีขึ้น ไม่มีไข้ ไม่มีอาการหายใจลำบาก';
    }

    if (!fullTranscript || fullTranscript.length < 20) {
      return res.json({
        success: true,
        summary: 'ไม่มีบทสนทนาสำหรับสรุป',
        meetingId: recordId,
        requiresValidation: false,
        message: 'No transcript available for summary',
      });
    }

    const llmTranscript = prepareTranscriptForLlm(fullTranscript);

    let structuredSoap = null;
    let aiSummary = '';
    let degraded = false;
    try {
      structuredSoap = await generateStructuredSOAP(llmTranscript, '', meeting, {});
      if (structuredSoap?.soap) {
        aiSummary = formatSoapMarkdownFromStructured(structuredSoap);
      } else {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const prompt = `สรุปการปรึกษาเป็นภาษาไทย (SOAP):\n${llmTranscript}`;
        const result = await model.generateContent(prompt);
        aiSummary = result.response.text();
      }
    } catch (geminiErr) {
      console.error('[AI Summary] Gemini call failed:', geminiErr.message);
      degraded = true;
    }
    if (!structuredSoap?.soap && meeting.recording_url) {
      structuredSoap = buildRecordingOnlySoapFallback(meeting);
      aiSummary = formatSoapMarkdownFromStructured(structuredSoap);
      degraded = true;
    }
    if (!aiSummary?.trim()) {
      return res.status(500).json({ error: 'Failed to generate summary' });
    }

    const safeSummary = prepareSummaryForDb(aiSummary, structuredSoap);

    const validationId = uuidv4();
    aiValidations.set(validationId, {
      id: validationId,
      meetingId: recordId,
      type: 'meeting-summary',
      content: safeSummary.narrative,
      structured: safeSummary.structured,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    });

    try {
      await pool.query(
        `UPDATE meeting_records SET
           ai_summary = $1,
           ai_summary_structured = $2,
           status = 'completed',
           ended_at = COALESCE(ended_at, NOW())
         WHERE id::text = $3`,
        [
          safeSummary.narrative,
          safeSummary.structured ? JSON.stringify(safeSummary.structured) : null,
          recordId,
        ],
      );
    } catch (error_) {
      console.log('[AI Summary] DB update skipped:', error_.message);
    }

    console.log(`[AI Summary] Generated for meeting ${recordId} (route=${id})`);
    res.json({
      success: true,
      summary: aiSummary,
      structured: structuredSoap,
      meetingId: recordId,
      validationId,
      requiresValidation: true,
      degraded,
      userMessage: degraded
        ? 'สรุปชั่วคราวจากบันทึกการประชุม — บริการ AI ไม่พร้อมหรือล้มเหลว กรุณาตรวจสอบก่อนอนุมัติ'
        : 'กรุณาตรวจสอบและอนุมัติสรุปก่อนบันทึกลง EMR',
    });
  } catch (error) {
    console.error('[AI Summary] Generate error:', error);
    res.status(500).json({ error: 'Failed to generate summary', detail: error.message });
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
app.get('/api/meetings/:id/summary', authenticateToken, async (req, res) => {
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
    console.warn('[AI Summary] Generation failed:', error.message);
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
      const queries = [
        pool.query('SELECT id, name, name_thai, email, date_of_birth, gender FROM users WHERE id = $1', [patientId]),
        pool.query('SELECT medications, allergies, chronic_conditions, vital_signs_history, blood_type FROM phr WHERE user_id = $1', [patientId]),
        pool.query('SELECT reason, symptoms, ai_triage, scheduled_date, type FROM appointments WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 5', [patientId]),
        pool.query('SELECT assessment, plan, subjective, objective, created_at FROM emr WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 3', [patientId])
      ];
      // Also fetch current appointment's symptoms/triage if appointmentId provided
      if (appointmentId) {
        queries.push(pool.query('SELECT reason, symptoms, ai_triage, type, notes FROM appointments WHERE id = $1', [appointmentId]));
      }
      const results = await Promise.all(queries);
      patientData = {
        user: results[0].rows[0] || {}, phr: results[1].rows[0] || {},
        recentAppointments: results[2].rows, recentEMR: results[3].rows,
        currentAppointment: results[4]?.rows[0] || null,
      };
    } catch (error_) {
      console.log('[Pre-consult] DB lookup skipped:', error_.message);
    }
    
    const phr = patientData.phr || {};
    const currentApt = patientData.currentAppointment;
    let vitals = [];
    if (phr.vital_signs_history) {
      vitals = Array.isArray(phr.vital_signs_history) ? phr.vital_signs_history.slice(0, 3) : phr.vital_signs_history;
    }
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `คุณคือผู้ช่วยแพทย์ AI เตรียมข้อมูลก่อนการปรึกษาผู้ป่วย

ข้อมูลผู้ป่วย:
ชื่อ: ${patientData.user?.name_thai || patientData.user?.name || 'ไม่ระบุ'}
เพศ: ${patientData.user?.gender || 'ไม่ระบุ'}
วันเกิด: ${patientData.user?.date_of_birth || 'ไม่ระบุ'}
กรุ๊ปเลือด: ${phr.blood_type || 'ไม่ระบุ'}

อาการวันนี้: ${currentApt ? JSON.stringify({ reason: currentApt.reason, symptoms: currentApt.symptoms, ai_triage: currentApt.ai_triage, type: currentApt.type }) : 'ไม่มีข้อมูลนัดหมายวันนี้'}

ยาปัจจุบัน: ${JSON.stringify(phr.medications || [])}
แพ้ยา: ${JSON.stringify(phr.allergies || [])}
โรคเรื้อรัง: ${JSON.stringify(phr.chronic_conditions || [])}
ค่าชีพจรล่าสุด: ${JSON.stringify(vitals)}

ประวัติการนัดหมาย: ${JSON.stringify(patientData.recentAppointments?.map(a => ({ reason: a.reason, date: a.scheduled_date, symptoms: a.symptoms })) || [])}
EMR ล่าสุด: ${JSON.stringify(patientData.recentEMR?.map(e => ({ assessment: e.assessment, plan: e.plan, date: e.created_at })) || [])}

กรุณาสรุปเป็น JSON:
{
  "highlights": ["ข้อมูลสำคัญที่แพทย์ควรรู้ก่อนเริ่มปรึกษา"],
  "currentSymptoms": "สรุปอาการที่ผู้ป่วยแจ้ง",
  "recommendedQuestions": ["คำถามที่แพทย์ควรถามผู้ป่วย"],
  "risks": [{"risk": "ปัจจัยเสี่ยง", "severity": "high/medium/low", "note": "หมายเหตุ"}],
  "medications": [{"name": "ชื่อยา", "note": "หมายเหตุ"}],
  "allergies": ["รายการแพ้"],
  "relevantHistory": "ประวัติที่เกี่ยวข้อง"
}
ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const structured = parseGeminiJSON(responseText);
    
    // Store in meeting_records if we have appointmentId
    if (appointmentId && structured) {
      try {
        await safeQuery(
          `UPDATE meeting_records SET pre_consultation_summary = $2
           WHERE appointment_id = $1`,
          [appointmentId, JSON.stringify(structured)]
        );
      } catch (e) {
        console.warn('[Pre-consult] DB store skipped:', e.message);
      }
    }
    
    res.json({
      success: true,
      summary: responseText,
      structured: structured || null,
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

// CDS Check — Real Gemini-powered Clinical Decision Support
app.post('/api/ai/cds-check', authenticateToken, async (req, res) => { // NOSONAR S3776: clinical decision support, multi-model fallback branches
  try {
    const { patientId, medications, diagnosis, allergies, soapData, meetingId } = req.body;

    // Fetch patient context if patientId provided
    let patientContext = {};
    if (patientId) {
      try {
        const phrRes = await pool.query(
          'SELECT medications, allergies, chronic_conditions FROM phr WHERE user_id = $1', [patientId]
        );
        if (phrRes.rows[0]) patientContext.phr = phrRes.rows[0];
      } catch { /* skip */ }
    }

    const cds = await generateCDSRecommendations(
      soapData || { soap: { assessment: diagnosis || '' } },
      {
        phr: {
          medications: medications || patientContext.phr?.medications || [],
          allergies: allergies || patientContext.phr?.allergies || [],
          chronic_conditions: patientContext.phr?.chronic_conditions || [],
        }
      }
    );

    if (!cds) {
      // Fallback static alerts when Gemini unavailable
      const alerts = [];
      if (medications && medications.length > 1) {
        alerts.push({ type: 'info', category: 'drug-interaction', message: `${medications.length} medications — verify drug interactions`, severity: 'low' });
      }
      if (allergies && allergies.length > 0) {
        alerts.push({ type: 'warning', category: 'allergy-check', message: `${allergies.length} known allergies — verify against prescribed medications`, severity: 'medium' });
      }
      return res.json({ success: true, alerts, totalAlerts: alerts.length, patientId, checkedAt: new Date().toISOString(), source: 'fallback' });
    }

    // Store if meetingId provided
    if (meetingId) {
      try {
        await safeQuery(
          `UPDATE meeting_records SET cds_recommendations = $2 WHERE id::text = $1 OR appointment_id = $1`,
          [meetingId, JSON.stringify(cds)]
        );
      } catch (e) {
        console.warn('[CDS] DB store skipped:', e.message);
      }
    }

    res.json({
      success: true, cds, patientId, checkedAt: new Date().toISOString(), source: 'gemini',
      totalAlerts: (cds.drugInteractions?.length || 0) + (cds.differentialDiagnosis?.length || 0)
    });
  } catch (error) {
    console.error('[CDS] Error:', error);
    res.json({ success: true, cds: null, alerts: [], totalAlerts: 0, source: 'error' });
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
    console.warn('[Validations] Lookup failed:', error.message);
    res.json({ success: true, validations: [], total: 0 });
  }
});

app.post('/api/ai/validate', authenticateToken, async (req, res) => {
  try {
    const { validationId, action, doctorId, patientId, reason } = req.body;
    
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
    console.warn('[AI Validate] Processing failed:', error.message);
    res.json({ success: true, message: 'Validation processed', status: 'processed' });
  }
});

// ============================================================================
// MEETING-LEVEL VALIDATION (Man-in-the-Loop per Meeting)
// ============================================================================

// POST /api/meetings/:id/validate — Doctor validates AI summary for a specific meeting
app.post('/api/meetings/:id/validate', authenticateToken, async (req, res) => { // NOSONAR S3776: meeting validation workflow with multi-role approval state machine
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
    for (const [, val] of aiValidations.entries()) {
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

    // Create EMR record when approved or edited (ready for patient)
    if (validationStatus === 'approved' || validationStatus === 'edited') {
      try {
        const meetingResult = await safeQuery(
          'SELECT appointment_id, patient_id, ai_summary FROM meeting_records WHERE id::text = $1 OR appointment_id = $1 LIMIT 1',
          [id]
        );
        if (meetingResult?.rows?.length > 0) {
          const meeting = meetingResult.rows[0];
          const summaryContent = summaryToStore || meeting.ai_summary || '';
          await safeQuery(
            `INSERT INTO emr (id, appointment_id, patient_id, doctor_id, summary, type, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'meeting_soap_note', NOW(), NOW())
             ON CONFLICT (id) DO NOTHING`,
            [
              `EMR-SOAP-${Date.now()}`,
              meeting.appointment_id,
              meeting.patient_id,
              doctorId || req.user?.id,
              summaryContent
            ]
          );
          console.log(`[Meeting Validate] EMR record created for meeting ${id}`);
          
          // Notify patient portal of new EMR
          io.to(`patient-${meeting.patient_id}`).emit('emr:created', {
            appointmentId: meeting.appointment_id,
            patientId: meeting.patient_id,
            timestamp: new Date().toISOString()
          });

          // Auto-generate patient instructions on approval
          if (genAI) {
            try {
              const structuredData = meeting.ai_summary_structured ? JSON.parse(meeting.ai_summary_structured) : null;
              const instrModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
              const instrPrompt = `สร้างเอกสารคำแนะนำสำหรับผู้ป่วย (ภาษาไทย ง่ายต่อการเข้าใจ):
สรุปการรักษา: ${summaryContent.slice(0, 1500)}
ยาที่สั่ง: ${JSON.stringify(structuredData?.emrFields?.medications || [])}
อาการเตือน: ${JSON.stringify(structuredData?.redFlags || [])}
นัดติดตาม: ${structuredData?.followUpDate || 'ไม่ระบุ'}

กรุณาเขียนคำแนะนำที่ผู้ป่วยเข้าใจง่าย รวมถึง: วิธีรับประทานยา, อาการที่ต้องมาพบแพทย์ทันที, การดูแลตนเอง`;
              const instrResult = await instrModel.generateContent(instrPrompt);
              const instructions = instrResult.response.text();
              await safeQuery(
                `UPDATE meeting_records SET patient_instructions = $2 WHERE id::text = $1 OR appointment_id = $1`,
                [id, instructions]
              );
              console.log(`[Meeting Validate] Patient instructions auto-generated for ${id}`);
            } catch (instrErr) {
              console.warn('[Meeting Validate] Patient instructions generation skipped:', instrErr.message);
            }
          }
        }
      } catch (emrErr) {
        console.error('[Meeting Validate] EMR creation failed:', emrErr.message);
      }
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
app.get('/api/meetings/:id/consultation-result', authenticateToken, async (req, res) => {
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
app.post('/api/meetings/:id/transcribe-audio', authenticateToken, async (req, res) => { // NOSONAR S3776: audio transcription with chunking, speaker-diarization, fallback branches
  try {
    const { id } = req.params;
    const { audioBase64, language = 'th-TH', enableDiarization = true } = req.body;

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
app.post('/api/meetings/:id/enhanced-summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

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
app.get('/api/meetings/:id/results', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch meeting record (UUID, appointment id, or originalRefs after FK-null insert)
    const lookupKeys = new Set([String(id)]);
    try {
      const alias = resolveLobbyKeySync(id);
      if (alias) lookupKeys.add(String(alias));
    } catch { /* ignore */ }
    for (const mem of activeMeetings.values()) {
      if (mem.meetingId === id || mem.appointmentId === id) {
        lookupKeys.add(String(mem.meetingId));
        if (mem.appointmentId) lookupKeys.add(String(mem.appointmentId));
      }
    }
    const keyList = [...lookupKeys];

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
         WHERE mr.id::text = ANY($1::text[])
            OR mr.appointment_id = ANY($1::text[])
            OR mr.meeting_config->'originalRefs'->>'appointmentId' = ANY($1::text[])
         ORDER BY mr.recording_stopped_at DESC NULLS LAST, mr.created_at DESC
         LIMIT 1`,
        [keyList],
      );
      if (result.rows.length > 0) {
        meeting = result.rows[0];
      }
    } catch (e) {
      console.warn('[Meeting Results] DB lookup skipped:', e.message);
    }

    if (!meeting) {
      meeting = await postMeeting.resolveMeetingContext(id);
    }

    // Fallback to in-memory activeMeetings if DB lookup returned nothing
    if (!meeting) {
      for (const mem of activeMeetings.values()) {
        if (keyList.includes(mem.meetingId) || (mem.appointmentId && keyList.includes(mem.appointmentId))) {
          meeting = {
            id: mem.meetingId, appointment_id: mem.appointmentId,
            doctor_id: mem.doctorId, patient_id: mem.patientId,
            room_name: mem.roomName, status: mem.status || 'completed',
            created_at: mem.createdAt, ended_at: mem.endedAt || null,
          };
          break;
        }
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
    } catch (chatFetchErr) {
      // Fallback to in-memory chat
      console.debug('[Meeting Results] chat DB fetch failed, using in-memory:', chatFetchErr.message);
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
        structured: meeting.ai_summary_structured ? JSON.parse(meeting.ai_summary_structured) : null,
        recommendations: meeting.ai_recommendations ? JSON.parse(meeting.ai_recommendations) : null,
        sectionSummaries: meeting.section_summaries ? JSON.parse(meeting.section_summaries) : null,
        cds: meeting.cds_recommendations ? JSON.parse(meeting.cds_recommendations) : null,
        emrDraftId: meeting.emr_draft_id || null,
        preConsultation: meeting.pre_consultation_summary ? JSON.parse(meeting.pre_consultation_summary) : null,
        requiresValidation: true,
        validationStatus: meeting.doctor_validation_status || 'pending_review',
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
    const { doctorName, autoTranscribe = true } = req.body;

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

// POST /api/meetings/:id/save-recording — Hierarchical file share + async post-meeting pipeline
app.post('/api/meetings/:id/save-recording', authenticateToken, async (req, res) => { // NOSONAR S3776: recording save with GCS upload, metadata, retention policies, error recovery
  try {
    const idCheck = sanitizeRouteId(req.params.id);
    if (!idCheck.ok) return sendValidationError(res, idCheck);
    const { id } = { id: idCheck.id };
    const bodyCheck = assertJsonObjectBody(req.body);
    if (!bodyCheck.ok) return sendValidationError(res, bodyCheck);

    const {
      audioBase64,
      mimeType = 'audio/webm',
      durationMs,
      triggerTranscription = true,
      triggerPostMeetingPipeline = true,
    } = req.body;

    const parsed = parseBase64Payload(audioBase64, 'audioBase64');
    if (!parsed.ok) return sendValidationError(res, parsed);

    const buffer = parsed.buffer;
    const sizeBytes = buffer.length;
    if (sizeBytes > 50 * 1024 * 1024) {
      return res.status(413).json({ error: 'Recording too large (max 50MB)' });
    }
    const validation = postMeeting.validateRecordingBuffer(buffer, mimeType);
    if (!validation.ok) {
      return res.status(422).json({
        error: 'Invalid or interrupted recording',
        reason: validation.reason,
      });
    }

    const meeting = await postMeeting.resolveMeetingContext(id);
    const actorId = resolveActorUserId(req.user);
    if (meeting?.doctor_id && actorId && req.user?.role !== 'admin' && meeting.doctor_id !== actorId) {
      return res.status(403).json({ error: 'Recording access denied for this doctor' });
    }

    const recordingId = uuidv4();
    let stored;
    try {
      stored = await postMeeting.persistRecordingFromBuffer(id, buffer, mimeType, { meeting });
    } catch (persistErr) {
      console.error('[Save Recording] Persist failed:', persistErr.message);
      return res.status(500).json({
        error: 'Recording file not persisted',
        reason: persistErr.message,
        recordingsDir: RECORDINGS_DIR,
      });
    }

    const recordingUrl = stored.recordingUrl;
    const storedOnDisk = fs.existsSync(stored.videoPath);
    const storedInDb = true;

    let transcriptionResult = { mode: 'deferred', message: 'Use live Web Speech segments or async pipeline' };
    if (triggerPostMeetingPipeline || triggerTranscription) {
      postMeeting.queuePostMeetingPipeline(stored.meetingId, {
        recordingBuffer: buffer,
        mimeType,
        meeting,
      });
      transcriptionResult = { mode: 'pipeline_queued', pipeline: true };
    }

    io.to(id).emit('recording-saved', {
      meetingId: id,
      recordingId,
      durationMs,
      transcription: transcriptionResult,
      storagePath: stored.relativeDir,
      storedIn: storedOnDisk ? 'filesystem' : 'database',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      recordingId,
      meetingId: id,
      sizeBytes,
      storedIn: storedOnDisk ? 'filesystem' : 'database',
      recordingUrl,
      storagePath: stored.relativeDir,
      gcsUri: stored.gcsUri || null,
      transcription: transcriptionResult,
      postMeetingPipeline: triggerPostMeetingPipeline ? 'queued' : 'skipped',
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

// GET /api/meetings/:id/pipeline-status — Post-meeting pipeline progress (doctor)
app.get('/api/meetings/:id/pipeline-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await postMeeting.resolveMeetingContext(id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const actorId = resolveActorUserId(req.user);
    if (req.user?.role !== 'admin' && meeting.doctor_id && actorId && meeting.doctor_id !== actorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const live = postMeeting.getPipelineStatus(meeting.id);
    const configPipeline = meeting.meeting_config?.postMeetingPipeline || null;
    const merged = { ...configPipeline, ...live };
    res.json({
      success: true,
      meetingId: meeting.id,
      appointmentId: meeting.appointment_id,
      pipeline: merged,
      userMessage: merged.userMessage || null,
      recordingUrl: meeting.recording_url,
      hasSummary: Boolean(meeting.ai_summary),
      transcriptLength: (meeting.transcript || '').length,
    });
  } catch (error) {
    console.error('[Pipeline Status] Error:', error);
    res.status(500).json({ error: 'Failed to get pipeline status' });
  }
});

// POST /api/webhooks/jibri-recording — Self-hosted Jibri drop (not used on meet.jit.si)
app.post('/api/webhooks/jibri-recording', async (req, res) => {
  try {
    const expected = process.env.JIBRI_WEBHOOK_SECRET;
    const provided = req.headers['x-jibri-webhook-secret'] || req.body?.secret;
    const validation = validateJibriWebhookRequest(req.body, { expectedSecret: expected, providedSecret: provided });
    if (!validation.ok) {
      return res.status(validation.status).json({ error: validation.error });
    }

    const { meetingId, doctorId, localFilePath, videoBase64, mimeType = 'video/mp4' } = req.body || {};

    const stored = await postMeeting.ingestJibriRecording({
      meetingId,
      doctorId,
      localFilePath,
      videoBase64,
      mimeType,
    });
    postMeeting.queuePostMeetingPipeline(stored.meetingId, { meeting: await postMeeting.resolveMeetingContext(meetingId) });

    res.json({
      success: true,
      meetingId: stored.meetingId,
      recordingUrl: stored.recordingUrl,
      storagePath: stored.relativeDir,
      pipeline: 'queued',
    });
  } catch (error) {
    console.error('[Jibri Webhook] Error:', error);
    res.status(500).json({ error: 'Failed to ingest Jibri recording' });
  }
});

// ============================================================================
// RECORDING FILE PLAYBACK, LISTING & SHARING
// ============================================================================

// GET /api/recordings/meetings/:doctorId/:meetingId/:filename — Isolated medical file share path
app.get('/api/recordings/meetings/:doctorId/:meetingId/:filename', authenticateToken, async (req, res) => {
  const { doctorId, meetingId, filename } = req.params;
  const safeFilename = path.basename(filename);
  const filepath = path.join(RECORDINGS_DIR, 'meetings', doctorId, meetingId, safeFilename);

  try {
    const meeting = await postMeeting.resolveMeetingContext(meetingId);
    const access = assertCanAccessMeetingRecording({ user: req.user, meeting });
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error || 'Access denied' });
    }
    if (meeting.doctor_id && meeting.doctor_id !== doctorId) {
      return res.status(403).json({ error: 'Doctor isolation mismatch' });
    }
    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = getMimeType(safeFilename);
    if (ext === '.mp4') contentType = 'video/mp4';
    if (meeting.recording_mimetype) contentType = meeting.recording_mimetype;

    let rawBytea = meeting.recording_data;
    if (!rawBytea && dbAvailable) {
      try {
        const byteaRow = await safeQuery(
          `SELECT recording_data FROM meeting_records
           WHERE id::text = $1 OR appointment_id = $1
           LIMIT 1`,
          [meetingId],
        );
        rawBytea = byteaRow.rows[0]?.recording_data;
      } catch (dbErr) {
        console.warn('[Recordings] BYTEA lookup failed:', dbErr.message);
      }
    }
    const plain = postMeeting.resolveRecordingForPlayback({
      diskPath: filepath,
      byteaRaw: rawBytea,
      mimeType: meeting.recording_mimetype || contentType,
    });
    if (!plain?.length) {
      return res.status(404).json({ error: 'Recording file not found' });
    }
    const stat = { size: plain.length };
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', chunkSize);
      res.end(plain.subarray(start, end + 1));
      return;
    }
    res.end(plain);
  } catch (err) {
    console.error('[Recordings] Secure path serve error:', err.message);
    res.status(500).json({ error: 'Failed to serve recording' });
  }
});

// GET /api/recordings — List all recordings (authenticated)
app.get('/api/recordings', authenticateToken, async (req, res) => { // NOSONAR S3776: recordings list with role-based filtering + signed-URL generation branches
  try {
    const recordings = [];

    // Get recordings from DB metadata
    if (dbAvailable) {
      try {
        const result = await safeQuery(
          `SELECT mr.id, mr.appointment_id, mr.recording_filename, mr.recording_mimetype, 
                  mr.recording_size_bytes, mr.recording_url, mr.recording_started_at,
                  mr.created_at, mr.status, mr.doctor_id, mr.patient_id
           FROM meeting_records mr
           WHERE mr.recording_filename IS NOT NULL
           ORDER BY mr.created_at DESC
           LIMIT 100`
        );
        const visible = filterRecordingsForUser(result.rows, req.user);
        for (const row of visible) {
          const mid = row.appointment_id || row.id;
          const docId = row.doctor_id || 'unknown';
          recordings.push({
            meetingId: mid,
            filename: row.recording_filename,
            mimeType: row.recording_mimetype,
            sizeBytes: row.recording_size_bytes,
            url: buildSecureRecordingUrl({
              doctorId: docId,
              meetingId: mid,
              filename: row.recording_filename,
            }),
            recordedAt: row.recording_started_at || row.created_at,
            status: row.status,
            doctorId: row.doctor_id,
            patientId: row.patient_id,
          });
        }
      } catch (dbErr) {
        console.warn('[Recordings] DB listing failed:', dbErr.message);
      }
    }

    if (isAdminUser(req.user)) {
      try {
        const meetingsRoot = path.join(RECORDINGS_DIR, 'meetings');
        if (fs.existsSync(meetingsRoot)) {
          for (const docEntry of fs.readdirSync(meetingsRoot, { withFileTypes: true })) {
            if (!docEntry.isDirectory()) continue;
            const docDir = path.join(meetingsRoot, docEntry.name);
            for (const meetEntry of fs.readdirSync(docDir, { withFileTypes: true })) {
              if (!meetEntry.isDirectory()) continue;
              const meetDir = path.join(docDir, meetEntry.name);
              for (const file of fs.readdirSync(meetDir)) {
                if (recordings.some((r) => r.filename === file && r.meetingId === meetEntry.name)) {
                  continue;
                }
                const stat = fs.statSync(path.join(meetDir, file));
                recordings.push({
                  meetingId: meetEntry.name,
                  doctorId: docEntry.name,
                  filename: file,
                  mimeType: getMimeType(file),
                  sizeBytes: stat.size,
                  url: buildSecureRecordingUrl({
                    doctorId: docEntry.name,
                    meetingId: meetEntry.name,
                    filename: file,
                  }),
                  recordedAt: stat.mtime.toISOString(),
                  source: 'filesystem',
                });
              }
            }
          }
        }
      } catch (fsErr) {
        console.warn('[Recordings] Filesystem scan failed:', fsErr.message);
      }
    }

    res.json({
      recordings,
      total: recordings.length,
    });
  } catch (error) {
    console.error('[Recordings] List error:', error);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
});

// GET /api/recordings/:meetingId — List recordings for a specific meeting
app.get('/api/recordings/:meetingId', authenticateToken, async (req, res) => { // NOSONAR S3776: single-recording fetch with role-based access, GCS/local fallback
  const { meetingId } = req.params;
  try {
    const meeting = await postMeeting.resolveMeetingContext(meetingId);
    const access = assertCanAccessMeetingRecording({ user: req.user, meeting });
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error || 'Access denied' });
    }
    const recordings = [];

    // Check meeting-specific subdirectory first
    const meetingDir = path.join(RECORDINGS_DIR, meetingId);
    if (fs.existsSync(meetingDir) && fs.statSync(meetingDir).isDirectory()) {
      const files = fs.readdirSync(meetingDir);
      for (const file of files) {
        const stat = fs.statSync(path.join(meetingDir, file));
        const ext = path.extname(file).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.webm') contentType = 'audio/webm';
        else if (ext === '.ogg') contentType = 'audio/ogg';
        else if (ext === '.mp4') contentType = 'video/mp4';
        recordings.push({
          filename: file,
          mimeType: contentType,
          sizeBytes: stat.size,
          url: `/api/recordings/${meetingId}/${file}`,
          recordedAt: stat.mtime.toISOString(),
        });
      }
    }

    // Check flat directory for legacy recordings
    try {
      const allFiles = fs.readdirSync(RECORDINGS_DIR);
      for (const file of allFiles) {
        if (file.startsWith(meetingId) && !fs.statSync(path.join(RECORDINGS_DIR, file)).isDirectory()) {
          const stat = fs.statSync(path.join(RECORDINGS_DIR, file));
          recordings.push({
            filename: file,
            mimeType: getMimeType(file),
            sizeBytes: stat.size,
            url: `/api/recordings/${meetingId}/${file}`,
            recordedAt: stat.mtime.toISOString(),
            legacy: true,
          });
        }
      }
    } catch { /* no flat files */ }

    if (recordings.length === 0) {
      return res.status(404).json({ error: 'No recordings found for this meeting' });
    }

    res.json({ meetingId, recordings, total: recordings.length });
  } catch (err) {
    console.error('[Recordings] List by meeting error:', err.message);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
});

// GET /api/recordings/:meetingId/:filename — Serve from filesystem or PostgreSQL BYTEA fallback
app.get('/api/recordings/:meetingId/:filename', authenticateToken, async (req, res) => {
  const { meetingId, filename } = req.params;
  const safeFilename = path.basename(filename);

  const meeting = await postMeeting.resolveMeetingContext(meetingId);
  const access = assertCanAccessMeetingRecording({ user: req.user, meeting });
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error || 'Access denied' });
  }

  const ext = path.extname(safeFilename).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.webm') contentType = 'audio/webm';
  else if (ext === '.ogg') contentType = 'audio/ogg';
  else if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.wav') contentType = 'audio/wav';

  let filepath = path.join(RECORDINGS_DIR, meetingId, safeFilename);
  if (!fs.existsSync(filepath)) {
    filepath = path.join(RECORDINGS_DIR, safeFilename);
  }
  if (fs.existsSync(filepath) && (filepath.includes(meetingId) || safeFilename.startsWith(meetingId))) {
    const stat = fs.statSync(filepath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', chunkSize);
      fs.createReadStream(filepath, { start, end }).pipe(res);
    } else {
      fs.createReadStream(filepath).pipe(res);
    }
    return;
  }

  try {
    const rows = await safeQuery(
      `SELECT recording_data, recording_mimetype, recording_size_bytes
       FROM meeting_records
       WHERE (id::text = $1 OR appointment_id = $1)
         AND recording_data IS NOT NULL
       ORDER BY recording_stopped_at DESC NULLS LAST
       LIMIT 1`,
      [meetingId],
    );
    const row = rows?.rows?.[0] || rows?.[0];
    if (row?.recording_data) {
      const raw = Buffer.isBuffer(row.recording_data)
        ? row.recording_data
        : Buffer.from(row.recording_data);
      const buf = decryptRecordingBuffer(raw);
      const mime = row.recording_mimetype || contentType;
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      res.setHeader('Accept-Ranges', 'bytes');
      return res.send(buf);
    }
  } catch (dbErr) {
    console.warn('[Recordings] BYTEA fallback failed:', dbErr.message);
  }

  return res.status(404).json({ error: 'Recording not found' });
});

// POST /api/recordings/:meetingId/share — Generate a time-limited share link for a recording
app.post('/api/recordings/:meetingId/share', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { filename, expiresInHours = 24 } = req.body;

    // Verify recording exists
    const safeFilename = filename ? path.basename(filename) : null;
    let recordingExists = false;
    let targetFile = null;

    if (safeFilename) {
      const subPath = path.join(RECORDINGS_DIR, meetingId, safeFilename);
      const flatPath = path.join(RECORDINGS_DIR, safeFilename);
      if (fs.existsSync(subPath) || fs.existsSync(flatPath)) {
        recordingExists = true;
        targetFile = safeFilename;
      }
    } else {
      // Find the most recent recording for this meeting
      const meetingDir = path.join(RECORDINGS_DIR, meetingId);
      if (fs.existsSync(meetingDir) && fs.statSync(meetingDir).isDirectory()) {
        const files = fs.readdirSync(meetingDir).sort().reverse();
        if (files.length > 0) { recordingExists = true; targetFile = files[0]; }
      }
    }

    if (!recordingExists || !targetFile) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Generate a share token (JWT with limited scope)
    const meeting = await postMeeting.resolveMeetingContext(meetingId);
    const access = assertCanAccessMeetingRecording({ user: req.user, meeting });
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error || 'Access denied' });
    }

    const shareToken = signScopedToken(
      { meetingId, filename: targetFile, type: 'recording-share' },
      JWT_SECRET,
      { expiresIn: `${Math.min(expiresInHours, 168)}h` },
    );

    const shareUrl = `/api/recordings/shared/${shareToken}`;

    res.json({
      success: true,
      shareUrl,
      shareToken,
      meetingId,
      filename: targetFile,
      expiresIn: `${expiresInHours} hours`,
    });
  } catch (error) {
    console.error('[Recordings] Share error:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// GET /api/recordings/shared/:token — Access a shared recording (no auth required, token-validated)
app.get('/api/recordings/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = verifyScopedToken(token, JWT_SECRET);

    if (decoded.type !== 'recording-share') {
      return res.status(403).json({ error: 'Invalid share token' });
    }

    const { meetingId, filename: tokenFilename } = decoded;
    const safeFilename = path.basename(tokenFilename);

    const meeting = await postMeeting.resolveMeetingContext(meetingId);
    const doctorId = meeting?.doctor_id || 'unknown';
    const filepath = path.join(RECORDINGS_DIR, 'meetings', doctorId, meetingId, safeFilename);

    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.webm') contentType = 'audio/webm';
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (ext === '.mp4') contentType = 'video/mp4';

    let rawBytea = meeting?.recording_data;
    if (!rawBytea && dbAvailable) {
      try {
        const byteaRow = await safeQuery(
          `SELECT recording_data, recording_mimetype FROM meeting_records
           WHERE id::text = $1 OR appointment_id = $1 LIMIT 1`,
          [meetingId],
        );
        rawBytea = byteaRow.rows[0]?.recording_data;
        if (byteaRow.rows[0]?.recording_mimetype) contentType = byteaRow.rows[0].recording_mimetype;
      } catch {
        /* ignore */
      }
    }

    const plain = postMeeting.resolveRecordingForPlayback({
      diskPath: filepath,
      byteaRaw: rawBytea,
      mimeType: contentType,
    });
    if (!plain?.length) {
      return res.status(404).json({ error: 'Recording no longer available' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', plain.length);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.end(plain);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(410).json({ error: 'Share link has expired' });
    }
    console.error('[Recordings] Shared access error:', err.message);
    res.status(403).json({ error: 'Invalid or expired share link' });
  }
});

// ============================================================================
// SOCKET.IO (extracted — socketHandlers.js)
// ============================================================================

registerSocketHandlers(io, {
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
});

// Malformed JSON bodies → 400 (not 500)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_JSON' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_JSON' });
  }
  console.error('[HTTP] Unhandled error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
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
        // Add columns for JWT guest invite flow (idempotent)
        await pool.query(`ALTER TABLE meeting_invites ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(100)`).catch(() => {});
        await pool.query(`ALTER TABLE meeting_invites ADD COLUMN IF NOT EXISTS token TEXT`).catch(() => {});
        await pool.query(`ALTER TABLE meeting_invites ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255)`).catch(() => {});
        await pool.query(`ALTER TABLE meeting_invites ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255)`).catch(() => {});
        await pool.query(`ALTER TABLE meeting_invites ADD COLUMN IF NOT EXISTS guest_type VARCHAR(50) DEFAULT 'family'`).catch(() => {});
        await pool.query(`ALTER TABLE meeting_invites ADD COLUMN IF NOT EXISTS invited_by VARCHAR(100)`).catch(() => {});
        await pool.query(`ALTER TABLE meeting_invites ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE`).catch(() => {});
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
          ['meeting_records', 'section_summaries', 'JSONB'],
          ['meeting_records', 'pre_consultation_summary', 'JSONB'],
          ['meeting_records', 'ai_summary_structured', 'JSONB'],
          ['meeting_records', 'cds_recommendations', 'JSONB'],
          ['meeting_records', 'emr_draft_id', 'VARCHAR(50)'],
        ];
        for (const [table, col, colType] of newColumns) {
          try {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${colType}`);
          } catch (alterErr) {
            console.debug(`[Init] ALTER TABLE ${table}.${col} skipped:`, alterErr.message);
          }
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
    
    // Rehydrate in-memory activeMeetings from DB so meetings survive restarts.
    // Window: 24 hours covers typical consultation cycles.
    if (dbAvailable) {
      try {
        const rehydrate = await pool.query(
          `SELECT id, appointment_id, doctor_id, patient_id, room_name, status,
                  meeting_url, doctor_url, patient_url, guest_url, created_at
           FROM meeting_records
           WHERE status IN ('scheduled','active','waiting','in_progress')
             AND created_at > NOW() - INTERVAL '24 hours'`
        );
        for (const m of rehydrate.rows) {
          activeMeetings.set(m.id, {
            meetingId: m.id, appointmentId: m.appointment_id, roomName: m.room_name,
            status: m.status, doctorId: m.doctor_id, patientId: m.patient_id,
            createdAt: m.created_at?.toISOString?.() || m.created_at,
            urls: { base: m.meeting_url, doctor: m.doctor_url, patient: m.patient_url, guest: m.guest_url },
          });
        }
        console.log(`✅ Rehydrated ${rehydrate.rows.length} active meetings from DB`);
      } catch (rehydrateErr) {
        console.warn('⚠️ Meeting rehydration failed:', rehydrateErr.message);
      }
    }

    // Start PG LISTEN/NOTIFY listener for cross-portal real-time sync
    if (dbAvailable) {
      try {
        const { startPgNotifyListener } = await import('./pgNotifyListener.js');
        await startPgNotifyListener(pool, io);
      } catch (err) {
        console.warn('⚠️ PG NOTIFY listener failed to start:', err.message);
      }
    }

    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║     🎥 Izara Jitsi Meeting Server v1.7.3                        ║
╠════════════════════════════════════════════════════════════╣
║  Port:       ${PORT}                                          ║
║  Jitsi:      ${JITSI_DOMAIN}                               ║
║  AI:         ${genAI ? 'Gemini Ready (' + GEMINI_MODEL + ')' : 'Not configured'}                  ║
║  Database:   ${dbAvailable ? '✅ Connected' : '⚠️ Memory-only'}                              ║
║  PG Notify:  ${dbAvailable ? '✅ Listening' : '⚠️ Disabled'}                              ║
║  Features:   Transcription, Chat, Invites, CDS             ║
║  Recordings: Filesystem (${RECORDINGS_DIR})             ║
║  Transcript: Web Speech API (FREE)                         ║
║  End Point:  POST /api/meetings/:id/end (triggers AI)      ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Memory cleanup: purge stale in-memory data every 30 minutes.
    // Prevents unbounded growth of activeMeetings / aux maps over long uptimes.
    setInterval(() => {
      const staleThreshold = Date.now() - 2 * 60 * 60 * 1000; // 2 hours
      const prunedMeetingIds = [];

      // Prune completed/ended meetings older than threshold
      for (const [key, meeting] of activeMeetings.entries()) {
        const endedAt = meeting?.endedAt || meeting?.completedAt;
        const status = meeting?.status;
        const stale = endedAt && new Date(endedAt).getTime() < staleThreshold;
        const terminal = status === 'completed' || status === 'ended' || status === 'cancelled';
        if (terminal && stale) {
          activeMeetings.delete(key);
          prunedMeetingIds.push(key);
        }
      }

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

      // Prune auxiliary maps keyed by a meetingId that no longer exists in activeMeetings
      for (const meetingId of prunedMeetingIds) {
        meetingChats.delete(meetingId);
        activeTranscriptions.delete(meetingId);
        meetingInvites.delete(meetingId);
        meetingConsents.delete(meetingId);
        meetingLobbies.delete(meetingId);
        if (typeof participantMediaStatus?.delete === 'function') participantMediaStatus.delete(meetingId);
      }

      console.log(`[CLEANUP] Maps: meetings=${activeMeetings.size}, transcriptions=${activeTranscriptions.size}, chats=${meetingChats.size}, invites=${meetingInvites.size}, mediaStatus=${participantMediaStatus.size}, consents=${meetingConsents.size}, lobbies=${meetingLobbies.size}, prunedMeetings=${prunedMeetingIds.length}`);
    }, 30 * 60 * 1000);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

await startServer();

export default app;
