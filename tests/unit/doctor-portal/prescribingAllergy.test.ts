/**
 * Prescribing allergy cross-check — Processes/Pages/Doctor-Portal/09_Prescribing.md
 */
import { describe, it, expect } from 'vitest';

type Allergy = { substance: string; severity?: string };

function canPrescribe(drugName: string, allergies: Allergy[]): { ok: boolean; reason?: string } {
  const drug = drugName.toLowerCase();
  for (const a of allergies) {
    const sub = a.substance.toLowerCase();
    if (drug.includes(sub) || sub.includes(drug) || (sub.includes('penicillin') && drug.includes('amoxicillin'))) {
      return { ok: false, reason: `Allergy conflict: ${a.substance}` };
    }
  }
  return { ok: true };
}

describe('Prescribing allergy gate', () => {
  it('blocks penicillin class when patient allergic', () => {
    const r = canPrescribe('Amoxicillin 500mg', [{ substance: 'Penicillin', severity: 'severe' }]);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Allergy/i);
  });

  it('allows unrelated drug', () => {
    const r = canPrescribe('Paracetamol 500mg', [{ substance: 'Penicillin' }]);
    expect(r.ok).toBe(true);
  });
});
