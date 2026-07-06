#!/usr/bin/env node
/**
 * Local gate worker count — serial (1) vs parallel (2 default; 4 overloads meeting server headed).
 * Set GATE_PARALLEL=1 or PW_WORKERS=N before running phase:9 / pre-deploy gate.
 */
export function resolveGateWorkers() {
  const isStrict = process.env.GATE_STRICT === '1' || process.env.GATE_STRICT === 'true';
  const raw = process.env.PW_WORKERS?.trim();
  if (raw && /^\d+$/.test(raw)) return raw;
  if (isStrict) return '1';
  return process.env.GATE_PARALLEL === '1' ? '2' : '1';
}

export function isParallelGate() {
  return resolveGateWorkers() !== '1';
}

export function playwrightWorkerArgs() {
  return [`--workers=${resolveGateWorkers()}`];
}
