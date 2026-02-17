/**
 * Phase 2: Multi-API Connection Routes
 * Service connection management for mobile multi-backend architecture
 * 
 * @module routes/api-connections
 * @version 2.0.0
 */

import { Router, Request, Response } from 'express';
import { ApiConnectionService } from '../services/postgresDataService';
import postgresDataService from '../services/postgresDataService';

const { pool } = postgresDataService;
const router = Router();

// Helper: Get user from session token
async function getUserFromToken(token: string): Promise<any | null> {
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
// GET ALL API CONNECTIONS
// GET /api/connections
// ============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const connections = await ApiConnectionService.getUserConnections(user.id);
    res.json({ success: true, connections });
  } catch (error: any) {
    console.error('[API-CONNECTIONS] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch API connections' });
  }
});

// ============================================================================
// CONNECT TO SERVICE
// POST /api/connections
// ============================================================================
router.post('/', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('[API-CONNECTIONS] Connect error:', error);
    res.status(500).json({ error: 'Failed to connect to service' });
  }
});

// ============================================================================
// DISCONNECT SERVICE
// DELETE /api/connections/:serviceType
// ============================================================================
router.delete('/:serviceType', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('[API-CONNECTIONS] Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect service' });
  }
});

// ============================================================================
// GET CONNECTION STATUS (single service)
// GET /api/connections/:serviceType/status
// ============================================================================
router.get('/:serviceType/status', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('[API-CONNECTIONS] Status error:', error);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

// ============================================================================
// GET AUDIT LOG
// GET /api/connections/audit
// ============================================================================
router.get('/audit/log', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const limit = parseInt(req.query.limit as string) || 50;
    const audit = await ApiConnectionService.getAuditLog(user.id, limit);
    res.json({ success: true, audit });
  } catch (error: any) {
    console.error('[API-CONNECTIONS] Audit error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ============================================================================
// HEALTH CHECK - Test all connected services
// GET /api/connections/health
// ============================================================================
router.get('/health/check', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('[API-CONNECTIONS] Health check error:', error);
    res.status(500).json({ error: 'Failed to check service health' });
  }
});

export default router;
