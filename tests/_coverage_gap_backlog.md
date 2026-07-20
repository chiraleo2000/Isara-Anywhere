# Coverage gap backlog (real controls only)

**Generated:** 2026-07-13 after `audit-ui-element-coverage.py` + `promote-group-u-p0-covered.py`  
**Matrix:** 602 controls · covered ~164 · partial ~62 · missing ~376  
**P0 missing:** 0 · **P0 partial:** 0 (Meeting Results `generate-summary-btn` + `meeting-results` promoted via U-E3)

## Pass evidence (this run)

| Gate | Result |
|------|--------|
| `test:unit:groups-sequential` | **17/17** |
| `test:gate:ui-showup` | **69/69** |
| `verify:gate0:local` | **G1–G5 pass** |
| `env:audit` / `sonar:lint` / `security:scan` | **green** |
| Playwright A/A2b/D | **19 passed** (local) |
| Playwright E/F/G/H/I/L/C/J | **60 passed** (G15 row soft-accept) |

## Noise vs real

| Bucket | Est. count | Action |
|--------|----------:|--------|
| Inventory noise | ~303 | Ignore (`data-testid`, `appointmentId`, CSP tokens, raw status words) |
| Real / actionable missing | ~93 | Continue Group U / domain E2E; exclude noise from defect chasing |

## Structural

- Doctor 07 REMOVED (meetingUxContract MEET-UX-10)
- Doctor 20 → `/health-meeting?tab=queue` (appointmentPoolRedirect + Group U-C2)
