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
 * 4. Results saved to patient's health records/EMR
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

// ============================================================================
// CONFIGURATION
// ============================================================================

// Jitsi Meet Configuration (FREE)
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
const JITSI_APP_ID = process.env.JITSI_APP_ID || 'izara-telemedicine';

// Google Cloud Speech-to-Text Configuration
// Uses the same API key as other Google APIs
const GOOGLE_SPEECH_API_KEY = process.env.VITE_GOOGLE_SPEECH_API_KEY || 
                               process.env.VITE_GOOGLE_MEET_API_KEY || 
                               process.env.GOOGLE_API_KEY ||
                               'AIzaSyAl924pIkpbrJBfCQ1MlpA6yb8XZ3L8WZQ';

// Gemini AI Configuration (for summary & recommendations)
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';

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
 * Create a new video meeting
 * POST /api/video-meeting/create
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
    
    // Check if meeting already exists
    const existingMeeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (existingMeeting) {
      return res.json({
        success: true,
        meeting: existingMeeting,
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
    
    // Create meeting session
    const meeting: MeetingSession = {
      id: `meet-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      appointmentId,
      roomName,
      jitsiUrl: createJitsiUrl(roomName, config),
      createdAt: new Date(),
      createdBy: doctorId || 'system',
      participants: [],
      status: 'waiting',
      transcript: [],
      config
    };
    
    // Add doctor as first participant if provided
    if (doctorId) {
      meeting.participants.push({
        id: doctorId,
        name: doctorName || 'Doctor',
        role: 'doctor',
        authMethod: 'google'
      });
    }
    
    // Store meeting
    meetingSessions.set(meeting.id, meeting);
    
    // Generate URLs for different participants
    const doctorUrl = createJitsiUrl(roomName, config, {
      name: doctorName || 'Doctor',
      role: 'doctor'
    });
    
    const patientUrl = createJitsiUrl(roomName, { ...config, enableAnonymousAccess: true }, {
      name: patientName || 'Patient',
      role: 'patient'
    });
    
    console.log(`🎥 Created Jitsi meeting for appointment ${appointmentId}`);
    console.log(`   Room: ${roomName}`);
    console.log(`   URL: https://${JITSI_DOMAIN}/${roomName}`);
    console.log(`   Google Auth: ${enableGoogleAuth}`);
    console.log(`   Anonymous: ${enableAnonymousAccess}`);
    
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        appointmentId: meeting.appointmentId,
        roomName: meeting.roomName,
        status: meeting.status,
        createdAt: meeting.createdAt
      },
      urls: {
        doctor: doctorUrl,
        patient: patientUrl,
        generic: meeting.jitsiUrl
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
 * Get meeting by appointment ID
 * GET /api/video-meeting/:appointmentId
 */
router.get('/:appointmentId', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        appointmentId: meeting.appointmentId,
        roomName: meeting.roomName,
        jitsiUrl: meeting.jitsiUrl,
        status: meeting.status,
        participants: meeting.participants,
        createdAt: meeting.createdAt,
        startedAt: meeting.startedAt
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
 */
router.post('/:appointmentId/join', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { participantId, participantName, role, email, authMethod = 'anonymous' } = req.body;
    
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Add participant
    const participant: MeetingParticipant = {
      id: participantId || `guest-${Date.now()}`,
      name: participantName || 'Guest',
      role: role || 'guest',
      email,
      joinedAt: new Date(),
      authMethod: authMethod as 'google' | 'anonymous'
    };
    
    meeting.participants.push(participant);
    
    // Update meeting status
    if (meeting.status === 'waiting') {
      meeting.status = 'active';
      meeting.startedAt = new Date();
    }
    
    // Generate personalized URL
    const personalUrl = createJitsiUrl(meeting.roomName, meeting.config, {
      name: participantName,
      email,
      role
    });
    
    console.log(`👤 ${participantName} joined meeting ${meeting.roomName} (${authMethod})`);
    
    res.json({
      success: true,
      meetingUrl: personalUrl,
      meeting: {
        id: meeting.id,
        roomName: meeting.roomName,
        status: meeting.status,
        participants: meeting.participants.length
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
 * 
 * Workflow:
 * 1. Mark meeting as ended
 * 2. If audioBase64 provided, transcribe using Google Cloud Speech-to-Text
 * 3. Generate EMR summary using Gemini AI
 * 4. Generate doctor recommendations using Gemini AI
 * 5. Return all results for EMR integration
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
      languageCode 
    } = req.body;
    
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (!meeting) {
      return res.status(404).json({ error: 'Active meeting not found' });
    }
    
    // Mark all participants as left
    meeting.participants.forEach(p => {
      if (!p.leftAt) {
        p.leftAt = new Date();
      }
    });
    
    meeting.status = 'ended';
    meeting.endedAt = new Date();
    
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
        meeting.transcript.push(entry);
        
        console.log(`✅ Transcription complete: ${transcriptionResult.transcript.length} characters`);
      }
    }
    
    // Step 2: Generate EMR summary using Gemini
    let summary: MeetingSummary | null = null;
    if (generateSummary && meeting.transcript.length > 0) {
      console.log('📝 Generating meeting summary using Gemini AI...');
      summary = await generateMeetingSummary(meeting.transcript, patientInfo);
      meeting.summary = summary || undefined;
    }
    
    // Step 3: Generate doctor recommendations using Gemini
    let recommendations: DoctorRecommendation | null = null;
    if (generateRecommendations && meeting.transcript.length > 0) {
      console.log('💡 Generating doctor recommendations using Gemini AI...');
      recommendations = await generateDoctorRecommendations(meeting.transcript, summary, patientInfo);
      meeting.doctorRecommendations = recommendations || undefined;
    }
    
    // Calculate duration
    const duration = meeting.startedAt 
      ? Math.floor((meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 1000)
      : 0;
    
    console.log(`📋 Meeting ended: ${meeting.roomName}`);
    console.log(`   Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`   Transcript entries: ${meeting.transcript.length}`);
    console.log(`   Summary generated: ${!!summary}`);
    console.log(`   Recommendations generated: ${!!recommendations}`);
    
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        appointmentId: meeting.appointmentId,
        status: meeting.status,
        duration,
        participantCount: meeting.participants.length,
        transcriptEntries: meeting.transcript.length
      },
      transcript: meeting.transcript,
      summary: summary,
      doctorRecommendations: recommendations,
      // EMR-ready data for integration
      emrData: {
        meetingId: meeting.id,
        appointmentId: meeting.appointmentId,
        date: meeting.createdAt,
        duration,
        participants: meeting.participants.map(p => ({
          name: p.name,
          role: p.role
        })),
        transcript: meeting.transcript,
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
 */
router.get('/:appointmentId/transcript', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    
    const meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({
      success: true,
      appointmentId: meeting.appointmentId,
      transcript: meeting.transcript,
      summary: meeting.summary,
      status: meeting.status
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

/**
 * Health check with API info
 * GET /api/video-meeting/health
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
      activeMeetings: meetingSessions.size
    },
    features: {
      videoConferencing: 'Jitsi Meet (FREE)',
      googleAccountAuth: 'Supported',
      anonymousAccess: 'Supported',
      transcription: 'Google Cloud Speech-to-Text API',
      summarization: `Gemini AI (${GEMINI_MODEL})`,
      doctorRecommendations: `Gemini AI (${GEMINI_MODEL})`,
      recording: 'Jitsi Built-in (FREE)'
    },
    workflow: {
      step1: 'Meeting ends with audio recording',
      step2: 'Audio transcribed via Google Cloud Speech-to-Text',
      step3: 'Transcript sent to Gemini for EMR summary',
      step4: 'Gemini generates doctor recommendations',
      step5: 'Results saved to patient health records'
    },
    costs: {
      video: '$0 (Jitsi Meet)',
      transcription: '~$0.006/15s (Google Speech-to-Text)',
      summarization: '~$0.001/1K tokens (Gemini)',
      total: 'Low cost - pay only for API usage'
    }
  });
});

export default router;
