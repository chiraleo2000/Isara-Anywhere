# 🗺️ Patient Portal — Map Page (Nearby Healthcare)

**Route:** `/map`  
**Component:** `src/pages/map/MapPage.tsx`  
**Access:** 🔒 Authenticated patients  
**Thai Title:** สถานพยาบาลใกล้เคียง / Nearby Healthcare

---

## 1. Purpose

Interactive Google Maps-based healthcare facility finder showing hospitals, clinics, pharmacies, and health centers near the patient's current location.

---

## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🗺️ สถานพยาบาลใกล้เคียง (Nearby Healthcare)                        │
│                                                                     │
│  ┌── Controls ──────────────────────────────────────────────┐      │
│  │  Filter: [🏥 Hospital] [🏪 Clinic] [💊 Pharmacy] [🏢 Center] │      │
│  │  Range:  [1km] [5km] [10km] [15km] [20km]              │      │
│  │  🔍 [Search facility name/address...              ]     │      │
│  │  📍 Location accuracy: ●● High (GPS)                   │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌── Google Map ────────────────────────────────────────────┐      │
│  │                                                          │      │
│  │      🔴 Hospital A                                       │      │
│  │                  🔵 Clinic B                              │      │
│  │       ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲                                │      │
│  │      │   📍 You are here │   🟢 Pharmacy C               │      │
│  │       ╲_______________╱                                  │      │
│  │          (range circle)      🟣 Health Center D          │      │
│  │                                                          │      │
│  │  ┌─ Info Window ──────────────┐                          │      │
│  │  │ 🏥 Bangkok Hospital         │                          │      │
│  │  │ 123 Sukhumvit Rd.          │                          │      │
│  │  │ ⭐ 4.5 · 🟢 Open           │                          │      │
│  │  │ [🧭 นำทาง (Navigate)]      │                          │      │
│  │  └─────────────────────────────┘                          │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌── Facility List (scrollable) ────────────────────────────┐      │
│  │  🏥 Bangkok Hospital           2.3 km  🟢 Open  ⭐ 4.5  │      │
│  │     123 Sukhumvit Rd.                    [🧭 Navigate]  │      │
│  │  ─────────────────────────────────────────────────────   │      │
│  │  🔵 MedPark Clinic             1.1 km  🟢 Open  ⭐ 4.2  │      │
│  │     45 Silom Rd.                         [🧭 Navigate]  │      │
│  │  ─────────────────────────────────────────────────────   │      │
│  │  💊 Boots Pharmacy             0.5 km  🟢 Open  ⭐ 4.0  │      │
│  │     78 Ratchadamri Rd.                   [🧭 Navigate]  │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Facility Types

| Type | Marker Color | Icon | Thai Name |
| ---- | ------------ | ---- | --------- |
| Hospital | 🔴 Red | 🏥 | โรงพยาบาล |
| Clinic | 🔵 Blue | 🏪 | คลินิก |
| Pharmacy | 🟢 Green | 💊 | ร้านขายยา |
| Health Center | 🟣 Purple | 🏢 | ศูนย์สุขภาพ |

---

## 4. Features & Actions

### 4.1 Geolocation

| Feature | Description |
| ------- | ----------- |
| High accuracy GPS | Primary location method |
| Low accuracy fallback | If GPS unavailable |
| Default location | Bangkok (13.7563, 100.5018) if denied |
| Accuracy indicator | Badge showing GPS quality |
| Error handling | Banner when location access denied |

### 4.2 Map Controls

| Control | Description |
| ------- | ----------- |
| Facility type filters | Toggle buttons for each type |
| Range selector | 1, 5, 10, 15, 20 km radius |
| Range circle | Visual overlay showing selected radius |
| Auto-zoom | Map zooms to fit selected range |
| Search | Filter facility list by name/address |

### 4.3 Map Interactions

| Interaction | Result |
| ----------- | ------ |
| Click marker | Opens info window with facility details |
| Navigate button | Opens Google Maps directions |
| Click facility in list | Centers map on facility |

---

## 5. Facility Information

Each facility displays:

| Field | Description |
| ----- | ----------- |
| Name | Facility name |
| Type | Hospital / Clinic / Pharmacy / Health Center |
| Address | Street address |
| Distance | Calculated from user's location |
| Status | Open / Closed |
| Rating | Star rating (if available) |
| Navigate | Google Maps directions link |

---

## 6. Workflows

### Workflow 1: Find Nearby Facilities

```text
Step 1: Navigate to /map
Step 2: Browser requests geolocation permission
Step 3: If granted → Gets GPS coordinates → Shows accuracy badge
Step 4: If denied → Falls back to Bangkok default location
Step 5: Map loads with markers for nearby facilities
Step 6: Range circle drawn at default 5km radius
Step 7: Facility list populated sorted by distance
```

### Workflow 2: Filter by Type

```text
Step 1: Click facility type filter button (e.g., "Hospital")
Step 2: Only hospital markers remain on map
Step 3: Facility list filters to show only hospitals
Step 4: Click again to deselect / show all
```

### Workflow 3: Change Range

```text
Step 1: Select different range (e.g., 10km)
Step 2: Range circle expands on map
Step 3: Map auto-zooms to fit new radius
Step 4: More/fewer facilities shown based on range
Step 5: Facility list updates
```

### Workflow 4: Navigate to Facility

```text
Step 1: Click facility marker or list item
Step 2: Info window opens with details
Step 3: Click "นำทาง" (Navigate) button
Step 4: Google Maps opens with directions from current location
```

### Workflow 5: Search Facilities

```text
Step 1: Type facility name or address in search box
Step 2: Facility list filters in real-time
Step 3: Matching facilities highlighted
```

---

## 7. MiniMapWidget (Sidebar Component)

```text
┌─────────────────────┐
│  🗺️ สถานพยาบาลใกล้ │
│  🏥 🏪 💊 🏢        │
│  Tap to open map →  │
└─────────────────────┘
```

- Compact widget in sidebar showing 4 facility type icons
- Gradient background, dark mode support
- Clicking navigates to full Map page (`/map`)

---

## 8. Technical Details

| Feature | Implementation |
| ------- | -------------- |
| Map Provider | Google Maps via `@react-google-maps/api` |
| Geolocation | Browser Geolocation API |
| GPS Accuracy | High accuracy → low accuracy fallback |
| Default Location | Bangkok: 13.7563°N, 100.5018°E |
| Distance Calculation | Haversine formula |
| Marker Clustering | For dense areas |

---

## 9. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Sidebar MiniMapWidget | → | Navigates to full Map page |
| Dashboard | → | Via sidebar navigation |

---

## 10. AI Agent Improvement Opportunities

- **Smart recommendations**: AI suggest nearest facility based on patient's condition
- **Wait time predictions**: AI estimate current wait times at facilities
- **Specialty matching**: AI find facilities with specific specialists nearby
- **Emergency routing**: AI optimize route to nearest ER
- **Facility reviews**: AI summarize patient reviews/ratings
- **Operating hours**: AI-enhanced real-time open/closed status
- **Insurance matching**: AI filter by patient's insurance coverage
