# Izara Doctor Portal — Architecture

## Layout

```
Isara-doctor-portal/
├── backend/     # Node.js API (CommonJS) — auth :3011, main API :3009
├── frontend/    # Vite + React SPA (port 3010)
├── public/      # Static assets served by nginx in Docker
└── scripts/     # Seed and env helpers
```

## Backend

- Entry: `backend/startAll.cjs` (auth + main API)
- Meeting BFF proxies: `backend/routes/meetings.cjs`
- Data: `backend/services/postgresDataService.cjs`

## Frontend

- Entry: `frontend/index.html` → `frontend/index.tsx` → `frontend/App.tsx`
- Path alias: `@` → `frontend/`
- Meeting UI: `frontend/pages/meetings/`

## Docker

- Unified image: `Dockerfile.unified` (nginx + Node backends)
- Build: `npm run build` (Vite → `dist/`)
