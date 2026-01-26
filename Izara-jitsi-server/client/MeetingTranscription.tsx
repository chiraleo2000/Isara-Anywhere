/**
 * Izara Meeting Transcription Component
 * 
 * React component for displaying real-time transcription during meetings
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  liveTranscriptionService, 
  TranscriptSegment, 
  TranscriptionStatus 
} from './LiveTranscriptionService';

export interface MeetingTranscriptionProps {
  meetingId: string;
  userId: string;
  userRole: 'doctor' | 'patient' | 'guest';
  userName: string;
  language?: 'th-TH' | 'en-US';
  isHost?: boolean;
  onTranscriptionEnd?: (transcripts: TranscriptSegment[], summary: string) => void;
  apiBaseUrl?: string;
}

interface Summary {
  chiefComplaint: string;
  presentIllness: string;
  assessment: string;
  plan: string;
  medications: string[];
  followUp: string;
}

export const MeetingTranscription: React.FC<MeetingTranscriptionProps> = ({
  meetingId,
  userId,
  userRole,
  userName,
  language = 'th-TH',
  isHost = false,
  onTranscriptionEnd,
  apiBaseUrl = 'http://localhost:3020'
}) => {
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [currentInterim, setCurrentInterim] = useState<string>('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, currentInterim]);

  // Start transcription
  const startTranscription = useCallback(() => {
    if (!liveTranscriptionService.isSupported()) {
      setError('Browser ไม่รองรับ Speech Recognition - กรุณาใช้ Chrome หรือ Edge');
      return;
    }

    setError(null);
    liveTranscriptionService.start({
      meetingId,
      language,
      speakerId: userId,
      speakerRole: userRole,
      speakerName: userName,
      onTranscript: (segment) => {
        if (segment.isFinal) {
          setTranscripts(prev => [...prev, segment]);
          setCurrentInterim('');
          
          // Send to server
          sendTranscriptToServer(segment);
        } else {
          setCurrentInterim(segment.content);
        }
      },
      onError: (err) => {
        console.error('Transcription error:', err);
        setError(err.message);
      },
      onStatusChange: setStatus
    });
  }, [meetingId, userId, userRole, userName, language]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    const allTranscripts = liveTranscriptionService.stop();
    setTranscripts(allTranscripts);
  }, []);

  // Toggle pause/resume
  const togglePause = useCallback(() => {
    if (status === 'listening') {
      liveTranscriptionService.pause();
    } else if (status === 'paused') {
      liveTranscriptionService.resume();
    }
  }, [status]);

  // Send transcript to server
  const sendTranscriptToServer = async (segment: TranscriptSegment) => {
    try {
      await fetch(`${apiBaseUrl}/api/transcription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          segment
        })
      });
    } catch (err) {
      console.error('Error sending transcript:', err);
    }
  };

  // Generate AI summary
  const generateSummary = useCallback(async () => {
    if (transcripts.length === 0) {
      setError('ไม่มีข้อความถอดเสียงให้สรุป');
      return;
    }

    setIsGeneratingSummary(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/meetings/${meetingId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcripts: transcripts.map(t => ({
            speaker: t.speakerRole,
            speakerName: t.speakerName,
            content: t.content,
            timestamp: t.timestamp
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.summary);

      if (onTranscriptionEnd) {
        onTranscriptionEnd(transcripts, JSON.stringify(data.summary));
      }

    } catch (err) {
      console.error('Error generating summary:', err);
      setError('ไม่สามารถสร้างสรุปการประชุมได้');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [transcripts, meetingId, apiBaseUrl, onTranscriptionEnd]);

  // Export transcript
  const exportTranscript = useCallback(() => {
    const text = transcripts
      .map(t => `[${new Date(t.timestamp).toLocaleTimeString('th-TH')}] ${t.speakerName}: ${t.content}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${meetingId}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transcripts, meetingId]);

  return (
    <div className="izara-transcription" style={styles.container}>
      {/* Header with controls */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          🎙️ ถอดเสียงการสนทนา
          <span style={styles.languageBadge}>
            {language === 'th-TH' ? '🇹🇭 ไทย' : '🇺🇸 English'}
          </span>
        </h3>
        
        {/* Status indicator */}
        <div style={styles.statusContainer}>
          <span style={{
            ...styles.statusDot,
            backgroundColor: status === 'listening' ? '#22c55e' : 
                           status === 'paused' ? '#eab308' : 
                           status === 'error' ? '#ef4444' : '#6b7280'
          }} />
          <span style={styles.statusText}>
            {status === 'idle' && 'พร้อมใช้งาน'}
            {status === 'starting' && 'กำลังเริ่ม...'}
            {status === 'listening' && 'กำลังฟัง...'}
            {status === 'paused' && 'หยุดชั่วคราว'}
            {status === 'error' && 'มีข้อผิดพลาด'}
            {status === 'stopped' && 'หยุดแล้ว'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {/* Control buttons */}
      {isHost && (
        <div style={styles.controls}>
          {status === 'idle' || status === 'stopped' ? (
            <button onClick={startTranscription} style={styles.btnPrimary}>
              ▶️ เริ่มถอดเสียง
            </button>
          ) : (
            <>
              <button onClick={togglePause} style={styles.btnSecondary}>
                {status === 'listening' ? '⏸️ หยุดชั่วคราว' : '▶️ ดำเนินการต่อ'}
              </button>
              <button onClick={stopTranscription} style={styles.btnDanger}>
                ⏹️ หยุด
              </button>
            </>
          )}

          {transcripts.length > 0 && (
            <>
              <button 
                onClick={generateSummary} 
                style={styles.btnSuccess}
                disabled={isGeneratingSummary}
              >
                {isGeneratingSummary ? '🔄 กำลังสรุป...' : '✨ สรุป AI'}
              </button>
              <button onClick={exportTranscript} style={styles.btnSecondary}>
                📥 Export
              </button>
            </>
          )}
        </div>
      )}

      {/* Transcript display */}
      <div style={styles.transcriptContainer}>
        {transcripts.length === 0 && status === 'idle' && (
          <div style={styles.placeholder}>
            {isHost 
              ? '👆 กดปุ่ม "เริ่มถอดเสียง" เพื่อเริ่มบันทึกการสนทนา'
              : 'รอผู้เริ่มประชุมเปิดการถอดเสียง...'}
          </div>
        )}

        {transcripts.map((segment, index) => (
          <div 
            key={segment.id} 
            style={{
              ...styles.transcriptItem,
              ...(segment.speakerRole === 'doctor' ? styles.doctorMessage : styles.patientMessage)
            }}
          >
            <div style={styles.speakerInfo}>
              <span style={styles.speakerName}>
                {segment.speakerRole === 'doctor' ? '👨‍⚕️' : '🧑'} {segment.speakerName}
              </span>
              <span style={styles.timestamp}>
                {new Date(segment.timestamp).toLocaleTimeString('th-TH')}
              </span>
            </div>
            <div style={styles.transcriptText}>{segment.content}</div>
          </div>
        ))}

        {/* Interim result */}
        {currentInterim && (
          <div style={{...styles.transcriptItem, ...styles.interimMessage}}>
            <div style={styles.speakerInfo}>
              <span style={styles.speakerName}>🎤 {userName}</span>
              <span style={styles.timestamp}>กำลังพิมพ์...</span>
            </div>
            <div style={styles.transcriptText}>{currentInterim}</div>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* AI Summary */}
      {summary && (
        <div style={styles.summaryContainer}>
          <h4 style={styles.summaryTitle}>📋 สรุปการสนทนา (AI)</h4>
          
          <div style={styles.summarySection}>
            <strong>🎯 อาการสำคัญ:</strong>
            <p>{summary.chiefComplaint}</p>
          </div>

          <div style={styles.summarySection}>
            <strong>📝 ประวัติปัจจุบัน:</strong>
            <p>{summary.presentIllness}</p>
          </div>

          <div style={styles.summarySection}>
            <strong>🔍 การประเมิน:</strong>
            <p>{summary.assessment}</p>
          </div>

          <div style={styles.summarySection}>
            <strong>💊 ยาที่สั่ง:</strong>
            <ul>
              {summary.medications.map((med, i) => (
                <li key={i}>{med}</li>
              ))}
            </ul>
          </div>

          <div style={styles.summarySection}>
            <strong>📅 แผนการดูแล:</strong>
            <p>{summary.plan}</p>
          </div>

          <div style={styles.summarySection}>
            <strong>🔄 นัดติดตาม:</strong>
            <p>{summary.followUp}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#1e40af',
    color: 'white'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  languageBadge: {
    fontSize: '12px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite'
  },
  statusText: {
    fontSize: '13px'
  },
  error: {
    padding: '8px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '13px'
  },
  controls: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap'
  },
  btnPrimary: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500
  },
  btnSecondary: {
    padding: '8px 16px',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnDanger: {
    padding: '8px 16px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnSuccess: {
    padding: '8px 16px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  transcriptContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px'
  },
  placeholder: {
    textAlign: 'center',
    color: '#64748b',
    padding: '32px',
    fontSize: '14px'
  },
  transcriptItem: {
    marginBottom: '12px',
    padding: '10px 14px',
    borderRadius: '12px',
    maxWidth: '85%'
  },
  doctorMessage: {
    backgroundColor: '#dbeafe',
    marginLeft: 'auto',
    borderBottomRightRadius: '4px'
  },
  patientMessage: {
    backgroundColor: '#f0fdf4',
    marginRight: 'auto',
    borderBottomLeftRadius: '4px'
  },
  interimMessage: {
    backgroundColor: '#fef3c7',
    opacity: 0.7,
    fontStyle: 'italic'
  },
  speakerInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px'
  },
  speakerName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569'
  },
  timestamp: {
    fontSize: '11px',
    color: '#94a3b8'
  },
  transcriptText: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#1e293b'
  },
  summaryContainer: {
    backgroundColor: '#f0f9ff',
    padding: '16px',
    borderTop: '2px solid #0ea5e9',
    maxHeight: '40%',
    overflowY: 'auto'
  },
  summaryTitle: {
    margin: '0 0 12px 0',
    color: '#0369a1',
    fontSize: '16px'
  },
  summarySection: {
    marginBottom: '12px',
    fontSize: '13px',
    lineHeight: 1.6
  }
};

export default MeetingTranscription;
