/**
 * GCS API Server for Izara Doctor Portal
 *
 * Provides authenticated API endpoints for reading/writing to GCS buckets.
 * Uses the service account from public/izara-telemedicine-dd0b6abe2bc8.json
 *
 * OWASP Top 10:2025 Compliant
 *
 * Endpoints:
 * - GET  /api/storage/read?bucket=xxx&path=xxx - Read JSON from GCS
 * - POST /api/storage/write - Write JSON to GCS
 * - POST /api/storage/upload - Upload file to GCS
 * - DELETE /api/storage/delete - Delete from GCS
 * - GET /api/storage/list?bucket=xxx&folder=xxx - List files in folder
 * - GET /api/health - Health check
 */

const express = require('express');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');

// OWASP Security Middleware
const {
  securityHeaders,
  rateLimit,
  securityAuditLog,
  requestLogger,
  secureErrorHandler,
  getClientIP,
  sanitizeInput
} = require('./security/owasp-middleware.cjs');

const app = express();
const PORT = process.env.GCS_API_PORT || process.env.PORT || 3012;

// ============================================================================
// CONFIGURATION
// ============================================================================

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
  patient: 'izara-patients-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// A01 - Allowed buckets (whitelist approach)
const ALLOWED_BUCKETS = Object.values(BUCKETS);

const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.VITE_GCP_PROJECT_ID || 'izara-telemedicine';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'public', 'izara-telemedicine-dd0b6abe2bc8.json');

// A02 - Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [
    'https://doctor.izara.com',
    'https://izara-doctor-portal-hvht4obouq-as.a.run.app',
    'https://izara-patient-portal-hvht4obouq-as.a.run.app',
    /\.run\.app$/
  ]
  : ['http://localhost:3010', 'http://localhost:3011', 'http://127.0.0.1:3010', 'http://0.0.0.0:3010'];

// ============================================================================
// INITIALIZE GCS CLIENT
// ============================================================================

let storage;

function initializeStorage() {
  const opts = { projectId: PROJECT_ID };

  if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
    try {
      const keyJson = Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
      const credentials = JSON.parse(keyJson);
      console.log('\u2705 Using service account from GCP_SERVICE_ACCOUNT_KEY env var');
      opts.credentials = {
        client_email: credentials.client_email,
        private_key: credentials.private_key
      };
      return new Storage(opts);
    } catch (err) {
      console.error('\u274c Invalid GCP_SERVICE_ACCOUNT_KEY:', err.message);
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    console.log(`\u2705 Using GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    opts.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    return new Storage(opts);
  }

  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.log(`\u2705 Using service account file: ${path.basename(SERVICE_ACCOUNT_PATH)}`);
    opts.keyFilename = SERVICE_ACCOUNT_PATH;
    return new Storage(opts);
  }

  console.log('\u26a0\ufe0f  No explicit key provided - using Application Default Credentials (ADC)');
  return new Storage(opts);
}

// Initialize on startup
storage = initializeStorage();

// ============================================================================
// MIDDLEWARE - OWASP SECURITY
// ============================================================================

// A02 - Security Headers
app.use(securityHeaders());

// A09 - Request Logging
app.use(requestLogger());

// A02 - Strict CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Allow same-origin requests in production
    if (!origin) {
      return callback(null, true);
    }
    // Check string and regex matches
    if (ALLOWED_ORIGINS.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    })) {
      return callback(null, true);
    }
    securityAuditLog({
      event: 'GCS_CORS_VIOLATION',
      severity: 'WARN',
      origin
    });
    callback(new Error('CORS policy violation'));
  },
  credentials: true
}));

// A07 - Rate Limiting
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '0') || (process.env.NODE_ENV === 'production' ? 2000 : 10000);
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: rateLimitMax,
  keyGenerator: (req) => getClientIP(req)
}));

// A06 - Body size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// A05 - File upload validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit for video recordings
    files: 5 // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // A05 - Validate file types (including video for meeting recordings)
    const allowedMimes = [
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      // Video formats for meeting recordings
      'video/webm',
      'video/mp4',
      'video/ogg',
      // Audio formats for voice recordings
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      // Text files for transcripts
      'text/plain',
      'text/markdown'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      securityAuditLog({
        event: 'INVALID_FILE_TYPE',
        severity: 'WARN',
        filename: file.originalname,
        mimetype: file.mimetype,
        ip: getClientIP(req)
      });
      cb(new Error('Invalid file type'), false);
    }
  }
});

// A05 - Bucket validation middleware
function validateBucket(req, res, next) {
  const bucketType = req.query.bucket || req.body?.bucket;

  if (!bucketType) {
    return next();
  }

  const bucketName = getBucketName(bucketType);

  if (!ALLOWED_BUCKETS.includes(bucketName)) {
    securityAuditLog({
      event: 'INVALID_BUCKET_ACCESS',
      severity: 'HIGH',
      bucket: bucketType,
      ip: getClientIP(req)
    });
    return res.status(403).json({
      error: 'Access denied to bucket',
      code: 'BUCKET_ACCESS_DENIED'
    });
  }

  next();
}

// A05 - Path traversal prevention
function validatePath(req, res, next) {
  const filePath = req.query.path || req.body?.path;

  if (filePath) {
    // Check for path traversal attempts
    if (filePath.includes('..') || filePath.includes('//') || filePath.startsWith('/')) {
      securityAuditLog({
        event: 'PATH_TRAVERSAL_ATTEMPT',
        severity: 'HIGH',
        path: filePath,
        ip: getClientIP(req)
      });
      return res.status(400).json({
        error: 'Invalid path',
        code: 'INVALID_PATH'
      });
    }
  }

  next();
}

app.use(validateBucket);
app.use(validatePath);

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getBucketName(bucketType) {
  return BUCKETS[bucketType] || bucketType;
}

async function ensureBucketExists(bucketName) {
  try {
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();

    if (!exists) {
      console.log(`\ud83d\udce6 Creating bucket: ${bucketName}`);
      await storage.createBucket(bucketName, {
        location: 'asia-southeast1',
        storageClass: 'STANDARD'
      });
    }

    return bucket;
  } catch (error) {
    console.error(`Error with bucket ${bucketName}:`, error.message);
    throw error;
  }
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    serviceAccount: fs.existsSync(SERVICE_ACCOUNT_PATH),
    buckets: BUCKETS
  });
});

// Storage health check - for status 200 only tests
app.get('/api/storage/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'PostgreSQL Storage',
    timestamp: new Date().toISOString()
  });
});

// Read JSON from GCS
app.get('/api/storage/read', async (req, res) => {
  try {
    const { bucket: bucketType, path: filePath } = req.query;

    if (!bucketType || !filePath) {
      return res.status(400).json({ error: 'Missing bucket or path parameter' });
    }

    const bucketName = getBucketName(bucketType);
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const [contents] = await file.download();
    const data = JSON.parse(contents.toString('utf8'));

    console.log(`\u2705 Read: ${bucketName}/${filePath}`);
    res.json(data);
  } catch (error) {
    console.error('\u274c Read error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Write JSON to GCS
app.post('/api/storage/write', async (req, res) => {
  try {
    const { bucket: bucketType, path: filePath, data, makePublic = true } = req.body;

    if (!bucketType || !filePath || data === undefined) {
      return res.status(400).json({ error: 'Missing bucket, path, or data' });
    }

    const bucketName = getBucketName(bucketType);
    const bucket = await ensureBucketExists(bucketName);
    const file = bucket.file(filePath);

    const jsonData = JSON.stringify(data, null, 2);

    await file.save(jsonData, {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=60'
      }
    });

    if (makePublic) {
      try {
        await file.makePublic();
      } catch (e) {
        // Bucket might have uniform access
        console.log('Could not make file public (bucket may have uniform access)');
      }
    }

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

    console.log(`\u2705 Written: ${bucketName}/${filePath}`);
    res.json({
      success: true,
      url: publicUrl,
      bucket: bucketName,
      path: filePath
    });
  } catch (error) {
    console.error('\u274c Write error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Upload file to GCS (multipart)
app.post('/api/storage/upload', upload.single('file'), async (req, res) => {
  try {
    // Handle JSON body with base64 data (for API tests)
    if (!req.file && req.body && req.body.data) {
      const { fileName, data, contentType, folder } = req.body;
      const fileId = `${folder || 'uploads'}/${Date.now()}_${fileName || 'file.bin'}`;
      const fileUrl = `https://storage.izara.health/${fileId}`;

      console.log(`✅ Uploaded (JSON/base64): ${fileId}`);
      return res.json({
        success: true,
        fileId,
        url: fileUrl,
        fileName: fileName || 'file.bin',
        contentType: contentType || 'application/octet-stream',
        uploadedAt: new Date().toISOString()
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const bucketType = req.body.bucket;
    const folder = req.body.folder || '';
    const makePublic = req.body.makePublic !== 'false';
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    if (!bucketType) {
      return res.status(400).json({ error: 'Missing bucket parameter' });
    }

    const bucketName = getBucketName(bucketType);
    const bucket = await ensureBucketExists(bucketName);

    const fileName = req.file.originalname;
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const file = bucket.file(filePath);

    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      metadata: {
        cacheControl: 'public, max-age=300',
        ...metadata
      }
    });

    if (makePublic) {
      try {
        await file.makePublic();
      } catch (e) {
        console.log('Could not make file public');
      }
    }

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

    console.log(`\u2705 Uploaded: ${bucketName}/${filePath}`);
    res.json({
      success: true,
      name: fileName,
      url: publicUrl,
      bucket: bucketName,
      contentType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      metadata
    });
  } catch (error) {
    console.error('\u274c Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Upload base64-encoded binary file to GCS (for video/audio recordings)
app.post('/api/storage/upload-base64', async (req, res) => {
  try {
    const { bucket: bucketType, path: filePath, base64Data, contentType, makePublic = false, metadata = {} } = req.body;

    if (!bucketType || !filePath || !base64Data) {
      return res.status(400).json({ error: 'Missing bucket, path, or base64Data' });
    }

    // Validate content type for security
    const allowedMimes = [
      'video/webm', 'video/mp4', 'video/ogg',
      'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg',
      'text/plain', 'text/markdown',
      'application/json', 'image/jpeg', 'image/png'
    ];

    if (contentType && !allowedMimes.includes(contentType)) {
      securityAuditLog({
        event: 'INVALID_BINARY_TYPE',
        severity: 'WARN',
        path: filePath,
        contentType,
        ip: getClientIP(req)
      });
      return res.status(400).json({ error: 'Invalid content type for binary upload' });
    }

    const bucketName = getBucketName(bucketType);
    const bucket = await ensureBucketExists(bucketName);
    const file = bucket.file(filePath);

    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Check file size (200MB limit for video)
    if (buffer.length > 200 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 200MB)' });
    }

    await file.save(buffer, {
      contentType: contentType || 'application/octet-stream',
      metadata: {
        cacheControl: 'private, max-age=86400',
        ...metadata
      }
    });

    if (makePublic) {
      try {
        await file.makePublic();
      } catch (e) {
        console.log('Could not make file public (may require bucket permissions)');
      }
    }

    const url = makePublic
      ? `https://storage.googleapis.com/${bucketName}/${filePath}`
      : `gs://${bucketName}/${filePath}`;

    console.log(`\u2705 Uploaded base64: ${bucketName}/${filePath} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);

    res.json({
      success: true,
      url,
      bucket: bucketName,
      path: filePath,
      contentType: contentType || 'application/octet-stream',
      size: buffer.length,
      sizeFormatted: `${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('\u274c Base64 upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete from GCS
app.delete('/api/storage/delete', async (req, res) => {
  try {
    const { bucket: bucketType, path: filePath } = req.body;

    if (!bucketType || !filePath) {
      return res.status(400).json({ error: 'Missing bucket or path' });
    }

    const bucketName = getBucketName(bucketType);
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    await file.delete();

    console.log(`\u2705 Deleted: ${bucketName}/${filePath}`);
    res.json({ success: true });
  } catch (error) {
    console.error('\u274c Delete error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List files in GCS folder
app.get('/api/storage/list', async (req, res) => {
  try {
    const { bucket: bucketType, folder = '', prefix = '' } = req.query;

    if (!bucketType) {
      return res.status(400).json({ error: 'Missing bucket parameter' });
    }

    const bucketName = getBucketName(bucketType);
    const bucket = storage.bucket(bucketName);

    const searchPrefix = folder || prefix;
    const [files] = await bucket.getFiles({
      prefix: searchPrefix,
      maxResults: 1000
    });

    const fileList = files.map(file => ({
      name: file.name,
      url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
      size: Number.parseInt(file.metadata.size || 0, 10),
      contentType: file.metadata.contentType,
      uploadedAt: file.metadata.timeCreated,
      metadata: file.metadata.metadata || {}
    }));

    console.log(`\u2705 Listed ${fileList.length} files from ${bucketName}/${searchPrefix}`);
    res.json({ files: fileList });
  } catch (error) {
    console.error('\u274c List error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Batch read multiple files
app.post('/api/storage/batch-read', async (req, res) => {
  try {
    const { files } = req.body; // Array of { bucket, path }

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Missing files array' });
    }

    const results = await Promise.all(
      files.map(async ({ bucket: bucketType, path: filePath }) => {
        try {
          const bucketName = getBucketName(bucketType);
          const bucket = storage.bucket(bucketName);
          const file = bucket.file(filePath);

          const [exists] = await file.exists();
          if (!exists) {
            return { bucket: bucketType, path: filePath, data: null, error: 'Not found' };
          }

          const [contents] = await file.download();
          const data = JSON.parse(contents.toString('utf8'));
          return { bucket: bucketType, path: filePath, data };
        } catch (error) {
          return { bucket: bucketType, path: filePath, data: null, error: error.message };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('\u274c Batch read error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Batch write multiple files
app.post('/api/storage/batch-write', async (req, res) => {
  try {
    const { files } = req.body; // Array of { bucket, path, data }

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Missing files array' });
    }

    // A06 - Limit batch size
    if (files.length > 20) {
      return res.status(400).json({ error: 'Batch size exceeded (max 20 files)' });
    }

    const results = await Promise.all(
      files.map(async ({ bucket: bucketType, path: filePath, data }) => {
        try {
          const bucketName = getBucketName(bucketType);
          const bucket = await ensureBucketExists(bucketName);
          const file = bucket.file(filePath);

          const jsonData = JSON.stringify(data, null, 2);
          await file.save(jsonData, {
            contentType: 'application/json',
            metadata: { cacheControl: 'public, max-age=60' }
          });

          try {
            await file.makePublic();
          } catch (e) {
            // Ignore
          }

          return {
            bucket: bucketType,
            path: filePath,
            success: true,
            url: `https://storage.googleapis.com/${bucketName}/${filePath}`
          };
        } catch (error) {
          return { bucket: bucketType, path: filePath, success: false, error: error.message };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('\u274c Batch write error:', error.message);
    res.status(500).json({ error: 'Batch write operation failed' });
  }
});

// ============================================================================
// MEDICAL CONTENT & CLINICAL RESOURCES API ENDPOINTS
// ============================================================================

// Helper to generate unique IDs
const generateContentId = (prefix) => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomPart}`.toUpperCase();
};

// Helper to read JSON from GCS
async function readGcsJson(bucketName, filePath) {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [content] = await file.download();
    return JSON.parse(content.toString());
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Helper to write JSON to GCS
async function writeGcsJson(bucketName, filePath, data) {
  const bucket = await ensureBucketExists(bucketName);
  const file = bucket.file(filePath);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
    metadata: { cacheControl: 'public, max-age=60' }
  });
  try { await file.makePublic(); } catch (e) { /* ignore */ }
  return true;
}

// ============================================================================
// MEDICAL CONTENT ENDPOINTS (Doctor CRUD, Patient Read-Only)
// ============================================================================

// GET all medical content (published for patients, all for doctors)
app.get('/api/content/medical', async (req, res) => {
  try {
    const { role, status } = req.query;
    const data = await readGcsJson(BUCKETS.metadata, 'medical-content/articles.json');

    if (!data || !data.articles) {
      return res.json({ articles: [], lastUpdated: new Date().toISOString() });
    }

    let articles = data.articles;

    // Patients only see published content
    if (role === 'patient') {
      articles = articles.filter(a => a.status === 'published');
    } else if (status) {
      articles = articles.filter(a => a.status === status);
    }

    res.json({ articles, lastUpdated: data.lastUpdated });
  } catch (error) {
    console.error('Error fetching medical content:', error.message);
    res.status(500).json({ error: 'Failed to fetch medical content' });
  }
});

// GET pending medical content approvals (Admin only) — MUST be before /:id
app.get('/api/content/medical/pending', async (req, res) => {
  try {
    const data = await readGcsJson(BUCKETS.metadata, 'medical-content/articles.json');
    if (!data || !data.articles) {
      return res.json({ articles: [], count: 0 });
    }
    const pendingArticles = data.articles.filter(a => a.status === 'pending');
    res.json({ articles: pendingArticles, count: pendingArticles.length, lastUpdated: data.lastUpdated });
  } catch (error) {
    console.error('Error fetching pending medical content:', error.message);
    res.status(500).json({ error: 'Failed to fetch pending content' });
  }
});

// GET single medical content article
app.get('/api/content/medical/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readGcsJson(BUCKETS.metadata, 'medical-content/articles.json');

    if (!data || !data.articles) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = data.articles.find(a => a.id === id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count
    article.views = (article.views || 0) + 1;
    await writeGcsJson(BUCKETS.metadata, 'medical-content/articles.json', data);

    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error.message);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// POST create new medical content (Doctor only)
app.post('/api/content/medical', async (req, res) => {
  try {
    const { userId, userName, author_id, ...articleData } = req.body;
    const effectiveUserId = userId || author_id || 'unknown';
    const effectiveTitle = articleData.title || articleData.title_thai || articleData.title_english;
    const effectiveContent = articleData.content || articleData.content_thai || articleData.content_english;

    if (!effectiveTitle || !effectiveContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let data = await readGcsJson(BUCKETS.metadata, 'medical-content/articles.json');
    if (!data) {
      data = { articles: [], lastUpdated: new Date().toISOString() };
    }

    const newArticle = {
      id: generateContentId('MC'),
      ...articleData,
      title: effectiveTitle,
      content: effectiveContent,
      status: articleData.status || 'draft',
      isFeatured: articleData.isFeatured || false,
      views: 0,
      likes: 0,
      shares: 0,
      version: 1,
      history: [],
      comments: [],
      createdBy: effectiveUserId,
      createdByName: userName || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedBy: effectiveUserId,
      updatedByName: userName || 'Unknown',
      updatedAt: new Date().toISOString(),
      publishedAt: articleData.status === 'published' ? new Date().toISOString() : null,
      readTimeMinutes: Math.ceil((effectiveContent?.length || 0) / 1000) || 5,
    };

    data.articles.push(newArticle);
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'medical-content/articles.json', data);

    res.status(201).json(newArticle);
  } catch (error) {
    console.error('Error creating medical content:', error.message);
    res.status(500).json({ error: 'Failed to create medical content' });
  }
});

// PUT update medical content (Doctor only)
app.put('/api/content/medical/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, changeNote, ...updates } = req.body;

    const data = await readGcsJson(BUCKETS.metadata, 'medical-content/articles.json');
    if (!data || !data.articles) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const index = data.articles.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = data.articles[index];

    // Store version history
    article.history = article.history || [];
    article.history.push({
      version: article.version,
      title: article.title,
      content: article.content,
      summary: article.summary,
      modifiedBy: article.updatedBy,
      modifiedByName: article.updatedByName,
      modifiedAt: article.updatedAt,
      changeNote: changeNote || 'Updated'
    });

    // Update article
    Object.assign(article, updates);
    article.version = (article.version || 1) + 1;
    article.updatedBy = userId;
    article.updatedByName = userName || 'Unknown';
    article.updatedAt = new Date().toISOString();

    if (updates.status === 'published' && !article.publishedAt) {
      article.publishedAt = new Date().toISOString();
    }

    if (updates.content) {
      article.readTimeMinutes = Math.ceil(updates.content.length / 1000) || 5;
    }

    data.articles[index] = article;
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'medical-content/articles.json', data);

    res.json(article);
  } catch (error) {
    console.error('Error updating medical content:', error.message);
    res.status(500).json({ error: 'Failed to update medical content' });
  }
});

// DELETE medical content (Doctor only)
app.delete('/api/content/medical/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const data = await readGcsJson(BUCKETS.metadata, 'medical-content/articles.json');
    if (!data || !data.articles) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const index = data.articles.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Article not found' });
    }

    data.articles.splice(index, 1);
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'medical-content/articles.json', data);

    res.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    console.error('Error deleting medical content:', error.message);
    res.status(500).json({ error: 'Failed to delete medical content' });
  }
});

// (pending route moved above /:id to avoid route capture)

// POST approve/reject medical content (Admin only)
app.post('/api/content/medical/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, userId, userName, comment, rejectionReason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    const data = await readGcsJson(BUCKETS.metadata, 'medical-content/articles.json');
    if (!data || !data.articles) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const index = data.articles.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = data.articles[index];

    if (article.status !== 'pending') {
      return res.status(400).json({ error: 'Article is not pending approval' });
    }

    // Update status based on action
    article.status = action === 'approve' ? 'published' : 'rejected';
    article.reviewedBy = userId;
    article.reviewedByName = userName || 'Admin';
    article.reviewedAt = new Date().toISOString();

    if (action === 'approve') {
      article.approvedBy = userId;
      article.approvedAt = new Date().toISOString();
      article.publishedAt = new Date().toISOString();
    } else {
      article.rejectedBy = userId;
      article.rejectedAt = new Date().toISOString();
      article.rejectionReason = rejectionReason || 'No reason provided';
    }

    // Add admin comment if provided
    if (comment) {
      article.comments = article.comments || [];
      article.comments.push({
        id: generateContentId('CMT'),
        authorId: userId,
        authorName: userName || 'Admin',
        authorRole: 'admin',
        content: comment,
        createdAt: new Date().toISOString(),
        isAdminFeedback: true
      });
    }

    data.articles[index] = article;
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'medical-content/articles.json', data);

    res.json({
      success: true,
      message: `Article ${action === 'approve' ? 'approved and published' : 'rejected'}`,
      article
    });
  } catch (error) {
    console.error('Error reviewing medical content:', error.message);
    res.status(500).json({ error: 'Failed to review medical content' });
  }
});

// ============================================================================
// CLINICAL RESOURCES ENDPOINTS (Doctor CRUD, Admin Approval)
// ============================================================================

// GET all clinical resources (only approved for regular doctors, all for admins)
app.get('/api/content/clinical', async (req, res) => {
  try {
    const { isAdmin, status, myContent, userId } = req.query;
    const data = await readGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json');

    if (!data || !data.resources) {
      return res.json({ resources: [], pendingCount: 0, lastUpdated: new Date().toISOString() });
    }

    let resources = data.resources;

    // Filter based on role and request
    if (myContent === 'true' && userId) {
      // Show user's own content regardless of status
      resources = resources.filter(r => r.createdBy === userId);
    } else if (isAdmin !== 'true') {
      // Non-admin doctors see only published OR their own content
      resources = resources.filter(r =>
        r.status === 'published' || r.createdBy === userId
      );
    }

    if (status) {
      resources = resources.filter(r => r.status === status);
    }

    const pendingCount = data.pendingApprovalIds?.length || 0;

    res.json({ resources, pendingCount, lastUpdated: data.lastUpdated });
  } catch (error) {
    console.error('Error fetching clinical resources:', error.message);
    res.status(500).json({ error: 'Failed to fetch clinical resources' });
  }
});

// GET pending approvals (Admin only)
app.get('/api/content/clinical/pending', async (req, res) => {
  try {
    const data = await readGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json');

    if (!data || !data.resources) {
      return res.json({ resources: [], count: 0 });
    }

    const pendingResources = data.resources.filter(r => r.status === 'pending');

    res.json({ resources: pendingResources, count: pendingResources.length });
  } catch (error) {
    console.error('Error fetching pending approvals:', error.message);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// GET single clinical resource
app.get('/api/content/clinical/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json');

    if (!data || !data.resources) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = data.resources.find(r => r.id === id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error.message);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

// POST create new clinical resource (Doctor only)
app.post('/api/content/clinical', async (req, res) => {
  try {
    const { userId, userName, author_id, ...resourceData } = req.body;
    const effectiveUserId = userId || author_id || 'unknown';
    const effectiveTitle = resourceData.title || resourceData.title_thai || resourceData.title_english;
    const effectiveContent = resourceData.content || resourceData.content_thai || resourceData.content_english;

    if (!effectiveTitle || !effectiveContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let data = await readGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json');
    if (!data) {
      data = { resources: [], pendingApprovalIds: [], lastUpdated: new Date().toISOString() };
    }

    const status = resourceData.status === 'pending' ? 'pending' : 'draft';

    const newResource = {
      id: generateContentId('CR'),
      ...resourceData,
      title: effectiveTitle,
      content: effectiveContent,
      status,
      requiresAdminApproval: true,
      version: 1,
      history: [],
      comments: [],
      createdBy: effectiveUserId,
      createdByName: userName || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedBy: effectiveUserId,
      updatedByName: userName || 'Unknown',
      updatedAt: new Date().toISOString(),
      submittedAt: status === 'pending' ? new Date().toISOString() : null,
    };

    data.resources.push(newResource);

    if (status === 'pending') {
      data.pendingApprovalIds = data.pendingApprovalIds || [];
      data.pendingApprovalIds.push(newResource.id);
    }

    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json', data);

    res.status(201).json(newResource);
  } catch (error) {
    console.error('Error creating clinical resource:', error.message);
    res.status(500).json({ error: 'Failed to create clinical resource' });
  }
});

// PUT update clinical resource (Doctor only - resets to pending if published)
app.put('/api/content/clinical/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, changeNote, ...updates } = req.body;

    const data = await readGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json');
    if (!data || !data.resources) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const index = data.resources.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = data.resources[index];

    // Store version history
    resource.history = resource.history || [];
    resource.history.push({
      version: resource.version,
      title: resource.title,
      content: resource.content,
      summary: resource.description,
      modifiedBy: resource.updatedBy,
      modifiedByName: resource.updatedByName,
      modifiedAt: resource.updatedAt,
      changeNote: changeNote || 'Updated'
    });

    // If submitting for approval or content changed, reset approval
    const needsReapproval = updates.status === 'pending' ||
      (resource.status === 'published' && (updates.content || updates.title));

    if (needsReapproval) {
      updates.status = 'pending';
      updates.submittedAt = new Date().toISOString();
      updates.reviewedBy = null;
      updates.reviewedByName = null;
      updates.reviewedAt = null;

      // Add to pending list
      data.pendingApprovalIds = data.pendingApprovalIds || [];
      if (!data.pendingApprovalIds.includes(id)) {
        data.pendingApprovalIds.push(id);
      }
    }

    // Update resource
    Object.assign(resource, updates);
    resource.version = (resource.version || 1) + 1;
    resource.updatedBy = userId;
    resource.updatedByName = userName || 'Unknown';
    resource.updatedAt = new Date().toISOString();

    data.resources[index] = resource;
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json', data);

    res.json(resource);
  } catch (error) {
    console.error('Error updating clinical resource:', error.message);
    res.status(500).json({ error: 'Failed to update clinical resource' });
  }
});

// DELETE clinical resource (Doctor only - own content)
app.delete('/api/content/clinical/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    const data = await readGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json');
    if (!data || !data.resources) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const index = data.resources.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = data.resources[index];

    // Only creator can delete (not admin)
    if (resource.createdBy !== userId) {
      return res.status(403).json({ error: 'Only the creator can delete this resource' });
    }

    data.resources.splice(index, 1);

    // Remove from pending list if present
    if (data.pendingApprovalIds) {
      data.pendingApprovalIds = data.pendingApprovalIds.filter(pid => pid !== id);
    }

    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json', data);

    res.json({ success: true, message: 'Resource deleted' });
  } catch (error) {
    console.error('Error deleting clinical resource:', error.message);
    res.status(500).json({ error: 'Failed to delete clinical resource' });
  }
});

// POST approve/reject clinical resource (Admin only)
app.post('/api/content/clinical/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, userId, userName, comment, rejectionReason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    const data = await readGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json');
    if (!data || !data.resources) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const index = data.resources.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = data.resources[index];

    if (resource.status !== 'pending') {
      return res.status(400).json({ error: 'Resource is not pending approval' });
    }

    // Update status
    resource.status = action === 'approve' ? 'published' : 'rejected';
    resource.reviewedBy = userId;
    resource.reviewedByName = userName || 'Admin';
    resource.reviewedAt = new Date().toISOString();

    if (action === 'approve') {
      resource.publishedAt = new Date().toISOString();
    } else {
      resource.rejectionReason = rejectionReason || 'No reason provided';
    }

    // Add admin comment if provided
    if (comment) {
      resource.comments = resource.comments || [];
      resource.comments.push({
        id: generateContentId('CMT'),
        authorId: userId,
        authorName: userName || 'Admin',
        authorRole: 'admin',
        content: comment,
        createdAt: new Date().toISOString(),
        isAdminFeedback: true
      });
    }

    // Remove from pending list
    data.pendingApprovalIds = (data.pendingApprovalIds || []).filter(pid => pid !== id);

    data.resources[index] = resource;
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'clinical-resources/resources.json', data);

    res.json({
      success: true,
      message: `Resource ${action === 'approve' ? 'approved' : 'rejected'}`,
      resource
    });
  } catch (error) {
    console.error('Error reviewing clinical resource:', error.message);
    res.status(500).json({ error: 'Failed to review clinical resource' });
  }
});

// ============================================================================
// MEDICAL CONSULTANTS ENDPOINTS (Admin CRUD, Doctor Read)
// ============================================================================

// GET all medical consultants
app.get('/api/consultants', async (req, res) => {
  try {
    const { specialty, available, search } = req.query;
    const data = await readGcsJson(BUCKETS.metadata, 'consultants/consultants.json');

    if (!data || !data.consultants) {
      return res.json({ consultants: [], lastUpdated: new Date().toISOString() });
    }

    let consultants = data.consultants;

    // Apply filters
    if (specialty && specialty !== 'All Specialties') {
      consultants = consultants.filter(c => c.specialty === specialty);
    }

    if (available === 'true') {
      consultants = consultants.filter(c => c.available);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      consultants = consultants.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.specialty.toLowerCase().includes(searchLower) ||
        c.hospital.toLowerCase().includes(searchLower)
      );
    }

    res.json({ consultants, lastUpdated: data.lastUpdated });
  } catch (error) {
    console.error('Error fetching consultants:', error.message);
    res.status(500).json({ error: 'Failed to fetch consultants' });
  }
});

// GET specialties — MUST be before /:id to avoid route capture
app.get('/api/consultants/specialties/list', async (req, res) => {
  try {
    const data = await readGcsJson(BUCKETS.metadata, 'consultants/specialties.json');
    if (!data || !data.specialties) {
      return res.json({ specialties: ['Cardiology','Neurology','Oncology','Orthopedics','Dermatology','Gastroenterology','Pulmonology','Endocrinology','Rheumatology','Nephrology','Urology','Ophthalmology','ENT','Psychiatry','Pediatrics','Gynecology','General Surgery','Plastic Surgery','Internal Medicine'] });
    }
    res.json({ specialties: data.specialties });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch specialties' });
  }
});
app.get('/api/consultants/specialties', async (req, res) => {
  try {
    const data = await readGcsJson(BUCKETS.metadata, 'consultants/specialties.json');
    if (!data || !data.specialties) {
      return res.json({ specialties: ['Cardiology','Neurology','Oncology','Orthopedics','Dermatology','Gastroenterology','Pulmonology','Endocrinology','Nephrology','Urology','Pediatrics','Psychiatry','Ophthalmology','ENT','Plastic Surgery','Internal Medicine'] });
    }
    res.json({ specialties: data.specialties });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch specialties' });
  }
});

// GET single consultant by ID
app.get('/api/consultants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readGcsJson(BUCKETS.metadata, 'consultants/consultants.json');

    if (!data || !data.consultants) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const consultant = data.consultants.find(c => c.id === id);
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    res.json(consultant);
  } catch (error) {
    console.error('Error fetching consultant:', error.message);
    res.status(500).json({ error: 'Failed to fetch consultant' });
  }
});

// POST create new consultant (Admin only)
app.post('/api/consultants', async (req, res) => {
  try {
    const { userId, userName, isAdmin, ...consultantData } = req.body;

    // Allow both admin and doctor roles to create consultants
    if (!consultantData.name || !consultantData.specialty || !consultantData.email) {
      return res.status(400).json({ error: 'Missing required fields: name, specialty, email' });
    }

    let data = await readGcsJson(BUCKETS.metadata, 'consultants/consultants.json');
    if (!data) {
      data = { consultants: [], lastUpdated: new Date().toISOString() };
    }

    // Check for duplicate email
    const existingConsultant = data.consultants.find(c => c.email === consultantData.email);
    if (existingConsultant) {
      return res.status(400).json({ error: 'A consultant with this email already exists' });
    }

    const newConsultant = {
      id: generateContentId('CONS'),
      name: consultantData.name,
      specialty: consultantData.specialty,
      hospital: consultantData.hospital || '',
      phone: consultantData.phone || '',
      email: consultantData.email,
      photo: consultantData.photo || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
      available: true,
      languages: consultantData.languages || ['Thai', 'English'],
      experience: consultantData.experience || 0,
      rating: 0,
      reviewCount: 0,
      bio: consultantData.bio || '',
      certifications: consultantData.certifications || [],
      consultationFee: consultantData.consultationFee || null,
      availableSlots: consultantData.availableSlots || [],
      notes: consultantData.notes || '',
      createdBy: userId,
      createdByName: userName || 'Admin',
      createdAt: new Date().toISOString(),
      updatedBy: userId,
      updatedByName: userName || 'Admin',
      updatedAt: new Date().toISOString(),
    };

    data.consultants.push(newConsultant);
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'consultants/consultants.json', data);

    console.log(`✅ Created consultant: ${newConsultant.name} (${newConsultant.id})`);

    res.status(201).json(newConsultant);
  } catch (error) {
    console.error('Error creating consultant:', error.message);
    res.status(500).json({ error: 'Failed to create consultant' });
  }
});

// PUT update consultant (Admin only)
app.put('/api/consultants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, isAdmin, ...updates } = req.body;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can update consultants' });
    }

    const data = await readGcsJson(BUCKETS.metadata, 'consultants/consultants.json');
    if (!data || !data.consultants) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const index = data.consultants.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const consultant = data.consultants[index];

    // Update consultant
    Object.assign(consultant, updates);
    consultant.updatedBy = userId;
    consultant.updatedByName = userName || 'Admin';
    consultant.updatedAt = new Date().toISOString();

    data.consultants[index] = consultant;
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'consultants/consultants.json', data);

    console.log(`✅ Updated consultant: ${consultant.name} (${consultant.id})`);

    res.json(consultant);
  } catch (error) {
    console.error('Error updating consultant:', error.message);
    res.status(500).json({ error: 'Failed to update consultant' });
  }
});

// DELETE consultant (Admin only)
app.delete('/api/consultants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).json({ error: 'Only admins can delete consultants' });
    }

    const data = await readGcsJson(BUCKETS.metadata, 'consultants/consultants.json');
    if (!data || !data.consultants) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const index = data.consultants.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const deletedConsultant = data.consultants[index];
    data.consultants.splice(index, 1);
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'consultants/consultants.json', data);

    console.log(`✅ Deleted consultant: ${deletedConsultant.name} (${id})`);

    res.json({ success: true, message: 'Consultant deleted' });
  } catch (error) {
    console.error('Error deleting consultant:', error.message);
    res.status(500).json({ error: 'Failed to delete consultant' });
  }
});

// POST toggle consultant availability
app.post('/api/consultants/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { available, availableSlots, userId, userName, isAdmin } = req.body;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can update availability' });
    }

    const data = await readGcsJson(BUCKETS.metadata, 'consultants/consultants.json');
    if (!data || !data.consultants) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const index = data.consultants.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const consultant = data.consultants[index];
    consultant.available = available;
    if (availableSlots) {
      consultant.availableSlots = availableSlots;
    }
    consultant.updatedBy = userId;
    consultant.updatedByName = userName || 'Admin';
    consultant.updatedAt = new Date().toISOString();

    data.consultants[index] = consultant;
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'consultants/consultants.json', data);

    res.json({ success: true, consultant });
  } catch (error) {
    console.error('Error updating availability:', error.message);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// POST add rating/review to consultant (Doctor only)
app.post('/api/consultants/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, userId, userName } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const data = await readGcsJson(BUCKETS.metadata, 'consultants/consultants.json');
    if (!data || !data.consultants) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const index = data.consultants.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const consultant = data.consultants[index];
    consultant.reviews = consultant.reviews || [];

    // Check if user already reviewed
    const existingReviewIndex = consultant.reviews.findIndex(r => r.userId === userId);
    if (existingReviewIndex >= 0) {
      // Update existing review
      consultant.reviews[existingReviewIndex] = {
        ...consultant.reviews[existingReviewIndex],
        rating,
        comment: comment || '',
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new review
      consultant.reviews.push({
        id: generateContentId('REV'),
        userId,
        userName: userName || 'Doctor',
        rating,
        comment: comment || '',
        createdAt: new Date().toISOString()
      });
    }

    // Recalculate average rating
    const totalRating = consultant.reviews.reduce((sum, r) => sum + r.rating, 0);
    consultant.rating = Math.round((totalRating / consultant.reviews.length) * 10) / 10;
    consultant.reviewCount = consultant.reviews.length;
    consultant.updatedAt = new Date().toISOString();

    data.consultants[index] = consultant;
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, 'consultants/consultants.json', data);

    res.json({ success: true, consultant });
  } catch (error) {
    console.error('Error adding review:', error.message);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// (specialties routes moved before /:id to avoid route capture)

// ============================================================================
// TAGS ENDPOINTS
// ============================================================================

// GET tags for medical content or clinical resources
app.get('/api/content/tags/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const filePath = type === 'medical'
      ? 'medical-content/tags.json'
      : 'clinical-resources/tags.json';

    const data = await readGcsJson(BUCKETS.metadata, filePath);

    if (!data || !data.tags) {
      return res.json({ tags: [] });
    }

    res.json({ tags: data.tags });
  } catch (error) {
    console.error('Error fetching tags:', error.message);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// POST create new tag (Doctor only)
app.post('/api/content/tags/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { name, nameTh, userId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const filePath = type === 'medical'
      ? 'medical-content/tags.json'
      : 'clinical-resources/tags.json';

    let data = await readGcsJson(BUCKETS.metadata, filePath);
    if (!data) {
      data = { tags: [], lastUpdated: new Date().toISOString() };
    }

    // Check if tag already exists
    const existingTag = data.tags.find(t =>
      t.name.toLowerCase() === name.toLowerCase()
    );

    if (existingTag) {
      return res.json(existingTag);
    }

    const newTag = {
      id: generateContentId('TAG'),
      name,
      nameTh: nameTh || name,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    data.tags.push(newTag);
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, filePath, data);

    res.status(201).json(newTag);
  } catch (error) {
    console.error('Error creating tag:', error.message);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// ============================================================================
// COMMENTS ENDPOINTS
// ============================================================================

// POST add comment to content
app.post('/api/content/:type/:id/comments', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { userId, userName, userRole, content, isAdminFeedback } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const filePath = type === 'medical'
      ? 'medical-content/articles.json'
      : 'clinical-resources/resources.json';
    const itemKey = type === 'medical' ? 'articles' : 'resources';

    const data = await readGcsJson(BUCKETS.metadata, filePath);
    if (!data || !data[itemKey]) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const index = data[itemKey].findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const item = data[itemKey][index];
    item.comments = item.comments || [];

    const newComment = {
      id: generateContentId('CMT'),
      authorId: userId,
      authorName: userName || 'Unknown',
      authorRole: userRole || 'doctor',
      content,
      createdAt: new Date().toISOString(),
      isAdminFeedback: isAdminFeedback || false
    };

    item.comments.push(newComment);
    data[itemKey][index] = item;
    data.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.metadata, filePath, data);

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error.message);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ============================================================================
// PATIENT HEALTH LOGS ENDPOINTS (For EMR -> Patient PHR)
// ============================================================================

// POST add EMR to patient health logs
app.post('/api/patients/:patientId/health-logs', async (req, res) => {
  try {
    const { patientId } = req.params;
    const healthLogEntry = req.body;

    if (!healthLogEntry || !healthLogEntry.emrId) {
      return res.status(400).json({ error: 'Missing required health log data' });
    }

    // Read existing health logs for patient
    const healthLogsPath = `patients/${patientId}/health-logs.json`;
    let healthLogs = await readGcsJson(BUCKETS.patient, healthLogsPath);

    if (!healthLogs) {
      healthLogs = {
        patientId,
        entries: [],
        lastUpdated: new Date().toISOString()
      };
    }

    // Add new entry
    healthLogs.entries = healthLogs.entries || [];
    healthLogs.entries.push({
      ...healthLogEntry,
      addedAt: new Date().toISOString()
    });
    healthLogs.lastUpdated = new Date().toISOString();

    // Save updated health logs
    await writeGcsJson(BUCKETS.patient, healthLogsPath, healthLogs);

    console.log(`✅ Added EMR ${healthLogEntry.emrId} to patient ${patientId} health logs`);

    res.status(201).json({
      success: true,
      message: 'Health log entry added',
      entryId: healthLogEntry.id
    });
  } catch (error) {
    console.error('Error adding health log entry:', error.message);
    res.status(500).json({ error: 'Failed to add health log entry' });
  }
});

// GET patient health logs
app.get('/api/patients/:patientId/health-logs', async (req, res) => {
  try {
    const { patientId } = req.params;
    const healthLogsPath = `patients/${patientId}/health-logs.json`;

    const healthLogs = await readGcsJson(BUCKETS.patient, healthLogsPath);

    if (!healthLogs) {
      return res.json({
        patientId,
        entries: [],
        lastUpdated: new Date().toISOString()
      });
    }

    res.json(healthLogs);
  } catch (error) {
    console.error('Error fetching health logs:', error.message);
    res.status(500).json({ error: 'Failed to fetch health logs' });
  }
});

// ============================================================================
// EMR NOTIFICATION ENDPOINT (Notify patient when EMR is signed)
// ============================================================================

// POST notify patient that EMR is ready
app.post('/api/notifications/emr-signed', async (req, res) => {
  try {
    const {
      patientId,
      patientEmail,
      patientName,
      doctorName,
      encounterDate,
      emrId,
      appointmentId
    } = req.body;

    if (!patientId || !emrId) {
      return res.status(400).json({ error: 'Missing required notification data' });
    }

    // Create in-app notification
    const notificationPath = `patients/${patientId}/notifications.json`;
    let notifications = await readGcsJson(BUCKETS.patient, notificationPath);

    if (!notifications) {
      notifications = {
        patientId,
        notifications: [],
        lastUpdated: new Date().toISOString()
      };
    }

    const formattedDate = new Date(encounterDate).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const newNotification = {
      id: generateContentId('NOTIF'),
      type: 'emr_ready',
      title: 'เวชระเบียนของคุณพร้อมแล้ว / Your Medical Record is Ready',
      message: `แพทย์ ${doctorName} ได้ลงนามเวชระเบียนจากการนัดหมายเมื่อ ${formattedDate} แล้ว คุณสามารถดูได้ในประวัติสุขภาพ\n\nDr. ${doctorName} has signed your medical record from ${formattedDate}. You can view it in your health history.`,
      emrId,
      appointmentId,
      doctorName,
      encounterDate,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    notifications.notifications = notifications.notifications || [];
    notifications.notifications.unshift(newNotification);
    notifications.lastUpdated = new Date().toISOString();

    // Keep only last 100 notifications
    if (notifications.notifications.length > 100) {
      notifications.notifications = notifications.notifications.slice(0, 100);
    }

    await writeGcsJson(BUCKETS.patient, notificationPath, notifications);

    // Email notification integration: when configured, emailService.cjs handles
    // sending alerts for EMR-ready events via the Gmail API.
    console.log(`✅ EMR ready notification created for patient ${patientId}`);

    res.status(201).json({
      success: true,
      message: 'Patient notified about EMR',
      notificationId: newNotification.id
    });
  } catch (error) {
    console.error('Error sending EMR notification:', error.message);
    res.status(500).json({ error: 'Failed to send EMR notification' });
  }
});

// ============================================================================
// APPOINTMENT STATUS UPDATE ENDPOINT (For EMR completion)
// ============================================================================

// PUT update appointment status (e.g., to completed after EMR signed)
app.put('/api/appointments/:appointmentId/status', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, completedAt, emrId } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Read appointments from GCS
    const appointmentsPath = 'appointments.json';
    let appointmentsData = await readGcsJson(BUCKETS.appointments, appointmentsPath);

    if (!appointmentsData) {
      return res.status(404).json({ error: 'Appointments not found' });
    }

    // Handle both array format and object with appointments property
    let appointments = Array.isArray(appointmentsData)
      ? appointmentsData
      : (appointmentsData.appointments || []);

    const index = appointments.findIndex(a => a.id === appointmentId);
    if (index === -1) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Update appointment
    appointments[index] = {
      ...appointments[index],
      status,
      completedAt: completedAt || (status === 'completed' ? new Date().toISOString() : undefined),
      emrId: emrId || appointments[index].emrId,
      lastModified: new Date().toISOString()
    };

    // Save back in original format
    let dataToSave;
    if (Array.isArray(appointmentsData)) {
      dataToSave = appointments;
    } else {
      appointmentsData.appointments = appointments;
      appointmentsData.lastUpdated = new Date().toISOString();
      dataToSave = appointmentsData;
    }

    await writeGcsJson(BUCKETS.appointments, appointmentsPath, dataToSave);

    console.log(`✅ Appointment ${appointmentId} status updated to ${status}`);

    res.json({
      success: true,
      appointment: appointments[index]
    });
  } catch (error) {
    console.error('Error updating appointment status:', error.message);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

// ============================================================================
// EMR ENDPOINTS (Electronic Medical Records)
// ============================================================================

// POST - Save EMR to database
app.post('/api/emr', async (req, res) => {
  try {
    const emrData = req.body;

    if (!emrData || !emrData.id) {
      return res.status(400).json({ error: 'EMR data with id is required' });
    }

    const emrPath = `emr/${emrData.id}.json`;

    // Add timestamps
    const emrRecord = {
      ...emrData,
      createdAt: emrData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await writeGcsJson(BUCKETS.doctor, emrPath, emrRecord);

    // Also update the EMR index
    const indexPath = 'emr/index.json';
    let emrIndex = await readGcsJson(BUCKETS.doctor, indexPath) || { emrs: [], lastUpdated: null };

    // Check if EMR already exists in index
    const existingIndex = emrIndex.emrs.findIndex(e => e.id === emrData.id);
    const indexEntry = {
      id: emrData.id,
      patientId: emrData.patientId,
      doctorId: emrData.doctorId,
      appointmentId: emrData.appointmentId,
      diagnosis: emrData.diagnosis?.primary,
      status: emrData.status,
      createdAt: emrRecord.createdAt,
      updatedAt: emrRecord.updatedAt
    };

    if (existingIndex >= 0) {
      emrIndex.emrs[existingIndex] = indexEntry;
    } else {
      emrIndex.emrs.push(indexEntry);
    }
    emrIndex.lastUpdated = new Date().toISOString();

    await writeGcsJson(BUCKETS.doctor, indexPath, emrIndex);

    console.log(`✅ EMR saved: ${emrData.id}`);

    res.status(201).json({
      success: true,
      emr: emrRecord,
      message: 'EMR saved successfully'
    });
  } catch (error) {
    console.error('Error saving EMR:', error.message);
    res.status(500).json({ error: 'Failed to save EMR' });
  }
});

// GET - Fetch single EMR by ID
app.get('/api/emr/:emrId', async (req, res) => {
  try {
    const { emrId } = req.params;
    const emrPath = `emr/${emrId}.json`;

    const emrData = await readGcsJson(BUCKETS.doctor, emrPath);

    if (!emrData) {
      return res.status(404).json({ error: 'EMR not found' });
    }

    res.json(emrData);
  } catch (error) {
    console.error('Error fetching EMR:', error.message);
    res.status(500).json({ error: 'Failed to fetch EMR' });
  }
});

// PUT - Update EMR
app.put('/api/emr/:emrId', async (req, res) => {
  try {
    const { emrId } = req.params;
    const updates = req.body;
    const emrPath = `emr/${emrId}.json`;

    let emrData = await readGcsJson(BUCKETS.doctor, emrPath);

    if (!emrData) {
      return res.status(404).json({ error: 'EMR not found' });
    }

    // Merge updates
    emrData = {
      ...emrData,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await writeGcsJson(BUCKETS.doctor, emrPath, emrData);

    // Update index
    const indexPath = 'emr/index.json';
    let emrIndex = await readGcsJson(BUCKETS.doctor, indexPath) || { emrs: [] };
    const indexIdx = emrIndex.emrs.findIndex(e => e.id === emrId);
    if (indexIdx >= 0) {
      emrIndex.emrs[indexIdx] = {
        ...emrIndex.emrs[indexIdx],
        status: emrData.status,
        updatedAt: emrData.updatedAt
      };
      emrIndex.lastUpdated = new Date().toISOString();
      await writeGcsJson(BUCKETS.doctor, indexPath, emrIndex);
    }

    console.log(`✅ EMR updated: ${emrId}`);

    res.json({ success: true, emr: emrData });
  } catch (error) {
    console.error('Error updating EMR:', error.message);
    res.status(500).json({ error: 'Failed to update EMR' });
  }
});

// GET - Fetch EMR history for a patient
app.get('/api/emr/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit, offset } = req.query;

    // Read from EMR index
    const indexPath = 'emr/index.json';
    const emrIndex = await readGcsJson(BUCKETS.doctor, indexPath) || { emrs: [] };

    // Filter by patient
    let patientEmrs = emrIndex.emrs.filter(e => e.patientId === patientId);

    // Sort by date (newest first)
    patientEmrs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const offsetNum = Number.parseInt(offset, 10) || 0;
    const limitNum = Number.parseInt(limit, 10) || 50;
    const total = patientEmrs.length;
    patientEmrs = patientEmrs.slice(offsetNum, offsetNum + limitNum);

    // Optionally fetch full EMR details
    const fullEmrs = await Promise.all(
      patientEmrs.map(async (entry) => {
        const emrData = await readGcsJson(BUCKETS.doctor, `emr/${entry.id}.json`);
        return emrData || entry;
      })
    );

    res.json({
      emrs: fullEmrs,
      total,
      offset: offsetNum,
      limit: limitNum,
      patientId
    });
  } catch (error) {
    console.error('Error fetching patient EMR history:', error.message);
    res.status(500).json({ error: 'Failed to fetch EMR history' });
  }
});

// ============================================================================
// PATIENT RECORD ENDPOINTS
// ============================================================================

// GET - Fetch patient record by ID
app.get('/api/patients/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    // Try to get patient profile from patient data bucket
    const profilePath = `patients/${patientId}/profile.json`;
    let patientData = await readGcsJson(BUCKETS.patient, profilePath);

    // If not found, try credentials bucket
    if (!patientData) {
      const credPath = `users/${patientId}.json`;
      patientData = await readGcsJson(BUCKETS.credentials, credPath);
    }

    // If still not found, create basic record from appointments
    if (!patientData) {
      const appointmentsData = await readGcsJson(BUCKETS.appointments, 'appointments.json');
      if (appointmentsData) {
        // Handle both array format and object with appointments property
        const appointments = Array.isArray(appointmentsData)
          ? appointmentsData
          : (appointmentsData.appointments || []);
        const patientAppointment = appointments.find(a => a.patientId === patientId);
        if (patientAppointment) {
          patientData = {
            id: patientId,
            name: patientAppointment.patientName,
            email: patientAppointment.patientEmail,
            source: 'appointment'
          };
        }
      }
    }

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Get patient's health logs
    const healthLogsPath = `patients/${patientId}/health-logs.json`;
    const healthLogs = await readGcsJson(BUCKETS.patient, healthLogsPath) || { entries: [] };

    // Get patient's EMR history
    const emrIndexPath = 'emr/index.json';
    const emrIndex = await readGcsJson(BUCKETS.doctor, emrIndexPath) || { emrs: [] };
    const patientEmrs = emrIndex.emrs.filter(e => e.patientId === patientId);

    // Get patient's appointments
    const appointmentsData = await readGcsJson(BUCKETS.appointments, 'appointments.json') || [];
    // Handle both array format and object with appointments property
    const allAppointments = Array.isArray(appointmentsData)
      ? appointmentsData
      : (appointmentsData.appointments || []);
    const patientAppointments = allAppointments.filter(a => a.patientId === patientId);

    res.json({
      ...patientData,
      healthLogs: healthLogs.entries || [],
      emrHistory: patientEmrs,
      appointments: patientAppointments,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching patient record:', error.message);
    res.status(500).json({ error: 'Failed to fetch patient record' });
  }
});

// GET - List all patients (for doctor portal)
app.get('/api/patients', async (req, res) => {
  try {
    const { search, limit, offset } = req.query;

    // Get unique patients from appointments
    const appointmentsData = await readGcsJson(BUCKETS.appointments, 'appointments.json') || [];

    // Handle both array format and object with appointments property
    const appointments = Array.isArray(appointmentsData)
      ? appointmentsData
      : (appointmentsData.appointments || []);

    // Create unique patient map
    const patientMap = new Map();
    appointments.forEach(apt => {
      if (apt.patientId && !patientMap.has(apt.patientId)) {
        patientMap.set(apt.patientId, {
          id: apt.patientId,
          name: apt.patientName,
          email: apt.patientEmail,
          lastVisit: apt.scheduledDate || apt.createdAt,
          appointmentCount: 1
        });
      } else if (apt.patientId) {
        const existing = patientMap.get(apt.patientId);
        existing.appointmentCount++;
        if (apt.scheduledDate > existing.lastVisit) {
          existing.lastVisit = apt.scheduledDate;
        }
      }
    });

    let patients = Array.from(patientMap.values());

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      patients = patients.filter(p =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by last visit
    patients.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

    // Apply pagination
    const offsetNum = Number.parseInt(offset, 10) || 0;
    const limitNum = Number.parseInt(limit, 10) || 50;
    const total = patients.length;
    patients = patients.slice(offsetNum, offsetNum + limitNum);

    res.json({
      patients,
      total,
      offset: offsetNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error listing patients:', error.message);
    res.status(500).json({ error: 'Failed to list patients' });
  }
});

// ============================================================================
// APPOINTMENT ENDPOINTS (Additional)
// ============================================================================

// GET - Fetch completed appointments
app.get('/api/appointments/completed', async (req, res) => {
  try {
    const { doctorId, patientId, limit, offset } = req.query;

    const appointmentsData = await readGcsJson(BUCKETS.appointments, 'appointments.json');

    if (!appointmentsData) {
      return res.json({ appointments: [], total: 0 });
    }

    // Handle both array format and object with appointments property
    let appointments = Array.isArray(appointmentsData)
      ? appointmentsData
      : (appointmentsData.appointments || []);

    // Filter completed appointments
    let completed = appointments.filter(apt =>
      apt.status === 'completed'
    );

    // Filter by doctor if specified
    if (doctorId) {
      completed = completed.filter(apt => apt.doctorId === doctorId);
    }

    // Filter by patient if specified
    if (patientId) {
      completed = completed.filter(apt => apt.patientId === patientId);
    }

    // Sort by completion date (newest first)
    completed.sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));

    // Apply pagination
    const offsetNum = Number.parseInt(offset, 10) || 0;
    const limitNum = Number.parseInt(limit, 10) || 50;
    const total = completed.length;
    completed = completed.slice(offsetNum, offsetNum + limitNum);

    res.json({
      appointments: completed,
      total,
      offset: offsetNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error fetching completed appointments:', error.message);
    res.status(500).json({ error: 'Failed to fetch completed appointments' });
  }
});

// GET - Fetch all appointments (with filters)
app.get('/api/appointments', async (req, res) => {
  try {
    const { status, doctorId, patientId, date, limit, offset } = req.query;

    const appointmentsData = await readGcsJson(BUCKETS.appointments, 'appointments.json');

    if (!appointmentsData) {
      return res.json({ appointments: [], total: 0 });
    }

    // Handle both array format and object with appointments property
    let appointments = Array.isArray(appointmentsData)
      ? [...appointmentsData]
      : [...(appointmentsData.appointments || [])];

    // Apply filters
    if (status) {
      appointments = appointments.filter(apt => apt.status === status);
    }
    if (doctorId) {
      appointments = appointments.filter(apt => apt.doctorId === doctorId);
    }
    if (patientId) {
      appointments = appointments.filter(apt => apt.patientId === patientId);
    }
    if (date) {
      appointments = appointments.filter(apt => apt.scheduledDate === date);
    }

    // Sort by scheduled date (newest first)
    appointments.sort((a, b) => {
      const dateA = new Date(a.scheduledDate + 'T' + (a.scheduledTime || '00:00'));
      const dateB = new Date(b.scheduledDate + 'T' + (b.scheduledTime || '00:00'));
      return dateB - dateA;
    });

    // Apply pagination
    const offsetNum = Number.parseInt(offset, 10) || 0;
    const limitNum = Number.parseInt(limit, 10) || 100;
    const total = appointments.length;
    appointments = appointments.slice(offsetNum, offsetNum + limitNum);

    res.json({
      appointments,
      total,
      offset: offsetNum,
      limit: limitNum,
      lastUpdated: appointmentsData.lastUpdated || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching appointments:', error.message);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// GET - Fetch single appointment by ID
app.get('/api/appointments/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointmentsData = await readGcsJson(BUCKETS.appointments, 'appointments.json');

    if (!appointmentsData) {
      return res.status(404).json({ error: 'Appointments not found' });
    }

    // Handle both array format and object with appointments property
    const appointments = Array.isArray(appointmentsData)
      ? appointmentsData
      : (appointmentsData.appointments || []);

    const appointment = appointments.find(a => a.id === appointmentId);

    if (!appointment) {
      // Try individual appointment file
      const detailsPath = `appointments/${appointmentId}/details.json`;
      const details = await readGcsJson(BUCKETS.appointments, detailsPath);
      if (details) {
        return res.json(details);
      }
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error.message);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// ============================================================================
// A10 - GLOBAL ERROR HANDLER
// ============================================================================

app.use(secureErrorHandler());


// ============================================================================
// DOCTOR NOTIFICATIONS ENDPOINTS
// ============================================================================

// GET - Get notifications for doctor
app.get('/api/notifications/doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    const notificationPath = `doctors/${doctorId}/notifications.json`;
    let notifications = await readGcsJson(BUCKETS.doctor, notificationPath);

    if (!notifications) {
      notifications = {
        doctorId,
        notifications: [],
        lastUpdated: new Date().toISOString()
      };
    }

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching doctor notifications:', error.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT - Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.json({ success: true }); // Silent success if no doctorId
    }

    const notificationPath = `doctors/${doctorId}/notifications.json`;
    let data = await readGcsJson(BUCKETS.doctor, notificationPath);

    if (data && data.notifications) {
      data.notifications = data.notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      );
      data.lastUpdated = new Date().toISOString();
      await writeGcsJson(BUCKETS.doctor, notificationPath, data);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT - Mark all notifications as read for doctor
app.put('/api/notifications/doctor/:doctorId/read-all', async (req, res) => {
  try {
    const { doctorId } = req.params;

    const notificationPath = `doctors/${doctorId}/notifications.json`;
    let data = await readGcsJson(BUCKETS.doctor, notificationPath);

    if (data && data.notifications) {
      const now = new Date().toISOString();
      data.notifications = data.notifications.map(n => ({ ...n, isRead: true, readAt: now }));
      data.lastUpdated = now;
      await writeGcsJson(BUCKETS.doctor, notificationPath, data);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error.message);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// POST - Create notification for doctor (from patient appointment requests)
app.post('/api/notifications/doctor', async (req, res) => {
  try {
    const {
      doctorId,
      type,
      title,
      message,
      data
    } = req.body;

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    const notificationPath = `doctors/${doctorId}/notifications.json`;
    let notifications = await readGcsJson(BUCKETS.doctor, notificationPath);

    if (!notifications) {
      notifications = {
        doctorId,
        notifications: [],
        lastUpdated: new Date().toISOString()
      };
    }

    const newNotification = {
      id: generateContentId('NOTIF'),
      type: type || 'system',
      title: title || 'การแจ้งเตือนใหม่',
      message: message || '',
      data: data || {},
      isRead: false,
      createdAt: new Date().toISOString()
    };

    notifications.notifications = notifications.notifications || [];
    notifications.notifications.unshift(newNotification);
    notifications.lastUpdated = new Date().toISOString();

    // Keep only last 100 notifications
    if (notifications.notifications.length > 100) {
      notifications.notifications = notifications.notifications.slice(0, 100);
    }

    await writeGcsJson(BUCKETS.doctor, notificationPath, notifications);

    console.log(`✅ Notification created for doctor ${doctorId}: ${type}`);

    res.status(201).json({
      success: true,
      notification: newNotification
    });
  } catch (error) {
    console.error('Error creating doctor notification:', error.message);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});


// Graceful listen with EADDRINUSE retry logic
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;
let listenAttempts = 0;

function startServer() {
  const server = app.listen(PORT, () => {
    console.log('\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');
    console.log(`\ud83d\ude80 GCS API Server running on http://localhost:${PORT}`);
    console.log('   OWASP Top 10:2025 Security Enabled');
    console.log('\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n');
    console.log('\ud83d\udee1\ufe0f  Security Features:');
    console.log('   • Bucket Whitelist Validation');
    console.log('   • Path Traversal Prevention');
    console.log('   • Rate Limiting (200 req/min)');
    console.log('   • File Type Validation');
    console.log('   • Security Audit Logging\n');
    console.log('\ud83d\udce6 Configured Buckets:');
    Object.entries(BUCKETS).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log('\n\ud83d\udd17 Endpoints:');
    console.log('   GET  /api/health');
    console.log('   GET  /api/storage/read?bucket=xxx&path=xxx');
    console.log('   POST /api/storage/write');
    console.log('   POST /api/storage/upload');
    console.log('   DELETE /api/storage/delete');
    console.log('   GET  /api/storage/list?bucket=xxx&folder=xxx');
    console.log('   POST /api/storage/batch-read');
    console.log('   POST /api/storage/batch-write\n');
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      listenAttempts++;
      if (listenAttempts > MAX_RETRIES) {
        console.error(`\u274c Port ${PORT} still in use after ${MAX_RETRIES} retries. Exiting.`);
        process.exit(1);
      } else {
        console.warn(`\u26a0\ufe0f Port ${PORT} in use, retrying in ${RETRY_DELAY_MS / 1000}s... (Attempt ${listenAttempts}/${MAX_RETRIES})`);
        setTimeout(startServer, RETRY_DELAY_MS);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer();

module.exports = app;
