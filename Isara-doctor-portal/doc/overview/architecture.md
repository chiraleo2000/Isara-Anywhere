# 🏛️ Technical Architecture

## Overview

The Izara Doctor Portal follows a modern three-tier architecture with a React frontend, Node.js backend services, and Google Cloud Storage for data persistence.

---

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENT TIER                                     │
│                                                                                  │
│    ┌─────────────────────────────────────────────────────────────────────┐      │
│    │                    React + TypeScript Application                    │      │
│    │                         (Vite Build System)                          │      │
│    ├─────────────────────────────────────────────────────────────────────┤      │
│    │  Pages              │  Components         │  Services               │      │
│    │  • DoctorPortal     │  • AuthProvider     │  • authServices        │      │
│    │  • DoctorDashboard  │  • ResponsiveLayout │  • appointmentService  │      │
│    │  • PatientMgmt      │  • EMREditor        │  • emrService          │      │
│    │  • HealthMeeting    │  • Prescribing      │  • patientDataService  │      │
│    │  • AdminDoctorMgmt  │  • LabOrders        │  • gcsDataService      │      │
│    │  • AdminApptMgmt    │  • VirtualMeeting   │  • geminiService       │      │
│    └─────────────────────────────────────────────────────────────────────┘      │
│                                      │                                           │
│                                      ▼                                           │
│    ┌─────────────────────────────────────────────────────────────────────┐      │
│    │                        Vite Proxy (Development)                      │      │
│    │                    /api/* → localhost:3011-3012                      │      │
│    └─────────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  SERVER TIER                                     │
│                                                                                  │
│    ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐       │
│    │   Auth Server      │  │   GCS API Server   │  │  Main API Server   │       │
│    │   Port: 3011       │  │   Port: 3012       │  │  Port: 3009        │       │
│    ├────────────────────┤  ├────────────────────┤  ├────────────────────┤       │
│    │ • Login/Register   │  │ • Read from GCS    │  │ • Appointments     │       │
│    │ • Session Mgmt     │  │ • Write to GCS     │  │ • Patient APIs     │       │
│    │ • Doctor Approval  │  │ • File Operations  │  │ • Doctor APIs      │       │
│    │ • WebSocket        │  │ • Bucket Access    │  │ • Business Logic   │       │
│    └────────────────────┘  └────────────────────┘  └────────────────────┘       │
│              │                       │                       │                   │
│              └───────────────────────┴───────────────────────┘                   │
│                                      │                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  DATA TIER                                       │
│                           Google Cloud Platform                                  │
│                                                                                  │
│    ┌─────────────────────────────────────────────────────────────────────┐      │
│    │                    Google Cloud Storage Buckets                      │      │
│    ├─────────────────────────────────────────────────────────────────────┤      │
│    │  izara-users-credentials  │  User accounts, sessions, auth data     │      │
│    │  izara-doctors-data       │  Doctor profiles, schedules, queues     │      │
│    │  izara-patients-data      │  Patient records, EMRs, prescriptions   │      │
│    │  izara-appointments       │  Appointments, meeting links            │      │
│    │  izara-meta-data          │  Reference data, drug DB, lab codes     │      │
│    └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                  │
│    ┌─────────────────────────────────────────────────────────────────────┐      │
│    │                       Google Cloud APIs                              │      │
│    ├─────────────────────────────────────────────────────────────────────┤      │
│    │  Gemini AI  │  Calendar API  │  Meet API  │  Gmail API              │      │
│    └─────────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### Read Operation Flow
```
1. User Action (e.g., View Patient)
              │
              ▼
2. React Component calls Service
              │
              ▼
3. Service makes fetch() to /api/storage/read
              │
              ▼
4. Vite Proxy forwards to GCS API Server (3012)
              │
              ▼
5. GCS API Server authenticates with GCS
              │
              ▼
6. Read from GCS Bucket
              │
              ▼
7. Return JSON data through chain
              │
              ▼
8. React updates UI with data
```

### Write Operation Flow
```
1. User Action (e.g., Save EMR)
              │
              ▼
2. React Component validates data
              │
              ▼
3. Service makes POST to /api/storage/write
              │
              ▼
4. Auth Server/GCS API Server processes
              │
              ▼
5. Write to appropriate GCS Bucket
              │
              ▼
6. Return success/failure response
              │
              ▼
7. Update local cache
              │
              ▼
8. Show success notification
```

---

## 🗂️ Directory Structure

```
Isara-doctor-portal/
├── src/
│   ├── App.tsx                    # Main application with routing
│   ├── index.tsx                  # Entry point
│   ├── pages/                     # Page components
│   │   ├── DoctorPortal.tsx       # Main doctor portal with nested routing
│   │   ├── DoctorDashboard.tsx    # Health Studio dashboard
│   │   ├── PatientManagement.tsx  # Patient list & details
│   │   ├── QueueManagement.tsx    # Real-time patient queue
│   │   ├── CompleteSchedule.tsx   # Calendar & scheduling
│   │   ├── HealthMeeting.tsx      # Meeting management
│   │   ├── VirtualMeeting.tsx     # Video consultation
│   │   ├── AdminDoctorManagement.tsx    # Admin: Doctor approval
│   │   ├── AdminAppointmentManagement.tsx # Admin: Appointments
│   │   └── ...
│   ├── components/
│   │   ├── common/
│   │   │   ├── AuthProvider.tsx   # Authentication context
│   │   │   ├── ResponsiveLayout.tsx # Layout with navigation
│   │   │   └── ...
│   │   ├── CompleteEMREditor.tsx  # EMR creation/editing
│   │   ├── CompletePrescribing.tsx # E-prescribing system
│   │   ├── CompleteLabOrders.tsx  # Lab ordering
│   │   └── ...
│   ├── services/
│   │   ├── authServices.ts        # Authentication logic
│   │   ├── gcsDataService.ts      # GCS operations
│   │   ├── appointmentService.ts  # Appointment management
│   │   ├── emrService.ts          # EMR operations
│   │   ├── patientDataService.ts  # Patient data access
│   │   ├── geminiService.ts       # AI integration
│   │   └── config.ts              # Configuration
│   ├── types/
│   │   └── index.ts               # TypeScript definitions
│   ├── hooks/
│   │   ├── useAuth.ts             # Authentication hook
│   │   ├── usePatients.ts         # Patient data hook
│   │   └── ...
│   └── assets/                    # Images, icons
├── server/
│   ├── authServer.cjs             # Auth server (Port 3011)
│   ├── gcsApiServer.cjs           # GCS API server (Port 3012)
│   ├── mainApiServer.cjs          # Main API server (Port 3009)
│   ├── emailService.cjs           # Email sending
│   └── startAll.cjs               # Start all servers
├── public/                        # Static assets
├── scripts/                       # Utility scripts
├── vite.config.ts                 # Vite configuration
├── package.json                   # Dependencies
└── tsconfig.json                  # TypeScript config
```

---

## 🔐 Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌─────────────┐    ┌────────────┐    ┌──────────┐
│  User    │───▶│ Login Page  │───▶│ Auth Server│───▶│   GCS    │
│          │    │             │    │  (3011)    │    │          │
└──────────┘    └─────────────┘    └────────────┘    └──────────┘
                      │                   │
                      │    ┌──────────────┘
                      │    │
                      ▼    ▼
              ┌─────────────────┐
              │  Session Token  │
              │  LocalStorage   │
              └─────────────────┘
                      │
                      ▼
              ┌─────────────────┐
              │  AuthProvider   │
              │   (Context)     │
              └─────────────────┘
                      │
                      ▼
              ┌─────────────────┐
              │ ProtectedRoute  │
              └─────────────────┘
```

### Session Management
- Sessions stored in GCS: `sessions/{token}.json`
- Session timeout: 30 minutes (configurable)
- Auto-refresh on activity

---

## 🔄 State Management

### React Context Architecture
```
<BrowserRouter>
  <AuthProvider>              ← Authentication state
    <Routes>
      <ProtectedRoute>        ← Route protection
        <ResponsiveLayout>    ← UI state (sidebar, navigation)
          <DoctorPortal>      ← Portal-level state
            <DoctorDashboard> ← Component-level state
          </DoctorPortal>
        </ResponsiveLayout>
      </ProtectedRoute>
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

### Data Flow
- **Global State**: Authentication, user preferences
- **Route State**: Current view, selected patient
- **Component State**: Form data, UI toggles
- **Server State**: Patient records, appointments (via services)

---

## 📡 API Endpoints

### Auth Server (Port 3011)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | User authentication |
| `/auth/register` | POST | New user registration |
| `/auth/logout` | POST | Session termination |
| `/auth/verify` | GET | Token verification |
| `/admin/pending-doctors` | GET | List pending approvals |
| `/admin/approve-doctor` | POST | Approve doctor |
| `/admin/reject-doctor` | POST | Reject doctor |

### GCS API Server (Port 3012)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/storage/read` | GET | Read from GCS bucket |
| `/api/storage/write` | POST | Write to GCS bucket |
| `/api/storage/delete` | DELETE | Delete from GCS |
| `/api/storage/list` | GET | List bucket contents |
| `/api/health` | GET | Health check |

### Main API Server (Port 3009)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/appointments` | GET/POST | Appointment CRUD |
| `/api/appointments/:id` | PUT/DELETE | Single appointment |
| `/api/patients` | GET | List patients |
| `/api/doctors` | GET | List doctors |

---

## 🗄️ Caching Strategy

```typescript
// In-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 5 minutes default
}

// Cache key format
`${bucketType}:${path}`

// Example: 'patient:patients/PAT-001.json'
```

### Cache Operations
- **Read**: Check cache first, fallback to GCS
- **Write**: Update GCS, invalidate cache
- **Invalidation**: On data mutation or TTL expiry

---

## 🔌 WebSocket Integration

```javascript
// Auth Server WebSocket (port 3011/ws)
const io = new Server(server, {
  path: '/ws',
  cors: { origin: ['http://localhost:3010'] }
});

// Events
io.on('connection', (socket) => {
  socket.on('authenticate', (token) => {
    // Join user-specific room
    socket.join(`user-${userId}`);
  });
});

// Real-time updates
io.to(`user-${userId}`).emit('queue-update', queueData);
```

---

## 🚀 Build & Deployment

### Development
```bash
npm run dev    # Starts frontend + all backend servers
```

### Production Build
```bash
npm run build  # Creates optimized production build
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 80
CMD ["npm", "start"]
```

---

## 📊 Performance Considerations

| Aspect | Implementation |
|--------|----------------|
| **Code Splitting** | React.lazy for routes |
| **Tree Shaking** | Vite automatic optimization |
| **Caching** | In-memory + browser cache |
| **Lazy Loading** | Images, heavy components |
| **Minification** | Automatic in production |

---

## 🔒 Security Measures

| Layer | Security Measure |
|-------|------------------|
| **Frontend** | Input validation, XSS prevention |
| **API** | CORS, rate limiting, auth tokens |
| **Storage** | Private GCS buckets, signed URLs |
| **Transport** | HTTPS/TLS in production |
| **Data** | SHA256 password hashing |
