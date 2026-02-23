/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — Webhook Validator
 * ═══════════════════════════════════════════════════════════════════════
 * Centralized webhook signature validation for all channels.
 * Provides secure HMAC verification and request integrity checks.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { createHmac } from 'crypto';

export interface ValidationConfig {
  lineChannelSecret?: string;
  whatsappVerifyToken?: string;
  whatsappAppSecret?: string;
  telegramSecretToken?: string;
}

export interface RequestInfo {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body: string;
  query?: Record<string, string | undefined>;
}

export interface ValidationResult {
  valid: boolean;
  channel?: string;
  error?: string;
  statusCode: number;
}

export function createValidationConfig(env: Record<string, string | undefined>): ValidationConfig {
  return {
    lineChannelSecret: env.LINE_CHANNEL_SECRET,
    whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN,
    whatsappAppSecret: env.WHATSAPP_APP_SECRET,
    telegramSecretToken: env.TELEGRAM_SECRET_TOKEN,
  };
}

export function computeHmacSha256(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

export function computeHmacSha256Base64(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64');
}

export function validateRequest(
  request: RequestInfo,
  config: ValidationConfig,
): ValidationResult {
  // Detect channel from path
  if (request.path.includes('/webhooks/line')) {
    return validateLineRequest(request, config);
  }
  if (request.path.includes('/webhooks/whatsapp')) {
    if (request.method === 'GET') {
      return validateWhatsAppVerification(request, config);
    }
    return validateWhatsAppRequest(request, config);
  }
  if (request.path.includes('/webhooks/telegram')) {
    return validateTelegramRequest(request, config);
  }

  return { valid: false, error: 'Unknown webhook path', statusCode: 404 };
}

function validateLineRequest(
  request: RequestInfo,
  config: ValidationConfig,
): ValidationResult {
  if (!config.lineChannelSecret) {
    return { valid: false, channel: 'line', error: 'LINE channel secret not configured', statusCode: 500 };
  }

  const signature = request.headers['x-line-signature'];
  if (!signature) {
    return { valid: false, channel: 'line', error: 'Missing X-Line-Signature header', statusCode: 401 };
  }

  const expected = computeHmacSha256Base64(request.body, config.lineChannelSecret);

  if (signature !== expected) {
    return { valid: false, channel: 'line', error: 'Invalid LINE signature', statusCode: 401 };
  }

  return { valid: true, channel: 'line', statusCode: 200 };
}

function validateWhatsAppVerification(
  request: RequestInfo,
  config: ValidationConfig,
): ValidationResult {
  if (!config.whatsappVerifyToken) {
    return { valid: false, channel: 'whatsapp', error: 'WhatsApp verify token not configured', statusCode: 500 };
  }

  const mode = request.query?.['hub.mode'];
  const token = request.query?.['hub.verify_token'];

  if (mode !== 'subscribe') {
    return { valid: false, channel: 'whatsapp', error: 'Invalid verification mode', statusCode: 400 };
  }

  if (token !== config.whatsappVerifyToken) {
    return { valid: false, channel: 'whatsapp', error: 'Token mismatch', statusCode: 403 };
  }

  return { valid: true, channel: 'whatsapp', statusCode: 200 };
}

function validateWhatsAppRequest(
  request: RequestInfo,
  config: ValidationConfig,
): ValidationResult {
  if (!config.whatsappAppSecret) {
    return { valid: false, channel: 'whatsapp', error: 'WhatsApp app secret not configured', statusCode: 500 };
  }

  const signature = request.headers['x-hub-signature-256'];
  if (!signature) {
    return { valid: false, channel: 'whatsapp', error: 'Missing X-Hub-Signature-256 header', statusCode: 401 };
  }

  const expected = 'sha256=' + computeHmacSha256(request.body, config.whatsappAppSecret);

  if (signature !== expected) {
    return { valid: false, channel: 'whatsapp', error: 'Invalid WhatsApp signature', statusCode: 401 };
  }

  return { valid: true, channel: 'whatsapp', statusCode: 200 };
}

function validateTelegramRequest(
  request: RequestInfo,
  config: ValidationConfig,
): ValidationResult {
  if (!config.telegramSecretToken) {
    return { valid: false, channel: 'telegram', error: 'Telegram secret token not configured', statusCode: 500 };
  }

  const secretToken = request.headers['x-telegram-bot-api-secret-token'];
  if (!secretToken) {
    return { valid: false, channel: 'telegram', error: 'Missing secret token header', statusCode: 401 };
  }

  if (secretToken !== config.telegramSecretToken) {
    return { valid: false, channel: 'telegram', error: 'Invalid Telegram secret', statusCode: 401 };
  }

  return { valid: true, channel: 'telegram', statusCode: 200 };
}
