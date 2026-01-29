/**
 * Doctor Availability Settings Page
 * Allows doctors to:
 * - Set their available time slots
 * - View and manage incoming appointments
 * - Approve/reject appointments with time selection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/common/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: string; // For one-time slots
}

interface DoctorAvailability {
  doctorId: string;
  weeklySchedule: TimeSlot[];
  exceptions: {
    date: string;
    isAvailable: boolean;
    reason?: string;
  }[];
  consultationDuration: number; // minutes
  breakBetweenConsultations: number; // minutes
}

interface PendingAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  requestedDate: string;
  preferredTime?: string;
  reason: string;
  symptoms?: string[];
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  status: 'assigned' | 'confirmed' | 'pending';
  assignedDateTime?: string;
  notes?: string;
  createdAt: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DoctorAvailabilitySettings: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [availability, setAvailability] = useState<DoctorAvailability>({
    doctorId: '',
    weeklySchedule: [],
    exceptions: [],
    consultationDuration: 30,
    breakBetweenConsultations: 5
  });
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'appointments'>('schedule');
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<PendingAppointment | null>(null);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    isRecurring: true
  });
  const [approvalData, setApprovalData] = useState({
    date: '',
    time: '',
    notes: ''
  });

  // API URLs - Empty string for relative paths in production (Cloud Run)
  const API_URL = import.meta.env.VITE_AUTH_URL || '';
  const MAIN_API_URL = import.meta.env.VITE_API_URL || '';

  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Load doctor's availability
  const loadAvailability = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Try to fetch existing availability from GCS
      const response = await fetch(`${API_URL}/api/storage/read?bucket=credentials&path=doctors/${user.id}/availability.json`);

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setAvailability(data.data);
        } else {
          // Set default availability with doctor ID
          setAvailability(prev => ({ ...prev, doctorId: user.id }));
        }
      } else {
        setAvailability(prev => ({ ...prev, doctorId: user.id }));
      }
    } catch (err) {
      console.error('Error loading availability:', err);
      setAvailability(prev => ({ ...prev, doctorId: user.id }));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load pending appointments for this doctor
  const loadPendingAppointments = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${MAIN_API_URL}/api/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const appointments = (data.appointments || data || [])
          .filter((apt: any) =>
            apt.doctorId === user.id &&
            (apt.status === 'assigned' || apt.status === 'pending')
          )
          .map((apt: any) => ({
            id: apt.id,
            patientId: apt.patientId || apt.user?.id,
            patientName: apt.user?.name || apt.patientName || 'Unknown',
            patientEmail: apt.user?.email || apt.patientEmail || '',
            requestedDate: apt.date || apt.requestedDate,
            preferredTime: apt.preferredTime,
            reason: apt.reason || apt.symptoms?.join(', ') || 'Consultation',
            symptoms: apt.symptoms || [],
            urgency: apt.urgency || 'medium',
            status: apt.status,
            assignedDateTime: apt.assignedDateTime,
            notes: apt.notes,
            createdAt: apt.createdAt
          }));
        setPendingAppointments(appointments);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAvailability();
    loadPendingAppointments();
  }, [loadAvailability, loadPendingAppointments]);

  // Save availability to GCS
  const saveAvailability = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/storage/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          bucket: 'credentials',
          path: `doctors/${user?.id}/availability.json`,
          data: availability
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save availability');
      }

      setSuccessMessage('Availability saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving availability:', err);
      setError('Failed to save availability settings');
    } finally {
      setSaving(false);
    }
  };

  // Add time slot
  const addTimeSlot = () => {
    const slot: TimeSlot = {
      id: `slot_${Date.now()}`,
      dayOfWeek: newSlot.dayOfWeek,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime,
      isRecurring: newSlot.isRecurring
    };

    setAvailability(prev => ({
      ...prev,
      weeklySchedule: [...prev.weeklySchedule, slot]
    }));
    setShowTimeSlotModal(false);
    setNewSlot({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isRecurring: true });
  };

  // Remove time slot
  const removeTimeSlot = (slotId: string) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.filter(s => s.id !== slotId)
    }));
  };

  // Approve appointment
  const handleApproveAppointment = async () => {
    if (!selectedAppointment || !approvalData.date || !approvalData.time) {
      setError('Please select a date and time');
      return;
    }

    try {
      setSaving(true);

      const confirmedDateTime = `${approvalData.date}T${approvalData.time}:00`;

      const response = await fetch(`${MAIN_API_URL}/api/appointments/${selectedAppointment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          assignedDateTime: confirmedDateTime,
          date: new Date(confirmedDateTime),
          doctorNotes: approvalData.notes,
          confirmedByDoctor: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to confirm appointment');
      }

      setSuccessMessage('Appointment confirmed successfully!');
      setShowApproveModal(false);
      setSelectedAppointment(null);
      setApprovalData({ date: '', time: '', notes: '' });
      loadPendingAppointments();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error confirming appointment:', err);
      setError('Failed to confirm appointment');
    } finally {
      setSaving(false);
    }
  };

  // Reject appointment
  const handleRejectAppointment = async (appointmentId: string) => {
    const reason = prompt('Please enter reason for rejection:');
    if (!reason) return;

    try {
      const response = await fetch(`${MAIN_API_URL}/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason,
          rejectedByDoctor: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reject appointment');
      }

      setSuccessMessage('Appointment rejected');
      loadPendingAppointments();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error rejecting appointment:', err);
      setError('Failed to reject appointment');
    }
  };

  // Get available time slots for a date
  const getAvailableTimeSlotsForDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    // Get slots for this day of week
    const daySlots = availability.weeklySchedule.filter(s => s.dayOfWeek === dayOfWeek);

    // Check if this date is an exception
    const exception = availability.exceptions.find(e => e.date === dateStr);
    if (exception && !exception.isAvailable) {
      return [];
    }

    // Generate time slots based on consultation duration
    const slots: string[] = [];
    daySlots.forEach(slot => {
      let currentTime = slot.startTime;
      while (currentTime < slot.endTime) {
        slots.push(currentTime);
        // Add duration + break
        const [hours, mins] = currentTime.split(':').map(Number);
        const totalMins = hours * 60 + mins + availability.consultationDuration + availability.breakBetweenConsultations;
        const newHours = Math.floor(totalMins / 60);
        const newMins = totalMins % 60;
        currentTime = `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
      }
    });

    return slots;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Availability & Appointments</h1>
          <p className="text-gray-600 mt-1">Manage your schedule and approve patient appointments</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500">×</button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'schedule'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            My Schedule
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'appointments'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            Pending Appointments
            {pendingAppointments.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingAppointments.length}
              </span>
            )}
          </button>
        </div>

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
              <button
                onClick={() => setShowTimeSlotModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                + Add Time Slot
              </button>
            </div>

            {/* Consultation Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label htmlFor="consultation-duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Consultation Duration (minutes)
                </label>
                <input
                  id="consultation-duration"
                  type="number"
                  value={availability.consultationDuration}
                  onChange={(e) => setAvailability(prev => ({ ...prev, consultationDuration: Number.parseInt(e.target.value, 10) || 30 }))}
                  min={15}
                  max={120}
                  step={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="break-duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Break Between Consultations (minutes)
                </label>
                <input
                  id="break-duration"
                  type="number"
                  value={availability.breakBetweenConsultations}
                  onChange={(e) => setAvailability(prev => ({ ...prev, breakBetweenConsultations: Number.parseInt(e.target.value, 10) || 5 }))}
                  min={0}
                  max={60}
                  step={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Time Slots by Day */}
            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const daySlots = availability.weeklySchedule.filter(s => s.dayOfWeek === dayIndex);
                return (
                  <div key={day} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{day}</h3>
                      {daySlots.length === 0 && (
                        <span className="text-sm text-gray-400">No slots</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {daySlots.map(slot => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm"
                        >
                          <span>{slot.startTime} - {slot.endTime}</span>
                          <button
                            onClick={() => removeTimeSlot(slot.id)}
                            className="text-emerald-600 hover:text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveAvailability}
                disabled={saving}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Appointment Requests</h2>

            {pendingAppointments.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Pending Appointments</h3>
                <p className="text-gray-500">You're all caught up! No appointments waiting for approval.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{apt.patientName}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${apt.urgency === 'emergency' ? 'bg-red-100 text-red-800' :
                              apt.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                                apt.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                            }`}>
                            {apt.urgency}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${apt.status === 'assigned' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {apt.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{apt.patientEmail}</p>
                        <div className="mt-2 text-sm">
                          <p><span className="font-medium">Reason:</span> {apt.reason}</p>
                          <p><span className="font-medium">Requested:</span> {new Date(apt.requestedDate).toLocaleDateString()}</p>
                          {apt.preferredTime && (
                            <p><span className="font-medium">Preferred Time:</span> {apt.preferredTime}</p>
                          )}
                          {apt.assignedDateTime && (
                            <p className="text-blue-600">
                              <span className="font-medium">Assigned:</span> {new Date(apt.assignedDateTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedAppointment(apt);
                            setApprovalData({
                              date: apt.assignedDateTime ? apt.assignedDateTime.split('T')[0] : '',
                              time: apt.assignedDateTime ? apt.assignedDateTime.split('T')[1]?.substring(0, 5) : '',
                              notes: ''
                            });
                            setShowApproveModal(true);
                          }}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                        >
                          Approve & Schedule
                        </button>
                        <button
                          onClick={() => handleRejectAppointment(apt.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Time Slot Modal */}
      {showTimeSlotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Available Time Slot</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="slot-day-of-week" className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select
                  id="slot-day-of-week"
                  value={newSlot.dayOfWeek}
                  onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: Number.parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="slot-start-time" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    id="slot-start-time"
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="slot-end-time" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    id="slot-end-time"
                    type="time"
                    value={newSlot.endTime}
                    onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTimeSlotModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addTimeSlot}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Add Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Appointment</h3>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedAppointment.patientName}</p>
              <p className="text-sm text-gray-600">{selectedAppointment.reason}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="approval-date" className="block text-sm font-medium text-gray-700 mb-1">Select Date *</label>
                <input
                  id="approval-date"
                  type="date"
                  value={approvalData.date}
                  onChange={(e) => setApprovalData({ ...approvalData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <span id="approval-time-label" className="block text-sm font-medium text-gray-700 mb-1">Select Time *</span>
                {approvalData.date ? (
                  <div className="flex flex-wrap gap-2">
                    {getAvailableTimeSlotsForDate(approvalData.date).length > 0 ? (
                      getAvailableTimeSlotsForDate(approvalData.date).map(time => (
                        <button
                          key={time}
                          onClick={() => setApprovalData({ ...approvalData, time })}
                          className={`px-3 py-2 rounded-lg text-sm ${approvalData.time === time
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {time}
                        </button>
                      ))
                    ) : (
                      <div>
                        <p className="text-sm text-yellow-600 mb-2">No preset slots for this day. Enter time manually:</p>
                        <input
                          type="time"
                          value={approvalData.time}
                          onChange={(e) => setApprovalData({ ...approvalData, time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Select a date first</p>
                )}
              </div>

              <div>
                <label htmlFor="approval-notes" className="block text-sm font-medium text-gray-700 mb-1">Notes for Patient</label>
                <textarea
                  id="approval-notes"
                  value={approvalData.notes}
                  onChange={(e) => setApprovalData({ ...approvalData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Any instructions or notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedAppointment(null);
                  setApprovalData({ date: '', time: '', notes: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAppointment}
                disabled={!approvalData.date || !approvalData.time || saving}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Confirming...' : 'Confirm Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAvailabilitySettings;
