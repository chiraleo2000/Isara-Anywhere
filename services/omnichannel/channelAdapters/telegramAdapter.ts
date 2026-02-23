/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — Telegram Channel Adapter
 * ═══════════════════════════════════════════════════════════════════════
 * Handles Telegram Bot API interactions — parsing webhooks,
 * building reply messages, and managing Telegram-specific formatting.
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface TelegramConfig {
  botToken: string;
}

export interface TelegramSendMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
}

export function createTelegramConfig(env: Record<string, string | undefined>): TelegramConfig {
  const botToken = env.TELEGRAM_BOT_TOKEN || '';

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  return { botToken };
}

export function buildTelegramSendMessage(
  chatId: string | number,
  text: string,
  parseMode?: 'HTML' | 'MarkdownV2',
): TelegramSendMessage {
  if (!chatId) {
    throw new Error('chatId is required');
  }
  if (!text || text.trim().length === 0) {
    throw new Error('Message text is required');
  }

  // Telegram text message limit is 4096 characters
  const truncatedText = text.length > 4096 ? text.substring(0, 4093) + '...' : text;

  return {
    chat_id: chatId,
    text: truncatedText,
    ...(parseMode ? { parse_mode: parseMode } : {}),
  };
}

export function getTelegramAPIUrl(botToken: string, method: string): string {
  if (!botToken) {
    throw new Error('Bot token is required');
  }
  if (!method) {
    throw new Error('API method is required');
  }
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

export function parseTelegramUpdate(payload: Record<string, unknown>): {
  isMessage: boolean;
  isCommand: boolean;
  command?: string;
  chatId?: number;
  text?: string;
} {
  const message = payload.message as Record<string, unknown> | undefined;

  if (!message) {
    return { isMessage: false, isCommand: false };
  }

  const text = message.text as string | undefined;
  const chat = message.chat as Record<string, unknown> | undefined;
  const chatId = chat?.id as number | undefined;

  const isCommand = !!text && text.startsWith('/');
  const command = isCommand ? text.split(' ')[0] : undefined;

  return {
    isMessage: true,
    isCommand,
    command,
    chatId,
    text,
  };
}

export function buildTelegramWebhookUrl(baseUrl: string, botToken: string): string {
  if (!baseUrl) {
    throw new Error('Base URL is required');
  }
  if (!botToken) {
    throw new Error('Bot token is required');
  }
  return `${baseUrl}/api/webhooks/telegram`;
}

export function buildSetWebhookPayload(
  webhookUrl: string,
  secretToken: string,
): Record<string, unknown> {
  return {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  };
}
