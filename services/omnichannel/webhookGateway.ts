/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — Webhook Gateway
 * ═══════════════════════════════════════════════════════════════════════
 * Unified entry point for all omnichannel webhooks.
 * Validates signatures, normalizes payloads, routes to channel adapters.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { createHmac } from 'crypto';

export type ChannelType = 'line' | 'whatsapp' | 'telegram' | 'messages';

export interface NormalizedMessage {
  messageId: string;
  channel: ChannelType;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: string;
  replyToken?: string;
  rawPayload: Record<string, unknown>;
}

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
}

export interface WebhookResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode: number;
}

export function validateLineSignature(
  body: string,
  signature: string,
  channelSecret: string,
): WebhookValidationResult {
  if (!body || !signature || !channelSecret) {
    return { valid: false, error: 'Missing required parameters for LINE signature validation' };
  }

  try {
    const expectedSignature = createHmac('SHA256', channelSecret)
      .update(body)
      .digest('base64');

    if (signature.length !== expectedSignature.length) {
      return { valid: false, error: 'Invalid LINE webhook signature' };
    }

    // Constant-time comparison
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Invalid LINE webhook signature' };
    }

    let mismatch = 0;
    for (let i = 0; i < sigBuffer.length; i++) {
      mismatch |= sigBuffer[i] ^ expectedBuffer[i];
    }

    return mismatch === 0
      ? { valid: true }
      : { valid: false, error: 'Invalid LINE webhook signature' };
  } catch {
    return { valid: false, error: 'LINE signature validation failed' };
  }
}

export function validateWhatsAppToken(
  token: string,
  verifyToken: string,
): WebhookValidationResult {
  if (!token || !verifyToken) {
    return { valid: false, error: 'Missing verification tokens' };
  }
  return token === verifyToken
    ? { valid: true }
    : { valid: false, error: 'Invalid WhatsApp verification token' };
}

export function validateTelegramSecret(
  secretToken: string,
  expectedToken: string,
): WebhookValidationResult {
  if (!secretToken || !expectedToken) {
    return { valid: false, error: 'Missing Telegram secret token' };
  }
  return secretToken === expectedToken
    ? { valid: true }
    : { valid: false, error: 'Invalid Telegram secret token' };
}

export function detectChannel(headers: Record<string, string | undefined>): ChannelType | null {
  if (headers['x-line-signature']) {
    return 'line';
  }
  if (headers['x-hub-signature-256'] || headers['x-whatsapp-signature']) {
    return 'whatsapp';
  }
  if (headers['x-telegram-bot-api-secret-token']) {
    return 'telegram';
  }
  if (headers['x-messages-signature']) {
    return 'messages';
  }
  return null;
}

export function normalizeLineMessage(payload: Record<string, unknown>): NormalizedMessage | null {
  try {
    const events = payload.events as Array<Record<string, unknown>> | undefined;
    if (!events || !Array.isArray(events) || events.length === 0) {
      return null;
    }

    const event = events[0];
    if (event.type !== 'message') {
      return null;
    }

    const source = event.source as Record<string, unknown>;
    const message = event.message as Record<string, unknown>;

    if (!source || !message) {
      return null;
    }

    return {
      messageId: (message.id as string) || `line_${Date.now()}`,
      channel: 'line',
      senderId: (source.userId as string) || '',
      text: (message.text as string) || '',
      timestamp: new Date(Number(event.timestamp) || Date.now()).toISOString(),
      replyToken: event.replyToken as string | undefined,
      rawPayload: payload,
    };
  } catch {
    return null;
  }
}

export function normalizeWhatsAppMessage(payload: Record<string, unknown>): NormalizedMessage | null {
  try {
    const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
    if (!entry) return null;

    const changes = (entry.changes as Array<Record<string, unknown>>)?.[0];
    if (!changes) return null;

    const value = changes.value as Record<string, unknown>;
    if (!value) return null;

    const messages = (value.messages as Array<Record<string, unknown>>)?.[0];
    if (!messages) return null;

    const contacts = (value.contacts as Array<Record<string, unknown>>)?.[0];

    return {
      messageId: (messages.id as string) || `wa_${Date.now()}`,
      channel: 'whatsapp',
      senderId: (messages.from as string) || '',
      senderName: contacts ? (contacts.profile as Record<string, unknown>)?.name as string : undefined,
      text: ((messages.text as Record<string, unknown>)?.body as string) || '',
      timestamp: new Date(Number(messages.timestamp) * 1000 || Date.now()).toISOString(),
      rawPayload: payload,
    };
  } catch {
    return null;
  }
}

export function normalizeTelegramMessage(payload: Record<string, unknown>): NormalizedMessage | null {
  try {
    const message = payload.message as Record<string, unknown>;
    if (!message) return null;

    const from = message.from as Record<string, unknown>;
    const chat = message.chat as Record<string, unknown>;

    if (!from || !chat) return null;

    return {
      messageId: String(message.message_id || `tg_${Date.now()}`),
      channel: 'telegram',
      senderId: String(from.id || ''),
      senderName: [from.first_name, from.last_name].filter(Boolean).join(' ') || undefined,
      text: (message.text as string) || '',
      timestamp: new Date(Number(message.date) * 1000 || Date.now()).toISOString(),
      rawPayload: payload,
    };
  } catch {
    return null;
  }
}

export function normalizeMessage(
  channel: ChannelType,
  payload: Record<string, unknown>,
): NormalizedMessage | null {
  switch (channel) {
    case 'line':
      return normalizeLineMessage(payload);
    case 'whatsapp':
      return normalizeWhatsAppMessage(payload);
    case 'telegram':
      return normalizeTelegramMessage(payload);
    case 'messages':
      return null; // Messages adapter pending
    default:
      return null;
  }
}
