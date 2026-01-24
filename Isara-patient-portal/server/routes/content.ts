/**
 * Content Routes - PostgreSQL ONLY
 * Medical Content Library API
 * NO GCS - All data stored in PostgreSQL
 * DEMO MODE - Returns mock data when PostgreSQL is unavailable
 */

import { Router, Request, Response } from 'express';
import postgresDataService from '../services/postgresDataService';

const { ContentService } = postgresDataService;
const { pool } = postgresDataService;

const router = Router();

// ============================================================================
// DEMO MODE - Mock content for cloud deployment without database
// ============================================================================
const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'demo';

// Check if database is available
async function checkDbConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Demo medical content
const DEMO_MEDICAL_CONTENT = [
  {
    id: 'demo_article_001',
    title: 'การดูแลสุขภาพประจำวัน',
    titleThai: 'การดูแลสุขภาพประจำวัน',
    titleEnglish: 'Daily Health Care Tips',
    content: 'บทความเกี่ยวกับการดูแลสุขภาพประจำวันสำหรับทุกเพศทุกวัย...',
    contentThai: 'บทความเกี่ยวกับการดูแลสุขภาพประจำวันสำหรับทุกเพศทุกวัย...',
    contentEnglish: 'Article about daily health care for all ages...',
    category: 'general-health',
    tags: ['health', 'lifestyle', 'tips'],
    author: 'Dr. Demo',
    authorId: 'demo_doctor_001',
    status: 'published',
    viewCount: 150,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo_article_002',
    title: 'อาหารเพื่อสุขภาพ',
    titleThai: 'อาหารเพื่อสุขภาพ',
    titleEnglish: 'Healthy Eating Guide',
    content: 'แนะนำการรับประทานอาหารที่ดีต่อสุขภาพ...',
    contentThai: 'แนะนำการรับประทานอาหารที่ดีต่อสุขภาพ...',
    contentEnglish: 'Guide to healthy eating habits...',
    category: 'nutrition',
    tags: ['nutrition', 'diet', 'healthy-eating'],
    author: 'Dr. Demo',
    authorId: 'demo_doctor_001',
    status: 'published',
    viewCount: 120,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Demo clinical resources
const DEMO_CLINICAL_RESOURCES = [
  {
    id: 'demo_resource_001',
    title: 'Clinical Practice Guidelines',
    titleThai: 'แนวทางเวชปฏิบัติ',
    titleEnglish: 'Clinical Practice Guidelines',
    content: 'Guidelines for clinical practice...',
    contentThai: 'แนวทางเวชปฏิบัติสำหรับแพทย์...',
    contentEnglish: 'Guidelines for clinical practice...',
    category: 'guidelines',
    specialty: 'internal-medicine',
    guidelineYear: 2024,
    source: 'Thai Medical Association',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo_resource_002',
    title: 'Medication Reference',
    titleThai: 'ข้อมูลยา',
    titleEnglish: 'Medication Reference',
    content: 'Reference information about medications...',
    contentThai: 'ข้อมูลอ้างอิงเกี่ยวกับยา...',
    contentEnglish: 'Reference information about medications...',
    category: 'medications',
    specialty: 'pharmacy',
    guidelineYear: 2024,
    source: 'FDA Thailand',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ============================================================================
// MEDICAL CONTENT ROUTES (คลังความรู้สุขภาพ)
// ============================================================================

/**
 * GET /api/content/medical
 * Get all published medical content articles
 */
router.get('/medical', async (req: Request, res: Response) => {
  try {
    const { category, limit } = req.query;
    const limitNum = Number.parseInt(limit as string, 10) || 50;
    console.log(`[CONTENT] Getting medical content, category: ${category || 'all'}`);

    // Check if we should use demo mode
    const useDemo = DEMO_MODE || !(await checkDbConnection());
    if (useDemo) {
      console.log('[CONTENT] Using DEMO MODE for medical content');
      let articles = [...DEMO_MEDICAL_CONTENT];
      if (category) {
        articles = articles.filter(a => a.category === category);
      }
      return res.json({
        articles: articles.slice(0, limitNum),
        total: articles.length,
        lastUpdated: new Date().toISOString(),
        demoMode: true
      });
    }

    let query = `
      SELECT mc.*, u.name as author_name, u.name_thai as author_name_thai
      FROM medical_content mc
      LEFT JOIN users u ON mc.author_id = u.id
      WHERE mc.status = 'published'
    `;
    const params: any[] = [];

    if (category) {
      query += ` AND mc.category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY mc.published_at DESC NULLS LAST, mc.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limitNum);

    const result = await pool.query(query, params);

    // Transform to match expected format
    const articles = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title_thai || row.title_english,
      titleThai: row.title_thai,
      titleEnglish: row.title_english,
      content: row.content_thai || row.content_english,
      contentThai: row.content_thai,
      contentEnglish: row.content_english,
      category: row.category,
      tags: row.tags || [],
      author: row.author_name_thai || row.author_name,
      authorId: row.author_id,
      status: row.status,
      viewCount: row.view_count || 0,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      articles: articles,
      total: articles.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CONTENT] Get medical content error:', error);
    // Fallback to demo content on error
    console.log('[CONTENT] Fallback to DEMO content after error');
    return res.json({
      articles: DEMO_MEDICAL_CONTENT,
      total: DEMO_MEDICAL_CONTENT.length,
      lastUpdated: new Date().toISOString(),
      demoMode: true
    });
  }
});

/**
 * GET /api/content/medical/:id
 * Get a specific medical content article by ID
 */
router.get('/medical/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[CONTENT] Getting article: ${id}`);

    const result = await pool.query(
      `SELECT mc.*, u.name as author_name, u.name_thai as author_name_thai
       FROM medical_content mc
       LEFT JOIN users u ON mc.author_id = u.id
       WHERE mc.id = $1 AND mc.status = 'published'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const row = result.rows[0];
    const article = {
      id: row.id,
      title: row.title_thai || row.title_english,
      titleThai: row.title_thai,
      titleEnglish: row.title_english,
      content: row.content_thai || row.content_english,
      contentThai: row.content_thai,
      contentEnglish: row.content_english,
      category: row.category,
      tags: row.tags || [],
      author: row.author_name_thai || row.author_name,
      authorId: row.author_id,
      status: row.status,
      viewCount: row.view_count || 0,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json({ article });
  } catch (error: any) {
    console.error('[CONTENT] Get article error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

/**
 * POST /api/content/medical/:id/view
 * Track article view (increment view count)
 */
router.post('/medical/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE medical_content 
       SET view_count = COALESCE(view_count, 0) + 1 
       WHERE id = $1 
       RETURNING view_count`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false });
    }

    res.json({ 
      success: true,
      views: result.rows[0].view_count 
    });
  } catch (error: any) {
    console.error('[CONTENT] Track view error:', error);
    res.json({ success: false });
  }
});

// ============================================================================
// CLINICAL RESOURCES ROUTES
// ============================================================================

/**
 * GET /api/content/clinical-resources
 * Get clinical resources for health education
 */
router.get('/clinical-resources', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    console.log(`[CONTENT] Getting clinical resources, category: ${category || 'all'}`);

    // Check if we should use demo mode
    const useDemo = DEMO_MODE || !(await checkDbConnection());
    if (useDemo) {
      console.log('[CONTENT] Using DEMO MODE for clinical resources');
      let resources = [...DEMO_CLINICAL_RESOURCES];
      if (category) {
        resources = resources.filter(r => r.category === category);
      }
      return res.json({
        resources: resources,
        categories: ['guidelines', 'medications'],
        lastUpdated: new Date().toISOString(),
        demoMode: true
      });
    }

    let query = `
      SELECT cr.*, u.name as author_name, u.name_thai as author_name_thai
      FROM clinical_resources cr
      LEFT JOIN users u ON cr.approved_by = u.id
      WHERE cr.status = 'published'
    `;
    const params: any[] = [];

    if (category) {
      query += ` AND cr.category = $${params.length + 1}`;
      params.push(category);
    }

    query += ' ORDER BY cr.updated_at DESC LIMIT 100';

    const result = await pool.query(query, params);

    const resources = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title_thai || row.title_english,
      titleThai: row.title_thai,
      titleEnglish: row.title_english,
      content: row.content_thai || row.content_english,
      contentThai: row.content_thai,
      contentEnglish: row.content_english,
      category: row.category,
      specialty: row.specialty,
      guidelineYear: row.guideline_year,
      source: row.source,
      tags: row.tags || [],
      status: row.status,
      approvedBy: row.author_name_thai || row.author_name,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      resources: resources,
      categories: [],
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CONTENT] Get clinical resources error:', error);
    // Fallback to demo content on error
    console.log('[CONTENT] Fallback to DEMO clinical resources after error');
    return res.json({
      resources: DEMO_CLINICAL_RESOURCES,
      categories: ['guidelines', 'medications'],
      lastUpdated: new Date().toISOString(),
      demoMode: true
    });
  }
});

// ============================================================================
// HEALTH TIPS ROUTES
// ============================================================================

/**
 * GET /api/content/health-tips
 * Get health tips for patient education
 */
router.get('/health-tips', async (_req: Request, res: Response) => {
  try {
    // For now, return static health tips
    // In future, these can be stored in medical_content with category='health-tip'
    const tips = [
      {
        id: 'tip-1',
        title: 'ดื่มน้ำให้เพียงพอ',
        content: 'ควรดื่มน้ำอย่างน้อย 8 แก้วต่อวัน',
        category: 'hydration'
      },
      {
        id: 'tip-2',
        title: 'ออกกำลังกายสม่ำเสมอ',
        content: 'ออกกำลังกายอย่างน้อย 30 นาทีต่อวัน',
        category: 'exercise'
      },
      {
        id: 'tip-3',
        title: 'นอนหลับให้เพียงพอ',
        content: 'ควรนอนหลับ 7-8 ชั่วโมงต่อคืน',
        category: 'sleep'
      }
    ];

    res.json({ 
      tips,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CONTENT] Get health tips error:', error);
    res.status(500).json({ tips: [] });
  }
});

// ============================================================================
// HEALTH EDUCATION ROUTES
// ============================================================================

/**
 * GET /api/content/health-education
 * Get health education articles
 */
router.get('/health-education', async (_req: Request, res: Response) => {
  try {
    // Same as medical content but filtered for education category
    const result = await pool.query(
      `SELECT mc.*, u.name as author_name, u.name_thai as author_name_thai
       FROM medical_content mc
       LEFT JOIN users u ON mc.author_id = u.id
       WHERE mc.status = 'published'
       ORDER BY mc.published_at DESC NULLS LAST, mc.created_at DESC
       LIMIT 50`
    );

    const articles = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title_thai || row.title_english,
      titleThai: row.title_thai,
      content: row.content_thai || row.content_english,
      category: row.category,
      author: row.author_name_thai || row.author_name,
      publishedAt: row.published_at,
      viewCount: row.view_count || 0
    }));

    res.json({ 
      articles,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CONTENT] Get health education error:', error);
    res.status(500).json({ articles: [] });
  }
});

// ============================================================================
// TAGS ROUTES
// ============================================================================

/**
 * GET /api/content/tags/:type
 * Get tags for content filtering (medical or clinical)
 */
router.get('/tags/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    
    // Default tags
    const defaultTags = type === 'medical' 
      ? [
          { id: 'diabetes', name: 'Diabetes', nameTh: 'เบาหวาน' },
          { id: 'heart-health', name: 'Heart Health', nameTh: 'สุขภาพหัวใจ' },
          { id: 'nutrition', name: 'Nutrition', nameTh: 'โภชนาการ' },
          { id: 'exercise', name: 'Exercise', nameTh: 'การออกกำลังกาย' },
          { id: 'mental-health', name: 'Mental Health', nameTh: 'สุขภาพจิต' },
          { id: 'prevention', name: 'Prevention', nameTh: 'การป้องกัน' },
          { id: 'chronic-disease', name: 'Chronic Disease', nameTh: 'โรคเรื้อรัง' },
          { id: 'wellness', name: 'Wellness', nameTh: 'สุขภาวะ' },
        ]
      : [
          { id: 'guidelines', name: 'Guidelines', nameTh: 'แนวทาง' },
          { id: 'protocols', name: 'Protocols', nameTh: 'โปรโตคอล' },
          { id: 'research', name: 'Research', nameTh: 'งานวิจัย' },
        ];

    res.json({ 
      tags: defaultTags,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CONTENT] Get tags error:', error);
    res.status(500).json({ tags: [] });
  }
});

// ============================================================================
// CATEGORIES ROUTES
// ============================================================================

/**
 * GET /api/content/categories
 * Get content categories
 */
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = [
      { id: 'diabetes', name: 'เบาหวาน', nameEn: 'Diabetes' },
      { id: 'hypertension', name: 'ความดันโลหิตสูง', nameEn: 'Hypertension' },
      { id: 'heart-disease', name: 'โรคหัวใจ', nameEn: 'Heart Disease' },
      { id: 'nutrition', name: 'โภชนาการ', nameEn: 'Nutrition' },
      { id: 'exercise', name: 'การออกกำลังกาย', nameEn: 'Exercise' },
      { id: 'mental-health', name: 'สุขภาพจิต', nameEn: 'Mental Health' },
      { id: 'elderly-care', name: 'ผู้สูงอายุ', nameEn: 'Elderly Care' },
      { id: 'general-health', name: 'สุขภาพทั่วไป', nameEn: 'General Health' }
    ];

    res.json({ categories });
  } catch (error: any) {
    console.error('[CONTENT] Get categories error:', error);
    res.status(500).json({ categories: [] });
  }
});

export default router;
