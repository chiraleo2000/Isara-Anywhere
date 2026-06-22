import { useState, useEffect, useCallback } from 'react';
import { QueuePatient, Appointment } from '../types';
import { doctorDataService } from '../services/doctorDataService';

export function useDoctorData(doctorId: string) {
  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDoctorData = useCallback(async () => {
    if (!doctorId) return;

    try {
      setLoading(true);
      setError(null);

      const [statsData, queueData, appointmentsData] = await Promise.all([
        doctorDataService.getDoctorStats(doctorId),
        doctorDataService.getQueue(doctorId),
        doctorDataService.getTodayAppointments(doctorId),
      ]);

      setStats(statsData);
      setQueue(queueData);
      setTodayAppointments(appointmentsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  const refreshQueue = useCallback(async () => {
    if (!doctorId) return;
    try {
      const queueData = await doctorDataService.getQueue(doctorId);
      setQueue(queueData);
    } catch (err: any) {
      console.error('Error refreshing queue:', err);
    }
  }, [doctorId]);

  const refreshStats = useCallback(async () => {
    if (!doctorId) return;
    try {
      const statsData = await doctorDataService.getDoctorStats(doctorId);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error refreshing stats:', err);
    }
  }, [doctorId]);

  useEffect(() => {
    loadDoctorData();

    const queueInterval = setInterval(refreshQueue, 30000);
    const statsInterval = setInterval(refreshStats, 60000);

    return () => {
      clearInterval(queueInterval);
      clearInterval(statsInterval);
    };
  }, [loadDoctorData, refreshQueue, refreshStats]);

  return {
    stats,
    queue,
    todayAppointments,
    loading,
    error,
    refreshQueue,
    refreshStats,
    reloadAll: loadDoctorData,
  };
}
