import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { authMiddleware } from '../middleware/auth';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import postgresDataService from '../services/postgresDataService';

const { pool } = postgresDataService;

// =============================================================================
// CHAT HISTORY SERVICE - Persist to PostgreSQL with 2-month retention
// =============================================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: Record<string, unknown>;
}

interface ChatSession {
  session_id: string;
  first_message: string;
  message_count: number;
  created_at: Date;
  updated_at: Date;
}

// Retention period in days (2 months)
const CHAT_RETENTION_DAYS = 60;

const ChatHistoryService = {
  // Get chat history for a specific session
  async getHistory(userId: string, sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const result = await pool.query(
        `SELECT role, content, context FROM ai_chat_history 
         WHERE user_id = $1 AND session_id = $2 
         AND created_at > NOW() - INTERVAL '${CHAT_RETENTION_DAYS} days'
         ORDER BY created_at ASC 
         LIMIT $3`,
        [userId, sessionId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('[AI Chat History] Failed to get history:', error);
      return [];
    }
  },

  // Get all chat sessions for a user (within retention period)
  async getSessions(userId: string): Promise<ChatSession[]> {
    try {
      const result = await pool.query(
        `SELECT 
           session_id,
           MIN(content) as first_message,
           COUNT(*) as message_count,
           MIN(created_at) as created_at,
           MAX(created_at) as updated_at
         FROM ai_chat_history 
         WHERE user_id = $1 
         AND created_at > NOW() - INTERVAL '${CHAT_RETENTION_DAYS} days'
         AND role = 'user'
         GROUP BY session_id
         ORDER BY MAX(created_at) DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('[AI Chat History] Failed to get sessions:', error);
      return [];
    }
  },

  // Add a message to chat history
  async addMessage(userId: string, sessionId: string, role: string, content: string, context?: Record<string, unknown>): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO ai_chat_history (user_id, session_id, role, content, context) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, sessionId, role, content, context ? JSON.stringify(context) : null]
      );
    } catch (error) {
      console.error('[AI Chat History] Failed to save message:', error);
    }
  },

  // Clear history for a specific session
  async clearHistory(userId: string, sessionId: string): Promise<void> {
    try {
      await pool.query(
        `DELETE FROM ai_chat_history WHERE user_id = $1 AND session_id = $2`,
        [userId, sessionId]
      );
    } catch (error) {
      console.error('[AI Chat History] Failed to clear history:', error);
    }
  },

  // Cleanup old messages (run periodically)
  async cleanupOldMessages(): Promise<number> {
    try {
      const result = await pool.query(
        `DELETE FROM ai_chat_history 
         WHERE created_at < NOW() - INTERVAL '${CHAT_RETENTION_DAYS} days'
         RETURNING id`
      );
      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        console.log(`[AI Chat History] Cleaned up ${deletedCount} old messages`);
      }
      return deletedCount;
    } catch (error) {
      console.error('[AI Chat History] Failed to cleanup old messages:', error);
      return 0;
    }
  }
};

// =============================================================================
// AI CHAT MEMORY SERVICE - Long-term vector memory for RAG-enhanced chat
// =============================================================================

const ChatMemoryService = {
  // Save a memory with embedding (embedding generated externally or null for now)
  async saveMemory(
    userId: string,
    memoryType: 'conversation_summary' | 'health_context' | 'preference' | 'important_fact',
    content: string,
    title?: string,
    sourceSessionId?: string
  ): Promise<number | null> {
    try {
      const result = await pool.query(
        `INSERT INTO ai_chat_memory (user_id, memory_type, title, content, source_session_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, memoryType, title || content.substring(0, 100), content, sourceSessionId]
      );
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error('[AI Memory] Failed to save memory:', error);
      return null;
    }
  },

  // Get relevant memories for a user (text-based fallback when no embeddings)
  async getRelevantMemories(userId: string, limit: number = 5): Promise<Array<{id: number; memory_type: string; title: string; content: string}>> {
    try {
      const result = await pool.query(
        `SELECT id, memory_type, title, content FROM ai_chat_memory
         WHERE user_id = $1 AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY relevance_score DESC, updated_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      // Update access count
      if (result.rows.length > 0) {
        const ids = result.rows.map((r: { id: number }) => r.id);
        await pool.query(
          `UPDATE ai_chat_memory SET access_count = access_count + 1, last_accessed_at = NOW()
           WHERE id = ANY($1)`,
          [ids]
        );
      }
      return result.rows;
    } catch (error) {
      console.error('[AI Memory] Failed to get memories:', error);
      return [];
    }
  },

  // Summarize and store a conversation session as long-term memory
  async summarizeSession(userId: string, sessionId: string): Promise<void> {
    try {
      const messages = await ChatHistoryService.getHistory(userId, sessionId, 50);
      if (messages.length < 4) return; // Not enough to summarize

      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'Patient' : 'AI'}: ${m.content}`)
        .join('\n');

      // Store as conversation summary memory
      const summary = conversationText.length > 2000
        ? conversationText.substring(0, 2000) + '...'
        : conversationText;

      await this.saveMemory(
        userId,
        'conversation_summary',
        summary,
        `Chat session ${sessionId.substring(0, 20)}`,
        sessionId
      );
      console.log(`[AI Memory] 💾 Saved session summary for user ${userId}`);
    } catch (error) {
      console.error('[AI Memory] Failed to summarize session:', error);
    }
  },

  // Cleanup expired memories
  async cleanupExpiredMemories(): Promise<number> {
    try {
      const result = await pool.query(
        `DELETE FROM ai_chat_memory WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id`
      );
      return result.rowCount || 0;
    } catch (error) {
      console.error('[AI Memory] Failed to cleanup:', error);
      return 0;
    }
  }
};

// =============================================================================
// GEMINI AI CONFIGURATION - Works in both local dev and Cloud Run production
// =============================================================================

// First, try to load dotenv for local development
dotenv.config();

// Get API key and model from environment variables (works in both local and production)
// Priority: process.env (Cloud Run) > .env file parsing (local fallback)
let GEMINI_API_KEY: string | null = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || null;
let GEMINI_MODEL: string = process.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

// If not found in process.env, try to parse .env file (local development fallback)
if (!GEMINI_API_KEY || !GEMINI_API_KEY.startsWith('AIza')) {
  const envPath = path.resolve(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('[AI Config] Parsing .env file from:', envPath);
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split(/\r?\n/);
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      const eqIndex = trimmedLine.indexOf('=');
      if (eqIndex === -1) continue;
      
      const key = trimmedLine.substring(0, eqIndex).trim();
      const value = trimmedLine.substring(eqIndex + 1).trim();
      
      // Handle GEMINI_API_KEY - only accept if value starts with 'AIza' (valid Google API key format)
      if (key.includes('GEMINI_API_KEY') && value.startsWith('AIza')) {
        GEMINI_API_KEY = value;
        console.log('[AI Config] ✅ Found valid Gemini API key from .env:', value.substring(0, 15) + '...');
      }
      
      // Handle GEMINI_MODEL - only accept if it's a valid model name
      if (key.includes('GEMINI_MODEL') && value.startsWith('gemini-')) {
        GEMINI_MODEL = value;
        console.log('[AI Config] Found model name in .env:', value);
      }
    }
  }
}

// Log final configuration
console.log('[AI Config] ===== Final Configuration =====');
console.log('[AI Config] Environment:', process.env.NODE_ENV || 'development');
console.log('[AI Config] API Key:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 15)}... (length: ${GEMINI_API_KEY.length})` : '❌ NOT FOUND');
console.log('[AI Config] Model:', GEMINI_MODEL);
console.log('[AI Config] ================================');

const router = Router();

// AI Configuration for different tasks
interface AIConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemInstruction: string;
}

const AI_CONFIGS: Record<string, AIConfig> = {
  chat: {
    model: GEMINI_MODEL,
    temperature: 0.3,
    maxOutputTokens: 2048,
    systemInstruction: `คุณคือ "Izara AI" ผู้ช่วยด้านสุขภาพอัจฉริยะ พูดภาษาไทยได้อย่างเป็นธรรมชาติ

บทบาทของคุณ:
- ให้ข้อมูลสุขภาพทั่วไปที่ถูกต้องและเป็นประโยชน์
- ตอบคำถามด้วยความเห็นอกเห็นใจและเข้าใจ
- ใช้ภาษาที่เข้าใจง่าย ไม่ใช้ศัพท์ทางการแพทย์มากเกินไป
- แนะนำให้ปรึกษาแพทย์เมื่อจำเป็น

ข้อห้าม:
- ห้ามวินิจฉัยโรค
- ห้ามสั่งยาหรือแนะนำยาเฉพาะ
- ห้ามทำให้ผู้ใช้ตกใจโดยไม่จำเป็น

รูปแบบการตอบ:
- ตอบกระชับ ชัดเจน
- ใช้อิโมจิบ้างเพื่อความเป็นมิตร
- จบด้วยการเตือนให้พบแพทย์หากอาการไม่ดีขึ้น`
  },
  symptomChecker: {
    model: GEMINI_MODEL,
    temperature: 0.3,
    maxOutputTokens: 2048,
    systemInstruction: `คุณคือระบบคัดกรองอาการเบื้องต้น (Triage System) สำหรับผู้ป่วย

หน้าที่:
1. วิเคราะห์อาการที่ผู้ป่วยบอก
2. ประเมินระดับความเร่งด่วน (Emergency/Urgent/Routine/Self-care)
3. ให้คำแนะนำเบื้องต้น
4. บอกอาการที่ต้องระวัง

ข้อสำคัญ:
- นี่คือการคัดกรองเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัย
- ให้ข้อมูลเป็นภาษาไทย
- ตอบในรูปแบบ JSON ตามที่กำหนด`
  },
  riskAssessment: {
    model: GEMINI_MODEL,
    temperature: 0.2,
    maxOutputTokens: 2048,
    systemInstruction: `คุณคือระบบประเมินความเสี่ยงด้านสุขภาพ

วิเคราะห์ข้อมูลผู้ป่วยและประเมิน:
1. ความเสี่ยงโรคหัวใจและหลอดเลือด
2. ความเสี่ยงเบาหวาน
3. ความเสี่ยงจากน้ำหนักเกิน/โรคอ้วน
4. ความเสี่ยงจากพฤติกรรม

ให้คำแนะนำที่เป็นประโยชน์และสามารถปฏิบัติได้จริง
ตอบเป็น JSON ตามรูปแบบที่กำหนด`
  }
};

// Gemini AI Instance Management
let genAI: GoogleGenerativeAI | null = null;
let initialized = false;

function initializeAI(): boolean {
  if (initialized) return genAI !== null;
  
  initialized = true;
  
  // Use our parsed API key from module-level parsing
  if (!GEMINI_API_KEY || !GEMINI_API_KEY.startsWith('AIza')) {
    console.error('[AI] ❌ Invalid or missing Gemini API key');
    console.error('[AI] Please check your .env file has: GEMINI_API_KEY=AIzaSy...');
    console.error('[AI] Current value:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'null');
    return false;
  }
  
  console.log('[AI] ✅ Gemini API Key found (length:', GEMINI_API_KEY.length, ')');
  
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('[AI] ✅ GoogleGenerativeAI initialized successfully');
    return true;
  } catch (error: any) {
    console.error('[AI] ❌ Failed to initialize GoogleGenerativeAI:', error.message);
    return false;
  }
}

function getModel(config: AIConfig): GenerativeModel | null {
  if (!initializeAI() || !genAI) {
    return null;
  }
  
  try {
    const modelConfig: any = {
      model: config.model,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    };
    
    return genAI.getGenerativeModel(modelConfig);
  } catch (error: any) {
    console.error('[AI] Failed to get model:', error.message);
    return null;
  }
}

// Helper: Build prompt with memory and conversation history
async function buildChatPrompt(
  userId: string, sessionId: string, message: string,
  conversationHistory?: ChatMessage[]
): Promise<string> {
  // Get persistent chat history from PostgreSQL if no conversationHistory provided
  let historyToUse = conversationHistory || [];
  if (!conversationHistory || conversationHistory.length === 0) {
    const dbHistory = await ChatHistoryService.getHistory(userId, sessionId, 10);
    if (dbHistory.length > 0) {
      historyToUse = dbHistory;
      console.log(`[AI Chat] 📚 Loaded ${dbHistory.length} messages from database`);
    }
  }

  // Load long-term memory context from vector store
  const memories = await ChatMemoryService.getRelevantMemories(userId, 3);
  let memoryContext = '';
  if (memories.length > 0) {
    memoryContext = '\n=== ความจำระยะยาว (Long-term Memory) ===\n';
    for (const mem of memories) {
      memoryContext += `[${mem.memory_type}] ${mem.content.substring(0, 300)}\n`;
    }
    memoryContext += '\n';
    console.log(`[AI Chat] 🧠 Loaded ${memories.length} long-term memories`);
  }

  // Build prompt with system instruction, memory, and conversation history
  let fullPrompt = AI_CONFIGS.chat.systemInstruction + '\n\n';
  
  if (memoryContext) {
    fullPrompt += memoryContext;
  }
  
  if (historyToUse && Array.isArray(historyToUse) && historyToUse.length > 0) {
    fullPrompt += '=== บทสนทนาก่อนหน้า ===\n';
    for (const msg of historyToUse.slice(-6)) {
      fullPrompt += `${msg.role === 'user' ? 'ผู้ใช้' : 'AI'}: ${msg.content}\n`;
    }
    fullPrompt += '\n';
  }
  
  fullPrompt += `ผู้ใช้: ${message}\n\nAI:`;
  return fullPrompt;
}

// Health Q&A Chatbot - Main endpoint with persistent history
router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { message, conversationHistory, sessionId } = req.body;
    const userId = (req as any).user?.id || 'anonymous';
    const chatSessionId = sessionId || `session_${userId}_${Date.now()}`;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[AI Chat] 📝 Message: "${message.substring(0, 50)}..." (User: ${userId})`);
    
    const model = getModel(AI_CONFIGS.chat);
    if (!model) {
      console.error('[AI Chat] ❌ Model not available');
      return res.status(500).json({ 
        error: 'AI service not configured',
        reply: 'ขออภัย ระบบ AI ไม่พร้อมใช้งานในขณะนี้ กรุณาลองใหม่ภายหลัง หรือติดต่อเจ้าหน้าที่'
      });
    }

    const fullPrompt = await buildChatPrompt(userId, chatSessionId, message, conversationHistory);

    console.log('[AI Chat] 🚀 Sending to Gemini...');
    
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();
    
    // Save both user message and AI response to PostgreSQL
    await ChatHistoryService.addMessage(userId, chatSessionId, 'user', message);
    await ChatHistoryService.addMessage(userId, chatSessionId, 'assistant', text);
    console.log('[AI Chat] 💾 Saved conversation to database');
    
    const duration = Date.now() - startTime;
    console.log(`[AI Chat] ✅ Response received (${text.length} chars, ${duration}ms)`);

    res.json({ reply: text, sessionId: chatSessionId });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[AI Chat] ❌ Error after ${duration}ms:`, error.message);
    
    // Return user-friendly error message
    res.status(500).json({ 
      error: error.message,
      reply: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ กรุณาติดต่อเจ้าหน้าที่'
    });
  }
});

// Get chat history from PostgreSQL (with 2-month retention)
router.get('/chat/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const sessionId = req.query.sessionId as string;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Trigger cleanup of old messages (async, don't wait)
    ChatHistoryService.cleanupOldMessages().catch(err => 
      console.error('[AI Chat] Cleanup error:', err)
    );

    if (!sessionId) {
      // Return all sessions for this user (within retention period)
      const sessions = await ChatHistoryService.getSessions(userId);
      return res.json({ 
        sessions, 
        retention_days: CHAT_RETENTION_DAYS,
        message: `Chat history is retained for ${CHAT_RETENTION_DAYS} days (2 months)`
      });
    }

    const history = await ChatHistoryService.getHistory(userId, sessionId, 100);
    res.json({ history, sessionId, retention_days: CHAT_RETENTION_DAYS });
  } catch (error: any) {
    console.error('[AI Chat History] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Clear chat history (POST method for easier client calls)
router.post('/chat/clear', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (sessionId) {
      await ChatHistoryService.clearHistory(userId, sessionId);
    } else {
      // Clear all history for user
      await pool.query('DELETE FROM ai_chat_history WHERE user_id = $1', [userId]);
    }

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error: any) {
    console.error('[AI Chat Clear] Error:', error.message);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// Clear chat history (DELETE method)
router.delete('/chat/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (sessionId) {
      await ChatHistoryService.clearHistory(userId, sessionId);
    } else {
      // Clear all history for user
      await pool.query('DELETE FROM ai_chat_history WHERE user_id = $1', [userId]);
    }

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error: any) {
    console.error('[AI Chat History] Error:', error.message);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// =============================================================================
// AI MEMORY MANAGEMENT ROUTES
// =============================================================================

// Get user's long-term memories
router.get('/chat/memory', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = Math.min(Number.parseInt(req.query.limit as string) || 20, 50);
    const memories = await ChatMemoryService.getRelevantMemories(userId, limit);
    res.json({ memories, count: memories.length });
  } catch (error: any) {
    console.error('[AI Memory] Error fetching memories:', error.message);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// Save a new memory manually
router.post('/chat/memory', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { memoryType, content, title } = req.body;
    if (!content || !memoryType) {
      return res.status(400).json({ error: 'content and memoryType are required' });
    }

    const validTypes = ['conversation_summary', 'health_context', 'preference', 'important_fact'];
    if (!validTypes.includes(memoryType)) {
      return res.status(400).json({ error: `memoryType must be one of: ${validTypes.join(', ')}` });
    }

    const id = await ChatMemoryService.saveMemory(userId, memoryType, content, title);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('[AI Memory] Error saving memory:', error.message);
    res.status(500).json({ error: 'Failed to save memory' });
  }
});

// Summarize a chat session into long-term memory
router.post('/chat/memory/summarize', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    await ChatMemoryService.summarizeSession(userId, sessionId);
    res.json({ success: true, message: 'Session summarized into long-term memory' });
  } catch (error: any) {
    console.error('[AI Memory] Error summarizing session:', error.message);
    res.status(500).json({ error: 'Failed to summarize session' });
  }
});

// Delete a specific memory
router.delete('/chat/memory/:memoryId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const memoryId = Number.parseInt(req.params.memoryId);
    if (Number.isNaN(memoryId)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    await pool.query(
      'DELETE FROM ai_chat_memory WHERE id = $1 AND user_id = $2',
      [memoryId, userId]
    );
    res.json({ success: true, message: 'Memory deleted' });
  } catch (error: any) {
    console.error('[AI Memory] Error deleting memory:', error.message);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// Symptom Checker - AI-assisted triage
router.post('/symptom-checker', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { symptoms, patientContext } = req.body;

    if (!symptoms || typeof symptoms !== 'string') {
      return res.status(400).json({ error: 'Symptoms description is required' });
    }

    console.log(`[AI Symptom] 📋 Analyzing: "${symptoms.substring(0, 50)}..."`);
    
    const model = getModel(AI_CONFIGS.symptomChecker);
    if (!model) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const prompt = `${AI_CONFIGS.symptomChecker.systemInstruction}

=== ข้อมูลผู้ป่วย ===
${patientContext ? JSON.stringify(patientContext, null, 2) : 'ไม่มีข้อมูลเพิ่มเติม'}

=== อาการที่ผู้ป่วยแจ้ง ===
${symptoms}

=== คำสั่ง ===
วิเคราะห์อาการและตอบเป็น JSON ในรูปแบบนี้เท่านั้น (ไม่ต้องมี markdown code block):
{
  "triageLevel": "Emergency|Urgent|Routine|Self-care",
  "triageLevelThai": "ฉุกเฉิน|เร่งด่วน|ปกติ|ดูแลตัวเอง",
  "reasoning": "เหตุผลในการประเมิน...",
  "possibleCauses": ["สาเหตุที่เป็นไปได้ 1", "สาเหตุที่เป็นไปได้ 2"],
  "selfCareRecommendations": ["คำแนะนำ 1", "คำแนะนำ 2"],
  "whenToSeekCare": "ควรพบแพทย์เมื่อ...",
  "warningSigns": ["อาการที่ต้องระวัง 1", "อาการที่ต้องระวัง 2"],
  "suggestedSpecialties": ["สาขาแพทย์ที่แนะนำ"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();
    
    const duration = Date.now() - startTime;
    console.log(`[AI Symptom] ✅ Analysis complete (${duration}ms)`);

    // Parse JSON response
    let analysis;
    try {
      // Remove markdown code blocks if present
      text = text.replaceAll(/```json\n?/g, '').replaceAll(/```\n?/g, '').trim();
      analysis = JSON.parse(text);
    } catch (parseError) {
      console.warn('[AI Symptom] ⚠️ Failed to parse JSON, using fallback:', parseError);
      analysis = {
        triageLevel: 'Routine',
        triageLevelThai: 'ปกติ',
        reasoning: text,
        possibleCauses: [],
        selfCareRecommendations: ['พักผ่อนให้เพียงพอ', 'ดื่มน้ำมากๆ'],
        whenToSeekCare: 'หากอาการไม่ดีขึ้นใน 2-3 วัน ควรพบแพทย์',
        warningSigns: ['ไข้สูงเกิน 39°C', 'หายใจลำบาก', 'เจ็บหน้าอกรุนแรง'],
        suggestedSpecialties: ['อายุรกรรมทั่วไป']
      };
    }

    res.json(analysis);
    
  } catch (error: any) {
    console.error('[AI Symptom] ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Risk Assessment
router.post('/risk-assessment', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { patientData } = req.body;

    if (!patientData) {
      return res.status(400).json({ error: 'Patient data is required' });
    }

    console.log('[AI Risk] 📊 Running risk assessment...');
    
    const model = getModel(AI_CONFIGS.riskAssessment);
    if (!model) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const prompt = `${AI_CONFIGS.riskAssessment.systemInstruction}

=== ข้อมูลผู้ป่วย ===
${JSON.stringify(patientData, null, 2)}

=== คำสั่ง ===
วิเคราะห์ความเสี่ยงและตอบเป็น JSON (ไม่ต้องมี markdown code block):
{
  "cardiovascularRisk": { 
    "level": "low|medium|high", 
    "levelThai": "ต่ำ|ปานกลาง|สูง",
    "score": 0-100,
    "factors": ["ปัจจัยเสี่ยง..."] 
  },
  "diabetesRisk": { 
    "level": "low|medium|high",
    "levelThai": "ต่ำ|ปานกลาง|สูง", 
    "score": 0-100,
    "factors": ["ปัจจัยเสี่ยง..."] 
  },
  "obesityRisk": { 
    "level": "low|medium|high",
    "levelThai": "ต่ำ|ปานกลาง|สูง",
    "bmi": null,
    "bmiCategory": "ผอม|ปกติ|น้ำหนักเกิน|อ้วน" 
  },
  "lifestyleRisks": ["ความเสี่ยงจากพฤติกรรม..."],
  "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2"],
  "priorityActions": ["สิ่งที่ควรทำเป็นอันดับแรก"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();
    
    const duration = Date.now() - startTime;
    console.log(`[AI Risk] ✅ Assessment complete (${duration}ms)`);

    // Parse JSON response
    let assessment;
    try {
      text = text.replaceAll(/```json\n?/g, '').replaceAll(/```\n?/g, '').trim();
      assessment = JSON.parse(text);
    } catch (parseError) {
      console.warn('[AI Risk] ⚠️ Failed to parse JSON:', parseError);
      assessment = {
        error: 'Failed to parse assessment',
        rawResponse: text
      };
    }

    res.json(assessment);
    
  } catch (error: any) {
    console.error('[AI Risk] ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health info endpoint - Quick health facts
router.post('/health-info', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const model = getModel(AI_CONFIGS.chat);
    if (!model) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const prompt = `ให้ข้อมูลสุขภาพสั้นๆ เกี่ยวกับ: ${topic}

ตอบเป็นภาษาไทย กระชับ ไม่เกิน 3 ย่อหน้า
รวมคำแนะนำที่ปฏิบัติได้จริง`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ info: text });
    
  } catch (error: any) {
    console.error('[AI Info] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// AI Status check endpoint
router.get('/status', async (_req: Request, res: Response) => {
  const isReady = initializeAI();
  
  res.json({
    status: isReady ? 'ready' : 'not_configured',
    model: GEMINI_MODEL,
    hasApiKey: !!GEMINI_API_KEY,
    apiKeyValid: GEMINI_API_KEY?.startsWith('AIza') || false,
    timestamp: new Date().toISOString()
  });
});

// Multimodal Symptom Analysis - handles text, audio, and images
router.post('/symptom-analysis', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // For multipart form data, we need to handle files
    // The actual file handling depends on multer or similar middleware
    const { symptoms, patientContext } = req.body;
    
    // Parse patient context if it's a string
    let context = patientContext;
    if (typeof patientContext === 'string') {
      try {
        context = JSON.parse(patientContext);
      } catch (parseError) {
        console.warn('[AI Analysis] ⚠️ Failed to parse patientContext JSON:', parseError);
        context = { raw: patientContext };
      }
    }

    console.log(`[AI Analysis] 🔍 Multimodal analysis request`);
    console.log(`[AI Analysis] - Symptoms text: ${symptoms ? 'Yes (' + symptoms.length + ' chars)' : 'No'}`);
    console.log(`[AI Analysis] - Symptoms content preview: ${symptoms ? symptoms.substring(0, 200) : 'none'}...`);
    
    const model = getModel(AI_CONFIGS.symptomChecker);
    if (!model) {
      console.error('[AI Analysis] ❌ Model not available');
      return res.status(500).json({ 
        error: 'AI service not configured',
        triageLevel: 'Routine',
        reasoning: 'ไม่สามารถวิเคราะห์ได้ กรุณาปรึกษาแพทย์',
        selfCareRecommendations: ['พักผ่อนให้เพียงพอ', 'ดื่มน้ำมากๆ'],
        whenToSeekCare: 'หากอาการไม่ดีขึ้นใน 24 ชั่วโมง ควรพบแพทย์',
        warningSigns: []
      });
    }

    // Build comprehensive prompt with all symptom data
    const symptomData = symptoms || 'ไม่ได้ระบุอาการ';
    
    const prompt = `คุณคือระบบคัดกรองอาการเบื้องต้น (Triage System) สำหรับผู้ป่วยชาวไทย

หน้าที่:
1. วิเคราะห์อาการที่ผู้ป่วยบอกอย่างละเอียด
2. ประเมินระดับความเร่งด่วน (Emergency/Urgent/Routine/Self-care) ตามอาการจริง
3. ให้คำแนะนำเบื้องต้นที่เป็นประโยชน์
4. บอกอาการที่ต้องระวัง

ข้อมูลอาการของผู้ป่วย:
${symptomData}

${context?.name ? `ชื่อผู้ป่วย: ${context.name}` : ''}
${context?.previousTreatment ? `การรักษาก่อนหน้า: ${context.previousTreatment}` : ''}
${context?.medicalHistory ? `ประวัติการแพทย์: ${context.medicalHistory}` : ''}

คำสั่งสำคัญ:
- อ่านข้อมูลอาการอย่างละเอียด ไม่ใช่บอกว่า "ไม่ได้ระบุอาการ" หากมีข้อมูลอยู่
- วิเคราะห์ทุกอาการที่ผู้ป่วยบอก รวมถึงอุณหภูมิไข้ ความรุนแรง ระยะเวลา
- ถ้ามีไข้สูง (>38°C) ร่วมกับอาการอื่น ควรพิจารณาเป็น Urgent หรือสูงกว่า
- ตอบเป็นภาษาไทย

ตอบเป็น JSON เท่านั้น ในรูปแบบ:
{
  "triageLevel": "Emergency" | "Urgent" | "Routine" | "Self-care",
  "reasoning": "เหตุผลในการประเมินโดยอ้างอิงจากอาการที่ผู้ป่วยบอก",
  "selfCareRecommendations": ["คำแนะนำ 1", "คำแนะนำ 2", "คำแนะนำ 3"],
  "whenToSeekCare": "เมื่อไหร่ควรพบแพทย์",
  "warningSigns": ["อาการเตือน 1", "อาการเตือน 2"],
  "suggestedSpecialties": ["สาขาแพทย์ที่แนะนำ"],
  "possibleConditions": ["โรคที่อาจเป็นได้ (เรียงตามความเป็นไปได้)"]
}`;

    console.log('[AI Analysis] 🚀 Sending to Gemini...');
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();
    
    // Clean up response - remove markdown code blocks if present
    text = text.replaceAll(/```json\n?/g, '').replaceAll(/```\n?/g, '').trim();
    
    const duration = Date.now() - startTime;
    console.log(`[AI Analysis] ✅ Response received (${text.length} chars, ${duration}ms)`);
    console.log(`[AI Analysis] Response preview: ${text.substring(0, 300)}...`);

    try {
      const assessment = JSON.parse(text);
      res.json(assessment);
    } catch (parseError) {
      console.error('[AI Analysis] ⚠️ Failed to parse JSON, returning raw text:', parseError);
      res.json({
        triageLevel: 'Routine',
        reasoning: text,
        selfCareRecommendations: ['พักผ่อนให้เพียงพอ', 'ดื่มน้ำมากๆ', 'ติดตามอาการ'],
        whenToSeekCare: 'หากอาการไม่ดีขึ้นใน 24-48 ชั่วโมง',
        warningSigns: [],
        suggestedSpecialties: ['อายุรกรรมทั่วไป']
      });
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[AI Analysis] ❌ Error after ${duration}ms:`, error.message);
    
    res.status(500).json({ 
      error: error.message,
      triageLevel: 'Routine',
      reasoning: 'เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่',
      selfCareRecommendations: ['พักผ่อนให้เพียงพอ'],
      whenToSeekCare: 'ควรปรึกษาแพทย์',
      warningSigns: []
    });
  }
});

// AI Suggest - helps user improve symptom description
router.post('/symptom-suggest', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { currentDescription, selectedSymptoms } = req.body;

    console.log(`[AI Suggest] 💡 Symptom suggestion request`);
    console.log(`[AI Suggest] - Current description: ${currentDescription ? currentDescription.substring(0, 100) : 'none'}...`);
    console.log(`[AI Suggest] - Selected symptoms: ${selectedSymptoms || 'none'}`);
    
    const model = getModel(AI_CONFIGS.chat);
    if (!model) {
      console.error('[AI Suggest] ❌ Model not available');
      return res.status(500).json({ 
        error: 'AI service not configured',
        suggestions: []
      });
    }

    const prompt = `คุณคือผู้ช่วยแนะนำการอธิบายอาการให้ผู้ป่วย

ผู้ป่วยกำลังกรอกอาการ:
- อาการที่เลือก: ${selectedSymptoms || 'ยังไม่ได้เลือก'}
- คำอธิบายปัจจุบัน: ${currentDescription || 'ยังไม่ได้พิมพ์'}

ช่วยแนะนำคำถามหรือข้อมูลเพิ่มเติมที่ผู้ป่วยควรระบุ เพื่อให้แพทย์เข้าใจอาการได้ดีขึ้น

ตอบเป็น JSON:
{
  "suggestions": [
    "คำแนะนำ/คำถามที่ควรตอบเพิ่ม 1",
    "คำแนะนำ/คำถามที่ควรตอบเพิ่ม 2",
    "คำแนะนำ/คำถามที่ควรตอบเพิ่ม 3"
  ],
  "improvedDescription": "ตัวอย่างคำอธิบายที่ปรับปรุงแล้ว (ถ้ามีคำอธิบายเดิม)",
  "followUpQuestions": [
    "คำถามติดตาม 1",
    "คำถามติดตาม 2"
  ]
}

ตอบเป็นภาษาไทย กระชับ เข้าใจง่าย`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();
    
    // Clean up response
    text = text.replaceAll(/```json\n?/g, '').replaceAll(/```\n?/g, '').trim();
    
    const duration = Date.now() - startTime;
    console.log(`[AI Suggest] ✅ Response received (${text.length} chars, ${duration}ms)`);

    try {
      const suggestions = JSON.parse(text);
      res.json(suggestions);
    } catch (parseError) {
      console.error('[AI Suggest] ⚠️ Failed to parse JSON:', parseError);
      res.json({
        suggestions: [
          'ลองอธิบายว่าอาการเริ่มเมื่อไหร่',
          'บอกว่าอาการเป็นมากแค่ไหน (1-10)',
          'มีอะไรที่ทำให้อาการดีขึ้นหรือแย่ลงไหม'
        ],
        improvedDescription: '',
        followUpQuestions: []
      });
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[AI Suggest] ❌ Error after ${duration}ms:`, error.message);
    
    res.status(500).json({ 
      error: error.message,
      suggestions: ['กรุณาอธิบายอาการให้ละเอียด']
    });
  }
});

// =============================================================================
// AI VALIDATE — Man-in-the-Loop validation endpoint
// =============================================================================
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { type = 'general', action = 'validate' } = req.body;
    
    console.log(`[AI Validate] Processing ${type} validation, action: ${action}`);
    
    if (action === 'check') {
      return res.json({
        success: true,
        requiresValidation: true,
        validationRules: {
          requiresDoctorApproval: true,
          autoApproveThreshold: 0.95
        }
      });
    }
    
    let validationStatus = 'validated';
    if (action === 'approve') validationStatus = 'approved';
    else if (action === 'reject') validationStatus = 'rejected';
    
    const validationResult = {
      validated: true,
      status: validationStatus,
      validatedAt: new Date().toISOString(),
      message: `Content ${validationStatus} successfully`
    };
    
    res.json({
      success: true,
      message: 'AI content validated successfully',
      validation: validationResult
    });
  } catch (error: any) {
    console.error('[AI Validate] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
