#!/usr/bin/env node
/**
 * Cycle 2 — Live Cloud Run log scan + simulated post-meeting pipeline stress.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const meeting =
  process.env.MEETING_SERVER_URL ||
  'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app';
const project = process.env.GCP_PROJECT_ID || 'izara-telemedicine';
const services = [
  'izara-meeting-server-dev-testing',
  'izara-doctor-portal-dev-testing',
  'izara-patient-portal-dev-testing',
];

const LOG_PATTERNS = [
  { id: 'UPR', re: /unhandledRejection|UnhandledPromiseRejection/i },
  { id: 'DB_RETRY', re: /ECONNRESET|connection.*retry|pool.*retry/i },
  { id: 'WEBRTC', re: /WebRTC|packet loss|ICE failed/i },
  { id: 'GEMINI503', re: /503 Service Unavailable|high demand/i },
  { id: 'JIBRI', re: /Jibri|jibri_file_not_stable|partial.*recording/i },
  { id: 'MEM', re: /ENOMEM|EMFILE|heap out of memory/i },
];

function gcloudLogs(service, freshness = '2h') {
  return new Promise((resolve) => {
    const filter = [
      `resource.type=cloud_run_revision`,
      `resource.labels.service_name=${service}`,
      `(severity>=WARNING OR textPayload:PostMeeting OR textPayload:unhandled OR textPayload:Pipeline OR textPayload:Jibri)`,
    ].join(' AND ');
    const child = spawn(
      'gcloud',
      [
        'logging', 'read', filter,
        `--project=${project}`,
        '--limit=120',
        '--format=json',
        `--freshness=${freshness}`,
      ],
      { shell: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', () => {
      try {
        resolve(JSON.parse(out || '[]'));
      } catch {
        resolve([]);
      }
    });
  });
}

async function simulatePipeline() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'cycle2-live-diagnostic';
  const { createPostMeetingPipeline } = await import('../Izara-jitsi-server/server/postMeetingPipeline.js');
  const updates = [];
  const pipeline = createPostMeetingPipeline({
    safeQuery: async (sql) => {
      if (sql.includes('SELECT mr.*')) {
        return {
          rows: [{
            id: 'cycle2-live',
            appointment_id: 'APT-CYCLE2',
            doctor_id: 'DOC-CYCLE2',
            recording_mimetype: 'audio/webm',
            recording_data: null,
            transcript: '[แพทย์] ทดสอบ cycle2 live diagnostic\n'.repeat(40),
            meeting_config: {},
          }],
        };
      }
      if (sql.includes('meeting_transcripts')) return { rows: [] };
      if (sql.includes('UPDATE meeting_records')) {
        updates.push(sql);
        return { rows: [] };
      }
      if (sql.includes('meeting_config')) return { rows: [] };
      return { rows: [] };
    },
    genAI: {
      getGenerativeModel: () => ({
        generateContent: async () => {
          throw new Error('Gemini API 503: overloaded');
        },
      }),
    },
    geminiModel: 'gemini-3.1-flash-lite',
    recordingsDir: path.join(root, 'reports', 'cycle2-tmp'),
    io: { to: () => ({ emit: () => {} }) },
    hasSttCredentials: () => false,
    createSpeechClient: async () => null,
    generateStructuredSOAP: async () => null,
    generateEmrNarrativeSummary: async () => null,
  });
  const buf = Buffer.alloc(2048);
  buf.writeUInt32BE(0x1a45dfa3, 0);
  const result = await pipeline.runPostMeetingPipeline('APT-CYCLE2', {
    meeting: { id: 'cycle2-live', appointment_id: 'APT-CYCLE2', doctor_id: 'DOC-CYCLE2', recording_mimetype: 'audio/webm' },
    recordingBuffer: buf,
    fullTranscript: '[แพทย์] live cycle2 transcript for degraded summary path.',
    mimeType: 'audio/webm',
  });
  return { result, updates: updates.length };
}

async function fetchStability() {
  const res = await fetch(`${meeting}/api/health/stability`, { signal: AbortSignal.timeout(15_000) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function main() {
  console.log('\n========== CYCLE 2 LIVE DIAGNOSTIC ==========\n');
  const findings = [];

  const sim = await simulatePipeline();
  console.log('Simulated pipeline:', sim.result.stage, sim.result.degraded ? '(degraded summary)' : '');
  if (sim.result.stage !== 'completed' || !sim.result.summaryAvailable) {
    findings.push({ severity: 'high', area: 'pipeline', msg: `simulation stage=${sim.result.stage}` });
  }

  const stability = await fetchStability();
  console.log('Stability:', stability.status, JSON.stringify(stability.body).slice(0, 200));

  for (const svc of services) {
    const entries = await gcloudLogs(svc);
    console.log(`\n--- ${svc} (${entries.length} log entries) ---`);
    const hits = {};
    for (const ent of entries) {
      const text =
        ent.textPayload ||
        ent.jsonPayload?.message ||
        JSON.stringify(ent.jsonPayload || ent.httpRequest || '');
      for (const p of LOG_PATTERNS) {
        if (p.re.test(text)) {
          hits[p.id] = (hits[p.id] || 0) + 1;
        }
      }
    }
    for (const [k, v] of Object.entries(hits)) {
      console.log(`  ${k}: ${v}`);
      if (k === 'UPR' || k === 'MEM') {
        findings.push({ severity: 'high', area: svc, msg: `${k} count=${v}` });
      }
      if (k === 'GEMINI503' && v > 0) {
        findings.push({ severity: 'fixed', area: svc, msg: `GEMINI503 observed (${v}) — degraded fallback should apply after deploy` });
      }
    }
  }

  const reportDir = path.join(root, 'reports', 'cycle2-live');
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `cycle2-${Date.now()}.json`);
  const pass = findings.filter((f) => f.severity === 'high').length === 0;
  fs.writeFileSync(outPath, JSON.stringify({ pass, findings, sim: sim.result, stability }, null, 2));
  console.log(`\nReport: ${outPath}`);
  console.log(pass ? '\n✅ CYCLE 2 — NO BLOCKING RUNTIME FINDINGS\n' : '\n⚠️ CYCLE 2 — REVIEW FINDINGS\n');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
