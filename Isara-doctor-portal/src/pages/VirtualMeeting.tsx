import React, { useState, useEffect, useRef } from 'react';
import { Appointment } from '../types';
import { doctorAIService } from '../services/enhancedMeetingService';
import { recordingStorage } from '../services/storageServices';
import meetingTimeService, { MeetingTimeCheck } from '../services/meetingTimeService';

interface VirtualMeetingProps {
  appointment: Appointment;
  onClose: () => void;
  onMeetingEnd: (appointmentId: string, results: any) => void;
  onMissedMeeting?: (appointmentId: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const VirtualMeeting: React.FC<VirtualMeetingProps> = ({
  appointment,
  onClose,
  onMeetingEnd,
  onMissedMeeting
}) => {
  const [meetingState, setMeetingState] = useState<'time_check' | 'consent' | 'meeting' | 'ended'>('time_check');
  const [meetingTimeCheck, setMeetingTimeCheck] = useState<MeetingTimeCheck | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingStatus, setRecordingStatus] = useState<string>('');
  
  const startTimeRef = useRef<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Check meeting time window on mount and periodically
  useEffect(() => {
    const checkTimeWindow = async () => {
      await meetingTimeService.loadRules();
      const check = meetingTimeService.checkMeetingWindow(
        appointment.scheduledDate || appointment.date || new Date().toISOString(),
        appointment.scheduledTime || appointment.time || '09:00'
      );
      setMeetingTimeCheck(check);
      
      if (check.canJoin) {
        setMeetingState('consent');
      } else if (check.isLate) {
        // Meeting window has passed - trigger missed meeting handler
        if (onMissedMeeting) {
          onMissedMeeting(appointment.id);
        }
      }
    };

    checkTimeWindow();
    
    // Re-check every minute if not yet in window
    const interval = setInterval(() => {
      if (meetingState === 'time_check') {
        checkTimeWindow();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [appointment.id, appointment.scheduledDate, appointment.date, appointment.scheduledTime, appointment.time, meetingState, onMissedMeeting]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  // Duration timer
  useEffect(() => {
    if (meetingStarted) {
      const interval = setInterval(() => {
        setMeetingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [meetingStarted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
      doctorAIService.reset();
    };
  }, []);

  const stopAllMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    doctorAIService.stopSpeechRecognition();
    doctorAIService.stopSpeaking();
  };

  const startUserVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsVideoOn(true);
      return stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsVideoOn(false);
      alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้องและไมโครโฟน');
      return null;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const startRecording = (stream: MediaStream) => {
    try {
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          const totalSize = recordedChunksRef.current.reduce((sum, blob) => sum + blob.size, 0);
          setRecordingStatus(`Recording: ${formatBytes(totalSize)}`);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('🎥 Recording stopped, preparing to upload...');
        await uploadRecordingToCloud();
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingStatus('Recording started...');
      console.log('🎥 Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingStatus('Recording failed to start');
    }
  };

  const uploadRecordingToCloud = async () => {
    try {
      if (recordedChunksRef.current.length === 0) {
        console.warn('No recording data to upload');
        return null;
      }

      setRecordingStatus('Uploading recording to cloud...');
      const recordingBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const recordingFile = new File(
        [recordingBlob], 
        `consultation_${appointment.id}_${Date.now()}.webm`,
        { type: 'video/webm' }
      );

      console.log(`📤 Uploading ${formatBytes(recordingBlob.size)} to cloud...`);

      // Upload recording to user-specific folder
      const uploadedFile = await recordingStorage.uploadRecording(
        recordingFile,
        appointment.id,
        appointment.user.id,
        {
          doctorId: appointment.doctor?.id,
          patientName: appointment.user.name,
          symptoms: appointment.symptoms.join(', '),
          duration: meetingDuration
        }
      );

      console.log('✅ Recording uploaded to cloud:', uploadedFile.url);
      
      // Generate and upload transcription
      setRecordingStatus('Generating transcription...');
      const transcription = await generateTranscription();
      
      if (transcription) {
        await recordingStorage.uploadTranscription(
          transcription,
          appointment.id,
          appointment.user.id
        );
        console.log('✅ Transcription uploaded to cloud');
      }

      setRecordingStatus('Recording uploaded successfully');
      return uploadedFile.url;
    } catch (error) {
      console.error('❌ Error uploading recording:', error);
      setRecordingStatus('Upload failed, saved locally');
      
      const recordingBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      return URL.createObjectURL(recordingBlob);
    }
  };

  // Add this new function for transcription
  const generateTranscription = async () => {
    try {
      const conversationHistory = doctorAIService.getConversationHistory();
      
      const transcription = {
        appointmentId: appointment.id,
        patientId: appointment.user.id,
        doctorId: appointment.doctor?.id,
        startTime: new Date(startTimeRef.current).toISOString(),
        endTime: new Date().toISOString(),
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        messages: conversationHistory.map(msg => ({
          role: msg.role,
          speaker: msg.speakerName || (msg.role === 'user' ? appointment.user.name : appointment.doctor?.name),
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        })),
        metadata: {
          symptoms: appointment.symptoms,
          totalMessages: conversationHistory.length,
          inputMode: inputMode,
          generatedAt: new Date().toISOString()
        }
      };

      return transcription;
    } catch (error) {
      console.error('Error generating transcription:', error);
      return null;
    }
  };

  const handleStartMeeting = async () => {
    if (!consentGiven) {
      alert('กรุณายอมรับข้อตกลงการบันทึกก่อนเริ่มการประชุม');
      return;
    }

    setMeetingState('meeting');
    setMeetingStarted(true);
    startTimeRef.current = Date.now();
    
    const stream = await startUserVideo();
    if (!stream) {
      alert('ไม่สามารถเริ่มการประชุมได้ กรุณาอนุญาตการใช้กล้องและไมโครโฟน');
      setMeetingState('consent');
      return;
    }

    startRecording(stream);
    
    try {
      const greeting = await doctorAIService.startConsultation(
        appointment.doctor?.id || 'doc1',
        {
          name: appointment.user.name,
          symptoms: appointment.symptoms,
          age: appointment.user.dateOfBirth ? 
            Math.floor((Date.now() - new Date(appointment.user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
            undefined
        },
        appointment.id
      );
      
      const greetingMessage: Message = {
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      };
      
      setMessages([greetingMessage]);
      
      if (inputMode === 'voice') {
        doctorAIService.speakText(greeting);
      }
    } catch (error: any) {
      console.error('Error initializing AI Doctor:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `สวัสดีครับคุณ${appointment.user.name} ยินดีต้อนรับสู่การปรึกษาทางไกล วันนี้มีอาการอะไรรบกวนครับ?\n\n(หมายเหตุ: ${error.message})`,
        timestamp: new Date()
      };
      setMessages([errorMessage]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAITyping) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsAITyping(true);

    try {
      const aiResponse = await doctorAIService.sendMessage(inputMessage);
      
      const aiMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      if (inputMode === 'voice') {
        doctorAIService.speakText(aiResponse);
      }
    } catch (error: any) {
      console.error('AI Doctor error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: error.message || 'ขอโทษครับ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      if (inputMode === 'voice') {
        doctorAIService.speakText(errorMessage.content);
      }
    } finally {
      setIsAITyping(false);
    }
  };

  const handleTranscript = async (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      setInterimTranscript('');
      
      if (transcript.trim()) {
        const userMessage: Message = {
          role: 'user',
          content: transcript,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsAITyping(true);

        try {
          const aiResponse = await doctorAIService.sendMessage(transcript);
          
          const aiMessage: Message = {
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, aiMessage]);
          doctorAIService.speakText(aiResponse);
        } catch (error: any) {
          console.error('AI Doctor error:', error);
          const errorMessage: Message = {
            role: 'assistant',
            content: error.message || 'ขอโทษครับ เกิดข้อผิดพลาด กรุณาพูดใหม่อีกครั้ง',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          doctorAIService.speakText(errorMessage.content);
        } finally {
          setIsAITyping(false);
        }
      }
    } else {
      setInterimTranscript(transcript);
    }
  };

  const toggleInputMode = () => {
    const newMode = inputMode === 'text' ? 'voice' : 'text';
    setInputMode(newMode);
    
    if (newMode === 'voice') {
      const success = doctorAIService.startSpeechRecognition(handleTranscript);
      if (success) {
        setIsMicOn(true);
      } else {
        alert('เบราว์เซอร์ของคุณไม่รองรับการรับรู้เสียง กรุณาใช้ Google Chrome');
        setInputMode('text');
      }
    } else {
      doctorAIService.stopSpeechRecognition();
      doctorAIService.stopSpeaking();
      setIsMicOn(false);
      setInterimTranscript('');
    }
  };

  const toggleMic = () => {
    if (isMicOn) {
      doctorAIService.stopSpeechRecognition();
      setIsMicOn(false);
      setInterimTranscript('');
    } else {
      const success = doctorAIService.startSpeechRecognition(handleTranscript);
      setIsMicOn(success);
    }
  };
  
  const toggleVideo = () => {
    if (isVideoOn) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach(track => track.stop());
      }
      setIsVideoOn(false);
    } else {
      startUserVideo();
    }
  };

  const handleEndMeeting = async () => {
    if (!confirm('คุณต้องการจบการปรึกษาใช่หรือไม่?')) return;

    console.log('📊 Ending meeting, conversation has', messages.length, 'messages');
    
    setMeetingState('ended');
    setRecordingStatus('Processing meeting data...');
    
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    stopAllMedia();

    // Wait for recording to finish uploading
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      setRecordingStatus('Generating AI consultation report...');
      
      // Get actual meeting duration
      const actualDuration = doctorAIService.getDuration();
      console.log('⏱️ Meeting duration:', actualDuration, 'seconds');
      
      // Get conversation history
      const conversationHistory = doctorAIService.getConversationHistory();
      console.log('💬 Conversation history:', conversationHistory.length, 'messages');
      
      // Generate comprehensive AI report
      const report = await doctorAIService.generateConsultationReport();
      console.log('📋 Generated report:', report);
      
      const results = {
        summary: report,
        duration: actualDuration,
        messages: conversationHistory,
        doctor: doctorAIService.getDoctor(),
        recordingUrl: null,
        conversationComplete: conversationHistory.length > 1, // At least greeting + 1 response
        timestamp: new Date().toISOString()
      };

      console.log('✅ Meeting results prepared:', {
        duration: actualDuration,
        messageCount: conversationHistory.length,
        hasReport: !!report,
        reportKeys: Object.keys(report)
      });

      setRecordingStatus('Meeting ended successfully');
      onMeetingEnd(appointment.id, results);
      
    } catch (error) {
      console.error('❌ Error generating report:', error);
      
      // Fallback with actual conversation data
      const actualDuration = doctorAIService.getDuration();
      const conversationHistory = doctorAIService.getConversationHistory();
      
      const results = {
        summary: {
          chiefComplaint: appointment.symptoms.join(', '),
          presentingSymptoms: appointment.symptoms,
          preliminaryAssessment: 'การปรึกษาทางไกลเสร็จสมบูรณ์ กรุณาติดตามผลกับแพทย์',
          recommendations: ['พักผ่อนให้เพียงพอ', 'ดื่มน้ำมากๆ', 'หากอาการไม่ดีขึ้น ภายใน 3-5 วันให้พบแพทย์'],
          prescriptions: [],
          followUp: 'ติดตามอาการใน 3-5 วัน',
          redFlags: ['ไข้สูงเกิน 39°C', 'หายใจลำบาก', 'อาการแย่ลงอย่างรวดเร็ว'],
          lifestyleAdvice: ['รับประทานอาหารที่มีประโยชน์', 'ออกกำลังกายสม่ำเสมอ'],
          needsFollowUp: false,
          followUpDate: null
        },
        duration: actualDuration,
        messages: conversationHistory,
        doctor: appointment.doctor,
        conversationComplete: conversationHistory.length > 1,
        timestamp: new Date().toISOString()
      };
      
      console.log('⚠️ Using fallback results with actual data:', {
        duration: actualDuration,
        messageCount: conversationHistory.length
      });
      
      onMeetingEnd(appointment.id, results);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Time check screen - shows when user tries to join outside meeting window
  if (meetingState === 'time_check') {
    const rules = meetingTimeService.getRules();
    
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8">
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              meetingTimeCheck?.isEarly ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {meetingTimeCheck?.isEarly ? (
                <svg className="w-10 h-10 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
              ) : (
                <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {meetingTimeCheck?.isEarly ? '⏰ ยังไม่ถึงเวลานัด' : '⏰ เลยเวลานัดหมายแล้ว'}
            </h2>
            
            <p className="text-gray-600">
              {meetingTimeCheck?.reason}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">📋 กฎการเข้าประชุม</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• สามารถเข้าได้ <strong>{rules.allowJoinBefore} นาที</strong> ก่อนเวลานัด</li>
              <li>• สามารถเข้าได้หลังเวลานัดภายใน <strong>{rules.allowJoinAfter} นาที</strong></li>
              <li>• หากเลยเวลา ระบบจะเลื่อนนัดไปสัปดาห์หน้าอัตโนมัติ</li>
            </ul>
          </div>

          {meetingTimeCheck?.windowStart && meetingTimeCheck?.windowEnd && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-gray-600 mb-1">หน้าต่างเวลาเข้าประชุม</p>
              <p className="text-lg font-semibold text-gray-900">
                {meetingTimeCheck.windowStart.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {meetingTimeCheck.windowEnd.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}

          {meetingTimeCheck?.isEarly && meetingTimeCheck?.minutesUntilStart && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-emerald-600 mb-1">เวลาที่เหลือก่อนเริ่ม</p>
              <p className="text-3xl font-bold text-emerald-600">
                {meetingTimeCheck.minutesUntilStart} นาที
              </p>
            </div>
          )}

          {meetingTimeCheck?.isLate && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">
                <strong>⚠️ การนัดหมายนี้เลยเวลาแล้ว</strong><br/>
                ระบบจะดำเนินการเลื่อนนัดไปสัปดาห์หน้าอัตโนมัติ 
                หรือติดต่อ Admin เพื่อขอจัดการนัดหมายใหม่
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              กลับ
            </button>
            
            {meetingTimeCheck?.isEarly && (
              <button
                onClick={() => {
                  const check = meetingTimeService.checkMeetingWindow(
                    appointment.scheduledDate || appointment.date || new Date().toISOString(),
                    appointment.scheduledTime || appointment.time || '09:00'
                  );
                  setMeetingTimeCheck(check);
                  if (check.canJoin) {
                    setMeetingState('consent');
                  }
                }}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                🔄 ตรวจสอบเวลาอีกครั้ง
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (meetingState === 'consent') {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              🎥 ข้อตกลงการบันทึกการประชุม
            </h2>
            <p className="text-gray-600">
              Virtual Consultation Recording Consent
            </p>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-yellow-900 text-lg mb-3 flex items-center">
              <span className="text-2xl mr-2">⚠️</span>
              ประกาศสำคัญ
            </h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-red-600 mr-2 text-xl">•</span>
                <span><strong>การประชุมนี้จะถูกบันทึกทั้งหมด</strong> รวมถึงวิดีโอ เสียง และข้อความ</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2 text-xl">•</span>
                <span>การบันทึกจะถูก<strong>อัปโหลดไปยัง Cloud Storage</strong> ทันทีเมื่อเริ่มการประชุม</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2 text-xl">•</span>
                <span>ข้อมูลทั้งหมดจะถูกใช้สำหรับ<strong>การวิเคราะห์โดย AI</strong> เพื่อสร้างรายงานการรักษา</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2 text-xl">•</span>
                <span>การบันทึกจะถูก<strong>เก็บรักษาอย่างปลอดภัย</strong>ตามมาตรฐาน HIPAA และ PDPA</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2 text-xl">•</span>
                <span>คุณสามารถ<strong>ดาวน์โหลดการบันทึก</strong>ได้หลังจบการประชุม</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ หมายเหตุ:</strong> การบันทึกนี้เป็นส่วนหนึ่งของบริการ Telemedicine 
              และจะช่วยให้แพทย์สามารถทบทวนการรักษาได้อย่างถูกต้องและครบถ้วน
            </p>
          </div>

          <div className="mb-6">
            <label className="flex items-start p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-1 h-5 w-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <span className="ml-3 text-gray-800">
                <strong className="block text-lg mb-1">ฉันยอมรับและเข้าใจข้อตกลง</strong>
                <span className="text-sm text-gray-600">
                  ฉันยินยอมให้บันทึกการประชุมทางไกลครั้งนี้ รวมถึงการใช้ข้อมูลเพื่อวัตถุประสงค์ทางการแพทย์
                  และการวิเคราะห์โดย AI ตามที่ระบุไว้ข้างต้น
                </span>
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleStartMeeting}
              disabled={!consentGiven}
              className={`flex-1 px-6 py-3 font-bold rounded-lg transition-all ${
                consentGiven
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {consentGiven ? '✅ เริ่มการประชุม' : '⏳ กรุณายอมรับข้อตกลง'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            🔒 ข้อมูลของคุณได้รับการปกป้องด้วยการเข้ารหัส End-to-End Encryption
          </p>
        </div>
      </div>
    );
  }

  if (meetingState === 'ended') {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            การปรึกษาเสร็จสิ้น
          </h2>
          <p className="text-gray-600 mb-6">
            ขอบคุณที่ใช้บริการ Izara Anywhere
          </p>
          
          {recordingStatus && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">{recordingStatus}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">ระยะเวลา</p>
            <p className="text-3xl font-bold text-emerald-600">{formatDuration(meetingDuration)}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
          >
            ดูผลการรักษา
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full animate-pulse">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <span className="text-sm font-semibold">REC</span>
            </div>
          )}
          <span className="text-sm text-gray-300">{formatDuration(meetingDuration)}</span>
          {recordingStatus && (
            <span className="text-xs text-gray-400">{recordingStatus}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full transition-all ${
              isMicOn ? 'bg-red-600 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isMicOn ? 'ปิดไมค์' : 'เปิดไมค์'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              {isMicOn ? (
                <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
              ) : (
                <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 5a3 3 0 013 3v1.293l-3.707-3.707A2.993 2.993 0 0110 5z" />
              )}
            </svg>
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-all ${
              isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>

          <button
            onClick={toggleInputMode}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              inputMode === 'voice' ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            {inputMode === 'voice' ? '🎤 โหมดเสียง' : '⌨️ โหมดข้อความ'}
          </button>

          <button
            onClick={handleEndMeeting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
          >
            จบการปรึกษา
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/3 bg-gray-900 flex flex-col p-4 space-y-4">
          <div className="flex-1 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-xl flex items-center justify-center relative">
            <div className="text-center">
              <img
                src={appointment.doctor?.avatarUrl}
                alt={appointment.doctor?.name}
                className="w-32 h-32 rounded-full mx-auto mb-4 shadow-2xl border-4 border-white"
              />
              <p className="text-white text-xl font-semibold">{appointment.doctor?.name}</p>
              <p className="text-blue-300 text-sm">{appointment.doctor?.specialty}</p>
              <p className="text-blue-400 text-xs mt-2">🤖 Powered by Gemini AI</p>
            </div>
            {isAITyping && (
              <div className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                กำลังพิมพ์...
              </div>
            )}
          </div>

          <div className="flex-1 bg-gray-800 rounded-xl relative overflow-hidden">
            {isVideoOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl text-white">{appointment.user.name.charAt(0)}</span>
                  </div>
                  <p className="text-white text-lg">{appointment.user.name}</p>
                </div>
              </div>
            )}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
              คุณ {isMicOn && <span className="text-red-400 ml-2">🔴 ON AIR</span>}
            </div>
          </div>
        </div>

        <div className="w-1/3 bg-white flex flex-col">
          <div className="bg-gray-50 border-b px-6 py-4">
            <h3 className="font-bold text-gray-800">💬 บันทึกการสนทนา</h3>
            <p className="text-sm text-gray-500">ผู้ป่วย: {appointment.user.name}</p>
            {inputMode === 'voice' && isMicOn && (
              <div className="mt-2 flex items-center space-x-2 bg-red-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-red-700 font-semibold">LISTENING</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex items-start space-x-2 max-w-[85%]">
                  {msg.role === 'assistant' && (
                    <img src={appointment.doctor?.avatarUrl} alt="Doctor" className="w-8 h-8 rounded-full" />
                  )}
                  <div>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-right' : ''} text-gray-500`}>
                      {msg.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <img src={appointment.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(appointment.user.email || appointment.user.id)}`} alt="User" className="w-8 h-8 rounded-full" />
                  )}
                </div>
              </div>
            ))}
            
            {interimTranscript && (
              <div className="flex justify-end">
                <div className="bg-blue-400 text-white px-4 py-3 rounded-2xl opacity-70 max-w-[85%]">
                  <p className="text-sm italic">{interimTranscript}...</p>
                </div>
              </div>
            )}
            
            {isAITyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4 bg-gray-50">
            {inputMode === 'text' ? (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="พิมพ์ข้อความถึงแพทย์..."
                  disabled={isAITyping}
                  className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isAITyping}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <button
                  onClick={toggleMic}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    isMicOn ? 'bg-red-600 animate-pulse' : 'bg-gray-400'
                  }`}
                >
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                  </svg>
                </button>
                <p className="text-sm font-medium text-gray-700 mt-3">
                  {isMicOn ? '🎤 กำลังฟังเสียงคุณ...' : 'กดเพื่อเริ่มพูด'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualMeeting;