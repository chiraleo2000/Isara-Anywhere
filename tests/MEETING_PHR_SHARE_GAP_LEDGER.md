# Meeting + PHR Clinical Sharing — Gap Ledger

**Date:** 2026-07-14  
**Stage:** 0 SCAN complete (no product code changes yet)  
**Env snapshot:** `.env.docker` has `PATIENT_PORTAL_URL=http://127.0.0.1:3005`, `DOCTOR_PORTAL_URL=http://127.0.0.1:3010`, `MEETING_PUBLIC_URL=http://127.0.0.1:3020`, `MEETING_SERVER_URL=http://meeting-server:3020`

## Stack inventory (s0-01)

| Service | Port | Compose |
|---------|------|---------|
| Patient portal | 3005 | `docker-compose.yml` profile `full` |
| Doctor portal | 3010 | same |
| Meeting server | 3020 | same |
| Postgres | 5432 | `izara-postgres` |

Docker daemon was down at scan start; Desktop restarted for Stage 1.

## Matrix claims snapshot (s0-15) — before Stage 1 baselines

From `PROCESS_TO_TEST_GATE.md` / `PROCESS_COVERAGE_MATRIX.md` (do not treat as runtime truth):

- Meeting-Server 00–03, VIDEO_MEETING, Doctor 08/10, Patient 06 PHR: marked **covered**
- Latest gate note: 2026-07-13 `phase:9:strict` P0=0 + cloud deploy-gate 21/21
- Stage 1 will re-prove; Stage 4 must demote any gap that fails baseline

## Confirmed gaps

| Gap ID | File:line | Process cite | Observed | Expected Stage-1 suite | Stage-2 fix |
|--------|-----------|--------------|----------|------------------------|-------------|
| M-GET-001 | `Izara-jitsi-server/backend/index.js:1417-1433` | Meeting-Server/01, VIDEO_MEETING | `GET /api/meetings/:id` SELECT only; no `ensureMeetingRecordForAppointment` (lobby/join-config call it ~1687/2107) | Q-meeting-lifecycle, meeting-api-smoke | s2-01 |
| M-GUEST-001 | `Isara-patient-portal/frontend/utils/jitsiMeetingConfig.ts:349-418` | VIDEO_MEETING guest | `mountGuestJitsiMeeting` never calls `wireJitsiSkipPrejoin` (defined ~76; PatientMeetingRoom does) | R / J / Q guest | s2-02 |
| M-URL-001 | `index.js:2226-2241`, `2290-2305`; `jitsiConfig.js:87-104` | VIDEO_MEETING token-only | `PATIENT_PORTAL_URL` falls back to `req.get('host')`; share-link sets `inviteLink: urls.guestJoinUrl` which is **undefined** when anonymous off | E guest-invite, Q | s2-03, s2-04 |
| M-BFF-001 | Doctor `MeetingRoom.tsx` + `notifyHostPresent('', …)` | VIDEO_MEETING host-ready | Product uses same-origin `/api/meetings` via empty meetingServerUrl → **OK**; fixture already imports `DOCTOR_URL` | Q host-present | confirm only (s2-05) |
| M-BFF-002 | Socket room aliases | VIDEO_MEETING | Needs runtime proof in Q if host-ready missed | Q | s2-06 if Q fails |
| M-REC-001 | `index.js` save-recording ~4902 | Clinical Delivery §7 | Persistence path present; Stage 1 must prove `recording_url` after end | Q / Q2 | s2-07 if fail |
| M-REC-002 | `meetings.cjs:84` recording-stream | Delivery §7 doctor Meetings | BFF exists; prove 200 with doctor JWT | Q2 / F / E | s2-08 if fail |
| M-REC-003 | patient `index.ts:698` recording-download | Delivery §7 Timeline | Proxy exists; prove patient JWT ACL | F / J Timeline | s2-09 if fail |
| C-EMR-001 | `mainApiServer.cjs:2028-2098` | Clinical Delivery §4, Doctor 08 | `/api/emr/:id/sign` and `/api/emr/sign` sign only — **no** `publishEmrReportDocument` (publish only at health-logs ~2404) | unit clinical, E, F | s2-11, s2-12 |
| C-VAL-001 | `index.js:4126-4208` | Meeting-Server/02 MITL | Validate creates signed `emr`; instruction_sheet only if Gemini succeeds; **no** `emr_report` publish | Q2 | s2-13 |
| C-VID-001 | `phr.ts:282-326`, `348-380`, timeline ~1047-1087 | Meeting Results unlock | Meetings listed with download/summary **without** `ready_for_patient` gate; instructions API gates (~378) | F / J / Q2 | s2-14, s2-15 |
| C-ACL-001 | `mainApiServer.cjs:2578-2586` | Delivery §10 | `GET /api/documents/:docId/download` — any authenticated user with UUID gets bytes | unit clinical / ACL | s2-16 |
| C-LAB-001 | `mainApiServer.cjs:3236-3242` | Delivery §5 | `notifyDocumentDelivered({ documentId: null, …})` after lab publish | L / E | s2-17 |
| C-RX-001 | PHR `PrescriptionsTab` ~1489-1493 | Delivery §6, Patient 06 | Download button always shown; silent `return` if no `download_url` | F | s2-18, s2-20 |
| C-PHR-001 | `PHRPage.tsx:2115-2193` | Patient 06 | Duplicate: medications tab embeds PrescriptionsTab (**ประวัติการรับยา**) AND separate **ใบสั่งยา** tab also PrescriptionsTab | F / U | s2-19 |
| C-PHR-002 | same Download UI | Patient 06 | Honest disable/hide missing | F / U | s2-20 |
| C-PHR-003 | LabImagingTab | Patient 06 lab | Distinguish pending vs results + download only with document_id | L / F | s2-21 |
| C-DOC-001 | PatientRecordViewer | Doctor 11 | Socket refresh for Docs/Meetings | E | s2-22 |

## Stage 1 failure ledger

| Suite | Result | Notes | Linked gaps |
|-------|--------|-------|-------------|
| docker:probe-health | PASS | 3005/3010/3020 OK | — |
| docker:meeting-api-smoke | PASS | host-present, save-recording URL OK | M-REC path exists |
| test:meeting-server:contract | PASS 85/85 | | — |
| test:unit:meeting-acceptance | PASS 41/41 | | — |
| test:unit:meeting | PASS 422/422 | | — |
| test:unit:clinical | PASS 411/411 | | — |
| phr/delivery contracts | PASS 30/30 | **string-only** — does not assert `/api/emr/sign` → publish | C-EMR-001 hidden |
| Q-meeting-lifecycle | PASS 21/21 | Diagnostics: patient `membersOnly` / lobby Jitsi errors during join | M-GUEST-001, M-GET-001 runtime risk |
| Q2 / E / F / L | running | | C-* |
| phase:9:strict | skipped intentional slice | Full strict deferred to Stage 3 after fixes | — |

### Stage-2 freeze order (P0 first)

1. M-GET-001, M-GUEST-001, M-URL-001/b (meeting join/share) — **FIXED 2026-07-14**
2. C-EMR-001/b, C-VAL-001, C-VID-001/b (publish + MITL unlock) — **FIXED 2026-07-14**
3. C-ACL-001, C-LAB-001, C-RX-001 (ACL/notify/download) — **FIXED 2026-07-14**
4. C-PHR-001/002/003, C-DOC-001 (UX honesty) — **FIXED 2026-07-14**
5. Confirm M-BFF-001 (already same-origin), M-REC-* smoke PASS

### Stage-2 code changes

| Gap | Change |
|-----|--------|
| M-GET-001 | `GET /api/meetings/:id` calls `ensureMeetingRecordForAppointment` |
| M-GUEST-001 | `mountGuestJitsiMeeting` → `wireJitsiSkipPrejoin(api)` |
| M-URL-001 | Require `PATIENT_PORTAL_URL`; invite uses `guestLink` token URL |
| C-EMR-001 | Both EMR sign routes publish + notify |
| C-VAL-001 | Validate always inserts `emr_report` + instruction sheet (fallback without Gemini) |
| C-VID-001 | PHR meetings + timeline gate downloads/summary on `ready_for_patient` |
| C-ACL-001 | Doctor document download PDPA-scoped |
| C-LAB-001 | `publishedLabDocumentId` passed to notify |
| C-PHR-* | Split self-reported vs ประวัติการรับยา; honest Download; lab pending label |
| C-DOC-001 | Record Viewer `onNotification` invalidates docs/meetings |

### Stage-3 close evidence (2026-07-14)

| Suite | Result |
|-------|--------|
| Q + Q2 + R + J | 25 passed |
| E + F + L + Q2 retry | 38 passed |
| unit meeting / clinical | 422 / 411 passed |
| byteShareChain (patient download) | PASS |
| test:gate:ui-showup | **69/69** PASS (cloud-headed) |
| Group U | **31/31** PASS |
| phase:9:strict | **PASS** 2026-07-14 (`PHASE9_EXIT=0`, ledger round 9 **P0=0**); e2e-full-headed + screenshots-all + pre-deploy-gate-core green |

All M-* / C-* gap IDs closed in code. Stage-3 local reprove closed.

### Stage-5 cloud note (2026-07-14)

- `npm run cloud:deploy -- -Tag v1.7.61` — Cloud Build **SUCCESS** (`f507d925-…`); traffic shifted 100% on doctor/patient; meeting image published; post-deploy smoke **200** for doctor/patient/meeting.
- `test:cloud:deploy-gate` (`PW_INCLUDE_GUEST=1`) — **21/21** `CLOUD_EXIT=0` against **v1.7.61** Stage-2 images (first attempt flaked once on transient `meet.jit.si` timeout in Q01b; isolated Q retry **21/21** then full gate **21/21**).
- Branch `v1.7.52-test-hardening` commit `d8a612cd` pushed to `github`.
