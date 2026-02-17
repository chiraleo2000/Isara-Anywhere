/**
 * Phase 2: Device Token Routes
 * Push notification device registration for mobile apps
 * 
 * @module routes/device-tokens
 * @version 2.0.0
 */

import { Router, Request, Response } from 'express';
import { DeviceTokenService } from '../services/postgresDataService';
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
// REGISTER DEVICE TOKEN
// POST /api/device-tokens
// ============================================================================
router.post('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { deviceToken, token: bodyToken, platform, deviceName, deviceModel, osVersion, appVersion, deviceInfo } = req.body;
    const finalToken = deviceToken || bodyToken;

    if (!finalToken || !platform) {
      return res.status(400).json({ error: 'deviceToken (or token) and platform are required' });
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be ios, android, or web' });
    }

    const result = await DeviceTokenService.register(user.id, {
      deviceToken: finalToken, platform, deviceName: deviceName || deviceInfo?.browser, deviceModel: deviceModel || deviceInfo?.os, osVersion, appVersion
    });

    console.log(`[DEVICE-TOKENS] Registered device for user ${user.id} (${platform})`);
    res.status(201).json({ success: true, deviceToken: result });
  } catch (error: any) {
    console.error('[DEVICE-TOKENS] Registration error:', error);
    res.status(500).json({ error: 'Failed to register device token' });
  }
});

// ============================================================================
// GET USER'S DEVICE TOKENS
// GET /api/device-tokens
// ============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const tokens = await DeviceTokenService.getUserTokens(user.id);
    res.json({ success: true, devices: tokens });
  } catch (error: any) {
    console.error('[DEVICE-TOKENS] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch device tokens' });
  }
});

// ============================================================================
// DEACTIVATE DEVICE TOKEN
// DELETE /api/device-tokens
// ============================================================================
router.delete('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { deviceToken } = req.body;
    if (!deviceToken) {
      return res.status(400).json({ error: 'deviceToken is required' });
    }

    const result = await DeviceTokenService.deactivate(user.id, deviceToken);
    res.json({ success: true, deactivated: !!result });
  } catch (error: any) {
    console.error('[DEVICE-TOKENS] Deactivate error:', error);
    res.status(500).json({ error: 'Failed to deactivate device token' });
  }
});

// ============================================================================
// DEACTIVATE ALL (logout from all devices)
// DELETE /api/device-tokens/all
// ============================================================================
router.delete('/all', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await DeviceTokenService.deactivateAll(user.id);
    res.json({ success: true, message: 'All device tokens deactivated' });
  } catch (error: any) {
    console.error('[DEVICE-TOKENS] Deactivate all error:', error);
    res.status(500).json({ error: 'Failed to deactivate all device tokens' });
  }
});

export default router;
