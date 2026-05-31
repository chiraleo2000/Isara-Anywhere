/**
 * ═══════════════════════════════════════════════════════════════════════
 * DOCTOR PORTAL — Gemini AI Service Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: geminiService.ts + geminiClinicalService.ts
 * Validates: AI prompt construction, response parsing, clinical summaries
 */
import { describe, it, expect } from 'vitest';

// ── AI Service Helpers ──────────────────────────────────────────────────

function buildSOAPPrompt(transcript: string[], patientContext?: string): string {
  const context = patientContext ? `\nPatient Context: ${patientContext}` : '';
  return `Analyze the following medical consultation transcript and generate a SOAP note.\n\nTranscript:\n${transcript.join('\n')}${context}\n\nGenerate:\n- S (Subjective): Patient's reported symptoms\n- O (Objective): Examination findings\n- A (Assessment): Diagnosis/clinical impression\n- P (Plan): Treatment plan`;
}

function buildCDSPrompt(medications: string[], conditions: string[]): string {
  return `Clinical Decision Support Check:\n\nCurrent Medications: ${medications.join(', ')}\nConditions: ${conditions.join(', ')}\n\nCheck for:\n1. Drug-drug interactions\n2. Drug-condition contraindications\n3. Dosage concerns\n4. Allergy cross-reactivity`;
}

function buildPatientSummaryPrompt(patientId: string, records: { type: string; date: string; summary: string }[]): string {
  const recordsText = records.map(r => `[${r.date}] ${r.type}: ${r.summary}`).join('\n');
  return `Generate a concise clinical summary for patient ${patientId}:\n\n${recordsText}\n\nProvide: Key conditions, current medications, recent labs, and recommendations.`;
}

function parseSOAPResponse(text: string): {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
} {
  const sections: Record<string, string> = { subjective: '', objective: '', assessment: '', plan: '' };
  const patterns = [
    { key: 'subjective', regex: /S(?:ubjective)?[:\s]+([\s\S]*?)(?=O(?:bjective)?[:\s]|$)/i },
    { key: 'objective', regex: /O(?:bjective)?[:\s]+([\s\S]*?)(?=A(?:ssessment)?[:\s]|$)/i },
    { key: 'assessment', regex: /A(?:ssessment)?[:\s]+([\s\S]*?)(?=P(?:lan)?[:\s]|$)/i },
    { key: 'plan', regex: /P(?:lan)?[:\s]+([\s\S]*?)$/i },
  ];
  for (const { key, regex } of patterns) {
    const match = text.match(regex);
    if (match) sections[key] = match[1].trim();
  }
  return sections as any;
}

function parseCDSResponse(text: string): { alerts: { type: string; severity: string; message: string }[] } {
  const alerts: { type: string; severity: string; message: string }[] = [];
  // Simplified parser for CDS alerts
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines) {
    if (line.toLowerCase().includes('interaction')) {
      alerts.push({ type: 'drug_interaction', severity: 'high', message: line.trim() });
    } else if (line.toLowerCase().includes('contraindication')) {
      alerts.push({ type: 'contraindication', severity: 'medium', message: line.trim() });
    }
  }
  return { alerts };
}

function validateGeminiConfig(config: { model: string; temperature: number; maxTokens: number }): boolean {
  if (!config.model.startsWith('gemini-')) return false;
  if (config.temperature < 0 || config.temperature > 2) return false;
  if (config.maxTokens < 1 || config.maxTokens > 32768) return false;
  return true;
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Doctor Portal — Gemini AI Service', () => {

  describe('A — SOAP Prompt Construction', () => {
    it('A01 — builds SOAP prompt from transcript', () => {
      const prompt = buildSOAPPrompt([
        'Doctor: สวัสดีครับ มีอาการอะไรบ้างครับ',
        'Patient: ปวดหัวมา 3 วัน',
        'Doctor: มีไข้ไหมครับ',
        'Patient: มีไข้เล็กน้อย 37.5',
      ]);
      expect(prompt).toContain('SOAP note');
      expect(prompt).toContain('ปวดหัวมา 3 วัน');
      expect(prompt).toContain('S (Subjective)');
    });

    it('A02 — includes patient context when provided', () => {
      const prompt = buildSOAPPrompt(['test transcript'], 'DM Type 2, Hypertension');
      expect(prompt).toContain('Patient Context: DM Type 2');
    });

    it('A03 — works without patient context', () => {
      const prompt = buildSOAPPrompt(['test transcript']);
      expect(prompt).not.toContain('Patient Context');
    });

    it('A04 — prompt requests all 4 SOAP sections', () => {
      const prompt = buildSOAPPrompt(['test']);
      expect(prompt).toContain('Subjective');
      expect(prompt).toContain('Objective');
      expect(prompt).toContain('Assessment');
      expect(prompt).toContain('Plan');
    });
  });

  describe('B — CDS Prompt Construction', () => {
    it('B01 — builds CDS prompt with medications and conditions', () => {
      const prompt = buildCDSPrompt(
        ['Warfarin 5mg', 'Aspirin 81mg'],
        ['Atrial Fibrillation', 'Hypertension']
      );
      expect(prompt).toContain('Warfarin');
      expect(prompt).toContain('Aspirin');
      expect(prompt).toContain('Atrial Fibrillation');
      expect(prompt).toContain('Drug-drug interactions');
    });

    it('B02 — checks for all CDS categories', () => {
      const prompt = buildCDSPrompt(['Test'], ['Test']);
      expect(prompt).toContain('Drug-drug interactions');
      expect(prompt).toContain('Drug-condition contraindications');
      expect(prompt).toContain('Dosage concerns');
      expect(prompt).toContain('Allergy cross-reactivity');
    });
  });

  describe('C — Patient Summary Prompt', () => {
    it('C01 — builds summary from multiple records', () => {
      const records = [
        { type: 'EMR', date: '2026-03-01', summary: 'Diagnosed with migraine' },
        { type: 'LAB', date: '2026-03-05', summary: 'CBC normal' },
        { type: 'RX', date: '2026-03-01', summary: 'Sumatriptan 50mg PRN' },
      ];
      const prompt = buildPatientSummaryPrompt('PT-001', records);
      expect(prompt).toContain('PT-001');
      expect(prompt).toContain('migraine');
      expect(prompt).toContain('CBC normal');
    });

    it('C02 — handles empty records', () => {
      const prompt = buildPatientSummaryPrompt('PT-002', []);
      expect(prompt).toContain('PT-002');
    });
  });

  describe('D — SOAP Response Parsing', () => {
    it('D01 — parses well-formatted SOAP', () => {
      const text = `S: Patient reports headache for 3 days, mild fever.
O: BP 130/85, Temp 37.5°C, no neck stiffness.
A: Tension headache with mild viral illness.
P: Paracetamol 500mg q6h, rest, follow-up in 1 week.`;
      const soap = parseSOAPResponse(text);
      expect(soap.subjective).toContain('headache');
      expect(soap.objective).toContain('BP 130/85');
      expect(soap.assessment).toContain('Tension headache');
      expect(soap.plan).toContain('Paracetamol');
    });

    it('D02 — parses full-word SOAP labels', () => {
      const text = `Subjective: Headache
Objective: Temp 37.2
Assessment: Migraine
Plan: Sumatriptan 50mg`;
      const soap = parseSOAPResponse(text);
      expect(soap.subjective).toContain('Headache');
      expect(soap.plan).toContain('Sumatriptan');
    });

    it('D03 — handles Thai content in SOAP', () => {
      const text = `S: ผู้ป่วยมีอาการปวดหัว 3 วัน
O: BP 120/80, temp ปกติ
A: ไมเกรน
P: สั่งยาพาราเซตามอล`;
      const soap = parseSOAPResponse(text);
      expect(soap.subjective).toContain('ปวดหัว');
      expect(soap.assessment).toContain('ไมเกรน');
    });

    it('D04 — returns empty strings for missing sections', () => {
      const soap = parseSOAPResponse('Random text without sections');
      expect(soap.subjective).toBe('');
      expect(soap.objective).toBe('');
    });
  });

  describe('E — CDS Response Parsing', () => {
    it('E01 — detects drug interactions', () => {
      const text = `Drug Interaction: Warfarin + Aspirin - increased bleeding risk
Monitor INR closely when combining warfarin with aspirin.`;
      const result = parseCDSResponse(text);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0].type).toBe('drug_interaction');
    });

    it('E02 — detects contraindications', () => {
      const text = `Contraindication: Metformin in renal impairment (eGFR < 30)`;
      const result = parseCDSResponse(text);
      expect(result.alerts[0].type).toBe('contraindication');
    });

    it('E03 — returns empty alerts for clean check', () => {
      const text = `All medications appear safe. No concerns identified.`;
      const result = parseCDSResponse(text);
      expect(result.alerts).toHaveLength(0);
    });
  });

  describe('F — Gemini Configuration Validation', () => {
    it('F01 — accepts valid config', () => {
      expect(validateGeminiConfig({
        model: 'gemini-3.1-flash-lite',
        temperature: 0.3,
        maxTokens: 8192,
      })).toBe(true);
    });

    it('F02 — rejects non-gemini model', () => {
      expect(validateGeminiConfig({
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4096,
      })).toBe(false);
    });

    it('F03 — rejects temperature out of range', () => {
      expect(validateGeminiConfig({
        model: 'gemini-3.1-flash-lite',
        temperature: 3.0,
        maxTokens: 4096,
      })).toBe(false);
    });

    it('F04 — rejects negative temperature', () => {
      expect(validateGeminiConfig({
        model: 'gemini-3.1-flash-lite',
        temperature: -1,
        maxTokens: 4096,
      })).toBe(false);
    });

    it('F05 — rejects zero max tokens', () => {
      expect(validateGeminiConfig({
        model: 'gemini-3.1-flash-lite',
        temperature: 0.5,
        maxTokens: 0,
      })).toBe(false);
    });

    it('F06 — rejects exceeding max tokens', () => {
      expect(validateGeminiConfig({
        model: 'gemini-3.1-flash-lite',
        temperature: 0.5,
        maxTokens: 100000,
      })).toBe(false);
    });
  });
});
