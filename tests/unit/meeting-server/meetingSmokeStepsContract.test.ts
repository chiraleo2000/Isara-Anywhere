/**
 * @process Processes/POST_MEETING_WORKFLOW.md
 * Contract: meeting-api-smoke.mjs required steps (regression guard).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const smoke = fs.readFileSync(
  path.resolve(__dirname, '../../../scripts/docker/meeting-api-smoke.mjs'),
  'utf8',
);

const REQUIRED_STEPS = [
  'health',
  'config',
  'create',
  'host-present',
  'host-absent',
  'host-ready',
  'lobby-join',
  'join-config',
  'lobby-admit-all',
  'auto-record',
  'save-recording',
  'results-recordingUrl',
];

describe('meetingSmokeStepsContract', () => {
  it('SMOKE-01 — smoke script covers full meeting lifecycle', () => {
    for (const step of REQUIRED_STEPS) {
      expect(smoke).toContain(step);
    }
  });

  it('SMOKE-02 — smoke posts save-recording with audioBase64', () => {
    expect(smoke).toMatch(/save-recording/);
    expect(smoke).toMatch(/audioBase64/);
    expect(smoke).toMatch(/buildMinimalWebmBase64/);
  });

  it('SMOKE-03 — smoke polls GET /results for recordingUrl', () => {
    expect(smoke).toMatch(/\/results/);
    expect(smoke).toMatch(/recordingUrl/);
  });
});
