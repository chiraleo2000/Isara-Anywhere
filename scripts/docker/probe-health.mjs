#!/usr/bin/env node
/** Probe /api/health for each base URL; exit 0 when all OK. */
let urls = process.argv.slice(2);
if (!urls.length) {
  urls = [
    process.env.HEALTH_DOCTOR_URL || 'http://127.0.0.1:3010',
    process.env.HEALTH_PATIENT_URL || 'http://127.0.0.1:3005',
    process.env.HEALTH_MEETING_URL || 'http://127.0.0.1:3020',
  ];
  console.error('[probe-health] No URLs passed — using defaults:', urls.join(', '));
}
const results = await Promise.all(
  urls.map((u) => fetch(`${u.replace(/\/$/, '')}/api/health`).then((r) => r.ok).catch(() => false)),
);
process.exitCode = results.every(Boolean) ? 0 : 1;
