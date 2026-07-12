/**
 * AI Clinical Copilot Service
 * 
 * Provides AI-powered assistance for:
 * - Real-time chat during consultations
 * - Meeting summarization
 * - Document auto-fill
 * - Treatment recommendations
 * - Drug interaction checking
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type {
  MeetingAISummary,
  PatientRecord,
  EMR,
  Prescription
} from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.1-flash-lite';

// Initialize Gemini AI
let genAI: GoogleGenerativeAI | null = null;
let isConfigured = false;

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'xxx' && GEMINI_API_KEY !== 'xxxxx') {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    isConfigured = true;
    console.log('✅ AI Clinical Copilot initialized with model:', GEMINI_MODEL);
  } catch (error) {
    console.error('❌ Failed to initialize AI Copilot:', error);
  }
} else {
  console.warn('⚠️ AI Copilot: Gemini API key not configured or invalid');
}

// Task-specific configurations
const COPILOT_CONFIGS = {
  chat: {
    temperature: 0.7,
    maxOutputTokens: 800,
    systemInstruction: `You are an AI Clinical Copilot assisting doctors during telemedicine consultations.

Your role:
- Provide evidence-based clinical guidance
- Suggest differential diagnoses
- Recommend appropriate tests
- Flag potential red flags or warnings
- Help with documentation

Guidelines:
- Be concise and clinical
- Use medical terminology appropriately
- Always recommend proper follow-up when necessary
- Never make definitive diagnoses - provide guidance only
- Highlight urgent findings clearly
- Format responses for readability with bullets and sections`
  },
  suggestions: {
    temperature: 0.3,
    maxOutputTokens: 400,
    systemInstruction: `You are a clinical decision support system. Provide brief, actionable suggestions based on patient symptoms. Focus on differential diagnosis, red flags, and recommended workup.`
  },
  drugCheck: {
    temperature: 0.2,
    maxOutputTokens: 600,
    systemInstruction: `You are a clinical pharmacist AI. Check for drug-drug interactions with high precision. Classify severity accurately. Provide clear recommendations.`
  },
  summarization: {
    temperature: 0.3,
    maxOutputTokens: 2000,
    systemInstruction: `You are a medical documentation specialist. Create structured clinical summaries from consultation transcripts. Be thorough but concise. Use proper medical terminology.`
  }
};

// ============================================================================
// CHAT COPILOT - Real-time AI assistance during consultations
// ============================================================================

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type: 'chat' | 'suggestion' | 'warning' | 'info';
  metadata?: {
    confidence?: number;
    references?: string[];
    actionable?: boolean;
  };
}

export interface CopilotContext {
  patientInfo?: PatientRecord;
  currentSymptoms?: string[];
  conversationHistory?: string[];
  appointmentType?: string;
}

class AIClinicalCopilot {
  private conversationHistory: CopilotMessage[] = [];
  private context: CopilotContext = {};
  private _isInitialized = false;
  private readonly models: Map<string, GenerativeModel> = new Map();

  /**
   * Get a model configured for a specific task
   */
  private getModel(taskType: keyof typeof COPILOT_CONFIGS): GenerativeModel | null {
    if (!genAI || !isConfigured) return null;

    const cachedModel = this.models.get(taskType);
    if (cachedModel) {
      return cachedModel;
    }

    const config = COPILOT_CONFIGS[taskType];
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
      },
    });

    this.models.set(taskType, model);
    return model;
  }

  /**
   * Get system instruction for a task
   */
  private _getSystemInstruction(taskType: keyof typeof COPILOT_CONFIGS): string {
    return COPILOT_CONFIGS[taskType].systemInstruction;
  }

  /**
   * Check if AI is available
   */
  isAIAvailable(): boolean {
    return isConfigured;
  }

  /**
   * Initialize the copilot with patient context
   */
  async initialize(context: CopilotContext): Promise<void> {
    this.context = context;
    this.conversationHistory = [];
    this._isInitialized = true;

    console.log('🤖 AI Clinical Copilot initialized with patient context');
  }

  /**
   * Send a message to the copilot and get AI response
   */
  async chat(userMessage: string): Promise<CopilotMessage> {
    const messageId = `msg_${Date.now()}`;

    // Add user message to history
    this.conversationHistory.push({
      id: messageId,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      type: 'chat'
    });

    const model = this.getModel('chat');

    if (!model) {
      // Return fallback response
      const fallbackMessage: CopilotMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: this.getFallbackResponse(userMessage),
        timestamp: new Date(),
        type: 'info',
        metadata: {
          confidence: 0,
          actionable: false
        }
      };
      this.conversationHistory.push(fallbackMessage);
      return fallbackMessage;
    }

    try {
      const contextPrompt = this.buildContextPrompt();
      const recentHistory = this.conversationHistory.slice(-10)
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = `${contextPrompt}

Recent conversation:
${recentHistory}

Respond to the doctor's query. Be concise, clinical, and actionable.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const assistantMessage: CopilotMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        type: this.determineMessageType(response),
        metadata: {
          confidence: 0.85,
          actionable: response.includes('recommend') || response.includes('suggest')
        }
      };

      this.conversationHistory.push(assistantMessage);
      return assistantMessage;

    } catch (error: any) {
      console.error('Copilot chat error:', error);
      const errorMessage: CopilotMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
        type: 'warning',
        metadata: { confidence: 0 }
      };
      this.conversationHistory.push(errorMessage);
      return errorMessage;
    }
  }

  /**
   * Get quick clinical suggestions based on symptoms
   */
  async getQuickSuggestions(symptoms: string[]): Promise<string[]> {
    if (symptoms.length === 0) return [];

    const model = this.getModel('suggestions');

    if (!model) {
      // Return generic suggestions
      return [
        'Consider differential diagnosis based on presentation',
        'Evaluate vital signs and general condition',
        'Review patient history for relevant factors'
      ];
    }

    try {
      const prompt = `Given these patient symptoms: ${symptoms.join(', ')}

Provide 5 quick clinical suggestions for the doctor (differential diagnosis considerations, immediate tests to consider, red flags to watch for).

Format as a JSON array of strings. Example: ["suggestion 1", "suggestion 2"]`;

      const result = await model.generateContent(prompt);
      const text = result.response.text()
        .replaceAll(/```json\n?/g, "")
        .replaceAll(/```\n?/g, "")
        .trim();

      return JSON.parse(text);
    } catch (error) {
      console.error('Quick suggestions error:', error);
      return [];
    }
  }

  /**
   * Check for drug interactions
   */
  async checkDrugInteractions(medications: string[]): Promise<{
    interactions: { drugs: string[]; severity: string; description: string }[];
    warnings: string[];
  }> {
    if (medications.length < 2) {
      return { interactions: [], warnings: [] };
    }

    const model = this.getModel('drugCheck');

    if (!model) {
      return {
        interactions: [],
        warnings: ['AI drug interaction check unavailable - please verify manually']
      };
    }

    try {
      const prompt = `Check for drug interactions between these medications: ${medications.join(', ')}

Return JSON with this structure:
{
  "interactions": [
    {"drugs": ["drug1", "drug2"], "severity": "major|moderate|minor", "description": "..."}
  ],
  "warnings": ["warning1", "warning2"]
}

If no significant interactions, return empty arrays.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text()
        .replaceAll(/```json\n?/g, "")
        .replaceAll(/```\n?/g, "")
        .trim();

      return JSON.parse(text);
    } catch (error) {
      console.error('Drug interaction check error:', error);
      return { interactions: [], warnings: ['Error checking interactions'] };
    }
  }

  /**
   * Build context prompt from patient info
   */
  private buildContextPrompt(): string {
    let prompt = '';

    if (this.context.patientInfo) {
      const p = this.context.patientInfo;
      prompt += `\nPatient Context:
- Name: ${p.demographics?.name || 'Unknown'}
- Age: ${p.demographics?.age || 'Unknown'}
- Gender: ${p.demographics?.gender || 'Unknown'}
- Allergies: ${p.medicalInfo?.allergies?.join(', ') || 'None known'}
- Chronic Conditions: ${p.medicalInfo?.chronicConditions?.join(', ') || 'None'}
- Current Medications: ${p.medicalInfo?.currentMedications?.join(', ') || 'None'}`;
    }

    if (this.context.currentSymptoms?.length) {
      prompt += `\n\nPresenting Symptoms: ${this.context.currentSymptoms.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Get fallback response when AI is not available
   */
  private getFallbackResponse(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('drug') || lowerQuery.includes('interaction')) {
      return `⚠️ AI drug interaction checking is currently unavailable.

**Please manually verify:**
• Check for contraindications
• Review patient allergies
• Consult drug reference materials

*Configure VITE_GEMINI_API_KEY to enable AI-powered checks.*`;
    }

    if (lowerQuery.includes('diagnosis') || lowerQuery.includes('symptom')) {
      return `⚠️ AI diagnostic assistance is currently unavailable.

**General approach:**
• Gather complete history
• Perform systematic examination
• Consider common differentials
• Order appropriate investigations

*Configure VITE_GEMINI_API_KEY to enable AI assistance.*`;
    }

    return `AI Clinical Copilot is not fully configured.

To enable AI-powered assistance:
1. Set VITE_GEMINI_API_KEY in your environment
2. Restart the application

*I can still help with general clinical workflows.*`;
  }

  private determineMessageType(content: string): 'chat' | 'suggestion' | 'warning' | 'info' {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('warning') || lowerContent.includes('alert') || lowerContent.includes('urgent')) {
      return 'warning';
    }
    if (lowerContent.includes('recommend') || lowerContent.includes('suggest') || lowerContent.includes('consider')) {
      return 'suggestion';
    }
    return 'chat';
  }

  getHistory(): CopilotMessage[] {
    return this.conversationHistory;
  }

  reset(): void {
    this.conversationHistory = [];
    this.context = {};
    this._isInitialized = false;
  }
}

// ============================================================================
// MEETING SUMMARIZER - Generate comprehensive meeting summaries
// ============================================================================

class MeetingSummarizer {
  private model: GenerativeModel | null = null;

  private getModel(): GenerativeModel | null {
    if (this.model) return this.model;
    if (!genAI || !isConfigured) return null;

    this.model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: COPILOT_CONFIGS.summarization.temperature,
        maxOutputTokens: COPILOT_CONFIGS.summarization.maxOutputTokens,
      },
    });

    return this.model;
  }

  /**
   * Summarize a completed meeting
   */
  async summarizeMeeting(
    transcription: string,
    patientInfo?: PatientRecord,
    symptoms?: string[]
  ): Promise<MeetingAISummary> {
    const model = this.getModel();

    if (!model) {
      return this.getDefaultSummary();
    }

    try {
      const prompt = `Analyze this telemedicine consultation transcript and generate a comprehensive medical summary.

Transcript:
${transcription}

${patientInfo ? `Patient: ${patientInfo.demographics?.name}, Age: ${patientInfo.demographics?.age}, Gender: ${patientInfo.demographics?.gender}
Known Conditions: ${patientInfo.medicalInfo?.chronicConditions?.join(', ') || 'None'}
Allergies: ${patientInfo.medicalInfo?.allergies?.join(', ') || 'None'}` : ''}

${symptoms?.length ? `Presenting Symptoms: ${symptoms.join(', ')}` : ''}

Generate a JSON response with this structure:
{
  "chiefComplaint": "main reason for visit",
  "symptoms": ["symptom1", "symptom2"],
  "diagnosis": "preliminary assessment (not definitive)",
  "treatmentPlan": ["plan item 1", "plan item 2"],
  "prescriptions": [
    {
      "medication": "drug name",
      "dosage": "amount",
      "frequency": "how often",
      "duration": "how long",
      "instructions": "special instructions",
      "reason": "why prescribed"
    }
  ],
  "labOrders": ["test1", "test2"],
  "followUpRecommended": true/false,
  "followUpDate": "YYYY-MM-DD or null",
  "redFlags": ["warning sign to watch"],
  "patientEducation": ["key points for patient"],
  "confidence": 0.0-1.0
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text()
        .replaceAll(/```json\n?/g, "")
        .replaceAll(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(text);

      return {
        id: `summary_${Date.now()}`,
        meetingId: '',
        chiefComplaint: parsed.chiefComplaint || 'Telemedicine consultation',
        symptoms: parsed.symptoms || symptoms || [],
        diagnosis: parsed.diagnosis,
        treatmentPlan: parsed.treatmentPlan || [],
        prescriptions: parsed.prescriptions || [],
        labOrders: parsed.labOrders || [],
        followUpRecommended: parsed.followUpRecommended ?? true,
        followUpDate: parsed.followUpDate,
        redFlags: parsed.redFlags || [],
        patientEducation: parsed.patientEducation || [],
        generatedAt: new Date(),
        confidence: parsed.confidence || 0.8
      };

    } catch (error) {
      console.error('Meeting summarization error:', error);
      return this.getDefaultSummary();
    }
  }

  /**
   * Generate a quick summary from conversation messages
   */
  async quickSummary(messages: { role: string; content: string }[]): Promise<string> {
    if (!isConfigured || messages.length === 0) {
      return 'Consultation completed. Please review the transcript for details.';
    }

    const model = this.getModel();
    if (!model) {
      return 'Consultation completed. Please review the transcript for details.';
    }

    try {
      const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');

      const prompt = `Summarize this consultation in 2-3 sentences, focusing on the main complaint and outcome:

${transcript}`;

      const result = await model.generateContent(prompt);
      return result.response.text();

    } catch (error) {
      console.error('Quick summary error:', error);
      return 'Consultation completed. Please review the transcript for details.';
    }
  }

  private getDefaultSummary(): MeetingAISummary {
    return {
      id: `summary_${Date.now()}`,
      meetingId: '',
      chiefComplaint: 'Telemedicine consultation',
      symptoms: [],
      treatmentPlan: ['Follow up as needed', 'Continue current medications if applicable'],
      prescriptions: [],
      labOrders: [],
      followUpRecommended: true,
      redFlags: ['Worsening symptoms', 'New concerning symptoms'],
      patientEducation: ['Contact clinic if symptoms worsen', 'Follow prescribed treatment plan'],
      generatedAt: new Date(),
      confidence: 0.5
    };
  }
}

// ============================================================================
// DOCUMENT GENERATOR - Auto-fill medical documents
// ============================================================================

class DocumentGenerator {
  private model: GenerativeModel | null = null;

  private getModel(): GenerativeModel | null {
    if (this.model) return this.model;
    if (!genAI || !isConfigured) return null;

    this.model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
      },
    });

    return this.model;
  }

  /**
   * Generate EMR content from meeting data
   */
  async generateEMRContent(
    meetingSummary: MeetingAISummary,
    patientInfo?: PatientRecord
  ): Promise<Partial<EMR>> {
    const model = this.getModel();

    if (!model) {
      return this.getDefaultEMR(meetingSummary, patientInfo);
    }

    try {
      const prompt = `Generate an EMR (Electronic Medical Record) entry based on this consultation summary.

Summary:
- Chief Complaint: ${meetingSummary.chiefComplaint}
- Symptoms: ${meetingSummary.symptoms.join(', ')}
- Assessment: ${meetingSummary.diagnosis || 'Under evaluation'}
- Treatment Plan: ${meetingSummary.treatmentPlan.join('; ')}

${patientInfo ? `Patient: ${patientInfo.demographics?.name}` : ''}

Generate JSON with these fields:
{
  "chiefComplaint": "...",
  "historyOfPresentIllness": "detailed narrative",
  "assessment": "clinical assessment",
  "treatmentPlan": "structured plan",
  "followUpInstructions": "follow-up guidance",
  "reviewOfSystems": {
    "constitutional": "...",
    "cardiovascular": "...",
    "respiratory": "...",
    "gastrointestinal": "...",
    "neurological": "..."
  }
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text()
        .replaceAll(/```json\n?/g, "")
        .replaceAll(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(text);

      return {
        chiefComplaint: parsed.chiefComplaint || meetingSummary.chiefComplaint,
        historyOfPresentIllness: parsed.historyOfPresentIllness || '',
        assessment: parsed.assessment || meetingSummary.diagnosis || '',
        treatmentPlan: parsed.treatmentPlan || meetingSummary.treatmentPlan.join('; '),
        followUpInstructions: parsed.followUpInstructions || '',
        reviewOfSystems: parsed.reviewOfSystems || {}
      };

    } catch (error) {
      console.error('EMR generation error:', error);
      return this.getDefaultEMR(meetingSummary, patientInfo);
    }
  }

  /**
   * Generate prescription from meeting summary
   */
  async generatePrescription(
    meetingSummary: MeetingAISummary,
    patientInfo?: PatientRecord
  ): Promise<Partial<Prescription>[]> {
    if (!meetingSummary.prescriptions?.length) {
      return [];
    }

    return meetingSummary.prescriptions.map((p, index) => ({
      id: `RX_${Date.now()}_${index}`,
      medication: p.medication,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
      instructions: p.instructions,
      prescribedDate: new Date().toISOString()
    }));
  }

  /**
   * Generate patient discharge summary
   */
  async generateDischargeSummary(
    meetingSummary: MeetingAISummary,
    patientInfo?: PatientRecord
  ): Promise<string> {
    const model = this.getModel();

    if (!model) {
      return this.getDefaultDischargeSummary(meetingSummary);
    }

    try {
      const prompt = `Generate a patient-friendly discharge summary in Thai language.

Consultation Details:
- Chief Complaint: ${meetingSummary.chiefComplaint}
- Diagnosis/Assessment: ${meetingSummary.diagnosis || 'การประเมินเบื้องต้น'}
- Treatment Plan: ${meetingSummary.treatmentPlan.join(', ')}
- Prescriptions: ${meetingSummary.prescriptions.map(p => p.medication).join(', ') || 'ไม่มี'}
- Follow-up: ${meetingSummary.followUpRecommended ? 'แนะนำให้พบแพทย์ติดตามผล' : 'ไม่จำเป็นต้องนัดติดตาม'}
- Red Flags: ${meetingSummary.redFlags.join(', ')}

Write a clear, friendly summary that the patient can understand. Include:
1. สรุปการรักษา
2. ยาที่ได้รับ (ถ้ามี)
3. สิ่งที่ควรทำ/ไม่ควรทำ
4. สัญญาณอันตรายที่ต้องมาพบแพทย์ทันที
5. การนัดหมายครั้งถัดไป`;

      const result = await model.generateContent(prompt);
      return result.response.text();

    } catch (error) {
      console.error('Discharge summary error:', error);
      return this.getDefaultDischargeSummary(meetingSummary);
    }
  }

  private getDefaultEMR(summary: MeetingAISummary, patient?: PatientRecord): Partial<EMR> {
    return {
      chiefComplaint: summary.chiefComplaint,
      historyOfPresentIllness: `Patient presents with ${summary.symptoms.join(', ')}.`,
      assessment: summary.diagnosis || 'Under evaluation',
      treatmentPlan: summary.treatmentPlan.join('; '),
      followUpInstructions: summary.followUpRecommended
        ? 'Follow up recommended. Contact clinic if symptoms worsen.'
        : 'Follow up as needed.'
    };
  }

  private getDefaultDischargeSummary(summary: MeetingAISummary): string {
    return `
📋 สรุปการรักษา
─────────────────
อาการหลัก: ${summary.chiefComplaint}

การวินิจฉัยเบื้องต้น: ${summary.diagnosis || 'กำลังประเมิน'}

แผนการรักษา:
${summary.treatmentPlan.map((t, i) => `${i + 1}. ${t}`).join('\n')}

${summary.prescriptions.length > 0 ? `
ยาที่ได้รับ:
${summary.prescriptions.map(p => `• ${p.medication} ${p.dosage} - ${p.frequency}`).join('\n')}
` : ''}

⚠️ สัญญาณอันตราย (ต้องมาพบแพทย์ทันที):
${summary.redFlags.map(r => `• ${r}`).join('\n')}

${this.formatFollowUpMessage(summary)}

ขอบคุณที่ใช้บริการ Izara Anywhere
    `.trim();
  }

  /**
   * Format follow-up message to avoid nested ternaries
   */
  private formatFollowUpMessage(summary: { followUpRecommended: boolean; followUpDate?: string }): string {
    if (!summary.followUpRecommended) return '';
    const dateStr = summary.followUpDate ? ` วันที่ ${summary.followUpDate}` : '';
    return `📅 แนะนำให้พบแพทย์ติดตามผล${dateStr}`;
  }
}

// ============================================================================
// EXPORT SERVICES
// ============================================================================

export const aiCopilot = new AIClinicalCopilot();
export const meetingSummarizer = new MeetingSummarizer();
export const documentGenerator = new DocumentGenerator();

// Combined service for easy import
export const aiClinicalService = {
  copilot: aiCopilot,
  summarizer: meetingSummarizer,
  documentGenerator: documentGenerator,

  // Quick access methods
  async chat(message: string) {
    return aiCopilot.chat(message);
  },

  async summarize(transcription: string, patient?: PatientRecord, symptoms?: string[]) {
    return meetingSummarizer.summarizeMeeting(transcription, patient, symptoms);
  },

  async generateEMR(summary: MeetingAISummary, patient?: PatientRecord) {
    return documentGenerator.generateEMRContent(summary, patient);
  },

  async checkDrugInteractions(medications: string[]) {
    return aiCopilot.checkDrugInteractions(medications);
  }
};

export default aiClinicalService;
