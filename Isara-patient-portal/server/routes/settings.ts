/**
 * Phase 2: User Settings Routes
 * Mobile app + web settings management
 * 
 * @module routes/settings
 * @version 2.0.0
 */

import { Router, Request, Response } from 'express';
import postgresDataService, { UserSettingsService, PushSubscriptionService, SyncService } from '../services/postgresDataService';

const { pool } = postgresDataService;
const router = Router();

// Helper: Get user from session token
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
// GET USER SETTINGS
// GET /api/settings
// ============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const settings = await UserSettingsService.get(user.id);
    const pushPrefs = await PushSubscriptionService.getOrCreate(user.id);

    res.json({
      success: true,
      settings: {
        ...settings,
        push: {
          appointmentReminders: pushPrefs.appointment_reminders,
          medicationReminders: pushPrefs.medication_reminders,
          healthTips: pushPrefs.health_tips,
          labResults: pushPrefs.lab_results,
          doctorMessages: pushPrefs.doctor_messages,
          systemUpdates: pushPrefs.system_updates,
          quietHoursStart: pushPrefs.quiet_hours_start,
          quietHoursEnd: pushPrefs.quiet_hours_end,
          languagePreference: pushPrefs.language_preference
        }
      }
    });
  } catch (error: unknown) {
    console.error('[SETTINGS] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ============================================================================
// UPDATE USER SETTINGS
// PUT /api/settings
// ============================================================================
router.put('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { push, ...appSettings } = req.body;

    const settings = await UserSettingsService.update(user.id, appSettings);

    let pushPrefs = null;
    if (push) {
      // Convert camelCase to snake_case for push preferences
      const camelToSnake: Record<string, string> = {
        appointmentReminders: 'appointment_reminders',
        medicationReminders: 'medication_reminders',
        healthTips: 'health_tips',
        labResults: 'lab_results',
        doctorMessages: 'doctor_messages',
        systemUpdates: 'system_updates',
        quietHoursStart: 'quiet_hours_start',
        quietHoursEnd: 'quiet_hours_end',
        languagePreference: 'language_preference',
      };
      const pushData: Record<string, unknown> = {};
      for (const [camelKey, snakeKey] of Object.entries(camelToSnake)) {
        if (camelKey in push) pushData[snakeKey] = push[camelKey];
      }

      pushPrefs = await PushSubscriptionService.update(user.id, pushData);
    }

    console.log(`[SETTINGS] Updated settings for user ${user.id}`);
    res.json({ success: true, settings, push: pushPrefs });
  } catch (error: unknown) {
    console.error('[SETTINGS] Update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================================================
// GET NOTIFICATION PREFERENCES (granular)
// GET /api/settings/notifications
// ============================================================================
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1 ORDER BY channel, category',
      [user.id]
    );

    // Group by channel
    const grouped = result.rows.reduce((acc: any, row: any) => {
      if (!acc[row.channel]) acc[row.channel] = {};
      acc[row.channel][row.category] = row.enabled;
      return acc;
    }, {});

    res.json({ success: true, preferences: grouped, raw: result.rows });
  } catch (error: unknown) {
    console.error('[SETTINGS] Notification prefs error:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// ============================================================================
// UPDATE NOTIFICATION PREFERENCE
// PUT /api/settings/notifications
// ============================================================================
router.put('/notifications', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { channel, category, enabled } = req.body;

    if (!channel || !category || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'channel, category, and enabled (boolean) are required' });
    }

    const id = `NP-${Date.now().toString(36)}`;
    await pool.query(
      `INSERT INTO notification_preferences (id, user_id, channel, category, enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, channel, category) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
      [id, user.id, channel, category, enabled]
    );

    res.json({ success: true, preference: { channel, category, enabled } });
  } catch (error: unknown) {
    console.error('[SETTINGS] Update notification pref error:', error);
    res.status(500).json({ error: 'Failed to update notification preference' });
  }
});

// ============================================================================
// SET ACTIVE ROLE (for unified mobile app)
// PUT /api/settings/role
// ============================================================================
router.put('/role', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { role } = req.body;
    if (!role || !['patient', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'role must be patient or doctor' });
    }

    await UserSettingsService.update(user.id, { last_active_role: role });
    
    console.log(`[SETTINGS] User ${user.id} switched to role: ${role}`);
    res.json({ success: true, activeRole: role });
  } catch (error: unknown) {
    console.error('[SETTINGS] Role switch error:', error);
    res.status(500).json({ error: 'Failed to switch role' });
  }
});

// ============================================================================
// COMPLETE ONBOARDING
// POST /api/settings/onboarding
// ============================================================================
router.post('/onboarding', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await UserSettingsService.update(user.id, { onboarding_completed: true });
    
    res.json({ success: true, message: 'Onboarding completed' });
  } catch (error: unknown) {
    console.error('[SETTINGS] Onboarding error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;

// ============================================================================
// OFFLINE SYNC ROUTES (Mobile offline-first architecture)
// Merged from sync.ts — mounted at /api/sync
// ============================================================================
export const syncRouter = Router();

// PUSH SYNC ITEMS (client → server) - POST /api/sync/push
syncRouter.post('/push', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

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
      items: results.map((r: any) => ({ id: r.id, entityType: r.entity_type, entityId: r.entity_id, status: r.sync_status }))
    });
  } catch (error: unknown) {
    console.error('[SYNC] Push error:', error);
    res.status(500).json({ error: 'Failed to sync items' });
  }
});

// PULL SYNC ITEMS (server → client) - GET /api/sync/pull?since=<ISO timestamp>
syncRouter.get('/pull', async (req: Request, res: Response) => {
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
  } catch (error: unknown) {
    console.error('[SYNC] Pull error:', error);
    res.status(500).json({ error: 'Failed to pull sync items' });
  }
});

// GET CONFLICTS - GET /api/sync/conflicts
syncRouter.get('/conflicts', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const conflicts = await SyncService.getConflicts(user.id);
    res.json({ success: true, conflicts });
  } catch (error: unknown) {
    console.error('[SYNC] Conflicts error:', error);
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
});

// RESOLVE CONFLICT - PUT /api/sync/conflicts/:id
syncRouter.put('/conflicts/:id', async (req: Request, res: Response) => {
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
  } catch (error: unknown) {
    console.error('[SYNC] Resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve conflict' });
  }
});

// GET SYNC STATUS - GET /api/sync/status
syncRouter.get('/status', async (req: Request, res: Response) => {
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
        acc[row.sync_status] = Number.parseInt(row.count);
        return acc;
      }, {}),
      lastSync: lastSync.rows[0]?.last_sync || null,
      serverTimestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('[SYNC] Status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});
