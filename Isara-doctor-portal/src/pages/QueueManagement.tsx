import React, { useState, useEffect, useCallback } from 'react';
import { QueuePatient, User } from '../types';

// ============================================================================
// REAL-TIME PATIENT QUEUE MANAGEMENT
// ============================================================================

interface QueueManagementProps {
  doctor: User;
  onCallPatient: (patient: QueuePatient) => void;
  onSkipPatient: (patient: QueuePatient, reason: string) => void;
}

// API URL - Empty string for relative paths in production (Cloud Run)
const API_URL = import.meta.env.VITE_API_URL || '';

export const QueueManagement: React.FC<QueueManagementProps> = ({
  doctor,
  onCallPatient,
  onSkipPatient,
}) => {
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [stats, setStats] = useState({
    averageWaitTime: 0,
    patientsSeenToday: 0,
    patientsRemaining: 0,
  });
  const [skipReason, setSkipReason] = useState('');
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch queue from API
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token') || '';
      
      // Fetch confirmed appointments for this doctor (today's queue)
      const response = await fetch(`${API_URL}/api/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch queue');
      }
      
      const data = await response.json();
      const appointments = data.appointments || [];
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Filter appointments for this doctor and today
      const todaysAppointments = appointments.filter((apt: any) => {
        const aptDate = apt.appointmentDate || apt.date;
        return (
          apt.doctorId === doctor.id &&
          aptDate === today &&
          ['confirmed', 'in-progress', 'waiting'].includes(apt.status)
        );
      });
      
      // Transform appointments to QueuePatient format
      const queuePatients: QueuePatient[] = todaysAppointments.map((apt: any, index: number) => ({
        id: apt.id,
        patientId: apt.patientId,
        patientName: apt.patientName || 'Unknown Patient',
        appointmentTime: apt.appointmentTime || apt.time || '09:00',
        appointmentId: apt.id,
        queueNumber: index + 1,
        reason: apt.reason || apt.symptoms?.description || 'Consultation',
        priority: apt.urgency === 'emergency' ? 'urgent' : 'routine',
        status: apt.status === 'confirmed' ? 'waiting' : apt.status,
        estimatedWaitTime: (index + 1) * 15, // 15 min per patient
      }));
      
      // Sort by appointment time
      queuePatients.sort((a, b) => {
        const timeA = String(a.appointmentTime).replace(':', '');
        const timeB = String(b.appointmentTime).replace(':', '');
        return Number.parseInt(timeA, 10) - Number.parseInt(timeB, 10);
      });
      
      setQueue(queuePatients);
      
      // Calculate stats
      const waiting = queuePatients.filter(p => p.status === 'waiting').length;
      const completed = appointments.filter((apt: any) => 
        apt.doctorId === doctor.id && 
        apt.appointmentDate === today && 
        apt.status === 'completed'
      ).length;
      
      setStats({
        averageWaitTime: waiting > 0 ? Math.round(waiting * 15 / 2) : 0,
        patientsSeenToday: completed,
        patientsRemaining: waiting,
      });
      
    } catch (err) {
      console.error('Error loading queue:', err);
      setError(err instanceof Error ? err.message : 'Failed to load queue');
      setQueue([]);
      setStats({ averageWaitTime: 0, patientsSeenToday: 0, patientsRemaining: 0 });
    } finally {
      setLoading(false);
    }
  }, [doctor.id]);

  // Load queue on mount and poll every 30 seconds
  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [loadQueue]);

  const handleCallNext = () => {
    const nextPatient = queue.find((p) => p.status === 'waiting');
    if (nextPatient) {
      onCallPatient(nextPatient);
      setQueue(queue.map((p) => (p.id === nextPatient.id ? { ...p, status: 'in-progress' as const } : p)));
    }
  };

  const handleSkip = (patient: QueuePatient) => {
    setSelectedPatient(patient);
    setShowSkipModal(true);
  };

  const confirmSkip = () => {
    if (selectedPatient && skipReason) {
      onSkipPatient(selectedPatient, skipReason);
      setQueue(queue.map((p) => (p.id === selectedPatient.id ? { ...p, status: 'skipped' as const } : p)));
      setShowSkipModal(false);
      setSkipReason('');
      setSelectedPatient(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'routine':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-500 text-white';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-400 text-white';
      case 'skipped':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patient Queue</h2>
          <p className="text-sm text-gray-600">Dr. {doctor.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadQueue}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            title="Refresh Queue"
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleCallNext}
            disabled={!queue.some((p) => p.status === 'waiting')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
          >
            📞 Call Next Patient
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Queue Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.averageWaitTime} min</div>
          <div className="text-sm text-gray-600">Average Wait Time</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.patientsSeenToday}</div>
          <div className="text-sm text-gray-600">Patients Seen Today</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{stats.patientsRemaining}</div>
          <div className="text-sm text-gray-600">Patients Remaining</div>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <div className="text-lg">Loading queue...</div>
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-lg">No patients in queue</div>
            <div className="text-sm mt-2">Appointments will appear here when patients book for today</div>
          </div>
        ) : (
          queue.map((patient) => (
            <div
              key={patient.id}
              className={`p-4 border-2 rounded-lg transition-all ${
                patient.status === 'in-progress'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Queue Number */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                      patient.status === 'in-progress'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {patient.queueNumber}
                  </div>

                  {/* Patient Info */}
                  <div>
                    <div className="font-semibold text-lg">{patient.patientName}</div>
                    <div className="text-sm text-gray-600">
                      Appointment: {new Date(patient.appointmentTime).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-gray-600">Reason: {patient.reason}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Priority Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-2 uppercase ${getPriorityColor(
                      patient.priority
                    )}`}
                  >
                    {patient.priority}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(
                      patient.status
                    )}`}
                  >
                    {patient.status}
                  </span>

                  {/* Wait Time */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">
                      {patient.estimatedWaitTime} min
                    </div>
                    <div className="text-xs text-gray-500">Est. Wait</div>
                  </div>

                  {/* Actions */}
                  {patient.status === 'waiting' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onCallPatient(patient)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                      >
                        Call
                      </button>
                      <button
                        onClick={() => handleSkip(patient)}
                        className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Skip Modal */}
      {showSkipModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Skip Patient</h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to skip <strong>{selectedPatient.patientName}</strong>?
            </p>
            <label className="block font-medium mb-2">Reason for Skipping</label>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSkipModal(false);
                  setSkipReason('');
                  setSelectedPatient(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmSkip}
                disabled={!skipReason}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
