/**
 * Code Breaker Round 2 — malformed payloads must return 4xx (not 500)
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import {
  sanitizeRouteId,
  assertJsonObjectBody,
  parseBase64Payload,
  sendValidationError,
} from '../server/requestValidation.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      resolve({
        server,
        base: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

describe('Code Breaker Round 2 — validation unit', () => {
  it('CB2-V01 — rejects null-byte meeting id', () => {
    const r = sanitizeRouteId('apt\x00evil');
    assert.equal(r.ok, false);
    assert.equal(r.status, 400);
  });

  it('CB2-V02 — rejects non-object body', () => {
    const r = assertJsonObjectBody(['array']);
    assert.equal(r.ok, false);
  });

  it('CB2-V03 — rejects invalid base64 type', () => {
    const r = parseBase64Payload({ x: 1 }, 'audioBase64');
    assert.equal(r.ok, false);
    assert.equal(r.code, 'INVALID_FIELD');
  });
});

describe('Code Breaker Round 2 — HTTP corruption (mini app)', () => {
  let ctx;

  before(async () => {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.param('id', (req, res, next, id) => {
      const check = sanitizeRouteId(id);
      if (!check.ok) return sendValidationError(res, check);
      req.params.id = check.id;
      next();
    });
    app.post('/api/meetings/:id/save-recording', (req, res) => {
      const idCheck = sanitizeRouteId(req.params.id);
      if (!idCheck.ok) return sendValidationError(res, idCheck);
      const bodyCheck = assertJsonObjectBody(req.body);
      if (!bodyCheck.ok) return sendValidationError(res, bodyCheck);
      const parsed = parseBase64Payload(req.body?.audioBase64, 'audioBase64');
      if (!parsed.ok) return sendValidationError(res, parsed);
      return res.json({ success: true });
    });
    app.use((err, req, res, next) => {
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_JSON' });
      }
      next(err);
    });
    ctx = await listen(app);
  });

  after(async () => {
    if (ctx) await ctx.close();
  });

  it('CB2-H01 — malformed JSON returns 400', async () => {
    const res = await fetch(`${ctx.base}/api/meetings/apt-1/save-recording`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    assert.equal(res.status, 400);
  });

  it('CB2-H02 — empty body object returns 400', async () => {
    const res = await fetch(`${ctx.base}/api/meetings/apt-1/save-recording`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });

  it('CB2-H03 — invalid route id returns 400', async () => {
    const badId = `bad-${String.fromCharCode(0)}id`;
    const res = await fetch(`${ctx.base}/api/meetings/${encodeURIComponent(badId)}/save-recording`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: Buffer.alloc(2048).toString('base64') }),
    });
    assert.equal(res.status, 400);
  });
});
