/**
 * Phase 2: Offline Sync Routes  
 * Sync queue for mobile offline-first architecture
 * 
 * @module routes/sync
 * @version 2.0.0
 */

import { Router, Request, Response } from 'express';
import { SyncService } from '../services/postgresDataService';
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
// PUSH SYNC ITEMS (client → server)
// POST /api/sync/push
// ============================================================================
router.post('/push', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    // Validate each item
    for (const item of items) {
      if (!item.entityType || !item.entityId || !item.operation || !item.payload || !item.clientTimestamp) {
        return res.status(400).json({ error: 'Each item must have entityType, entityId, operation, payload, and clientTimestamp' });
      }
    }

    const results = await SyncService.push(user.id, items);
    
    console.log(`[SYNC] Pushed ${items.length} items for user ${user.id}`);
    res.json({ 
      success: true, 
      synced: results.length,
      serverTimestamp: new Date().toISOString(),
      items: results.map(r => ({ id: r.id, entityType: r.entity_type, entityId: r.entity_id, status: r.sync_status }))
    });
  } catch (error: any) {
    console.error('[SYNC] Push error:', error);
    res.status(500).json({ error: 'Failed to sync items' });
  }
});

// ============================================================================
// PULL SYNC ITEMS (server → client)
// GET /api/sync/pull?since=<ISO timestamp>
// ============================================================================
router.get('/pull', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const since = req.query.since as string || new Date(0).toISOString();
    const items = await SyncService.pull(user.id, since);
    
    res.json({
      success: true,
      items,
      serverTimestamp: new Date().toISOString(),
      hasMore: false
    });
  } catch (error: any) {
    console.error('[SYNC] Pull error:', error);
    res.status(500).json({ error: 'Failed to pull sync items' });
  }
});

// ============================================================================
// GET CONFLICTS
// GET /api/sync/conflicts
// ============================================================================
router.get('/conflicts', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const conflicts = await SyncService.getConflicts(user.id);
    res.json({ success: true, conflicts });
  } catch (error: any) {
    console.error('[SYNC] Conflicts error:', error);
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
});

// ============================================================================
// RESOLVE CONFLICT
// PUT /api/sync/conflicts/:id
// ============================================================================
router.put('/conflicts/:id', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { resolution } = req.body;
    if (!resolution) {
      return res.status(400).json({ error: 'resolution object is required' });
    }

    const result = await SyncService.resolveConflict(req.params.id, resolution);
    if (!result) {
      return res.status(404).json({ error: 'Conflict not found' });
    }

    res.json({ success: true, resolved: result });
  } catch (error: any) {
    console.error('[SYNC] Resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve conflict' });
  }
});

// ============================================================================
// GET SYNC STATUS
// GET /api/sync/status
// ============================================================================
router.get('/status', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT sync_status, COUNT(*) as count FROM sync_queue WHERE user_id = $1 GROUP BY sync_status`,
      [user.id]
    );

    const lastSync = await pool.query(
      'SELECT MAX(server_timestamp) as last_sync FROM sync_queue WHERE user_id = $1',
      [user.id]
    );

    res.json({
      success: true,
      status: result.rows.reduce((acc: any, row: any) => {
        acc[row.sync_status] = parseInt(row.count);
        return acc;
      }, {}),
      lastSync: lastSync.rows[0]?.last_sync || null,
      serverTimestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[SYNC] Status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

export default router;
