import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  verifyAccessToken,
  verifyScopedToken,
  signScopedToken,
  JWT_ISSUER,
} from '../server/jwtPolicy.js';

const SECRET = 'jwt-policy-test-secret-32chars-min!!';

describe('jwtPolicy', () => {
  it('verifies token with issuer', () => {
    const token = jwt.sign({ role: 'doctor', userId: 'd1' }, SECRET, {
      issuer: JWT_ISSUER,
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    const decoded = verifyAccessToken(token, SECRET);
    assert.equal(decoded.userId, 'd1');
  });

  it('rejects expired token', () => {
    const token = jwt.sign({ role: 'doctor' }, SECRET, {
      issuer: JWT_ISSUER,
      algorithm: 'HS256',
      expiresIn: '-1s',
    });
    assert.throws(() => verifyAccessToken(token, SECRET));
  });

  it('scoped share token verifies without issuer', () => {
    const token = signScopedToken(
      { type: 'recording-share', meetingId: 'm1', filename: 'a.webm' },
      SECRET,
      { expiresIn: '1h' },
    );
    const decoded = verifyScopedToken(token, SECRET);
    assert.equal(decoded.type, 'recording-share');
  });
});
