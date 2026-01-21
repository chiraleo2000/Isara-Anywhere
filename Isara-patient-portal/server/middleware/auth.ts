import { Request, Response, NextFunction } from 'express';
import { storage, GCS_BUCKETS, USE_POSTGRESQL } from '../index';
import { AuthService } from '../services/postgresDataService';

// Helper function to read JSON from GCS
async function readJSON(bucket: string, filePath: string): Promise<any> {
  try {
    const file = storage.bucket(bucket).file(filePath);
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (error: any) {
    if (error.code === 404) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

// Authentication middleware
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Use PostgreSQL authentication if configured
    if (USE_POSTGRESQL) {
      try {
        const result = await AuthService.validateSession(token);
        
        if (!result) {
          return res.status(401).json({ error: 'Session expired or invalid' });
        }

        // Add user info to request
        (req as any).userId = result.user.id;
        (req as any).user = result.user;
        (req as any).patientId = result.user.patient_id || result.user.id;

        return next();
      } catch (error) {
        console.error('PostgreSQL session lookup error:', error);
        return res.status(401).json({ error: 'Invalid session' });
      }
    }

    // GCS Authentication (legacy fallback)
    // Token format: token_session_TIMESTAMP_RANDOM_TIMESTAMP
    // Session file format: sessions/session_TIMESTAMP_RANDOM.json
    // Extract session ID (session_TIMESTAMP_RANDOM) from token
    const tokenParts = token.split('_');
    // tokenParts = ['token', 'session', 'TIMESTAMP', 'RANDOM', 'TIMESTAMP']
    if (tokenParts.length < 4) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    const sessionId = `${tokenParts[1]}_${tokenParts[2]}_${tokenParts[3]}`;

    try {
      const session = await readJSON(GCS_BUCKETS.AUTH, `sessions/${sessionId}.json`);

      if (new Date(session.expiresAt) < new Date()) {
        return res.status(401).json({ error: 'Session expired' });
      }

      // Add user ID to request
      (req as any).userId = session.userId;

      next();
    } catch (error) {
      console.error('Session lookup error:', error);
      return res.status(401).json({ error: 'Invalid session' });
    }
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: error.message });
  }
}
