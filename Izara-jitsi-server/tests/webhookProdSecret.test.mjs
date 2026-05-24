import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateJibriWebhookRequest } from '../server/jibriWebhook.js';

describe('webhookProdSecret', () => {
  it('rejects wrong secret when expected set', () => {
    const r = validateJibriWebhookRequest(
      { meetingId: 'm1', localFilePath: '/tmp/x.mp4' },
      { expectedSecret: 'secret', providedSecret: 'wrong' },
    );
    assert.equal(r.ok, false);
    assert.equal(r.status, 401);
  });

  it('allows when secret matches', () => {
    const r = validateJibriWebhookRequest(
      { meetingId: 'm1', videoBase64: 'abc' },
      { expectedSecret: 'secret', providedSecret: 'secret' },
    );
    assert.equal(r.ok, true);
  });

  it('allows open webhook when secret unset (dev only)', () => {
    const r = validateJibriWebhookRequest(
      { meetingId: 'm1', localFilePath: '/tmp/x.mp4' },
      { expectedSecret: undefined, providedSecret: undefined },
    );
    assert.equal(r.ok, true);
  });
});
