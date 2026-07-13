/**
 * @process Processes/WORKFLOW_CONNECTIONS.md — ports / topology / env contract
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('workflowConnectionsContract', () => {
  it('WC-01 — WORKFLOW_CONNECTIONS.md exists', () => {
    expect(fs.existsSync(path.join(root, 'Processes/WORKFLOW_CONNECTIONS.md'))).toBe(true);
  });

  it('WC-02 — ports/topology strings: 3005, 3010, 3020, data_changes, doctor-, queue-', () => {
    const doc = fs.readFileSync(path.join(root, 'Processes/WORKFLOW_CONNECTIONS.md'), 'utf8');
    // Socket room / NOTIFY topology lives in Data_Sync catalog linked from §4
    const dataSync = fs.readFileSync(
      path.join(root, 'Processes/Data_Sync_Documentation.md'),
      'utf8',
    );
    expect(doc).toMatch(/Data_Sync_Documentation/);
    const topology = `${doc}\n${dataSync}`;
    for (const token of ['3005', '3010', '3020', 'data_changes', 'doctor-', 'queue-']) {
      expect(topology, `missing topology token: ${token}`).toContain(token);
    }
  });

  it('WC-03 — .env.docker.example mentions JWT_SECRET and PATIENT_PORTAL_URL', () => {
    const envEx = fs.readFileSync(path.join(root, '.env.docker.example'), 'utf8');
    expect(envEx).toMatch(/JWT_SECRET/);
    expect(envEx).toMatch(/PATIENT_PORTAL_URL/);
  });
});
