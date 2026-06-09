#!/usr/bin/env node
/**
 * Copy passing Group W E2E screenshots from tests/output into Documents/docs/screenshots/.
 *
 * Usage:
 *   npm run docs:sync-screenshots
 *
 * Source:  tests/output/screenshots/{chromium,firefox,webkit}/group-W/*.png
 * Target:  Documents/docs/screenshots/group-W/
 *           - Canonical PNGs at group-W/ root (Chromium)
 *           - Per-browser copies under group-W/browsers/{chromium,firefox,webkit}/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceRoot = path.join(repoRoot, 'tests', 'output', 'screenshots');
const targetRoot = path.join(repoRoot, 'Documents', 'docs', 'screenshots', 'group-W');
const browsers = ['chromium', 'firefox', 'webkit'];
const canonicalBrowser = 'chromium';

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function listPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
}

let copied = 0;
const missing = [];

for (const browser of browsers) {
  const srcDir = path.join(sourceRoot, browser, 'group-W');
  const pngs = listPngs(srcDir);
  if (pngs.length === 0) {
    missing.push(srcDir);
    continue;
  }
  for (const file of pngs) {
    const src = path.join(srcDir, file);
    const browserDest = path.join(targetRoot, 'browsers', browser, file);
    copyFile(src, browserDest);
    copied += 1;
    if (browser === canonicalBrowser) {
      copyFile(src, path.join(targetRoot, file));
      copied += 1;
    }
  }
}

const manifest = {
  syncedAt: new Date().toISOString(),
  source: 'tests/output/screenshots',
  canonicalBrowser,
  workflows: [
    { id: 'W01', files: ['W01-patient-dashboard.png', 'W01-doctor-dashboard.png', 'W01-admin-dashboard.png'] },
    { id: 'W02', files: ['W02-appointments-list.png', 'W02-appointment-created.png'] },
    { id: 'W03', files: ['W03-health-meeting.png', 'W03-appointment-pool.png'] },
    { id: 'W04', files: ['W04-doctor-virtual-meeting.png', 'W04-patient-meeting-room.png'] },
    { id: 'W05', files: ['W05-patient-detail.png', 'W05-emr-editor.png'] },
    { id: 'W06', files: ['W06-gemini-studio-open.png', 'W06-gemini-api-connected.png'] },
  ],
  browsers,
};

fs.mkdirSync(targetRoot, { recursive: true });
fs.writeFileSync(path.join(targetRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

if (missing.length > 0) {
  console.warn('[docs:sync-screenshots] Missing source folders (run E2E first):');
  for (const m of missing) console.warn(`  - ${path.relative(repoRoot, m)}`);
}

console.log(`[docs:sync-screenshots] Copied ${copied} PNG files → ${path.relative(repoRoot, targetRoot)}`);
if (copied === 0) {
  console.error('[docs:sync-screenshots] No screenshots copied. Run: npm run test:e2e:docker:core-multibrowser');
  process.exit(1);
}
