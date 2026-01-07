import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/auth';
import phrRoutes from './routes/phr';
import appointmentRoutes from './routes/appointments';
import appointmentPoolRoutes from './routes/appointment-pool';
import doctorRoutes from './routes/doctors';
import pdpaRoutes from './routes/pdpa';
import metadataRoutes from './routes/metadata';
import aiRoutes from './routes/ai';
import gcsRoutes from './routes/gcs';
import googleServicesRoutes from './routes/google-services';
import contentRoutes from './routes/content';
import videoMeetingRoutes from './routes/video-meeting';

const app: Express = express();
const PORT = process.env.PORT || 3004;

const GCS_BUCKETS = {
  AUTH: process.env.GCS_BUCKET_AUTH || process.env.VITE_GCS_BUCKET_AUTH || 'izara-users-credentials',
  PATIENT: process.env.GCS_BUCKET_PATIENT || process.env.VITE_GCS_BUCKET_PATIENT || 'izara-patients-data',
  DOCTOR: process.env.GCS_BUCKET_DOCTOR || process.env.VITE_GCS_BUCKET_DOCTOR || 'izara-doctors-data',
  APPOINTMENTS: process.env.GCS_BUCKET_APPOINTMENTS || process.env.VITE_GCS_BUCKET_APPOINTMENTS || 'izara-appointments',
  METADATA: process.env.GCS_BUCKET_METADATA || process.env.VITE_GCS_BUCKET_METADATA || 'izara-meta-data',
};

let storage: Storage;

function initializeStorage(): Storage {
  const projectId = process.env.GCP_PROJECT_ID || process.env.VITE_GCP_PROJECT_ID || 'izara-telemedicine';
  
  // Check explicit env var first
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fs.existsSync(keyPath)) {
      console.log('Using GOOGLE_APPLICATION_CREDENTIALS:', keyPath);
      return new Storage({ projectId, keyFilename: keyPath });
    }
  }
  
  // Check multiple credential paths
  const credentialsPaths = [
    path.join(__dirname, '../credentials/service-account.json'),
    path.join(__dirname, '../../Isara-doctor-portal/public/izara-telemedicine-dd0b6abe2bc8.json'),
    '/var/secrets/google/service-account.json',
  ];
  
  for (const credPath of credentialsPaths) {
    if (fs.existsSync(credPath)) {
      console.log('Using credentials file:', credPath);
      return new Storage({ projectId, keyFilename: credPath });
    }
  }
  
  console.log('Using Application Default Credentials (ADC/Workload Identity)');
  return new Storage({ projectId });
}

try {
  storage = initializeStorage();
  console.log('✅ Google Cloud Storage initialized');
} catch (error) {
  console.error('❌ Failed to initialize GCS:', error);
  process.exit(1);
}

// Export storage instance for use in routes
export { storage, GCS_BUCKETS };

// Import OWASP Security Middleware
import {
  securityHeaders,
  rateLimit,
  securityAuditLog,
  requestLogger,
  secureErrorHandler,
  getClientIP,
  sanitizeRequestBody
} from './security/owasp-middleware';

// A02 - Allowed origins for CORS
const ALLOWED_ORIGINS: (string | RegExp | boolean)[] = process.env.NODE_ENV === 'production'
  ? [
      'https://patient.izara.com',
      'https://izara.com',
      'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
      'https://izara-doctor-portal-724889190329.asia-southeast1.run.app',
      /\.run\.app$/
    ]
  : ['http://localhost:3005', 'http://localhost:3004', 'http://127.0.0.1:3005', 'http://0.0.0.0:3005', true];

// OWASP Security Middleware

// A02 - Security Headers
app.use(securityHeaders());

// A09 - Request Logging with security context
app.use(requestLogger());

// A02 - CORS with origin validation
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin in development or same-origin
    if (!origin) {
      return callback(null, true);
    }
    // Check string, regex, and boolean matches
    if (ALLOWED_ORIGINS.some(allowed => {
      if (allowed === true) return true;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    })) {
      return callback(null, true);
    }
    securityAuditLog({
      event: 'PATIENT_PORTAL_CORS_VIOLATION',
      severity: 'WARN',
      origin
    });
    callback(new Error('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// A07 - Rate Limiting (increased for development/testing)
app.use(rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  maxRequests: 10000, // High limit for testing - 10000 requests per minute
  keyGenerator: (req) => getClientIP(req)
}));

// A06 - Body size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ➡️  ${req.method} ${req.path}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusIcon = status >= 400 ? '❌' : '✅';
    console.log(`[${timestamp}] ${statusIcon} ${req.method} ${req.path} - ${status} (${duration}ms)`);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Izara Patient Portal API',
    security: 'OWASP Top 10:2025 Compliant'
  });
});

// API Health check endpoint (for compatibility)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Izara Patient Portal API',
    version: '1.1.6',
    security: 'OWASP Top 10:2025 Compliant'
  });
});

// GCS connection check endpoint
app.get('/api/health/gcs', async (_req: Request, res: Response) => {
  try {
    // Test connection to each bucket
    const bucketStatus = await Promise.all(
      Object.entries(GCS_BUCKETS).map(async ([name, bucketName]) => {
        try {
          const bucket = storage.bucket(bucketName);
          const [exists] = await bucket.exists();
          return {
            name,
            bucket: bucketName,
            connected: exists,
          };
        } catch (error: any) {
          return {
            name,
            bucket: bucketName,
            connected: false,
            error: error.message,
          };
        }
      })
    );

    const allConnected = bucketStatus.every(b => b.connected);

    res.json({
      status: allConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      buckets: bucketStatus,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'GCS health check failed',
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/phr', phrRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/appointment-pool', appointmentPoolRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/pdpa', pdpaRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gcs', gcsRoutes);
app.use('/api/google', googleServicesRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/video-meeting', videoMeetingRoutes);

// Serve static frontend files in production (unified Docker image)
if (process.env.NODE_ENV === 'production') {
  // Check multiple possible static paths
  const possiblePaths = [
    path.join(__dirname, '../dist'),      // When running from /app/server
    path.join(__dirname, '../../dist'),   // Alternative path
    '/app/dist',                          // Absolute Docker path
    path.join(__dirname, '../'),          // Fallback
  ];
  
  let staticPath = possiblePaths[0];
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
      staticPath = p;
      console.log(`✅ Found static files at: ${p}`);
      break;
    }
  }
  
  app.use(express.static(staticPath));
  
  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next();
    }
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: `index.html not found at ${indexPath}` });
    }
  });
}

// A10 - Secure error handling middleware
app.use(secureErrorHandler());

// 404 handler for API routes
app.use((req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
    });
  }
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Verify GCS connection before starting server
async function verifyGCSConnection(): Promise<boolean> {
  console.log('\n🔍 Verifying Google Cloud Storage connection...\n');

  try {
    const results = await Promise.all(
      Object.entries(GCS_BUCKETS).map(async ([name, bucketName]) => {
        try {
          const bucket = storage.bucket(bucketName);
          const [exists] = await bucket.exists();

          if (exists) {
            console.log(`✅ ${name.padEnd(15)} | ${bucketName}`);
            return true;
          } else {
            console.log(`❌ ${name.padEnd(15)} | ${bucketName} (bucket not found)`);
            return false;
          }
        } catch (error: any) {
          console.log(`❌ ${name.padEnd(15)} | ${bucketName} (${error.message})`);
          return false;
        }
      })
    );

    const allConnected = results.every(r => r);

    if (allConnected) {
      console.log('\n✅ All GCS buckets are accessible!\n');
    } else {
      console.log('\n⚠️  Some GCS buckets are not accessible. Please check your configuration.\n');
    }

    return allConnected;
  } catch (error: any) {
    console.error('\n❌ Failed to verify GCS connection:', error.message, '\n');
    return false;
  }
}

// Start server
async function startServer() {
  try {
    // Verify GCS connection
    const gcsConnected = await verifyGCSConnection();

    if (!gcsConnected) {
      console.error('⚠️  Warning: Some GCS buckets are not accessible. Server will start but some features may not work.');
    }

    app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🚀 Izara Patient Portal API Server`);
      console.log(`🛡️  OWASP Top 10:2025 Security Enabled`);
      console.log(`📡 Server running on http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`☁️  GCS status: http://localhost:${PORT}/api/health/gcs`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
