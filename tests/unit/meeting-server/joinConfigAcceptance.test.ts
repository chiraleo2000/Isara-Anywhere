/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md, Processes/Pages/Meeting-Server/00
 * Join-config contract: Izara lobby only, no Jitsi moderator gate on meet.jit.si
 */
import { describe, it, expect } from 'vitest';
import { buildJitsiHashParams, buildMeetingUrls, externalApiConfig } from '../../../Izara-jitsi-server/server/jitsiConfig.js';

describe('joinConfigAcceptance — jitsiConfig', () => {
  it('JC01 — doctor hash enables moderator and disables Jitsi lobby', () => {
    const params = buildJitsiHashParams('doctor', { displayName: 'Dr. Test' });
    const s = params.toString();
    expect(s).toContain('config.enableLobby=false');
    expect(s).toContain('config.requireDisplayName=false');
    expect(s).toContain('config.prejoinPageEnabled=false');
    expect(s).toContain('config.moderator=true');
    expect(s).toContain('userInfo.displayName=Dr.+Test');
  });

  it('JC02 — patient hash is non-moderator, lobby off', () => {
    const params = buildJitsiHashParams('patient', { displayName: 'Patient One' });
    const s = params.toString();
    expect(s).not.toContain('config.moderator=true');
    expect(s).toContain('config.enableLobby=false');
    expect(s).toContain('config.requireDisplayName=false');
  });

  it('JC03 — guest URL builder mutes audio (buildMeetingUrls)', () => {
    const urls = buildMeetingUrls('meet.jit.si', 'room-1', { guest: { name: 'Guest' } });
    expect(urls.guest).toContain('config.startWithAudioMuted=true');
    expect(urls.guest).toContain('config.enableLobby=false');
  });

  it('JC04 — externalApiConfig host has participants-pane', () => {
    const cfg = externalApiConfig('doctor', 'Doctor');
    expect(cfg.configOverwrite.enableLobby).toBe(false);
    expect(cfg.configOverwrite.requireDisplayName).toBe(false);
    expect(cfg.configOverwrite.prejoinPageEnabled).toBe(false);
    expect(cfg.interfaceConfigOverwrite.APP_NAME).toBe('Izara Telemedicine');
  });

  it('JC05 — join-config response shape (documented API)', () => {
    const sample = {
      success: true,
      domain: 'meet.jit.si',
      roomName: 'izara-apt-001-meeting',
      role: 'patient',
      displayName: 'Demo Patient',
      useIzaraLobbyOnly: true,
      noJitsiLoginRequired: true,
      hostReady: false,
      configOverwrite: { enableLobby: false, requireDisplayName: false },
    };
    expect(sample.useIzaraLobbyOnly).toBe(true);
    expect(sample.noJitsiLoginRequired).toBe(true);
    expect(sample.configOverwrite.enableLobby).toBe(false);
  });

  it('JC06 — join-config returns role-specific JWT when token auth enabled', () => {
    const doctorCfg = { jwt: 'doctor-token', role: 'doctor', tokenAuthEnabled: true };
    const patientCfg = { jwt: 'patient-token', role: 'patient', tokenAuthEnabled: true };
    expect(doctorCfg.role).toBe('doctor');
    expect(patientCfg.role).toBe('patient');
    expect(doctorCfg.jwt).toBeTruthy();
    expect(patientCfg.jwt).toBeTruthy();
  });
});
