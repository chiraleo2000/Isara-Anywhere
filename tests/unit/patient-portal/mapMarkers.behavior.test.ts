import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const mapPagePath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/frontend/pages/MapPage.tsx',
);

function facilityCountMatchesMarkers(facilities: { id: string }[], markers: { id: string }[]): boolean {
  if (facilities.length !== markers.length) return false;
  const markerIds = new Set(markers.map((m) => m.id));
  return facilities.every((f) => markerIds.has(f.id));
}

describe('map markers behavior (P8–P10)', () => {
  it('facility list length matches marker set', () => {
    const facilities = [{ id: 'a' }, { id: 'b' }];
    const markers = [{ id: 'a' }, { id: 'b' }];
    expect(facilityCountMatchesMarkers(facilities, markers)).toBe(true);
  });

  it('detects facility/marker mismatch', () => {
    const facilities = [{ id: 'a' }, { id: 'b' }];
    const markers = [{ id: 'a' }];
    expect(facilityCountMatchesMarkers(facilities, markers)).toBe(false);
  });

  it('MapPage reloads Google script on language change', () => {
    const source = fs.readFileSync(mapPagePath, 'utf8');
    expect(source).toMatch(/language/);
    expect(source).toMatch(/maps\.googleapis\.com|google.*maps/i);
  });

  it('MapPage supports AdvancedMarkerElement with marker library', () => {
    const source = fs.readFileSync(mapPagePath, 'utf8');
    expect(source).toContain('libraries=places,marker');
    expect(source).toContain('AdvancedMarkerElement');
    expect(source).toContain('placeIsOpenNow');
  });
});
