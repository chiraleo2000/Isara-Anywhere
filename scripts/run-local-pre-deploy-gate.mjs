#!/usr/bin/env node
/**
 * v5.2 local pre-deploy gate — ALL steps required before cloud deploy.
 * Headed E2E (PW_HEADED=1); Gemini-lite; NO local docs:sync-screenshots.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveGateWorkers, isParallelGate } from './gates/lib/resolve-gate-workers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const gateWorkers = resolveGateWorkers();
const isStrict = process.env.GATE_STRICT === '1' || process.env.GATE_STRICT === 'true';

const gateEnv = {
  ...process.env,
  PW_SKIP_LIVE_GEMINI: '1',
  PW_HEADED: '1',
  PW_E2E_JITSI_STUB: '1',
  PW_WORKERS: gateWorkers,
  PW_NO_CHROME: process.env.PW_NO_CHROME || '1',
  BASELINE_VISUAL: '1',
  E2E_ALLOW_PARALLEL_SESSIONS: '1',
  PATIENT_URL: 'http://127.0.0.1:3005',
  DOCTOR_URL: 'http://127.0.0.1:3010',
  MEETING_URL: 'http://127.0.0.1:3020',
  VITE_MEETING_SERVER_URL: 'http://127.0.0.1:3020',
  DEMO_AUTO_LOGIN: '1',
  DEMO_AUTO_MEETING: '1',
  // Teams/Zoom manual admit — doctor clicks Admit in lobby UI (never auto-admit)
  VITE_AUTO_ADMIT_LOBBY: '0',
};
const dockerBuildEnv = {
  ...gateEnv,
  MEETING_SERVER_URL: 'http://meeting-server:3020',
};
const hostMeetingEnv = {
  ...process.env,
  MEETING_URL: 'http://127.0.0.1:3020',
  MEETING_SERVER_URL: 'http://127.0.0.1:3020',
  PW_SKIP_LIVE_GEMINI: '1',
};
delete gateEnv.PW_HEADLESS;
delete gateEnv.PW_ALLOW_RECORDING_SEED;

// Drop stale D→E→F workflow ids between gate runs (prevents confirm 404 after DB resets/reseeds).
try {
  const workflowStatePath = path.join(root, 'tests', 'e2e', '.workflow-state.json');
  if (fs.existsSync(workflowStatePath)) {
    fs.unlinkSync(workflowStatePath);
    console.log('[gate] Cleared tests/e2e/.workflow-state.json');
  }
} catch (err) {
  console.warn('[gate] Could not clear workflow state:', err?.message || err);
}

const processDocMap = {
  'verify-deps': 'Processes/ENV_AND_STACK_CHECK.md',
  'env-audit': 'Processes/ENV_AND_STACK_CHECK.md',
  'unit-coverage': 'Processes/FULL_WORKFLOW_CONTRACT.md',
  'unit-database': 'Processes/PostgreSQL_Database_Architecture.md',
  'unit-workflows': 'Processes/Separated_Workflows_And_Functions.md',
  'process-contracts': 'Processes/PROCESS_TO_TEST_GATE.md',
  'v5-contracts': 'Processes/PROCESS_TO_TEST_GATE.md',
  'security-scan': 'Documents/docs/markdown/ledgers/SECURITY_SCANNING_LEDGER.md',
  'docker-compose': 'Processes/ENV_AND_STACK_CHECK.md',
  'docker-probe': 'Processes/ENV_AND_STACK_CHECK.md',
  'gate0-local': 'Processes/GATE0_IMPLEMENTATION_STATUS.md',
  'e2e-full-headed': 'tests/PROCESS_COVERAGE_MATRIX.md',
  'process-audit': 'Processes/PROCESS_TO_TEST_GATE.md',
};

function npmStep(name, script) {
  return { name, cmd: 'npm', args: ['run', script], cwd: root };
}

function browserCoreSteps() {
  const workerArg = `--workers=${gateWorkers}`;
  if (isParallelGate()) {
    return [
      {
        name: 'browser-core-multibrowser',
        cmd: 'npx',
        args: [
          'playwright', 'test', '--headed',
          '--project=W-core-firefox',
          '--project=W-core-webkit',
          '--project=D-appointments',
          workerArg,
        ],
        cwd: root,
      },
    ];
  }
  return [
    {
      name: 'browser-core-firefox',
      cmd: 'npx',
      args: ['playwright', 'test', '--headed', '--project=W-core-firefox', '--workers=1'],
      cwd: root,
    },
    {
      name: 'browser-core-webkit',
      cmd: 'npx',
      args: ['playwright', 'test', '--headed', '--project=W-core-webkit', '--workers=1'],
      cwd: root,
    },
    {
      name: 'browser-appointments-firefox',
      cmd: 'npx',
      args: ['playwright', 'test', '--headed', '--project=D-appointments', '--workers=1'],
      cwd: root,
    },
  ];
}

const e2eScript = isStrict
  ? (isParallelGate() ? 'test:local:e2e-strict-parallel' : 'test:local:e2e-strict')
  : (isParallelGate() ? 'test:local:e2e-parallel' : 'test:local:e2e-full');

const gateSteps = [
  ...(isWin || process.env.GATE_SKIP_VERIFY_DEPS === '1'
    ? []
    : [npmStep('verify-deps', 'verify:deps')]),
  { name: 'env-audit', cmd: 'node', args: ['scripts/env/audit-doctor-portal-env.mjs'], cwd: root },
  npmStep('unit-coverage', 'test:unit:coverage:gate'),
  npmStep('unit-auth', 'test:unit:auth'),
  npmStep('unit-appointments', 'test:unit:appointments'),
  npmStep('unit-clinical', 'test:unit:clinical'),
  npmStep('unit-meeting', 'test:unit:meeting'),
  npmStep('unit-ai', 'test:unit:ai'),
  npmStep('unit-api', 'test:unit:api'),
  npmStep('unit-database', 'test:unit:database'),
  npmStep('unit-workflows', 'test:unit:workflows'),
  npmStep('unit-security', 'test:unit:security'),
  npmStep('unit-notifications', 'test:unit:notifications'),
  npmStep('unit-meeting-acceptance', 'test:unit:meeting-acceptance'),
  npmStep('security-hardening', 'test:security-hardening'),
  npmStep('meeting-contract', 'test:meeting-server:contract'),
  npmStep('post-meeting-pipeline', 'test:post-meeting-pipeline'),
  npmStep('sonar-lint', 'sonar:lint'),
  npmStep('security-scan', 'security:scan'),
  npmStep('lint-portals-full', 'test:lint:portals:full'),
  npmStep('process-contracts', 'test:unit:process-contracts'),
  npmStep('v5-contracts', 'test:unit:v5-contracts'),
  (() => {
    const jitsiVendor = path.join(root, 'deploy/jitsi/docker-jitsi-meet/docker-compose.yml');
    const hasJitsiVendor = fs.existsSync(jitsiVendor);
    const composeFiles = ['docker-compose.yml'];
    const profiles = ['full'];
    if (hasJitsiVendor) {
      composeFiles.push('deploy/jitsi/docker-compose.jitsi.yml');
      profiles.push('jitsi');
    } else {
      console.warn(
        '⚠️  deploy/jitsi/docker-jitsi-meet not found — docker-compose step uses --profile full only.\n' +
          '    Run: node scripts/jitsi/setup-local-jitsi.mjs  (optional for LAN Jitsi)',
      );
    }
    const args = ['compose', '--env-file', '.env.docker'];
    for (const f of composeFiles) args.push('-f', f);
    for (const p of profiles) args.push('--profile', p);
    args.push('up', '-d');
    if (process.env.GATE_SKIP_DOCKER_BUILD !== '1') {
      args.push('--build');
    } else {
      // Stack already up: core services only (skip pgadmin pull + doctor-portal image when npm dev serves :3010).
      args.push('postgres', 'patient-portal', 'meeting-server');
      console.log('[gate] GATE_SKIP_DOCKER_BUILD=1 — starting postgres, patient-portal, meeting-server only');
    }
    return { name: 'docker-compose', cmd: 'docker', args, cwd: root };
  })(),
  npmStep('docker-probe', 'docker:probe-health'),
  {
    name: 'gate0-local',
    cmd: 'npm',
    args: ['run', 'verify:gate0:local'],
    cwd: root,
  },
  ...browserCoreSteps(),
  npmStep('e2e-full-headed', e2eScript),
  npmStep('screenshots-all', 'test:screenshots:all'),
  npmStep('screenshots-group-e', 'test:screenshots:group-e'),
  npmStep('screenshots-group-s', 'test:screenshots:group-s'),
  npmStep('screenshots-group-q2', 'test:screenshots:group-q2'),
  npmStep('screenshots-global', 'test:screenshots:global'),
  npmStep('process-audit', 'test:audit:process'),
];

const fromStep = process.env.GATE_FROM_STEP || '';
let pastFromStep = !fromStep;

const steps = gateSteps.filter((step) => {
  if (!pastFromStep) {
    if (step.name === fromStep) pastFromStep = true;
    else return false;
  }
  return !(process.env.GATE_SKIP_VERIFY_DEPS === '1' && step.name === 'verify-deps');
});

const results = [];
let failed = false;
let failedStep = '';
let failedProcessDoc = '';

function resolveStepEnv(step) {
  if (step.name === 'docker-compose') return dockerBuildEnv;
  if (step.name.startsWith('e2e') || step.name === 'gate0-local' || step.name.startsWith('browser-')) {
    return gateEnv;
  }
  if (step.name === 'meeting-contract' || step.name === 'post-meeting-pipeline') {
    return hostMeetingEnv;
  }
  return { ...process.env, PW_SKIP_LIVE_GEMINI: '1' };
}

function runStep(step) {
  console.log(`\n═══ [${step.name}] ═══`);
  const r = spawnSync(step.cmd, step.args, {
    cwd: step.cwd,
    stdio: 'inherit',
    shell: isWin,
    env: resolveStepEnv(step),
  });
  const ok = r.status === 0;
  results.push({
    step: step.name,
    ok,
    exitCode: r.status ?? 1,
    processDoc: processDocMap[step.name] || '—',
  });
  if (ok) {
    console.log(`✅ ${step.name} passed`);
    if (step.name === 'docker-compose') {
      console.log('⏳ Waiting 30s for containers to become ready...');
      spawnSync(process.platform === 'win32' ? 'powershell' : 'sleep', process.platform === 'win32' ? ['-Command', 'Start-Sleep -Seconds 30'] : ['30'], { stdio: 'inherit', shell: isWin });
    }
  } else {
    failed = true;
    failedStep = step.name;
    failedProcessDoc = processDocMap[step.name] || '—';
    console.error(`❌ Gate blocked at: ${step.name}`);
  }
  return ok;
}

for (const step of steps) {
  if (!runStep(step)) break;
}

const reportDir = path.join(root, 'reports', 'defect-fix');
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, 'scan-baseline-2026-06-10.md');
const lines = [
  '# Local Pre-Deploy Gate Baseline (v5.2)',
  '',
  `Date: ${new Date().toISOString()}`,
  '',
  '| Step | Process doc | Result |',
  '|------|-------------|--------|',
  ...results.map((r) => {
    const resultLabel = r.ok ? 'PASS' : `FAIL (${r.exitCode})`;
    return `| ${r.step} | ${r.processDoc} | ${resultLabel} |`;
  }),
  '',
  failed ? `**Blocked at:** ${failedStep} (${failedProcessDoc})` : '**Overall:** PASS',
  '',
  'Policy: PW_HEADED=1, PW_SKIP_LIVE_GEMINI=1, no local docs:sync-screenshots',
];
fs.writeFileSync(reportPath, lines.join('\n'));
console.log(`\nLedger: ${reportPath}`);

process.exit(failed ? 1 : 0);
