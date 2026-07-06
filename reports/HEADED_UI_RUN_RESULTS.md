# Headed UI Test Run — Results (2026-07-02)

**Status: PASS** · Headed browsers visible (`PW_HEADED=1`) · Screenshots captured (`BASELINE_VISUAL=1`) · Chrome-safe (`PW_NO_CHROME=1`)

## Run summary

| Item | Value |
|------|-------|
| Gate | `test:local:gate-parallel-resume` from `e2e-full-headed` |
| Workers | `PW_WORKERS=2` (stable headed UI) |
| Duration | ~16 min (headed E2E + screenshot audits) |
| Ledger | **P0=0** — `reports/local-error-ledger/round-9-latest.json` |
| Full log | `reports/headed-ui-rerun-final.log` |

## Where to see UI screenshots

Open these folders in File Explorer:

| Workflow | Folder |
|----------|--------|
| Auth / dashboards | `docs/screenshots/group-A/` |
| Patient portal | `docs/screenshots/group-B/` |
| Doctor portal | `docs/screenshots/group-C/` |
| Appointments | `docs/screenshots/group-D/` |
| Meeting / clinical | `docs/screenshots/group-E/` |
| PHR / health records | `docs/screenshots/group-F/` |
| Jitsi meeting lifecycle | `docs/screenshots/group-Q/` |
| Post-meeting AI | `docs/screenshots/group-Q2/` |
| Responsive (phone/tablet) | `docs/screenshots/group-S/` |
| Live capture (this run) | `test-results/pre-debug/` |

**Example files to open:**

- `docs/screenshots/group-A/A01-patient-dashboard.png`
- `docs/screenshots/group-A/A01-doctor-dashboard.png`
- `docs/screenshots/group-Q/Q01b-doctor-host-jitsi.png`
- `docs/screenshots/group-Q/Q01c-patient-lobby-waiting.png`
- `docs/screenshots/group-D/D03-booking-wizard.png`

## Interactive Playwright report

```powershell
npx playwright show-report
```

Opens **http://localhost:9323** — every test with pass/fail and screenshot attachments.

## Screenshot quality audits

- `reports/screenshot-audit-latest.json` — per-group uniqueness (pass)
- `reports/screenshot-global-audit-latest.json` — 260 PNGs, no cross-group duplicates (pass)
- `reports/defect-fix/scan-baseline-2026-06-10.md` — gate step table (all PASS)

## Updated guides (Thai)

- `Documents/docs/guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx`
- `Documents/docs/guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx`
- `Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx`
- `Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.docx`

## Re-run command (headed UI + screenshots)

```powershell
$env:PW_HEADED='1'
$env:BASELINE_VISUAL='1'
$env:PW_NO_CHROME='1'
$env:GATE_SKIP_DOCKER_BUILD='1'
$env:GATE_FROM_STEP='e2e-full-headed'
$env:PW_WORKERS='2'
npm run test:local:gate-parallel-resume
npm run docs:evidence:local
npm run ledger:local -- --round 9
npx playwright show-report
```
