/**
 * Resolve API base URL for unified portal deployments.
 * When the SPA is served from a different origin than the baked VITE_API_URL
 * (e.g. host.docker.internal in E2E), use same-origin relative /api paths.
 */
export function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim() || '';
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
