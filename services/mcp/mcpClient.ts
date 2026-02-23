/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — OpenClaw MCP Client
 * ═══════════════════════════════════════════════════════════════════════
 * Handles communication with the OpenClaw MCP server for contextual
 * AI reasoning, state management, and clinical task execution.
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface MCPConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export interface MCPMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface MCPChatRequest {
  patientId: string;
  message: string;
  channel: string;
  context?: MCPMessage[];
}

export interface MCPChatResponse {
  success: boolean;
  reply?: string;
  structuredData?: Record<string, unknown>;
  taskType?: string;
  error?: string;
  statusCode?: number;
}

export interface MCPHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  uptime?: number;
  error?: string;
}

export function createMCPConfig(env: Record<string, string | undefined>): MCPConfig {
  const baseUrl = env.OPENCLAW_MCP_URL || 'http://localhost:3030';
  const apiKey = env.OPENCLAW_API_KEY || '';
  const model = env.OPENCLAW_MODEL || 'openclaw-medical-v1';
  const timeoutMs = parseInt(env.OPENCLAW_TIMEOUT_MS || '10000', 10);

  if (!apiKey) {
    throw new Error('OPENCLAW_API_KEY is required');
  }

  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    throw new Error('OPENCLAW_MCP_URL must start with http:// or https://');
  }

  if (timeoutMs < 1000 || timeoutMs > 60000) {
    throw new Error('OPENCLAW_TIMEOUT_MS must be between 1000 and 60000');
  }

  return { baseUrl, apiKey, model, timeoutMs };
}

export function buildChatRequestBody(request: MCPChatRequest, model: string): Record<string, unknown> {
  if (!request.patientId || typeof request.patientId !== 'string') {
    throw new Error('patientId is required and must be a string');
  }
  if (!request.message || typeof request.message !== 'string') {
    throw new Error('message is required and must be a string');
  }
  if (!request.channel || typeof request.channel !== 'string') {
    throw new Error('channel is required and must be a string');
  }

  return {
    model,
    patient_id: request.patientId,
    message: request.message,
    channel: request.channel,
    context: request.context || [],
    timestamp: new Date().toISOString(),
  };
}

export function parseMCPResponse(
  statusCode: number,
  body: Record<string, unknown> | null,
): MCPChatResponse {
  if (statusCode === 0 || body === null) {
    return {
      success: false,
      error: 'MCP service unreachable',
      statusCode: 502,
    };
  }

  if (statusCode >= 500) {
    return {
      success: false,
      error: (body?.error as string) || `MCP internal error (${statusCode})`,
      statusCode,
    };
  }

  if (statusCode === 408 || statusCode === 504) {
    return {
      success: false,
      error: 'MCP request timed out',
      statusCode,
    };
  }

  if (statusCode === 429) {
    return {
      success: false,
      error: 'MCP rate limit exceeded',
      statusCode: 429,
    };
  }

  if (statusCode >= 400) {
    return {
      success: false,
      error: (body?.error as string) || `MCP client error (${statusCode})`,
      statusCode,
    };
  }

  if (statusCode >= 200 && statusCode < 300) {
    return {
      success: true,
      reply: (body?.reply as string) || (body?.message as string) || '',
      structuredData: (body?.structured_data as Record<string, unknown>) || undefined,
      taskType: (body?.task_type as string) || undefined,
      statusCode,
    };
  }

  return {
    success: false,
    error: `Unexpected MCP status: ${statusCode}`,
    statusCode,
  };
}

export function parseMCPHealthResponse(
  statusCode: number,
  body: Record<string, unknown> | null,
): MCPHealthResponse {
  if (statusCode === 0 || body === null) {
    return { status: 'unhealthy', error: 'MCP service unreachable' };
  }

  if (statusCode >= 200 && statusCode < 300) {
    return {
      status: 'healthy',
      version: (body?.version as string) || undefined,
      uptime: (body?.uptime as number) || undefined,
    };
  }

  if (statusCode >= 500) {
    return { status: 'unhealthy', error: `MCP server error (${statusCode})` };
  }

  return { status: 'degraded', error: `MCP status: ${statusCode}` };
}
