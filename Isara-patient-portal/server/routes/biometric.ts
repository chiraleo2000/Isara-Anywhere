/**
 * Phase 2: Biometric Authentication Routes
 * Fingerprint/Face ID registration and verification for mobile
 * 
 * @module routes/biometric
 * @version 2.0.0
 */

import { Router, Request, Response } from 'express';
import { BiometricService } from '../services/postgresDataService';
import postgresDataService from '../services/postgresDataService';
import crypto from 'node:crypto';

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
// REGISTER BIOMETRIC CREDENTIAL
// POST /api/biometric/register
// ============================================================================
router.post('/register', async (req: Request, res: Response) => {
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

    // Update user settings
    await pool.query(
      'INSERT INTO user_settings (user_id, biometric_enabled) VALUES ($1, true) ON CONFLICT (user_id) DO UPDATE SET biometric_enabled = true, updated_at = NOW()',
      [user.id]
    );

    console.log(`[BIOMETRIC] Registered ${credentialType} for user ${user.id}`);
    res.status(201).json({ success: true, credential: { id: credential.id, credentialType: credential.credential_type, deviceId: credential.device_id } });
  } catch (error: any) {
    console.error('[BIOMETRIC] Registration error:', error);
    res.status(500).json({ error: 'Failed to register biometric credential' });
  }
});

// ============================================================================
// VERIFY BIOMETRIC (Login with biometric)
// POST /api/biometric/verify
// ============================================================================
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { credentialId, deviceId, signature } = req.body;

    if (!credentialId || !deviceId) {
      return res.status(400).json({ error: 'credentialId and deviceId are required' });
    }

    const credential = await BiometricService.verify(credentialId, deviceId);
    if (!credential) {
      return res.status(401).json({ error: 'Invalid biometric credential' });
    }

    // Create session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

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
  } catch (error: any) {
    console.error('[BIOMETRIC] Verification error:', error);
    res.status(500).json({ error: 'Failed to verify biometric credential' });
  }
});

// ============================================================================
// GET USER'S BIOMETRIC CREDENTIALS
// GET /api/biometric
// ============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const credentials = await BiometricService.getUserCredentials(user.id);
    res.json({ success: true, credentials });
  } catch (error: any) {
    console.error('[BIOMETRIC] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch biometric credentials' });
  }
});

// ============================================================================
// REVOKE BIOMETRIC CREDENTIAL
// DELETE /api/biometric/:id
// ============================================================================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await BiometricService.revoke(user.id, req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    // Check if any active credentials remain
    const remaining = await BiometricService.getUserCredentials(user.id);
    const hasActive = remaining.some((c: any) => c.is_active);
    if (!hasActive) {
      await pool.query(
        'UPDATE user_settings SET biometric_enabled = false, updated_at = NOW() WHERE user_id = $1',
        [user.id]
      );
    }

    res.json({ success: true, message: 'Credential revoked' });
  } catch (error: any) {
    console.error('[BIOMETRIC] Revoke error:', error);
    res.status(500).json({ error: 'Failed to revoke biometric credential' });
  }
});

// ============================================================================
// CHECK BIOMETRIC AVAILABILITY
// GET /api/biometric/status
// ============================================================================
router.get('/status', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const credentials = await BiometricService.getUserCredentials(user.id);
    const activeCredentials = credentials.filter((c: any) => c.is_active);

    res.json({
      success: true,
      biometricEnabled: activeCredentials.length > 0,
      credentialCount: activeCredentials.length,
      types: activeCredentials.map((c: any) => c.credential_type)
    });
  } catch (error: any) {
    console.error('[BIOMETRIC] Status error:', error);
    res.status(500).json({ error: 'Failed to check biometric status' });
  }
});

export default router;
