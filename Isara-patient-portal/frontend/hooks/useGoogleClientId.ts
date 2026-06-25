import { useEffect, useState } from 'react';

export interface GoogleClientIdState {
  clientId: string;
  /** True after build-time id is set or runtime public-config fetch finished */
  resolved: boolean;
}

/**
 * Resolves Google OAuth client ID: Vite build-time first, then runtime /api/auth/public-config
 * (Cloud Run injects GOOGLE_CLIENT_ID as a secret at runtime, not always in the Vite bundle).
 */
export function useGoogleClientId(configPath = '/api/auth/public-config'): GoogleClientIdState {
  const builtIn = import.meta.env.GOOGLE_CLIENT_ID || '';
  const [clientId, setClientId] = useState(builtIn);
  const [resolved, setResolved] = useState(!!builtIn);

  useEffect(() => {
    if (builtIn) {
      setResolved(true);
      return;
    }
    let cancelled = false;
    fetch(configPath)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { googleClientId?: string } | null) => {
        if (!cancelled && data?.googleClientId) setClientId(data.googleClientId.replace(/\r?\n/g, '').trim());
      })
      .catch(() => { /* public-config optional */ })
      .finally(() => {
        if (!cancelled) setResolved(true);
      });
    return () => { cancelled = true; };
  }, [builtIn, configPath]);

  return { clientId, resolved };
}
