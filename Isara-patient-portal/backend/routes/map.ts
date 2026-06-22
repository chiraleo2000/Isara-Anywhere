/**
 * Map Routes — Server-side nearby healthcare facility search
 * Uses OpenStreetMap Overpass API (free, no key required, global coverage)
 * Returns hospitals, clinics, pharmacies, health centers near user location
 */
import { Router, Request, Response } from 'express';

const router = Router();

// ============================================================================
// Types
// ============================================================================
interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface NearbyFacility {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'health_center';
  address: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  distance: number;
  distanceText: string;
  location: { lat: number; lng: number };
  isOpen?: boolean;
  osmId: number;
}

// ============================================================================
// Helpers
// ============================================================================
function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number, lang: string = 'th'): string {
  const smallUnit = lang === 'th' ? 'ม.' : 'm';
  const largeUnit = lang === 'th' ? 'กม.' : 'km';
  return km < 1 ? `${Math.round(km * 1000)} ${smallUnit}` : `${km.toFixed(1)} ${largeUnit}`;
}

/** Classify OSM tags into our facility types */
function classifyFacility(tags: Record<string, string>): 'hospital' | 'clinic' | 'pharmacy' | 'health_center' | null {
  const amenity = tags.amenity || '';
  const healthcare = tags.healthcare || '';
  const shop = tags.shop || '';

  // Hospital
  if (amenity === 'hospital' || healthcare === 'hospital') return 'hospital';

  // Pharmacy / Drugstore
  if (amenity === 'pharmacy' || shop === 'chemist' || shop === 'pharmacy' || healthcare === 'pharmacy') return 'pharmacy';

  // Clinic
  if (
    amenity === 'clinic' || amenity === 'doctors' || amenity === 'dentist' ||
    healthcare === 'clinic' || healthcare === 'doctor' || healthcare === 'dentist' ||
    healthcare === 'centre' || healthcare === 'physiotherapist' ||
    healthcare === 'laboratory' || healthcare === 'alternative'
  ) return 'clinic';

  // Health center
  if (
    healthcare === 'health_centre' || healthcare === 'health_center' ||
    amenity === 'social_facility' || amenity === 'nursing_home' ||
    healthcare === 'nursing_home' || healthcare === 'rehabilitation'
  ) return 'health_center';

  // Generic healthcare tag
  if (healthcare && healthcare !== 'yes') return 'clinic';
  if (healthcare === 'yes') return 'health_center';

  return null;
}

/** Parse OSM element into NearbyFacility */
function parseElement(
  el: OverpassElement,
  userLat: number,
  userLng: number,
  lang: string,
): NearbyFacility | null {
  const tags = el.tags || {};
  const facilityType = classifyFacility(tags);
  if (!facilityType) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  // Build name — prefer Thai name if lang=th
  let name = '';
  if (lang === 'th') {
    name = tags['name:th'] || tags.name || tags['name:en'] || '';
  } else {
    name = tags['name:en'] || tags.name || tags['name:th'] || '';
  }
  if (!name) {
    // Generate a generic name based on type
    const typeNames: Record<string, Record<string, string>> = {
      hospital: { th: 'โรงพยาบาล', en: 'Hospital' },
      clinic: { th: 'คลินิก', en: 'Clinic' },
      pharmacy: { th: 'ร้านยา', en: 'Pharmacy' },
      health_center: { th: 'ศูนย์สุขภาพ', en: 'Health Center' },
    };
    name = typeNames[facilityType]?.[lang] || typeNames[facilityType]?.en || 'Healthcare Facility';
  }

  // Build address
  const addrParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:subdistrict'] || tags['addr:suburb'],
    tags['addr:district'] || tags['addr:city'],
    tags['addr:province'] || tags['addr:state'],
    tags['addr:postcode'],
  ].filter(Boolean);
  const address = addrParts.join(' ') || tags['addr:full'] || '';

  const dist = calcDistanceKm(userLat, userLng, lat, lon);

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    type: facilityType,
    address,
    phone: tags.phone || tags['contact:phone'] || undefined,
    website: tags.website || tags['contact:website'] || undefined,
    openingHours: tags.opening_hours || undefined,
    distance: dist,
    distanceText: formatDist(dist, lang),
    location: { lat, lng: lon },
    isOpen: undefined, // OSM doesn't provide real-time open status
    osmId: el.id,
  };
}

// Simple in-memory cache: key = "lat,lng,radius" rounded to ~500m grid
const cache = new Map<string, { data: NearbyFacility[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(lat: number, lng: number, radiusKm: number): string {
  // Round to ~500m grid to improve cache hits
  const rlat = Math.round(lat * 200) / 200;
  const rlng = Math.round(lng * 200) / 200;
  return `${rlat},${rlng},${radiusKm}`;
}

/** Dedup and filter parsed Overpass elements into NearbyFacility[] */
function deduplicateFacilities(
  elements: OverpassElement[], userLat: number, userLng: number, lang: string, radiusKm: number,
): NearbyFacility[] {
  const seen = new Set<string>();
  const facilities: NearbyFacility[] = [];

  for (const el of elements) {
    if (!el.tags || (!el.tags.amenity && !el.tags.healthcare && !el.tags.shop)) continue;
    const f = parseElement(el, userLat, userLng, lang);
    if (!f) continue;
    const dedupKey = `${f.name.toLowerCase()}-${f.type}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    if (f.distance <= radiusKm) {
      facilities.push(f);
    }
  }

  facilities.sort((a, b) => a.distance - b.distance);
  return facilities;
}

/** Evict stale cache entries when the map grows too large */
function evictStaleCache(): void {
  if (cache.size <= 100) return;
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (now - v.timestamp > CACHE_TTL) cache.delete(k);
  }
}

/** Build Overpass QL to search healthcare POIs */
function buildOverpassQuery(lat: number, lng: number, radiusKm: number): string {
  const radiusMeters = Math.round(radiusKm * 1000);
  return `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
  way["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
  node["amenity"="doctors"](around:${radiusMeters},${lat},${lng});
  way["amenity"="doctors"](around:${radiusMeters},${lat},${lng});
  node["amenity"="dentist"](around:${radiusMeters},${lat},${lng});
  way["amenity"="dentist"](around:${radiusMeters},${lat},${lng});
  node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
  way["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
  node["shop"="chemist"](around:${radiusMeters},${lat},${lng});
  way["shop"="chemist"](around:${radiusMeters},${lat},${lng});
  node["healthcare"](around:${radiusMeters},${lat},${lng});
  way["healthcare"](around:${radiusMeters},${lat},${lng});
  node["amenity"="nursing_home"](around:${radiusMeters},${lat},${lng});
  way["amenity"="nursing_home"](around:${radiusMeters},${lat},${lng});
);
out center body;
>;
out skel qt;
`.trim();
}

// ============================================================================
// GET /api/map/nearby?lat=&lng=&radius=&lang=
// ============================================================================
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const lat = Number.parseFloat(req.query.lat as string);
    const lng = Number.parseFloat(req.query.lng as string);
    const radiusKm = Math.min(Number.parseFloat(req.query.radius as string) || 5, 50);
    const lang = (req.query.lang as string) || 'th';

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'Missing or invalid lat/lng parameters' });
    }

    // Check cache
    const cacheKey = getCacheKey(lat, lng, radiusKm);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[MAP] Cache hit for ${cacheKey} — ${cached.data.length} facilities`);
      return res.json({
        facilities: cached.data, total: cached.data.length, source: 'cache',
        center: { lat, lng }, radiusKm, timestamp: new Date().toISOString(),
      });
    }

    console.log(`[MAP] Searching nearby: lat=${lat}, lng=${lng}, radius=${radiusKm}km`);

    const overpassQuery = buildOverpassQuery(lat, lng, radiusKm);
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Overpass API returned ${response.status}: ${response.statusText}`);
    }

    const data: { elements?: OverpassElement[] } = await response.json();
    const elements: OverpassElement[] = data.elements || [];
    console.log(`[MAP] Overpass returned ${elements.length} raw elements`);

    const facilities = deduplicateFacilities(elements, lat, lng, lang, radiusKm);

    console.log(`[MAP] Found ${facilities.length} unique facilities within ${radiusKm}km`);
    const byType = {
      hospital: facilities.filter(f => f.type === 'hospital').length,
      clinic: facilities.filter(f => f.type === 'clinic').length,
      pharmacy: facilities.filter(f => f.type === 'pharmacy').length,
      health_center: facilities.filter(f => f.type === 'health_center').length,
    };

    cache.set(cacheKey, { data: facilities, timestamp: Date.now() });
    evictStaleCache();

    res.json({
      facilities, total: facilities.length, byType, source: 'overpass',
      center: { lat, lng }, radiusKm, timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MAP] Nearby search error:', message);
    // Graceful degradation: map UI should still render even when Overpass is unavailable.
    res.json({
      facilities: [],
      total: 0,
      byType: { hospital: 0, clinic: 0, pharmacy: 0, health_center: 0 },
      source: 'fallback-empty',
      center: {
        lat: Number.parseFloat(req.query.lat as string) || 13.7563,
        lng: Number.parseFloat(req.query.lng as string) || 100.5018,
      },
      radiusKm: Math.min(Number.parseFloat(req.query.radius as string) || 5, 50),
      timestamp: new Date().toISOString(),
      warning: message,
    });
  }
});

// ============================================================================
// GET /api/map/health — Health check
// ============================================================================
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'map',
    cacheSize: cache.size,
    timestamp: new Date().toISOString(),
  });
});

export default router;
