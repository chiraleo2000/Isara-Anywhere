import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ClinicalAIResponse, DiagnosisCode, DrugInteraction, TranscriptSegment } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.1-flash-lite';

/** Prefer same-origin relative /api paths so Vite/nginx proxy always works. */
function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_URL || '';
  if (!configured) return '';
  if (typeof globalThis === 'undefined' || !globalThis.location?.origin) {
    return configured;
  }
  try {
    if (new URL(configured).origin === globalThis.location.origin) {
      return '';
    }
  } catch {
    return configured;
  }
  return configured;
}

const API_BASE = resolveApiBase();

function getApiHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ============================================================================
// TASK-SPECIFIC CONFIGURATIONS
// ============================================================================

export interface TaskConfig {
  temperature: number;
  maxOutputTokens: number;
  systemInstruction?: string;
}

export const TASK_CONFIGS: Record<string, TaskConfig> = {
  // Clinical Q&A - balanced creativity for comprehensive answers
  'medical-qa': {
    temperature: 0.7,
    maxOutputTokens: 2048,
    systemInstruction: `You are a clinical AI assistant for healthcare professionals. Provide evidence-based, accurate medical information. Always cite guidelines when relevant. Be concise but thorough.`
  },
  // Diagnosis - lower temperature for accuracy
  'diagnosis': {
    temperature: 0.3,
    maxOutputTokens: 1500,
    systemInstruction: `You are an expert diagnostician. Analyze symptoms systematically. Consider patient demographics. Provide differential diagnoses ranked by likelihood. Always mention red flags.`
  },
  // Drug interactions - very precise, low temperature
  'drug-interaction': {
    temperature: 0.2,
    maxOutputTokens: 1000,
    systemInstruction: `You are a clinical pharmacist AI. Check for drug-drug interactions, contraindications, and allergies with high precision. Classify severity as critical, major, moderate, or minor.`
  },
  // Treatment planning - moderate creativity
  'treatment': {
    temperature: 0.5,
    maxOutputTokens: 2000,
    systemInstruction: `You are a clinical decision support system. Provide evidence-based treatment recommendations. Consider patient-specific factors like allergies, current medications, and comorbidities.`
  },
  // Clinical summarization - focus on extraction
  'summarization': {
    temperature: 0.3,
    maxOutputTokens: 1500,
    systemInstruction: `You are a medical documentation specialist. Extract and structure clinical information accurately. Maintain medical terminology. Focus on relevant clinical details.`
  },
  // ICD coding - very precise
  'icd-coding': {
    temperature: 0.2,
    maxOutputTokens: 800,
    systemInstruction: `You are a medical coding specialist. Suggest accurate ICD-10 codes based on diagnoses. Include both primary and secondary codes. Ensure codes match the clinical description.`
  },
  // General clinical chat - conversational but professional
  'clinical-chat': {
    temperature: 0.7,
    maxOutputTokens: 1000,
    systemInstruction: `You are an AI Clinical Copilot assisting doctors during consultations. Be concise, use medical terminology appropriately, and provide actionable guidance. Flag urgent findings clearly.`
  }
};

let geminiConfigWarningLogged = false;

class GeminiClinicalService {
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly models: Map<string, GenerativeModel> = new Map();
  private readonly isConfigured: boolean = false;
  private serverConfigured: boolean | null = null;

  constructor() {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'xxx') {
      if (!geminiConfigWarningLogged && import.meta.env?.DEV) {
        geminiConfigWarningLogged = true;
        console.debug('[Gemini] API key not set in browser — server-side AI handles meeting summaries');
      }
      this.isConfigured = false;
    } else {
      try {
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        this.isConfigured = true;
      } catch (error) {
        console.error('[Gemini] Failed to initialize:', error);
        this.isConfigured = false;
      }
    }
  }

  /**
   * Get a model configured for a specific task
   */
  private getModelForTask(taskType: keyof typeof TASK_CONFIGS): GenerativeModel | null {
    if (!this.genAI || !this.isConfigured) return null;

    // Check if we already have a cached model for this task
    const cachedModel = this.models.get(taskType);
    if (cachedModel) {
      return cachedModel;
    }

    const config = TASK_CONFIGS[taskType];
    const model = this.genAI.getGenerativeModel({
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
  private getSystemPrompt(taskType: keyof typeof TASK_CONFIGS): string {
    return TASK_CONFIGS[taskType].systemInstruction || '';
  }

  /**
   * Check if the service is properly configured
   */
  isApiConfigured(): boolean {
    return this.isConfigured || this.serverConfigured === true;
  }

  async checkConfiguration(): Promise<boolean> {
    if (this.isConfigured) return true;
    try {
      const resp = await fetch(`${API_BASE}/api/ai/gemini/status`, {
        headers: getApiHeaders(),
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      this.serverConfigured = Boolean(data?.configured);
      return this.serverConfigured;
    } catch {
      this.serverConfigured = false;
      return false;
    }
  }

  private async generateViaServer(
    prompt: string,
    taskType: keyof typeof TASK_CONFIGS,
  ): Promise<string | null> {
    try {
      const resp = await fetch(`${API_BASE}/api/ai/gemini/clinical`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          prompt,
          taskType,
        }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      this.serverConfigured = true;
      return data?.text || null;
    } catch {
      return null;
    }
  }

  // ==================== VOICE TRANSCRIPTION ====================

  async transcribeAudio(_audioBlob: Blob): Promise<string> {
    try {
      // Use Web Speech API for real-time transcription
      return await this.transcribeWithWebSpeech();
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  private transcribeWithWebSpeech(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in globalThis) && !('SpeechRecognition' in globalThis)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'th-TH,en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = true;

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
      };

      recognition.onend = () => {
        resolve(finalTranscript);
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.start();
    });
  }

  // ==================== CLINICAL NOTE SUMMARIZATION ====================

  async summarizeTranscription(segments: TranscriptSegment[]): Promise<{
    chiefComplaint: string;
    historyOfPresentIllness: string;
    assessment: string;
    plan: string;
  }> {
    const model = this.getModelForTask('summarization');

    // Fallback if not configured
    if (!model) {
      return {
        chiefComplaint: 'Please review transcript manually',
        historyOfPresentIllness: segments.map(s => s.text).join(' ').substring(0, 500),
        assessment: 'AI summarization unavailable - API not configured',
        plan: 'Review transcript and document findings'
      };
    }

    try {
      const fullTranscript = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');

      const prompt = `Analyze this doctor-patient consultation transcript and extract structured clinical information in JSON format.

Transcript:
${fullTranscript}

Please provide:
1. Chief Complaint
2. History of Present Illness (HPI)
3. Assessment
4. Plan

Return ONLY valid JSON with these fields: chiefComplaint, historyOfPresentIllness, assessment, plan`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = /\{[\s\S]*\}/.exec(text);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('Summarization error:', error);
      throw error;
    }
  }

  // ==================== ICD-10 CODE SUGGESTION ====================

  async suggestICD10Codes(diagnosisText: string): Promise<DiagnosisCode[]> {
    const model = this.getModelForTask('icd-coding');

    if (!model) {
      return [{
        code: 'R69',
        description: 'Illness, unspecified - (AI coding unavailable)',
        type: 'primary',
        status: 'active',
        onset: new Date()
      }];
    }

    try {
      const prompt = `Suggest appropriate ICD-10 codes for this diagnosis: "${diagnosisText}"

Return ONLY valid JSON array with this structure:
[
  {
    "code": "ICD-10 code",
    "description": "Full description",
    "type": "primary" or "secondary",
    "status": "active"
  }
]

Provide 1-3 most relevant codes.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = /\[[\s\S]*\]/.exec(text);
      if (jsonMatch) {
        const codes = JSON.parse(jsonMatch[0]);
        return codes.map((c: any) => ({
          ...c,
          onset: new Date(),
        }));
      }

      return [];
    } catch (error) {
      console.error('ICD-10 suggestion error:', error);
      return [];
    }
  }

  // ==================== DRUG INTERACTION CHECK ====================

  async checkDrugInteractions(
    newDrug: string,
    currentMedications: string[],
    allergies: string[]
  ): Promise<DrugInteraction[]> {
    const model = this.getModelForTask('drug-interaction');

    if (!model) {
      // Return a warning that interactions couldn't be checked
      return [{
        interactsWith: 'Unknown',
        severity: 'moderate' as const,
        description: 'Drug interaction check unavailable - API not configured. Please verify manually.',
        recommendation: 'Consult drug reference or pharmacist'
      }];
    }

    try {
      const prompt = `Check for drug interactions and allergies.

New Drug: ${newDrug}
Current Medications: ${currentMedications.join(', ') || 'None'}
Known Allergies: ${allergies.join(', ') || 'None'}

Analyze potential:
1. Drug-drug interactions
2. Drug-allergy conflicts
3. Contraindications

Return ONLY valid JSON array:
[
  {
    "interactsWith": "medication or allergy name",
    "severity": "critical" | "major" | "moderate" | "minor",
    "description": "description of interaction",
    "recommendation": "clinical recommendation"
  }
]

If no interactions found, return empty array [].`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = /\[[\s\S]*\]/.exec(text);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      console.error('Drug interaction check error:', error);
      return [];
    }
  }

  // ==================== DIFFERENTIAL DIAGNOSIS ====================

  async generateDifferentialDiagnosis(
    chiefComplaint: string,
    symptoms: string[],
    patientAge: number,
    patientGender: string
  ): Promise<string[]> {
    const model = this.getModelForTask('diagnosis');

    if (!model) {
      return [
        'AI diagnosis assistance unavailable',
        'Please consider common differentials based on presentation',
        'Consult clinical guidelines as needed'
      ];
    }

    try {
      const prompt = `Generate a differential diagnosis list.

Chief Complaint: ${chiefComplaint}
Symptoms: ${symptoms.join(', ')}
Patient: ${patientAge} year old ${patientGender}

Provide 5-10 possible diagnoses ranked by likelihood. Return ONLY a JSON array of strings:
["diagnosis 1", "diagnosis 2", ...]`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = /\[[\s\S]*\]/.exec(text);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      console.error('Differential diagnosis error:', error);
      return [];
    }
  }

  // ==================== TREATMENT RECOMMENDATIONS ====================

  async suggestTreatment(
    diagnosis: string,
    patientContext: {
      age: number;
      gender: string;
      allergies: string[];
      currentMedications: string[];
      chronicConditions: string[];
    }
  ): Promise<{
    medications: string[];
    lifestyle: string[];
    followUp: string;
    warnings: string[];
  }> {
    const model = this.getModelForTask('treatment');

    if (!model) {
      return {
        medications: ['AI recommendation unavailable - consult guidelines'],
        lifestyle: ['Healthy diet and exercise as appropriate'],
        followUp: 'Follow up based on clinical judgment',
        warnings: ['AI not configured - verify recommendations manually']
      };
    }

    try {
      const prompt = `Suggest evidence-based treatment for:

Diagnosis: ${diagnosis}
Patient Age: ${patientContext.age}
Gender: ${patientContext.gender}
Allergies: ${patientContext.allergies.join(', ') || 'None'}
Current Medications: ${patientContext.currentMedications.join(', ') || 'None'}
Chronic Conditions: ${patientContext.chronicConditions.join(', ') || 'None'}

Provide treatment recommendations. Return ONLY valid JSON:
{
  "medications": ["med 1 with dosage", "med 2 with dosage"],
  "lifestyle": ["advice 1", "advice 2"],
  "followUp": "follow-up recommendation",
  "warnings": ["warning 1", "warning 2"]
}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = /\{[\s\S]*\}/.exec(text);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Failed to parse treatment recommendations');
    } catch (error) {
      console.error('Treatment suggestion error:', error);
      throw error;
    }
  }

  // ==================== DRUG INFORMATION QUERY ====================

  async getDrugInfo(drugName: string): Promise<{
    name: string;
    class: string;
    indications: string[];
    contraindications: string[];
    sideEffects: string[];
    dosage: string;
  }> {
    const model = this.getModelForTask('medical-qa');

    if (!model) {
      return {
        name: drugName,
        class: 'Unknown - AI not configured',
        indications: ['Please consult drug reference'],
        contraindications: ['Please consult drug reference'],
        sideEffects: ['Please consult drug reference'],
        dosage: 'Please consult drug reference'
      };
    }

    try {
      const prompt = `Provide comprehensive drug information for: ${drugName}

Return ONLY valid JSON:
{
  "name": "drug name",
  "class": "drug class",
  "indications": ["indication 1", "indication 2"],
  "contraindications": ["contraindication 1"],
  "sideEffects": ["side effect 1", "side effect 2"],
  "dosage": "standard dosage information"
}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = /\{[\s\S]*\}/.exec(text);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Failed to parse drug information');
    } catch (error) {
      console.error('Drug info query error:', error);
      throw error;
    }
  }

  // ==================== MEDICAL Q&A ====================

  async askMedicalQuestion(question: string, context?: any): Promise<ClinicalAIResponse> {
    const model = this.getModelForTask('medical-qa');
    const contextStr = context ? `\n\nContext: ${JSON.stringify(context, null, 2)}` : '';
    const prompt = `Question: ${question}${contextStr}

Provide a detailed, evidence-based answer. Include references to clinical guidelines when relevant.`;

    try {
      let text = '';
      if (model) {
        const result = await model.generateContent(prompt);
        text = result.response.text();
      } else {
        text = (await this.generateViaServer(prompt, 'medical-qa')) || '';
      }
      if (!text) {
        return {
          type: 'medical-qa',
          suggestions: ['AI service not configured. Configure server GEMINI_API_KEY or client VITE_GEMINI_API_KEY.'],
          details: { answer: 'AI service is unavailable', status: 'api_not_configured' },
          confidence: 0,
        };
      }

      return {
        type: 'medical-qa',
        suggestions: [text],
        details: { answer: text },
        confidence: 0.85,
      };
    } catch (error: any) {
      console.error('Medical Q&A error:', error);
      return {
        type: 'medical-qa',
        suggestions: [`Error: ${error.message || 'Failed to get AI response'}`],
        details: { error: error.message },
        confidence: 0,
      };
    }
  }

  // ==================== CLINICAL CHAT (for dashboard) ====================

  async clinicalChat(
    message: string,
    patientContext?: {
      name?: string;
      age?: number;
      gender?: string;
      conditions?: string[];
      medications?: string[];
      allergies?: string[];
    },
    conversationHistory?: { role: string; content: string }[]
  ): Promise<string> {
    const model = this.getModelForTask('clinical-chat');

    try {
      // Get system instruction for clinical chat
      const systemPrompt = this.getSystemPrompt('clinical-chat');

      let contextPrompt = '';

      if (patientContext) {
        contextPrompt = `\n\nPatient Context:
- Name: ${patientContext.name || 'Unknown'}
- Age: ${patientContext.age || 'Unknown'}
- Gender: ${patientContext.gender || 'Unknown'}
- Conditions: ${patientContext.conditions?.join(', ') || 'None recorded'}
- Current Medications: ${patientContext.medications?.join(', ') || 'None'}
- Allergies: ${patientContext.allergies?.join(', ') || 'None known'}`;
      }

      let historyPrompt = '';
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6);
        historyPrompt = '\n\nRecent conversation:\n' +
          recentHistory.map(m => `${m.role}: ${m.content}`).join('\n');
      }

      const prompt = `${systemPrompt}${contextPrompt}${historyPrompt}

Doctor's question: ${message}

Provide a concise, clinically relevant response. Be helpful and actionable.`;

      if (model) {
        const result = await model.generateContent(prompt);
        return result.response.text();
      }

      const serverText = await this.generateViaServer(prompt, 'clinical-chat');
      return serverText || this.getFallbackChatResponse(message, patientContext);

    } catch (error: any) {
      console.error('Clinical chat error:', error);
      return `I apologize, but I encountered an error: ${error.message}. Please try again or rephrase your question.`;
    }
  }

  /**
   * Fallback responses when API is not configured
   */
  private getFallbackChatResponse(message: string, patientContext?: any): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('drug interaction') || lowerMessage.includes('drug-drug')) {
      return `🔍 **Drug Interactions Query**

To provide accurate drug interaction information, the AI service needs to be configured.

**Common High-Risk Interactions to Monitor:**
• Warfarin + NSAIDs: ⚠️ Increased bleeding risk
• ACE inhibitors + Potassium-sparing diuretics: ⚠️ Hyperkalemia
• Statins + Fibrates: ⚠️ Myopathy/Rhabdomyolysis risk
• Metformin + Contrast dye: ⚠️ Lactic acidosis risk
• SSRIs + MAOIs: ⚠️ Serotonin syndrome

💡 *Configure VITE_GEMINI_API_KEY for personalized interaction checking.*`;
    }

    if (lowerMessage.includes('chest pain') || lowerMessage.includes('differential')) {
      return `🩺 **Differential Diagnosis - Chest Pain**

**Cardiac Causes:**
• Acute Coronary Syndrome (STEMI, NSTEMI, Unstable Angina)
• Pericarditis
• Myocarditis
• Aortic dissection

**Non-Cardiac Causes:**
• GERD/Esophageal spasm
• Musculoskeletal pain
• Pulmonary embolism
• Pneumothorax
• Anxiety/Panic disorder

⚡ **Red Flags:** Radiation to arm/jaw, diaphoresis, dyspnea, syncope

💡 *Configure AI for patient-specific analysis.*`;
    }

    if (lowerMessage.includes('hypertension') || lowerMessage.includes('blood pressure')) {
      return `📋 **Hypertension Management**

**Classification (ACC/AHA 2017):**
• Normal: <120/80 mmHg
• Elevated: 120-129/<80 mmHg
• Stage 1: 130-139/80-89 mmHg
• Stage 2: ≥140/90 mmHg

**First-Line Medications:**
• ACE Inhibitors / ARBs
• Calcium Channel Blockers
• Thiazide Diuretics

**Target Goals:**
• <130/80 for most adults
• <140/90 for elderly (>65)

💡 *Enable AI for personalized treatment recommendations.*`;
    }

    if (patientContext) {
      return `Regarding **${patientContext.name || 'this patient'}**:

I can assist with clinical questions, but the AI service needs to be configured for detailed analysis.

**Available Information:**
• Age: ${patientContext.age || 'Not specified'}
• Gender: ${patientContext.gender || 'Not specified'}
• Conditions: ${patientContext.conditions?.join(', ') || 'None recorded'}

💡 *Configure VITE_GEMINI_API_KEY for comprehensive AI assistance.*`;
    }

    return `I'm the AI Clinical Assistant. 

**I can help with:**
• Drug interactions & contraindications
• Differential diagnoses
• Treatment protocols & guidelines
• Lab interpretation
• Clinical decision support

⚠️ *Note: Configure VITE_GEMINI_API_KEY in your environment for full AI capabilities.*

Select a patient or ask a clinical question to get started.`;
  }

  // ==================== MEDICAL CALCULATORS ====================

  calculateBMI(weight: number, height: number): {
    value: number;
    category: string;
    interpretation: string;
  } {
    const bmi = weight / ((height / 100) ** 2);
    let category = '';
    let interpretation = '';

    if (bmi < 18.5) {
      category = 'Underweight';
      interpretation = 'Below healthy weight range';
    } else if (bmi < 25) {
      category = 'Normal';
      interpretation = 'Healthy weight range';
    } else if (bmi < 30) {
      category = 'Overweight';
      interpretation = 'Above healthy weight range';
    } else {
      category = 'Obese';
      interpretation = 'Significantly above healthy weight range';
    }

    return {
      value: Number.parseFloat(bmi.toFixed(1)),
      category,
      interpretation,
    };
  }

  calculateGFR(
    creatinine: number,
    age: number,
    gender: 'male' | 'female',
    race: 'black' | 'other'
  ): {
    value: number;
    category: string;
    interpretation: string;
  } {
    // CKD-EPI equation
    const kappa = gender === 'female' ? 0.7 : 0.9;
    const alpha = gender === 'female' ? -0.329 : -0.411;
    const genderFactor = gender === 'female' ? 1.018 : 1;
    const raceFactor = race === 'black' ? 1.159 : 1;

    const minValue = Math.min(creatinine / kappa, 1);
    const maxValue = Math.max(creatinine / kappa, 1);

    const gfr = 141 * Math.pow(minValue, alpha) * Math.pow(maxValue, -1.209) *
      Math.pow(0.993, age) * genderFactor * raceFactor;

    let category = '';
    let interpretation = '';

    if (gfr >= 90) {
      category = 'Stage 1';
      interpretation = 'Normal kidney function';
    } else if (gfr >= 60) {
      category = 'Stage 2';
      interpretation = 'Mild kidney function reduction';
    } else if (gfr >= 30) {
      category = 'Stage 3';
      interpretation = 'Moderate kidney function reduction';
    } else if (gfr >= 15) {
      category = 'Stage 4';
      interpretation = 'Severe kidney function reduction';
    } else {
      category = 'Stage 5';
      interpretation = 'Kidney failure';
    }

    return {
      value: Math.round(gfr),
      category,
      interpretation,
    };
  }

  calculateCHADS2VASc(params: {
    hasCongestiveHeartFailure: boolean;
    hasHypertension: boolean;
    age: number;
    hasDiabetes: boolean;
    hadStroke: boolean;
    hasVascularDisease: boolean;
    gender: 'male' | 'female';
  }): {
    value: number;
    category: string;
    interpretation: string;
    recommendations: string[];
  } {
    let score = 0;

    if (params.hasCongestiveHeartFailure) score += 1;
    if (params.hasHypertension) score += 1;
    if (params.age >= 75) score += 2;
    else if (params.age >= 65) score += 1;
    if (params.hasDiabetes) score += 1;
    if (params.hadStroke) score += 2;
    if (params.hasVascularDisease) score += 1;
    if (params.gender === 'female') score += 1;

    let category = '';
    let interpretation = '';
    const recommendations: string[] = [];

    if (score === 0) {
      category = 'Low Risk';
      interpretation = 'Annual stroke risk < 1%';
      recommendations.push('No anticoagulation recommended', 'Consider aspirin or no therapy');
    } else if (score === 1) {
      category = 'Low-Moderate Risk';
      interpretation = 'Annual stroke risk ~1-2%';
      recommendations.push('Consider anticoagulation', 'Shared decision-making with patient');
    } else {
      category = 'High Risk';
      interpretation = `Annual stroke risk ~${score * 2}%`;
      recommendations.push('Anticoagulation recommended', 'Consider direct oral anticoagulants (DOACs)');
    }

    return {
      value: score,
      category,
      interpretation,
      recommendations,
    };
  }

  // ==================== EMR SUMMARY GENERATION ====================

  /**
   * Generate patient-friendly AI summary of EMR for health logs
   * Uses Gemini 2.5 Flash Lite for efficient processing
   */
  async generateEMRSummary(emrContent: {
    chiefComplaint: string;
    historyOfPresentIllness: string;
    vitalSigns: any;
    assessment: string;
    diagnosis: Array<{
      code?: string;
      description: string;
      type: string;
      status: string;
    }>;
    treatmentPlan: string;
    followUpInstructions: string;
  }): Promise<{
    summary: string;
    transcript: string;
  }> {
    const model = this.getModelForTask('summarization');

    // Fallback if AI is not configured
    if (!model) {
      return {
        summary: this.generateFallbackSummary(emrContent),
        transcript: '',
      };
    }

    try {
      const diagnosisList = emrContent.diagnosis
        .map(d => `${d.description} (${d.status})`)
        .join(', ') || 'Not specified';

      const prompt = `คุณคือผู้ช่วยทางการแพทย์ที่สร้างสรุปเวชระเบียนที่เข้าใจง่ายสำหรับผู้ป่วย
You are a medical assistant creating a patient-friendly EMR summary.

EMR Content:
- Chief Complaint: ${emrContent.chiefComplaint || 'Not recorded'}
- History of Present Illness: ${emrContent.historyOfPresentIllness || 'Not recorded'}
- Vital Signs: ${JSON.stringify(emrContent.vitalSigns) || 'Not recorded'}
- Assessment: ${emrContent.assessment || 'Not recorded'}
- Diagnosis: ${diagnosisList}
- Treatment Plan: ${emrContent.treatmentPlan || 'Not recorded'}
- Follow-up Instructions: ${emrContent.followUpInstructions || 'Not specified'}

Create a patient-friendly summary in both Thai and English. The summary should:
1. Explain the diagnosis in simple terms
2. Summarize the treatment plan
3. List important follow-up actions
4. Include any warnings or precautions

Return ONLY valid JSON:
{
  "summary_th": "Thai language patient-friendly summary",
  "summary_en": "English language patient-friendly summary",
  "key_points": ["point 1", "point 2", "point 3"],
  "follow_up_actions": ["action 1", "action 2"],
  "warnings": ["warning 1 if any"]
}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = /\{[\s\S]*\}/.exec(text);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Combine into a formatted summary
        const summary = `
📋 **สรุปเวชระเบียน / EMR Summary**

**ภาษาไทย:**
${parsed.summary_th || 'ไม่มีข้อมูล'}

**English:**
${parsed.summary_en || 'Not available'}

**ประเด็นสำคัญ / Key Points:**
${(parsed.key_points || []).map((p: string) => `• ${p}`).join('\n') || '• No key points'}

**สิ่งที่ต้องทำต่อ / Follow-up Actions:**
${(parsed.follow_up_actions || []).map((a: string) => `✓ ${a}`).join('\n') || '✓ No follow-up required'}

${parsed.warnings && parsed.warnings.length > 0 ? `
⚠️ **ข้อควรระวัง / Warnings:**
${parsed.warnings.map((w: string) => `⚠️ ${w}`).join('\n')}
` : ''}
`.trim();

        return {
          summary: summary,
          transcript: JSON.stringify(parsed, null, 2),
        };
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('EMR summary generation error:', error);
      // Return fallback on error
      return {
        summary: this.generateFallbackSummary(emrContent),
        transcript: '',
      };
    }
  }

  /**
   * Generate fallback summary when AI is unavailable
   */
  private generateFallbackSummary(emrContent: {
    chiefComplaint: string;
    diagnosis: Array<{ description: string; status: string }>;
    treatmentPlan: string;
    followUpInstructions: string;
  }): string {
    const diagnosisText = emrContent.diagnosis
      .map(d => `• ${d.description} (${d.status})`)
      .join('\n') || '• ไม่ระบุ / Not specified';

    return `
📋 **สรุปเวชระเบียน / EMR Summary**

**อาการที่มา / Chief Complaint:**
${emrContent.chiefComplaint || 'ไม่ได้ระบุ / Not specified'}

**การวินิจฉัย / Diagnosis:**
${diagnosisText}

**แผนการรักษา / Treatment Plan:**
${emrContent.treatmentPlan || 'ไม่ได้ระบุ / Not specified'}

**คำแนะนำการติดตาม / Follow-up Instructions:**
${emrContent.followUpInstructions || 'ไม่ได้ระบุ / Not specified'}

---
*หมายเหตุ: สรุปอัตโนมัติโดยระบบ*
*Note: Auto-generated summary*
`.trim();
  }
}

export const geminiClinicalService = new GeminiClinicalService();
