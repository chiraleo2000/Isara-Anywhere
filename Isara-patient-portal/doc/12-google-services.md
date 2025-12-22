# 12. Google Services Integration

## 12.1 Overview

Isara Patient Portal เชื่อมต่อกับ Google Cloud Services หลายตัวเพื่อให้บริการที่สมบูรณ์แก่ผู้ป่วย

| Service | Purpose | Features |
|---------|---------|----------|
| **Google Cloud Storage** | Data persistence | Store all patient data |
| **Google Calendar API** | Scheduling | Appointment management |
| **Google Meet API** | Video calls | Telehealth consultations |
| **Google Maps API** | Location services | Find nearby facilities |
| **Gemini AI** | AI assistant | Health chat & analysis |

---

## 12.2 Google Cloud Storage (GCS)

### 12.2.1 Bucket Configuration

```typescript
const GCS_BUCKETS = {
  AUTH: 'izara-users-credentials',      // User authentication
  PATIENT: 'izara-patients-data',       // Patient records
  DOCTOR: 'izara-doctors-data',         // Doctor information
  APPOINTMENTS: 'izara-appointments',    // Appointments
  METADATA: 'izara-meta-data',          // System metadata
};
```

### 12.2.2 GCS Initialization

```typescript
import { Storage } from '@google-cloud/storage';

function initializeStorage(): Storage {
  const projectId = process.env.GCP_PROJECT_ID;
  
  // Option 1: Service Account Key File
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new Storage({ 
      projectId, 
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS 
    });
  }
  
  // Option 2: Default location
  const credentialsPath = './credentials/service-account.json';
  if (fs.existsSync(credentialsPath)) {
    return new Storage({ projectId, keyFilename: credentialsPath });
  }
  
  // Option 3: Application Default Credentials
  return new Storage({ projectId });
}
```

### 12.2.3 Helper Functions

```typescript
// Read JSON from GCS
async function readJSON(bucket: string, filePath: string): Promise<any> {
  const file = storage.bucket(bucket).file(filePath);
  const [contents] = await file.download();
  return JSON.parse(contents.toString());
}

// Write JSON to GCS
async function writeJSON(bucket: string, filePath: string, data: any): Promise<void> {
  const file = storage.bucket(bucket).file(filePath);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

// Check if file exists
async function fileExists(bucket: string, filePath: string): Promise<boolean> {
  const file = storage.bucket(bucket).file(filePath);
  const [exists] = await file.exists();
  return exists;
}

// List files in directory
async function listFiles(bucket: string, prefix?: string): Promise<any[]> {
  const [files] = await storage.bucket(bucket).getFiles({ prefix });
  return files.map(file => ({
    name: file.name,
    metadata: file.metadata,
  }));
}
```

---

## 12.3 Google Calendar API

### 12.3.1 Calendar Event Creation

```typescript
// POST /api/google/calendar/event
const createCalendarEvent = async (eventData: {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: { email: string }[];
}) => {
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  
  const event = {
    summary: eventData.summary,
    description: eventData.description,
    location: eventData.location,
    start: {
      dateTime: eventData.startDateTime,
      timeZone: 'Asia/Bangkok',
    },
    end: {
      dateTime: eventData.endDateTime,
      timeZone: 'Asia/Bangkok',
    },
    attendees: eventData.attendees,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },  // 1 day before
        { method: 'popup', minutes: 30 },        // 30 minutes before
      ],
    },
  };
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });
  
  return {
    success: true,
    calendarUrl: response.data.htmlLink,
    event: response.data,
  };
};
```

### 12.3.2 Check Availability

```typescript
// GET /api/google/calendar/availability
const getAvailability = async (date: string, doctorId?: string) => {
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      items: [{ id: 'primary' }],
    },
  });
  
  // Parse busy times and return available slots
  const busyTimes = response.data.calendars?.primary?.busy || [];
  const availableSlots = generateAvailableSlots(date, busyTimes);
  
  return { date, slots: availableSlots };
};
```

---

## 12.4 Google Meet API

### 12.4.1 Create Meet Link (via Calendar)

```typescript
// POST /api/google/meet/create
const createMeetLink = async (appointmentData: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startDateTime: string;
  endDateTime: string;
  patientName?: string;
  doctorName?: string;
}) => {
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  
  const event = {
    summary: `นัดพบแพทย์ - ${appointmentData.patientName || 'Patient'}`,
    description: `Telehealth appointment\nPatient: ${appointmentData.patientName}\nDoctor: ${appointmentData.doctorName}`,
    start: {
      dateTime: appointmentData.startDateTime,
      timeZone: 'Asia/Bangkok',
    },
    end: {
      dateTime: appointmentData.endDateTime,
      timeZone: 'Asia/Bangkok',
    },
    conferenceData: {
      createRequest: {
        requestId: appointmentData.appointmentId,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
  };
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
  });
  
  return {
    success: true,
    meetLink: response.data.hangoutLink,
    appointmentId: appointmentData.appointmentId,
  };
};
```

### 12.4.2 Meet Link Structure

```
https://meet.google.com/xxx-yyyy-zzz
                       └─────────────┘
                        Meeting Code
```

---

## 12.5 Google Maps API

### 12.5.1 Search Nearby Facilities

```typescript
// GET /api/google/maps/nearby
const searchNearby = async (params: {
  location: string;    // "lat,lng"
  type?: string;       // hospital, pharmacy, doctor
  radius?: number;     // meters (default 5000)
  keyword?: string;    // search term
}) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const [lat, lng] = params.location.split(',');
  
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.append('location', `${lat},${lng}`);
  url.searchParams.append('radius', String(params.radius || 5000));
  url.searchParams.append('type', params.type || 'hospital');
  url.searchParams.append('language', 'th');
  url.searchParams.append('key', apiKey);
  
  if (params.keyword) {
    url.searchParams.append('keyword', params.keyword);
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    success: true,
    results: data.results,
    query: params,
  };
};
```

### 12.5.2 Get Place Details

```typescript
// GET /api/google/maps/place/:placeId
const getPlaceDetails = async (placeId: string) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.append('place_id', placeId);
  url.searchParams.append('fields', 'name,formatted_address,formatted_phone_number,opening_hours,rating,reviews,website,geometry');
  url.searchParams.append('language', 'th');
  url.searchParams.append('key', apiKey);
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    success: true,
    place: data.result,
  };
};
```

### 12.5.3 Get Directions

```typescript
// GET /api/google/maps/directions
const getDirections = async (
  origin: string, 
  destination: string, 
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.append('origin', origin);
  url.searchParams.append('destination', destination);
  url.searchParams.append('mode', mode);
  url.searchParams.append('language', 'th');
  url.searchParams.append('key', apiKey);
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    success: true,
    routes: data.routes,
  };
};
```

### 12.5.4 Map Page Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                        MAP PAGE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📍 ตำแหน่งของคุณ: กรุงเทพมหานคร                                 │
│  Accuracy: ±10m | Status: ✅ High Accuracy                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │                    [GOOGLE MAP]                              ││
│  │                                                              ││
│  │          🔵 You                                              ││
│  │                 📍 Hospital A                                ││
│  │                           📍 Clinic B                        ││
│  │                    📍 Pharmacy C                             ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Filter: [โรงพยาบาล] [คลินิก] [ร้านขายยา] [ศูนย์สุขภาพ]          │
│                                                                  │
│  Results (5 places found):                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🏥 โรงพยาบาลกรุงเทพ                     ⭐ 4.5  •  1.2 km   ││
│  │    123 ถ.สุขุมวิท                       🟢 เปิดอยู่          ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 💊 ร้านยา Boots                         ⭐ 4.2  •  0.5 km   ││
│  │    Central World                        🟢 เปิดอยู่          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12.6 Geolocation (Browser API)

### 12.6.1 High-Accuracy Location

```typescript
const getHighAccuracyLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,  // Use GPS
        timeout: 15000,            // 15 second timeout
        maximumAge: 0,             // No cached position
      }
    );
  });
};
```

### 12.6.2 Continuous Location Watching

```typescript
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    setUserLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
    setLocationAccuracy(position.coords.accuracy);
    updateUserMarker(position);
  },
  (error) => {
    console.error('Location error:', error);
    setLocationStatus('error');
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  }
);

// Cleanup
return () => {
  navigator.geolocation.clearWatch(watchId);
};
```

---

## 12.7 Environment Variables

### 12.7.1 Required Variables

```env
# Google Cloud Project
GCP_PROJECT_ID=your-project-id

# Service Account
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json

# Google Cloud Storage Buckets
GCS_BUCKET_AUTH=izara-users-credentials
GCS_BUCKET_PATIENT=izara-patients-data
GCS_BUCKET_DOCTOR=izara-doctors-data
GCS_BUCKET_APPOINTMENTS=izara-appointments
GCS_BUCKET_METADATA=izara-meta-data

# Google APIs
GOOGLE_CALENDAR_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=xxx
GOOGLE_MAPS_API_KEY=AIzaSyXXX

# Gemini AI
GEMINI_API_KEY=xxx

# Frontend (Vite)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXX
VITE_GCP_PROJECT_ID=your-project-id
```

### 12.7.2 API Key Restrictions

| API Key | Restrictions | Domains |
|---------|--------------|---------|
| Maps API (Frontend) | HTTP referrer | localhost:*, your-domain.com |
| Maps API (Backend) | IP address | Server IP |
| Calendar API | OAuth 2.0 | N/A |
| Gemini API | None | N/A |

---

## 12.8 Service Status Endpoint

### 12.8.1 Check All Services

```typescript
// GET /api/google/status
const getServicesStatus = async () => {
  const status = {
    services: {
      calendar: { configured: false, status: 'unknown' },
      meet: { configured: false, status: 'unknown' },
      maps: { configured: false, status: 'unknown' },
    },
    timestamp: new Date().toISOString(),
  };
  
  // Check Calendar
  if (process.env.GOOGLE_CALENDAR_CLIENT_ID) {
    status.services.calendar = {
      configured: true,
      status: 'configured',
    };
  }
  
  // Check Maps
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      // Test API call
      const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Bangkok&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(testUrl);
      const data = await response.json();
      
      status.services.maps = {
        configured: true,
        status: data.status === 'OK' ? 'working' : 'error',
      };
    } catch (error) {
      status.services.maps = {
        configured: true,
        status: 'error',
      };
    }
  }
  
  return status;
};
```

---

## 12.9 Error Handling

### 12.9.1 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `REQUEST_DENIED` | Invalid API key | Check API key and restrictions |
| `OVER_QUERY_LIMIT` | Quota exceeded | Increase quota or add billing |
| `ZERO_RESULTS` | No results found | Adjust search parameters |
| `INVALID_REQUEST` | Missing parameters | Check required fields |
| `PERMISSION_DENIED` | GCS access denied | Check IAM permissions |

### 12.9.2 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Access denied to GCS bucket",
    "details": "Check service account permissions"
  }
}
```

---

## 12.10 API Endpoints Summary

| Method | Endpoint | Service |
|--------|----------|---------|
| POST | `/api/google/calendar/event` | Calendar |
| GET | `/api/google/calendar/availability` | Calendar |
| POST | `/api/google/meet/create` | Meet |
| GET | `/api/google/meet/:appointmentId` | Meet |
| GET | `/api/google/maps/nearby` | Maps |
| GET | `/api/google/maps/place/:placeId` | Maps |
| GET | `/api/google/maps/photo` | Maps |
| GET | `/api/google/maps/geocode` | Maps |
| GET | `/api/google/maps/directions` | Maps |
| GET | `/api/google/status` | All |

---

[← Previous: AI Assistant](./11-ai-assistant.md) | [Next: Deployment →](./13-deployment.md)
