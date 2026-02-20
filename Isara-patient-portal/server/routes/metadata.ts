import { Router, Request, Response } from 'express';
import { storage, GCS_BUCKETS } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Helper function to read JSON from GCS
async function readJSON(bucket: string, filePath: string): Promise<any> {
  try {
    const file = storage.bucket(bucket).file(filePath);
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (error: any) {
    if (error.code === 404) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

// Get medications database
router.get('/medications', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Read medications from GCS: medications.json
    const medications = await readJSON(GCS_BUCKETS.METADATA, 'medications.json');

    res.json(medications);
  } catch (error: any) {
    // Always return empty array on any GCS error
    console.warn('Get medications - GCS error, returning empty:', error.message);
    return res.json([]);
  }
});

// Search medications
router.get('/medications/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const medications = await readJSON(GCS_BUCKETS.METADATA, 'medications.json');

    // Filter medications by name
    const filtered = medications.filter((med: any) =>
      med.name?.toLowerCase().includes((q as string).toLowerCase()) ||
      med.genericName?.toLowerCase().includes((q as string).toLowerCase())
    );

    res.json(filtered);
  } catch (error: any) {
    console.error('Search medications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get drug interactions
router.get('/drug-interactions', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Read drug interactions from GCS: drug-interactions.json
    const interactions = await readJSON(GCS_BUCKETS.METADATA, 'drug-interactions.json');

    res.json(interactions);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json([]); // Return empty array if no interactions yet
    }
    console.error('Get drug interactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get lab tests catalog
router.get('/lab-tests', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Read lab tests from GCS: lab-tests.json
    const labTests = await readJSON(GCS_BUCKETS.METADATA, 'lab-tests.json');

    res.json(labTests);
  } catch (error: any) {
    // Always return empty array on any GCS error
    console.warn('Get lab tests - GCS error, returning empty:', error.message);
    return res.json([]);
  }
});

// Get reference ranges
router.get('/reference-ranges', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Read reference ranges from GCS: reference-ranges.json
    const ranges = await readJSON(GCS_BUCKETS.METADATA, 'reference-ranges.json');

    res.json(ranges);
  } catch (error: any) {
    // Always return empty object on any GCS error
    console.warn('Get reference ranges - GCS error, returning empty:', error.message);
    return res.json({});
  }
});

// Get ICD-10 codes
router.get('/icd10-codes', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Read ICD-10 codes from GCS: icd10-codes.json
    const codes = await readJSON(GCS_BUCKETS.METADATA, 'icd10-codes.json');

    res.json(codes);
  } catch (error: any) {
    // Always return empty array on any GCS error
    console.warn('Get ICD-10 codes - GCS error, returning empty:', error.message);
    return res.json([]);
  }
});

// Search ICD-10 codes
router.get('/icd10-codes/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const codes = await readJSON(GCS_BUCKETS.METADATA, 'icd10-codes.json');

    // Filter codes by code or description
    const filtered = codes.filter((code: any) =>
      code.code?.toLowerCase().includes((q as string).toLowerCase()) ||
      code.description?.toLowerCase().includes((q as string).toLowerCase())
    );

    res.json(filtered);
  } catch (error: any) {
    console.error('Search ICD-10 codes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specialties
router.get('/specialties', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const specialties = await readJSON(GCS_BUCKETS.METADATA, 'specialties.json');
    res.json(specialties);
  } catch (error: any) {
    // Always return default specialties on any GCS error (not found, auth, network, etc.)
    console.warn('Get specialties - GCS error, returning defaults:', error.message);
    return res.json([
      { id: 'internal', name: 'อายุรกรรม', nameEn: 'Internal Medicine' },
      { id: 'cardiology', name: 'โรคหัวใจ', nameEn: 'Cardiology' },
      { id: 'dermatology', name: 'ผิวหนัง', nameEn: 'Dermatology' },
      { id: 'endocrinology', name: 'ต่อมไร้ท่อ', nameEn: 'Endocrinology' },
      { id: 'gastro', name: 'ทางเดินอาหาร', nameEn: 'Gastroenterology' },
      { id: 'general', name: 'เวชปฏิบัติทั่วไป', nameEn: 'General Practice' },
      { id: 'neuro', name: 'ประสาทวิทยา', nameEn: 'Neurology' },
      { id: 'ortho', name: 'กระดูกและข้อ', nameEn: 'Orthopedics' },
      { id: 'pediatrics', name: 'กุมารเวชศาสตร์', nameEn: 'Pediatrics' },
      { id: 'psychiatry', name: 'จิตเวชศาสตร์', nameEn: 'Psychiatry' },
    ]);
  }
});

// Get health tips
router.get('/health-tips', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const tips = await readJSON(GCS_BUCKETS.METADATA, 'health-tips.json');
    res.json(tips);
  } catch (error: any) {
    // Always return default health tips on any error (GCS null, not found, auth, network, etc.)
    console.warn('Get health tips - returning defaults:', error.message);
    return res.json([
      {
        id: 'tip_001',
        title: 'ดื่มน้ำให้เพียงพอ',
        content: 'ควรดื่มน้ำอย่างน้อย 8 แก้วต่อวัน เพื่อให้ร่างกายทำงานได้อย่างมีประสิทธิภาพ',
        category: 'hydration',
      },
      {
        id: 'tip_002',
        title: 'ออกกำลังกายสม่ำเสมอ',
        content: 'ออกกำลังกายอย่างน้อย 30 นาทีต่อวัน ช่วยเสริมสร้างสุขภาพหัวใจและลดความเครียด',
        category: 'exercise',
      },
      {
        id: 'tip_003',
        title: 'นอนหลับให้เพียงพอ',
        content: 'ผู้ใหญ่ควรนอนหลับ 7-9 ชั่วโมงต่อคืน เพื่อให้ร่างกายได้พักผ่อนอย่างเต็มที่',
        category: 'sleep',
      },
      {
        id: 'tip_004',
        title: 'ตรวจสุขภาพประจำปี',
        content: 'การตรวจสุขภาพประจำปีช่วยตรวจพบปัญหาสุขภาพแต่เนิ่นๆ และรักษาได้ทันท่วงที',
        category: 'checkup',
      },
      {
        id: 'tip_005',
        title: 'ลดอาหารหวานและเค็ม',
        content: 'การลดน้ำตาลและโซเดียมช่วยลดความเสี่ยงโรคเบาหวานและความดันโลหิตสูง',
        category: 'nutrition',
      },
    ]);
  }
});

// Medical content (health education) shared from doctor portal
// Reads from medical-content/articles.json - same path doctor portal writes to
router.get('/medical-content', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const data = await readJSON(GCS_BUCKETS.METADATA, 'medical-content/articles.json');
    const articles = data.articles || data || [];
    const published = Array.isArray(articles)
      ? articles.filter((a: any) => a.status === 'published' || !a.status)
      : [];
    res.json(published);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json([]);
    }
    console.error('Get medical content error:', error);
    res.status(500).json({ error: error.message });
  }
});

// === Convenience aliases for common metadata endpoint names ===

// /api/metadata/symptoms - Alias (return default symptoms list)
router.get('/symptoms', authMiddleware, async (_req: Request, res: Response) => {
  try {
    res.json([
      { id: 'fever', name: 'Fever', nameTh: '\u0e44\u0e02\u0e49' },
      { id: 'headache', name: 'Headache', nameTh: '\u0e1b\u0e27\u0e14\u0e2b\u0e31\u0e27' },
      { id: 'cough', name: 'Cough', nameTh: '\u0e44\u0e2d' },
      { id: 'sore_throat', name: 'Sore Throat', nameTh: '\u0e40\u0e08\u0e47\u0e1a\u0e04\u0e2d' },
      { id: 'fatigue', name: 'Fatigue', nameTh: '\u0e2d\u0e48\u0e2d\u0e19\u0e40\u0e1e\u0e25\u0e35\u0e22' },
      { id: 'nausea', name: 'Nausea', nameTh: '\u0e04\u0e25\u0e37\u0e48\u0e19\u0e44\u0e2a\u0e49' },
      { id: 'chest_pain', name: 'Chest Pain', nameTh: '\u0e40\u0e08\u0e47\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e2d\u0e01' },
      { id: 'dizziness', name: 'Dizziness', nameTh: '\u0e27\u0e34\u0e07\u0e40\u0e27\u0e35\u0e22\u0e19' }
    ]);
  } catch (error: any) {
    console.warn('[METADATA] Symptoms fallback:', error.message);
    res.json([]);
  }
});

// /api/metadata/medicines - Alias for /medications
router.get('/medicines', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const data = await readJSON(GCS_BUCKETS.METADATA, 'medication-database.json');
    const medications = data.medications || data || [];
    res.json(medications);
  } catch (error: any) {
    console.warn('[METADATA] Medicines fallback:', error.message);
    res.json([]);
  }
});

// /api/metadata/icd10 - Alias for /icd10-codes
router.get('/icd10', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const data = await readJSON(GCS_BUCKETS.METADATA, 'icd10-codes.json');
    const codes = data.codes || data || [];
    res.json(codes);
  } catch (error: any) {
    console.warn('[METADATA] ICD10 fallback:', error.message);
    res.json([]);
  }
});

export default router;
