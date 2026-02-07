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
    if (error.message.includes('not found')) {
      // Return default health tips
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
    console.error('Get health tips error:', error);
    res.status(500).json({ error: error.message });
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

export default router;
