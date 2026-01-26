import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Minimize2, Maximize2, Trash2 } from 'lucide-react';
import { aiService } from '../../lib/services';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIHealthChatProps {
  className?: string;
  compact?: boolean;
  userId?: string;
}

export const AIHealthChat: React.FC<AIHealthChatProps> = ({ className = '', compact = true, userId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history from PostgreSQL on mount
  const loadChatHistory = useCallback(async () => {
    if (!userId) {
      setLoadingHistory(false);
      return;
    }
    
    try {
      setHistoryError(null);
      setLoadingHistory(true);
      // Try to get the latest session first
      const sessionsResponse = await aiService.getChatSessions();
      
      if (sessionsResponse.sessions && sessionsResponse.sessions.length > 0) {
        // Load the most recent session
        const latestSession = sessionsResponse.sessions[0];
        const historyResponse = await aiService.getChatHistory(latestSession.session_id);
        
        if (historyResponse.history && historyResponse.history.length > 0) {
          const loadedMessages: Message[] = historyResponse.history.map((msg: any, idx: number) => ({
            id: `loaded_${idx}_${Date.now()}`,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at || Date.now()),
          }));
          setMessages(loadedMessages);
          setSessionId(latestSession.session_id);
          console.log(`[AI Chat] Loaded ${loadedMessages.length} messages from session ${latestSession.session_id}`);
        }
      }
    } catch (error) {
      console.error('[AI Chat] Failed to load history:', error);
      setHistoryError('ไม่สามารถโหลดประวัติการสนทนาได้');
    } finally {
      setLoadingHistory(false);
    }
  }, [userId]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  useEffect(() => {
    // Only scroll within the chat container when messages are added, not on initial render
    if (messages.length > 0 && chatContainerRef.current) {
      // Use scrollTop instead of scrollIntoView to prevent page-level scrolling
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await aiService.chat(userMessage.content, history, sessionId || undefined);

      // Store session ID from response for persistence
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
        console.log('[AI Chat] Session started:', response.sessionId);
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: response.reply || 'ขออภัย ไม่สามารถตอบคำถามได้ในขณะนี้',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      console.error('[AI Chat] Send failed:', e);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('ต้องการล้างประวัติการสนทนาทั้งหมดหรือไม่?')) return;
    
    try {
      await aiService.clearChatHistory(sessionId || undefined);
      setMessages([]);
      setSessionId(null);
      console.log('[AI Chat] History cleared');
    } catch (error) {
      console.error('[AI Chat] Failed to clear history:', error);
    }
  };

  const quickQuestions = [
    'ปวดหัว ควรทำอย่างไร',
    'อาหารดีต่อหัวใจ',
    'วิธีลดความเครียด',
  ];

  let headerStatus = 'ถามคำถามสุขภาพได้เลย';
  if (loadingHistory) {
    headerStatus = 'กำลังโหลด...';
  } else if (messages.length > 0) {
    headerStatus = `${messages.length} ข้อความ`;
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Health Assistant</h3>
            <p className="text-purple-200 text-xs">{headerStatus}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="ล้างประวัติ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {compact && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto p-3 space-y-3 ${compact && !isExpanded ? 'max-h-48' : 'max-h-80'}`}
      >
        {historyError && (
          <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
            {historyError}
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-center py-4">
            <Bot className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-xs mb-3">เริ่มสนทนากับ AI</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-purple-100 hover:text-purple-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-purple-600" />
                </div>
              )}
              <div className={`max-w-[80%] p-2 rounded-xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="whitespace-pre-wrap text-xs">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 text-purple-600" />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-3 h-3 text-purple-600" />
            </div>
            <div className="bg-gray-100 rounded-xl p-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="พิมพ์คำถาม..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
