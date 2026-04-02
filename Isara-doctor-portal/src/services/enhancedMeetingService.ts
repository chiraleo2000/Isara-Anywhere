// enhancedMeetingService.ts - v1.4.7 ENHANCED WITH MEETING SERVER INTEGRATION
// AI Copilot integration, patient-doctor connection, auto follow-up scheduling
// Gemini AI used directly for real-time doctor AI personality (low latency)
// Meeting server used for transcript persistence, summaries, and CDS

import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiClinicalService, type CopilotMessage, type CopilotContext } from './aiClinicalCopilot';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';
const MEETING_SERVER_URL = import.meta.env.VITE_MEETING_SERVER_URL || (typeof globalThis !== 'undefined' && globalThis.location ? `${globalThis.location.protocol}//${globalThis.location.host}` : 'http://localhost:3020');
const genAI = GEMINI_API_KEY?.startsWith('AIza') ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Log initialization status
if (genAI) {
  console.log('✅ Enhanced Meeting Service v1.4.7: Gemini AI initialized');
  console.log(`   Model: ${GEMINI_MODEL}`);
  console.log(`   Meeting Server: ${MEETING_SERVER_URL}`);
} else {
  console.warn('⚠️ Enhanced Meeting Service: Gemini API key not configured');
}

// ============================================================================
// PATIENT CONNECTION TYPES - For bidirectional telemedicine
// ============================================================================

export interface PatientConnectionState {
  patientId: string;
  patientName: string;
  connectionStatus: 'waiting' | 'connecting' | 'connected' | 'disconnected';
  joinedAt?: Date;
  webRTCReady: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  lastPing?: Date;
}

export interface MeetingParticipant {
  id: string;
  name: string;
  role: 'doctor' | 'patient' | 'nurse' | 'interpreter';
  connectionState: 'connecting' | 'connected' | 'disconnected';
  audioMuted: boolean;
  videoMuted: boolean;
}

export interface LiveMeetingSession {
  sessionId: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  participants: MeetingParticipant[];
  startTime: Date;
  isRecording: boolean;
  transcriptionEnabled: boolean;
  liveTranscript: TranscriptEntry[];
  aiCopilotEnabled: boolean;
}

export interface TranscriptEntry {
  id: string;
  speakerId: string;
  speakerName: string;
  speakerRole: 'doctor' | 'patient';
  text: string;
  timestamp: Date;
  isFinal: boolean;
  confidence?: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  speakerName?: string;
}

interface PatientInfo {
  name: string;
  symptoms: string[];
  medicalHistory?: string;
  age?: number;
  gender?: string;
}

interface ConsultationContext {
  doctorId: string;
  patientInfo: PatientInfo;
  startTime: Date;
  appointmentId: string;
}

interface DoctorPersonality {
  id: string;
  name: string;
  specialty: string;
  personality: string;
  medicalFocus: string[];
  communicationStyle: string;
  expertise: string[];
}

const DOCTOR_PERSONALITIES: Record<string, DoctorPersonality> = {
  'doc1': {
    id: 'doc1',
    name: 'ดร. สมชาย ใจดี',
    specialty: 'อายุรแพทย์ทั่วไป',
    personality: 'อบอุ่น เป็นมิตร ใส่ใจรายละเอียด พูดชัดเจนและให้กำลังใจ',
    medicalFocus: ['โรคทั่วไป', 'โรคเรื้อรัง', 'ป้องกันโรค', 'ตรวจสุขภาพ'],
    communicationStyle: 'พูดช้า ๆ อธิบายละเอียด ใช้คำง่าย ๆ ให้คำปรึกษาแบบเป็นกันเอง',
    expertise: ['Internal Medicine', 'Preventive Care', 'Chronic Disease Management']
  },
  'doc2': {
    id: 'doc2',
    name: 'ดร. วิภา รักสุขภาพ',
    specialty: 'กุมารแพทย์',
    personality: 'อ่อนโยน สุภาพ มีความเข้าใจ เป็นมิตรกับเด็ก',
    medicalFocus: ['สุขภาพเด็ก', 'โรคติดเชื้อ', 'วัคซีน', 'พัฒนาการ'],
    communicationStyle: 'พูดนุ่มนวล อ่อนโยน ให้ความรู้สึกปลอดภัย อธิบายอย่างเข้าใจง่าย',
    expertise: ['Pediatrics', 'Child Development', 'Immunization']
  },
  'doc3': {
    id: 'doc3',
    name: 'ดร. ชัยวัฒน์ สุขใจ',
    specialty: 'ศัลยแพทย์',
    personality: 'มั่นใจ ตรงไปตรงมา ให้ข้อมูลชัดเจน',
    medicalFocus: ['การผ่าตัด', 'บาดเจ็บ', 'โรคผิวหนัง', 'แผล'],
    communicationStyle: 'พูดตรงประเด็น มั่นใจ ให้ความรู้เชิงเทคนิค อธิบายขั้นตอนชัดเจน',
    expertise: ['General Surgery', 'Trauma Care', 'Wound Management']
  },
  'doc4': {
    id: 'doc4',
    name: 'ดร. สุดารัตน์ สุขสันต์',
    specialty: 'แพทย์เวชศาสตร์ครอบครัว',
    personality: 'อบอุ่น เข้าใจ ดูแลแบบองค์รวม',
    medicalFocus: ['สุขภาพครอบครัว', 'โรคเรื้อรัง', 'สุขภาพจิต', 'คำปรึกษา'],
    communicationStyle: 'พูดคุยเหมือนครอบครัว ฟังอย่างตั้งใจ ให้คำแนะนำแบบองค์รวม',
    expertise: ['Family Medicine', 'Holistic Health', 'Mental Wellness']
  }
};

export class DoctorSpecificAIService {
  private conversationHistory: ConversationMessage[] = [];
  private context: ConsultationContext | null = null;
  private doctor: DoctorPersonality | null = null;
  private speechRecognition: any = null;
  private isSpeechActive = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;

  constructor() {
    this.initializeVoices();
  }

  private initializeVoices(): void {
    if (!('speechSynthesis' in globalThis)) {
      console.warn('⚠️ Speech synthesis not supported');
      return;
    }

    const loadVoices = () => {
      const voices = globalThis.speechSynthesis.getVoices();

      if (voices.length === 0) {
        console.warn('⚠️ No voices available yet');
        return;
      }

      console.log(`🔢 Available voices: ${voices.length}`);

      const thaiVoice = this.findBestThaiVoice(voices);
      if (thaiVoice) {
        this.selectedVoice = thaiVoice;
        this.voicesLoaded = true;
        console.log('✅ Selected Thai voice:', thaiVoice.name, thaiVoice.lang);
      } else {
        console.warn('⚠️ No Thai voice found, using default');
        if (voices.length > 0) {
          this.selectedVoice = voices[0];
          this.voicesLoaded = true;
          console.log('ℹ️ Using fallback voice:', voices[0].name, voices[0].lang);
        }
      }
    };

    loadVoices();

    if (!this.voicesLoaded) {
      globalThis.speechSynthesis.onvoiceschanged = () => {
        if (!this.voicesLoaded) {
          loadVoices();
        }
      };
    }
  }

  private findBestThaiVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    console.log("🔍 Searching for Thai voices...");

    const thaiVoices = voices.filter(v =>
      v.lang.toLowerCase().includes('th') ||
      v.name.toLowerCase().includes('thai')
    );

    if (thaiVoices.length > 0) {
      const googleThai = thaiVoices.find(v => v.name.toLowerCase().includes('google'));
      if (googleThai) {
        console.log(`✅ Found Google Thai voice: ${googleThai.name} (${googleThai.lang})`);
        return googleThai;
      }
      console.log(`✅ Found Thai voice: ${thaiVoices[0].name} (${thaiVoices[0].lang})`);
      return thaiVoices[0];
    }

    console.warn('⚠️ No Thai voice found');
    return null;
  }

  async startConsultation(
    doctorId: string,
    patientInfo: PatientInfo,
    appointmentId: string
  ): Promise<string> {
    this.doctor = DOCTOR_PERSONALITIES[doctorId] || DOCTOR_PERSONALITIES['doc1'];

    this.context = {
      doctorId,
      patientInfo,
      startTime: new Date(),
      appointmentId
    };

    console.log('🩺 Starting consultation:', {
      doctor: this.doctor.name,
      patient: patientInfo.name,
      symptoms: patientInfo.symptoms,
      appointmentId
    });

    const systemPrompt = this.buildDoctorPrompt();
    const greeting = await this.generateGreeting(systemPrompt);

    this.conversationHistory.push({
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      speakerName: this.doctor.name
    });

    console.log('✅ Consultation started, greeting generated');
    return greeting;
  }

  private buildDoctorPrompt(): string {
    if (!this.doctor || !this.context) return '';

    return `คุณคือ ${this.doctor.name} (${this.doctor.specialty})
บุคลิกภาพ: ${this.doctor.personality}

ความเชี่ยวชาญ:
${this.doctor.expertise.map(e => `- ${e}`).join('\n')}

จุดเน้นทางการแพทย์:
${this.doctor.medicalFocus.map(f => `- ${f}`).join('\n')}

สไตล์การสื่อสาร: ${this.doctor.communicationStyle}

ข้อมูลผู้ป่วย:
- ชื่อ: ${this.context.patientInfo.name}
- อาการหลัก: ${this.context.patientInfo.symptoms.join(', ')}
${this.context.patientInfo.age ? `- อายุ: ${this.context.patientInfo.age} ปี` : ''}
${this.context.patientInfo.medicalHistory ? `- ประวัติ: ${this.context.patientInfo.medicalHistory}` : ''}

**สำคัญมาก - กฎการตอบ:**
1. แสดงความเป็นตัวตนตามบุคลิกภาพของคุณ
2. ถามคำถามที่เกี่ยวข้องกับความเชี่ยวชาญ
3. ใช้สไตล์การสื่อสารที่กำหนดไว้
4. **ตอบสั้น กระชับ ไม่เกิน 2-3 ประโยค** (สำหรับการสนทนาแบบเรียลไทม์)
5. พูดเหมือนคุยกับคนไข้จริง ๆ ไม่ต้องยาวเหมือนเขียนรายงาน
6. ตอบเป็นภาษาไทยทั้งหมด ชัดเจน ง่ายต่อการเข้าใจ
7. ห้ามวินิจฉัยโรคชัดเจน แต่ให้ข้อมูลเบื้องต้น
8. แนะนำให้พบแพทย์เมื่อจำเป็น

**ตัวอย่างการตอบที่ดี:**
- "จากอาการที่คุณบอก ดูเหมือนจะเป็นหวัดธรรมดาครับ แนะนำให้พักผ่อนให้เพียงพอ ดื่มน้ำมากพอ ถ้า 3-5 วันไม่ดีขึ้นก็มาพบแพทย์นะครับ"
- "อาการปวดหัวบ่อยแบบนี้ อาจจะมาจากความเครียดหรือนอนไม่พอ ลองพักผ่อนให้เพียงพอดูก่อนนะคะ"
- "มีไข้กี่องศาครับ? ถ้าเกิน 38.5 องศา แนะนำให้กินยาลดไข้และพบแพทย์ทันทีครับ"

เริ่มด้วยการทักทายตามสไตล์ของคุณ`;
  }

  private async generateGreeting(systemPrompt: string): Promise<string> {
    if (!genAI) {
      return `สวัสดีครับคุณ${this.context?.patientInfo.name} ยินดีต้อนรับสู่การปรึกษาทางไกล`;
    }

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 150,
          topP: 0.9,
        }
      });

      const prompt = `${systemPrompt}\n\nโปรดทักทายผู้ป่วยและเริ่มการปรึกษา (ตอบสั้น ๆ ไม่เกิน 2 ประโยค)`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating greeting:', error);
      return `สวัสดีครับคุณ${this.context?.patientInfo.name} ยินดีต้อนรับสู่การปรึกษาทางไกล`;
    }
  }

  async sendMessage(userMessage: string): Promise<string> {
    if (!genAI) {
      console.error('❌ Gemini AI not initialized');
      throw new Error("ระบบ AI ไม่พร้อมใช้งาน - API Key ไม่ถูกต้อง");
    }

    if (!this.doctor || !this.context) {
      console.error('❌ Doctor or context not initialized');
      throw new Error("ระบบ AI ไม่พร้อมใช้งาน - กรุณารีเฟรชหน้าเว็บ");
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      speakerName: this.context.patientInfo.name
    });

    console.log(`📨 User message received (${this.conversationHistory.length} total messages)`);

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
          topP: 0.8,
          topK: 40
        }
      });

      const systemPrompt = this.buildDoctorPrompt();
      const recentMessages = this.conversationHistory.slice(-6); // Last 3 exchanges
      const conversationText = recentMessages
        .map(msg => `${msg.speakerName || msg.role}: ${msg.content}`)
        .join('\n');

      const prompt = `${systemPrompt}

การสนทนาล่าสุด:
${conversationText}

**สำคัญ: ตอบสั้น กระชับ ไม่เกิน 2-3 ประโยค เหมือนคุยกับคนไข้จริง ๆ**

ตอบคำถามล่าสุดของผู้ป่วย:`;

      const result = await model.generateContent(prompt);

      if (!result?.response) {
        throw new Error('No response from Gemini AI');
      }

      const response = result.response;
      const aiMessage = response.text();

      if (!aiMessage || aiMessage.trim() === '') {
        throw new Error('AI returned empty response');
      }

      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiMessage,
        timestamp: new Date(),
        speakerName: this.doctor.name
      });

      console.log(`✅ AI response generated (${this.conversationHistory.length} total messages)`);
      return aiMessage;

    } catch (error: any) {
      console.error('❌ AI Doctor error:', error);
      throw new Error(`❌ AI Error: ${error.message || 'Unknown error'}`);
    }
  }

  speakText(text: string, lang: string = 'th-TH'): void {
    if (!('speechSynthesis' in globalThis)) {
      console.warn('⚠️ Speech synthesis not supported');
      return;
    }

    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
      utterance.lang = this.selectedVoice.lang;
    } else {
      utterance.lang = lang;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    this.currentUtterance = utterance;

    utterance.onstart = () => console.log('🗣️ Started speaking');
    utterance.onend = () => {
      console.log('✅ Finished speaking');
      if (this.currentUtterance === utterance) {
        this.currentUtterance = null;
      }
    };
    utterance.onerror = (event) => {
      console.error('❌ Speech error:', event.error);
      if (this.currentUtterance === utterance) {
        this.currentUtterance = null;
      }
    };

    globalThis.speechSynthesis.speak(utterance);
  }

  stopSpeaking(): void {
    if ('speechSynthesis' in globalThis) {
      globalThis.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    return globalThis.speechSynthesis?.speaking || false;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if ('speechSynthesis' in globalThis) {
      return globalThis.speechSynthesis.getVoices();
    }
    return [];
  }

  setVoice(voice: SpeechSynthesisVoice): void {
    this.selectedVoice = voice;
    console.log('✅ Voice changed to:', voice.name, voice.lang);
  }

  startSpeechRecognition(onTranscript: (transcript: string, isFinal: boolean) => void): boolean {
    try {
      const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.error('Speech Recognition not supported');
        return false;
      }

      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'th-TH';

      this.speechRecognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        this.isSpeechActive = true;
      };

      this.speechRecognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          onTranscript(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          onTranscript(interimTranscript, false);
        }
      };

      this.speechRecognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('กรุณาอนุญาตการใช้งานไมโครโฟน');
        }
      };

      this.speechRecognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        this.isSpeechActive = false;
        if (this.speechRecognition && this.isSpeechActive) {
          try {
            this.speechRecognition.start();
          } catch (e) {
            console.error('Failed to restart speech recognition:', e);
          }
        }
      };

      this.speechRecognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      return false;
    }
  }

  stopSpeechRecognition(): void {
    if (this.speechRecognition) {
      this.isSpeechActive = false;
      this.speechRecognition.stop();
      this.speechRecognition = null;
    }
  }

  isSpeechRecognitionActive(): boolean {
    return this.isSpeechActive;
  }

  /**
   * Generate comprehensive consultation report with auto follow-up detection
   * THIS IS THE KEY FUNCTION THAT ANALYZES THE MEETING
   */
  async generateConsultationReport(): Promise<any> {
    console.log('📊 Generating consultation report...');
    console.log('📝 Conversation history length:', this.conversationHistory.length);

    if (!genAI || !this.context) {
      console.warn('⚠️ Gemini AI or context not available, using fallback');
      return this.generateFallbackReport();
    }

    // Check if we have meaningful conversation
    if (this.conversationHistory.length < 2) {
      console.warn('⚠️ Not enough conversation data, using fallback');
      return this.generateFallbackReport();
    }

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent medical reports
          maxOutputTokens: 2000,
        }
      });

      // Build complete conversation transcript
      const conversationText = this.conversationHistory
        .map(msg => `${msg.speakerName || msg.role}: ${msg.content}`)
        .join('\n\n');

      console.log('📄 Full conversation transcript prepared');

      const prompt = `
ในฐานะ ${this.doctor?.name} (${this.doctor?.specialty})

จากการปรึกษาทางไกลนี้:
${conversationText}

โปรดวิเคราะห์และสรุปการปรึกษาในรูปแบบ JSON โดยต้องมี:

1. **chiefComplaint**: อาการหลักที่ผู้ป่วยบอก
2. **presentingSymptoms**: รายการอาการทั้งหมดที่พบ
3. **preliminaryAssessment**: การประเมินเบื้องต้น (ไม่ใช่การวินิจฉัยชัดเจน)
4. **recommendations**: คำแนะนำการดูแลตัวเอง อย่างน้อย 3 ข้อ
5. **prescriptions**: รายการยาที่แนะนำ (ถ้ามี) ในรูปแบบ array of objects:
   [
     {
       "medication": "ชื่อยา",
       "dosage": "ขนาด",
       "frequency": "ความถี่",
       "duration": "ระยะเวลา",
       "instructions": "วิธีใช้"
     }
   ]
6. **labOrders**: การตรวจเลือด/แลป ที่แนะนำ (ถ้ามี)
7. **followUp**: คำแนะนำการติดตามผล
8. **redFlags**: สัญญาณเตือนที่ต้องพบแพทย์ทันที
9. **lifestyleAdvice**: คำแนะนำดูแลตัวเอง
10. **needsFollowUp**: true/false - ต้องมีการนัดติดตามผลหรือไม่
11. **followUpDate**: วันที่นัดติดตามผล (ถ้า needsFollowUp = true) ในรูปแบบ ISO string
12. **followUpReason**: เหตุผลที่ต้องนัดติดตาม (ถ้ามี)

**สำคัญมาก:**
- วิเคราะห์จากบทสนทนาจริง ไม่ใช่ใช้ข้อมูลเดิมๆ
- ถ้าผู้ป่วยมีอาการที่ต้องติดตาม ให้ needsFollowUp = true และระบุ followUpDate
- followUpDate ควรเป็น 3-14 วันจากวันนี้ ขึ้นอยู่กับความรุนแรง
- ถ้าอาการไม่รุนแรง และไม่ต้องติดตาม ให้ needsFollowUp = false

ตัวอย่าง followUpDate calculation:
- อาการเล็กน้อย: +7 วัน
- อาการปานกลาง: +5 วัน  
- อาการค่อนข้างรุนแรง: +3 วัน
- ต้องเฝ้าระวัง: +2 วัน

ตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น`;

      console.log('🤖 Sending to Gemini for analysis...');

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text()
        .replaceAll(/```json\n?/g, "")
        .replaceAll(/```\n?/g, "")
        .trim();

      console.log('📥 Received AI analysis response');

      const report = JSON.parse(text);

      // Calculate follow-up date if needed
      if (report.needsFollowUp && !report.followUpDate) {
        const followUpDays = this.calculateFollowUpDays(report);
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + followUpDays);
        report.followUpDate = followUpDate.toISOString();
        console.log(`📅 Auto-calculated follow-up: ${followUpDays} days -> ${report.followUpDate}`);
      }

      console.log('✅ Report generated successfully:', {
        hasReport: true,
        needsFollowUp: report.needsFollowUp,
        followUpDate: report.followUpDate,
        prescriptionCount: report.prescriptions?.length || 0,
        recommendationCount: report.recommendations?.length || 0
      });

      return report;
    } catch (error) {
      console.error('❌ Error generating report:', error);
      console.log('⚠️ Falling back to manual report generation');
      return this.generateFallbackReport();
    }
  }

  /**
   * Calculate follow-up days based on severity indicators in the report
   */
  private calculateFollowUpDays(report: any): number {
    const text = JSON.stringify(report).toLowerCase();

    // Check for severity keywords
    if (text.includes('รุนแรง') || text.includes('เร่งด่วน') || text.includes('ฉุกเฉิน')) {
      return 2; // 2 days for urgent cases
    }
    if (text.includes('ค่อนข้าง') || text.includes('ควรระวัง') || text.includes('เฝ้าระวัง')) {
      return 3; // 3 days for moderate-severe
    }
    if (text.includes('ติดตามใกล้ชิด') || text.includes('สังเกตอาการ')) {
      return 5; // 5 days for moderate
    }

    // Check prescriptions
    if (report.prescriptions && report.prescriptions.length > 0) {
      return 7; // 7 days if prescribed medication
    }

    // Default follow-up
    return 14; // 2 weeks for routine follow-up
  }

  /**
   * Generate fallback report when AI analysis fails
   */
  private generateFallbackReport(): any {
    console.log('📋 Generating fallback report from conversation data');

    const symptoms = this.context?.patientInfo.symptoms || [];
    const conversationLength = this.conversationHistory.length;

    // Determine if follow-up is needed based on conversation length
    const needsFollowUp = conversationLength > 3; // If patient engaged in conversation
    const followUpDate = needsFollowUp ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;

    return {
      chiefComplaint: symptoms.join(', ') || 'การปรึกษาทางไกล',
      presentingSymptoms: symptoms,
      preliminaryAssessment: 'การปรึกษาทางไกลเสร็จสมบูรณ์ ข้อมูลได้รับการบันทึกและวิเคราะห์โดย AI',
      recommendations: [
        'พักผ่อนให้เพียงพอ',
        'ดื่มน้ำมาก ๆ',
        'หากอาการไม่ดีขึ้น ภายใน 3-5 วันให้พบแพทย์'
      ],
      prescriptions: [],
      labOrders: [],
      followUp: needsFollowUp ? 'นัดติดตามผลใน 1 สัปดาห์' : 'ติดตามอาการใน 3-5 วัน',
      redFlags: ['ไข้สูงเกิน 39°C', 'หายใจลำบาก', 'อาการแย่ลงอย่างรวดเร็ว'],
      lifestyleAdvice: ['รับประทานอาหารที่มีประโยชน์', 'ออกกำลังกายสม่ำเสมอ'],
      needsFollowUp: needsFollowUp,
      followUpDate: followUpDate ? followUpDate.toISOString() : null,
      followUpReason: needsFollowUp ? 'ติดตามผลการรักษาและประเมินอาการ' : null
    };
  }

  getConversationHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }

  getDoctor(): DoctorPersonality | null {
    return this.doctor;
  }

  /**
   * Get meeting duration in seconds
   */
  getDuration(): number {
    if (!this.context) {
      console.warn('⚠️ Context not set, returning 0 duration');
      return 0;
    }
    const duration = Math.floor((Date.now() - this.context.startTime.getTime()) / 1000);
    console.log(`⏱️ Meeting duration: ${duration} seconds`);
    return duration;
  }

  reset(): void {
    console.log('🔄 Resetting AI Doctor service');
    this.stopSpeaking();
    this.stopSpeechRecognition();
    this.conversationHistory = [];
    this.context = null;
    this.doctor = null;
  }
}

export const doctorAIService = new DoctorSpecificAIService();

// ============================================================================
// ENHANCED MEETING SERVICE WITH PATIENT CONNECTION
// ============================================================================

export class EnhancedMeetingService {
  private googleMeetService: any;
  private currentSession: LiveMeetingSession | null = null;
  private patientConnection: PatientConnectionState | null = null;
  private _copilotContext: CopilotContext | null = null;
  private initialized = false;

  /**
   * Lazy initialization of external services
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    const module = await import('./externalServices');
    this.googleMeetService = module.googleMeetService;
    this.initialized = true;
  }

  // ----------------------------------------------------------------------------
  // PATIENT CONNECTION MANAGEMENT
  // ----------------------------------------------------------------------------

  /**
   * Initialize a meeting session for patient connection
   */
  async initializePatientMeeting(
    appointmentId: string,
    doctorId: string,
    patientId: string,
    patientName: string
  ): Promise<LiveMeetingSession> {
    console.log('🏥 Initializing patient meeting session');

    this.currentSession = {
      sessionId: `session_${Date.now()}`,
      appointmentId,
      doctorId,
      patientId,
      participants: [
        {
          id: doctorId,
          name: 'Doctor',
          role: 'doctor',
          connectionState: 'connecting',
          audioMuted: false,
          videoMuted: false
        }
      ],
      startTime: new Date(),
      isRecording: false,
      transcriptionEnabled: true,
      liveTranscript: [],
      aiCopilotEnabled: true
    };

    this.patientConnection = {
      patientId,
      patientName,
      connectionStatus: 'waiting',
      webRTCReady: false,
      audioEnabled: false,
      videoEnabled: false
    };

    console.log('✅ Meeting session initialized:', this.currentSession.sessionId);
    return this.currentSession;
  }

  /**
   * Handle patient joining the meeting
   */
  async onPatientJoined(patientId: string): Promise<void> {
    if (!this.currentSession || !this.patientConnection) {
      throw new Error('No active session');
    }

    console.log('👤 Patient joining meeting:', patientId);

    this.patientConnection.connectionStatus = 'connected';
    this.patientConnection.joinedAt = new Date();
    this.patientConnection.webRTCReady = true;

    // Add patient as participant
    this.currentSession.participants.push({
      id: patientId,
      name: this.patientConnection.patientName,
      role: 'patient',
      connectionState: 'connected',
      audioMuted: false,
      videoMuted: false
    });

    console.log('✅ Patient connected successfully');
  }

  /**
   * Handle patient disconnection
   */
  async onPatientDisconnected(patientId: string): Promise<void> {
    if (this.patientConnection?.patientId === patientId) {
      this.patientConnection.connectionStatus = 'disconnected';
      this.patientConnection.webRTCReady = false;

      // Update participant state
      const participant = this.currentSession?.participants.find(p => p.id === patientId);
      if (participant) {
        participant.connectionState = 'disconnected';
      }

      console.log('⚠️ Patient disconnected:', patientId);
    }
  }

  /**
   * Get current patient connection state
   */
  getPatientConnectionState(): PatientConnectionState | null {
    return this.patientConnection;
  }

  // ----------------------------------------------------------------------------
  // LIVE TRANSCRIPTION MANAGEMENT
  // ----------------------------------------------------------------------------

  /**
   * Add a transcript entry from live speech recognition
   */
  addTranscriptEntry(
    speakerId: string,
    speakerName: string,
    speakerRole: 'doctor' | 'patient',
    text: string,
    isFinal: boolean = false
  ): TranscriptEntry {
    const entry: TranscriptEntry = {
      id: `transcript_${Date.now()}`,
      speakerId,
      speakerName,
      speakerRole,
      text,
      timestamp: new Date(),
      isFinal
    };

    if (this.currentSession) {
      // Remove temporary entries if this is final
      if (isFinal) {
        this.currentSession.liveTranscript = this.currentSession.liveTranscript.filter(
          t => t.speakerId !== speakerId || t.isFinal
        );
      }
      this.currentSession.liveTranscript.push(entry);
    }

    return entry;
  }

  /**
   * Get full transcript for current session
   */
  getFullTranscript(): TranscriptEntry[] {
    return this.currentSession?.liveTranscript.filter(t => t.isFinal) || [];
  }

  /**
   * Get transcript as text for AI processing
   */
  getTranscriptText(): string {
    return this.getFullTranscript()
      .map(t => `${t.speakerRole === 'doctor' ? 'Doctor' : 'Patient'}: ${t.text}`)
      .join('\n');
  }

  // ----------------------------------------------------------------------------
  // AI COPILOT INTEGRATION
  // ----------------------------------------------------------------------------

  /**
   * Initialize AI Copilot for the meeting
   */
  async initializeCopilot(context: CopilotContext): Promise<void> {
    this._copilotContext = context;
    await aiClinicalService.copilot.initialize(context);
    console.log('🤖 AI Copilot initialized for meeting');
  }

  /**
   * Get quick AI suggestions based on current symptoms
   */
  async getCopilotSuggestions(symptoms: string[]): Promise<string[]> {
    return aiClinicalService.copilot.getQuickSuggestions(symptoms);
  }

  /**
   * Send a chat message to the copilot
   */
  async askCopilot(question: string): Promise<CopilotMessage> {
    return aiClinicalService.chat(question);
  }

  /**
   * Generate meeting summary using AI
   */
  async generateMeetingSummary(patientInfo?: any, symptoms?: string[]): Promise<any> {
    const transcriptText = this.getTranscriptText();
    return aiClinicalService.summarize(transcriptText, patientInfo, symptoms);
  }

  // ----------------------------------------------------------------------------
  // MEETING LIFECYCLE
  // ----------------------------------------------------------------------------

  /**
   * Start recording the meeting
   */
  startRecording(): void {
    if (this.currentSession) {
      this.currentSession.isRecording = true;
      console.log('🔴 Meeting recording started');
    }
  }

  /**
   * Stop recording the meeting
   */
  stopRecording(): void {
    if (this.currentSession) {
      this.currentSession.isRecording = false;
      console.log('⏹️ Meeting recording stopped');
    }
  }

  /**
   * End the current meeting session
   */
  async endMeeting(): Promise<{
    session: LiveMeetingSession;
    transcript: TranscriptEntry[];
    duration: number;
  }> {
    if (!this.currentSession) {
      throw new Error('No active meeting session');
    }

    const duration = Math.floor(
      (Date.now() - this.currentSession.startTime.getTime()) / 1000
    );

    console.log('📋 Meeting ended:', {
      sessionId: this.currentSession.sessionId,
      duration: `${Math.floor(duration / 60)}m ${duration % 60}s`,
      transcriptEntries: this.currentSession.liveTranscript.filter(t => t.isFinal).length
    });

    const result = {
      session: { ...this.currentSession },
      transcript: this.getFullTranscript(),
      duration
    };

    // Sync transcript to meeting server for persistence
    try {
      await this.syncTranscriptToMeetingServer(
        this.currentSession.appointmentId,
        this.getFullTranscript(),
        duration
      );
    } catch (syncError) {
      console.warn('⚠️ Failed to sync transcript to meeting server:', syncError);
    }

    // Reset session
    this.currentSession = null;
    this.patientConnection = null;
    this._copilotContext = null;

    return result;
  }

  // ----------------------------------------------------------------------------
  // MEETING SERVER INTEGRATION (v1.4.7)
  // ----------------------------------------------------------------------------

  /**
   * Sync transcript data to the central meeting server for persistence
   */
  private async syncTranscriptToMeetingServer(
    appointmentId: string,
    transcript: TranscriptEntry[],
    duration: number
  ): Promise<void> {
    try {
      const response = await fetch(`${MEETING_SERVER_URL}/api/meetings/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: appointmentId,
          segments: transcript.map(t => ({
            speakerId: t.speakerId,
            speakerName: t.speakerName,
            speakerRole: t.speakerRole,
            content: t.text,
            language: 'th-TH',
            confidence: 0.9,
            timestamp: t.timestamp,
            isFinal: t.isFinal
          })),
          duration
        })
      });
      if (response.ok) {
        console.log('✅ Transcript synced to meeting server');
      }
    } catch (error) {
      console.warn('⚠️ Meeting server sync failed (non-critical):', error);
    }
  }

  /**
   * Request AI summary from the meeting server
   */
  async requestMeetingServerSummary(meetingId: string): Promise<any> {
    try {
      const response = await fetch(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId })
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Meeting server summary request failed:', error);
      return null;
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession(): LiveMeetingSession | null {
    return this.currentSession;
  }

  // ----------------------------------------------------------------------------
  // GOOGLE MEET INTEGRATION
  // ----------------------------------------------------------------------------

  async isConfigured(): Promise<boolean> {
    await this.ensureInitialized();
    return this.googleMeetService?.isConfigured() || false;
  }

  async getStatus() {
    await this.ensureInitialized();
    return this.googleMeetService?.getStatus() || {
      configured: false,
      initialized: false,
      hasToken: false,
      tokenValid: false
    };
  }

  async autoAuthorize(): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.googleMeetService) return false;
    try {
      await this.googleMeetService.authorize();
      return true;
    } catch {
      return false;
    }
  }

  async createMeetingWithAutoAuth(data: any) {
    await this.ensureInitialized();
    if (!this.googleMeetService) {
      throw new Error('Google Meet service not initialized');
    }
    return await this.googleMeetService.createMeetingWithAppointment(data);
  }
}

export const enhancedMeetingService = new EnhancedMeetingService();

export const areGoogleApisReady = (): boolean => {
  return !!(globalThis as any).google &&
    !!(globalThis as any).gapi &&
    !!(globalThis as any).gapi.client;
};