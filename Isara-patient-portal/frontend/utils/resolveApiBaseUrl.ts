/**
 * Resolve API base URL for unified portal deployments.
 */
import { resolveEnv } from './resolveEnv';

export function resolveApiBaseUrl(): string {
  const configured = resolveEnv('API_URL');
  if (!configured) return '';
  if (globalThis.window === undefined) return configured;
  try {
    const configuredOrigin = new URL(configured).origin;
    if (configuredOrigin !== globalThis.location.origin) {
      return '';
    }
  } catch {
    return configured;
  }
  return configured;
}
