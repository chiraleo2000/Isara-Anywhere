import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/postgresDataService';

/** Authenticated request with user data added by authMiddleware */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: { id: string; email: string; role: 'patient' | 'admin' | 'doctor'; patient_id?: string; patientId?: string; userId?: string; [key: string]: unknown };
  patientId?: string;
}

// Authentication middleware
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // PostgreSQL authentication (primary path)
    try {
      const result = await AuthService.validateSession(token);
      
      if (!result) {
        return res.status(401).json({ error: 'Session expired or invalid' });
      }

      // Add user info to request
      const authReq = req as AuthenticatedRequest;
      authReq.userId = result.user.id;
      authReq.user = result.user;
      authReq.patientId = result.user.patient_id || result.user.id;

      return next();
    } catch (error) {
      console.error('PostgreSQL session lookup error:', error);
      return res.status(401).json({ error: 'Invalid session' });
    }
  } catch (error: unknown) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
}
