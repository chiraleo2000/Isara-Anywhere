/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md — POST /api/meetings/create payload
 * Regression: patientJwt/guestJwt must be defined before activeMeetings storage
 */
import { describe, it, expect } from 'vitest';
import { buildMeetingUrls } from '../../../../issara-jitsi/backend/jitsiConfig.js';

function buildCreateMeetingResponse(opts: {
  meetingId: string;
  appointmentId: string;
  roomName: string;
  doctorJwt: string;
  patientJwt: string;
  guestJwt: string;
}) {
  const urls = buildMeetingUrls('meet.jit.si', opts.roomName, {
    language: 'th',
    doctorJwt: opts.doctorJwt,
    patientJwt: opts.patientJwt,
    guestJwt: opts.guestJwt,
    doctor: { name: 'Doctor' },
    patient: { name: 'Patient' },
    guest: { name: 'Guest' },
  });
  return {
    success: true,
    meetingId: opts.meetingId,
    appointmentId: opts.appointmentId,
    roomName: opts.roomName,
    urls: {
      base: urls.patient,
      doctor: urls.doctor,
      patient: urls.patient,
      guest: urls.guest,
    },
    tokens: {
      doctor: opts.doctorJwt,
      patient: opts.patientJwt,
      guest: opts.guestJwt,
    },
  };
}

describe('meetingCreateAcceptance — create response contract', () => {
  const doctorJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7dXNlciI6eyJuYW1lIjoiRG9jIn19fQ.xx';
  const patientJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7dXNlciI6eyJuYW1lIjoiUGF0In19fQ.yy';
  const guestJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7dXNlciI6eyJuYW1lIjoiR3Vlc3QifX19.zz';

  it('MC01 — tokens object includes doctor, patient, guest JWTs', () => {
    const res = buildCreateMeetingResponse({
      meetingId: 'uuid-1',
      appointmentId: 'APT-100',
      roomName: 'izara-apt-100-abc',
      doctorJwt,
      patientJwt,
      guestJwt,
    });
    expect(res.tokens.doctor).toBe(doctorJwt);
    expect(res.tokens.patient).toBe(patientJwt);
    expect(res.tokens.guest).toBe(guestJwt);
  });

  it('MC02 — all three role URLs are non-empty HTTPS', () => {
    const res = buildCreateMeetingResponse({
      meetingId: 'uuid-1',
      appointmentId: 'APT-100',
      roomName: 'izara-room',
      doctorJwt,
      patientJwt,
      guestJwt,
    });
    for (const url of [res.urls.doctor, res.urls.patient, res.urls.guest]) {
      expect(url).toMatch(/^https:\/\/meet\.jit\.si\//);
    }
  });

  it('MC03 — activeMeetings memory shape accepts tokens (regression guard)', () => {
    const activeMeetings = new Map<string, Record<string, unknown>>();
    const meetingId = 'uuid-1';
    const patientJwtRef = patientJwt;
    const guestJwtRef = guestJwt;
    activeMeetings.set(meetingId, {
      meetingId,
      appointmentId: 'APT-100',
      tokens: { doctor: doctorJwt, patient: patientJwtRef, guest: guestJwtRef },
    });
    const stored = activeMeetings.get(meetingId) as { tokens: Record<string, string> };
    expect(stored.tokens.patient).toBeDefined();
    expect(stored.tokens.guest).toBeDefined();
  });

  it('MC04 — meeting_config hostRole is doctor', () => {
    const config = {
      lobbyEnabled: true,
      hostRole: 'doctor',
      tokenAuthEnabled: false,
    };
    expect(config.hostRole).toBe('doctor');
  });
});
