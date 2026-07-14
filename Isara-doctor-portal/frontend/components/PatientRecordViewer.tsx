/**
 * Patient Record Viewer - PHR, EMR, EHR
 * Cross-portal: Doctor Portal reads PHR/EMR/EHR from Patient Portal PostgreSQL data.
 * Per-tab lazy loading with session caching, PDPA-protected.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PatientRecord } from '../types';
import {
  PHRData,
  EMRRecord,
  EHRData,
  LivingWillResponse,
  isLivingWillNotShared,
  VitalEntry,
  patientRecordService,
  PDPAPatientSummary,
  PrescriptionHistoryItem,
  MeetingHistoryItem,
} from '../services/patientRecordService';
import { useRealtimeSync } from '../services/useRealtimeSync';
import { useSettings } from '../hooks/useSettings';

interface PatientRecordViewerProps {
  patient: PatientRecord;
  onClose: () => void;
  currentDoctorId?: string;
  initialTab?: RecordTab;
}

type RecordTab = 'summary' | 'emr' | 'labs' | 'rx' | 'docs' | 'meetings' | 'pdpa';

const MEDICAL_TABS = new Set<RecordTab>(['summary', 'emr', 'labs', 'rx', 'docs', 'meetings']);

async function authDownload(url: string, fallbackName: string) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const streamUrl = url.startsWith('/api/recordings/')
    ? `/api/meetings/recording-stream?path=${encodeURIComponent(url.replace(/\?download=1$/, '').replace(/&download=1$/, ''))}&download=1`
    : url;
  const resp = await fetch(streamUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
  const blob = await resp.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fallbackName;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function fetchPdpaSummary(patientId: string) {
  return patientRecordService.getPDPASummary(patientId);
}

async function fetchPhrBundle(patientId: string) {
  const [data, lwData] = await Promise.all([
    patientRecordService.getPHR(patientId),
    patientRecordService.getLivingWill(patientId),
  ]);
  return { data, lwData };
}

async function fetchEmrRecords(patientId: string) {
  return patientRecordService.getEMRs(patientId);
}

async function fetchEhrData(patientId: string) {
  return patientRecordService.getEHR(patientId);
}

export const PatientRecordViewer: React.FC<PatientRecordViewerProps> = ({
  patient,
  onClose,
  currentDoctorId,
  initialTab = 'summary',
}) => {
  const { language } = useSettings();
  const isTh = language === 'th';
  const [activeTab, setActiveTab] = useState<RecordTab>(initialTab);

  // PDPA consent gate state
  const [consentStatus, setConsentStatus] = useState<'checking' | 'granted' | 'denied' | 'emergency'>('checking');
  const [requestSent, setRequestSent] = useState(false);
  const [emergencyAppointmentId, setEmergencyAppointmentId] = useState<string | null>(null);

  // Per-tab data
  const [phrData, setPhrData] = useState<PHRData | null>(null);
  const [livingWillData, setLivingWillData] = useState<LivingWillResponse>(null);
  const [emrRecords, setEmrRecords] = useState<EMRRecord[]>([]);
  const [ehrData, setEhrData] = useState<EHRData | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionHistoryItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingHistoryItem[]>([]);
  const [pdpaData, setPdpaData] = useState<PDPAPatientSummary | null>(null);

  // Per-tab loading states
  const [loadingPHR, setLoadingPHR] = useState(false);
  const [loadingEMR, setLoadingEMR] = useState(false);
  const [loadingEHR, setLoadingEHR] = useState(false);
  const [loadingRx, setLoadingRx] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [loadingPDPA, setLoadingPDPA] = useState(false);

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const loadedTabsRef = useRef(loadedTabs);
  loadedTabsRef.current = loadedTabs;

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Refs for scrolling
  const contentRef = useRef<HTMLDivElement>(null);

  const hasMedicalAccess = consentStatus === 'granted' || consentStatus === 'emergency';

  // Load tab data on first activation
  const loadTabData = useCallback(async (tab: RecordTab, force = false) => {
    if (!force && loadedTabsRef.current.has(tab)) return;
    setError(null);

    try {
      if (tab === 'pdpa') {
        setLoadingPDPA(true);
        setPdpaData(await fetchPdpaSummary(patient.id));
        setLoadedTabs(prev => new Set(prev).add('pdpa'));
        return;
      }
      if (!hasMedicalAccess) return;

      if (tab === 'summary') {
        setLoadingPHR(true);
        const { data, lwData } = await fetchPhrBundle(patient.id);
        setPhrData(data);
        setLivingWillData(lwData);
        setLoadedTabs(prev => new Set(prev).add('summary'));
        return;
      }
      if (tab === 'rx') {
        setLoadingRx(true);
        const [rxList, phrBundle] = await Promise.all([
          patientRecordService.getPrescriptions(patient.id),
          fetchPhrBundle(patient.id),
        ]);
        setPrescriptions(rxList);
        setPhrData(phrBundle.data);
        setLivingWillData(phrBundle.lwData);
        setLoadedTabs(prev => new Set(prev).add('rx').add('summary'));
        return;
      }
      if (tab === 'emr') {
        setLoadingEMR(true);
        setEmrRecords(await fetchEmrRecords(patient.id));
        setLoadedTabs(prev => new Set(prev).add('emr'));
        return;
      }
      if (tab === 'labs' || tab === 'docs') {
        setLoadingEHR(true);
        setEhrData(await fetchEhrData(patient.id));
        setLoadedTabs(prev => new Set(prev).add('labs').add('docs'));
        return;
      }
      if (tab === 'meetings') {
        setLoadingMeetings(true);
        setMeetings(await patientRecordService.getMeetings(patient.id));
        setLoadedTabs(prev => new Set(prev).add('meetings'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      if (msg.includes('PDPA consent')) {
        setConsentStatus('denied');
      }
      setError(msg);
    } finally {
      if (tab === 'summary') setLoadingPHR(false);
      if (tab === 'rx') setLoadingRx(false);
      if (tab === 'emr') setLoadingEMR(false);
      if (tab === 'labs' || tab === 'docs') setLoadingEHR(false);
      if (tab === 'meetings') setLoadingMeetings(false);
      if (tab === 'pdpa') setLoadingPDPA(false);
    }
  }, [patient.id, hasMedicalAccess]);

  // Near-real-time: invalidate cache and refetch active clinical tabs
  useRealtimeSync({
    doctorId: currentDoctorId,
    onEmrChange: () => {
      if (!hasMedicalAccess) return;
      patientRecordService.invalidatePatient(patient.id);
      setLoadedTabs(prev => {
        const next = new Set(prev);
        next.delete('emr');
        next.delete('docs');
        next.delete('labs');
        return next;
      });
      void loadTabData(activeTab === 'emr' || activeTab === 'docs' || activeTab === 'labs' ? activeTab : 'emr', true);
    },
    onPrescriptionChange: () => {
      if (!hasMedicalAccess) return;
      patientRecordService.invalidatePatient(patient.id);
      setLoadedTabs(prev => {
        const next = new Set(prev);
        next.delete('rx');
        next.delete('docs');
        return next;
      });
      void loadTabData(activeTab === 'rx' || activeTab === 'docs' ? activeTab : 'rx', true);
    },
    onLabOrderChange: () => {
      if (!hasMedicalAccess) return;
      patientRecordService.invalidatePatient(patient.id);
      setLoadedTabs(prev => {
        const next = new Set(prev);
        next.delete('labs');
        next.delete('docs');
        return next;
      });
      void loadTabData(activeTab === 'labs' || activeTab === 'docs' ? activeTab : 'labs', true);
    },
    onDataChanged: () => {
      if (!hasMedicalAccess) return;
      patientRecordService.invalidatePatient(patient.id);
      setLoadedTabs(new Set());
      void loadTabData(activeTab, true);
    },
    onNotification: () => {
      if (!hasMedicalAccess) return;
      // document_delivered and meeting-end arrive as notifications / data:changed fans
      patientRecordService.invalidatePatient(patient.id);
      setLoadedTabs(prev => {
        const next = new Set(prev);
        next.delete('docs');
        next.delete('meetings');
        next.delete('emr');
        return next;
      });
      if (activeTab === 'docs' || activeTab === 'meetings' || activeTab === 'emr') {
        void loadTabData(activeTab, true);
      }
    },
  });

  // PDPA consent check on mount
  useEffect(() => {
    let cancelled = false;
    const checkConsent = async () => {
      try {
        const result = await patientRecordService.checkPDPAConsent(patient.id);
        if (cancelled) return;
        if (result.hasConsent) {
          if (result.isEmergencyBypass) {
            setConsentStatus('emergency');
            setEmergencyAppointmentId(result.appointmentId || null);
          } else {
            setConsentStatus('granted');
          }
        } else {
          setConsentStatus('denied');
          setActiveTab('pdpa');
        }
      } catch {
        if (!cancelled) setConsentStatus('denied');
      }
    };
    checkConsent();
    return () => { cancelled = true; };
  }, [patient.id]);

  // Load initial tab — PDPA always; medical tabs only with consent
  useEffect(() => {
    loadTabData('pdpa');
    if (hasMedicalAccess) {
      loadTabData(initialTab === 'pdpa' ? 'summary' : initialTab);
    }
    return () => { patientRecordService.clearCache(); };
  }, [patient.id, hasMedicalAccess, initialTab, loadTabData]);

  // Load tab data when switching
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  // Build timeline navigator dates from EMR + EHR + Rx + meetings
  const timelineDates = buildTimelineDates(emrRecords, ehrData, prescriptions, meetings);

  const scrollToDate = (dateKey: string) => {
    const el = document.getElementById(`record-${dateKey}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isLoading = (activeTab === 'summary' && loadingPHR) ||
                    (activeTab === 'rx' && loadingRx) ||
                    (activeTab === 'emr' && loadingEMR) ||
                    ((activeTab === 'labs' || activeTab === 'docs') && loadingEHR) ||
                    (activeTab === 'meetings' && loadingMeetings) ||
                    (activeTab === 'pdpa' && loadingPDPA);

  const handleTabChange = (tab: RecordTab) => {
    if (!hasMedicalAccess && MEDICAL_TABS.has(tab)) {
      setActiveTab('pdpa');
      setError('PDPA consent required to access medical records');
      return;
    }
    setError(null);
    setActiveTab(tab);
  };

  // Handle request access
  const handleRequestAccess = async () => {
    const result = await patientRecordService.requestAccess(patient.id);
    if (result.success) setRequestSent(true);
  };

  // ── PDPA Consent Gate (checking spinner only) ──
  if (consentStatus === 'checking') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8 text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking PDPA consent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isTh ? 'บันทึกผู้ป่วย' : 'Patient Record'} - {patient.demographics?.name || patient.name || (isTh ? 'ไม่ระบุ' : 'Unknown')}
          </h2>
          <button onClick={onClose} title={isTh ? 'ปิด' : 'Close'} aria-label={isTh ? 'ปิด' : 'Close'} className="text-gray-400 hover:text-gray-600 p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Emergency / consent banners */}
        {consentStatus === 'emergency' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm text-amber-800 font-medium">
              Emergency Access — Active appointment {emergencyAppointmentId ? `(${emergencyAppointmentId})` : ''}. Access is logged and auditable.
            </span>
          </div>
        )}

        {consentStatus === 'denied' && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm text-red-800">
                PDPA consent required for medical records. Open the PDPA tab to review status or request access.
              </span>
            </div>
            {requestSent ? (
              <span className="shrink-0 text-sm text-emerald-700 font-medium">Request sent</span>
            ) : (
              <button
                onClick={handleRequestAccess}
                className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Request Access
              </button>
            )}
          </div>
        )}

        {/* Top Tabs — Summary | EMR | Labs | Rx | Docs | Meetings | PDPA */}
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
          {([
            { key: 'summary' as const, label: isTh ? 'สรุป' : 'Summary' },
            { key: 'emr' as const, label: 'EMR' },
            { key: 'labs' as const, label: isTh ? 'แล็บและภาพ' : 'Labs & Imaging' },
            { key: 'rx' as const, label: isTh ? 'ประวัติการจ่ายยา' : 'Prescriptions' },
            { key: 'docs' as const, label: isTh ? 'เอกสาร' : 'Documents' },
            { key: 'meetings' as const, label: isTh ? 'การประชุม' : 'Meetings' },
            { key: 'pdpa' as const, label: 'PDPA' },
          ]).map(tab => (
            <button
              key={tab.key}
              data-testid={`patient-record-tab-${tab.key}`}
              onClick={() => handleTabChange(tab.key)}
              className={`px-5 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${tab.key === 'pdpa' && consentStatus === 'denied' ? 'text-blue-700' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Sidebar — ประวัติการรักษา Timeline Navigator */}
          <div className="w-56 bg-white border-r border-gray-200 p-3 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">ประวัติการรักษา</p>
            {timelineDates.length > 0 ? (
              timelineDates.map(({ year, months }) => (
                <div key={year} className="mb-3">
                  <p className="text-sm font-bold text-gray-800">{year}</p>
                  {months.map(m => (
                    <button
                      key={m.key}
                      onClick={() => scrollToDate(m.key)}
                      className="w-full text-left text-xs px-2 py-1 rounded hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                    >
                      {m.label} <span className="text-gray-400">({m.count})</span>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">ไม่มีข้อมูล</p>
            )}
          </div>

          {/* Main Content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {isLoading ? (
              <>
                {(activeTab === 'summary') && <PHRSkeleton />}
                {activeTab === 'rx' && <PHRSkeleton />}
                {activeTab === 'emr' && <EMRSkeleton />}
                {(activeTab === 'labs' || activeTab === 'docs' || activeTab === 'meetings') && <EHRSkeleton />}
                {activeTab === 'pdpa' && <PDPASkeleton />}
              </>
            ) : (
              <>
                {activeTab === 'summary' && hasMedicalAccess && (
                  <div data-testid="patient-record-phr-summary">
                    <PHRView phrData={phrData} livingWillResponse={livingWillData} />
                  </div>
                )}
                {activeTab === 'emr' && hasMedicalAccess && <EMRView emrRecords={emrRecords} currentDoctorId={currentDoctorId} />}
                {activeTab === 'labs' && hasMedicalAccess && <LabsView ehrData={ehrData} />}
                {activeTab === 'rx' && hasMedicalAccess && (
                  <RxView phrData={phrData} prescriptions={prescriptions} />
                )}
                {activeTab === 'docs' && hasMedicalAccess && (
                  <DocsView
                    ehrData={ehrData}
                    patientId={patient.id}
                    onUploaded={() => {
                      patientRecordService.invalidatePatient(patient.id);
                      setLoadedTabs(prev => {
                        const next = new Set(prev);
                        next.delete('docs');
                        next.delete('labs');
                        return next;
                      });
                      void loadTabData('docs', true);
                    }}
                  />
                )}
                {activeTab === 'meetings' && hasMedicalAccess && <MeetingsView meetings={meetings} />}
                {activeTab === 'pdpa' && (
                  <div data-testid="patient-record-pdpa-tab">
                    <PDPAView
                      summary={pdpaData}
                      requestSent={requestSent}
                      onRequestAccess={handleRequestAccess}
                    />
                  </div>
                )}
                {!hasMedicalAccess && MEDICAL_TABS.has(activeTab) && (
                  <ConsentRequiredPanel
                    patientName={patient.demographics?.name || patient.name || 'This patient'}
                    requestSent={requestSent}
                    onRequestAccess={handleRequestAccess}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SKELETON LOADERS
// ============================================================================

const Pulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const PHRSkeleton: React.FC = () => (
  <div className="space-y-6">
    <Pulse className="h-40 w-full" />
    <Pulse className="h-8 w-48" />
    <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Pulse key={i} className="h-24" />)}</div>
    <Pulse className="h-32 w-full" />
    <Pulse className="h-32 w-full" />
    <Pulse className="h-24 w-full" />
  </div>
);

const EMRSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1,2,3].map(i => (
      <div key={i} className="bg-white rounded-lg shadow-sm p-6 space-y-3">
        <Pulse className="h-5 w-2/3" />
        <Pulse className="h-4 w-1/2" />
        <Pulse className="h-3 w-full" />
      </div>
    ))}
  </div>
);

const EHRSkeleton: React.FC = () => (
  <div className="space-y-4">
    <Pulse className="h-6 w-48" />
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
      <Pulse className="h-8 w-full" />
      {[1,2,3,4,5].map(i => <Pulse key={i} className="h-6 w-full" />)}
    </div>
  </div>
);

const PDPASkeleton: React.FC = () => (
  <div className="space-y-4">
    <Pulse className="h-24 w-full" />
    <Pulse className="h-40 w-full" />
    <Pulse className="h-32 w-full" />
  </div>
);

const PRIVACY_CONSENT_LABELS: Record<string, string> = {
  essential: 'Essential data',
  health_data: 'Health data',
  data_sharing: 'Share with project doctors',
  analytics: 'Analytics',
  marketing: 'Marketing',
  dataProcessing: 'Health data',
  research: 'Analytics',
};

const ConsentRequiredPanel: React.FC<{
  patientName: string;
  requestSent: boolean;
  onRequestAccess: () => void;
}> = ({ patientName, requestSent, onRequestAccess }) => (
  <div className="bg-white rounded-lg border border-red-200 p-8 text-center max-w-lg mx-auto mt-8">
    <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
      <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">PDPA Consent Required</h3>
    <p className="text-gray-600 mb-4">
      <strong>{patientName}</strong> has not granted you access to their medical records.
    </p>
    {requestSent ? (
      <p className="text-sm text-emerald-600">Access request sent. The patient will be notified.</p>
    ) : (
      <button
        onClick={onRequestAccess}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        Request Access from Patient
      </button>
    )}
  </div>
);

function pdpaAccessLabel(summary: PDPAPatientSummary): string {
  if (!summary.hasAccess) return 'No medical record access';
  if (summary.isEmergencyBypass) return 'Emergency appointment access';
  if (summary.isBroadConsent) return 'Broad data-sharing consent';
  if (summary.isAppointmentBypass) return 'Active appointment access';
  return 'Direct medical record consent';
}

function livingWillPrefKey(treatment: { preference?: string } | boolean): string {
  if (typeof treatment === 'boolean') return treatment ? 'accept' : 'refuse';
  return treatment.preference || 'conditional';
}

function PDPAView({
  summary,
  requestSent,
  onRequestAccess,
}: Readonly<{
  summary: PDPAPatientSummary | null;
  requestSent: boolean;
  onRequestAccess: () => void;
}>) {
  if (!summary) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
        <p className="text-gray-500">Unable to load PDPA consent information</p>
      </div>
    );
  }

  const accessLabel = pdpaAccessLabel(summary);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Your Access Status</h3>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          summary.hasAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
        }`}>
          {summary.hasAccess ? '✓ Access granted' : '✗ Access not granted'}
        </div>
        <p className="text-sm text-gray-600 mt-2">{accessLabel}</p>
        {summary.myAccess?.grantedAt && (
          <p className="text-xs text-gray-500 mt-1">
            Granted: {new Date(summary.myAccess.grantedAt).toLocaleString('th-TH')}
          </p>
        )}
        {!summary.hasAccess && (
          <div className="mt-4">
            {requestSent ? (
              <p className="text-sm text-emerald-600">Access request sent to patient.</p>
            ) : (
              <button
                onClick={onRequestAccess}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Request Access from Patient
              </button>
            )}
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Patient Privacy Settings</h3>
        {summary.privacyConsents.length === 0 ? (
          <p className="text-sm text-gray-500">No privacy consent records on file.</p>
        ) : (
          <ul className="space-y-2">
            {summary.privacyConsents.map((c) => (
              <li key={c.type} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                <span>{PRIVACY_CONSENT_LABELS[c.type] || c.type}</span>
                <span className={c.granted ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                  {c.granted ? 'Granted' : 'Not granted'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Doctors with Medical Record Access</h3>
        {summary.doctorAccess.length === 0 ? (
          <p className="text-sm text-gray-500">No per-doctor access grants recorded.</p>
        ) : (
          <div className="space-y-2">
            {summary.doctorAccess.map((d) => (
              <div key={d.doctorId} className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{d.doctorName}</p>
                  {d.doctorSpecialty && <p className="text-xs text-gray-500">{d.doctorSpecialty}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  d.granted && d.status === 'granted' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {d.granted && d.status === 'granted' ? 'Active' : d.status || 'Revoked'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Consent Activity</h3>
        {summary.recentAudit.length === 0 ? (
          <p className="text-sm text-gray-500">No audit entries yet.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {summary.recentAudit.map((entry, idx) => (
              <li key={`${entry.timestamp}-${entry.action}-${idx}`} className="text-sm border-b border-gray-100 pb-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-gray-800">{entry.action}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {new Date(entry.timestamp).toLocaleString('th-TH')}
                  </span>
                </div>
                {entry.doctorName && (
                  <p className="text-xs text-gray-500 mt-0.5">Doctor: {entry.doctorName}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// LIVING WILL CARD
// ============================================================================

const LivingWillCard: React.FC<{ livingWillResponse: LivingWillResponse }> = ({ livingWillResponse }) => {
  const [expanded, setExpanded] = useState(false);

  const getPreferenceLabel = (pref: string) => {
    switch (pref) {
      case 'accept': return { text: 'ยอมรับ', color: 'bg-green-100 text-green-800' };
      case 'refuse': return { text: 'ปฏิเสธ', color: 'bg-red-100 text-red-800' };
      case 'conditional': return { text: 'มีเงื่อนไข', color: 'bg-yellow-100 text-yellow-800' };
      default: return { text: pref, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const treatmentLabels: Record<string, string> = {
    cpr: 'การปั๊มหัวใจ (CPR)',
    mechanicalVentilation: 'เครื่องช่วยหายใจ',
    artificialNutrition: 'การให้อาหารทางสาย',
    dialysis: 'การฟอกไต',
    antibiotics: 'ยาปฏิชีวนะ',
    painManagement: 'การจัดการความเจ็บปวด',
    organDonation: 'การบริจาคอวัยวะ',
  };

  // State 1: No living will at all
  if (!livingWillResponse) {
    return (
      <div className="bg-gray-50 rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700">หนังสือแสดงเจตนา (Living Will)</h3>
            <p className="text-sm text-gray-500">ผู้ป่วยยังไม่มีหนังสือแสดงเจตนา</p>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Living will exists but NOT shared with this doctor
  if (isLivingWillNotShared(livingWillResponse)) {
    return (
      <div className="bg-amber-50 rounded-lg shadow-sm p-6 mb-6 border-2 border-amber-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-800">หนังสือแสดงเจตนา (Living Will)</h3>
            <p className="text-sm text-amber-700">ผู้ป่วยยังไม่ได้แชร์หนังสือแสดงเจตนากับท่าน</p>
            <p className="text-xs text-amber-600 mt-1">กรุณาขอให้ผู้ป่วยแชร์หนังสือแสดงเจตนาจากแอปผู้ป่วย</p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Authorized — show full card
  const livingWill = livingWillResponse;

  const quickItems: { key: string; label: string }[] = [
    { key: 'cpr', label: 'CPR' },
    { key: 'mechanicalVentilation', label: 'เครื่องช่วยหายใจ' },
    { key: 'painManagement', label: 'ความเจ็บปวด' },
    { key: 'organDonation', label: 'บริจาคอวัยวะ' },
  ];

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow-sm p-6 mb-6 border-2 border-purple-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-purple-900">หนังสือแสดงเจตนา (Living Will)</h3>
            <p className="text-sm text-purple-600">
              สถานะ: <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                livingWill.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {livingWill.status === 'active' ? 'ใช้งาน' : livingWill.status}
              </span>
              {' | '}เวอร์ชัน {livingWill.version}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1"
        >
          {expanded ? 'ย่อ' : 'ดูรายละเอียด'}
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {quickItems.map(item => {
          const treatment = (livingWill.treatments as unknown as Record<string, { preference?: string } | boolean>)?.[item.key];
          if (treatment == null) return null;
          const pref = getPreferenceLabel(livingWillPrefKey(treatment));
          return (
            <div key={item.key} className="text-center p-2 bg-white rounded-lg">
              <div className="text-xs text-gray-500">{item.label}</div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${pref.color}`}>{pref.text}</span>
            </div>
          );
        })}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-4 border-t border-purple-200 pt-4">
          <div>
            <h4 className="text-sm font-semibold text-purple-800 mb-2">ความต้องการการรักษาทั้งหมด</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(livingWill.treatments).map(([key, treatment]) => {
                if (key === 'otherTreatments') return null;
                const t = treatment as { preference?: string; conditions?: string } | boolean;
                const prefKey = livingWillPrefKey(t);
                const conditions = typeof t === 'boolean' ? undefined : t.conditions;
                return (
                  <div key={key} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="text-sm text-gray-700">{treatmentLabels[key] || key}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPreferenceLabel(prefKey).color}`}>
                        {getPreferenceLabel(prefKey).text}
                      </span>
                      {conditions && <span className="text-xs text-gray-500" title={conditions}>📝</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {livingWill.personalStatement && (
            <div>
              <h4 className="text-sm font-semibold text-purple-800 mb-1">คำแถลงส่วนตัว</h4>
              <p className="text-sm text-gray-700 bg-white p-3 rounded">{livingWill.personalStatement}</p>
            </div>
          )}
          {livingWill.additionalInstructions && (
            <div>
              <h4 className="text-sm font-semibold text-purple-800 mb-1">คำสั่งเพิ่มเติม</h4>
              <p className="text-sm text-gray-700 bg-white p-3 rounded">{livingWill.additionalInstructions}</p>
            </div>
          )}
          {livingWill.mainRepresentative && (
            <div>
              <h4 className="text-sm font-semibold text-purple-800 mb-1">ผู้แทนในการตัดสินใจ</h4>
              <div className="bg-white p-3 rounded">
                <p className="text-sm font-medium">{livingWill.mainRepresentative.name}</p>
                <p className="text-xs text-gray-500">
                  {livingWill.mainRepresentative.relationship} | โทร: {livingWill.mainRepresentative.phone}
                  {livingWill.mainRepresentative.email && ` | ${livingWill.mainRepresentative.email}`}
                </p>
              </div>
            </div>
          )}
          <div className="text-xs text-gray-500 flex justify-between pt-2 border-t border-purple-100">
            <span>มีผลตั้งแต่: {new Date(livingWill.effectiveDate).toLocaleDateString('th-TH')}</span>
            <span>อัปเดตล่าสุด: {new Date(livingWill.lastUpdated).toLocaleDateString('th-TH')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTrendArrow(current: number | null, previous: number | null): string {
  if (current == null || previous == null) return '';
  if (current > previous) return ' ↑';
  if (current < previous) return ' ↓';
  return ' →';
}

function getArrowColorClass(arrow: string): string {
  if (arrow.includes('↑')) return 'text-red-500';
  if (arrow.includes('↓')) return 'text-blue-500';
  return 'text-gray-400';
}

function getSeverityChipClass(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'high': case 'severe': return 'bg-red-100 text-red-700';
    case 'medium': case 'moderate': return 'bg-orange-100 text-orange-700';
    case 'low': case 'mild': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getExerciseLabel(exercise: string | null): string {
  const labels: Record<string, string> = {
    'none': 'ไม่ออกกำลังกาย',
    'light': 'เบา (1-2 วัน/สัปดาห์)',
    'moderate': 'ปานกลาง (3-4 วัน/สัปดาห์)',
    'active': 'บ่อย (5-6 วัน/สัปดาห์)',
    'very-active': 'มาก (ทุกวัน)',
  };
  return exercise ? (labels[exercise] || exercise) : 'ไม่ระบุ';
}

function getSmokingLabel(smoking: string | null): string {
  if (!smoking) return 'ไม่ระบุ';
  const labels: Record<string, string> = {
    'current': 'สูบอยู่', 'occasional': 'สูบเป็นครั้งคราว',
    'former': 'เคยสูบ (เลิกแล้ว)', 'never': 'ไม่สูบ', 'false': 'ไม่สูบ',
  };
  return labels[smoking] || smoking;
}

function getAlcoholLabel(alcohol: string | null): string {
  if (!alcohol) return 'ไม่ระบุ';
  const labels: Record<string, string> = {
    'occasional': 'ดื่มเป็นครั้งคราว', 'moderate': 'ดื่มปานกลาง',
    'frequent': 'ดื่มบ่อย', 'former': 'เคยดื่ม (เลิกแล้ว)', 'never': 'ไม่ดื่ม', 'false': 'ไม่ดื่ม',
  };
  return labels[alcohol] || alcohol;
}

function getLabFlagClass(flag: string): string {
  switch (flag?.toUpperCase()) {
    case 'CRITICAL': return 'bg-red-600 text-white';
    case 'HIGH': return 'bg-yellow-100 text-yellow-700';
    case 'LOW': return 'bg-blue-100 text-blue-700';
    case 'NORMAL': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

interface TimelineDateGroup {
  year: number;
  months: { key: string; label: string; count: number }[];
}

function buildTimelineDates(
  emrs: EMRRecord[],
  ehrData: EHRData | null,
  prescriptions: PrescriptionHistoryItem[] = [],
  meetings: MeetingHistoryItem[] = [],
): TimelineDateGroup[] {
  const monthMap = new Map<string, number>();

  const addDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  };

  emrs.forEach(e => addDate(e.encounterDate));
  ehrData?.labGroups?.forEach(g => addDate(g.completedDate || g.orderDate));
  ehrData?.imagingGroups?.forEach(g => addDate(g.completedDate || g.orderDate));
  ehrData?.externalRecords?.forEach(r => addDate(r.uploadedAt));
  prescriptions.forEach(p => addDate(p.prescribed_date || p.created_at));
  meetings.forEach(m => addDate(m.endedAt || m.startedAt || m.createdAt));

  const sorted = [...monthMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const yearMap = new Map<number, { key: string; label: string; count: number }[]>();

  const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  for (const [key, count] of sorted) {
    const [yearStr, monthStr] = key.split('-');
    const year = Number.parseInt(yearStr, 10);
    if (!yearMap.has(year)) yearMap.set(year, []);
    const arr = yearMap.get(year);
    if (arr) arr.push({ key, label: monthNames[Number.parseInt(monthStr, 10) - 1], count });
  }

  return [...yearMap.entries()].map(([year, months]) => ({ year, months }));
}

// ============================================================================
// PHR VIEW
// ============================================================================

const PHRView: React.FC<{ phrData: PHRData | null; livingWillResponse: LivingWillResponse }> = ({ phrData, livingWillResponse }) => {
  if (!phrData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg">ยังไม่มีข้อมูล Personal Health Record</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Living Will Card */}
      <LivingWillCard livingWillResponse={livingWillResponse} />

      {/* 2. Vitals Summary */}
      <VitalsSummarySection vitals={phrData.vitalsSummary} />

      {/* 3. Current Medications */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
          รายการยาปัจจุบัน (Current Medications)
        </h3>
        {phrData.medications.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">ชื่อยา</th>
                <th className="text-left p-2">ขนาด</th>
                <th className="text-left p-2">ความถี่</th>
                <th className="text-left p-2">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {phrData.medications.map((m) => (
                <tr key={m.name} className="border-t">
                  <td className="p-2 font-medium">{m.name}</td>
                  <td className="p-2">{m.dosage || '-'}</td>
                  <td className="p-2">{m.frequency || '-'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {m.status === 'active' ? 'ใช้อยู่' : 'หยุดใช้'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 text-sm">ไม่มีข้อมูลยา</p>
        )}
      </section>

      {/* 4. Allergies */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
          การแพ้ (Allergies)
        </h3>
        {phrData.allergies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {phrData.allergies.map((a) => (
              <div key={a.allergen} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                <span className="font-medium text-sm">{a.allergen}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityChipClass(a.severity)}`}>
                  {a.severity}
                </span>
                {a.reaction && <span className="text-xs text-gray-500">({a.reaction})</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">ไม่มีข้อมูลการแพ้</p>
        )}
      </section>

      {/* 5. Chronic Conditions */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
          โรคประจำตัว (Chronic Conditions)
        </h3>
        {phrData.chronicConditions.length > 0 ? (
          <div className="space-y-2">
            {phrData.chronicConditions.map((c) => (
              <div key={c.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                <span className="font-medium text-sm">{c.name}</span>
                <div className="flex items-center gap-3">
                  {c.diagnosedDate && (
                    <span className="text-xs text-gray-500">
                      วินิจฉัย: {new Date(c.diagnosedDate).toLocaleDateString('th-TH')}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.status === 'active' || c.status === 'controlled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">ไม่มีข้อมูลโรคประจำตัว</p>
        )}
      </section>

      {/* 6. Lifestyle Panel */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
          ไลฟ์สไตล์ (Lifestyle)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'การกินอาหาร', value: phrData.lifestyle.diet || 'ไม่ระบุ' },
            { label: 'การออกกำลังกาย', value: getExerciseLabel(phrData.lifestyle.exercise) },
            { label: 'การนอน', value: phrData.lifestyle.sleepHours ? `${phrData.lifestyle.sleepHours} ชม./วัน` : 'ไม่ระบุ' },
            { label: 'สูบบุหรี่', value: getSmokingLabel(phrData.lifestyle.smoking) },
            { label: 'ดื่มแอลกอฮอล์', value: getAlcoholLabel(phrData.lifestyle.alcohol) },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-emerald-600 font-medium mb-1">{item.label}</p>
              <p className="text-sm text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// VITALS SUMMARY SECTION
// ============================================================================

const VitalsSummarySection: React.FC<{ vitals: VitalEntry[] }> = ({ vitals }) => {
  if (!vitals || vitals.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
          Vitals Summary
        </h3>
        <p className="text-gray-400 text-sm">ไม่มีข้อมูลสัญญาณชีพ</p>
      </section>
    );
  }

  // Group last 5 entries per vital type
  const vitalTypes: { key: keyof VitalEntry; label: string; unit: string; format: (v: VitalEntry) => string | null }[] = [
    { key: 'bloodPressureSystolic', label: 'ความดันโลหิต (BP)', unit: 'mmHg',
      format: v => v.bloodPressureSystolic == null ? null : `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` },
    { key: 'heartRate', label: 'อัตราการเต้นหัวใจ (HR)', unit: 'bpm', format: v => v.heartRate == null ? null : String(v.heartRate) },
    { key: 'temperature', label: 'อุณหภูมิ (Temp)', unit: '°C', format: v => v.temperature == null ? null : String(v.temperature) },
    { key: 'weight', label: 'น้ำหนัก (Weight)', unit: 'kg', format: v => v.weight == null ? null : String(v.weight) },
    { key: 'bloodGlucose', label: 'น้ำตาลในเลือด (BG)', unit: 'mg/dL', format: v => v.bloodGlucose == null ? null : String(v.bloodGlucose) },
  ];

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
        Vitals Summary (ล่าสุด 5 ครั้ง)
      </h3>
      <div className="space-y-4">
        {vitalTypes.map(vt => {
          const entries = vitals
            .filter(v => vt.format(v) !== null)
            .slice(0, 5);
          if (entries.length === 0) return null;
          return (
            <div key={vt.key}>
              <p className="text-sm font-semibold text-gray-700 mb-1">{vt.label}</p>
              <div className="flex gap-3 overflow-x-auto">
                {entries.map((entry, idx) => {
                  const prevEntry = entries[idx + 1];
                  const currentVal = entry[vt.key] as number | null;
                  const prevVal = prevEntry ? (prevEntry[vt.key] as number | null) : null;
                  const arrow = getTrendArrow(currentVal, prevVal);
                  return (
                    <div key={entry.id} className="flex-shrink-0 bg-gray-50 rounded-lg px-3 py-2 text-center min-w-[100px]">
                      <p className="text-sm font-bold text-gray-900">
                        {vt.format(entry)}
                        <span className={`ml-1 ${getArrowColorClass(arrow)}`}>
                          {arrow}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">{vt.unit}</p>
                      <p className="text-xs text-gray-400">{new Date(entry.measuredAt).toLocaleDateString('th-TH')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ============================================================================
// EMR VIEW
// ============================================================================

const EMRView: React.FC<{ emrRecords: EMRRecord[]; currentDoctorId?: string }> = ({ emrRecords, currentDoctorId }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (emrRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg">ยังไม่มีข้อมูล Electronic Medical Record</p>
      </div>
    );
  }

  const formatSOAPField = (field: Record<string, unknown> | string | null): string => {
    if (!field) return '-';
    if (typeof field === 'string') return field;
    // JSONB objects — display key-value pairs
    return Object.entries(field)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => {
        let val: string;
        if (v !== null && typeof v === 'object') {
          val = JSON.stringify(v);
        } else if (typeof v === 'string') {
          val = v;
        } else if (typeof v === 'number' || typeof v === 'boolean') {
          val = `${v}`;
        } else {
          val = '';
        }
        return `${k}: ${val}`;
      })
      .join('; ') || '-';
  };

  return (
    <div className="space-y-4">
      {emrRecords.map(emr => {
        const dateKey = new Date(emr.encounterDate).toISOString().slice(0, 7);
        const isExpanded = expandedIds.has(emr.id);
        return (
          <div
            key={emr.id}
            id={`record-${dateKey}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Header — always visible */}
            <button
              onClick={() => toggleExpand(emr.id)}
              className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-sm font-bold text-blue-700">
                  {new Date(emr.encounterDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div className="text-sm text-gray-700">
                  {emr.doctorName}
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                  {emr.status}
                </span>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded SOAP content */}
            {isExpanded && (
              <div className="px-6 pb-5 border-t border-gray-100 space-y-3">
                {[
                  { label: 'Subjective', data: emr.subjective },
                  { label: 'Objective', data: emr.objective },
                  { label: 'Assessment', data: emr.assessment },
                  { label: 'Plan', data: emr.plan },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-xs font-semibold text-gray-500 uppercase">{s.label}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{formatSOAPField(s.data as Record<string, unknown> | string | null)}</p>
                  </div>
                ))}

                {/* Footer badges */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
                  {emr.prescriptionCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 text-xs">
                      💊 Prescriptions: {emr.prescriptionCount}
                    </span>
                  )}
                  {emr.labOrderCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs">
                      🔬 Lab Orders: {emr.labOrderCount}
                    </span>
                  )}
                  {emr.patientInstructions && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                      📄 Patient Instructions
                    </span>
                  )}
                  {emr.aiGenerated && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs">
                      🤖 Generated by AI {emr.aiApproved && emr.aiApprovedBy ? `+ Validated by ${emr.aiApprovedBy}` : '(pending validation)'}
                    </span>
                  )}
                  {currentDoctorId && emr.doctorId === currentDoctorId && (
                    <button className="ml-auto px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700">
                      Edit EMR
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// LABS VIEW
// ============================================================================

const LabsView: React.FC<{ ehrData: EHRData | null }> = ({ ehrData }) => {
  const labs = ehrData?.labGroups || [];
  const imaging = ehrData?.imagingGroups || [];
  if (labs.length === 0 && imaging.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg">ยังไม่มีผลแล็บหรือภาพวินิจฉัย</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xl font-bold text-gray-900 mb-4">ผลตรวจทางห้องปฏิบัติการ (Lab Results)</h3>
        {labs.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีผลแล็บ</p>
        ) : labs.map(group => {
          const dateKey = new Date(group.completedDate || group.orderDate).toISOString().slice(0, 7);
          return (
            <div key={group.id} id={`record-${dateKey}`} className="bg-white rounded-lg shadow-sm p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {new Date(group.completedDate || group.orderDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500">{group.doctorName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {group.priority === 'urgent' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">URGENT</span>
                  )}
                  {group.downloadUrl && (
                    <button
                      type="button"
                      data-testid="patient-record-lab-download"
                      onClick={() => void authDownload(group.downloadUrl!, `lab-${group.id}.pdf`)}
                      className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                    >
                      ดาวน์โหลดผล
                    </button>
                  )}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Test</th>
                    <th className="text-left p-2">Value</th>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-left p-2">Normal Range</th>
                    <th className="text-left p-2">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tests.map((test) => (
                    <tr key={`${group.id}-${test.name}`} className="border-t">
                      <td className="p-2">{test.name}</td>
                      <td className="p-2 font-medium">{test.value}</td>
                      <td className="p-2 text-gray-500">{test.unit}</td>
                      <td className="p-2 text-gray-500">{test.normalRange}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLabFlagClass(test.flag)}`}>
                          {test.flag === 'CRITICAL' ? '🔴 ' : ''}{test.flag}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {group.aiAnalysis && (
                <div className="mt-3 bg-amber-50 rounded p-3 text-sm text-amber-800">
                  <p className="text-xs font-semibold text-amber-600 mb-1">🤖 AI Analysis</p>
                  {group.aiAnalysis}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section>
        <h3 className="text-xl font-bold text-gray-900 mb-4">ผลภาพวินิจฉัย (Imaging)</h3>
        {imaging.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีผลภาพวินิจฉัย</p>
        ) : imaging.map(group => (
          <div key={group.id} className="bg-white rounded-lg shadow-sm p-5 mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-800">
                {[group.imagingType, group.bodyPart].filter(Boolean).join(' — ') || 'Imaging'}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(group.completedDate || group.orderDate).toLocaleDateString('th-TH')} — {group.doctorName}
              </p>
              {group.findings && <p className="text-sm text-gray-700 mt-2">{group.findings}</p>}
            </div>
            {group.downloadUrl && (
              <button
                type="button"
                data-testid="patient-record-lab-download"
                onClick={() => void authDownload(group.downloadUrl!, `imaging-${group.id}.pdf`)}
                className="shrink-0 px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
              >
                ดาวน์โหลดผล
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
};

// ============================================================================
// RX VIEW — ประวัติการจ่ายยา
// ============================================================================

const RxView: React.FC<{ phrData: PHRData | null; prescriptions: PrescriptionHistoryItem[] }> = ({
  phrData,
  prescriptions,
}) => {
  const currentMeds = phrData?.medications || [];

  return (
    <div className="space-y-6">
      {currentMeds.length > 0 && (
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
            ยาที่ใช้ปัจจุบัน (Current Medications)
          </h3>
          <ul className="space-y-1 text-sm text-gray-700">
            {currentMeds.map((m) => (
              <li key={`${m.name}-${m.dosage}`}>
                {m.name} {m.dosage ? `— ${m.dosage}` : ''} {m.frequency ? `(${m.frequency})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
          ประวัติการจ่ายยา (Prescription History)
        </h3>
        {prescriptions.length === 0 ? (
          <p className="text-gray-500 text-sm">ยังไม่มีประวัติการจ่ายยา</p>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((rx) => {
              const meds = Array.isArray(rx.medications) ? rx.medications : [];
              const downloadUrl = rx.downloadUrl || rx.download_url;
              const dateStr = rx.prescribed_date || rx.created_at;
              return (
                <div key={rx.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {dateStr ? new Date(dateStr).toLocaleDateString('th-TH') : '—'}
                        {rx.doctor_name || rx.doctorName ? ` — ${rx.doctor_name || rx.doctorName}` : ''}
                      </p>
                      <p className="text-xs text-gray-500">{rx.status || 'active'}</p>
                    </div>
                    {downloadUrl && (
                      <button
                        type="button"
                        data-testid="patient-record-rx-download"
                        onClick={() => void authDownload(downloadUrl, `prescription-${rx.id}.txt`)}
                        className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                      >
                        ดาวน์โหลดใบสั่งยา
                      </button>
                    )}
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {meds.map((m, i) => {
                      const name = typeof m.drugName === 'string' ? m.drugName
                        : typeof m.name === 'string' ? m.name
                        : typeof m.drug_name === 'string' ? m.drug_name
                        : 'ยา';
                      const dosage = typeof m.dosage === 'string' || typeof m.dosage === 'number' ? String(m.dosage) : '';
                      const frequency = typeof m.frequency === 'string' ? m.frequency : '';
                      return (
                        <li key={`${rx.id}-${name}-${i}`}>
                          {name} {dosage} {frequency}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

// ============================================================================
// DOCS VIEW
// ============================================================================

const DocsView: React.FC<{
  ehrData: EHRData | null;
  patientId: string;
  onUploaded?: () => void;
}> = ({ ehrData, patientId, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const docs = ehrData?.documents || ehrData?.externalRecords || [];

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCodePoint(b); });
      const base64 = btoa(binary);
      const result = await patientRecordService.uploadSharedDocument(patientId, {
        title: file.name,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileData: base64,
        fileSize: file.size,
        sourceType: 'patient_upload',
      });
      if (result.success) onUploaded?.();
    } finally {
      setUploading(false);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-xl font-bold text-gray-900">เอกสารทางการแพทย์ (Documents)</h3>
        <label className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 cursor-pointer">
          {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดแชร์'}
          <input
            type="file"
            data-testid="patient-record-doc-upload"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {docs.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
          <p className="text-gray-400">ยังไม่มีเอกสารที่แชร์</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(rec => {
            const url = rec.downloadUrl || rec.viewUrl;
            return (
              <div key={rec.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{rec.documentType}</p>
                  <p className="text-xs text-gray-500">
                    {rec.uploadedAt ? new Date(rec.uploadedAt).toLocaleDateString('th-TH') : '—'}
                    {rec.uploadedBy ? ` — ${rec.uploadedBy}` : ''}
                    {rec.sourceType ? ` · ${rec.sourceType}` : ''}
                  </p>
                </div>
                {url && (
                  <button
                    type="button"
                    data-testid="patient-record-doc-download"
                    onClick={() => void authDownload(url, rec.fileName || `document-${rec.id}`)}
                    className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                  >
                    ดาวน์โหลด
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// MEETINGS VIEW
// ============================================================================

const MeetingsView: React.FC<{ meetings: MeetingHistoryItem[] }> = ({ meetings }) => {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg">ยังไม่มีประวัติการประชุมวิดีโอ</p>
      </div>
    );
  }

  return (
    <section>
      <h3 className="text-xl font-bold text-gray-900 mb-4">ประวัติการประชุมวิดีโอ</h3>
      <div className="space-y-3">
        {meetings.map((m) => {
          const dateStr = m.endedAt || m.startedAt || m.createdAt;
          return (
            <div key={m.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {dateStr ? new Date(dateStr).toLocaleString('th-TH') : '—'}
                </p>
                <p className="text-xs text-gray-500">
                  {m.doctorName || m.doctorId || 'แพทย์'} · {m.status}
                  {m.hasSummary ? ' · มีสรุป AI' : ''}
                </p>
              </div>
              {m.hasRecording && m.downloadUrl && (
                <button
                  type="button"
                  data-testid="patient-record-video-download"
                  onClick={() => void authDownload(m.downloadUrl!, `meeting-${m.id}.webm`)}
                  className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                >
                  ดาวน์โหลดวิดีโอ
                </button>
              )}
              {m.hasRecording && !m.downloadUrl && m.recordingUrl && (
                <button
                  type="button"
                  data-testid="patient-record-video-download"
                  onClick={() => void authDownload(
                    m.recordingUrl!.includes('?') ? `${m.recordingUrl}&download=1` : `${m.recordingUrl}?download=1`,
                    `meeting-${m.id}.webm`,
                  )}
                  className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                >
                  ดาวน์โหลดวิดีโอ
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ============================================================================
// EHR VIEW (legacy combined — kept for compatibility)
// ============================================================================

const EHRView: React.FC<{ ehrData: EHRData | null }> = ({ ehrData }) => {
  if (!ehrData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg">ยังไม่มีข้อมูล Electronic Health Record</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <LabsView ehrData={ehrData} />
      <DocsView ehrData={ehrData} patientId={ehrData.patientId} />
    </div>
  );
};

export default PatientRecordViewer;
