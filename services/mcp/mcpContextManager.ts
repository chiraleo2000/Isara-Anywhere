/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — MCP Context Manager
 * ═══════════════════════════════════════════════════════════════════════
 * Manages patient conversation context for the MCP protocol.
 * Provides per-patient state tracking across omnichannel sessions.
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface PatientContext {
  patientId: string;
  channel: string;
  messages: ContextMessage[];
  consentStatus: 'pending' | 'granted' | 'declined' | 'expired';
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  channel: string;
  timestamp: string;
}

const MAX_CONTEXT_MESSAGES = 50;
const CONTEXT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createPatientContext(
  patientId: string,
  channel: string,
): PatientContext {
  if (!patientId || typeof patientId !== 'string') {
    throw new Error('patientId is required and must be a non-empty string');
  }
  if (!channel || typeof channel !== 'string') {
    throw new Error('channel is required and must be a non-empty string');
  }

  const now = new Date().toISOString();
  return {
    patientId,
    channel,
    messages: [],
    consentStatus: 'pending',
    createdAt: now,
    updatedAt: now,
    metadata: {},
  };
}

export function addMessageToContext(
  context: PatientContext,
  message: ContextMessage,
): PatientContext {
  if (!message.content || typeof message.content !== 'string') {
    throw new Error('message content is required');
  }
  if (!['user', 'assistant', 'system'].includes(message.role)) {
    throw new Error('message role must be user, assistant, or system');
  }

  const updatedMessages = [...context.messages, message];

  // Trim to max size, keeping system messages
  const trimmed = updatedMessages.length > MAX_CONTEXT_MESSAGES
    ? [
        ...updatedMessages.filter(m => m.role === 'system'),
        ...updatedMessages.filter(m => m.role !== 'system').slice(-MAX_CONTEXT_MESSAGES + updatedMessages.filter(m => m.role === 'system').length),
      ]
    : updatedMessages;

  return {
    ...context,
    messages: trimmed,
    updatedAt: new Date().toISOString(),
  };
}

export function isContextExpired(context: PatientContext): boolean {
  const updatedAt = new Date(context.updatedAt).getTime();
  const now = Date.now();
  return (now - updatedAt) > CONTEXT_TTL_MS;
}

export function getContextSummary(context: PatientContext): {
  patientId: string;
  messageCount: number;
  lastActivity: string;
  consentStatus: string;
  channels: string[];
} {
  const channels = [...new Set(context.messages.map(m => m.channel))];
  return {
    patientId: context.patientId,
    messageCount: context.messages.length,
    lastActivity: context.updatedAt,
    consentStatus: context.consentStatus,
    channels,
  };
}

export function updateConsentStatus(
  context: PatientContext,
  status: 'pending' | 'granted' | 'declined' | 'expired',
): PatientContext {
  const validStatuses = ['pending', 'granted', 'declined', 'expired'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid consent status: ${status}`);
  }
  return {
    ...context,
    consentStatus: status,
    updatedAt: new Date().toISOString(),
  };
}

export function clearContext(context: PatientContext): PatientContext {
  return {
    ...context,
    messages: [],
    metadata: {},
    updatedAt: new Date().toISOString(),
  };
}
