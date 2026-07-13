#!/usr/bin/env node
/**
 * Sync E2E screenshots from tests/output and docs/screenshots into canonical docs paths.
 *
 * Usage:
 *   npm run docs:sync-screenshots
 *   npm run docs:sync-screenshots -- --groups group-W,group-Q,group-D
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceRoot = path.join(repoRoot, 'tests', 'output', 'screenshots');
const docsRoot = path.join(repoRoot, 'docs', 'screenshots');
const browsers = ['chromium', 'firefox', 'webkit'];
const canonicalBrowser = 'chromium';

const GROUP_MANIFESTS = {
  'group-W': {
    workflows: [
      { id: 'W01', files: ['W01-patient-dashboard.png', 'W01-doctor-dashboard.png', 'W01-admin-dashboard.png'] },
      { id: 'W02', files: ['W02-appointments-list.png', 'W02-appointment-created.png'] },
      { id: 'W03', files: ['W03-health-meeting.png', 'W03-appointment-pool.png'] },
      { id: 'W04', files: ['W04-doctor-virtual-meeting.png', 'W04-patient-meeting-room.png'] },
      { id: 'W05', files: ['W05-patient-detail.png', 'W05-emr-editor.png'] },
      { id: 'W06', files: ['W06-gemini-studio-open.png', 'W06-gemini-api-connected.png'] },
    ],
  },
  'group-Q': {
    workflows: [
      { id: 'Q01b', stage: 'doctor Jitsi host iframe', files: ['Q01b-doctor-host-jitsi.png'] },
      { id: 'Q01c', stage: 'patient lobby waiting (no Jitsi)', files: ['Q01c-patient-lobby-waiting.png'] },
      { id: 'Q01d', stage: 'guest lobby waiting (no Jitsi)', files: ['Q01d-guest-lobby-waiting.png'] },
      { id: 'Q01e', stage: 'doctor admitted lobby panel', files: ['Q01e-doctor-admitted.png'] },
      { id: 'Q01f', stage: 'three-party in-meeting hold', files: ['Q01f-three-party-held.png'] },
      { id: 'Q02c', stage: 'post-meeting results/recording', files: ['Q02c-dashboard-recording.png'] },
    ],
  },
  'group-D': {
    workflows: [
      { id: 'D03', stage: 'booking wizard', files: ['D03-booking-wizard.png'] },
      { id: 'D07', stage: 'appointment submitted', files: ['D07-submitted.png'] },
      { id: 'D09', stage: 'health meeting', files: ['D09-health-meeting.png'] },
    ],
  },
  'group-Q2': {
    workflows: [
      { id: 'Q2-01', stage: 'results route', files: ['Q2-01-results-route.png'] },
      { id: 'Q2-03', stage: 'transcript tab', files: ['Q2-03-transcript-tab.png'] },
      { id: 'Q2-04', stage: 'summary tab', files: ['Q2-04-summary-tab.png'] },
      { id: 'Q2-05', stage: 'dashboard AI summary', files: ['Q2-05-dashboard-summary.png'] },
      { id: 'Q2-06', stage: 'health meeting completed', files: ['Q2-06-post-meeting-complete.png'] },
    ],
  },
};

function parseGroups() {
  const idx = process.argv.indexOf('--groups');
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1].split(',').map((g) => g.trim()).filter(Boolean);
  }
  return ['group-W', 'group-Q', 'group-Q2', 'group-D'];
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // Never replace a larger (likely valid) PNG with a smaller blank/error capture.
  if (fs.existsSync(dest)) {
    const srcSize = fs.statSync(src).size;
    const destSize = fs.statSync(dest).size;
    if (destSize > srcSize && srcSize < 15_000) {
      console.warn(
        `[docs:sync-screenshots] skip overwrite ${path.relative(repoRoot, dest)} (keep ${destSize}B > src ${srcSize}B)`,
      );
      return;
    }
  }
  fs.copyFileSync(src, dest);
}

function listPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
}

function syncGroup(groupName) {
  const targetRoot = path.join(docsRoot, groupName);
  let copied = 0;
  const missing = [];

  for (const browser of browsers) {
    const srcDir = path.join(sourceRoot, browser, groupName);
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

  // Also accept direct writes from snap() / snapMeetingStage() → docs/screenshots/{group}
  const directDir = path.join(docsRoot, groupName);
  if (fs.existsSync(directDir)) {
    for (const file of listPngs(directDir)) {
      if (file === 'manifest.json') continue;
      copied += 1;
    }
  }

  const manifestDef = GROUP_MANIFESTS[groupName];
  if (manifestDef) {
    const manifest = {
      syncedAt: new Date().toISOString(),
      group: groupName,
      source: ['tests/output/screenshots', 'docs/screenshots'],
      canonicalBrowser,
      browsers,
      ...manifestDef,
    };
    fs.mkdirSync(targetRoot, { recursive: true });
    fs.writeFileSync(path.join(targetRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return { groupName, copied, missing, targetRoot };
}

const groups = parseGroups();
let totalCopied = 0;
const allMissing = [];

for (const group of groups) {
  const result = syncGroup(group);
  totalCopied += result.copied;
  allMissing.push(...result.missing);
  console.log(`[docs:sync-screenshots] ${group}: ${result.copied} files → ${path.relative(repoRoot, result.targetRoot)}`);
}

if (allMissing.length > 0) {
  console.warn('[docs:sync-screenshots] Missing source folders (run E2E first):');
  for (const m of allMissing) console.warn(`  - ${path.relative(repoRoot, m)}`);
}

if (totalCopied === 0) {
  console.error('[docs:sync-screenshots] No screenshots synced. Run headed E2E with BASELINE_VISUAL=1');
  process.exit(1);
}

console.log(`[docs:sync-screenshots] Total: ${totalCopied} PNG references synced`);
