# Unit Test + UI Screenshot Coverage — v1.7.48

> Generated: 2026-05-31 | Defect track: [v1.7.48-final.txt](../reports/defect-fix/v1.7.48-final.txt) | Unit log: [reports/unit/v1.7.37-full-unit-run.log](../reports/unit/v1.7.37-full-unit-run.log)

## Summary

| Metric | Value |
|--------|-------|
| Unit test files passed | 151 |
| Unit tests passed | 2736 |
| Run status | PASS |
| UI screenshot folders | 16 |
| UI PNG artifacts | 212 |
| Defect-regression Playwright (cloud) | **36 passed, 0 skipped** (2026-05-30) |
| Full cloud Playwright (headed) | **85 passed, 0 skipped** (2026-05-31, 7.7m) |
| Cloud gate UI (A + 7 viewports) | 41 Playwright tests |
| Sonar / quality | `npm run test:quality:gate` PASS |
| User guides regenerated | Patient 76 imgs / Doctor 93 imgs (2026-05-31) |

## Defect Regression Pack (v1.7.48)

- `tests/unit/cross-portal/clinicalComponentStructure.regression.test.ts` — EmrEditorChrome / PrescribingModalChrome / LiveTranscriptionView extraction; ValidationAction; Python ROLE_* constants
- Cloud Defect-regression: **36/36** PASS (2026-05-30)
- Cloud full headed: **85/85** PASS (2026-05-31) — groups A–P, screenshots → `Documents/docs/screenshots/`

## Unit domain → UI proof mapping

Vitest validates logic in isolation; Playwright screenshots prove the same flows on cloud UI.

| Unit domain | Vitest scope | UI screenshot folders |
|-------------|--------------|------------------------|
| **auth** | doctor-portal/auth*, patient-portal/auth* | group-A, sso (14 PNG) |
| **appointments** | *appointment*, *queue*, *book* | group-D (29 PNG) |
| **clinical** | *emr*, *phr*, *prescri*, *lab*, *pdpa* | group-F, group-G (28 PNG) |
| **meeting** | meeting-server/*, *meeting*, *jitsi* | group-E, group-J-meeting-jitsi, group-Q (31 PNG) |
| **security** | *owasp*, *sanitize*, *jwt*, security/* | group-A (10 PNG) |
| **responsive** | *responsive*, layout* | group-S (4 PNG) |
| **ai** | *ai*, *gemini* | group-J, group-H (26 PNG) |
| **admin** | *admin* | group-C, group-I (28 PNG) |
| **defects** | defectRegisterCoverage, clinicalComponentStructure | group-defect (see defect pack) |

## Gate screenshots (cloud verification)

### group-A

- ![A01 admin dashboard](../Documents/docs/screenshots/group-A/A01-admin-dashboard.png)
- ![A01 doctor dashboard](../Documents/docs/screenshots/group-A/A01-doctor-dashboard.png)
- ![A01 patient dashboard](../Documents/docs/screenshots/group-A/A01-patient-dashboard.png)
- ![A02 patient sidebar](../Documents/docs/screenshots/group-A/A02-patient-sidebar.png)
- ![A03 doctor sidebar](../Documents/docs/screenshots/group-A/A03-doctor-sidebar.png)
- ![A04 admin sidebar](../Documents/docs/screenshots/group-A/A04-admin-sidebar.png)
- ![A07 role isolation](../Documents/docs/screenshots/group-A/A07-role-isolation.png)
- ![A09 doctor stats](../Documents/docs/screenshots/group-A/A09-doctor-stats.png)
- ![A09 patient stats](../Documents/docs/screenshots/group-A/A09-patient-stats.png)
- ![A2b auth registration](../Documents/docs/screenshots/group-A/A2b-auth-registration.png)

### group-S

- ![S01 patient dashboard](../Documents/docs/screenshots/group-S/S01-patient-dashboard.png)
- ![S02 doctor dashboard](../Documents/docs/screenshots/group-S/S02-doctor-dashboard.png)
- ![S03 patient deep routes](../Documents/docs/screenshots/group-S/S03-patient-deep-routes.png)
- ![S04 doctor deep views](../Documents/docs/screenshots/group-S/S04-doctor-deep-views.png)

## Sample workflow screenshots

### workflows/auth-login

- ![auth-login/WF01-patient-login-page.png](../Documents/docs/screenshots/workflows/auth-login/WF01-patient-login-page.png)
- ![auth-login/WF02-patient-dashboard-after-login.png](../Documents/docs/screenshots/workflows/auth-login/WF02-patient-dashboard-after-login.png)
- ![auth-login/WF02-patient-login-filled.png](../Documents/docs/screenshots/workflows/auth-login/WF02-patient-login-filled.png)
- ![auth-login/WF03-patient-dashboard.png](../Documents/docs/screenshots/workflows/auth-login/WF03-patient-dashboard.png)
- ![auth-login/WF08-doctor-login-page.png](../Documents/docs/screenshots/workflows/auth-login/WF08-doctor-login-page.png)
- ![auth-login/WF09-doctor-dashboard.png](../Documents/docs/screenshots/workflows/auth-login/WF09-doctor-dashboard.png)

### workflows/appointment-lifecycle

- ![appointment-lifecycle/WF04-patient-appointments-empty.png](../Documents/docs/screenshots/workflows/appointment-lifecycle/WF04-patient-appointments-empty.png)
- ![appointment-lifecycle/WF05-book-appointment-step1.png](../Documents/docs/screenshots/workflows/appointment-lifecycle/WF05-book-appointment-step1.png)
- ![appointment-lifecycle/WF10-appointment-management-pool.png](../Documents/docs/screenshots/workflows/appointment-lifecycle/WF10-appointment-management-pool.png)
- ![appointment-lifecycle/WF11-appointment-confirmed.png](../Documents/docs/screenshots/workflows/appointment-lifecycle/WF11-appointment-confirmed.png)
- ![appointment-lifecycle/WF12-health-meeting-queue.png](../Documents/docs/screenshots/workflows/appointment-lifecycle/WF12-health-meeting-queue.png)
- ![appointment-lifecycle/WF12b-doctor-notifications.png](../Documents/docs/screenshots/workflows/appointment-lifecycle/WF12b-doctor-notifications.png)

## Commands

```powershell
npm run test:unit
npm run test:unit:report
npm run test:quality:gate
npm run test:cloud:full          # 85 headed tests + user guide rebuild
npm run test:gate:ui-showup
npm run test:cloud:unit-gate
```
