# 📂 Project Files Reference

A comprehensive guide to all files and directories in the Izara Doctor Portal project.

---

## 📁 Root Directory Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Frontend-only Docker image (Nginx + React build) |
| `Dockerfile.authserver` | Auth server standalone image for Cloud Run |
| `Dockerfile.gcsapi` | GCS API server standalone image for Cloud Run |
| `Dockerfile.production` | Production frontend image with env injection |
| `Dockerfile.unified` | **Recommended** - Single image with all services |
| `index.html` | Vite entry HTML file |
| `metadata.json` | Application metadata |
| `nginx.conf` | Nginx configuration for frontend serving |
| `package.json` | Dependencies and npm scripts |
| `tsconfig.json` | TypeScript configuration |
| `tsconfig.node.json` | TypeScript config for Node.js |
| `vite.config.ts` | Vite build configuration |

---

## 📁 `/server` - Backend Services

Backend Node.js servers using Express.js.

| File | Port | Purpose |
|------|------|---------|
| `authServer.cjs` | 3011 | Authentication, sessions, user management, doctor approval |
| `gcsApiServer.cjs` | 3012 | Google Cloud Storage CRUD operations |
| `mainApiServer.cjs` | 3009 | Business logic, appointments, EMR, patients |
| `startAll.cjs` | - | Starts all servers concurrently for development |
| `emailService.cjs` | - | Email sending service module |

### `/server/security`
| File | Purpose |
|------|---------|
| `owasp-middleware.cjs` | OWASP Top 10:2025 security middleware |

---

## 📁 `/src` - Frontend Source Code

### Core Files
| File | Purpose |
|------|---------|
| `App.tsx` | Main React application with routing |
| `index.tsx` | Application entry point |
| `vite-env.d.ts` | Vite TypeScript definitions |

### `/src/pages` - Page Components

| File | Route | Purpose |
|------|-------|---------|
| `LoginPage.tsx` | `/login` | User authentication |
| `DoctorPortal.tsx` | `/doctor/:userId/*` | Main portal layout with navigation |
| `DoctorDashboard.tsx` | `dashboard` | Health Studio dashboard |
| `PatientManagement.tsx` | `patients` | Patient list and management |
| `QueueManagement.tsx` | `queue` | Real-time patient queue |
| `CompleteSchedule.tsx` | `schedule` | Calendar and scheduling |
| `HealthMeeting.tsx` | `meetings` | Meeting management |
| `VirtualMeeting.tsx` | `meeting/:id` | Video consultation interface |
| `DoctorAvailabilitySettings.tsx` | `availability` | Doctor schedule settings |
| `ClinicalResources.tsx` | `resources` | Clinical reference materials |
| `GeminiAIStudio.tsx` | `ai-studio` | AI assistant interface |
| `AdminDoctorManagement.tsx` | `doctor-management` | Admin: Doctor approval |
| `AdminAppointmentManagement.tsx` | `appointment-management` | Admin: Appointment assignment |
| `AppointmentPoolManagement.tsx` | `appointment-pool` | Appointment pool management |
| `DoctorsManagement.tsx` | `doctors` | Doctor directory |

### `/src/components` - Reusable Components

| File | Purpose |
|------|---------|
| `AIChatCopilot.tsx` | AI clinical assistant chat interface |
| `CompleteEMREditor.tsx` | Full EMR editor with SOAP notes |
| `CompleteLabOrders.tsx` | Lab test ordering system |
| `CompletePrescribing.tsx` | E-prescribing with drug interactions |
| `PatientRecordViewer.tsx` | Patient record display |
| `TestHarness.tsx` | Development testing component |

#### `/src/components/common`
| File | Purpose |
|------|---------|
| `AuthProvider.tsx` | Authentication context and protected routes |
| `ResponsiveLayout.tsx` | Responsive layout wrapper |

#### `/src/components/ui`
| File | Purpose |
|------|---------|
| Various UI components | Buttons, cards, inputs, modals |

### `/src/services` - API Services

| File | Purpose |
|------|---------|
| `config.ts` | API configuration and environment |
| `authServices.ts` | Authentication API calls |
| `gcsDataService.ts` | GCS storage operations |
| `appointmentService.ts` | Appointment CRUD |
| `appointmentRescheduleService.ts` | Appointment rescheduling |
| `emrService.ts` | EMR operations |
| `patientDataService.ts` | Patient data access |
| `patientRecordService.ts` | Patient record operations |
| `doctorDataService.ts` | Doctor data access |
| `geminiService.ts` | Gemini AI integration |
| `geminiClinicalService.ts` | Clinical AI operations |
| `aiClinicalCopilot.ts` | AI copilot logic |
| `drugDatabase.ts` | Drug reference data |
| `labTestDatabase.ts` | Lab test reference data |
| `referenceDataService.ts` | Reference data operations |
| `mockDataService.ts` | Mock data for development |
| `storageServices.ts` | Storage utilities |
| `externalServices.ts` | External API integrations |
| `meetingTimeService.ts` | Meeting scheduling |
| `enhancedMeetingService.ts` | Advanced meeting features |
| `auditLogService.ts` | Audit logging |
| `simpleAuth.ts` | Simplified auth for development |

### `/src/hooks` - Custom React Hooks

| File | Purpose |
|------|---------|
| `useAuth.ts` | Authentication state hook |
| `useDoctorData.ts` | Doctor data fetching hook |
| `useKeyboardShortcuts.ts` | Keyboard shortcut handling |
| `useLanguage.ts` | Internationalization hook |
| `usePatients.ts` | Patient data fetching hook |
| `useResponsive.ts` | Responsive design hook |

### `/src/types`
| File | Purpose |
|------|---------|
| `index.ts` | TypeScript type definitions |

### `/src/assets`
| File | Purpose |
|------|---------|
| `IzaraLogo.tsx` | Logo component |
| `NewSvgIcons.tsx` | SVG icon components |

---

## 📁 `/scripts` - Utility Scripts

| File | Purpose |
|------|---------|
| `createBuckets.js` | Create GCS buckets |
| `seedUsers.cjs` | Seed test users to GCS |
| `seedAppointments.cjs` | Seed test appointments |
| `generateDemoData.cjs` | Generate comprehensive demo data |
| `generateDoctorMockData.cjs` | Generate doctor mock data |
| `generateDoctorUsers.cjs` | Generate doctor users |
| `generateMockUsers.cjs` | Generate mock users |
| `generateComprehensiveUsers.cjs` | Generate all user types |
| `uploadToGCS.cjs` | Upload mock data to GCS |
| `deploy.sh` | Deployment script |

### `/scripts/deploy`
| File | Purpose |
|------|---------|
| `deploy.sh` | Production deployment script |

---

## 📁 `/public` - Static Assets

| File | Purpose |
|------|---------|
| `izara-telemedicine-dd0b6abe2bc8.json` | GCP service account key |
| `NewSvgIcons.tsx` | Additional icon components |

### `/public/mockData` (generated)
Mock data files generated by scripts for development.

---

## 📁 `/doc` - Documentation

| File | Purpose |
|------|---------|
| `README.md` | Documentation index |
| `CHANGELOG.md` | Version history |
| `deployment.md` | Deployment guide |
| `files-reference.md` | This file |

### `/doc/overview`
| File | Purpose |
|------|---------|
| `system-overview.md` | System introduction and goals |
| `architecture.md` | Technical architecture |
| `technology-stack.md` | Technologies used |

### `/doc/doctor`
| File | Purpose |
|------|---------|
| `doctor-features.md` | Doctor portal features |
| `doctor-workflows.md` | Doctor user workflows |
| `doctor-access-control.md` | Doctor permissions |

### `/doc/admin`
| File | Purpose |
|------|---------|
| `admin-features.md` | Admin portal features |
| `admin-workflows.md` | Admin user workflows |
| `admin-access-control.md` | Admin permissions |

### `/doc/api`
| File | Purpose |
|------|---------|
| `api-reference.md` | API endpoints reference |
| `authentication.md` | Authentication documentation |

### `/doc/data-structures`
| File | Purpose |
|------|---------|
| `data-models.md` | Data model documentation |
| `database-schema.dbml` | Database schema definition |
| `gcs-bucket-structure.md` | GCS bucket organization |
| `json-schemas.md` | JSON data schemas |

### `/doc/workflows`
| File | Purpose |
|------|---------|
| `workflows-overview.md` | Workflows introduction |
| `appointment-workflow.md` | Appointment workflow |
| `emr-workflow.md` | EMR workflow |
| `prescribing-workflow.md` | Prescribing workflow |
| `telemedicine-workflow.md` | Telemedicine workflow |

---

## 🗄️ GCS Bucket Structure

| Bucket | Purpose |
|--------|---------|
| `izara-users-credentials` | User accounts, sessions, authentication |
| `izara-doctors-data` | Doctor profiles, schedules, queues |
| `izara-patients-data` | Patient records, EMRs, prescriptions |
| `izara-appointments` | Appointments, meeting links |
| `izara-meta-data` | Reference data, drug database, lab codes |

---

## 🐳 Docker Images

| Image | Dockerfile | Purpose |
|-------|------------|---------|
| `izara-doctor-portal` | `Dockerfile.unified` | **Recommended** - All-in-one image |
| `izara-frontend` | `Dockerfile` | Frontend only (Nginx) |
| `izara-auth` | `Dockerfile.authserver` | Auth server only |
| `izara-gcs-api` | `Dockerfile.gcsapi` | GCS API only |

---

## 🔧 NPM Scripts Reference

### Development
```bash
npm run dev           # Start all services (frontend + backend)
npm run frontend      # Start frontend only (Vite)
npm run backend       # Start all backend servers
npm run backend:auth  # Start auth server only
npm run backend:gcs   # Start GCS API only
npm run backend:main  # Start main API only
```

### Build
```bash
npm run build         # Build frontend
npm run build:prod    # Production build
npm run type-check    # TypeScript check
npm run lint          # ESLint check
npm run lint:fix      # Fix lint issues
```

### Data Generation
```bash
npm run seed          # Seed all test data
npm run seed:users    # Seed users only
npm run seed:appointments  # Seed appointments only
npm run generate:demo      # Generate demo data
npm run generate:all       # Generate all mock data
npm run upload:gcs         # Upload to GCS
npm run setup:complete     # Full setup with seeding
```

### Docker
```bash
npm run docker:build  # Build all Docker images
```
