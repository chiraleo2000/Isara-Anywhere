# Unit Test + UI Screenshot Coverage — v1.7.37

> Generated: 2026-05-28T16:23:41.340Z | Full run log: [reports/unit/v1.7.37-full-unit-run.log](../reports/unit/v1.7.37-full-unit-run.log)

## Summary

| Metric | Value |
|--------|-------|
| Unit test files passed | 114 |
| Unit tests passed | 2646 |
| Run status | PASS |
| UI screenshot folders | 15 |
| UI PNG artifacts | 188 |
| Cloud gate UI (A + 7 viewports) | 41 Playwright tests |
| Sonar / quality | `npm run sonar:lint` |

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
| **admin** | *admin* | group-C, group-I (27 PNG) |

## Gate screenshots (cloud verification)

### group-A

- ![A01 admin dashboard](../docs/screenshots/group-A/A01-admin-dashboard.png)
- ![A01 doctor dashboard](../docs/screenshots/group-A/A01-doctor-dashboard.png)
- ![A01 patient dashboard](../docs/screenshots/group-A/A01-patient-dashboard.png)
- ![A02 patient sidebar](../docs/screenshots/group-A/A02-patient-sidebar.png)
- ![A03 doctor sidebar](../docs/screenshots/group-A/A03-doctor-sidebar.png)
- ![A04 admin sidebar](../docs/screenshots/group-A/A04-admin-sidebar.png)
- ![A07 role isolation](../docs/screenshots/group-A/A07-role-isolation.png)
- ![A09 doctor stats](../docs/screenshots/group-A/A09-doctor-stats.png)
- ![A09 patient stats](../docs/screenshots/group-A/A09-patient-stats.png)
- ![A2b auth registration](../docs/screenshots/group-A/A2b-auth-registration.png)

### group-S

- ![S01 patient dashboard](../docs/screenshots/group-S/S01-patient-dashboard.png)
- ![S02 doctor dashboard](../docs/screenshots/group-S/S02-doctor-dashboard.png)
- ![S03 patient deep routes](../docs/screenshots/group-S/S03-patient-deep-routes.png)
- ![S04 doctor deep views](../docs/screenshots/group-S/S04-doctor-deep-views.png)

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
