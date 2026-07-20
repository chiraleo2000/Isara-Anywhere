/**
 * Unit tests for issara-jitsi recording/pipeline modules:
 * pipelineRetry, recordingAccess, recordingCrypto, recordingCleanup
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, isTransientError } from '@meeting/pipelineRetry.js';
import {
  isAdminUser,
  isDoctorRole,
  isPatientRole,
  assertCanAccessMeetingRecording,
  filterRecordingsForUser,
  buildSecureRecordingUrl,
} from '@meeting/recordingAccess.js';
import {
  encryptRecordingBuffer,
  decryptRecordingBuffer,
  trimTrailingNullBytes,
  resetEncryptionKeyCacheForTests,
  isRecordingEncryptionEnabled,
} from '@meeting/recordingCrypto.js';
import {
  cleanupEphemeralRecordingAfterPersist,
  cleanupJibriSourceFile,
  sweepEmptyRecordingDirs,
} from '@meeting/recordingCleanup.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('@meeting/chaosLatency.js', () => ({
  applyChaosLatency: vi.fn(async () => undefined),
}));

describe('pipelineRetry', () => {
  it('returns on first success', async () => {
    const fn = vi.fn(async () => 'ok');
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('done');
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, label: 't' })).resolves.toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('stops when shouldRetry returns false', async () => {
    const err = new Error('permanent');
    const fn = vi.fn().mockRejectedValue(err);
    await expect(
      withRetry(fn, { maxAttempts: 5, baseDelayMs: 1, shouldRetry: () => false }),
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exhausts attempts and rethrows last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('gateway timeout'));
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow('gateway timeout');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('isTransientError detects status and message patterns', () => {
    expect(isTransientError({ status: 503, message: 'x' })).toBe(true);
    expect(isTransientError({ statusCode: 429, message: 'rate' })).toBe(true);
    expect(isTransientError(new Error('fetch failed'))).toBe(true);
    expect(isTransientError(new Error('econnreset'))).toBe(true);
    expect(isTransientError(new Error('permanent boom'))).toBe(false);
  });
});

describe('recordingAccess', () => {
  const meeting = { doctor_id: 'd1', patient_id: 'p1' };

  it('role helpers', () => {
    expect(isAdminUser({ role: 'admin' })).toBe(true);
    expect(isAdminUser({ isAdmin: true })).toBe(true);
    expect(isDoctorRole({ role: 'doctor' })).toBe(true);
    expect(isDoctorRole({ role: 'moderator' })).toBe(true);
    expect(isDoctorRole({ doctorId: 'd1' })).toBe(true);
    expect(isPatientRole({ role: 'patient' })).toBe(true);
    expect(isPatientRole({ role: 'doctor' })).toBe(false);
  });

  it('denies unauthenticated / missing meeting', () => {
    expect(assertCanAccessMeetingRecording({ user: null, meeting })).toMatchObject({
      allowed: false,
      status: 401,
    });
    expect(
      assertCanAccessMeetingRecording({ user: { role: 'doctor', id: 'd1' }, meeting: null }),
    ).toMatchObject({ allowed: false, status: 404 });
  });

  it('allows admin and matching doctor/patient', () => {
    expect(assertCanAccessMeetingRecording({ user: { role: 'admin' }, meeting }).allowed).toBe(true);
    expect(
      assertCanAccessMeetingRecording({ user: { role: 'doctor', id: 'd1' }, meeting }).allowed,
    ).toBe(true);
    expect(
      assertCanAccessMeetingRecording({
        user: { role: 'doctor', doctorId: 'd1' },
        meeting,
      }).allowed,
    ).toBe(true);
    expect(
      assertCanAccessMeetingRecording({ user: { role: 'patient', id: 'p1' }, meeting }).allowed,
    ).toBe(true);
    expect(
      assertCanAccessMeetingRecording({ user: { role: 'patient', id: 'other' }, meeting }).allowed,
    ).toBe(false);
  });

  it('denies guests', () => {
    expect(
      assertCanAccessMeetingRecording({
        user: { role: 'guest', id: 'g1' },
        meeting,
      }),
    ).toMatchObject({ allowed: false, status: 403 });
    expect(
      assertCanAccessMeetingRecording({
        user: { type: 'guest-invite', id: 'g1' },
        meeting,
      }),
    ).toMatchObject({ allowed: false, status: 403 });
  });

  it('filterRecordingsForUser keeps visible rows', () => {
    const rows = [
      { doctor_id: 'd1', patient_id: 'p1' },
      { doctor_id: 'd2', patient_id: 'p9' },
    ];
    expect(filterRecordingsForUser(rows, { role: 'admin' })).toHaveLength(2);
    expect(filterRecordingsForUser(rows, { role: 'doctor', id: 'd1' })).toHaveLength(1);
    expect(filterRecordingsForUser(null as unknown as [], { role: 'admin' })).toEqual([]);
  });

  it('buildSecureRecordingUrl avoids gs:// leakage', () => {
    expect(buildSecureRecordingUrl({ doctorId: 'd1', meetingId: 'm1', filename: 'a.webm' })).toBe(
      '/api/recordings/meetings/d1/m1/a.webm',
    );
    expect(buildSecureRecordingUrl({ doctorId: 'd1', meetingId: 'm1', filename: undefined })).toContain(
      'video.webm',
    );
  });
});

describe('recordingCrypto', () => {
  beforeEach(() => {
    resetEncryptionKeyCacheForTests();
    process.env.RECORDING_ENCRYPTION_KEY = 'unit-test-recording-key';
  });
  afterEach(() => {
    resetEncryptionKeyCacheForTests();
    delete process.env.RECORDING_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
  });

  it('encrypt/decrypt round trip', () => {
    expect(isRecordingEncryptionEnabled()).toBe(true);
    const plain = Buffer.from('webm-bytes-here');
    const { buffer, encrypted } = encryptRecordingBuffer(plain);
    expect(encrypted).toBe(true);
    expect(buffer.subarray(0, 9).toString()).toBe('IZARAENC1');
    const back = decryptRecordingBuffer(buffer);
    expect(Buffer.compare(back, plain)).toBe(0);
  });

  it('passes through plaintext without magic header', () => {
    const plain = Buffer.from('not-encrypted');
    expect(Buffer.compare(decryptRecordingBuffer(plain), plain)).toBe(0);
  });

  it('returns unencrypted when key missing', () => {
    delete process.env.RECORDING_ENCRYPTION_KEY;
    resetEncryptionKeyCacheForTests();
    expect(isRecordingEncryptionEnabled()).toBe(false);
    const plain = Buffer.from('x');
    expect(encryptRecordingBuffer(plain)).toEqual({ buffer: plain, encrypted: false });
  });

  it('derives key from JWT_SECRET when RECORDING_ENCRYPTION_KEY unset', () => {
    delete process.env.RECORDING_ENCRYPTION_KEY;
    process.env.JWT_SECRET = 'jwt-for-recording-unit';
    resetEncryptionKeyCacheForTests();
    expect(isRecordingEncryptionEnabled()).toBe(true);
    const plain = Buffer.from('jwt-key-roundtrip');
    const { buffer, encrypted } = encryptRecordingBuffer(plain);
    expect(encrypted).toBe(true);
    expect(Buffer.compare(decryptRecordingBuffer(buffer), plain)).toBe(0);
  });

  it('trimTrailingNullBytes', () => {
    const buf = Buffer.from([1, 2, 3, 0, 0]);
    expect([...trimTrailingNullBytes(buf)]).toEqual([1, 2, 3]);
    expect(trimTrailingNullBytes(Buffer.alloc(0))).toEqual(Buffer.alloc(0));
  });
});

describe('recordingCleanup', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'izara-rec-cleanup-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    delete process.env.RECORDING_LOCAL_RETENTION;
  });

  it('cleanupEphemeralRecordingAfterPersist respects keep mode', () => {
    process.env.RECORDING_LOCAL_RETENTION = 'keep';
    const videoPath = path.join(tmpRoot, 'video.webm');
    fs.writeFileSync(videoPath, 'x');
    const result = cleanupEphemeralRecordingAfterPersist({
      paths: { videoPath },
      gcsUri: 'gs://bucket/x',
    });
    expect(result.skipped).toBe(true);
    expect(fs.existsSync(videoPath)).toBe(true);
  });

  it('deletes local video after persist when mode is delete', () => {
    process.env.RECORDING_LOCAL_RETENTION = 'delete';
    const dir = path.join(tmpRoot, 'meet-1');
    fs.mkdirSync(dir);
    const videoPath = path.join(dir, 'video.webm');
    fs.writeFileSync(videoPath, 'bytes');
    const result = cleanupEphemeralRecordingAfterPersist({
      paths: { videoPath, dir },
      gcsUri: 'gs://bucket/x',
    });
    expect(result.skipped).toBe(false);
    expect(result.removed).toContain(videoPath);
    expect(fs.existsSync(videoPath)).toBe(false);
  });

  it('delete_after_gcs only deletes when gcsUri present', () => {
    process.env.RECORDING_LOCAL_RETENTION = 'delete_after_gcs';
    const videoPath = path.join(tmpRoot, 'v.webm');
    fs.writeFileSync(videoPath, 'x');
    expect(
      cleanupEphemeralRecordingAfterPersist({ paths: { videoPath } }).skipped,
    ).toBe(true);
    expect(fs.existsSync(videoPath)).toBe(true);

    const r2 = cleanupEphemeralRecordingAfterPersist({
      paths: { videoPath },
      gcsUri: 'gs://b/o',
    });
    expect(r2.skipped).toBe(false);
    expect(fs.existsSync(videoPath)).toBe(false);
  });

  it('cleanupJibriSourceFile removes distinct drop path', () => {
    const drop = path.join(tmpRoot, 'jibri-drop.mp4');
    const canonical = path.join(tmpRoot, 'canonical.webm');
    fs.writeFileSync(drop, 'drop');
    fs.writeFileSync(canonical, 'canon');
    expect(cleanupJibriSourceFile(drop, canonical)).toBe(true);
    expect(fs.existsSync(drop)).toBe(false);
    expect(cleanupJibriSourceFile(canonical, canonical)).toBe(false);
    expect(cleanupJibriSourceFile('/missing', canonical)).toBe(false);
  });

  it('sweepEmptyRecordingDirs removes aged empty dirs', () => {
    const emptyDir = path.join(tmpRoot, 'old-empty');
    fs.mkdirSync(emptyDir);
    const old = Date.now() - 7200_000;
    fs.utimesSync(emptyDir, new Date(old), new Date(old));
    const count = sweepEmptyRecordingDirs(tmpRoot, 3600_000);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(emptyDir)).toBe(false);
  });
});
