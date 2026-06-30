# Reports index (Izara Anywhere)

**Last updated:** 2026-06-30 · **Release:** v1.7.54

Canonical test evidence lives here. Regenerate with phase gates and `npm run ledger:local`. Prune stale runs: `npm run cleanup:project`.

---

## Sign-off & checklists

| Report | Purpose |
|--------|---------|
| [signoff/round6-local-lan-signoff-2026-06-30.md](signoff/round6-local-lan-signoff-2026-06-30.md) | Local + LAN + Jitsi sign-off (Round 6) |
| [zero-defect-checklist-2026-06-30.md](zero-defect-checklist-2026-06-30.md) | Pre-release zero-defect matrix |
| [cost-baseline-cloud-2026-06-30.md](cost-baseline-cloud-2026-06-30.md) | Cloud Run cost-opt baseline (min=0, max=2) |

---

## Error ledgers (`local-error-ledger/`)

Use **`*-latest.json`** only. Timestamped `round-*-20*.json` files are removed by `npm run cleanup:project`.

| File | Round | Meaning |
|------|-------|---------|
| `round-9-latest.json` | 9 | Full local pre-deploy gate |
| `round-lan-latest.json` | lan | LAN deploy gate evidence |
| `round-jitsi-local-latest.json` | jitsi-local | Self-hosted Jitsi on localhost |
| `round-jitsi-lan-latest.json` | jitsi-lan | Self-hosted Jitsi on Ubuntu LAN |
| `round-1-latest.json` … `round-7-latest.json` | 1–7 | Per-phase merge gates |

Regenerate: `npm run ledger:local -- --round <name>`

---

## Quality & security baselines

| Report | Purpose |
|--------|---------|
| [defect-fix/scan-baseline-2026-06-30.md](defect-fix/scan-baseline-2026-06-30.md) | Day-1 security + lint baseline |
| [defect-fix/DEFECT_REGISTER.md](defect-fix/DEFECT_REGISTER.md) | Open/closed defect register |
| [unit-gap-matrix.md](unit-gap-matrix.md) | Unit test coverage gaps |
| [screenshot-process-matrix.md](screenshot-process-matrix.md) | Screenshot → Process doc mapping |
| [security/scan-summary.json](security/scan-summary.json) | CVE-lite / security scan summary |
| [sonar/quality-gate-summary.json](sonar/quality-gate-summary.json) | Sonar lint gate |

---

## Cloud ledgers

| Path | Purpose |
|------|---------|
| `cloud-error-ledger/round-final-latest.json` | Latest cloud E2E ledger |

---

## Defect-fix archive

Historical gate failures and remediation notes: [defect-fix/](defect-fix/).  
LAN deferral (resolved 2026-06-30): [defect-fix/lan-gate-deferred-2026-06-26.md](defect-fix/lan-gate-deferred-2026-06-26.md).

---

## Do not commit

- `*.log` gate run logs (gitignored; pruned by cleanup)
- Root `*_ERROR_LEDGER_ROUND*.md` (use JSON ledgers instead)
- Live Postgres bind-mount under `data/postgres/`
