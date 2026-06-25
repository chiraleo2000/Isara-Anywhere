'use strict';
/**
 * Unified Izara CORS policy — allow only CORS_ORIGINS (+ localhost/LAN defaults).
 * Used by doctor/patient/meeting backends and Socket.IO.
 */

const CLOUD_RUN_PATTERN =
  /^https:\/\/izara-[a-z0-9-]+(-hvht4obouq-as\.a\.run\.app|-724889190329\.asia-southeast1\.run\.app)$/;

const LOCAL_DEV_ORIGINS = [
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3010',
  'http://localhost:3011',
  'http://localhost:3020',
  'http://localhost:5173',
  'http://127.0.0.1:3004',
  'http://127.0.0.1:3005',
  'http://127.0.0.1:3010',
  'http://127.0.0.1:3020',
  'http://0.0.0.0:3005',
  'http://0.0.0.0:3010',
  'http://host.docker.internal:3005',
  'http://host.docker.internal:3010',
  'http://host.docker.internal:3020',
];

/** Mode B Nginx LAN subdomains (see deploy/nginx/isara-nginx.conf). */
const LAN_DEV_ORIGINS = [
  'http://patient.demotoday.net',
  'http://doctor.demotoday.net',
  'http://meeting.demotoday.net',
  'http://dbadmin.demotoday.net',
  'https://patient.demotoday.net',
  'https://doctor.demotoday.net',
  'https://meeting.demotoday.net',
  'https://dbadmin.demotoday.net',
  'http://patient.isara.local',
  'http://doctor.isara.local',
  'http://meeting.isara.local',
  'http://dbadmin.isara.local',
  'https://patient.isara.local',
  'https://doctor.isara.local',
  'https://meeting.isara.local',
  'https://dbadmin.isara.local',
  'http://patient.local',
  'http://doctor.local',
  'http://meeting.local',
  'http://dbadmin.local',
  'https://patient.local',
  'https://doctor.local',
  'https://meeting.local',
  'https://dbadmin.local',
];

/** Matches http(s)://<subdomain>.demotoday.net for LAN deploy without listing every host in .env. */
const LAN_DEMOTODAY_PATTERN = /^https?:\/\/[a-z0-9-]+\.demotoday\.net$/;

/** Matches http(s)://<subdomain>.isara.local for legacy LAN deploy. */
const LAN_SUBDOMAIN_PATTERN = /^https?:\/\/[a-z0-9-]+\.isara\.local$/;

/** Matches http(s)://patient.local, doctor.local, etc. (short LAN hostnames). */
const LAN_DOT_LOCAL_PATTERN = /^https?:\/\/(patient|doctor|meeting|dbadmin)\.local$/;

const PRODUCTION_ORIGINS = [
  'https://doctor.izara.com',
  'https://patient.izara.com',
  'https://izara.com',
  'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
  'https://izara-doctor-portal-724889190329.asia-southeast1.run.app',
  'https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app',
  'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
  'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
  'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app',
];

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

/** Build literal + glob pattern allowlist from env CORS_ORIGINS. */
function buildIzaraCorsPolicy(extraLiterals = []) {
  const envRaw = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const literals = new Set([...LOCAL_DEV_ORIGINS, ...LAN_DEV_ORIGINS, ...extraLiterals]);
  const patterns = [];

  for (const entry of envRaw) {
    if (entry.includes('*')) patterns.push(globToRegExp(entry));
    else literals.add(entry);
  }

  if (process.env.NODE_ENV === 'production') {
    for (const o of PRODUCTION_ORIGINS) literals.add(o);
  }

  return { literals, patterns, cloudRunPattern: CLOUD_RUN_PATTERN };
}

function isIzaraOriginAllowed(origin, policy) {
  if (!origin) return true;
  if (policy.literals.has(origin)) return true;
  if (LAN_DEMOTODAY_PATTERN.test(origin)) return true;
  if (LAN_SUBDOMAIN_PATTERN.test(origin)) return true;
  if (LAN_DOT_LOCAL_PATTERN.test(origin)) return true;
  if (policy.cloudRunPattern?.test(origin)) return true;
  return policy.patterns.some((re) => re.test(origin));
}

function applyCorsDecision(callback, allowed, err = null) {
  if (!allowed) {
    callback(err || new Error('CORS policy violation'), false);
    return;
  }
  callback(null, true); // NOSONAR cors-callback-true — centralized allow after origin validation
}

/** Express / Socket.IO cors origin callback. Never allows unknown origins. */
function createIzaraCorsOriginCallback(policy, options = {}) {
  const { onViolation, allowNoOrigin = true } = options;
  return function izaraCorsOrigin(origin, callback) {
    if (!origin) {
      return applyCorsDecision(callback, allowNoOrigin);
    }
    if (isIzaraOriginAllowed(origin, policy)) {
      return applyCorsDecision(callback, true);
    }
    if (typeof onViolation === 'function') onViolation(origin);
    return applyCorsDecision(callback, false, new Error('CORS policy violation'));
  };
}

module.exports = {
  buildIzaraCorsPolicy,
  isIzaraOriginAllowed,
  createIzaraCorsOriginCallback,
  applyCorsDecision,
  CLOUD_RUN_PATTERN,
  LOCAL_DEV_ORIGINS,
  LAN_DEV_ORIGINS,
  LAN_DEMOTODAY_PATTERN,
  LAN_SUBDOMAIN_PATTERN,
  LAN_DOT_LOCAL_PATTERN,
  PRODUCTION_ORIGINS,
};
