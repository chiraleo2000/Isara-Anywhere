/**
 * Retry helper for post-meeting pipeline external calls (Whisper, Gemini, GCS).
 */
import { applyChaosLatency } from './chaosLatency.js';

export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = Number.parseInt(process.env.PIPELINE_RETRY_MAX || '3', 10),
    baseDelayMs = Number.parseInt(process.env.PIPELINE_RETRY_BASE_MS || '500', 10),
    label = 'operation',
    shouldRetry = () => true,
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await applyChaosLatency('ai');
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const retryable = shouldRetry(err, attempt);
      if (!retryable || attempt >= maxAttempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(`[PostMeeting] ${label} attempt ${attempt} failed (${err.message}); retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export function isTransientError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status || err?.statusCode;
  if (status === 502 || status === 503 || status === 504 || status === 429) return true;
  return (
    msg.includes('timeout') ||
    msg.includes('gateway') ||
    msg.includes('econnreset') ||
    msg.includes('network') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('fetch failed')
  );
}
