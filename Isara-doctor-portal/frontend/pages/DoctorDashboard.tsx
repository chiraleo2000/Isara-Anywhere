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
import { useSettings } from '../hooks/useSettings';
import { getRecentCompletedAppointments } from '../utils/postMeetingAppointments';
// POSTGRESQL-BACKED API SERVICE - NO GCS!
import {
  fetchDashboardData,
  fetchAllPatients,
  fetchAllAppointments,
  fetchPatientEMRs,
  fetchPatientLabOrders,
  fetchPatientPrescriptions,
  clearCache,
  fetchPendingPrescriptionsCount,
  fetchUnreadNotificationsCount
} from '../services/apiDataService';
import { meetingService } from '../services/apiServices';
import { getToken } from '../services/authServices';
import { geminiClinicalService } from '../services/geminiClinicalService';
import { useRealtimeSync } from '../services/useRealtimeSync';
import { resolveMeetingServerUrl } from '../utils/resolveMeetingServerUrl';
import { CalendarDaysIcon, ClockIcon, VideoCameraIcon } from '../assets/NewSvgIcons';

const meetingServerBase = () => resolveMeetingServerUrl();

function formatMeetingSummaryPayload(summaryPayload: unknown): string {
  if (typeof summaryPayload === 'string') return summaryPayload;
  if (summaryPayload !== null && typeof summaryPayload === 'object') {
    const o = summaryPayload as { text?: string; summary?: string; narrative?: string };
    return o.text || o.summary || o.narrative || JSON.stringify(summaryPayload, null, 2);
  }
  return JSON.stringify(summaryPayload, null, 2);
}

function formatConditionLabel(c: { conditionThai?: string; condition?: string }): string {
  return c?.conditionThai || c?.condition || '';
}

function normalizeAiPreSummary(data: Record<string, unknown>) {
  if (data.data) return data.data;
  if (!data.success) return null;
  const info = data.patientInfo as Record<string, unknown> | undefined;
  const conditions = Array.isArray(info?.conditions)
    ? (info.conditions as Array<{ conditionThai?: string; condition?: string }>).map(formatConditionLabel).filter(Boolean)
    : [];
  return {
    patientSnapshot: {
      name: info?.name,
      nameThai: info?.name,
      age: info?.age,
      gender: info?.gender ?? 'unknown',
      bloodType: info?.bloodType,
      primaryConditions: conditions,
      drugAllergies: Array.isArray(info?.allergies) ? info.allergies : [],
    },
    appointmentReason: typeof data.summary === 'string' ? data.summary.slice(0, 240) : 'ตรวจทั่วไป',
    currentSymptoms: [] as string[],
    aiTriage: { alertFlags: [] as string[], suggestedQuestions: [] as string[] },
  };
}

function formatAiPreSummaryText(summary: {
  patientSnapshot?: {
    name?: string;
    nameThai?: string;
    age?: number | string;
    gender?: string;
    bloodType?: string;
    primaryConditions?: string[];
    drugAllergies?: Array<{ allergen?: string } | string>;
  };
  appointmentReason?: string;
  currentSymptoms?: string[];
  aiTriage?: { alertFlags?: string[] };
}): string {
  const genderLabel = summary.patientSnapshot?.gender === 'male' ? 'ชาย' : 'หญิง';
  const allergies = (Array.isArray(summary.patientSnapshot?.drugAllergies)
    ? summary.patientSnapshot.drugAllergies.map((a) => (typeof a === 'string' ? a : a?.allergen || ''))
    : []
  ).filter(Boolean);
  const alertFlags = summary.aiTriage?.alertFlags?.length
    ? summary.aiTriage.alertFlags
    : ['ไม่มีข้อควรระวังพิเศษ'];
  return [
    `👤 ผู้ป่วย: ${summary.patientSnapshot?.nameThai || summary.patientSnapshot?.name || '—'}`,
    `📅 อายุ: ${summary.patientSnapshot?.age ?? '—'} ปี | เพศ: ${genderLabel}`,
    `🩸 กรุ๊ปเลือด: ${summary.patientSnapshot?.bloodType || 'ไม่ระบุ'}`,
    '',
    `⚕️ โรคประจำตัว: ${(summary.patientSnapshot?.primaryConditions || []).join(', ') || 'ไม่มี'}`,
    `💊 แพ้ยา: ${allergies.join(', ') || 'ไม่มี'}`,
    '',
    `🎯 เหตุผลนัด: ${summary.appointmentReason || 'ตรวจทั่วไป'}`,
    `🔔 อาการ: ${(summary.currentSymptoms || []).join(', ') || 'ไม่ระบุ'}`,
    '',
    '⚠️ ข้อควรระวัง:',
    ...alertFlags,
  ].join('\n');
}

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
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

const createChatMessage = (role: 'user' | 'assistant', content: string): ChatMessage => {
  const hasCrypto = typeof crypto !== 'undefined' && 'randomUUID' in crypto;
  const id = hasCrypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, role, content };
};

const getAppointmentDate = (appointment: any): string | null => {
  const rawDate = appointment?.appointmentDate || appointment?.appointment_date
    || appointment?.confirmed_date || appointment?.confirmedDate
    || appointment?.requested_date || appointment?.requestedDate
    || appointment?.scheduledDate || appointment?.scheduled_date
    || appointment?.date;
  if (!rawDate) return null;
  // Handle both ISO datetime and date-only strings
  return typeof rawDate === 'string' ? rawDate.split('T')[0] : null;
};

const getDoctorAppointments = (appointments: any[], doctorId: string) => {
  return appointments.filter((apt: any) =>
    apt.doctorId === doctorId ||
    apt.doctor_id === doctorId ||
    apt.assignedDoctorId === doctorId ||
    apt.adminAssignedDoctorId === doctorId ||
    apt.confirmedBy === doctorId ||
    (!apt.doctorId && !apt.doctor_id) // include unassigned/pool appointments
  );
};

const getPendingConfirmationsCount = (appointments: any[]) => {
  return appointments.filter((apt: any) =>
    apt.status === 'in_pool' ||
    apt.status === 'awaiting_doctor_response' ||
    apt.status === 'assigned' ||
    (apt.status === 'pending' && (apt.assignedDoctorId || apt.adminAssignedDoctorId))
  ).length;
};

const getAssignedPatients = (patients: PatientRecord[], appointments: any[]) => {
  const appointmentPatientIds = new Set(appointments.map((apt: any) => apt.patientId || apt.patient_id));
  return patients.filter((patient: PatientRecord) => appointmentPatientIds.has(patient.id));
};

const getPatientsByAppointmentStatus = (
  patients: PatientRecord[],
  appointments: any[],
  statuses: string[]
) => {
  const statusSet = new Set(statuses);
  const patientIds = new Set(
    appointments.filter((apt: any) => statusSet.has(apt.status)).map((apt: any) => apt.patientId || apt.patient_id)
  );
  return patients.filter((patient: PatientRecord) => patientIds.has(patient.id));
};

const getUpcomingAppointments = (appointments: any[], today: string) => {
  return appointments
    .filter((apt: any) => {
      const aptDate = getAppointmentDate(apt);
      const isActiveStatus = ['confirmed', 'scheduled', 'in_pool', 'pending', 'awaiting_doctor_response', 'assigned'].includes(apt.status);
      return isActiveStatus && aptDate && aptDate >= today;
    })
    .sort((a: any, b: any) => {
      const dateA = getAppointmentDate(a) || '';
      const dateB = getAppointmentDate(b) || '';
      return dateA.localeCompare(dateB);
    });
};

const getTodaysMeetings = (appointments: any[], today: string) => {
  return appointments.filter((apt: any) => {
    const aptDate = getAppointmentDate(apt);
    const isActiveStatus = ['confirmed', 'scheduled', 'in_pool', 'pending', 'awaiting_doctor_response', 'assigned'].includes(apt.status);
    return isActiveStatus && aptDate === today;
  });
};

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
  
  // Theme and language settings
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';

  // Helper functions to avoid nested ternaries (SonarQube S3358)
  const getPersonFilterTabClass = (isActive: boolean): string => {
    if (isActive) return isDark ? 'bg-purple-900 text-purple-300 border-b-2 border-purple-500' : 'bg-purple-50 text-purple-700 border-b-2 border-purple-600';
    return isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50';
  };

  const getAiValidationTabClass = (isActive: boolean): string => {
    if (isActive) return isDark ? 'text-purple-300 border-b-2 border-purple-500 bg-purple-900/50' : 'text-purple-700 border-b-2 border-purple-500 bg-purple-50';
    return isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-500 hover:text-purple-600';
  };

  const getMeetingTabClass = (isActive: boolean): string => {
    if (isActive) return isDark ? 'bg-yellow-900/50 text-yellow-300 border-b-2 border-yellow-500' : 'bg-yellow-50 text-gray-900 border-b-2 border-yellow-600';
    return isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50';
  };

  const getChatBubbleClass = (role: string): string => {
    if (role === 'user') return 'bg-blue-600 text-white rounded-br-none';
    return isDark ? 'bg-gray-700 text-gray-200 rounded-bl-none' : 'bg-gray-100 text-gray-800 rounded-bl-none';
  };

  // Bilingual labels for UI text
  const labels = {
    doctorDashboard: { en: 'Doctor Dashboard', th: 'แดชบอร์ดแพทย์' },
    welcomeBack: { en: 'Welcome back', th: 'ยินดีต้อนรับ' },
    todayAppointments: { en: "Today's Appointments", th: 'นัดหมายวันนี้' },
    patientsSeen: { en: 'Patients Seen', th: 'ผู้ป่วยที่พบแล้ว' },
    inQueue: { en: 'In Queue', th: 'ในคิว' },
    pendingRx: { en: 'Pending Rx', th: 'ใบสั่งยารอดำเนินการ' },
    unreadMessages: { en: 'Unread Messages', th: 'ข้อความที่ยังไม่ได้อ่าน' },
    avgWait: { en: 'Avg Wait (min)', th: 'เวลารอเฉลี่ย (นาที)' },
    needConfirmation: { en: 'Need Confirmation', th: 'รอยืนยัน' },
    todayMeetings: { en: "Today's Meetings", th: 'การประชุมวันนี้' },
    upcomingAppointments: { en: 'Upcoming Appointments', th: 'นัดหมายที่จะถึง' },
    healthData: { en: 'Health Data', th: 'ข้อมูลสุขภาพ' },
    patientQueueRecords: { en: 'Patient Queue & Records', th: 'คิวผู้ป่วยและบันทึก' },
    searchPastRecords: { en: 'Retrieve Past Records for AI Summary', th: 'ดึงข้อมูลการรักษาเดิมให้ AI สรุป' },
    viewAllPatients: { en: 'View All Patients', th: 'ดูผู้ป่วยทั้งหมด' },
    healthMeeting: { en: 'Health Meeting', th: 'การประชุมสุขภาพ' },
    videoConsultation: { en: 'Video Consultation & AI Notes', th: 'ปรึกษาผ่านวิดีโอและบันทึก AI' },
    patient: { en: 'Patient', th: 'ผู้ป่วย' },
    doctor: { en: 'Doctor', th: 'แพทย์' },
    team: { en: 'Team', th: 'ทีม' },
    startVideoCall: { en: 'Start Video Call', th: 'เริ่มวิดีโอคอล' },
    investigation: { en: 'Investigation', th: 'การตรวจสอบ' },
    treatment: { en: 'Treatment', th: 'การรักษา' },
    refer: { en: 'Refer', th: 'ส่งต่อ' },
    healthStudio: { en: 'Health Studio', th: 'สตูดิโอสุขภาพ' },
    clinicalTools: { en: 'Clinical Tools & Resources', th: 'เครื่องมือและทรัพยากรทางคลินิก' },
    aiClinicalAssistant: { en: 'AI Clinical Assistant', th: 'ผู้ช่วย AI ทางคลินิก' },
    askAnything: { en: 'Ask anything about diagnosis or treatment', th: 'ถามเกี่ยวกับการวินิจฉัยหรือการรักษา' },
    noPatientData: { en: 'No patient data', th: 'ไม่มีข้อมูลผู้ป่วย' },
    joinMeeting: { en: 'Join Meeting', th: 'เข้าร่วมประชุม' },
    moreMeetings: { en: 'more meetings', th: 'การประชุมเพิ่มเติม' },
    aiHistorySummary: { en: 'AI Patient History Summary', th: 'AI สรุปประวัติผู้ป่วย' },
    aiDocumentAnalysis: { en: 'AI Document Analysis', th: 'AI วิเคราะห์เอกสาร' },
    clinicalDecisionSupport: { en: 'Clinical Decision Support', th: 'ระบบช่วยตัดสินใจทางคลินิก' },
    approve: { en: 'Approve', th: 'อนุมัติ' },
    reject: { en: 'Reject', th: 'ปฏิเสธ' },
    useInEMR: { en: 'Use in EMR', th: 'ใช้ใน EMR' },
    aiMeetingSummary: { en: 'AI Summary from Health Meeting', th: 'AI สรุปจาก Health Meeting' },
  };

  // State
  const [personFilter, setPersonFilter] = useState<PersonFilter>('patient');
  const [meetingTab, setMeetingTab] = useState<MeetingTab>('investigation');
  const [studioModal, setStudioModal] = useState<StudioModal>(null);
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [aiHistorySummary, setAiHistorySummary] = useState('');
  const [aiMeetingSummary, setAiMeetingSummary] = useState('');
  const [meetingPipelineStatus, setMeetingPipelineStatus] = useState<string | null>(null);
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
  const [doctorAppointments, setDoctorAppointments] = useState<any[]>([]);
  const [todayMeetings, setTodayMeetings] = useState<any[]>([]);

  // AI Chatbot state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Man-in-the-Loop AI validation states (Phase 1 Requirements 4.3)
  const [aiValidationTab, setAiValidationTab] = useState<'summary' | 'documents' | 'cds'>('summary');
  const [aiPreSummary, setAiPreSummary] = useState<any>(null);
  const [aiDocuments] = useState<any[]>([]);
  const [cdsAlerts] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiValidationStatus, setAiValidationStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Load dashboard on mount (realtime hook added after loadDashboardData)
  useEffect(() => {
    loadDashboardData();
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
        fetchAllPatients(doctor.id),  // Filter by doctor - only show assigned patients
        fetchAllAppointments(doctor.id)  // Filter by doctor on server side
      ]);

      // Set queue from dashboard data or empty array
      const loadedQueue = dashboardData?.queue || [];
      setQueue(loadedQueue);
      setPatients(loadedPatients);

      // Filter appointments for this doctor (additional client-side filter if needed)
      const doctorAppointments = getDoctorAppointments(allAppointments, doctor.id);
      setDoctorAppointments(doctorAppointments);

      if (import.meta.env?.DEV) {
        console.debug('[Dashboard] appointments', doctorAppointments.length, 'doctor', doctor.id);
      }
      
      // Count pending confirmations
      const pendingConfirmations = getPendingConfirmationsCount(doctorAppointments);

      // Filter patients who have appointments with this doctor
      const assignedPatients = getAssignedPatients(loadedPatients, doctorAppointments);

      // For Investigation/Treatment/Refer, only show patients assigned to this doctor
      // Investigation: patients with pending/scheduled appointments
      // Treatment: patients with confirmed appointments
      // Refer: none for now (would need referral data)
      const investigationPatientsData = getPatientsByAppointmentStatus(
        loadedPatients,
        doctorAppointments,
        ['scheduled', 'pending', 'confirmed', 'assigned']
      );
      const treatmentPatientsData = getPatientsByAppointmentStatus(
        loadedPatients,
        doctorAppointments,
        ['in_progress', 'in-progress']
      );

      setInvestigationPatients(investigationPatientsData);
      setTreatmentPatients(treatmentPatientsData);
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

      const upcoming = getUpcomingAppointments(doctorAppointments, today);
      console.log('[Dashboard] Upcoming appointments after filter:', upcoming.length);
      setUpcomingAppointments(upcoming);
      
      // Set today's meetings
      const todaysMeetings = getTodaysMeetings(doctorAppointments, today);
      console.log('[Dashboard] Today meetings:', todaysMeetings.length);
      setTodayMeetings(todaysMeetings);

      // Auto-select first patient from assigned patients if none selected
      if (assignedPatients.length > 0 && !selectedPatientId) {
        const firstPatient = assignedPatients[0];
        setSelectedPatientId(firstPatient.id);
        setSelectedPatient(firstPatient);
      }

      // Fetch real-time counts for pending prescriptions and unread notifications
      const [pendingPrescriptionsCount, unreadMessagesCount] = await Promise.all([
        fetchPendingPrescriptionsCount(doctor.id),
        fetchUnreadNotificationsCount(doctor.id)
      ]);

      console.log('[Dashboard] Real-time counts:', {
        pendingPrescriptions: pendingPrescriptionsCount,
        unreadMessages: unreadMessagesCount
      });

      // Derive stats from fetched data (real data, no hardcoding)
      setDashboardStats({
        todayAppointments: todaysMeetings.length,
        patientsSeen: doctorAppointments.filter((apt: any) => apt.status === 'completed').length,
        pendingPrescriptions: pendingPrescriptionsCount,
        unreadMessages: unreadMessagesCount,
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

  useRealtimeSync({
    doctorId: doctor.id,
    isAdmin: doctor.role === 'admin' || (doctor as { isAdmin?: boolean }).isAdmin,
    onAppointmentChange: () => { loadDashboardData(); },
    onQueueChange: () => { loadDashboardData(); },
  });

  const formatPipelineStatusLabel = (stage: string, userMessage?: string | null): string => {
    if (userMessage?.trim()) return userMessage.trim();
    const labels: Record<string, string> = {
      storage: language === 'th' ? 'กำลังบันทึกไฟล์ประชุม...' : 'Saving meeting recording...',
      transcribing: language === 'th' ? 'กำลังถอดเสียง (Whisper/STT)...' : 'Transcribing audio...',
      summarizing: language === 'th' ? 'กำลังสรุป AI (Gemini)...' : 'Generating AI summary...',
      completed: language === 'th' ? 'สรุป AI พร้อมแล้ว' : 'AI summary ready',
      failed:
        language === 'th'
          ? 'สรุป AI ยังไม่พร้อม — ลองสร้างใหม่หรือใช้ transcript สด'
          : 'AI summary unavailable — retry or use live transcript',
      partial:
        language === 'th'
          ? 'มีบันทึกแต่สรุปยังไม่ครบ — ตรวจสอบ transcript'
          : 'Recording saved — summary incomplete',
      pending: language === 'th' ? 'รอประมวลผลหลังประชุม...' : 'Waiting for post-meeting processing...',
    };
    return labels[stage] || stage;
  };

  const pollPostMeetingPipeline = async (appointmentId: string, patientId: string) => {
    const token = getToken();
    if (!token?.trim()) return;
    const maxPolls = 90;
    for (let i = 0; i < maxPolls; i++) {
      try {
        const res = await fetch(`/api/meetings/${appointmentId}/pipeline-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) break;
        const data = (await res.json()) as {
          pipeline?: { stage?: string; userMessage?: string };
          userMessage?: string;
          hasSummary?: boolean;
        };
        const stage = data.pipeline?.stage || 'pending';
        const userMessage = data.userMessage || data.pipeline?.userMessage;
        if (stage === 'failed' || stage === 'partial') {
          setMeetingPipelineStatus(formatPipelineStatusLabel(stage, userMessage));
          return;
        }
        setMeetingPipelineStatus(formatPipelineStatusLabel(stage, userMessage));
        if (data.hasSummary || stage === 'completed') {
          setMeetingPipelineStatus(formatPipelineStatusLabel('completed'));
          await loadMeetingSummary(patientId, false);
          return;
        }
      } catch {
        /* retry */
      }
      await new Promise<void>((r) => setTimeout(r, 3000));
    }
  };

  /** Load meeting summary for AI Summary tab (EMR reports) */
  const loadMeetingSummary = async (patientId: string, allowPipelinePoll = true) => {
    try {
      const patientAppointments = getRecentCompletedAppointments(doctorAppointments).filter(
        (apt) => (apt.patientId || apt.patient_id) === patientId,
      );
      if (patientAppointments.length === 0) return;

      const sortedAppointments = [...patientAppointments].sort((a: any, b: any) =>
        new Date(b.date || b.appointmentDate).getTime() - new Date(a.date || a.appointmentDate).getTime()
      );
      const recentAppointment = sortedAppointments[0];
      const meetingData = await meetingService.getMeetingFiles(recentAppointment.id, doctor.id);

      const md = meetingData as {
        summary?: unknown;
        summaryText?: string;
        aiSummary?: string;
        recordingUrl?: string;
        postMeetingPipeline?: { stage?: string };
      };
      const pipelineStage = md.postMeetingPipeline?.stage;
      if (pipelineStage && !['completed', 'failed', 'partial'].includes(pipelineStage)) {
        setMeetingPipelineStatus(pipelineStage);
      }

      const summaryPayload =
        md.summaryText ||
        md.aiSummary ||
        md.summary ||
        (meetingData as { files?: { summary?: unknown } }).files?.summary;
      if (meetingData.success && summaryPayload) {
        setAiMeetingSummary(formatMeetingSummaryPayload(summaryPayload));
        setMeetingPipelineStatus('completed');
        return;
      }

      if (
        allowPipelinePoll &&
        meetingData.success &&
        (md.recordingUrl || pipelineStage === 'transcribing' || pipelineStage === 'summarizing' || pipelineStage === 'storage')
      ) {
        void pollPostMeetingPipeline(recentAppointment.id, patientId);
      }
    } catch (meetingError) {
      console.warn('ℹ️ No meeting summary found for patient:', patientId, meetingError);
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
      await loadMeetingSummary(patientId);
      
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
      const token = getToken();
      const response = await fetch(`/api/ai/pre-summary/${patientId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.status === 401 || response.status === 403) {
        return;
      }
      const data = await response.json();
      const normalized = normalizeAiPreSummary(data as Record<string, unknown>);

      if (normalized) {
        setAiPreSummary(normalized);
        setAiHistorySummary(formatAiPreSummaryText(normalized));
        setAiValidationStatus('pending');
      }
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.debug('AI pre-summary skipped:', (error as Error)?.message);
      }
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle AI validation decision (Man-in-the-Loop DR-05)
  const handleAIValidation = async (decision: 'approved' | 'rejected', notes?: string) => {
    try {
      const validationContent = validationContentMap[aiValidationTab];

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
          content: validationContent,
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

  const handleInsertMeetingSummaryToEMR = () => {
    const text = aiMeetingSummary.trim();
    if (!text) {
      alert(language === 'th' ? 'ยังไม่มีสรุปจากการประชุม' : 'No meeting AI summary available');
      return;
    }
    if (selectedPatientId) {
      navigate(`/doctor/${doctor.id}/patients/${selectedPatientId}/emr?ai_summary=${encodeURIComponent(text)}`);
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
    setChatMessages(prev => [...prev, createChatMessage('user', userMessage)]);
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

      setChatMessages(prev => [...prev, createChatMessage('assistant', aiResponse)]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setChatMessages(prev => [
        ...prev,
        createChatMessage(
          'assistant',
          `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please try again.`
        )
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const meetingStatusStyles: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    assigned: 'bg-amber-100 text-amber-700',
  };

  const getMeetingStatusClass = (status: string) => {
    return meetingStatusStyles[status] || 'bg-blue-100 text-blue-700';
  };

  const prescriptionStatusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
  };

  const getPrescriptionStatusClass = (status: string) => {
    return prescriptionStatusStyles[status] || 'bg-yellow-100 text-yellow-700';
  };

  const getQueueItemClass = (patient: QueuePatient) => {
    if (selectedPatientId === patient.patientId) {
      return 'bg-emerald-100 border-emerald-500 shadow-md';
    }
    if (patient.priority === 'urgent') {
      return 'bg-red-50 border-red-300 hover:bg-red-100 hover:shadow';
    }
    return 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:shadow';
  };

  const aiValidationStatusMeta = {
    pending: {
      className: 'bg-yellow-100 text-yellow-700',
      label: '🟡 รอตรวจสอบ',
    },
    approved: {
      className: 'bg-green-100 text-green-700',
      label: '🟢 อนุมัติแล้ว',
    },
    rejected: {
      className: 'bg-red-100 text-red-700',
      label: '🔴 ปฏิเสธ',
    },
  } as const;

  const currentAiValidationStatus = aiValidationStatusMeta[aiValidationStatus];

  const renderPatientListForTab = (patientList: PatientRecord[], title: string) => {
    if (patientList.length === 0) {
      return (
        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="text-4xl mb-2">📋</div>
          <div className="text-sm">{labels.noPatientData[language]}</div>
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
            <button
              key={patient.id}
              type="button"
              className={`rounded-lg border p-3 hover:shadow-md transition-all cursor-pointer w-full text-left ${isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              onClick={() => handleViewPatient(patient)}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={patientPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(patient.id)}`}
                  alt={patientName}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{patientName}</h4>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {patientAge} {language === 'th' ? 'ปี' : 'yrs'} • {patientGender}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartConsultation(patient.id);
                  }}
                  className="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
                >
                  View
                </button>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderDiagnosisModalContent = (
    patientName: string,
    latestEMR: EMRRecord | null,
    allergies: string[],
    conditions: string[],
    medications: string[]
  ) => (
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
                conditions.map((condition) => (
                  <li key={`${condition}-${selectedPatient?.id || 'patient'}`}>• {condition}</li>
                ))
              ) : (
                <li className="text-gray-500">No chronic conditions recorded</li>
              )}
            </ul>
          </div>
          <div>
            <strong>Current Medications:</strong>
            <ul className="ml-4 mt-1 text-gray-700">
              {medications.length > 0 ? (
                medications.map((med) => (
                  <li key={`${med}-${selectedPatient?.id || 'patient'}`}>• {med}</li>
                ))
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
            latestEMR.diagnosis.map((dx, index) => (
              <div
                key={`${dx.code || dx.description}-${dx.type}`}
                className={`flex items-center justify-between p-2 rounded ${dx.type === 'primary' ? 'bg-green-50' : 'bg-gray-50'}`}
              >
                <span>{index + 1}. [{dx.code}] {dx.description}</span>
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
  );

  const renderTreatmentProtocolsContent = () => (
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
  );

  const renderTreatmentPrescribeContent = (medications: string[]) => (
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
            {medications.map((med) => (
              <div key={`${med}-${selectedPatient?.id || 'patient'}`} className="flex items-center justify-between p-2 bg-white rounded border">
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
  );

  const renderTreatmentHistoryContent = () => (
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
              <span className={`text-xs px-2 py-1 rounded ${getPrescriptionStatusClass(rx.status)}`}>
                {rx.status}
              </span>
            </div>

            <div className="space-y-2">
              {rx.medications?.map((med: any) => (
                <div
                  key={`${rx.id}-${med.name}-${med.strength}-${med.frequency}`}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
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
  );

  const renderTreatmentTabContent = (medications: string[]) => {
    if (treatmentTab === 'protocols') return renderTreatmentProtocolsContent();
    if (treatmentTab === 'prescribe') return renderTreatmentPrescribeContent(medications);
    return renderTreatmentHistoryContent();
  };

  const renderTreatmentPlanModalContent = (
    patientName: string,
    allergies: string[],
    medications: string[]
  ) => (
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

        <div className="p-4">{renderTreatmentTabContent(medications)}</div>
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
  );

  const renderSystemReportModalContent = (
    patientName: string,
    latestEMR: EMRRecord | null,
    selectedPatientEMRs: EMRRecord[]
  ) => (
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
  );

  const renderRadiologyModalContent = (
    patientName: string,
    latestEMR: EMRRecord | null,
    allergies: string[]
  ) => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">Patient: {patientName}</h3>
        <p className="text-sm text-blue-800">Imaging orders from EMR records</p>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Imaging Studies</h4>
        <div className="space-y-3">
          {latestEMR?.imagingOrders && latestEMR.imagingOrders.length > 0 ? (
            latestEMR.imagingOrders.map((orderId) => (
              <div key={String(orderId)} className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
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
  );

  const renderPathologyModalContent = (patientName: string) => (
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
  );

  const renderLaboratoryModalContent = (patientName: string) => (
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
                  {lab.tests.map((test) => (
                    <tr
                      key={`${test.code || test.name}-${test.result}-${test.unit}`}
                      className={test.abnormalFlag ? 'bg-red-50' : ''}
                    >
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
            onClick={() => onOrderLab?.()}
            className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Order Lab Tests
          </button>
        </div>
      )}
    </div>
  );

  // Render Health Studio Modal Content - Dynamic Data
  const renderStudioModalContent = () => {
    if (!studioModal) return null;

    // Get latest EMR for clinical data
    const sortedEMRs = [...selectedPatientEMRs].sort(
      (a, b) => new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime()
    );
    const latestEMR = sortedEMRs.length > 0 ? sortedEMRs[0] : null;

    // Support both flat structure (name) and nested structure (demographics.name)
    const patientName = selectedPatient?.demographics?.name || selectedPatient?.name || 'Select a patient';
    const allergies = selectedPatient?.medicalInfo?.allergies || [];
    const conditions = selectedPatient?.medicalInfo?.chronicConditions || [];
    const medications = selectedPatient?.medicalInfo?.currentMedications || [];

    const modalContent: Record<string, { title: string; content: React.ReactNode }> = {
      diagnosis: {
        title: '🔍 การวินิจฉัย / วินิจฉัยแยกโรค (Diagnosis & Differential)',
        content: renderDiagnosisModalContent(patientName, latestEMR, allergies, conditions, medications),
      },
      'treatment-plan': {
        title: '💊 แผนการรักษา (Treatment Plan / Prescribe)',
        content: renderTreatmentPlanModalContent(patientName, allergies, medications),
      },
      'system-report': {
        title: '📊 รายงานเวชระเบียน (Medical Record)',
        content: renderSystemReportModalContent(patientName, latestEMR, selectedPatientEMRs),
      },
      radiology: {
        title: '🩻 ภาพวินิจฉัยทางรังสีวิทยา (Radiological Imaging)',
        content: renderRadiologyModalContent(patientName, latestEMR, allergies),
      },
      pathology: {
        title: '🔬 รายงานทางพยาธิวิทยา (Pathology Reports)',
        content: renderPathologyModalContent(patientName),
      },
      laboratory: {
        title: '🧪 รายงานทางห้องปฏิบัติการ (Laboratory Results)',
        content: renderLaboratoryModalContent(patientName),
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
              aria-label="Close modal"
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

  // ============================================================================
  // EXTRACTED HELPERS - Reduce cognitive complexity (SonarQube S3776)
  // ============================================================================

  /** Theme class shorthand - each call is 0 complexity vs +1 for a ternary */
  const tc = (dark: string, light: string) => isDark ? dark : light;

  /** Lookup maps to replace conditional chains */
  const personFilterViewLabel: Record<PersonFilter, string> = {
    patient: labels.patient[language],
    doctor: labels.doctor[language],
    'healthcare-team': labels.team[language],
  };

  const aiValidationTabTitle: Record<string, string> = {
    summary: labels.aiHistorySummary[language],
    documents: labels.aiDocumentAnalysis[language],
    cds: labels.clinicalDecisionSupport[language],
  };

  const validationContentMap: Record<string, any> = {
    summary: aiHistorySummary,
    documents: aiDocuments,
    cds: cdsAlerts,
  };

  /** Meeting tab patient list - replaces 3-way && chain */
  const renderMeetingPatientList = () => {
    const tabConfig: Record<MeetingTab, { patients: PatientRecord[]; title: string }> = {
      investigation: { patients: investigationPatients, title: 'Investigation' },
      treatment: { patients: treatmentPatients, title: 'Treatment' },
      refer: { patients: referPatients, title: 'Refer' },
    };
    const { patients: pl, title } = tabConfig[meetingTab];
    return renderPatientListForTab(pl, title);
  };

  /** KPI Cards Grid */
  const renderKPICards = () => (
    <div className="grid grid-cols-2 md:grid-cols-7 gap-3" data-testid="doctor-dashboard-kpi">
      <button
        type="button"
        onClick={() => navigate(`/doctor/${doctor.id}/health-meeting`)}
        className={`p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-all text-left ${tc('bg-gradient-to-br from-blue-900 to-blue-800 border-blue-600 hover:border-blue-500', 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:border-blue-400')}`}
      >
        <div className={`text-2xl font-bold ${tc('text-blue-300', 'text-blue-700')}`}>{dashboardStats.todayAppointments}</div>
        <div className={`text-xs mt-1 ${tc('text-blue-400', 'text-blue-600')}`}>{labels.todayAppointments[language]}</div>
      </button>
      <div className={`p-4 rounded-lg border ${tc('bg-gradient-to-br from-green-900 to-green-800 border-green-600', 'bg-gradient-to-br from-green-50 to-green-100 border-green-200')}`}>
        <div className={`text-2xl font-bold ${tc('text-green-300', 'text-green-700')}`}>{dashboardStats.patientsSeen}</div>
        <div className={`text-xs mt-1 ${tc('text-green-400', 'text-green-600')}`}>{labels.patientsSeen[language]}</div>
      </div>
      <button
        type="button"
        onClick={() => navigate(`/doctor/${doctor.id}/health-meeting`)}
        className={`p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-all text-left ${tc('bg-gradient-to-br from-orange-900 to-orange-800 border-orange-600 hover:border-orange-500', 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:border-orange-400')}`}
      >
        <div className={`text-2xl font-bold ${tc('text-orange-300', 'text-orange-700')}`}>{dashboardStats.patientsInQueue}</div>
        <div className={`text-xs mt-1 ${tc('text-orange-400', 'text-orange-600')}`}>{labels.inQueue[language]}</div>
      </button>
      <div className={`p-4 rounded-lg border ${tc('bg-gradient-to-br from-purple-900 to-purple-800 border-purple-600', 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200')}`}>
        <div className={`text-2xl font-bold ${tc('text-purple-300', 'text-purple-700')}`}>{dashboardStats.pendingPrescriptions}</div>
        <div className={`text-xs mt-1 ${tc('text-purple-400', 'text-purple-600')}`}>{labels.pendingRx[language]}</div>
      </div>
      <div className={`p-4 rounded-lg border ${tc('bg-gradient-to-br from-pink-900 to-pink-800 border-pink-600', 'bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200')}`}>
        <div className={`text-2xl font-bold ${tc('text-pink-300', 'text-pink-700')}`}>{dashboardStats.unreadMessages}</div>
        <div className={`text-xs mt-1 ${tc('text-pink-400', 'text-pink-600')}`}>{labels.unreadMessages[language]}</div>
      </div>
      <div className={`p-4 rounded-lg border ${tc('bg-gradient-to-br from-cyan-900 to-cyan-800 border-cyan-600', 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200')}`}>
        <div className={`text-2xl font-bold ${tc('text-cyan-300', 'text-cyan-700')}`}>{dashboardStats.averageWaitTime}</div>
        <div className={`text-xs mt-1 ${tc('text-cyan-400', 'text-cyan-600')}`}>{labels.avgWait[language]}</div>
      </div>
      <button
        type="button"
        onClick={() => navigate(`/doctor/${doctor.id}/health-meeting`)}
        className={`p-4 rounded-lg border-2 relative cursor-pointer hover:shadow-lg transition-all text-left ${tc('bg-gradient-to-br from-amber-900 to-amber-800 border-amber-500 hover:border-amber-400', 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-400 hover:border-amber-500')}`}
      >
        <div className={`text-2xl font-bold ${tc('text-amber-300', 'text-amber-700')}`}>{dashboardStats.pendingConfirmations}</div>
        <div className={`text-xs mt-1 ${tc('text-amber-400', 'text-amber-600')}`}>{labels.needConfirmation[language]}</div>
        {dashboardStats.pendingConfirmations > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-xs text-white font-bold">!</span>
          </div>
        )}
      </button>
    </div>
  );

  /** Today's Meetings Quick View */
  const renderTodayMeetingsSection = () => {
    if (todayMeetings.length === 0) return null;
    return (
      <div className={`mt-4 rounded-xl border p-4 ${tc('bg-gradient-to-r from-emerald-900 to-teal-900 border-emerald-700', 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200')}`}>
        <h3 className={`text-lg font-bold mb-3 ${tc('text-emerald-300', 'text-emerald-800')}`}>📅 {labels.todayMeetings[language]} ({todayMeetings.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {todayMeetings.slice(0, 3).map((apt: any) => (
            <div key={apt.id} className={`rounded-lg p-3 shadow-sm border ${tc('bg-gray-800 border-emerald-700', 'bg-white border-emerald-100')}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${tc('text-white', 'text-gray-900')}`}>
                  ⏰ {apt.appointmentTime || apt.scheduledTime || apt.time || 'TBD'}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {apt.status}
                </span>
              </div>
              <div className={`text-sm ${tc('text-gray-200', 'text-gray-800')}`}>👤 {apt.patientName || labels.patient[language]}</div>
              <div className={`text-xs mt-1 ${tc('text-gray-400', 'text-gray-500')}`}>{apt.reason || 'Consultation'}</div>
              {apt.meetingLink && (
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/${doctor.id}/meeting/${apt.id}`)}
                  className="inline-flex items-center mt-2 px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                >
                  🎥 {labels.joinMeeting[language]}
                </button>
              )}
            </div>
          ))}
        </div>
        {todayMeetings.length > 3 && (
          <div className="text-center mt-3">
            <span className={`text-sm ${tc('text-emerald-400', 'text-emerald-600')}`}>+{todayMeetings.length - 3} {labels.moreMeetings[language]}</span>
          </div>
        )}
      </div>
    );
  };

  /** Upcoming Appointments Quick View */
  const renderUpcomingAppointmentsSection = () => {
    if (upcomingAppointments.length === 0) return null;
    return (
      <div className={`mt-4 rounded-xl border p-4 ${tc('bg-gradient-to-r from-blue-900 to-indigo-900 border-blue-700', 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200')}`}>
        <h3 className={`text-lg font-bold mb-3 ${tc('text-blue-300', 'text-blue-800')}`}>📋 {labels.upcomingAppointments[language]} ({upcomingAppointments.length})</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {upcomingAppointments.slice(0, 5).map((apt: any) => (
            <div key={apt.id} className={`flex items-center justify-between rounded-lg px-3 py-2 shadow-sm ${tc('bg-gray-800', 'bg-white')}`}>
              <div className="flex items-center gap-3">
                <div className={`text-sm font-medium ${tc('text-blue-400', 'text-blue-700')}`}>
                  📅 {apt.appointmentDate || apt.scheduledDate || apt.date}
                </div>
                <div className={`text-sm ${tc('text-gray-400', 'text-gray-600')}`}>
                  ⏰ {apt.appointmentTime || apt.scheduledTime || apt.time || 'TBD'}
                </div>
                <div className={`text-sm ${tc('text-gray-200', 'text-gray-800')}`}>
                  👤 {apt.patientName || labels.patient[language]}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {apt.meetingLink && (
                  <button
                    type="button"
                    onClick={() => navigate(`/doctor/${doctor.id}/meeting/${apt.id}`)}
                    className="text-xs text-emerald-600 hover:text-emerald-800"
                  >
                    🎥 Meet
                  </button>
                )}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMeetingStatusClass(apt.status)}`}>
                  {apt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /** AI Validation Tab Content - isLoadingAI + 3 tab conditionals */
  const renderAIValidationTabContent = () => {
    if (isLoadingAI) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          <span className={`ml-2 text-sm ${tc('text-gray-400', 'text-gray-500')}`}>{language === 'th' ? 'กำลังโหลด AI สรุป...' : 'Loading AI summary...'}</span>
        </div>
      );
    }
    if (aiValidationTab === 'summary') {
      return (
        <textarea
          value={aiHistorySummary}
          onChange={(e) => { setAiHistorySummary(e.target.value); setAiValidationStatus('pending'); }}
          placeholder={language === 'th' ? 'เลือกผู้ป่วยเพื่อดู AI สรุปประวัติอัตโนมัติ...' : 'Select a patient to view AI summary...'}
          aria-label="AI Patient History Summary"
          className={`w-full p-2 border rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${tc('bg-gray-700 border-gray-600 text-white placeholder-gray-400', 'bg-white border-gray-300 text-gray-900')}`}
          rows={6}
        />
      );
    }
    if (aiValidationTab === 'documents') {
      return (
        <div className="space-y-2">
          {aiDocuments.length > 0 ? (
            aiDocuments.map((doc) => (
              <div
                key={doc.id ?? doc.filename ?? `${doc.filename || 'doc'}-${doc.summary || ''}`}
                className="p-2 bg-gray-50 rounded border text-xs"
              >
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
      );
    }
    // cds tab
    return (
      <div className="space-y-2">
        {aiPreSummary?.aiTriage?.alertFlags?.length > 0 ? (
          aiPreSummary.aiTriage.alertFlags.map((alert: string) => (
            <div key={alert} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div className="text-yellow-800">{alert}</div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500 text-xs">
            <p>✅ ไม่มีข้อควรระวังพิเศษ</p>
          </div>
        )}
        {aiPreSummary?.aiTriage?.suggestedQuestions?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">💡 คำถามที่แนะนำ:</p>
            <ul className="space-y-1">
              {aiPreSummary.aiTriage.suggestedQuestions.map((q: string) => (
                <li key={q} className="text-xs text-gray-600 flex items-start">
                  <span className="mr-1">•</span> {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  /** Chat Messages Area */
  const renderChatMessagesArea = () => {
    if (chatMessages.length === 0) {
      return (
        <div className={`text-center py-4 text-xs ${tc('text-gray-400', 'text-gray-500')}`}>
          <p>👋 {language === 'th' ? 'สวัสดีครับ' : 'Hello'}, Dr. {doctor.name?.split(' ')[0]}!</p>
          <p className="mt-1">{language === 'th' ? 'พร้อมช่วยเหลือด้านคลินิก' : "I'm ready to assist with clinical questions."}</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-2 rounded-lg text-xs ${getChatBubbleClass(msg.role)}`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-2 rounded-lg rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-full flex flex-col overflow-y-auto overflow-x-hidden min-w-0 max-w-full ${tc('bg-gray-900', 'bg-gray-50')}`}>
      {/* ============================================================================ */}
      {/* DASHBOARD OVERVIEW - TOP KPI CARDS */}
      {/* ============================================================================ */}
      <div className={`px-3 sm:px-6 py-4 border-b min-w-0 ${tc('bg-gray-800 border-gray-700', 'bg-white border-gray-200')}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-2xl font-bold ${tc('text-white', 'text-gray-900')}`}>{labels.doctorDashboard[language]}</h1>
            <p className={`text-sm ${tc('text-gray-400', 'text-gray-600')}`}>{labels.welcomeBack[language]}, {doctor.name}</p>
          </div>
          <div className={`flex items-center space-x-2 text-sm ${tc('text-gray-400', 'text-gray-600')}`}>
            <CalendarDaysIcon className="w-5 h-5" />
            <span>{new Date().toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>

        {/* KPI Cards - Clickable to navigate to Appointments & Meetings */}
        {renderKPICards()}
        
        {/* Today's Meetings Quick View */}
        {renderTodayMeetingsSection()}
        
        {/* Upcoming Appointments Quick View */}
        {renderUpcomingAppointmentsSection()}
      </div>

      {/* ============================================================================ */}
      {/* 3-COLUMN LAYOUT: Health Data | Health Meeting | Health Studio */}
      {/* ============================================================================ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================================== */}
        {/* LEFT COLUMN: HEALTH DATA */}
        {/* ========================================================================== */}
        <div className={`w-80 flex flex-col border-r ${tc('bg-gray-800 border-gray-700', 'bg-white border-gray-200')}`}>
          <div className={`p-4 border-b ${tc('bg-emerald-900 border-emerald-700', 'bg-emerald-50 border-emerald-200')}`}>
            <h2 className={`text-lg font-bold ${tc('text-emerald-300', 'text-emerald-700')}`}>{labels.healthData[language]}</h2>
            <p className={`text-xs ${tc('text-emerald-400', 'text-emerald-600')}`}>{labels.patientQueueRecords[language]}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4" data-testid="doctor-dashboard-queue">
            <div className="space-y-2">
              {queue.map((patient, idx) => (
                <button
                  key={patient.id}
                  onClick={() => handleViewPatient(patient)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${getQueueItemClass(patient)}`}
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

          <div className={`p-4 border-t space-y-2 ${tc('border-gray-700', 'border-gray-200')}`}>
            <button 
              className="w-full py-2 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              title="ดึงข้อมูลการรักษาเดิมย้อนหลัง นำมาสรุปเพื่อเป็น input ให้แพทย์"
            >
              <span className="block">🔍 ค้นหาประวัติการรักษา</span>
              <span className="block text-xs opacity-80">{labels.searchPastRecords[language]}</span>
            </button>
            <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              {labels.viewAllPatients[language]}
            </button>
          </div>
        </div>

        {/* ========================================================================== */}
        {/* MIDDLE COLUMN: HEALTH MEETING */}
        {/* ========================================================================== */}
        <div className={`flex-1 flex flex-col overflow-hidden ${tc('bg-gray-900', 'bg-gray-50')}`}>
          <div className={`p-4 border-b ${tc('bg-purple-900 border-purple-700', 'bg-purple-50 border-purple-200')}`}>
            <h2 className={`text-lg font-bold ${tc('text-purple-300', 'text-purple-700')}`}>{labels.healthMeeting[language]}</h2>
            <p className={`text-xs ${tc('text-purple-400', 'text-purple-600')}`}>{labels.videoConsultation[language]}</p>
          </div>

          {/* Meeting Area */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Person Filter Tabs */}
            <div className={`rounded-lg shadow-sm mb-3 ${tc('bg-gray-800', 'bg-white')}`}>
              <div className={`flex border-b ${tc('border-gray-700', 'border-gray-200')}`}>
                <button
                  onClick={() => setPersonFilter('patient')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${getPersonFilterTabClass(personFilter === 'patient')}`}
                >
                  {labels.patient[language]}
                </button>
                <button
                  onClick={() => setPersonFilter('doctor')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${getPersonFilterTabClass(personFilter === 'doctor')}`}
                >
                  {labels.doctor[language]}
                </button>
                <button
                  onClick={() => setPersonFilter('healthcare-team')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${getPersonFilterTabClass(personFilter === 'healthcare-team')}`}
                >
                  {labels.team[language]}
                </button>
              </div>

              {/* Video Meeting Area */}
              <div className={`p-4 ${tc('bg-gradient-to-br from-blue-900/50 to-indigo-900/50', 'bg-gradient-to-br from-blue-50 to-indigo-50')} min-h-[180px]`}>
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <VideoCameraIcon className={`w-12 h-12 mx-auto mb-2 ${tc('text-gray-500', 'text-gray-400')}`} />
                    <p className={`text-sm font-medium mb-2 ${tc('text-gray-300', 'text-gray-600')}`}>
                      {language === 'th' ? 'ปรึกษาผ่านวิดีโอ' : 'Video Consultation'}
                      {` - ${personFilterViewLabel[personFilter]} View`}
                    </p>
                    <button
                      onClick={() => navigate(`/doctor/${doctor.id}/health-meeting`)}
                      data-testid="start-video-call"
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2 mx-auto"
                      title="Go to Meeting Room"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {labels.startVideoCall[language]}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Areas - Enhanced with Man-in-the-Loop Validation (Phase 1 DR-05) */}
            <div className={`rounded-lg shadow-sm p-3 mb-3 ${tc('bg-gray-800', 'bg-white')}`}>
              {/* Tab Navigation for AI Content */}
              <div className={`flex border-b mb-3 ${tc('border-gray-700', 'border-gray-200')}`}>
                <button
                  onClick={() => setAiValidationTab('summary')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${getAiValidationTabClass(aiValidationTab === 'summary')}`}
                >
                  📋 {language === 'th' ? 'สรุปประวัติ' : 'Summary'}
                </button>
                <button
                  onClick={() => setAiValidationTab('documents')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${getAiValidationTabClass(aiValidationTab === 'documents')}`}
                >
                  📄 {language === 'th' ? 'วิเคราะห์เอกสาร' : 'Documents'}
                </button>
                <button
                  onClick={() => setAiValidationTab('cds')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors relative ${getAiValidationTabClass(aiValidationTab === 'cds')}`}
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
                  <h3 className={`text-sm font-bold ${tc('text-purple-300', 'text-purple-700')}`}>
                    {aiValidationTabTitle[aiValidationTab]}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${currentAiValidationStatus.className}`}>
                  {currentAiValidationStatus.label}
                </span>
              </div>

              {/* AI Content Display */}
              {renderAIValidationTabContent()}

              {/* Man-in-the-Loop Validation Buttons (DR-05) */}
              <div className={`flex items-center justify-between mt-3 pt-3 border-t ${tc('border-gray-700', 'border-gray-200')}`}>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAIValidation('approved')}
                    disabled={!aiHistorySummary && aiValidationTab === 'summary'}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    ✅ {labels.approve[language]}
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt(language === 'th' ? 'กรุณาระบุเหตุผลในการปฏิเสธ:' : 'Please provide rejection reason:');
                      if (reason) handleAIValidation('rejected', reason);
                    }}
                    disabled={!aiHistorySummary && aiValidationTab === 'summary'}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    ❌ {labels.reject[language]}
                  </button>
                </div>
                <button
                  onClick={handleUseInEMR}
                  disabled={aiValidationStatus !== 'approved'}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  📝 {labels.useInEMR[language]}
                </button>
              </div>
            </div>

            {/* Meeting AI Summary - Real-time during video */}
            <div className={`rounded-lg shadow-sm p-3 ${tc('bg-gray-800', 'bg-white')}`}>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                </div>
                <h3 className={`text-sm font-bold ${tc('text-purple-300', 'text-purple-700')}`}>{labels.aiMeetingSummary[language]}</h3>
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Transcript</span>
                {meetingPipelineStatus && !meetingPipelineStatus.includes('พร้อมแล้ว') && !meetingPipelineStatus.toLowerCase().includes('ready') && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      meetingPipelineStatus.includes('ยังไม่พร้อม') || meetingPipelineStatus.includes('unavailable')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}
                    data-testid="meeting-pipeline-status"
                  >
                    {meetingPipelineStatus}
                  </span>
                )}
              </div>
              <textarea
                value={aiMeetingSummary}
                onChange={(e) => setAiMeetingSummary(e.target.value)}
                placeholder={language === 'th' ? 'AI จะสรุปจากการถอดเสียงระหว่าง Video Consultation...' : 'AI will summarize from video transcription...'}
                aria-label="AI Meeting Summary"
                data-testid="dashboard-meeting-ai-summary"
                className={`w-full p-2 border rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${tc('bg-gray-700 border-gray-600 text-white placeholder-gray-400', 'bg-white border-gray-300 text-gray-900')}`}
                rows={4}
              />
              <button
                type="button"
                onClick={handleInsertMeetingSummaryToEMR}
                disabled={!aiMeetingSummary.trim() || !selectedPatientId}
                data-testid="insert-meeting-summary-emr-btn"
                className="mt-2 w-full px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                📝 {language === 'th' ? 'ใส่สรุปการประชุมใน EMR' : 'Insert meeting summary into EMR'}
              </button>
              {selectedPatientId && (() => {
                const recentCompleted = getRecentCompletedAppointments(doctorAppointments).find(
                  (apt) => (apt.patientId || apt.patient_id) === selectedPatientId,
                );
                if (!recentCompleted?.id) return null;
                return (
                  <a
                    href={`/doctor/${doctor.id}/meeting/${recentCompleted.id}/results`}
                    data-testid="view-full-meeting-results-link"
                    className="mt-2 block w-full text-center px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
                  >
                    {language === 'th' ? 'ดูผลการประชุมเต็มรูปแบบ' : 'View full meeting results'}
                  </a>
                );
              })()}
            </div>
          </div>

          {/* Bottom Tabs - Patient Lists */}
          <div className={`border-t ${tc('bg-gray-800 border-gray-700', 'bg-white border-gray-200')}`}>
            <div className={`flex border-b ${tc('border-gray-700', 'border-gray-200')}`}>
              <button
                onClick={() => setMeetingTab('investigation')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${getMeetingTabClass(meetingTab === 'investigation')}`}
              >
                {labels.investigation[language]} ({investigationPatients.length})
              </button>
              <button
                onClick={() => setMeetingTab('treatment')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${getMeetingTabClass(meetingTab === 'treatment')}`}
              >
                {labels.treatment[language]} ({treatmentPatients.length})
              </button>
              <button
                onClick={() => setMeetingTab('refer')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${getMeetingTabClass(meetingTab === 'refer')}`}
              >
                {labels.refer[language]} ({referPatients.length})
              </button>
            </div>

            <div className="p-3 max-h-48 overflow-y-auto">
              {renderMeetingPatientList()}
            </div>
          </div>
        </div>

        {/* ========================================================================== */}
        {/* RIGHT COLUMN: HEALTH STUDIO */}
        {/* ========================================================================== */}
        <div className={`w-96 flex flex-col border-l ${tc('bg-gray-800 border-gray-700', 'bg-white border-gray-200')}`}>
          <div className={`p-4 border-b ${tc('bg-teal-900 border-teal-700', 'bg-teal-50 border-teal-200')}`}>
            <h2 className={`text-lg font-bold ${tc('text-teal-300', 'text-teal-700')}`}>{labels.healthStudio[language]}</h2>
            <p className={`text-xs ${tc('text-teal-400', 'text-teal-600')}`}>{labels.clinicalTools[language]}</p>
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
          <div className={`border-t ${tc('border-gray-700 bg-gradient-to-br from-blue-900/50 to-purple-900/50', 'border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50')}`}>
            <div className={`p-3 border-b ${tc('border-blue-800', 'border-blue-200')}`}>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${tc('text-blue-300', 'text-blue-900')}`}>{labels.aiClinicalAssistant[language]}</h3>
                  <p className={`text-xs ${tc('text-blue-400', 'text-blue-600')}`}>{labels.askAnything[language]}</p>
                </div>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className={`p-3 max-h-60 overflow-y-auto ${tc('bg-gray-900/50', 'bg-white/50')}`}>
              {renderChatMessagesArea()}
            </div>

            {/* Chat Input */}
            <div className={`p-3 pb-16 border-t ${tc('border-blue-800', 'border-blue-200')}`}>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChatMessage()}
                  placeholder={language === 'th' ? 'ถามเกี่ยวกับอาการ, ยา, แนวทางการรักษา...' : 'Ask about symptoms, drugs, protocols...'}
                  aria-label="AI Clinical Assistant chat input"
                  className={`flex-1 px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${tc('bg-gray-700 border-gray-600 text-white placeholder-gray-400', 'bg-white border-blue-200 text-gray-900')}`}
                  disabled={isChatLoading}
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
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

