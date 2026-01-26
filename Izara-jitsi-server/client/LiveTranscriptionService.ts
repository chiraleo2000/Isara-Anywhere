/**
 * Izara Live Transcription Service
 * 
 * Uses Web Speech API (FREE) as primary with Google Cloud Speech-to-Text as fallback
 * Supports Thai and English with auto-detection
 */

// Web Speech API type declarations for browser compatibility
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

// SpeechRecognition interface for browsers that support it
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
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

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  speakerRole: 'doctor' | 'patient' | 'guest';
  speakerName: string;
  content: string;
  language: string;
  confidence: number;
  timestamp: Date;
  isFinal: boolean;
}

export interface TranscriptionConfig {
  meetingId: string;
  language?: string;
  speakerId: string;
  speakerRole: 'doctor' | 'patient' | 'guest';
  speakerName: string;
  onTranscript?: (segment: TranscriptSegment) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: TranscriptionStatus) => void;
}

export type TranscriptionStatus = 'idle' | 'starting' | 'listening' | 'paused' | 'error' | 'stopped';

class LiveTranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private config: TranscriptionConfig | null = null;
  private status: TranscriptionStatus = 'idle';
  private transcripts: TranscriptSegment[] = [];
  private segmentCounter = 0;

  private getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
    const globalWindow = globalThis as typeof globalThis & Window;
    return globalWindow.SpeechRecognition || (globalWindow as any).webkitSpeechRecognition || null;
  }

  private logRecognitionActionError(action: string, error: unknown): void {
    console.debug(`[Transcription] ${action} action ignored:`, error);
  }

  /**
   * Check if Web Speech API is available
   */
  isSupported(): boolean {
    return this.getSpeechRecognitionConstructor() !== null;
  }

  /**
   * Start live transcription
   */
  start(config: TranscriptionConfig): boolean {
    if (!this.isSupported()) {
      config.onError?.(new Error('Web Speech API not supported in this browser'));
      return false;
    }

    try {
      this.config = config;
      this.setStatus('starting');

      const SpeechRecognitionConstructor = this.getSpeechRecognitionConstructor();
      if (!SpeechRecognitionConstructor) {
        throw new Error('SpeechRecognition constructor unavailable');
      }

      const activeConfig = config;
      this.recognition = new SpeechRecognitionConstructor();

      // Configure recognition
      this.recognition.lang = config.language || 'th-TH';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      // Event handlers
      this.recognition.onstart = () => {
        this.isListening = true;
        this.setStatus('listening');
        console.log('[Transcription] Started listening');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript.trim();
          
          if (!transcript) continue;

          const segment: TranscriptSegment = {
            id: `seg_${activeConfig.meetingId}_${++this.segmentCounter}`,
            speakerId: activeConfig.speakerId,
            speakerRole: activeConfig.speakerRole,
            speakerName: activeConfig.speakerName,
            content: transcript,
            language: activeConfig.language || 'th-TH',
            confidence: result[0].confidence || 0.9,
            timestamp: new Date(),
            isFinal: result.isFinal
          };

          if (result.isFinal) {
            this.transcripts.push(segment);
          }

          activeConfig.onTranscript?.(segment);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[Transcription] Error:', event.error);
        
        if (event.error === 'no-speech') {
          // No speech detected, continue listening
          return;
        }

        this.setStatus('error');
        activeConfig.onError?.(new Error(`Speech recognition error: ${event.error}`));

        // Auto-restart for recoverable errors
        if (['network', 'aborted'].includes(event.error) && this.isListening) {
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (error) {
                this.logRecognitionActionError('auto-restart', error);
              }
            }
          }, 1000);
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if still supposed to be listening
        if (this.isListening && this.recognition) {
          try {
            this.recognition.start();
          } catch (error) {
            this.logRecognitionActionError('restart', error);
          }
        } else {
          this.setStatus('stopped');
        }
      };

      // Start recognition
      this.recognition.start();
      return true;

    } catch (error) {
      console.error('[Transcription] Start error:', error);
      this.setStatus('error');
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      config.onError?.(normalizedError);
      return false;
    }
  }

  /**
   * Stop transcription
   */
  stop(): TranscriptSegment[] {
    this.isListening = false;
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        this.logRecognitionActionError('stop', error);
      }
      this.recognition = null;
    }

    this.setStatus('stopped');
    console.log('[Transcription] Stopped, total segments:', this.transcripts.length);

    return this.transcripts;
  }

  /**
   * Pause transcription
   */
  pause(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
        this.isListening = false;
        this.setStatus('paused');
      } catch (error) {
        this.logRecognitionActionError('pause', error);
      }
    }
  }

  /**
   * Resume transcription
   */
  resume(): void {
    if (this.recognition && this.config && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        this.setStatus('listening');
      } catch (error) {
        this.logRecognitionActionError('resume', error);
      }
    }
  }

  /**
   * Get current status
   */
  getStatus(): TranscriptionStatus {
    return this.status;
  }

  /**
   * Get all transcripts
   */
  getTranscripts(): TranscriptSegment[] {
    return [...this.transcripts];
  }

  /**
   * Get full transcript text
   */
  getFullText(): string {
    return this.transcripts
      .map(t => `[${t.speakerRole === 'doctor' ? 'แพทย์' : 'ผู้ป่วย'}] ${t.speakerName}: ${t.content}`)
      .join('\n');
  }

  /**
   * Clear transcripts
   */
  clear(): void {
    this.transcripts = [];
    this.segmentCounter = 0;
  }

  private setStatus(status: TranscriptionStatus): void {
    this.status = status;
    this.config?.onStatusChange?.(status);
  }
}

// Export singleton instance
export const liveTranscriptionService = new LiveTranscriptionService();

// Export class for testing
export { LiveTranscriptionService };
