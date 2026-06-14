/**
 * MeetingResults — Teams-like Meeting Recording Results Viewer
 * 
 * Shows transcript, AI SOAP summary, chat messages after a meeting ends.
 * Includes doctor validation buttons: approve / edit / reject / regenerate.
 * Used in the Health Meeting / Appointment workflow.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../services/authServices';
import { storeEmrAiDraft } from '../../utils/emrAiDraft';

interface MeetingResultsProps {
  meetingId: string;
  appointmentId?: string;
  onClose: () => void;
  onNavigateToEMR?: (appointmentId: string) => void;
  onNavigateToPrescription?: (appointmentId: string, patientId: string) => void;
  onNavigateToLabOrder?: (appointmentId: string, patientId: string) => void;
  onNavigateToNewAppointment?: (patientId: string) => void;
}

interface TranscriptSegment {
  speaker: string;
  displayLabel?: string;
  role: string;
  content: string;
  timestamp: string;
  confidence?: number;
}

interface ChatMessage {
  sender: string;
  role: string;
  message: string;
  timestamp: string;
}

interface MeetingResultsData {
  meeting: {
    id: string;
    appointmentId: string;
    status: string;
    startedAt: string;
    endedAt: string;
    durationMinutes: number | null;
    doctor: { name: string; email: string; id: string };
    patient: { name: string; email: string; id: string };
    appointmentType: string;
    recordingUrl?: string;
  };
  transcript: {
    fullText: string;
    segments: TranscriptSegment[];
    totalSegments: number;
  };
  summary: {
    text: string | null;
    structured: {
      chiefComplaint?: string;
      soap?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
      redFlags?: string[];
      followUpDate?: string;
      lifestyle?: string;
      emrFields?: { icd10Suggestions?: string[]; medications?: string[]; labOrders?: string[] };
    } | null;
    cds: {
      differentialDiagnosis?: { condition: string; likelihood: string; reasoning: string }[];
      suggestedTests?: { test: string; reason: string; priority: string }[];
      drugInteractions?: { drug1: string; drug2: string; severity: string; description: string }[];
      guidelineRefs?: { guideline: string; relevance: string }[];
    } | null;
    recommendations: Record<string, unknown> | null;
    sectionSummaries: { section: number; summary: string; start_seconds: number; end_seconds: number }[] | null;
    emrDraftId: string | null;
    requiresValidation: boolean;
    validationStatus: string | null;
    validatedAt: string | null;
    degraded?: boolean;
  };
  chat: {
    messages: ChatMessage[];
    totalMessages: number;
  };
}

type TabType = 'summary' | 'transcript' | 'chat';
type ValidationAction = 'approve' | 'edit' | 'reject';

const MEETING_SERVER_URL = (() => {
  if (globalThis.window !== undefined) {
    const env = (globalThis as any).ENV;
    if (env?.MEETING_SERVER_URL && !String(env.MEETING_SERVER_URL).includes('localhost')) {
      return env.MEETING_SERVER_URL;
    }
    const { origin, hostname } = globalThis.location;
    if (hostname.includes('run.app')) {
      return origin
        .replace('izara-doctor-portal', 'izara-meeting-server')
        .replace('izara-patient-portal', 'izara-meeting-server');
    }
  }
  return import.meta.env.VITE_MEETING_SERVER_URL || 'http://localhost:3020';
})();

const buildHeaders = (token: string | null) =>
  ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });

/** Same-origin proxy on doctor portal; fallback to meeting server for local dev */
async function fetchMeetingApi(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = {
    ...buildHeaders(token),
    ...(init.headers as Record<string, string> | undefined),
  };
  const opts = { ...init, headers };
  try {
    const res = await fetch(path, opts);
    if (res.ok || res.status !== 404) return res;
  } catch {
    /* try meeting server */
  }
  return fetch(`${MEETING_SERVER_URL}${path}`, opts);
}

const RESULTS_FETCH_ATTEMPTS = 5;
const RESULTS_FETCH_DELAY_MS = 2_000;

async function fetchMeetingResultsWithRetry(path: string): Promise<MeetingResultsData> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < RESULTS_FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetchMeetingApi(path);
      if (!res.ok) throw new Error(`Meeting results not found (${res.status})`);
      const data = await res.json();
      if (data.success) return data as MeetingResultsData;
      throw new Error(data.error || 'Failed to load results');
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Failed to load meeting results');
      if (attempt < RESULTS_FETCH_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, RESULTS_FETCH_DELAY_MS));
      }
    }
  }
  throw lastError ?? new Error('Failed to load meeting results');
}

const formatDuration = (minutes: number | null) => {
  if (!minutes) return 'N/A';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m} นาที`;
};

const formatTime = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

/* ── Validation status banner ─────────────────────────────────── */
const ValidationBanner: React.FC<{
  requiresValidation: boolean;
  validatedAt: string | null;
  validationStatus: string | null;
}> = ({ requiresValidation, validatedAt, validationStatus }) => {
  if (validationStatus === 'approved' || validationStatus === 'edited') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
        <span className="text-green-600 text-lg">✅</span>
        <p className="text-green-800 text-sm">
          สรุปได้รับการ{validationStatus === 'edited' ? 'แก้ไขและ' : ''}อนุมัติแล้ว — พร้อมส่งให้ผู้ป่วย
        </p>
      </div>
    );
  }
  if (validationStatus === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
        <span className="text-red-600 text-lg">❌</span>
        <p className="text-red-800 text-sm">สรุปถูกปฏิเสธ — จะไม่ส่งให้ผู้ป่วย</p>
      </div>
    );
  }
  if (requiresValidation && !validatedAt) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center gap-2">
        <span className="text-amber-600 text-lg">⚠️</span>
        <p className="text-amber-800 text-sm">
          สรุปนี้สร้างโดย AI — กรุณาตรวจสอบก่อนใช้งานทางการแพทย์
        </p>
      </div>
    );
  }
  return null;
};

/* ── Transcript tab ───────────────────────────────────────────── */
const TranscriptTab: React.FC<{ transcript: MeetingResultsData['transcript'] }> = ({ transcript }) => {
  const getRoleColor = (role: string) => {
    if (role === 'doctor') return 'bg-emerald-500';
    if (role === 'patient') return 'bg-blue-500';
    return 'bg-gray-400';
  };
  const getRoleIcon = (role: string) => {
    if (role === 'doctor') return '👨‍⚕️';
    if (role === 'patient') return '🧑';
    return '👥';
  };
  if (transcript.segments.length > 0) {
    return (
      <div className="space-y-3">
        {transcript.segments.map((seg) => (
          <div key={`${seg.timestamp}-${seg.speaker}`} className={`flex gap-3 ${seg.role === 'doctor' ? '' : 'flex-row-reverse'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
              ${getRoleColor(seg.role)}`}>
              {getRoleIcon(seg.role)}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm
              ${seg.role === 'doctor'
                ? 'bg-emerald-50 border border-emerald-100'
                : 'bg-blue-50 border border-blue-100'
              }`}>
              <p className="text-xs text-gray-500 mb-1">
                {seg.displayLabel || seg.speaker} • {formatTime(seg.timestamp)}
              </p>
              <p className="text-gray-800 text-sm">{seg.content}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (transcript.fullText) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{transcript.fullText}</pre>
      </div>
    );
  }
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-4xl mb-2">📝</p>
      <p>ไม่มีบทสนทนา — การบันทึกอาจไม่ได้เปิดใช้งาน</p>
    </div>
  );
};

/* ── Chat tab ─────────────────────────────────────────────────── */
const ChatTab: React.FC<{ messages: ChatMessage[] }> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-2">💬</p>
        <p>ไม่มีข้อความแชทในการประชุมนี้</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <div key={`${msg.timestamp}-${msg.sender}`} className="flex gap-2 items-start">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0
            ${msg.role === 'doctor' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
            {msg.role === 'doctor' ? 'Dr' : 'Pt'}
          </div>
          <div>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{msg.sender}</span> • {formatTime(msg.timestamp)}
            </p>
            <p className="text-sm text-gray-800">{msg.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Validation action helpers ────────────────────────────────── */
async function regenerateSummary(lookupId: string): Promise<{
  summary?: string;
  structured?: MeetingResultsData['summary']['structured'];
}> {
  const res = await fetchMeetingApi(`/api/meetings/${lookupId}/generate-summary`, {
    method: 'POST',
  });
  return res.json();
}

async function submitValidation(lookupId: string, action: string, editedSummary?: string): Promise<{ success?: boolean; validationStatus?: string; readyForPatient?: boolean }> {
  const body: Record<string, string> = { action };
  if (action === 'edit' && editedSummary) body.editedSummary = editedSummary;
  const res = await fetchMeetingApi(`/api/meetings/${lookupId}/validate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

/* ── Structured SOAP cards sub-component ──────────────────────── */
const StructuredSOAPCards: React.FC<{ structured: NonNullable<MeetingResultsData['summary']['structured']> }> = ({ structured }) => (
  <div className="space-y-3 mb-4">
    {structured.soap && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { key: 'S', label: 'Subjective', icon: '🗣️', value: structured.soap.subjective, color: 'blue' },
          { key: 'O', label: 'Objective', icon: '🔬', value: structured.soap.objective, color: 'emerald' },
          { key: 'A', label: 'Assessment', icon: '📋', value: structured.soap.assessment, color: 'purple' },
          { key: 'P', label: 'Plan', icon: '📝', value: structured.soap.plan, color: 'amber' },
        ].map(({ key, label, icon, value, color }) => (
          <div key={key} className={`border rounded-lg p-3 bg-${color}-50 border-${color}-200`}>
            <h4 className={`font-bold text-sm text-${color}-800 mb-1`}>{icon} {key} — {label}</h4>
            <p className="text-sm text-gray-700">{value || 'ไม่ระบุ'}</p>
          </div>
        ))}
      </div>
    )}
    {structured.chiefComplaint && (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <span className="font-semibold text-sm">🎯 Chief Complaint:</span>
        <span className="text-sm ml-1">{structured.chiefComplaint}</span>
      </div>
    )}
    {structured.redFlags && structured.redFlags.length > 0 && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <span className="font-semibold text-sm text-red-700">🚩 Red Flags:</span>
        <ul className="list-disc list-inside text-sm text-red-700 mt-1">
          {structured.redFlags.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </div>
    )}
    {structured.emrFields && (
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm">
        {structured.emrFields.icd10Suggestions?.length ? (
          <p><span className="font-semibold">ICD-10:</span> {structured.emrFields.icd10Suggestions.join(', ')}</p>
        ) : null}
        {structured.emrFields.medications?.length ? (
          <p className="mt-1"><span className="font-semibold">💊 ยาที่สั่ง:</span> {structured.emrFields.medications.join(', ')}</p>
        ) : null}
        {structured.emrFields.labOrders?.length ? (
          <p className="mt-1"><span className="font-semibold">🔬 Lab:</span> {structured.emrFields.labOrders.join(', ')}</p>
        ) : null}
      </div>
    )}
    {structured.followUpDate && (
      <p className="text-sm">📅 <span className="font-semibold">นัดติดตาม:</span> {structured.followUpDate}</p>
    )}
  </div>
);

/* ── CDS Recommendations sub-component ────────────────────────── */
const CDSSection: React.FC<{ cds: NonNullable<MeetingResultsData['summary']['cds']> }> = ({ cds }) => (
  <div className="mb-4 border border-yellow-200 rounded-lg overflow-hidden">
    <div className="bg-yellow-50 px-3 py-2 border-b border-yellow-200">
      <h4 className="font-bold text-sm text-yellow-800">🧪 Clinical Decision Support (CDS)</h4>
    </div>
    <div className="p-3 space-y-2 text-sm">
      {cds.differentialDiagnosis?.length ? (
        <div>
          <span className="font-semibold">DD:</span>
          <ul className="list-disc list-inside ml-2">
            {cds.differentialDiagnosis.map((d) => (
              <li key={d.condition}>{d.condition} <span className={`text-xs ${d.likelihood === 'high' ? 'text-red-600' : 'text-gray-500'}`}>({d.likelihood})</span></li>
            ))}
          </ul>
        </div>
      ) : null}
      {cds.drugInteractions?.length ? (
        <div className="text-red-700">
          <span className="font-semibold">⚠️ Drug Interactions:</span>
          <ul className="list-disc list-inside ml-2">
            {cds.drugInteractions.map((d) => (
              <li key={`${d.drug1}-${d.drug2}`}>{d.drug1} + {d.drug2}: {d.description} ({d.severity})</li>
            ))}
          </ul>
        </div>
      ) : null}
      {cds.suggestedTests?.length ? (
        <div>
          <span className="font-semibold">🔬 Suggested Tests:</span>
          <ul className="list-disc list-inside ml-2">
            {cds.suggestedTests.map((t) => (
              <li key={t.test}>{t.test} — {t.reason} <span className={`text-xs ${t.priority === 'urgent' ? 'text-red-600 font-bold' : ''}`}>({t.priority})</span></li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  </div>
);

/* ── Section Summaries sub-component ──────────────────────────── */
const SectionSummariesPanel: React.FC<{ sections: NonNullable<MeetingResultsData['summary']['sectionSummaries']> }> = ({ sections }) => (
  <div className="mb-4">
    <h4 className="font-semibold text-sm text-gray-700 mb-2">📊 Section Summaries</h4>
    <div className="space-y-1">
      {sections.map((s) => (
        <div key={s.section} className="bg-gray-50 rounded p-2 text-sm">
          <span className="font-medium text-gray-600">ช่วงที่ {s.section} (นาทีที่ {Math.round(s.start_seconds / 60)}-{Math.round(s.end_seconds / 60)}):</span>
          <span className="ml-1">{s.summary}</span>
        </div>
      ))}
    </div>
  </div>
);

const SummaryValidationActions: React.FC<{
  validationStatus: string | null;
  isEditing: boolean;
  actionLoading: string | null;
  onToggleEditing: () => void;
  onRegenerate: () => void;
  onSubmitValidation: (action: ValidationAction) => void;
}> = ({ validationStatus, isEditing, actionLoading, onToggleEditing, onRegenerate, onSubmitValidation }) => {
  if (validationStatus) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
      <button onClick={() => onSubmitValidation('approve')} disabled={!!actionLoading}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 text-sm">
        {actionLoading === 'approve' ? '...' : '✅'} อนุมัติ
      </button>
      <button onClick={onToggleEditing} disabled={!!actionLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 text-sm">
        ✏️ {isEditing ? 'ยกเลิกแก้ไข' : 'แก้ไข'}
      </button>
      {isEditing && (
        <button onClick={() => onSubmitValidation('edit')} disabled={!!actionLoading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1 text-sm">
          {actionLoading === 'edit' ? '...' : '💾'} บันทึกแก้ไข
        </button>
      )}
      <button onClick={() => onSubmitValidation('reject')} disabled={!!actionLoading}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1 text-sm">
        {actionLoading === 'reject' ? '...' : '❌'} ปฏิเสธ
      </button>
      <button type="button" data-testid="generate-summary-btn" onClick={onRegenerate} disabled={!!actionLoading}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 text-sm">
        {actionLoading === 'regenerate' ? '...' : '🔄'} สร้างใหม่
      </button>
    </div>
  );
};

/* ── Summary tab ──────────────────────────────────────────────── */
const SummaryTab: React.FC<{
  summary: MeetingResultsData['summary'];
  validationStatus: string | null;
  isEditing: boolean;
  editedSummary: string;
  actionLoading: string | null;
  instructionResult: string | null;
  onEditedSummaryChange: (v: string) => void;
  onToggleEditing: () => void;
  onRegenerate: () => void;
  onSubmitValidation: (action: ValidationAction) => void;
  onGenerateInstruction: () => void;
}> = ({ summary, validationStatus, isEditing, editedSummary, actionLoading, instructionResult,
       onEditedSummaryChange, onToggleEditing, onRegenerate, onSubmitValidation, onGenerateInstruction }) => {
  const isApproved = validationStatus === 'approved' || validationStatus === 'edited';

  if (!summary.text) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-2">🧠</p>
        <p>ไม่มีสรุป AI — อาจเกิดจากการประชุมไม่มีบทสนทนา</p>
        <button type="button" data-testid="generate-summary-btn" onClick={onRegenerate} disabled={!!actionLoading}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
          {actionLoading === 'regenerate' ? 'กำลังสร้าง...' : '🔄 สร้างสรุป AI'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <ValidationBanner requiresValidation={summary.requiresValidation} validatedAt={summary.validatedAt} validationStatus={validationStatus} />

      {summary.degraded && (
        <output
          data-testid="summary-degraded-badge"
          className="mb-4 block rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          AI ไม่พร้อมใช้งาน — สรุปนี้เป็นข้อความสำรอง กรุณาตรวจสอบและแก้ไขด้วยตนเองก่อนยืนยัน
        </output>
      )}

      {/* Structured SOAP Cards (or narrative fallback after generate-summary) */}
      {(summary.structured || summary.text) && (
        <div data-testid="summary-structured">
          {summary.structured ? (
            <StructuredSOAPCards structured={summary.structured} />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 border rounded-lg p-3">
              {summary.text}
            </pre>
          )}
        </div>
      )}

      {/* CDS Recommendations */}
      {summary.cds && <CDSSection cds={summary.cds} />}

      {/* Section Summaries (long meetings) */}
      {summary.sectionSummaries && summary.sectionSummaries.length > 0 && (
        <SectionSummariesPanel sections={summary.sectionSummaries} />
      )}

      {/* Raw Text SOAP (collapsible) */}
      {isEditing ? (
        <textarea className="w-full h-64 border border-gray-300 rounded-lg p-3 text-sm font-mono resize-y focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          aria-label="แก้ไขสรุป AI" placeholder="แก้ไขสรุป AI ที่นี่..."
          value={editedSummary} onChange={(e) => onEditedSummaryChange(e.target.value)} />
      ) : (
        <details className={summary.structured?.soap ? 'mt-2' : ''}>
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            {summary.structured?.soap ? '📄 ดูสรุปแบบข้อความดิบ' : '📄 สรุป AI'}
          </summary>
          <div className="prose prose-sm max-w-none mt-2">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{summary.text}</div>
          </div>
        </details>
      )}

      <SummaryValidationActions
        validationStatus={validationStatus}
        isEditing={isEditing}
        actionLoading={actionLoading}
        onToggleEditing={onToggleEditing}
        onRegenerate={onRegenerate}
        onSubmitValidation={onSubmitValidation}
      />

      {isApproved && !instructionResult && (
        <div className="mt-4 pt-4 border-t">
          <button onClick={onGenerateInstruction} disabled={!!actionLoading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1 text-sm">
            {actionLoading === 'instruction' ? 'กำลังสร้าง...' : '📋 สร้างคำแนะนำผู้ป่วย'}
          </button>
        </div>
      )}

      {instructionResult && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold text-gray-700 mb-2">📋 คำแนะนำสำหรับผู้ป่วย</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-800">
            {instructionResult}
          </div>
        </div>
      )}
    </div>
  );
};

const MeetingResults: React.FC<MeetingResultsProps> = ({ meetingId, appointmentId, onClose, onNavigateToEMR, onNavigateToPrescription, onNavigateToLabOrder, onNavigateToNewAppointment }) => {
  const [results, setResults] = useState<MeetingResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [validationStatus, setValidationStatus] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [instructionResult, setInstructionResult] = useState<string | null>(null);

  const lookupId = appointmentId || meetingId;

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMeetingResultsWithRetry(`/api/meetings/${lookupId}/results`);
      setResults(data);
      if (data.summary?.text) setEditedSummary(data.summary.text);
      if (data.summary?.validationStatus) setValidationStatus(data.summary.validationStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meeting results');
    } finally {
      setLoading(false);
    }
  }, [lookupId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleRegenerate = async () => {
    setActionLoading('regenerate');
    try {
      const data = await regenerateSummary(lookupId);
      if (data.summary) {
        setResults((prev) =>
          prev
            ? {
                ...prev,
                summary: {
                  ...prev.summary,
                  text: data.summary,
                  structured: data.structured ?? prev.summary.structured,
                  validatedAt: null,
                },
              }
            : prev,
        );
        setEditedSummary(data.summary);
        setValidationStatus(null);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Regenerate failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate summary');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitValidation = async (action: ValidationAction) => {
    setActionLoading(action);
    try {
      const data = await submitValidation(lookupId, action, action === 'edit' ? editedSummary : undefined);
      if (data.success) {
        setValidationStatus(data.validationStatus ?? action);
        setIsEditing(false);
        const now = new Date().toISOString();
        if (action === 'edit' && data.readyForPatient) {
          setResults(prev => prev ? { ...prev, summary: { ...prev.summary, text: editedSummary, validatedAt: now } } : prev);
        }
        if (action === 'approve') {
          setResults(prev => prev ? { ...prev, summary: { ...prev.summary, validatedAt: now } } : prev);
        }
      }
    } catch (err) {
      console.error(`Validation ${action} failed:`, err);
      setError(`Failed to ${action} summary: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateInstruction = async () => {
    setActionLoading('instruction');
    setError(null);
    try {
      const res = await fetchMeetingApi(`/api/meetings/${lookupId}/patient-instruction`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || data.message || 'Failed to generate patient instructions');
        return;
      }
      if (data.instructions) {
        setInstructionResult(data.instructions);
      }
    } catch (err) {
      console.error('Generate instruction failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate patient instructions');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyToEmr = () => {
    if (!results || !onNavigateToEMR || !results.meeting.appointmentId) return;
    storeEmrAiDraft({
      appointmentId: results.meeting.appointmentId,
      patientId: results.meeting.patient?.id,
      summary: results.summary.text,
      structured: results.summary.structured,
      degraded: results.summary.degraded,
    });
    onNavigateToEMR(results.meeting.appointmentId);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="meeting-results">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดผลการประชุม...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="meeting-results">
        <div className="bg-white rounded-xl p-8 text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'ไม่พบผลการประชุม'}</p>
          <button type="button" onClick={fetchResults} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 mr-2">
            ลองใหม่
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">ปิด</button>
        </div>
      </div>
    );
  }

  const { meeting, transcript, summary, chat } = results;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="meeting-results">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              ผลการประชุม — Meeting Recording
            </h2>
            <p className="text-emerald-100 text-sm mt-1">
              {meeting.patient.name || 'ผู้ป่วย'} • {formatDuration(meeting.durationMinutes)} •{' '}
              {meeting.endedAt ? new Date(meeting.endedAt).toLocaleDateString('th-TH') : ''}
            </p>
            {/* Workflow breadcrumb: Health Meeting → Meeting → Results → EMR (ux-09) */}
            <nav aria-label="Breadcrumb" data-testid="meeting-results-breadcrumb" className="text-emerald-100/80 text-xs mt-1">
              <span>Health Meeting</span>
              <span className="mx-1.5">›</span>
              <span>Meeting</span>
              <span className="mx-1.5">›</span>
              <span className="text-white font-medium">Results</span>
              <span className="mx-1.5">›</span>
              <span>EMR</span>
            </nav>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2" title="ปิดผลการประชุม" aria-label="ปิดผลการประชุม">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {([
            { key: 'summary' as TabType, label: 'สรุป AI (SOAP)', icon: '🧠', count: summary.text ? 1 : 0 },
            { key: 'transcript' as TabType, label: 'บทสนทนา', icon: '📝', count: transcript.totalSegments },
            { key: 'chat' as TabType, label: 'แชท', icon: '💬', count: chat.totalMessages },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                ${activeTab === tab.key
                  ? 'border-b-2 border-emerald-600 text-emerald-700 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
            >
              <span className="mr-1">{tab.icon}</span> {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5" data-testid="transcript-panel">
          {activeTab === 'summary' && (
            <SummaryTab
              summary={summary}
              validationStatus={validationStatus}
              isEditing={isEditing}
              editedSummary={editedSummary}
              actionLoading={actionLoading}
              instructionResult={instructionResult}
              onEditedSummaryChange={setEditedSummary}
              onToggleEditing={() => setIsEditing(!isEditing)}
              onRegenerate={handleRegenerate}
              onSubmitValidation={handleSubmitValidation}
              onGenerateInstruction={handleGenerateInstruction}
            />
          )}

          {activeTab === 'transcript' && <TranscriptTab transcript={transcript} />}
          {activeTab === 'chat' && <ChatTab messages={chat.messages} />}
        </div>

        {/* Recording Playback */}
        {meeting?.recordingUrl && (
          <div className="border-t px-5 py-3 bg-gray-50 flex items-center gap-3">
            <span className="text-sm text-gray-600">🎙️ บันทึกการประชุม:</span>
            <audio data-testid="recording-player" controls preload="none" className="h-8 flex-1">
              <source src={`${MEETING_SERVER_URL}${meeting.recordingUrl}`} type="audio/webm" />
              <track kind="captions" label="Meeting recording" />
            </audio>
          </div>
        )}

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Meeting ID: {meeting.id?.substring(0, 8)}... • 
            Status: {meeting.status}
            {validationStatus && ` • Validation: ${validationStatus}`}
          </p>
          <div className="flex gap-2 flex-wrap">
            {onNavigateToEMR && meeting.appointmentId && summary.text && (
              <button
                type="button"
                data-testid="apply-ai-summary-emr-btn"
                onClick={handleApplyToEmr}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Apply AI summary to EMR
                {summary.degraded && (
                  <span className="ml-1 bg-amber-300 text-amber-900 text-xs px-1.5 py-0.5 rounded-full">degraded</span>
                )}
              </button>
            )}
            {onNavigateToEMR && meeting.appointmentId && (
              <button
                onClick={() => onNavigateToEMR(meeting.appointmentId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                📋 เปิด EMR {results?.summary?.emrDraftId && <span className="ml-1 bg-green-400 text-green-900 text-xs px-1.5 py-0.5 rounded-full">AI Draft</span>}
              </button>
            )}
            {onNavigateToPrescription && meeting.appointmentId && meeting.patient?.id && (
              <button
                onClick={() => onNavigateToPrescription(meeting.appointmentId, meeting.patient.id)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                💊 สั่งยา
              </button>
            )}
            {onNavigateToLabOrder && meeting.appointmentId && meeting.patient?.id && (
              <button
                onClick={() => onNavigateToLabOrder(meeting.appointmentId, meeting.patient.id)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                🧪 สั่ง Lab
              </button>
            )}
            {onNavigateToNewAppointment && meeting.patient?.id && (
              <button
                onClick={() => onNavigateToNewAppointment(meeting.patient.id)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
              >
                📅 นัดหมายใหม่
              </button>
            )}
            <button onClick={onClose} className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingResults;
