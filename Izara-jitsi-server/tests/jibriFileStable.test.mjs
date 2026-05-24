import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { waitForStableFile } from '../server/jibriFileStable.js';

describe('jibriFileStable', () => {
  it('JFS-01 — waits until file size stops growing', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jfs-'));
    const file = path.join(dir, 'growing.mp4');
    fs.writeFileSync(file, Buffer.alloc(512));
    setTimeout(() => fs.appendFileSync(file, Buffer.alloc(2048)), 400);
    const result = await waitForStableFile(file, { minBytes: 1024, stableMs: 600, pollMs: 100, maxWaitMs: 10000 });
    assert.ok(result.size >= 2560);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('JFS-02 — rejects partial tiny stub', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jfs-'));
    const file = path.join(dir, 'tiny.mp4');
    fs.writeFileSync(file, Buffer.alloc(64));
    await assert.rejects(
      () => waitForStableFile(file, { minBytes: 1024, stableMs: 200, maxWaitMs: 800 }),
      /jibri_file_not_stable/,
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
