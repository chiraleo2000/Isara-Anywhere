#!/usr/bin/env node
/**
 * Application-layer security scan (secrets, eval, CORS) — doctor/patient/jitsi server only.
 * Usage: node scripts/security/app-security-scan.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const TARGETS = [
  {
    codebase: 'doctor',
    dirs: ['Isara-doctor-portal/frontend', 'Isara-doctor-portal/backend'],
  },
  {
    codebase: 'patient',
    dirs: ['Isara-patient-portal/frontend', 'Isara-patient-portal/backend'],
  },
  { codebase: 'jitsi', dirs: ['Izara-jitsi-server/backend'] },
  { codebase: 'shared', dirs: ['shared'] },
];

const SKIP_DIR = new Set(['node_modules', 'dist', 'coverage', '.git']);
const SKIP_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/i;

const RULES = [
  {
    id: 'hardcoded-secret',
    severity: 'error',
    re: /(?:\|\|\s*['"])(?:IzaraDb2024|izara[_-]?secret|changeme)['"]/i,
    message: 'Hardcoded fallback secret',
  },
  {
    id: 'jwt-fallback',
    severity: 'error',
    re: /JWT_SECRET\s*\|\|\s*['"][^'"]+['"]/,
    message: 'JWT secret string fallback',
  },
  {
    id: 'private-key',
    severity: 'error',
    re: /BEGIN (?:RSA )?PRIVATE KEY/,
    message: 'Embedded private key material',
  },
  {
    id: 'api-key-shape',
    severity: 'warn',
    re: /(?:api[_-]?key|secret|password|private[_-]?key|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/i,
    message: 'Possible hardcoded credential (review)',
  },
  {
    id: 'eval',
    severity: 'error',
    re: /\beval\s*\(/,
    message: 'eval() usage',
  },
  {
    id: 'new-function',
    severity: 'error',
    re: /\bnew\s+Function\s*\(/,
    message: 'dynamic Function constructor',
  },
  {
    id: 'cors-wildcard',
    severity: 'warn',
    re: /origin\s*:\s*['"]\*['"]/,
    message: 'CORS origin wildcard',
  },
  {
    id: 'cors-callback-true',
    severity: 'warn',
    re: /callback\s*\(\s*null\s*,\s*true\s*\)/,
    message: 'CORS callback allows any origin',
  },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|cjs|mjs)$/.test(ent.name) && !SKIP_FILE.test(ent.name)) files.push(full);
  }
  return files;
}

function scanFile(filePath, codebase) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/NOSONAR|process\.env\.|corsPolicy\.cjs|applyCorsDecision/.test(line)) continue;
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        findings.push({
          codebase,
          file: rel,
          line: i + 1,
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
          evidence: line.trim().slice(0, 120),
        });
      }
    }
  }
  return findings;
}

function main() {
  const jsonOut = process.argv.includes('--json');
  const all = [];
  for (const { codebase, dirs } of TARGETS) {
    for (const d of dirs) {
      const abs = path.join(root, d);
      for (const f of walk(abs)) all.push(...scanFile(f, codebase));
    }
  }
  const errors = all.filter((f) => f.severity === 'error');
  if (jsonOut) {
    console.log(JSON.stringify({ findings: all, errorCount: errors.length }, null, 2));
  } else {
    for (const f of all) {
      console.log(`${f.severity.toUpperCase()} ${f.file}:${f.line} [${f.rule}] ${f.message}`);
    }
    console.log(`\nTotal: ${all.length} (${errors.length} errors)`);
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
