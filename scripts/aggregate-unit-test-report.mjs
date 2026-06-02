#!/usr/bin/env node
/**
 * Full unit-test report + UI screenshot cross-reference for docs/presentations.
 * Writes: docs/markdown/testing/UNIT_TEST_UI_COVERAGE.md, tests/UNIT_TEST_COVERAGE_REPORT.md
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const screenshotsRoot = path.join(root, 'docs', 'screenshots');
const reportsDir = path.join(root, 'reports', 'unit');

const UNIT_TO_UI = [
  { group: 'auth', unitFiles: 'doctor-portal/auth*, patient-portal/auth*', uiDirs: ['group-A', 'workflows/auth-login', 'sso'] },
  { group: 'appointments', unitFiles: '*appointment*, *queue*, *book*', uiDirs: ['group-D', 'workflows/appointment-lifecycle'] },
  { group: 'clinical', unitFiles: '*emr*, *phr*, *prescri*, *lab*, *pdpa*', uiDirs: ['group-F', 'group-G', 'group-L'] },
  { group: 'meeting', unitFiles: 'meeting-server/*, *meeting*, *jitsi*', uiDirs: ['group-E', 'group-J-meeting-jitsi', 'group-Q', 'workflows/video-meeting'] },
  { group: 'security', unitFiles: '*owasp*, *sanitize*, *jwt*, security/*', uiDirs: ['group-A'] },
  { group: 'responsive', unitFiles: '*responsive*, layout*', uiDirs: ['group-S'] },
  { group: 'ai', unitFiles: '*ai*, *gemini*', uiDirs: ['group-J', 'group-H'] },
  { group: 'admin', unitFiles: '*admin*', uiDirs: ['group-C', 'group-I'] },
];

function listPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d, prefix = '') => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full, rel);
      else if (ent.name.endsWith('.png')) out.push(rel.replace(/\\/g, '/'));
    }
  };
  walk(dir);
  return out.sort();
}

function collectScreenshotCatalog() {
  const catalog = {};
  if (!fs.existsSync(screenshotsRoot)) return catalog;
  for (const ent of fs.readdirSync(screenshotsRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(screenshotsRoot, ent.name);
    const pngs = listPngs(dir);
    if (pngs.length) catalog[ent.name] = pngs;
  }
  return catalog;
}

fs.mkdirSync(reportsDir, { recursive: true });
const started = new Date().toISOString();
console.log('Running full unit test suite...');
const testRun = spawnSync('npm', ['test'], {
  cwd: path.join(root, 'tests', 'unit'),
  shell: true,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
const logPath = path.join(reportsDir, 'v1.7.37-full-unit-run.log');
fs.writeFileSync(logPath, testRun.stdout + '\n' + (testRun.stderr || ''));

const passMatch = testRun.stdout.match(/Tests\s+(\d+)\s+passed/);
const fileMatch = testRun.stdout.match(/Test Files\s+(\d+)\s+passed/);
const testsPassed = passMatch ? Number(passMatch[1]) : 0;
const filesPassed = fileMatch ? Number(fileMatch[1]) : 0;
const ok = testRun.status === 0;

const catalog = collectScreenshotCatalog();
const totalScreenshots = Object.values(catalog).reduce((n, arr) => n + arr.length, 0);

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

let md = `# Unit Test + UI Screenshot Coverage — v${version}\n\n`;
md += `> Generated: ${started} | Full run log: [reports/unit/v1.7.37-full-unit-run.log](../reports/unit/v1.7.37-full-unit-run.log)\n\n`;
md += `## Summary\n\n`;
md += `| Metric | Value |\n|--------|-------|\n`;
md += `| Unit test files passed | ${filesPassed} |\n`;
md += `| Unit tests passed | ${testsPassed} |\n`;
md += `| Run status | ${ok ? 'PASS' : 'FAIL'} |\n`;
md += `| UI screenshot folders | ${Object.keys(catalog).length} |\n`;
md += `| UI PNG artifacts | ${totalScreenshots} |\n`;
md += `| Cloud gate UI (A + 7 viewports) | 41 Playwright tests |\n`;
md += `| Sonar / quality | \`npm run sonar:lint\` |\n\n`;

md += `## Unit domain → UI proof mapping\n\n`;
md += `Vitest validates logic in isolation; Playwright screenshots prove the same flows on cloud UI.\n\n`;
md += `| Unit domain | Vitest scope | UI screenshot folders |\n`;
md += `|-------------|--------------|------------------------|\n`;
for (const row of UNIT_TO_UI) {
  const dirs = row.uiDirs.filter((d) => catalog[d] || row.uiDirs.some((x) => catalog[x]));
  const found = row.uiDirs.filter((d) => catalog[d]);
  const count = found.reduce((n, d) => n + (catalog[d]?.length || 0), 0);
  md += `| **${row.group}** | ${row.unitFiles} | ${found.join(', ') || '—'} (${count} PNG) |\n`;
}

md += `\n## Gate screenshots (cloud verification)\n\n`;
const gateGroups = ['group-A', 'group-S'].filter((g) => catalog[g]);
for (const g of gateGroups) {
  md += `### ${g}\n\n`;
  for (const png of catalog[g] || []) {
    const rel = `../docs/screenshots/${g}/${png}`;
    const title = png.replace('.png', '').replace(/-/g, ' ');
    md += `- ![${title}](${rel})\n`;
  }
  md += '\n';
}

md += `## Sample workflow screenshots\n\n`;
if (catalog.workflows?.length) {
  const wfAuth = catalog.workflows.filter((p) => p.startsWith('auth-login/')).slice(0, 6);
  const wfAppt = catalog.workflows.filter((p) => p.startsWith('appointment-lifecycle/')).slice(0, 6);
  if (wfAuth.length) {
    md += `### workflows/auth-login\n\n`;
    for (const png of wfAuth) {
      md += `- ![${png}](../docs/screenshots/workflows/${png})\n`;
    }
    md += '\n';
  }
  if (wfAppt.length) {
    md += `### workflows/appointment-lifecycle\n\n`;
    for (const png of wfAppt) {
      md += `- ![${png}](../docs/screenshots/workflows/${png})\n`;
    }
    md += '\n';
  }
}

md += `## Commands\n\n\`\`\`powershell\nnpm run test:unit\nnpm run test:unit:report\nnpm run test:gate:ui-showup\nnpm run test:cloud:unit-gate\n\`\`\`\n`;

const docsPath = path.join(root, 'docs', 'markdown', 'testing', 'UNIT_TEST_UI_COVERAGE.md');
const testsPath = path.join(root, 'tests', 'UNIT_TEST_COVERAGE_REPORT.md');
fs.writeFileSync(docsPath, md);
fs.writeFileSync(testsPath, md.replace('../docs/screenshots/', 'docs/screenshots/').replace('../reports/', 'reports/'));

console.log(`Wrote ${docsPath}`);
console.log(`Wrote ${testsPath}`);
console.log(`Log: ${logPath}`);
process.exit(ok ? 0 : 1);
