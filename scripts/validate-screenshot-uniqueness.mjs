#!/usr/bin/env node
/**
 * Validate E2E screenshots are distinct per workflow stage.
 * Usage:
 *   npm run test:screenshots:group-q
 *   npm run test:screenshots:all
 *   node scripts/validate-screenshot-uniqueness.mjs --group group-A,group-D,group-Q
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const GROUP_MANIFESTS = {
  'group-Q': {
    minUnique: 5,
    required: [
      'Q01b-doctor-host-jitsi.png',
      'Q01c-patient-lobby-waiting.png',
      'Q01d-guest-lobby-waiting.png',
      'Q01e-doctor-admitted.png',
      'Q01f-three-party-held.png',
      'Q02c-dashboard-recording.png',
    ],
    lobbyOnly: ['Q01c-patient-lobby-waiting.png', 'Q01d-guest-lobby-waiting.png'],
    jitsiStages: ['Q01b-doctor-host-jitsi.png', 'Q01f-three-party-held.png'],
    // Sparse recording-tile dashboards compress small; still above blank-page noise.
    recordingStages: ['Q02c-dashboard-recording.png'],
  },
  'group-Q2': {
    minUnique: 3,
    required: [
      'Q2-01-results-route.png',
      'Q2-03-transcript-tab.png',
      'Q2-04-summary-tab.png',
      'Q2-05-dashboard-summary.png',
    ],
  },
  'group-A': {
    minUnique: 3,
    required: [
      'A01-patient-dashboard.png',
      'A01-doctor-dashboard.png',
      'A09-doctor-stats.png',
      'A09-doctor-kpi.png',
    ],
  },
  'group-D': {
    minUnique: 3,
    required: [
      'D03-booking-wizard.png',
      'D07-submitted.png',
      'D09-health-meeting.png',
    ],
  },
  'group-B': {
    minUnique: 3,
    required: [
      'B01-dashboard.png',
      'B05-phr.png',
      'B06-timeline.png',
    ],
  },
  'group-E': {
    minUnique: 2,
    required: [
      'E04-patients-list.png',
      'E08-health-meeting.png',
    ],
  },
  'group-S': {
    minUnique: 2,
    required: [
      'S01-patient-dashboard.png',
      'S05-patient-appointments.png',
    ],
  },
  'group-C': {
    minUnique: 3,
    required: [
      'C01-dashboard.png',
      'C03-patients.png',
      'C04-health-meeting.png',
    ],
  },
  'group-F': {
    minUnique: 2,
    required: [
      'F01-phr-page.png',
      'F09-lab-results-tab.png',
    ],
  },
  'group-G': {
    minUnique: 2,
    required: [
      'G01-pdpa-page.png',
      'G04-living-will.png',
    ],
  },
  'group-H': {
    minUnique: 2,
    required: [
      'H01-medical-content.png',
      'H06-clinical-resources.png',
    ],
  },
  'group-I': {
    minUnique: 2,
    required: [
      'I01-admin-dashboard.png',
      'I02-manage-doctors.png',
    ],
  },
  'group-J': {
    minUnique: 2,
    required: [
      'J01-ai-doctor.png',
      'J05-timeline.png',
    ],
  },
  'group-J-jitsi-prejoin': {
    minUnique: 2,
    required: [
      'JPRE01d-patient-prejoin-autoname.png',
      'JPRE01e-patient-in-jitsi-canvas.png',
    ],
    lobbyOnly: ['JPRE01d-patient-prejoin-autoname.png'],
    jitsiStages: ['JPRE01e-patient-in-jitsi-canvas.png'],
  },
  'group-R': {
    minUnique: 2,
    required: [
      'Q01b-doctor-host-jitsi.png',
      'Q01c-patient-lobby-waiting.png',
    ],
    altDir: 'group-Q',
  },
  'group-L': {
    minUnique: 2,
    required: [
      'F09-lab-results-tab.png',
      'F10-patients.png',
    ],
    altDir: 'group-F',
  },
  'group-defect': {
    minUnique: 3,
    required: [
      'DM1-doctor-lobby-panel.png',
      'DM3-doctor-jitsi-with-patient.png',
      'DM5-patient-in-jitsi-3party.png',
    ],
    lobbyOnly: ['DM1-doctor-lobby-panel.png'],
    jitsiStages: ['DM3-doctor-jitsi-with-patient.png', 'DM5-patient-in-jitsi-3party.png'],
  },
  'group-W': {
    minUnique: 3,
    required: [
      'W01-patient-login.png',
      'W02-doctor-login.png',
      'W04-doctor-meeting-room.png',
    ],
  },
  'group-U': {
    minUnique: 4,
    required: [
      'U-A-doctor-login-controls.png',
      'U-C-health-meeting-queue.png',
      'U-PHR-phr-tab-overview.png',
      'U-PHR-phr-tab-prescriptions.png',
    ],
  },
};

const MIN_BYTES = Number.parseInt(process.env.SCREENSHOT_MIN_BYTES || '15000', 10);
// Dark Jitsi Meet tiles (meet.jit.si) compress to small PNGs; 8KB falsely flagged blank canvases.
const JITSI_MIN_BYTES = Number.parseInt(process.env.SCREENSHOT_JITSI_MIN_BYTES || '7000', 10);
const MAX_SIMILARITY = Number.parseFloat(process.env.SCREENSHOT_MAX_SIMILARITY || '0.92');

function parseGroups() {
  const idx = process.argv.indexOf('--group');
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1].split(',').map((g) => g.trim()).filter(Boolean);
  }
  return ['group-Q'];
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function averageHash(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 100) return buf.toString('hex').slice(0, 64);
  const sample = [];
  const step = Math.max(1, Math.floor(buf.length / 64));
  for (let i = 0; i < 64; i++) sample.push(buf[i * step] ?? 0);
  const avg = sample.reduce((a, b) => a + b, 0) / sample.length;
  return sample.map((v) => (v >= avg ? '1' : '0')).join('');
}

function hammingSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 1;
  let same = 0;
  for (let i = 0; i < len; i++) if (a[i] === b[i]) same++;
  return same / len;
}

function resolveDir(groupName, manifest) {
  if (process.env.SCREENSHOT_DIR && parseGroups().length === 1) {
    return process.env.SCREENSHOT_DIR;
  }
  const candidates = [];
  if (manifest?.altDir) {
    candidates.push(path.join(root, 'docs', 'screenshots', manifest.altDir));
  }
  candidates.push(path.join(root, 'docs', 'screenshots', groupName));
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(root, 'tests', 'output', 'screenshots', 'chromium', groupName);
}

function collectRequiredFiles(dir, required, errors, files, manifest) {
  for (const name of required) {
    const filePath = path.join(dir, name);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing required file: ${name}`);
      continue;
    }
    const stat = fs.statSync(filePath);
    const hash = sha256(filePath);
    files[name] = { bytes: stat.size, sha256: hash };
    const minForFile = manifest?.jitsiStages?.includes(name)
      ? JITSI_MIN_BYTES
      : manifest?.recordingStages?.includes(name)
        ? Number.parseInt(process.env.SCREENSHOT_RECORDING_MIN_BYTES || '10000', 10)
        : manifest?.minBytes ?? MIN_BYTES;
    if (stat.size < minForFile) {
      errors.push(`${name}: too small (${stat.size} < ${minForFile}) — blank/error page`);
    }
  }
}

function collectHashErrors(files, minUnique) {
  const errors = [];
  const hashes = new Map();
  for (const [name, meta] of Object.entries(files)) {
    const bucket = hashes.get(meta.sha256) ?? [];
    bucket.push(name);
    hashes.set(meta.sha256, bucket);
  }
  if (hashes.size >= minUnique) return errors;
  for (const names of hashes.values()) {
    if (names.length > 1) errors.push(`Duplicate SHA256: ${names.join(', ')}`);
  }
  errors.push(`Only ${hashes.size} unique images; need >= ${minUnique}`);
  return errors;
}

function collectSimilarityErrors(dir, files, manifest) {
  const errors = [];
  if (!manifest.lobbyOnly || !manifest.jitsiStages) return errors;
  for (const lobby of manifest.lobbyOnly) {
    for (const jitsi of manifest.jitsiStages) {
      if (!files[lobby] || !files[jitsi]) continue;
      const sim = hammingSimilarity(
        averageHash(path.join(dir, lobby)),
        averageHash(path.join(dir, jitsi)),
      );
      if (sim >= MAX_SIMILARITY) {
        errors.push(`${lobby} too similar to ${jitsi} (${sim.toFixed(3)})`);
      }
    }
  }
  return errors;
}

function validateGroup(groupName) {
  const manifest = GROUP_MANIFESTS[groupName];
  if (!manifest) {
    return { groupName, errors: [`Unknown group ${groupName}`], files: {}, pass: false };
  }

  const dir = resolveDir(groupName, manifest);
  const errors = [];
  const files = {};

  if (!fs.existsSync(dir)) {
    return { groupName, errors: [`Missing directory ${dir}`], files, pass: false };
  }

  collectRequiredFiles(dir, manifest.required, errors, files, manifest);
  errors.push(
    ...collectHashErrors(files, manifest.minUnique),
    ...collectSimilarityErrors(dir, files, manifest),
  );

  const a09stats = files['A09-doctor-stats.png']?.sha256;
  const a09kpi = files['A09-doctor-kpi.png']?.sha256;
  if (a09stats && a09kpi && a09stats === a09kpi) {
    errors.push('A09-doctor-stats identical to A09-doctor-kpi — KPI crop not distinct');
  }

  return { groupName, directory: path.relative(root, dir), errors, files, pass: errors.length === 0 };
}

const groups = parseGroups();
const results = groups.map(validateGroup);
const report = {
  checkedAt: new Date().toISOString(),
  minBytes: MIN_BYTES,
  groups: results,
  pass: results.every((r) => r.pass),
};

const outPath = path.join(root, 'reports', 'screenshot-audit-latest.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.groupName} (${r.directory || '—'}) — ${r.errors.length} issue(s)`);
  for (const e of r.errors) console.error(`  - ${e}`);
}

process.exit(report.pass ? 0 : 1);
