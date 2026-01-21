import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import postgresDataService from '../services/postgresDataService';

const { DoctorService, pool } = postgresDataService;
const router = Router();

// ============================================================================
// DOCTORS ROUTES - POSTGRESQL ONLY
// ============================================================================

// Get all doctors
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    console.log('[DOCTORS] Fetching all doctors from PostgreSQL');
    
    // Get doctors from PostgreSQL
    const doctors = await DoctorService.getAvailableDoctors();
    
    console.log(`[DOCTORS] Found ${doctors.length} doctors`);
    res.json(doctors);
  } catch (error: any) {
    console.error('[DOCTORS] Get doctors error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors', details: error.message });
  }
});

// Get single doctor by ID
router.get('/:doctorId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    console.log(`[DOCTORS] Fetching doctor: ${doctorId}`);
    
    const doctor = await DoctorService.getDoctorById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    res.json(doctor);
  } catch (error: any) {
    console.error('[DOCTORS] Get doctor error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor', details: error.message });
  }
});

// Get doctor schedule
router.get('/:doctorId/schedule', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    console.log(`[DOCTORS] Fetching schedule for doctor: ${doctorId}`);
    
    // Query schedule from PostgreSQL
    const result = await pool.query(
      `SELECT * FROM doctor_schedules WHERE doctor_id = $1 AND is_available = true ORDER BY day_of_week, start_time`,
      [doctorId]
    );
    
    // Transform to frontend format
    const schedule = result.rows.map(row => ({
      id: row.id,
      doctorId: row.doctor_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      slotDuration: row.slot_duration_minutes || 30,
      isAvailable: row.is_available
    }));
    
    res.json(schedule);
  } catch (error: any) {
    console.error('[DOCTORS] Get schedule error:', error);
    // Return empty array if no schedule
    res.json([]);
  }
});

// Get doctor available slots for a specific date
router.get('/:doctorId/slots', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    
    console.log(`[DOCTORS] Fetching slots for doctor: ${doctorId}, date: ${date}`);
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Get doctor's schedule for the day of week
    const targetDate = new Date(date as string);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const scheduleResult = await pool.query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id = $1 AND day_of_week = $2 AND is_available = true`,
      [doctorId, dayOfWeek]
    );
    
    if (scheduleResult.rows.length === 0) {
      return res.json({ slots: [], message: 'No available schedule for this day' });
    }
    
    // Get existing appointments for the date
    const appointmentsResult = await pool.query(
      `SELECT appointment_time FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND status NOT IN ('cancelled', 'no-show')`,
      [doctorId, date]
    );
    
    const bookedTimes = appointmentsResult.rows.map(row => row.appointment_time);
    
    // Generate available slots
    const slots: { time: string; available: boolean }[] = [];
    
    for (const schedule of scheduleResult.rows) {
      const startHour = parseInt(schedule.start_time.split(':')[0]);
      const endHour = parseInt(schedule.end_time.split(':')[0]);
      const slotDuration = schedule.slot_duration_minutes || 30;
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push({
            time: timeStr,
            available: !bookedTimes.includes(timeStr)
          });
        }
      }
    }
    
    res.json({ slots, date, doctorId });
  } catch (error: any) {
    console.error('[DOCTORS] Get slots error:', error);
    res.status(500).json({ error: 'Failed to fetch slots', details: error.message });
  }
});

// Search doctors by specialty
router.get('/search/specialty/:specialty', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { specialty } = req.params;
    console.log(`[DOCTORS] Searching doctors by specialty: ${specialty}`);
    
    const filtered = await DoctorService.getDoctorsBySpecialty(specialty);
    
    console.log(`[DOCTORS] Found ${filtered.length} doctors with specialty: ${specialty}`);
    res.json(filtered);
  } catch (error: any) {
    console.error('[DOCTORS] Search doctors error:', error);
    res.status(500).json({ error: 'Failed to search doctors', details: error.message });
  }
});

// Search doctors by name
router.get('/search/name/:name', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    console.log(`[DOCTORS] Searching doctors by name: ${name}`);
    
    const result = await pool.query(
      `SELECT * FROM doctors 
       WHERE (name ILIKE $1 OR name_thai ILIKE $1) AND is_available = true
       ORDER BY name`,
      [`%${name}%`]
    );
    
    const doctors = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      nameThai: row.name_thai,
      specialty: row.specialty,
      specialtyThai: row.specialty_thai,
      hospital: row.hospital,
      hospitalThai: row.hospital_thai,
      avatarUrl: row.avatar_url,
      rating: row.rating,
      reviewCount: row.review_count,
      experience: row.experience_years,
      isAvailable: row.is_available,
      consultationFee: row.consultation_fee
    }));
    
    res.json(doctors);
  } catch (error: any) {
    console.error('[DOCTORS] Search by name error:', error);
    res.status(500).json({ error: 'Failed to search doctors', details: error.message });
  }
});

// Get doctor reviews
router.get('/:doctorId/reviews', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    console.log(`[DOCTORS] Fetching reviews for doctor: ${doctorId}`);
    
    const result = await pool.query(
      `SELECT r.*, u.name as patient_name 
       FROM doctor_reviews r
       LEFT JOIN users u ON r.patient_id = u.patient_id
       WHERE r.doctor_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [doctorId]
    );
    
    const reviews = result.rows.map(row => ({
      id: row.id,
      doctorId: row.doctor_id,
      patientName: row.patient_name || 'Anonymous',
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at
    }));
    
    res.json(reviews);
  } catch (error: any) {
    console.error('[DOCTORS] Get reviews error:', error);
    res.json([]); // Return empty array on error
  }
});

export default router;
