/**
 * Content Routes - PostgreSQL ONLY
 * Medical Content Library API
 * NO GCS - All data stored in PostgreSQL
 */

import { Router, Request, Response } from 'express';
import postgresDataService from '../services/postgresDataService';

const { ContentService } = postgresDataService;
const { pool } = postgresDataService;

const router = Router();

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
    console.log(`[CONTENT] Getting medical content, category: ${typeof category === 'string' ? category : 'all'}`);

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
      titleTh: row.title_thai,
      titleThai: row.title_thai,
      titleEnglish: row.title_english,
      summary: row.summary_thai || row.content_thai?.substring(0, 200) || row.content_english?.substring(0, 200),
      summaryTh: row.summary_thai || row.content_thai?.substring(0, 200),
      content: row.content_thai || row.content_english,
      contentThai: row.content_thai,
      contentEnglish: row.content_english,
      category: row.category,
      type: row.content_type || 'article',
      tags: row.tags || [],
      author: row.author_name_thai || row.author_name,
      authorName: row.author_name_thai || row.author_name,
      authorId: row.author_id,
      status: row.status,
      viewCount: row.view_count || 0,
      readTime: Math.ceil((row.content_thai?.length || row.content_english?.length || 500) / 500),
      isFeatured: row.is_featured || false,
      videoUrl: row.video_url || null,
      imageUrl: row.image_url,
      thumbnail: row.image_url,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      articles: articles,
      total: articles.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('[CONTENT] Get medical content error:', error);
    res.status(500).json({ error: 'Failed to fetch medical content' });
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
      imageUrl: row.image_url,
      thumbnail: row.image_url,
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    console.error('[CONTENT] Track view error:', error);
    res.json({ success: false });
  }
});

// ============================================================================
// CLINICAL RESOURCES ROUTES
// ============================================================================

/**
 * Clinical resources are doctor-only — patients must not access.
 */
const clinicalResourcesBlocked = (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Clinical resources are not available to patients' });
};

router.get('/clinical-resources', clinicalResourcesBlocked);
router.get('/clinical', clinicalResourcesBlocked);

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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    console.error('[CONTENT] Get categories error:', error);
    res.status(500).json({ categories: [] });
  }
});

// GET /api/content/search - Search across content
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q) return res.json({ results: [] });
    
    const query = q.toLowerCase();
    
    // Search in clinical resources from PostgreSQL
    const searchResult = await pool.query(
      `SELECT id, title_thai, title_english, content_thai, category, status
       FROM medical_content
       WHERE status = 'published' AND (
         LOWER(title_thai) LIKE $1 OR LOWER(title_english) LIKE $1
         OR LOWER(content_thai) LIKE $1 OR LOWER(content_english) LIKE $1
         OR LOWER(category) LIKE $1
       )
       LIMIT 50`,
      [`%${query}%`]
    );
    results = searchResult.rows.map((row: any) => ({
      id: row.id,
      title: row.title_thai || row.title_english,
      category: row.category,
      status: row.status,
    }));
    
    res.json({ results, query: q, total: results.length });
  } catch (error: unknown) {
    console.error('[CONTENT] Search error:', error);
    res.json({ results: [], query: req.query.q, total: 0 });
  }
});

export default router;
