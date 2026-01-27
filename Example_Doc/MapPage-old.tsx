import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Building2, Navigation, Loader2, AlertCircle, Pill, Stethoscope, Heart, User, RefreshCw, Star, ExternalLink, Target, AlertTriangle } from 'lucide-react';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

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

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  
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
  const [watchId, setWatchId] = useState<number | null>(null);

  // Distance calculation
  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const formatDist = (km: number) => km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`;

  // Marker colors
  const markerColors: Record<string, string> = {
    hospital: '#DC2626',
    clinic: '#2563EB',
    pharmacy: '#16A34A',
    health_center: '#9333EA',
  };

  // Search places
  const searchPlaces = (loc: { lat: number; lng: number }, keyword: string, type: string): Promise<Facility[]> => {
    return new Promise((resolve) => {
      if (!placesService.current) { resolve([]); return; }

      placesService.current.nearbySearch({
        location: new google.maps.LatLng(loc.lat, loc.lng),
        radius: 15000,
        keyword,
      }, (results, status) => {
        console.log(`[${keyword}] ${status}: ${results?.length || 0} results`);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const items = results.map(p => {
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
          }).filter(f => f.distance <= 15);
          resolve(items);
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
        if (!acc.find(x => x.id === f.id)) acc.push(f);
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

  // Add markers
  const addMarkers = (list: Facility[]) => {
    markers.current.forEach(m => m.setMap(null));
    markers.current = [];
    if (!mapInstance.current) return;
    if (!infoWindow.current) infoWindow.current = new google.maps.InfoWindow();

    list.forEach(f => {
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
        infoWindow.current?.setContent(`
          <div style="padding:8px;max-width:200px;">
            <b>${f.name}</b>
            <p style="font-size:11px;color:#666;margin:4px 0;">${f.address}</p>
            ${f.rating ? `<p style="font-size:11px;">⭐ ${f.rating}</p>` : ''}
            <p style="color:#059669;font-weight:600;">${f.distanceText}</p>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${f.location.lat},${f.location.lng}" 
               target="_blank" style="display:inline-block;margin-top:6px;padding:5px 10px;background:#059669;color:#fff;border-radius:4px;text-decoration:none;font-size:11px;">
              นำทาง
            </a>
          </div>
        `);
        infoWindow.current?.open(mapInstance.current, m);
      });

      markers.current.push(m);
    });
  };

  // Initialize map
  const initMap = (loc: { lat: number; lng: number }) => {
    if (!mapRef.current || mapInstance.current) return;
    console.log('Init map at:', loc);

    const map = new google.maps.Map(mapRef.current, {
      center: loc,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
    });

    mapInstance.current = map;
    placesService.current = new google.maps.places.PlacesService(map);

    // User marker - save reference for updates
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

    // Pulse effect marker
    new google.maps.Marker({
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

    setMapReady(true);
    loadFacilities(loc);
  };

  // Update user marker position
  const updateUserMarker = (loc: { lat: number; lng: number }) => {
    if (userMarkerRef.current && mapInstance.current) {
      userMarkerRef.current.setPosition(loc);
    }
  };

  // Get high accuracy location
  const getHighAccuracyLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      // Try high accuracy first
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          // If high accuracy fails, try with lower accuracy
          console.warn('High accuracy failed, trying low accuracy:', error.message);
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            reject,
            { 
              enableHighAccuracy: false, 
              timeout: 10000, 
              maximumAge: 60000 
            }
          );
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 0 
        }
      );
    });
  };

  // Load script with retry
  useEffect(() => {
    if (!MAPS_API_KEY) {
      setError('ไม่พบ API Key');
      setLoading(false);
      setLocationStatus('error');
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    const loadGoogleMapsScript = (loc: { lat: number; lng: number }): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.google?.maps) {
          resolve();
          return;
        }

        // Remove any existing failed script
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          existingScript.remove();
        }

        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&language=th`;
        s.async = true;
        s.defer = true;
        
        s.onload = () => {
          console.log('Google Maps loaded successfully');
          resolve();
        };
        
        s.onerror = () => {
          console.error('Failed to load Google Maps script, attempt:', retryCount + 1);
          reject(new Error('Script load failed'));
        };
        
        document.head.appendChild(s);
      });
    };

    const setupMap = async (loc: { lat: number; lng: number }) => {
      if (window.google?.maps) {
        initMap(loc);
        return;
      }

      while (retryCount < maxRetries) {
        try {
          await loadGoogleMapsScript(loc);
          initMap(loc);
          return;
        } catch (err) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`Retrying Google Maps load (${retryCount}/${maxRetries})...`);
            await new Promise(r => setTimeout(r, 1000 * retryCount)); // Exponential backoff
          }
        }
      }
      
      setError('โหลด Google Maps ไม่สำเร็จ กรุณารีเฟรชหน้า');
      setLoading(false);
    };

    const initWithLocation = async () => {
      if (!navigator.geolocation) {
        console.log('Geolocation not supported, using default location');
        setLocationStatus('unavailable');
        setupMap(DEFAULT_LOCATION);
        return;
      }

      setLocationStatus('loading');
      
      try {
        const locationData = await getHighAccuracyLocation();
        const loc = { lat: locationData.lat, lng: locationData.lng };
        console.log('Got location with accuracy:', locationData.accuracy, 'meters');
        setUserLocation(loc);
        setLocationAccuracy(locationData.accuracy);
        setLocationStatus('success');
        setupMap(loc);

        // Set up continuous location watching for better accuracy
        const id = navigator.geolocation.watchPosition(
          (position) => {
            const newLoc = { 
              lat: position.coords.latitude, 
              lng: position.coords.longitude 
            };
            const newAccuracy = position.coords.accuracy;
            
            // Only update if accuracy improved significantly
            if (!locationAccuracy || newAccuracy < locationAccuracy * 0.8) {
              console.log('Location updated, new accuracy:', newAccuracy, 'meters');
              setUserLocation(newLoc);
              setLocationAccuracy(newAccuracy);
              updateUserMarker(newLoc);
              
              // Reload facilities if location changed significantly (more than 500m)
              const distance = calcDistance(userLocation.lat, userLocation.lng, newLoc.lat, newLoc.lng);
              if (distance > 0.5) {
                loadFacilities(newLoc);
              }
            }
          },
          (error) => {
            console.warn('Watch position error:', error.message);
          },
          { 
            enableHighAccuracy: true, 
            maximumAge: 30000, 
            timeout: 20000 
          }
        );
        setWatchId(id);
      } catch (err: any) {
        console.error('Location error:', err.message);
        
        // Handle specific error codes
        if (err.code === 1) {
          setLocationStatus('denied');
        } else {
          setLocationStatus('error');
        }
        
        // Use default location
        setupMap(DEFAULT_LOCATION);
      }
    };

    initWithLocation();

    return () => { 
      markers.current.forEach(m => m.setMap(null)); 
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
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
      setUserLocation(loc);
      setLocationAccuracy(locationData.accuracy);
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
      setUserLocation(loc);
      setLocationAccuracy(locationData.accuracy);
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
        m.setVisible(show);
      }
    });
  }, [filter, search, facilities]);

  const labels: Record<string, string> = { hospital: 'โรงพยาบาล', clinic: 'คลินิก', pharmacy: 'ร้านยา', health_center: 'ศูนย์สุขภาพ' };
  const colors: Record<string, string> = { hospital: 'bg-red-100 text-red-600', clinic: 'bg-blue-100 text-blue-600', pharmacy: 'bg-green-100 text-green-600', health_center: 'bg-purple-100 text-purple-600' };
  const icons: Record<string, typeof Building2> = { hospital: Building2, clinic: Stethoscope, pharmacy: Pill, health_center: Heart };

  const focusFacility = (f: Facility) => {
    setSelectedId(f.id);
    mapInstance.current?.setCenter(f.location);
    mapInstance.current?.setZoom(16);
    const m = markers.current.find(x => x.getTitle() === f.name);
    if (m) google.maps.event.trigger(m, 'click');
  };

  const navigate = (f: Facility) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${f.location.lat},${f.location.lng}`, '_blank');
  };

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
        {(['all', 'hospital', 'clinic', 'pharmacy', 'health_center'] as const).map(t => {
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
            <div className="text-center p-6">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-medium text-gray-700 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
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
          {loading && facilities.length === 0 ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">ไม่พบสถานพยาบาล</p></div>
          ) : (
            filtered.slice(0, 30).map(f => {
              const Icon = icons[f.type] || Building2;
              const sel = selectedId === f.id;
              return (
                <div key={f.id} onClick={() => focusFacility(f)}
                  className={`p-3 bg-white hover:bg-emerald-50 cursor-pointer transition ${sel ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}`}>
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
                          {f.isOpen !== undefined && <p className={`text-xs ${f.isOpen ? 'text-green-600' : 'text-red-500'}`}>{f.isOpen ? 'เปิด' : 'ปิด'}</p>}
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
                    <button onClick={e => { e.stopPropagation(); navigate(f); }}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shrink-0">
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
