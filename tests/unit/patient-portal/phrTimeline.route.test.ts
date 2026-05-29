import { describe, it, expect } from 'vitest';

const DEMO_PATIENT_IDS = new Set(['PATIENT-DEMO', 'patient-demo', 'demo-patient']);

function isDemoPatient(patientId: string): boolean {
  return DEMO_PATIENT_IDS.has(patientId) || patientId.toUpperCase() === 'PATIENT-DEMO';
}

async function safeQuery<T>(
  fn: () => Promise<T>,
  demoFallback: T,
  patientId: string,
): Promise<T> {
  try {
    return await fn();
  } catch {
    if (isDemoPatient(patientId)) return demoFallback;
    throw new Error('query failed');
  }
}

async function buildTimeline(
  patientId: string,
  queries: {
    appointments: () => Promise<{ rows: unknown[] }>;
    emrs: () => Promise<{ rows: unknown[] }>;
  },
): Promise<unknown[]> {
  const timeline: unknown[] = [];
  const apt = await safeQuery(queries.appointments, { rows: [] }, patientId);
  timeline.push(...apt.rows);
  const emr = await safeQuery(queries.emrs, { rows: [] }, patientId);
  timeline.push(...emr.rows);
  return timeline;
}

function isDemoTimelinePatient(patientId: string): boolean {
  const id = String(patientId || '').toUpperCase();
  return id === 'PATIENT-DEMO' || id.startsWith('PATIENT-DEMO');
}

describe('PHR timeline degraded responses', () => {
  it('short-circuits demo patients with empty timeline (no DB)', () => {
    expect(isDemoTimelinePatient('PATIENT-DEMO')).toBe(true);
    expect(isDemoTimelinePatient('patient-demo-2')).toBe(true);
    expect(isDemoTimelinePatient('PAT-REAL')).toBe(false);
  });

  it('returns empty segments for PATIENT-DEMO when DB throws', async () => {
    const result = await buildTimeline('PATIENT-DEMO', {
      appointments: async () => {
        throw new Error('relation does not exist');
      },
      emrs: async () => {
        throw new Error('timeout');
      },
    });
    expect(result).toEqual([]);
  });

  it('rethrows for non-demo patient on DB failure', async () => {
    await expect(
      buildTimeline('PAT-REAL-001', {
        appointments: async () => {
          throw new Error('db down');
        },
        emrs: async () => ({ rows: [] }),
      }),
    ).rejects.toThrow('query failed');
  });

  it('aggregates rows when queries succeed', async () => {
    const result = await buildTimeline('PAT-001', {
      appointments: async () => ({ rows: [{ id: 'a1', type: 'appointment' }] }),
      emrs: async () => ({ rows: [{ id: 'e1', type: 'diagnosis' }] }),
    });
    expect(result).toHaveLength(2);
  });
});
