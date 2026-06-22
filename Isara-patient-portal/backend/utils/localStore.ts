/**
 * Local filesystem key-value store (replaces former GCS usage).
 * Data lives under $DATA_DIR (default: ./data) with structure:
 *   data/{bucket}/{filePath}
 *
 * Writes are atomic (tmp + rename) to prevent partial reads during crashes.
 */
import fs from 'node:fs';
import path from 'node:path';

const DATA_ROOT = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');

// Logical "buckets" — kept as named constants so routes/services that previously
// used GCS_BUCKETS.PATIENT / DOCTOR / METADATA continue to work unchanged.
// These are just directory names now.
export const BUCKETS = {
  AUTH: 'auth',
  PATIENT: 'patients',
  DOCTOR: 'doctors',
  APPOINTMENTS: 'appointments',
  METADATA: 'metadata',
};

function resolvePath(bucket: string, filePath: string): string {
  // Prevent path traversal outside the data root.
  const safeBucket = bucket.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const fullPath = path.resolve(DATA_ROOT, safeBucket, filePath);
  const expectedPrefix = path.resolve(DATA_ROOT, safeBucket) + path.sep;
  if (!fullPath.startsWith(expectedPrefix) && fullPath !== path.resolve(DATA_ROOT, safeBucket)) {
    throw new Error(`Path traversal blocked: ${bucket}/${filePath}`);
  }
  return fullPath;
}

export async function readJSON(bucket: string, filePath: string): Promise<any> {
  try {
    const fullPath = resolvePath(bucket, filePath);
    const contents = await fs.promises.readFile(fullPath, 'utf8');
    return JSON.parse(contents);
  } catch (error: any) {
    if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
      return null;
    }
    throw error;
  }
}

export async function writeJSON(bucket: string, filePath: string, data: any): Promise<void> {
  const fullPath = resolvePath(bucket, filePath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  const tmpPath = `${fullPath}.tmp.${process.pid}.${Date.now()}`;
  await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.promises.rename(tmpPath, fullPath);
}

export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  try {
    const fullPath = resolvePath(bucket, filePath);
    await fs.promises.unlink(fullPath);
  } catch (error: any) {
    if (error && error.code !== 'ENOENT') throw error;
  }
}

export function getDataRoot(): string {
  return DATA_ROOT;
}
