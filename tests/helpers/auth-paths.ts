/**
 * Shared auth artifact paths — keep out of e2e/global-setup so group UI tests
 * can import without pulling Playwright globalSetup side effects.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const AUTH_CACHE_PATH = path.join(here, '..', 'e2e', '.auth-cache.json');
export const STORAGE_STATE_DIR = path.join(here, '..', 'e2e', '.auth-states');
