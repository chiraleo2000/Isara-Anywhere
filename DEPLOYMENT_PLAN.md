# Izara Telemedicine - Comprehensive Deployment & Testing Plan

**Date:** January 27, 2026  
**Version:** 1.5.0  
**Status:** In Progress

---

## 📋 Overview

This document outlines the comprehensive deployment and testing strategy for deploying all Izara Telemedicine services to Google Cloud Run with full parity to local Docker deployment.

## 🎯 Objectives

1. **Full Cloud Run Deployment**: Deploy all 5 services matching local Docker architecture
2. **Dashboard Fixes**: Fix dynamic data detection in both portals  
3. **Comprehensive Testing**: Create full workflow tests for local AND cloud
4. **Meeting Simulation**: Add realistic meeting demos with video/audio/transcripts
5. **Process-Based Tests**: Create unit tests based on all Process markdown files
6. **Documentation Updates**: Update all project documentation

---

## 🏗️ Architecture

### Services to Deploy

| Service | Local | Cloud Run | Status |
| --- | --- | --- | --- |
| PostgreSQL | localhost:5433 | izara-postgres | ⏳ Needs deployment |
| pgAdmin | localhost:5050 | izara-pgadmin | ⏳ Needs deployment |
| Patient Portal | localhost:3005 | izara-patient-portal | ✅ Deployed |
| Doctor Portal | localhost:3010 | izara-doctor-portal | ✅ Deployed |
| Meeting Server | localhost:3020 | izara-jitsi-meeting-portal | ⏳ Needs update |

### Key Principles

- **Same Architecture**: Cloud Run mirrors local Docker exactly
- **PostgreSQL**: Single PostgreSQL instance (Cloud SQL) shared by all services
- **No GCS**: All data in PostgreSQL, NO Google Cloud Storage
- **Inter-Service Communication**: Services communicate via Cloud Run URLs
- **Environment Parity**: Same env vars locally and in cloud

---

## 🔧 Dashboard Fixes Required

### Doctor Portal Dashboard

**Current Issues:**

- ❌ Pending Prescriptions always shows 0
- ❌ Unread Messages always shows 0  
- ❌ Stats not updating after actions

**Required Fixes:**

1. Add API endpoint for pending prescriptions count
2. Add API endpoint for unread notifications/messages
3. Implement real-time or polling updates
4. Query prescriptions with status='pending' from PostgreSQL
5. Query notifications with read_at IS NULL from PostgreSQL

**Implementation:**

```typescript
// Add to apiDataService.ts
export async function fetchPendingPrescriptions(doctorId: string): Promise<number> {
  const response = await fetch(`${API_BASE}/api/prescriptions/pending/${doctorId}`);
  const data = await response.json();
  return data.count;
}

export async function fetchUnreadNotifications(userId: string): Promise<number> {
  const response = await fetch(`${API_BASE}/api/notifications/unread/${userId}`);
  const data = await response.json();
  return data.count;
}
```

### Patient Portal Dashboard

**Current Issues:**

- ✅ Appointments loading correctly
- ⚠️ Could add health summary stats (vitals, medications, etc.)

**Optional Enhancements:**

1. Add vitals trend widget (BP, weight, glucose)
2. Add medication adherence tracking
3. Add appointment reminder notifications

---

## 🎬 Meeting Simulation Requirements

### Demo Meeting Data Structure

```json
{
  "meetingId": "TEST-MEETING-001",
  "appointmentId": "APT-001-2026-01-27",
  "participants": [
    {
      "id": "DOC-001",
      "role": "host",
      "name": "Dr. Test",
      "controls": ["start_transcript", "stop_transcript", "mute_all"]
    },
    {
      "id": "PATIENT-001",
      "role": "patient"
    },
    {
      "id": "RELATIVE-001",
      "role": "guest",
      "invitedBy": "PATIENT-001"
    }
  ],
  "transcript": {
    "segments": [...],
    "summary": "AI-generated summary"
  },
  "chat": [...],
  "recording": {
    "audio": "URL to audio file",
    "video": null
  }
}
```

### Meeting Workflow

1. **Doctor Approves Appointment** → Creates Jitsi meeting link
2. **Meeting Link Shared** → Both patient and doctor receive link
3. **Participants Join** → Doctor as host, patient joins, can invite relatives
4. **Host Controls**:
   - Start/Stop live transcription
   - Mute participants
   - End meeting
5. **During Meeting**:
   - Real-time transcript streaming
   - Chat messages
   - Optional audio recording
6. **After Meeting**:
   - AI generates summary (symptoms, diagnosis, recommendations)
   - Summary sent to doctor for validation ("Man-in-the-Loop")
   - Doctor reviews, edits, and approves summary
   - EMR record created with approved content
   - Patient Instruction document generated
   - Patient receives summary in Health History

### Test Scenarios

1. **Simple 1-on-1 Consultation**: Doctor + Patient
2. **Family Consultation**: Doctor + Patient + Relative (invited during meeting)
3. **Multi-Doctor Consultation**: Primary doctor + Consultant doctor
4. **Emergency Consultation**: Quick join without pre-scheduling

---

## 📝 Process-Based Unit Tests

### Test Coverage Matrix

| Process Document | Test File | Status |
| --- | --- | --- |
| Appointment_Workflows.md | appointment-workflow.spec.ts | ✅ Exists |
| Clinical_Resources_&_Medical_Library_Workflows.md | clinical-resources.spec.ts | ❌ To create |
| Health_Records_Processes.md | health-records.spec.ts | ❌ To create |
| Living_Will_Processes.md | living-will.spec.ts | ❌ To create |
| Medical_Consultants_Workflows.md | medical-consultants.spec.ts | ❌ To create |
| Medicine_Content_Processes.md | medicine-content.spec.ts | ❌ To create |
| Notification_Workflows.md | notifications.spec.ts | ❌ To create |
| UI_Pages_Workflows.md | ui-pages.spec.ts | ❌ To create |
| User_management_Workflows.md | user-management.spec.ts | ❌ To create |
| VIDEO_MEETING_JITSI_GEMINI.md | video-meeting.spec.ts | ❌ To create |

### Test Requirements

- **UI Tests**: Use Playwright for full user interaction testing
- **API Tests**: Test all endpoints with 200 status (no 404, 401, 403, 500)
- **Workflow Tests**: Test complete end-to-end user journeys
- **Data Validation**: Verify data stored correctly in PostgreSQL
- **Cross-Portal Tests**: Test data synchronization between portals

---

## 🚀 Deployment Steps

### Phase 1: Prepare Services

1. ✅ Create Cloud Run deployment configurations
2. ⏳ Update cloudbuild.yaml files for all services
3. ⏳ Set up Cloud Secrets Manager for API keys
4. ⏳ Configure service-to-service communication

### Phase 2: Deploy Database Services

1. Deploy PostgreSQL to Cloud Run (or use Cloud SQL)
2. Deploy pgAdmin to Cloud Run
3. Initialize database with izara-database.sql
4. Verify connectivity

### Phase 3: Deploy Application Services

1. Deploy Patient Portal
2. Deploy Doctor Portal
3. Deploy Meeting Server
4. Configure environment variables
5. Test service connectivity

### Phase 4: Testing

1. Run local tests FIRST
2. Fix all local failures
3. Deploy to cloud
4. Run cloud tests
5. Fix cloud failures
6. Re-deploy and re-test

### Phase 5: Documentation

1. Update README.md
2. Update PROJECT_STATUS.md
3. Update PHASE1_REQUIREMENTS.md
4. Create deployment guide

---

## 🧪 Test Execution Plan

### Local Testing

```powershell
# Run comprehensive local tests
.\tests\izara-api-tests.ps1 -Target local -Verbose

# Run Playwright UI tests
cd tests/e2e
npm test

# Run process-based tests
npm run test:processes
```

### Cloud Testing

```powershell
# Deploy all services
.\scripts\deploy-cloud-run.ps1 -Service all

# Run comprehensive cloud tests
.\tests\izara-api-tests.ps1 -Target cloud -Verbose

# Run cloud UI tests
cd tests/e2e
npm run test:cloud
```

### Test Success Criteria

- ✅ All API endpoints return 200 (except intentional errors)
- ✅ All appointments can be created, confirmed, completed
- ✅ Meetings can be created with Jitsi links
- ✅ Transcripts are generated and stored
- ✅ AI summaries are created and validated
- ✅ EMR records are created from meeting summaries
- ✅ Patient Instructions are generated and accessible
- ✅ Dashboard stats reflect real data
- ✅ Cross-portal data synchronization works

---

## 📊 Current Progress

### Completed ✅

1. ✅ Analyzed existing deployment configurations
2. ✅ Created Cloud Run deployment script
3. ✅ Created meeting simulation demo data
4. ✅ Identified dashboard issues

### In Progress ⏳

1. ⏳ Fixing dashboard data detection

### To Do ❌

1. ❌ Fix Doctor Portal dashboard data detection
2. ❌ Create comprehensive appointment workflow tests  
3. ❌ Create full meeting workflow UI tests
4. ❌ Create process-based unit tests
5. ❌ Deploy all services to Cloud Run
6. ❌ Run and fix local tests
7. ❌ Run and fix cloud tests
8. ❌ Update all documentation

---

## 🎯 Next Steps

1. **Immediate**: Fix dashboard data detection in both portals
2. **Next**: Create comprehensive test suites
3. **Then**: Deploy to Cloud Run
4. **Finally**: Run full test cycle and fix all failures

---

## 📞 Support

For issues or questions:

- Check logs in Cloud Run console
- Review PostgreSQL logs in pgAdmin
- Check service connectivity with health endpoints
- Review this deployment plan

---

**Last Updated:** 2026-01-27  
**Next Review:** After Phase 4 completion
