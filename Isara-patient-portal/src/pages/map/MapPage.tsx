import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Building2, Navigation, Loader2, AlertCircle, Pill, Stethoscope, Heart, User, RefreshCw, Star, ExternalLink, Target, AlertTriangle } from 'lucide-react';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
// Map ID for AdvancedMarkerElement - Get from Google Cloud Console > Google Maps Platform > Map Management
// See: https://developers.google.com/maps/documentation/javascript/advanced-markers/start#create-a-map-id
const MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '';

const globalScope = globalThis as typeof globalThis & {
  google?: typeof google;
  [key: string]: unknown;
};

// Helper to check if AdvancedMarkerElement is available (not a hook - renamed to avoid confusion)
const canUseAdvancedMarkers = () => Boolean(MAPS_MAP_ID && globalScope.google?.maps?.marker?.AdvancedMarkerElement);

const isAdvancedMarker = (
  marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement
): marker is google.maps.marker.AdvancedMarkerElement => 'content' in marker;

const isClassicMarker = (
  marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement
): marker is google.maps.Marker => 'setMap' in marker;

// Helper to clear marker from map (works for both marker types)
const clearMarker = (marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement): void => {
  // AdvancedMarkerElement has 'content' property, Marker doesn't
  if (isAdvancedMarker(marker)) {
    marker.map = null;
    return;
  }
  marker.setMap(null);
};

interface Facility {
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

// Default location fallback - Bangkok
const DEFAULT_LOCATION = { lat: 13.7563, lng: 100.5018 };

const directionsUrl = (location: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;

const buildInfoWindowContent = (facility: Facility) => `
  <div style="padding:8px;max-width:200px;">
    <b>${facility.name}</b>
    <p style="font-size:11px;color:#666;margin:4px 0;">${facility.address}</p>
    ${facility.rating ? `<p style="font-size:11px;">⭐ ${facility.rating}</p>` : ''}
    <p style="color:#059669;font-weight:600;">${facility.distanceText}</p>
    <a href="${directionsUrl(facility.location)}"
       target="_blank"
       style="display:inline-block;margin-top:6px;padding:5px 10px;background:#059669;color:#fff;border-radius:4px;text-decoration:none;font-size:11px;">
      นำทาง
    </a>
  </div>
`;

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const getCurrentPosition = (options: PositionOptions) => new Promise<GeolocationPosition>((resolve, reject) => {
  navigator.geolocation.getCurrentPosition(resolve, reject, options);
});

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  // Support both classic Marker and AdvancedMarkerElement
  const markers = useRef<(google.maps.Marker | google.maps.marker.AdvancedMarkerElement)[]>([]);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | google.maps.marker.AdvancedMarkerElement | null>(null);
  const pulseMarkerRef = useRef<google.maps.Marker | null>(null);
  const mapsCallbackRef = useRef(`gMapsCallback_${Date.now()}`);
  const mapsErrorCallbackRef = useRef(`gMapsError_${Date.now()}`);
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'hospital' | 'clinic' | 'pharmacy' | 'health_center'>('all');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'denied' | 'error' | 'unavailable'>('loading');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationAccuracyRef = useRef<number | null>(null);
  const userLocationRef = useRef(DEFAULT_LOCATION);

  // Distance calculation
  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const formatDist = (km: number) => km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`;

  const setUserLocationState = (loc: { lat: number; lng: number }) => {
    userLocationRef.current = loc;
    setUserLocation(loc);
  };

  const setAccuracyState = (accuracy: number | null) => {
    locationAccuracyRef.current = accuracy;
    setLocationAccuracy(accuracy);
  };

  // Marker colors
  const markerColors: Record<string, string> = {
    hospital: '#DC2626',
    clinic: '#2563EB',
    pharmacy: '#16A34A',
    health_center: '#9333EA',
  };

  const mapPlacesToFacilities = (
    results: google.maps.places.PlaceResult[],
    loc: { lat: number; lng: number },
    type: Facility['type']
  ): Facility[] => results
    .map(p => {
      const lat = p.geometry?.location?.lat() || 0;
      const lng = p.geometry?.location?.lng() || 0;
      const dist = calcDistance(loc.lat, loc.lng, lat, lng);
      return {
        id: p.place_id || String(Math.random()),
        name: p.name || 'Unknown',
        type,
        address: p.vicinity || '',
        rating: p.rating,
        ratingCount: p.user_ratings_total,
        isOpen: p.opening_hours?.open_now,
        distance: dist,
        distanceText: formatDist(dist),
        location: { lat, lng },
      };
    })
    .filter(f => f.distance <= 15);

  // Search places
  const searchPlaces = (loc: { lat: number; lng: number }, keyword: string, type: Facility['type']): Promise<Facility[]> => {
    return new Promise((resolve) => {
      if (!placesService.current) { resolve([]); return; }

      placesService.current.nearbySearch({
        location: new google.maps.LatLng(loc.lat, loc.lng),
        radius: 15000,
        keyword,
      }, (results, status) => {
        console.log(`[${keyword}] ${status}: ${results?.length || 0} results`);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(mapPlacesToFacilities(results, loc, type));
        } else {
          resolve([]);
        }
      });
    });
  };

  // Load all facilities
  const loadFacilities = async (loc: { lat: number; lng: number }) => {
    if (!placesService.current) return;
    setLoading(true);
    console.log('Loading near:', loc);

    try {
      const results = await Promise.all([
        searchPlaces(loc, 'hospital โรงพยาบาล', 'hospital'),
        searchPlaces(loc, 'clinic คลินิก doctor', 'clinic'),
        searchPlaces(loc, 'pharmacy ร้านยา', 'pharmacy'),
        searchPlaces(loc, 'health center ศูนย์สุขภาพ', 'health_center'),
      ]);

      const all = results.flat();
      const unique = all.reduce<Facility[]>((acc, f) => {
        if (!acc.some(x => x.id === f.id)) acc.push(f);
        return acc;
      }, []);
      unique.sort((a, b) => a.distance - b.distance);

      console.log('Total facilities:', unique.length);
      setFacilities(unique);
      addMarkers(unique);
    } catch (e) {
      console.error(e);
      setError('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  // Add markers - uses AdvancedMarkerElement when Map ID is configured, otherwise falls back to classic Marker
  const addMarkers = (list: Facility[]) => {
    markers.current.forEach(m => clearMarker(m));
    markers.current = [];
    if (!mapInstance.current) return;
    infoWindow.current ??= new google.maps.InfoWindow();

    const advancedMarkersAvailable = canUseAdvancedMarkers();
    
    list.forEach(f => {
      let marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;
      
      if (advancedMarkersAvailable) {
        // Use AdvancedMarkerElement (new API - no deprecation warning)
        const pinElement = new google.maps.marker.PinElement({
          background: markerColors[f.type] || '#666',
          borderColor: '#fff',
          glyphColor: '#fff',
          scale: 1.2,
        });
        
        marker = new google.maps.marker.AdvancedMarkerElement({
          position: f.location,
          map: mapInstance.current,
          title: f.name,
          content: pinElement.element,
        });
        
        marker.addListener('click', () => {
          setSelectedId(f.id);
          infoWindow.current?.setContent(buildInfoWindowContent(f));
          infoWindow.current?.open({ anchor: marker, map: mapInstance.current });
        });
      } else {
        // Fall back to classic Marker (deprecated but still works)
        marker = new google.maps.Marker({
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

        marker.addListener('click', () => {
          setSelectedId(f.id);
          infoWindow.current?.setContent(buildInfoWindowContent(f));
          infoWindow.current?.open(mapInstance.current, marker);
        });
      }

      markers.current.push(marker);
    });
  };

  // Initialize map
  const initMap = (loc: { lat: number; lng: number }) => {
    if (!mapRef.current || mapInstance.current) return;
    console.log('Init map at:', loc);

    const advancedMarkersAvailable = canUseAdvancedMarkers();
    
    const mapOptions: google.maps.MapOptions = {
      center: loc,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
    };
    
    // Add mapId if available for AdvancedMarkerElement support
    if (MAPS_MAP_ID) {
      mapOptions.mapId = MAPS_MAP_ID;
    }

    const map = new google.maps.Map(mapRef.current, mapOptions);

    mapInstance.current = map;
    placesService.current = new google.maps.places.PlacesService(map);

    // User marker - use AdvancedMarkerElement when Map ID is configured
    if (advancedMarkersAvailable) {
      // Create custom user location marker with AdvancedMarkerElement
      const userPinElement = document.createElement('div');
      userPinElement.innerHTML = `
        <div style="position: relative;">
          <div style="width: 24px; height: 24px; background: #3B82F6; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
          <div style="position: absolute; top: -6px; left: -6px; width: 36px; height: 36px; background: rgba(59, 130, 246, 0.25); border-radius: 50%; animation: pulse 2s infinite;"></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `;
      
      userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: loc,
        map,
        title: 'คุณอยู่ที่นี่',
        content: userPinElement,
        zIndex: 1000,
      });
    } else {
      // Fall back to classic Marker
      userMarkerRef.current = new google.maps.Marker({
        position: loc,
        map,
        title: 'คุณอยู่ที่นี่',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        zIndex: 1000,
      });

      // Pulse effect marker (only for classic markers)
      if (pulseMarkerRef.current) {
        pulseMarkerRef.current.setMap(null);
      }
      pulseMarkerRef.current = new google.maps.Marker({
        position: loc,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 24,
          fillColor: '#3B82F6',
          fillOpacity: 0.25,
          strokeWeight: 0,
        },
        zIndex: 999,
      });
    }

    setMapReady(true);
    loadFacilities(loc);
  };

  // Update user marker position
  const updateUserMarker = (loc: { lat: number; lng: number }) => {
    const marker = userMarkerRef.current;
    if (!marker || !mapInstance.current) return;
    if (isClassicMarker(marker)) {
      marker.setPosition(loc);
      return;
    }
    marker.position = loc;
  };

  // Get high accuracy location
  const getHighAccuracyLocation = async (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    try {
      const position = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('High accuracy failed, trying low accuracy:', message);
      const position = await getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    }
  };

  const handleMapsApiError = (err: unknown) => {
    console.error('Google Maps API error:', err);
    setError('Google Maps API Key ไม่ถูกต้องหรือถูกจำกัดสิทธิ์');
    setLoading(false);
  };

  const loadGoogleMapsScript = (): Promise<void> => new Promise((resolve, reject) => {
    if (globalScope.google?.maps) {
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const callbackName = mapsCallbackRef.current;
    globalScope[callbackName] = () => {
      console.log('Google Maps loaded via callback');
      resolve();
    };

    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places,marker&language=th&callback=${callbackName}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      reject(new Error('Script load failed'));
    };

    document.head.appendChild(s);
  });

  const setupMapWithRetry = async (loc: { lat: number; lng: number }, maxRetries: number) => {
    if (globalScope.google?.maps) {
      initMap(loc);
      return true;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await loadGoogleMapsScript();
        initMap(loc);
        return true;
      } catch (err) {
        console.warn('Google Maps load failed:', err);
        if (attempt < maxRetries) {
          console.log(`Retrying Google Maps load (${attempt}/${maxRetries})...`);
          await delay(1000 * attempt);
        }
      }
    }

    setError('โหลด Google Maps ไม่สำเร็จ กรุณารีเฟรชหน้า');
    setLoading(false);
    return false;
  };

  const handleWatchPosition = (position: GeolocationPosition) => {
    const newLoc = { 
      lat: position.coords.latitude, 
      lng: position.coords.longitude 
    };
    const newAccuracy = position.coords.accuracy;
    const currentAccuracy = locationAccuracyRef.current;

    if (!currentAccuracy || newAccuracy < currentAccuracy * 0.8) {
      console.log('Location updated, new accuracy:', newAccuracy, 'meters');
      const previousLoc = userLocationRef.current;
      setUserLocationState(newLoc);
      setAccuracyState(newAccuracy);
      updateUserMarker(newLoc);

      const distance = calcDistance(previousLoc.lat, previousLoc.lng, newLoc.lat, newLoc.lng);
      if (distance > 0.5) {
        loadFacilities(newLoc);
      }
    }
  };

  const handleWatchError = (error: GeolocationPositionError) => {
    console.warn('Watch position error:', error.message);
  };

  const startLocationWatch = () => {
    const id = navigator.geolocation.watchPosition(
      handleWatchPosition,
      handleWatchError,
      { 
        enableHighAccuracy: true, 
        maximumAge: 30000, 
        timeout: 20000 
      }
    );
    watchIdRef.current = id;
  };

  const initWithLocation = async (maxRetries: number) => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported, using default location');
      setLocationStatus('unavailable');
      await setupMapWithRetry(DEFAULT_LOCATION, maxRetries);
      return;
    }

    setLocationStatus('loading');

    try {
      const locationData = await getHighAccuracyLocation();
      const loc = { lat: locationData.lat, lng: locationData.lng };
      console.log('Got location with accuracy:', locationData.accuracy, 'meters');
      setUserLocationState(loc);
      setAccuracyState(locationData.accuracy);
      setLocationStatus('success');
      await setupMapWithRetry(loc, maxRetries);
      startLocationWatch();
    } catch (err: any) {
      console.error('Location error:', err.message);
      if (err.code === 1) {
        setLocationStatus('denied');
      } else {
        setLocationStatus('error');
      }
      await setupMapWithRetry(DEFAULT_LOCATION, maxRetries);
    }
  };

  // Load script with retry
  useEffect(() => {
    // Debug: Log API key status for troubleshooting
    console.log('[MapPage] API Key check:', {
      hasKey: !!MAPS_API_KEY,
      keyPrefix: MAPS_API_KEY ? MAPS_API_KEY.substring(0, 10) + '...' : 'NOT SET',
      mapId: MAPS_MAP_ID || 'NOT SET',
      envMode: import.meta.env.MODE
    });

    if (!MAPS_API_KEY) {
      console.error('VITE_GOOGLE_MAPS_API_KEY not found. Check .env file or build args.');
      setError(`ไม่พบ Google Maps API Key

แก้ไขปัญหา Google Maps:
1. ✅ ตรวจสอบว่า VITE_GOOGLE_MAPS_API_KEY ถูกต้องใน .env
2. ✅ เปิดใช้งาน Maps JavaScript API และ Places API ใน Google Cloud Console
3. ✅ ตรวจสอบ API Key Restrictions:
   - Application restrictions → HTTP referrers
   - เพิ่ม: localhost:*, *.localhost:*, *.run.app
4. ✅ ตรวจสอบว่า Billing เปิดใช้งานใน Google Cloud

Current env: ${import.meta.env.MODE}`);
      setLoading(false);
      setLocationStatus('error');
      return;
    }

    const maxRetries = 3;
    globalScope[mapsErrorCallbackRef.current] = handleMapsApiError;
    void initWithLocation(maxRetries);

    return () => { 
      markers.current.forEach(m => clearMarker(m)); 
      if (pulseMarkerRef.current) {
        pulseMarkerRef.current.setMap(null);
        pulseMarkerRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Refresh with high accuracy
  const refresh = async () => {
    setLoading(true);
    setLocationStatus('loading');
    
    try {
      const locationData = await getHighAccuracyLocation();
      const loc = { lat: locationData.lat, lng: locationData.lng };
      console.log('Refreshed location with accuracy:', locationData.accuracy, 'meters');
      setUserLocationState(loc);
      setAccuracyState(locationData.accuracy);
      setLocationStatus('success');
      mapInstance.current?.setCenter(loc);
      updateUserMarker(loc);
      loadFacilities(loc);
    } catch (err: any) {
      console.error('Refresh location error:', err.message);
      if (err.code === 1) {
        setLocationStatus('denied');
      } else {
        setLocationStatus('error');
      }
      setLoading(false);
    }
  };

  // Request location permission explicitly
  const requestLocation = async () => {
    setLocationStatus('loading');
    try {
      const locationData = await getHighAccuracyLocation();
      const loc = { lat: locationData.lat, lng: locationData.lng };
      setUserLocationState(loc);
      setAccuracyState(locationData.accuracy);
      setLocationStatus('success');
      
      if (mapInstance.current) {
        mapInstance.current.setCenter(loc);
        updateUserMarker(loc);
        loadFacilities(loc);
      }
    } catch (err: any) {
      if (err.code === 1) {
        setLocationStatus('denied');
      } else {
        setLocationStatus('error');
      }
    }
  };

  // Filter
  const filtered = facilities.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.address.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || f.type === filter;
    return matchSearch && matchFilter;
  });

  // Update marker visibility
  useEffect(() => {
    markers.current.forEach((m, i) => {
      const f = facilities[i];
      if (f) {
        const show = (filter === 'all' || f.type === filter) && (!search || f.name.toLowerCase().includes(search.toLowerCase()));
        // Handle visibility for both marker types
        if (isClassicMarker(m)) {
          m.setVisible(show);
        } else {
          // AdvancedMarkerElement uses CSS for visibility
          const element = m.element;
          if (element) {
            element.style.display = show ? 'block' : 'none';
          }
        }
      }
    });
  }, [filter, search, facilities]);

  const filterOptions: Array<'all' | 'hospital' | 'clinic' | 'pharmacy' | 'health_center'> = ['all', 'hospital', 'clinic', 'pharmacy', 'health_center'];
  const labels: Record<string, string> = { hospital: 'โรงพยาบาล', clinic: 'คลินิก', pharmacy: 'ร้านยา', health_center: 'ศูนย์สุขภาพ' };
  const colors: Record<string, string> = { hospital: 'bg-red-100 text-red-600', clinic: 'bg-blue-100 text-blue-600', pharmacy: 'bg-green-100 text-green-600', health_center: 'bg-purple-100 text-purple-600' };
  const icons: Record<string, typeof Building2> = { hospital: Building2, clinic: Stethoscope, pharmacy: Pill, health_center: Heart };

  const focusFacility = (f: Facility) => {
    setSelectedId(f.id);
    mapInstance.current?.setCenter(f.location);
    mapInstance.current?.setZoom(16);
    // Find marker by title (works for both marker types)
    const m = markers.current.find(x => {
      if (isClassicMarker(x)) {
        return x.getTitle() === f.name;
      }
      return x.title === f.name;
    });
    if (m) google.maps.event.trigger(m, 'click');
  };

  const navigate = (f: Facility) => {
    globalThis.open?.(directionsUrl(f.location), '_blank');
  };

  let listContent: JSX.Element;
  if (loading && facilities.length === 0) {
    listContent = (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  } else if (filtered.length === 0) {
    listContent = (
      <div className="text-center py-8 text-gray-500">
        <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">ไม่พบสถานพยาบาล</p>
      </div>
    );
  } else {
    listContent = (
      <>
        {filtered.slice(0, 30).map(f => {
          const Icon = icons[f.type] || Building2;
          const sel = selectedId === f.id;
          const openStatus = f.isOpen === undefined ? null : {
            label: f.isOpen ? 'เปิด' : 'ปิด',
            className: f.isOpen ? 'text-green-600' : 'text-red-500'
          };
          return (
            <div
              key={f.id}
              className={`p-3 bg-white transition ${sel ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => focusFacility(f)}
                  className="flex-1 min-w-0 text-left hover:bg-emerald-50 rounded-lg -m-2 p-2"
                  aria-pressed={sel}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors[f.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-gray-800 text-sm">{f.name}</h3>
                          <span className={`inline-block px-1.5 py-0.5 text-xs rounded mt-0.5 ${colors[f.type]}`}>{labels[f.type]}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-emerald-600">{f.distanceText}</p>
                          {openStatus && (
                            <p className={`text-xs ${openStatus.className}`}>{openStatus.label}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{f.address}</p>
                      {f.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs text-gray-600">{f.rating}</span>
                          <span className="text-xs text-gray-400">({f.ratingCount})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(f)}
                  className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shrink-0"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">สถานพยาบาลใกล้เคียง</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">
                รัศมี 15 กม. • {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
              {locationStatus === 'success' && locationAccuracy && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  ±{locationAccuracy < 1000 ? `${Math.round(locationAccuracy)}m` : `${(locationAccuracy/1000).toFixed(1)}km`}
                </span>
              )}
              {locationStatus === 'denied' && (
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  ใช้ตำแหน่งเริ่มต้น
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(locationStatus === 'denied' || locationStatus === 'error') && (
            <button 
              onClick={requestLocation} 
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg flex items-center gap-1"
            >
              <Target className="w-3.5 h-3.5" />
              ใช้ตำแหน่งจริง
            </button>
          )}
          <button onClick={refresh} disabled={loading} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Location Permission Banner */}
      {locationStatus === 'denied' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-800">ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง</p>
            <p className="text-xs text-amber-600">กรุณาอนุญาตการเข้าถึงตำแหน่งในการตั้งค่าเบราว์เซอร์ เพื่อค้นหาสถานพยาบาลใกล้คุณ</p>
          </div>
          <button 
            onClick={requestLocation}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg whitespace-nowrap"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto shrink-0">
        {filterOptions.map(t => {
          const Icon = t === 'all' ? MapPin : icons[t];
          const cnt = t === 'all' ? facilities.length : facilities.filter(f => f.type === t).length;
          return (
            <button key={t} onClick={() => setFilter(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === t ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Icon className="w-3.5 h-3.5" />
              {t === 'all' ? 'ทั้งหมด' : labels[t]}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${filter === t ? 'bg-white/20' : 'bg-gray-200'}`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-[45vh]">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center p-6 max-w-md">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">{error}</p>
              {error.includes('API Key') && (
                <div className="text-sm text-gray-500 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-medium text-amber-800 mb-1">แก้ไขปัญหา Google Maps:</p>
                  <ol className="text-left text-xs space-y-1 text-amber-700">
                    <li>1. ตรวจสอบว่า API Key ถูกต้องใน .env</li>
                    <li>2. เปิดใช้งาน Maps JavaScript API ใน Google Cloud Console</li>
                    <li>3. ตรวจสอบ HTTP Referrer ให้รองรับ localhost</li>
                  </ol>
                </div>
              )}
              <button 
                onClick={() => globalThis.location.reload()} 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                รีเฟรชหน้า
              </button>
            </div>
          </div>
        ) : (
          <>
            <div ref={mapRef} className="w-full h-full" />
            {!mapReady && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-3" />
                  <p className="text-gray-600">กำลังโหลดแผนที่...</p>
                </div>
              </div>
            )}
            {mapReady && (
              <>
                {/* Legend */}
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur rounded-lg shadow p-2 text-xs z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-full" /><span>โรงพยาบาล</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /><span>คลินิก</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-green-500 rounded-full" /><span>ร้านยา</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-purple-500 rounded-full" /><span>ศูนย์สุขภาพ</span></div>
                    <div className="flex items-center gap-2 border-t pt-1 mt-1"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-blue-200" /><span>ตำแหน่งคุณ</span></div>
                  </div>
                </div>
                {/* Center btn */}
                <button onClick={() => { mapInstance.current?.setCenter(userLocation); mapInstance.current?.setZoom(13); }}
                  className="absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 z-10">
                  <User className="w-5 h-5 text-blue-600" />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Search */}
      <div className="bg-white border-t px-4 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อหรือที่อยู่..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" />
        </div>
        {mapReady && facilities.length === 0 && !loading && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">⚠️ ไม่พบสถานพยาบาลในรัศมี 15 กม.</p>
            <p className="text-xs text-amber-600 mt-1">กรุณาเปิดใช้งาน <b>Places API</b> ใน Google Cloud Console</p>
            <a href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline">
              <ExternalLink className="w-3 h-3" /> เปิด Google Cloud Console
            </a>
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-gray-50 shrink-0 max-h-60 overflow-y-auto">
        <div className="px-4 py-2 bg-white border-b sticky top-0 z-10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">พบ {filtered.length} แห่ง</h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
        </div>
        <div className="divide-y">
          {listContent}
        </div>
      </div>
    </div>
  );
}
