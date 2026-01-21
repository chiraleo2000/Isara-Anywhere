/**
 * Complete Doctor Dashboard - Single Page Layout
 * Features: Dashboard Overview + 3-Column Layout (Health Data | Health Meeting | Health Studio)
 * With Working Health Studio Content Modals - Dynamic Data Display
 * 
 * UPDATED: Now uses PostgreSQL backend via apiDataService
 * GCS is NOT used for interactive operations - PostgreSQL only!
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, QueuePatient, PatientRecord } from '../types';
import {
  CalendarDaysIcon,
  ClockIcon,
  VideoCameraIcon,
} from '../assets/NewSvgIcons';
// POSTGRESQL-BACKED API SERVICE - NO GCS!
import {
  fetchDashboardData,
  fetchAllPatients,
  fetchAllAppointments,
  fetchPatientEMRs,
  fetchPatientLabOrders,
  fetchPatientPrescriptions,
  clearCache
} from '../services/apiDataService';
import { meetingService } from '../services/apiServices';
import { geminiClinicalService } from '../services/geminiClinicalService';

// ============================================================================
// INTERFACES
// ============================================================================

interface DoctorDashboardProps {
  doctor: User;
  onStartConsultation?: () => void;
  onViewPatient?: (patientId: string) => void;
  onCreatePrescription?: () => void;
  onOrderLab?: () => void;
}

interface EMRRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  encounterDate: string;
  encounterType: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  vitalSigns: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    respiratoryRate: number;
    oxygenSaturation: number;
    weight: number;
    height: number;
    bmi: number;
  };
  physicalExamination: Record<string, string>;
  diagnosis: Array<{ code: string; description: string; type: string }>;
  treatmentPlan: string;
  medications: Array<any>;
  labOrders: string[];
  imagingOrders: string[];
  status: string;
}

interface LabOrder {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  orderDate: string;
  tests: Array<{
    name: string;
    code: string;
    category: string;
    result: string;
    unit: string;
    referenceRange: string;
    status: string;
    abnormalFlag: string;
  }>;
  testCategory: string;
  status: string;
  interpretation: string;
}

type PersonFilter = 'patient' | 'doctor' | 'healthcare-team';
type MeetingTab = 'investigation' | 'treatment' | 'refer';
type StudioModal = 'diagnosis' | 'treatment-plan' | 'system-report' | 'radiology' | 'laboratory' | 'pathology' | null;
type TreatmentTab = 'protocols' | 'prescribe' | 'history';

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctor,
  onStartConsultation,
  onCreatePrescription,
  onOrderLab,
  onViewPatient,
}) => {
  // Navigation hook for linking to Appointments & Meetings page
  const navigate = useNavigate();
  
  // State
  const [personFilter, setPersonFilter] = useState<PersonFilter>('patient');
  const [meetingTab, setMeetingTab] = useState<MeetingTab>('investigation');
  const [studioModal, setStudioModal] = useState<StudioModal>(null);
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [aiHistorySummary, setAiHistorySummary] = useState('');
  const [aiMeetingSummary, setAiMeetingSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Patient clinical data for Health Studio
  const [selectedPatientEMRs, setSelectedPatientEMRs] = useState<EMRRecord[]>([]);
  const [selectedPatientLabs, setSelectedPatientLabs] = useState<LabOrder[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [selectedPatientPrescriptions, setSelectedPatientPrescriptions] = useState<any[]>([]);
  const [treatmentTab, setTreatmentTab] = useState<TreatmentTab>('protocols');

  // Dashboard stats - start with zeros, load from real data
  const [dashboardStats, setDashboardStats] = useState({
    todayAppointments: 0,
    patientsSeen: 0,
    pendingPrescriptions: 0,
    unreadMessages: 0,
    averageWaitTime: 0,
    patientsInQueue: 0,
    pendingConfirmations: 0,
  });

  // Investigation, Treatment, Refer patient lists
  const [investigationPatients, setInvestigationPatients] = useState<PatientRecord[]>([]);
  const [treatmentPatients, setTreatmentPatients] = useState<PatientRecord[]>([]);
  const [referPatients, setReferPatients] = useState<PatientRecord[]>([]);
  
  // Upcoming appointments for display
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [todayMeetings, setTodayMeetings] = useState<any[]>([]);

  // AI Chatbot state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Man-in-the-Loop AI validation states (Phase 1 Requirements 4.3)
  const [aiValidationTab, setAiValidationTab] = useState<'summary' | 'documents' | 'cds'>('summary');
  const [aiPreSummary, setAiPreSummary] = useState<any>(null);
  const [aiDocuments, setAiDocuments] = useState<any[]>([]);
  const [cdsAlerts, setCdsAlerts] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiValidationStatus, setAiValidationStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Load dashboard data ONCE on mount - no auto-refresh interval
  // Auto-refresh was causing unnecessary API calls and potential data inconsistencies
  // Data will refresh when user navigates back to the page
  useEffect(() => {
    loadDashboardData();
    // NO interval - data refreshes on navigation or manual action only
  }, [doctor.id]);

  // Load patient clinical data when patient is selected
  useEffect(() => {
    if (selectedPatientId) {
      loadPatientClinicalData(selectedPatientId);
    }
  }, [selectedPatientId]);

  const loadDashboardData = async () => {
    try {
      // Clear cache (no-op for PostgreSQL but kept for compatibility)
      clearCache('appointments');
      
      // Fetch from PostgreSQL via API - NO GCS!
      const [dashboardData, loadedPatients, allAppointments] = await Promise.all([
        fetchDashboardData(doctor.id),
        fetchAllPatients(),
        fetchAllAppointments(doctor.id)  // Filter by doctor on server side
      ]);

      // Set queue from dashboard data or empty array
      const loadedQueue = dashboardData?.queue || [];
      setQueue(loadedQueue);
      setPatients(loadedPatients);

      // Filter appointments for this doctor (additional client-side filter if needed)
      const doctorAppointments = allAppointments.filter((apt: any) => {
        return apt.doctorId === doctor.id || 
               apt.doctor_id === doctor.id ||
               apt.assignedDoctorId === doctor.id ||
               apt.adminAssignedDoctorId === doctor.id ||
               apt.confirmedBy === doctor.id;  // Include appointments confirmed by this doctor
      });

      console.log('[Dashboard] Doctor appointments:', doctorAppointments.length);
      console.log('[Dashboard] Doctor ID:', doctor.id);
      if (doctorAppointments.length > 0) {
        console.log('[Dashboard] Appointment details:', doctorAppointments.map((a: any) => ({
          id: a.id,
          status: a.status,
          doctorId: a.doctorId,
          confirmedBy: a.confirmedBy,
          appointmentDate: a.appointmentDate
        })));
      }
      
      // Count pending confirmations
      const pendingConfirmations = doctorAppointments.filter((apt: any) => 
        apt.status === 'awaiting_doctor_response' || 
        apt.status === 'assigned' || 
        (apt.status === 'pending' && (apt.assignedDoctorId || apt.adminAssignedDoctorId))
      ).length;

      // Get unique patient IDs from doctor's appointments
      const appointmentPatientIds = new Set(
        doctorAppointments.map((apt: any) => apt.patientId)
      );

      // Filter patients who have appointments with this doctor
      const assignedPatients = loadedPatients.filter((p: PatientRecord) => 
        appointmentPatientIds.has(p.id)
      );

      // For Investigation/Treatment/Refer, only show patients assigned to this doctor
      // Investigation: patients with pending/scheduled appointments
      // Treatment: patients with confirmed appointments
      // Refer: none for now (would need referral data)
      
      const scheduledAppts = doctorAppointments.filter((apt: any) => 
        apt.status === 'scheduled' || apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'assigned'
      );
      const inProgressAppts = doctorAppointments.filter((apt: any) => 
        apt.status === 'in_progress' || apt.status === 'in-progress'
      );

      // Map to patient records
      const investigationPatientIds = new Set(scheduledAppts.map((apt: any) => apt.patientId));
      const treatmentPatientIds = new Set(inProgressAppts.map((apt: any) => apt.patientId));

      setInvestigationPatients(
        loadedPatients.filter((p: PatientRecord) => investigationPatientIds.has(p.id))
      );
      setTreatmentPatients(
        loadedPatients.filter((p: PatientRecord) => treatmentPatientIds.has(p.id))
      );
      setReferPatients([]); // No referral data yet
      
      // Set upcoming appointments (confirmed/scheduled) sorted by date
      // Note: 'assigned' status = pending doctor confirmation, shown separately
      const today = new Date().toISOString().split('T')[0];
      console.log('[Dashboard] Today is:', today);
      console.log('[Dashboard] Checking doctor appointments for upcoming:', doctorAppointments.map((apt: any) => ({
        id: apt.id,
        status: apt.status,
        appointmentDate: apt.appointmentDate,
        rawDate: apt.appointmentDate || apt.scheduledDate || apt.date
      })));
      
      const upcoming = doctorAppointments
        .filter((apt: any) => {
          const rawDate = apt.appointmentDate || apt.scheduledDate || apt.date;
          // Normalize date - handle both "2025-12-11" and "2025-12-11T00:00:00.000Z" formats
          const aptDate = rawDate ? rawDate.split('T')[0] : null;
          const isActiveStatus = ['confirmed', 'scheduled'].includes(apt.status);
          console.log(`[Dashboard] Filter apt ${apt.id}: status=${apt.status}, rawDate=${rawDate}, aptDate=${aptDate}, today=${today}, isActive=${isActiveStatus}, dateCheck=${aptDate && aptDate >= today}`);
          return isActiveStatus && aptDate && aptDate >= today;
        })
        .sort((a: any, b: any) => {
          const dateA = (a.appointmentDate || a.scheduledDate || a.date || '').split('T')[0];
          const dateB = (b.appointmentDate || b.scheduledDate || b.date || '').split('T')[0];
          return dateA.localeCompare(dateB);
        });
      console.log('[Dashboard] Upcoming appointments after filter:', upcoming.length);
      setUpcomingAppointments(upcoming);
      
      // Set today's meetings
      const todaysMeetings = doctorAppointments.filter((apt: any) => {
        const rawDate = apt.appointmentDate || apt.scheduledDate || apt.date;
        // Normalize date - handle both formats
        const aptDate = rawDate ? rawDate.split('T')[0] : null;
        const isActiveStatus = ['confirmed', 'scheduled'].includes(apt.status);
        return isActiveStatus && aptDate === today;
      });
      console.log('[Dashboard] Today meetings:', todaysMeetings.length);
      setTodayMeetings(todaysMeetings);

      // Auto-select first patient from assigned patients if none selected
      if (assignedPatients.length > 0 && !selectedPatientId) {
        const firstPatient = assignedPatients[0];
        setSelectedPatientId(firstPatient.id);
        setSelectedPatient(firstPatient);
      }

      // Derive stats from fetched data (real data, no hardcoding)
      setDashboardStats({
        todayAppointments: todaysMeetings.length,
        patientsSeen: doctorAppointments.filter((apt: any) => apt.status === 'completed').length,
        pendingPrescriptions: 0,
        unreadMessages: 0,
        averageWaitTime: loadedQueue.length > 0 ? Math.round(loadedQueue.reduce((s, q) => s + (q.estimatedWaitTime || 0), 0) / loadedQueue.length) : 0,
        patientsInQueue: loadedQueue.length,
        pendingConfirmations,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const loadPatientClinicalData = async (patientId: string) => {
    try {
      const [emrs, labs, prescriptions] = await Promise.all([
        fetchPatientEMRs(patientId),
        fetchPatientLabOrders(patientId),
        fetchPatientPrescriptions(patientId)
      ]);

      setSelectedPatientEMRs(emrs as EMRRecord[]);
      setSelectedPatientLabs(labs as LabOrder[]);
      setSelectedPatientPrescriptions(prescriptions);

      // Find and set selected patient details
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
      
      // Try to load meeting summary from most recent completed appointment
      try {
        // Find the patient's most recent appointment with this doctor
        const patientAppointments = upcomingAppointments.filter(apt => 
          apt.patientId === patientId && 
          (apt.status === 'completed' || apt.status === 'Completed')
        );
        
        if (patientAppointments.length > 0) {
          // Get the most recent completed appointment
          const recentAppointment = patientAppointments.sort((a: any, b: any) => 
            new Date(b.date || b.appointmentDate).getTime() - new Date(a.date || a.appointmentDate).getTime()
          )[0];
          
          // Fetch meeting files/summary from GCS
          const meetingData = await meetingService.getMeetingFiles(recentAppointment.id, doctor.id);
          
          if (meetingData.success && meetingData.summary) {
            // Format the summary for display
            const summaryText = typeof meetingData.summary === 'string' 
              ? meetingData.summary 
              : JSON.stringify(meetingData.summary, null, 2);
            setAiMeetingSummary(summaryText);
            console.log('📋 Loaded meeting summary from GCS:', meetingData);
          }
        }
      } catch (meetingError) {
        // Silent fail - meeting summary is optional
        console.log('ℹ️ No meeting summary found for patient:', patientId);
      }
      
      // Load AI pre-consultation summary (Phase 1 Requirement 2.2)
      await loadAIPreSummary(patientId);
      
    } catch (error) {
      console.error('Error loading patient clinical data:', error);
    }
  };

  // Load AI Pre-Consultation Summary (DR-02)
  const loadAIPreSummary = async (patientId: string) => {
    if (!patientId) return;
    
    setIsLoadingAI(true);
    try {
      const response = await fetch(`/api/ai/pre-summary/${patientId}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setAiPreSummary(data.data);
        
        // Build AI history summary from pre-consultation data
        const summary = data.data;
        const summaryText = [
          `👤 ผู้ป่วย: ${summary.patientSnapshot?.nameThai || summary.patientSnapshot?.name}`,
          `📅 อายุ: ${summary.patientSnapshot?.age} ปี | เพศ: ${summary.patientSnapshot?.gender === 'male' ? 'ชาย' : 'หญิง'}`,
          `🩸 กรุ๊ปเลือด: ${summary.patientSnapshot?.bloodType || 'ไม่ระบุ'}`,
          '',
          `⚕️ โรคประจำตัว: ${summary.patientSnapshot?.primaryConditions?.join(', ') || 'ไม่มี'}`,
          `💊 แพ้ยา: ${summary.patientSnapshot?.drugAllergies?.map((a: any) => a.allergen || a).join(', ') || 'ไม่มี'}`,
          '',
          `🎯 เหตุผลนัด: ${summary.appointmentReason || 'ตรวจทั่วไป'}`,
          `🔔 อาการ: ${summary.currentSymptoms?.join(', ') || 'ไม่ระบุ'}`,
          '',
          '⚠️ ข้อควรระวัง:',
          ...(summary.aiTriage?.alertFlags || ['ไม่มีข้อควรระวังพิเศษ']),
        ].join('\n');
        
        setAiHistorySummary(summaryText);
        setAiValidationStatus('pending');
      }
    } catch (error) {
      console.error('Failed to load AI pre-summary:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle AI validation decision (Man-in-the-Loop DR-05)
  const handleAIValidation = async (decision: 'approved' | 'rejected', notes?: string) => {
    try {
      // Log the validation decision
      await fetch('/api/ai/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: aiValidationTab,
          patientId: selectedPatientId,
          doctorId: doctor.id,
          decision,
          notes,
          content: aiValidationTab === 'summary' ? aiHistorySummary : 
                   aiValidationTab === 'documents' ? aiDocuments : cdsAlerts,
          timestamp: new Date().toISOString()
        })
      });
      
      setAiValidationStatus(decision);
      
      if (decision === 'approved') {
        alert('✅ AI สรุปได้รับการอนุมัติ - สามารถนำไปใช้ใน EMR ได้');
      } else {
        alert('❌ AI สรุปถูกปฏิเสธ - กรุณาแก้ไขหรือร้องขอใหม่');
      }
    } catch (error) {
      console.error('Failed to log validation:', error);
    }
  };

  // Copy AI summary to EMR (for use in reports)
  const handleUseInEMR = () => {
    if (aiValidationStatus !== 'approved') {
      alert('⚠️ กรุณาอนุมัติ AI สรุปก่อนใช้งานใน EMR');
      return;
    }
    
    // Navigate to EMR editor with pre-filled data
    if (selectedPatientId) {
      navigate(`/doctor/${doctor.id}/patients/${selectedPatientId}/emr?ai_summary=${encodeURIComponent(aiHistorySummary)}`);
    }
  };

  const handleViewPatient = (patient: QueuePatient | PatientRecord) => {
    const patientId = 'patientId' in patient ? patient.patientId : patient.id;
    setSelectedPatientId(patientId);
    if (onViewPatient) {
      onViewPatient(patientId);
    }
  };

  const handleStartConsultation = (patientId?: string) => {
    if (patientId) {
      setSelectedPatientId(patientId);
    }
    if (onStartConsultation) {
      onStartConsultation();
    }
  };

  // Direct Jitsi Meeting Launch - Opens Jitsi in new tab for immediate video consultation
  const handleStartJitsiMeeting = () => {
    const JITSI_DOMAIN = 'meet.jit.si';
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    const patientId = selectedPatientId || 'direct';
    const roomName = `Izara-Med-${patientId.substring(0, 8)}-${timestamp}-${randomPart}`;
    
    // Doctor configuration with moderator privileges
    const doctorConfig = new URLSearchParams({
      'config.prejoinPageEnabled': 'true',
      'config.startWithAudioMuted': 'false',
      'config.startWithVideoMuted': 'false',
      'config.enableClosePage': 'true',
      'config.disableDeepLinking': 'true',
      'config.defaultLanguage': 'th',
      'config.enableLobby': 'true',
      'config.requireDisplayName': 'true',
      'config.fileRecordingsEnabled': 'true',
      'config.localRecording.enabled': 'true',
      'userInfo.displayName': doctor.name || 'Doctor',
      'userInfo.email': doctor.email || '',
      'interfaceConfig.TOOLBAR_BUTTONS': JSON.stringify([
        'microphone', 'camera', 'desktop', 'chat', 'raisehand',
        'participants-pane', 'tileview', 'hangup', 'settings', 'recording',
        'security', 'invite'
      ]),
      'interfaceConfig.APP_NAME': 'Izara Telemedicine',
    });
    
    const jitsiUrl = `https://${JITSI_DOMAIN}/${roomName}#${doctorConfig.toString()}`;
    
    console.log('🎥 Starting Jitsi Meeting:', {
      roomName,
      patientId,
      doctorName: doctor.name,
    });
    
    // Open Jitsi in new tab
    window.open(jitsiUrl, '_blank', 'noopener,noreferrer');
    
    // Copy meeting link to clipboard for sharing
    const patientLink = `https://${JITSI_DOMAIN}/${roomName}`;
    navigator.clipboard.writeText(patientLink).then(() => {
      alert(`🎥 Meeting started!\n\nRoom: ${roomName}\n\n📋 Patient meeting link copied to clipboard:\n${patientLink}\n\nShare this link with your patient to join the consultation.`);
    }).catch(() => {
      alert(`🎥 Meeting started!\n\nRoom: ${roomName}\n\nPatient link: ${patientLink}`);
    });
  };

  const handleStudioAction = (action: StudioModal) => {
    // Navigate to Patients page with category filter for health logs history
    // This allows doctors to view patient health records by category
    const categoryMap: Record<string, string> = {
      'diagnosis': 'diagnosis',
      'treatment-plan': 'treatment',
      'system-report': 'medical-record',
      'radiology': 'radiology',
      'laboratory': 'laboratory',
      'pathology': 'pathology',
    };
    
    const category = categoryMap[action || ''] || 'all';
    
    // If a patient is selected, navigate to patient detail with filter
    if (selectedPatientId) {
      navigate(`/doctor/${doctor.id}/patients/${selectedPatientId}?tab=health-logs&category=${category}`);
    } else {
      // Otherwise, navigate to patients list with filter
      navigate(`/doctor/${doctor.id}/patients?category=${category}`);
    }
  };

  // AI Chatbot handler - Connected to Gemini API
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      // Build patient context for the AI - support both flat and nested data structures
      const patientContext = selectedPatient ? {
        name: selectedPatient.demographics?.name || selectedPatient.name,
        age: selectedPatient.demographics?.age || selectedPatient.age,
        gender: selectedPatient.demographics?.gender || selectedPatient.gender,
        conditions: selectedPatient.medicalInfo?.chronicConditions,
        medications: selectedPatient.medicalInfo?.currentMedications,
        allergies: selectedPatient.medicalInfo?.allergies,
      } : undefined;

      // Call the Gemini Clinical Service
      const aiResponse = await geminiClinicalService.clinicalChat(
        userMessage,
        patientContext,
        chatMessages
      );

      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please try again.` 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const renderPatientListForTab = (patientList: PatientRecord[], title: string) => {
    if (patientList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <div className="text-sm">ไม่มีข้อมูลผู้ป่วย</div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {patientList.map((patient) => {
          // Support both flat structure (name) and nested structure (demographics.name)
          const patientName = patient.demographics?.name || patient.name || 'Unknown';
          const patientAge = patient.demographics?.age || patient.age || '-';
          const patientGender = patient.demographics?.gender || patient.gender || '-';
          const patientPhoto = patient.demographics?.photo || patient.photo;
          
          return (
            <div
              key={patient.id}
              className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleViewPatient(patient)}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={patientPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(patient.id)}`}
                  alt={patientName}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">{patientName}</h4>
                  <p className="text-xs text-gray-600">
                    {patientAge} ปี • {patientGender}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartConsultation(patient.id);
                  }}
                  className="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
                >
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Health Studio Modal Content - Dynamic Data
  const renderStudioModalContent = () => {
    if (!studioModal) return null;

    // Get latest EMR for clinical data
    const latestEMR = selectedPatientEMRs.length > 0
      ? selectedPatientEMRs.sort((a, b) => new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime())[0]
      : null;

    // Support both flat structure (name) and nested structure (demographics.name)
    const patientName = selectedPatient?.demographics?.name || selectedPatient?.name || 'Select a patient';
    const allergies = selectedPatient?.medicalInfo?.allergies || [];
    const conditions = selectedPatient?.medicalInfo?.chronicConditions || [];
    const medications = selectedPatient?.medicalInfo?.currentMedications || [];

    const modalContent: Record<string, { title: string; content: React.ReactNode }> = {
      diagnosis: {
        title: '🔍 การวินิจฉัย / วินิจฉัยแยกโรค (Diagnosis & Differential)',
        content: (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">Patient: {patientName}</h3>
              <p className="text-sm text-blue-800">
                Chief Complaint: {latestEMR?.chiefComplaint || 'General consultation'}
              </p>
              {allergies.length > 0 && (
                <p className="text-sm text-red-600 mt-1">⚠️ Allergies: {allergies.join(', ')}</p>
              )}
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Clinical Assessment</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Vital Signs:</strong>
                  {latestEMR?.vitalSigns ? (
                    <ul className="ml-4 mt-1 text-gray-700">
                      <li>• BP: {latestEMR.vitalSigns.bloodPressure} mmHg</li>
                      <li>• HR: {latestEMR.vitalSigns.heartRate} bpm</li>
                      <li>• Temp: {latestEMR.vitalSigns.temperature}°C</li>
                      <li>• SpO2: {latestEMR.vitalSigns.oxygenSaturation}%</li>
                      <li>• RR: {latestEMR.vitalSigns.respiratoryRate}/min</li>
                      <li>• BMI: {latestEMR.vitalSigns.bmi}</li>
                    </ul>
                  ) : (
                    <p className="ml-4 mt-1 text-gray-500">No vital signs recorded</p>
                  )}
                </div>
                <div>
                  <strong>Current Conditions:</strong>
                  <ul className="ml-4 mt-1 text-gray-700">
                    {conditions.length > 0 ? (
                      conditions.map((condition, i) => <li key={i}>• {condition}</li>)
                    ) : (
                      <li className="text-gray-500">No chronic conditions recorded</li>
                    )}
                  </ul>
                </div>
                <div>
                  <strong>Current Medications:</strong>
                  <ul className="ml-4 mt-1 text-gray-700">
                    {medications.length > 0 ? (
                      medications.map((med, i) => <li key={i}>• {med}</li>)
                    ) : (
                      <li className="text-gray-500">No current medications</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Diagnosis from EMR</h4>
              <div className="space-y-2 text-sm text-gray-700">
                {latestEMR?.diagnosis && latestEMR.diagnosis.length > 0 ? (
                  latestEMR.diagnosis.map((dx, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded ${dx.type === 'primary' ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <span>{i + 1}. [{dx.code}] {dx.description}</span>
                      <span className={dx.type === 'primary' ? 'text-green-700 font-semibold' : 'text-gray-600'}>
                        {dx.type === 'primary' ? 'Primary' : 'Secondary'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No diagnosis recorded yet</p>
                )}
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="font-semibold text-emerald-900 mb-2">Treatment Plan</h4>
              <p className="text-sm text-emerald-800">
                {latestEMR?.treatmentPlan || 'No treatment plan recorded yet. Please create an EMR to add recommendations.'}
              </p>
            </div>
          </div>
        ),
      },
      'treatment-plan': {
        title: '💊 แผนการรักษา (Treatment Plan / Prescribe)',
        content: (
          <div className="space-y-4">
            {/* Patient Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">Patient: {patientName}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-blue-800">
                <span>Age: {selectedPatient?.demographics?.age || '-'}</span>
                <span>Gender: {selectedPatient?.demographics?.gender || '-'}</span>
                {allergies.length > 0 && (
                  <span className="text-red-600 font-medium">⚠️ Allergies: {allergies.join(', ')}</span>
                )}
              </div>
            </div>

            {/* Treatment Tabs */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="flex border-b">
                <button
                  onClick={() => setTreatmentTab('protocols')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    treatmentTab === 'protocols'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📋 Treatment Protocols
                </button>
                <button
                  onClick={() => setTreatmentTab('prescribe')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    treatmentTab === 'prescribe'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  💊 Quick Prescribe
                </button>
                <button
                  onClick={() => setTreatmentTab('history')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    treatmentTab === 'history'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📜 Prescription History
                </button>
              </div>

              <div className="p-4">
                {/* Treatment Protocols Tab */}
                {treatmentTab === 'protocols' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Evidence-Based Treatment Guidelines</h4>
                    
                    {/* Hypertension Protocol */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-semibold text-emerald-700">🩺 Hypertension Management</h5>
                          <p className="text-sm text-gray-600 mt-1">Target: {"<"}140/90 mmHg ({"<"}130/80 for high-risk)</p>
                        </div>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">JNC 8</span>
                      </div>
                      <div className="mt-3 text-sm">
                        <p className="font-medium text-gray-700">First-Line Options:</p>
                        <ul className="ml-4 text-gray-600 mt-1 space-y-1">
                          <li>• ACE Inhibitors (Enalapril, Lisinopril)</li>
                          <li>• ARBs (Losartan, Valsartan)</li>
                          <li>• CCBs (Amlodipine)</li>
                          <li>• Thiazide Diuretics</li>
                        </ul>
                      </div>
                    </div>

                    {/* Diabetes Protocol */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-semibold text-blue-700">🍬 Type 2 Diabetes Management</h5>
                          <p className="text-sm text-gray-600 mt-1">Target HbA1c: {"<"}7% for most adults</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">ADA 2024</span>
                      </div>
                      <div className="mt-3 text-sm">
                        <p className="font-medium text-gray-700">Stepwise Approach:</p>
                        <ul className="ml-4 text-gray-600 mt-1 space-y-1">
                          <li>• Step 1: Lifestyle + Metformin 500-2000mg/day</li>
                          <li>• Step 2: Add SGLT2i or GLP-1 agonist</li>
                          <li>• Step 3: Combination therapy or insulin</li>
                        </ul>
                      </div>
                    </div>

                    {/* Dyslipidemia Protocol */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-semibold text-purple-700">🫀 Dyslipidemia Management</h5>
                          <p className="text-sm text-gray-600 mt-1">LDL targets vary by cardiovascular risk</p>
                        </div>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">ACC/AHA</span>
                      </div>
                      <div className="mt-3 text-sm">
                        <p className="font-medium text-gray-700">Statin Therapy:</p>
                        <ul className="ml-4 text-gray-600 mt-1 space-y-1">
                          <li>• High-intensity: Atorvastatin 40-80mg, Rosuvastatin 20-40mg</li>
                          <li>• Moderate: Atorvastatin 10-20mg, Simvastatin 20-40mg</li>
                          <li>• Add Ezetimibe if target not reached</li>
                        </ul>
                      </div>
                    </div>

                    {/* Respiratory Protocol */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-semibold text-orange-700">🌬️ Asthma/COPD Management</h5>
                          <p className="text-sm text-gray-600 mt-1">GINA/GOLD stepwise approach</p>
                        </div>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">GINA 2024</span>
                      </div>
                      <div className="mt-3 text-sm">
                        <p className="font-medium text-gray-700">Controller Therapy:</p>
                        <ul className="ml-4 text-gray-600 mt-1 space-y-1">
                          <li>• ICS-formoterol as needed (mild)</li>
                          <li>• Low-dose ICS daily (moderate)</li>
                          <li>• ICS/LABA combination (severe)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Prescribe Tab */}
                {treatmentTab === 'prescribe' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Quick Prescription</h4>
                      <button
                        onClick={() => {
                          setStudioModal(null);
                          if (onCreatePrescription) onCreatePrescription();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Open Full Prescriber
                      </button>
                    </div>

                    <div className="bg-gray-50 border rounded-lg p-4">
                      <h5 className="font-medium text-gray-700 mb-3">Current Medications</h5>
                      {medications.length > 0 ? (
                        <div className="space-y-2">
                          {medications.map((med, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-white rounded border">
                              <span className="text-sm">{med}</span>
                              <button className="text-xs text-blue-600 hover:text-blue-800">Refill</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No current medications on record</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button className="p-3 text-left bg-white border rounded-lg hover:bg-gray-50">
                        <div className="font-medium text-gray-900">💊 Common Meds</div>
                        <div className="text-xs text-gray-600 mt-1">Frequently prescribed medications</div>
                      </button>
                      <button className="p-3 text-left bg-white border rounded-lg hover:bg-gray-50">
                        <div className="font-medium text-gray-900">📋 Favorites</div>
                        <div className="text-xs text-gray-600 mt-1">Your saved prescriptions</div>
                      </button>
                      <button className="p-3 text-left bg-white border rounded-lg hover:bg-gray-50">
                        <div className="font-medium text-gray-900">🔄 Previous Rx</div>
                        <div className="text-xs text-gray-600 mt-1">Copy from past prescriptions</div>
                      </button>
                      <button className="p-3 text-left bg-white border rounded-lg hover:bg-gray-50">
                        <div className="font-medium text-gray-900">⚠️ Interactions</div>
                        <div className="text-xs text-gray-600 mt-1">Check drug interactions</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Prescription History Tab */}
                {treatmentTab === 'history' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Prescription History</h4>
                    
                    {selectedPatientPrescriptions.length > 0 ? (
                      selectedPatientPrescriptions.map((rx: any) => (
                        <div key={rx.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <span className="text-sm font-medium text-gray-900">{rx.id}</span>
                              <p className="text-xs text-gray-500">
                                {new Date(rx.prescribedDate).toLocaleDateString('th-TH')} • {rx.doctorName}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              rx.status === 'active' ? 'bg-green-100 text-green-700' :
                              rx.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {rx.status}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            {rx.medications?.map((med: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                <div>
                                  <span className="font-medium">{med.name}</span>
                                  <span className="text-gray-500 ml-2">{med.strength} - {med.frequency}</span>
                                </div>
                                <span className="text-xs text-gray-500">{med.duration}</span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 flex justify-end space-x-2">
                            <button className="text-xs text-blue-600 hover:text-blue-800">View Details</button>
                            <button className="text-xs text-emerald-600 hover:text-emerald-800">Copy to New Rx</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📜</div>
                        <p>No prescription history found</p>
                        <button
                          onClick={() => {
                            setStudioModal(null);
                            if (onCreatePrescription) onCreatePrescription();
                          }}
                          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Create First Prescription
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setStudioModal(null);
                  if (onCreatePrescription) onCreatePrescription();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                💊 New Prescription
              </button>
            </div>
          </div>
        ),
      },
      'system-report': {
        title: '📊 รายงานเวชระเบียน (Medical Record)',
        content: (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">Patient: {patientName}</h3>
              <p className="text-sm text-blue-800">
                Last Encounter: {latestEMR ? new Date(latestEMR.encounterDate).toLocaleDateString('th-TH') : 'No records'}
              </p>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">History of Present Illness</h4>
              <p className="text-sm text-gray-700">
                {latestEMR?.historyOfPresentIllness || 'No HPI recorded'}
              </p>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Physical Examination</h4>
              {latestEMR?.physicalExamination ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(latestEMR.physicalExamination).map(([system, finding]) => (
                    <div key={system}>
                      <strong className="text-gray-700 capitalize">{system}:</strong>
                      <p className="text-gray-600">{finding}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No physical examination recorded</p>
              )}
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">EMR History ({selectedPatientEMRs.length} records)</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedPatientEMRs.length > 0 ? (
                  selectedPatientEMRs.map((emr) => (
                    <div key={emr.id} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{new Date(emr.encounterDate).toLocaleDateString('th-TH')}</span>
                        <span className="text-gray-500">{emr.encounterType}</span>
                      </div>
                      <p className="text-gray-600 truncate">{emr.chiefComplaint}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No EMR records found</p>
                )}
              </div>
            </div>
          </div>
        ),
      },
      radiology: {
        title: '🩻 ภาพวินิจฉัยทางรังสีวิทยา (Radiological Imaging)',
        content: (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">Patient: {patientName}</h3>
              <p className="text-sm text-blue-800">Imaging orders from EMR records</p>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Imaging Studies</h4>
              <div className="space-y-3">
                {latestEMR?.imagingOrders && latestEMR.imagingOrders.length > 0 ? (
                  latestEMR.imagingOrders.map((orderId, i) => (
                    <div key={i} className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-blue-900">Imaging Order #{orderId}</h5>
                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">Ordered</span>
                      </div>
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        📄 View Report & Images →
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No imaging orders for this patient</p>
                  </div>
                )}

                <div className="border-t pt-3 mt-3">
                  <h5 className="font-semibold text-gray-700 mb-2">Order New Imaging</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">X-Ray</button>
                    <button className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">CT Scan</button>
                    <button className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">Ultrasound</button>
                    <button className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">MRI</button>
                    <button className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">Mammogram</button>
                    <button className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">Echocardiogram</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">⚠️ Important Notes</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Contrast studies require renal function check</li>
                {allergies.length > 0 && <li>• Patient allergies: {allergies.join(', ')}</li>}
                <li>• Ensure pregnancy status before ionizing radiation</li>
              </ul>
            </div>
          </div>
        ),
      },
      pathology: {
        title: '🔬 รายงานทางพยาธิวิทยา (Pathology Reports)',
        content: (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">Patient: {patientName}</h3>
              <p className="text-sm text-blue-800">Pathology specimens and reports</p>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Pathology Results</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <p className="text-sm text-gray-600 text-center py-4">
                    No pathology specimens have been submitted for this patient.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Available Pathology Services</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border rounded p-3 hover:bg-gray-50 cursor-pointer">
                  <p className="font-semibold text-gray-800">🔬 Tissue Biopsy</p>
                  <p className="text-xs text-gray-600 mt-1">Histopathological examination</p>
                </div>
                <div className="border rounded p-3 hover:bg-gray-50 cursor-pointer">
                  <p className="font-semibold text-gray-800">🧫 Cytology</p>
                  <p className="text-xs text-gray-600 mt-1">Cell analysis and screening</p>
                </div>
                <div className="border rounded p-3 hover:bg-gray-50 cursor-pointer">
                  <p className="font-semibold text-gray-800">🔍 Fine Needle Aspiration</p>
                  <p className="text-xs text-gray-600 mt-1">FNA cytology</p>
                </div>
                <div className="border rounded p-3 hover:bg-gray-50 cursor-pointer">
                  <p className="font-semibold text-gray-800">🧬 Molecular Pathology</p>
                  <p className="text-xs text-gray-600 mt-1">Genetic testing</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">📚 Clinical Resources</h4>
              <p className="text-sm text-purple-800">
                Access comprehensive pathology interpretation guidelines in the <strong>Clinical Resources</strong> menu.
              </p>
            </div>
          </div>
        ),
      },
      laboratory: {
        title: '🧪 รายงานทางห้องปฏิบัติการ (Laboratory Results)',
        content: (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">Patient: {patientName}</h3>
              <p className="text-sm text-blue-800">Laboratory orders and results</p>
            </div>

            {selectedPatientLabs.length > 0 ? (
              selectedPatientLabs.map((lab) => (
                <div key={lab.id} className="bg-white border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900">{lab.testCategory}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      lab.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {lab.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Ordered: {new Date(lab.orderDate).toLocaleDateString('th-TH')} by {lab.doctorName}
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2">Test</th>
                          <th className="text-left p-2">Result</th>
                          <th className="text-left p-2">Reference</th>
                          <th className="text-left p-2">Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lab.tests.map((test, i) => (
                          <tr key={i} className={test.abnormalFlag ? 'bg-red-50' : ''}>
                            <td className="p-2">{test.name}</td>
                            <td className="p-2 font-medium">{test.result} {test.unit}</td>
                            <td className="p-2 text-gray-500">{test.referenceRange}</td>
                            <td className="p-2">
                              {test.abnormalFlag && (
                                <span className="text-red-600 font-bold">{test.abnormalFlag}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {lab.interpretation && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <strong>Interpretation:</strong> {lab.interpretation}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
                <p>No laboratory results found for this patient</p>
                <button
                  onClick={() => onOrderLab && onOrderLab()}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Order Lab Tests
                </button>
              </div>
            )}
          </div>
        ),
      },
    };

    const modal = modalContent[studioModal];
    if (!modal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">{modal.title}</h2>
            <button
              onClick={() => setStudioModal(null)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {modal.content}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end space-x-3">
            <button
              onClick={() => setStudioModal(null)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
            <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              Save to EMR
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* ============================================================================ */}
      {/* DASHBOARD OVERVIEW - TOP KPI CARDS */}
      {/* ============================================================================ */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {doctor.name}</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CalendarDaysIcon className="w-5 h-5" />
            <span>{new Date().toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>

        {/* KPI Cards - Clickable to navigate to Appointments & Meetings */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <div 
            onClick={() => navigate(`/doctor/${doctor.id}/health-meeting`)}
            className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all"
          >
            <div className="text-2xl font-bold text-blue-700">{dashboardStats.todayAppointments}</div>
            <div className="text-xs text-blue-600 mt-1">Today's Appointments</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">{dashboardStats.patientsSeen}</div>
            <div className="text-xs text-green-600 mt-1">Patients Seen</div>
          </div>
          <div 
            onClick={() => navigate(`/doctor/${doctor.id}/health-meeting`)}
            className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200 cursor-pointer hover:shadow-lg hover:border-orange-400 transition-all"
          >
            <div className="text-2xl font-bold text-orange-700">{dashboardStats.patientsInQueue}</div>
            <div className="text-xs text-orange-600 mt-1">In Queue</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">{dashboardStats.pendingPrescriptions}</div>
            <div className="text-xs text-purple-600 mt-1">Pending Rx</div>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200">
            <div className="text-2xl font-bold text-pink-700">{dashboardStats.unreadMessages}</div>
            <div className="text-xs text-pink-600 mt-1">Unread Messages</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg border border-cyan-200">
            <div className="text-2xl font-bold text-cyan-700">{dashboardStats.averageWaitTime}</div>
            <div className="text-xs text-cyan-600 mt-1">Avg Wait (min)</div>
          </div>
          <div 
            onClick={() => navigate(`/doctor/${doctor.id}/health-meeting`)}
            className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border-2 border-amber-400 relative cursor-pointer hover:shadow-lg hover:border-amber-500 transition-all"
          >
            <div className="text-2xl font-bold text-amber-700">{dashboardStats.pendingConfirmations}</div>
            <div className="text-xs text-amber-600 mt-1">Need Confirmation</div>
            {dashboardStats.pendingConfirmations > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-xs text-white font-bold">!</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Today's Meetings Quick View */}
        {todayMeetings.length > 0 && (
          <div className="mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
            <h3 className="text-lg font-bold text-emerald-800 mb-3">📅 Today's Meetings ({todayMeetings.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayMeetings.slice(0, 3).map((apt: any) => (
                <div key={apt.id} className="bg-white rounded-lg p-3 shadow-sm border border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">
                      ⏰ {apt.appointmentTime || apt.scheduledTime || apt.time || 'TBD'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-800">👤 {apt.patientName || 'Patient'}</div>
                  <div className="text-xs text-gray-500 mt-1">{apt.reason || 'Consultation'}</div>
                  {apt.meetingLink && (
                    <a 
                      href={apt.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                    >
                      🎥 Join Meeting
                    </a>
                  )}
                </div>
              ))}
            </div>
            {todayMeetings.length > 3 && (
              <div className="text-center mt-3">
                <span className="text-sm text-emerald-600">+{todayMeetings.length - 3} more meetings</span>
              </div>
            )}
          </div>
        )}
        
        {/* Upcoming Appointments Quick View */}
        {upcomingAppointments.length > 0 && (
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
            <h3 className="text-lg font-bold text-blue-800 mb-3">📋 Upcoming Appointments ({upcomingAppointments.length})</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {upcomingAppointments.slice(0, 5).map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-blue-700">
                      📅 {apt.appointmentDate || apt.scheduledDate || apt.date}
                    </div>
                    <div className="text-sm text-gray-600">
                      ⏰ {apt.appointmentTime || apt.scheduledTime || apt.time || 'TBD'}
                    </div>
                    <div className="text-sm text-gray-800">
                      👤 {apt.patientName || 'Patient'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {apt.meetingLink && (
                      <a 
                        href={apt.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-800"
                      >
                        🎥 Meet
                      </a>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                      apt.status === 'assigned' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================================ */}
      {/* 3-COLUMN LAYOUT: Health Data | Health Meeting | Health Studio */}
      {/* ============================================================================ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================================== */}
        {/* LEFT COLUMN: HEALTH DATA */}
        {/* ========================================================================== */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 bg-emerald-50 border-b border-emerald-200">
            <h2 className="text-lg font-bold text-emerald-700">Health Data</h2>
            <p className="text-xs text-emerald-600">Patient Queue & Records</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {queue.map((patient, idx) => (
                <button
                  key={patient.id}
                  onClick={() => handleViewPatient(patient)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedPatientId === patient.patientId
                      ? 'bg-emerald-100 border-emerald-500 shadow-md'
                      : patient.priority === 'urgent'
                      ? 'bg-red-50 border-red-300 hover:bg-red-100 hover:shadow'
                      : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:shadow'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900">#{idx + 1}</span>
                    <div className="flex items-center space-x-2">
                      {patient.priority === 'urgent' && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                          URGENT
                        </span>
                      )}
                      <span className="text-xs text-gray-500 flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {patient.estimatedWaitTime}m
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{patient.patientName}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{patient.reason}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 space-y-2">
            <button 
              className="w-full py-2 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              title="ดึงข้อมูลการรักษาเดิมย้อนหลัง นำมาสรุปเพื่อเป็น input ให้แพทย์"
            >
              <span className="block">🔍 ค้นหาประวัติการรักษา</span>
              <span className="block text-xs opacity-80">Retrieve Past Records for AI Summary</span>
            </button>
            <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              View All Patients
            </button>
          </div>
        </div>

        {/* ========================================================================== */}
        {/* MIDDLE COLUMN: HEALTH MEETING */}
        {/* ========================================================================== */}
        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
          <div className="p-4 bg-purple-50 border-b border-purple-200">
            <h2 className="text-lg font-bold text-purple-700">Health Meeting</h2>
            <p className="text-xs text-purple-600">Video Consultation & AI Notes</p>
          </div>

          {/* Meeting Area */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Person Filter Tabs */}
            <div className="bg-white rounded-lg shadow-sm mb-3">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setPersonFilter('patient')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    personFilter === 'patient'
                      ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Patient
                </button>
                <button
                  onClick={() => setPersonFilter('doctor')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    personFilter === 'doctor'
                      ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Doctor
                </button>
                <button
                  onClick={() => setPersonFilter('healthcare-team')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    personFilter === 'healthcare-team'
                      ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Team
                </button>
              </div>

              {/* Video Meeting Area */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30" style={{ minHeight: '180px' }}>
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <VideoCameraIcon className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                    <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-2">
                      Video Consultation
                      {personFilter === 'patient' && ' - Patient View'}
                      {personFilter === 'doctor' && ' - Doctor View'}
                      {personFilter === 'healthcare-team' && ' - Team View'}
                    </p>
                    <button
                      onClick={() => handleStartJitsiMeeting()}
                      data-testid="start-video-call"
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2 mx-auto"
                      title="Open Jitsi Meet video consultation"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Start Video Call
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Areas - Enhanced with Man-in-the-Loop Validation (Phase 1 DR-05) */}
            <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
              {/* Tab Navigation for AI Content */}
              <div className="flex border-b border-gray-200 mb-3">
                <button
                  onClick={() => setAiValidationTab('summary')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                    aiValidationTab === 'summary'
                      ? 'text-purple-700 border-b-2 border-purple-500 bg-purple-50'
                      : 'text-gray-500 hover:text-purple-600'
                  }`}
                >
                  📋 สรุปประวัติ
                </button>
                <button
                  onClick={() => setAiValidationTab('documents')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                    aiValidationTab === 'documents'
                      ? 'text-purple-700 border-b-2 border-purple-500 bg-purple-50'
                      : 'text-gray-500 hover:text-purple-600'
                  }`}
                >
                  📄 วิเคราะห์เอกสาร
                </button>
                <button
                  onClick={() => setAiValidationTab('cds')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors relative ${
                    aiValidationTab === 'cds'
                      ? 'text-purple-700 border-b-2 border-purple-500 bg-purple-50'
                      : 'text-gray-500 hover:text-purple-600'
                  }`}
                >
                  ⚠️ CDS
                  {aiPreSummary?.aiTriage?.alertFlags?.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {aiPreSummary.aiTriage.alertFlags.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-purple-700">
                    {aiValidationTab === 'summary' && 'AI สรุปประวัติผู้ป่วย'}
                    {aiValidationTab === 'documents' && 'AI วิเคราะห์เอกสาร'}
                    {aiValidationTab === 'cds' && 'Clinical Decision Support'}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                  aiValidationStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  aiValidationStatus === 'approved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {aiValidationStatus === 'pending' ? '🟡 รอตรวจสอบ' :
                   aiValidationStatus === 'approved' ? '🟢 อนุมัติแล้ว' :
                   '🔴 ปฏิเสธ'}
                </span>
              </div>

              {/* AI Content Display */}
              {isLoadingAI ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-sm text-gray-500">กำลังโหลด AI สรุป...</span>
                </div>
              ) : (
                <>
                  {aiValidationTab === 'summary' && (
                    <textarea
                      value={aiHistorySummary}
                      onChange={(e) => { setAiHistorySummary(e.target.value); setAiValidationStatus('pending'); }}
                      placeholder="เลือกผู้ป่วยเพื่อดู AI สรุปประวัติอัตโนมัติ..."
                      className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={6}
                    />
                  )}

                  {aiValidationTab === 'documents' && (
                    <div className="space-y-2">
                      {aiDocuments.length > 0 ? (
                        aiDocuments.map((doc, idx) => (
                          <div key={idx} className="p-2 bg-gray-50 rounded border text-xs">
                            <div className="font-medium text-gray-700">{doc.filename}</div>
                            <div className="text-gray-600 mt-1">{doc.summary}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-xs">
                          <p>📄 ยังไม่มีเอกสารที่วิเคราะห์</p>
                          <button 
                            onClick={() => alert('Upload document feature coming soon')}
                            className="mt-2 px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                          >
                            อัปโหลดเอกสาร
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {aiValidationTab === 'cds' && (
                    <div className="space-y-2">
                      {aiPreSummary?.aiTriage?.alertFlags?.length > 0 ? (
                        aiPreSummary.aiTriage.alertFlags.map((alert: string, idx: number) => (
                          <div key={idx} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <div className="text-yellow-800">{alert}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-xs">
                          <p>✅ ไม่มีข้อควรระวังพิเศษ</p>
                        </div>
                      )}
                      
                      {/* Suggested Questions */}
                      {aiPreSummary?.aiTriage?.suggestedQuestions?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">💡 คำถามที่แนะนำ:</p>
                          <ul className="space-y-1">
                            {aiPreSummary.aiTriage.suggestedQuestions.map((q: string, idx: number) => (
                              <li key={idx} className="text-xs text-gray-600 flex items-start">
                                <span className="mr-1">•</span> {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Man-in-the-Loop Validation Buttons (DR-05) */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAIValidation('approved')}
                    disabled={!aiHistorySummary && aiValidationTab === 'summary'}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    ✅ อนุมัติ
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('กรุณาระบุเหตุผลในการปฏิเสธ:');
                      if (reason) handleAIValidation('rejected', reason);
                    }}
                    disabled={!aiHistorySummary && aiValidationTab === 'summary'}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    ❌ ปฏิเสธ
                  </button>
                </div>
                <button
                  onClick={handleUseInEMR}
                  disabled={aiValidationStatus !== 'approved'}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  📝 ใช้ใน EMR
                </button>
              </div>
            </div>

            {/* Meeting AI Summary - Real-time during video */}
            <div className="bg-white rounded-lg shadow-sm p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-purple-700">AI สรุปจาก Health Meeting</h3>
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Transcript</span>
              </div>
              <textarea
                value={aiMeetingSummary}
                onChange={(e) => setAiMeetingSummary(e.target.value)}
                placeholder="AI จะสรุปจากการถอดเสียงระหว่าง Video Consultation..."
                className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>
          </div>

          {/* Bottom Tabs - Patient Lists */}
          <div className="bg-white border-t border-gray-200">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setMeetingTab('investigation')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  meetingTab === 'investigation'
                    ? 'bg-yellow-50 text-gray-900 border-b-2 border-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Investigation ({investigationPatients.length})
              </button>
              <button
                onClick={() => setMeetingTab('treatment')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  meetingTab === 'treatment'
                    ? 'bg-yellow-50 text-gray-900 border-b-2 border-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Treatment ({treatmentPatients.length})
              </button>
              <button
                onClick={() => setMeetingTab('refer')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  meetingTab === 'refer'
                    ? 'bg-yellow-50 text-gray-900 border-b-2 border-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Refer ({referPatients.length})
              </button>
            </div>

            <div className="p-3 max-h-48 overflow-y-auto">
              {meetingTab === 'investigation' && renderPatientListForTab(investigationPatients, 'Investigation')}
              {meetingTab === 'treatment' && renderPatientListForTab(treatmentPatients, 'Treatment')}
              {meetingTab === 'refer' && renderPatientListForTab(referPatients, 'Refer')}
            </div>
          </div>
        </div>

        {/* ========================================================================== */}
        {/* RIGHT COLUMN: HEALTH STUDIO */}
        {/* ========================================================================== */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 bg-teal-50 border-b border-teal-200">
            <h2 className="text-lg font-bold text-teal-700">Health Studio</h2>
            <p className="text-xs text-teal-600">Clinical Tools & Resources</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {/* Diagnosis & Differential */}
              <button
                onClick={() => handleStudioAction('diagnosis')}
                className="w-full p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-500 rounded-lg text-left hover:shadow-lg transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🔍</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-700">การวินิจฉัย / วินิจฉัยแยกโรค</p>
                    <p className="text-xs text-gray-600">Diagnosis & Differential</p>
                  </div>
                </div>
              </button>

              {/* Treatment Plan */}
              <button
                onClick={() => handleStudioAction('treatment-plan')}
                className="w-full p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-500 rounded-lg text-left hover:shadow-lg transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">💊</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-700">แผนการรักษา</p>
                    <p className="text-xs text-gray-600">Treatment Plan / Prescribe</p>
                  </div>
                </div>
              </button>

              {/* System Report -> Medical Record */}
              <button
                onClick={() => handleStudioAction('system-report')}
                className="w-full p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-500 rounded-lg text-left hover:shadow-lg transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📊</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-purple-700">รายงานเวชระเบียน</p>
                    <p className="text-xs text-gray-600">Medical Record</p>
                  </div>
                </div>
              </button>

              {/* Radiological Diagnosis */}
              <button
                onClick={() => handleStudioAction('radiology')}
                className="w-full p-4 bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-500 rounded-lg text-left hover:shadow-lg transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🩻</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-orange-700">ภาพวินิจฉัยทางรังสีวิทยา</p>
                    <p className="text-xs text-gray-600">Radiological Imaging</p>
                  </div>
                </div>
              </button>

              {/* Laboratory Reports */}
              <button
                onClick={() => handleStudioAction('laboratory')}
                className="w-full p-4 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-500 rounded-lg text-left hover:shadow-lg transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🧪</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-cyan-700">รายงานทางห้องปฏิบัติการ</p>
                    <p className="text-xs text-gray-600">Laboratory Reports</p>
                  </div>
                </div>
              </button>

              {/* Pathology Reports -> Pathological Reports */}
              <button
                onClick={() => handleStudioAction('pathology')}
                className="w-full p-4 bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-500 rounded-lg text-left hover:shadow-lg transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🔬</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-pink-700">รายงานทางพยาธิวิทยา</p>
                    <p className="text-xs text-gray-600">Pathological Reports</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Clinical Resources Note */}
            <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-300 rounded-lg">
              <h3 className="text-xs font-bold text-indigo-900 mb-1">📚 Clinical Resources</h3>
              <p className="text-xs text-indigo-700">
                Access comprehensive medical guidelines and research papers from the <strong>Clinical Resources</strong> menu.
              </p>
            </div>
          </div>

          {/* AI Chatbot Assistant Section */}
          <div className="border-t border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="p-3 border-b border-blue-200">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-900">AI Clinical Assistant</h3>
                  <p className="text-xs text-blue-600">Ask anything about diagnosis or treatment</p>
                </div>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="p-3 max-h-60 overflow-y-auto bg-white/50">
              {chatMessages.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">
                  <p>👋 Hello, Dr. {doctor.name?.split(' ')[0]}!</p>
                  <p className="mt-1">I'm ready to assist with clinical questions.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-2 rounded-lg text-xs ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 p-2 rounded-lg rounded-bl-none">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 pb-16 border-t border-blue-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder="Ask about symptoms, drugs, protocols..."
                  className="flex-1 px-3 py-2 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isChatLoading}
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                <button
                  onClick={() => setChatInput('What are the common drug interactions?')}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Drug Interactions
                </button>
                <button
                  onClick={() => setChatInput('Differential diagnosis for chest pain')}
                  className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                >
                  Diff. Diagnosis
                </button>
                <button
                  onClick={() => setChatInput('Treatment protocols for hypertension')}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  Protocols
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Studio Modal */}
      {renderStudioModalContent()}
    </div>
  );
};

export default DoctorDashboard;
