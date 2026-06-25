#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platformRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseUrl = process.env.MEETING_URL || 'http://localhost:3020';

const env = {
  ...process.env,
  STANDALONE_MODE: '1',
  MEETING_URL: baseUrl,
};

const meetingDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runNodeTest(files, label) {
  console.log(`\n--- ${label} ---\n`);
  const r = spawnSync('node', ['--test', ...files], {
    cwd: meetingDir,
    stdio: 'inherit',
    shell: true,
    env,
  });
  if (r.status !== 0) {
    console.error(`❌ ${label} failed`);
    process.exit(r.status ?? 1);
  }
}

runNodeTest(
  [
    'tests/sessionAuth.test.mjs',
    'tests/recordingAccess.test.mjs',
    'tests/webhookProdSecret.test.mjs',
    'tests/postMeetingPipeline.test.mjs',
    'tests/recordingCrypto.test.mjs',
    'tests/requestValidation.test.mjs',
  ],
  'meeting contract',
);
console.log('\n✅ meeting test:standalone complete');
