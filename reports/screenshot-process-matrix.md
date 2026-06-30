# Screenshot → Process doc matrix (Round 6)

Generated 2026-06-30 from `docs/screenshots/group-*/manifest.json` and Playwright group IDs.

## Validator coverage

| Playwright group | Screenshot dir | Process docs | Validator |
|------------------|----------------|--------------|-----------|
| A | group-A | Auth, dashboards, KPI | `test:screenshots:group-a` |
| B | group-B | Patient portal pages | `test:screenshots:group-b` |
| C | group-C | Doctor portal admin | `test:screenshots:group-c` |
| D | group-D | `Appointment_Workflows.md` | `test:screenshots:group-d` |
| E | group-E | `VIDEO_MEETING_JITSI_GEMINI.md`, clinical | `test:screenshots:group-e` |
| F | group-F | `Health_Records.md`, PHR | `test:screenshots:group-f` |
| G | group-G | PDPA / living will | `test:screenshots:group-g` |
| H | group-H | Content approval | `test:screenshots:group-h` |
| I | group-I | Admin pool assign | `test:screenshots:group-i` |
| J | group-J | AI Doctor, map, prejoin | `test:screenshots:group-j` |
| Q | group-Q | Meeting lifecycle, lobby≠Jitsi | `test:screenshots:group-q` |
| Q2 | group-Q2 | Post-meeting results | `test:screenshots:group-q2` |
| Defect | group-defect | Defect regression PDF | `test:screenshots:group-defect` |

## Meeting stages (lobby ≠ Jitsi)

| Stage ID | Example PNG | SHA256 rule |
|----------|-------------|-------------|
| Q01 lobby | `Q01c-patient-waiting-lobby.png` | Must differ from Jitsi mount stage |
| Q01 Jitsi | `Q01e-jitsi-mounted.png` | `JITSI_MIN_BYTES=8000` in validator |
| E10 lobby | `E10c0-patient-waiting-before-host.png` | ≠ `E10b-doctor-meeting-room.png` |
| D09 | `D09-health-meeting.png` | Queue UI distinct from in-call |

Unit enforcement: `tests/unit/cross-portal/screenshotDistinct.test.ts` (3 tests).

## Regenerate

```powershell
npm run docs:sync-screenshots
npm run test:screenshots:all
npm run test:screenshots:global
```
