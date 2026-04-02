/**
 * ═══════════════════════════════════════════════════════════════════════
 * Map Page Logic Tests
 * Tests: Geolocation calculations, distance filtering, map data transforms
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface Location {
  lat: number;
  lng: number;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy';
  distance?: number;
}

interface MapFilter {
  type?: string;
  maxDistanceKm?: number;
  searchQuery?: string;
}

// --- Pure logic functions ---

function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function filterLocations(locations: Location[], filter: MapFilter): Location[] {
  let result = [...locations];
  if (filter.type) {
    result = result.filter(l => l.type === filter.type);
  }
  if (filter.maxDistanceKm !== undefined && filter.maxDistanceKm > 0) {
    result = result.filter(l => (l.distance ?? 0) <= filter.maxDistanceKm!);
  }
  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter(l => l.name.toLowerCase().includes(q));
  }
  return result;
}

function sortByDistance(locations: Location[]): Location[] {
  return [...locations].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
}

function addDistances(locations: Location[], userLat: number, userLng: number): Location[] {
  return locations.map(l => ({
    ...l,
    distance: calculateDistanceKm(userLat, userLng, l.lat, l.lng),
  }));
}

// --- Test Data ---
const SAMPLE_LOCATIONS: Location[] = [
  { lat: 13.7563, lng: 100.5018, name: 'Siriraj Hospital', type: 'hospital' },
  { lat: 13.738, lng: 100.5338, name: 'Chulalongkorn Hospital', type: 'hospital' },
  { lat: 13.75, lng: 100.51, name: 'Bangkok Clinic', type: 'clinic' },
  { lat: 13.745, lng: 100.52, name: 'Central Pharmacy', type: 'pharmacy' },
  { lat: 13.8, lng: 100.55, name: 'Northern Clinic', type: 'clinic' },
];

// --- Tests ---

describe('Map Page — Distance Calculation', () => {
  it('M01 — distance between same point is 0', () => {
    expect(calculateDistanceKm(13.75, 100.5, 13.75, 100.5)).toBe(0);
  });

  it('M02 — distance is always positive', () => {
    const d = calculateDistanceKm(13.75, 100.5, 14, 100.6);
    expect(d).toBeGreaterThan(0);
  });

  it('M03 — known distance Bangkok to Chiang Mai ~580-700km', () => {
    const d = calculateDistanceKm(13.7563, 100.5018, 18.7883, 98.9853);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(800);
  });

  it('M04 — symmetric: A→B == B→A', () => {
    const d1 = calculateDistanceKm(13.75, 100.5, 14, 100.6);
    const d2 = calculateDistanceKm(14, 100.6, 13.75, 100.5);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });

  it('M05 — short distance within city < 10km', () => {
    const d = calculateDistanceKm(13.7563, 100.5018, 13.738, 100.5338);
    expect(d).toBeLessThan(10);
    expect(d).toBeGreaterThan(0.1);
  });
});

describe('Map Page — Location Filtering', () => {
  it('M06 — filter by type hospital', () => {
    const result = filterLocations(SAMPLE_LOCATIONS, { type: 'hospital' });
    expect(result).toHaveLength(2);
    expect(result.every(l => l.type === 'hospital')).toBe(true);
  });

  it('M07 — filter by type clinic', () => {
    const result = filterLocations(SAMPLE_LOCATIONS, { type: 'clinic' });
    expect(result).toHaveLength(2);
  });

  it('M08 — filter by type pharmacy', () => {
    const result = filterLocations(SAMPLE_LOCATIONS, { type: 'pharmacy' });
    expect(result).toHaveLength(1);
  });

  it('M09 — filter by search query', () => {
    const result = filterLocations(SAMPLE_LOCATIONS, { searchQuery: 'siriraj' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Siriraj Hospital');
  });

  it('M10 — filter by distance with addDistances', () => {
    const withDist = addDistances(SAMPLE_LOCATIONS, 13.7563, 100.5018);
    const nearby = filterLocations(withDist, { maxDistanceKm: 5 });
    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby.length).toBeLessThanOrEqual(SAMPLE_LOCATIONS.length);
  });

  it('M11 — empty filter returns all', () => {
    const result = filterLocations(SAMPLE_LOCATIONS, {});
    expect(result).toHaveLength(SAMPLE_LOCATIONS.length);
  });

  it('M12 — combined filters narrow results', () => {
    const withDist = addDistances(SAMPLE_LOCATIONS, 13.7563, 100.5018);
    const result = filterLocations(withDist, { type: 'hospital', maxDistanceKm: 5 });
    expect(result.length).toBeLessThanOrEqual(2);
  });
});

describe('Map Page — Sorting', () => {
  it('M13 — sort by distance ascending', () => {
    const withDist = addDistances(SAMPLE_LOCATIONS, 13.7563, 100.5018);
    const sorted = sortByDistance(withDist);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].distance!).toBeGreaterThanOrEqual(sorted[i - 1].distance!);
    }
  });

  it('M14 — closest location is first', () => {
    const withDist = addDistances(SAMPLE_LOCATIONS, 13.7563, 100.5018);
    const sorted = sortByDistance(withDist);
    expect(sorted[0].name).toBe('Siriraj Hospital'); // same point
    expect(sorted[0].distance!).toBeLessThan(0.01);
  });
});
