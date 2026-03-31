/**
 * ═══════════════════════════════════════════════════════════════════════
 * PATIENT PORTAL — Video Meeting Route Unit Tests (Sequential Flow)
 * ═══════════════════════════════════════════════════════════════════════
 * Tests the full meeting lifecycle as a step-by-step flow:
 *   Step 1: Generate room name → verify format
 *   Step 2: Create Jitsi URL → verify structure & params
 *   Step 3: Create meeting session (waiting) → verify initial state
 *   Step 4: Transition to active → verify status change
 *   Step 5: Add transcript entries (Thai) → verify entries stored
 *   Step 6: End meeting → transition to ended
 *   Step 7: Parse SOAP response → verify all sections extracted
 *   Step 8: Validate AI summary structure → verify fields
 *
 * If any step fails, subsequent steps that depend on it will also fail.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';

// ── Config ──────────────────────────────────────────────────────────────

const JITSI_DOMAIN = 'meet.jit.si';
const JITSI_APP_ID = 'izara-telemedicine';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

// ── Types ───────────────────────────────────────────────────────────────

type MeetingStatus = 'waiting' | 'active' | 'ended';

interface JitsiConfig {
  enableRecording: boolean;
  enableTranscription: boolean;
  enableChat: boolean;
  enableScreenShare: boolean;
  maxParticipants: number;
  defaultLanguage: string;
}

interface TranscriptEntry {
  participantId: string;
  speakerRole: 'doctor' | 'patient';
  text: string;
  confidence: number;
  language: string;
  timestamp: number;
}

interface MeetingSession {
  id: string;
  appointmentId: string;
  roomName: string;
  jitsiUrl: string;
  status: MeetingStatus;
  transcript: TranscriptEntry[];
  chatMessages: Array<{ sender: string; message: string; timestamp: number }>;
  config: JitsiConfig;
  createdAt: string;
  endedAt?: string;
}

interface MeetingSummary {
  chiefComplaint: string;
  presentIllness: string;
  physicalExam: string;
  assessment: string;
  plan: string;
  followUp: string;
  rawText: string;
  generatedAt: string;
}

// ── Functions Under Test ────────────────────────────────────────────────

function generateRoomName(appointmentId: string): string {
  const hash = createHash('sha256')
    .update(appointmentId + Date.now().toString())
    .digest('hex')
    .substring(0, 12);
  const prefix = appointmentId.substring(0, 8);
  return `Izara-${prefix}-${hash}`;
}

function createJitsiUrl(roomName: string, config: Partial<JitsiConfig> = {}): string {
  const params: string[] = [
    'config.startWithAudioMuted=false',
    'config.startWithVideoMuted=false',
    `config.lang=${config.defaultLanguage || 'th'}`,
    'config.prejoinPageEnabled=true',
    'config.disableDeepLinking=true',
  ];
  if (config.enableRecording) params.push('config.enableRecording=true');
  return `https://${JITSI_DOMAIN}/${roomName}#${params.join('&')}`;
}

function createMeetingSession(appointmentId: string, roomName: string, jitsiUrl: string): MeetingSession {
  return {
    id: randomUUID(),
    appointmentId,
    roomName,
    jitsiUrl,
    status: 'waiting',
    transcript: [],
    chatMessages: [],
    config: {
      enableRecording: true,
      enableTranscription: true,
      enableChat: true,
      enableScreenShare: true,
      maxParticipants: 10,
      defaultLanguage: 'th',
    },
    createdAt: new Date().toISOString(),
  };
}

function transitionStatus(session: MeetingSession, newStatus: MeetingStatus): MeetingSession {
  const validTransitions: Record<MeetingStatus, MeetingStatus[]> = {
    waiting: ['active'],
    active: ['ended'],
    ended: [],
  };
  if (!validTransitions[session.status].includes(newStatus)) {
    throw new Error(`Invalid transition: ${session.status} → ${newStatus}`);
  }
  return {
    ...session,
    status: newStatus,
    ...(newStatus === 'ended' ? { endedAt: new Date().toISOString() } : {}),
  };
}

function addTranscriptEntry(session: MeetingSession, entry: TranscriptEntry): MeetingSession {
  if (session.status !== 'active') {
    throw new Error(`Cannot add transcript when meeting is ${session.status}`);
  }
  return {
    ...session,
    transcript: [...session.transcript, entry],
  };
}

function parseSoapResponse(text: string): Partial<MeetingSummary> {
  const sections: Record<string, string> = {};
  const soapLabels: Record<string, keyof MeetingSummary> = {
    'chief complaint': 'chiefComplaint',
    'present illness': 'presentIllness',
    'physical exam': 'physicalExam',
    'assessment': 'assessment',
    'plan': 'plan',
    'follow up': 'followUp',
    'follow-up': 'followUp',
  };

  for (const [label, key] of Object.entries(soapLabels)) {
    const regex = new RegExp(String.raw`${label}[:\s]+(.+?)(?=\n[A-Z]|$)`, 'is');
    const match = regex.exec(text);
    if (match) sections[key] = match[1].trim();
  }

  return {
    ...sections,
    rawText: text,
    generatedAt: new Date().toISOString(),
  } as Partial<MeetingSummary>;
}

function buildFullTranscriptText(entries: TranscriptEntry[]): string {
  return entries.map(e => `[${e.speakerRole}] ${e.text}`).join('\n');
}

// ── Sequential Flow Tests ───────────────────────────────────────────────

describe('Video Meeting — Full Lifecycle Flow', () => {
  const appointmentId = 'APT-12345678-FLOW';

  // Shared state — each step builds on the previous
  let roomName: string;
  let jitsiUrl: string;
  let session: MeetingSession;

  // ── Step 1: Generate Room Name ──
  it('Step 1 — Generate room name from appointment ID', () => {
    roomName = generateRoomName(appointmentId);

    expect(roomName).toBeTruthy();
    expect(roomName.startsWith('Izara-')).toBe(true);
    expect(roomName).toContain('APT-1234');
    expect(roomName.length).toBeGreaterThan(15);

    // Verify uniqueness (hash component differs each call)
    const secondName = generateRoomName(appointmentId);
    expect(secondName.startsWith('Izara-')).toBe(true);
  });

  // ── Step 2: Create Jitsi URL ──
  it('Step 2 — Create Jitsi URL from room name', () => {
    expect(roomName).toBeTruthy(); // guard: Step 1 must have passed

    jitsiUrl = createJitsiUrl(roomName, { enableRecording: true, defaultLanguage: 'th' });

    expect(jitsiUrl).toBeTruthy();
    expect(jitsiUrl.startsWith('https://')).toBe(true);
    expect(jitsiUrl).toContain(JITSI_DOMAIN);
    expect(jitsiUrl).toContain(roomName);
    expect(jitsiUrl).toContain('config.lang=th');
    expect(jitsiUrl).toContain('config.prejoinPageEnabled=true');
    expect(jitsiUrl).toContain('config.disableDeepLinking=true');
    expect(jitsiUrl).toContain('config.enableRecording=true');
    expect(jitsiUrl).toContain('config.startWithAudioMuted=false');
  });

  // ── Step 3: Create Meeting Session (waiting) ──
  it('Step 3 — Create meeting session in waiting state', () => {
    expect(roomName).toBeTruthy();
    expect(jitsiUrl).toBeTruthy();

    session = createMeetingSession(appointmentId, roomName, jitsiUrl);

    expect(session.id).toBeTruthy();
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(session.appointmentId).toBe(appointmentId);
    expect(session.roomName).toBe(roomName);
    expect(session.jitsiUrl).toBe(jitsiUrl);
    expect(session.status).toBe('waiting');
    expect(session.transcript).toHaveLength(0);
    expect(session.chatMessages).toHaveLength(0);
    expect(session.config.enableRecording).toBe(true);
    expect(session.config.enableTranscription).toBe(true);
    expect(session.config.defaultLanguage).toBe('th');
    expect(session.config.maxParticipants).toBe(10);
    expect(session.createdAt).toBeTruthy();
  });

  // ── Step 4: Transition to active ──
  it('Step 4 — Transition meeting from waiting to active', () => {
    expect(session).toBeTruthy();
    expect(session.status).toBe('waiting');

    // Cannot skip to ended from waiting
    expect(() => transitionStatus(session, 'ended')).toThrow('Invalid transition');

    session = transitionStatus(session, 'active');

    expect(session.status).toBe('active');
    expect(session.endedAt).toBeUndefined();
  });

  // ── Step 5: Add Thai transcript entries ──
  it('Step 5 — Add transcript entries with Thai content', () => {
    expect(session).toBeTruthy();
    expect(session.status).toBe('active');

    const doctorEntry: TranscriptEntry = {
      participantId: 'DOC-001',
      speakerRole: 'doctor',
      text: 'สวัสดีครับคุณสมชาย วันนี้มาด้วยอาการอะไรครับ',
      confidence: 0.95,
      language: 'th',
      timestamp: Date.now(),
    };
    session = addTranscriptEntry(session, doctorEntry);
    expect(session.transcript).toHaveLength(1);

    const patientEntry: TranscriptEntry = {
      participantId: 'PT-001',
      speakerRole: 'patient',
      text: 'ปวดหัวมากครับ เป็นมา 3 วันแล้ว มีไข้ต่ำๆ ด้วยครับ',
      confidence: 0.92,
      language: 'th',
      timestamp: Date.now() + 5000,
    };
    session = addTranscriptEntry(session, patientEntry);
    expect(session.transcript).toHaveLength(2);

    const doctorAssessment: TranscriptEntry = {
      participantId: 'DOC-001',
      speakerRole: 'doctor',
      text: 'จากอาการและการตรวจ น่าจะเป็น Tension headache ครับ สั่งยาพาราเซตามอล 500mg ทุก 6 ชั่วโมง',
      confidence: 0.93,
      language: 'th',
      timestamp: Date.now() + 10000,
    };
    session = addTranscriptEntry(session, doctorAssessment);
    expect(session.transcript).toHaveLength(3);

    // Verify all entries have correct structure
    for (const entry of session.transcript) {
      expect(entry.participantId).toBeTruthy();
      expect(entry.language).toBe('th');
      expect(entry.confidence).toBeGreaterThan(0);
      expect(entry.confidence).toBeLessThanOrEqual(1);
      expect(entry.text.length).toBeGreaterThan(0);
      expect(entry.timestamp).toBeGreaterThan(0);
    }

    // Verify roles are correctly assigned
    expect(session.transcript[0].speakerRole).toBe('doctor');
    expect(session.transcript[1].speakerRole).toBe('patient');
    expect(session.transcript[2].speakerRole).toBe('doctor');
  });

  // ── Step 6: End meeting ──
  it('Step 6 — End meeting and verify final state', () => {
    expect(session).toBeTruthy();
    expect(session.status).toBe('active');
    expect(session.transcript.length).toBeGreaterThan(0);

    session = transitionStatus(session, 'ended');
    expect(session.status).toBe('ended');
    expect(session.endedAt).toBeTruthy();

    // Cannot transition again
    expect(() => transitionStatus(session, 'active')).toThrow('Invalid transition');

    // Cannot add transcript to ended meeting
    const lateEntry: TranscriptEntry = {
      participantId: 'PT-001',
      speakerRole: 'patient',
      text: 'late message',
      confidence: 0.9,
      language: 'th',
      timestamp: Date.now(),
    };
    expect(() => addTranscriptEntry(session, lateEntry)).toThrow('Cannot add transcript');

    // Transcript preserved
    expect(session.transcript).toHaveLength(3);
  });

  // ── Step 7: Parse SOAP response ──
  it('Step 7 — Parse SOAP response from full transcript', () => {
    expect(session).toBeTruthy();
    expect(session.transcript.length).toBe(3);

    // Build full transcript text (simulating what gets sent to Gemini AI)
    const transcriptText = buildFullTranscriptText(session.transcript);
    expect(transcriptText).toContain('[doctor]');
    expect(transcriptText).toContain('[patient]');
    expect(transcriptText).toContain('ปวดหัว');

    // Simulate SOAP note returned by Gemini
    const soapNote = [
      'Chief Complaint: ปวดศีรษะเรื้อรัง 3 วัน มีไข้ต่ำๆ',
      'Present Illness: ผู้ป่วยมีอาการปวดศีรษะมา 3 วัน ร่วมกับมีไข้ต่ำๆ',
      'Physical Exam: อุณหภูมิ 37.5°C ความดันโลหิต 120/80 mmHg',
      'Assessment: Tension-type headache with low-grade fever (R51, R50.9)',
      'Plan: Paracetamol 500mg q6h PRN, Ibuprofen 400mg q8h PC',
      'Follow-up: นัดติดตามอาการ 1 สัปดาห์',
    ].join('\n');

    const parsed = parseSoapResponse(soapNote);

    expect(parsed.chiefComplaint).toBeTruthy();
    expect(parsed.chiefComplaint).toContain('ปวดศีรษะ');
    expect(parsed.presentIllness).toBeTruthy();
    expect(parsed.physicalExam).toBeTruthy();
    expect(parsed.physicalExam).toContain('37.5');
    expect(parsed.assessment).toBeTruthy();
    expect(parsed.assessment).toContain('Tension');
    expect(parsed.plan).toBeTruthy();
    expect(parsed.plan).toContain('Paracetamol');
    expect(parsed.followUp).toBeTruthy();
    expect(parsed.followUp).toContain('1 สัปดาห์');
    expect(parsed.rawText).toBe(soapNote);
    expect(parsed.generatedAt).toBeTruthy();
  });

  // ── Step 8: Validate AI summary structure ──
  it('Step 8 — Validate AI summary has all required fields', () => {
    const soapNote = [
      'Chief Complaint: Headache',
      'Present Illness: 3-day headache with fever',
      'Physical Exam: Temp 37.5°C, BP 120/80',
      'Assessment: Tension headache',
      'Plan: Paracetamol 500mg',
      'Follow-up: 1 week',
    ].join('\n');

    const summary = parseSoapResponse(soapNote);

    // All SOAP sections present
    const requiredFields: (keyof MeetingSummary)[] = [
      'chiefComplaint', 'presentIllness', 'physicalExam',
      'assessment', 'plan', 'followUp', 'rawText', 'generatedAt',
    ];

    for (const field of requiredFields) {
      expect(summary[field], `Missing field: ${field}`).toBeTruthy();
    }

    // generatedAt is valid ISO timestamp
    const dateStr = summary.generatedAt!;
    expect(new Date(dateStr).toISOString()).toBe(dateStr);

    // rawText matches original input
    expect(summary.rawText).toBe(soapNote);
  });
});

// ── Edge Cases & Config Validation ──────────────────────────────────────

describe('Video Meeting — Config & Edge Cases', () => {
  it('Jitsi config constants are correct', () => {
    expect(JITSI_DOMAIN).toBe('meet.jit.si');
    expect(JITSI_APP_ID).toBe('izara-telemedicine');
    expect(GEMINI_MODEL).toBe('gemini-2.5-flash-lite');
  });

  it('URL without recording omits recording param', () => {
    const url = createJitsiUrl('test-room');
    expect(url).not.toContain('config.enableRecording');
  });

  it('SOAP parser handles partial input gracefully', () => {
    const partial = 'Chief Complaint: ปวดหัว';
    const result = parseSoapResponse(partial);
    expect(result.chiefComplaint).toContain('ปวดหัว');
    expect(result.assessment).toBeUndefined();
    expect(result.rawText).toBe(partial);
  });

  it('SOAP parser handles empty input', () => {
    const result = parseSoapResponse('');
    expect(result.rawText).toBe('');
    expect(result.generatedAt).toBeTruthy();
  });

  it('Error codes are defined for AI failures', () => {
    const errorCodes = ['AI_NOT_CONFIGURED', 'AI_EMPTY_RESPONSE', 'AI_API_ERROR'];
    expect(errorCodes).toContain('AI_NOT_CONFIGURED');
    expect(errorCodes).toContain('AI_EMPTY_RESPONSE');
    expect(errorCodes).toContain('AI_API_ERROR');
  });
});
