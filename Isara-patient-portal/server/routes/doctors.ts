import { Router, Request, Response } from 'express';
import { storage, GCS_BUCKETS } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Helper functions
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

// Get all doctors
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Read doctors from GCS: doctors.json
    const doctors = await readJSON(GCS_BUCKETS.DOCTOR, 'doctors.json');

    res.json(doctors);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json([]); // Return empty array if no doctors yet
    }
    console.error('Get doctors error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single doctor
router.get('/:doctorId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;

    // Read all doctors
    const doctors = await readJSON(GCS_BUCKETS.DOCTOR, 'doctors.json');

    // Find specific doctor
    const doctor = doctors.find((d: any) => d.id === doctorId);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error: any) {
    console.error('Get doctor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get doctor schedule
router.get('/:doctorId/schedule', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;

    // Read doctor schedule from GCS: doctors/{doctorId}/schedule.json
    const schedule = await readJSON(GCS_BUCKETS.DOCTOR, `doctors/${doctorId}/schedule.json`);

    res.json(schedule);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json([]); // Return empty array if no schedule yet
    }
    console.error('Get schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search doctors by specialty
router.get('/search/specialty/:specialty', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { specialty } = req.params;

    // Read doctors from GCS
    const doctors = await readJSON(GCS_BUCKETS.DOCTOR, 'doctors.json');

    // Filter by specialty
    const filtered = doctors.filter((d: any) =>
      d.specialty?.toLowerCase().includes(specialty.toLowerCase())
    );

    res.json(filtered);
  } catch (error: any) {
    console.error('Search doctors error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
