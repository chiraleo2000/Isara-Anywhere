#!/usr/bin/env node
/**
 * Build immutable cloud E2E error ledger from Playwright JSON report + test-results artifacts.
 * Usage: node scripts/aggregate-cloud-error-ledger.mjs --round 1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  let round = 1;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--round' && args[i + 1]) {
      const next = args[++i];
      round = /^\d+$/.test(next) ? Number.parseInt(next, 10) : next;
    }
  }
  return { round };
}

const CATEGORY_MAP = [
  { re: /auth|login|sso|jwt|token/i, cat: 'auth' },
  { re: /appointment|pool|queue|book|assign/i, cat: 'appointment' },
  { re: /lobby|admit|guest|host-ready|waiting/i, cat: 'lobby' },
  { re: /jitsi|webrtc|media|iframe|video/i, cat: 'webrtc' },
  { re: /recording|webm|save-recording|player/i, cat: 'recording' },
  { re: /gemini|summary|transcript|generate-summary/i, cat: 'gemini' },
  { re: /phr|emr|lab|clinical|prescri/i, cat: 'phr' },
];

function categorize(message, project) {
  const text = `${message} ${project}`;
  for (const { re, cat } of CATEGORY_MAP) {
    if (re.test(text)) return cat;
  }
  return 'infra';
}

function inferService(project, file) {
  const s = `${project} ${file}`;
  if (/meeting|group-Q|group-E/i.test(s)) return 'meeting';
  if (/patient|group-B/i.test(s)) return 'patient';
  if (/doctor|group-C|group-D/i.test(s)) return 'doctor';
  return 'unknown';
}

function findScreenshots(testTitle) {
  const out = [];
  const resultsDir = path.join(root, 'test-results');
  if (!fs.existsSync(resultsDir)) return out;
  const safe = testTitle.replace(/[^\w-]+/g, '-').slice(0, 80);
  for (const ent of fs.readdirSync(resultsDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name.includes(safe.slice(0, 40)) || ent.name.length > 10) {
      const dir = path.join(resultsDir, ent.name);
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.png')) out.push(path.relative(root, path.join(dir, f)));
      }
    }
  }
  return out.slice(0, 5);
}

function loadPlaywrightReport() {
  const jsonPath = path.join(root, 'test-results', 'full-coverage-results.json');
  if (!fs.existsSync(jsonPath)) {
    return { suites: [], stats: { expected: 0, unexpected: 0, skipped: 0 } };
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function buildFailureEntry({ res, err, title, projectName, file }) {
  return {
    group: file ? path.basename(file).replace(/\.ui-test\.ts$/, '') : 'unknown',
    testId: title,
    project: projectName,
    service: inferService(projectName, file),
    category: categorize(err.message || title, projectName),
    status: res.status,
    message: err.message || res.status,
    stack: err.stack || '',
    screenshotPath: findScreenshots(title),
    durationMs: res.duration,
  };
}

function collectSpecFailures(spec, suiteTitle, project, file) {
  const title = [...(suiteTitle ? [suiteTitle] : []), spec.title].filter(Boolean).join(' > ');
  const failures = [];
  for (const r of spec.tests || []) {
    const projectName = r.projectName || project;
    for (const res of r.results || []) {
      if (res.status === 'passed' || res.status === 'skipped') continue;
      failures.push(buildFailureEntry({ res, err: res.error || {}, title, projectName, file }));
    }
  }
  return failures;
}

function flattenSuites(suites, project = '', parentFile = '') {
  const tests = [];
  for (const suite of suites || []) {
    const file = suite.file || parentFile;
    for (const spec of suite.specs || []) {
      tests.push(...collectSpecFailures(spec, suite.title, project, file));
    }
    if (suite.suites) tests.push(...flattenSuites(suite.suites, project, file));
  }
  return tests;
}

function priorityFor(cat) {
  if (['auth', 'appointment', 'lobby', 'webrtc', 'recording', 'gemini'].includes(cat)) return 'P0';
  if (['phr'].includes(cat)) return 'P1';
  return 'P2';
}

function writeLedger(round, failures, stats) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const isLocal = process.env.TEST_ENV === 'local' || (!process.env.TEST_ENV && !process.env.CLOUD_PATIENT_URL);
  const ledgerSubdir = isLocal ? 'local-error-ledger' : 'cloud-error-ledger';
  const dir = path.join(root, 'reports', ledgerSubdir);
  fs.mkdirSync(dir, { recursive: true });

  const payload = {
    round,
    timestamp: new Date().toISOString(),
    immutable: true,
    environment: {
      testEnv: isLocal ? 'local' : (process.env.TEST_ENV || 'cloud'),
      patientUrl: isLocal
        ? (process.env.PATIENT_URL || 'http://localhost:3005')
        : (process.env.CLOUD_PATIENT_URL || ''),
      doctorUrl: isLocal
        ? (process.env.DOCTOR_URL || 'http://localhost:3010')
        : (process.env.CLOUD_DOCTOR_URL || ''),
      meetingUrl: isLocal
        ? (process.env.MEETING_URL || 'http://localhost:3020')
        : (process.env.CLOUD_MEETING_URL || ''),
    },
    stats: {
      expected: stats.expected ?? 0,
      unexpected: stats.unexpected ?? failures.length,
      skipped: stats.skipped ?? 0,
      durationMs: stats.duration ?? 0,
    },
    failures: failures.map((f) => ({ ...f, priority: priorityFor(f.category) })),
    p0Count: failures.filter((f) => priorityFor(f.category) === 'P0').length,
    p1Count: failures.filter((f) => priorityFor(f.category) === 'P1').length,
  };

  const jsonOut = path.join(dir, `round-${round}-${ts}.json`);
  fs.writeFileSync(jsonOut, JSON.stringify(payload, null, 2));

  const mdLines = [
    `# ${isLocal ? 'Local' : 'Cloud'} E2E Error Ledger - Round ${round}`,
    '',
    `**Generated:** ${payload.timestamp} (immutable)`,
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Expected pass | ${payload.stats.expected} |`,
    `| Failures | ${payload.stats.unexpected} |`,
    `| P0 | ${payload.p0Count} |`,
    `| P1 | ${payload.p1Count} |`,
    '',
    '## Rule',
    '',
    'Do not apply application fixes until this ledger file exists for the round.',
    '',
  ];

  if (failures.length === 0) {
    mdLines.push('## Status', '', 'No failures recorded.', '');
  } else {
    mdLines.push('## Failures', '');
    for (const f of payload.failures) {
      mdLines.push(
        `### [${f.priority}] ${f.testId}`,
        '',
        `- **Project:** ${f.project}`,
        `- **Category:** ${f.category}`,
        `- **Service:** ${f.service}`,
        `- **Message:** ${f.message?.split('\n')[0] || '—'}`,
        f.screenshotPath?.length ? `- **Screenshots:** ${f.screenshotPath.join(', ')}` : '',
        '',
      );
    }
  }

  const mdRoot = path.join(root, `CLOUD_E2E_ERROR_LEDGER_ROUND${round}.md`);
  fs.writeFileSync(mdRoot, mdLines.join('\n'));
  fs.copyFileSync(jsonOut, path.join(dir, `round-${round}-latest.json`));

  console.log(`Ledger JSON: ${jsonOut}`);
  console.log(`Ledger MD:   ${mdRoot}`);
  console.log(`Failures: ${failures.length} (P0=${payload.p0Count}, P1=${payload.p1Count})`);
  return payload;
}

const { round } = parseArgs();
const report = loadPlaywrightReport();
const failures = flattenSuites(report.suites || []);
const ledger = writeLedger(round, failures, report.stats || {});

process.exit(ledger.p0Count > 0 && process.env.LEDGER_FAIL_ON_P0 === '1' ? 1 : 0);
