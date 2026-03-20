import { useCallback, useState } from 'react';
import { patientApi } from '../api/patient.api';
import type { BookAppointmentRequest, VitalSign, LivingWill } from '../types';

export function usePatientApi() {
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
    getUpcomingAppointments: useCallback(
      () => callApi(() => patientApi.getUpcomingAppointments()),
      [callApi],
    ),
    getAppointmentHistory: useCallback(
      () => callApi(() => patientApi.getAppointmentHistory()),
      [callApi],
    ),
    getAppointment: useCallback(
      (id: string) => callApi(() => patientApi.getAppointment(id)),
      [callApi],
    ),
    bookAppointment: useCallback(
      (data: BookAppointmentRequest) => callApi(() => patientApi.bookAppointment(data)),
      [callApi],
    ),
    cancelAppointment: useCallback(
      (id: string) => callApi(() => patientApi.cancelAppointment(id)),
      [callApi],
    ),
    getDoctors: useCallback(
      () => callApi(() => patientApi.getDoctors()),
      [callApi],
    ),
    getPHR: useCallback(
      (patientId: string) => callApi(() => patientApi.getPHR(patientId)),
      [callApi],
    ),
    getVitals: useCallback(
      (patientId: string) => callApi(() => patientApi.getVitals(patientId)),
      [callApi],
    ),
    addVital: useCallback(
      (patientId: string, data: Omit<VitalSign, 'id' | 'patientId' | 'recordedAt'>) =>
        callApi(() => patientApi.addVital(patientId, data)),
      [callApi],
    ),
    getTimeline: useCallback(
      (patientId: string) => callApi(() => patientApi.getTimeline(patientId)),
      [callApi],
    ),
    getLabOrders: useCallback(
      () => callApi(() => patientApi.getLabOrders()),
      [callApi],
    ),
    getPrescriptions: useCallback(
      (patientId: string) => callApi(() => patientApi.getPrescriptions(patientId)),
      [callApi],
    ),
    getLivingWill: useCallback(
      (patientId: string) => callApi(() => patientApi.getLivingWill(patientId)),
      [callApi],
    ),
    saveLivingWill: useCallback(
      (patientId: string, data: Partial<LivingWill>) =>
        callApi(() => patientApi.saveLivingWill(patientId, data)),
      [callApi],
    ),
    getMedicationReminders: useCallback(
      () => callApi(() => patientApi.getMedicationReminders()),
      [callApi],
    ),
    markReminderTaken: useCallback(
      (id: string) => callApi(() => patientApi.markReminderTaken(id)),
      [callApi],
    ),
    getMedicalContent: useCallback(
      () => callApi(() => patientApi.getMedicalContent()),
      [callApi],
    ),
    getNotifications: useCallback(
      () => callApi(() => patientApi.getNotifications()),
      [callApi],
    ),
    markNotificationRead: useCallback(
      (id: string) => callApi(() => patientApi.markNotificationRead(id)),
      [callApi],
    ),
    sendAIMessage: useCallback(
      (message: string, history?: Array<{ role: string; content: string }>) =>
        callApi(() => patientApi.sendAIMessage(message, history)),
      [callApi],
    ),
    getPDPAConsent: useCallback(
      (patientId: string) => callApi(() => patientApi.getPDPAConsent(patientId)),
      [callApi],
    ),
    savePDPAConsent: useCallback(
      (patientId: string, consent: Record<string, unknown>) =>
        callApi(() => patientApi.savePDPAConsent(patientId, consent)),
      [callApi],
    ),
  };
}
