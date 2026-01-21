/**
 * AI Clinical Assistant - Phase 1 Enhanced
 * 
 * Features per Dr. Isara's requirements:
 * - Pre-consultation patient summary
 * - Document/PDF analysis and summarization
 * - Clinical Decision Support (CDS)
 * - Man-in-the-Loop validation
 * - Knowledge base with 2024-2025 guidelines
 * - Chat history persistence
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  postgresService,
  type AIChatMessage,
  type PreConsultationSummary,
  type AIDocumentAnalysis,
  type CDSRecommendation,
} from '../services/postgresService';

// Icons
const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

interface AIClinicalAssistantProps {
  patientId?: string;
  appointmentId?: string;
  doctorId: string;
  sessionId?: string;
  className?: string;
}

type TabType = 'chat' | 'summary' | 'documents' | 'cds';

const AIClinicalAssistant: React.FC<AIClinicalAssistantProps> = ({
  patientId,
  appointmentId,
  doctorId,
  sessionId = `session-${Date.now()}`,
  className = '',
}) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pre-consultation summary
  const [preSummary, setPreSummary] = useState<PreConsultationSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  
  // Document analysis
  const [documents, setDocuments] = useState<AIDocumentAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // CDS Recommendations
  const [cdsRecommendations, setCdsRecommendations] = useState<CDSRecommendation[]>([]);
  const [isCdsLoading, setIsCdsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!doctorId) return;
      
      try {
        const result = await postgresService.getChatHistory(doctorId, sessionId);
        if (result.success && result.data) {
          setMessages(result.data);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    loadChatHistory();
  }, [doctorId, sessionId]);

  // Load pre-consultation summary when patient changes
  useEffect(() => {
    const loadPreSummary = async () => {
      if (!patientId) return;
      
      setIsSummaryLoading(true);
      try {
        const result = await postgresService.getPreConsultationSummary(patientId, appointmentId);
        if (result.success && result.data) {
          setPreSummary(result.data);
        }
      } catch (err) {
        console.error('Failed to load pre-consultation summary:', err);
      } finally {
        setIsSummaryLoading(false);
      }
    };

    loadPreSummary();
  }, [patientId, appointmentId]);

  // Load CDS recommendations
  useEffect(() => {
    const loadCDS = async () => {
      if (!patientId) return;
      
      setIsCdsLoading(true);
      try {
        const result = await postgresService.getCDSRecommendations(patientId);
        if (result.success && result.data) {
          setCdsRecommendations(result.data);
        }
      } catch (err) {
        console.error('Failed to load CDS recommendations:', err);
      } finally {
        setIsCdsLoading(false);
      }
    };

    loadCDS();
  }, [patientId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      context: { patientId, appointmentId },
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Save user message
      await postgresService.saveChatMessage(doctorId, userMessage, sessionId);

      // Get AI response (this would call your AI backend)
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          patientId,
          appointmentId,
          sessionId,
          chatHistory: messages.slice(-10), // Last 10 messages for context
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        const assistantMessage: AIChatMessage = {
          role: 'assistant',
          content: data.response,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        await postgresService.saveChatMessage(doctorId, assistantMessage, sessionId);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, doctorId, sessionId, patientId, appointmentId, messages]);

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;

    setIsAnalyzing(true);
    try {
      const result = await postgresService.analyzeDocument(file, patientId, 'lab_result');
      if (result.success && result.data) {
        setDocuments(prev => [result.data, ...prev]);
        setActiveTab('documents');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle CDS decision
  const handleCDSDecision = async (
    recommendationId: string,
    decision: 'accepted' | 'rejected' | 'modified',
    notes?: string
  ) => {
    try {
      await postgresService.logCDSDecision(recommendationId, decision, notes);
      setCdsRecommendations(prev =>
        prev.map(r =>
          r.id === recommendationId
            ? { ...r, doctorDecision: decision, doctorNotes: notes }
            : r
        )
      );
    } catch (err) {
      console.error('Failed to log CDS decision:', err);
    }
  };

  // Quick prompts
  const quickPrompts = [
    { label: 'สรุปประวัติผู้ป่วย', prompt: 'สรุปประวัติผู้ป่วยคนนี้โดยย่อ พร้อมประเด็นสำคัญที่ควรระวัง' },
    { label: 'แนะนำการวินิจฉัย', prompt: 'จากอาการที่ผู้ป่วยบอก ช่วยแนะนำ differential diagnosis' },
    { label: 'ตรวจ Drug Interaction', prompt: 'ตรวจสอบ drug interaction และ dose adjustment สำหรับผู้ป่วยคนนี้' },
    { label: 'สร้างคำแนะนำผู้ป่วย', prompt: 'ช่วยร่างคำแนะนำการปฏิบัติตัวสำหรับผู้ป่วยหลังพบแพทย์' },
  ];

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
        <div className="flex items-center gap-2 text-white">
          <SparklesIcon />
          <span className="font-semibold">AI Clinical Assistant</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Phase 1</span>
        </div>
        {patientId && (
          <span className="text-xs text-white/80">
            Patient: {patientId}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'chat' as TabType, label: 'Chat', icon: '💬' },
          { id: 'summary' as TabType, label: 'สรุปก่อนพบ', icon: '📋' },
          { id: 'documents' as TabType, label: 'วิเคราะห์เอกสาร', icon: '📄' },
          { id: 'cds' as TabType, label: 'CDS', icon: '⚠️', count: cdsRecommendations.filter(r => !r.doctorDecision).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
            {Boolean(tab.count && tab.count > 0) && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2 p-3 border-b bg-gray-50">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(prompt.prompt)}
                  className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  {prompt.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <SparklesIcon />
                  <p className="mt-2">ถามคำถามเกี่ยวกับผู้ป่วยหรือขอคำแนะนำทางคลินิก</p>
                  <p className="text-sm mt-1">AI จะช่วยสรุปข้อมูลและให้คำแนะนำตาม Guidelines 2024-2025</p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString('th-TH')}
                    </span>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                      <span className="text-gray-600">กำลังคิด...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 mb-2 p-2 bg-red-50 text-red-600 text-sm rounded">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="ถามคำถาม หรือขอคำแนะนำ..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pre-Consultation Summary Tab */}
        {activeTab === 'summary' && (
          <div className="h-full overflow-y-auto p-4">
            {isSummaryLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : preSummary ? (
              <div className="space-y-4">
                {/* Patient Snapshot */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">ข้อมูลผู้ป่วย</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>ชื่อ: {preSummary.patientSnapshot.nameThai || preSummary.patientSnapshot.name}</div>
                    <div>อายุ: {preSummary.patientSnapshot.age} ปี</div>
                    <div>เพศ: {preSummary.patientSnapshot.gender === 'male' ? 'ชาย' : 'หญิง'}</div>
                    <div>กรุ๊ปเลือด: {preSummary.patientSnapshot.bloodType}</div>
                  </div>
                </div>

                {/* Drug Allergies */}
                {preSummary.patientSnapshot.drugAllergies.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <AlertIcon />
                      แพ้ยา
                    </h3>
                    <ul className="list-disc list-inside text-sm text-red-700">
                      {preSummary.patientSnapshot.drugAllergies.map((allergy, idx) => (
                        <li key={idx}>
                          <strong>{allergy.allergen}</strong>: {allergy.reaction}
                          {allergy.severity === 'life_threatening' && (
                            <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded">อันตราย!</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Alert Flags */}
                {preSummary.aiTriage.alertFlags.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">⚠️ ประเด็นสำคัญ</h3>
                    <ul className="list-disc list-inside text-sm text-yellow-700">
                      {preSummary.aiTriage.alertFlags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Primary Conditions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">โรคประจำตัว</h3>
                  <ul className="list-disc list-inside text-sm">
                    {preSummary.patientSnapshot.primaryConditions.map((condition, idx) => (
                      <li key={idx}>{condition}</li>
                    ))}
                  </ul>
                </div>

                {/* Current Symptoms */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">อาการปัจจุบัน</h3>
                  <div className="flex flex-wrap gap-2">
                    {preSummary.currentSymptoms.map((symptom, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white border rounded text-sm">
                        {symptom}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      preSummary.urgencyLevel === 'high' ? 'bg-red-100 text-red-800' :
                      preSummary.urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      ความเร่งด่วน: {preSummary.urgencyLevel}
                    </span>
                  </div>
                </div>

                {/* AI Suggested Questions */}
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="font-semibold text-indigo-800 mb-2">💡 คำถามที่แนะนำ</h3>
                  <ul className="list-decimal list-inside text-sm text-indigo-700">
                    {preSummary.aiTriage.suggestedQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>

                {/* Lab Trends */}
                {preSummary.labTrends.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">📊 แนวโน้มผล Lab</h3>
                    <div className="space-y-2">
                      {preSummary.labTrends.map((trend, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span>{trend.parameter}</span>
                          <span className={`px-2 py-0.5 rounded ${
                            trend.trend === 'improving' ? 'bg-green-100 text-green-800' :
                            trend.trend === 'worsening' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {trend.trend === 'improving' ? '↑ ดีขึ้น' :
                             trend.trend === 'worsening' ? '↓ แย่ลง' : '→ คงที่'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>ไม่พบข้อมูลผู้ป่วย</p>
                <p className="text-sm">เลือกผู้ป่วยเพื่อดูสรุปก่อนพบแพทย์</p>
              </div>
            )}
          </div>
        )}

        {/* Document Analysis Tab */}
        {activeTab === 'documents' && (
          <div className="h-full overflow-y-auto p-4">
            {/* Upload Button */}
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleDocumentUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing || !patientId}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                    กำลังวิเคราะห์...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <DocumentIcon />
                    อัปโหลดเอกสาร PDF / ผล Lab
                  </span>
                )}
              </button>
            </div>

            {/* Document List */}
            {documents.length > 0 ? (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{doc.filename}</h4>
                      <span className="text-xs text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    
                    {/* Summary */}
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-1">สรุป AI</h5>
                      <p className="text-sm text-gray-600">{doc.summary}</p>
                    </div>

                    {/* Key Findings */}
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-1">ประเด็นสำคัญ</h5>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {doc.keyFindings.map((finding, idx) => (
                          <li key={idx}>{finding}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Abnormal Values */}
                    {doc.abnormalValues && doc.abnormalValues.length > 0 && (
                      <div className="bg-red-50 rounded p-3">
                        <h5 className="text-sm font-medium text-red-700 mb-1">⚠️ ค่าผิดปกติ</h5>
                        <ul className="list-disc list-inside text-sm text-red-600">
                          {doc.abnormalValues.map((val, idx) => (
                            <li key={idx}>{val}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <DocumentIcon />
                <p className="mt-2">ยังไม่มีเอกสารที่วิเคราะห์</p>
                <p className="text-sm">อัปโหลดไฟล์ PDF หรือภาพผล Lab เพื่อให้ AI วิเคราะห์</p>
              </div>
            )}
          </div>
        )}

        {/* CDS Tab */}
        {activeTab === 'cds' && (
          <div className="h-full overflow-y-auto p-4">
            {isCdsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : cdsRecommendations.length > 0 ? (
              <div className="space-y-4">
                {cdsRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`border rounded-lg p-4 ${
                      rec.severity === 'critical' ? 'border-red-300 bg-red-50' :
                      rec.severity === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                      'border-blue-300 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertIcon />
                        <h4 className={`font-semibold ${
                          rec.severity === 'critical' ? 'text-red-800' :
                          rec.severity === 'warning' ? 'text-yellow-800' :
                          'text-blue-800'
                        }`}>
                          {rec.titleThai || rec.title}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        rec.severity === 'critical' ? 'bg-red-600 text-white' :
                        rec.severity === 'warning' ? 'bg-yellow-600 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        {rec.type === 'drug_interaction' ? 'Drug Interaction' :
                         rec.type === 'dose_adjustment' ? 'Dose Adjustment' :
                         rec.type === 'contraindication' ? 'Contraindication' :
                         'Guideline Alert'}
                      </span>
                    </div>

                    <p className="text-sm mb-3">{rec.descriptionThai || rec.description}</p>

                    {rec.guideline && (
                      <div className="text-xs text-gray-600 mb-3">
                        📚 อ้างอิง: {rec.guideline} ({rec.guidelineYear})
                      </div>
                    )}

                    <div className="bg-white/50 rounded p-2 mb-3">
                      <span className="text-sm font-medium">แนะนำ: </span>
                      <span className="text-sm">{rec.suggestedAction}</span>
                    </div>

                    {rec.alternatives && rec.alternatives.length > 0 && (
                      <div className="text-sm text-gray-600 mb-3">
                        ทางเลือกอื่น: {rec.alternatives.join(', ')}
                      </div>
                    )}

                    {/* Decision Buttons */}
                    {!rec.doctorDecision ? (
                      <div className="flex gap-2 pt-2 border-t">
                        <button
                          onClick={() => handleCDSDecision(rec.id, 'accepted')}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          <CheckIcon />
                          ยอมรับ
                        </button>
                        <button
                          onClick={() => {
                            const notes = prompt('หมายเหตุการปรับแต่ง:');
                            if (notes) handleCDSDecision(rec.id, 'modified', notes);
                          }}
                          className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                        >
                          ปรับแต่ง
                        </button>
                        <button
                          onClick={() => {
                            const notes = prompt('เหตุผลที่ปฏิเสธ:');
                            handleCDSDecision(rec.id, 'rejected', notes || undefined);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          <XIcon />
                          ปฏิเสธ
                        </button>
                      </div>
                    ) : (
                      <div className={`mt-2 p-2 rounded text-sm ${
                        rec.doctorDecision === 'accepted' ? 'bg-green-100 text-green-800' :
                        rec.doctorDecision === 'modified' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <strong>
                          {rec.doctorDecision === 'accepted' ? '✓ ยอมรับแล้ว' :
                           rec.doctorDecision === 'modified' ? '⚡ ปรับแต่งแล้ว' :
                           '✗ ปฏิเสธแล้ว'}
                        </strong>
                        {rec.doctorNotes && <span className="ml-2">- {rec.doctorNotes}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <CheckIcon />
                <p className="mt-2">ไม่มีคำแนะนำ CDS ที่รอตรวจสอบ</p>
                <p className="text-sm">ระบบจะแจ้งเตือนเมื่อพบ Drug Interaction หรือต้องปรับ Dose</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIClinicalAssistant;
