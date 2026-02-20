import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/postgresDataService';

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
      (req as any).userId = result.user.id;
      (req as any).user = result.user;
      (req as any).patientId = result.user.patient_id || result.user.id;

      return next();
    } catch (error) {
      console.error('PostgreSQL session lookup error:', error);
      return res.status(401).json({ error: 'Invalid session' });
    }
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
}
