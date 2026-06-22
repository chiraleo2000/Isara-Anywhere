import React from 'react';
import type { TranscriptEntry } from './transcriptTypes';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getSpeakerColor(role: string): string {
  switch (role) {
    case 'doctor':
      return 'text-blue-600';
    case 'patient':
      return 'text-green-600';
    case 'guest':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
}

export interface LiveTranscriptionViewProps {
  isActive: boolean;
  onToggle: () => void;
  showPanel: boolean;
  onTogglePanel: () => void;
  isListening: boolean;
  selectedLanguage: 'th' | 'en';
  onLanguageChange: (lang: 'th' | 'en') => void;
  error: string | null;
  transcripts: TranscriptEntry[];
  interimTranscript: string;
  speakerName: string;
  speakerRole: 'doctor' | 'patient' | 'guest';
  transcriptsEndRef: React.RefObject<HTMLDivElement | null>;
  onClearTranscript: () => void;
  onExportTranscript: () => void;
}

export const LiveTranscriptionView: React.FC<LiveTranscriptionViewProps> = ({
  isActive,
  onToggle,
  showPanel,
  onTogglePanel,
  isListening,
  selectedLanguage,
  onLanguageChange,
  error,
  transcripts,
  interimTranscript,
  speakerName,
  speakerRole,
  transcriptsEndRef,
  onClearTranscript,
  onExportTranscript,
}) => (
  <div className="fixed bottom-4 right-4 z-50">
    <button
      type="button"
      onClick={onTogglePanel}
      className={`mb-2 p-3 rounded-full shadow-lg transition-all ${
        isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-700 text-white'
      }`}
      title={showPanel ? 'ซ่อน Transcript' : 'แสดง Transcript'}
    >
      {isActive ? (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </button>

    {showPanel && (
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-[500px] flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold">Live Transcription</span>
            {isListening && (
              <span className="flex items-center text-xs bg-red-500 px-2 py-0.5 rounded-full animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full mr-1" aria-hidden="true" />
                {' '}
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value as 'th' | 'en')}
              className="text-sm bg-blue-500 border border-blue-400 rounded px-2 py-1 text-white"
              aria-label="Select transcription language"
            >
              <option value="th">🇹🇭 ไทย</option>
              <option value="en">🇺🇸 English</option>
            </select>
            <button
              type="button"
              onClick={onToggle}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isActive ? '⏹ หยุด' : '▶ เริ่ม'}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[350px]">
          {transcripts.length === 0 && !interimTranscript ? (
            <div className="text-center text-gray-400 py-8">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <p className="text-sm">
                {isActive ? 'กำลังฟัง... พูดได้เลย' : 'กดเริ่มเพื่อบันทึก Transcript'}
              </p>
            </div>
          ) : (
            <>
              {transcripts.map((entry) => (
                <div key={entry.id} className="flex flex-col">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`font-semibold text-sm ${getSpeakerColor(entry.speakerRole)}`}>
                      {entry.speakerRole === 'doctor' && '👨‍⚕️'}
                      {entry.speakerRole === 'patient' && '🧑'}
                      {entry.speakerRole === 'guest' && '👥'}
                      {entry.speakerName}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(entry.timestamp)}</span>
                    {entry.confidence < 0.8 && (
                      <span className="text-xs text-yellow-500" title="Low confidence">
                        ⚠️
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 text-sm pl-6 bg-gray-50 rounded-lg px-3 py-2">{entry.content}</p>
                </div>
              ))}

              {interimTranscript && (
                <div className="flex flex-col opacity-60">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`font-semibold text-sm ${getSpeakerColor(speakerRole)}`}>
                      {speakerRole === 'doctor' && '👨‍⚕️'}
                      {speakerRole === 'patient' && '🧑'}
                      {speakerRole === 'guest' && '👥'}
                      {speakerName}
                    </span>
                    <span className="text-xs text-gray-400 animate-pulse">กำลังพูด...</span>
                  </div>
                  <p className="text-gray-600 text-sm pl-6 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                    {interimTranscript}
                    <span className="animate-pulse">▌</span>
                  </p>
                </div>
              )}

              <div ref={transcriptsEndRef} />
            </>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-lg">
          <span className="text-xs text-gray-500">{transcripts.length} รายการ</span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClearTranscript}
              className="text-xs text-gray-600 hover:text-red-600 px-2 py-1"
              title="ล้าง Transcript"
            >
              🗑️ ล้าง
            </button>
            <button
              type="button"
              onClick={onExportTranscript}
              className="text-xs text-gray-600 hover:text-blue-600 px-2 py-1"
              title="ดาวน์โหลด Transcript"
              disabled={transcripts.length === 0}
            >
              📥 Export
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
