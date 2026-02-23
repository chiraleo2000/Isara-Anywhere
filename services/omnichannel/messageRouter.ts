/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — Message Router
 * ═══════════════════════════════════════════════════════════════════════
 * Routes normalized messages from omnichannel webhooks to the MCP
 * server for AI processing. Handles consent checks and RBAC.
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { ChannelType, NormalizedMessage } from './webhookGateway';

export interface RouteResult {
  success: boolean;
  action: 'processed' | 'consent_required' | 'blocked' | 'error';
  response?: string;
  error?: string;
  statusCode: number;
}

export interface ChannelStatus {
  channel: ChannelType;
  connected: boolean;
  lastPing?: string;
  error?: string;
}

export interface ConversationEntry {
  messageId: string;
  channel: ChannelType;
  direction: 'inbound' | 'outbound';
  senderId: string;
  text: string;
  timestamp: string;
  processedBy?: string;
}

export function validateIncomingMessage(message: NormalizedMessage | null): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!message) {
    return { valid: false, errors: ['Message is null or undefined'] };
  }

  if (!message.messageId) {
    errors.push('messageId is required');
  }

  if (!message.channel) {
    errors.push('channel is required');
  } else {
    const validChannels: ChannelType[] = ['line', 'whatsapp', 'telegram', 'messages'];
    if (!validChannels.includes(message.channel)) {
      errors.push(`Invalid channel: ${message.channel}`);
    }
  }

  if (!message.senderId) {
    errors.push('senderId is required');
  }

  if (!message.text || message.text.trim().length === 0) {
    errors.push('Message text is required and cannot be empty');
  }

  if (message.text && message.text.length > 10000) {
    errors.push('Message text exceeds maximum length (10000 chars)');
  }

  return { valid: errors.length === 0, errors };
}

export function checkConsentStatus(
  consentStatus: 'pending' | 'granted' | 'declined' | 'expired' | undefined,
): RouteResult | null {
  if (!consentStatus || consentStatus === 'pending') {
    return {
      success: false,
      action: 'consent_required',
      response: 'Please accept our privacy policy and data usage terms before proceeding. กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนดำเนินการ',
      statusCode: 403,
    };
  }

  if (consentStatus === 'declined') {
    return {
      success: false,
      action: 'blocked',
      response: 'You have declined the data consent. Please contact support if you wish to re-consent.',
      statusCode: 403,
    };
  }

  if (consentStatus === 'expired') {
    return {
      success: false,
      action: 'consent_required',
      response: 'Your consent has expired. Please re-accept the privacy policy.',
      statusCode: 403,
    };
  }

  // consentStatus === 'granted'
  return null;
}

export function routeMessage(
  message: NormalizedMessage,
  consentStatus: 'pending' | 'granted' | 'declined' | 'expired',
): RouteResult {
  const validation = validateIncomingMessage(message);
  if (!validation.valid) {
    return {
      success: false,
      action: 'error',
      error: validation.errors.join('; '),
      statusCode: 400,
    };
  }

  const consentCheck = checkConsentStatus(consentStatus);
  if (consentCheck) {
    return consentCheck;
  }

  return {
    success: true,
    action: 'processed',
    statusCode: 200,
  };
}

export function createConversationEntry(
  message: NormalizedMessage,
  direction: 'inbound' | 'outbound',
): ConversationEntry {
  return {
    messageId: message.messageId,
    channel: message.channel,
    direction,
    senderId: message.senderId,
    text: message.text,
    timestamp: message.timestamp || new Date().toISOString(),
  };
}

export function getChannelDisplayName(channel: ChannelType): string {
  const names: Record<ChannelType, string> = {
    line: 'LINE',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    messages: 'Messages',
  };
  return names[channel] || channel;
}

export function buildChannelStatus(
  channel: ChannelType,
  isConnected: boolean,
  error?: string,
): ChannelStatus {
  return {
    channel,
    connected: isConnected,
    lastPing: isConnected ? new Date().toISOString() : undefined,
    error,
  };
}
