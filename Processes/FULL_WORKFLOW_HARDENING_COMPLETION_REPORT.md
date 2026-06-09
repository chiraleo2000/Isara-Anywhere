# Full Workflow Hardening — Completion Report

**Date:** 2026-05-23  
**Plan:** Cloud E2E Hardening (`cloud_e2e_hardening_e3c6b8e6`)  
**Target:** Cloud Run dev-testing (`*.run.app`)

## Summary

Cloud-first hardening with immutable error ledgers, production-grade Group Q (UI admit, real recording, UI Gemini), PostgreSQL `recording_data` BYTEA fallback for Cloud Run, and orchestrator `npm run test:cloud:hardening`.

## Orchestration

| Command | Purpose |
|---------|---------|
| `npm run test:cloud:hardening:round1` | Deploy (optional), smoke, gate0, full A–P, ledger Round 1 |
| `npm run test:cloud:hardening:round2` | Second regression + cleanup on pass |
| `npm run ledger:cloud -- --round N` | Regenerate ledger from `test-results/full-coverage-results.json` |

**Ledger paths:** `reports/cloud-error-ledger/round-{N}-*.json`, `CLOUD_E2E_ERROR_LEDGER_ROUND{N}.md`

## Code deliverables

- `scripts/run-two-round-cloud-hardening.ps1` — dual-round runner (single Playwright invocation)
- `scripts/aggregate-cloud-error-ledger.mjs` — immutable failure ledger
- `tests/group-Q-meeting-lifecycle.ui-test.ts` — no cloud stubs; UI `admit-all-btn`, `recording-indicator`, `generate-summary-btn`
- `Izara-jitsi-server/server/index.js` — `recording_data` BYTEA + GET recordings DB fallback
- `Isara-doctor-portal/.../MeetingRoom.tsx` — await `save-recording` before `/end`
- `cloudbuild.yaml` — `RECORDINGS_DIR=/tmp/recordings`; `PATIENT_PORTAL_URL` / `DOCTOR_PORTAL_URL` on meeting server after portal deploy

## Documentation refresh (2026-05-23)

| Item | Action |
|------|--------|
| Cloud DB | `npm run cleanup:cloud-test-only` — purge E2E rows, no demo re-seed (last run: 2026-05-23) |
| Process pages v1.7.26 | `enrich-process-pages.py --force-steps` — TH Sarabun / FC Iconic standards + detailed steps |
| User guides v1.7.26 | `build-portal-user-guides.py` — Word 16pt + PPT FC Iconic regenerated |
| `Processes/Pages/**` | 39 pages — มาตรฐานเอกสาร + คำอธิบาย + ขั้นตอนละเอียด (`enrich-process-pages.py --force-steps`) |
| User guides | `Documents/Documents/docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` (TH Sarabun New **16 pt**), `*_PPT_TH.pptx` (**FC Iconic**) v1.7.25 |

## Teams-like meeting production (2026-05-23)

| Area | Change |
|------|--------|
| Guest blank video | Full-height Jitsi container + host-ready overlay (patient + doctor `GuestMeetingJoin`) |
| Guest URLs | `buildGuestPortalUrls`; API-only copy in `MeetingRoom` / patient `share-link` |
| Transcript | Guest role label `แขก`; `POST .../guest-transcript-segment` |
| Dashboard EMR | `insert-meeting-summary-emr-btn` + improved `getMeetingFiles` summary load |
| Deploy tag | `v1.7.24-meeting` via `scripts/deploy-cloud-from-env.ps1 -Tag v1.7.24-meeting` |

## Unit / contract evidence

| Suite | Result |
|-------|--------|
| Vitest | 2619/2619 pass |
| Meeting contract (`*.test.mjs`) | 9/9 pass (incl. `buildGuestPortalUrls`) |
| Cloud smoke | PASS (all three services) |

## Playwright cloud regression

Run locally/CI:

```powershell
npm run test:cloud:hardening:round1
# fix from CLOUD_E2E_ERROR_LEDGER_ROUND1.md
npm run test:cloud:hardening:round2
```

**Sign-off criteria:** Round 2 ledger with zero P0/P1 in auth, appointments, meeting/lobby, webrtc, recording, gemini, clinical.

**Latest cloud run (2026-05-23):**

| Scope | Result |
|-------|--------|
| Round 2 full A–P (headless) | 56 passed, 1 failed (D2 nav — fixed) |
| Group D (full) | 17/17 passed |
| D-host | passed |
| Group Q | Q01c consent/lobby fix applied (`joinMeetingToLobby`); re-run after `v1.7.22-hardening` deploy |

**Next:** `npm run cloud:deploy` (wait for build `v1.7.22-hardening`) → `npm run test:cloud:hardening:round2` → `npm run cleanup:cloud-test-only`

---

## Local Docker zero-skip gate (2026-06-08 — v1.7.51)

| Area | Change |
|------|--------|
| Calendar on confirm | `calendarEventLinks.cjs` + `appointmentMapper.cjs`; patient `calendarEventUrl` in notifications; doctor `/schedule` + patient MiniCalendar |
| 3-party meeting | Q01f holds doctor + patient + guest for **10s** (`MEETING_HOLD_MS`); `assertThreePartyInMeeting` |
| L1 unskip | `group-L-lab-ordering.ui-test.ts` obtains doctor JWT via login API (no `DOCTOR_API_TOKEN` skip) |
| D4cal | Calendar + schedule assertions after D4 confirm |

### Gate results (June 8, 2026)

| Suite | Result |
|-------|--------|
| Vitest (`npm run test:unit:docker`) | **2982/2982 PASS** |
| E2E A-auth → D → D-doctor-host → Q → E → F → L | **35 passed, 0 skipped** |
| J + R (by file path) | **16/16 PASS** |
| `npm run test:quality:gate` | **PASS** |

**Rebuild required after server/UI changes:**

```bash
docker compose --env-file .env.docker build doctor-portal patient-portal
```

**Evidence:** `reports/defect-fix/DEFECT_REGISTER.md` — June 8 local gate section.

**Documentation updated:** `Appointment_Workflows.md`, `Notification_Workflows.md`, `VIDEO_MEETING_JITSI_GEMINI.md`, `POST_MEETING_WORKFLOW.md`, `Pages/Doctor-Portal/04_Schedule_Page.md`, `Pages/Patient-Portal/05_Appointments_Page.md`, `Documents/` technical + testing ledgers.

## Documentation

- `Processes/TWO_ROUND_CLOUD_TESTING.md` — orchestrator + ledger + Group Q assertions + cleanup
- `Processes/FULL_WORKFLOW_CONTRACT.md` — ledger evidence requirement
- `tests/SELECTORS.md` — meeting selector registry (Group Q)
- User guides: `python scripts/build-portal-user-guides.py` (TH Sarabun New 16 pt / FC Iconic)

## Residual notes

1. **Deploy** — Meeting BYTEA + portal recording-order fixes require `npm run cloud:deploy` before cloud Q02 passes against live code.
2. **Headed browsers** — Default `Workers=1` in hardening script avoids parallel headed launch failures on Windows.
3. **gate0** — API chain may fail while UI pipeline passes; both are logged in the ledger.

## Local Docker regression (v1.7.49 — Defect PDF items 1–3)

| Gate | Result |
|------|--------|
| Command | `npm run test:unit:docker:deploy` |
| Stack | `docker compose up -d --build` (postgres, patient, doctor, meeting-server) |
| Unit tests | **2817** PASS in `node:20-alpine` |
| Meeting contracts | **78** PASS (`Izara-jitsi-server/tests/*.test.mjs`) |
| Defect PDF regression | `cross-portal/defectIsaraPdfMeetingQueue.test.ts` (DPDF-Q/N/M*) |
| Process coverage map | `cross-portal/processPageCoverage.test.ts` |

**Fixes verified:** queue traceability after accept/decline (`includeAccepted`, patient Confirmed tab); patient Jitsi auto display name (`prejoinPageEnabled=false`, `requireDisplayName=false`); doctor host join (`resolveMountJwt`, layout-first mount, doctor joins before patient on public `meet.jit.si`).
