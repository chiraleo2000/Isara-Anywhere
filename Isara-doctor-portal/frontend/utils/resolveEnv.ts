/**
 * Resolve environment variable with canonical server name.
 * Order: window.ENV (Docker runtime) → VITE_* (Vite build) → bare import.meta.env
 */
type RuntimeEnv = Record<string, string | undefined>;

function runtimeEnv(): RuntimeEnv | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  return (globalThis as { ENV?: RuntimeEnv }).ENV;
}

export function resolveEnv(key: string, fallback = ''): string {
  const runtime = runtimeEnv()?.[key];
  if (runtime !== undefined && String(runtime).trim() !== '') {
    return String(runtime).trim();
  }

  const meta = import.meta.env as Record<string, string | undefined>;
  const viteKey = `VITE_${key}`;
  const fromVite = meta[viteKey];
  if (fromVite !== undefined && String(fromVite).trim() !== '') {
    return String(fromVite).trim();
  }

  const direct = meta[key];
  if (direct !== undefined && String(direct).trim() !== '') {
    return String(direct).trim();
  }

  return fallback;
}

export function resolveEnvBool(key: string, fallback = false): boolean {
  const raw = resolveEnv(key, fallback ? 'true' : 'false');
  return raw === 'true' || raw === '1';
}
