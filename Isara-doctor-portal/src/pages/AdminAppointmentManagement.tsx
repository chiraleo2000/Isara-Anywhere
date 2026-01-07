/**
 * Admin Appointment Management Page
 * Allows admin to:
 * - View all appointment requests
 * - Assign appointments to doctors
 * - Track appointment status
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/common/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { fetchAllAppointments, fetchAllDoctors } from '../services/gcsDataService';
import appointmentService from '../services/appointmentService';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  availableSlots?: TimeSlot[];
}

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AppointmentRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  requestedDate: string;
  preferredTime?: string;
  reason: string;
  symptoms?: string[];
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  status: 'pending' | 'assigned' | 'confirmed' | 'rejected' | 'completed' | 'cancelled' | 'in_pool' | 'awaiting_doctor_response';
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedDateTime?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  poolId?: string;
  assignmentMethod?: 'patient_selected' | 'ai_matched' | 'doctor_claimed' | 'admin_assigned';
}

interface PoolItem {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  requiredSpecialty: string;
  matchedSpecialties: string[];
  symptoms: string[];
  symptomDescription?: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  preferredDates: string[];
  preferredTimeSlot: 'morning' | 'afternoon' | 'evening';
  poolReason: string;
  poolStatus: 'pending' | 'ai_matched' | 'doctor_claimed' | 'admin_assigned' | 'admin_pending_approval' | 'confirmed' | 'expired';
  adminApprovalRequired: boolean;
  adminApproved?: boolean;
  missedCount: number;
  createdAt: string;
}

const AdminAppointmentManagement: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [appointmentRequests, setAppointmentRequests] = useState<AppointmentRequest[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'assigned' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<AppointmentRequest | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState({
    doctorId: '',
    date: '',
    time: '',
    notes: ''
  });


  // Check if user is admin
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    
    const isAdmin = user.isAdmin || user.role === 'admin';
    if (!isAdmin) {
      navigate(-1);
      return;
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Fetch appointment requests
  const fetchAppointmentRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching appointments from shared GCS data service...');

      const data = await fetchAllAppointments();
      const appointmentsArray = Array.isArray(data) ? data : (data as any)?.appointments || [];

      console.log(`📊 Found ${appointmentsArray.length} appointments`);

      const requests: AppointmentRequest[] = appointmentsArray.map((apt: any) => ({
        id: apt.id || `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        patientId: apt.patientId || apt.userId || apt.user?.id || '',
        patientName: apt.patientName || apt.user?.name || 'Unknown Patient',
        patientEmail: apt.patientEmail || apt.user?.email || '',
        patientPhone: apt.patientPhone || apt.user?.phone || apt.phone,
        requestedDate: apt.date || apt.requestedDate || apt.appointmentDate || new Date().toISOString(),
        preferredTime: apt.preferredTime || apt.time || '',
        reason: apt.reason || apt.notes || (apt.symptoms && Array.isArray(apt.symptoms) ? apt.symptoms.join(', ') : '') || 'Consultation',
        symptoms: Array.isArray(apt.symptoms) ? apt.symptoms : [],
        urgency: apt.urgency || apt.priority || 'medium',
        status: apt.status || 'pending',
        assignedDoctorId: apt.assignedDoctorId || apt.doctorId,
        assignedDoctorName: apt.assignedDoctorName || apt.doctor?.name || apt.doctorName,
        assignedDateTime: apt.assignedDateTime || apt.confirmedAt || apt.scheduledDate,
        createdAt: apt.createdAt || apt.requestedAt || new Date().toISOString(),
        updatedAt: apt.updatedAt || apt.modifiedAt,
        notes: apt.notes || apt.adminNotes || ''
      }));

      setAppointmentRequests(requests);
      if (requests.length === 0) {
        console.log('ℹ️ No appointments found');
      }
    } catch (err) {
      console.error('❌ Error fetching appointments:', err);
      setError(`Failed to load appointment requests: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setAppointmentRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    try {
      console.log('🔍 Fetching doctors...');
      
      const doctorsList = await fetchAllDoctors();
      console.log(`✅ Found ${doctorsList.length} doctors from GCS`);

      // Filter only approved/active doctors
      const approvedDoctors = doctorsList
        .filter((d: any) => d.approvalStatus === 'approved' || d.isApproved || d.isActive)
        .map((d: any) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          specialty: d.specialty,
          availableSlots: d.availableSlots || []
        }));
      
      console.log(`✅ ${approvedDoctors.length} approved doctors available`);
      setDoctors(approvedDoctors);
    } catch (err) {
      console.error('❌ Error fetching doctors:', err);
    }
  }, []);

  useEffect(() => {
    fetchAppointmentRequests();
    fetchDoctors();
  }, [fetchAppointmentRequests, fetchDoctors]);

  // Assign appointment to doctor
  const handleAssignAppointment = async () => {
    if (!selectedRequest || !assignData.doctorId || !assignData.date || !assignData.time) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const selectedDoctor = doctors.find(d => d.id === assignData.doctorId);
      const assignedDateTime = `${assignData.date}T${assignData.time}:00`;

      console.log(`📋 Assigning appointment ${selectedRequest.id} to doctor ${assignData.doctorId}`);
      console.log(`   Doctor: ${selectedDoctor?.name}`);
      console.log(`   Date: ${assignData.date}, Time: ${assignData.time}`);

      const result = await appointmentService.updateAppointment(selectedRequest.id, {
        doctorId: assignData.doctorId,
        assignedDoctorId: assignData.doctorId,
        adminAssignedDoctorId: assignData.doctorId,
        doctor: { id: assignData.doctorId, name: selectedDoctor?.name || '' },
        doctorName: selectedDoctor?.name,
        assignedDoctorName: selectedDoctor?.name,
        status: 'awaiting_doctor_response',
        assignmentMethod: 'admin_assigned',
        assignedDateTime,
        appointmentDate: assignData.date,
        appointmentTime: assignData.time,
        date: new Date(assignedDateTime),
        notes: assignData.notes,
        updatedAt: new Date(),
        assignedBy: user?.id,
        assignedAt: new Date()
      } as any);

      console.log('📋 Update result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to assign appointment');
      }

      setSuccessMessage(`Appointment assigned to ${selectedDoctor?.name} successfully!`);
      setShowAssignModal(false);
      setSelectedRequest(null);
      setAssignData({ doctorId: '', date: '', time: '', notes: '' });
      fetchAppointmentRequests();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error assigning appointment:', err);
      setError(`Failed to assign appointment: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Reject appointment
  const handleRejectAppointment = async (requestId: string, reason: string) => {
    try {
      const result = await appointmentService.updateAppointment(requestId, {
        status: 'rejected',
        notes: reason,
        updatedAt: new Date(),
        rejectedBy: user?.id,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to reject appointment');
      }

      setSuccessMessage('Appointment rejected');
      fetchAppointmentRequests();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error rejecting appointment:', err);
      setError('Failed to reject appointment');
    }
  };

  // Auto-assign appointment based on specialty and availability
  const handleAutoAssign = async (request: AppointmentRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🤖 Auto-assigning appointment:', request.id);
      
      // Find doctors matching the required specialty based on symptoms/reason
      const matchingDoctors = doctors.filter(doctor => {
        // Match based on specialty keywords in reason or symptoms
        const reasonLower = request.reason?.toLowerCase() || '';
        const symptomsLower = request.symptoms?.map(s => s.toLowerCase()).join(' ') || '';
        const searchText = `${reasonLower} ${symptomsLower}`;
        
        const specialtyLower = doctor.specialty?.toLowerCase() || '';
        
        // Specialty matching logic
        const specialtyMatches: Record<string, string[]> = {
          'general': ['general', 'ทั่วไป', 'checkup', 'ตรวจสุขภาพ'],
          'cardiology': ['heart', 'หัวใจ', 'cardiac', 'เจ็บหน้าอก', 'chest pain', 'ความดัน', 'blood pressure'],
          'dermatology': ['skin', 'ผิวหนัง', 'rash', 'ผื่น', 'allergy', 'แพ้'],
          'neurology': ['headache', 'ปวดหัว', 'migraine', 'ไมเกรน', 'brain', 'สมอง', 'dizziness', 'เวียนหัว'],
          'orthopedics': ['bone', 'กระดูก', 'joint', 'ข้อ', 'back pain', 'ปวดหลัง', 'injury', 'บาดเจ็บ'],
          'pediatrics': ['child', 'เด็ก', 'kid', 'baby', 'ทารก'],
          'psychiatry': ['mental', 'จิต', 'depression', 'ซึมเศร้า', 'anxiety', 'วิตกกังวล', 'stress', 'เครียด'],
          'gynecology': ['women', 'ผู้หญิง', 'pregnancy', 'ตั้งครรภ์', 'menstrual', 'ประจำเดือน'],
          'internal medicine': ['อายุรกรรม', 'internal', 'diabetes', 'เบาหวาน', 'fever', 'ไข้'],
          'ent': ['ear', 'หู', 'nose', 'จมูก', 'throat', 'คอ', 'sore throat', 'เจ็บคอ'],
          'ophthalmology': ['eye', 'ตา', 'vision', 'การมองเห็น'],
        };
        
        // Check if doctor's specialty matches any keywords
        for (const [specialty, keywords] of Object.entries(specialtyMatches)) {
          if (specialtyLower.includes(specialty)) {
            if (keywords.some(kw => searchText.includes(kw))) {
              return true;
            }
          }
        }
        
        // Default: include general practitioners
        if (specialtyLower.includes('general') || specialtyLower.includes('ทั่วไป')) {
          return true;
        }
        
        return false;
      });
      
      console.log(`📊 Found ${matchingDoctors.length} matching doctors`);
      
      if (matchingDoctors.length === 0) {
        // No matching doctors - keep in admin pool for manual assignment
        setError('No matching doctors found. Please assign manually.');
        setSelectedRequest(request);
        setShowAssignModal(true);
        return;
      }
      
      // Sort by availability (doctors with available slots first)
      // For now, we'll randomly pick one from matching doctors
      const randomIndex = Math.floor(Math.random() * matchingDoctors.length);
      const selectedDoctor = matchingDoctors[randomIndex];
      
      // Get next available date/time (default to requested date or tomorrow)
      const requestedDate = new Date(request.requestedDate);
      const assignDate = requestedDate > new Date() 
        ? requestedDate.toISOString().split('T')[0]
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Parse preferred time or default to morning
      let assignTime = '10:00';
      if (request.preferredTime) {
        if (request.preferredTime.includes('morning') || request.preferredTime.includes('เช้า')) {
          assignTime = '10:00';
        } else if (request.preferredTime.includes('afternoon') || request.preferredTime.includes('บ่าย')) {
          assignTime = '14:00';
        } else if (request.preferredTime.includes('evening') || request.preferredTime.includes('เย็น')) {
          assignTime = '17:00';
        } else {
          assignTime = request.preferredTime;
        }
      }
      
      const assignedDateTime = `${assignDate}T${assignTime}:00`;
      
      console.log(`🎯 Auto-assigning to: ${selectedDoctor.name} (${selectedDoctor.specialty})`);
      console.log(`📅 Date: ${assignDate}, Time: ${assignTime}`);
      
      const result = await appointmentService.updateAppointment(request.id, {
        doctorId: selectedDoctor.id,
        assignedDoctorId: selectedDoctor.id,
        adminAssignedDoctorId: selectedDoctor.id,
        doctor: { id: selectedDoctor.id, name: selectedDoctor.name },
        doctorName: selectedDoctor.name,
        assignedDoctorName: selectedDoctor.name,
        status: 'awaiting_doctor_response',
        assignmentMethod: 'ai_matched',
        assignedDateTime,
        appointmentDate: assignDate,
        appointmentTime: assignTime,
        date: new Date(assignedDateTime),
        notes: `Auto-assigned to ${selectedDoctor.specialty} specialist based on symptoms`,
        updatedAt: new Date(),
        assignedBy: 'system',
        assignedAt: new Date(),
        autoAssigned: true
      } as any);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to auto-assign appointment');
      }
      
      setSuccessMessage(`✅ Auto-assigned to ${selectedDoctor.name} (${selectedDoctor.specialty || 'General'}) - awaiting doctor confirmation`);
      fetchAppointmentRequests();
      
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error auto-assigning appointment:', err);
      setError(`Failed to auto-assign: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-assign all pending appointments
  const handleAutoAssignAll = async () => {
    const pendingRequests = appointmentRequests.filter(r => r.status === 'pending');
    
    if (pendingRequests.length === 0) {
      setSuccessMessage('No pending appointments to auto-assign');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }
    
    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const request of pendingRequests) {
      try {
        await handleAutoAssign(request);
        successCount++;
      } catch (err) {
        console.error(`Failed to auto-assign ${request.id}:`, err);
        failCount++;
      }
    }
    
    setLoading(false);
    setSuccessMessage(`Auto-assignment complete: ${successCount} assigned, ${failCount} failed`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Filter appointments
  const filteredRequests = appointmentRequests.filter(req => {
    const matchesSearch = 
      req.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.patientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'pending') return matchesSearch && req.status === 'pending';
    if (activeTab === 'assigned') return matchesSearch && (req.status === 'assigned' || req.status === 'confirmed');
    return matchesSearch;
  });

  const pendingCount = appointmentRequests.filter(r => r.status === 'pending').length;
  const assignedCount = appointmentRequests.filter(r => r.status === 'assigned' || r.status === 'confirmed').length;

  const isAdmin = user?.isAdmin || user?.role === 'admin';
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-gray-600 mt-1">View and assign patient appointment requests to doctors</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentRequests.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assigned</p>
                <p className="text-2xl font-bold text-green-600">{assignedCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {(['pending', 'assigned', 'all'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'pending' && pendingCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                ))}
                {/* Auto-assign button for pending tab */}
                {activeTab === 'pending' && pendingCount > 0 && (
                  <button
                    onClick={handleAutoAssignAll}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    title="Automatically assign all pending appointments based on specialty matching"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    🤖 Auto-Assign All ({pendingCount})
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Search by patient name, email, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Appointments List */}
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading appointments...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Appointment Requests</h3>
                <p className="text-gray-500">
                  {activeTab === 'pending' 
                    ? 'No pending appointment requests at this time.'
                    : 'No appointments found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{request.patientName}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getUrgencyColor(request.urgency)}`}>
                            {request.urgency}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{request.patientEmail}</p>
                        {request.patientPhone && (
                          <p className="text-sm text-gray-600">{request.patientPhone}</p>
                        )}
                        <div className="mt-2">
                          <p className="text-sm"><span className="font-medium">Reason:</span> {request.reason}</p>
                          <p className="text-sm"><span className="font-medium">Requested Date:</span> {new Date(request.requestedDate).toLocaleDateString()}</p>
                          {request.preferredTime && (
                            <p className="text-sm"><span className="font-medium">Preferred Time:</span> {request.preferredTime}</p>
                          )}
                          {request.assignedDoctorName && (
                            <p className="text-sm text-emerald-600">
                              <span className="font-medium">Assigned to:</span> Dr. {request.assignedDoctorName}
                              {request.assignedDateTime && ` - ${new Date(request.assignedDateTime).toLocaleString()}`}
                            </p>
                          )}
                        </div>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleAutoAssign(request)}
                            disabled={loading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-1"
                            title="Auto-assign based on symptoms and specialty"
                          >
                            🤖 Auto
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowAssignModal(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                          >
                            Assign Doctor
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Please enter rejection reason:');
                              if (reason) handleRejectAppointment(request.id, reason);
                            }}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Appointment</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedRequest.patientName}</p>
              <p className="text-sm text-gray-600">{selectedRequest.reason}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor *</label>
                <select
                  value={assignData.doctorId}
                  onChange={(e) => setAssignData({ ...assignData, doctorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Choose a doctor...</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name} {doc.specialty ? `(${doc.specialty})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={assignData.date}
                  onChange={(e) => setAssignData({ ...assignData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                <input
                  type="time"
                  value={assignData.time}
                  onChange={(e) => setAssignData({ ...assignData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={assignData.notes}
                  onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedRequest(null);
                  setAssignData({ doctorId: '', date: '', time: '', notes: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignAppointment}
                disabled={!assignData.doctorId || !assignData.date || !assignData.time}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAppointmentManagement;
