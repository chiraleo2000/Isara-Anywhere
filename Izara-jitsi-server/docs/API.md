# Izara Meeting Server — API Overview

**Base URL:** `http://localhost:3020`  
**Health:** `GET /health`

Primary routes under `/api/meeting`. Full OpenAPI-style detail lives in backend source and platform `Processes/` workflow docs.

## Auth

JWT/session alignment with platform `shared/corsPolicy.cjs` (vendored in `shared/` for standalone builds).
