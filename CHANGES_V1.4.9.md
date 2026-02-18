# Isara-Anywhere v1.4.9 — Release Notes

**Release Date:** 2026-02-17  
**Test Results:** 1373 passed, 0 failed, 109 skipped (full Playwright e2e suite)

---

## Bug Fixes

### Patient Portal

- **Device Tokens Endpoint**: Fixed POST `/api/device-tokens` to accept both `token` and `deviceToken` field names, plus `deviceInfo` object for browser/OS metadata
- **Rate Limiting**: Increased production rate limit from 200 req/min to 2000 req/min (configurable via `RATE_LIMIT_MAX` env var) to prevent 429 errors during high-throughput testing
- **Meeting Fallback**: GET `/api/video-meeting/:appointmentId` now falls back to querying the Jitsi meeting server when a meeting isn't found locally (DB or in-memory)
- **Password Reset**: Fixed `ON CONFLICT (user_id)` error by ensuring `password_resets.user_id` has a UNIQUE constraint
- **socket.io-client**: Added missing `socket.io-client` dependency (was dynamically imported but not in package.json, causing Vite build failure)

### Doctor Portal

- **Rate Limiting**: Increased production rate limit from hardcoded 200 req/min to 2000 req/min (configurable via `RATE_LIMIT_MAX` env var)

### Meeting Server (Jitsi)

- **Duplicate Variable**: Fixed `SyntaxError: Identifier 'isProduction' has already been declared` that crashed the container on startup
- **Meeting List API**: GET `/api/meetings` now merges in-memory meetings (from FK-skipped inserts) with database records, ensuring meetings created with temporary appointment IDs are still retrievable

## Configuration

- Both portals now support `RATE_LIMIT_MAX` environment variable to override default rate limits
- Default: 2000/min in production, 10000/min in development

## Mobile App (Isara-mobile)

### Smart Auth Flow

- **Register-first for new users**: First-time users see Register as the primary action with role card selection
- **Login-only for returning users**: Users who have previously registered see Login as the primary button
- **Onboarding flag**: `authStore.register()` and `authStore.login()` both now set `onboardingCompleted: true` and persist to SecureStore

### Material Design 3 UI Overhaul

- **Hero Section**: Blue gradient branded header (`#0284c7`) with rounded bottom corners
- **Feature Chips**: Horizontal scrollable chips for key features (appointments, video calls, results, medicines, AI doctor)
- **Role Selection Cards**: Horizontal cards with left accent border and arrow CTA for Patient and Doctor roles
- **Smart Auth Section**: Adapts UI based on returning vs new user state

## E2E Testing Updates

### New Test Spec: `15-multi-user-showcase.spec.ts` (42 tests)

- **MU-A**: Simultaneous multi-role login (Patient + Doctor + Admin on separate browser pages)
- **MU-B**: Patient Portal all key pages load verification (8 pages)
- **MU-C**: Doctor Portal all key pages load verification (8 pages)
- **MU-D**: Admin Portal dashboard and management tests
- **MU-E**: Cross-portal workflow showcase (both portals side-by-side)
- **MU-F**: Full API endpoint sweep — no 400-500 errors
- **MU-G**: Multi-user concurrent page navigation + screenshots

### Test Runner (`run-tests.ps1`)

- **New `showcase` suite**: Opens Patient + Doctor + Admin portals simultaneously in headed mode
- **Updated `multi-ui` suite**: Now includes spec 15 (multi-user showcase)
- **Updated `complete` suite**: Now runs all 16 specs (00-15)

### Test Config Fixes

- Fixed `ENDPOINTS.clinicalResources`: `/api/clinical-resources` → `/api/content/clinical-resources`
- Fixed `ENDPOINTS.admin.doctors`: `/api/admin/doctors` → `/admin/pending-doctors`
- Fixed `ENDPOINTS.admin.approveDoctor`: `/api/admin/approve-doctor` → `/auth/admin/approve-doctor`
- Fixed `ENDPOINTS.admin.rejectDoctor`: `/api/admin/reject-doctor` → `/auth/admin/reject-doctor`
- Fixed `ENDPOINTS.ai.health`: `/api/ai/health` → `/api/health` (no dedicated AI health endpoint)
- Updated config version to v1.4.9

## Code Quality

- **MeetingRoom.tsx**: Fixed broken handler references, reduced cognitive complexity, converted write-only useState to useRef
- **TabBarIcon**: Fixed both patient/doctor tab bar icon components for proper TypeScript types
- **babel.config.js**: Fixed module.exports style for SonarLint compliance
- **service-worker.js**: Fixed globalThis reference
- **Migration scripts**: Fixed CommonJS export patterns

## Files Changed

- `Isara-patient-portal/package.json` — Added socket.io-client, version bump
- `Isara-patient-portal/server/index.ts` — Rate limit env var support
- `Isara-patient-portal/server/routes/device-tokens.ts` — Accept both token field names
- `Isara-patient-portal/server/routes/video-meeting.ts` — Meeting server fallback
- `Isara-doctor-portal/server/gcsApiServer.cjs` — Rate limit env var support
- `Isara-doctor-portal/src/pages/MeetingRoom.tsx` — Handler fixes, cognitive complexity reduction
- `Izara-jitsi-server/server/index.js` — Fixed duplicate const, merged in-memory meetings
- `Isara-mobile/app/index.tsx` — Material Design 3 welcome screen, smart auth routing
- `Isara-mobile/src/stores/authStore.ts` — onboardingCompleted flag in register() and login()
- `tests/e2e/specs/15-multi-user-showcase.spec.ts` — NEW: 42 multi-user browser tests
- `tests/e2e/lib/test-config.ts` — Fixed endpoint paths, v1.4.9
- `tests/e2e/playwright.config.ts` — Added spec 15 to all projects
- `tests/e2e/run-tests.ps1` — Added showcase suite, updated multi-ui and complete suites
