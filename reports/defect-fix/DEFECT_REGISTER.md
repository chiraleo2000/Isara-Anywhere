# Defect Register (v1.7.48)



## Scope



- Source: `Defect หมออิสระ.pdf` (23 defects)

- Objective: map each defect to implementation file(s), regression tests, and verification status

- Language: EN/TH labels where useful for traceability



## Defect Inventory (23)



| ID | Status | Category | Defect (EN / TH) | Primary Files | Tests |

|---|---|---|---|---|---|

| G1 | Verified | Global | Localization toggle incomplete / สลับภาษาไม่ครบ | `SettingsContext.tsx`, `useSettings.tsx` | `settingsI18n.*`, `settingsI18nPlaceholders.behavior.test.ts`, `group-Defect-theme` (DT1), DA2 |

| G2 | Verified | Global | Dark mode white patches / โหมดมืดยังมีพื้นขาว | `NotificationsPage.tsx`, `LivingWillPage.tsx` | `darkModeSurfaces.behavior.test.ts`, `group-Defect-theme` (DT2–DT3) |

| G3 | Verified | Global | Unlocalized placeholders / placeholder ไม่แปล | `SettingsContext.tsx` | `settingsI18n.*`, `settingsI18nPlaceholders.behavior.test.ts`, DG1 |

| P1 | Verified | Patient | AI New Chat retains old history / แชตใหม่ไม่ล้างประวัติ | `AIDoctorPage.tsx` | `aiNewChat.behavior.test.ts`, DA1 |

| P2 | Verified | Patient | AI reply language mismatch / ภาษา AI ไม่ตรงผู้ใช้ | `AIDoctorPage.tsx`, `ai.ts` | `aiLanguagePrompt.behavior.test.ts`, DA2 |

| P3 | Verified | Patient | Notification click not routing / คลิกแจ้งเตือนไม่ไปหน้า | `NotificationBell.tsx`, `notificationRouting.ts` | `notificationBellRoute.behavior.test.ts`, DN3, DN4 |

| P4 | Verified | Patient | View-all notifications wrong route / ดูทั้งหมดไปผิดหน้า | `App.tsx`, `NotificationsPage.tsx` | `notificationsRoute.regression.test.ts`, DN1 |

| P5 | Verified | Patient | Mark-all-read resets after reload / อ่านทั้งหมดแล้วเด้งกลับ | `services.ts`, `postgresDataService.ts`, `NotificationsPage.tsx` | `notificationMarkAllRead.behavior.test.ts`, DN2, **DN5** |

| P6 | Verified | Patient | PHR profile not persisted / โปรไฟล์หายหลังล็อกอินใหม่ | `ProfilePage.tsx`, `phr.ts` | `phrProfilePersist.*`, **DP1** |

| P7 | Verified | Patient | Health library thumbnail missing / รูปปกคลังความรู้ไม่ขึ้น | `MedicalContentLibrary.tsx` | `medicalContentThumbnail.behavior.test.ts`, **DJ2** |

| P8 | Verified | Patient | Map pins inconsistent / หมุดแผนที่ไม่ครบ | `MapPage.tsx` | `mapMarkers.behavior.test.ts`, **DJ1** |

| P9 | Verified | Patient | Map facility list mismatch / รายชื่อไม่ตรงผลแผนที่ | `MapPage.tsx` | `mapMarkers.behavior.test.ts`, **DJ1** |

| P10 | Verified | Patient | Map language query missing / แผนที่ไม่ส่งภาษา | `MapPage.tsx` | `mapMarkers.behavior.test.ts`, **DJ1** |

| P11 | Verified | Patient | Living Will phone format invalid / เบอร์โทรไม่จำกัด | `pages/LivingWillPage.tsx` → `pdpa/LivingWillPage.tsx` | `livingWillInput.behavior.test.ts`, `livingWillCanonicalPath.regression.test.ts` |

| P12 | Verified | Patient | Living Will signature render quality / ลายเซ็นไม่รองรับอุปกรณ์ | `pages/LivingWillPage.tsx` → `pdpa/LivingWillPage.tsx` | `livingWillInput.behavior.test.ts`, `livingWillCanonicalPath.regression.test.ts` |

| D1 | Verified | Doctor | Notifications inconsistent / แจ้งเตือนแพทย์ไม่สม่ำเสมอ | `DoctorNotificationBell.tsx`, `postgresDataService.cjs` | `doctorNotificationNormalize.behavior.test.ts`, `notificationRowNormalize.test.ts`, group-I |

| D2 | Verified | Doctor | Schedule count mismatch / จำนวนในตารางไม่ตรงแดชบอร์ด | `CompleteSchedule.tsx`, `DoctorDashboard.tsx` | `scheduleParity.*`, `scheduleCountParity.behavior.test.ts`, group-C |

| D3 | Verified | Doctor | Gemini API not configured in cloud | `geminiClinicalService.ts`, `mainApiServer.cjs` | `geminiServerProxy.regression.test.ts`, `geminiModelConfig.regression.test.ts`, `group-Defect-gemini.ui-test.ts` (DG2/DG3) |

| D4 | Verified | Doctor | Confirm appointment no-op / ยืนยันนัดหมายไม่ทำงาน | `meetings/HealthMeeting.tsx` | `confirmAppointmentApi.*` (mocked POST), `group-Defect-appointments` (DA1–DA3) |

| D5 | Verified | Doctor | Assign appointment spinner/stuck / มอบหมายแพทย์ค้าง | `HealthMeeting.tsx` | `confirmAppointmentApi.*`, `group-Defect-appointments` |

| D6 | Verified | Doctor | GCS persistence dependency in confirm flow | `HealthMeeting.tsx` | `confirmAppointmentApi.*`, `group-Defect-appointments` |

| D7 | Verified | Doctor | Clinical resources white screen / หน้าขาวเนื้อหาคลินิก | `ClinicalResources.tsx` | `clinicalResourcesMount.behavior.test.ts`, `group-Defect-clinical` (DC1) |

| D8 | Verified | Doctor | Clinical resource create failure / สร้างเนื้อหาคลินิกล้มเหลว | `ClinicalResources.tsx` | `clinicalResourcesMount.behavior.test.ts`, `group-Defect-clinical` (DC2) |

| M2 | Verified | Meeting | Doctor join bypasses lobby admit UX | `DoctorDashboard.tsx`, `MeetingRoom.tsx` | `meetingLobbyRoute.*`, `group-Defect-meeting` (DM1, DM2) |
| M3 | Verified | Meeting | Doctor meeting blank / not host on public Jitsi | `MeetingRoom.tsx`, `VirtualMeeting.tsx`, `jitsiMeetingConfig.ts`, `resolveMeetingServerUrl.ts` | `defectIsaraPdfMeetingQueue` (DPDF-M*), `group-R-jitsi-role-permissions` (JROLE01/02), `group-E` E10c/E10j, `group-Q` Q01b |
| Q1 | Verified | Queue | Accepted appointment vanishes from traceable lists | `appointmentPoolQuery.cjs` (`assigned` in pool SQL), `mainApiServer.cjs`, `appointment-pool.ts`, `HealthMeeting.tsx` | `defectIsaraPdfMeetingQueue` (DPDF-Q*, DPDF-Q1b), `group-D` D4a-t, `group-D-queue-accept-traceability` |
| J1 | Verified | Meeting | Patient forced to enter Jitsi display name | `PatientMeetingRoom.tsx`, `jitsiMeetingConfig.ts`, `resolveMeetingServerUrl.ts` | `defectIsaraPdfMeetingQueue` (DPDF-N*), `group-J-patient-jitsi-prejoin` (JPRE01), `group-E` E10d |



## Coverage Notes



- **Local gate 2026-06-08 (calendar + 3-party + zero-skip):** Unit **2982/2982** PASS; Playwright D→D-doctor-host→Q→E→F→L **35 passed, 0 skipped** (exit 0); `group-J` + `group-R` **16/16** PASS; `test:quality:gate` PASS (`sonar:lint` 0 errors). Key fixes: L1 obtains doctor JWT via login API (no `DOCTOR_API_TOKEN` skip); confirm API emits `calendarEventUrl` + doctor `schedule_entry_ready` notification; doctor `CompleteSchedule` maps `confirmed_date`/`doctor_id` + month dots; patient `MiniCalendar` appointment days + detail calendar link; Q01f 3-party hold (doctor+patient+guest, 10s media); D4cal schedule + notification calendar asserts.
- **Local gate 2026-06-08 (E2 + Defect PDF Q1/J1/M3):** Unit **2974/2974** PASS; Playwright pipeline D→Q→E→F→L **34 passed, 1 skipped** (exit 0); `group-J-patient-jitsi-prejoin` **14/14**; `group-R-jitsi-role-permissions` **2/2**; `test:security-hardening` + `test:meeting-server:contract` PASS; `sonar:lint` PASS (0 errors). Key fixes: E10j guest 401 without invite / 200 with invite; `assigned` pool status; `host.docker.internal`→`localhost:3020` browser proxy; guest lobby join requires invite token.
- v1.7.49: Defect PDF items 1–3 (queue traceability, patient auto Jitsi name, doctor host join) — `defectIsaraPdfMeetingQueue.test.ts`, `processPageCoverage.test.ts`, Docker `test:unit:docker:deploy` pipeline; see `npm run test:unit:docker:deploy`.
- v1.7.52 (2026-06-09): Test hardening gate — Vitest **3037/3037** host; `test:quality:gate` PASS (0 Sonar errors); new packs GSUM/MRV/EPH/TPL/AUTH/CAL; `test:cloud:unit-gate` PASS (smoke 3/3 + GATE0 G1–G5); deploy tag `v1.7.52-test-hardening`. Local Docker E2E deferred (Docker daemon offline on gate host).
- v1.7.48: Re-audit 2026-05-30; Sonar clinical TSX extraction (EmrEditorChrome, PrescribingModalChrome, LiveTranscriptionView); MeetingResults ValidationAction; Python ROLE_* constants; **36/36** Defect-regression cloud PASS; test:quality:gate **2736** unit PASS; see `v1.7.48-final.txt` and `pdf-reaudit-v1.7.48.txt`.
- v1.7.47: Final PDF re-audit; test:quality:gate 2731 unit PASS; Defect-regression **36 passed, 0 skipped**; test:cloud:full **85 passed**; doctor portal rev 00150 (meeting results proxy); meeting server reopen fix; see `v1.7.47-final.txt` and `pdf-reaudit-v1.7.47.txt`.
- v1.7.46: Auth fix (izara_user); cloud STT secrets; Q/E meeting chain; 85/85 full cloud; see `v1.7.46-final.txt`.
- v1.7.45: Sonar S1874/S6594 fixes; S6747 suppressions; Playwright DN5/DP1/DJ1–DJ2; DOCX/PPTX/PDF + draw.io §9; 2731 unit tests; Defect-regression 34 passed (2 skip); see `v1.7.45-final.txt`.
- v1.7.44: Behavioral test depth + Playwright defect suites (theme, appointments, clinical); mocked fetch regression upgrades; Sonar residuals; 2731 unit tests; 31/31 defect Playwright pass (1 skip); see `v1.7.44-final.txt`.
- v1.7.43: Full reset pass — LivingWill canonical re-export (`pages/` → `pdpa/`), `riskToString` S6551 fix, orphan `map/MapPage` removed, auto traffic shift post-deploy; 2718 unit tests; see `v1.7.43-final.txt`.
- v1.7.42: Gemini 3.1-flash-lite migration; D3 UI regression (`group-Defect-gemini`); 2709 unit tests; deploy tag v1.7.42.

- v1.7.41: Sonar S4325/S5725 clearance + 4 new behavioral Vitest files (2698 unit tests).

- Evidence: `reports/defect-fix/v1.7.41-final.txt`, `Documents/docs/markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md`


