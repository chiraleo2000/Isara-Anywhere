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
