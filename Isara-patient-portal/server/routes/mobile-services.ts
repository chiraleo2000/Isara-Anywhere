/**
 * Phase 2: Mobile Services Routes
 * Biometric Auth + API Connections + Device management
 * Merged from biometric.ts and api-connections.ts
 * 
 * @module routes/mobile-services
 * @version 2.0.0
 */

import { Router, Request, Response } from 'express';
import postgresDataService, { BiometricService, ApiConnectionService } from '../services/postgresDataService';
import crypto from 'node:crypto';

const { pool } = postgresDataService;

// Shared helper: Get user from session token
interface SessionUser { id: string; patient_id: string; email: string; name: string; role: string }
async function getUserFromToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;
  const result = await pool.query(
    `SELECT u.id, u.patient_id, u.email, u.name, u.role
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// BIOMETRIC AUTHENTICATION ROUTES — mounted at /api/biometric
// ============================================================================
export const biometricRouter = Router();

// REGISTER BIOMETRIC CREDENTIAL - POST /api/biometric/register
biometricRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { credentialType, publicKey, credentialId, deviceId, deviceName } = req.body;

    if (!credentialType || !publicKey || !credentialId || !deviceId) {
      return res.status(400).json({ error: 'credentialType, publicKey, credentialId, and deviceId are required' });
    }

    if (!['fingerprint', 'face_id', 'iris'].includes(credentialType)) {
      return res.status(400).json({ error: 'credentialType must be fingerprint, face_id, or iris' });
    }

    const credential = await BiometricService.register(user.id, {
      credentialType, publicKey, credentialId, deviceId, deviceName
    });

    await pool.query(
      'INSERT INTO user_settings (user_id, biometric_enabled) VALUES ($1, true) ON CONFLICT (user_id) DO UPDATE SET biometric_enabled = true, updated_at = NOW()',
      [user.id]
    );

    console.log(`[BIOMETRIC] Registered ${credentialType} for user ${user.id}`);
    res.status(201).json({ success: true, credential: { id: credential.id, credentialType: credential.credential_type, deviceId: credential.device_id } });
  } catch (error: unknown) {
    console.error('[BIOMETRIC] Registration error:', error);
    res.status(500).json({ error: 'Failed to register biometric credential' });
  }
});

// VERIFY BIOMETRIC (Login with biometric) - POST /api/biometric/verify
biometricRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { credentialId, deviceId } = req.body;

    if (!credentialId || !deviceId) {
      return res.status(400).json({ error: 'credentialId and deviceId are required' });
    }

    const credential = await BiometricService.verify(credentialId, deviceId);
    if (!credential) {
      return res.status(401).json({ error: 'Invalid biometric credential' });
    }

    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [credential.user_id, sessionToken, expiresAt]
    );

    console.log(`[BIOMETRIC] Verified biometric login for user ${credential.user_id}`);

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: credential.uid,
        email: credential.email,
        name: credential.name,
        role: credential.role
      },
      expiresAt: expiresAt.toISOString()
    });
  } catch (error: unknown) {
    console.error('[BIOMETRIC] Verification error:', error);
    res.status(500).json({ error: 'Failed to verify biometric credential' });
  }
});

// GET USER'S BIOMETRIC CREDENTIALS - GET /api/biometric
biometricRouter.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const credentials = await BiometricService.getUserCredentials(user.id);
    res.json({ success: true, credentials });
  } catch (error: unknown) {
    console.error('[BIOMETRIC] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch biometric credentials' });
  }
});

// REVOKE BIOMETRIC CREDENTIAL - DELETE /api/biometric/:id
biometricRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await BiometricService.revoke(user.id, req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    const remaining = await BiometricService.getUserCredentials(user.id);
    const hasActive = remaining.some((c: any) => c.is_active);
    if (!hasActive) {
      await pool.query(
        'UPDATE user_settings SET biometric_enabled = false, updated_at = NOW() WHERE user_id = $1',
        [user.id]
      );
    }

    res.json({ success: true, message: 'Credential revoked' });
  } catch (error: unknown) {
    console.error('[BIOMETRIC] Revoke error:', error);
    res.status(500).json({ error: 'Failed to revoke biometric credential' });
  }
});

// ============================================================================
// API CONNECTION ROUTES — mounted at /api/connections
// ============================================================================
export const apiConnectionRouter = Router();

// GET ALL API CONNECTIONS - GET /api/connections
apiConnectionRouter.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const connections = await ApiConnectionService.getUserConnections(user.id);
    res.json({ success: true, connections });
  } catch (error: unknown) {
    console.error('[API-CONNECTIONS] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch API connections' });
  }
});

// CONNECT TO SERVICE - POST /api/connections
apiConnectionRouter.post('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { serviceType, serviceUrl, accessToken, refreshToken, tokenExpiresAt, metadata } = req.body;

    if (!serviceType) {
      return res.status(400).json({ error: 'serviceType is required' });
    }

    const validTypes = ['patient_portal', 'doctor_portal', 'meeting_server',
      'google_fit', 'apple_health', 'samsung_health',
      'pharmacy_api', 'lab_api', 'hospital_his',
      'line_notify', 'thai_id'];

    if (!validTypes.includes(serviceType)) {
      return res.status(400).json({ error: `serviceType must be one of: ${validTypes.join(', ')}` });
    }

    const connection = await ApiConnectionService.connect(user.id, {
      serviceType,
      serviceUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
      metadata
    });

    console.log(`[API-CONNECTIONS] Connected ${serviceType} for user ${user.id}`);
    res.status(201).json({
      success: true,
      connection: {
        id: connection.id,
        serviceType: connection.service_type,
        serviceUrl: connection.service_url,
        status: connection.connection_status,
        lastSync: connection.last_sync_at
      }
    });
  } catch (error: unknown) {
    console.error('[API-CONNECTIONS] Connect error:', error);
    res.status(500).json({ error: 'Failed to connect to service' });
  }
});

// DISCONNECT SERVICE - DELETE /api/connections/:serviceType
apiConnectionRouter.delete('/:serviceType', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await ApiConnectionService.disconnect(user.id, req.params.serviceType);
    if (!result) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    console.log(`[API-CONNECTIONS] Disconnected ${req.params.serviceType} for user ${user.id}`);
    res.json({ success: true, message: `Disconnected from ${req.params.serviceType}` });
  } catch (error: unknown) {
    console.error('[API-CONNECTIONS] Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect service' });
  }
});

// GET CONNECTION STATUS - GET /api/connections/:serviceType/status
apiConnectionRouter.get('/:serviceType/status', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, service_type, service_url, connection_status, last_sync_at, metadata, updated_at FROM user_api_connections WHERE user_id = $1 AND service_type = $2',
      [user.id, req.params.serviceType]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, connected: false, serviceType: req.params.serviceType });
    }

    const conn = result.rows[0];
    res.json({
      success: true,
      connected: conn.connection_status === 'active',
      connection: {
        id: conn.id,
        serviceType: conn.service_type,
        serviceUrl: conn.service_url,
        status: conn.connection_status,
        lastSync: conn.last_sync_at,
        metadata: conn.metadata
      }
    });
  } catch (error: unknown) {
    console.error('[API-CONNECTIONS] Status error:', error);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

// GET AUDIT LOG - GET /api/connections/audit/log
apiConnectionRouter.get('/audit/log', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const limit = Number.parseInt(req.query.limit as string) || 50;
    const audit = await ApiConnectionService.getAuditLog(user.id, limit);
    res.json({ success: true, audit });
  } catch (error: unknown) {
    console.error('[API-CONNECTIONS] Audit error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// HEALTH CHECK - GET /api/connections/health/check
apiConnectionRouter.get('/health/check', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const connections = await ApiConnectionService.getUserConnections(user.id);
    
    const healthResults = await Promise.all(
      connections
        .filter((c: any) => c.connection_status === 'active' && c.service_url)
        .map(async (conn: any) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${conn.service_url}/api/health`, {
              signal: controller.signal
            });
            clearTimeout(timeout);
            return {
              serviceType: conn.service_type,
              healthy: response.ok,
              statusCode: response.status,
              responseTime: Date.now()
            };
          } catch (err: any) {
            return {
              serviceType: conn.service_type,
              healthy: false,
              error: err.message
            };
          }
        })
    );

    res.json({ success: true, services: healthResults });
  } catch (error: unknown) {
    console.error('[API-CONNECTIONS] Health check error:', error);
    res.status(500).json({ error: 'Failed to check service health' });
  }
});
