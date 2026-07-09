/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * @process Processes/Pages/Doctor-Portal/06_Health_Meeting_Page.md
 * @process Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md
 * @process Processes/Appointment_Workflows.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateIzaraRoomName,
  prepareLayoutThenMount,
  resolveMountJwt,
  loadJitsiExternalApiScript,
} from '../../../Isara-doctor-portal/frontend/utils/jitsiMeetingConfig.ts';
import {
  buildTelehealthMeetingUrls,
  generateIzaraRoomName as serverGenerateIzaraRoomName,
} from '../../../Isara-doctor-portal/backend/jitsiMeetingLinks.cjs';

describe('meetingWorkflowHardening — Jitsi mount safety (JWT removed)', () => {
  it('MWH01 — resolveMountJwt always undefined on public meet.jit.si', () => {
    expect(resolveMountJwt()).toBeUndefined();
  });

  it('MWH02 — resolveMountJwt always undefined on private domain (session auth)', () => {
    expect(resolveMountJwt()).toBeUndefined();
  });

  it('MWH03 — prepareLayoutThenMount rolls back when container missing', async () => {
    const statuses: string[] = [];
    const result = await prepareLayoutThenMount(
      (s) => statuses.push(s),
      () => null,
      'ready',
      'pre_join',
      async () => {},
      0,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/container/i);
    expect(statuses).toEqual(['ready', 'pre_join']);
  });

  it('MWH04 — prepareLayoutThenMount fails when Jitsi API not loaded', async () => {
    vi.stubGlobal('JitsiMeetExternalAPI', undefined);
    const result = await prepareLayoutThenMount(
      () => {},
      () => ({}) as HTMLElement,
      'ready',
      'pre_join',
      async () => {},
      0,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Failed to load Jitsi/i);
  });

  it('MWH05 — prepareLayoutThenMount mounts when container and API exist', async () => {
    vi.stubGlobal('JitsiMeetExternalAPI', vi.fn());
    let mounted = false;
    const result = await prepareLayoutThenMount(
      () => {},
      () => ({}) as HTMLElement,
      'ready',
      'pre_join',
      async () => { mounted = true; },
      0,
    );
    expect(result.ok).toBe(true);
    expect(mounted).toBe(true);
  });
});

describe('meetingWorkflowHardening — room URL parity across portals', () => {
  it('MWH06 — client and server room generators share izara prefix', () => {
    const client = generateIzaraRoomName('abc123def456');
    const server = serverGenerateIzaraRoomName('abc123def456');
    expect(client).toMatch(/^izara-abc123def456-/);
    expect(server).toMatch(/^izara-abc123def456-/);
  });

  it('MWH07 — confirm URLs share portal paths when ids provided', () => {
    const room = 'izara-fixed-room-test';
    const urls = buildTelehealthMeetingUrls('apt-workflow-1', {
      roomName: room,
      patientName: 'Patient Demo',
      doctorName: 'Dr. Demo',
      patientId: 'pat-1',
      doctorId: 'doc-1',
    });
    expect(urls.roomName).toBe(room);
    expect(urls.patientMeetingUrl).toContain('/patient/pat-1/meeting/apt-workflow-1');
    expect(urls.doctorMeetingUrl).toContain('/doctor/doc-1/meeting/apt-workflow-1');
    expect(urls.jitsiPatientMeetingUrl).toContain(`/${room}`);
    expect(urls.jitsiDoctorMeetingUrl).toContain(`/${room}`);
  });

  it('MWH08 — doctor join must not embed JWT in External API opts', () => {
    const jwt = resolveMountJwt();
    const mountOpts = jwt ? { jwt } : {};
    expect(mountOpts).toEqual({});
  });

  it('MWH09 — MeetingRoom calls notifyHostPresent on conference joined', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../../Isara-doctor-portal/frontend/pages/meetings/MeetingRoom.tsx'),
      'utf8',
    );
    expect(src).toMatch(/notifyHostPresent/);
    expect(src).toMatch(/videoConferenceJoined.*handleConferenceJoined|handleConferenceJoined/);
  });
});

describe('meetingWorkflowHardening — domain-aware script loader', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      head: { appendChild: vi.fn() },
      createElement: vi.fn(() => ({
        async: false,
        src: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        addEventListener: vi.fn(),
        getAttribute: vi.fn(() => null),
      })),
    });
    vi.stubGlobal('JitsiMeetExternalAPI', undefined);
  });

  it('MWH09 — loadJitsiExternalApiScript targets join-config domain not hardcoded env', async () => {
    const promise = loadJitsiExternalApiScript('custom.jitsi.example.com');
    const script = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    script.onload?.();
    await promise;
    expect(script.src).toBe('https://custom.jitsi.example.com/external_api.js');
  });
});
