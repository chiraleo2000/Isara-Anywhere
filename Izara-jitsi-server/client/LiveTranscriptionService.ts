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

declare var SpeechRecognition: {
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

  /**
   * Check if Web Speech API is available
   */
  isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
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

      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

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
            id: `seg_${this.config!.meetingId}_${++this.segmentCounter}`,
            speakerId: this.config!.speakerId,
            speakerRole: this.config!.speakerRole,
            speakerName: this.config!.speakerName,
            content: transcript,
            language: this.config!.language || 'th-TH',
            confidence: result[0].confidence || 0.9,
            timestamp: new Date(),
            isFinal: result.isFinal
          };

          if (result.isFinal) {
            this.transcripts.push(segment);
          }

          this.config!.onTranscript?.(segment);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[Transcription] Error:', event.error);
        
        if (event.error === 'no-speech') {
          // No speech detected, continue listening
          return;
        }

        this.setStatus('error');
        this.config!.onError?.(new Error(`Speech recognition error: ${event.error}`));

        // Auto-restart for recoverable errors
        if (['network', 'aborted'].includes(event.error) && this.isListening) {
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (e) {
                // Already started
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
          } catch (e) {
            // Already started or stopped
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
      config.onError?.(error as Error);
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
      } catch (e) {
        // Already stopped
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
      } catch (e) {
        // Already stopped
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
      } catch (e) {
        // Already started
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
