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

export default router;
