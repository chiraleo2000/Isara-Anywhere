#!/usr/bin/env node
/**
 * Triage latest local pre-deploy gate failure → fix scope, rerun command, agent prompt.
 * Usage: npm run gate:triage [--step e2e-full-headed]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const STEP_MAP = {
  'v5-contracts': {
    fixScope: 'tests/unit/cross-portal/*.test.ts + referenced portal/meeting source',
    rerunCommand: 'npm run test:unit:v5-contracts',
    resumeCommand: '$env:GATE_FROM_STEP="v5-contracts"; npm run test:local:gate-parallel-resume',
    agentPrompt:
      'Fix failing v5 contract test: read vitest output, update minimal source to satisfy contract assertion.',
  },
  'process-contracts': {
    fixScope: 'tests/unit/cross-portal/process*.test.ts + Processes/*.md alignment',
    rerunCommand: 'npm run test:unit:process-contracts',
    resumeCommand: '$env:GATE_FROM_STEP="process-contracts"; npm run test:local:gate-parallel-resume',
    agentPrompt: 'Fix process contract test failure; keep Process doc IDs in sync.',
  },
  'lint-portals-full': {
    fixScope: 'Isara-doctor-portal/frontend, Isara-patient-portal/frontend (eslint + tsc)',
    rerunCommand: 'npm run test:lint:portals:full',
    resumeCommand: '$env:GATE_FROM_STEP="lint-portals-full"; npm run test:local:gate-parallel-resume',
    agentPrompt: 'Fix lint/type-check errors in portal frontend; minimal diff.',
  },
  'docker-probe': {
    fixScope: 'Docker compose, .env.docker, portal ports 3005/3010/3020',
    rerunCommand: 'npm run docker:probe-health',
    resumeCommand: '$env:GATE_FROM_STEP="docker-compose"; npm run test:local:gate-parallel-resume',
    agentPrompt: 'Restore Docker health for patient, doctor, meeting URLs.',
  },
  'gate0-local': {
    fixScope: 'Appointment pool API sync (GATE0), scripts/verify-cloud-appointment-sync.mjs',
    rerunCommand: 'npm run verify:gate0:local',
    resumeCommand: '$env:GATE_FROM_STEP="gate0-local"; npm run test:local:gate-parallel-resume',
    agentPrompt: 'Fix GATE0 appointment chain G1–G5 API failure.',
  },
  'browser-core-firefox': {
    fixScope: 'tests/group-W-core-multibrowser.ui-test.ts, tests/helpers/browser-matrix.ts',
    rerunCommand: 'npx playwright test --headed --project=W-core-firefox --workers=1',
    resumeCommand: '$env:GATE_FROM_STEP="browser-core-firefox"; npm run test:local:gate-parallel-resume',
    agentPrompt: 'Fix W-core Firefox multi-browser workflow failure.',
  },
  'browser-core-webkit': {
    fixScope: 'tests/group-W-core-multibrowser.ui-test.ts',
    rerunCommand: 'npx playwright test --headed --project=W-core-webkit --workers=1',
    resumeCommand: '$env:GATE_FROM_STEP="browser-core-webkit"; npm run test:local:gate-parallel-resume',
    agentPrompt: 'Fix W-core WebKit multi-browser workflow failure.',
  },
  'browser-core-multibrowser': {
    fixScope: 'tests/group-W-core-multibrowser.ui-test.ts + D-appointments on Firefox',
    rerunCommand:
      'npx playwright test --headed --project=W-core-firefox --project=W-core-webkit --project=D-appointments --workers=3',
    resumeCommand: '$env:GATE_FROM_STEP="browser-core-multibrowser"; npm run test:local:gate-parallel-resume',
    agentPrompt: 'Fix parallel browser-core gate (Firefox/WebKit + D-appointments).',
  },
  'e2e-full-headed': {
    fixScope: 'tests/group-*.ui-test.ts (see playwright-report for project)',
    rerunCommand: 'npm run test:local:e2e-parallel',
    resumeCommand: '$env:GATE_FROM_STEP="e2e-full-headed"; npm run test:local:gate-parallel-resume',
    agentPrompt:
      'Read playwright-report + test-results/full-coverage-results.json; fix failing Playwright group; re-run isolated project with --workers=1 if flaky.',
  },
  'screenshots-all': {
    fixScope: 'docs/screenshots/group-* — whiteout/duplicate PNGs',
    rerunCommand: 'npm run test:screenshots:all',
    resumeCommand: '$env:GATE_FROM_STEP="screenshots-all"; npm run test:local:gate-parallel-resume',
    agentPrompt:
      'Read reports/screenshot-audit-latest.json; fix groups with duplicate/blank images; re-capture via headed E2E.',
  },
  'screenshots-global': {
    fixScope: 'Cross-group duplicate screenshots in docs/screenshots/',
    rerunCommand: 'npm run test:screenshots:global',
    resumeCommand: '$env:GATE_FROM_STEP="screenshots-global"; npm run test:local:gate-parallel-resume',
    agentPrompt: 'Fix cross-group screenshot duplicates; ensure distinct pages per workflow stage.',
  },
};

function matchUnitStep(step) {
  if (!step.startsWith('unit-')) return null;
  const pack = step.replace(/^unit-/, '');
  return {
    fixScope: `tests/unit/**/${pack}* + related portal backend`,
    rerunCommand: `npm run test:unit:${pack}`,
    resumeCommand: `$env:GATE_FROM_STEP="${step}"; npm run test:local:gate-parallel-resume`,
    agentPrompt: `Fix unit pack ${pack} failure; run npm run test:unit:${pack} to verify.`,
  };
}

function matchScreenshotStep(step) {
  const m = step.match(/^screenshots-group-([a-z0-9]+)$/i);
  if (!m) return null;
  const g = m[1].toUpperCase();
  return {
    fixScope: `docs/screenshots/group-${g}/`,
    rerunCommand: `npm run test:screenshots:group-${m[1].toLowerCase()}`,
    resumeCommand: `$env:GATE_FROM_STEP="${step}"; npm run test:local:gate-parallel-resume`,
    agentPrompt: `Fix screenshot uniqueness for group-${g}; re-run headed E2E for that group.`,
  };
}

function parseBaselineReport() {
  const reportPath = path.join(root, 'reports', 'defect-fix', 'scan-baseline-2026-06-10.md');
  if (!fs.existsSync(reportPath)) return { blockedStep: null, rows: [] };
  const text = fs.readFileSync(reportPath, 'utf8');
  const blocked = text.match(/\*\*Blocked at:\*\*\s*(\S+)/);
  const rows = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*([^|]+)\s*\|\s*[^|]+\s*\|\s*FAIL/i);
    if (m) rows.push(m[1].trim());
  }
  return { blockedStep: blocked?.[1] ?? rows[0] ?? null, rows, reportPath };
}

function parsePlaywrightFailures() {
  const jsonPath = path.join(root, 'test-results', 'full-coverage-results.json');
  if (!fs.existsSync(jsonPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const suites = data.suites ?? [];
    const failed = [];
    function walk(suite, parents = []) {
      const name = [...parents, suite.title].filter(Boolean).join(' > ');
      for (const spec of suite.specs ?? []) {
        if (spec.ok === false) {
          failed.push({ project: parents[0] || suite.title, test: spec.title, path: name });
        }
      }
      for (const child of suite.suites ?? []) {
        walk(child, [...parents, suite.title]);
      }
    }
    for (const s of suites) walk(s, []);
    return failed;
  } catch {
    return [];
  }
}

function findArtifacts(step) {
  const safe = String(step || 'gate-failure').replace(/[^\w.-]+/g, '_');
  const dir = path.join(root, 'reports', 'local-failures', 'round-9', safe);
  const manifest = path.join(dir, 'manifest.json');
  return fs.existsSync(manifest) ? dir : null;
}

function resolveStepInfo(step) {
  if (STEP_MAP[step]) return { step, ...STEP_MAP[step] };
  const unit = matchUnitStep(step);
  if (unit) return { step, ...unit };
  const ss = matchScreenshotStep(step);
  if (ss) return { step, ...ss };
  return {
    step,
    fixScope: 'See reports/defect-fix/scan-baseline-2026-06-10.md',
    rerunCommand: `npx playwright show-report`,
    resumeCommand: `$env:GATE_FROM_STEP="${step}"; npm run test:local:gate-parallel-resume`,
    agentPrompt: `Investigate gate step ${step} failure using playwright-report and docker logs.`,
  };
}

const stepArgIdx = process.argv.indexOf('--step');
const cliStep = stepArgIdx >= 0 ? process.argv[stepArgIdx + 1] : null;
const baseline = parseBaselineReport();
const failedStep = cliStep || baseline.blockedStep || process.env.GATE_FROM_STEP || null;

if (!failedStep) {
  console.log(JSON.stringify({ pass: true, message: 'No blocked step in scan-baseline; gate may have passed.' }, null, 2));
  process.exit(0);
}

const info = resolveStepInfo(failedStep);
const playwrightFailures = parsePlaywrightFailures();
const out = {
  triagedAt: new Date().toISOString(),
  failedStep,
  allFailedSteps: baseline.rows,
  ...info,
  artifactsPath: findArtifacts(failedStep),
  baselineReport: baseline.reportPath,
  playwrightFailures,
  playwrightReport: path.join(root, 'playwright-report', 'index.html'),
  parallelResume:
    'cross-env GATE_PARALLEL=1 PW_WORKERS=2 PW_NO_CHROME=1 GATE_SKIP_DOCKER_BUILD=1 npm run test:local:gate-parallel-resume',
};

const outPath = path.join(root, 'reports', 'gate-triage-latest.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);

console.log('\n═══ Gate failure triage ═══');
console.log(`Failed step:  ${failedStep}`);
console.log(`Fix scope:    ${info.fixScope}`);
console.log(`Re-run shard: ${info.rerunCommand}`);
console.log(`Resume gate:  ${info.resumeCommand}`);
console.log(`Artifacts:    ${out.artifactsPath || '(none — run failed step to archive)'}`);
if (playwrightFailures.length) {
  console.log(`Playwright:   ${playwrightFailures.length} failed test(s)`);
  for (const f of playwrightFailures.slice(0, 5)) {
    console.log(`  - [${f.project}] ${f.test}`);
  }
}
console.log(`\nFull triage:  ${outPath}\n`);

process.exit(baseline.rows.length && !cliStep ? 1 : 0);
