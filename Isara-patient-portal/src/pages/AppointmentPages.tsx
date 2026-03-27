import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { appointmentService, doctorService, googleService } from '../lib/services';
import { Appointment, Doctor, AppointmentStatus } from '../types';
import { Calendar, Clock, Video, MapPin, Plus, ChevronLeft, CalendarPlus, ExternalLink, FileText, AlertCircle, Activity, Pill, Stethoscope, CheckCircle2, Info, Mic, Image, Play } from 'lucide-react';
import SymptomInputStep from '../components/SymptomInputStep';

export function AppointmentListPage() {
  const { user } = useAuth();
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all' | 'confirmed' | 'completed'>('pending');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // i18n labels
  const labels = {
    myAppointments: { en: 'My Appointments', th: 'นัดหมายของฉัน' },
    trackAppointments: { en: 'Track your appointments with doctors', th: 'ติดตามสถานะการนัดหมายกับแพทย์' },
    bookNew: { en: 'Book New Appointment', th: 'ขอนัดหมายใหม่' },
    howToBook: { en: 'How to Book', th: 'วิธีการนัดหมาย' },
    howToBookDesc: { en: 'When you submit an appointment request with symptoms, the doctor will review and confirm the appropriate time.', th: 'เมื่อคุณส่งคำขอนัดหมายพร้อมรายละเอียดอาการ แพทย์จะตรวจสอบและยืนยันเวลานัดที่เหมาะสมให้คุณ' },
    pending: { en: 'Pending', th: 'รอการยืนยัน' },
    all: { en: 'All', th: 'ทั้งหมด' },
    confirmed: { en: 'Confirmed', th: 'ยืนยันแล้ว' },
    completed: { en: 'Completed', th: 'เสร็จสิ้น' },
    noAppointments: { en: 'No appointments found', th: 'ไม่มีการนัดหมาย' },
    bookAppointmentCta: { en: 'Start your first appointment request', th: 'เริ่มขอนัดหมายครั้งแรก' },
    dateOldest: { en: 'Date (Oldest)', th: 'วันที่ (เก่าสุด)' },
    dateNewest: { en: 'Date (Newest)', th: 'วันที่ (ใหม่สุด)' },
    viewDetails: { en: 'View Details', th: 'ดูรายละเอียด' },
  };

  useEffect(() => {
    if (user) loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    if (!user) return;
    try {
      const patientId = user.patientId || user.id;
      const data = await appointmentService.getByPatient(patientId);
      setAppointments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments
    .filter((apt) => {
      if (filter === 'pending') return ['pending', 'awaiting_doctor_response', 'in_pool'].includes(apt.status);
      if (filter === 'confirmed') return apt.status === 'confirmed';
      if (filter === 'completed') return ['completed', 'cancelled'].includes(apt.status);
      return true; // 'all' shows everything
    })
    .sort((a, b) => {
      const dateA = new Date(a.appointmentDate).getTime();
      const dateB = new Date(b.appointmentDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: isDark ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' : 'bg-yellow-100 text-yellow-700 border border-yellow-300',
      confirmed: isDark ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300',
      completed: isDark ? 'bg-blue-900/50 text-blue-300 border border-blue-700' : 'bg-blue-100 text-blue-700 border border-blue-300',
      cancelled: isDark ? 'bg-red-900/50 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300',
      in_pool: isDark ? 'bg-purple-900/50 text-purple-300 border border-purple-700' : 'bg-purple-100 text-purple-700 border border-purple-300',
      awaiting_doctor_response: isDark ? 'bg-orange-900/50 text-orange-300 border border-orange-700' : 'bg-orange-100 text-orange-700 border border-orange-300',
      in_progress: isDark ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700' : 'bg-cyan-100 text-cyan-700 border border-cyan-300',
      no_show: isDark ? 'bg-gray-700 text-gray-300 border border-gray-600' : 'bg-gray-100 text-gray-700 border border-gray-300',
      rescheduled: isDark ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' : 'bg-indigo-100 text-indigo-700 border border-indigo-300',
    };
    const labelsTh: Record<string, string> = {
      pending: '⏳ รอแพทย์ยืนยัน',
      confirmed: '✅ ยืนยันแล้ว',
      completed: '✔️ เสร็จสิ้น',
      cancelled: '❌ ยกเลิก',
      in_pool: '🔄 กำลังจัดหาแพทย์',
      awaiting_doctor_response: '📋 รอแพทย์ตอบรับ',
      in_progress: '🏥 กำลังพบแพทย์',
      no_show: '⚠️ ไม่มาตามนัด',
      rescheduled: '📅 เลื่อนนัด',
    };
    const labelsEn: Record<string, string> = {
      pending: '⏳ Pending',
      confirmed: '✅ Confirmed',
      completed: '✔️ Completed',
      cancelled: '❌ Cancelled',
      in_pool: '🔄 Finding Doctor',
      awaiting_doctor_response: '📋 Awaiting Response',
      in_progress: '🏥 In Progress',
      no_show: '⚠️ No Show',
      rescheduled: '📅 Rescheduled',
    };
    const statusLabels = language === 'th' ? labelsTh : labelsEn;
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status] || styles.pending}`}>{statusLabels[status] || status}</span>;
  };

  const filterLabelMap: Record<string, string> = {
    pending: `⏳ ${labels.pending[language]}`,
    all: `📋 ${labels.all[language]}`,
    confirmed: `✅ ${labels.confirmed[language]}`,
    completed: `📂 ${labels.completed[language]}`,
  };

  const getAppointmentCardClass = (status: string) => {
    if (status === 'pending') return isDark ? 'border-yellow-700 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50/30';
    if (status === 'confirmed') return isDark ? 'border-green-700 bg-green-900/20' : 'border-green-200 bg-green-50/30';
    return isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  };

  const getToggleClass = (isActive: boolean, activeClass: string) => {
    if (isActive) return activeClass;
    return isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{labels.myAppointments[language]}</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{labels.trackAppointments[language]}</p>
        </div>
        <Link to="/appointments/book" className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 shadow-sm">
          <Plus className="w-5 h-5" /> {labels.bookNew[language]}
        </Link>
      </div>

      {/* Info Banner */}
      <div className={`border rounded-xl p-4 mb-6 flex items-start gap-3 ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
        <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        <div>
          <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>{labels.howToBook[language]}</p>
          <p className={`text-xs mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {labels.howToBookDesc[language]}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {/* Filter tabs - รอการยืนยัน first, then ทั้งหมด */}
        {(['pending', 'all', 'confirmed', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getToggleClass(filter === f, 'bg-emerald-600 text-white')}`}
          >
            {filterLabelMap[f]}
          </button>
        ))}

        {/* Sort buttons */}
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{language === 'th' ? 'เรียงตามวันที่:' : 'Sort by date:'}</span>
          <button
            onClick={() => setSortOrder('desc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${getToggleClass(sortOrder === 'desc', 'bg-blue-600 text-white')}`}
          >
            {labels.dateNewest[language]}
          </button>
          <button
            onClick={() => setSortOrder('asc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${getToggleClass(sortOrder === 'asc', 'bg-blue-600 text-white')}`}
          >
            {labels.dateOldest[language]}
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={`skeleton-${i}`} className={`animate-pulse h-32 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`} />)}
        </div>
      )}
      {!loading && filteredAppointments.length === 0 && (
        <div className={`rounded-xl p-12 text-center border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Calendar className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{labels.noAppointments[language]}</p>
          <Link to="/appointments/book" className="inline-flex items-center gap-2 text-emerald-600 hover:underline font-medium">
            <Plus className="w-4 h-4" /> {labels.bookAppointmentCta[language]}
          </Link>
        </div>
      )}
      {!loading && filteredAppointments.length > 0 && (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => (
            <Link
              key={apt.id}
              to={`/appointments/${apt.id}`}
              className={`block rounded-xl p-5 border transition-all hover:shadow-md ${getAppointmentCardClass(apt.status)}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <img src={apt.doctorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(apt.doctorId)}`} alt={apt.doctorName} className="w-12 h-12 rounded-full" />
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{apt.doctorName}</p>
                    <p className="text-sm text-emerald-600">{apt.doctorSpecialty}</p>
                  </div>
                </div>
                {getStatusBadge(apt.status)}
              </div>

              {/* Symptom preview if available */}
              {apt.reason && (
                <div className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{language === 'th' ? 'อาการหลัก:' : 'Main symptoms:'}</p>
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{apt.reason}</p>
                </div>
              )}

              {/* CONFIRMED APPOINTMENT - Show Date/Time/Meeting Link prominently */}
              {apt.status === 'confirmed' && (
                <div className="mb-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">วันที่นัด</p>
                        <p className="font-bold text-gray-900">{formatDate(apt.appointmentDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">เวลา</p>
                        <p className="font-bold text-gray-900">{apt.appointmentTime} น.</p>
                      </div>
                    </div>
                  </div>

                  {/* Meeting Link for Telehealth - Use patientMeetingUrl if available */}
                  {apt.type === 'telehealth' && (apt.meetingLink || apt.patientMeetingUrl) && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Video className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">ลิงก์ประชุม (Jitsi Meet):</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-lg">
                        <span className="text-xs text-blue-600 truncate flex-1">
                          {(apt.patientMeetingUrl || apt.meetingLink || '').substring(0, 50)}...
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigator.clipboard.writeText(apt.patientMeetingUrl || apt.meetingLink || '');
                            alert('คัดลอกลิงก์แล้ว!');
                          }}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          คัดลอก
                        </button>
                      </div>
                      {/* Important notice about waiting for doctor */}
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        ⚠️ แพทย์จะเริ่มห้องประชุมก่อน กรุณารอให้แพทย์อนุมัติการเข้าร่วม
                      </p>
                    </div>
                  )}

                  {/* Quick Join Button */}
                  {apt.type === 'telehealth' && (apt.meetingLink || apt.patientMeetingUrl) && (
                    <div className="mt-3 flex flex-col gap-2">
                      <Link
                        to={`/meeting/${apt.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 font-medium"
                      >
                        <Video className="w-5 h-5" />
                        🎥 เข้าห้องประชุม (In-App)
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(apt.patientMeetingUrl || apt.meetingLink, '_blank');
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in New Tab
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* For non-confirmed appointments, show basic info */}
              {apt.status !== 'confirmed' && (
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {apt.status === 'pending' ? (
                      <span className="text-yellow-600">รอแพทย์นัดเวลา</span>
                    ) : (
                      formatDate(apt.appointmentDate)
                    )}
                  </span>
                  {apt.status !== 'pending' && (
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {apt.appointmentTime}</span>
                  )}
                  <span className="flex items-center gap-1">
                    {apt.type === 'telehealth' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    {apt.type === 'telehealth' ? 'ออนไลน์' : apt.hospitalName || 'ที่โรงพยาบาล'}
                  </span>
                </div>
              )}

              {apt.status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-xs text-yellow-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    กำลังรอแพทย์ตรวจสอบอาการและยืนยันเวลานัด
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookAppointmentPage() {
  const { user } = useAuth();
  const { language } = useSettings();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [step, setStep] = useState(1);

  // AI Analysis state
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    triageLevel: string;
    reasoning: string;
    selfCareRecommendations: string[];
    whenToSeekCare: string;
    warningSigns: string[];
    suggestedSpecialties?: string[];
  } | null>(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);

  // AI Suggestion state (for improving description)
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    suggestions: string[];
    improvedDescription?: string;
    followUpQuestions?: string[];
  } | null>(null);

  // Form state with detailed symptoms
  const [form, setForm] = useState({
    // Preferred schedule (patient preference, doctor will confirm)
    preferredDates: [] as string[],
    preferredTimeSlot: 'morning' as 'morning' | 'afternoon' | 'evening',
    type: 'telehealth' as 'telehealth' | 'in_person',
    urgency: 'normal' as 'normal' | 'urgent' | 'emergency',

    // Symptom details
    mainSymptom: '',
    symptomDescription: '',
    symptomDuration: '',
    symptomDurationUnit: 'days' as 'hours' | 'days' | 'weeks' | 'months',
    symptomSeverity: 3 as number, // 1-5 scale
    bodyParts: [] as string[],

    // Additional symptoms
    additionalSymptoms: [] as string[],
    fever: false,
    feverTemp: '',

    // Medical context
    currentMedications: '',
    allergies: '',
    previousTreatment: '',
    medicalHistory: '',

    // Additional notes
    additionalNotes: '',
    attachments: [] as string[],

    // AI recommendation
    suggestedSpecialty: '',
    skipDoctorSelection: false,

    // Audio recording
    audioBlob: null as Blob | null,
    audioUrl: '' as string,
    audioTranscript: '' as string,

    // Image uploads  
    images: [] as { file: File; preview: string; description?: string }[],
  });

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Common symptom options (bilingual)
  const commonSymptoms = language === 'th' 
    ? ['ปวดหัว', 'ไข้', 'ไอ', 'เจ็บคอ', 'คลื่นไส้', 'อาเจียน', 'ท้องเสีย', 'ปวดท้อง', 'อ่อนเพลีย', 'เวียนศีรษะ', 'หายใจลำบาก', 'ผื่น', 'ปวดกล้ามเนื้อ', 'นอนไม่หลับ']
    : ['Headache', 'Fever', 'Cough', 'Sore throat', 'Nausea', 'Vomiting', 'Diarrhea', 'Stomach pain', 'Fatigue', 'Dizziness', 'Difficulty breathing', 'Rash', 'Muscle pain', 'Insomnia'];

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await doctorService.getAll();
      setDoctors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (arr: string[], item: string) => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  };

  // Audio Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setForm(prev => ({ ...prev, audioBlob, audioUrl }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('ไม่สามารถเข้าถึงไมโครโฟนได้');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    if (form.audioUrl) {
      URL.revokeObjectURL(form.audioUrl);
    }
    setForm(prev => ({ ...prev, audioBlob: null, audioUrl: '', audioTranscript: '' }));
    setRecordingTime(0);
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Image Upload Functions
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    if (validFiles.length + form.images.length > 5) {
      alert('สามารถอัปโหลดรูปภาพได้สูงสุด 5 รูป');
      return;
    }

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setForm(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
  };

  const removeImage = (index: number) => {
    setForm(prev => {
      const newImages = [...prev.images];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  // AI-assisted symptom analysis (with audio and image support)
  /** Build symptom description from all form fields */
  const buildSymptomParts = (): string[] => {
    const parts: string[] = [];
    if (form.mainSymptom) parts.push(`อาการหลัก: ${form.mainSymptom}`);
    if (form.symptomDescription) parts.push(`รายละเอียด: ${form.symptomDescription}`);
    if (form.symptomDuration) {
      const unitMap = { hours: 'ชั่วโมง', days: 'วัน', weeks: 'สัปดาห์', months: 'เดือน' };
      parts.push(`ระยะเวลา: ${form.symptomDuration} ${unitMap[form.symptomDurationUnit]}`);
    }
    if (form.symptomSeverity) parts.push(`ความรุนแรง: ${form.symptomSeverity}/5`);
    if (form.fever) {
      const feverDetail = form.feverTemp ? `(${form.feverTemp}°C)` : '';
      parts.push(`มีไข้: ใช่ ${feverDetail}`);
    }
    if (form.currentMedications) parts.push(`ยาที่ใช้อยู่: ${form.currentMedications}`);
    if (form.allergies) parts.push(`ประวัติแพ้ยา/อาหาร: ${form.allergies}`);
    if (form.previousTreatment) parts.push(`การรักษาก่อนหน้า: ${form.previousTreatment}`);
    if (form.audioTranscript) parts.push(`คำอธิบายเพิ่มเติม (จากเสียง): ${form.audioTranscript}`);
    if (form.images.length > 0) parts.push(`แนบรูปภาพ: ${form.images.length} รูป`);
    return parts;
  };

  const analyzeSymptoms = async () => {
    // Check if there's ANY input to analyze
    const hasAnyInput = form.mainSymptom || form.symptomDescription || form.audioBlob || form.images.length > 0 ||
      form.fever || form.symptomDuration || form.currentMedications || form.allergies;

    if (!hasAnyInput) {
      alert('กรุณากรอกอาการ หรืออัดเสียง หรือแนบรูปภาพ');
      return;
    }

    setAiAnalyzing(true);
    try {
      const symptomText = buildSymptomParts().join('\n');

      console.log('[AI Analysis] Sending symptoms:', symptomText);

      // Send to API
      const response = await fetch('/api/ai/symptom-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          symptoms: symptomText,
          patientContext: {
            name: user?.name,
            previousTreatment: form.previousTreatment,
            medicalHistory: form.medicalHistory,
          }
        }),
      });

      if (response.ok) {
        const analysis = await response.json();
        console.log('[AI Analysis] Received:', analysis);
        setAiAnalysis(analysis);
        setShowAiAnalysis(true);

        // Auto-set urgency based on triage level
        if (analysis.triageLevel === 'Emergency') {
          setForm(prev => ({ ...prev, urgency: 'emergency' }));
        } else if (analysis.triageLevel === 'Urgent') {
          setForm(prev => ({ ...prev, urgency: 'urgent' }));
        }

        // Set suggested specialty if provided
        if (analysis.suggestedSpecialties && analysis.suggestedSpecialties.length > 0) {
          setForm(prev => ({ ...prev, suggestedSpecialty: analysis.suggestedSpecialties[0] }));
        }
      } else {
        const errorData = await response.json();
        console.error('[AI Analysis] Error:', errorData);
        alert('การวิเคราะห์ AI ไม่สำเร็จ: ' + (errorData.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('AI analysis failed:', e);
      alert('การวิเคราะห์ AI ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // AI-assisted suggestion for improving symptom description
  const suggestSymptoms = async () => {
    setAiSuggesting(true);
    try {
      const response = await fetch('/api/ai/symptom-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          currentDescription: form.symptomDescription,
          selectedSymptoms: form.mainSymptom
        }),
      });

      if (response.ok) {
        const suggestions = await response.json();
        setAiSuggestions(suggestions);
      } else {
        setAiSuggestions({
          suggestions: [
            'ลองอธิบายว่าอาการเริ่มเมื่อไหร่',
            'บอกว่าอาการเป็นตรงไหนของร่างกาย',
            'มีอะไรที่ทำให้อาการดีขึ้นหรือแย่ลงไหม'
          ]
        });
      }
    } catch (e) {
      console.error('AI suggestion failed:', e);
      setAiSuggestions({
        suggestions: [
          'ลองอธิบายอาการให้ละเอียดขึ้น',
          'บอกระยะเวลาที่เป็น',
          'บอกความรุนแรง 1-10'
        ]
      });
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Either need a selected doctor OR skipDoctorSelection must be true
    if (!selectedDoctor && !form.skipDoctorSelection) return;

    setSubmitting(true);

    try {
      const patientId = user.patientId || user.id;

      // Create symptom summary for the appointment
      const symptomSummary = {
        mainSymptom: form.mainSymptom,
        description: form.symptomDescription,
        duration: `${form.symptomDuration} ${form.symptomDurationUnit}`,
        severity: form.symptomSeverity,
        bodyParts: form.bodyParts,
        additionalSymptoms: form.additionalSymptoms,
        fever: form.fever ? form.feverTemp : null,
        currentMedications: form.currentMedications,
        allergies: form.allergies,
        previousTreatment: form.previousTreatment,
        medicalHistory: form.medicalHistory,
        additionalNotes: form.additionalNotes,
      };

      // Determine assignment method and initial status based on doctor selection
      const assignmentMethod = selectedDoctor ? 'patient_selected' : undefined;
      const initialStatus = selectedDoctor
        ? 'awaiting_doctor_response' as AppointmentStatus  // Selected doctor needs to respond
        : 'in_pool' as AppointmentStatus;  // Goes to pool for assignment

      // Create appointment request - Use field names that match the backend route
      const preferredDate = form.preferredDates[0]
        ? new Date(form.preferredDates[0]).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const preferredTime = timeSlotTimeValues[form.preferredTimeSlot];

      const appointment = await appointmentService.create({
        patientId,
        patientName: user.name,
        patientEmail: user.email,
        // If no doctor selected, mark as unassigned for pool
        doctorId: selectedDoctor?.id || 'unassigned',
        doctorName: selectedDoctor?.name || 'รอการจัดสรรแพทย์',
        doctorSpecialty: selectedDoctor?.specialty || form.suggestedSpecialty || 'ทั่วไป',
        doctorAvatar: selectedDoctor?.avatarUrl,
        // Patient's preferred schedule - use field names that backend expects
        preferredDate: preferredDate,
        preferredTime: preferredTime,
        requestedDate: preferredDate,  // Also send as requestedDate for compatibility
        requestedTime: preferredTime,
        appointmentType: form.type,  // Backend expects appointmentType not type
        status: initialStatus,
        reason: form.mainSymptom,
        symptomDescription: form.symptomDescription || form.mainSymptom,
        // Extended data
        symptoms: symptomSummary as any,
        preferredDates: form.preferredDates,
        preferredTimeSlot: form.preferredTimeSlot,
        urgency: form.urgency,
        aiAnalysis: aiAnalysis ? JSON.stringify(aiAnalysis) : undefined,
        notes: form.suggestedSpecialty ? `Suggested specialty: ${form.suggestedSpecialty}` : undefined,
        assignmentMethod: assignmentMethod,
      });

      // If no doctor selected (skipDoctorSelection) or system assignment, add to pool
      if (form.skipDoctorSelection) {
        try {
          await fetch('/api/appointment-pool', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
            body: JSON.stringify({
              appointmentId: appointment.id,
              patientId,
              patientName: user.name,
              patientEmail: user.email,
              requiredSpecialty: form.suggestedSpecialty || 'General Practitioner',
              symptoms: [form.mainSymptom, ...form.additionalSymptoms].filter(Boolean),
              symptomDescription: form.symptomDescription,
              urgency: form.urgency,
              preferredDates: form.preferredDates,
              preferredTimeSlot: form.preferredTimeSlot,
              appointmentType: form.type,
              poolReason: 'no_doctor_selected',
            }),
          });
        } catch (poolError) {
          console.error('Failed to add to pool:', poolError);
          // Appointment was still created, just not added to pool
        }
      }

      navigate('/appointments', {
        state: {
          message: selectedDoctor
            ? 'ส่งคำขอนัดหมายสำเร็จ! กรุณารอแพทย์ยืนยันเวลานัด หากแพทย์ไม่ว่างระบบจะจัดหาแพทย์ท่านอื่นให้'
            : 'ส่งคำขอนัดหมายสำเร็จ! ระบบจะจัดสรรแพทย์ที่เหมาะสมกับอาการของคุณ',
          type: 'success'
        }
      });
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper maps to avoid nested ternaries
  const durationUnitLabels: Record<string, string> = { hours: 'ชั่วโมง', days: 'วัน', weeks: 'สัปดาห์', months: 'เดือน' };
  const urgencyDisplayLabels: Record<string, string> = { normal: 'ปกติ', urgent: 'เร่งด่วน', emergency: 'ฉุกเฉิน' };
  const urgencyColorClass: Record<string, string> = { normal: 'text-green-600', urgent: 'text-yellow-600', emergency: 'text-red-600' };
  const timeSlotDisplayLabels: Record<string, string> = { morning: 'เช้า (09:00-12:00)', afternoon: 'บ่าย (13:00-16:00)', evening: 'เย็น (17:00-20:00)' };
  const getSeverityColorClass = (severity: number) => {
    if (severity <= 2) return 'text-green-600';
    if (severity <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const timeSlotTimeValues: Record<string, string> = { morning: '09:00', afternoon: '13:00', evening: '17:00' };

  // Step validation - NEW FLOW: Symptoms (with audio/image) → Schedule + Doctor Selection → Confirm
  const hasSymptomInput = form.mainSymptom.trim() !== '' || form.symptomDescription.trim() !== '' || form.audioBlob !== null || form.images.length > 0;
  const canProceedStep2 = hasSymptomInput;
  const canProceedStep3 = form.preferredDates.length > 0 && (form.skipDoctorSelection || selectedDoctor !== null);

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/appointments')} aria-label="ย้อนกลับ" title="ย้อนกลับ" className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ขอนัดหมายแพทย์</h1>
          <p className="text-sm text-gray-500">แพทย์จะยืนยันและนัดเวลาให้ภายหลัง</p>
        </div>
      </div>

      {/* Progress Steps - NEW FLOW: Symptoms (audio/image) → Schedule + Doctor → Confirm */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { num: 1, label: 'อาการ (เสียง/รูป)' },
          { num: 2, label: 'เวลา + แพทย์' },
          { num: 3, label: 'ยืนยัน' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= s.num ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
            </div>
            <span className={`ml-2 text-xs hidden sm:block ${step >= s.num ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>{s.label}</span>
            {i < 2 && <div className={`flex-1 h-1 mx-2 rounded ${step > s.num ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Symptoms Input with Tabs (NOW FIRST) */}
      {step === 1 && (
        <SymptomInputStep
          form={form}
          setForm={setForm}
          commonSymptoms={commonSymptoms}
          isRecording={isRecording}
          recordingTime={recordingTime}
          isPlaying={isPlaying}
          startRecording={startRecording}
          stopRecording={stopRecording}
          deleteRecording={deleteRecording}
          togglePlayback={togglePlayback}
          formatTime={formatTime}
          audioRef={audioRef}
          fileInputRef={fileInputRef}
          cameraInputRef={cameraInputRef}
          handleImageUpload={handleImageUpload}
          removeImage={removeImage}
          canProceedStep2={canProceedStep2}
          aiAnalyzing={aiAnalyzing}
          aiAnalysis={aiAnalysis}
          showAiAnalysis={showAiAnalysis}
          analyzeSymptoms={analyzeSymptoms}
          aiSuggesting={aiSuggesting}
          aiSuggestions={aiSuggestions}
          suggestSymptoms={suggestSymptoms}
          setStep={setStep}
        />
      )}

      {/* Step 2: Combined Schedule + Doctor Selection */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">เลือกวัน เวลา และแพทย์</p>
              <p className="text-xs text-blue-600 mt-1">เลือกวันที่สะดวกและแพทย์ที่ต้องการปรึกษา แพทย์จะยืนยันเวลานัดให้ภายหลัง</p>
            </div>
          </div>

          {/* Appointment Type */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">รูปแบบการพบแพทย์</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'telehealth' })}
                className={`p-4 rounded-xl border-2 transition-all ${form.type === 'telehealth' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Video className={`w-8 h-8 mx-auto mb-2 ${form.type === 'telehealth' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <p className={`font-medium ${form.type === 'telehealth' ? 'text-emerald-700' : 'text-gray-600'}`}>ออนไลน์</p>
                <p className="text-xs text-gray-500 mt-1">ผ่าน Video Call</p>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'in_person' })}
                className={`p-4 rounded-xl border-2 transition-all ${form.type === 'in_person' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <MapPin className={`w-8 h-8 mx-auto mb-2 ${form.type === 'in_person' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <p className={`font-medium ${form.type === 'in_person' ? 'text-emerald-700' : 'text-gray-600'}`}>ที่โรงพยาบาล</p>
                <p className="text-xs text-gray-500 mt-1">พบแพทย์ด้วยตนเอง</p>
              </button>
            </div>
          </div>

          {/* Urgency */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">ความเร่งด่วน</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'normal', label: 'ปกติ', desc: 'นัดได้ตามตาราง', color: 'green' },
                { value: 'urgent', label: 'เร่งด่วน', desc: 'ต้องการพบเร็ว', color: 'yellow' },
                { value: 'emergency', label: 'ฉุกเฉิน', desc: 'ต้องการพบทันที', color: 'red' },
              ].map((opt) => {
                const isSelected = form.urgency === opt.value;
                const borderBgClass = isSelected
                  ? `border-${opt.color}-500 bg-${opt.color}-50`
                  : 'border-gray-200 hover:border-gray-300';
                const textClass = isSelected ? `text-${opt.color}-700` : 'text-gray-600';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, urgency: opt.value as any })}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${borderBgClass}`}
                  >
                    <p className={`font-medium ${textClass}`}>{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar & Doctor Selection Side by Side on Desktop */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Calendar Selection */}
            <div className="space-y-4">
              {/* Preferred Dates */}
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  เลือกวันที่สะดวก
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {Array.from({ length: 14 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i + 1);
                    const dateStr = date.toISOString().split('T')[0];
                    const dayName = date.toLocaleDateString('th-TH', { weekday: 'short' });
                    const dayNum = date.getDate();
                    const monthName = date.toLocaleDateString('th-TH', { month: 'short' });
                    const isSelected = form.preferredDates.includes(dateStr);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const getDateButtonClass = () => {
                      if (isSelected) return 'border-emerald-500 bg-emerald-50';
                      if (isWeekend) return 'border-gray-200 bg-gray-50 hover:border-gray-300';
                      return 'border-gray-200 hover:border-gray-300';
                    };
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setForm({ ...form, preferredDates: toggleArrayItem(form.preferredDates, dateStr) })}
                        className={`p-2 rounded-xl border-2 transition-all text-center ${getDateButtonClass()}`}
                      >
                        <p className={`text-xs ${isWeekend ? 'text-red-500' : 'text-gray-500'}`}>{dayName}</p>
                        <p className={`text-lg font-semibold ${isSelected ? 'text-emerald-600' : 'text-gray-700'}`}>{dayNum}</p>
                        <p className="text-xs text-gray-400">{monthName}</p>
                      </button>
                    );
                  })}
                </div>
                {form.preferredDates.length > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-emerald-600 mb-1">วันที่เลือก ({form.preferredDates.length} วัน):</p>
                    <div className="flex flex-wrap gap-1">
                      {form.preferredDates.map(d => (
                        <span key={d} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                          {new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preferred Time Slot */}
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  ช่วงเวลาที่สะดวก
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'morning', label: 'เช้า', time: '09:00-12:00', icon: '🌅' },
                    { value: 'afternoon', label: 'บ่าย', time: '13:00-16:00', icon: '☀️' },
                    { value: 'evening', label: 'เย็น', time: '17:00-20:00', icon: '🌆' },
                  ].map((slot) => (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setForm({ ...form, preferredTimeSlot: slot.value as any })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${form.preferredTimeSlot === slot.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <span className="text-xl">{slot.icon}</span>
                      <p className={`font-medium text-sm ${form.preferredTimeSlot === slot.value ? 'text-emerald-700' : 'text-gray-600'}`}>{slot.label}</p>
                      <p className="text-xs text-gray-400">{slot.time}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Doctor Selection */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                เลือกแพทย์
              </h3>

              {/* Skip Doctor Selection Option */}
              <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                <label htmlFor="skip-doctor-selection" className="flex items-start gap-3 cursor-pointer">
                  <input
                    id="skip-doctor-selection"
                    type="checkbox"
                    checked={form.skipDoctorSelection}
                    onChange={(e) => {
                      setForm({ ...form, skipDoctorSelection: e.target.checked });
                      if (e.target.checked) setSelectedDoctor(null);
                    }}
                    className="w-5 h-5 rounded text-emerald-600 mt-0.5"
                    aria-label="ให้ระบบจัดสรรแพทย์ให้"
                  />
                  <div>
                    <p className="font-medium text-emerald-800">ให้ระบบจัดสรรแพทย์ให้</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      ระบบจะจัดสรรแพทย์ที่เหมาะสมกับอาการ
                    </p>
                  </div>
                </label>
              </div>

              {/* AI Suggested Specialty */}
              {form.suggestedSpecialty && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">AI แนะนำสาขา:</p>
                  <p className="font-medium text-purple-800">{form.suggestedSpecialty}</p>
                </div>
              )}

              {/* Doctor List */}
              {!form.skipDoctorSelection && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {loading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-xl" />
                      ))}
                    </>
                  ) : (
                    doctors.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDoctor(doc)}
                        className={`w-full p-3 rounded-xl border-2 text-left transition-all hover:shadow-md ${selectedDoctor?.id === doc.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-100 hover:border-emerald-300'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={doc.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(doc.id)}`}
                            alt={doc.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{doc.name}</p>
                            <p className="text-sm text-emerald-600">{doc.specialty}</p>
                            {doc.hospital && (
                              <p className="text-xs text-gray-500 truncate">{doc.hospital}</p>
                            )}
                          </div>
                          {selectedDoctor?.id === doc.id && (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected Doctor Summary */}
              {selectedDoctor && !form.skipDoctorSelection && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">แพทย์ที่เลือก:</p>
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                    <img
                      src={selectedDoctor.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedDoctor.id)}`}
                      alt={selectedDoctor.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-emerald-800">{selectedDoctor.name}</p>
                      <p className="text-xs text-emerald-600">{selectedDoctor.specialty}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              หมายเหตุเพิ่มเติม
            </h3>
            <textarea
              id="additional-notes"
              aria-label="หมายเหตุเพิ่มเติม"
              value={form.additionalNotes}
              onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
              placeholder="ข้อมูลเพิ่มเติมที่ต้องการแจ้งแพทย์..."
              className="w-full p-3 border border-gray-200 rounded-xl h-24 resize-none dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>

          <button
            onClick={() => {
              // Scroll to top of page when moving to next step
              globalThis.scrollTo({ top: 0, behavior: 'smooth' });
              setStep(3);
            }}
            disabled={!canProceedStep3}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            ถัดไป - ตรวจสอบและยืนยัน
          </button>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (selectedDoctor || form.skipDoctorSelection) && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">กรุณาตรวจสอบข้อมูลก่อนส่ง</p>
              <p className="text-xs text-yellow-600 mt-1">หลังจากส่งคำขอ แพทย์จะตรวจสอบและยืนยันเวลานัดหมายให้คุณ</p>
            </div>
          </div>

          {/* Doctor Info */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">แพทย์ที่ปรึกษา</h3>
            {selectedDoctor ? (
              <div className="flex items-center gap-4">
                <img src={selectedDoctor.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedDoctor.id)}`} alt={selectedDoctor.name} className="w-16 h-16 rounded-full" />
                <div>
                  <p className="font-semibold text-lg">{selectedDoctor.name}</p>
                  <p className="text-emerald-600">{selectedDoctor.specialty}</p>
                  {selectedDoctor.hospital && <p className="text-sm text-gray-500">{selectedDoctor.hospital}</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Stethoscope className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-emerald-800">ระบบจะจัดสรรแพทย์ให้</p>
                  <p className="text-sm text-emerald-600">แพทย์ที่เหมาะสมกับอาการจะถูกจัดสรรให้อัตโนมัติ</p>
                </div>
              </div>
            )}
          </div>

          {/* Symptoms Summary */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">สรุปอาการ</h3>
            <div className="space-y-3 text-sm">
              {form.mainSymptom && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">อาการหลัก:</span>
                  <span className="font-medium text-gray-800">{form.mainSymptom}</span>
                </div>
              )}
              {form.symptomDescription && (
                <div className="py-2 border-b border-gray-100">
                  <span className="text-gray-500">รายละเอียด:</span>
                  <p className="mt-1 text-gray-800">{form.symptomDescription}</p>
                </div>
              )}
              {form.symptomDuration && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">ระยะเวลา:</span>
                  <span className="font-medium">{form.symptomDuration} {durationUnitLabels[form.symptomDurationUnit]}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">ความรุนแรง:</span>
                <span className={`font-medium ${getSeverityColorClass(form.symptomSeverity)}`}>
                  ระดับ {form.symptomSeverity}/5
                </span>
              </div>
              {form.bodyParts.length > 0 && (
                <div className="py-2 border-b border-gray-100">
                  <span className="text-gray-500">ส่วนที่มีอาการ:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.bodyParts.map(p => <span key={p} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{p}</span>)}
                  </div>
                </div>
              )}
              {form.fever && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">ไข้:</span>
                  <span className="font-medium text-red-600">{form.feverTemp ? `${form.feverTemp}°C` : 'มีไข้'}</span>
                </div>
              )}
              {form.allergies && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">แพ้ยา:</span>
                  <span className="font-medium text-red-600">{form.allergies}</span>
                </div>
              )}

              {/* Audio Recording Summary */}
              {form.audioUrl && (
                <div className="py-2 border-b border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Mic className="w-4 h-4" /> บันทึกเสียง:
                  </span>
                  <div className="mt-2 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-blue-700">เสียงบันทึก ({formatTime(recordingTime)})</span>
                  </div>
                  {form.audioTranscript && (
                    <p className="mt-2 text-xs text-gray-600 italic">"{form.audioTranscript}"</p>
                  )}
                </div>
              )}

              {/* Images Summary */}
              {form.images.length > 0 && (
                <div className="py-2 border-b border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Image className="w-4 h-4" /> รูปภาพแนบ ({form.images.length} รูป):
                  </span>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                    {form.images.map((img, index) => (
                      <img
                        key={img.preview}
                        src={img.preview}
                        alt={`Attachment ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preferred Schedule Summary */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">ช่วงเวลาที่สะดวก</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">รูปแบบ:</span>
                <span className="font-medium">{form.type === 'telehealth' ? '🎥 ออนไลน์' : '🏥 ที่โรงพยาบาล'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">ความเร่งด่วน:</span>
                <span className={`font-medium ${urgencyColorClass[form.urgency]}`}>
                  {urgencyDisplayLabels[form.urgency]}
                </span>
              </div>
              <div className="py-2 border-b border-gray-100">
                <span className="text-gray-500">วันที่สะดวก:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.preferredDates.map(d => (
                    <span key={d} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                      {new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">ช่วงเวลา:</span>
                <span className="font-medium">{timeSlotDisplayLabels[form.preferredTimeSlot]}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                กำลังส่งคำขอ...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                ส่งคำขอนัดหมาย
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            หลังจากส่งคำขอ แพทย์จะตรวจสอบอาการและยืนยันเวลานัดหมายให้คุณทางแอป
          </p>
        </div>
      )}
    </div>
  );
}

export function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [meetLink, setMeetLink] = useState<string | null>(null);

  // i18n labels
  const detailLabels = {
    appointmentDetails: { en: 'Appointment Details', th: 'รายละเอียดนัดหมาย' },
    back: { en: 'Back', th: 'กลับ' },
    confirmCancel: { en: 'Are you sure you want to cancel this appointment?', th: 'ยืนยันยกเลิกนัดหมาย?' },
    cancelAppointment: { en: 'Cancel Appointment', th: 'ยกเลิกนัดหมาย' },
    addToCalendar: { en: 'Add to Calendar', th: 'เพิ่มลงปฏิทิน' },
    joinMeeting: { en: 'Join Meeting', th: 'เข้าร่วมประชุม' },
    notFound: { en: 'Appointment not found', th: 'ไม่พบนัดหมาย' },
    calendarError: { en: 'Could not add to calendar', th: 'ไม่สามารถเพิ่มลงปฏิทินได้' },
    doctor: { en: 'Doctor', th: 'แพทย์' },
    date: { en: 'Date', th: 'วันที่' },
    time: { en: 'Time', th: 'เวลา' },
    type: { en: 'Type', th: 'ประเภท' },
    reason: { en: 'Reason', th: 'อาการ/เหตุผล' },
    status: { en: 'Status', th: 'สถานะ' },
    telehealth: { en: 'Telehealth', th: 'ทางไกล' },
    inPerson: { en: 'In Person', th: 'พบตัว' },
  };

  useEffect(() => {
    if (id) loadAppointment();
  }, [id]);

  const loadAppointment = async () => {
    if (!id) return;
    try {
      const data = await appointmentService.getById(id);
      setAppointment(data);

      // Load Meet link if telehealth appointment
      if (data.type === 'telehealth') {
        try {
          const meetInfo = await googleService.getMeetInfo(id);
          if (meetInfo.meetLink) {
            setMeetLink(meetInfo.meetLink);
          }
        } catch (e) {
          console.error('Failed to get Meet info:', e);
          // Try to get from appointment data
          if (data.meetingLink) {
            setMeetLink(data.meetingLink);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !confirm(detailLabels.confirmCancel[language])) return;
    try {
      await appointmentService.cancel(id);
      navigate('/appointments');
    } catch (e) {
      console.error(e);
    }
  };

  const addToCalendar = async () => {
    if (!appointment) return;

    try {
      const startDateTime = new Date(`${new Date(appointment.appointmentDate).toISOString().split('T')[0]}T${appointment.appointmentTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const hospitalLabel = language === 'th' ? 'โรงพยาบาล' : 'Hospital';
      const eventLocation = appointment.type === 'telehealth'
        ? 'Google Meet'
        : (appointment.hospitalName || hospitalLabel);

      const appointmentLabel = language === 'th' ? 'นัดหมาย' : 'Appointment';
      const appointmentWith = language === 'th' ? 'นัดหมายแพทย์' : 'Appointment with';
      const eventSummary = `${appointmentLabel}: ${appointment.doctorName}`;
      const eventDescription = `${appointmentWith} ${appointment.doctorName} (${appointment.doctorSpecialty})`;

      const response = await googleService.createCalendarEvent({
        summary: eventSummary,
        description: eventDescription,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        location: eventLocation,
      });

      if (response.calendarUrl) {
        window.open(response.calendarUrl, '_blank');
      }
    } catch (e) {
      console.error('Error adding to calendar:', e);
      alert(detailLabels.calendarError[language]);
    }
  };

  const getStatusInfo = (status: string) => {
    type StatusInfo = { bg: string; text: string; icon: string; label: string; description: string };
    const statusColors: Record<string, { bg: string; text: string }> = {
      pending: { bg: isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200', text: isDark ? 'text-yellow-300' : 'text-yellow-700' },
      confirmed: { bg: isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200', text: isDark ? 'text-green-300' : 'text-green-700' },
      completed: { bg: isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200', text: isDark ? 'text-blue-300' : 'text-blue-700' },
      cancelled: { bg: isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200', text: isDark ? 'text-red-300' : 'text-red-700' },
    };
    const labelsTh: Record<string, { icon: string; label: string; description: string }> = {
      pending: { icon: '⏳', label: 'รอแพทย์ยืนยัน', description: 'แพทย์กำลังตรวจสอบอาการและจะนัดเวลาที่เหมาะสมให้คุณ' },
      confirmed: { icon: '✅', label: 'ยืนยันแล้ว', description: 'แพทย์ยืนยันนัดหมายแล้ว กรุณามาตามเวลานัด' },
      completed: { icon: '✔️', label: 'เสร็จสิ้น', description: 'นัดหมายนี้เสร็จสิ้นแล้ว' },
      cancelled: { icon: '❌', label: 'ยกเลิก', description: 'นัดหมายนี้ถูกยกเลิก' },
    };
    const labelsEn: Record<string, { icon: string; label: string; description: string }> = {
      pending: { icon: '⏳', label: 'Awaiting Confirmation', description: 'Doctor is reviewing your symptoms and will schedule an appropriate time' },
      confirmed: { icon: '✅', label: 'Confirmed', description: 'Doctor confirmed the appointment. Please arrive on time' },
      completed: { icon: '✔️', label: 'Completed', description: 'This appointment is completed' },
      cancelled: { icon: '❌', label: 'Cancelled', description: 'This appointment was cancelled' },
    };
    const key = status in statusColors ? status : 'pending';
    const color = statusColors[key];
    const label = (language === 'th' ? labelsTh : labelsEn)[key];
    return { ...color, ...label } as StatusInfo;
  };

  if (loading) return <div className={`flex items-center justify-center h-64 ${isDark ? 'bg-gray-900' : ''}`}><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
  if (!appointment) return <div className={`text-center py-12 ${isDark ? 'text-gray-400' : ''}`}>{detailLabels.notFound[language]}</div>;

  const statusInfo = getStatusInfo(appointment.status);

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/appointments')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
        <ChevronLeft className="w-5 h-5" /> กลับ
      </button>

      {/* Status Banner */}
      <div className={`${statusInfo.bg} border rounded-xl p-4 mb-4 flex items-start gap-3`}>
        <span className="text-xl">{statusInfo.icon}</span>
        <div>
          <p className={`font-semibold ${statusInfo.text}`}>{statusInfo.label}</p>
          <p className={`text-sm ${statusInfo.text} opacity-80`}>{statusInfo.description}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <img src={appointment.doctorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(appointment.doctorId)}`} alt={appointment.doctorName} className="w-16 h-16 rounded-full" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">{appointment.doctorName}</h1>
            <p className="text-emerald-600">{appointment.doctorSpecialty}</p>
            {appointment.hospitalName && (
              <p className="text-sm text-gray-500">{appointment.hospitalName}</p>
            )}
          </div>
        </div>

        {/* Date/Time - Different display for pending vs confirmed */}
        {appointment.status === 'pending' ? (
          <div className="p-4 bg-yellow-50 rounded-xl mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <p className="font-medium text-yellow-800">รอแพทย์นัดเวลา</p>
            </div>
            {appointment.preferredTimeSlots && (
              <div className="text-sm text-yellow-700">
                <p className="mb-1">ช่วงเวลาที่คุณสะดวก:</p>
                <ul className="list-disc list-inside ml-2">
                  {appointment.preferredTimeSlots.map((slot: string) => (
                    <li key={`slot-${slot}`}>{slot}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-emerald-600 mb-2" />
              <p className="text-sm text-gray-500">วันที่</p>
              <p className="font-semibold text-gray-800">{new Date(appointment.appointmentDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <Clock className="w-5 h-5 text-emerald-600 mb-2" />
              <p className="text-sm text-gray-500">เวลา</p>
              <p className="font-semibold text-gray-800">{appointment.appointmentTime} น.</p>
            </div>
          </div>
        )}

        {/* Appointment Type */}
        <div className="p-4 bg-gray-50 rounded-xl mb-6">
          <div className="flex items-center gap-2">
            {appointment.type === 'telehealth' ? <Video className="w-5 h-5 text-blue-600" /> : <MapPin className="w-5 h-5 text-emerald-600" />}
            <span className="font-medium text-gray-800">
              {appointment.type === 'telehealth' ? 'นัดหมายออนไลน์ (Telehealth)' : 'นัดหมายที่โรงพยาบาล'}
            </span>
          </div>
          {appointment.type !== 'telehealth' && appointment.hospitalName && (
            <p className="text-sm text-gray-500 mt-1 ml-7">{appointment.hospitalName}</p>
          )}
        </div>
      </div>

      {/* Symptom Information Section */}
      {(appointment.reason || appointment.symptoms) && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-600" />
            ข้อมูลอาการที่แจ้ง
          </h2>

          {appointment.reason && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">อาการหลัก</p>
              <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{appointment.reason}</p>
            </div>
          )}

          {appointment.symptoms && !Array.isArray(appointment.symptoms) && (
            <div className="space-y-3">
              {appointment.symptoms.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">ระยะเวลา: <span className="font-medium text-gray-800">{appointment.symptoms.duration}</span></span>
                </div>
              )}
              {Boolean(appointment.symptoms.severity) && (
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">ระดับความรุนแรง: <span className="font-medium text-gray-800">{appointment.symptoms.severity}/10</span></span>
                </div>
              )}
              {appointment.symptoms.additionalDetails && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-1">รายละเอียดเพิ่มเติม</p>
                  <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">{appointment.symptoms.additionalDetails}</p>
                </div>
              )}
              {appointment.symptoms.currentMedications && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                    <Pill className="w-4 h-4" /> ยาที่ใช้อยู่
                  </p>
                  <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">{appointment.symptoms.currentMedications}</p>
                </div>
              )}
              {appointment.symptoms.allergies && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> การแพ้
                  </p>
                  <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">{appointment.symptoms.allergies}</p>
                </div>
              )}
            </div>
          )}

          {/* Legacy symptoms as array */}
          {appointment.symptoms && Array.isArray(appointment.symptoms) && appointment.symptoms.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-gray-500 mb-1">อาการ</p>
              <div className="flex flex-wrap gap-2">
                {appointment.symptoms.map((symptom: string) => (
                  <span key={`symptom-${symptom}`} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">{symptom}</span>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis if available */}
          {appointment.aiAnalysis && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                <Info className="w-4 h-4" /> การวิเคราะห์เบื้องต้นจาก AI
              </p>
              <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                {appointment.aiAnalysis}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        {/* Add to Calendar button - only for confirmed appointments */}
        {appointment.status === 'confirmed' && (
          <button
            onClick={addToCalendar}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 mb-3"
          >
            <CalendarPlus className="w-5 h-5" /> เพิ่มลง Google Calendar
          </button>
        )}

        {/* Join Meeting button for telehealth */}
        {appointment.status === 'confirmed' && (meetLink || appointment.meetingLink) && (
          <a
            href={meetLink || appointment.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-xl text-center hover:bg-blue-700 mb-3"
          >
            <Video className="w-5 h-5" /> เข้าห้องประชุม
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
          <button onClick={handleCancel} className="w-full border border-red-300 text-red-600 py-3 rounded-xl hover:bg-red-50">
            ยกเลิกนัดหมาย
          </button>
        )}
      </div>
    </div>
  );
}
