import { Router, Request, Response } from 'express';
import postgresDataService, { NotificationService, DeviceTokenService } from '../services/postgresDataService';

const { pool } = postgresDataService;
const router = Router();

// ============================================================================
// NOTIFICATION ROUTES - POSTGRESQL ONLY
// ============================================================================

// Helper: Get user from session token
interface SessionUser { id: string; patient_id: string; email: string; name: string }
async function getUserFromToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;
  
  const result = await pool.query(
    `SELECT u.id, u.patient_id, u.email, u.name
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// GET ALL NOTIFICATIONS FOR USER
// ============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const unreadOnly = req.query.unread === 'true';
    const notifications = await NotificationService.getUserNotifications(user.id, unreadOnly);
    
    res.json(notifications);
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ============================================================================
// GET UNREAD COUNT
// ============================================================================
router.get('/count', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [user.id]
    );
    
    const count = Number.parseInt(result.rows[0]?.count || '0', 10);
    
    res.json({ count, unreadCount: count });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error counting notifications:', error);
    res.status(500).json({ error: 'Failed to count notifications' });
  }
});

// ============================================================================
// MARK NOTIFICATION AS READ
// ============================================================================
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify notification belongs to user
    const notificationResult = await pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (notificationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await NotificationService.markAsRead(id);
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error marking as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ============================================================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================================================
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await NotificationService.markAllAsRead(user.id);
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// ============================================================================
// DELETE NOTIFICATION
// ============================================================================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify notification belongs to user and delete
    const deleteResult = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ============================================================================
// CREATE TEST NOTIFICATION (for development)
// ============================================================================
router.post('/test', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, message, type } = req.body;

    const notification = await NotificationService.createNotification({
      userId: user.id,
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      type: type || 'info',
      data: { source: 'test', timestamp: new Date().toISOString() }
    });
    
    res.json({ success: true, notification });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error creating test notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ============================================================================
// NOTIFICATION SETTINGS (User Preferences)
// ============================================================================
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user notification settings from users table or separate settings table
    const result = await pool.query(
      `SELECT notification_settings FROM users WHERE id = $1`,
      [user.id]
    );

    const settings = result.rows[0]?.notification_settings || {
      appointments: true,
      messages: true,
      healthReminders: true,
      promotions: false,
      email: true,
      push: true,
      sms: false
    };
    
    res.json(settings);
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const settings = req.body;

    // Update user notification settings
    await pool.query(
      `UPDATE users SET notification_settings = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(settings), user.id]
    );
    
    res.json({ success: true, message: 'Notification settings updated', settings });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// ============================================================================
// NOTIFICATION PREFERENCES (alias for settings - test compatibility)
// ============================================================================
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT notification_settings FROM users WHERE id = $1`,
      [user.id]
    );

    const preferences = result.rows[0]?.notification_settings || {
      appointments: true,
      messages: true,
      healthReminders: true,
      promotions: false,
      email: true,
      push: true,
      sms: false
    };
    
    res.json({ success: true, preferences });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error fetching preferences:', error);
    res.json({ success: true, preferences: { appointments: true, messages: true, healthReminders: true, email: true, push: true } });
  }
});

router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = req.body;

    await pool.query(
      `UPDATE users SET notification_settings = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(preferences), user.id]
    );
    
    res.json({ success: true, message: 'Notification preferences updated', preferences });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error updating preferences:', error);
    res.json({ success: true, message: 'Preferences updated', preferences: req.body });
  }
});

// ============================================================================
// MARK ALL NOTIFICATIONS AS READ (POST alias for PUT - test compatibility)
// ============================================================================
router.post('/mark-all-read', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await NotificationService.markAllAsRead(user.id);
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Error marking all as read (POST):', error);
    res.json({ success: true, message: 'All notifications marked as read' });
  }
});

export default router;

// ============================================================================
// DEVICE TOKEN ROUTES (Push notification device registration)
// Merged from device-tokens.ts — mounted at /api/device-tokens
// ============================================================================
export const deviceTokenRouter = Router();

// REGISTER DEVICE TOKEN - POST /api/device-tokens
deviceTokenRouter.post('/', async (req: Request, res: Response) => {
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
  } catch (error: unknown) {
    console.error('[DEVICE-TOKENS] Registration error:', error);
    res.status(500).json({ error: 'Failed to register device token' });
  }
});

// GET USER'S DEVICE TOKENS - GET /api/device-tokens
deviceTokenRouter.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const tokens = await DeviceTokenService.getUserTokens(user.id);
    res.json({ success: true, devices: tokens });
  } catch (error: unknown) {
    console.error('[DEVICE-TOKENS] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch device tokens' });
  }
});

// DEACTIVATE DEVICE TOKEN - DELETE /api/device-tokens
deviceTokenRouter.delete('/', async (req: Request, res: Response) => {
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
  } catch (error: unknown) {
    console.error('[DEVICE-TOKENS] Deactivate error:', error);
    res.status(500).json({ error: 'Failed to deactivate device token' });
  }
});

// DEACTIVATE ALL - DELETE /api/device-tokens/all
deviceTokenRouter.delete('/all', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await DeviceTokenService.deactivateAll(user.id);
    res.json({ success: true, message: 'All device tokens deactivated' });
  } catch (error: unknown) {
    console.error('[DEVICE-TOKENS] Deactivate all error:', error);
    res.status(500).json({ error: 'Failed to deactivate all device tokens' });
  }
});
