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

Commit at Step 1 gate: see `step1-summary.txt` first line.
