/**
 * AI Chat Copilot Component
 * 
 * Real-time AI assistance during consultations:
 * - Clinical suggestions based on symptoms
 * - Drug interaction warnings
 * - Treatment recommendations
 * - Documentation assistance
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  aiCopilot, 
  type CopilotMessage 
} from '../services/aiClinicalCopilot';
import type { PatientRecord } from '../types';

interface AIChatCopilotProps {
  patientInfo?: PatientRecord;
  currentSymptoms?: string[];
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  className?: string;
}

const AIChatCopilot: React.FC<AIChatCopilotProps> = ({
  patientInfo,
  currentSymptoms = [],
  isMinimized = false,
  onToggleMinimize,
  className = ''
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize copilot when patient info changes
  useEffect(() => {
    const initCopilot = async () => {
      try {
        await aiCopilot.initialize({
          patientInfo,
          currentSymptoms,
          appointmentType: 'telemedicine'
        });
        setIsInitialized(true);
        
        // Get initial suggestions if symptoms are provided
        if (currentSymptoms.length > 0) {
          const initialSuggestions = await aiCopilot.getQuickSuggestions(currentSymptoms);
          setSuggestions(initialSuggestions);
        }
      } catch (err: any) {
        console.error('Failed to initialize copilot:', err);
        setError('AI Copilot initialization failed');
      }
    };

    initCopilot();
  }, [patientInfo, currentSymptoms]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiCopilot.chat(userMessage);
      setMessages(aiCopilot.getHistory());
    } catch (err: any) {
      setError(err.message || 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = async (action: string) => {
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiCopilot.chat(action);
      setMessages(aiCopilot.getHistory());
    } catch (err: any) {
      setError(err.message || 'Failed to process action');
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageTypeStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-l-4 border-yellow-400';
      case 'suggestion':
        return 'bg-green-50 border-l-4 border-green-400';
      case 'info':
        return 'bg-blue-50 border-l-4 border-blue-400';
      default:
        return 'bg-gray-50';
    }
  };

  if (isMinimized) {
    return (
      <div 
        className={`fixed bottom-4 right-4 z-50 ${className}`}
        onClick={onToggleMinimize}
      >
        <button className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="font-medium">AI Copilot</span>
          {messages.length > 0 && (
            <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="font-semibold">AI Clinical Copilot</span>
          {!isInitialized && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Initializing...</span>
          )}
        </div>
        {onToggleMinimize && (
          <button 
            onClick={onToggleMinimize}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Patient Context (if available) */}
      {patientInfo && (
        <div className="px-4 py-2 bg-blue-50 border-b text-sm">
          <div className="flex items-center gap-2 text-blue-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">{patientInfo.demographics?.name || 'Patient'}</span>
            {patientInfo.demographics?.age && (
              <span className="text-blue-600">({patientInfo.demographics.age} yrs)</span>
            )}
          </div>
          {currentSymptoms.length > 0 && (
            <div className="mt-1 text-blue-600">
              Symptoms: {currentSymptoms.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Quick Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="text-xs font-medium text-gray-500 mb-2">Quick Suggestions</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(`Tell me more about: ${suggestion}`)}
                className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:bg-blue-50 hover:border-blue-200 transition-colors truncate max-w-[200px]"
                title={suggestion}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-2 border-b bg-white">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickAction('What are the differential diagnoses for these symptoms?')}
            className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            Differential Dx
          </button>
          <button
            onClick={() => handleQuickAction('What tests should I order?')}
            className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            Suggested Tests
          </button>
          <button
            onClick={() => handleQuickAction('Any red flags I should watch for?')}
            className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Red Flags
          </button>
          <button
            onClick={() => handleQuickAction('Suggest treatment options')}
            className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Treatment
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && isInitialized && (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Ask me anything about this consultation</p>
            <p className="text-xs mt-1">I can help with diagnoses, tests, treatments, and more</p>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`${msg.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[85%]`}
          >
            <div 
              className={`rounded-lg px-4 py-2 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : getMessageTypeStyles(msg.type)
              }`}
            >
              {msg.type === 'warning' && msg.role !== 'user' && (
                <div className="flex items-center gap-1 text-yellow-700 text-xs font-medium mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Warning
                </div>
              )}
              <p className={`text-sm whitespace-pre-wrap ${msg.role !== 'user' ? 'text-gray-800' : ''}`}>
                {msg.content}
              </p>
              {msg.metadata?.actionable && msg.role !== 'user' && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Actionable recommendation
                </div>
              )}
            </div>
            <div className={`text-xs text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
              {msg.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about symptoms, tests, treatments..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            rows={1}
            disabled={!isInitialized || isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !isInitialized}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-400 text-center">
          AI suggestions are for reference only. Always use clinical judgment.
        </div>
      </div>
    </div>
  );
};

export default AIChatCopilot;
