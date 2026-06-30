const RECORDING_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
  'audio/ogg',
] as const;

export function resolveRecordingMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return RECORDING_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) || null;
}
