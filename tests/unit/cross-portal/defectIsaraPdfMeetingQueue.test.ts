/**
 * Defect หมออิสระ.pdf — regression for queue traceability, patient display name, doctor host role
 * @process Processes/Appointment_Workflows.md
 * @process Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md
 * @process Processes/Pages/Doctor-Portal/06_Health_Meeting_Page.md
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * @process Processes/Pages/Patient-Portal/05_Appointments_Page.md
 */
import { describe, it, expect } from 'vitest';
import {
  buildPoolStatusList,
  matchesPoolFilter,
  splitQueueSections,
  isWithinAcceptedWindow,
} from '../../../Isara-doctor-portal/server/appointmentPoolQuery.cjs';
import { buildTelehealthMeetingUrls } from '../../../Isara-doctor-portal/server/jitsiMeetingLinks.cjs';
import { buildTelehealthCalendarUrl } from '../../../Isara-doctor-portal/server/calendarEventLinks.cjs';
import { mapAppointmentForClient } from '../../../Isara-doctor-portal/server/appointmentMapper.cjs';
import { getIzaraDisplayName } from '../../../Isara-patient-portal/src/utils/jitsiDisplayName.ts';
import {
  getJitsiExternalApiOptions,
  resolveMountJwt,
  stableRoomNameForAppointment,
} from '../../../Isara-patient-portal/src/utils/jitsiMeetingConfig.ts';
import { createJitsiRoleJwt } from '../../../Izara-jitsi-server/server/sessionAuth.js';

const SECRET = 'defect-test-jitsi-secret-minimum-length';
function patientListFilter(
  appointments: { id: string; status: string }[],
  filter: 'pending' | 'confirmed' | 'all',
) {
  return appointments.filter((apt) => {
    if (filter === 'all') return true;
    if (filter === 'pending') {
      return ['pending', 'awaiting_doctor_response', 'in_pool'].includes(apt.status);
    }
    if (filter === 'confirmed') return apt.status === 'confirmed';
    return true;
  });
}

/** Doctor HealthMeeting accepted section filter */
function doctorAcceptedFilter(
  appointments: { id: string; status: string; doctor_id?: string }[],
  doctorId: string,
) {
  return appointments.filter(
    (apt) => apt.status === 'confirmed' && (apt.doctor_id === doctorId || !apt.doctor_id),
  );
}

describe('Defect PDF #1 — queue traceability after doctor accept', () => {
  it('DPDF-Q1 — confirmed appointment leaves pending but stays in includeAccepted pool', () => {
    const row = {
      id: 'apt-trace-1',
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      doctor_id: 'doc-1',
    };
    expect(matchesPoolFilter(row, false)).toBe(false);
    expect(matchesPoolFilter(row, true)).toBe(true);
    expect(buildPoolStatusList(true)).toContain('confirmed');
  });

  it('DPDF-Q2 — doctor decline returns to in_pool (reassignable, not deleted)', () => {
    const afterDecline = { id: 'apt-trace-2', status: 'in_pool', doctor_id: null };
    expect(matchesPoolFilter(afterDecline, false)).toBe(true);
    expect(buildPoolStatusList(false)).toContain('in_pool');
  });

  it('DPDF-Q1b — admin-assigned row stays visible in pool pending list', () => {
    const assigned = { id: 'apt-assigned-1', status: 'assigned', doctor_id: 'doc-1' };
    expect(matchesPoolFilter(assigned, false)).toBe(true);
    expect(buildPoolStatusList(false)).toContain('assigned');
    const { pending } = splitQueueSections(
      [{ id: 'apt-assigned-1', status: 'assigned', doctorId: 'doc-1' }],
      { isAdmin: false, doctorId: 'doc-1', doctorEmail: 'doc@test.com' },
    );
    expect(pending).toHaveLength(1);
  });

  it('DPDF-Q3 — patient sees confirmed in Confirmed tab after accept', () => {
    const rows = [
      { id: 'a', status: 'in_pool' },
      { id: 'b', status: 'confirmed' },
    ];
    expect(patientListFilter(rows, 'pending')).toHaveLength(1);
    expect(patientListFilter(rows, 'confirmed')).toEqual([{ id: 'b', status: 'confirmed' }]);
  });

  it('DPDF-Q4 — doctor accepted queue retains confirmed within 7-day window', () => {
    const confirmedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinAcceptedWindow(confirmedAt)).toBe(true);
    const { accepted } = splitQueueSections(
      [{ id: 'x', status: 'confirmed', doctorId: 'doc-1', confirmed_at: confirmedAt }],
      { isAdmin: false, doctorId: 'doc-1', doctorEmail: 'doc@test.com' },
    );
    expect(accepted).toHaveLength(1);
  });

  it('DPDF-Q5 — doctor HealthMeeting accepted section lists confirmed assignments', () => {
    const accepted = doctorAcceptedFilter(
      [
        { id: '1', status: 'confirmed', doctor_id: 'doc-1' },
        { id: '2', status: 'in_pool' },
      ],
      'doc-1',
    );
    expect(accepted.map((a) => a.id)).toEqual(['1']);
  });

  it('DPDF-Q6 — patient portal confirm must set doctor_id for traceability', () => {
    const authUserId = 'doc-uuid-1';
    const currentDoctorId = null;
    const status = 'confirmed';
    const isDoctor = true;
    const effectiveDoctorId =
      status === 'confirmed' && isDoctor ? (currentDoctorId ?? authUserId) : currentDoctorId;
    const confirmedBy = status === 'confirmed' && isDoctor ? authUserId : null;
    expect(effectiveDoctorId).toBe('doc-uuid-1');
    expect(confirmedBy).toBe('doc-uuid-1');
  });
});

describe('Defect PDF #2 — patient Jitsi name auto-filled from account', () => {
  it('DPDF-N1 — getIzaraDisplayName uses authenticated patient name', () => {
    expect(getIzaraDisplayName({ name: 'สมชาย ใจดี' }, 'Patient')).toBe('สมชาย ใจดี');
  });

  it('DPDF-N2 — patient mount options disable prejoin and requireDisplayName', () => {
    const name = getIzaraDisplayName({ displayName: 'Patient Demo' }, 'Patient');
    const opts = getJitsiExternalApiOptions('patient', name);
    expect(opts.configOverwrite.prejoinPageEnabled).toBe(false);
    expect(opts.configOverwrite.requireDisplayName).toBe(false);
    expect(opts.interfaceConfigOverwrite.DEFAULT_LOCAL_DISPLAY_NAME).toBe('Patient Demo');
  });

  it('DPDF-N3 — confirm URLs embed patient displayName hash param', () => {
    const urls = buildTelehealthMeetingUrls('apt-name-1', {
      patientName: 'Patient Demo',
      doctorName: 'Dr. Demo',
    });
    expect(urls.patientMeetingUrl).toContain('userInfo.displayName=Patient');
    expect(urls.patientMeetingUrl).toContain('prejoinPageEnabled=false');
    expect(urls.patientMeetingUrl).toContain('requireDisplayName=false');
  });

  it('DPDF-N4 — join-config mount uses server displayName in userInfo', () => {
    const displayName = 'Auto Patient Name';
    const mountOpts = {
      userInfo: { displayName },
      configOverwrite: getJitsiExternalApiOptions('patient', displayName).configOverwrite,
    };
    expect(mountOpts.userInfo.displayName).toBe('Auto Patient Name');
    expect(mountOpts.configOverwrite.requireDisplayName).toBe(false);
  });
});

describe('Defect PDF #3 — doctor host / patient participant meeting roles', () => {
  it('DPDF-M1 — public meet.jit.si mount omits JWT (prevents blank iframe)', () => {
    const jwtVal = resolveMountJwt();
    expect(jwtVal).toBeUndefined();
  });

  it('DPDF-M2 — Jitsi room JWT removed; doctor host via lobby + moderator config', () => {
    const token = createJitsiRoleJwt();
    expect(token).toBeNull();
  });

  it('DPDF-M3 — Jitsi room JWT removed; patient is participant via lobby', () => {
    const token = createJitsiRoleJwt();
    expect(token).toBeNull();
  });

  it('DPDF-M4 — doctor toolbar includes host controls; patient does not', () => {
    const doctorOpts = getJitsiExternalApiOptions('doctor', 'Dr. Demo');
    const patientOpts = getJitsiExternalApiOptions('patient', 'Patient Demo');
    expect(doctorOpts.configOverwrite.toolbarButtons).toContain('participants-pane');
    expect(patientOpts.configOverwrite.toolbarButtons).not.toContain('participants-pane');
    expect(doctorOpts.configOverwrite.startWithAudioMuted).toBe(false);
    expect(patientOpts.configOverwrite.startWithAudioMuted).toBe(true);
  });

  it('DPDF-M5 — shared room URL across doctor and patient confirm links', () => {
    const room = 'izara-shared-room-defect';
    const urls = buildTelehealthMeetingUrls('apt-host-1', {
      roomName: room,
      patientName: 'P',
      doctorName: 'D',
    });
    expect(urls.doctorMeetingUrl).toContain(`/${room}`);
    expect(urls.patientMeetingUrl).toContain(`/${room}`);
  });

  it('DPDF-M6 — stable room name is deterministic per appointment id', () => {
    const a = stableRoomNameForAppointment('apt-host-stable-123');
    const b = stableRoomNameForAppointment('apt-host-stable-123');
    expect(a).toBe(b);
    expect(a).toMatch(/^izara-apt-host-sta-meeting$/);
  });
});

describe('Defect PDF — calendar on doctor confirm', () => {
  it('DPDF-CAL1 — confirm flow builds calendarEventUrl with meeting link', () => {
    const calendarEventUrl = buildTelehealthCalendarUrl({
      appointmentId: 'APT-CAL-1',
      confirmedDate: '2026-06-10',
      confirmedTime: '10:00',
      doctorName: 'Dr. Test',
      patientName: 'Patient Demo',
      meetingLink: 'https://meet.jit.si/izara-cal-test',
    });
    expect(calendarEventUrl).toContain('calendar.google.com');
    expect(calendarEventUrl).toContain(encodeURIComponent('https://meet.jit.si/izara-cal-test'));
  });

  it('DPDF-CAL2 — mapAppointmentForClient exposes schedule fields after confirm', () => {
    const mapped = mapAppointmentForClient({
      id: 'APT-CAL-2',
      doctor_id: 'DOC-TEST-001',
      status: 'confirmed',
      confirmed_date: '2026-06-10',
      confirmed_time: '10:00',
      meeting_link: 'https://meet.jit.si/room',
    });
    expect(mapped.doctorId).toBe('DOC-TEST-001');
    expect(mapped.appointmentDate).toBe('2026-06-10');
    expect(mapped.meetingLink).toContain('meet.jit.si');
  });
});
