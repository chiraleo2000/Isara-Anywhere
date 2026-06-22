#!/usr/bin/env node
import { runPrePhaseSmoke } from './run-pre-phase-smoke.mjs';
import { bailWithArchive } from './archive-failure.mjs';
import { resetDatabaseBaseline } from '../../docker/e2eDockerCommon.mjs';

/**
 * Pre-phase smoke triad — call at the start of phase gates 2–9.
 * @param {number} phaseNum
 */
export function beginPhaseGate(phaseNum) {
  if (!runPrePhaseSmoke()) {
    bailWithArchive(phaseNum, 'pre-phase-smoke');
  }
}

/** Reset DB baseline between E2E project groups to avoid cross-group fixture pollution. */
export function resetE2eFixtures() {
  resetDatabaseBaseline();
}

/**
 * Archive failure artifacts and exit 1.
 * @param {number} phaseNum
 * @param {string} label
 */
export function phaseFail(phaseNum, label) {
  bailWithArchive(phaseNum, label);
}
