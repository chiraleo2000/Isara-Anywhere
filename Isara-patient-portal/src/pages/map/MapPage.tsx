/**
 * MapPage — Nearby Healthcare Facilities Finder
 * Version: 1.4.6
 * Features:
 *  - Google Maps integration with Places API
 *  - Distance range selector: 1, 5, 10, 15, 20 km
 *  - Filter by: Hospital, Clinic, Pharmacy, Health Center
 *  - Real-time GPS location with accuracy indicator
 *  - Thai/English bilingual support
 *  - Dark mode support
 *  - Navigate to facility via Google Maps
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import {
  MapPin, Search, Building2, Navigation, Loader2, AlertCircle,
  Pill, Stethoscope, Heart, User, RefreshCw, Star, ExternalLink,
  Target, AlertTriangle, Sliders,
} from 'lucide-react';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface Facility {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'health_center';
  address: string;
  rating?: number;
  ratingCount?: number;
  isOpen?: boolean;
  distance: number;
  distanceText: string;
  location: { lat: number; lng: number };
}

const DEFAULT_LOCATION = { lat: 13.7563, lng: 100.5018 }; // Bangkok
const RANGE_OPTIONS = [1, 5, 10, 15, 20] as const;

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

const formatDist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`);

const markerColors: Record<string, string> = {
  hospital: '#DC2626',
  clinic: '#2563EB',
  pharmacy: '#16A34A',
  health_center: '#9333EA',
};

const labels: Record<string, string> = {
  hospital: 'โรงพยาบาล',
  clinic: 'คลินิก',
  pharmacy: 'ร้านยา',
  health_center: 'ศูนย์สุขภาพ',
};

const colors: Record<string, string> = {
  hospital: 'bg-red-100 text-red-600',
  clinic: 'bg-blue-100 text-blue-600',
  pharmacy: 'bg-green-100 text-green-600',
  health_center: 'bg-purple-100 text-purple-600',
};

const iconMap: Record<string, typeof Building2> = {
  hospital: Building2,
  clinic: Stethoscope,
  pharmacy: Pill,
  health_center: Heart,
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function MapPage() {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const rangeCircleRef = useRef<google.maps.Circle | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'hospital' | 'clinic' | 'pharmacy' | 'health_center'>('all');
  const [range, setRange] = useState<number>(10); // km
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'denied' | 'error' | 'unavailable'>('loading');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  /* ---- Search places ---- */
  const searchPlaces = useCallback(
    (loc: { lat: number; lng: number }, keyword: string, type: string, radiusKm: number): Promise<Facility[]> => {
      return new Promise((resolve) => {
        if (!placesService.current) { resolve([]); return; }
        placesService.current.nearbySearch(
          { location: new google.maps.LatLng(loc.lat, loc.lng), radius: radiusKm * 1000, keyword },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(
                results
                  .map((p) => {
                    const lat = p.geometry?.location?.lat() || 0;
                    const lng = p.geometry?.location?.lng() || 0;
                    const dist = calcDistance(loc.lat, loc.lng, lat, lng);
                    return {
                      id: p.place_id || String(Math.random()),
                      name: p.name || 'Unknown',
                      type: type as Facility['type'],
                      address: p.vicinity || '',
                      rating: p.rating,
                      ratingCount: p.user_ratings_total,
                      isOpen: p.opening_hours?.open_now,
                      distance: dist,
                      distanceText: formatDist(dist),
                      location: { lat, lng },
                    };
                  })
                  .filter((f) => f.distance <= radiusKm),
              );
            } else {
              resolve([]);
            }
          },
        );
      });
    },
    [],
  );

  /* ---- Load all ---- */
  const loadFacilities = useCallback(
    async (loc: { lat: number; lng: number }, radiusKm: number) => {
      if (!placesService.current) return;
      setLoading(true);
      try {
        const results = await Promise.all([
          searchPlaces(loc, 'hospital โรงพยาบาล', 'hospital', radiusKm),
          searchPlaces(loc, 'clinic คลินิก doctor', 'clinic', radiusKm),
          searchPlaces(loc, 'pharmacy ร้านยา', 'pharmacy', radiusKm),
          searchPlaces(loc, 'health center ศูนย์สุขภาพ', 'health_center', radiusKm),
        ]);
        const all = results.flat();
        const unique = all.reduce<Facility[]>((acc, f) => {
          if (!acc.find((x) => x.id === f.id)) acc.push(f);
          return acc;
        }, []);
        unique.sort((a, b) => a.distance - b.distance);
        setFacilities(unique);
        addMarkers(unique);
      } catch {
        setError(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error loading facilities');
      } finally {
        setLoading(false);
      }
    },
    [searchPlaces, language],
  );

  /* ---- Markers ---- */
  const addMarkers = (list: Facility[]) => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (!mapInstance.current) return;
    if (!infoWindowRef.current) infoWindowRef.current = new google.maps.InfoWindow();

    list.forEach((f) => {
      const m = new google.maps.Marker({
        position: f.location,
        map: mapInstance.current,
        title: f.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: markerColors[f.type] || '#666',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        animation: google.maps.Animation.DROP,
      });
      m.addListener('click', () => {
        setSelectedId(f.id);
        infoWindowRef.current?.setContent(`
          <div style="padding:8px;max-width:220px;">
            <b>${f.name}</b>
            <p style="font-size:11px;color:#666;margin:4px 0;">${f.address}</p>
            ${f.rating ? `<p style="font-size:11px;">⭐ ${f.rating} (${f.ratingCount || 0})</p>` : ''}
            <p style="color:#059669;font-weight:600;">${f.distanceText}</p>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${f.location.lat},${f.location.lng}"
               target="_blank" style="display:inline-block;margin-top:6px;padding:5px 10px;background:#059669;color:#fff;border-radius:4px;text-decoration:none;font-size:11px;">
              ${language === 'th' ? 'นำทาง' : 'Navigate'}
            </a>
          </div>
        `);
        infoWindowRef.current?.open(mapInstance.current, m);
      });
      markersRef.current.push(m);
    });
  };

  /* ---- Range circle ---- */
  const updateRangeCircle = useCallback(
    (loc: { lat: number; lng: number }, radiusKm: number) => {
      if (rangeCircleRef.current) rangeCircleRef.current.setMap(null);
      if (!mapInstance.current) return;
      rangeCircleRef.current = new google.maps.Circle({
        map: mapInstance.current,
        center: loc,
        radius: radiusKm * 1000,
        strokeColor: '#059669',
        strokeOpacity: 0.4,
        strokeWeight: 2,
        fillColor: '#059669',
        fillOpacity: 0.06,
      });
    },
    [],
  );

  /* ---- Init map ---- */
  const initMap = useCallback(
    (loc: { lat: number; lng: number }) => {
      if (!mapRef.current || mapInstance.current) return;
      const map = new google.maps.Map(mapRef.current, {
        center: loc,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
      });
      mapInstance.current = map;
      placesService.current = new google.maps.places.PlacesService(map);

      userMarkerRef.current = new google.maps.Marker({
        position: loc,
        map,
        title: language === 'th' ? 'คุณอยู่ที่นี่' : 'You are here',
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
        zIndex: 1000,
      });
      // Pulse
      new google.maps.Marker({
        position: loc,
        map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 24, fillColor: '#3B82F6', fillOpacity: 0.25, strokeWeight: 0 },
        zIndex: 999,
      });
      setMapReady(true);
      updateRangeCircle(loc, range);
      loadFacilities(loc, range);
    },
    [language, range, loadFacilities, updateRangeCircle],
  );

  /* ---- Geolocation helpers ---- */
  const getHighAccuracyLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('No geolocation')); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
        () =>
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
            reject,
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
          ),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });

  /* ---- Bootstrap ---- */
  useEffect(() => {
    if (!MAPS_API_KEY) { setError('ไม่พบ API Key สำหรับ Google Maps'); setLoading(false); setLocationStatus('error'); return; }

    const setupMap = async (loc: { lat: number; lng: number }) => {
      if (window.google?.maps) { initMap(loc); return; }
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&language=th`;
      s.async = true;
      s.onload = () => initMap(loc);
      s.onerror = () => { setError('โหลด Google Maps ไม่สำเร็จ'); setLoading(false); };
      document.head.appendChild(s);
    };

    (async () => {
      setLocationStatus('loading');
      try {
        const ld = await getHighAccuracyLocation();
        const loc = { lat: ld.lat, lng: ld.lng };
        setUserLocation(loc);
        setLocationAccuracy(ld.accuracy);
        setLocationStatus('success');
        setupMap(loc);
      } catch {
        setLocationStatus('denied');
        setupMap(DEFAULT_LOCATION);
      }
    })();

    return () => { markersRef.current.forEach((m) => m.setMap(null)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Range change ---- */
  useEffect(() => {
    if (!mapReady) return;
    updateRangeCircle(userLocation, range);
    loadFacilities(userLocation, range);
    // Adjust zoom: 1km→15, 5km→13, 10km→12, 15km→11, 20km→10
    const zoomMap: Record<number, number> = { 1: 15, 5: 13, 10: 12, 15: 11, 20: 10 };
    mapInstance.current?.setZoom(zoomMap[range] || 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  /* ---- Filter markers ---- */
  useEffect(() => {
    markersRef.current.forEach((m, i) => {
      const f = facilities[i];
      if (f) {
        const show = (filter === 'all' || f.type === filter) && (!search || f.name.toLowerCase().includes(search.toLowerCase()));
        m.setVisible(show);
      }
    });
  }, [filter, search, facilities]);

  const filtered = facilities.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.address.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || f.type === filter;
    return matchSearch && matchFilter;
  });

  /* ---- Refresh ---- */
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
      updateRangeCircle(loc, range);
      loadFacilities(loc, range);
    } catch {
      setLocationStatus('denied');
      setLoading(false);
    }
  };

  const focusFacility = (f: Facility) => {
    setSelectedId(f.id);
    mapInstance.current?.setCenter(f.location);
    mapInstance.current?.setZoom(16);
    const m = markersRef.current.find((x) => x.getTitle() === f.name);
    if (m) google.maps.event.trigger(m, 'click');
  };

  const navigateTo = (f: Facility) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${f.location.lat},${f.location.lng}`, '_blank');
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className={`flex flex-col h-[calc(100vh-100px)] -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 ${isDark ? 'bg-gray-900' : ''}`}>
      {/* Header */}
      <div className={`border-b px-4 py-3 flex items-center justify-between shrink-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {language === 'th' ? 'สถานพยาบาลใกล้เคียง' : 'Nearby Healthcare'}
            </h1>
            <div className="flex items-center gap-2">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {language === 'th' ? 'รัศมี' : 'Radius'} {range} {language === 'th' ? 'กม.' : 'km'}
              </p>
              {locationStatus === 'success' && locationAccuracy && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Target className="w-3 h-3" />±{locationAccuracy < 1000 ? `${Math.round(locationAccuracy)}m` : `${(locationAccuracy / 1000).toFixed(1)}km`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={loading} className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <RefreshCw className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'} ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Location denied banner */}
      {locationStatus === 'denied' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">{language === 'th' ? 'ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง — ใช้ตำแหน่งเริ่มต้น (กรุงเทพ)' : 'Location access denied — using default (Bangkok)'}</p>
        </div>
      )}

      {/* ▸ Range Selector — 1 / 5 / 10 / 15 / 20 km */}
      <div className={`border-b px-4 py-2 flex items-center gap-3 shrink-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <Sliders className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {language === 'th' ? 'รัศมีค้นหา:' : 'Search Range:'}
        </span>
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map((km) => (
            <button
              key={km}
              onClick={() => setRange(km)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                range === km
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {km} {language === 'th' ? 'กม.' : 'km'}
            </button>
          ))}
        </div>
      </div>

      {/* ▸ Facility Type Filter */}
      <div className={`border-b px-4 py-2 flex gap-2 overflow-x-auto shrink-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        {(['all', 'hospital', 'clinic', 'pharmacy', 'health_center'] as const).map((t) => {
          const Icon = t === 'all' ? MapPin : iconMap[t];
          const cnt = t === 'all' ? facilities.length : facilities.filter((f) => f.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                filter === t ? 'bg-emerald-600 text-white' : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t === 'all' ? (language === 'th' ? 'ทั้งหมด' : 'All') : labels[t]}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${filter === t ? 'bg-white/20' : isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* ▸ Map */}
      <div className="flex-1 relative min-h-[40vh]">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-center p-6">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <p className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{error}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4" /> {language === 'th' ? 'รีเฟรช' : 'Refresh'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div ref={mapRef} className="w-full h-full" />
            {!mapReady && (
              <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-3" />
                  <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{language === 'th' ? 'กำลังโหลดแผนที่...' : 'Loading map...'}</p>
                </div>
              </div>
            )}
            {mapReady && (
              <>
                {/* Legend */}
                <div className={`absolute top-3 right-3 backdrop-blur rounded-lg shadow p-2 text-xs z-10 ${isDark ? 'bg-gray-800/95 text-gray-200' : 'bg-white/95'}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-full" /><span>{labels.hospital}</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /><span>{labels.clinic}</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-green-500 rounded-full" /><span>{labels.pharmacy}</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-purple-500 rounded-full" /><span>{labels.health_center}</span></div>
                    <div className="flex items-center gap-2 border-t pt-1 mt-1"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-blue-200" /><span>{language === 'th' ? 'ตำแหน่งคุณ' : 'You'}</span></div>
                  </div>
                </div>
                {/* Center button */}
                <button onClick={() => { mapInstance.current?.setCenter(userLocation); }} className="absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 z-10">
                  <User className="w-5 h-5 text-blue-600" />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Search */}
      <div className={`border-t px-4 py-3 shrink-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'th' ? 'ค้นหาชื่อหรือที่อยู่...' : 'Search name or address...'}
            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`}
          />
        </div>
        {mapReady && facilities.length === 0 && !loading && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">⚠️ {language === 'th' ? `ไม่พบสถานพยาบาลในรัศมี ${range} กม.` : `No facilities within ${range} km`}</p>
            <p className="text-xs text-amber-600 mt-1">{language === 'th' ? 'กรุณาเปิดใช้งาน Places API ใน Google Cloud Console' : 'Enable Places API in Google Cloud Console'}</p>
            <a href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline">
              <ExternalLink className="w-3 h-3" /> Google Cloud Console
            </a>
          </div>
        )}
      </div>

      {/* Facility List */}
      <div className={`shrink-0 max-h-60 overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`px-4 py-2 border-b sticky top-0 z-10 flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h2 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {language === 'th' ? `พบ ${filtered.length} แห่ง` : `${filtered.length} found`}
          </h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
        </div>
        <div className="divide-y">
          {loading && facilities.length === 0 ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">{language === 'th' ? 'ไม่พบสถานพยาบาล' : 'No facilities found'}</p></div>
          ) : (
            filtered.slice(0, 30).map((f) => {
              const Icon = iconMap[f.type] || Building2;
              const sel = selectedId === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => focusFacility(f)}
                  className={`p-3 cursor-pointer transition ${
                    sel ? 'border-l-4 border-emerald-500' : ''
                  } ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-emerald-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors[f.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div>
                          <h3 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{f.name}</h3>
                          <span className={`inline-block px-1.5 py-0.5 text-xs rounded mt-0.5 ${colors[f.type]}`}>{labels[f.type]}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-emerald-600">{f.distanceText}</p>
                          {f.isOpen !== undefined && (
                            <p className={`text-xs ${f.isOpen ? 'text-green-600' : 'text-red-500'}`}>{f.isOpen ? (language === 'th' ? 'เปิด' : 'Open') : (language === 'th' ? 'ปิด' : 'Closed')}</p>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs mt-1 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.address}</p>
                      {f.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{f.rating}</span>
                          <span className="text-xs text-gray-400">({f.ratingCount})</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigateTo(f); }}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shrink-0"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
