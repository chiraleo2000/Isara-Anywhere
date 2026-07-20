# Defect Remediation — draw.io Diagram Update Instructions

Use this checklist when editing the architecture diagrams in draw.io. Do not invent steps that are not implemented in code.

**Source files (master):**

- [`diagrams.drawio`](diagrams.drawio) — **canonical** multi-tab file (**13 pages** — no duplicate legacy tabs; v1.7.48)
- [`Isara_Anywhere_System_Diagram.drawio`](Isara_Anywhere_System_Diagram.drawio) — standalone System Overview tab
- [`Isara_Anywhere_Full_Diagram.drawio`](Isara_Anywhere_Full_Diagram.drawio) — standalone Full Platform tab
- [`Isara_Anywhere_Complete_Diagram.drawio`](Isara_Anywhere_Complete_Diagram.drawio) — standalone Complete E2E (6 tabs)

Regenerate merge after edits: `node scripts/merge-drawio-diagrams.mjs`

---

## 1. Notification flow (P3–P5, D1)

**Replace or add sequence:**

1. Patient **NotificationBell** or **NotificationsPage** → user action
2. `PUT /api/appointments/notifications/:userId/read-all` (single call, not N parallel PUTs)
3. Postgres `notifications.read_at` updated
4. `GET` notifications → `normalizeNotificationRow` sets `isRead: Boolean(read_at)` (patient + doctor `postgresDataService`)
5. UI list at `/notifications` shows read state after reload

**Labels:** `read-all`, `isRead`, `createdAt`, `/notifications`

---

## 2. Appointment confirm flow (D4–D6)

**Replace GCS-only confirm path with:**

1. Patient books → appointment `in_pool` / `awaiting_doctor_response`
2. Admin assign (optional) → `adminAssignAppointment` API
3. Doctor **HealthMeeting** → `POST /api/appointments/:id/confirm` (Postgres-backed)
4. Meeting links written: `meeting_link`, `doctor_meeting_url`, `patient_meeting_url`
5. Notifications emitted (socket + in-app)

**Remove or strike through:** “Confirm writes only to GCS” if present.

---

## 3. Meeting lobby (M2)

**Doctor join path:**

1. Patient joins → lobby `waiting`
2. Doctor opens **MeetingRoom** from dashboard (not raw external Jitsi URL only)
3. Lobby panel lists waiting participants
4. Doctor **Admit** or **Admit-all** → `POST .../lobby/admit`
5. Both enter Jitsi room

---

## 4. AI chat (P1–P2)

1. **New Chat** → `clearChatHistory(sessionId)` + empty local messages + `loadSessions`
2. Chat request body includes `language: 'th' | 'en'`
3. Server prompt adds EN or TH instruction branch in `server/routes/ai.ts`

---

## 5. Gemini clinical (D3)

**Browser must not require embedded API key in production:**

1. **GeminiAIStudio** / `geminiClinicalService` → `GET /api/ai/gemini/status`
2. Clinical call → `POST /api/ai/gemini/clinical`
3. Server reads `GEMINI_API_KEY` from Cloud Run runtime secret (not repo `.env`)

---

## 6. Map (P8–P10, v1.7.40)

1. Primary data: `GET /api/map/nearby?lang=`
2. Optional Google Places supplemental (ratings, open status via `opening_hours.isOpen()`)
3. Map display: **AdvancedMarkerElement** when `GOOGLE_MAPS_MAP_ID` set; classic `Marker` fallback otherwise
4. Script load: `libraries=places,marker`

---

## 7. Living Will canonical route (P11–P12, v1.7.43)

**Patient route:** `/living-will` → `pages/LivingWillPage.tsx` (re-exports `pdpa/LivingWillPage.tsx`)

**Diagram labels:**

1. Phone field: `maxLength={10}`, `inputMode="numeric"`
2. Signature canvas: device pixel ratio scaling via `setupSignatureCanvas`
3. Do **not** show a duplicate standalone LivingWill component outside the PDPA module

---

## Suggested swimlanes (all diagrams)

| Lane | Boxes to verify |
|------|-----------------|
| Patient portal | NotificationsPage, AIDoctorPage, MapPage, ProfilePage |
| Doctor portal | HealthMeeting, MeetingRoom, DoctorNotificationBell, GeminiAIStudio |
| API | patient portal Express, doctor `mainApiServer.cjs` |
| Data | Postgres notifications, appointments, ai_chat_history |
| Meeting server | lobby join / admit |

Export updated `.drawio` and PNG/PDF after edits for presentations.

---

## v1.7.41 manual checklist (draw.io app)

Mark each file when sections 1–6 above are applied. Do not edit XML in git from automation.

| File | §1 Notifications | §2 Confirm | §3 Lobby | §4 AI | §5 Gemini | §6 Map | Exported PNG |
|------|------------------|------------|----------|-------|-----------|--------|--------------|
| `Isara_Anywhere_System_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| `Isara_Anywhere_Full_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| `Isara_Anywhere_Complete_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| `diagrams.drawio` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

**Screenshot evidence (cloud defect pack):** `docs/screenshots/group-defect/` — DN1/DN3 (notifications), DA1/DA2 (AI), DM1 (doctor lobby), DG1 (i18n), DG2/DG3 (Gemini D3).

**v1.7.42 code verification:** Gemini 3.1-flash-lite migration; traffic shift to revision 00142; gates in `reports/defect-fix/v1.7.42-final.txt`.

**v1.7.41 code verification:** Sonar S4325/S5725 cleared; gates in `reports/defect-fix/v1.7.41-final.txt`.

---

## 8. Notification routing utility (P3, v1.7.44)

**Patient bell click path:**

1. `NotificationBell` → `getNotificationTarget()` in `utils/notificationRouting.ts`
2. If `appointmentId` present → `/appointments/:id`
3. Else → `/notifications`
4. Dropdown “View all notifications” → `/notifications`

**Diagram labels:** `notificationRouting`, `getNotificationTarget`, DN4 Playwright

**Screenshot evidence (v1.7.44):** `docs/screenshots/group-defect/` — DT1–DT3 (theme), DA1–DA3 (appointments), DC1–DC2 (clinical), DN4 (bell), DM2 (admit)

**v1.7.44 code verification:** Behavioral Vitest + Playwright defect suites; gates in `reports/defect-fix/v1.7.44-final.txt`.

---

## 9. Sonar clearance + EMR print + test matrix (v1.7.45)

**EMR PDF export path (doctor portal):**

1. `emrService.exportEMRToPDF` → `Blob` + `URL.createObjectURL` (no `document.write`)
2. Print window loads HTML via blob URL → `print()` → `revokeObjectURL`

**Sonar suppressions (valid JSX — parser cascade):**

- `CompleteEMREditor.tsx`, `CompletePrescribing.tsx`, `LiveTranscription.tsx`
- Rules: `typescript:S6747`, `typescript:S6438` in `sonar-project.properties` e7–e12

**Playwright defect additions:**

| ID | Scenario | File |
|----|----------|------|
| DN5 | UI mark-all-read + API verify | `group-Defect-notifications.ui-test.ts` |
| DP1 | PHR persist after re-auth | `group-Defect-profile.ui-test.ts` |
| DJ1 | Map `lang=` + facility parity | `group-Defect-map.ui-test.ts` |
| DJ2 | Health library thumbnail | `group-Defect-map.ui-test.ts` |

**Diagram labels:** `Blob print`, `RegExp.exec`, `DN5`, `DP1`, `DJ1`, `DJ2`, Vitest **2731**, Defect Playwright **34 passed**

**Testing slide (diagrams.drawio):** cite Vitest + Playwright gates — **do not** reference `Presentations/html-diagrams/`

**v1.7.45 manual checklist**

| File | §1–8 prior | §9 Sonar/EMR | §9 Playwright | Exported PNG | Exported PDF |
|------|------------|--------------|---------------|--------------|--------------|
| `Isara_Anywhere_System_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `Isara_Anywhere_Full_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `Isara_Anywhere_Complete_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `diagrams.drawio` | [ ] | [ ] | [ ] | [ ] | [ ] |

**v1.7.45 code verification:** Sonar + Playwright gaps; gates in `reports/defect-fix/v1.7.45-final.txt`.

---

## 10. Zero-skip auth + cloud video AI secrets (v1.7.46)

**Playwright auth fix (DN2/DN5):**

1. Patient portal stores user in `localStorage.izara_user` (not `patient_user`)
2. Tests use `requirePatientAuth()` → reads `izara_user` + `auth_token`
3. Defect-regression cloud: **36 passed, 0 skipped**

**Cloud Run secrets (production-grade video + ASR + Gemini):**

| Secret | Services | Purpose |
|--------|----------|---------|
| `gemini-api-key` | meeting, doctor, patient | Gemini clinical summary from transcript |
| `google-speech-api-key` | meeting, doctor | Google Cloud Speech-to-Text (REST) |
| `gcp-service-account-key` | meeting, doctor | Base64 SA JSON — STT diarization + GCS |

**Meeting pipeline swimlane:**

1. Jitsi (camera/mic) → live Web Speech transcript segments (Socket.IO)
2. Post-meeting WebM → `POST .../transcribe-audio` (Google STT when secrets set)
3. Transcript array → Gemini `generateEMRSummary` / post-meeting pipeline

**Verify after deploy:** `npm run verify:cloud-meeting-ai`

**v1.7.46 manual checklist**

| File | §10 Auth fix | §10 STT/Gemini | Exported PNG | Exported PDF |
|------|--------------|----------------|--------------|--------------|
| `Isara_Anywhere_System_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] |
| `Isara_Anywhere_Full_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] |
| `Isara_Anywhere_Complete_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] |
| `diagrams.drawio` | [ ] | [ ] | [ ] | [ ] |

**Screenshot evidence:** `docs/screenshots/group-defect/` — DN2/DN5 (mark-all-read), DM1/DM2 (Jitsi lobby)

**v1.7.46 code verification:** gates in `reports/defect-fix/v1.7.46-final.txt`.

---

## 11. Clinical component extraction + full cloud proof (v1.7.48)

**Sonar S6747 structural fix (doctor portal):**

1. `CompleteEMREditor` → `EmrEditorChrome.tsx`
2. `CompletePrescribing` → `PrescribingModalChrome.tsx`
3. `LiveTranscription` → `LiveTranscriptionView.tsx` + `transcriptTypes.ts`
4. `MeetingResults.tsx` — `ValidationAction` type alias (S4323)
5. `technical_architecture_content.py` — `ROLE_PATIENT` / `ROLE_DOCTOR` (S1192)

**Full cloud headed verification (2026-05-31):**

| Gate | Result |
|------|--------|
| Unit | 151 files, **2736** PASS |
| Defect-regression | **36/36** PASS |
| `test:cloud:full` | **85/85** PASS (7.7m) |
| Screenshots | **212** PNG → `docs/screenshots/` |

**Diagram labels:** `EmrEditorChrome`, `LiveTranscriptionView`, `ValidationAction`, Vitest **2736**, Playwright **85 + 36**

**v1.7.48 manual checklist**

| File | §11 Clinical extract | §11 Cloud 85/85 | Exported PNG | Exported PDF |
|------|----------------------|-----------------|--------------|--------------|
| `Isara_Anywhere_System_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] |
| `Isara_Anywhere_Full_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] |
| `Isara_Anywhere_Complete_Diagram.drawio` | [ ] | [ ] | [ ] | [ ] |
| `diagrams.drawio` | [ ] | [ ] | [ ] | [ ] |

**Screenshot evidence:** all `docs/screenshots/group-*` folders refreshed 2026-05-31; defect pack in `group-defect/`.

**v1.7.48 code verification:** gates in `reports/defect-fix/v1.7.48-final.txt`.

**v1.7.49 — Defect PDF meeting/queue items (local Docker)**

| ID | Issue | Vitest |
|----|-------|--------|
| Q1 | Accepted appointment vanishes from lists | `defectIsaraPdfMeetingQueue` DPDF-Q* |
| J1 | Patient forced to enter Jitsi name | `defectIsaraPdfMeetingQueue` DPDF-N*, `jitsiDisplayName.behavior` |
| M3 | Doctor meeting blank / not host | `meetingWorkflowHardening`, `virtualMeetingLayoutFirst`, DPDF-M* |

| Gate | Result |
|------|--------|
| `npm run test:unit:docker:deploy` | **2817** unit + **78** meeting-server contracts PASS |
| Process map | `processPageCoverage.test.ts` (16 Process pages → Vitest files) |

**Diagram labels (v1.7.49):** add `resolveMountJwt`, `includeAccepted=true`, `test:unit:docker:deploy`, Vitest **2817**.

**v1.7.50 — full process registry + Docker grouped runner**

| Gate | Result |
|------|--------|
| `npm run test:unit:docker` | **2938** Vitest PASS (167 files) |
| `npm run test:unit:docker:grouped` | Same suite, 4 memory-safe shards |
| `npm run test:unit:docker:deploy` | Stack rebuild + **2938** + **78** meeting-server contracts |
| PCOV gate | `processPageCoverage.test.ts` — 49 tests |

**Diagram labels (v1.7.50):** `processWorkflowRegistry`, `queueAcceptTraceability`, `jitsiRoleJwt`, `buildDoctorJitsiMountOptions`, Vitest **2938**, contracts **78**.
