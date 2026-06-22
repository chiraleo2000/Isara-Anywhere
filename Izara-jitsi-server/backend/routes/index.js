/**
 * Meeting-server route registration index.
 * Lobby, lifecycle, recordings, and results routes live in index.js until fully extracted.
 */
import { registerHealthRoutes } from './healthRoutes.js';
import { registerLobbyRoutes, LOBBY_ROUTE_PATHS } from './lobbyRoutes.js';

export { LOBBY_ROUTE_PATHS };

export function registerCoreRoutes(app, ctx) {
  registerHealthRoutes(app, ctx);
  registerLobbyRoutes(app, ctx);
}
