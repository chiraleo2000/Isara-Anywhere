import { useState, useRef, useEffect, useCallback } from 'react';
import { aiService } from '../lib/services';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
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
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  last_message_at?: string;
  message_count?: number;
}

/* ---- Extracted sub-components to reduce cognitive complexity ---- */

interface SessionListContentProps {
  readonly loadingSessions: boolean;
  readonly sessions: ChatSession[];
  readonly sessionId: string | null;
  readonly language: 'th' | 'en';
  readonly isDark: boolean;
  readonly labels: Record<string, Record<string, string>>;
  readonly formatDate: (dateStr: string) => string;
  readonly loadSession: (sessId: string) => void;
  readonly deleteSession: (sessId: string, e: React.MouseEvent) => void;
  readonly getSessionButtonClass: (isActive: boolean) => string;
}

function SessionListContent({
  loadingSessions, sessions, sessionId, language, isDark, labels,
  formatDate, loadSession, deleteSession, getSessionButtonClass,
}: SessionListContentProps) {
  if (loadingSessions) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div className={`text-center py-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        {labels.noHistory[language]}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {sessions.map((session) => (
        <button
          key={session.session_id}
          onClick={() => loadSession(session.session_id)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left group transition-colors ${getSessionButtonClass(sessionId === session.session_id)}`}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">
              {session.title || labels.conversation[language]}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {formatDate(session.created_at || session.started_at || '')}
            </p>
          </div>
          <button
            onClick={(e) => deleteSession(session.session_id, e)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
            title={labels.deleteChat[language]}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </button>
      ))}
    </div>
  );
}

interface ChatMessageListProps {
  readonly messages: Message[];
  readonly suggestions: string[];
  readonly isDark: boolean;
  readonly labels: Record<string, Record<string, string>>;
  readonly language: 'th' | 'en';
  readonly loading: boolean;
  readonly setInput: (val: string) => void;
  readonly getMessageBubbleClass: (role: string) => string;
  readonly chatContainerRef: React.RefObject<HTMLDivElement>;
  readonly messagesEndRef: React.RefObject<HTMLDivElement>;
}

function ChatMessageList({
  messages, suggestions, isDark, labels, language, loading,
  setInput, getMessageBubbleClass, chatContainerRef, messagesEndRef,
}: ChatMessageListProps) {
  return (
    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <Bot className={`w-16 h-16 mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{labels.startChat[language]}</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-emerald-900/50 hover:text-emerald-300' : 'bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
            )}
            <div className={`max-w-[70%] p-3 rounded-xl ${getMessageBubbleClass(msg.role)}`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
            )}
          </div>
        ))
      )}
      {loading && (
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-purple-600" />
          </div>
          <div className={`rounded-xl p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
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
  );
}

/** Theme classes for AIDoctorPage — extracted to reduce cognitive complexity */
function getAIDoctorClasses(isDark: boolean) {
  return {
    sidebarBg: isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200',
    chatHeaderBg: isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100',
    chatBg: isDark ? 'bg-gray-900' : 'bg-white',
  };
}

export default function AIDoctorPage() {
  const { user } = useAuth();
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const tc = getAIDoctorClasses(isDark);

  const labels = {
    newChat: { en: 'New Chat', th: 'สนทนาใหม่' },
    chatHistory: { en: 'Chat History', th: 'ประวัติการสนทนา' },
    noHistory: { en: 'No chat history', th: 'ยังไม่มีประวัติการสนทนา' },
    conversation: { en: 'Conversation', th: 'การสนทนา' },
    deleteChat: { en: 'Delete chat', th: 'ลบการสนทนา' },
    deleteConfirm: { en: 'Delete this conversation?', th: 'ต้องการลบการสนทนานี้หรือไม่?' },
    today: { en: 'Today', th: 'วันนี้' },
    yesterday: { en: 'Yesterday', th: 'เมื่อวาน' },
    daysAgo: { en: ' days ago', th: ' วันที่แล้ว' },
    hideHistory: { en: 'Hide history', th: 'ซ่อนประวัติ' },
    showHistory: { en: 'Show history', th: 'แสดงประวัติ' },
    title: { en: 'AI Health Assistant', th: 'AI Health Assistant' },
    subtitle: { en: 'Ask health questions anytime', th: 'ถามคำถามเกี่ยวกับสุขภาพได้เลย' },
    disclaimer: { en: 'This AI provides preliminary advice only, not medical diagnosis. Please consult a doctor for serious health issues.', th: 'AI นี้ให้คำแนะนำเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์ กรุณาปรึกษาแพทย์สำหรับปัญหาสุขภาพที่รุนแรง' },
    startChat: { en: 'Start chatting with AI Health Assistant', th: 'เริ่มสนทนากับ AI Health Assistant' },
    placeholder: { en: 'Type your question...', th: 'พิมพ์คำถามของคุณ...' },
    errorReply: { en: 'Sorry, an error occurred. Please try again.', th: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
    cantAnswer: { en: 'Sorry, I cannot answer that right now.', th: 'ขออภัย ไม่สามารถตอบคำถามได้ในขณะนี้' },
  };
  
  const suggestionsData = {
    en: ['Severe headache, what should I do?', 'Heart-healthy foods', 'Ways to reduce stress', 'Exercise for beginners'],
    th: ['ปวดหัวมาก ควรทำอย่างไร', 'อาหารที่ดีต่อสุขภาพหัวใจ', 'วิธีลดความเครียด', 'การออกกำลังกายสำหรับผู้เริ่มต้น'],
  };
  
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
    if (!confirm(labels.deleteConfirm[language])) return;

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

    if (days === 0) return labels.today[language];
    if (days === 1) return labels.yesterday[language];
    if (days < 7) return `${days}${labels.daysAgo[language]}`;
    return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' });
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
        content: response.reply || labels.cantAnswer[language],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      console.error('[AI Chat] Send failed:', e);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: labels.errorReply[language],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = suggestionsData[language];

  const getSessionButtonClass = (isActive: boolean) => {
    if (isActive) return 'bg-emerald-100 text-emerald-800';
    return isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700';
  };

  const getMessageBubbleClass = (role: string) => {
    if (role === 'user') return 'bg-emerald-600 text-white';
    return isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Sidebar - Chat History */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 flex-shrink-0 flex flex-col overflow-hidden ${tc.sidebarBg} border-r`}>
        <div className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            {labels.newChat[language]}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <p className={`text-xs px-2 py-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{labels.chatHistory[language]}</p>

          <SessionListContent
            loadingSessions={loadingSessions}
            sessions={sessions}
            sessionId={sessionId}
            language={language}
            isDark={isDark}
            labels={labels}
            formatDate={formatDate}
            loadSession={loadSession}
            deleteSession={deleteSession}
            getSessionButtonClass={getSessionButtonClass}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className={`flex items-center gap-3 p-4 border-b ${tc.chatHeaderBg}`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100'}`}
            title={sidebarOpen ? labels.hideHistory[language] : labels.showHistory[language]}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{labels.title[language]}</h1>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{labels.subtitle[language]}</p>
          </div>
        </div>

        <div className={isDark ? 'px-4 py-2 bg-gray-800' : 'px-4 py-2 bg-white'}>
          <div className={`border rounded-xl p-3 flex items-start gap-2 ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              {labels.disclaimer[language]}
            </p>
          </div>
        </div>

        <div className={`flex-1 overflow-hidden flex flex-col ${tc.chatBg}`}>
          <ChatMessageList
            messages={messages}
            suggestions={suggestions}
            isDark={isDark}
            labels={labels}
            language={language}
            loading={loading}
            setInput={setInput}
            getMessageBubbleClass={getMessageBubbleClass}
            chatContainerRef={chatContainerRef}
            messagesEndRef={messagesEndRef}
          />
        </div>

        <div className={`p-4 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100'}`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={labels.placeholder[language]}
              className={`flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200'}`}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={language === 'th' ? 'ส่งข้อความ' : 'Send message'}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
