/**
 * Runtime meeting-server base URL (Docker E2E, Cloud Run, local).
 * Rewrites host.docker.internal ↔ localhost based on browser hostname.
 */
export function resolveMeetingServerUrl(): string {
  const runtime = (globalThis as { ENV?: { MEETING_SERVER_URL?: string } }).ENV?.MEETING_SERVER_URL?.trim();
  const baked = String(import.meta.env?.VITE_MEETING_SERVER_URL || '').trim();
  const host = globalThis.location?.hostname || '';

  const rewriteForBrowser = (url: string): string => {
    try {
      const parsed = new URL(url);
      const port = parsed.port || '3020';
      if (
        parsed.hostname === 'host.docker.internal'
        && (host === 'localhost' || host === '127.0.0.1')
      ) {
        return `${parsed.protocol}//localhost:${port}`;
      }
      if (parsed.hostname === 'localhost' && host === 'host.docker.internal') {
        return `${globalThis.location.protocol}//host.docker.internal:${port}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  if (runtime) return rewriteForBrowser(runtime);
  if (baked) return rewriteForBrowser(baked);

  // Cloud Run: never fall back to localhost (mixed content + Private Network Access block WS).
  if (host.includes('.run.app')) {
    const meetingHost = host
      .replace('izara-patient-portal', 'izara-meeting-server')
      .replace('izara-doctor-portal', 'izara-meeting-server');
    if (meetingHost !== host) {
      return `https://${meetingHost}`;
    }
  }

  if (host === 'host.docker.internal') {
    return `${globalThis.location.protocol}//host.docker.internal:3020`;
  }
  return 'http://localhost:3020';
}
