/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md, Processes/POST_MEETING_WORKFLOW.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Meeting BFF proxy contracts', () => {
  const doctorProxy = fs.readFileSync(
    path.join(root, 'issara-doctor/backend/routes/meetings.cjs'),
    'utf8',
  );
  const patientProxy = fs.readFileSync(
    path.join(root, 'issara-patient/backend/routes/video-meeting-proxy.ts'),
    'utf8',
  );

  it('BFF-01 — doctor portal proxies results and post-meeting AI routes', () => {
    expect(doctorProxy).toMatch(/MEETING_SERVER_URL|VITE_MEETING_SERVER_URL/);
    expect(doctorProxy).toMatch(/sessionToken/);
    expect(doctorProxy).toMatch(/resolveSessionTokenFromRequest/);
    expect(doctorProxy).toMatch(/headers\.Cookie|headers\[['"]Cookie['"]\]/);
    const recordingIdx = doctorProxy.indexOf("'/api/meetings/recording-stream'");
    const idIdx = doctorProxy.indexOf("'/api/meetings/:id'");
    expect(recordingIdx, 'recording-stream before :id').toBeGreaterThan(-1);
    expect(idIdx, ':id route present').toBeGreaterThan(-1);
    expect(recordingIdx, 'recording-stream must precede :id').toBeLessThan(idIdx);
    expect(doctorProxy).toMatch(/\/api\/meetings\/:id\/results/);
    expect(doctorProxy).toMatch(/\/api\/meetings\/:id\/pipeline-status/);
    expect(doctorProxy).toMatch(/\/api\/meetings\/recording-stream/);
    expect(doctorProxy).toMatch(/save-recording/);
    expect(doctorProxy).toMatch(/\/api\/meetings\/:id\/end/);
    expect(doctorProxy).toMatch(/lobby\/admit-all/);
    expect(doctorProxy).toMatch(/generate-summary/);
    expect(doctorProxy).toMatch(/patient-instruction/);
    expect(doctorProxy).toMatch(/503.*Meeting server not configured/);
  });

  it('BFF-02 — patient portal video-meeting proxy maps create/join/end to meeting-server', () => {
    expect(patientProxy).toMatch(/\/api\/meetings\/create/);
    expect(patientProxy).toMatch(/lobby\/join/);
    expect(patientProxy).toMatch(/\/end/);
    expect(patientProxy).toMatch(/generate-summary/);
    expect(patientProxy).toMatch(/502.*Meeting server unavailable/);
    expect(patientProxy).toMatch(/MEETING_SERVER_URL|VITE_MEETING_SERVER_URL/);
  });

  it('BFF-02b — patient proxy forwards session cookies and resolves cookie auth', () => {
    expect(patientProxy).toMatch(/headers\.Cookie|headers\[['"]Cookie['"]\]/);
    expect(patientProxy).toMatch(/resolveUpstreamAuth|sessionToken/);
    expect(patientProxy).toMatch(/auth_token|izara_session/);
    expect(patientProxy).toMatch(/Authorization.*Bearer/);
  });

  it('BFF-03 — patient proxy mounted at /api/video-meeting in backend index', () => {
    const index = fs.readFileSync(path.join(root, 'issara-patient/backend/index.ts'), 'utf8');
    expect(index).toMatch(/video-meeting-proxy/);
    expect(index).toMatch(/\/api\/video-meeting/);
  });

  it('BFF-04 — doctor meetings proxy registered in mainApiServer', () => {
    const main = fs.readFileSync(path.join(root, 'issara-doctor/backend/mainApiServer.cjs'), 'utf8');
    expect(main).toMatch(/meetings\.cjs|registerMeetingProxyRoutes/);
  });

  it('BFF-05 — patient portal runtime env-config injection for LAN', () => {
    const dockerfile = fs.readFileSync(path.join(root, 'issara-patient/Dockerfile.unified'), 'utf8');
    const entrypoint = fs.readFileSync(path.join(root, 'issara-patient/docker-entrypoint.sh'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(root, 'issara-patient/frontend/index.html'), 'utf8');
    expect(dockerfile).toMatch(/docker-entrypoint\.sh/);
    expect(entrypoint).toMatch(/env-config\.template\.js/);
    expect(entrypoint).toMatch(/envsubst/);
    expect(indexHtml).toMatch(/env-config\.js/);
    expect(fs.existsSync(path.join(root, 'issara-patient/public/env-config.template.js'))).toBe(true);
  });
});
