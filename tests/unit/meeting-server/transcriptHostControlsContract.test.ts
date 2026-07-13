/**
 * Transcript host controls — start/pause/resume/stop transcription routes + state machine.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

type TranscriptState = 'idle' | 'recording' | 'paused' | 'stopped';

function transitionTranscript(state: TranscriptState, action: string): TranscriptState {
  const table: Record<TranscriptState, Record<string, TranscriptState>> = {
    idle: { start: 'recording' },
    recording: { pause: 'paused', stop: 'stopped' },
    paused: { resume: 'recording', stop: 'stopped' },
    stopped: {},
  };
  const next = table[state]?.[action];
  if (!next) throw new Error(`invalid transition ${state} + ${action}`);
  return next;
}

describe('transcriptHostControlsContract — source routes', () => {
  it('THC-01 — Izara-jitsi-server index.js has start/pause/resume/stop-transcription', () => {
    const src = fs.readFileSync(path.join(root, 'Izara-jitsi-server/backend/index.js'), 'utf8');
    for (const route of [
      'start-transcription',
      'pause-transcription',
      'resume-transcription',
      'stop-transcription',
    ]) {
      expect(src, `missing route: ${route}`).toContain(route);
    }
  });
});

describe('transcriptHostControlsContract — state machine', () => {
  it('THC-02 — idle→recording→paused→recording→stopped', () => {
    let state: TranscriptState = 'idle';
    state = transitionTranscript(state, 'start');
    expect(state).toBe('recording');
    state = transitionTranscript(state, 'pause');
    expect(state).toBe('paused');
    state = transitionTranscript(state, 'resume');
    expect(state).toBe('recording');
    state = transitionTranscript(state, 'stop');
    expect(state).toBe('stopped');
  });
});
