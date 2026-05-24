import { useEffect, useState } from 'react';

export interface GoogleClientIdState {
  clientId: string;
  resolved: boolean;
}

/**
 * Resolves Google OAuth client ID: Vite build-time first, then runtime /auth/public-config.
 */
export function useGoogleClientId(configPath = '/auth/public-config'): GoogleClientIdState {
  const builtIn = (import.meta as ImportMeta & { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env?.VITE_GOOGLE_CLIENT_ID || '';
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
