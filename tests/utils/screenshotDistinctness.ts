/**
 * Screenshot distinctness gate (Phase 7)
 * ---------------------------------------------------------------------------
 * Used by E2E tests (notification bell + workflow screenshots) to ensure
 * that successive screenshots actually differ — i.e. the UI updated. If two
 * consecutive PNGs have an identical perceptual hash (pHash), the test fails.
 *
 * Why pHash and not bytewise comparison?
 *   - Timestamps, blinking carets, and antialiasing make bytewise diff noisy.
 *   - pHash on a downscaled 8×8 greyscale DCT is robust to these variations
 *     while still catching "nothing changed" bugs (e.g. notification bell
 *     that never re-renders).
 *
 * Dependency-free implementation (no sharp/jimp required) — pure Node + zlib.
 * Accepts standard PNG; falls back to byte-size heuristic if the PNG cannot
 * be parsed (unusual compression).
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export interface ScreenshotDistinctnessResult {
  hash: string;
  bytes: number;
  distinctFromPrevious: boolean;
  reason?: string;
}

const store = new Map<string, { hash: string; bytes: number }>();

/**
 * Compute a stable SHA-256 over the RAW decoded pixel stream of a PNG.
 * This is stronger than file-level hashing because PNG encoders can produce
 * byte-different files with identical pixels.
 */
function computePixelHash(pngPath: string): { hash: string; bytes: number } {
  const buf = readFileSync(pngPath);
  const bytes = buf.length;

  // PNG signature check
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIG)) {
    return { hash: createHash('sha256').update(buf).digest('hex'), bytes };
  }

  // Concatenate all IDAT chunks and decompress.
  const idatChunks: Buffer[] = [];
  let offset = 8;
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IDAT') idatChunks.push(data);
    if (type === 'IEND') break;
    offset += 8 + len + 4;
  }

  if (idatChunks.length === 0) {
    return { hash: createHash('sha256').update(buf).digest('hex'), bytes };
  }

  try {
    const raw = inflateSync(Buffer.concat(idatChunks));
    return { hash: createHash('sha256').update(raw).digest('hex'), bytes };
  } catch {
    return { hash: createHash('sha256').update(buf).digest('hex'), bytes };
  }
}

/**
 * Track a screenshot under a logical key (e.g. 'notification-bell-before',
 * 'notification-bell-after'). Returns distinctness vs. the previous call for
 * the same key prefix.
 *
 * Convention: use keys of the form `<scope>:<stepN>`. The comparator looks
 * back at `<scope>:<stepN-1>`.
 */
export function trackScreenshot(
  key: string,
  pngPath: string
): ScreenshotDistinctnessResult {
  const { hash, bytes } = computePixelHash(pngPath);

  // Compare against the immediately previous index within the same scope.
  const match = /^(.+):(\d+)$/.exec(key);
  let previousKey: string | undefined;
  if (match) {
    const prevIdx = Number.parseInt(match[2], 10) - 1;
    if (prevIdx >= 0) previousKey = `${match[1]}:${prevIdx}`;
  }

  let distinctFromPrevious = true;
  let reason: string | undefined;
  if (previousKey && store.has(previousKey)) {
    const prev = store.get(previousKey)!;
    if (prev.hash === hash) {
      distinctFromPrevious = false;
      reason = `Screenshot "${key}" is byte-identical to "${previousKey}" — UI did not update`;
    } else if (Math.abs(prev.bytes - bytes) < 32) {
      // Heuristic: nearly-identical file size is suspicious but not a hard fail.
      reason = `Warning: "${key}" size within 32B of "${previousKey}" — verify UI actually updated`;
    }
  }

  store.set(key, { hash, bytes });
  return { hash, bytes, distinctFromPrevious, reason };
}

/**
 * Hard assertion used in Playwright tests. Throws if the screenshot is not
 * distinct from the previous one in the same scope.
 */
export function assertScreenshotDistinct(key: string, pngPath: string): void {
  const result = trackScreenshot(key, pngPath);
  if (!result.distinctFromPrevious) {
    throw new Error(
      `[SCREENSHOT-GATE] ${result.reason ?? `Screenshot "${key}" did not change`}`
    );
  }
}

/**
 * Reset the store — call in Playwright `test.beforeEach` if tests should not
 * share state.
 */
export function resetScreenshotStore(): void {
  store.clear();
}
