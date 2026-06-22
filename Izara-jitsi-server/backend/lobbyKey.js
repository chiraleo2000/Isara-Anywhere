/**
 * Canonical lobby map key resolution (appointmentId preferred over meeting UUID).
 * Used by HTTP lobby routes and unit tests.
 */

/**
 * @param {{
 *   meetingLobbies: Map<string, Map<string, unknown>>,
 *   meetingLobbyAliases: Map<string, string>,
 *   activeMeetings: Map<string, { meetingId: string, appointmentId?: string | null }>,
 *   pool?: { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<{ id: string, appointment_id?: string | null }> }> },
 *   getDbAvailable?: () => boolean,
 * }} ctx
 */
export function createLobbyKeyResolver(ctx) {
  const {
    meetingLobbies,
    meetingLobbyAliases,
    activeMeetings,
    pool,
    getDbAvailable = () => false,
  } = ctx;

  function registerMeetingLobbyAliases(meetingId, appointmentId) {
    if (!meetingId) return;
    const canonical = appointmentId || meetingId;
    meetingLobbyAliases.set(meetingId, canonical);
    if (appointmentId) meetingLobbyAliases.set(appointmentId, canonical);
  }

  function syncLobbyAliasMaps(canonicalKey, lobby) {
    meetingLobbies.set(canonicalKey, lobby);
    for (const [alias, target] of meetingLobbyAliases) {
      if (target === canonicalKey) meetingLobbies.set(alias, lobby);
    }
    for (const m of activeMeetings.values()) {
      const canonical = m.appointmentId || m.meetingId;
      if (canonical === canonicalKey || m.meetingId === canonicalKey || m.appointmentId === canonicalKey) {
        if (m.meetingId) meetingLobbies.set(m.meetingId, lobby);
        if (m.appointmentId) meetingLobbies.set(m.appointmentId, lobby);
      }
    }
  }

  function mergeLobbyMaps(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return targetKey;
    const sourceLobby = meetingLobbies.get(sourceKey);
    let targetLobby = meetingLobbies.get(targetKey);
    if (!targetLobby) {
      targetLobby = new Map();
      meetingLobbies.set(targetKey, targetLobby);
    }
    if (sourceLobby) {
      for (const [pid, entry] of sourceLobby) {
        if (!targetLobby.has(pid)) targetLobby.set(pid, entry);
      }
      meetingLobbies.delete(sourceKey);
    }
    meetingLobbyAliases.set(sourceKey, targetKey);
    syncLobbyAliasMaps(targetKey, targetLobby);
    return targetKey;
  }

  /** Synchronous resolution from in-memory maps only. */
  function resolveLobbyKeySync(id) {
    if (!id) return id;
    if (meetingLobbies.has(id)) {
      return meetingLobbyAliases.get(id) || id;
    }
    if (meetingLobbyAliases.has(id)) return meetingLobbyAliases.get(id);
    for (const m of activeMeetings.values()) {
      if (m.meetingId === id || m.appointmentId === id) {
        const canonical = m.appointmentId || m.meetingId;
        if (m.appointmentId && m.meetingId && m.appointmentId !== m.meetingId) {
          meetingLobbyAliases.set(m.meetingId, m.appointmentId);
        }
        meetingLobbyAliases.set(id, canonical);
        return canonical;
      }
    }
    return id;
  }

  /**
   * Resolve canonical lobby key; merges split buckets when alias is discovered.
   * @param {string} id
   * @returns {Promise<string>}
   */
  async function resolveLobbyKey(id) {
    if (!id) return id;

    if (meetingLobbies.has(id)) {
      const canonical = meetingLobbyAliases.get(id) || id;
      if (canonical !== id) mergeLobbyMaps(id, canonical);
      return canonical;
    }

    const syncKey = resolveLobbyKeySync(id);
    if (syncKey !== id) {
      mergeLobbyMaps(id, syncKey);
      return syncKey;
    }

    if (getDbAvailable() && pool) {
      try {
        const result = await pool.query(
          `SELECT id, appointment_id FROM meeting_records WHERE id::text = $1 OR appointment_id = $1 LIMIT 1`,
          [id],
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          const meetingId = String(row.id);
          const appointmentId = row.appointment_id ? String(row.appointment_id) : null;
          const canonical = appointmentId || meetingId;
          registerMeetingLobbyAliases(meetingId, appointmentId);
          if (id !== canonical) mergeLobbyMaps(id, canonical);
          return canonical;
        }
      } catch (err) {
        console.warn('[lobby] resolveLobbyKey DB lookup failed:', err.message);
      }
    }

    return id;
  }

  function getLobbyMap(resolvedKey) {
    const key = resolvedKey;
    let lobby = meetingLobbies.get(key);
    if (!lobby) {
      lobby = new Map();
      meetingLobbies.set(key, lobby);
    }
    return { key, lobby };
  }

  return {
    resolveLobbyKey,
    resolveLobbyKeySync,
    registerMeetingLobbyAliases,
    syncLobbyAliasMaps,
    mergeLobbyMaps,
    getLobbyMap,
  };
}
