# Izara Patient Portal — Architecture

## Layout

```
Isara-patient-portal/
├── backend/     # Express TypeScript API (port 3004)
├── frontend/    # Vite + React SPA (port 3005)
└── public/      # PWA manifest, service worker
```

## Backend

- Entry: `backend/index.ts`
- Meeting proxy: `backend/routes/video-meeting-proxy.ts`
- Compiled with `tsconfig.server.json`

## Frontend

- Entry: `frontend/index.html` → `frontend/main.tsx` or `index.tsx`
- Path alias: `@` → `frontend/`
- API layer: `frontend/lib/`

## Docker

- Unified image: `Dockerfile.unified`
