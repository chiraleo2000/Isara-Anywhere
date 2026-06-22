/**
 * Health Meeting Page - Combined Appointments & Meetings Management
 * 
 * WORKFLOW (per Appointment_Workflows.md):
 * 1. Patient creates appointment → status: 'pending' or 'in_pool' (if system-assigned)
 * 2. Admin/Doctor sees appointment in "Patient Queue" tab (ALL pending appointments, not just today)
 * 3. Admin/Doctor confirms date/time → status: 'confirmed' → moves to "Scheduled Meetings"
 * 
 * Features:
 * - Patient Queue: Shows ALL appointments awaiting confirmation (pending, in_pool, awaiting_doctor_response)
 * - Scheduled Meetings: Confirmed appointments with meeting links
 * - All Appointments (Admin only): Full list with search/filter
 * 
 * UPDATED: Now uses PostgreSQL backend via apiDataService - NO GCS!
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, QueuePatient } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { useResponsive } from '../../hooks/useResponsive';
import { getToken } from '../../services/authServices';
import { doctorDataService } from '../../services/doctorDataService';
// PostgreSQL-backed API service - NO GCS!
import {
  fetchAllAppointments,
  fetchAllDoctors,
  saveAllAppointments,
  saveAppointment,
  clearCache,
  fetchDashboardData as fetchDoctorQueue,
  confirmAppointment as confirmAppointmentApi,
  adminAssignAppointment,
} from '../../services/apiDataService';
import appointmentService from '../../services/appointmentService';
import {
  VideoCameraIcon,
  CalendarIcon,
  SearchIcon,
} from '../../assets/NewSvgIcons';
import MeetingResults from './MeetingResults';
import { resolveJitsiDomain, stableRoomNameForAppointment } from '../../utils/jitsiMeetingConfig';
import { resolveMeetingServerUrl } from '../../utils/resolveMeetingServerUrl';
import { splitQueueSections } from '../../utils/appointmentPoolQuery';

const meetingServerBase = () => resolveMeetingServerUrl();

// ============================================================================
// ADMIN INTERFACES
// ============================================================================

interface DoctorOption {
  id: string;
  name: string;
  email: string;
  specialty?: string;
}

interface AppointmentRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  requestedDate: string;
  preferredTime?: string;
  preferredDates?: string[];
  preferredTimeSlot?: string;
  reason: string;
  symptoms?: string[];
  symptomDescription?: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  status: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedDateTime?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  poolStatus?: string;
  requiredSpecialty?: string;
  // Additional optional properties for compatibility
  email?: string;
  appointmentDate?: string;
  date?: string;
  appointmentTime?: string;
  time?: string;
  /** Postgres API snake_case aliases */
  patient_id?: string;
  patient_name?: string;
  confirmedBy?: string;
  confirmedByEmail?: string;
  confirmedAt?: string;
  acceptedBy?: string;
  acceptedByEmail?: string;
  acceptedAt?: string;
  queueVisibility?: string;
  doctorMeetingUrl?: string;
  patientMeetingUrl?: string;
  guestMeetingUrl?: string;
  meetLink?: string;
  jitsiRoomName?: string;
}

interface MeetingServerCreateResponse {
  urls?: { doctor?: string; patient?: string; guest?: string };
  meeting?: { doctor_url?: string; patient_url?: string; guest_url?: string; room_name?: string };
  roomName?: string;
}

// ============================================================================
// ORIGINAL INTERFACES
// ============================================================================

interface HealthMeetingProps {
  doctor: User;
}

type ParticipantRole = 'patient' | 'doctor' | 'consultant';
type ParticipantStatus = 'available' | 'busy' | 'offline';
type MeetingType = 'consultation' | 'follow-up' | 'team-meeting' | 'referral';
type MeetingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

interface MeetingParticipant {
  id: string;
  name: string;
  role: ParticipantRole;
  specialty?: string;
  email: string;
  phone: string;
  photo: string;
  status: ParticipantStatus;
}

interface ScheduledMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number; // minutes
  meetingLink: string;
  // Jitsi Meet URLs for different participants
  doctorMeetingUrl?: string;  // Doctor joins as host
  patientMeetingUrl?: string; // Patient URL
  guestMeetingUrl?: string;   // For family/consultants
  jitsiRoomName?: string;     // Room name for tracking
  participants: MeetingParticipant[];
  type: MeetingType;
  status: MeetingStatus;
  notes?: string;
}

// Tab type definition - Removed 'patient-pool' as it's merged with 'queue'
type TabType = 'queue' | 'meetings' | 'all-appointments';
type MobileSection = 'queue' | 'today' | 'actions';

interface PhrPreviewSummary {
  allergies: string[];
  medsCount: number;
  loading: boolean;
  error?: boolean;
}

const PhrPreviewMiniCard: React.FC<{ patientId?: string; className?: string }> = ({ patientId, className = '' }) => {
  const [preview, setPreview] = useState<PhrPreviewSummary>({ allergies: [], medsCount: 0, loading: Boolean(patientId) });

  useEffect(() => {
    if (!patientId) {
      setPreview({ allergies: [], medsCount: 0, loading: false });
      return;
    }
    let cancelled = false;
    const token = getToken();
    setPreview({ allergies: [], medsCount: 0, loading: true });
    fetch(`/api/phr/${patientId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) {
          if (!cancelled) setPreview({ allergies: [], medsCount: 0, loading: false, error: true });
          return;
        }
        const allergiesRaw = data.allergies || data.phr?.allergies || [];
        const allergies = (Array.isArray(allergiesRaw) ? allergiesRaw : []).map((a: unknown) => {
          if (typeof a === 'string') return a;
          if (a && typeof a === 'object' && 'allergen' in a) return String((a as { allergen: string }).allergen);
          return '';
        }).filter(Boolean);
        const meds = data.medications || data.phr?.medications || [];
        setPreview({ allergies, medsCount: Array.isArray(meds) ? meds.length : 0, loading: false });
      })
      .catch(() => {
        if (!cancelled) setPreview({ allergies: [], medsCount: 0, loading: false, error: true });
      });
    return () => { cancelled = true; };
  }, [patientId]);

  if (!patientId) return null;

  let previewBody: React.ReactNode;
  if (preview.loading) {
    previewBody = <p className="text-emerald-600">Loading PHR…</p>;
  } else if (preview.error) {
    previewBody = <p className="text-gray-500">PHR unavailable</p>;
  } else {
    previewBody = (
      <div className="space-y-0.5 text-emerald-900">
        <p>
          <span className="font-medium">Allergies:</span>{' '}
          {preview.allergies.length > 0 ? preview.allergies.slice(0, 3).join(', ') : 'None recorded'}
        </p>
        <p><span className="font-medium">Meds:</span> {preview.medsCount}</p>
      </div>
    );
  }

  return (
    <div
      data-testid="phr-preview-mini-card"
      className={`rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs ${className}`}
    >
      <p className="font-semibold text-emerald-800 mb-1">PHR Preview</p>
      {previewBody}
    </div>
  );
};

/** Clear the queue toast after a delay (module-level to avoid deep callback nesting). */
const scheduleToastClear = (setter: (value: string | null) => void) => {
  globalThis.setTimeout(() => setter(null), 5000);
};

/** Active/inactive class for the mobile section tabs (avoids nested ternary). */
const mobileTabClass = (active: boolean, isDark: boolean): string => {
  if (active) return 'bg-emerald-600 text-white';
  return isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600';
};

const isAppointmentToday = (apt: { appointmentDate?: string; scheduledDate?: string; requestedDate?: string; date?: string }) => {
  const raw = apt.appointmentDate || apt.scheduledDate || apt.requestedDate || apt.date;
  if (!raw) return false;
  const d = new Date(raw);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// i18n labels for Health Meeting page
const labels = {
  pageTitle: { en: 'Health Meeting', th: 'การประชุมสุขภาพ' },
  patientQueue: { en: 'Patient Queue', th: 'คิวผู้ป่วย' },
  scheduledMeetings: { en: 'Scheduled Meetings', th: 'การประชุมที่กำหนด' },
  allAppointments: { en: 'All Appointments', th: 'การนัดหมายทั้งหมด' },
  search: { en: 'Search patients...', th: 'ค้นหาผู้ป่วย...' },
  refresh: { en: 'Refresh', th: 'รีเฟรช' },
  confirm: { en: 'Confirm', th: 'ยืนยัน' },
  decline: { en: 'Decline', th: 'ปฏิเสธ' },
  pending: { en: 'Pending', th: 'รอดำเนินการ' },
  confirmed: { en: 'Confirmed', th: 'ยืนยันแล้ว' },
  joinMeeting: { en: 'Join Meeting', th: 'เข้าร่วมประชุม' },
};

// Helper: get inactive tab class based on dark mode
const inactiveTabClass = (isDark: boolean) =>
  isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50';

// Helper: get inactive admin tab class
const inactiveAdminTabClass = (isDark: boolean) =>
  isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-indigo-400' : 'bg-white text-gray-700 hover:bg-gray-50 border border-indigo-200';

// Dark mode class helpers
const hmDarkText = (isDark: boolean) => isDark ? 'text-white' : 'text-gray-900';
const hmDarkSubtext = (isDark: boolean) => isDark ? 'text-gray-400' : 'text-gray-600';
const hmDarkCard = (isDark: boolean) => isDark ? 'bg-gray-800' : 'bg-white';

const HealthMeeting: React.FC<HealthMeetingProps> = ({ doctor }) => {
  const { theme } = useSettings();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [mobileSection, setMobileSection] = useState<MobileSection>('queue');
  const [queueToast, setQueueToast] = useState<string | null>(null);

  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [loading, setLoading] = useState(true);

  // Check if current user is admin - MULTIPLE CHECKS
  const isAdmin = !!(
    doctor.isAdmin === true ||
    doctor.role === 'admin' ||
    String(doctor.isAdmin) === 'true' ||
    doctor.email?.includes('admin')
  );

  // DEBUG: Log admin status
  console.log('[HealthMeeting] 🔐 Admin Detection:', {
    'doctor.isAdmin': doctor.isAdmin,
    'doctor.role': doctor.role,
    'doctor.email': doctor.email,
    'FINAL isAdmin': isAdmin
  });

  // Patient Queue State - Now shows ALL pending appointments (not just today's in-clinic queue)
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [pendingQueue, setPendingQueue] = useState<AppointmentRequest[]>([]); // All pending appointments awaiting confirmation
  const [acceptedQueue, setAcceptedQueue] = useState<AppointmentRequest[]>([]); // Recently accepted (confirmed today)
  const [queueLoadError, setQueueLoadError] = useState<string | null>(null);
  // Queue statistics - pendingConfirmation tracked via pendingQueue.length directly
  const [skipReason, setSkipReason] = useState('');
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [selectedQueuePatient, setSelectedQueuePatient] = useState<QueuePatient | null>(null);

  // Appointment confirmation state - pendingAppointments displayed via pendingQueue directly
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Using AppointmentRequest type for consistency
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRequest | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmDate, setConfirmDate] = useState(''); // For admin/doctor to set/change date
  const [confirmTime, setConfirmTime] = useState(''); // For admin/doctor to set/change time

  // Email recipient selection state
  const [emailRecipients, setEmailRecipients] = useState({
    sendToPatient: true,
    sendToDoctor: true,
    additionalEmails: '' // Comma-separated additional emails
  });

  // Admin-only state: All Appointments (removed patientPool - merged into pendingQueue)
  const [allAppointments, setAllAppointments] = useState<AppointmentRequest[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<DoctorOption[]>();

  // Admin assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPoolRequest, setSelectedPoolRequest] = useState<AppointmentRequest | null>(null);
  const [assignData, setAssignData] = useState({
    doctorId: '',
    date: '',
    time: '',
    notes: ''
  });

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmInProgress, setConfirmInProgress] = useState(false);
  const [assignInProgress, setAssignInProgress] = useState(false);

  // Meeting Results (Teams-like recording viewer)
  const [showMeetingResults, setShowMeetingResults] = useState(false);
  const [meetingResultsId, setMeetingResultsId] = useState<string>('');

  // Pre-consultation AI summary
  const [preConsultData, setPreConsultData] = useState<Record<string, any>>({});
  const [preConsultLoading, setPreConsultLoading] = useState<string | null>(null);

  const symptomToString = (v: unknown): string => {
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    return '';
  };

  const riskToString = (r: unknown): string => {
    if (r == null) return '';
    if (typeof r === 'string' || typeof r === 'number' || typeof r === 'boolean') return String(r);
    if (typeof r === 'object' && r !== null && 'risk' in r) {
      const riskVal = (r as { risk?: unknown }).risk;
      if (typeof riskVal === 'string' || typeof riskVal === 'number' || typeof riskVal === 'boolean') {
        return String(riskVal);
      }
    }
    try {
      return JSON.stringify(r);
    } catch {
      return '';
    }
  };

  const normalizeSymptoms = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(symptomToString).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (Array.isArray(obj.list)) return obj.list.map(symptomToString).filter(Boolean);
      if (typeof obj.main === 'string') return [obj.main];
      return Object.values(obj)
        .filter((v): v is string | number | boolean => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        .map(String)
        .filter(Boolean);
    }
    return [];
  };

  const startInAppMeeting = (appointmentId: string) => {
    navigate(`/doctor/${doctor.id}/meeting/${appointmentId}`);
  };

  const handlePreConsultation = async (apt: any) => {
    const aptId = apt.id;
    setPreConsultLoading(aptId);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const resp = await fetch(`${meetingServerBase()}/api/ai/pre-consultation-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ patientId: apt.patientId || apt.patient_id, appointmentId: aptId }),
      });
      const data = await resp.json();
      if (data.success) {
        setPreConsultData(prev => ({ ...prev, [aptId]: data.structured || data.summary }));
      }
    } catch (e) {
      console.error('[HealthMeeting] Pre-consultation failed:', e);
    } finally {
      setPreConsultLoading(null);
    }
  };

  // Load on mount + real-time refresh when patients book or admin assigns (PG NOTIFY → Socket.IO)
  useEffect(() => {
    console.log('[HealthMeeting] 🔄 Component mounted, loading data...');
    loadAllData();

    let socket: { on: (e: string, fn: (...args: unknown[]) => void) => void; emit: (e: string, ...args: unknown[]) => void; disconnect: () => void } | null = null;
    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const backendUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
          || globalThis.location?.origin
          || '';
        socket = io(backendUrl, { path: '/ws', transports: ['websocket', 'polling'], reconnectionDelay: 3000 });

        socket.on('connect', () => {
          console.log('[HealthMeeting] 🔌 Socket.IO connected');
          const activeSocket = socket;
          if (!activeSocket) return;
          if (doctor.id) {
            activeSocket.emit('join-doctor-room', doctor.id);
            activeSocket.emit('join-queue-room', doctor.id);
          }
          activeSocket.emit('join', 'admin-notifications');
        });

        const reload = () => {
          console.log('[HealthMeeting] 📩 realtime event — reloading queue');
          setQueueToast('คิวนัดหมายอัปเดตแล้ว — กำลังโหลดข้อมูลใหม่');
          loadAllData();
          scheduleToastClear(setQueueToast);
        };
        socket.on('pool-updated', reload);
        socket.on('appointment:created', reload);
        socket.on('appointment-created', reload);
        socket.on('appointment:updated', reload);
        socket.on('data:changed', (payload: { table?: string }) => {
          if (payload?.table === 'appointments') reload();
        });
      } catch (err) {
        console.warn('[HealthMeeting] Socket.IO unavailable:', err);
      }
    };
    connectSocket();

    return () => { socket?.disconnect(); };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log('👨‍⚕️ [loadAllData] Starting data load for doctor:', {
        id: doctor.id,
        email: doctor.email,
        name: doctor.name,
        isAdmin: isAdmin
      });

      // CRITICAL CHECK: Verify user has proper ID (but allow admin even without ID)
      if (!doctor.id && !doctor.email && !isAdmin) {
        console.error('❌ CRITICAL: Doctor has no ID or email! User session may be invalid.');
        setErrorMessage('Your user session is invalid. Please log out and log back in.');
        setLoading(false);
        return;
      }

      // Clear appointment cache to ensure fresh data
      clearCache('appointments');

      // Load pending queue (ALL pending appointments) and scheduled meetings
      const loadTasks = [loadPendingQueue(), loadPendingAppointments()];

      // Admin gets additional data: All Appointments list and doctors
      if (isAdmin) {
        loadTasks.push(loadAllAppointmentsData(), loadAvailableDoctors());
      }

      await Promise.all(loadTasks);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Map raw appointment data to AppointmentRequest
  const mapRawToAppointmentRequest = (apt: any): AppointmentRequest => {
    const normalizedSymptoms = normalizeSymptoms(apt.symptoms);
    return ({
    id: apt.id,
    patientId: apt.patientId || apt.patient_id || apt.userId || '',
    patientName: apt.patientName || apt.patient_name || apt.patient_name_thai || apt.user?.name || 'Unknown Patient',
    patientEmail: apt.patientEmail || apt.patient_email || apt.email || '',
    patientPhone: apt.patientPhone || apt.patient_phone || apt.phone,
    requestedDate: apt.appointmentDate || apt.appointment_date || apt.requested_date || apt.date || apt.preferredDates?.[0] || new Date().toISOString(),
    preferredTime: apt.appointmentTime || apt.appointment_time || apt.requested_time || apt.time || apt.preferredTimeSlot || '',
    preferredDates: apt.preferredDates || apt.preferred_dates || [],
    preferredTimeSlot: apt.preferredTimeSlot || apt.preferred_time_slot || '',
    reason: apt.reason || apt.mainSymptom || apt.main_symptom || normalizedSymptoms.join(', ') || 'Consultation',
    symptoms: normalizedSymptoms,
    symptomDescription: apt.symptomDescription || apt.symptom_description || apt.aiAnalysis || apt.ai_analysis || '',
    urgency: apt.urgency || 'normal',
    status: apt.status || 'pending',
    assignedDoctorId: apt.assignedDoctorId || apt.doctor_id || apt.doctorId,
    assignedDoctorName: apt.assignedDoctorName || apt.doctor_name || apt.doctorName,
    confirmedBy: apt.confirmedBy || apt.acceptedBy,
    confirmedByEmail: apt.confirmedByEmail || apt.acceptedByEmail,
    confirmedAt: apt.confirmedAt || apt.acceptedAt || apt.confirmed_at,
    acceptedBy: apt.acceptedBy || apt.confirmedBy,
    acceptedByEmail: apt.acceptedByEmail || apt.confirmedByEmail,
    acceptedAt: apt.acceptedAt || apt.confirmedAt || apt.confirmed_at,
    queueVisibility: apt.queueVisibility || (apt.status === 'confirmed' ? 'accepted' : 'pending'),
    createdAt: apt.createdAt || apt.created_at || new Date().toISOString(),
    updatedAt: apt.updatedAt || apt.updated_at,
    notes: apt.notes || '',
    requiredSpecialty: apt.requiredSpecialty || apt.required_specialty || apt.suggestedSpecialty || apt.suggested_specialty || '',
    poolStatus: apt.poolStatus || apt.pool_status || 'pending',
    doctorMeetingUrl: apt.doctorMeetingUrl || apt.doctor_meeting_url,
    patientMeetingUrl: apt.patientMeetingUrl || apt.patient_meeting_url || apt.meetLink || apt.meet_link,
    guestMeetingUrl: apt.guestMeetingUrl || apt.guest_meeting_url,
    meetLink: apt.meetLink || apt.meet_link || apt.meetingLink,
    jitsiRoomName: apt.jitsiRoomName || apt.jitsi_room_name,
    appointmentDate: apt.confirmedDate || apt.confirmed_date || apt.appointmentDate || apt.requested_date,
    appointmentTime: apt.confirmedTime || apt.confirmed_time || apt.appointmentTime || apt.requested_time,
  });
  };

  // Helper: Check if appointment is assigned to current doctor
  const isAssignedToCurrentDoctor = (apt: any): boolean => {
    // Doctors should still see unassigned pool requests so they can claim/accept from queue workflows.
    if (!apt.doctorId && !apt.doctor_id && !apt.assignedDoctorId && !apt.adminAssignedDoctorId) return true;
    const doctorIdentifier = doctor.id || doctor.email;
    return apt.doctorId === doctorIdentifier ||
      apt.doctor_id === doctorIdentifier ||
      apt.assignedDoctorId === doctorIdentifier ||
      apt.adminAssignedDoctorId === doctorIdentifier ||
      apt.confirmedBy === doctorIdentifier ||
      apt.acceptedBy === doctorIdentifier ||
      apt.confirmedByEmail === doctor.email ||
      apt.acceptedByEmail === doctor.email ||
      apt.doctorEmail === doctor.email ||
      apt.assignedDoctorEmail === doctor.email;
  };

  const convertToScheduledMeetings = (acceptedRequests: AppointmentRequest[]): ScheduledMeeting[] => {
    const converted = acceptedRequests.map((apt) => {
      const patientParticipant: MeetingParticipant = {
        id: apt.patientId || 'unknown',
        name: apt.patientName || 'Unknown Patient',
        role: 'patient',
        email: apt.patientEmail || 'N/A',
        phone: apt.patientPhone || 'N/A',
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(apt.patientId || 'patient')}`,
        status: 'available',
      };
      const doctorParticipant: MeetingParticipant = {
        id: doctor.id,
        name: doctor.name || 'Dr. ' + doctor.email?.split('@')[0] || 'Doctor',
        role: 'doctor',
        specialty: doctor.specialty || 'General Practice',
        email: doctor.email || '',
        phone: '',
        photo: doctor.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(doctor.id)}`,
        status: 'available',
      };
      const rawDate = apt.appointmentDate || apt.requestedDate || apt.date || new Date().toISOString();
      const appointmentDate = String(rawDate).split('T')[0];
      const appointmentTime = apt.appointmentTime || apt.preferredTime || apt.time || '09:00';
      const aptAny = apt as AppointmentRequest & {
        doctorMeetingUrl?: string;
        patientMeetingUrl?: string;
        guestMeetingUrl?: string;
        meetLink?: string;
        jitsiRoomName?: string;
      };
      return {
        id: apt.id,
        title: apt.reason || normalizeSymptoms(apt.symptoms).join(', ') || 'Medical Consultation',
        date: appointmentDate,
        time: appointmentTime,
        duration: 30,
        meetingLink: aptAny.doctorMeetingUrl || aptAny.meetLink || `https://${resolveJitsiDomain()}/${aptAny.jitsiRoomName || stableRoomNameForAppointment(apt.id)}`,
        doctorMeetingUrl: aptAny.doctorMeetingUrl,
        patientMeetingUrl: aptAny.patientMeetingUrl || aptAny.meetLink,
        guestMeetingUrl: aptAny.guestMeetingUrl,
        jitsiRoomName: aptAny.jitsiRoomName,
        participants: [patientParticipant, doctorParticipant],
        type: getMeetingType(apt),
        status: getMeetingStatus(apt.status),
        notes: apt.notes || apt.symptomDescription || normalizeSymptoms(apt.symptoms).join(', ') || '',
      };
    });
    converted.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    return converted;
  };

  /** Assigned doctor confirms; admin only triages (assign), not confirm on doctor's behalf */
  const canConfirmAppointment = (request: AppointmentRequest): boolean => {
    if (isAdmin) {
      if (request.status === 'awaiting_doctor_response' && request.assignedDoctorId) {
        return false;
      }
      return request.status === 'in_pool' || request.status === 'pending';
    }
    return (
      isAssignedToCurrentDoctor(request) &&
      ['awaiting_doctor_response', 'pending', 'assigned', 'in_pool'].includes(request.status)
    );
  };

  // Load Pending Queue - ALL appointments awaiting confirmation (pending, in_pool, awaiting_doctor_response)
  // This replaces the old "Patient Pool" tab - shows appointments from ALL dates, not just today
  const loadPendingQueue = async () => {
    try {
      setQueueLoadError(null);
      // Prefer appointment-pool API for real queue state (PG source-of-truth).
      const apiBase = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
      const token = getToken() || '';
      let appointments: any[] = [];
      let poolFetchFailed = false;
      try {
        const poolResp = await fetch(`${apiBase}/api/appointment-pool?includeAccepted=true`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (poolResp.ok) {
          const poolData = await poolResp.json();
          appointments = Array.isArray(poolData) ? poolData : (poolData.appointments || []);
        } else {
          poolFetchFailed = true;
          const errBody = await poolResp.json().catch(() => ({}));
          setQueueLoadError(errBody?.message || errBody?.error || `Pool API error (${poolResp.status})`);
        }
      } catch (poolErr) {
        poolFetchFailed = true;
        setQueueLoadError(poolErr instanceof Error ? poolErr.message : 'Failed to load appointment pool');
      }

      if (!appointments.length && poolFetchFailed) {
        setPendingQueue([]);
        setAcceptedQueue([]);
        return;
      }

      if (!appointments.length) {
        // CRITICAL: Bypass cache to get fresh data
        clearCache();
        appointments = await fetchAllAppointments();
      }

      const doctorEmail = doctor?.email || '';
      const doctorId = doctor?.id || '';
      const { pending: pendingRaw, accepted: acceptedRaw } = splitQueueSections(appointments, {
        isAdmin,
        doctorId,
        doctorEmail,
      });

      const urgencyOrder: Record<string, number> = { emergency: 0, urgent: 1, normal: 2 };
      const queueRequests = pendingRaw
        .map(mapRawToAppointmentRequest)
        .sort((a: AppointmentRequest, b: AppointmentRequest) => {
          const urgencyDiff = (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2);
          if (urgencyDiff !== 0) return urgencyDiff;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      const acceptedRequests = acceptedRaw
        .map(mapRawToAppointmentRequest)
        .sort((a: AppointmentRequest, b: AppointmentRequest) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      setPendingQueue(queueRequests);
      setAcceptedQueue(acceptedRequests);
      setMeetings(convertToScheduledMeetings(acceptedRequests));
      console.log('[HealthMeeting] Pending Queue loaded:', queueRequests.length, 'accepted:', acceptedRequests.length);
    } catch (error) {
      console.error('Error loading pending queue:', error);
      setPendingQueue([]);
      setAcceptedQueue([]);
    }
  };

  // Load all appointments - Admin only
  const loadAllAppointmentsData = async () => {
    if (!isAdmin) return;

    try {
      // CRITICAL: Bypass cache to get fresh data
      clearCache();
      const appointments = await fetchAllAppointments();

      const allRequests = appointments.map(mapRawToAppointmentRequest);

      // Sort by date (newest first)
      allRequests.sort((a: AppointmentRequest, b: AppointmentRequest) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setAllAppointments(allRequests);
      console.log('[HealthMeeting] All appointments loaded:', allRequests.length);
    } catch (error) {
      console.error('Error loading all appointments:', error);
      setAllAppointments([]);
    }
  };

  // Load available doctors - Admin only
  const loadAvailableDoctors = async () => {
    if (!isAdmin) return;

    try {
      const doctors = await fetchAllDoctors();

      const approvedDoctors = doctors
        .filter((d: any) => d.approvalStatus === 'approved' || d.isApproved || d.isActive !== false)
        .map((d: any) => ({
          id: d.id,
          name: d.name || d.displayName || d.email?.split('@')[0] || 'Doctor',
          email: d.email || '',
          specialty: d.specialty || 'General Practice'
        }));

      setAvailableDoctors(approvedDoctors);
      console.log('[HealthMeeting] Available doctors loaded:', approvedDoctors.length);
    } catch (error) {
      console.error('Error loading doctors:', error);
      setAvailableDoctors([]);
    }
  };

  // Admin: Assign appointment from pool to doctor
  const handleAssignFromPool = async () => {
    if (!selectedPoolRequest || !assignData.doctorId || !assignData.date || !assignData.time) {
      setErrorMessage('Please fill in all required fields (Doctor, Date, Time)');
      return;
    }

    try {
      setAssignInProgress(true);
      setErrorMessage(null);

      const selectedDoctor = availableDoctors?.find(d => d.id === assignData.doctorId);
      const assignedDateTime = `${assignData.date}T${assignData.time}:00`;

      console.log(`[Admin] Assigning appointment ${selectedPoolRequest.id} to doctor ${assignData.doctorId}`);
      setQueueToast(`Assigning ${selectedPoolRequest.id} → Dr. ${selectedDoctor?.name || assignData.doctorId}…`);
      scheduleToastClear(setQueueToast);

      const result = await adminAssignAppointment(selectedPoolRequest.id, assignData.doctorId);
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to assign appointment');
      }

      await appointmentService.updateAppointment(selectedPoolRequest.id, {
        assignedDoctorId: assignData.doctorId,
        assignedDoctorName: selectedDoctor?.name,
        status: 'awaiting_doctor_response',
        assignmentMethod: 'admin_assigned',
        assignedDateTime,
        appointmentDate: assignData.date,
        appointmentTime: assignData.time,
        notes: assignData.notes,
      } as any);

      setSuccessMessage(`Appointment assigned to Dr. ${selectedDoctor?.name} successfully!`);
      setQueueToast(`Assigned ${selectedPoolRequest.id} → awaiting doctor confirmation`);
      scheduleToastClear(setQueueToast);
      setShowAssignModal(false);
      setSelectedPoolRequest(null);
      setAssignData({ doctorId: '', date: '', time: '', notes: '' });

      // Refresh data
      await loadAllData();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error assigning appointment:', err);
      setErrorMessage(err.message || 'Failed to assign appointment');
    } finally {
      setAssignInProgress(false);
    }
  };

  const loadPendingAppointments = async () => {
    try {
      // Fetch all appointments directly from GCS (like loadDoctorMeetings)
      // This loads appointments specifically assigned to this doctor awaiting their response
      // CRITICAL: Bypass cache to get fresh data
      clearCache();
      const allAppointments = await fetchAllAppointments();
      console.log('[HealthMeeting] Total appointments loaded:', allAppointments.length);

      // Filter for pending appointments assigned to this doctor
      const pending = allAppointments.filter((apt: any) => {
        const matchesDoctor =
          (!apt.doctorId && !apt.assignedDoctorId && !apt.adminAssignedDoctorId) ||
          apt.doctorId === doctor.id ||
          apt.assignedDoctorId === doctor.id ||
          apt.adminAssignedDoctorId === doctor.id;
        // Pending = needs doctor confirmation (assigned but not yet confirmed)
        const needsConfirmation = apt.status === 'pending' ||
          apt.status === 'in_pool' ||
          apt.status === 'awaiting_doctor_response' ||
          apt.status === 'assigned';
        return matchesDoctor && needsConfirmation;
      });

      console.log('[HealthMeeting] Pending appointments for doctor', doctor.id, ':', pending.length);
      if (pending.length > 0) {
        console.log('[HealthMeeting] Pending appointment IDs:', pending.map((a: any) => a.id));
      }
    } catch (error) {
      console.error('Error loading pending appointments:', error);
    }
  };

  // Load in-clinic queue (separate from appointment queue)
  const loadQueue = async () => {
    try {
      const dashboardData = await fetchDoctorQueue(doctor.id);
      setQueue(dashboardData.queue || []);
    } catch (error) {
      console.error('[HealthMeeting] Error loading clinic queue:', error);
    }
  };

  const handleCallNextPatient = async () => {
    const nextPatient = queue.find((p) => p.status === 'waiting');
    if (nextPatient) {
      await doctorDataService.updateQueuePatientStatus(doctor.id, nextPatient.patientId, 'in-consultation');
      await loadQueue();
    }
  };

  // handleSkipPatient removed - currently unused

  // Helper: Determine meeting status from appointment status
  const getMeetingStatus = (status: string): 'scheduled' | 'completed' | 'in-progress' | 'cancelled' => {
    const statusMap: Record<string, 'scheduled' | 'completed' | 'in-progress' | 'cancelled'> = {
      completed: 'completed',
      cancelled: 'cancelled',
      in_progress: 'in-progress',
      'in-progress': 'in-progress',
    };
    return statusMap[status] || 'scheduled';
  };

  // Helper: Determine meeting type from appointment type
  const getMeetingType = (apt: any): 'consultation' | 'follow-up' | 'team-meeting' | 'referral' => {
    if (apt.appointmentType === 'follow_up' || apt.type === 'follow-up') return 'follow-up';
    if (apt.appointmentType === 'referral') return 'referral';
    return 'consultation';
  };

  const confirmSkip = async () => {
    if (selectedQueuePatient && skipReason) {
      await doctorDataService.updateQueuePatientStatus(doctor.id, selectedQueuePatient.patientId, 'skipped');
      await loadQueue();
      setShowSkipModal(false);
      setSkipReason('');
      setSelectedQueuePatient(null);
    }
  };

  // Helper function for request urgency styling
  const getUrgencyStyle = (urgency: string): string => {
    if (urgency === 'emergency') return 'border-red-500 bg-red-50';
    if (urgency === 'urgent') return 'border-orange-300 bg-orange-50';
    return 'border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-white hover:border-emerald-300';
  };

  // Helper function for urgency badge styling (bold version with solid background)
  const getUrgencyBadgeStyleBold = (urgency: string): string => {
    if (urgency === 'emergency') return 'bg-red-500 text-white';
    if (urgency === 'urgent') return 'bg-orange-500 text-white';
    return 'bg-green-100 text-green-700';
  };

  // Helper function for urgency badge styling (light version)
  const getUrgencyBadgeStyle = (urgency: string): string => {
    if (urgency === 'emergency') return 'bg-red-100 text-red-700';
    if (urgency === 'urgent') return 'bg-orange-100 text-orange-700';
    return 'bg-green-100 text-green-700';
  };

  // Helper function for status badge styling
  const getStatusBadgeStyle = (status: string): string => {
    if (status === 'pending' || status === 'in_pool') return 'bg-yellow-100 text-yellow-700';
    if (status === 'awaiting_doctor_response') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
  };

  // Helper function for appointment status badge styling
  const getAppointmentStatusBadgeStyle = (status: string): string => {
    if (status === 'confirmed') return 'bg-green-100 text-green-700';
    if (status === 'pending' || status === 'in_pool') return 'bg-yellow-100 text-yellow-700';
    if (status === 'assigned' || status === 'awaiting_doctor_response') return 'bg-blue-100 text-blue-700';
    if (status === 'completed') return 'bg-gray-100 text-gray-700';
    if (status === 'cancelled' || status === 'declined') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  // Generate Jitsi meeting link helper
  // Jitsi Meet provides FREE, secure video conferencing with host controls
  const generateMeetingLink = (appointmentId?: string): { meetLink: string; meetCode: string; calendarLink: string; doctorUrl: string; patientUrl: string; guestUrl: string } => {
    // Generate secure room name for medical consultations
    const JITSI_DOMAIN = resolveJitsiDomain();
    const aptId = appointmentId || selectedAppointment?.id || 'direct';
    const existingRoom =
      (selectedAppointment as { jitsiRoomName?: string; jitsi_room_name?: string } | undefined)?.jitsiRoomName
      || (selectedAppointment as { jitsi_room_name?: string } | undefined)?.jitsi_room_name;
    const roomName = existingRoom || stableRoomNameForAppointment(aptId);
    const patientDisplayName = selectedAppointment?.patientName || 'Patient';
    const doctorDisplayName = doctor.displayName || doctor.name || 'Doctor';

    // Base Jitsi configuration for medical consultations
    const baseConfig = new URLSearchParams({
      // Basic setup
      'config.prejoinPageEnabled': 'false',
      'config.startWithAudioMuted': 'false',
      'config.startWithVideoMuted': 'false',
      'config.enableClosePage': 'true',
      'config.disableDeepLinking': 'true',
      'config.defaultLanguage': 'th',

      // Security settings
      'config.enableInsecureRoomNameWarning': 'false',
      'config.requireDisplayName': 'false',

      // Izara lobby (API) — Jitsi built-in lobby disabled on meet.jit.si
      'config.enableLobby': 'false',
      'config.lobbyModeEnabled': 'false',
      'config.enableLobbyChat': 'false',

      // Server-side Jibri only — no browser local recording (disk + log noise)
      'config.fileRecordingsEnabled': 'false',
      'config.localRecording.enabled': 'false',
      'config.disableAnalytics': 'true',
      'config.analytics.disabled': 'true',
      'config.liveStreamingEnabled': 'false',

      // Disable Jitsi transcription - we use Gemini AI instead
      'config.transcribingEnabled': 'false',

      // UI customization for medical consultations
      'interfaceConfig.TOOLBAR_BUTTONS': JSON.stringify([
        'microphone', 'camera', 'desktop', 'chat', 'raisehand',
        'participants-pane', 'tileview', 'hangup', 'settings', 'recording',
        'security', 'invite' // Added security and invite for host controls
      ]),
      'interfaceConfig.SETTINGS_SECTIONS': JSON.stringify(['devices', 'language', 'profile', 'moderator']),
      'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS': 'false',
      'interfaceConfig.SHOW_CHROME_EXTENSION_BANNER': 'false',
      'interfaceConfig.MOBILE_APP_PROMO': 'false',
      'interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE': 'false',
      'interfaceConfig.APP_NAME': 'Izara Telemedicine',
      'interfaceConfig.DEFAULT_LOGO_URL': '',
      'interfaceConfig.JITSI_WATERMARK_LINK': ''
    });

    // DOCTOR URL - Automatically becomes moderator/host
    // First person to join with this URL becomes the host
    const doctorConfig = new URLSearchParams(baseConfig);
    doctorConfig.set('userInfo.displayName', doctorDisplayName);
    if (doctor.email) {
      doctorConfig.set('userInfo.email', doctor.email);
    }
    // Doctor should be moderator - first to join gets moderator rights
    doctorConfig.set('config.startAudioOnly', 'false');
    const doctorUrl = `https://${JITSI_DOMAIN}/${roomName}#${doctorConfig.toString()}`;

    // PATIENT URL - Standard participant (lobby applies if enabled)
    const patientConfig = new URLSearchParams(baseConfig);
    patientConfig.set('userInfo.displayName', patientDisplayName);
    const patientUrl = `https://${JITSI_DOMAIN}/${roomName}#${patientConfig.toString()}`;

    // GUEST URL - For family members or other consultants (lobby applies)
    const guestConfig = new URLSearchParams(baseConfig);
    guestConfig.set('config.requireDisplayName', 'false');
    guestConfig.set('userInfo.displayName', 'Guest');
    const guestUrl = `https://${JITSI_DOMAIN}/${roomName}#${guestConfig.toString()}`;

    // Primary meeting link (generic - doctor should use doctorUrl)
    const meetLink = `https://${JITSI_DOMAIN}/${roomName}#${baseConfig.toString()}`;

    const calendarLink = `https://calendar.google.com/calendar/event?action=TEMPLATE&text=`;

    console.log(`🎥 Generated Jitsi Meet Room: ${roomName}`);
    console.log(`   Doctor URL (Host): ${doctorUrl.substring(0, 80)}...`);
    console.log(`   Patient URL: ${patientUrl.substring(0, 80)}...`);

    return {
      meetLink,
      meetCode: roomName,
      calendarLink,
      doctorUrl,
      patientUrl,
      guestUrl
    };
  };

  // Send confirmation email (opens mailto or calls backend)
  const sendConfirmationEmail = async (appointment: any, meetingDetails: any) => {
    const patientEmail = appointment.patientEmail || appointment.email;
    const doctorEmail = doctor.email;

    const appointmentDate = appointment.appointmentDate || appointment.date;
    const appointmentTime = appointment.appointmentTime || appointment.time || '10:00';

    const subject = `Appointment Confirmed - ${appointmentDate} at ${appointmentTime}`;

    // Use patient-specific URL if available, otherwise use generic meetLink
    const patientMeetingLink = meetingDetails.patientUrl || meetingDetails.meetLink;

    const body = `
Dear ${appointment.patientName || 'Patient'},

Your appointment has been confirmed by Dr. ${doctor.name || 'Doctor'}.

APPOINTMENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━
Date: ${appointmentDate}
Time: ${appointmentTime}
Doctor: Dr. ${doctor.name}
Type: Telehealth Video Consultation

YOUR MEETING LINK (Jitsi Meet):
━━━━━━━━━━━━━━━━━━━━━━
${patientMeetingLink}

IMPORTANT: The doctor will start the meeting first. Please wait to be admitted.

Please click the link above at the scheduled time to join the video consultation.
No account needed - works directly in your browser!

PREPARATION:
━━━━━━━━━━━━━━━━━━━━━━
• Ensure you have a stable internet connection
• Test your camera and microphone before the appointment
• Have your medical records ready if needed
• Be in a quiet, private location
• Allow browser access to camera/microphone when prompted

${confirmNotes ? `DOCTOR'S NOTES:\n${confirmNotes}\n` : ''}

If you need to reschedule or cancel, please contact us at least 24 hours in advance.

Best regards,
Izara Telehealth Team
    `.trim();

    // Build recipient list based on selection
    const recipients: string[] = [];
    let ccList: string[] = [];

    // Primary recipient - patient
    if (emailRecipients.sendToPatient && patientEmail) {
      recipients.push(patientEmail);
    }

    // CC - doctor
    if (emailRecipients.sendToDoctor && doctorEmail) {
      ccList.push(doctorEmail);
    }

    // Additional recipients
    if (emailRecipients.additionalEmails.trim()) {
      const additionalList = emailRecipients.additionalEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e?.includes('@'));
      ccList = [...ccList, ...additionalList];
    }

    // If no recipients selected, use patient as default
    const toField = recipients.length > 0 ? recipients.join(',') : patientEmail;
    const ccField = ccList.length > 0 ? ccList.join(',') : '';

    // Open mailto link to send email
    const ccParam = ccField ? 'cc=' + ccField + '&' : '';
    const mailtoLink = `mailto:${toField}?${ccParam}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open in new window/tab
    window.open(mailtoLink, '_blank');

    return { sent: true, method: 'mailto', recipients: toField, cc: ccField };
  };

  const handleConfirmAppointment = async () => {
    if (!selectedAppointment) return;
    if (!confirmDate || !confirmTime) {
      setErrorMessage('Please select both date and time for the appointment');
      return;
    }

    try {
      setConfirmInProgress(true);
      setErrorMessage(null);
      setQueueToast(`Confirming ${selectedAppointment.id}…`);
      scheduleToastClear(setQueueToast);
      console.log('🔄 Starting appointment confirmation process...');

      // Step 1: Generate Jitsi meeting links (with doctor URL as host, patient URL, and guest URL)
      console.log('📹 Generating Jitsi Meet links...');
      let meetingDetails = generateMeetingLink(selectedAppointment.id);
      console.log('✅ Jitsi Meet room created:', meetingDetails.meetCode);
      console.log('✅ Doctor URL (Host):', meetingDetails.doctorUrl?.substring(0, 80) + '...');
      console.log('✅ Patient URL:', meetingDetails.patientUrl?.substring(0, 80) + '...');

      // Step 2: Use the CONFIRMED date/time (from modal inputs), not the patient's requested time
      const appointmentDate = confirmDate;
      const appointmentTime = confirmTime;

      // Parse date and time for calendar event
      const [year, month, day] = appointmentDate.split('-').map(Number);
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const startDateTime = new Date(year, month - 1, day, hours, minutes);
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 min consultation

      // Step 3: Create Google Calendar link - use doctor URL for calendar
      const calendarTitle = `Telehealth: ${selectedAppointment.patientName || 'Patient'} - Dr. ${doctor.name}`;
      const calendarDescription = `Video consultation via Izara Telehealth (Jitsi Meet)\n\nDOCTOR LINK (Click to join as HOST):\n${meetingDetails.doctorUrl}\n\nPatient Link:\n${meetingDetails.patientUrl}\n\nReason: ${selectedAppointment.reason || 'General Consultation'}${confirmNotes ? '\n\nDoctor Notes: ' + confirmNotes : ''}`;

      const formatDateForCalendar = (date: Date) => date.toISOString().replaceAll('-', '').replaceAll(':', '').replace('.000', '');
      const googleCalendarUrl = `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&details=${encodeURIComponent(calendarDescription)}&dates=${formatDateForCalendar(startDateTime)}/${formatDateForCalendar(endDateTime)}&location=${encodeURIComponent(meetingDetails.doctorUrl)}`;

      // Step 4: Confirm appointment via PostgreSQL API
      const doctorIdentifier = doctor.id || doctor.email || 'unknown-doctor';
      const confirmResult = await confirmAppointmentApi(
        selectedAppointment.id,
        doctorIdentifier,
        appointmentDate,
        appointmentTime,
        confirmNotes,
      );
      if (!confirmResult?.success) {
        throw new Error('Failed to confirm appointment via API');
      }

      // Step 5b: Register meeting with the meeting server (so patient can look up room name)
      let meetingServerRegistered = false;
      try {
        const meetingToken = localStorage.getItem('token');
        const meetingServerRes = await fetch(`${meetingServerBase()}/api/meetings/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${meetingToken || ''}`
          },
          body: JSON.stringify({
            appointmentId: selectedAppointment.id,
            patientId: selectedAppointment.patientId || selectedAppointment.patient_id,
            doctorId: doctorIdentifier,
            patientName: selectedAppointment.patientName || selectedAppointment.patient_name,
            doctorName: doctor.name,
            scheduledTime: `${appointmentDate}T${appointmentTime}`,
            roomName: meetingDetails.meetCode, // Use the same room name as the generated Jitsi URLs
          }),
        });
        if (meetingServerRes.ok) {
          const meetingServerBody = (await meetingServerRes.json().catch(() => ({}))) as MeetingServerCreateResponse;
          const doctorUrlFromServer = meetingServerBody?.urls?.doctor || meetingServerBody?.meeting?.doctor_url;
          const patientUrlFromServer = meetingServerBody?.urls?.patient || meetingServerBody?.meeting?.patient_url;
          const guestUrlFromServer = meetingServerBody?.urls?.guest || meetingServerBody?.meeting?.guest_url;
          const roomFromServer = meetingServerBody?.roomName || meetingServerBody?.meeting?.room_name || meetingDetails.meetCode;
          if (doctorUrlFromServer || patientUrlFromServer) {
            meetingDetails = {
              ...meetingDetails,
              doctorUrl: doctorUrlFromServer || meetingDetails.doctorUrl,
              patientUrl: patientUrlFromServer || meetingDetails.patientUrl,
              guestUrl: guestUrlFromServer || meetingDetails.guestUrl,
              meetCode: roomFromServer,
            };
            await saveAppointment({
              ...confirmResult.appointment,
              meetingLink: meetingDetails.patientUrl || meetingDetails.meetLink,
              doctorMeetingUrl: meetingDetails.doctorUrl,
              patientMeetingUrl: meetingDetails.patientUrl,
              guestMeetingUrl: meetingDetails.guestUrl,
              jitsiRoomName: meetingDetails.meetCode,
              meetCode: meetingDetails.meetCode,
              calendarEventUrl: googleCalendarUrl,
              scheduledDate: appointmentDate,
              scheduledTime: appointmentTime,
              scheduledStartTime: startDateTime.toISOString(),
              scheduledEndTime: endDateTime.toISOString(),
              duration: 30,
            });
            console.log('✅ Meeting registered with meeting server (tokenized host URL applied)');
            meetingServerRegistered = true;
          } else {
            console.log('✅ Meeting registered with meeting server');
            meetingServerRegistered = true;
          }
        } else {
          console.warn('⚠️ Meeting server registration returned:', meetingServerRes.status);
        }
      } catch (meetErr) {
        console.warn('⚠️ Meeting server registration failed (non-blocking):', meetErr);
      }

      if (!meetingServerRegistered) {
        setErrorMessage('Appointment confirmed, but meeting server registration failed. Use In-App meeting join or retry from Scheduled Meetings.');
      }

      // All meeting data is already saved in the appointment record above
      // No need for separate writeToGCS calls - PostgreSQL handles everything

      // Step 6: Send confirmation email
      console.log('📧 Sending confirmation email...');
      await sendConfirmationEmail(selectedAppointment, meetingDetails);
      console.log('✅ Email triggered');

      // Step 7: Reset UI state FIRST
      setShowConfirmModal(false);
      setSelectedAppointment(null);
      setConfirmNotes('');
      setConfirmDate('');
      setConfirmTime('');
      setEmailRecipients({ sendToPatient: true, sendToDoctor: true, additionalEmails: '' });

      // No need for cache clearing or delays - PostgreSQL is instant

      // Reload all data to reflect changes
      console.log('🔄 Reloading all data...');
      await loadAllData();
      console.log('✅ Data reloaded');

      setSuccessMessage(
        `Appointment confirmed. Host link ready — patient link sent. Add to calendar?`,
      );
      setQueueToast(`Confirmed ${selectedAppointment.id} — moved to scheduled meetings`);
      scheduleToastClear(setQueueToast);
      window.open(googleCalendarUrl, '_blank');
      setTimeout(() => setSuccessMessage(null), 8000);

      console.log('🎉 Appointment confirmation complete!');

    } catch (error) {
      console.error('❌ Error confirming appointment:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Error confirming appointment',
      );
    } finally {
      setConfirmInProgress(false);
    }
  };

  // Send decline notification email
  const sendDeclineEmail = async (appointment: any, reason: string) => {
    const patientEmail = appointment.patientEmail || appointment.email;
    const appointmentDate = appointment.appointmentDate || appointment.date;
    const appointmentTime = appointment.appointmentTime || appointment.time || '10:00';

    const subject = `Appointment Request Declined - ${appointmentDate}`;

    const body = `
Dear ${appointment.patientName || 'Patient'},

We regret to inform you that your appointment request has been declined.

ORIGINAL REQUEST:
━━━━━━━━━━━━━━━━━━━━━━
Date: ${appointmentDate}
Time: ${appointmentTime}
Reason for Visit: ${appointment.reason || 'General consultation'}

DECLINE REASON:
━━━━━━━━━━━━━━━━━━━━━━
${reason}

NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━
• You may request a new appointment with a different date/time
• Contact our support team if you have any questions
• For urgent matters, please visit our emergency services

We apologize for any inconvenience caused.

Best regards,
Dr. ${doctor.name}
Izara Telehealth Team
    `.trim();

    const mailtoLink = `mailto:${patientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');

    return { sent: true, method: 'mailto' };
  };

  const handleRejectAppointment = async (appointmentId: string, reason: string) => {
    if (!reason) {
      setQueueToast('กรุณาระบุเหตุผลในการปฏิเสธนัดหมาย');
      scheduleToastClear(setQueueToast);
      return;
    }

    try {
      console.log('🔄 Starting appointment decline process...');

      // Get the appointment details first for email
      const allAppointments = await fetchAllAppointments();
      const appointmentToDecline = allAppointments.find((apt: any) => apt.id === appointmentId);

      if (!appointmentToDecline) {
        setQueueToast('ไม่พบนัดหมายที่ต้องการปฏิเสธ');
        scheduleToastClear(setQueueToast);
        return;
      }

      // Update appointment status
      const updatedAppointments = allAppointments.map((apt: any) => {
        if (apt.id === appointmentId) {
          return {
            ...apt,
            status: 'declined',
            declinedAt: new Date().toISOString(),
            declinedBy: doctor.id,
            declinedByName: doctor.name,
            declineReason: reason,
            updatedAt: new Date().toISOString()
          };
        }
        return apt;
      });

      // Save back to GCS
      await saveAllAppointments(updatedAppointments);
      console.log('✅ Appointment declined in GCS');

      // Send decline email notification
      console.log('📧 Sending decline notification...');
      await sendDeclineEmail(appointmentToDecline, reason);
      console.log('✅ Decline email triggered');

      setQueueToast(`ปฏิเสธนัดหมายแล้ว — เหตุผล: ${reason} (ส่งอีเมลแจ้งเตือนผู้ป่วยแล้ว)`);
      scheduleToastClear(setQueueToast);

      await loadAllData(); // Reload all data

      console.log('🎉 Appointment decline complete!');

    } catch (error) {
      console.error('❌ Error declining appointment:', error);
      setQueueToast('เกิดข้อผิดพลาดในการปฏิเสธนัดหมาย: ' + (error instanceof Error ? error.message : 'Unknown error'));
      scheduleToastClear(setQueueToast);
    }
  };

  const todayConfirmedMeetings = allAppointments.find(
    (a: AppointmentRequest) => a.status === 'confirmed' && isAppointmentToday(a),
  );
  const nextTodayMeeting = todayConfirmedMeetings;

  return (
    <div className={`p-6 max-w-7xl mx-auto ${isMobile && nextTodayMeeting ? 'pb-28' : ''}`}>
      {/* CRITICAL WARNING: Missing User ID */}
      {!doctor.id && (
        <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="text-4xl">!</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-2">
                Session Error: User ID Missing
              </h3>
              <p className="text-red-800 mb-4">
                Your user session is missing a User ID, which prevents appointments from being properly assigned and displayed.
                This usually happens after a system update.
              </p>
              <p className="text-red-800 font-semibold mb-4">
                <strong>Required Action:</strong> Please LOG OUT and LOG BACK IN to refresh your session.
              </p>
              <div className="bg-white border border-red-300 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Current Session:</strong><br />
                  Email: {doctor.email || 'Not found'}<br />
                  User ID: <span className="text-red-600 font-bold">{doctor.id || 'MISSING'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div data-testid="health-meeting-page">
      {queueToast && (
        <output
          data-testid="queue-realtime-toast"
          className="block mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
        >
          {queueToast}
        </output>
      )}
      {/* Breadcrumb hints */}
      <nav aria-label="Breadcrumb" className={`text-sm mb-4 ${hmDarkSubtext(isDark)}`} data-testid="health-meeting-breadcrumb">
        <span>Dashboard</span>
        <span className="mx-2">›</span>
        <span className={hmDarkText(isDark)}>Health Meeting</span>
        <span className="mx-2">›</span>
        <span className="text-emerald-600 font-medium">
          {isMobile
            ? ({ queue: 'Queue', today: 'Today', actions: 'Actions' } as const)[mobileSection]
            : ({ queue: 'Patient Queue', meetings: 'Today\'s Meetings', 'all-appointments': 'All Appointments' } as const)[activeTab]}
        </span>
      </nav>

      {/* Mobile tabs: Queue | Today | Actions */}
      {isMobile && (
        <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-4" data-testid="health-meeting-mobile-tabs">
          {([
            { key: 'queue' as const, label: 'Queue' },
            { key: 'today' as const, label: 'Today' },
            { key: 'actions' as const, label: 'Actions' },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setMobileSection(tab.key);
                if (tab.key === 'queue') setActiveTab('queue');
                if (tab.key === 'today') setActiveTab('meetings');
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mobileTabClass(mobileSection === tab.key, isDark)}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${hmDarkText(isDark)}`}>
            <VideoCameraIcon className="w-8 h-8 text-emerald-600" />
            Appointments & Meetings
          </h1>
          <p className={`mt-1 ${hmDarkSubtext(isDark)}`}>
            Manage patient queue and meetings with patients, doctors, and consultants
          </p>
        </div>
        {activeTab === 'queue' && (
          <button
            onClick={handleCallNextPatient}
            disabled={!queue.some((p) => p.status === 'waiting')}
            className="mt-4 md:mt-0 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
          >
            📞 Call Next Patient
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`rounded-xl shadow-lg p-4 border-2 border-amber-500 ${hmDarkCard(isDark)}`}>
          <div className="text-3xl font-bold text-amber-600" data-testid="queue-count">
            {pendingQueue.length}
          </div>
          <div className={`text-sm ${hmDarkSubtext(isDark)}`}>Awaiting Confirmation</div>
        </div>
        {/* Removed Scheduled Meetings card */}
        <div className={`rounded-xl shadow-lg p-4 ${hmDarkCard(isDark)}`}>
          <div className="text-3xl font-bold text-green-600">
            {meetings.filter(m => m.status === 'completed').length}
          </div>
          <div className={`text-sm ${hmDarkSubtext(isDark)}`}>Completed</div>
        </div>
        {isAdmin && (
          <div className={`rounded-xl shadow-lg p-4 ${hmDarkCard(isDark)}`}>
            <div className="text-3xl font-bold text-blue-600">
              {allAppointments.length}
            </div>
            <div className={`text-sm ${hmDarkSubtext(isDark)}`}>Total Appointments</div>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-700 flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} aria-label="ปิดข้อความ" title="ปิด" className="text-green-500 hover:text-green-700">&times;</button>
        </div>
      )}
      {Boolean(errorMessage) && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700" aria-label="ปิดข้อผิดพลาด" title="ปิด">&times;</button>
        </div>
      )}

      {/* Tabs - Queue shows ALL pending appointments, Meetings shows confirmed */}
      {!isMobile && (
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'queue'
              ? 'bg-emerald-600 text-white'
              : inactiveTabClass(isDark)
            }`}
        >
          🏥 Patient Queue ({pendingQueue.length + acceptedQueue.length})
        </button>
        <button
          onClick={() => setActiveTab('meetings')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'meetings'
              ? 'bg-blue-600 text-white'
              : inactiveTabClass(isDark)
            }`}
        >
          📅 Today ({allAppointments.filter((a: any) => a.status === 'confirmed' && isAppointmentToday(a)).length})
        </button>

        {/* Admin-only: All Appointments tab */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('all-appointments')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'all-appointments'
                ? 'bg-indigo-600 text-white'
                : inactiveAdminTabClass(isDark)
              }`}
          >
            📋 All Appointments ({allAppointments.length})
          </button>
        )}
      </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      )}

      {/* Patient Queue Tab - Shows ALL pending appointments awaiting confirmation */}
      {!loading && (isMobile ? mobileSection === 'queue' : activeTab === 'queue') && (
        <div className={`rounded-xl shadow-lg p-6 mb-6 ${hmDarkCard(isDark)}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-xl font-bold ${hmDarkText(isDark)}`}>Patient Queue - Appointments Awaiting Confirmation</h2>
              <p className={`text-sm mt-1 ${hmDarkSubtext(isDark)}`}>
                Review patient requests and confirm appointment date/time
              </p>
            </div>
            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {queueLoadError && (
            <div
              data-testid="queue-load-error"
              className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm"
            >
              {queueLoadError}
            </div>
          )}

          <div className="space-y-4" data-testid="queue-list">
            {pendingQueue.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4"></div>
                <div className="text-lg font-medium">No appointments awaiting confirmation</div>
                <p className="text-sm text-gray-400 mt-2">
                  New patient appointment requests will appear here for you to review and confirm
                </p>
              </div>
            ) : (
              pendingQueue.map((request) => (
                <div
                  key={request.id}
                  data-testid={`queue-item-${request.id}`}
                  data-queue-status={request.status || 'pending'}
                  className={`border-2 rounded-xl p-4 transition-colors ${getUrgencyStyle(request.urgency)}`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Patient Info Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl"></span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{request.patientName}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{request.patientEmail || 'No email'}</span>
                            {request.patientPhone && (
                              <>
                                <span>•</span>
                                <span>{request.patientPhone}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold uppercase ${getUrgencyBadgeStyleBold(request.urgency)}`}>
                          {request.urgency}
                        </span>
                      </div>

                      {/* Appointment Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="font-semibold text-blue-900 flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            Requested Date
                          </div>
                          <div className="text-blue-700 mt-1">
                            {request.requestedDate?.split('T')[0] || 'Flexible'}
                            {request.preferredTime && ` at ${request.preferredTime}`}
                          </div>
                          {request.preferredDates && request.preferredDates.length > 1 && (
                            <div className="text-xs text-blue-600 mt-1">
                              Alt dates: {request.preferredDates.slice(1, 3).map((d: string) => d.split('T')[0]).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="font-semibold text-purple-900">Reason / Symptoms</div>
                          <div className="text-purple-700 mt-1 text-sm">
                            {request.reason || 'General consultation'}
                          </div>
                          {request.requiredSpecialty && (
                            <div className="text-xs text-purple-600 mt-1">
                              Suggested: {request.requiredSpecialty}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Analysis / Symptom Description */}
                      {request.symptomDescription && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-3">
                          <div className="font-semibold text-gray-700 text-sm">AI Analysis / Details</div>
                          <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {typeof request.symptomDescription === 'string'
                              ? request.symptomDescription.substring(0, 500)
                              : JSON.stringify(request.symptomDescription).substring(0, 500)}
                            {(request.symptomDescription?.length || 0) > 500 && '...'}
                          </div>
                        </div>
                      )}

                      {/* Status & Assignment Info */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className={`px-2 py-1 rounded-full ${getStatusBadgeStyle(request.status)}`}>
                          {request.status.replaceAll('_', ' ')}
                        </span>
                        {request.assignedDoctorName && (
                          <span className="text-blue-600">
                            Assigned to: Dr. {request.assignedDoctorName}
                          </span>
                        )}
                        <span>Requested: {new Date(request.createdAt).toLocaleDateString()}</span>
                      </div>

                      <PhrPreviewMiniCard patientId={request.patientId} className="mt-3" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 min-w-[160px]">
                      {canConfirmAppointment(request) && (
                      <button
                        onClick={() => {
                          setSelectedAppointment(request);
                          setConfirmDate(request.requestedDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
                          setConfirmTime(request.preferredTime || '10:00');
                          setConfirmNotes('');
                          setShowConfirmModal(true);
                        }}
                        className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        ✓ Confirm Appointment
                      </button>
                      )}
                      {isAdmin && request.status === 'awaiting_doctor_response' && request.assignedDoctorId && (
                        <p className="text-xs text-gray-500 text-center px-1">
                          รอแพทย์ที่ได้รับมอบหมายยืนยัน (HOST)
                        </p>
                      )}

                      {/* Admin can ALWAYS assign/reassign to any doctor */}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setSelectedPoolRequest(request);
                            setAssignData({
                              doctorId: request.assignedDoctorId || '',
                              date: request.requestedDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                              time: request.preferredTime || '10:00',
                              notes: ''
                            });
                            setShowAssignModal(true);
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center justify-center gap-2"
                        >
                          👨‍⚕️ {request.assignedDoctorId ? 'Reassign Doctor' : 'Assign to Doctor'}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const reason = prompt('Reason for declining this appointment:');
                          if (reason) {
                            handleRejectAppointment(request.id, reason);
                          }
                        }}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                      >
                        ✗ Decline
                      </button>

                      <button
                        onClick={() => {
                          const email = request.patientEmail;
                          if (email) {
                            globalThis.location.href = `mailto:${email}?subject=Regarding your appointment request`;
                          }
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        ✉️ Contact Patient
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {acceptedQueue.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200" data-testid="accepted-queue-list">
              <h3 className={`text-lg font-bold mb-3 ${hmDarkText(isDark)}`}>
                Recently Accepted ({acceptedQueue.length})
              </h3>
              <p className={`text-sm mb-4 ${hmDarkSubtext(isDark)}`}>
                Confirmed appointments remain visible here for 7 days (accepted by assigned doctor).
              </p>
              <div className="space-y-3">
                {acceptedQueue.map((request) => (
                  <div
                    key={`accepted-${request.id}`}
                    className={`border rounded-lg p-4 ${isDark ? 'bg-gray-700 border-green-700' : 'bg-green-50 border-green-200'}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{request.patientName}</div>
                        <div className="text-sm text-gray-600">
                          Accepted by {request.acceptedBy || request.assignedDoctorName || request.confirmedBy || 'Doctor'}
                          {request.acceptedAt || request.confirmedAt ? ` · ${new Date(request.acceptedAt || request.confirmedAt || '').toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 uppercase">
                        accepted
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meetings Tab — today's confirmed appointments */}
      {!loading && (isMobile ? mobileSection === 'today' : activeTab === 'meetings') && (
        <div className={`${hmDarkCard(isDark)} rounded-xl shadow-lg p-6`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className={`text-xl font-bold ${hmDarkText(isDark)} flex items-center gap-2`}>
              🎥 Today&apos;s Meetings{' '}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({allAppointments.filter((a: any) => a.status === 'confirmed' && isAppointmentToday(a)).length} today)
              </span>
            </h2>
            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Confirmed appointments with meeting links */}
          <div className="space-y-4">
            {allAppointments.filter((a: any) => a.status === 'confirmed' && isAppointmentToday(a)).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4"></div>
                <p>No meetings scheduled for today. Confirm appointments from Patient Queue.</p>
              </div>
            ) : (
              allAppointments.filter((a: any) => a.status === 'confirmed' && isAppointmentToday(a)).map((apt: any) => (
                <div key={apt.id} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className={`font-bold ${hmDarkText(isDark)}`}>
                        {apt.patientName || 'Unknown Patient'}
                      </h3>
                      <p className={`text-sm ${hmDarkSubtext(isDark)}`}>
                        📅 {apt.appointmentDate || apt.scheduledDate || 'N/A'} | ⏰ {apt.appointmentTime || apt.scheduledTime || 'N/A'}
                      </p>
                      <p className={`text-sm ${hmDarkSubtext(isDark)} mt-1`}>
                        📋 {apt.reason || apt.symptoms || 'General Consultation'}
                      </p>
                      {apt.jitsiRoomName && (
                        <p className="text-xs text-blue-400 mt-1">Room: {apt.jitsiRoomName}</p>
                      )}
                      <PhrPreviewMiniCard patientId={apt.patientId || apt.patient_id} className="mt-3 max-w-xs" />
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* Start Meeting In-App — real Jitsi via Izara meeting server (host + lobby + transcript + AI) */}
                      <button
                        onClick={() => startInAppMeeting(apt.id)}
                        data-testid="start-meeting-in-app"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        🎥 Start Meeting
                      </button>
                      {/* View Meeting Results (Teams-like) */}
                      <button
                        data-testid="meeting-history-row"
                        data-appointment-id={apt.id}
                        onClick={() => { setMeetingResultsId(apt.id); setShowMeetingResults(true); }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors flex items-center gap-1"
                      >
                        📋 Meeting Results
                      </button>
                      {/* Pre-consultation AI Summary */}
                      <button
                        onClick={() => handlePreConsultation(apt)}
                        disabled={preConsultLoading === apt.id}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {preConsultLoading === apt.id ? '⏳ กำลังสรุป...' : '🧠 AI Pre-consult'}
                      </button>
                      <span className="text-xs text-green-500 text-center">Confirmed</span>
                    </div>
                  </div>
                  {/* Pre-consultation summary display */}
                  {preConsultData[apt.id] && (
                    <div className={`mt-3 p-3 rounded-lg border ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                      <h4 className={`text-sm font-bold mb-2 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>🧠 Pre-Consultation Summary</h4>
                      {typeof preConsultData[apt.id] === 'object' ? (
                        <div className="space-y-2 text-sm">
                          {preConsultData[apt.id].currentSymptoms && (
                            <p><span className="font-semibold">อาการ:</span> {preConsultData[apt.id].currentSymptoms}</p>
                          )}
                          {preConsultData[apt.id].highlights?.length > 0 && (
                            <div>
                              <span className="font-semibold">ข้อมูลสำคัญ:</span>
                              <ul className="list-disc list-inside ml-2">
                                {preConsultData[apt.id].highlights.map((h: string) => <li key={h}>{h}</li>)}
                              </ul>
                            </div>
                          )}
                          {preConsultData[apt.id].risks?.length > 0 && (
                            <div>
                              <span className="font-semibold text-red-600">⚠️ ความเสี่ยง:</span>
                              <ul className="list-disc list-inside ml-2">
                                {preConsultData[apt.id].risks.map((r: any, riskIdx: number) => (
                                  <li key={riskToString(r) || riskIdx} className={r.severity === 'high' ? 'text-red-600 font-semibold' : ''}>
                                    {riskToString(r)} {r.severity ? `(${r.severity})` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {preConsultData[apt.id].recommendedQuestions?.length > 0 && (
                            <div>
                              <span className="font-semibold">คำถามแนะนำ:</span>
                              <ul className="list-decimal list-inside ml-2">
                                {preConsultData[apt.id].recommendedQuestions.map((q: string) => <li key={q}>{q}</li>)}
                              </ul>
                            </div>
                          )}
                          {preConsultData[apt.id].allergies?.length > 0 && (
                            <p className="text-red-600"><span className="font-semibold">แพ้ยา:</span> {preConsultData[apt.id].allergies.join(', ')}</p>
                          )}
                        </div>
                      ) : (
                        <p className={`text-sm whitespace-pre-line ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{preConsultData[apt.id]}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Completed today — post-meeting Results primary */}
          {allAppointments.filter((a: any) => a.status === 'completed' && isAppointmentToday(a)).length > 0 && (
            <div className="mt-8" data-testid="health-meeting-completed-today">
              <h3 className={`text-lg font-bold mb-3 ${hmDarkText(isDark)}`}>
                ✅ Completed Today ({allAppointments.filter((a: any) => a.status === 'completed' && isAppointmentToday(a)).length})
              </h3>
              <div className="space-y-3">
                {allAppointments
                  .filter((a: any) => a.status === 'completed' && isAppointmentToday(a))
                  .map((apt: any) => (
                    <div
                      key={`completed-${apt.id}`}
                      data-testid="health-meeting-completed-row"
                      data-appointment-id={apt.id}
                      className={`rounded-lg p-4 border ${isDark ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h4 className={`font-semibold ${hmDarkText(isDark)}`}>{apt.patientName || 'Patient'}</h4>
                          <p className={`text-sm ${hmDarkSubtext(isDark)}`}>Meeting completed — view recording & AI summary</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            data-testid="meeting-results-primary-btn"
                            onClick={() => navigate(`/doctor/${doctor.id}/meeting/${apt.id}/results`)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                          >
                            📋 Meeting Results
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMeetingResultsId(apt.id); setShowMeetingResults(true); }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                          >
                            Quick View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Actions — post-consult shortcuts for today's confirmed appointments */}
      {!loading && isMobile && mobileSection === 'actions' && (
        <div className={`${hmDarkCard(isDark)} rounded-xl shadow-lg p-6`} data-testid="health-meeting-actions-tab">
          <h2 className={`text-xl font-bold mb-4 ${hmDarkText(isDark)}`}>Post-Consultation Actions</h2>
          <div className="space-y-3">
            {allAppointments
              .filter((a: any) => (a.status === 'confirmed' || a.status === 'completed') && isAppointmentToday(a))
              .map((apt: any) => (
                <div key={`actions-${apt.id}`} className={`rounded-lg p-4 border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`font-semibold ${hmDarkText(isDark)}`}>{apt.patientName || 'Patient'}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/doctor/${doctor.id}/meeting/${apt.id}/results`)}
                      className={`px-3 py-2 text-white rounded-lg text-xs font-medium ${apt.status === 'completed' ? 'bg-emerald-600 col-span-2' : 'bg-purple-600'}`}
                    >
                      Results
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/doctor/${doctor.id}/emr/${apt.id}`)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"
                    >
                      EMR
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMeetingResultsId(apt.id); setShowMeetingResults(true); }}
                      className="col-span-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium"
                    >
                      Open Meeting Summary
                    </button>
                  </div>
                </div>
              ))}
            {allAppointments.filter((a: any) => a.status === 'confirmed' && isAppointmentToday(a)).length === 0 && (
              <p className={`text-sm ${hmDarkSubtext(isDark)}`}>No today&apos;s appointments with actions available.</p>
            )}
          </div>
        </div>
      )}

      {/* ========== ADMIN ONLY: All Appointments Tab ========== */}
      {!loading && !isMobile && isAdmin && activeTab === 'all-appointments' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                📋 All Appointments{' '}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({allAppointments.length} total)
                </span>
              </h2>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search patients"
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>
              <button
                onClick={loadAllData}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { status: 'pending', label: 'Pending', color: 'yellow' },
              { status: 'assigned', label: 'Assigned', color: 'blue' },
              { status: 'confirmed', label: 'Confirmed', color: 'green' },
              { status: 'completed', label: 'Completed', color: 'gray' },
              { status: 'cancelled', label: 'Cancelled', color: 'red' }
            ].map(({ status, label, color }) => {
              const count = allAppointments.filter(a => a.status === status ||
                (status === 'pending' && (a.status === 'in_pool' || a.status === 'awaiting_doctor_response'))).length;
              return (
                <div key={status} className={`bg-${color}-50 rounded-lg p-3 border border-${color}-200`}>
                  <div className={`text-2xl font-bold text-${color}-600`}>{count}</div>
                  <div className="text-sm text-gray-600">{label}</div>
                </div>
              );
            })}
          </div>

          {/* Appointments Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allAppointments
                  .filter(apt =>
                    searchTerm === '' ||
                    apt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    apt.patientEmail?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{apt.patientName}</div>
                        <div className="text-sm text-gray-500">{apt.patientEmail}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{apt.requestedDate?.split('T')[0] || 'TBD'}</div>
                        <div className="text-sm text-gray-500">{apt.preferredTime || apt.preferredTimeSlot || 'TBD'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {apt.reason || 'Not specified'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {apt.assignedDoctorName ? (
                          <div className="text-sm text-gray-900">Dr. {apt.assignedDoctorName}</div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAppointmentStatusBadgeStyle(apt.status)}`}>
                          {apt.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {(!apt.assignedDoctorId || apt.status === 'pending' || apt.status === 'in_pool') && (
                          <button
                            onClick={() => {
                              setSelectedPoolRequest(apt);
                              setAssignData({
                                doctorId: apt.assignedDoctorId || '',
                                date: apt.requestedDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                                time: apt.preferredTime || '10:00',
                                notes: ''
                              });
                              setShowAssignModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            Assign
                          </button>
                        )}
                        {apt.status === 'completed' && (
                          <button
                            data-testid="health-meeting-completed-results-btn"
                            onClick={() => navigate(`/doctor/${doctor.id}/meeting/${apt.id}/results`)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium mr-2"
                          >
                            📋 Meeting Results
                          </button>
                        )}
                        {apt.status === 'completed' && (
                          <button
                            onClick={() => { setMeetingResultsId(apt.id); setShowMeetingResults(true); }}
                            className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
                          >
                            Quick View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {allAppointments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4"></div>
              <div className="text-lg">No appointments found</div>
            </div>
          )}
        </div>
      )}

      {/* ========== ADMIN: Assign Appointment Modal ========== */}
      {showAssignModal && selectedPoolRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-indigo-600 flex items-center gap-2">
              📋 Assign Appointment
            </h3>

            {/* Patient Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Patient Information</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Name:</span> {selectedPoolRequest.patientName}</p>
                <p><span className="text-gray-500">Email:</span> {selectedPoolRequest.patientEmail}</p>
                <p><span className="text-gray-500">Reason:</span> {selectedPoolRequest.reason}</p>
                <p><span className="text-gray-500">Urgency:</span>
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs ${getUrgencyBadgeStyle(selectedPoolRequest.urgency)}`}>{selectedPoolRequest.urgency}</span>
                </p>
              </div>
            </div>

            {/* Assignment Form */}
            <div className="space-y-4">
              <div>
                <label htmlFor="assign-doctor-select" className="block font-medium text-gray-700 mb-2">Select Doctor *</label>
                <select
                  id="assign-doctor-select"
                  value={assignData.doctorId}
                  onChange={(e) => setAssignData({ ...assignData, doctorId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select a doctor --</option>
                  {(availableDoctors ?? []).map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name} - {doc.specialty || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="assign-date" className="block font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    id="assign-date"
                    type="date"
                    value={assignData.date}
                    onChange={(e) => setAssignData({ ...assignData, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="assign-time" className="block font-medium text-gray-700 mb-2">Time *</label>
                  <input
                    id="assign-time"
                    type="time"
                    value={assignData.time}
                    onChange={(e) => setAssignData({ ...assignData, time: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="assign-notes" className="block font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  id="assign-notes"
                  value={assignData.notes}
                  onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
                  placeholder="Add any notes for the doctor..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedPoolRequest(null);
                  setAssignData({ doctorId: '', date: '', time: '', notes: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignFromPool}
                disabled={!assignData.doctorId || !assignData.date || !assignData.time || assignInProgress}
                data-testid="assign-appointment-btn"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {assignInProgress ? 'Assigning…' : '✓ Assign Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Patient Modal */}
      {showSkipModal && selectedQueuePatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Skip Patient</h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to skip <strong>{selectedQueuePatient.patientName}</strong>?
            </p>
            <label htmlFor="skip-reason" className="block font-medium mb-2">Reason for Skipping</label>
            <textarea
              id="skip-reason"
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
                  setSelectedQueuePatient(null);
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

      {/* Confirm Appointment Modal - Now with date/time selection */}
      {showConfirmModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-emerald-600 flex items-center gap-2">
              ✓ Confirm Appointment
            </h3>

            {/* Patient Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Patient Information</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Name:</span> <span className="font-medium">{selectedAppointment.patientName || 'Unknown'}</span></p>
                <p><span className="text-gray-500">Email:</span> {selectedAppointment.patientEmail || selectedAppointment.email || 'N/A'}</p>
                <p><span className="text-gray-500">Reason:</span> {selectedAppointment.reason || normalizeSymptoms(selectedAppointment.symptoms).join(', ') || 'General consultation'}</p>
              </div>
            </div>

            {/* Patient's Requested Date/Time */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-700 mb-2">Patient's Requested Schedule</h4>
              <div className="text-sm text-blue-900">
                <p>Date: {selectedAppointment.requestedDate?.split('T')[0] || selectedAppointment.appointmentDate || selectedAppointment.date || 'Flexible'}</p>
                <p>Time: {selectedAppointment.preferredTime || selectedAppointment.appointmentTime || selectedAppointment.time || 'Flexible'}</p>
                {selectedAppointment.preferredDates && selectedAppointment.preferredDates.length > 1 && (
                  <p className="text-xs mt-1">Alt dates: {selectedAppointment.preferredDates.slice(1, 3).map((d: string) => d.split('T')[0]).join(', ')}</p>
                )}
              </div>
            </div>

            {/* Confirm Date/Time Selection */}
            <div className="space-y-4 mb-4">
              <h4 className="font-medium text-gray-700">Confirm Date & Time</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="confirm-date" className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    id="confirm-date"
                    type="date"
                    value={confirmDate}
                    onChange={(e) => setConfirmDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-time" className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    id="confirm-time"
                    type="time"
                    value={confirmTime}
                    onChange={(e) => setConfirmTime(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="confirm-notes" className="block font-medium mb-2 text-gray-700">Notes for Patient (Optional)</label>
              <textarea
                id="confirm-notes"
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Add any notes or instructions for the patient..."
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Email Recipients Selection */}
            <div className="mb-4 bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
                📧 Email Notification Recipients
              </h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={emailRecipients.sendToPatient}
                    onChange={(e) => setEmailRecipients({ ...emailRecipients, sendToPatient: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Send to Patient</span>
                  <span className="text-gray-400 text-xs">({selectedAppointment.patientEmail || selectedAppointment.email || 'N/A'})</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={emailRecipients.sendToDoctor}
                    onChange={(e) => setEmailRecipients({ ...emailRecipients, sendToDoctor: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">CC Doctor</span>
                  <span className="text-gray-400 text-xs">({doctor.email})</span>
                </label>
                <div>
                  <label htmlFor="additional-emails" className="block text-sm text-gray-700 mb-1">Additional Recipients (comma-separated)</label>
                  <input
                    id="additional-emails"
                    type="text"
                    value={emailRecipients.additionalEmails}
                    onChange={(e) => setEmailRecipients({ ...emailRecipients, additionalEmails: e.target.value })}
                    placeholder="e.g., family@example.com, nurse@clinic.com"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedAppointment(null);
                  setConfirmNotes('');
                  setConfirmDate('');
                  setConfirmTime('');
                  setEmailRecipients({ sendToPatient: true, sendToDoctor: true, additionalEmails: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAppointment}
                disabled={!confirmDate || !confirmTime || confirmInProgress}
                data-testid="confirm-appointment-btn"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {confirmInProgress ? 'Confirming…' : '✓ Confirm Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Results Modal (Teams-like Recording Viewer) */}
      {showMeetingResults && meetingResultsId && (
        <MeetingResults
          meetingId={meetingResultsId}
          appointmentId={meetingResultsId}
          onClose={() => { setShowMeetingResults(false); setMeetingResultsId(''); }}
          onNavigateToEMR={(aptId) => { setShowMeetingResults(false); navigate(`/doctor/${doctor.id}/emr/${aptId}`); }}
          onNavigateToPrescription={(aptId, patientId) => {
            setShowMeetingResults(false);
            navigate(`/prescriptions/new?appointmentId=${encodeURIComponent(aptId)}&patientId=${encodeURIComponent(patientId)}`);
          }}
          onNavigateToLabOrder={(aptId, patientId) => {
            setShowMeetingResults(false);
            navigate(`/lab-orders/new?appointmentId=${encodeURIComponent(aptId)}&patientId=${encodeURIComponent(patientId)}`);
          }}
          onNavigateToNewAppointment={(patientId) => {
            setShowMeetingResults(false);
            navigate(`/appointments/new?patientId=${encodeURIComponent(patientId)}`);
          }}
        />
      )}
      {isMobile && nextTodayMeeting && (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden p-3 bg-white/95 dark:bg-gray-900/95 border-t shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={() => startInAppMeeting(nextTodayMeeting.id)}
            data-testid="sticky-start-meeting"
            className="w-full px-4 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            🎥 Start Meeting — {nextTodayMeeting.patientName || 'Patient'}
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default HealthMeeting;
