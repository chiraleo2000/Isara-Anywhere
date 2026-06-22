#!/usr/bin/env node
/**
 * Flag dev-testing bypasses and default webhook secrets in prod-like env templates.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const PROD_LIKE_FILES = [
  '.env.example',
  '.env.docker.example',
  '.env.docker.template',
];

/** LAN dev template — dev bypass flags only (default Jibri secret allowed for local stack). */
const LAN_DEV_FILES = ['.env.docker.lan.example'];

const FORBIDDEN_PATTERNS = [
  { re: /^\s*IZARA_DEV_TESTING\s*=\s*1\s*$/m, label: 'IZARA_DEV_TESTING=1' },
  { re: /^\s*GOOGLE_TOKEN_VERIFIER_FIXTURE\s*=\s*1\s*$/m, label: 'GOOGLE_TOKEN_VERIFIER_FIXTURE=1' },
];

const DEFAULT_SECRET_PATTERNS = [
  { re: /^\s*JIBRI_WEBHOOK_SECRET\s*=\s*izara-jibri-dev-secret\s*$/m, label: 'default JIBRI_WEBHOOK_SECRET (izara-jibri-dev-secret)' },
];

const violations = [];

for (const rel of [...PROD_LIKE_FILES, ...LAN_DEV_FILES]) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  for (const { re, label } of FORBIDDEN_PATTERNS) {
    if (re.test(text)) violations.push(`${rel}: ${label}`);
  }
  if (PROD_LIKE_FILES.includes(rel)) {
    for (const { re, label } of DEFAULT_SECRET_PATTERNS) {
      if (re.test(text)) violations.push(`${rel}: ${label}`);
    }
  }
}

if (violations.length) {
  console.error('DEV-TESTING ENV GUARD FAIL — prod-like templates must not ship dev bypasses:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`DEV-TESTING ENV GUARD PASS — ${PROD_LIKE_FILES.length + LAN_DEV_FILES.length} env templates checked`);
process.exit(0);
