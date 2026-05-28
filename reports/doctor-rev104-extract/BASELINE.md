# Doctor Portal Rev 00104 Baseline

Generated: 2026-05-28

## Cloud Run traffic

- Service: `izara-doctor-portal-dev-testing`
- **100% traffic:** `izara-doctor-portal-dev-testing-00104-7zj`
- Image digest: `sha256:406d261687e02d29f9190479729def3050f6459501298c33a0a654deced26c1b`

## Auth probe (cloud)

| Request | HTTP | Result |
|---------|------|--------|
| POST `/auth/login` (valid JSON file, demo doctor) | 200 | `success: true`, JWT returned |
| POST `/auth/login` (with browser userAgent) | 200 | `success: true` |
| POST `/auth/login` (malformed inline JSON) | 400 | `INTERNAL_ERROR` (express JSON parse) |

## Conclusion

Revision **00104 auth server is healthy** for valid login payloads.

**Regression (rev 00133+):** `app.use(sanitizeRequestBody)` mounted the middleware factory without `()`, so Express never called `next()` and `/auth/login` hung until nginx returned 504 HTML (client showed "not valid JSON").

**Fix deployed:** `v1.7.36-doctor-sanitize-fix` → `izara-doctor-portal-dev-testing-00136-n8t` (100% traffic). Doctor/admin login ~200 in under 600ms (2026-05-28).
