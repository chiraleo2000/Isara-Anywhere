#!/usr/bin/env node
/**
 * Verify cloud meeting AI pipeline: Gemini health + Google STT config on meeting server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = path.join(ROOT, '.env');

const DEV_TESTING = {
  doctor: 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
  meeting: 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app',
};

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const env = parseEnvFile(ENV_PATH);
const MEETING_URL = process.env.CLOUD_MEETING_URL || env.CLOUD_MEETING_URL || DEV_TESTING.meeting;
const DOCTOR_URL = process.env.CLOUD_DOCTOR_URL || env.CLOUD_DOCTOR_URL || DEV_TESTING.doctor;

const checks = [];

async function probe(name, url) {
  const started = Date.now();
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const body = await resp.json().catch(() => ({}));
    checks.push({ name, url, ok: resp.ok, status: resp.status, ms: Date.now() - started, body });
  } catch (err) {
    checks.push({
      name,
      url,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - started,
    });
  }
}

await probe('meeting-health', `${MEETING_URL}/health`);
await probe('meeting-stt-config', `${MEETING_URL}/api/meetings/stt/config`);
await probe('doctor-health', `${DOCTOR_URL}/api/health`);

const stt = checks.find((c) => c.name === 'meeting-stt-config')?.body;
const sttOk = Boolean(stt?.sttAvailable);
const endpointsOk = checks.every((c) => c.ok);

console.log('\n=== Cloud Meeting AI Verification ===\n');
for (const c of checks) {
  console.log(`${c.ok ? '✅' : '❌'} ${c.name} (${c.status ?? 'ERR'}) ${c.ms}ms`);
  if (c.body && c.name === 'meeting-stt-config') {
    console.log(`   sttAvailable=${stt?.sttAvailable} defaultMode=${stt?.defaultMode}`);
  }
}

const passed = endpointsOk && sttOk;
console.log(`\n${passed ? '✅ PASS' : '⚠️  NEEDS CLOUD SECRETS'} — deploy with GOOGLE_SPEECH_API_KEY + GCP_SERVICE_ACCOUNT_KEY secrets\n`);
process.exit(passed ? 0 : 1);
