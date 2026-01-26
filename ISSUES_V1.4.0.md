# 🔧 Izara Telemedicine - Issues Report v1.4.0

**Date:** January 26, 2026  
**Status:** � In Progress - Fixes Applied  
**Total Issues:** 25+  
**Priority:** High

---

## 📊 Executive Summary

This document identifies and categorizes all known issues in the Izara Telemedicine platform, spanning both Patient Portal and Doctor Portal. Issues are organized by priority and include recommended fixes.

### ✅ FIXES APPLIED (This Session)

1. **docker-compose.yml** - Fixed database init script path (postgresql-schema-complete.sql → init-database.sql)
2. **Izara-jitsi-server/.env** - Created environment configuration file
3. **appointments.ts (Patient Portal)** - Added transformAppointment() helper to convert snake_case to camelCase
4. **MedicalConsultants.tsx** - Fixed API_BASE from VITE_GCS_API_URL to VITE_API_URL
5. **MedicalContent.tsx** - Fixed API_BASE from VITE_GCS_API_URL to VITE_API_URL
6. **ClinicalResources.tsx** - Fixed API_BASE from VITE_GCS_API_URL to VITE_API_URL
7. **mainApiServer.cjs** - Fixed content API response format to match frontend expectations:
   - `/api/content/medical` returns `{ articles: [...] }`
   - `/api/content/tags/medical` returns `{ tags: [...] }`
   - `/api/content/clinical` returns `{ resources: [...], pendingCount: number }`
   - `/api/content/tags/clinical` returns `{ tags: [...] }`
8. **mainApiServer.cjs** - Added `/api/consultants/specialties/list` endpoint

---

## 🚨 Critical Issues (Blocking Functionality)

### 1. Appointment System - Ghost Processes
**Status:** 🟡 Partially Fixed  
**Portal:** Patient Portal  
**Issue:** Appointments are created but:
- ❌ No notifications sent to doctor for confirmation
- ❌ Patient doesn't receive confirmation/rejection status
- ❌ Meeting links not visible to patient after confirmation
- ❌ No Jitsi Meeting Server deployed

**Root Cause:**
- NotificationService not triggering after appointment creation
- Jitsi Meeting Server exists but not integrated in docker-compose
- Meeting links stored but not displayed in patient UI

**Fix Required:**
1. Update appointment creation to send notifications
2. Add Jitsi Meeting Server to docker-compose.yml
3. Update patient appointment UI to show meeting links
4. Implement WebSocket for real-time status updates

---

### 2. Jitsi Meeting Server - Not Deployed
**Status:** � Fixed  
**Portal:** Both Portals  
**Issue:** 
- ✅ Meeting server exists in `/Izara-jitsi-server` and is in docker-compose.yml
- ✅ .env file created with API keys
- ✅ Server has Speech-to-Text and Gemini AI integration
- ⚠️ Needs testing after Docker restart

**Files Updated:**
- `Izara-jitsi-server/.env` (created)
- `docker-compose.yml` (meeting-server already present on port 3020)

---

### 3. Data Sync Issues
**Status:** 🔴 Critical  
**Portal:** Both Portals  
**Issue:**
- ❌ Medical Content from Doctor Portal not syncing to Patient Portal
- ❌ Clinical Resources not visible to other doctors
- ❌ PHR data from Patient Portal not visible to doctors
- ❌ Living Will/PDPA consent not syncing to doctors

**Root Cause:**
- Separate API servers not sharing PostgreSQL views
- Missing cross-portal data queries

**Fix Required:**
1. Create shared PostgreSQL views for cross-portal data
2. Implement proper status filtering (approved/published only)
3. Add proper PDPA consent checking

---

## 🟠 High Priority Issues

### 4. Google Maps - API Key Configuration
**Status:** 🟠 High  
**Portal:** Patient Portal  
**Page:** แผนที่ (Map)  
**Error:** "ไม่พบ API Key"

**Issue:**
- API Key present in .env but may need:
  - HTTP Referrer setup in Google Cloud Console
  - Maps JavaScript API enabled
  - Billing enabled on project

**Fix Required:**
1. Verify Google Cloud Console settings
2. Add localhost to HTTP Referrer restrictions
3. Enable Maps JavaScript API, Places API

---

### 5. PHR Temperature Input - Save Error
**Status:** 🟠 High  
**Portal:** Patient Portal  
**Page:** ประวัติสุขภาพส่วนบุคคล (PHR)  
**Error:** "เกิดข้อผิดพลาดในการบันทึกข้อมูล"

**Issue:**
- Temperature input uses text input with validation
- Backend may reject decimal values
- API endpoint returning 500 error

**Root Cause:** 
- VitalSigns data format mismatch between frontend and backend
- PostgreSQL column expects DECIMAL but receiving string

**Fix Required:**
1. Fix frontend data format for vital signs
2. Update backend to handle nested object format
3. Add proper error handling and user feedback

---

### 6. Medical Content Library - No Images
**Status:** � Fixed  
**Portal:** Both Portals  
**Page:** คลังความรู้สุขภาพ (Medical Content)  
**Previous Issue:**
- Images defined in database with URLs
- Images not rendering in UI
- Content not showing in Doctor Portal

**Fixes Applied:**
- Changed API_BASE from VITE_GCS_API_URL to VITE_API_URL
- Fixed API response format to `{ articles: [...] }`
- Database seed data includes image URLs from Wikipedia Commons
- Images should now render correctly

---

### 7. Medical Consultants - Fetch Error
**Status:** � Fixed  
**Portal:** Doctor Portal  
**Page:** ที่ปรึกษาแพทย์ (Medical Consultants)  
**Previous Error:** "Failed to fetch consultants"

**Fixes Applied:**
- Changed API_BASE from VITE_GCS_API_URL to VITE_API_URL
- Added /api/consultants/specialties/list endpoint
- API already returns correct format `{ consultants: [...] }`

**Issue:**
- API returns 500 or times out
- PostgreSQL ConsultantService may have issues

**Root Cause:**
- Database connection issues
- ConsultantService methods not implemented correctly

**Fix Required:**
1. Verify ConsultantService implementation
2. Add proper error handling with fallback data
3. Ensure consultants table has seed data

---

### 8. Admin Privileges Not Persisting
**Status:** 🟠 High  
**Portal:** Doctor Portal  
**Page:** จัดการแพทย์, อนุมัติแพทย์ใหม่
**Issue:**
- Promoting user to admin doesn't persist
- After re-login, user loses admin privileges

**Root Cause:**
- Database role update not reflected in JWT token
- Session not refreshed after role change

**Fix Required:**
1. Update user role in database properly
2. Force session refresh after role change
3. Include admin_privileges in JWT token

---

## 🟡 Medium Priority Issues

### 9. AI Health Assistant - No Chat History
**Status:** 🟡 Medium  
**Portal:** Patient Portal  
**Page:** ปรึกษา AI
**Issue:**
- Chat history not persisted
- No option to delete history
- History should be retained for 2 months

**Fix Required:**
1. Implement ai_chat_history table properly
2. Add retention policy (2 months)
3. Add delete/clear history functionality

---

### 10. Profile Settings - Missing Features
**Status:** 🟡 Medium  
**Portal:** Both Portals  
**Page:** ตั้งค่า (Settings)
**Issue:**
- ❌ Cannot change password
- ❌ Cannot upload/change profile image
- ❌ Doctor Portal has no settings page

**Fix Required:**
1. Add password change endpoint and UI
2. Add profile image upload functionality
3. Create DoctorSettingsPage for Doctor Portal

---

### 11. Dashboard AI - Not Working
**Status:** 🟡 Medium  
**Portal:** Both Portals  
**Page:** แดชบอร์ด (Dashboard)
**Issue:**
- AI buttons not functional
- Dashboard not synced with real data
- Health Studio not working as intended

**Fix Required:**
1. Connect dashboard AI to Gemini API
2. Implement real-time data sync
3. Fix Health Studio components

---

### 12. Notifications - Not Working
**Status:** 🟡 Medium  
**Portal:** Both Portals
**Issue:**
- In-app notifications not appearing
- Email notifications not sent
- Push notifications not configured

**Fix Required:**
1. Fix NotificationService to send proper notifications
2. Implement WebSocket for real-time updates
3. Configure email service (Gmail API)

---

## 🟢 Low Priority Issues

### 13. Remove "เวลาว่างของฉัน" Page
**Status:** 🟢 Low  
**Portal:** Doctor Portal
**Issue:** Page should be removed per user request

### 14. Change AI Assistant to Help Tab
**Status:** 🟢 Low  
**Portal:** Patient Portal (Appointment)
**Issue:** AI ช่วยแนะนำ should be ความช่วยเหลือ tab

### 15. Temperature Input UX
**Status:** 🟢 Low  
**Portal:** Patient Portal (PHR)
**Issue:** Should use number input with step=0.1

---

## 📋 Missing Seed Data

The following pages require startup data:

### Doctor Portal
| Page | Thai Name | Data Status |
|------|-----------|-------------|
| Dashboard | แดชบอร์ด | ⚠️ Needs real appointments |
| Appointments | ตารางนัดหมาย | ⚠️ Needs appointments |
| Patients | ผู้ป่วย | ✅ Has seed data |
| Medical Consultants | ที่ปรึกษาแพทย์ | ⚠️ API error |
| Medical Content | เนื้อหาทางการแพทย์ | ⚠️ Not showing |
| Clinical Resources | ทรัพยากรทางคลินิก | ⚠️ Not showing |
| Manage Doctors | จัดการแพทย์ | ⚠️ Admin only |
| Approve Doctors | อนุมัติแพทย์ใหม่ | ⚠️ Admin only |

### Patient Portal
| Page | Thai Name | Data Status |
|------|-----------|-------------|
| Home | หน้าหลัก | ⚠️ Needs sync |
| Appointments | นัดหมาย | ⚠️ Ghost process |
| AI Consult | ปรึกษา AI | ⚠️ API error |
| Health Library | คลังความรู้สุขภาพ | ⚠️ No images |
| PHR | ประวัติสุขภาพ | ⚠️ Save error |
| Timeline | เส้นทางสุขภาพ | ⚠️ No sync |
| PDPA/Living Will | PDPA & Living Will | ⚠️ No sync |
| Map | แผนที่ | ⚠️ API key |
| Settings | ตั้งค่า | ⚠️ Missing features |

---

## 🛠️ Recommended Fix Order

### Phase 1: Critical Fixes (1-2 days)
1. ✅ Fix PostgreSQL connection issues
2. ⬜ Add Jitsi Meeting Server to docker-compose
3. ⬜ Fix appointment notification flow
4. ⬜ Fix consultants API endpoint

### Phase 2: High Priority (2-3 days)
5. ⬜ Fix PHR vital signs save
6. ⬜ Fix Medical Content images
7. ⬜ Fix data sync between portals
8. ⬜ Fix admin privileges

### Phase 3: Medium Priority (3-4 days)
9. ⬜ Add AI chat history
10. ⬜ Add profile settings
11. ⬜ Fix dashboard sync
12. ⬜ Fix notifications

### Phase 4: Enhancements (2-3 days)
13. ⬜ Add Google Speech-to-Text
14. ⬜ Add Gemini AI meeting summary
15. ⬜ Complete seed data
16. ⬜ Update README with demo results

---

## 📁 Files Requiring Changes

### Docker & Deployment
- `docker-compose.yml` - Add meeting-server service
- `Izara-jitsi-server/.env` - Add API keys

### Patient Portal
- `src/pages/health/PHRPage.tsx` - Fix temperature input
- `src/pages/appointments/*.tsx` - Fix appointment flow
- `src/pages/settings/SettingsPage.tsx` - Add profile/password
- `server/routes/appointments.ts` - Fix notifications
- `server/routes/phr.ts` - Fix vital signs save

### Doctor Portal
- `src/pages/MedicalConsultants.tsx` - Fix API call
- `src/pages/MedicalContent.tsx` - Fix image display
- `src/pages/ClinicalResources.tsx` - Fix data loading
- `src/pages/DoctorSettingsPage.tsx` - Create new page
- `server/mainApiServer.cjs` - Fix consultants endpoint

### Database
- `scripts/database/init-database.sql` - Add more seed data

---

## 🧪 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Patient 0 | demo.test@gmail.com | P@ssw0rd |
| Patient 1 | Somchai.Mankong@gmail.com | P@ssw0rd |
| Patient 2 | Anan.Khayanrian@gmail.com | P@ssw0rd |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 |

---

**Last Updated:** January 26, 2026
