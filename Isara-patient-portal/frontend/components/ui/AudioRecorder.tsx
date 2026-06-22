import React, { useState, useRef, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, Upload, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onError?: (error: string) => void;
  maxDuration?: number; // in seconds
  className?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onError,
  maxDuration = 120, // 2 minutes default
  className = '',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onRecordingComplete(audioBlob, duration);
        
        // Clean up stream
        streamRef.current?.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setPermissionDenied(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionDenied(true);
      onError?.('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งาน');
    }
  }, [maxDuration, onRecordingComplete, onError, duration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  }, [isRecording, isPaused]);

  const deleteRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setDuration(0);
    audioChunksRef.current = [];
  }, [audioUrl]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [audioUrl, isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100 ${className}`}>
      <div className="text-center">
        <h3 className="font-semibold text-gray-800 mb-2 flex items-center justify-center gap-2">
          <Mic className="w-5 h-5 text-purple-600" />
          บันทึกเสียงอธิบายอาการ
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          กดปุ่มไมโครโฟนแล้วพูดอธิบายอาการของคุณ (ไม่เกิน {Math.floor(maxDuration / 60)} นาที)
        </p>
        
        {permissionDenied && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">กรุณาอนุญาตการเข้าถึงไมโครโฟนในเบราว์เซอร์</span>
          </div>
        )}
        
        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {!isRecording && !audioUrl && (
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              aria-label="Start recording"
            >
              <Mic className="w-10 h-10" />
            </button>
          )}
          
          {isRecording && (
            <>
              <button
                onClick={pauseRecording}
                className="w-14 h-14 rounded-full bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-600 transition-all shadow-md"
                aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
              >
                {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
              </button>
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg animate-pulse"
                aria-label="Stop recording"
              >
                <Square className="w-8 h-8" />
              </button>
            </>
          )}
          
          {audioUrl && !isRecording && (
            <>
              <button
                onClick={togglePlayback}
                className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-md"
                aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button
                onClick={deleteRecording}
                className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-all"
                aria-label="Delete recording"
              >
                <Trash2 className="w-6 h-6" />
              </button>
              <button
                onClick={startRecording}
                className="w-14 h-14 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-all"
                aria-label="Re-record"
              >
                <Mic className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
        
        {/* Timer Display */}
        <div className={`text-3xl font-mono font-bold ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
          {formatTime(duration)}
          {isRecording && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              / {formatTime(maxDuration)}
            </span>
          )}
        </div>
        
        {/* Recording Status */}
        {isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-600 font-medium">
              {isPaused ? 'หยุดชั่วคราว' : 'กำลังบันทึก...'}
            </span>
          </div>
        )}
        
        {audioUrl && !isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2 text-emerald-600">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">บันทึกเสียงสำเร็จ</span>
          </div>
        )}
        
        {/* Hidden Audio Element for Playback */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          >
            <track kind="captions" />
          </audio>
        )}
      </div>
    </div>
  );
};
