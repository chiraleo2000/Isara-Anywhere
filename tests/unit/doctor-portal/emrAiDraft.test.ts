/**
 * @process Processes/POST_MEETING_WORKFLOW.md, Processes/Pages/Doctor-Portal/08_EMR_Editor.md
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  EMR_AI_DRAFT_KEY,
  storeEmrAiDraft,
  readEmrAiDraft,
  clearEmrAiDraft,
} from '../../../../issara-doctor/frontend/utils/emrAiDraft.ts';

describe('emrAiDraft — POST_MEETING → EMR apply (EAD)', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    globalThis.sessionStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v); },
      removeItem: (k: string) => { storage.delete(k); },
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    };
  });

  it('EAD-01 — draft key is stable', () => {
    expect(EMR_AI_DRAFT_KEY).toBe('emr-ai-draft');
  });

  it('EAD-02 — store and read round-trip', () => {
    storeEmrAiDraft({ appointmentId: 'apt-1', summary: 'SOAP note', degraded: false });
    expect(readEmrAiDraft()).toMatchObject({ appointmentId: 'apt-1', summary: 'SOAP note' });
  });

  it('EAD-03 — clear removes draft', () => {
    storeEmrAiDraft({ summary: 'x' });
    clearEmrAiDraft();
    expect(readEmrAiDraft()).toBeNull();
  });

  it('EAD-04 — degraded flag preserved', () => {
    storeEmrAiDraft({ degraded: true, summary: 'lite' });
    expect(readEmrAiDraft()?.degraded).toBe(true);
  });

  it('EAD-05 — structured SOAP shape', () => {
    storeEmrAiDraft({
      structured: { soap: { subjective: 'cough', plan: 'rest' } },
    });
    expect(readEmrAiDraft()?.structured?.soap?.subjective).toBe('cough');
  });

  it('EAD-06 — invalid JSON returns null', () => {
    storage.set(EMR_AI_DRAFT_KEY, '{bad');
    expect(readEmrAiDraft()).toBeNull();
  });

  it('EAD-07 — CompleteEMREditor imports readEmrAiDraft', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../issara-doctor/frontend/components/CompleteEMREditor.tsx'),
      'utf8',
    );
    expect(src).toMatch(/readEmrAiDraft/);
    expect(src).toMatch(/clearEmrAiDraft/);
  });

  it('EAD-08 — EmrAppointmentPage loads editor from appointment route', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../issara-doctor/frontend/pages/meetings/EmrAppointmentPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/CompleteEMREditor/);
    expect(src).toMatch(/emr\/:appointmentId|appointmentId/);
  });
});
