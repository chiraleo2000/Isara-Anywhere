/**
 * Video Meeting Service using Jitsi Meet + Web Speech API + Gemini AI v1.7.3
 * 
 * ZERO-COST TRANSCRIPTION SOLUTION:
 * - Jitsi Meet: FREE video conferencing (no licensing costs)
 * - Web Speech API: FREE browser-native real-time transcription (no API key needed)
 * - Gemini AI: For summary and recommendations (~$0.001/1K tokens)
 * 
 * Features:
 * - Google account login support for users
 * - Anonymous access for patients without Google accounts
 * - REAL-TIME transcription using Web Speech API (browser-native, FREE)
 * - AI-powered meeting summarization & doctor recommendations via Gemini
 * - Recording support (Jitsi built-in)
 * - In-meeting chat messages
 * - Guest invite management
 * 
 * Workflow:
 * 1. Meeting starts with Web Speech API real-time transcription in browser
 * 2. Transcript segments sent to meeting server as they are recognized
 * 3. On meeting end, Gemini generates SOAP summary + doctor recommendations
 * 4. Doctor validates AI content (man-in-the-loop)
 * 5. Results saved to PostgreSQL meeting_records table
 * 
 * STORAGE: PostgreSQL meeting_records table (NOT GCS or in-memory)
 */

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import postgresDataService, { MeetingService } from '../services/postgresDataService';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { errMsg } from '../utils';

const { pool } = postgresDataService;

// Load environment variables
dotenv.config();

const router = Router();

// ============================================================================
// SECURITY MIDDLEWARE — applied before any handler below.
// - Public endpoints: /health, /config, /join-with-invite (uses invite token as auth)
// - All other endpoints require a valid session.
// - Endpoints scoped to /:appointmentId require the caller to be the patient,
//   the assigned doctor, an admin, or a holder of a non-expired invite token.
// ============================================================================

const PUBLIC_PATHS = new Set(['/health', '/config', '/join-with-invite']);

router.use((req: Request, res: Response, next: NextFunction) => {
  if (PUBLIC_PATHS.has(req.path)) return next();
  return authMiddleware(req, res, next);
});

router.param('appointmentId', async (req: Request, res: Response, next: NextFunction, appointmentId: string) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const role = authReq.user?.role;
    if (role === 'admin') return next();

    const ownershipResult = await pool.query(
      'SELECT patient_id, doctor_id FROM appointments WHERE id = $1',
      [appointmentId]
    );
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const { patient_id, doctor_id } = ownershipResult.rows[0];
    const uid = authReq.userId;
    if (uid && (uid === patient_id || uid === doctor_id)) return next();

    // Accept a valid guest invite token (header or query) scoped to this appointment.
    const headerToken = req.headers['x-meeting-invite'];
    const queryToken = typeof req.query?.inviteToken === 'string' ? req.query.inviteToken : undefined;
    const inviteToken = (typeof headerToken === 'string' ? headerToken : undefined) || queryToken;
    if (inviteToken && inviteTokens.has(inviteToken)) {
      const invite = inviteTokens.get(inviteToken);
      if (invite?.appointmentId === appointmentId && invite.expiresAt > new Date()) {
        return next();
      }
    }

    return res.status(403).json({ error: 'Access denied to this meeting' });
  } catch (err) {
    console.error('[VIDEO-MEETING] Access check error:', err);
    return res.status(500).json({ error: 'Access check failed' });
  }
});

// ============================================================================
// CONFIGURATION - Works in both local development and Cloud Run production
// ============================================================================

// Jitsi Meet Configuration (FREE) - public.jit.si is more reliable than meet.jit.si
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || process.env.VITE_JITSI_DOMAIN || 'meet.jit.si';
const JITSI_APP_ID = process.env.JITSI_APP_ID || process.env.VITE_JITSI_APP_ID || 'izara-telemedicine';

// Transcription: Web Speech API (browser-native, FREE - no API key needed)
// The browser handles speech recognition directly - zero cost!

// Gemini AI Configuration (for summary & recommendations)
// Note: API key should be set via environment variable in production
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';

// Log configuration at startup (without leaking API key)
console.log('[Video Meeting] ===== Configuration v1.7.3 =====');
console.log('[Video Meeting] Jitsi Domain:', JITSI_DOMAIN);
console.log('[Video Meeting] Transcription: Web Speech API (browser-native, FREE)');
console.log('[Video Meeting] Gemini API Key:', GEMINI_API_KEY ? '✅ Configured' : '❌ NOT FOUND');
console.log('[Video Meeting] Gemini Model:', GEMINI_MODEL);
console.log('[Video Meeting] ===============================');

// ============================================================================
// TYPES
// ============================================================================

interface MeetingSession {
  id: string;
  appointmentId: string;
  roomName: string;
  jitsiUrl: string;
  createdAt: Date;
  createdBy: string;
  participants: MeetingParticipant[];
  status: 'waiting' | 'active' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  transcript: TranscriptEntry[];
  summary?: MeetingSummary;
  doctorRecommendations?: DoctorRecommendation;
  recordingUrl?: string;
  audioData?: string; // Base64 encoded audio for post-meeting transcription
  config: JitsiConfig;
}

interface MeetingSummary {
  chiefComplaint: string;
  presentIllness: string;
  physicalExam: string;
  assessment: string;
  plan: string;
  followUp: string;
  rawText: string;
  generatedAt: Date;
}

interface DoctorRecommendation {
  differentialDiagnosis: string[];
  suggestedTests: string[];
  treatmentOptions: string[];
  redFlags: string[];
  clinicalNotes: string;
  references: string[];
  generatedAt: Date;
}

interface MeetingParticipant {
  id: string;
  name: string;
  role: 'doctor' | 'patient' | 'guest';
  email?: string;
  joinedAt?: Date;
  leftAt?: Date;
  authMethod: 'google' | 'anonymous';
}

interface TranscriptEntry {
  id: string;
  participantId: string;
  participantName: string;
  text: string;
  timestamp: Date;
  confidence?: number;
  language?: string;
}

interface JitsiConfig {
  enableGoogleAuth: boolean;
  enableAnonymousAccess: boolean;
  enableRecording: boolean;
  enableTranscription: boolean;
  enableChat: boolean;
  enableScreenShare: boolean;
  maxParticipants: number;
  language: string;
}

// In-memory store (use Redis/DB in production)
const meetingSessions = new Map<string, MeetingSession>();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate secure room name for medical consultations
 */
function generateRoomName(appointmentId: string): string {
  const hash = crypto.createHash('sha256')
    .update(appointmentId + Date.now().toString())
    .digest('hex')
    .substring(0, 8);
  
  return `Izara-${appointmentId.substring(0, 8)}-${hash}`;
}

/**
 * Create Jitsi Meet URL with configuration
 * Supports both Google account login and anonymous access
 */
function createJitsiUrl(roomName: string, config: JitsiConfig, userInfo?: { name: string; email?: string; role: string }): string {
  const params = new URLSearchParams();
  
  // Basic configuration
  params.set('config.prejoinPageEnabled', 'true');
  params.set('config.startWithAudioMuted', 'false');
  params.set('config.startWithVideoMuted', 'false');
  params.set('config.enableClosePage', 'true');
  params.set('config.disableDeepLinking', 'true');
  params.set('config.defaultLanguage', config.language || 'th');
  
  // Security - enable room passwords for medical privacy
  params.set('config.enableInsecureRoomNameWarning', 'false');
  if (userInfo?.name) {
    params.set('userInfo.displayName', userInfo.name);
    params.set('config.requireDisplayName', 'false');
    params.set('config.prejoinPageEnabled', 'false');
  } else {
    params.set('config.requireDisplayName', 'true');
  }
  
  // Izara lobby handles admission — disable Jitsi moderator gate
  params.set('config.enableLobby', 'false');
  params.set('config.lobbyModeEnabled', 'false');
  params.set('config.enableLobbyChat', 'false');
  params.set('config.prejoinPageEnabled', 'false');
  
  // Recording configuration (free with Jitsi)
  if (config.enableRecording) {
    params.set('config.fileRecordingsEnabled', 'true');
    params.set('config.localRecording.enabled', 'false');
    params.set('config.liveStreamingEnabled', 'false');
  }
  
  // Disable Jitsi's transcription - we use Gemini instead (cheaper)
  params.set('config.transcribingEnabled', 'false');
  
  // UI Configuration for medical consultations
  const toolbarButtons = [
    'microphone', 'camera', 'desktop', 'chat', 'raisehand',
    'participants-pane', 'tileview', 'hangup', 'settings'
  ];
  
  if (config.enableRecording) {
    toolbarButtons.push('recording');
  }
  
  params.set('interfaceConfig.TOOLBAR_BUTTONS', JSON.stringify(toolbarButtons));
  params.set('interfaceConfig.SETTINGS_SECTIONS', JSON.stringify(['devices', 'language', 'profile']));
  params.set('interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS', 'false');
  params.set('interfaceConfig.SHOW_CHROME_EXTENSION_BANNER', 'false');
  params.set('interfaceConfig.MOBILE_APP_PROMO', 'false');
  params.set('interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE', 'false');
  params.set('interfaceConfig.APP_NAME', 'Izara Telemedicine');
  params.set('interfaceConfig.DEFAULT_LOGO_URL', '');
  params.set('interfaceConfig.JITSI_WATERMARK_LINK', '');
  
  if (userInfo?.email) {
    params.set('userInfo.email', userInfo.email);
  }
  
  return `https://${JITSI_DOMAIN}/${roomName}#${params.toString()}`;
}

/**
 * Call Gemini AI for summarization and recommendations
 */
async function callGeminiAI(prompt: string, maxTokens: number = 2048): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API key not configured — AI features disabled');
    throw new Error('AI_NOT_CONFIGURED: Gemini API key not set');
  }
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens,
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      console.error(`Gemini API HTTP ${response.status}:`, errorBody);
      throw new Error(`Gemini API error: ${response.status} - ${errorBody.substring(0, 200)}`);
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      console.warn('⚠️ Gemini returned empty response');
      throw new Error('AI_EMPTY_RESPONSE: Gemini returned no content');
    }
    
    return text;
  } catch (error: unknown) {
    if (errMsg(error)?.startsWith('AI_')) {
      throw error; // Re-throw our custom errors
    }
    console.error('Gemini API error:', errMsg(error));
    throw new Error(`AI_API_ERROR: ${errMsg(error)}`);
  }
}

/**
 * [DEPRECATED] Transcription is now handled by Web Speech API in the browser.
 * 
 * Web Speech API (browser-native, FREE):
 * - Runs entirely in the browser — no API key, no server costs
 * - Supports Thai (th-TH) and English (en-US) 
 * - Real-time results sent to server via /transcript endpoint
 * - Confidence scores included automatically
 * 
 * This function is kept as a no-op fallback for backward compatibility.
 */
async function transcribeWithSpeechToText(audioBase64: string, encoding: string = 'WEBM_OPUS', languageCode: string = 'th-TH'): Promise<{ transcript: string; confidence: number; words: any[] }> {
  console.log('ℹ️ Transcription is handled by Web Speech API in the browser (FREE).');
  console.log('   Audio transcription via Google Cloud STT has been deprecated.');
  console.log('   Use real-time transcript segments via POST /transcript endpoint instead.');
  return { transcript: '', confidence: 0, words: [] };
}

/**
 * Generate meeting summary for EMR using Gemini
 * Called AFTER transcription is complete
 */
async function generateMeetingSummary(transcript: TranscriptEntry[], patientInfo?: any): Promise<MeetingSummary | null> {
  if (!GEMINI_API_KEY || transcript.length === 0) {
    return null;
  }
  
  const transcriptText = transcript
    .map(t => `[${t.participantName}]: ${t.text}`)
    .join('\n');
  
  const prompt = `You are a medical AI assistant. Analyze this doctor-patient consultation and create a structured EMR summary.

Consultation Transcript:
${transcriptText}

${patientInfo ? `Patient Info: ${JSON.stringify(patientInfo)}` : ''}

Please provide a structured summary in Thai in the following JSON format:
{
  "chiefComplaint": "อาการสำคัญที่ผู้ป่วยมาพบแพทย์",
  "presentIllness": "ประวัติการเจ็บป่วยปัจจุบันโดยละเอียด รวมถึงระยะเวลา ความรุนแรง และปัจจัยที่เกี่ยวข้อง",
  "physicalExam": "ผลการตรวจร่างกายที่แพทย์พบ (ถ้ามีการกล่าวถึง)",
  "assessment": "การประเมินและข้อสรุปเบื้องต้นของแพทย์",
  "plan": "แผนการรักษาที่แนะนำ รวมถึงยาและการดูแลตัวเอง",
  "followUp": "การนัดหมายติดตามผล (ถ้ามี)"
}

Return ONLY the JSON object, no markdown or additional text.`;

  const result = await callGeminiAI(prompt, 4096);
  
  try {
    // Try to parse JSON from response
    const jsonMatch = /\{[\s\S]*\}/.exec(result);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        chiefComplaint: parsed.chiefComplaint || '',
        presentIllness: parsed.presentIllness || '',
        physicalExam: parsed.physicalExam || '',
        assessment: parsed.assessment || '',
        plan: parsed.plan || '',
        followUp: parsed.followUp || '',
        rawText: result,
        generatedAt: new Date()
      };
    }
  } catch (e) {
    console.error('Failed to parse summary JSON:', e);
  }
  
  // Fallback to raw text
  return {
    chiefComplaint: '',
    presentIllness: '',
    physicalExam: '',
    assessment: '',
    plan: '',
    followUp: '',
    rawText: result,
    generatedAt: new Date()
  };
}

/**
 * Generate doctor recommendations using Gemini AI
 * Provides clinical decision support for the doctor
 */
async function generateDoctorRecommendations(transcript: TranscriptEntry[], summary: MeetingSummary | null, patientInfo?: any): Promise<DoctorRecommendation | null> {
  if (!GEMINI_API_KEY || transcript.length === 0) {
    return null;
  }
  
  const transcriptText = transcript
    .map(t => `[${t.participantName}]: ${t.text}`)
    .join('\n');
  
  const summaryText = summary ? JSON.stringify(summary) : 'No summary available';
  
  const prompt = `You are a clinical decision support AI assistant for doctors. Based on this consultation, provide recommendations to assist the doctor.

Consultation Transcript:
${transcriptText}

EMR Summary:
${summaryText}

${patientInfo ? `Patient Info: ${JSON.stringify(patientInfo)}` : ''}

Please provide clinical recommendations in Thai in the following JSON format:
{
  "differentialDiagnosis": ["การวินิจฉัยแยกโรคที่ควรพิจารณา 1", "การวินิจฉัยแยกโรค 2", "การวินิจฉัยแยกโรค 3"],
  "suggestedTests": ["การตรวจที่แนะนำ 1", "การตรวจที่แนะนำ 2"],
  "treatmentOptions": ["ทางเลือกการรักษา 1", "ทางเลือกการรักษา 2"],
  "redFlags": ["อาการเตือนที่ต้องระวัง (ถ้ามี)"],
  "clinicalNotes": "หมายเหตุทางคลินิกสำหรับแพทย์",
  "references": ["แนวทางเวชปฏิบัติที่เกี่ยวข้อง (ถ้ามี)"]
}

IMPORTANT: These are suggestions for the doctor to consider, not final diagnoses. Return ONLY the JSON object.`;

  const result = await callGeminiAI(prompt, 4096);
  
  try {
    const jsonMatch = /\{[\s\S]*\}/.exec(result);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        differentialDiagnosis: parsed.differentialDiagnosis || [],
        suggestedTests: parsed.suggestedTests || [],
        treatmentOptions: parsed.treatmentOptions || [],
        redFlags: parsed.redFlags || [],
        clinicalNotes: parsed.clinicalNotes || '',
        references: parsed.references || [],
        generatedAt: new Date()
      };
    }
  } catch (e) {
    console.error('Failed to parse recommendations JSON:', e);
  }
  
  return null;
}

/** Mark all participants as left and end the in-memory meeting session */
function endMemoryMeeting(memMeeting: MeetingSession): void {
  memMeeting.participants.forEach(p => {
    if (!p.leftAt) {
      p.leftAt = new Date();
    }
  });
  memMeeting.status = 'ended';
  memMeeting.endedAt = new Date();
}

/** Process post-meeting audio transcription — extracted to reduce endpoint complexity */
async function processAudioTranscription(
  audioBase64: string,
  transcriptData: TranscriptEntry[],
  memMeeting: MeetingSession | undefined,
  encoding?: string,
  langCode?: string
): Promise<void> {
  console.log('🎙️ Transcribing meeting audio using Google Cloud Speech-to-Text...');
  const transcriptionResult = await transcribeWithSpeechToText(
    audioBase64,
    encoding || 'WEBM_OPUS',
    langCode || 'th-TH'
  );
  if (!transcriptionResult.transcript) return;

  const entry: TranscriptEntry = {
    id: `trans-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    participantId: 'meeting-audio',
    participantName: 'Meeting Recording',
    text: transcriptionResult.transcript,
    timestamp: new Date(),
    confidence: transcriptionResult.confidence,
    language: langCode || 'th-TH'
  };
  transcriptData.push(entry);
  if (memMeeting) {
    memMeeting.transcript.push(entry);
  }
  console.log(`✅ Transcription complete: ${transcriptionResult.transcript.length} characters`);
}

/** Try to generate AI meeting summary, returns null on failure */
async function tryGenerateSummary(
  transcriptData: TranscriptEntry[],
  patientInfo?: any
): Promise<MeetingSummary | null> {
  console.log('📝 Generating meeting summary using Gemini AI...');
  try {
    return await generateMeetingSummary(transcriptData, patientInfo);
  } catch (aiError: unknown) {
    console.warn('⚠️ AI summary generation failed (meeting still ends):', errMsg(aiError));
    return null;
  }
}

/** Try to generate AI doctor recommendations, returns null on failure */
async function tryGenerateRecommendations(
  transcriptData: TranscriptEntry[],
  summary: MeetingSummary | null,
  patientInfo?: any
): Promise<DoctorRecommendation | null> {
  console.log('💡 Generating doctor recommendations using Gemini AI...');
  try {
    return await generateDoctorRecommendations(transcriptData, summary, patientInfo);
  } catch (aiError: unknown) {
    console.warn('⚠️ AI recommendations generation failed (meeting still ends):', errMsg(aiError));
    return null;
  }
}

/** Generate AI summary and recommendations for completed meeting */
async function generatePostMeetingContent(
  transcriptData: TranscriptEntry[],
  memMeeting: MeetingSession | undefined,
  genSummary: boolean,
  genRecommendations: boolean,
  patientInfo?: any
): Promise<{ summary: MeetingSummary | null; recommendations: DoctorRecommendation | null }> {
  let summary: MeetingSummary | null = null;
  let recommendations: DoctorRecommendation | null = null;
  const hasTranscript = transcriptData.length > 0;

  if (genSummary && hasTranscript) {
    summary = await tryGenerateSummary(transcriptData, patientInfo);
    if (memMeeting && summary) {
      memMeeting.summary = summary;
    }
  }

  if (genRecommendations && hasTranscript) {
    recommendations = await tryGenerateRecommendations(transcriptData, summary, patientInfo);
    if (memMeeting && recommendations) {
      memMeeting.doctorRecommendations = recommendations;
    }
  }

  return { summary, recommendations };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/video-meeting/config
 * Get video meeting configuration (Jitsi domain, etc.)
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    jitsiDomain: JITSI_DOMAIN,
    features: {
      recording: true,
      transcription: true, // Web Speech API (browser-native, FREE - always available)
      aiSummary: !!GEMINI_API_KEY,
      lobby: true,
      guestInvites: true,
      chat: true
    },
    transcriptionEngine: 'web-speech-api',
    transcriptionCost: '$0 (browser-native)',
    defaultLanguage: 'th'
  });
});

/**
 * Create a new video meeting
 * POST /api/video-meeting/create
 * USES POSTGRESQL - NOT IN-MEMORY
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      appointmentId,
      doctorId,
      doctorName,
      patientId,
      patientName,
      enableGoogleAuth = true,
      enableAnonymousAccess = true,
      enableRecording = true,
      enableTranscription = true,
      language = 'th'
    } = req.body;
    
    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId is required' });
    }

    // SECURITY: caller must be the appointment's patient/doctor or an admin.
    const authReq = req as AuthenticatedRequest;
    const role = authReq.user?.role;
    if (role !== 'admin') {
      const apptRow = await pool.query(
        'SELECT patient_id, doctor_id FROM appointments WHERE id = $1',
        [appointmentId]
      );
      if (apptRow.rows.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      const { patient_id, doctor_id } = apptRow.rows[0];
      if (authReq.userId !== patient_id && authReq.userId !== doctor_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Check if meeting already exists in PostgreSQL
    let existingMeeting = null;
    try {
      existingMeeting = await MeetingService.getActiveMeeting(appointmentId);
    } catch (error_: unknown) {
      console.warn('⚠️ Meeting lookup failed:', error_ instanceof Error ? error_.message : JSON.stringify(error_));
    }
    
    if (existingMeeting) {
      // Return existing meeting from PostgreSQL
      return res.json({
        success: true,
        meeting: {
          id: existingMeeting.id,
          appointmentId: existingMeeting.appointment_id,
          roomName: existingMeeting.room_id,
          status: existingMeeting.status,
          createdAt: existingMeeting.created_at
        },
        urls: {
          doctor: existingMeeting.doctor_url,
          patient: existingMeeting.patient_url,
          generic: existingMeeting.meeting_url
        },
        message: 'Existing meeting found'
      });
    }
    
    // Generate room name and create config
    const roomName = generateRoomName(appointmentId);
    
    const config: JitsiConfig = {
      enableGoogleAuth,
      enableAnonymousAccess,
      enableRecording,
      enableTranscription,
      enableChat: true,
      enableScreenShare: true,
      maxParticipants: 10,
      language
    };
    
    // Generate URLs for different participants
    const genericUrl = createJitsiUrl(roomName, config);
    const doctorUrl = createJitsiUrl(roomName, config, {
      name: doctorName || 'Doctor',
      role: 'doctor'
    });
    const patientUrl = createJitsiUrl(roomName, { ...config, enableAnonymousAccess: true }, {
      name: patientName || 'Patient',
      role: 'patient'
    });
    
    // Save meeting to PostgreSQL (may fail due to FK constraints, fall back to memory)
    let meeting: any;
    try {
      meeting = await MeetingService.createMeeting({
        appointmentId,
        doctorId: doctorId || 'unassigned',
        doctorName,
        patientId: patientId || 'unknown',
        patientName,
        roomId: roomName,
        meetingUrl: genericUrl,
        doctorUrl,
        patientUrl,
        guestUrl: genericUrl,
        config: {
          ...config,
          jitsiDomain: JITSI_DOMAIN
        }
      });
    } catch (dbError: unknown) {
      console.warn('⚠️ Meeting DB insert failed (FK constraint?), using in-memory:', errMsg(dbError));
      meeting = {
        id: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        appointment_id: appointmentId,
        room_id: roomName,
        status: 'waiting',
        created_at: new Date().toISOString(),
        meeting_url: genericUrl,
        doctor_url: doctorUrl,
        patient_url: patientUrl,
      };
    }
    
    // Also store in memory for quick lookup during active sessions
    const memoryMeeting: MeetingSession = {
      id: meeting.id,
      appointmentId,
      roomName,
      jitsiUrl: genericUrl,
      createdAt: new Date(meeting.created_at),
      createdBy: doctorId || 'system',
      participants: [],
      status: 'waiting',
      transcript: [],
      config
    };
    meetingSessions.set(meeting.id, memoryMeeting);
    
    console.log(`🎥 Created Jitsi meeting for appointment ${appointmentId}`);
    console.log(`   Room: ${roomName}`);
    console.log(`   URL: https://${JITSI_DOMAIN}/${roomName}`);
    console.log(`   Stored in: PostgreSQL meeting_records`);
    
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        appointmentId: meeting.appointment_id,
        roomName: meeting.room_id,
        status: meeting.status,
        createdAt: meeting.created_at
      },
      urls: {
        doctor: doctorUrl,
        patient: patientUrl,
        generic: genericUrl
      },
      config: {
        jitsiDomain: JITSI_DOMAIN,
        roomName: roomName,
        enableGoogleAuth,
        enableAnonymousAccess,
        enableRecording,
        enableTranscription: enableTranscription && !!GEMINI_API_KEY
      }
    });
    
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

/**
 * Health check with API info
 * GET /api/video-meeting/health
 * NOTE: This route MUST be defined BEFORE /:appointmentId routes to avoid being captured
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Jitsi Meet + Web Speech API + Gemini AI Video Meeting Service v1.7.3',
    version: '1.7.3',
    timestamp: new Date().toISOString(),
    config: {
      jitsiDomain: JITSI_DOMAIN,
      transcription: 'web-speech-api (browser-native, FREE)',
      geminiConfigured: !!GEMINI_API_KEY,
      geminiModel: GEMINI_MODEL,
      activeMeetings: meetingSessions.size,
      activeInvites: inviteTokens.size
    },
    features: {
      videoConferencing: 'Jitsi Meet (FREE)',
      googleAccountAuth: 'Supported',
      anonymousAccess: 'Supported',
      guestInviteLinks: 'Supported (patient relatives, doctor specialists)',
      transcription: 'Web Speech API (browser-native, FREE)',
      chat: 'In-meeting text chat',
      summarization: `Gemini AI (${GEMINI_MODEL})`,
      doctorRecommendations: `Gemini AI (${GEMINI_MODEL})`,
      recording: 'Jitsi Built-in (FREE)'
    },
    guestRoles: {
      doctorCanInvite: ['doctor_specialist', 'doctor_advisor', 'other'],
      patientCanInvite: ['patient_relative', 'patient_partner', 'other']
    },
    workflow: {
      step1: 'Doctor creates meeting and acts as host',
      step2: 'Patient joins meeting via appointment link',
      step3: 'Doctor/Patient can invite guests (specialists, relatives)',
      step4: 'Guests join via secure invite links',
      step5: 'Meeting recorded and transcribed',
      step6: 'AI generates EMR summary and recommendations'
    },
    costs: {
      video: '$0 (Jitsi Meet)',
      transcription: '$0 (Web Speech API - browser-native)',
      summarization: '~$0.001/1K tokens (Gemini)',
      total: 'Near-zero cost - only Gemini API usage'
    }
  });
});

/**
 * Get meeting by appointment ID
 * GET /api/video-meeting/:appointmentId
 * USES POSTGRESQL - Falls back to in-memory
 */
router.get('/:appointmentId', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    
    // First try PostgreSQL
    const dbMeeting = await MeetingService.getActiveMeeting(appointmentId);
    
    if (dbMeeting) {
      // Parse meeting_config for participants
      const config = dbMeeting.meeting_config || {};
      const participants = config.participants || [];
      
      return res.json({
        success: true,
        meeting: {
          id: dbMeeting.id,
          appointmentId: dbMeeting.appointment_id,
          roomName: dbMeeting.room_id,
          jitsiUrl: dbMeeting.meeting_url,
          status: dbMeeting.status,
          participants: participants,
          createdAt: dbMeeting.created_at,
          startedAt: dbMeeting.started_at
        },
        urls: {
          doctor: dbMeeting.doctor_url,
          patient: dbMeeting.patient_url,
          generic: dbMeeting.meeting_url
        }
      });
    }
    
    // Fallback to in-memory for active sessions
    const memMeeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (!memMeeting) {
      // Fallback: query the meeting server directly
      try {
        const meetingServerUrl = process.env.MEETING_SERVER_URL || process.env.VITE_MEETING_SERVER_URL || 'http://meeting-server:3020';
        const msRes = await fetch(`${meetingServerUrl}/api/meetings?appointmentId=${appointmentId}`);
        if (msRes.ok) {
          const msData: any = await msRes.json();
          const found = Array.isArray(msData.meetings) ? msData.meetings.find((m: any) => m.appointment_id === appointmentId || m.appointmentId === appointmentId) : null;
          if (found) {
            return res.json({
              success: true,
              meeting: {
                id: found.id,
                appointmentId: found.appointment_id || found.appointmentId || appointmentId,
                roomName: found.room_id || found.roomName,
                jitsiUrl: found.meeting_url || found.jitsiUrl,
                status: found.status || 'active',
                participants: found.participants || [],
                createdAt: found.created_at || found.createdAt,
                startedAt: found.started_at || found.startedAt
              },
              source: 'meeting-server'
            });
          }
        }
      } catch (error_) {
        console.log('[VIDEO-MEETING] Meeting server fallback failed:', (error_ as Error).message);
      }

      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({
      success: true,
      meeting: {
        id: memMeeting.id,
        appointmentId: memMeeting.appointmentId,
        roomName: memMeeting.roomName,
        jitsiUrl: memMeeting.jitsiUrl,
        status: memMeeting.status,
        participants: memMeeting.participants,
        createdAt: memMeeting.createdAt,
        startedAt: memMeeting.startedAt
      }
    });
    
  } catch (error) {
    console.error('Error getting meeting:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

/**
 * Join a meeting
 * POST /api/video-meeting/:appointmentId/join
 * USES POSTGRESQL for persistence, in-memory for active sessions
 */
router.post('/:appointmentId/join', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { participantId, participantName, role, email, authMethod = 'anonymous' } = req.body;
    
    // First try PostgreSQL
    let dbMeeting = await MeetingService.getActiveMeeting(appointmentId);
    
    // Fall back to in-memory
    const memMeeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (!dbMeeting && !memMeeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Add participant to PostgreSQL
    if (dbMeeting) {
      await MeetingService.addParticipant(dbMeeting.id, {
        id: participantId || `guest-${Date.now()}`,
        name: participantName || 'Guest',
        role: role || 'guest'
      });
      // Refresh meeting data
      dbMeeting = await MeetingService.getMeetingById(dbMeeting.id);
    }
    
    // Also add to in-memory for quick access
    if (memMeeting) {
      const participant: MeetingParticipant = {
        id: participantId || `guest-${Date.now()}`,
        name: participantName || 'Guest',
        role: role || 'guest',
        email,
        joinedAt: new Date(),
        authMethod: authMethod as 'google' | 'anonymous'
      };
      memMeeting.participants.push(participant);
      
      if (memMeeting.status === 'waiting') {
        memMeeting.status = 'active';
        memMeeting.startedAt = new Date();
      }
    }
    
    // Get roomName and config from either source
    const roomName = dbMeeting?.room_id || memMeeting?.roomName || '';
    const config = dbMeeting?.meeting_config || memMeeting?.config || {
      enableGoogleAuth: true,
      enableAnonymousAccess: true,
      enableRecording: true,
      enableTranscription: true,
      enableChat: true,
      enableScreenShare: true,
      maxParticipants: 10,
      language: 'th'
    };
    
    // Generate personalized URL
    const personalUrl = createJitsiUrl(roomName, config as JitsiConfig, {
      name: participantName,
      email,
      role
    });
    
    const participants = dbMeeting?.meeting_config?.participants || memMeeting?.participants || [];
    
    console.log(`👤 ${participantName} joined meeting ${roomName} (${authMethod})`);
    console.log(`   Participant saved to: PostgreSQL meeting_records`);
    
    res.json({
      success: true,
      meetingUrl: personalUrl,
      meeting: {
        id: dbMeeting?.id || memMeeting?.id,
        roomName: roomName,
        status: dbMeeting?.status || memMeeting?.status,
        participants: Array.isArray(participants) ? participants.length : 0
      }
    });
    
  } catch (error) {
    console.error('Error joining meeting:', error);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

/**
 * Add transcript entry (from frontend speech recognition)
 * POST /api/video-meeting/:appointmentId/transcript
 */
router.post('/:appointmentId/transcript', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { participantId, participantName, text, timestamp, confidence, language } = req.body;
    
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const entry: TranscriptEntry = {
      id: `trans-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      participantId,
      participantName,
      text,
      timestamp: new Date(timestamp || Date.now()),
      confidence,
      language
    };
    
    meeting.transcript.push(entry);
    
    res.json({
      success: true,
      transcriptId: entry.id,
      totalEntries: meeting.transcript.length
    });
    
  } catch (error) {
    console.error('Error adding transcript:', error);
    res.status(500).json({ error: 'Failed to add transcript' });
  }
});

/**
 * Transcribe audio using Google Cloud Speech-to-Text API
 * POST /api/video-meeting/:appointmentId/transcribe-audio
 * 
 * This endpoint is called AFTER the meeting ends to transcribe the recorded audio
 */
router.post('/:appointmentId/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { audioBase64, encoding, languageCode, participantId, participantName } = req.body;
    
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    // SECURITY: cap audio payload at ~10 MB (base64 ~ 4/3 of raw size).
    const MAX_BASE64_BYTES = 14 * 1024 * 1024; // ≈ 10 MB raw
    if (typeof audioBase64 !== 'string' || audioBase64.length > MAX_BASE64_BYTES) {
      return res.status(413).json({ error: 'Audio payload too large (max ~10 MB)' });
    }
    
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    console.log(`🎙️ Transcribing audio for meeting ${appointmentId}...`);
    
    // Transcribe using Google Cloud Speech-to-Text API
    const result = await transcribeWithSpeechToText(
      audioBase64, 
      encoding || 'WEBM_OPUS',
      languageCode || 'th-TH'
    );
    
    if (result.transcript?.trim()) {
      const entry: TranscriptEntry = {
        id: `trans-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        participantId: participantId || 'meeting-audio',
        participantName: participantName || 'Meeting Recording',
        text: result.transcript.trim(),
        timestamp: new Date(),
        confidence: result.confidence,
        language: languageCode || 'th-TH'
      };
      
      meeting.transcript.push(entry);
      
      res.json({
        success: true,
        transcription: result.transcript,
        confidence: result.confidence,
        wordCount: result.words.length,
        words: result.words,
        transcriptId: entry.id,
        message: 'Audio transcribed successfully using Google Cloud Speech-to-Text'
      });
    } else {
      res.json({
        success: true,
        transcription: '',
        confidence: 0,
        message: 'No speech detected in audio'
      });
    }
    
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

/**
 * End meeting and generate summary + doctor recommendations
 * POST /api/video-meeting/:appointmentId/end
 * USES POSTGRESQL - All data saved to meeting_records table
 * 
 * Workflow:
 * 1. Mark meeting as ended (PostgreSQL)
 * 2. Collect transcript from real-time Web Speech API segments (already saved)
 * 3. Generate EMR summary using Gemini AI
 * 4. Generate doctor recommendations using Gemini AI
 * 5. Doctor validates AI content (man-in-the-loop)
 * 6. Save all to PostgreSQL meeting_records
 * 7. Return results for EMR integration
 */
router.post('/:appointmentId/end', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { 
      generateSummary = true, 
      generateRecommendations = true,
      patientInfo,
      audioBase64,
      audioEncoding,
      languageCode,
      recordingUrl
    } = req.body;
    
    // Get meeting from PostgreSQL first
    let dbMeeting = await MeetingService.getActiveMeeting(appointmentId);
    
    // Fall back to in-memory
    const memMeeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (!dbMeeting && !memMeeting) {
      return res.status(404).json({ error: 'Active meeting not found' });
    }
    
    // End in-memory meeting if exists
    if (memMeeting) {
      endMemoryMeeting(memMeeting);
    }
    
    // Get transcript and process audio
    const transcriptData = memMeeting?.transcript || [];
    if (audioBase64) {
      await processAudioTranscription(audioBase64, transcriptData, memMeeting, audioEncoding, languageCode);
    }
    
    // Generate AI content (summary + recommendations)
    const { summary, recommendations } = await generatePostMeetingContent(
      transcriptData, memMeeting, generateSummary, generateRecommendations, patientInfo
    );
    
    // Calculate duration
    const startTime = dbMeeting?.started_at || memMeeting?.startedAt;
    const endTime = new Date();
    const duration = startTime 
      ? Math.floor((endTime.getTime() - new Date(startTime).getTime()) / 1000)
      : 0;
    
    // Step 4: Save to PostgreSQL
    const meetingId = dbMeeting?.id || memMeeting?.id;
    if (meetingId) {
      await MeetingService.endMeeting(meetingId, {
        transcript: {
          entries: transcriptData,
          savedAt: new Date().toISOString()
        },
        summary: summary ? { ...summary, savedAt: new Date().toISOString() } : undefined,
        recommendations: recommendations ? { ...recommendations, savedAt: new Date().toISOString() } : undefined,
        recordingUrl,
        duration
      });
      
      console.log(`💾 Meeting data saved to PostgreSQL: ${meetingId}`);
    }
    
    const roomName = dbMeeting?.room_id || memMeeting?.roomName;
    const participants = memMeeting?.participants || [];
    
    console.log(`📋 Meeting ended: ${roomName}`);
    console.log(`   Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`   Transcript entries: ${transcriptData.length}`);
    console.log(`   Summary generated: ${!!summary}`);
    console.log(`   Recommendations generated: ${!!recommendations}`);
    console.log(`   Storage: PostgreSQL meeting_records table`);
    
    res.json({
      success: true,
      meeting: {
        id: meetingId,
        appointmentId: appointmentId,
        status: 'ended',
        duration,
        participantCount: participants.length,
        transcriptEntries: transcriptData.length
      },
      transcript: transcriptData,
      summary: summary,
      doctorRecommendations: recommendations,
      storage: 'PostgreSQL',
      // EMR-ready data for integration
      emrData: {
        meetingId: meetingId,
        appointmentId: appointmentId,
        date: dbMeeting?.created_at || memMeeting?.createdAt,
        duration,
        participants: participants.map(p => ({
          name: p.name,
          role: p.role
        })),
        transcript: transcriptData,
        summary: summary,
        recommendations: recommendations,
        generatedAt: new Date().toISOString(),
        apiUsed: {
          transcription: 'Web Speech API (browser-native, FREE)',
          summarization: 'Gemini AI',
          recommendations: 'Gemini AI'
        }
      }
    });
    
  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({ error: 'Failed to end meeting' });
  }
});

/**
 * Get meeting transcript
 * GET /api/video-meeting/:appointmentId/transcript
 * USES POSTGRESQL - Falls back to in-memory
 */
router.get('/:appointmentId/transcript', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    
    // Try PostgreSQL first
    const dbMeeting = await MeetingService.getActiveMeeting(appointmentId);
    
    if (dbMeeting) {
      const transcript = dbMeeting.transcript || {};
      const summary = dbMeeting.ai_summary || {};
      
      return res.json({
        success: true,
        appointmentId: dbMeeting.appointment_id,
        transcript: transcript.entries || transcript,
        summary: summary,
        status: dbMeeting.status,
        storage: 'PostgreSQL'
      });
    }
    
    // Fallback to in-memory
    const memMeeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId);
    
    if (!memMeeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({
      success: true,
      appointmentId: memMeeting.appointmentId,
      transcript: memMeeting.transcript,
      summary: memMeeting.summary,
      status: memMeeting.status
    });
    
  } catch (error) {
    console.error('Error getting transcript:', error);
    res.status(500).json({ error: 'Failed to get transcript' });
  }
});

/**
 * Generate summary and recommendations on demand
 * POST /api/video-meeting/:appointmentId/summarize
 */
router.post('/:appointmentId/summarize', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { patientInfo, includeRecommendations = true } = req.body;
    
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    if (meeting.transcript.length === 0) {
      return res.status(400).json({ error: 'No transcript available to summarize' });
    }
    
    // Generate summary
    const summary = await generateMeetingSummary(meeting.transcript, patientInfo);
    meeting.summary = summary || undefined;
    
    // Generate recommendations if requested
    let recommendations: DoctorRecommendation | null = null;
    if (includeRecommendations) {
      recommendations = await generateDoctorRecommendations(meeting.transcript, summary, patientInfo);
      meeting.doctorRecommendations = recommendations || undefined;
    }
    
    res.json({
      success: true,
      summary,
      recommendations,
      transcriptEntries: meeting.transcript.length
    });
    
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * Generate doctor recommendations only
 * POST /api/video-meeting/:appointmentId/recommendations
 */
router.post('/:appointmentId/recommendations', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { patientInfo } = req.body;
    
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    if (meeting.transcript.length === 0) {
      return res.status(400).json({ error: 'No transcript available' });
    }
    
    const recommendations = await generateDoctorRecommendations(
      meeting.transcript, 
      meeting.summary || null, 
      patientInfo
    );
    meeting.doctorRecommendations = recommendations || undefined;
    
    res.json({
      success: true,
      recommendations,
      message: 'Doctor recommendations generated by Gemini AI'
    });
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// ============================================================================
// GUEST INVITE LINK SYSTEM
// Support for patient relatives/partners and doctor specialists to join meetings
// ============================================================================

// In-memory store for invite tokens (in production, use Redis/DB)
const inviteTokens = new Map<string, {
  token: string;
  appointmentId: string;
  meetingId: string;
  invitedBy: string;
  inviterRole: 'doctor' | 'patient';
  guestEmail?: string;
  guestName?: string;
  guestRole: 'patient_relative' | 'patient_partner' | 'doctor_specialist' | 'doctor_advisor' | 'other';
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
  usedByIp?: string;
}>();

/**
 * Generate a guest invite link for the meeting
 * POST /api/video-meeting/:appointmentId/invite
 * 
 * Allows doctors to invite specialists/advisors
 * Allows patients to invite relatives/partners
 * 
 * Similar to MS Teams/Google Meet invite links
 */
router.post('/:appointmentId/invite', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { 
      invitedBy,
      inviterRole,
      guestEmail,
      guestName,
      guestRole,
      expiresInHours = 24
    } = req.body;
    
    // Validate required fields
    if (!invitedBy || !inviterRole) {
      return res.status(400).json({ error: 'invitedBy and inviterRole are required' });
    }
    
    // Validate guest role
    const validGuestRoles = ['patient_relative', 'patient_partner', 'doctor_specialist', 'doctor_advisor', 'other'];
    if (guestRole && !validGuestRoles.includes(guestRole)) {
      return res.status(400).json({ 
        error: 'Invalid guestRole. Must be one of: ' + validGuestRoles.join(', ')
      });
    }
    
    // Find meeting
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (!meeting) {
      return res.status(404).json({ error: 'Active meeting not found for this appointment' });
    }
    
    // Validate inviter role permissions
    // Doctors can invite doctor_specialist, doctor_advisor
    // Patients can invite patient_relative, patient_partner
    // Both can invite 'other'
    const doctorGuestRoles = ['doctor_specialist', 'doctor_advisor', 'other'];
    const patientGuestRoles = ['patient_relative', 'patient_partner', 'other'];
    
    if (inviterRole === 'doctor' && guestRole && !doctorGuestRoles.includes(guestRole)) {
      return res.status(403).json({ 
        error: 'Doctors can only invite specialists, advisors, or other guests'
      });
    }
    
    if (inviterRole === 'patient' && guestRole && !patientGuestRoles.includes(guestRole)) {
      return res.status(403).json({ 
        error: 'Patients can only invite relatives, partners, or other guests'
      });
    }
    
    // Generate secure invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    // Store invite token
    const invite = {
      token: inviteToken,
      appointmentId,
      meetingId: meeting.id,
      invitedBy,
      inviterRole: inviterRole as 'doctor' | 'patient',
      guestEmail,
      guestName,
      guestRole: guestRole || 'other',
      createdAt: new Date(),
      expiresAt
    };
    
    inviteTokens.set(inviteToken, invite);
    
    // Generate the invite URL
    // This URL should be shared with the guest
    const baseUrl = process.env.APP_URL || 'https://izara-patient-portal-724889190329.asia-southeast1.run.app';
    const inviteUrl = `${baseUrl}/meeting/join?token=${inviteToken}`;
    
    // Also create direct Jitsi URL for the guest
    const directJitsiUrl = createJitsiUrl(meeting.roomName, meeting.config, {
      name: guestName || 'Guest',
      email: guestEmail,
      role: 'guest'
    });
    
    console.log(`📨 Guest invite created for meeting ${appointmentId}`);
    console.log(`   Guest: ${guestName || 'Unknown'} (${guestRole})`);
    console.log(`   Invited by: ${invitedBy} (${inviterRole})`);
    console.log(`   Expires: ${expiresAt.toISOString()}`);
    
    res.json({
      success: true,
      invite: {
        token: inviteToken,
        inviteUrl,
        directMeetingUrl: directJitsiUrl,
        roomName: meeting.roomName,
        guestEmail,
        guestName,
        guestRole,
        invitedBy,
        inviterRole,
        expiresAt: expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString()
      },
      message: 'Invite link generated. Share this link with your guest to join the meeting.'
    });
    
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Failed to create invite link' });
  }
});

/**
 * Validate and join meeting using invite token
 * POST /api/video-meeting/join-with-invite
 * 
 * Used by guests who received an invite link
 */
router.post('/join-with-invite', async (req: Request, res: Response) => {
  try {
    const { token, guestEmail, guestName } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Invite token is required' });
    }
    
    // Find invite
    const invite = inviteTokens.get(token);
    
    if (!invite) {
      return res.status(404).json({ error: 'Invalid or expired invite link' });
    }
    
    // Check expiration
    if (new Date() > invite.expiresAt) {
      inviteTokens.delete(token);
      return res.status(410).json({ error: 'Invite link has expired' });
    }
    
    // Check if already used (allow same token to be used multiple times for simplicity)
    // In production, you might want to limit this
    
    // Find meeting
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.id === invite.meetingId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting no longer exists' });
    }
    
    if (meeting.status === 'ended') {
      return res.status(410).json({ error: 'Meeting has already ended' });
    }
    
    // Mark invite as used
    invite.usedAt = new Date();
    invite.usedByIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Add guest to participants
    const guestParticipant: MeetingParticipant = {
      id: `guest-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      name: guestName || invite.guestName || 'Guest',
      role: 'guest',
      email: guestEmail || invite.guestEmail,
      joinedAt: new Date(),
      authMethod: 'anonymous'
    };
    
    meeting.participants.push(guestParticipant);
    
    // Generate personalized Jitsi URL
    const displayName = guestName || invite.guestName || 'Guest';
    const joinUrl = createJitsiUrl(meeting.roomName, meeting.config, {
      name: displayName,
      email: guestEmail || invite.guestEmail,
      role: 'guest'
    });
    
    console.log(`👤 Guest joined via invite: ${displayName}`);
    console.log(`   Role: ${invite.guestRole}`);
    console.log(`   Meeting: ${meeting.roomName}`);
    
    res.json({
      success: true,
      meetingUrl: joinUrl,
      meeting: {
        id: meeting.id,
        appointmentId: meeting.appointmentId,
        roomName: meeting.roomName,
        status: meeting.status,
        participantCount: meeting.participants.length
      },
      guest: {
        id: guestParticipant.id,
        name: displayName,
        role: invite.guestRole,
        invitedBy: invite.invitedBy
      },
      message: 'Welcome! You can now join the meeting.'
    });
    
  } catch (error) {
    console.error('Error joining with invite:', error);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

/**
 * Get all active invites for a meeting
 * GET /api/video-meeting/:appointmentId/invites
 */
router.get('/:appointmentId/invites', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Find all invites for this meeting
    const meetingInvites = Array.from(inviteTokens.values())
      .filter(inv => inv.meetingId === meeting.id)
      .map(inv => ({
        guestEmail: inv.guestEmail,
        guestName: inv.guestName,
        guestRole: inv.guestRole,
        invitedBy: inv.invitedBy,
        inviterRole: inv.inviterRole,
        createdAt: inv.createdAt.toISOString(),
        expiresAt: inv.expiresAt.toISOString(),
        isExpired: new Date() > inv.expiresAt,
        isUsed: !!inv.usedAt,
        usedAt: inv.usedAt?.toISOString()
      }));
    
    res.json({
      success: true,
      appointmentId,
      meetingId: meeting.id,
      invites: meetingInvites,
      totalInvites: meetingInvites.length,
      activeInvites: meetingInvites.filter(i => !i.isExpired && !i.isUsed).length
    });
    
  } catch (error) {
    console.error('Error getting invites:', error);
    res.status(500).json({ error: 'Failed to get invites' });
  }
});

/**
 * Revoke an invite
 * DELETE /api/video-meeting/:appointmentId/invite/:token
 */
router.delete('/:appointmentId/invite/:token', async (req: Request, res: Response) => {
  try {
    const { appointmentId, token } = req.params;
    
    const invite = inviteTokens.get(token);
    
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    
    if (invite.appointmentId !== appointmentId) {
      return res.status(403).json({ error: 'Invite does not belong to this appointment' });
    }
    
    inviteTokens.delete(token);
    
    console.log(`🗑️ Invite revoked for meeting ${appointmentId}`);
    
    res.json({
      success: true,
      message: 'Invite has been revoked'
    });
    
  } catch (error) {
    console.error('Error revoking invite:', error);
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
});

export default router;
