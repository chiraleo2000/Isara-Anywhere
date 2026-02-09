# Map & Nearby Healthcare Features

**Version:** 1.0.0  
**Last Updated:** February 9, 2026  
**Status:** ✅ Phase 1 Implementation Complete

---

## 1. Overview

The Map & Nearby Healthcare feature provides patients with an interactive map interface to discover hospitals, clinics, pharmacies, and other healthcare facilities near their location. Built using Google Maps integration within the Patient Portal SPA.

---

## 2. Feature Summary

| Feature | Description | Status |
|---------|-------------|--------|
| **Interactive Map** | Google Maps-based facility finder | ✅ |
| **GPS Location** | Auto-detect patient location | ✅ |
| **Facility Search** | Search hospitals, clinics, pharmacies | ✅ |
| **MiniMapWidget** | Dashboard widget showing nearby facilities | ✅ |
| **Responsive Layout** | Mobile-first responsive map interface | ✅ |

---

## 3. Architecture

### 3.1 Components

| Component | File | Purpose |
|-----------|------|---------|
| `MapPage` | `src/pages/map/MapPage.tsx` | Full-page map with search and facility list |
| `MiniMapWidget` | `src/components/map/MiniMapWidget.tsx` | Dashboard widget for quick access |

### 3.2 Route

- **Patient Portal:** `/map` → `MapPage.tsx`
- **Dashboard Widget:** Embedded `MiniMapWidget` in patient dashboard

### 3.3 API Dependencies

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Patient Portal Health | `GET /api/health` | Verify service availability |
| Google Maps API | External | Map rendering, geocoding, Places |

---

## 4. User Workflows

### 4.1 Patient Views Map Page

1. Patient navigates to `/map` from main navigation
2. Browser requests geolocation permission
3. Map centers on patient's current location
4. Nearby healthcare facilities are displayed as markers
5. Patient can click markers for facility details

### 4.2 Patient Searches for Facility

1. Patient types facility name or type in search bar
2. Map updates with matching results
3. Results list shows distance, hours, and ratings
4. Patient can get directions to selected facility

### 4.3 Dashboard Widget

1. Patient sees `MiniMapWidget` on dashboard
2. Widget shows 3-5 nearest facilities
3. Clicking widget navigates to full `/map` page

---

## 5. Testing Coverage

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| N1 | Patient portal serves `/map` route | HTTP 200, SPA renders |
| N2 | Maps config via health endpoint | HTTP 200 |
| N3 | Map page renders with valid title | Page has truthy title |

---

## 6. Technical Notes

- Map uses SPA routing — all `/map` requests serve `index.html`
- Google Maps API key configured via environment variables
- MiniMapWidget uses lazy loading for performance
- Facility data sourced from Google Places API (no local DB dependency)
- Mobile-responsive with touch-friendly controls
