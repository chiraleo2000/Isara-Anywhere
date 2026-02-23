/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — LINE Channel Adapter
 * ═══════════════════════════════════════════════════════════════════════
 * Handles LINE Messaging API interactions — parsing webhooks,
 * building reply messages, and managing LINE-specific formatting.
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface LINEConfig {
  channelAccessToken: string;
  channelSecret: string;
}

export interface LINEReplyMessage {
  replyToken: string;
  messages: Array<{
    type: 'text' | 'flex' | 'template';
    text?: string;
    altText?: string;
    contents?: Record<string, unknown>;
  }>;
}

export interface LINEPushMessage {
  to: string;
  messages: Array<{
    type: 'text';
    text: string;
  }>;
}

export function createLINEConfig(env: Record<string, string | undefined>): LINEConfig {
  const channelAccessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
  const channelSecret = env.LINE_CHANNEL_SECRET || '';

  if (!channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is required');
  }
  if (!channelSecret) {
    throw new Error('LINE_CHANNEL_SECRET is required');
  }

  return { channelAccessToken, channelSecret };
}

export function buildLINEReplyMessage(
  replyToken: string,
  text: string,
): LINEReplyMessage {
  if (!replyToken) {
    throw new Error('replyToken is required');
  }
  if (!text || text.trim().length === 0) {
    throw new Error('Message text is required');
  }

  // LINE text message limit is 5000 characters
  const truncatedText = text.length > 5000 ? text.substring(0, 4997) + '...' : text;

  return {
    replyToken,
    messages: [
      {
        type: 'text',
        text: truncatedText,
      },
    ],
  };
}

export function buildLINEPushMessage(
  userId: string,
  text: string,
): LINEPushMessage {
  if (!userId) {
    throw new Error('userId is required for push messages');
  }
  if (!text || text.trim().length === 0) {
    throw new Error('Message text is required');
  }

  const truncatedText = text.length > 5000 ? text.substring(0, 4997) + '...' : text;

  return {
    to: userId,
    messages: [
      {
        type: 'text',
        text: truncatedText,
      },
    ],
  };
}

export function parseLINEWebhookEvents(body: Record<string, unknown>): Array<Record<string, unknown>> {
  const events = body.events;
  if (!Array.isArray(events)) {
    return [];
  }
  return events.filter(
    (event: Record<string, unknown>) => event && typeof event === 'object' && event.type,
  );
}

export function isLINEMessageEvent(event: Record<string, unknown>): boolean {
  return event.type === 'message' && !!event.source && !!event.message;
}

export function getLINEReplyAPIUrl(): string {
  return 'https://api.line.me/v2/bot/message/reply';
}

export function getLINEPushAPIUrl(): string {
  return 'https://api.line.me/v2/bot/message/push';
}

export function buildLINEAuthHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
