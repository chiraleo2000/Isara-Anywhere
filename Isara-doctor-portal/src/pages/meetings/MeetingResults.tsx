/**
 * MeetingResults — Teams-like Meeting Recording Results Viewer
 * 
 * Shows transcript, AI SOAP summary, chat messages after a meeting ends.
 * Includes doctor validation buttons: approve / edit / reject / regenerate.
 * Used in the Health Meeting / Appointment workflow.
 */

import React, { useState, useEffect, useCallback } from 'react';

interface MeetingResultsProps {
  meetingId: string;
  appointmentId?: string;
  onClose: () => void;
  onNavigateToEMR?: (appointmentId: string) => void;
}

interface TranscriptSegment {
  speaker: string;
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
  };
  transcript: {
    fullText: string;
    segments: TranscriptSegment[];
    totalSegments: number;
  };
  summary: {
    text: string | null;
    recommendations: Record<string, unknown> | null;
    requiresValidation: boolean;
    validatedAt: string | null;
  };
  chat: {
    messages: ChatMessage[];
    totalMessages: number;
  };
}

type TabType = 'summary' | 'transcript' | 'chat';

const MEETING_SERVER_URL = import.meta.env.VITE_MEETING_SERVER_URL || 'http://localhost:3020';

const MeetingResults: React.FC<MeetingResultsProps> = ({ meetingId, appointmentId, onClose, onNavigateToEMR }) => {
  const [results, setResults] = useState<MeetingResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [validationStatus, setValidationStatus] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [instructionResult, setInstructionResult] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('token');

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const lookupId = appointmentId || meetingId;
      const token = getToken();
      const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${lookupId}/results`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Meeting results not found');
      const data = await res.json();
      if (data.success) {
        setResults(data);
        if (data.summary?.text) setEditedSummary(data.summary.text);
      }
      else throw new Error(data.error || 'Failed to load results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meeting results');
    } finally {
      setLoading(false);
    }
  }, [meetingId, appointmentId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleValidation = async (action: 'approve' | 'edit' | 'reject' | 'regenerate') => {
    const lookupId = appointmentId || meetingId;
    const token = getToken();
    setActionLoading(action);

    try {
      if (action === 'regenerate') {
        // Call generate-summary endpoint to regenerate
        const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${lookupId}/generate-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const data = await res.json();
        if (data.success && data.summary) {
          setResults(prev => prev ? { ...prev, summary: { ...prev.summary, text: data.summary, validatedAt: null } } : prev);
          setEditedSummary(data.summary);
          setValidationStatus(null);
          setIsEditing(false);
        }
      } else {
        const body: Record<string, string> = { action };
        if (action === 'edit') body.editedSummary = editedSummary;

        const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${lookupId}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          setValidationStatus(data.validationStatus);
          setIsEditing(false);
          if (action === 'edit' && data.readyForPatient) {
            setResults(prev => prev ? { ...prev, summary: { ...prev.summary, text: editedSummary, validatedAt: new Date().toISOString() } } : prev);
          } else if (action === 'approve') {
            setResults(prev => prev ? { ...prev, summary: { ...prev.summary, validatedAt: new Date().toISOString() } } : prev);
          }
        }
      }
    } catch (err) {
      console.error(`Validation ${action} failed:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateInstruction = async () => {
    const lookupId = appointmentId || meetingId;
    const token = getToken();
    setActionLoading('instruction');
    try {
      const res = await fetch(`${MEETING_SERVER_URL}/api/meetings/${lookupId}/patient-instruction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (data.success && data.instructions) {
        setInstructionResult(data.instructions);
      }
    } catch (err) {
      console.error('Generate instruction failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดผลการประชุม...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'ไม่พบผลการประชุม'}</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">ปิด</button>
        </div>
      </div>
    );
  }

  const { meeting, transcript, summary, chat } = results;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="flex-1 overflow-y-auto p-5">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div>
              {summary.requiresValidation && !summary.validatedAt && !validationStatus && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <span className="text-amber-600 text-lg">⚠️</span>
                  <p className="text-amber-800 text-sm">
                    สรุปนี้สร้างโดย AI — กรุณาตรวจสอบก่อนใช้งานทางการแพทย์
                  </p>
                </div>
              )}
              {(validationStatus === 'approved' || validationStatus === 'edited') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <span className="text-green-600 text-lg">✅</span>
                  <p className="text-green-800 text-sm">
                    สรุปได้รับการ{validationStatus === 'edited' ? 'แก้ไขและ' : ''}อนุมัติแล้ว — พร้อมส่งให้ผู้ป่วย
                  </p>
                </div>
              )}
              {validationStatus === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <span className="text-red-600 text-lg">❌</span>
                  <p className="text-red-800 text-sm">สรุปถูกปฏิเสธ — จะไม่ส่งให้ผู้ป่วย</p>
                </div>
              )}
              {summary.text ? (
                <div>
                  {isEditing ? (
                    <textarea
                      className="w-full h-64 border border-gray-300 rounded-lg p-3 text-sm font-mono resize-y focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {summary.text}
                      </div>
                    </div>
                  )}

                  {/* Validation Buttons */}
                  {!validationStatus && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                      <button
                        onClick={() => handleValidation('approve')}
                        disabled={!!actionLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                      >
                        {actionLoading === 'approve' ? '...' : '✅'} อนุมัติ
                      </button>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        disabled={!!actionLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                      >
                        ✏️ {isEditing ? 'ยกเลิกแก้ไข' : 'แก้ไข'}
                      </button>
                      {isEditing && (
                        <button
                          onClick={() => handleValidation('edit')}
                          disabled={!!actionLoading}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                        >
                          {actionLoading === 'edit' ? '...' : '💾'} บันทึกแก้ไข
                        </button>
                      )}
                      <button
                        onClick={() => handleValidation('reject')}
                        disabled={!!actionLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                      >
                        {actionLoading === 'reject' ? '...' : '❌'} ปฏิเสธ
                      </button>
                      <button
                        onClick={() => handleValidation('regenerate')}
                        disabled={!!actionLoading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                      >
                        {actionLoading === 'regenerate' ? '...' : '🔄'} สร้างใหม่
                      </button>
                    </div>
                  )}

                  {/* Patient Instruction Generation */}
                  {(validationStatus === 'approved' || validationStatus === 'edited') && !instructionResult && (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={handleGenerateInstruction}
                        disabled={!!actionLoading}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                      >
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
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">🧠</p>
                  <p>ไม่มีสรุป AI — อาจเกิดจากการประชุมไม่มีบทสนทนา</p>
                  <button
                    onClick={() => handleValidation('regenerate')}
                    disabled={!!actionLoading}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                  >
                    {actionLoading === 'regenerate' ? 'กำลังสร้าง...' : '🔄 สร้างสรุป AI'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <div>
              {transcript.segments.length > 0 && (
                <div className="space-y-3">
                  {transcript.segments.map((seg) => (
                    <div key={`${seg.timestamp}-${seg.speaker}`} className={`flex gap-3 ${seg.role === 'doctor' ? '' : 'flex-row-reverse'}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                        ${seg.role === 'doctor' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                        {seg.role === 'doctor' ? 'Dr' : 'Pt'}
                      </div>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm
                        ${seg.role === 'doctor'
                          ? 'bg-emerald-50 border border-emerald-100'
                          : 'bg-blue-50 border border-blue-100'
                        }`}>
                        <p className="text-xs text-gray-500 mb-1">
                          {seg.speaker} • {formatTime(seg.timestamp)}
                        </p>
                        <p className="text-gray-800 text-sm">{seg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {transcript.segments.length === 0 && transcript.fullText && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{transcript.fullText}</pre>
                </div>
              )}
              {transcript.segments.length === 0 && !transcript.fullText && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">📝</p>
                  <p>ไม่มีบทสนทนา — การบันทึกอาจไม่ได้เปิดใช้งาน</p>
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div>
              {chat.messages.length > 0 ? (
                <div className="space-y-2">
                  {chat.messages.map((msg) => (
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
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">💬</p>
                  <p>ไม่มีข้อความแชทในการประชุมนี้</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Meeting ID: {meeting.id?.substring(0, 8)}... • 
            Status: {meeting.status}
            {validationStatus && ` • Validation: ${validationStatus}`}
          </p>
          <div className="flex gap-2">
            {onNavigateToEMR && meeting.appointmentId && (
              <button
                onClick={() => onNavigateToEMR(meeting.appointmentId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                📋 เปิด EMR
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
