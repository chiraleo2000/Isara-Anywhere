/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — WhatsApp Channel Adapter
 * ═══════════════════════════════════════════════════════════════════════
 * Handles WhatsApp Business API interactions — parsing webhooks,
 * building reply messages, and managing WhatsApp-specific formatting.
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface WhatsAppConfig {
  apiToken: string;
  verifyToken: string;
  phoneNumberId: string;
}

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

export interface WhatsAppVerificationResponse {
  statusCode: number;
  body?: string;
  error?: string;
}

export function createWhatsAppConfig(env: Record<string, string | undefined>): WhatsAppConfig {
  const apiToken = env.WHATSAPP_API_TOKEN || '';
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN || '';
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';

  if (!apiToken) {
    throw new Error('WHATSAPP_API_TOKEN is required');
  }
  if (!verifyToken) {
    throw new Error('WHATSAPP_VERIFY_TOKEN is required');
  }
  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID is required');
  }

  return { apiToken, verifyToken, phoneNumberId };
}

export function handleWhatsAppVerification(
  queryParams: Record<string, string | undefined>,
  verifyToken: string,
): WhatsAppVerificationResponse {
  const mode = queryParams['hub.mode'];
  const token = queryParams['hub.verify_token'];
  const challenge = queryParams['hub.challenge'];

  if (!mode || !token || !challenge) {
    return { statusCode: 400, error: 'Missing verification parameters' };
  }

  if (mode !== 'subscribe') {
    return { statusCode: 400, error: 'Invalid hub.mode' };
  }

  if (token !== verifyToken) {
    return { statusCode: 403, error: 'Verification token mismatch' };
  }

  return { statusCode: 200, body: challenge };
}

export function buildWhatsAppTextMessage(
  to: string,
  text: string,
): WhatsAppTextMessage {
  if (!to) {
    throw new Error('Recipient phone number is required');
  }
  if (!text || text.trim().length === 0) {
    throw new Error('Message text is required');
  }

  // WhatsApp text message limit is 4096 characters
  const truncatedText = text.length > 4096 ? text.substring(0, 4093) + '...' : text;

  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: truncatedText,
    },
  };
}

export function getWhatsAppAPIUrl(phoneNumberId: string): string {
  if (!phoneNumberId) {
    throw new Error('Phone number ID is required');
  }
  return `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
}

export function buildWhatsAppAuthHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function parseWhatsAppWebhookPayload(body: Record<string, unknown>): {
  hasMessages: boolean;
  isStatusUpdate: boolean;
} {
  const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
  if (!entry) {
    return { hasMessages: false, isStatusUpdate: false };
  }

  const changes = (entry.changes as Array<Record<string, unknown>>)?.[0];
  if (!changes) {
    return { hasMessages: false, isStatusUpdate: false };
  }

  const value = changes.value as Record<string, unknown>;
  if (!value) {
    return { hasMessages: false, isStatusUpdate: false };
  }

  const messages = value.messages as Array<unknown>;
  const statuses = value.statuses as Array<unknown>;

  return {
    hasMessages: Array.isArray(messages) && messages.length > 0,
    isStatusUpdate: Array.isArray(statuses) && statuses.length > 0,
  };
}
