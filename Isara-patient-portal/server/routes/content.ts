/**
 * Content Routes - Medical Content Library API
 * Serves health education content from GCS
 */

import { Router, Request, Response } from 'express';
import { storage, GCS_BUCKETS } from '../index';

const router = Router();

/**
 * GET /api/content/medical
 * Get all published medical content articles
 * NOTE: Reads from medical-content/articles.json - same path as doctor portal writes to
 */
router.get('/medical', async (_req: Request, res: Response) => {
  try {
    const bucket = storage.bucket(GCS_BUCKETS.METADATA);
    // Updated path to match doctor portal's write path
    const file = bucket.file('medical-content/articles.json');
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.json({ 
        articles: [],
        message: 'No medical content found' 
      });
    }

    const [content] = await file.download();
    const data = JSON.parse(content.toString());
    
    // Return only published articles for patient portal
    const publishedArticles = (data.articles || data || []).filter(
      (article: any) => article.status === 'published'
    );

    res.json({ 
      articles: publishedArticles,
      total: publishedArticles.length,
      lastUpdated: data.lastUpdated || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching medical content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch medical content',
      message: error.message 
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
    const bucket = storage.bucket(GCS_BUCKETS.METADATA);
    // Updated path to match doctor portal's write path
    const file = bucket.file('medical-content/articles.json');
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const [content] = await file.download();
    const data = JSON.parse(content.toString());
    const articles = data.articles || data || [];
    
    const article = articles.find((a: any) => a.id === id);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Only return published articles to patients
    if (article.status !== 'published') {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count (optional - could save back to GCS)
    res.json({ article });
  } catch (error: any) {
    console.error('Error fetching article:', error);
    res.status(500).json({ 
      error: 'Failed to fetch article',
      message: error.message 
    });
  }
});

/**
 * GET /api/content/clinical-resources
 * Get clinical resources for health education
 */
router.get('/clinical-resources', async (_req: Request, res: Response) => {
  try {
    const bucket = storage.bucket(GCS_BUCKETS.METADATA);
    const file = bucket.file('clinical-resources.json');
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.json({ 
        resources: [],
        message: 'No clinical resources found' 
      });
    }

    const [content] = await file.download();
    const data = JSON.parse(content.toString());

    res.json({ 
      resources: data.resources || data || [],
      categories: data.categories || [],
      lastUpdated: data.lastUpdated || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching clinical resources:', error);
    res.status(500).json({ 
      error: 'Failed to fetch clinical resources',
      message: error.message 
    });
  }
});

/**
 * GET /api/content/health-tips
 * Get health tips for patient education
 */
router.get('/health-tips', async (_req: Request, res: Response) => {
  try {
    const bucket = storage.bucket(GCS_BUCKETS.METADATA);
    const file = bucket.file('health-tips.json');
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.json({ tips: [] });
    }

    const [content] = await file.download();
    const data = JSON.parse(content.toString());

    res.json({ 
      tips: data.tips || data || [],
      lastUpdated: data.lastUpdated || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching health tips:', error);
    res.status(500).json({ 
      error: 'Failed to fetch health tips',
      message: error.message 
    });
  }
});

/**
 * GET /api/content/health-education
 * Get health education articles
 */
router.get('/health-education', async (_req: Request, res: Response) => {
  try {
    const bucket = storage.bucket(GCS_BUCKETS.METADATA);
    const file = bucket.file('health-education-articles.json');
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.json({ articles: [] });
    }

    const [content] = await file.download();
    const data = JSON.parse(content.toString());

    res.json({ 
      articles: data.articles || data || [],
      lastUpdated: data.lastUpdated || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching health education:', error);
    res.status(500).json({ 
      error: 'Failed to fetch health education',
      message: error.message 
    });
  }
});

/**
 * GET /api/content/tags/:type
 * Get tags for content filtering (medical or clinical)
 */
router.get('/tags/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const bucket = storage.bucket(GCS_BUCKETS.METADATA);
    
    // Determine file path based on type
    const filePath = type === 'clinical' 
      ? 'clinical-resources/tags.json'
      : 'medical-content/tags.json';
    
    const file = bucket.file(filePath);
    
    const [exists] = await file.exists();
    if (!exists) {
      // Return default tags if file doesn't exist
      return res.json({ 
        tags: getDefaultTags(type),
        lastUpdated: new Date().toISOString()
      });
    }

    const [content] = await file.download();
    const data = JSON.parse(content.toString());

    res.json({ 
      tags: data.tags || data || [],
      lastUpdated: data.lastUpdated || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tags',
      message: error.message 
    });
  }
});

/**
 * POST /api/content/medical/:id/view
 * Track article view (increment view count)
 */
router.post('/medical/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bucket = storage.bucket(GCS_BUCKETS.METADATA);
    const file = bucket.file('medical-content/articles.json');
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const [content] = await file.download();
    const data = JSON.parse(content.toString());
    const articles = data.articles || [];
    
    const articleIndex = articles.findIndex((a: any) => a.id === id);
    
    if (articleIndex === -1) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count
    articles[articleIndex].views = (articles[articleIndex].views || 0) + 1;
    articles[articleIndex].viewCount = articles[articleIndex].views;
    data.articles = articles;
    data.lastUpdated = new Date().toISOString();

    // Save back to GCS
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=60' }
    });

    res.json({ 
      success: true,
      views: articles[articleIndex].views 
    });
  } catch (error: any) {
    console.error('Error tracking view:', error);
    // Silent fail for analytics - don't break the user experience
    res.json({ success: false });
  }
});

/**
 * Helper function to get default tags
 */
function getDefaultTags(type: string): Array<{id: string, name: string, nameTh?: string}> {
  if (type === 'medical') {
    return [
      { id: 'diabetes', name: 'Diabetes', nameTh: 'เบาหวาน' },
      { id: 'heart-health', name: 'Heart Health', nameTh: 'สุขภาพหัวใจ' },
      { id: 'nutrition', name: 'Nutrition', nameTh: 'โภชนาการ' },
      { id: 'exercise', name: 'Exercise', nameTh: 'การออกกำลังกาย' },
      { id: 'mental-health', name: 'Mental Health', nameTh: 'สุขภาพจิต' },
      { id: 'prevention', name: 'Prevention', nameTh: 'การป้องกัน' },
      { id: 'chronic-disease', name: 'Chronic Disease', nameTh: 'โรคเรื้อรัง' },
      { id: 'wellness', name: 'Wellness', nameTh: 'สุขภาวะ' },
    ];
  }
  return [
    { id: 'guidelines', name: 'Guidelines', nameTh: 'แนวทาง' },
    { id: 'protocols', name: 'Protocols', nameTh: 'โปรโตคอล' },
    { id: 'research', name: 'Research', nameTh: 'งานวิจัย' },
  ];
}

export default router;
