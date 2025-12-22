import { Router, Request, Response } from 'express';
import { storage, GCS_BUCKETS } from '../index';

const router = Router();

router.get('/signed-url/download', async (req: Request, res: Response) => {
  try {
    const { bucket, filePath } = req.query;
    if (!bucket || !filePath) {
      return res.status(400).json({ error: 'Missing bucket or filePath parameter' });
    }
    const bucketName = GCS_BUCKETS[bucket as keyof typeof GCS_BUCKETS] || bucket;
    const file = storage.bucket(bucketName as string).file(filePath as string);
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });
    res.json({ url, expiresIn: 900 });
  } catch (error: any) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/signed-url/upload', async (req: Request, res: Response) => {
  try {
    const { bucket, filePath, contentType } = req.query;
    if (!bucket || !filePath) {
      return res.status(400).json({ error: 'Missing bucket or filePath parameter' });
    }
    const bucketName = GCS_BUCKETS[bucket as keyof typeof GCS_BUCKETS] || bucket;
    const file = storage.bucket(bucketName as string).file(filePath as string);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: (contentType as string) || 'application/octet-stream',
    });
    res.json({ url, expiresIn: 900 });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/read', async (req: Request, res: Response) => {
  try {
    const { bucket, filePath } = req.query;
    if (!bucket || !filePath) {
      return res.status(400).json({ error: 'Missing bucket or filePath parameter' });
    }
    const bucketName = GCS_BUCKETS[bucket as keyof typeof GCS_BUCKETS] || bucket;
    const file = storage.bucket(bucketName as string).file(filePath as string);
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }
    const [contents] = await file.download();
    const data = JSON.parse(contents.toString());
    res.json(data);
  } catch (error: any) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/write', async (req: Request, res: Response) => {
  try {
    const { bucket, filePath } = req.query;
    const data = req.body;
    if (!bucket || !filePath) {
      return res.status(400).json({ error: 'Missing bucket or filePath parameter' });
    }
    const bucketName = GCS_BUCKETS[bucket as keyof typeof GCS_BUCKETS] || bucket;
    const file = storage.bucket(bucketName as string).file(filePath as string);
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' },
    });
    res.json({ success: true, path: filePath });
  } catch (error: any) {
    console.error('Error writing file:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/delete', async (req: Request, res: Response) => {
  try {
    const { bucket, filePath } = req.query;
    if (!bucket || !filePath) {
      return res.status(400).json({ error: 'Missing bucket or filePath parameter' });
    }
    const bucketName = GCS_BUCKETS[bucket as keyof typeof GCS_BUCKETS] || bucket;
    const file = storage.bucket(bucketName as string).file(filePath as string);
    await file.delete();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/list', async (req: Request, res: Response) => {
  try {
    const { bucket, prefix } = req.query;
    if (!bucket) {
      return res.status(400).json({ error: 'Missing bucket parameter' });
    }
    const bucketName = GCS_BUCKETS[bucket as keyof typeof GCS_BUCKETS] || bucket;
    const [files] = await storage.bucket(bucketName as string).getFiles({
      prefix: prefix as string,
    });
    const fileList = files.map(file => ({
      name: file.name,
      size: file.metadata.size,
      contentType: file.metadata.contentType,
      updated: file.metadata.updated,
    }));
    res.json({ files: fileList });
  } catch (error: any) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/exists', async (req: Request, res: Response) => {
  try {
    const { bucket, filePath } = req.query;
    if (!bucket || !filePath) {
      return res.status(400).json({ error: 'Missing bucket or filePath parameter' });
    }
    const bucketName = GCS_BUCKETS[bucket as keyof typeof GCS_BUCKETS] || bucket;
    const file = storage.bucket(bucketName as string).file(filePath as string);
    const [exists] = await file.exists();
    res.json({ exists });
  } catch (error: any) {
    console.error('Error checking file:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
