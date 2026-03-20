import { useCallback, useState } from 'react';
import { doctorApi } from '../api/doctor.api';
import type { EMRRecord, LabOrder, ImagingOrder, Prescription } from '../types';

export function useDoctorApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callApi = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getDashboard: useCallback(
      (doctorId: string) => callApi(() => doctorApi.getDashboard(doctorId)),
      [callApi],
    ),
    getAppointments: useCallback(
      (doctorId: string) => callApi(() => doctorApi.getAppointments(doctorId)),
      [callApi],
    ),
    getQueue: useCallback(
      () => callApi(() => doctorApi.getQueue()),
      [callApi],
    ),
    claimAppointment: useCallback(
      (id: string) => callApi(() => doctorApi.claimAppointment(id)),
      [callApi],
    ),
    getPatients: useCallback(
      (search?: string) => callApi(() => doctorApi.getPatients(search)),
      [callApi],
    ),
    getPatientDetail: useCallback(
      (patientId: string) => callApi(() => doctorApi.getPatientDetail(patientId)),
      [callApi],
    ),
    createEMR: useCallback(
      (data: Partial<EMRRecord>) => callApi(() => doctorApi.createEMR(data)),
      [callApi],
    ),
    signEMR: useCallback(
      (emrId: string) => callApi(() => doctorApi.signEMR(emrId)),
      [callApi],
    ),
    createPrescription: useCallback(
      (data: Partial<Prescription>) => callApi(() => doctorApi.createPrescription(data)),
      [callApi],
    ),
    searchDrugs: useCallback(
      (query?: string) => callApi(() => doctorApi.searchDrugs(query)),
      [callApi],
    ),
    createLabOrder: useCallback(
      (data: Partial<LabOrder>) => callApi(() => doctorApi.createLabOrder(data)),
      [callApi],
    ),
    uploadLabResults: useCallback(
      (labOrderId: string, results: string) => callApi(() => doctorApi.uploadLabResults(labOrderId, results)),
      [callApi],
    ),
    createImagingOrder: useCallback(
      (data: Partial<ImagingOrder>) => callApi(() => doctorApi.createImagingOrder(data)),
      [callApi],
    ),
    getMedicalContent: useCallback(
      () => callApi(() => doctorApi.getMedicalContent()),
      [callApi],
    ),
    getClinicalResources: useCallback(
      () => callApi(() => doctorApi.getClinicalResources()),
      [callApi],
    ),
    getNotifications: useCallback(
      () => callApi(() => doctorApi.getNotifications()),
      [callApi],
    ),
    markNotificationRead: useCallback(
      (id: string) => callApi(() => doctorApi.markNotificationRead(id)),
      [callApi],
    ),
    sendAIChat: useCallback(
      (message: string, context?: Record<string, unknown>) =>
        callApi(() => doctorApi.sendAIChat(message, context)),
      [callApi],
    ),
    getAdminUsers: useCallback(
      () => callApi(() => doctorApi.getAdminUsers()),
      [callApi],
    ),
    approveUser: useCallback(
      (userId: string) => callApi(() => doctorApi.approveUser(userId)),
      [callApi],
    ),
    getAvailability: useCallback(
      (doctorId: string) => callApi(() => doctorApi.getAvailability(doctorId)),
      [callApi],
    ),
    updateAvailability: useCallback(
      (doctorId: string, data: Array<{ day: string; slots: string[] }>) =>
        callApi(() => doctorApi.updateAvailability(doctorId, data)),
      [callApi],
    ),
    getPatientPHR: useCallback(
      (patientId: string) => callApi(() => doctorApi.getPatientPHR(patientId)),
      [callApi],
    ),
  };
}
