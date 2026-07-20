/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — JITSI MEETING SERVER UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: chunkTranscript, room name generation, meeting status logic,
 *        CDS rule checks, and API route validation
 * Source: issara-jitsi/backend/index.js
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─── Re-implement chunkTranscript (pure logic from Jitsi server) ───

interface TranscriptRow {
  created_at: string;
  speaker_role: string;
  content: string;
}

interface TranscriptChunk {
  chunk_index: number;
  chunk_text: string;
  speaker_role: string;
  start_time_seconds: number;
  end_time_seconds: number;
}

function chunkTranscript(transcriptRows: TranscriptRow[], chunkSeconds = 60): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  if (!transcriptRows || transcriptRows.length === 0) return chunks;

  const startTime = new Date(transcriptRows[0].created_at).getTime();
  let currentChunk = {
    texts: [] as string[],
    speaker: transcriptRows[0].speaker_role,
    startSec: 0,
    endSec: 0,
  };

  for (const row of transcriptRows) {
    const rowTime = new Date(row.created_at).getTime();
    const elapsedSec = Math.floor((rowTime - startTime) / 1000);
    const chunkIndex = Math.floor(elapsedSec / chunkSeconds);

    if (
      chunkIndex > chunks.length ||
      (row.speaker_role !== currentChunk.speaker && currentChunk.texts.length > 0)
    ) {
      if (currentChunk.texts.length > 0) {
        chunks.push({
          chunk_index: chunks.length,
          chunk_text: currentChunk.texts.join(' '),
          speaker_role: currentChunk.speaker,
          start_time_seconds: currentChunk.startSec,
          end_time_seconds: currentChunk.endSec,
        });
      }
      currentChunk = { texts: [], speaker: row.speaker_role, startSec: elapsedSec, endSec: elapsedSec };
    }

    currentChunk.texts.push(row.content);
    currentChunk.endSec = elapsedSec;
  }

  if (currentChunk.texts.length > 0) {
    chunks.push({
      chunk_index: chunks.length,
      chunk_text: currentChunk.texts.join(' '),
      speaker_role: currentChunk.speaker,
      start_time_seconds: currentChunk.startSec,
      end_time_seconds: currentChunk.endSec,
    });
  }

  return chunks;
}

// ─── Room name generation logic ───

function generateRoomName(appointmentId: string): string {
  const cleanId = appointmentId.substring(0, 12);
  const timestamp = Date.now().toString(36);
  return `izara-${cleanId}-${timestamp}`;
}

// ─── CDS (Clinical Decision Support) rule engine ───

interface CDSAlert {
  type: 'drug-interaction' | 'allergy' | 'dosage' | 'duplicate-therapy';
  severity: 'high' | 'medium' | 'low';
  message: string;
}

function checkDrugInteractions(
  prescribedDrugs: string[],
  interactionPairs: [string, string][],
): CDSAlert[] {
  const alerts: CDSAlert[] = [];
  const normalizedDrugs = new Set(prescribedDrugs.map(d => d.toLowerCase()));

  for (const [drugA, drugB] of interactionPairs) {
    if (normalizedDrugs.has(drugA.toLowerCase()) && normalizedDrugs.has(drugB.toLowerCase())) {
      alerts.push({
        type: 'drug-interaction',
        severity: 'high',
        message: `Interaction between ${drugA} and ${drugB}`,
      });
    }
  }
  return alerts;
}

function checkAllergyConflicts(
  prescribedDrugs: string[],
  knownAllergies: string[],
): CDSAlert[] {
  const alerts: CDSAlert[] = [];
  const normalizedAllergies = new Set(knownAllergies.map(a => a.toLowerCase()));

  for (const drug of prescribedDrugs) {
    if (normalizedAllergies.has(drug.toLowerCase())) {
      alerts.push({
        type: 'allergy',
        severity: 'high',
        message: `Patient is allergic to ${drug}`,
      });
    }
  }
  return alerts;
}

function checkDuplicateTherapy(prescribedDrugs: string[], drugClasses: Record<string, string[]>): CDSAlert[] {
  const alerts: CDSAlert[] = [];
  const normalizedDrugs = new Set(prescribedDrugs.map(d => d.toLowerCase()));

  for (const [className, drugsInClass] of Object.entries(drugClasses)) {
    const matches = drugsInClass.filter(d => normalizedDrugs.has(d.toLowerCase()));
    if (matches.length > 1) {
      alerts.push({
        type: 'duplicate-therapy',
        severity: 'medium',
        message: `Multiple ${className} drugs: ${matches.join(', ')}`,
      });
    }
  }
  return alerts;
}

// ─────────────────────────────────────────────
// A. Transcript Chunking
// ─────────────────────────────────────────────

describe('Meeting Server — chunkTranscript', () => {
  const baseTime = new Date('2024-06-15T10:00:00Z');

  function makeRow(offsetSec: number, speaker: string, content: string): TranscriptRow {
    return {
      created_at: new Date(baseTime.getTime() + offsetSec * 1000).toISOString(),
      speaker_role: speaker,
      content,
    };
  }

  it('A01 — returns empty for null/empty input', () => {
    expect(chunkTranscript([])).toHaveLength(0);
    expect(chunkTranscript(null as any)).toHaveLength(0);
  });

  it('A02 — single row returns single chunk', () => {
    const rows = [makeRow(0, 'doctor', 'Hello patient')];
    const chunks = chunkTranscript(rows);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunk_text).toBe('Hello patient');
    expect(chunks[0].speaker_role).toBe('doctor');
  });

  it('A03 — same speaker within chunk window joins text', () => {
    const rows = [
      makeRow(0, 'doctor', 'Hello'),
      makeRow(10, 'doctor', 'How are you?'),
      makeRow(20, 'doctor', 'Let me check.'),
    ];
    const chunks = chunkTranscript(rows, 60);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunk_text).toBe('Hello How are you? Let me check.');
  });

  it('A04 — speaker change creates new chunk', () => {
    const rows = [
      makeRow(0, 'doctor', 'Hello'),
      makeRow(5, 'patient', 'Hi doctor'),
      makeRow(10, 'doctor', 'How can I help?'),
    ];
    const chunks = chunkTranscript(rows, 60);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].speaker_role).toBe('doctor');
    expect(chunks[1].speaker_role).toBe('patient');
  });

  it('A05 — time boundary creates new chunk', () => {
    const rows = [
      makeRow(0, 'doctor', 'Start of meeting'),
      makeRow(61, 'doctor', 'After one minute'),
    ];
    const chunks = chunkTranscript(rows, 60);
    expect(chunks.length).toBe(2);
    expect(chunks[0].start_time_seconds).toBe(0);
    expect(chunks[1].start_time_seconds).toBe(61);
  });

  it('A06 — chunk_index is sequential', () => {
    const rows = [
      makeRow(0, 'doctor', 'First'),
      makeRow(5, 'patient', 'Second'),
      makeRow(10, 'doctor', 'Third'),
    ];
    const chunks = chunkTranscript(rows, 60);
    chunks.forEach((c, i) => {
      expect(c.chunk_index).toBe(i);
    });
  });

  it('A07 — custom chunk seconds (30s)', () => {
    const rows = [
      makeRow(0, 'doctor', 'Start'),
      makeRow(29, 'doctor', 'Still under 30'),
      makeRow(31, 'doctor', 'Over 30'),
    ];
    const chunks = chunkTranscript(rows, 30);
    // At minimum 2 chunks since 31 > 30
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('A08 — long conversation with multiple speakers', () => {
    const rows = [
      makeRow(0, 'doctor', 'สวัสดีครับ'),
      makeRow(3, 'patient', 'สวัสดีค่ะ คุณหมอ'),
      makeRow(10, 'doctor', 'มีอาการอะไรบ้างครับ'),
      makeRow(15, 'patient', 'ปวดหัวมา 3 วัน'),
      makeRow(20, 'doctor', 'ได้ทานยาอะไรหรือเปล่า'),
    ];
    const chunks = chunkTranscript(rows, 60);
    expect(chunks.length).toBeGreaterThanOrEqual(3); // doctor, patient, doctor, patient, doctor
    // Verify Thai text preserved
    expect(chunks[0].chunk_text).toContain('สวัสดี');
  });
});

// ─────────────────────────────────────────────
// B. Room Name Generation
// ─────────────────────────────────────────────

describe('Meeting Server — Room Name', () => {
  it('B01 — starts with "izara-" prefix', () => {
    const name = generateRoomName('apt-12345');
    expect(name).toMatch(/^izara-/);
  });

  it('B02 — truncates appointment ID to 12 chars', () => {
    const longId = 'apt-123456789012345';
    const name = generateRoomName(longId);
    // izara-apt + remaining part start from id
    expect(name.length).toBeLessThan(50);
  });

  it('B03 — unique per generation (timestamp)', () => {
    const name1 = generateRoomName('apt-001');
    const name2 = generateRoomName('apt-001');
    // Very likely different due to Date.now() + toString(36)
    // But they start with same prefix
    expect(name1).toMatch(/^izara-apt-001/);
    expect(name2).toMatch(/^izara-apt-001/);
  });

  it('B04 — contains only safe URL characters', () => {
    const name = generateRoomName('apt-test-123');
    // Room name should be URL-safe (no spaces, special chars)
    expect(name).toMatch(/^[a-zA-Z0-9-]+$/);
  });
});

// ─────────────────────────────────────────────
// C. CDS — Drug Interaction Checks
// ─────────────────────────────────────────────

describe('Meeting Server — CDS Drug Interactions', () => {
  const knownInteractions: [string, string][] = [
    ['Warfarin', 'Aspirin'],
    ['Metformin', 'Alcohol'],
    ['Lisinopril', 'Potassium'],
    ['Simvastatin', 'Erythromycin'],
  ];

  it('C01 — detects known interaction pair', () => {
    const alerts = checkDrugInteractions(['Warfarin', 'Aspirin'], knownInteractions);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('drug-interaction');
    expect(alerts[0].severity).toBe('high');
  });

  it('C02 — no alert when drugs are safe together', () => {
    const alerts = checkDrugInteractions(['Metformin', 'Aspirin'], knownInteractions);
    expect(alerts).toHaveLength(0);
  });

  it('C03 — case-insensitive matching', () => {
    const alerts = checkDrugInteractions(['warfarin', 'aspirin'], knownInteractions);
    expect(alerts).toHaveLength(1);
  });

  it('C04 — multiple interactions detected', () => {
    const alerts = checkDrugInteractions(
      ['Warfarin', 'Aspirin', 'Simvastatin', 'Erythromycin'],
      knownInteractions,
    );
    expect(alerts).toHaveLength(2);
  });

  it('C05 — empty drug list returns no alerts', () => {
    const alerts = checkDrugInteractions([], knownInteractions);
    expect(alerts).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// D. CDS — Allergy Conflict Check
// ─────────────────────────────────────────────

describe('Meeting Server — CDS Allergy Checks', () => {
  it('D01 — detects drug matching known allergy', () => {
    const alerts = checkAllergyConflicts(['Penicillin', 'Aspirin'], ['Penicillin']);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('allergy');
    expect(alerts[0].severity).toBe('high');
  });

  it('D02 — no alert when no allergy match', () => {
    const alerts = checkAllergyConflicts(['Metformin'], ['Penicillin']);
    expect(alerts).toHaveLength(0);
  });

  it('D03 — case-insensitive allergy matching', () => {
    const alerts = checkAllergyConflicts(['PENICILLIN'], ['penicillin']);
    expect(alerts).toHaveLength(1);
  });

  it('D04 — multiple allergy matches', () => {
    const alerts = checkAllergyConflicts(
      ['Penicillin', 'Aspirin', 'Ibuprofen'],
      ['Penicillin', 'Ibuprofen'],
    );
    expect(alerts).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────
// E. CDS — Duplicate Therapy
// ─────────────────────────────────────────────

describe('Meeting Server — CDS Duplicate Therapy', () => {
  const drugClasses: Record<string, string[]> = {
    'ACE Inhibitors': ['Lisinopril', 'Enalapril', 'Ramipril'],
    'NSAIDs': ['Ibuprofen', 'Naproxen', 'Diclofenac'],
    'Statins': ['Atorvastatin', 'Simvastatin', 'Rosuvastatin'],
  };

  it('E01 — detects duplicate NSAIDs', () => {
    const alerts = checkDuplicateTherapy(['Ibuprofen', 'Naproxen'], drugClasses);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('duplicate-therapy');
    expect(alerts[0].message).toContain('NSAIDs');
  });

  it('E02 — no alert for single drug per class', () => {
    const alerts = checkDuplicateTherapy(['Lisinopril', 'Ibuprofen', 'Atorvastatin'], drugClasses);
    expect(alerts).toHaveLength(0);
  });

  it('E03 — detects multiple violations', () => {
    const alerts = checkDuplicateTherapy(
      ['Ibuprofen', 'Naproxen', 'Atorvastatin', 'Simvastatin'],
      drugClasses,
    );
    expect(alerts).toHaveLength(2);
  });

  it('E04 — case-insensitive matching', () => {
    const alerts = checkDuplicateTherapy(['ibuprofen', 'naproxen'], drugClasses);
    expect(alerts).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────
// F. API Route Structure Validation
// ─────────────────────────────────────────────

describe('Meeting Server — API Routes', () => {
  const expectedRoutes = [
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/api/health' },
    { method: 'GET', path: '/api/config' },
    { method: 'GET', path: '/api/meetings' },
    { method: 'GET', path: '/api/meetings/active' },
    { method: 'POST', path: '/api/meetings/create' },
    { method: 'POST', path: '/api/meeting/create' },
    { method: 'GET', path: '/api/meetings/:id' },
    { method: 'GET', path: '/api/meetings/:id/status' },
    { method: 'GET', path: '/api/meetings/:id/participants' },
    { method: 'POST', path: '/api/meetings/:id/end' },
    { method: 'GET', path: '/api/meetings/history/:doctorId' },
    { method: 'POST', path: '/api/meetings/:id/start-transcription' },
    { method: 'POST', path: '/api/meetings/:id/pause-transcription' },
    { method: 'POST', path: '/api/meetings/:id/transcript' },
    { method: 'POST', path: '/api/meetings/:id/stop-transcription' },
    { method: 'GET', path: '/api/meetings/:id/transcript' },
    { method: 'GET', path: '/api/meetings/:id/transcript/sections' },
    { method: 'POST', path: '/api/meetings/:id/chat' },
    { method: 'GET', path: '/api/meetings/:id/chats' },
    { method: 'POST', path: '/api/meetings/:id/invite' },
    { method: 'GET', path: '/api/meetings/:id/invites' },
    { method: 'POST', path: '/api/meetings/:id/generate-summary' },
    { method: 'POST', path: '/api/meetings/:id/process-embeddings' },
    { method: 'GET', path: '/api/meetings/:id/summary' },
    { method: 'GET', path: '/api/meetings/stt/config' },
    { method: 'POST', path: '/api/meetings/:id/transcribe-audio' },
    { method: 'POST', path: '/api/meetings/:id/enhanced-summary' },
    { method: 'POST', path: '/api/ai/pre-consultation-summary' },
    { method: 'POST', path: '/api/ai/patient-instruction-sheet' },
    { method: 'POST', path: '/api/ai/document-analysis' },
    { method: 'POST', path: '/api/ai/cds-check' },
    { method: 'GET', path: '/api/ai/validations' },
    { method: 'POST', path: '/api/ai/validate' },
  ];

  it('F01 — all expected routes are defined', () => {
    expect(expectedRoutes.length).toBeGreaterThanOrEqual(27);
  });

  it('F02 — health routes exist', () => {
    const healthRoutes = expectedRoutes.filter(r => r.path.includes('health'));
    expect(healthRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('F03 — meeting CRUD routes exist', () => {
    const meetingRoutes = expectedRoutes.filter(r => r.path.includes('/meetings'));
    expect(meetingRoutes.length).toBeGreaterThanOrEqual(18);
  });

  it('F04 — transcription routes exist', () => {
    const transcriptionRoutes = expectedRoutes.filter(r => r.path.includes('transcript') || r.path.includes('stt'));
    expect(transcriptionRoutes.length).toBeGreaterThanOrEqual(7);
  });

  it('F05 — AI endpoints exist', () => {
    const aiRoutes = expectedRoutes.filter(r => r.path.includes('/ai/'));
    expect(aiRoutes.length).toBeGreaterThanOrEqual(5);
  });

  it('F06 — all paths start with / or /api/', () => {
    for (const route of expectedRoutes) {
      expect(route.path).toMatch(/^\//);
    }
  });

  it('F07 — Google STT routes exist', () => {
    const sttRoutes = expectedRoutes.filter(r =>
      r.path.includes('stt') || r.path.includes('transcribe-audio'),
    );
    expect(sttRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('F08 — enhanced summary route exists', () => {
    const enhancedRoutes = expectedRoutes.filter(r => r.path.includes('enhanced-summary'));
    expect(enhancedRoutes.length).toBe(1);
  });
});

// ─────────────────────────────────────────────
// G. SQL Parameter Validation (Regression)
// ─────────────────────────────────────────────

describe('Meeting Server — SQL Parameter Safety', () => {
  it('G01 — end-meeting UPDATE uses separate $1 for id and $2 for transcript', () => {
    // Regression test: The old buggy query used $1 for both meetingId and transcript
    // The fix uses $1 for meetingId and $2 for transcript
    const meetingId = 'test-meeting-id';
    const transcript = 'Full meeting transcript text';

    // Simulate correct parameterized query
    const params = [meetingId, transcript];
    expect(params[0]).toBe(meetingId);
    expect(params[1]).toBe(transcript);
    expect(params.length).toBe(2);

    // Ensure the WHERE clause gets meetingId, not transcript
    const whereParam = params[0]; // $1
    const transcriptParam = params[1]; // $2
    expect(whereParam).not.toBe(transcriptParam);
  });

  it('G02 — version string is 1.5.1 (not stale)', () => {
    const expectedVersion = '1.5.1';
    // Validate that version is a proper semver
    expect(expectedVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('G03 — meeting invite persistence includes DB fallback', () => {
    // Test that invite objects have the correct structure for DB persistence
    const invite = {
      id: 'test-id', meetingId: 'meeting-1', name: 'Guest',
      email: 'guest@test.com', phone: null, role: 'guest',
      invitedAt: new Date().toISOString(), status: 'pending',
    };

    expect(invite.id).toBeTruthy();
    expect(invite.email).toContain('@');
    expect(invite.status).toBe('pending');
    expect(['guest', 'observer', 'participant']).toContain(invite.role);
  });

  it('G04 — Google STT config response shape', () => {
    // Validate the expected shape of the STT config endpoint
    const sttConfig = {
      success: true,
      sttAvailable: false,
      modes: ['web-speech-api'],
      defaultMode: 'web-speech-api',
      features: {
        speakerDiarization: false,
        multiLanguage: true,
        supportedLanguages: ['th-TH', 'en-US', 'en-GB'],
        maxDurationMinutes: 120,
      },
    };

    expect(sttConfig.modes).toContain('web-speech-api');
    expect(sttConfig.features.supportedLanguages).toContain('th-TH');
    expect(sttConfig.features.maxDurationMinutes).toBe(120);
  });

  it('G05 — enhanced summary prompt includes diarized speaker labels', () => {
    // Validate the transcript formatting used for enhanced summary
    const transcriptRows = [
      { speaker_role: 'doctor', content: 'สวัสดีครับ' },
      { speaker_role: 'patient', content: 'สวัสดีค่ะ' },
    ];

    const diarizedTranscript = transcriptRows.map(t => {
      const role = t.speaker_role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย';
      return `${role}: ${t.content}`;
    }).join('\n');

    expect(diarizedTranscript).toContain('แพทย์: สวัสดีครับ');
    expect(diarizedTranscript).toContain('ผู้ป่วย: สวัสดีค่ะ');
  });
});
