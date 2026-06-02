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

## Documentation

- `Processes/TWO_ROUND_CLOUD_TESTING.md` — orchestrator + ledger + Group Q assertions + cleanup
- `Processes/FULL_WORKFLOW_CONTRACT.md` — ledger evidence requirement
- `tests/SELECTORS.md` — meeting selector registry (Group Q)
- User guides: `python scripts/build-portal-user-guides.py` (TH Sarabun New 16 pt / FC Iconic)

## Residual notes

1. **Deploy** — Meeting BYTEA + portal recording-order fixes require `npm run cloud:deploy` before cloud Q02 passes against live code.
2. **Headed browsers** — Default `Workers=1` in hardening script avoids parallel headed launch failures on Windows.
3. **gate0** — API chain may fail while UI pipeline passes; both are logged in the ledger.
