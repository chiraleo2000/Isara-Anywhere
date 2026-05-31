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
import { LiveTranscriptionView } from './transcription/LiveTranscriptionView';
import type { TranscriptEntry } from './transcription/transcriptTypes';

export type { TranscriptEntry } from './transcription/transcriptTypes';
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


// Speech Recognition types for TypeScript
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
            id: `transcript-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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

  // Export transcript
  const exportTranscript = () => {
    const text = transcripts.map(t =>
      `[${t.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${t.speakerName} (${t.speakerRole}): ${t.content}`
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
    <LiveTranscriptionView
      isActive={isActive}
      onToggle={onToggle}
      showPanel={showPanel}
      onTogglePanel={() => setShowPanel(!showPanel)}
      isListening={isListening}
      selectedLanguage={selectedLanguage}
      onLanguageChange={setSelectedLanguage}
      error={error}
      transcripts={transcripts}
      interimTranscript={interimTranscript}
      speakerName={speakerName}
      speakerRole={speakerRole}
      transcriptsEndRef={transcriptsEndRef}
      onClearTranscript={clearTranscript}
      onExportTranscript={exportTranscript}
    />
  );
};

export default LiveTranscription;
