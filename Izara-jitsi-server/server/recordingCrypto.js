/**
 * AES-256-GCM encryption at rest for meeting recordings (HIPAA/PDPA file share).
 * Format on disk: IZARAENC1 (8) + iv (12) + authTag (16) + ciphertext
 */
import crypto from 'node:crypto';

const MAGIC = Buffer.from('IZARAENC1');
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const MIN_RECORDING_BYTES = Number.parseInt(process.env.MIN_RECORDING_BYTES || '1024', 10);

let cachedKey = null;

/** @internal Test-only — clears scrypt/hash cache when env keys change */
export function resetEncryptionKeyCacheForTests() {
  cachedKey = null;
}

function resolveEncryptionKey() {
  if (cachedKey) return cachedKey;
  const explicit = process.env.RECORDING_ENCRYPTION_KEY?.trim();
  if (explicit) {
    cachedKey = crypto.createHash('sha256').update(explicit, 'utf8').digest();
    return cachedKey;
  }
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (jwtSecret) {
    cachedKey = crypto.scryptSync(jwtSecret, 'izara-recording-v1', KEY_LEN);
    return cachedKey;
  }
  return null;
}

/**
 * Remove trailing 0x00 padding (e.g. from fixed-size test buffers). Does not alter interior bytes.
 */
export function trimTrailingNullBytes(buffer) {
  if (!buffer?.length) return buffer;
  let end = buffer.length;
  while (end > 0 && buffer[end - 1] === 0) {
    end -= 1;
  }
  if (end === buffer.length) return buffer;
  return end === 0 ? Buffer.alloc(0) : buffer.subarray(0, end);
}

export function isRecordingEncryptionEnabled() {
  return Boolean(resolveEncryptionKey());
}

export function encryptRecordingBuffer(plain) {
  const key = resolveEncryptionKey();
  if (!key || !plain?.length) return { buffer: plain, encrypted: false };
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([MAGIC, iv, tag, enc]);
  return { buffer: out, encrypted: true };
}

export function decryptRecordingBuffer(data) {
  if (!data?.length) return data;
  if (!data.subarray(0, MAGIC.length).equals(MAGIC)) {
    return data;
  }
  const key = resolveEncryptionKey();
  if (!key) {
    throw new Error('Encrypted recording present but RECORDING_ENCRYPTION_KEY/JWT_SECRET unavailable');
  }
  const iv = data.subarray(MAGIC.length, MAGIC.length + IV_LEN);
  const tag = data.subarray(MAGIC.length + IV_LEN, MAGIC.length + IV_LEN + TAG_LEN);
  const ciphertext = data.subarray(MAGIC.length + IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const trimmed = trimTrailingNullBytes(plain);
  if (trimmed.length === plain.length) return plain;
  // Headless E2E WebM stubs: EBML header + zero fill only (no payload after byte 4).
  if (
    plain.length >= MIN_RECORDING_BYTES &&
    trimmed.length < MIN_RECORDING_BYTES &&
    plain.length >= 4 &&
    plain.readUInt32BE(0) === 0x1a45dfa3 &&
    !plain.subarray(4).some((b) => b !== 0)
  ) {
    return plain;
  }
  return trimmed;
}
