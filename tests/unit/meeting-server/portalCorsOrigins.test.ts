/**
 * @process Processes/ENV_AND_STACK_CHECK.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function readEnvExample(name: string): string {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}

describe('portalCorsOrigins — Docker LAN contract', () => {
  it('CORS-01 — .env.docker.example lists portal origins for :3005/:3010/:3020', () => {
    const env = readEnvExample('.env.docker.example');
    expect(env).toMatch(/CORS_ORIGINS/);
    expect(env).toMatch(/3005|3010|3020/);
  });

  it('CORS-02 — meeting server example sets MEETING_SERVER_URL for containers', () => {
    const docker = readEnvExample('.env.docker.example');
        const doctor = readEnvExample('issara-doctor/.env');
        const patient = readEnvExample('issara-patient/.env');
        expect(docker + doctor + patient).toMatch(/MEETING_SERVER_URL|VITE_MEETING_SERVER_URL/);
  });

  it('CORS-03 — docker-compose exposes meeting-server on 3020', () => {
    const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
    expect(compose).toMatch(/meeting-server/);
    expect(compose).toMatch(/3020/);
  });
});
