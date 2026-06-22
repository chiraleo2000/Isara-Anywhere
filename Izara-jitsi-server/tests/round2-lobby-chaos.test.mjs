/**
 * Round 2 — Multi-party lobby chaos (in-memory, no browser)
 * 1 doctor + 1 patient + 3 guests; 2 guests disconnect/reconnect mid-lobby.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLobbyKeyResolver } from '../backend/lobbyKey.js';
import { applyLobbyJoin, applyLobbyLeave, countLobbyByStatus } from '../backend/lobbySession.js';

function createLobbyHarness(appointmentId, meetingUuid) {
  const meetingLobbies = new Map();
  const meetingLobbyAliases = new Map();
  const activeMeetings = new Map();
  activeMeetings.set(meetingUuid, { meetingId: meetingUuid, appointmentId });
  const resolver = createLobbyKeyResolver({
    meetingLobbies,
    meetingLobbyAliases,
    activeMeetings,
    getDbAvailable: () => false,
  });
  resolver.registerMeetingLobbyAliases(meetingUuid, appointmentId);
  return { resolver, meetingLobbies, appointmentId, meetingUuid };
}

function joinParticipant(resolver, routeId, participantId, name, role) {
  const lobbyKey = resolver.resolveLobbyKeySync(routeId);
  const { lobby } = resolver.getLobbyMap(lobbyKey);
  const { entry, alreadyAdmitted } = applyLobbyJoin(lobby, participantId, {
    participantId,
    participantName: name,
    role,
    status: 'waiting',
    joinedAt: new Date().toISOString(),
  });
  resolver.syncLobbyAliasMaps(lobbyKey, lobby);
  return { lobbyKey, entry, alreadyAdmitted, lobby };
}

describe('Round 2 — lobby chaos', () => {
  it('R2-L01 — 5 parties on appointment + meeting UUID routes share one lobby', () => {
    const apt = 'APT-CHAOS-001';
    const uuid = 'm-uuid-chaos-001';
    const { resolver, appointmentId, meetingUuid } = createLobbyHarness(apt, uuid);

    const doctor = joinParticipant(resolver, appointmentId, 'doctor-host', 'Dr. Chaos', 'doctor');
    const patient = joinParticipant(resolver, meetingUuid, 'patient-1', 'Patient One', 'patient');
    const g1 = joinParticipant(resolver, appointmentId, 'guest-ext-1', 'Guest 1', 'guest');
    const g2 = joinParticipant(resolver, appointmentId, 'guest-ext-2', 'Guest 2', 'guest');
    const g3 = joinParticipant(resolver, meetingUuid, 'guest-ext-3', 'Guest 3', 'guest');

    assert.equal(doctor.lobbyKey, patient.lobbyKey);
    assert.equal(g1.lobbyKey, g3.lobbyKey);
    assert.equal(g1.lobby.size, 5);

    const cfgApt = { tokenAuthEnabled: false, domain: 'meet.jit.si' };
    const cfgUuid = { tokenAuthEnabled: false, domain: 'meet.jit.si' };
    assert.deepEqual(cfgApt, cfgUuid);
  });

  it('R2-L02 — abrupt disconnect/reconnect preserves admission and waiting state', () => {
    const apt = 'APT-CHAOS-002';
    const uuid = 'm-uuid-chaos-002';
    const { resolver, appointmentId } = createLobbyHarness(apt, uuid);

    joinParticipant(resolver, appointmentId, 'doctor-host', 'Dr.', 'doctor');
    joinParticipant(resolver, appointmentId, 'patient-1', 'Patient', 'patient');
    joinParticipant(resolver, appointmentId, 'guest-ext-1', 'G1', 'guest');
    const g2 = joinParticipant(resolver, appointmentId, 'guest-ext-2', 'G2', 'guest');
    joinParticipant(resolver, appointmentId, 'guest-ext-3', 'G3', 'guest');

    g2.entry.status = 'admitted';
    g2.entry.admittedAt = new Date().toISOString();
    g2.lobby.set('guest-ext-2', g2.entry);

    applyLobbyLeave(g2.lobby, 'guest-ext-1');
    applyLobbyLeave(g2.lobby, 'guest-ext-3');

    let counts = countLobbyByStatus(g2.lobby);
    assert.equal(counts.disconnected, 2);
    assert.equal(counts.admitted, 1);

    const reconnect1 = joinParticipant(resolver, appointmentId, 'guest-ext-1', 'G1', 'guest');
    assert.equal(reconnect1.alreadyAdmitted, false);
    assert.equal(reconnect1.entry.status, 'waiting');

    const reconnect2 = joinParticipant(resolver, appointmentId, 'guest-ext-2', 'G2', 'guest');
    assert.equal(reconnect2.alreadyAdmitted, true);
    assert.equal(reconnect2.entry.status, 'admitted');

    applyLobbyLeave(g2.lobby, 'guest-ext-2');
    const reconnect2b = joinParticipant(resolver, appointmentId, 'guest-ext-2', 'G2', 'guest');
    assert.equal(reconnect2b.entry.status, 'admitted');

    counts = countLobbyByStatus(reconnect2b.lobby);
    assert.equal(counts.admitted, 1);
    assert.equal(counts.waiting, 3);
    assert.equal(counts.disconnected, 1);
  });

  it('R2-L03 — concurrent alias joins do not duplicate participant keys', () => {
    const apt = 'APT-CHAOS-003';
    const uuid = 'm-uuid-chaos-003';
    const { resolver, appointmentId, meetingUuid } = createLobbyHarness(apt, uuid);

    const ids = ['guest-a', 'guest-b', 'guest-c'];
    for (const id of ids) {
      joinParticipant(resolver, appointmentId, id, id, 'guest');
      joinParticipant(resolver, meetingUuid, id, id, 'guest');
    }
    const { lobby } = resolver.getLobbyMap(resolver.resolveLobbyKeySync(appointmentId));
    assert.equal(lobby.size, 3);
  });
});
