# Isara Patient Portal — API Overview

**Base URL:** `http://localhost:3005`  
**Health:** `GET /health`

Primary routes under `/api`. Full OpenAPI-style detail lives in backend source and platform `Processes/` workflow docs.

## Auth

JWT/session alignment with platform `shared/corsPolicy.cjs` (vendored in `shared/` for standalone builds).
