import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeRouteId,
  assertJsonObjectBody,
  parseBase64Payload,
} from '../server/requestValidation.js';

describe('requestValidation', () => {
  it('RV-01 — path traversal in id blocked', () => {
    assert.equal(sanitizeRouteId('../etc').ok, false);
  });

  it('RV-02 — valid id passes', () => {
    assert.equal(sanitizeRouteId('APT-123-abc').ok, true);
  });

  it('RV-03 — parseBase64Payload accepts minimal buffer', () => {
    const r = parseBase64Payload(Buffer.alloc(2048).toString('base64'), 'audioBase64');
    assert.equal(r.ok, true);
    assert.ok(r.buffer.length >= 2048);
  });
});
