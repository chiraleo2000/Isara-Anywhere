import React from 'react';

type AutoSaveStatus = 'saved' | 'saving' | 'unsaved';
type EmrStatus = 'draft' | 'finalized' | 'amended' | 'awaiting_signature';

interface EmrEditorChromeProps {
  patientName: string;
  patientIdNumber: string;
  autoSaveStatus: AutoSaveStatus;
  isVoiceActive: boolean;
  encounterType: string;
  isFinalized: boolean;
  emrStatus?: EmrStatus;
  showAiDraftBanner: boolean;
  aiDraftDegraded?: boolean;
  onClose: () => void;
  onVoiceTranscription: () => void;
  onEncounterTypeChange: (value: string) => void;
}

const EmrStatusBadge: React.FC<{ status: EmrStatus }> = ({ status }) => {
  const styles: Record<EmrStatus, string> = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    finalized: 'bg-green-100 text-green-800 border-green-200',
    amended: 'bg-blue-100 text-blue-800 border-blue-200',
    awaiting_signature: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  const labels: Record<EmrStatus, string> = {
    draft: 'Draft',
    finalized: 'Signed',
    amended: 'Amended',
    awaiting_signature: 'Awaiting Signature',
  };
  return (
    <span
      data-testid={`emr-status-badge-${status}`}
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

export const EmrEditorChrome: React.FC<EmrEditorChromeProps> = ({
  patientName,
  patientIdNumber,
  autoSaveStatus,
  isVoiceActive,
  encounterType,
  isFinalized,
  emrStatus = 'draft',
  showAiDraftBanner,
  aiDraftDegraded = false,
  onClose,
  onVoiceTranscription,
  onEncounterTypeChange,
}) => (
  <>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Electronic Medical Record</h2>
          <EmrStatusBadge status={emrStatus} />
        </div>
        <p className="text-sm text-gray-600 mt-1 truncate">
          Patient: {patientName} • ID: {patientIdNumber}
        </p>
      </div>
      <div className="flex items-center flex-wrap gap-2 sm:gap-3 shrink-0">
        <div className="text-sm" data-testid="emr-autosave-status" data-status={autoSaveStatus}>
          {autoSaveStatus === 'saved' && <span className="text-green-600">✓ Saved</span>}
          {autoSaveStatus === 'saving' && <span className="text-blue-600">💾 Saving...</span>}
          {autoSaveStatus === 'unsaved' && <span className="text-amber-600">● Unsaved</span>}
        </div>
        <button
          type="button"
          onClick={onVoiceTranscription}
          className={`p-2 rounded-lg transition-colors ${
            isVoiceActive
              ? 'bg-red-100 text-red-600 animate-pulse'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Voice Transcription"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          aria-label="Close EMR editor"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <div className="flex items-center space-x-2 p-4 border-b border-gray-200 bg-gray-50">
      <span className="text-sm font-medium text-gray-700">รูปแบบเวชระเบียน:</span>
      <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
        OPD Card (มาตรฐานกระทรวงสาธารณสุข)
      </div>
      <label htmlFor="encounterType" className="text-sm font-medium text-gray-700 ml-4">
        ประเภทการตรวจ:
      </label>
      <select
        id="encounterType"
        value={encounterType}
        onChange={(e) => onEncounterTypeChange(e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        disabled={isFinalized}
      >
        <option value="consultation">ตรวจทั่วไป (OPD)</option>
        <option value="follow-up">นัดติดตาม</option>
        <option value="emergency">ฉุกเฉิน</option>
        <option value="procedure">หัตถการ</option>
      </select>
    </div>

    {showAiDraftBanner && (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
        <span className="text-amber-600 text-lg">🤖</span>
        <p className="text-sm text-amber-800">
          <span className="font-semibold">AI Pre-filled Draft</span> — ข้อมูลนี้สร้างจาก AI จากบทสนทนาในการประชุม กรุณาตรวจสอบก่อน Sign
          {aiDraftDegraded && (
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
              degraded AI summary
            </span>
          )}
        </p>
      </div>
    )}
  </>
);
