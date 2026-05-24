import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveActorUserId } from '../server/meetingAuth.js';

describe('Round 2 — playback auth actor id', () => {
  it('R2-A01 — resolveActorUserId accepts userId claim from doctor portal JWT', () => {
    assert.equal(resolveActorUserId({ userId: 'DOC-TEST-001' }), 'DOC-TEST-001');
    assert.equal(resolveActorUserId({ id: 'DOC-TEST-001' }), 'DOC-TEST-001');
    assert.equal(resolveActorUserId({ sub: 'DOC-TEST-001' }), 'DOC-TEST-001');
  });
});
