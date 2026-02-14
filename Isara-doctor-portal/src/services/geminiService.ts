import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';

let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
}

export interface DiagnosisSuggestion {
  icd10Code: string;
  description: string;
  confidence: number;
}

export interface DrugInfo {
  name: string;
  genericName: string;
  indications: string[];
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  dosage: string;
}

class GeminiService {
  private readonly model: any;

  constructor() {
    if (genAI) {
      this.model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    }
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const chat = this.model.startChat({
        history: messages.slice(0, -1).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      const lastMessage = messages[messages.length - 1];
      const prompt = systemPrompt ? `${systemPrompt}\n\n${lastMessage.content}` : lastMessage.content;

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      throw new Error(error.message || 'Failed to get response from Gemini');
    }
  }

  async generateClinicalSummary(transcription: string, patientContext?: any): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `You are a medical AI assistant. Generate a structured clinical summary from the following doctor-patient conversation transcript.

Patient Context:
${patientContext ? JSON.stringify(patientContext, null, 2) : 'Not provided'}

Transcript:
${transcription}

Please provide a structured summary in the following format:

**Chief Complaint:**
[Main reason for visit]

**History of Present Illness:**
[Detailed description of current condition]

**Physical Examination:**
[Any examination findings mentioned]

**Assessment:**
[Clinical assessment and preliminary diagnosis]

**Plan:**
[Treatment plan and recommendations]

Keep the summary concise, professional, and medically accurate. Use medical terminology appropriately.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('Clinical summary error:', error);
      throw new Error('Failed to generate clinical summary');
    }
  }

  async suggestDiagnosis(symptoms: string[], history?: string): Promise<DiagnosisSuggestion[]> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `You are a medical AI assistant. Based on the following symptoms and patient history, suggest possible diagnoses with ICD-10 codes.

Symptoms:
${symptoms.join(', ')}

Patient History:
${history || 'Not provided'}

Provide 3-5 differential diagnoses, each with:
1. ICD-10 code
2. Description
3. Confidence level (0-1)

Format your response as JSON array:
[
  {
    "icd10Code": "code",
    "description": "diagnosis name",
    "confidence": 0.8
  }
]`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error: any) {
      console.error('Diagnosis suggestion error:', error);
      return [];
    }
  }

  async getDrugInformation(drugName: string): Promise<DrugInfo | null> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Provide comprehensive information about the medication: ${drugName}

Include:
1. Generic name
2. Common indications
3. Contraindications
4. Common side effects
5. Important drug interactions
6. Standard dosage information

Format as JSON:
{
  "name": "brand name",
  "genericName": "generic name",
  "indications": ["indication 1", "indication 2"],
  "contraindications": ["contraindication 1"],
  "sideEffects": ["side effect 1"],
  "interactions": ["interaction 1"],
  "dosage": "standard dosage info"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error: any) {
      console.error('Drug info error:', error);
      return null;
    }
  }

  async checkDrugInteractions(medications: string[]): Promise<any[]> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Check for drug interactions between the following medications:
${medications.join(', ')}

Identify any significant drug-drug interactions, including:
1. Severity level (critical, major, moderate, minor)
2. Description of interaction
3. Clinical recommendations

Format as JSON array:
[
  {
    "drug1": "drug name",
    "drug2": "drug name",
    "severity": "major",
    "description": "interaction description",
    "recommendation": "clinical recommendation"
  }
]`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error: any) {
      console.error('Drug interaction check error:', error);
      return [];
    }
  }

  async extractMedicalEntities(text: string): Promise<any> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Extract medical entities from the following clinical text:

"${text}"

Identify and categorize:
1. Symptoms
2. Diagnoses
3. Medications
4. Procedures
5. Lab tests
6. Vital signs

Format as JSON:
{
  "symptoms": [],
  "diagnoses": [],
  "medications": [],
  "procedures": [],
  "labTests": [],
  "vitalSigns": {}
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {};
    } catch (error: any) {
      console.error('Entity extraction error:', error);
      return {};
    }
  }

  async generateTreatmentPlan(diagnosis: string, patientInfo: any): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Generate a comprehensive treatment plan for a patient with the following diagnosis: ${diagnosis}

Patient Information:
Age: ${patientInfo.age}
Gender: ${patientInfo.gender}
Chronic Conditions: ${patientInfo.chronicConditions?.join(', ') || 'None'}
Allergies: ${patientInfo.allergies?.join(', ') || 'None'}
Current Medications: ${patientInfo.currentMedications?.join(', ') || 'None'}

Provide:
1. Pharmacological treatment recommendations
2. Non-pharmacological interventions
3. Lifestyle modifications
4. Follow-up schedule
5. Warning signs to watch for
6. Patient education points

Keep recommendations evidence-based and practical.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('Treatment plan error:', error);
      throw new Error('Failed to generate treatment plan');
    }
  }

  async analyzeMedicalDocument(documentText: string): Promise<any> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Analyze the following medical document and extract key information:

${documentText}

Extract:
1. Document type (lab report, imaging report, consultation note, etc.)
2. Key findings
3. Abnormal values (if any)
4. Recommendations
5. Follow-up needed

Format as JSON:
{
  "documentType": "",
  "keyFindings": [],
  "abnormalValues": [],
  "recommendations": [],
  "followUpNeeded": false
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {};
    } catch (error: any) {
      console.error('Document analysis error:', error);
      return {};
    }
  }

  async calculateMedicalScore(scoreType: string, parameters: any): Promise<any> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Calculate the ${scoreType} score using the following parameters:

${JSON.stringify(parameters, null, 2)}

Provide:
1. The calculated score
2. Risk category/interpretation
3. Clinical recommendations based on the score

Format as JSON:
{
  "score": 0,
  "interpretation": "",
  "recommendations": ""
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {};
    } catch (error: any) {
      console.error('Medical score calculation error:', error);
      return {};
    }
  }

  isConfigured(): boolean {
    return !!genAI;
  }
}

export const geminiService = new GeminiService();
export default geminiService;
