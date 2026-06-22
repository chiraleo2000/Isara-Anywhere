/**
 * Lobby API route contract — paths registered on meeting-server.
 * HTTP integration exercised by meeting-api-smoke.mjs (lobby-join, lobby-admit-all).
 */
export const LOBBY_ROUTE_PATHS = [
  'POST /api/meetings/:id/lobby/join',
  'POST /api/meetings/:id/lobby/leave',
  'GET /api/meetings/:id/lobby',
  'GET /api/meetings/:id/lobby/status/:participantId',
  'POST /api/meetings/:id/lobby/admit',
  'POST /api/meetings/:id/lobby/reject',
  'POST /api/meetings/:id/lobby/admit-all',
];

/**
 * Register lobby route documentation (handlers remain in index.js until full extraction).
 */
export function registerLobbyRoutes(_app, _deps) {
  // Incremental extraction: lobby handlers still in backend/index.js.
  // LOBBY_ROUTE_PATHS documents the contract for smoke + integration tests.
}
