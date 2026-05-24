/**
 * MapPage — Nearby Healthcare Facilities Finder v3.0.0
 * 
 * ARCHITECTURE:
 *  - PRIMARY DATA: Server-side Overpass API (/api/map/nearby) — real OpenStreetMap data,
 *    free, global coverage, returns hospitals/clinics/pharmacies/health centers near user
 *  - SECONDARY DATA: Google Places API — adds ratings & open-now status
 *  - MAP DISPLAY: Google Maps if API key available, otherwise Leaflet (OpenStreetMap tiles)
 * 
 * Features:
 *  - Distance range: 1, 3, 5, 10, 15, 20 km (default 5km = nearest first!)
 *  - Filter by: Hospital, Clinic, Pharmacy, Health Center
 *  - Real-time GPS with high-accuracy fallback
 *  - Thai/English bilingual — Dark mode
 *  - Sorted by distance (nearest first)
 *  - One-tap Google Maps navigation
 *  - Phone number links
 */
/// <reference types="google.maps" />

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import {
  MapPin, Search, Building2, Navigation, Loader2, AlertCircle,
  Pill, Stethoscope, Heart, User, RefreshCw, Star,
  Target, AlertTriangle, Sliders, ChevronDown, ChevronUp,
  Phone, Clock,
} from 'lucide-react';

type MapGlobal = typeof globalThis & { google?: typeof google; L?: any };
const mapGlobal = globalThis as MapGlobal;

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface Facility {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'health_center';
  address: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  rating?: number;
  ratingCount?: number;
  isOpen?: boolean;
  distance: number;
  distanceText: string;
  location: { lat: number; lng: number };
}

const DEFAULT_LOCATION = { lat: 13.7563, lng: 100.5018 }; // Bangkok fallback
const RANGE_OPTIONS = [1, 3, 5, 10, 15, 20] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDist = (km: number, lang: string = 'th') => {
  const smallUnit = lang === 'th' ? 'ม.' : 'm';
  const largeUnit = lang === 'th' ? 'กม.' : 'km';
  return km < 1 ? `${Math.round(km * 1000)} ${smallUnit}` : `${km.toFixed(1)} ${largeUnit}`;
};

const getToggleClass = (isActive: boolean, isDarkMode: boolean, activeClass: string, darkClass: string, lightClass: string): string => {
  if (isActive) return activeClass;
  return isDarkMode ? darkClass : lightClass;
};

const markerColors: Record<string, string> = { hospital: '#DC2626', clinic: '#2563EB', pharmacy: '#16A34A', health_center: '#9333EA' };
const labelsTH: Record<string, string> = { hospital: 'โรงพยาบาล', clinic: 'คลินิก', pharmacy: 'ร้านยา', health_center: 'ศูนย์สุขภาพ' };
const labelsEN: Record<string, string> = { hospital: 'Hospital', clinic: 'Clinic', pharmacy: 'Pharmacy', health_center: 'Health Center' };
const getLabel = (key: string, lang: string) => (lang === 'th' ? labelsTH : labelsEN)[key] || key;

const colors: Record<string, string> = {
  hospital: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  clinic: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  pharmacy: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  health_center: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
};

const iconMap: Record<string, typeof Building2> = { hospital: Building2, clinic: Stethoscope, pharmacy: Pill, health_center: Heart };

/* ------------------------------------------------------------------ */
/*  Google Maps loader                                                 */
/* ------------------------------------------------------------------ */
let mapsLoadPromise: Promise<void> | null = null;
function loadGoogleMapsScript(apiKey: string, lang: string): Promise<void> {
  if (mapGlobal.google?.maps?.places) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      const timer = setInterval(() => {
        if (mapGlobal.google?.maps?.places) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(timer); reject(new Error('timeout')); }, 15000);
      return;
    }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=${lang || 'th'}`;
    s.async = true;
    s.onload = () => {
      const timer = setInterval(() => {
        if (mapGlobal.google?.maps?.places) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(timer); resolve(); }, 5000);
    };
    s.onerror = () => { mapsLoadPromise = null; reject(new Error('Maps script failed')); };
    document.head.appendChild(s);
  });
  return mapsLoadPromise;
}

/* ------------------------------------------------------------------ */
/*  Leaflet loader (fallback map when no Google API key)               */
/* ------------------------------------------------------------------ */
let leafletLoaded = false;
function loadLeaflet(): Promise<void> {
  if (leafletLoaded || mapGlobal.L) { leafletLoaded = true; return Promise.resolve(); }
  return new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => { leafletLoaded = true; resolve(); };
    js.onerror = () => reject(new Error('Leaflet load failed'));
    document.head.appendChild(js);
  });
}

/* ------------------------------------------------------------------ */
/*  Geolocation                                                        */
/* ------------------------------------------------------------------ */
const getHighAccuracyLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('No geolocation')); return; }
    const parse = (p: GeolocationPosition) => ({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
    const fallback = () =>
      navigator.geolocation.getCurrentPosition((p) => resolve(parse(p)), reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    navigator.geolocation.getCurrentPosition((p) => resolve(parse(p)), fallback, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

/* ------------------------------------------------------------------ */
/*  Backend API: real nearby facilities from Overpass API (server)     */
/* ------------------------------------------------------------------ */
async function fetchNearbyFromServer(lat: number, lng: number, radiusKm: number, lang: string): Promise<Facility[]> {
  const url = `/api/map/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}&lang=${lang}`;
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(url, { headers, signal: AbortSignal.timeout(35000) });
  if (!resp.ok) throw new Error(`Server ${resp.status}`);
  const data = await resp.json();
  return (data.facilities || []) as Facility[];
}

/* ------------------------------------------------------------------ */
/*  Map a Google Place result into a Facility                         */
/* ------------------------------------------------------------------ */
function mapPlaceToFacility(
  p: google.maps.places.PlaceResult,
  origin: { lat: number; lng: number },
  facilityType: string,
  radiusKm: number,
  lang: string,
): Facility | null {
  const lat = p.geometry?.location?.lat() || 0;
  const lng = p.geometry?.location?.lng() || 0;
  const dist = calcDistance(origin.lat, origin.lng, lat, lng);
  if (dist > radiusKm) return null;
  return {
    id: p.place_id || `gp-${Math.random()}`,
    name: p.name || 'Unknown',
    type: facilityType as Facility['type'],
    address: p.vicinity || '',
    rating: p.rating,
    ratingCount: p.user_ratings_total,
    isOpen: p.opening_hours?.open_now,
    distance: dist,
    distanceText: formatDist(dist, lang),
    location: { lat, lng },
  } as Facility;
}

/* ------------------------------------------------------------------ */
/*  Google Places supplemental (adds ratings, open-now status)        */
/* ------------------------------------------------------------------ */
async function fetchFromGooglePlaces(
  service: google.maps.places.PlacesService,
  loc: { lat: number; lng: number },
  radiusKm: number,
  lang: string,
): Promise<Facility[]> {
  const mapResults = (results: google.maps.places.PlaceResult[], facilityType: string): Facility[] =>
    results.map((p) => mapPlaceToFacility(p, loc, facilityType, radiusKm, lang)).filter((f): f is Facility => f !== null);

  const doSearch = (type: string, facilityType: string): Promise<Facility[]> =>
    new Promise((resolve) => {
      service.nearbySearch(
        { location: new google.maps.LatLng(loc.lat, loc.lng), rankBy: google.maps.places.RankBy.DISTANCE, type },
        (results, status) => {
          const ok = status === google.maps.places.PlacesServiceStatus.OK && results;
          resolve(ok ? mapResults(results, facilityType) : []);
        },
      );
    });

  try {
    const [hospitals, clinics, pharmacies, dentists] = await Promise.all([
      doSearch('hospital', 'hospital'),
      doSearch('doctor', 'clinic'),
      doSearch('pharmacy', 'pharmacy'),
      doSearch('dentist', 'clinic'),
    ]);
    return [...hospitals, ...clinics, ...pharmacies, ...dentists];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Merge server + Google results                                      */
/* ------------------------------------------------------------------ */
function enrichExistingFacility(merged: Facility[], nameKey: string, gf: Facility): void {
  const idx = merged.findIndex(
    (sf) => sf.name.toLowerCase() === nameKey || calcDistance(sf.location.lat, sf.location.lng, gf.location.lat, gf.location.lng) < 0.1,
  );
  if (idx < 0) return;
  if (gf.rating && !merged[idx].rating) merged[idx] = { ...merged[idx], rating: gf.rating, ratingCount: gf.ratingCount };
  if (gf.isOpen !== undefined && merged[idx].isOpen === undefined) merged[idx] = { ...merged[idx], isOpen: gf.isOpen };
}

function mergeResults(serverData: Facility[], googleData: Facility[]): Facility[] {
  const merged = [...serverData];
  const nameSet = new Set(serverData.map((f) => f.name.toLowerCase()));

  for (const gf of googleData) {
    const nameKey = gf.name.toLowerCase();
    const isDuplicate =
      nameSet.has(nameKey) ||
      merged.some((sf) => calcDistance(sf.location.lat, sf.location.lng, gf.location.lat, gf.location.lng) < 0.1 && sf.type === gf.type);

    if (isDuplicate) {
      enrichExistingFacility(merged, nameKey, gf);
      continue;
    }

    merged.push(gf);
    nameSet.add(nameKey);
  }
  return merged;
}

/* ------------------------------------------------------------------ */
/*  i18n                                                               */
/* ------------------------------------------------------------------ */
function getMapPageLabels(language: string) {
  const th = language === 'th';
  return {
    title: th ? 'สถานพยาบาลใกล้เคียง' : 'Nearby Healthcare',
    radius: th ? 'รัศมี' : 'Radius',
    kmUnit: th ? 'กม.' : 'km',
    found: th ? 'แห่ง' : 'found',
    refresh: th ? 'รีเฟรช' : 'Refresh',
    locationDenied: th ? 'ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง — ใช้ตำแหน่งเริ่มต้น (กรุงเทพฯ)' : 'Location access denied — using default (Bangkok)',
    searchPlaceholder: th ? 'ค้นหาชื่อ / ที่อยู่...' : 'Search name / address...',
    loadingMap: th ? 'กำลังโหลดแผนที่...' : 'Loading map...',
    yourLocation: th ? 'ตำแหน่งคุณ' : 'You',
    youAreHere: th ? 'คุณอยู่ที่นี่' : 'You are here',
    noFacilities: (r: number) => th ? `ไม่พบสถานพยาบาลในรัศมี ${r} กม.` : `No facilities within ${r} km`,
    tryExpanding: th ? 'ลองขยายรัศมีค้นหา' : 'Try increasing search range',
    foundCount: (n: number) => th ? `พบ ${n} แห่ง` : `${n} found`,
    navigate: th ? 'นำทาง' : 'Navigate',
    loadingFacilities: th ? 'กำลังค้นหาสถานพยาบาล...' : 'Searching nearby...',
    errorLoading: th ? 'เกิดข้อผิดพลาด กำลังลองใหม่...' : 'Error loading, retrying...',
    dataSource: th ? 'ข้อมูลจาก OpenStreetMap' : 'Data from OpenStreetMap',
  };
}

/* ------------------------------------------------------------------ */
/*  Theme                                                              */
/* ------------------------------------------------------------------ */
const tv = (isDark: boolean, d: string, l: string) => (isDark ? d : l);
function getMapThemeClasses(isDark: boolean) {
  return {
    pageBg: tv(isDark, 'bg-gray-900', 'bg-gray-50'),
    headerBg: tv(isDark, 'bg-gray-800 border-gray-700', 'bg-white'),
    titleText: tv(isDark, 'text-white', 'text-gray-800'),
    subtitleText: tv(isDark, 'text-gray-400', 'text-gray-500'),
    refreshBtn: tv(isDark, 'bg-gray-700 hover:bg-gray-600', 'bg-gray-100 hover:bg-gray-200'),
    refreshIcon: tv(isDark, 'text-gray-300', 'text-gray-600'),
    barBg: tv(isDark, 'bg-gray-800 border-gray-700', 'bg-white'),
    inputBg: tv(isDark, 'bg-gray-700 border-gray-600 text-white placeholder-gray-400', 'border-gray-200'),
    legendBg: tv(isDark, 'bg-gray-800/95 text-gray-200', 'bg-white/95'),
    listHeaderBg: tv(isDark, 'bg-gray-800 border-gray-700', 'bg-white border-gray-200'),
    listHeaderText: tv(isDark, 'text-gray-200', 'text-gray-700'),
    chevronColor: tv(isDark, 'text-gray-400', 'text-gray-500'),
    emptyBg: tv(isDark, 'bg-gray-800', 'bg-white'),
    loadingText: tv(isDark, 'text-gray-300', 'text-gray-600'),
    errorText: tv(isDark, 'text-gray-200', 'text-gray-700'),
    sliderIcon: tv(isDark, 'text-gray-400', 'text-gray-500'),
    cardBg: tv(isDark, 'bg-gray-800 hover:bg-gray-700', 'bg-white hover:bg-emerald-50'),
    cardBorder: tv(isDark, 'border-gray-700', 'border-gray-100'),
    nameText: tv(isDark, 'text-white', 'text-gray-800'),
    addrText: tv(isDark, 'text-gray-400', 'text-gray-500'),
    metaText: tv(isDark, 'text-gray-300', 'text-gray-600'),
  };
}

/* ------------------------------------------------------------------ */
/*  Filter helpers                                                     */
/* ------------------------------------------------------------------ */
function getFilterLabel(type: string, language: string): string {
  if (type === 'all') return language === 'th' ? 'ทั้งหมด' : 'All';
  return getLabel(type, language);
}

function filterFacilities(facilities: Facility[], filter: string, search: string): Facility[] {
  return facilities.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.address.toLowerCase().includes(search.toLowerCase());
    return (filter === 'all' || f.type === filter) && matchSearch;
  });
}

/* ------------------------------------------------------------------ */
/*  buildInfoContent — marker popup                                    */
/* ------------------------------------------------------------------ */
function buildInfoContent(f: Facility, navLabel: string): string {
  const ratingCountText = f.ratingCount ? ' (' + String(f.ratingCount) + ')' : '';
  const ratingHtml = f.rating ? '<p style="font-size:11px;">⭐ ' + String(f.rating) + ratingCountText + '</p>' : '';
  const phoneHtml = f.phone ? `<p style="font-size:11px;">📞 <a href="tel:${f.phone}">${f.phone}</a></p>` : '';
  return `<div style="padding:8px;max-width:240px;">
    <b>${f.name}</b>
    <p style="font-size:11px;color:#666;margin:4px 0;">${f.address || ''}</p>
    ${ratingHtml}${phoneHtml}
    <p style="color:#059669;font-weight:600;font-size:13px;">${f.distanceText}</p>
    <a href="https://www.google.com/maps/dir/?api=1&destination=${f.location.lat},${f.location.lng}"
       target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;padding:5px 10px;background:#059669;color:#fff;border-radius:4px;text-decoration:none;font-size:11px;">
      ${navLabel}
    </a>
  </div>`;
}

/* ------------------------------------------------------------------ */
/*  FacilityCard                                                       */
/* ------------------------------------------------------------------ */
function FacilityCard({
  f, selected, language, tc, onClick, onNavigate,
}: Readonly<{
  f: Facility; selected: boolean; language: string;
  tc: ReturnType<typeof getMapThemeClasses>; onClick: () => void; onNavigate: () => void;
}>) {
  const Icon = iconMap[f.type] || Building2;
  const openLabel = language === 'th' ? '● เปิด' : '● Open';
  const closedLabel = language === 'th' ? '○ ปิด' : '○ Closed';
  return (
    <div
      className={`w-full p-3 transition-all border-b ${tc.cardBorder} ${
        selected ? 'border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : ''
      } ${tc.cardBg}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onClick}
          className="flex flex-1 items-start gap-3 min-w-0 text-left"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors[f.type]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2">
            <div>
              <h3 className={`font-medium text-sm leading-tight ${tc.nameText}`}>{f.name}</h3>
              <span className={`inline-block px-1.5 py-0.5 text-xs rounded mt-0.5 ${colors[f.type]}`}>
                {getLabel(f.type, language)}
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-emerald-600">{f.distanceText}</p>
              {f.isOpen !== undefined && (
                <p className={`text-[10px] font-medium ${f.isOpen ? 'text-green-600' : 'text-red-500'}`}>
                  {f.isOpen ? openLabel : closedLabel}
                </p>
              )}
            </div>
          </div>
          {f.address && <p className={`text-xs mt-1 truncate ${tc.addrText}`}>{f.address}</p>}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {f.rating != null && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className={`text-xs ${tc.metaText}`}>{f.rating}</span>
                {f.ratingCount != null && <span className="text-xs text-gray-400">({f.ratingCount})</span>}
              </div>
            )}
            {f.phone && (
              <span className="flex items-center gap-1 text-xs text-blue-500">
                <Phone className="w-3 h-3" /> {f.phone}
              </span>
            )}
            {f.openingHours && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" /> {f.openingHours.substring(0, 30)}
              </span>
            )}
          </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onNavigate}
          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shrink-0 shadow-sm"
          title={language === 'th' ? 'นำทาง' : 'Navigate'}
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FacilityListContent                                                */
/* ------------------------------------------------------------------ */
function FacilityListContent({
  loading, facilities, filtered, selectedId, language, tc, focusFacility, navigateTo,
}: Readonly<{
  loading: boolean; facilities: readonly Facility[]; filtered: readonly Facility[];
  selectedId: string | null; language: string; tc: ReturnType<typeof getMapThemeClasses>;
  focusFacility: (f: Facility) => void; navigateTo: (f: Facility) => void;
}>) {
  if (loading && facilities.length === 0) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;
  }
  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{language === 'th' ? 'ไม่พบสถานพยาบาล' : 'No facilities found'}</p>
      </div>
    );
  }
  return (
    <>
      {filtered.slice(0, 50).map((f) => (
        <FacilityCard
          key={f.id}
          f={f}
          selected={selectedId === f.id}
          language={language}
          tc={tc}
          onClick={() => focusFacility(f)}
          onNavigate={() => navigateTo(f)}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  MapViewArea                                                        */
/* ------------------------------------------------------------------ */
function MapViewArea({
  error, mapReady, children, tc, lbl, labels, onCenter, onReload,
}: Readonly<{
  error: string | null; mapReady: boolean; children: ReactNode;
  tc: ReturnType<typeof getMapThemeClasses>; lbl: ReturnType<typeof getMapPageLabels>;
  labels: Record<string, string>; onCenter: () => void; onReload: () => void;
}>) {
  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-6">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className={`text-lg font-medium mb-4 ${tc.errorText}`}>{error}</p>
          <button onClick={onReload} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" /> {lbl.refresh}
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      {children}
      {!mapReady && (
        <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-3" />
            <p className={tc.loadingText}>{lbl.loadingMap}</p>
          </div>
        </div>
      )}
      {mapReady && (
        <>
          <div className={`absolute top-3 right-3 backdrop-blur rounded-lg shadow p-2 text-xs z-10 ${tc.legendBg}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-full" /><span>{labels.hospital}</span></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /><span>{labels.clinic}</span></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-green-500 rounded-full" /><span>{labels.pharmacy}</span></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-purple-500 rounded-full" /><span>{labels.health_center}</span></div>
              <div className="flex items-center gap-2 border-t pt-1 mt-1"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-blue-200" /><span>{lbl.yourLocation}</span></div>
            </div>
          </div>
          <button onClick={onCenter} className="absolute bottom-4 right-4 bg-white dark:bg-gray-700 rounded-full p-3 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 z-10" title={lbl.yourLocation}>
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </button>
        </>
      )}
    </>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function MapPage() {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const labels = language === 'th' ? labelsTH : labelsEN;
  const tc = getMapThemeClasses(isDark);
  const lbl = getMapPageLabels(language);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const leafletMap = useRef<any>(null);
  const leafletMarkers = useRef<any[]>([]);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const pulseMarkerRef = useRef<google.maps.Marker | null>(null);
  const rangeCircleRef = useRef<google.maps.Circle | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'hospital' | 'clinic' | 'pharmacy' | 'health_center'>('all');
  const [range, setRange] = useState<number>(5); // 5km default — nearest first!
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'denied'>('loading');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [listExpanded, setListExpanded] = useState(true); // start expanded
  const [dataSource, setDataSource] = useState<'server' | 'google' | 'none'>('none');

  /* ---- Load facilities: server first, Google supplemental ---- */
  const loadFacilities = useCallback(
    async (loc: { lat: number; lng: number }, radiusKm: number) => {
      setLoading(true);
      setError(null);
      try {
        // 1. Primary: server-side Overpass API (real data!)
        let serverData: Facility[] = [];
        try {
          serverData = await fetchNearbyFromServer(loc.lat, loc.lng, radiusKm, language);
          if (serverData.length > 0) setDataSource('server');
        } catch (err) {
          console.warn('[MAP] Server API failed:', err);
        }

        // 2. Google Places supplemental (ratings, open-now)
        let googleData: Facility[] = [];
        if (placesService.current) {
          try {
            googleData = await fetchFromGooglePlaces(placesService.current, loc, radiusKm, language);
            if (googleData.length > 0 && serverData.length === 0) setDataSource('google');
          } catch (err) {
            console.warn('[MAP] Google Places failed:', err);
          }
        }

        // 3. Merge & sort by distance
        const merged = mergeResults(serverData, googleData);
        merged.sort((a, b) => a.distance - b.distance);
        setFacilities(merged);
        addMapMarkers(merged);
      } catch (err: any) {
        console.error('[MAP] All sources failed:', err);
        setError(lbl.errorLoading);
      } finally {
        setLoading(false);
      }
    },
    [language],
  );

  /* ---- Add markers on whichever map is active ---- */
  const addMapMarkers = (list: Facility[]) => {
    // Google Maps
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (mapInstance.current) {
      infoWindowRef.current ??= new google.maps.InfoWindow();
      list.forEach((f) => {
        const m = new google.maps.Marker({
          position: f.location,
          map: mapInstance.current,
          title: f.name,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: markerColors[f.type] || '#666', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          animation: google.maps.Animation.DROP,
        });
        m.addListener('click', () => {
          setSelectedId(f.id);
          infoWindowRef.current?.setContent(buildInfoContent(f, lbl.navigate));
          infoWindowRef.current?.open(mapInstance.current, m);
        });
        markersRef.current.push(m);
      });
    }

    // Leaflet
    if (leafletMap.current) {
      const L = mapGlobal.L;
      leafletMarkers.current.forEach((m: any) => m.remove());
      leafletMarkers.current = [];
      list.forEach((f) => {
        const color = markerColors[f.type] || '#666';
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const marker = L.marker([f.location.lat, f.location.lng], { icon })
          .addTo(leafletMap.current)
          .bindPopup(buildInfoContent(f, lbl.navigate));
        marker.on('click', () => setSelectedId(f.id));
        leafletMarkers.current.push(marker);
      });
    }
  };

  /* ---- Range circle ---- */
  const updateRangeCircle = useCallback((loc: { lat: number; lng: number }, radiusKm: number) => {
    if (rangeCircleRef.current) rangeCircleRef.current.setMap(null);
    if (mapInstance.current) {
      rangeCircleRef.current = new google.maps.Circle({
        map: mapInstance.current, center: loc, radius: radiusKm * 1000,
        strokeColor: '#059669', strokeOpacity: 0.4, strokeWeight: 2,
        fillColor: '#059669', fillOpacity: 0.06,
      });
    }
    if (leafletMap.current) {
      const L = mapGlobal.L;
      if (leafletMap.current._rc) leafletMap.current._rc.remove();
      leafletMap.current._rc = L.circle([loc.lat, loc.lng], {
        radius: radiusKm * 1000, color: '#059669', fillColor: '#059669', fillOpacity: 0.06, weight: 2,
      }).addTo(leafletMap.current);
    }
  }, []);

  /* ---- Init Google Map ---- */
  const initGoogleMap = useCallback((loc: { lat: number; lng: number }) => {
    if (!mapRef.current || mapInstance.current) return;
    const zoomMap: Record<number, number> = { 1: 16, 3: 14, 5: 13, 10: 12, 15: 11, 20: 10 };
    const map = new google.maps.Map(mapRef.current, {
      center: loc, zoom: zoomMap[range] || 13, mapTypeControl: false, streetViewControl: false,
    });
    mapInstance.current = map;
    placesService.current = new google.maps.places.PlacesService(map);

    userMarkerRef.current = new google.maps.Marker({
      position: loc, map, title: lbl.youAreHere,
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
      zIndex: 1000,
    });
    pulseMarkerRef.current = new google.maps.Marker({
      position: loc, map,
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 24, fillColor: '#3B82F6', fillOpacity: 0.25, strokeWeight: 0 },
      zIndex: 999,
    });
    setMapReady(true);
    updateRangeCircle(loc, range);
  }, [range, updateRangeCircle, lbl.youAreHere]);

  /* ---- Init Leaflet (fallback) ---- */
  const initLeafletMap = useCallback(async (loc: { lat: number; lng: number }) => {
    if (!mapRef.current || leafletMap.current) return;
    try {
      await loadLeaflet();
      const L = mapGlobal.L;
      const zoomMap: Record<number, number> = { 1: 16, 3: 14, 5: 13, 10: 12, 15: 11, 20: 10 };
      const map = L.map(mapRef.current).setView([loc.lat, loc.lng], zoomMap[range] || 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      const userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div style="width:24px;height:24px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);position:relative;z-index:2;"></div><div style="width:48px;height:48px;border-radius:50%;background:rgba(59,130,246,0.15);position:absolute;top:-12px;left:-12px;z-index:1;"></div>',
        iconSize: [24, 24], iconAnchor: [12, 12],
      });
      L.marker([loc.lat, loc.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map).bindPopup(lbl.youAreHere);

      leafletMap.current = map;
      setMapReady(true);
      updateRangeCircle(loc, range);
    } catch (err) {
      console.error('Leaflet failed:', err);
    }
  }, [range, updateRangeCircle, lbl.youAreHere]);

  /* ---- Bootstrap ---- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLocationStatus('loading');
      let loc = DEFAULT_LOCATION;
      try {
        const ld = await getHighAccuracyLocation();
        loc = { lat: ld.lat, lng: ld.lng };
        setUserLocation(loc);
        setLocationAccuracy(ld.accuracy);
        setLocationStatus('success');
      } catch {
        console.warn('[MAP] Geolocation unavailable — using Bangkok default');
        setLocationStatus('denied');
      }
      if (cancelled) return;

      // Init map: Google if key available, else Leaflet
      if (MAPS_API_KEY) {
        try {
          await loadGoogleMapsScript(MAPS_API_KEY, language);
          if (!cancelled) initGoogleMap(loc);
        } catch {
          console.warn('[MAP] Google Maps failed — falling back to Leaflet');
          if (!cancelled) await initLeafletMap(loc);
        }
      } else {
        console.log('[MAP] No Google API key — using Leaflet + OpenStreetMap');
        if (!cancelled) await initLeafletMap(loc);
      }

      // Load facilities (works regardless of which map)
      if (!cancelled) loadFacilities(loc, range);
    })();

    return () => { cancelled = true; markersRef.current.forEach((m) => m.setMap(null)); };
  }, []);

  /* ---- Range change ---- */
  useEffect(() => {
    if (!mapReady) return;
    updateRangeCircle(userLocation, range);
    loadFacilities(userLocation, range);
    const zoomMap: Record<number, number> = { 1: 16, 3: 14, 5: 13, 10: 12, 15: 11, 20: 10 };
    const z = zoomMap[range] || 12;
    mapInstance.current?.setZoom(z);
    leafletMap.current?.setZoom(z);
  }, [range]);

  /* ---- Filter markers ---- */
  useEffect(() => {
    markersRef.current.forEach((m, i) => {
      const f = facilities[i];
      if (f) m.setVisible((filter === 'all' || f.type === filter) && (!search || f.name.toLowerCase().includes(search.toLowerCase())));
    });
    leafletMarkers.current.forEach((m: any, i: number) => {
      const f = facilities[i];
      if (f) {
        const show = (filter === 'all' || f.type === filter) && (!search || f.name.toLowerCase().includes(search.toLowerCase()));
        if (show) { if (!leafletMap.current?.hasLayer(m)) m.addTo(leafletMap.current); }
        else m.remove();
      }
    });
  }, [filter, search, facilities]);

  const filtered = filterFacilities(facilities, filter, search);

  /* ---- Refresh location & data ---- */
  const refresh = async () => {
    setLoading(true);
    try {
      const ld = await getHighAccuracyLocation();
      const loc = { lat: ld.lat, lng: ld.lng };
      setUserLocation(loc);
      setLocationAccuracy(ld.accuracy);
      setLocationStatus('success');
      mapInstance.current?.setCenter(loc);
      userMarkerRef.current?.setPosition(loc);
      leafletMap.current?.setView([loc.lat, loc.lng]);
      updateRangeCircle(loc, range);
      loadFacilities(loc, range);
    } catch {
      setLocationStatus('denied');
      loadFacilities(userLocation, range);
    }
  };

  const focusFacility = (f: Facility) => {
    setSelectedId(f.id);
    if (mapInstance.current) {
      mapInstance.current.setCenter(f.location);
      mapInstance.current.setZoom(16);
      const m = markersRef.current.find((x) => x.getTitle() === f.name);
      if (m) google.maps.event.trigger(m, 'click');
    }
    if (leafletMap.current) {
      leafletMap.current.setView([f.location.lat, f.location.lng], 16);
      const idx = facilities.findIndex((x) => x.id === f.id);
      if (idx >= 0 && leafletMarkers.current[idx]) leafletMarkers.current[idx].openPopup();
    }
  };

  const navigateTo = (f: Facility) => {
    globalThis.open(`https://www.google.com/maps/dir/?api=1&destination=${f.location.lat},${f.location.lng}`, '_blank');
  };

  const centerOnUser = () => {
    mapInstance.current?.setCenter(userLocation);
    leafletMap.current?.setView([userLocation.lat, userLocation.lng]);
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className={`flex flex-col h-[calc(100vh-100px)] -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 ${tc.pageBg}`}>
      {/* Header */}
      <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${tc.headerBg}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-sm">
            <MapPin className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className={`text-base font-bold ${tc.titleText}`}>{lbl.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-xs ${tc.subtitleText}`}>
                {lbl.radius} {range} {lbl.kmUnit} · {filtered.length} {lbl.found}
              </p>
              {locationStatus === 'success' && locationAccuracy != null && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  ±{locationAccuracy < 1000 ? `${Math.round(locationAccuracy)}m` : `${(locationAccuracy / 1000).toFixed(1)}km`}
                </span>
              )}
              {dataSource === 'server' && (
                <span className="text-[10px] text-gray-400">{lbl.dataSource}</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={refresh} disabled={loading} className={`p-2 rounded-lg transition-colors ${tc.refreshBtn}`} title={lbl.refresh}>
          <RefreshCw className={`w-4 h-4 ${tc.refreshIcon} ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Location denied warning */}
      {locationStatus === 'denied' && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2 flex items-center gap-3 shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">{lbl.locationDenied}</p>
        </div>
      )}

      {/* Range + Search */}
      <div className={`border-b px-4 py-2 flex items-center gap-2 shrink-0 ${tc.barBg}`}>
        <Sliders className={`w-3.5 h-3.5 shrink-0 ${tc.sliderIcon}`} />
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((km) => (
            <button
              key={km}
              onClick={() => setRange(km)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                getToggleClass(range === km, isDark, 'bg-emerald-600 text-white shadow-sm scale-105', 'bg-gray-700 text-gray-300 hover:bg-gray-600', 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }`}
            >
              {km}
            </button>
          ))}
        </div>
        <span className={`text-xs shrink-0 ${tc.subtitleText}`}>{lbl.kmUnit}</span>
        <div className="flex-1 relative ml-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lbl.searchPlaceholder}
            className={`w-full pl-7 pr-3 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none ${tc.inputBg}`}
          />
        </div>
      </div>

      {/* Type Filter */}
      <div className={`border-b px-4 py-2 flex gap-2 overflow-x-auto shrink-0 ${tc.barBg}`}>
        {(['all', 'hospital', 'clinic', 'pharmacy', 'health_center'] as const).map((t) => {
          const Icon = t === 'all' ? MapPin : iconMap[t];
          const cnt = t === 'all' ? facilities.length : facilities.filter((f) => f.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                getToggleClass(filter === t, isDark, 'bg-emerald-600 text-white', 'bg-gray-700 text-gray-300 hover:bg-gray-600', 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {getFilterLabel(t, language)}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${getToggleClass(filter === t, isDark, 'bg-white/20', 'bg-gray-600', 'bg-gray-200')}`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* MAP */}
      <div className="flex-1 relative min-h-[35vh]">
        <MapViewArea
          error={error}
          mapReady={mapReady}
          tc={tc}
          lbl={lbl}
          labels={labels}
          onCenter={centerOnUser}
          onReload={() => { setError(null); refresh(); }}
        >
          <div ref={mapRef} className="w-full h-full" />
        </MapViewArea>
      </div>

      {/* Collapsible Facility List */}
      <div className={`shrink-0 transition-all duration-300 ${listExpanded ? 'max-h-[50vh]' : 'max-h-12'} overflow-hidden ${tc.pageBg}`}>
        <button
          type="button"
          className={`w-full text-left px-4 py-2 border-t border-b sticky top-0 z-10 flex items-center justify-between cursor-pointer select-none ${tc.listHeaderBg}`}
          onClick={() => setListExpanded(!listExpanded)}
        >
          <h2 className={`text-sm font-semibold ${tc.listHeaderText}`}>
            {loading ? lbl.loadingFacilities : lbl.foundCount(filtered.length)}
          </h2>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
            {listExpanded ? <ChevronDown className={`w-4 h-4 ${tc.chevronColor}`} /> : <ChevronUp className={`w-4 h-4 ${tc.chevronColor}`} />}
          </div>
        </button>
        <div className="overflow-y-auto max-h-[calc(50vh-40px)]">
          <FacilityListContent
            loading={loading}
            facilities={facilities}
            filtered={filtered}
            selectedId={selectedId}
            language={language}
            tc={tc}
            focusFacility={focusFacility}
            navigateTo={navigateTo}
          />
        </div>
        {mapReady && facilities.length === 0 && !loading && (
          <div className={`p-4 ${tc.emptyBg}`}>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">⚠️ {lbl.noFacilities(range)}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{lbl.tryExpanding}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
