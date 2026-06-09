/**
 * Client queue helpers — same logic as server/appointmentPoolQuery.cjs.
 */
// @ts-expect-error — shared CJS module consumed by Vite + Vitest
import { splitQueueSections, ACCEPTED_VISIBILITY_DAYS } from '../../server/appointmentPoolQuery.cjs';

export { splitQueueSections, ACCEPTED_VISIBILITY_DAYS };
