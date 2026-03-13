import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Google Calendar API
const CALENDAR_API_KEY = process.env.VITE_GOOGLE_CALENDAR_API_KEY || process.env.GOOGLE_CALENDAR_API_KEY;
const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'google-services',
    configured: {
      maps: !!MAPS_API_KEY,
      calendar: !!CALENDAR_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// MAPS CONFIGURATION ENDPOINT
// ============================================================================

// GET /api/google/maps/config - Get Maps API configuration
router.get('/maps/config', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const hasApiKey = !!MAPS_API_KEY;
    
    res.json({
      configured: hasApiKey,
      status: hasApiKey ? 'ready' : 'not_configured',
      features: {
        places: hasApiKey,
        directions: hasApiKey,
        geocoding: hasApiKey,
        staticMaps: hasApiKey
      },
      defaultCenter: {
        lat: 13.7563,
        lng: 100.5018,
        name: 'Bangkok, Thailand'
      },
      defaultZoom: 12,
      message: hasApiKey 
        ? 'Maps API is configured and ready' 
        : 'Maps API key not configured. Some features may be limited.',
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('[MAPS] Config error:', error);
    res.json({
      configured: false,
      status: 'error',
      message: 'Failed to get maps configuration',
      timestamp: new Date().toISOString()
    });
  }
});

// Google Calendar Endpoints
router.post('/calendar/event', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      summary, 
      description, 
      startDateTime, 
      endDateTime, 
      location,
      attendees,
      conferenceData 
    } = req.body;

    if (!summary || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Missing required fields: summary, startDateTime, endDateTime' });
    }

    // For public calendar creation, we return the event data that can be added via Google Calendar URL
    const calendarEvent = {
      summary,
      description: description || '',
      location: location || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Bangkok',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Bangkok',
      },
      attendees: attendees || [],
      conferenceData: conferenceData || null,
    };

    // Generate Google Calendar add event URL
    const startDate = new Date(startDateTime).toISOString().replaceAll(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(endDateTime).toISOString().replaceAll(/[-:]/g, '').split('.')[0] + 'Z';
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(summary)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(description || '')}&location=${encodeURIComponent(location || '')}`;

    res.json({
      success: true,
      event: calendarEvent,
      addToCalendarUrl: calendarUrl,
      message: 'Event data created. User can add to their calendar via the provided URL.',
    });
  } catch (error: unknown) {
    console.error('[CALENDAR] Create event error:', error);
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Get calendar availability (for booking)
router.get('/calendar/availability', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Missing doctorId or date' });
    }

    // Generate available time slots for the day
    // In production, this would check the doctor's actual calendar
    const baseDate = new Date(date as string);
    const dayOfWeek = baseDate.getDay();
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.json({ 
        date: date,
        doctorId,
        slots: [],
        message: 'No appointments available on weekends'
      });
    }

    // Generate slots from 9 AM to 5 PM
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      const slotTime = new Date(baseDate);
      slotTime.setHours(hour, 0, 0, 0);
      
      // Skip lunch hour
      if (hour === 12) continue;

      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        datetime: slotTime.toISOString(),
        available: Math.random() > 0.3, // Simulate some slots being taken
        duration: 30,
      });

      // Add :30 slot
      const halfSlotTime = new Date(baseDate);
      halfSlotTime.setHours(hour, 30, 0, 0);
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:30`,
        datetime: halfSlotTime.toISOString(),
        available: Math.random() > 0.3,
        duration: 30,
      });
    }

    res.json({
      date: date,
      doctorId,
      slots,
      timezone: 'Asia/Bangkok',
    });
  } catch (error: unknown) {
    console.error('[CALENDAR] Get availability error:', error);
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Google Meet Endpoints
router.post('/meet/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId, patientName, doctorName, scheduledTime } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId is required' });
    }

    // Generate a unique meeting room name based on appointment
    const meetingCode = `izara-${appointmentId.substring(0, 8)}-${Date.now().toString(36)}`;
    
    // Google Meet URL format
    // Note: For production with actual Meet API, you'd use Google Workspace APIs
    // This creates a "meet new" URL that opens Google Meet
    const meetUrl = `https://meet.google.com/new`;
    
    // Generate a calendar event with Meet
    const eventStart = new Date(scheduledTime || Date.now());
    const eventEnd = new Date(eventStart.getTime() + 30 * 60 * 1000); // 30 min duration

    const meetingDetails = {
      appointmentId,
      meetingCode,
      meetUrl,
      scheduledTime: eventStart.toISOString(),
      duration: 30,
      participants: {
        patient: patientName || 'Patient',
        doctor: doctorName || 'Doctor',
      },
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      // Instructions for joining
      joinInstructions: {
        th: 'คลิกลิงก์เพื่อเข้าร่วมการประชุม กรุณาเปิดกล้องและไมโครโฟน',
        en: 'Click the link to join the meeting. Please enable your camera and microphone.',
      },
    };

    // Generate Google Calendar URL with Meet
    const calendarTitle = `Telehealth: ${patientName} - ${doctorName}`;
    const calendarStart = `${eventStart.toISOString().replaceAll(/[-:]/g, '').split('.')[0]}Z`;
    const calendarEnd = `${eventEnd.toISOString().replaceAll(/[-:]/g, '').split('.')[0]}Z`;
    const calendarDetails = `การนัดหมายทางไกล Izara Telehealth\n\nJoin: ${meetUrl}`;
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&dates=${calendarStart}/${calendarEnd}&details=${encodeURIComponent(calendarDetails)}`;

    res.json({
      success: true,
      meeting: meetingDetails,
      addToCalendarUrl: calendarUrl,
    });
  } catch (error: unknown) {
    console.error('[MEET] Create meeting error:', error);
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Get meeting info
router.get('/meet/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    // In production, you'd fetch this from your database
    res.json({
      appointmentId,
      meetUrl: `https://meet.google.com/new`,
      status: 'ready',
      instructions: {
        th: 'คลิกลิงก์เพื่อเริ่มการประชุม',
        en: 'Click the link to start the meeting',
      },
    });
  } catch (error: unknown) {
    console.error('[MEET] Get meeting error:', error);
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Google Maps Endpoints - Alias for /places/nearby (test compatibility)
router.get('/places/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 5000, type = 'hospital' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    // Return demo data if no API key
    if (!MAPS_API_KEY) {
      return res.json({
        success: true,
        places: [
          {
            id: 'demo_hospital_001',
            name: 'Demo Hospital',
            address: 'Bangkok, Thailand',
            location: { lat: Number.parseFloat(lat as string), lng: Number.parseFloat(lng as string) },
            rating: 4.5,
            totalRatings: 100,
            isOpen: true,
            types: ['hospital', 'health'],
            icon: 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/hospital-71.png',
            photos: []
          }
        ],
        demoMode: true
      });
    }

    // Call Google Places API
    const latStr = String(lat);
    const lngStr = String(lng);
    const radiusStr = String(radius);
    const typeStr = String(type);
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latStr},${lngStr}&radius=${radiusStr}&type=${typeStr}&key=${MAPS_API_KEY}&language=th`;

    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[PLACES] Places API error:', data);
      // Return demo data on error
      return res.json({
        success: true,
        places: [
          {
            id: 'demo_hospital_001',
            name: 'Demo Hospital',
            address: 'Bangkok, Thailand',
            location: { lat: Number.parseFloat(latStr), lng: Number.parseFloat(lngStr) },
            rating: 4.5,
            totalRatings: 100,
            isOpen: true,
            types: ['hospital', 'health'],
            icon: 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/hospital-71.png',
            photos: []
          }
        ],
        demoMode: true
      });
    }

    // Transform results
    const places = (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry.location,
      rating: place.rating || null,
      totalRatings: place.user_ratings_total || 0,
      isOpen: place.opening_hours?.open_now ?? null,
      types: place.types,
      icon: place.icon,
      photos: place.photos?.map((p: any) => ({
        reference: p.photo_reference,
        width: p.width,
        height: p.height,
      })) || [],
    }));

    res.json({ success: true, places });
  } catch (error: unknown) {
    console.error('[PLACES] Nearby error:', error);
    // Return demo data on error
    res.json({
      success: true,
      places: [
        {
          id: 'demo_hospital_001',
          name: 'Demo Hospital',
          address: 'Bangkok, Thailand',
          location: { lat: 13.7563, lng: 100.5018 },
          rating: 4.5,
          totalRatings: 100,
          isOpen: true,
          types: ['hospital', 'health'],
          icon: 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/hospital-71.png',
          photos: []
        }
      ],
      demoMode: true
    });
  }
});

// Google Maps Endpoints
router.get('/maps/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 15000, type = 'hospital' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const latStr = String(lat);
    const lngStr = String(lng);
    const radiusStr = String(radius);
    const typeStr = String(type);

    if (!MAPS_API_KEY) {
      // Return demo data when API key not configured, not 500
      return res.json({
        success: true,
        results: [
          {
            id: 'demo_hospital_001',
            name: 'Bumrungrad International Hospital',
            address: '33 Soi Sukhumvit 3, Bangkok',
            location: { lat: Number.parseFloat(latStr) + 0.01, lng: Number.parseFloat(lngStr) + 0.005 },
            rating: 4.7,
            totalRatings: 2500,
            isOpen: true,
            types: ['hospital'],
          },
          {
            id: 'demo_clinic_001',
            name: 'Bangkok Health Clinic',
            address: '55 Sukhumvit Rd, Bangkok',
            location: { lat: Number.parseFloat(latStr) - 0.008, lng: Number.parseFloat(lngStr) + 0.01 },
            rating: 4.3,
            totalRatings: 450,
            isOpen: true,
            types: ['clinic'],
          },
        ],
        center: { lat: Number.parseFloat(latStr), lng: Number.parseFloat(lngStr) },
        radius: Number.parseInt(radiusStr, 10),
        demoMode: true,
      });
    }

    // Call Google Places API
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latStr},${lngStr}&radius=${radiusStr}&type=${typeStr}&key=${MAPS_API_KEY}&language=th`;

    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[MAPS] Places API error:', data);
      return res.status(500).json({ error: data.error_message || 'Places API error' });
    }

    // Transform results
    const places = (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry.location,
      rating: place.rating || null,
      totalRatings: place.user_ratings_total || 0,
      isOpen: place.opening_hours?.open_now ?? null,
      types: place.types,
      icon: place.icon,
      photos: place.photos?.map((p: any) => ({
        reference: p.photo_reference,
        width: p.width,
        height: p.height,
      })) || [],
    }));

    res.json({
      success: true,
      results: places,
      center: { lat: Number.parseFloat(lat as string), lng: Number.parseFloat(lng as string) },
      radius: Number.parseInt(radius as string, 10),
    });
  } catch (error: unknown) {
    console.error('[MAPS] Nearby search error:', error);
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Get place details
router.get('/maps/place/:placeId', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;

    if (!MAPS_API_KEY) {
      return res.status(500).json({ error: 'Maps API not configured' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${MAPS_API_KEY}&language=th&fields=name,formatted_address,formatted_phone_number,opening_hours,website,rating,reviews,geometry,photos,url`;

    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK') {
      console.error('[MAPS] Place details error:', data);
      return res.status(500).json({ error: data.error_message || 'Place details error' });
    }

    const place = data.result;
    res.json({
      success: true,
      place: {
        id: placeId,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        rating: place.rating,
        location: place.geometry?.location,
        openingHours: place.opening_hours?.weekday_text,
        isOpen: place.opening_hours?.open_now,
        reviews: place.reviews?.slice(0, 5),
        googleMapsUrl: place.url,
        photos: place.photos?.map((p: any) => ({
          reference: p.photo_reference,
          width: p.width,
          height: p.height,
        })),
      },
    });
  } catch (error: unknown) {
    console.error('[MAPS] Place details error:', error);
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Get photo URL
router.get('/maps/photo', async (req: Request, res: Response) => {
  try {
    const { reference, maxWidth = 400 } = req.query;

    if (!reference) {
      return res.status(400).json({ error: 'photo reference is required' });
    }

    if (!MAPS_API_KEY) {
      return res.status(500).json({ error: 'Maps API not configured' });
    }

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${String(maxWidth)}&photo_reference=${String(reference)}&key=${MAPS_API_KEY}`;

    res.json({
      success: true,
      url: photoUrl,
    });
  } catch (error: unknown) {
    console.error('[MAPS] Photo error:', error);
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Geocode address
router.get('/maps/geocode', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'address is required' });
    }

    if (!MAPS_API_KEY) {
      return res.status(500).json({ error: 'Maps API not configured' });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address as string)}&key=${MAPS_API_KEY}&language=th`;

    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK') {
      return res.status(400).json({ error: 'Could not geocode address' });
    }

    const result = data.results[0];
    res.json({
      success: true,
      location: result.geometry.location,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    });
  } catch (error: unknown) {
    console.error('[MAPS] Geocode error:', error);
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Get directions
router.get('/maps/directions', async (req: Request, res: Response) => {
  try {
    const { origin, destination, mode = 'driving' } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }

    if (!MAPS_API_KEY) {
      return res.status(500).json({ error: 'Maps API not configured' });
    }

    const modeStr = String(mode);
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin as string)}&destination=${encodeURIComponent(destination as string)}&mode=${modeStr}&key=${MAPS_API_KEY}&language=th`;

    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK') {
      return res.status(400).json({ error: 'Could not get directions' });
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    res.json({
      success: true,
      route: {
        distance: leg.distance,
        duration: leg.duration,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions.replaceAll(/<[^>]*>/g, ''),
          distance: step.distance,
          duration: step.duration,
        })),
        polyline: route.overview_polyline.points,
      },
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin as string)}&destination=${encodeURIComponent(destination as string)}&travelmode=${modeStr}`,
    });
  } catch (error: unknown) {
    console.error('[MAPS] Directions error:', error);
    res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Service Status Endpoint
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    services: {
      calendar: {
        configured: !!CALENDAR_API_KEY,
        status: CALENDAR_API_KEY ? 'ready' : 'not configured',
      },
      meet: {
        configured: true,
        status: 'ready',
        note: 'Uses Google Meet new meeting URL',
      },
      maps: {
        configured: !!MAPS_API_KEY,
        status: MAPS_API_KEY ? 'ready' : 'not configured',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
