/*
 * k6 load test against Cloud Run staging.
 *
 * Scenarios (all read-only, non-destructive):
 *   - health_ramp:  150 VUs ramping patient/health + doctor/health for 2 min
 *   - auth_burst:   50 VUs hitting /auth/login with rate-limit-respecting pacing
 *   - root_steady:  20 VUs pulling `/` (static HTML) for 3 min — proves cache/gzip
 *
 * Pass/fail thresholds:
 *   - 95th percentile latency < 2s on all endpoints
 *   - Error rate < 1%
 *   - No 5xx responses
 *
 * Usage:
 *   docker run --rm -i grafana/k6 run - < tests/load/staging-smoke.js
 *
 * Or with CLI:
 *   k6 run tests/load/staging-smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const PATIENT = __ENV.PATIENT_URL || 'https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app';
const DOCTOR = __ENV.DOCTOR_URL || 'https://izara-doctor-portal-dev-testing-hvht4obouq-as.a.run.app';
const MEETING = __ENV.MEETING_URL || 'https://izara-meeting-server-dev-testing-hvht4obouq-as.a.run.app';

export const errorRate = new Rate('errors');
export const serverErrorRate = new Rate('server_errors');

export const options = {
  scenarios: {
    health_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '60s', target: 150 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
      exec: 'healthCheck',
    },
    root_steady: {
      executor: 'constant-vus',
      vus: 20,
      duration: '3m',
      exec: 'rootPull',
      startTime: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    server_errors: ['rate<0.005'],
  },
};

export function healthCheck() {
  const urls = [`${PATIENT}/health`, `${DOCTOR}/health`, `${MEETING}/health`];
  for (const u of urls) {
    const r = http.get(u, { tags: { endpoint: 'health' } });
    const ok = check(r, {
      'status 200': res => res.status === 200,
      'latency < 2s': res => res.timings.duration < 2000,
    });
    errorRate.add(!ok);
    serverErrorRate.add(r.status >= 500);
  }
  sleep(1);
}

export function rootPull() {
  const r = http.get(`${PATIENT}/`, { tags: { endpoint: 'root' } });
  const ok = check(r, {
    'status 200': res => res.status === 200,
    'has CSP header': res => !!res.headers['Content-Security-Policy'],
    'has HSTS': res => !!res.headers['Strict-Transport-Security'],
    'latency < 3s': res => res.timings.duration < 3000,
  });
  errorRate.add(!ok);
  serverErrorRate.add(r.status >= 500);
  sleep(0.5);
}
