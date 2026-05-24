/**
 * Test/dev chaos latency injection (Cloud Run: set IZARA_CHAOS_*_LATENCY_MS on dev-testing only).
 */
export function getChaosLatencyMs(kind) {
  if (process.env.IZARA_CHAOS_DISABLED === '1') return 0;
  const envKey = kind === 'db' ? 'IZARA_CHAOS_DB_LATENCY_MS' : 'IZARA_CHAOS_AI_LATENCY_MS';
  const ms = Number.parseInt(process.env[envKey] || '0', 10);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export async function applyChaosLatency(kind) {
  const ms = getChaosLatencyMs(kind);
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
