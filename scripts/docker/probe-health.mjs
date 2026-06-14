#!/usr/bin/env node
/** Probe /api/health for each base URL; exit 0 when all OK (with startup retries). */
let urls = process.argv.slice(2);
if (!urls.length) {
  urls = [
    process.env.HEALTH_DOCTOR_URL || 'http://127.0.0.1:3010',
    process.env.HEALTH_PATIENT_URL || 'http://127.0.0.1:3005',
    process.env.HEALTH_MEETING_URL || 'http://127.0.0.1:3020',
  ];
  console.error('[probe-health] No URLs passed — using defaults:', urls.join(', '));
}

const maxAttempts = Number(process.env.HEALTH_PROBE_RETRIES || 30);
const delayMs = Number(process.env.HEALTH_PROBE_DELAY_MS || 3000);

async function probeOnce(base) {
  const url = `${base.replace(/\/$/, '')}/api/health`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      console.error(`[probe-health] OK ${base}`);
      return true;
    }
    console.error(`[probe-health] ${base} → HTTP ${res.status}`);
  } catch (err) {
    console.error(`[probe-health] ${base} → ${err.message}`);
  }
  return false;
}

async function probeWithRetry(base) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (await probeOnce(base)) return true;
    if (attempt < maxAttempts) {
      console.error(`[probe-health] retry ${attempt}/${maxAttempts} for ${base} in ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

const results = await Promise.all(urls.map((u) => probeWithRetry(u)));
process.exitCode = results.every(Boolean) ? 0 : 1;
