/**
 * Lobby participant session rules (join / leave / reconnect) — shared by HTTP routes and chaos tests.
 */

/**
 * @param {Map<string, object>} lobby
 * @param {string} participantId
 * @param {object} entry
 */
export function applyLobbyJoin(lobby, participantId, entry) {
  const existing = lobby.get(participantId);
  if (existing?.status === 'admitted' || existing?.status === 'admitted_disconnected') {
    const merged = {
      ...existing,
      ...entry,
      participantId,
      status: 'admitted',
      admittedAt: existing.admittedAt || entry.admittedAt,
      admittedBy: existing.admittedBy || entry.admittedBy,
      reconnectedAt: new Date().toISOString(),
      disconnectedAt: null,
    };
    lobby.set(participantId, merged);
    return { entry: merged, action: 'reconnect_admitted', alreadyAdmitted: true };
  }
  if (existing?.status === 'waiting' || existing?.status === 'disconnected') {
    const merged = {
      ...existing,
      ...entry,
      participantId,
      status: 'waiting',
      joinedAt: existing.joinedAt || entry.joinedAt,
      reconnectedAt: new Date().toISOString(),
      disconnectedAt: null,
    };
    lobby.set(participantId, merged);
    return { entry: merged, action: 'reconnect_waiting', alreadyAdmitted: false };
  }
  const fresh = {
    ...entry,
    participantId,
    status: entry.status || 'waiting',
    joinedAt: entry.joinedAt || new Date().toISOString(),
  };
  lobby.set(participantId, fresh);
  return { entry: fresh, action: 'join', alreadyAdmitted: false };
}

/**
 * Soft-leave: preserve admission; mark disconnected for lobby UI only.
 */
export function applyLobbyLeave(lobby, participantId) {
  const existing = lobby.get(participantId);
  if (!existing) return null;
  const wasAdmitted = existing.status === 'admitted' || existing.status === 'admitted_disconnected';
  const updated = {
    ...existing,
    status: wasAdmitted ? 'admitted_disconnected' : 'disconnected',
    disconnectedAt: new Date().toISOString(),
    socketId: null,
  };
  lobby.set(participantId, updated);
  return updated;
}

export function countLobbyByStatus(lobby) {
  const counts = { waiting: 0, admitted: 0, disconnected: 0, admitted_disconnected: 0, rejected: 0 };
  for (const entry of lobby.values()) {
    const s = entry.status || 'waiting';
    if (counts[s] !== undefined) counts[s] += 1;
    else counts.waiting += 1;
  }
  return counts;
}
