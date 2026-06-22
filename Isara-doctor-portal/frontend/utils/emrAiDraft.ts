export const EMR_AI_DRAFT_KEY = 'emr-ai-draft';

export interface EmrAiDraft {
  appointmentId?: string;
  patientId?: string;
  summary?: string | null;
  structured?: {
    chiefComplaint?: string;
    soap?: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    };
  } | null;
  degraded?: boolean;
}

export function storeEmrAiDraft(draft: EmrAiDraft): void {
  sessionStorage.setItem(EMR_AI_DRAFT_KEY, JSON.stringify(draft));
}

export function readEmrAiDraft(): EmrAiDraft | null {
  try {
    const raw = sessionStorage.getItem(EMR_AI_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EmrAiDraft;
  } catch {
    return null;
  }
}

export function clearEmrAiDraft(): void {
  sessionStorage.removeItem(EMR_AI_DRAFT_KEY);
}
