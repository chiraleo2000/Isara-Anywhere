# หลังประชุม Workflow — Recording, AI Summary, EMR, ผู้ป่วย Delivery

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `POST_MEETING_WORKFLOW.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`POST_MEETING_WORKFLOW.md`](../POST_MEETING_WORKFLOW.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

**เวอร์ชัน:** 1.7.51  
**อัปเดตล่าสุด:** June 8, 2026  
**สถานะ:** Phase 1 — end-to-end pipeline with Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) validation


---

## ภาพรวม

After the แพทย์ ends a telehealth consultation, Izara runs a หลังประชุม pipeline:

1. Stop recording and persist media to Meeting Server / storage  
2. Finalize transcript segments (Web Speech + optional Google STT)  
3. Generate Gemini AI summary (SOAP-oriented)  
4. Present results on **MeetingResults** page for แพทย์ review  
5. แพทย์ validates → EMR auto-fill → ผู้ป่วย instruction sheet delivery  

---

## Detailed ขั้นตอนการทำงาน Steps

| ขั้นตอน | ผู้ดำเนินการ | การกระทำ | API / Component | Expected outcome |
|------|-------|--------|-----------------|------------------|
| 1 | แพทย์ | Click **End meeting** | `MeetingRoom.tsx` → `POST /api/meetings/:id/end` `{ generateSummary: true }` | สถานะ `ended`; pipeline starts |
| 2 | System | Stop Jibri / browser recording | `POST /api/meetings/:id/stop-recording` | `recordingUrl` available |
| 3 | System | Save recording blob (fallback) | `POST /api/meetings/:id/save-recording` | E2E seed path if UI upload slow |
| 4 | System | Generate Gemini summary | `POST /api/meetings/:id/generate-summary` | `summary` JSON in DB |
| 5 | แพทย์ | Open Meeting Results | `MeetingResults.tsx` → `GET /api/meetings/:id/results` | Recording + summary UI |
| 6 | แพทย์ | Validate & approve | `POST /api/meetings/:id/validate` | ผู้ป่วย-visible instructions unlocked |
| 7 | ผู้ป่วย | View consultation result | พอร์ทัลผู้ป่วย poll `GET /api/meetings/:id/consultation-result` | Summary when validated |

---

## Status State Machine

```text
in_progress → ended → processing → results_ready
```

- **ended** — แพทย์ hung up; recording finalize in progress  
- **processing** — transcript + Gemini running  
- **results_ready** — `GET /results` returns `success: true` with `meeting.id`  

---

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | For AI summary | Server canonical in `.env`; compose bridges to `VITE_GEMINI_API_KEY` at build |
| `GEMINI_MODEL` | Optional | Default `gemini-3.1-flash-lite` |
| `MEETING_SERVER_URL` | Yes (server) | Internal Docker: `http://meeting-server:3020` |
| `VITE_MEETING_SERVER_URL` | Yes (browser) | Local Docker: `http://localhost:3020` |

### Session authentication (v1.7.52)

หลังประชุม API routes use PostgreSQL session tokens (`Authorization: Bearer` opaque session). JWT removed.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No summary after end | `GEMINI_API_KEY` not `xxxxx`; meeting-server logs for `/generate-summary` |
| Results page 404 | นัดหมาย id vs meeting UUID — try both keys in `waitForMeetingResultsReadyAny` |
| Recording missing | Cloud: Jibri webhook or E2E `save-recording` fallback |

---

## Automated Tests

### Unit (Vitest)

| ID | File | What it proves |
|----|------|----------------|
| PMW01–PMW05 | `tests/unit/cross-portal/postMeetingWorkflow.integration.test.ts` | End → stop-recording → save-recording → generate-summary → validate chain |
| DPDF-* | `tests/unit/cross-portal/defectIsaraPdfMeetingQueue.test.ts` | Meeting queue + calendar URL defects (DPDF-CAL1/CAL2) |

### E2E (Playwright — local Docker gate, June 8 2026)

| Group | Tests | Pipeline order | Result |
|-------|-------|----------------|--------|
| **Q** | Q01a–g + Q02 | After D-แพทย์-host | **PASS** — 3-party 10s hold before end |
| **E** | EMR / meeting files | After Q | **PASS** |
| **F** | Clinical / PHR | After E | **PASS** |
| **L** | Lab ordering L1 | After F | **PASS** (no skip — แพทย์ JWT via `POST /api/auth/login`) |

**Q01 → หลังประชุม chain:**

```text
Q01f: 10s hold (doctor + patient + guest in Jitsi)
  → Q01g: end-meeting-btn
  → ensureMeetingResultsForE2E (fixture)
  → Q02: recording-player visible
  → generate-summary-btn (Gemini)
  → MeetingResults validation UI
  → PMW integration mirrors same API sequence
```

**Fixture helpers** (`tests/helpers/meeting-lifecycle-fixture.ts`):

| Helper | Purpose |
|--------|---------|
| `holdWithMediaChecks` | Poll iframe + media for `MEETING_HOLD_MS` |
| `assertThreePartyInMeeting` | Three Jitsi shells after admit |
| `ensureMeetingResultsForE2E` | Poll `GET /api/meetings/:id/results` until `results_ready` |
| `waitForMeetingResultsReadyAny` | Accept appointment id or meeting UUID |

**Full local gate command (zero skip):**

```bash
docker compose --env-file .env.docker build doctor-portal patient-portal
npm run test:unit:docker          # 2982 Vitest
# E2E: A-auth → D → D-doctor-host → Q → E → F → L (35 passed, 0 skipped)
# J + R by file path (16/16)
npm run test:quality:gate
```

Evidence: `reports/defect-fix/DEFECT_REGISTER.md` — June 8, 2026 local gate.