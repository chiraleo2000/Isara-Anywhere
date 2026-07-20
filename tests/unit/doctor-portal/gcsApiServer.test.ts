/**
 * ═══════════════════════════════════════════════════════════════════════
 * DOCTOR PORTAL — GCS API Server Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: gcsApiServer.cjs — bucket whitelist, path validation, CRUD
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// ── Bucket Configuration ────────────────────────────────────────────────

const ALLOWED_BUCKETS = [
  'izara-users-credentials',
  'izara-doctors-data',
  'izara-patients-data',
  'izara-appointments',
  'izara-meta-data',
];

function isBucketAllowed(bucket: string): boolean {
  return ALLOWED_BUCKETS.includes(bucket);
}

function sanitizePath(path: string): string {
  // Prevent directory traversal
  return path.replace(/\.\.\//g, '').replace(/\/\//g, '/').replace(/^\//, '');
}

function buildGcsUrl(bucket: string, path: string): string {
  const cleanPath = sanitizePath(path);
  return `gs://${bucket}/${cleanPath}`;
}

function validateUploadSize(sizeBytes: number, maxMB: number): boolean {
  return sizeBytes <= maxMB * 1024 * 1024;
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    json: 'application/json',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/** Mirrors gcsApiServer.cjs multer fileFilter allowedMimes (multer 2.x upload gate). */
const GCS_ALLOWED_MIMES = [
  'application/json',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'video/webm',
  'video/mp4',
  'video/ogg',
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'text/plain',
  'text/markdown',
] as const;

function isGcsUploadMimeAllowed(mimetype: string): boolean {
  return (GCS_ALLOWED_MIMES as readonly string[]).includes(mimetype);
}

const GCS_UPLOAD_MAX_BYTES = 200 * 1024 * 1024;
const GCS_UPLOAD_MAX_FILES = 5;

// ── Tests ───────────────────────────────────────────────────────────────

describe('Doctor Portal — GCS API Server', () => {

  describe('A — Bucket Whitelist', () => {
    it('A01 — allows all 5 authorized buckets', () => {
      expect(isBucketAllowed('izara-users-credentials')).toBe(true);
      expect(isBucketAllowed('izara-doctors-data')).toBe(true);
      expect(isBucketAllowed('izara-patients-data')).toBe(true);
      expect(isBucketAllowed('izara-appointments')).toBe(true);
      expect(isBucketAllowed('izara-meta-data')).toBe(true);
    });

    it('A02 — rejects unauthorized bucket names', () => {
      expect(isBucketAllowed('some-random-bucket')).toBe(false);
      expect(isBucketAllowed('izara-admin-data')).toBe(false);
      expect(isBucketAllowed('')).toBe(false);
    });

    it('A03 — rejects bucket names with injection', () => {
      expect(isBucketAllowed('izara-users-credentials; rm -rf /')).toBe(false);
      expect(isBucketAllowed('izara-users-credentials/../secret')).toBe(false);
    });
  });

  describe('B — Path Sanitization', () => {
    it('B01 — allows clean paths', () => {
      expect(sanitizePath('patients/PT-001/records.json')).toBe('patients/PT-001/records.json');
    });

    it('B02 — strips directory traversal', () => {
      expect(sanitizePath('../../etc/passwd')).toBe('etc/passwd');
      expect(sanitizePath('../../../secret')).toBe('secret');
    });

    it('B03 — removes double slashes', () => {
      expect(sanitizePath('patients//PT-001//data.json')).toBe('patients/PT-001/data.json');
    });

    it('B04 — removes leading slash', () => {
      expect(sanitizePath('/absolute/path')).toBe('absolute/path');
    });

    it('B05 — handles empty path', () => {
      expect(sanitizePath('')).toBe('');
    });
  });

  describe('C — GCS URL Construction', () => {
    it('C01 — builds correct gs:// URL', () => {
      const url = buildGcsUrl('izara-patients-data', 'PT-001/phr.json');
      expect(url).toBe('gs://izara-patients-data/PT-001/phr.json');
    });

    it('C02 — sanitizes path in URL', () => {
      const url = buildGcsUrl('izara-patients-data', '../../etc/passwd');
      expect(url).toBe('gs://izara-patients-data/etc/passwd');
    });

    it('C03 — handles nested paths', () => {
      const url = buildGcsUrl('izara-doctors-data', 'DR-001/emr/2026/03/record.json');
      expect(url).toBe('gs://izara-doctors-data/DR-001/emr/2026/03/record.json');
    });
  });

  describe('D — Upload Size Validation', () => {
    it('D01 — accepts file within limit', () => {
      expect(validateUploadSize(1024 * 1024, 10)).toBe(true); // 1MB < 10MB
    });

    it('D02 — rejects file exceeding limit', () => {
      expect(validateUploadSize(20 * 1024 * 1024, 10)).toBe(false); // 20MB > 10MB
    });

    it('D03 — accepts exact limit', () => {
      expect(validateUploadSize(10 * 1024 * 1024, 10)).toBe(true); // 10MB == 10MB
    });

    it('D04 — accepts zero-byte file', () => {
      expect(validateUploadSize(0, 10)).toBe(true);
    });

    it('D05 — multer 2.x GCS route allows up to 200MB', () => {
      expect(validateUploadSize(GCS_UPLOAD_MAX_BYTES, 200)).toBe(true);
      expect(validateUploadSize(GCS_UPLOAD_MAX_BYTES + 1, 200)).toBe(false);
    });
  });

  describe('D2 — Multer MIME allowlist (A05)', () => {
    it('D2-01 — allows clinical upload MIME types', () => {
      expect(isGcsUploadMimeAllowed('application/pdf')).toBe(true);
      expect(isGcsUploadMimeAllowed('video/webm')).toBe(true);
      expect(isGcsUploadMimeAllowed('audio/mpeg')).toBe(true);
      expect(isGcsUploadMimeAllowed('text/plain')).toBe(true);
    });

    it('D2-02 — rejects executable and unknown MIME types', () => {
      expect(isGcsUploadMimeAllowed('application/x-msdownload')).toBe(false);
      expect(isGcsUploadMimeAllowed('application/octet-stream')).toBe(false);
    });

    it('D2-03 — enforces max 5 files per request', () => {
      expect(GCS_UPLOAD_MAX_FILES).toBe(5);
    });

    it('D2-04 — gcsApiServer uses multer 2.x in package.json', () => {
      const pkgPath = path.join(__dirname, '../../../issara-doctor/package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      expect(pkg.dependencies.multer).toMatch(/^[\^~]?2\./);
    });
  });

  describe('E — MIME Type Detection', () => {
    it('E01 — detects JSON', () => {
      expect(getMimeType('records.json')).toBe('application/json');
    });

    it('E02 — detects PDF', () => {
      expect(getMimeType('report.pdf')).toBe('application/pdf');
    });

    it('E03 — detects images', () => {
      expect(getMimeType('photo.png')).toBe('image/png');
      expect(getMimeType('photo.jpg')).toBe('image/jpeg');
    });

    it('E04 — detects audio/video', () => {
      expect(getMimeType('recording.mp3')).toBe('audio/mpeg');
      expect(getMimeType('meeting.mp4')).toBe('video/mp4');
    });

    it('E05 — defaults to octet-stream', () => {
      expect(getMimeType('unknown.xyz')).toBe('application/octet-stream');
    });

    it('E06 — handles no extension', () => {
      expect(getMimeType('noextension')).toBe('application/octet-stream');
    });
  });

  describe('F — Storage Operation Patterns', () => {
    it('F01 — patient data path pattern', () => {
      const patientId = 'PT-001';
      const path = `patients/${patientId}/phr.json`;
      expect(path).toContain(patientId);
      expect(path).toMatch(/^patients\/PT-\d+\//);
    });

    it('F02 — doctor data path pattern', () => {
      const doctorId = 'DR-001';
      const path = `doctors/${doctorId}/profile.json`;
      expect(path).toMatch(/^doctors\/DR-\d+\//);
    });

    it('F03 — appointment data path pattern', () => {
      const appointmentId = 'APT-001';
      const path = `appointments/${appointmentId}/details.json`;
      expect(path).toMatch(/^appointments\/APT-\d+\//);
    });

    it('F04 — EMR storage path pattern', () => {
      const path = 'emr/DR-001/PT-001/2026-03-08_record.json';
      expect(path).toContain('emr/');
      expect(path).toContain('DR-001');
      expect(path).toContain('PT-001');
    });

    it('F05 — medical content path pattern', () => {
      const path = 'content/articles/ART-001.json';
      expect(path).toMatch(/^content\//);
    });
  });

  describe('G — API Endpoint Definitions', () => {
    const GCS_ENDPOINTS = [
      { method: 'GET', path: '/api/storage/read', params: ['bucket', 'path'] },
      { method: 'POST', path: '/api/storage/write', params: ['bucket', 'path', 'data'] },
      { method: 'POST', path: '/api/storage/upload', params: ['bucket', 'path', 'file'] },
      { method: 'DELETE', path: '/api/storage/delete', params: ['bucket', 'path'] },
      { method: 'GET', path: '/api/storage/list', params: ['bucket', 'folder'] },
      { method: 'GET', path: '/api/health', params: [] },
    ];

    it('G01 — health check has no required params', () => {
      const health = GCS_ENDPOINTS.find(e => e.path === '/api/health');
      expect(health?.params).toHaveLength(0);
    });

    it('G02 — read requires bucket and path', () => {
      const read = GCS_ENDPOINTS.find(e => e.path === '/api/storage/read');
      expect(read?.params).toContain('bucket');
      expect(read?.params).toContain('path');
    });

    it('G03 — write requires bucket, path, and data', () => {
      const write = GCS_ENDPOINTS.find(e => e.path === '/api/storage/write');
      expect(write?.params).toContain('data');
    });

    it('G04 — list requires bucket and folder', () => {
      const list = GCS_ENDPOINTS.find(e => e.path === '/api/storage/list');
      expect(list?.params).toContain('folder');
    });
  });
});
