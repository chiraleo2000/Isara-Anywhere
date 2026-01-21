/**
 * Complete Schedule Management
 * Calendar view with appointments - fetches real data from GCS
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
// PostgreSQL-backed API service - NO GCS!
import { fetchAllAppointments } from '../services/apiDataService';

interface CompleteScheduleProps {
  doctor: User;
}

export const CompleteSchedule: React.FC<CompleteScheduleProps> = ({ doctor }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [currentDate] = useState(new Date());

  useEffect(() => {
    async function loadAppointments() {
      try {
        setLoading(true);
        const allAppointments = await fetchAllAppointments();
        
        // Filter for this doctor's appointments
        const doctorAppointments = allAppointments.filter((apt: any) => {
          const matchesDoctor = apt.doctorId === doctor.id || 
                               apt.assignedDoctorId === doctor.id ||
                               apt.adminAssignedDoctorId === doctor.id;
          // Only show confirmed/scheduled appointments (assigned = pending confirmation)
          const isActive = ['confirmed', 'scheduled'].includes(apt.status);
          return matchesDoctor && isActive;
        });
        
        setAppointments(doctorAppointments);
        console.log('[Schedule] Loaded appointments:', doctorAppointments.length);
      } catch (error) {
        console.error('Error loading appointments:', error);
      } finally {
        setLoading(false);
      }
    }
    loadAppointments();
  }, [doctor.id]);

  const todayAppointments = appointments.filter(apt => {
    const rawDate = apt.appointmentDate || apt.scheduledDate || apt.date;
    if (!rawDate) return false;
    // Normalize date - handle both "2025-12-11" and "2025-12-11T00:00:00.000Z" formats
    const aptDate = rawDate.split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return aptDate === today;
  });

  const upcomingAppointments = appointments.filter(apt => {
    const rawDate = apt.appointmentDate || apt.scheduledDate || apt.date;
    if (!rawDate) return false;
    // Normalize date - handle both formats
    const aptDate = rawDate.split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return aptDate >= today;
  }).sort((a, b) => {
    const dateA = (a.appointmentDate || a.scheduledDate || a.date || '').split('T')[0];
    const dateB = (b.appointmentDate || b.scheduledDate || b.date || '').split('T')[0];
    return dateA.localeCompare(dateB);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📅 Schedule</h1>
        <p className="text-gray-600 mt-1">View and manage your appointments</p>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-2 mb-6">
        {['day', 'week', 'month'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === v
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading appointments...</p>
        </div>
      )}

      {/* Today's Appointments */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📆 Today - {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h2>

          {todayAppointments.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700">No Appointments Today</h3>
              <p className="text-gray-500 text-sm">Check Appointments & Meetings page for pending confirmations</p>
            </div>
          )}

          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <div key={apt.id} className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-semibold text-gray-900 text-lg">
                        ⏰ {apt.appointmentTime || apt.scheduledTime || apt.time || 'TBD'}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        apt.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : apt.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : apt.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {apt.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="font-medium text-gray-900">👤 {apt.patientName || 'Patient'}</div>
                      <div className="text-sm text-gray-600">📋 {apt.reason || 'General consultation'}</div>
                    </div>
                    
                    {/* Meeting Link */}
                    {apt.meetingLink && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200">
                        <div className="text-sm font-medium text-emerald-800 mb-1">🎥 Video Meeting</div>
                        <a 
                          href={apt.meetingLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                        >
                          Join Google Meet →
                        </a>
                        <div className="text-xs text-gray-500 mt-1">{apt.meetingLink}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{apt.duration || 30} min</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      {!loading && upcomingAppointments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Upcoming Appointments ({upcomingAppointments.length})</h2>
          <div className="space-y-3">
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 flex-wrap gap-2">
                      <div className="font-semibold text-gray-900">
                        📅 {apt.appointmentDate || apt.scheduledDate || apt.date}
                      </div>
                      <div className="text-gray-700">
                        ⏰ {apt.appointmentTime || apt.scheduledTime || apt.time || 'TBD'}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        apt.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : apt.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : apt.status === 'assigned'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {apt.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="font-medium text-gray-900">👤 {apt.patientName || 'Patient'}</div>
                      <div className="text-sm text-gray-600">📋 {apt.reason || 'General consultation'}</div>
                    </div>
                    
                    {/* Meeting Link */}
                    {apt.meetingLink && (
                      <div className="mt-2">
                        <a 
                          href={apt.meetingLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          🎥 {apt.meetingLink}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteSchedule;
