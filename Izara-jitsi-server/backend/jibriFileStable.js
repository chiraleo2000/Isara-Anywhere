/**
 * Wait until Jibri finishes writing MP4/WebM (size stable) before ingest.
 */
import fs from 'node:fs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} filePath
 * @param {{ minBytes?: number, stableMs?: number, pollMs?: number, maxWaitMs?: number }} opts
 */
export async function waitForStableFile(filePath, opts = {}) {
  const minBytes = opts.minBytes ?? 1024;
  const stableMs = opts.stableMs ?? Number.parseInt(process.env.JIBRI_FILE_STABLE_MS || '2000', 10);
  const pollMs = opts.pollMs ?? 250;
  const maxWaitMs = opts.maxWaitMs ?? Number.parseInt(process.env.JIBRI_FILE_MAX_WAIT_MS || '120000', 10);
  const start = Date.now();
  let lastSize = -1;
  let stableFor = 0;

  while (Date.now() - start < maxWaitMs) {
    if (!fs.existsSync(filePath)) {
      await sleep(pollMs);
      continue;
    }
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      await sleep(pollMs);
      continue;
    }
    if (stat.size < minBytes) {
      lastSize = -1;
      stableFor = 0;
      await sleep(pollMs);
      continue;
    }
    if (stat.size === lastSize) {
      stableFor += pollMs;
      if (stableFor >= stableMs) {
        return { size: stat.size, waitedMs: Date.now() - start };
      }
    } else {
      lastSize = stat.size;
      stableFor = 0;
    }
    await sleep(pollMs);
  }
  throw new Error(`jibri_file_not_stable: ${filePath} (${maxWaitMs}ms)`);
}
