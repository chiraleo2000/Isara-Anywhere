/**
 * Doctor frontend service: clinicalDataService (GCS mocked — no network).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const gcsMocks = vi.hoisted(() => ({
  fetchAllDoctors: vi.fn(),
  fetchAllPatients: vi.fn(),
  fetchAllEMRs: vi.fn(),
  fetchAllPrescriptions: vi.fn(),
  fetchAllLabOrders: vi.fn(),
  fetchAllImagingOrders: vi.fn(),
  fetchAllAppointments: vi.fn(),
  fetchPatientQueue: vi.fn(),
  fetchMedications: vi.fn(),
  fetchLabTests: vi.fn(),
  fetchICD10Codes: vi.fn(),
  saveAllEMRs: vi.fn(),
  saveAllPrescriptions: vi.fn(),
  saveAllLabOrders: vi.fn(),
  saveAllImagingOrders: vi.fn(),
  saveDoctors: vi.fn(),
  saveAllPatients: vi.fn(),
  savePatientQueue: vi.fn(),
  clearCache: vi.fn(),
}));

vi.mock('@doctor/services/gcsDataService.ts', () => gcsMocks);

describe('clinicalDataService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('getDoctors / getPatients / getLabOrders load via GCS routers', async () => {
    gcsMocks.fetchAllDoctors.mockResolvedValue([{ id: 'd1' }]);
    gcsMocks.fetchAllPatients.mockResolvedValue([{ id: 'p1' }]);
    gcsMocks.fetchAllLabOrders.mockResolvedValue([{ id: 'lab1', patientId: 'p1' }]);

    const clinical = await import('@doctor/services/clinicalDataService.ts');
    await expect(clinical.getDoctors()).resolves.toEqual([{ id: 'd1' }]);
    await expect(clinical.getPatients()).resolves.toEqual([{ id: 'p1' }]);
    await expect(clinical.getLabOrders()).resolves.toEqual([{ id: 'lab1', patientId: 'p1' }]);
  });

  it('caches repeated loads within TTL', async () => {
    gcsMocks.fetchAllDoctors.mockResolvedValue([{ id: 'd1' }]);
    const clinical = await import('@doctor/services/clinicalDataService.ts');
    await clinical.getDoctors();
    await clinical.getDoctors();
    expect(gcsMocks.fetchAllDoctors).toHaveBeenCalledTimes(1);
  });

  it('clearMockDataCache forces reload and clears GCS cache', async () => {
    gcsMocks.fetchAllDoctors.mockResolvedValue([{ id: 'd1' }]);
    const clinical = await import('@doctor/services/clinicalDataService.ts');
    await clinical.getDoctors();
    clinical.clearMockDataCache();
    await clinical.getDoctors();
    expect(gcsMocks.clearCache).toHaveBeenCalled();
    expect(gcsMocks.fetchAllDoctors).toHaveBeenCalledTimes(2);
  });

  it('saveMockData routes and update/delete records', async () => {
    gcsMocks.fetchAllEMRs.mockResolvedValue([{ id: 'e1', patientId: 'p1', note: 'a' }]);
    gcsMocks.saveAllEMRs.mockResolvedValue(undefined);

    const clinical = await import('@doctor/services/clinicalDataService.ts');
    await expect(clinical.saveMockData('emrs.json', [{ id: 'e1' }])).resolves.toBe(true);
    expect(gcsMocks.saveAllEMRs).toHaveBeenCalled();

    await expect(
      clinical.updateMockDataRecord('emrs.json', 'e1', { note: 'b' } as never),
    ).resolves.toBe(true);
    await expect(clinical.deleteMockDataRecord('emrs.json', 'e1')).resolves.toBe(true);
    await expect(clinical.updateMockDataRecord('emrs.json', 'missing', {})).resolves.toBe(false);
  });

  it('filtered queries and search helpers', async () => {
    gcsMocks.fetchAllEMRs.mockResolvedValue([
      { id: 'e1', patientId: 'p1' },
      { id: 'e2', patientId: 'p2' },
    ]);
    gcsMocks.fetchAllAppointments.mockResolvedValue([
      { id: 'a1', doctorId: 'd1', dateTime: new Date().toISOString() },
      { id: 'a2', doctorId: 'd2', dateTime: new Date().toISOString() },
    ]);
    gcsMocks.fetchAllPatients.mockResolvedValue([
      {
        id: 'p1',
        demographics: { name: 'Alice Smith', idNumber: '123' },
        contact: { email: 'a@x.com', phone: '081' },
      },
    ]);
    gcsMocks.fetchMedications.mockResolvedValue([
      { name: 'Paracetamol', generic: 'acetaminophen' },
      { name: 'Ibuprofen', generic: 'ibuprofen' },
    ]);
    gcsMocks.fetchAllPrescriptions.mockResolvedValue([{ id: 'rx1', patientId: 'p1' }]);
    gcsMocks.fetchAllLabOrders.mockResolvedValue([{ id: 'l1', patientId: 'p1' }]);
    gcsMocks.fetchAllImagingOrders.mockResolvedValue([{ id: 'i1', patientId: 'p1' }]);

    const clinical = await import('@doctor/services/clinicalDataService.ts');
    await expect(clinical.getPatientEMRs('p1')).resolves.toEqual([{ id: 'e1', patientId: 'p1' }]);
    await expect(clinical.getDoctorAppointments('d1')).resolves.toHaveLength(1);
    await expect(clinical.searchPatients('alice')).resolves.toHaveLength(1);
    await expect(clinical.searchMedications('para')).resolves.toHaveLength(1);
    await expect(clinical.getPatientPrescriptions('p1')).resolves.toHaveLength(1);
    await expect(clinical.getPatientLabOrders('p1')).resolves.toHaveLength(1);
    await expect(clinical.getPatientImagingOrders('p1')).resolves.toHaveLength(1);
  });

  it('unknown save target returns false; load errors return []', async () => {
    gcsMocks.fetchAllDoctors.mockRejectedValue(new Error('gcs down'));
    const clinical = await import('@doctor/services/clinicalDataService.ts');
    await expect(clinical.getDoctors()).resolves.toEqual([]);
    await expect(clinical.saveMockData('unknown.json', [])).resolves.toBe(false);
  });
});
