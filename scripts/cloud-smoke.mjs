#!/usr/bin/env node
/**
 * Post-deploy smoke checks for dev-testing Cloud Run services.
 * Reads `.env` read-only; prefers deployed dev-testing URLs for health probes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = path.join(ROOT, '.env');

const DEV_TESTING = {
  patient: 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
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
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function resolveUrls() {
  const file = parseEnvFile(ENV_PATH);
  const e = { ...file, ...process.env };
  const useDevTesting = e.USE_DEV_TESTING_CLOUD !== '0';
  if (useDevTesting) {
    return {
      patient: e.CLOUD_PATIENT_URL || DEV_TESTING.patient,
      doctor: e.CLOUD_DOCTOR_URL || DEV_TESTING.doctor,
      meeting: e.CLOUD_MEETING_URL || DEV_TESTING.meeting,
    };
  }
  return {
    patient: e.CLOUD_PATIENT_URL || e.CLOUD_RUN_PATIENT_URL || e.PRODUCTION_API_URL || DEV_TESTING.patient,
    doctor: e.CLOUD_DOCTOR_URL || e.CLOUD_RUN_DOCTOR_URL || DEV_TESTING.doctor,
    meeting: e.CLOUD_MEETING_URL || e.MEETING_SERVER_URL || DEV_TESTING.meeting,
  };
}

async function probe(name, baseUrl, healthPath) {
  const url = `${baseUrl.replace(/\/$/, '')}${healthPath}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const text = (await res.text()).slice(0, 120);
    const ok = res.status >= 200 && res.status < 300;
    console.log(`${ok ? '✅' : '❌'} ${name}: ${res.status} ${url}`);
    if (!ok) console.log(`   ${text}`);
    return ok;
  } catch (err) {
    console.log(`❌ ${name}: ${url} — ${err.message}`);
    return false;
  }
}

const urls = resolveUrls();
console.log('Cloud smoke targets:');
console.log(`  Patient: ${urls.patient}`);
console.log(`  Doctor:  ${urls.doctor}`);
console.log(`  Meeting: ${urls.meeting}\n`);

const results = await Promise.all([
  probe('Patient Portal', urls.patient, '/api/health'),
  probe('Doctor Portal', urls.doctor, '/api/health'),
  probe('Meeting Server', urls.meeting, '/health'),
]);

if (!results.every(Boolean)) process.exit(1);
console.log('\n✅ All smoke checks passed');
