import { useState, useRef, useEffect, useCallback } from 'react';
import { aiService } from '../../lib/services';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Bot, User, Sparkles, AlertCircle, Plus, MessageSquare, Trash2, Menu, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  session_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export default function AIDoctorPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Load sessions on mount
  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingSessions(true);
      const response = await aiService.getChatSessions();
      if (response.sessions) {
        setSessions(response.sessions);
      }
    } catch (error) {
      console.error('[AI Chat] Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  }, [user]);

  // Load messages for a specific session
  const loadSession = useCallback(async (sessId: string) => {
    try {
      setLoading(true);
      const response = await aiService.getChatHistory(sessId);
      if (response.history) {
        const loadedMessages: Message[] = response.history.map((msg: any, idx: number) => ({
          id: `loaded_${idx}_${Date.now()}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at || Date.now()),
        }));
        setMessages(loadedMessages);
        setSessionId(sessId);
      }
    } catch (error) {
      console.error('[AI Chat] Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start a new chat
  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
  };

  // Delete a session
  const deleteSession = async (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('ต้องการลบการสนทนานี้หรือไม่?')) return;
    
    try {
      await aiService.clearChatHistory(sessId);
      setSessions(prev => prev.filter(s => s.session_id !== sessId));
      if (sessionId === sessId) {
        startNewChat();
      }
    } catch (error) {
      console.error('[AI Chat] Failed to delete session:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'วันนี้';
    if (days === 1) return 'เมื่อวาน';
    if (days < 7) return `${days} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Only scroll chat when new messages are added (not on initial render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Only scroll within the chat container, not the whole page
    if (messages.length > 0 && chatContainerRef.current) {
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

      // Store session ID from response
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
        // Refresh sessions list
        loadSessions();
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: response.reply || 'ขออภัย ไม่สามารถตอบคำถามได้ในขณะนี้',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
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

  const suggestions = [
    'ปวดหัวมาก ควรทำอย่างไร',
    'อาหารที่ดีต่อสุขภาพหัวใจ',
    'วิธีลดความเครียด',
    'การออกกำลังกายสำหรับผู้เริ่มต้น',
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Sidebar - Chat History */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-gray-50 border-r border-gray-200 flex-shrink-0 flex flex-col overflow-hidden`}>
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            สนทนาใหม่
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs text-gray-500 px-2 py-1 font-medium">ประวัติการสนทนา</p>
          
          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              ยังไม่มีประวัติการสนทนา
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  onClick={() => loadSession(session.session_id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left group transition-colors ${
                    sessionId === session.session_id
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {session.title || 'การสนทนา'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(session.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteSession(session.session_id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                    title="ลบการสนทนา"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={sidebarOpen ? 'ซ่อนประวัติ' : 'แสดงประวัติ'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">AI Health Assistant</h1>
            <p className="text-xs text-gray-600">ถามคำถามเกี่ยวกับสุขภาพได้เลย</p>
          </div>
        </div>

        <div className="px-4 py-2 bg-white">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              AI นี้ให้คำแนะนำเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์ กรุณาปรึกษาแพทย์สำหรับปัญหาสุขภาพที่รุนแรง
            </p>
          </div>
        </div>

        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Bot className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">เริ่มสนทนากับ AI Health Assistant</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                return (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-purple-600" />
                      </div>
                    )}
                    <div className={`max-w-[70%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <div className="bg-gray-100 rounded-xl p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="พิมพ์คำถามของคุณ..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
