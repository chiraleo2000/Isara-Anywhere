/**
 * AI Routes - Phase 1
 * 
 * Endpoints:
 * - POST /api/ai/chat - Chat with AI assistant
 * - POST /api/ai/analyze-document - Analyze PDF/image documents
 * - GET /api/ai/pre-summary/:patientId - Get pre-consultation summary
 * - GET /api/ai/cds/:patientId - Get CDS recommendations
 * - POST /api/ai/cds/decision - Log CDS decision
 * - POST /api/ai/patient-instructions - Generate patient instruction sheet
 * - POST /api/ai/knowledge-base/search - Search knowledge base with RAG
 */

import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Pool } from 'pg';
import multer from 'multer';
import fs from 'node:fs';

// Extend Express Request to include multer file
interface MulterRequest extends Request {
  file?: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  };
}

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Initialize PostgreSQL connection with Cloud Run support
const dbHost = process.env.DB_HOST || 'localhost';
const isCloudSQL = dbHost.startsWith('/cloudsql/');

const poolConfig: any = {
  database: process.env.DB_NAME || 'izara_phase1',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'P@ssw0rd',
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
} else if (isCloudSQL) {
  poolConfig.host = dbHost;
} else {
  poolConfig.host = dbHost;
  poolConfig.port = Number.parseInt(process.env.DB_PORT || '5432', 10);
}

console.log(`[AI Routes] PostgreSQL: host=${poolConfig.host || 'connectionString'}, db=${poolConfig.database}`);

const pool = new Pool(poolConfig);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model: GenerativeModel = genAI.getGenerativeModel({ 
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
});

// Embedding model for RAG
const embeddingModel = genAI.getGenerativeModel({ 
  model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004'
});

/**
 * POST /api/ai/chat
 * Chat with AI assistant with patient context
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, patientId, appointmentId, sessionId, chatHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Get patient context if provided
    let patientContext = '';
    if (patientId) {
      const patientResult = await pool.query(`
        SELECT 
          p.name_thai, p.age, p.gender, p.blood_type,
          phr.chronic_conditions, phr.allergies, phr.current_medications
        FROM users p
        LEFT JOIN phr ON phr.patient_id = p.id
        WHERE p.id = $1
      `, [patientId]);

      if (patientResult.rows.length > 0) {
        const patient = patientResult.rows[0];
        patientContext = `
ข้อมูลผู้ป่วย:
- ชื่อ: ${patient.name_thai}
- อายุ: ${patient.age} ปี
- เพศ: ${patient.gender === 'male' ? 'ชาย' : 'หญิง'}
- กรุ๊ปเลือด: ${patient.blood_type}
- โรคประจำตัว: ${JSON.stringify(patient.chronic_conditions || [])}
- แพ้ยา: ${JSON.stringify(patient.allergies || [])}
- ยาที่ใช้ปัจจุบัน: ${JSON.stringify(patient.current_medications || [])}
`;
      }
    }

    // Search knowledge base for relevant context (RAG)
    let ragContext = '';
    try {
      const embeddingResult = await embeddingModel.embedContent(message);
      const embedding = embeddingResult.embedding.values;

      const ragResult = await pool.query(`
        SELECT title, content, source, relevance_score
        FROM (
          SELECT 
            title, content, source,
            1 - (embedding <=> $1::vector) as relevance_score
          FROM knowledge_base
          WHERE is_active = true
          ORDER BY embedding <=> $1::vector
          LIMIT 3
        ) ranked
        WHERE relevance_score > 0.7
      `, [`[${embedding.join(',')}]`]);

      if (ragResult.rows.length > 0) {
        ragContext = '\n\nข้อมูลอ้างอิงจาก Guidelines:\n' + 
          ragResult.rows.map(r => `- ${r.title} (${r.source}): ${r.content.substring(0, 500)}...`).join('\n');
      }
    } catch (ragError) {
      console.warn('RAG search failed, continuing without context:', ragError);
    }

    // Format chat history
    const historyText = chatHistory
      .slice(-5)
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
      .join('\n');

    // Build prompt
    const systemPrompt = `คุณเป็น AI Clinical Assistant สำหรับแพทย์ในระบบ Telemedicine ของประเทศไทย
คุณมีความรู้ทางการแพทย์ที่อัพเดตตาม Guidelines 2024-2025 
ให้คำแนะนำเป็นภาษาไทย กระชับ ชัดเจน และมีประโยชน์ในทางคลินิก

${patientContext}
${ragContext}

${historyText ? `\nประวัติการสนทนา:\n${historyText}` : ''}

คำถามจากแพทย์: ${message}

กรุณาตอบในฐานะ AI ที่ช่วยเหลือแพทย์ โดยอ้างอิง Guidelines ถ้ามี:`;

    // Generate response
    const result = await model.generateContent(systemPrompt);
    const response = result.response.text();

    // Save to chat history
    const userId = req.headers['x-user-id'] as string || 'system';
    await pool.query(`
      INSERT INTO ai_chat_history (user_id, session_id, role, content, context, created_at)
      VALUES ($1, $2, 'user', $3, $4, NOW()),
             ($1, $2, 'assistant', $5, $4, NOW())
    `, [userId, sessionId, message, JSON.stringify({ patientId, appointmentId }), response]);

    res.json({ success: true, response });

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/analyze-document
 * Analyze PDF or image document
 */
router.post('/analyze-document', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    const file = req.file;
    const { patientId, documentType = 'lab_result' } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, error: 'File is required' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(file.path);
    const base64Data = fileBuffer.toString('base64');
    const mimeType = file.mimetype;

    // Prepare prompt based on document type
    let analysisPrompt = '';
    switch (documentType) {
      case 'lab_result':
        analysisPrompt = `วิเคราะห์ผลตรวจทางห้องปฏิบัติการนี้:
1. สรุปค่าที่ผิดปกติทั้งหมด
2. ระบุความรุนแรงของค่าผิดปกติ (เล็กน้อย/ปานกลาง/รุนแรง)
3. แนะนำการดำเนินการต่อ
4. ข้อควรระวังสำหรับผู้ป่วย
ตอบเป็นภาษาไทย ในรูปแบบ JSON ดังนี้:
{
  "summary": "สรุปภาพรวม",
  "keyFindings": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
  "abnormalValues": ["ค่าผิดปกติ 1", "ค่าผิดปกติ 2"],
  "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2"]
}`;
        break;
      case 'prescription':
        analysisPrompt = `วิเคราะห์ใบสั่งยานี้:
1. รายการยาทั้งหมด พร้อมขนาดและวิธีใช้
2. ตรวจสอบ Drug Interaction ที่อาจเกิดขึ้น
3. ข้อควรระวังในการใช้ยา
ตอบเป็นภาษาไทย ในรูปแบบ JSON`;
        break;
      default:
        analysisPrompt = `วิเคราะห์เอกสารทางการแพทย์นี้:
1. สรุปเนื้อหาสำคัญ
2. ประเด็นที่ต้องติดตาม
3. คำแนะนำสำหรับแพทย์
ตอบเป็นภาษาไทย ในรูปแบบ JSON`;
    }

    // Call Gemini Vision
    const result = await model.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    let analysis;
    try {
      const responseText = result.response.text();
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = { summary: responseText, keyFindings: [], abnormalValues: [] };
      }
    } catch {
      analysis = { summary: result.response.text(), keyFindings: [], abnormalValues: [] };
    }

    // Save analysis to database
    const insertResult = await pool.query(`
      INSERT INTO ai_document_analysis 
        (patient_id, document_type, filename, file_path, mime_type, summary, key_findings, abnormal_values, raw_analysis, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id
    `, [
      patientId,
      documentType,
      file.originalname,
      file.path,
      mimeType,
      analysis.summary,
      JSON.stringify(analysis.keyFindings || []),
      JSON.stringify(analysis.abnormalValues || []),
      JSON.stringify(analysis),
    ]);

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.json({
      success: true,
      data: {
        id: insertResult.rows[0].id,
        filename: file.originalname,
        documentType,
        ...analysis,
        createdAt: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Document Analysis Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/pre-summary/:patientId
 * Get pre-consultation summary for a patient
 */
router.get('/pre-summary/:patientId', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { appointmentId } = req.query;

    // Get patient data
    const patientResult = await pool.query(`
      SELECT 
        u.id, u.name, u.name_thai, u.email, u.age, u.gender, u.blood_type,
        phr.allergies, phr.chronic_conditions, phr.current_medications, phr.emergency_contact
      FROM users u
      LEFT JOIN phr ON phr.patient_id = u.id
      WHERE u.id = $1
    `, [patientId]);

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const patient = patientResult.rows[0];

    // Get recent vital signs
    const vitalsResult = await pool.query(`
      SELECT * FROM vital_signs 
      WHERE patient_id = $1 
      ORDER BY recorded_at DESC 
      LIMIT 5
    `, [patientId]);

    // Get recent lab results
    const labsResult = await pool.query(`
      SELECT * FROM ai_document_analysis 
      WHERE patient_id = $1 AND document_type = 'lab_result'
      ORDER BY created_at DESC 
      LIMIT 3
    `, [patientId]);

    // Get appointment reason if available
    let appointmentReason = '';
    let currentSymptoms: string[] = [];
    if (appointmentId) {
      const appointmentResult = await pool.query(`
        SELECT reason, symptoms, pre_consultation_notes 
        FROM appointments 
        WHERE id = $1
      `, [appointmentId]);
      if (appointmentResult.rows.length > 0) {
        appointmentReason = appointmentResult.rows[0].reason;
        currentSymptoms = appointmentResult.rows[0].symptoms || [];
      }
    }

    // Generate AI triage
    const allergies = patient.allergies || [];
    const chronicConditions = patient.chronic_conditions || [];
    const medications = patient.current_medications || [];

    // Build alert flags
    const alertFlags: string[] = [];
    
    // Check for drug allergies with life-threatening severity
    const lifeThreateningAllergies = allergies.filter((a: any) => a.severity === 'life_threatening');
    if (lifeThreateningAllergies.length > 0) {
      alertFlags.push(`⚠️ แพ้ยารุนแรง: ${lifeThreateningAllergies.map((a: any) => a.allergen).join(', ')}`);
    }

    // Check for complex conditions
    if (chronicConditions.some((c: any) => c.condition?.toLowerCase().includes('ckd') || c.condition?.toLowerCase().includes('โรคไต'))) {
      alertFlags.push('🔴 ผู้ป่วยโรคไตเรื้อรัง - ระวังการปรับขนาดยา');
    }

    if (chronicConditions.some((c: any) => c.condition?.toLowerCase().includes('diabetes') || c.condition?.toLowerCase().includes('เบาหวาน'))) {
      alertFlags.push('🔵 ผู้ป่วยเบาหวาน - ตรวจสอบ HbA1c และ kidney function');
    }

    // Generate suggested questions using AI
    const suggestedQuestions = await generateSuggestedQuestions(
      appointmentReason,
      currentSymptoms,
      chronicConditions,
      medications
    );

    // Calculate urgency level
    let urgencyLevel: 'low' | 'medium' | 'high' = 'low';
    if (alertFlags.length > 2) urgencyLevel = 'high';
    else if (alertFlags.length > 0) urgencyLevel = 'medium';

    // Build lab trends
    const labTrends = buildLabTrends(labsResult.rows);

    const preSummary = {
      patientSnapshot: {
        name: patient.name,
        nameThai: patient.name_thai,
        age: patient.age,
        gender: patient.gender,
        bloodType: patient.blood_type,
        drugAllergies: allergies,
        primaryConditions: chronicConditions.map((c: any) => c.conditionThai || c.condition),
      },
      currentSymptoms,
      appointmentReason,
      urgencyLevel,
      recentVitals: vitalsResult.rows[0] || null,
      labTrends,
      aiTriage: {
        alertFlags,
        suggestedQuestions,
      },
    };

    res.json({ success: true, data: preSummary });

  } catch (error: any) {
    console.error('Pre-Summary Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/cds/:patientId
 * Get CDS recommendations for a patient
 */
router.get('/cds/:patientId', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Get patient data
    const patientResult = await pool.query(`
      SELECT 
        phr.allergies, phr.chronic_conditions, phr.current_medications,
        phr.clinical_decision_support
      FROM phr
      WHERE patient_id = $1
    `, [patientId]);

    if (patientResult.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const phr = patientResult.rows[0];
    const recommendations: any[] = [];

    // Check for stored CDS alerts
    if (phr.clinical_decision_support?.alerts) {
      for (const alert of phr.clinical_decision_support.alerts) {
        recommendations.push({
          id: `cds-${alert.drugName}-${Date.now()}`,
          type: alert.type,
          severity: alert.severity === 'contraindicated' ? 'critical' : 'warning',
          title: alert.alert,
          titleThai: alert.alertThai,
          description: alert.recommendation,
          descriptionThai: alert.recommendationThai,
          suggestedAction: alert.suggestedAction,
          alternatives: alert.alternatives,
          guideline: phr.clinical_decision_support.guidelines?.[0]?.name,
          guidelineYear: phr.clinical_decision_support.guidelines?.[0]?.year,
        });
      }
    }

    // Check for drug interactions
    const medications = phr.current_medications || [];
    const interactions = await checkDrugInteractions(medications);
    recommendations.push(...interactions);

    // Check for dose adjustments based on kidney function
    const doseAdjustments = await checkDoseAdjustments(medications, phr.chronic_conditions);
    recommendations.push(...doseAdjustments);

    // Get existing decisions from CDS logs
    const existingDecisions = await pool.query(`
      SELECT recommendation_id, doctor_decision, doctor_notes
      FROM cds_logs
      WHERE patient_id = $1
    `, [patientId]);

    const decisionsMap = new Map(
      existingDecisions.rows.map(d => [d.recommendation_id, d])
    );

    // Merge decisions with recommendations
    const mergedRecommendations = recommendations.map(rec => ({
      ...rec,
      doctorDecision: decisionsMap.get(rec.id)?.doctor_decision,
      doctorNotes: decisionsMap.get(rec.id)?.doctor_notes,
    }));

    res.json({ success: true, data: mergedRecommendations });

  } catch (error: any) {
    console.error('CDS Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/cds/decision
 * Log a CDS decision (Man-in-the-Loop)
 */
router.post('/cds/decision', async (req: Request, res: Response) => {
  try {
    const { recommendationId, decision, notes, patientId, doctorId } = req.body;

    if (!recommendationId || !decision) {
      return res.status(400).json({ 
        success: false, 
        error: 'recommendationId and decision are required' 
      });
    }

    await pool.query(`
      INSERT INTO cds_logs 
        (patient_id, doctor_id, recommendation_id, doctor_decision, doctor_notes, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (recommendation_id) 
      DO UPDATE SET 
        doctor_decision = $4,
        doctor_notes = $5,
        updated_at = NOW()
    `, [patientId, doctorId, recommendationId, decision, notes]);

    res.json({ success: true });

  } catch (error: any) {
    console.error('CDS Decision Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/patient-instructions
 * Generate patient instruction sheet
 */
router.post('/patient-instructions', async (req: Request, res: Response) => {
  try {
    const { patientId, appointmentId, diagnosis, prescriptions, lifestyle, followUp, language = 'th' } = req.body;

    // Get patient data
    const patientResult = await pool.query(`
      SELECT name, name_thai, age, gender FROM users WHERE id = $1
    `, [patientId]);

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const patient = patientResult.rows[0];

    // Generate instruction sheet using AI
    const prompt = `สร้างใบคำแนะนำสำหรับผู้ป่วยหลังพบแพทย์:

ข้อมูลผู้ป่วย:
- ชื่อ: ${patient.name_thai || patient.name}
- อายุ: ${patient.age} ปี

การวินิจฉัย: ${diagnosis}

ยาที่ได้รับ:
${prescriptions?.map((p: any) => `- ${p.nameThai || p.name}: ${p.dosage}, ${p.frequency}, ${p.duration}`).join('\n') || 'ไม่มี'}

คำแนะนำการปฏิบัติตัว:
${lifestyle || 'ตามแพทย์แนะนำ'}

นัดติดตาม: ${followUp || 'ตามที่แพทย์นัดหมาย'}

กรุณาสร้างใบคำแนะนำเป็นภาษาไทย ที่เข้าใจง่าย เหมาะสำหรับผู้ป่วยทั่วไป โดยมีหัวข้อ:
1. สรุปผลการตรวจ
2. ยาที่ได้รับและวิธีรับประทาน
3. ข้อควรปฏิบัติ
4. อาการที่ต้องมาพบแพทย์ก่อนนัด
5. วันนัดติดตาม

ตอบในรูปแบบ JSON:
{
  "summary": "สรุปผลการตรวจ",
  "medications": [{"name": "ชื่อยา", "instructions": "วิธีใช้", "warnings": "ข้อควรระวัง"}],
  "lifestyle": ["คำแนะนำ 1", "คำแนะนำ 2"],
  "warningSymptoms": ["อาการ 1", "อาการ 2"],
  "followUp": "วันนัดและข้อมูลการติดตาม"
}`;

    const result = await model.generateContent(prompt);
    let instructions;
    
    try {
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        instructions = JSON.parse(jsonMatch[0]);
      } else {
        instructions = { summary: responseText };
      }
    } catch {
      instructions = { summary: result.response.text() };
    }

    // Save to database
    await pool.query(`
      INSERT INTO patient_instructions 
        (patient_id, appointment_id, diagnosis, instructions, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [patientId, appointmentId, diagnosis, JSON.stringify(instructions)]);

    res.json({
      success: true,
      data: {
        patientName: patient.name_thai || patient.name,
        date: new Date().toLocaleDateString('th-TH'),
        ...instructions,
      },
    });

  } catch (error: any) {
    console.error('Patient Instructions Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/knowledge-base/search
 * Search knowledge base using RAG
 */
router.post('/knowledge-base/search', async (req: Request, res: Response) => {
  try {
    const { query, category, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    // Generate embedding for query
    const embeddingResult = await embeddingModel.embedContent(query);
    const embedding = embeddingResult.embedding.values;

    // Search with vector similarity
    let searchQuery = `
      SELECT 
        id, title, content, source, category, guideline_year,
        1 - (embedding <=> $1::vector) as similarity
      FROM knowledge_base
      WHERE is_active = true
    `;
    const params: any[] = [`[${embedding.join(',')}]`];

    if (category) {
      searchQuery += ` AND category = $2`;
      params.push(category);
    }

    searchQuery += `
      ORDER BY embedding <=> $1::vector
      LIMIT $${params.length + 1}
    `;
    params.push(limit);

    const result = await pool.query(searchQuery, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        source: row.source,
        category: row.category,
        guidelineYear: row.guideline_year,
        similarity: Number.parseFloat(row.similarity.toFixed(4)),
      })),
    });

  } catch (error: any) {
    console.error('Knowledge Base Search Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions

async function generateSuggestedQuestions(
  reason: string,
  symptoms: string[],
  conditions: any[],
  medications: any[]
): Promise<string[]> {
  try {
    const prompt = `จากข้อมูลต่อไปนี้ แนะนำคำถามที่แพทย์ควรถามผู้ป่วย (3-5 ข้อ):
- เหตุผลนัด: ${reason || 'ไม่ระบุ'}
- อาการ: ${symptoms.join(', ') || 'ไม่ระบุ'}
- โรคประจำตัว: ${conditions.map((c: any) => c.condition || c).join(', ') || 'ไม่มี'}
- ยาที่ใช้: ${medications.map((m: any) => m.name || m).join(', ') || 'ไม่มี'}

ตอบเป็น JSON array: ["คำถาม 1", "คำถาม 2", ...]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [
      'อาการเป็นมานานเท่าไหร่?',
      'มีอาการอื่นร่วมด้วยไหม?',
      'ได้ทานยาอะไรมาบ้าง?',
    ];
  } catch {
    return [
      'อาการเป็นมานานเท่าไหร่?',
      'มีอาการอื่นร่วมด้วยไหม?',
      'ได้ทานยาอะไรมาบ้าง?',
    ];
  }
}

async function checkDrugInteractions(medications: any[]): Promise<any[]> {
  // This would typically call a drug interaction database
  // For now, returning placeholder logic
  const interactions: any[] = [];
  
  // Example: Check for common interactions
  const drugNames = medications.map(m => (m.name || m).toLowerCase());
  
  if (drugNames.includes('warfarin') && drugNames.some(d => d.includes('nsaid'))) {
    interactions.push({
      id: `interaction-warfarin-nsaid-${Date.now()}`,
      type: 'drug_interaction',
      severity: 'critical',
      title: 'Warfarin + NSAID Interaction',
      titleThai: 'Warfarin กับ NSAID ห้ามใช้ร่วมกัน',
      description: 'Increased risk of bleeding',
      descriptionThai: 'เพิ่มความเสี่ยงเลือดออก',
      suggestedAction: 'หลีกเลี่ยงการใช้ NSAID หรือเลือกยาแก้ปวดอื่น',
      alternatives: ['Paracetamol', 'Tramadol'],
    });
  }

  return interactions;
}

async function checkDoseAdjustments(medications: any[], conditions: any[]): Promise<any[]> {
  const adjustments: any[] = [];
  
  // Check for CKD requiring dose adjustments
  const hasCKD = conditions.some((c: any) => 
    (c.condition || '').toLowerCase().includes('ckd') || 
    (c.condition || '').toLowerCase().includes('chronic kidney')
  );

  if (hasCKD) {
    for (const med of medications) {
      const drugName = (med.name || med).toLowerCase();
      
      // Drugs requiring renal dose adjustment
      const renalAdjustDrugs = ['metformin', 'gabapentin', 'pregabalin', 'acyclovir'];
      
      if (renalAdjustDrugs.some(d => drugName.includes(d))) {
        adjustments.push({
          id: `dose-adjust-${drugName}-${Date.now()}`,
          type: 'dose_adjustment',
          severity: 'warning',
          title: `${med.name || med} Dose Adjustment Required`,
          titleThai: `ต้องปรับขนาด ${med.nameThai || med.name || med}`,
          description: 'Dose adjustment required for renal impairment',
          descriptionThai: 'ต้องปรับขนาดยาตามค่าการทำงานของไต',
          suggestedAction: 'ตรวจสอบ eGFR และปรับขนาดยาตาม Guideline',
          guideline: 'KDIGO 2024',
          guidelineYear: '2024',
        });
      }
    }
  }

  return adjustments;
}

function buildLabTrends(labResults: any[]): any[] {
  // Build trends from recent lab results
  const trends: any[] = [];
  
  if (labResults.length >= 2) {
    // This would compare values over time
    // Placeholder implementation
    trends.push(
      { parameter: 'eGFR', trend: 'stable', previousValue: '45', currentValue: '44' },
      { parameter: 'HbA1c', trend: 'improving', previousValue: '7.5', currentValue: '7.2' }
    );
  }

  return trends;
}

export default router;
