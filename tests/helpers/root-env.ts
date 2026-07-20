/**
 * Read-only loader for repo-root `.env`.
 * Never writes or modifies `.env`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_ENV_PATH = path.resolve(__dirname, '../../.env');

let cachedFileVars: Record<string, string> | null = null;

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

export function readRootEnvFile(): Record<string, string> {
  if (cachedFileVars) return cachedFileVars;
  const out: Record<string, string> = {};
  if (!fs.existsSync(ROOT_ENV_PATH)) {
    cachedFileVars = out;
    return out;
  }
  for (const line of fs.readFileSync(ROOT_ENV_PATH, 'utf8').split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed) out[parsed.key] = parsed.value;
  }
  cachedFileVars = out;
  return out;
}

export function applyRootEnvReadOnly(): void {
  for (const [key, value] of Object.entries(readRootEnvFile())) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function pick(...keys: string[]): string {
  applyRootEnvReadOnly();
  for (const key of keys) {
    const v = process.env[key];
    if (v && v.trim()) return v.trim().replace(/\/$/, '');
  }
  return '';
}

export function cloudPatientUrl(fallback?: string): string {
  return (
    pick('CLOUD_PATIENT_URL', 'CLOUD_RUN_PATIENT_URL', 'PRODUCTION_API_URL') ||
    fallback ||
    ''
  );
}

export function cloudDoctorUrl(fallback?: string): string {
  return pick('CLOUD_DOCTOR_URL', 'CLOUD_RUN_DOCTOR_URL') || fallback || '';
}

export function cloudMeetingUrl(fallback?: string): string {
  // Prefer explicit cloud URLs only — never docker-compose MEETING_SERVER_URL
  // (e.g. http://meeting-server:3020) which is unreachable from the host/Playwright.
  const picked = pick('CLOUD_MEETING_URL', 'CLOUD_RUN_MEETING_URL');
  if (picked && !/meeting-server|host\.docker\.internal/i.test(picked)) return picked;
  return fallback || '';
}
