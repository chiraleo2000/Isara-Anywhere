/**
 * Doctor frontend service: doctorDataService (GCS layer mocked — no network).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const gcsMocks = vi.hoisted(() => ({
  fetchAllDoctors: vi.fn(),
  fetchDoctorById: vi.fn(),
  saveDoctorProfile: vi.fn(),
  fetchPatientQueue: vi.fn(),
  savePatientQueue: vi.fn(),
  fetchDoctorQueue: vi.fn(),
  fetchDoctorSchedule: vi.fn(),
  saveDoctorSchedule: vi.fn(),
  fetchDoctorStats: vi.fn(),
  fetchPatientEMRs: vi.fn(),
  saveEMR: vi.fn(),
  fetchPatientPrescriptions: vi.fn(),
  savePrescription: vi.fn(),
  fetchPatientLabOrders: vi.fn(),
  saveLabOrder: vi.fn(),
  fetchPatientImagingOrders: vi.fn(),
  saveImagingOrder: vi.fn(),
  addTimelineEntry: vi.fn(),
  fetchDoctorAppointments: vi.fn(),
  saveDoctorDayAppointments: vi.fn(),
}));

vi.mock('@doctor/services/gcsDataService.ts', () => gcsMocks);

describe('doctorDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('getAllDoctors / getDoctorProfile / saveDoctorProfile delegate to GCS', async () => {
    gcsMocks.fetchAllDoctors.mockResolvedValue([{ id: 'd1' }]);
    gcsMocks.fetchDoctorById.mockResolvedValue({ id: 'd1', name: 'Dr A' });
    gcsMocks.saveDoctorProfile.mockResolvedValue({ success: true });

    const { doctorDataService } = await import('@doctor/services/doctorDataService.ts');
    await expect(doctorDataService.getAllDoctors()).resolves.toEqual([{ id: 'd1' }]);
    await expect(doctorDataService.getDoctorProfile('d1')).resolves.toEqual({ id: 'd1', name: 'Dr A' });
    await expect(doctorDataService.saveDoctorProfile('d1', { name: 'Dr A' })).resolves.toBe(true);
    expect(gcsMocks.saveDoctorProfile).toHaveBeenCalledWith('d1', { name: 'Dr A' });
  });

  it('getDoctorStats returns defaults when GCS has no stats', async () => {
    gcsMocks.fetchDoctorStats.mockResolvedValue(null);
    const { doctorDataService } = await import('@doctor/services/doctorDataService.ts');
    const stats = await doctorDataService.getDoctorStats('d1');
    expect(stats.todayStats.appointmentsCount).toBe(0);
    expect(stats.patientSatisfaction).toBe(0);
  });

  it('queue helpers filter/merge and persist via savePatientQueue', async () => {
    gcsMocks.fetchPatientQueue.mockResolvedValue([
      { doctorId: 'd1', patientId: 'p1', status: 'waiting', queuePosition: 1, queueNumber: 1 },
      { doctorId: 'd2', patientId: 'p2', status: 'waiting', queuePosition: 1, queueNumber: 1 },
    ]);
    gcsMocks.fetchDoctorQueue.mockResolvedValue([
      { doctorId: 'd1', patientId: 'p1', status: 'waiting', queuePosition: 1, queueNumber: 1 },
    ]);
    gcsMocks.savePatientQueue.mockResolvedValue({ success: true });

    const { doctorDataService } = await import('@doctor/services/doctorDataService.ts');

    await expect(doctorDataService.getQueue('d1')).resolves.toHaveLength(1);

    await expect(
      doctorDataService.updateQueue('d1', [
        { doctorId: 'd1', patientId: 'p1', status: 'waiting', queuePosition: 1, queueNumber: 1 } as never,
      ]),
    ).resolves.toBe(true);

    const saved = gcsMocks.savePatientQueue.mock.calls.at(-1)?.[0] as Array<{ doctorId: string }>;
    expect(saved.some((p) => p.doctorId === 'd2')).toBe(true);
    expect(saved.filter((p) => p.doctorId === 'd1')).toHaveLength(1);
  });

  it('addToQueue / removeFromQueue / callNextPatient update queue state', async () => {
    gcsMocks.fetchPatientQueue.mockResolvedValue([
      { doctorId: 'd1', patientId: 'p1', status: 'waiting', queuePosition: 1, queueNumber: 1 },
    ]);
    gcsMocks.fetchDoctorQueue.mockResolvedValue([
      { doctorId: 'd1', patientId: 'p1', status: 'waiting', queuePosition: 1, queueNumber: 1 },
    ]);
    gcsMocks.savePatientQueue.mockResolvedValue({ success: true });

    const { doctorDataService } = await import('@doctor/services/doctorDataService.ts');

    await expect(
      doctorDataService.addToQueue('d1', {
        patientId: 'p2',
        status: 'waiting',
      } as never),
    ).resolves.toBe(true);

    gcsMocks.fetchPatientQueue.mockResolvedValue([
      { doctorId: 'd1', patientId: 'p1', status: 'waiting', queuePosition: 1, queueNumber: 1 },
      { doctorId: 'd1', patientId: 'p2', status: 'waiting', queuePosition: 2, queueNumber: 2 },
    ]);
    await expect(doctorDataService.removeFromQueue('d1', 'p1')).resolves.toBe(true);

    gcsMocks.fetchDoctorQueue.mockResolvedValue([
      { doctorId: 'd1', patientId: 'p2', status: 'waiting', queuePosition: 1, queueNumber: 1 },
    ]);
    gcsMocks.fetchPatientQueue.mockResolvedValue([
      { doctorId: 'd1', patientId: 'p2', status: 'waiting', queuePosition: 1, queueNumber: 1 },
    ]);
    const next = await doctorDataService.callNextPatient('d1');
    expect(next?.patientId).toBe('p2');
  });

  it('callNextPatient returns null when no waiting patients', async () => {
    gcsMocks.fetchDoctorQueue.mockResolvedValue([
      { doctorId: 'd1', patientId: 'p1', status: 'completed', queuePosition: 1, queueNumber: 1 },
    ]);
    const { doctorDataService } = await import('@doctor/services/doctorDataService.ts');
    await expect(doctorDataService.callNextPatient('d1')).resolves.toBeNull();
  });

  it('appointment and schedule helpers delegate to GCS', async () => {
    gcsMocks.fetchDoctorAppointments.mockResolvedValue([{ id: 'a1' }]);
    gcsMocks.fetchDoctorSchedule.mockResolvedValue([{ day: 'mon' }]);
    gcsMocks.saveDoctorSchedule.mockResolvedValue({ success: true });

    const { doctorDataService } = await import('@doctor/services/doctorDataService.ts');
    await expect(doctorDataService.getAllAppointments('d1')).resolves.toEqual([{ id: 'a1' }]);
    await expect(doctorDataService.getDoctorSchedule('d1')).resolves.toEqual([{ day: 'mon' }]);
    await expect(doctorDataService.saveDoctorSchedule('d1', [{ day: 'tue' }])).resolves.toBe(true);
  });
});
