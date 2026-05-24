import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

describe('recordingCrypto', () => {
  const prevJwt = process.env.JWT_SECRET;
  const prevKey = process.env.RECORDING_ENCRYPTION_KEY;

  async function load() {
    const mod = await import('../server/recordingCrypto.js');
    mod.resetEncryptionKeyCacheForTests();
    return mod;
  }

  before(async () => {
    process.env.JWT_SECRET = 'test-recording-encryption-secret';
    delete process.env.RECORDING_ENCRYPTION_KEY;
    const mod = await load();
    mod.resetEncryptionKeyCacheForTests();
  });

  after(() => {
    if (prevJwt) process.env.JWT_SECRET = prevJwt;
    else delete process.env.JWT_SECRET;
    if (prevKey) process.env.RECORDING_ENCRYPTION_KEY = prevKey;
    else delete process.env.RECORDING_ENCRYPTION_KEY;
  });

  it('CRYPTO-01 — exact buffer round-trip (no padding)', async () => {
    const { encryptRecordingBuffer, decryptRecordingBuffer } = await load();
    const plain = Buffer.from('clinical-audio-payload-exact', 'utf8');
    const { buffer: enc, encrypted } = encryptRecordingBuffer(plain);
    assert.equal(encrypted, true);
    const dec = decryptRecordingBuffer(enc);
    assert.equal(dec.compare(plain), 0);
    assert.equal(dec.toString('utf8'), 'clinical-audio-payload-exact');
  });

  it('CRYPTO-02 — padded WebM-shaped buffer trims trailing nulls with strict payload match', async () => {
    const { encryptRecordingBuffer, decryptRecordingBuffer } = await load();
    const plain = Buffer.alloc(2048);
    plain.writeUInt32BE(0x1a45dfa3, 0);
    const payload = 'clinical-audio-payload';
    plain.write(payload, 32, 'utf8');
    const { buffer: enc, encrypted } = encryptRecordingBuffer(plain);
    assert.equal(encrypted, true);
    const dec = decryptRecordingBuffer(enc);
    assert.equal(dec.subarray(32, 32 + payload.length).toString('utf8'), payload);
    assert.equal(dec.toString('utf8', 32, 32 + payload.length), payload);
    assert.ok(dec.length < plain.length);
    assert.equal(dec.readUInt32BE(0), 0x1a45dfa3);
    assert.notEqual(dec[dec.length - 1], 0);
  });

  it('CRYPTO-03 — trimTrailingNullBytes on empty and all-null buffers', async () => {
    const { trimTrailingNullBytes } = await load();
    assert.equal(trimTrailingNullBytes(Buffer.alloc(0)).length, 0);
    assert.equal(trimTrailingNullBytes(Buffer.alloc(8, 0)).length, 0);
    const mixed = Buffer.from([0x01, 0x02, 0x00, 0x00]);
    assert.deepEqual([...trimTrailingNullBytes(mixed)], [0x01, 0x02]);
  });

  it('CRYPTO-04 — non-encrypted buffer returned unchanged', async () => {
    const { decryptRecordingBuffer } = await load();
    const raw = Buffer.from('not-encrypted-webm-bytes');
    const out = decryptRecordingBuffer(raw);
    assert.equal(out.compare(raw), 0);
  });

  it('CRYPTO-05 — RECORDING_ENCRYPTION_KEY explicit strict utf8 round-trip', async () => {
    process.env.RECORDING_ENCRYPTION_KEY = 'dedicated-key-for-round-trip-tests';
    delete process.env.JWT_SECRET;
    const { encryptRecordingBuffer, decryptRecordingBuffer, resetEncryptionKeyCacheForTests } =
      await load();
    resetEncryptionKeyCacheForTests();
    const plain = Buffer.from('ไทย-strict-สรุป-clinical', 'utf8');
    const { buffer: enc, encrypted } = encryptRecordingBuffer(plain);
    assert.equal(encrypted, true);
    const dec = decryptRecordingBuffer(enc);
    assert.equal(dec.toString('utf8'), 'ไทย-strict-สรุป-clinical');
    assert.equal(dec.compare(plain), 0);
    process.env.JWT_SECRET = 'test-recording-encryption-secret';
    delete process.env.RECORDING_ENCRYPTION_KEY;
    resetEncryptionKeyCacheForTests();
  });

  it('CRYPTO-06 — single trailing null byte removed after decrypt', async () => {
    const { encryptRecordingBuffer, decryptRecordingBuffer } = await load();
    const plain = Buffer.from('edge-null\x00', 'utf8');
    const { buffer: enc } = encryptRecordingBuffer(plain);
    const dec = decryptRecordingBuffer(enc);
    assert.equal(dec.toString('utf8'), 'edge-null');
    assert.equal(dec.length, 'edge-null'.length);
  });
});
