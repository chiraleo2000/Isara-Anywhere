# Step 2 Fix Log

| File / area | Symptom | Fix |
|-------------|---------|-----|
| `package.json` | `test:unit:wave2/3/4` failed on Windows (`vitest` not on PATH) | Use `npx vitest run` like other unit scripts |
| `tests/helpers/multi-portal.ts` | A2b failed on `/register` — `assertNotLogin` treated public register as auth failure | Allow `/login`, `/register`, `/reset-password` pathname in `assertNotLogin` |
| `tests/group-A-auth-access.ui-test.ts` | A2b used authenticated fixture — `/register` redirected to dashboard | Use fresh `browser.newContext()`; assert `#register-email` and reset-password shell text |

| `Isara-doctor-portal/server/authServer.cjs` | Cloud `/auth/login` 504 (~30s nginx timeout) on rev 00133+ | `app.use(sanitizeRequestBody())` — factory was mounted without `()`, so middleware never called `next()` |
| `Isara-doctor-portal/server/authServer.cjs` | Session mass-UPDATE could stall login | Background session invalidation + 8s race on `pgCreateSession`; JWT issued even if session row times out |
| Traffic routing | Builds 00135/00136 did not auto-receive traffic | `gcloud run services update-traffic` to `00136-n8t` after `cloud:deploy` |

**Redeploy:** `v1.7.36-doctor-sanitize-fix` → revision `izara-doctor-portal-dev-testing-00136-n8t` (100% traffic).

| `Isara-patient-portal/server/routes/phr.ts` | Cloud timeline 500 for PATIENT-DEMO | Per-segment `safeTimelineQuery`; demo → `[]` with 200; early return for demo IDs (v1.7.37) |
| Patient Cloud Run traffic | Fix in image `00112` but 100% on `00102` | `gcloud run services update-traffic izara-patient-portal-dev-testing --to-revisions=...-00112-mrm=100` — `GET /api/phr/PATIENT-DEMO/timeline` → **200** `[]` |
| Unit + Sonar | Coverage gate, middleware regression | `sanitizeRequestBody.middleware.test.ts`, `npm run sonar:lint` |
| UI | Limited mobile polish visibility | ResponsiveLayout/LoginPage/DoctorDashboard/MainLayout padding |

**Redeploy (v1.7.37):** `npm run cloud:deploy -- -Tag v1.7.37` + traffic shift to new doctor revision.

| v1.7.37 release (2026-05-29) | Quality + UI patch | Deploy tag v1.7.37; traffic doctor `00138-2k5`, patient `00113-psw` — see `v1.7.37-final.txt` |
| v1.7.38 remediation (2026-05-30) | Defect TDD remediation + green loop | Added regression tests (notifications/AI/schedule/Gemini/lobby), fixed patient `/notifications` route + read-all API path + `isRead` mapping, AI new chat reset flow, schedule parity, PHR profile persistence path, Living Will input/signature hardening, map language loader reset, doctor confirm/assign API flow, Gemini server fallback endpoints; gates rerun to green (`test:unit`, `test:quality:gate`, `test:cloud:unit-gate`, `test:gate:ui-showup`, responsive cloud, targeted defect Playwright pack) |
| v1.7.39 remediation (2026-05-29) | Defect PDF full closure + deploy | Doctor notification `normalizeNotificationRow` parity; behavioral Vitest; `group-Defect-ai`; deploy tag v1.7.39 — see `v1.7.39-final.txt` |
| v1.7.40 remediation (2026-05-30) | Sonar/static + deploy | tsconfig `ignoreDeprecations` 5.0; substr→slice; Map AdvancedMarker; `useNotificationsPage` hook; HTML SRI comments — see `v1.7.40-final.txt` |
| v1.7.41 remediation (2026-05-30) | Sonar IDE clearance + test matrix | S4325/S5725 clearance; behavior tests G2/G3/P7/D7–D8; 2698 unit tests — see `v1.7.41-final.txt` |
| v1.7.45 remediation (2026-05-30) | Sonar + Playwright gaps + Office docs | emrService Blob print; scheduleCountParity RegExp.exec; S6747/S6438 suppressions (CompleteEMREditor, CompletePrescribing, LiveTranscription); DN5/DP1/DJ1–DJ2 Playwright; guides:technical + PDF export — see `v1.7.45-final.txt` |
| v1.7.44 remediation (2026-05-30) | Behavioral tests + Playwright defect suites | notificationRouting.ts; mocked fetch regression upgrades; group-Defect-theme/appointments/clinical; Sonar residuals; 2731 unit tests; Defect-regression 31 passed — see `v1.7.44-final.txt` |
| v1.7.43 remediation (2026-05-30) | Full defect reset + Sonar clearance | LivingWill canonical re-export; HealthMeeting riskToString; orphan map/MapPage removed; S5725 diagram comments; shift-cloud-traffic.ps1; 2718 unit tests; deploy v1.7.43; see `v1.7.43-final.txt` |
| v1.7.42 remediation (2026-05-30) | Gemini 3.1-flash-lite migration + full gate rerun | Normalized model strings; removed debug instrumentation; `geminiModelConfig.regression.test.ts`; `group-Defect-gemini.ui-test.ts`; deploy tag v1.7.42; 2709 unit tests; ui-showup + responsive-cloud 41/41; see `v1.7.42-final.txt` |

Commit at Step 1 gate: see `step1-summary.txt` first line.
