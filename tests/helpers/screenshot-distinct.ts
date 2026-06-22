/**
 * Screenshot distinctness helpers — fail when two workflow stages produce identical PNGs.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function assertDistinctScreenshots(
  label: string,
  filePaths: string[],
  { minBytes = 20_000 }: { minBytes?: number } = {},
): void {
  const hashes = new Map<string, string[]>();
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`${label}: missing screenshot ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    if (stat.size < minBytes) {
      throw new Error(`${label}: ${path.basename(filePath)} too small (${stat.size}B) — likely blank`);
    }
    const hash = sha256File(filePath);
    const bucket = hashes.get(hash) ?? [];
    bucket.push(path.basename(filePath));
    hashes.set(hash, bucket);
  }
  const dupes = [...hashes.values()].filter((names) => names.length > 1);
  if (dupes.length > 0) {
    throw new Error(
      `${label}: duplicate screenshots detected — ${dupes.map((d) => d.join(' ≈ ')).join('; ')}`,
    );
  }
}

/** In-memory registry for sequential E2E steps within one test file. */
const sessionHashes = new Map<string, Set<string>>();

export function resetScreenshotSession(group: string): void {
  sessionHashes.delete(group);
}

export function registerScreenshotHash(group: string, filePath: string): void {
  const hash = sha256File(filePath);
  const set = sessionHashes.get(group) ?? new Set<string>();
  if (set.has(hash)) {
    console.warn(
      `${group}: screenshot ${path.basename(filePath)} duplicates a prior step in this run — post-run validator is authoritative`,
    );
    return;
  }
  set.add(hash);
  sessionHashes.set(group, set);
}
