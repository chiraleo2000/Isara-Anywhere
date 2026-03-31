/**
 * LiveTranscription Component - Real-time Meeting Transcription Display
 * 
 * Features:
 * - Near real-time transcription using Web Speech API (FREE)
 * - Microsoft Teams / Google Meet style UI
 * - Thai and English language support
 * - Auto-scroll with speaker identification
 * - Toggle on/off during meeting
 * - Export transcription to PostgreSQL
 * 
 * @version 3.0.0
 * @updated 2026-01-21
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Speech Recognition types for TypeScript
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Transcript entry interface
export interface TranscriptEntry {
  id: string;
  speakerName: string;
  speakerRole: 'doctor' | 'patient' | 'guest';
  content: string;
  timestamp: Date;
  isFinal: boolean;
  confidence: number;
  language: string;
}

interface LiveTranscriptionProps {
  isActive: boolean;
  onToggle: () => void;
  speakerName: string;
  speakerRole: 'doctor' | 'patient' | 'guest';
  language?: 'th' | 'en';
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  onNewEntry?: (entry: TranscriptEntry) => void;
  appointmentId?: string;
  autoSave?: boolean;
}

const LiveTranscription: React.FC<LiveTranscriptionProps> = ({
  isActive,
  onToggle,
  speakerName,
  speakerRole,
  language = 'th',
  onTranscriptUpdate,
  onNewEntry,
  appointmentId,
  autoSave = true
}) => {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'th' | 'en'>(language);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Auto-scroll to latest transcript
  useEffect(() => {
    if (transcriptsEndRef.current) {
      transcriptsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, interimTranscript]);

  // Notify parent of transcript updates
  useEffect(() => {
    if (onTranscriptUpdate) {
      onTranscriptUpdate(transcripts);
    }
  }, [transcripts, onTranscriptUpdate]);

  // Initialize Speech Recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('เบราว์เซอร์ของคุณไม่รองรับ Speech Recognition กรุณาใช้ Google Chrome');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = selectedLanguage === 'th' ? 'th-TH' : 'en-US';

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript;
          
          // Create new transcript entry
          const entry: TranscriptEntry = {
            id: `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            speakerName,
            speakerRole,
            content: transcript.trim(),
            timestamp: new Date(),
            isFinal: true,
            confidence: confidence || 0.95,
            language: selectedLanguage
          };

          setTranscripts(prev => [...prev, entry]);
          
          if (onNewEntry) {
            onNewEntry(entry);
          }

          // Auto-save to backend if enabled
          if (autoSave && appointmentId) {
            saveTranscriptToBackend(entry);
          }
        } else {
          interimText += transcript;
        }
      }

      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        // Restart on no speech
        if (isActive) {
          setTimeout(() => {
            recognition.start();
          }, 500);
        }
      } else if (event.error === 'audio-capture') {
        setError('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งาน');
      } else if (event.error === 'not-allowed') {
        setError('การใช้งานไมโครโฟนถูกบล็อก กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์');
      } else {
        setError(`เกิดข้อผิดพลาด: ${event.error}`);
      }
      
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
      setInterimTranscript('');
      
      // Auto-restart if still active
      if (isActive) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log('Recognition restart failed:', e);
          }
        }, 500);
      }
    };

    return recognition;
  }, [selectedLanguage, speakerName, speakerRole, onNewEntry, autoSave, appointmentId, isActive]);

  // Start/stop recognition based on isActive
  useEffect(() => {
    if (isActive) {
      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }
      
      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start();
          startTimeRef.current = Date.now();
        } catch (e) {
          console.warn('Recognition already started:', e);
        }
      }
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isActive, initRecognition, isListening]);

  // Update language when changed
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (isActive) {
      recognitionRef.current = initRecognition();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Recognition restart failed:', e);
        }
      }
    }
  }, [selectedLanguage, isActive, initRecognition]);

  // Save transcript to backend
  const saveTranscriptToBackend = async (entry: TranscriptEntry) => {
    try {
      const token = localStorage.getItem('authToken');
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      await fetch('/api/meeting/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentId,
          speakerRole: entry.speakerRole,
          speakerName: entry.speakerName,
          content: entry.content,
          language: entry.language,
          confidence: entry.confidence,
          startTimeSeconds: elapsedSeconds,
          isFinal: entry.isFinal
        })
      });
    } catch (error) {
      console.error('Failed to save transcript:', error);
    }
  };

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get speaker color
  const getSpeakerColor = (role: string): string => {
    switch (role) {
      case 'doctor': return 'text-blue-600';
      case 'patient': return 'text-green-600';
      case 'guest': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  // Export transcript
  const exportTranscript = () => {
    const text = transcripts.map(t => 
      `[${formatTime(t.timestamp)}] ${t.speakerName} (${t.speakerRole}): ${t.content}`
    ).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${appointmentId || 'meeting'}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear transcript
  const clearTranscript = () => {
    if (confirm('ต้องการล้าง transcript ทั้งหมดหรือไม่?')) {
      setTranscripts([]);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`mb-2 p-3 rounded-full shadow-lg transition-all ${
          isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-700 text-white'
        }`}
        title={showPanel ? 'ซ่อน Transcript' : 'แสดง Transcript'}
      >
        {isActive ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Transcript Panel - Microsoft Teams Style */}
      {showPanel && (
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
              </svg>
              <span className="font-semibold">Live Transcription</span>
              {isListening && (
                <span className="flex items-center text-xs bg-red-500 px-2 py-0.5 rounded-full animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full mr-1"></span>{' '}
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Language Toggle */}
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as 'th' | 'en')}
                className="text-sm bg-blue-500 border border-blue-400 rounded px-2 py-1 text-white"
                aria-label="Select transcription language"
              >
                <option value="th">🇹🇭 ไทย</option>
                <option value="en">🇺🇸 English</option>
              </select>
              
              {/* Toggle Active */}
              <button
                onClick={onToggle}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isActive ? '⏹ หยุด' : '▶ เริ่ม'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Transcript List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[350px]">
            {transcripts.length === 0 && !interimTranscript ? (
              <div className="text-center text-gray-400 py-8">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
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
                      <span className="text-xs text-gray-400">
                        {formatTime(entry.timestamp)}
                      </span>
                      {entry.confidence < 0.8 && (
                        <span className="text-xs text-yellow-500" title="Low confidence">
                          ⚠️
                        </span>
                      )}
                    </div>
                    <p className="text-gray-800 text-sm pl-6 bg-gray-50 rounded-lg px-3 py-2">
                      {entry.content}
                    </p>
                  </div>
                ))}
                
                {/* Interim transcript (real-time) */}
                {interimTranscript && (
                  <div className="flex flex-col opacity-60">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`font-semibold text-sm ${getSpeakerColor(speakerRole)}`}>
                        {speakerRole === 'doctor' && '👨‍⚕️'}
                        {speakerRole === 'patient' && '🧑'}
                        {speakerRole === 'guest' && '👥'}
                        {speakerName}
                      </span>
                      <span className="text-xs text-gray-400 animate-pulse">
                        กำลังพูด...
                      </span>
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

          {/* Footer Actions */}
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-lg">
            <span className="text-xs text-gray-500">
              {transcripts.length} รายการ
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearTranscript}
                className="text-xs text-gray-600 hover:text-red-600 px-2 py-1"
                title="ล้าง Transcript"
              >
                🗑️ ล้าง
              </button>
              <button
                onClick={exportTranscript}
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
};

export default LiveTranscription;
