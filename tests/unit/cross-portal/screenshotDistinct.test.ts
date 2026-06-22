/**
 * Screenshot distinctness unit tests — used by E2E visual gates.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertDistinctScreenshots,
  registerScreenshotHash,
  resetScreenshotSession,
  sha256File,
} from '../../helpers/screenshot-distinct';

describe('screenshotDistinct', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'izara-ss-'));
    resetScreenshotSession('group-test');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    resetScreenshotSession('group-test');
  });

  it('SD01 — rejects duplicate PNG hashes', () => {
    const a = path.join(tmpDir, 'a.png');
    const b = path.join(tmpDir, 'b.png');
    fs.writeFileSync(a, Buffer.alloc(30_000, 1));
    fs.writeFileSync(b, Buffer.alloc(30_000, 1));
    expect(() => assertDistinctScreenshots('test', [a, b])).toThrow(/duplicate/i);
  });

  it('SD02 — accepts distinct PNG hashes', () => {
    const a = path.join(tmpDir, 'a.png');
    const b = path.join(tmpDir, 'b.png');
    fs.writeFileSync(a, Buffer.alloc(30_000, 1));
    fs.writeFileSync(b, Buffer.alloc(30_000, 2));
    expect(() => assertDistinctScreenshots('test', [a, b])).not.toThrow();
    expect(sha256File(a)).not.toBe(sha256File(b));
  });

  it('SD03 — session registry warns on duplicate step (post-run validator is authoritative)', () => {
    const file = path.join(tmpDir, 'step.png');
    fs.writeFileSync(file, Buffer.alloc(30_000, 9));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerScreenshotHash('group-test', file);
    expect(() => registerScreenshotHash('group-test', file)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/duplicates a prior step/i),
    );
    warnSpy.mockRestore();
  });
});
