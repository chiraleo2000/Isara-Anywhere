#!/usr/bin/env node
/**
 * Embed passing E2E screenshot refs + latest ledger summary into LOCAL_INSTALL.md
 * Usage: node scripts/docs/update-runbook-test-evidence.mjs [--env local|cloud]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runbook = path.join(root, 'docs/runbooks/LOCAL_INSTALL.md');
const envArg = process.argv.includes('--env')
  ? process.argv[process.argv.indexOf('--env') + 1]
  : 'local';

const EVIDENCE_SHOTS = [
  { id: 'A01-patient-dashboard', group: 'group-A', caption: 'Patient dashboard (Group A)' },
  { id: 'A01-doctor-dashboard', group: 'group-A', caption: 'Doctor dashboard (Group A)' },
  { id: 'D03-booking-wizard', group: 'group-D', caption: 'Appointment booking wizard (Group D)' },
  { id: 'D09-health-meeting', group: 'group-D', caption: 'Doctor health meeting (Group D)' },
  { id: 'Q01b-doctor-host-jitsi', group: 'group-Q', caption: 'Doctor host in Jitsi (Group Q)' },
  { id: 'Q01c-patient-lobby-waiting', group: 'group-Q', caption: 'Patient lobby wait (Group Q)' },
  { id: 'JPRE01d-patient-prejoin-autoname', group: 'group-J-jitsi-prejoin', caption: 'Patient auto-lobby prejoin (Group J)' },
  { id: 'DM1-doctor-lobby-panel', group: 'group-defect', caption: 'Doctor lobby admit panel (Defect DM1)' },
  { id: 'Q2-05-dashboard-summary', group: 'group-Q2', caption: 'Post-meeting AI summary (Group Q2)' },
  { id: 'B01-dashboard', group: 'group-B', caption: 'Patient portal surfaces (Group B)' },
];

function findLatestLedger() {
  const dir = path.join(root, 'reports/local-error-ledger');
  const cloudDir = path.join(root, 'reports/cloud-error-ledger');
  const pick = (d, prefix) => {
    if (!fs.existsSync(d)) return null;
    const files = fs.readdirSync(d).filter((f) => f.startsWith(prefix) && f.endsWith('.json'));
    files.sort();
    const latest = files.at(-1);
    return latest ? path.join(d, latest) : null;
  };
  if (envArg === 'cloud') {
    return pick(cloudDir, 'round-final') || pick(cloudDir, 'round-');
  }
  return pick(dir, 'round-9') || pick(dir, 'round-');
}

function ledgerSummary() {
  const file = findLatestLedger();
  if (!file) return { text: 'Ledger: not found — run pre-deploy gate first.', file: null };
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p0 = data.p0Count ?? data.failures?.filter((f) => f.priority === 'P0')?.length ?? '?';
  const total = data.totalTests ?? data.testCount ?? '?';
  return {
    file: path.relative(root, file).replace(/\\/g, '/'),
    text: `**Ledger:** \`${path.relative(root, file).replace(/\\/g, '/')}\` — tests **${total}**, **P0=${p0}**`,
  };
}

function shotMarkdown({ id, group, caption }) {
  const rel = `../../docs/screenshots/${group}/${id}.png`;
  const abs = path.join(root, 'docs/screenshots', group, `${id}.png`);
  if (!fs.existsSync(abs)) return `- _${caption}_ — \`${id}.png\` _(pending — re-run headed E2E)_`;
  return `### ${caption}\n\n![${caption}](${rel})\n`;
}

function buildEvidenceBlock() {
  const ledger = ledgerSummary();
  const ts = new Date().toISOString().slice(0, 10);
  const shots = EVIDENCE_SHOTS.map(shotMarkdown).join('\n');
  return `<!-- EVIDENCE_START -->
## Visual test evidence (${envArg}, headed UI)

> Browsers run **visible** during gates: \`$env:PW_HEADED='1'\` + \`$env:BASELINE_VISUAL='1'\`
> Updated: ${ts}

${ledger.text}

### Headed local gate

\`\`\`powershell
$env:PW_HEADED='1'
$env:BASELINE_VISUAL='1'
$env:PW_SKIP_LIVE_GEMINI='1'
$env:GATE_SKIP_DOCKER_BUILD='1'
npm run test:local:pre-deploy-gate
npm run docs:sync-screenshots
node scripts/docs/update-runbook-test-evidence.mjs --env local
\`\`\`

### Headed cloud gate

\`\`\`powershell
$env:PW_HEADED='1'
$env:BASELINE_VISUAL='1'
$env:TEST_ENV='cloud'
npm run test:cloud:release-gate
npm run docs:sync-screenshots
node scripts/docs/update-runbook-test-evidence.mjs --env cloud
npm run guides:build
\`\`\`

### Passing UI screenshots (canonical \`docs/screenshots/\`)

${shots}

Screenshots live under \`docs/screenshots/group-*\`. User guides: \`Documents/docs/guides/patient/\`, \`Documents/docs/guides/doctor/\`.
<!-- EVIDENCE_END -->`;
}

function main() {
  if (!fs.existsSync(runbook)) {
    console.error('Missing', runbook);
    process.exit(1);
  }
  let md = fs.readFileSync(runbook, 'utf8');
  const block = buildEvidenceBlock();
  if (md.includes('<!-- EVIDENCE_START -->')) {
    md = md.replace(/<!-- EVIDENCE_START -->[\s\S]*?<!-- EVIDENCE_END -->/, block);
  } else {
    md = md.trimEnd() + '\n\n' + block + '\n';
  }
  fs.writeFileSync(runbook, md, 'utf8');
  console.log(`Updated ${path.relative(root, runbook)} (${envArg})`);
}

main();
