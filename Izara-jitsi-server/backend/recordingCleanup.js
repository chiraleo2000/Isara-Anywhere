/**
 * Ephemeral recording cleanup for Cloud Run — prevent /tmp/recordings growth.
 * Permanent storage: GCS + meeting_records.recording_data (BYTEA).
 */
import fs from 'node:fs';
import path from 'node:path';

function retentionMode() {
  return (
    process.env.RECORDING_LOCAL_RETENTION ||
    (process.env.NODE_ENV === 'production' ? 'delete_after_persist' : 'keep')
  );
}

function shouldDeleteLocalAfterPersist({ gcsUri } = {}) {
  const mode = retentionMode();
  if (mode === 'keep') return false;
  if (mode === 'delete_after_gcs') return Boolean(gcsUri);
  return mode === 'delete_after_persist' || mode === 'delete';
}

function safeUnlink(filePath, removed) {
  if (!filePath || !fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
    removed.push(filePath);
  } catch (e) {
    console.warn('[RecordingCleanup] unlink failed:', filePath, e.message);
  }
}

function safeRmDir(dirPath, removed) {
  if (!dirPath || !fs.existsSync(dirPath)) return;
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    removed.push(dirPath);
  } catch (e) {
    console.warn('[RecordingCleanup] rmdir failed:', dirPath, e.message);
  }
}

/**
 * After BYTEA/GCS persist, remove duplicate local copies on Cloud Run.
 */
export function cleanupEphemeralRecordingAfterPersist({
  recordingsDir,
  paths,
  legacyMeetingKey,
  gcsUri,
  deleteTranscriptArtifact = false,
}) {
  if (!shouldDeleteLocalAfterPersist({ gcsUri })) {
    return { removed: [], mode: retentionMode(), skipped: true };
  }

  const removed = [];

  if (paths?.videoPath) {
    safeUnlink(paths.videoPath, removed);
  }
  if (deleteTranscriptArtifact && paths?.transcriptPath) {
    safeUnlink(paths.transcriptPath, removed);
  }
  if (paths?.dir && fs.existsSync(paths.dir)) {
    try {
      const left = fs.readdirSync(paths.dir);
      if (left.length === 0) {
        safeRmDir(paths.dir, removed);
      }
    } catch {
      /* ignore */
    }
  }

  if (legacyMeetingKey && recordingsDir) {
    const legacyDir = path.join(recordingsDir, String(legacyMeetingKey));
    if (legacyDir !== paths?.dir) {
      safeRmDir(legacyDir, removed);
    }
  }

  if (removed.length) {
    console.log(`[RecordingCleanup] removed ${removed.length} ephemeral path(s) (mode=${retentionMode()})`);
  }
  return { removed, mode: retentionMode(), skipped: false };
}

/** Delete Jibri drop file after ingest (never leave /tmp jibri dumps). */
export function cleanupJibriSourceFile(localFilePath, canonicalVideoPath) {
  if (!localFilePath || localFilePath === canonicalVideoPath) return false;
  if (!fs.existsSync(localFilePath)) return false;
  try {
    fs.unlinkSync(localFilePath);
    console.log('[RecordingCleanup] Jibri source file removed:', localFilePath);
    return true;
  } catch (e) {
    console.warn('[RecordingCleanup] Jibri source cleanup failed:', e.message);
    return false;
  }
}

/** Best-effort sweep of empty meeting leaf dirs under recordings root */
export function sweepEmptyRecordingDirs(recordingsDir, maxAgeMs = 3600_000) {
  if (!recordingsDir || !fs.existsSync(recordingsDir)) return 0;
  let count = 0;
  const now = Date.now();
  try {
    for (const entry of fs.readdirSync(recordingsDir, { withFileTypes: true })) {
      const full = path.join(recordingsDir, entry.name);
      if (entry.isDirectory()) {
        try {
          const stat = fs.statSync(full);
          if (now - stat.mtimeMs > maxAgeMs && fs.readdirSync(full).length === 0) {
            fs.rmdirSync(full);
            count += 1;
          }
        } catch {
          /* ignore */
        }
      }
    }
  } catch (e) {
    console.warn('[RecordingCleanup] sweep failed:', e.message);
  }
  return count;
}
