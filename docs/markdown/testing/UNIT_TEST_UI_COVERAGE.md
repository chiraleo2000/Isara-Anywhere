# Unit Test + UI Screenshot Coverage — v1.7.61

> Generated: 2026-07-16T06:26:59.361Z | Full run log: [reports/unit/v1.7.37-full-unit-run.log](../reports/unit/v1.7.37-full-unit-run.log)

## Summary

| Metric | Value |
|--------|-------|
| Unit test files passed | 286 |
| Unit tests passed | 3657 |
| Run status | PASS |
| UI screenshot folders | 20 |
| UI PNG artifacts | 427 |
| Cloud gate UI (A + 7 viewports) | 41 Playwright tests |
| Sonar / quality | `npm run sonar:lint` |

## Unit domain → UI proof mapping

Vitest validates logic in isolation; Playwright screenshots prove the same flows on cloud UI.

| Unit domain | Vitest scope | UI screenshot folders |
|-------------|--------------|------------------------|
| **auth** | doctor-portal/auth*, patient-portal/auth* | group-A, sso (15 PNG) |
| **appointments** | *appointment*, *queue*, *book* | group-D (32 PNG) |
| **clinical** | *emr*, *phr*, *prescri*, *lab*, *pdpa* | group-F, group-G (45 PNG) |
| **meeting** | meeting-server/*, *meeting*, *jitsi* | group-E, group-J-meeting-jitsi, group-Q (47 PNG) |
| **security** | *owasp*, *sanitize*, *jwt*, security/* | group-A (11 PNG) |
| **responsive** | *responsive*, layout* | group-S (8 PNG) |
| **ai** | *ai*, *gemini* | group-J, group-H (31 PNG) |
| **admin** | *admin* | group-C, group-I (30 PNG) |

## Gate screenshots (cloud verification)

### group-A

- ![A01 admin dashboard](../docs/screenshots/group-A/A01-admin-dashboard.png)
- ![A01 doctor dashboard](../docs/screenshots/group-A/A01-doctor-dashboard.png)
- ![A01 patient dashboard](../docs/screenshots/group-A/A01-patient-dashboard.png)
- ![A02 patient sidebar](../docs/screenshots/group-A/A02-patient-sidebar.png)
- ![A03 doctor sidebar](../docs/screenshots/group-A/A03-doctor-sidebar.png)
- ![A04 admin sidebar](../docs/screenshots/group-A/A04-admin-sidebar.png)
- ![A07 role isolation](../docs/screenshots/group-A/A07-role-isolation.png)
- ![A09 doctor kpi](../docs/screenshots/group-A/A09-doctor-kpi.png)
- ![A09 doctor stats](../docs/screenshots/group-A/A09-doctor-stats.png)
- ![A09 patient stats](../docs/screenshots/group-A/A09-patient-stats.png)
- ![A2b auth registration](../docs/screenshots/group-A/A2b-auth-registration.png)

### group-S

- ![S01 patient dashboard](../docs/screenshots/group-S/S01-patient-dashboard.png)
- ![S02 doctor dashboard](../docs/screenshots/group-S/S02-doctor-dashboard.png)
- ![S03 patient deep routes](../docs/screenshots/group-S/S03-patient-deep-routes.png)
- ![S04 doctor deep views](../docs/screenshots/group-S/S04-doctor-deep-views.png)
- ![S05 patient appointments](../docs/screenshots/group-S/S05-patient-appointments.png)
- ![S06 patient meeting route](../docs/screenshots/group-S/S06-patient-meeting-route.png)
- ![S07 patient emr surface](../docs/screenshots/group-S/S07-patient-emr-surface.png)
- ![S08 patient meeting in call](../docs/screenshots/group-S/S08-patient-meeting-in-call.png)

## Sample workflow screenshots

### workflows/auth-login

- ![auth-login/WF01-patient-login-page.png](../docs/screenshots/workflows/auth-login/WF01-patient-login-page.png)
- ![auth-login/WF02-patient-dashboard-after-login.png](../docs/screenshots/workflows/auth-login/WF02-patient-dashboard-after-login.png)
- ![auth-login/WF02-patient-login-filled.png](../docs/screenshots/workflows/auth-login/WF02-patient-login-filled.png)
- ![auth-login/WF03-patient-dashboard.png](../docs/screenshots/workflows/auth-login/WF03-patient-dashboard.png)
- ![auth-login/WF08-doctor-login-page.png](../docs/screenshots/workflows/auth-login/WF08-doctor-login-page.png)
- ![auth-login/WF09-doctor-dashboard.png](../docs/screenshots/workflows/auth-login/WF09-doctor-dashboard.png)

### workflows/appointment-lifecycle

- ![appointment-lifecycle/WF04-patient-appointments-empty.png](../docs/screenshots/workflows/appointment-lifecycle/WF04-patient-appointments-empty.png)
- ![appointment-lifecycle/WF05-book-appointment-step1.png](../docs/screenshots/workflows/appointment-lifecycle/WF05-book-appointment-step1.png)
- ![appointment-lifecycle/WF10-appointment-management-pool.png](../docs/screenshots/workflows/appointment-lifecycle/WF10-appointment-management-pool.png)
- ![appointment-lifecycle/WF11-appointment-confirmed.png](../docs/screenshots/workflows/appointment-lifecycle/WF11-appointment-confirmed.png)
- ![appointment-lifecycle/WF12-health-meeting-queue.png](../docs/screenshots/workflows/appointment-lifecycle/WF12-health-meeting-queue.png)
- ![appointment-lifecycle/WF12b-doctor-notifications.png](../docs/screenshots/workflows/appointment-lifecycle/WF12b-doctor-notifications.png)

## Commands

```powershell
npm run test:unit
npm run test:unit:report
npm run test:gate:ui-showup
npm run test:cloud:unit-gate
```
