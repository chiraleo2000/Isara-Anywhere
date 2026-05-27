# Step 2 Fix Log

| File / area | Symptom | Fix |
|-------------|---------|-----|
| `package.json` | `test:unit:wave2/3/4` failed on Windows (`vitest` not on PATH) | Use `npx vitest run` like other unit scripts |
| `tests/helpers/multi-portal.ts` | A2b failed on `/register` — `assertNotLogin` treated public register as auth failure | Allow `/login`, `/register`, `/reset-password` pathname in `assertNotLogin` |
| `tests/group-A-auth-access.ui-test.ts` | A2b used authenticated fixture — `/register` redirected to dashboard | Use fresh `browser.newContext()`; assert `#register-email` and reset-password shell text |

No runtime portal/server changes required for gate green. **Redeploy skipped** (no Cloud Run image changes).

Commit at Step 1 gate: see `step1-summary.txt` first line.
