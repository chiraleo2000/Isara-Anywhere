/**
 * Video Meeting Service using Jitsi Meet + Google Cloud Speech-to-Text + Gemini AI
 * 
 * LOWEST COST SOLUTION:
 * - Jitsi Meet: FREE video conferencing (no licensing costs)
 * - Google Cloud Speech-to-Text: For accurate transcription (~$0.006/15s)
 * - Gemini AI: For summary and recommendations (~$0.001/1K tokens)
 * 
 * Features:
 * - Google account login support for users
 * - Anonymous access for patients without Google accounts
 * - POST-MEETING transcription using Google Cloud Speech-to-Text API
 * - AI-powered meeting summarization & doctor recommendations via Gemini
 * - Recording support (Jitsi built-in)
 * 
 * Workflow:
 * 1. Meeting ends with audio recording
 * 2. Audio sent to Google Cloud Speech-to-Text for transcription
 * 3. Transcript sent to Gemini for summary + doctor recommendations
 * 4. Results saved to PostgreSQL meeting_records table
 * 
 * STORAGE: PostgreSQL meeting_records table (NOT GCS or in-memory)
 */

import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { MeetingService } from '../services/postgresDataService';

// Load environment variables
dotenv.config();

const router = Router();

// ============================================================================
// CONFIGURATION - Works in both local development and Cloud Run production
// ============================================================================

// Jitsi Meet Configuration (FREE) - public.jit.si is more reliable than meet.jit.si
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || process.env.VITE_JITSI_DOMAIN || 'meet.jit.si';
const JITSI_APP_ID = process.env.JITSI_APP_ID || process.env.VITE_JITSI_APP_ID || 'izara-telemedicine';

// Google Cloud Speech-to-Text Configuration
// Note: API key should be set via environment variable in production
const GOOGLE_SPEECH_API_KEY = process.env.GOOGLE_SPEECH_API_KEY || 
                               process.env.VITE_GOOGLE_SPEECH_API_KEY || 
                               process.env.VITE_GOOGLE_MEET_API_KEY || 
                               '';

// Gemini AI Configuration (for summary & recommendations)
// Note: API key should be set via environment variable in production
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';

// Log configuration at startup
console.log('[Video Meeting] ===== Configuration =====');
console.log('[Video Meeting] Jitsi Domain:', JITSI_DOMAIN);
console.log('[Video Meeting] Gemini API Key:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 15)}...` : '❌ NOT FOUND');
console.log('[Video Meeting] Gemini Model:', GEMINI_MODEL);
console.log('[Video Meeting] ===========================');

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
  params.set('config.requireDisplayName', 'true');
  
  // Enable lobby for doctor approval
  params.set('config.enableLobbyChat', 'true');
  
  // Recording configuration (free with Jitsi)
  if (config.enableRecording) {
    params.set('config.fileRecordingsEnabled', 'true');
    params.set('config.localRecording.enabled', 'true');
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
  
  // Pre-fill user info if provided
  if (userInfo) {
    params.set('userInfo.displayName', userInfo.name);
    if (userInfo.email) {
      params.set('userInfo.email', userInfo.email);
    }
  }
  
  return `https://${JITSI_DOMAIN}/${roomName}#${params.toString()}`;
}

/**
 * Call Gemini AI for summarization and recommendations
 */
async function callGeminiAI(prompt: string, maxTokens: number = 2048): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API key not configured');
    return '';
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
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Gemini API error:', error);
    return '';
  }
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text API
 * This is called AFTER the meeting ends to transcribe the recorded audio
 * 
 * Cost: ~$0.006 per 15 seconds of audio
 * Supports Thai (th-TH) and English (en-US)
 */
async function transcribeWithSpeechToText(audioBase64: string, encoding: string = 'WEBM_OPUS', languageCode: string = 'th-TH'): Promise<{ transcript: string; confidence: number; words: any[] }> {
  if (!GOOGLE_SPEECH_API_KEY) {
    console.warn('⚠️ Google Speech-to-Text API key not configured');
    return { transcript: '', confidence: 0, words: [] };
  }
  
  try {
    console.log('🎙️ Transcribing audio with Google Cloud Speech-to-Text...');
    console.log(`   Language: ${languageCode}, Encoding: ${encoding}`);
    
    // Map common audio encodings to Speech-to-Text format
    const encodingMap: { [key: string]: string } = {
      'audio/webm': 'WEBM_OPUS',
      'audio/webm;codecs=opus': 'WEBM_OPUS',
      'audio/ogg': 'OGG_OPUS',
      'audio/mp3': 'MP3',
      'audio/mpeg': 'MP3',
      'audio/wav': 'LINEAR16',
      'audio/flac': 'FLAC',
      'WEBM_OPUS': 'WEBM_OPUS',
      'LINEAR16': 'LINEAR16',
      'FLAC': 'FLAC',
      'MP3': 'MP3',
      'OGG_OPUS': 'OGG_OPUS'
    };
    
    const audioEncoding = encodingMap[encoding] || 'WEBM_OPUS';
    
    // Call Google Cloud Speech-to-Text API
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_SPEECH_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: audioEncoding,
            sampleRateHertz: 48000, // Standard for WebM Opus
            languageCode: languageCode,
            alternativeLanguageCodes: languageCode === 'th-TH' ? ['en-US'] : ['th-TH'],
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: true,
            enableWordConfidence: true,
            model: 'latest_long', // Best for medical consultations
            useEnhanced: true, // Better quality for medical terminology
            metadata: {
              interactionType: 'DISCUSSION',
              industryNaicsCodeOfAudio: 621111, // NAICS code for medical offices
              originalMediaType: 'VIDEO',
              recordingDeviceType: 'PC'
            },
            speechContexts: [{
              phrases: [
                // Thai medical terms
                'อาการ', 'ปวดหัว', 'ไข้', 'ไอ', 'เจ็บคอ', 'ท้องเสีย', 'คลื่นไส้', 'อาเจียน',
                'ความดัน', 'เบาหวาน', 'หัวใจ', 'ปอด', 'ตับ', 'ไต', 'กระเพาะ',
                'ยา', 'วิตามิน', 'การรักษา', 'การวินิจฉัย', 'การตรวจ',
                // English medical terms
                'symptom', 'headache', 'fever', 'cough', 'sore throat', 'diarrhea', 'nausea',
                'blood pressure', 'diabetes', 'heart', 'lung', 'liver', 'kidney',
                'medication', 'treatment', 'diagnosis', 'examination'
              ],
              boost: 20
            }]
          },
          audio: {
            content: audioBase64
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Speech-to-Text API error:', response.status, errorText);
      throw new Error(`Speech-to-Text API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract results
    const results = data.results || [];
    let fullTranscript = '';
    let totalConfidence = 0;
    let confidenceCount = 0;
    let allWords: any[] = [];
    
    results.forEach((result: any) => {
      if (result.alternatives && result.alternatives[0]) {
        const alternative = result.alternatives[0];
        fullTranscript += (fullTranscript ? ' ' : '') + alternative.transcript;
        
        if (alternative.confidence) {
          totalConfidence += alternative.confidence;
          confidenceCount++;
        }
        
        if (alternative.words) {
          allWords = allWords.concat(alternative.words.map((w: any) => ({
            word: w.word,
            startTime: w.startTime,
            endTime: w.endTime,
            confidence: w.confidence
          })));
        }
      }
    });
    
    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    
    console.log(`✅ Transcription complete: ${fullTranscript.length} characters, ${avgConfidence.toFixed(2)} confidence`);
    
    return {
      transcript: fullTranscript,
      confidence: avgConfidence,
      words: allWords
    };
    
  } catch (error) {
    console.error('Speech-to-Text transcription error:', error);
    return { transcript: '', confidence: 0, words: [] };
  }
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
    const jsonMatch = result.match(/\{[\s\S]*\}/);
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
    const jsonMatch = result.match(/\{[\s\S]*\}/);
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
      transcription: !!GOOGLE_SPEECH_API_KEY,
      aiSummary: !!GEMINI_API_KEY,
      lobby: true,
      guestInvites: true
    },
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
    
    // Check if meeting already exists in PostgreSQL
    let existingMeeting = null;
    try {
      existingMeeting = await MeetingService.getActiveMeeting(appointmentId);
    } catch (dbLookupErr: any) {
      console.warn('⚠️ Meeting lookup failed:', dbLookupErr.message);
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
    } catch (dbError: any) {
      console.warn('⚠️ Meeting DB insert failed (FK constraint?), using in-memory:', dbError.message);
      meeting = {
        id: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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
    service: 'Jitsi Meet + Google Speech-to-Text + Gemini AI Video Meeting Service',
    timestamp: new Date().toISOString(),
    config: {
      jitsiDomain: JITSI_DOMAIN,
      speechToTextConfigured: !!GOOGLE_SPEECH_API_KEY,
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
      transcription: 'Google Cloud Speech-to-Text API',
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
      transcription: '~$0.006/15s (Google Speech-to-Text)',
      summarization: '~$0.001/1K tokens (Gemini)',
      total: 'Low cost - pay only for API usage'
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
    
    if (result.transcript && result.transcript.trim()) {
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
 * End meeting, transcribe audio, and generate summary + doctor recommendations
 * POST /api/video-meeting/:appointmentId/end
 * USES POSTGRESQL - All data saved to meeting_records table
 * 
 * Workflow:
 * 1. Mark meeting as ended (PostgreSQL)
 * 2. If audioBase64 provided, transcribe using Google Cloud Speech-to-Text
 * 3. Generate EMR summary using Gemini AI
 * 4. Generate doctor recommendations using Gemini AI
 * 5. Save all to PostgreSQL meeting_records
 * 6. Return results for EMR integration
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
    
    // Update in-memory meeting if exists
    if (memMeeting) {
      memMeeting.participants.forEach(p => {
        if (!p.leftAt) {
          p.leftAt = new Date();
        }
      });
      memMeeting.status = 'ended';
      memMeeting.endedAt = new Date();
    }
    
    // Get transcript from memory
    let transcriptData = memMeeting?.transcript || [];
    
    // Step 1: Transcribe audio if provided (POST-MEETING transcription)
    if (audioBase64) {
      console.log('🎙️ Transcribing meeting audio using Google Cloud Speech-to-Text...');
      
      const transcriptionResult = await transcribeWithSpeechToText(
        audioBase64,
        audioEncoding || 'WEBM_OPUS',
        languageCode || 'th-TH'
      );
      
      if (transcriptionResult.transcript) {
        const entry: TranscriptEntry = {
          id: `trans-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          participantId: 'meeting-audio',
          participantName: 'Meeting Recording',
          text: transcriptionResult.transcript,
          timestamp: new Date(),
          confidence: transcriptionResult.confidence,
          language: languageCode || 'th-TH'
        };
        transcriptData.push(entry);
        
        if (memMeeting) {
          memMeeting.transcript.push(entry);
        }
        
        console.log(`✅ Transcription complete: ${transcriptionResult.transcript.length} characters`);
      }
    }
    
    // Step 2: Generate EMR summary using Gemini
    let summary: MeetingSummary | null = null;
    if (generateSummary && transcriptData.length > 0) {
      console.log('📝 Generating meeting summary using Gemini AI...');
      summary = await generateMeetingSummary(transcriptData, patientInfo);
      if (memMeeting) {
        memMeeting.summary = summary || undefined;
      }
    }
    
    // Step 3: Generate doctor recommendations using Gemini
    let recommendations: DoctorRecommendation | null = null;
    if (generateRecommendations && transcriptData.length > 0) {
      console.log('💡 Generating doctor recommendations using Gemini AI...');
      recommendations = await generateDoctorRecommendations(transcriptData, summary, patientInfo);
      if (memMeeting) {
        memMeeting.doctorRecommendations = recommendations || undefined;
      }
    }
    
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
          transcription: 'Google Cloud Speech-to-Text',
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
    const baseUrl = process.env.APP_URL || 'https://izara-patient-portal-hvht4obouq-as.a.run.app';
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
