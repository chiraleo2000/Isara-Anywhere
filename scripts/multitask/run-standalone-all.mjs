#!/usr/bin/env node
/**
 * Run test:standalone for patient, doctor, meeting (parallel when ports free).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const matrix = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'scripts/multitask/port-matrix.json'), 'utf8'),
);

const STREAMS = [
  { name: 'patient', dir: 'Isara-patient-portal', port: matrix.streams.patient.appPort },
  { name: 'doctor', dir: 'Isara-doctor-portal', port: matrix.streams.doctor.appPort },
  { name: 'meeting', dir: 'Izara-jitsi-server', port: matrix.streams.meeting.appPort },
];

function runStream(stream) {
  return new Promise((resolve) => {
    console.log(`\n=== test:standalone ${stream.name} (:${stream.port}) ===\n`);
    const child = spawn('npm', ['run', 'test:standalone'], {
      cwd: path.join(repoRoot, stream.dir),
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        STANDALONE_MODE: '1',
        PATIENT_URL: matrix.streams.patient.appUrl,
        DOCTOR_URL: matrix.streams.doctor.appUrl,
        MEETING_URL: matrix.streams.meeting.appUrl,
      },
    });
    child.on('close', (code) => resolve({ name: stream.name, code: code ?? 1 }));
  });
}

const parallel = !process.argv.includes('--serial');
let results;

if (parallel) {
  results = await Promise.all(STREAMS.map(runStream));
} else {
  results = [];
  for (const s of STREAMS) results.push(await runStream(s));
}

const failed = results.filter((r) => r.code !== 0);
if (failed.length) {
  console.error('\n❌ test:standalone:all failed:', failed.map((f) => f.name).join(', '));
  process.exit(1);
}
console.log('\n✅ test:standalone:all passed');
