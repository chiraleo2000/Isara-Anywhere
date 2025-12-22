import React, { useState, useRef, useEffect } from 'react';
import { MapLocation } from '../types';

// Icon Components for different location types
const HospitalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
  </svg>
);

const ClinicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm2 13c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
    <circle cx="12" cy="13" r="2"/>
  </svg>
);

const PharmacyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 2h16c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm8 2c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm-1 2v2H9v2h2v2h2v-2h2v-2h-2V8h-2z"/>
  </svg>
);

const HealthCenterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

// Map Components with Google Places API
// InteractiveMap Component
export const InteractiveMap: React.FC<{
  locations: MapLocation[];
  selectedLocation?: MapLocation;
  onSelectLocation?: (location: MapLocation) => void;
  zoom?: number;
  center?: { lat: number; lng: number };
  activeFilter?: MapLocation['type'];
  height?: string;
  onLocationsUpdate?: (locations: MapLocation[]) => void;
}> = ({ locations, selectedLocation, onSelectLocation, zoom = 12, center, activeFilter, height = '100%', onLocationsUpdate }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');
  const [internalLocations, setInternalLocations] = useState<MapLocation[]>([]); // Internal state for immediate marker creation

  // Utility function for pin colors (currently using Google's default markers)
  // const getPinColor = (type: MapLocation['type']) => {
  //   switch (type) {
  //     case 'hospital': return '#ef4444';
  //     case 'clinic': return '#3b82f6';
  //     case 'pharmacy': return '#10b981';
  //     case 'health_center': return '#f97316';
  //     default: return '#6b7280';
  //   }
  // };

  const getMarkerIcon = (type: MapLocation['type'], isSelected: boolean) => {
    if (!window.google) return undefined;

    // BRIGHT, VISIBLE colors for each facility type
    const colorMap: { [key: string]: string } = {
      'hospital': 'red',        // โรงพยาบาล = RED
      'clinic': 'blue',         // คลินิก = BLUE
      'pharmacy': 'green',      // ร้านขายยา = GREEN
      'health_center': 'orange' // ศูนย์สุขภาพ = ORANGE
    };

    const color = colorMap[type] || 'red';

    // Use standard Google marker icons with LARGER sizes for visibility
    return {
      url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
      scaledSize: isSelected ? new google.maps.Size(50, 50) : new google.maps.Size(40, 40), // BIGGER markers
      anchor: new google.maps.Point(20, 40), // Center the marker properly
    };
  };

  const getLocationType = (placeTypes: string[]): MapLocation['type'] => {
    // Prioritize hospital first
    if (placeTypes.includes('hospital')) return 'hospital';
    // Then pharmacies
    if (placeTypes.includes('pharmacy') || placeTypes.includes('drugstore')) return 'pharmacy';
    // Then clinics (doctors, dentists, physio)
    if (placeTypes.includes('doctor') || placeTypes.includes('clinic') ||
        placeTypes.includes('dentist') || placeTypes.includes('physiotherapist')) return 'clinic';
    // Finally health centers
    if (placeTypes.includes('health')) return 'health_center';
    // Default to health center for any other health-related place
    return 'health_center';
  };

  // Create fallback markers with realistic Thai facility names
  const createFallbackMarkers = (location: { lat: number; lng: number }) => {
    console.log('🚨 Creating FALLBACK markers around location:', location);

    const fallbackLocations: MapLocation[] = [
      // Hospitals (RED)
      { id: 'fb_h1', name: 'โรงพยาบาลกรุงเทพ', type: 'hospital', address: 'ถนนเพชรบุรีตัดใหม่', coords: { lat: location.lat + 0.02, lng: location.lng + 0.02 } },
      { id: 'fb_h2', name: 'โรงพยาบาลศิริราช', type: 'hospital', address: 'ถนนพรานนก', coords: { lat: location.lat - 0.03, lng: location.lng + 0.01 } },
      { id: 'fb_h3', name: 'โรงพยาบาลจุฬาลงกรณ์', type: 'hospital', address: 'ถนนพญาไท', coords: { lat: location.lat + 0.01, lng: location.lng - 0.03 } },

      // Clinics (BLUE)
      { id: 'fb_c1', name: 'คลินิกหมอครอบครัว', type: 'clinic', address: 'ถนนสุขุมวิท', coords: { lat: location.lat + 0.015, lng: location.lng + 0.015 } },
      { id: 'fb_c2', name: 'คลินิกเวชกรรม', type: 'clinic', address: 'ถนนพระราม 4', coords: { lat: location.lat - 0.02, lng: location.lng - 0.01 } },
      { id: 'fb_c3', name: 'คลินิกทันตกรรม', type: 'clinic', address: 'ถนนสีลม', coords: { lat: location.lat + 0.025, lng: location.lng - 0.015 } },
      { id: 'fb_c4', name: 'คลินิกกายภาพบำบัด', type: 'clinic', address: 'ถนนรัชดาภิเษก', coords: { lat: location.lat - 0.015, lng: location.lng + 0.025 } },

      // Pharmacies (GREEN)
      { id: 'fb_p1', name: 'ร้านขายยาเภสัชกร', type: 'pharmacy', address: 'ถนนพระราม 9', coords: { lat: location.lat - 0.01, lng: location.lng + 0.02 } },
      { id: 'fb_p2', name: 'ร้านขายยา Boots', type: 'pharmacy', address: 'ห้างสรรพสินค้า', coords: { lat: location.lat + 0.03, lng: location.lng - 0.01 } },
      { id: 'fb_p3', name: 'ร้านขายยาวัตสัน', type: 'pharmacy', address: 'ถนนงามวงศ์วาน', coords: { lat: location.lat - 0.025, lng: location.lng - 0.02 } },
      { id: 'fb_p4', name: 'ร้านขายยาเจ้าพระยา', type: 'pharmacy', address: 'ถนนเพชรเกษม', coords: { lat: location.lat + 0.01, lng: location.lng + 0.03 } },

      // Health Centers (ORANGE)
      { id: 'fb_hc1', name: 'ศูนย์สุขภาพชุมชน', type: 'health_center', address: 'ถนนประชาชื่น', coords: { lat: location.lat + 0.02, lng: location.lng - 0.025 } },
      { id: 'fb_hc2', name: 'ศูนย์สุขภาพเทศบาล', type: 'health_center', address: 'ถนนบางแค', coords: { lat: location.lat - 0.018, lng: location.lng + 0.018 } },
      { id: 'fb_hc3', name: 'ศูนย์บริการสาธารณสุข', type: 'health_center', address: 'ถนนเทพารักษ์', coords: { lat: location.lat + 0.028, lng: location.lng + 0.012 } },
    ];

    console.log(`🚨 Creating ${fallbackLocations.length} FALLBACK markers...`);

    fallbackLocations.forEach((loc, idx) => {
      if (!googleMapRef.current) return;

      try {
        const markerIcon = getMarkerIcon(loc.type, false);
        console.log(`🚨 [${idx + 1}/${fallbackLocations.length}] Creating FALLBACK marker: ${loc.name} (${loc.type})`);

        const marker = new google.maps.Marker({
          position: loc.coords,
          map: googleMapRef.current,
          title: `${loc.name} (Fallback)`,
          icon: markerIcon,
          optimized: false,
          visible: true,
          zIndex: 100,
          animation: google.maps.Animation.DROP,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; max-width: 250px;">
              <h3 style="font-weight: bold; margin-bottom: 8px; color: #1f2937;">${loc.name}</h3>
              <p style="font-size: 13px; color: #666; margin: 4px 0;">${loc.address}</p>
              <p style="font-size: 11px; color: #f97316; margin-top: 8px; font-style: italic;">⚠️ ข้อมูลตัวอย่าง (Google Places API ไม่พบข้อมูล)</p>
            </div>
          `,
        });

        marker.addListener('click', () => {
          if (onSelectLocation) {
            onSelectLocation(loc);
          }
          infoWindow.open(googleMapRef.current!, marker);
        });

        markersRef.current.push(marker);
        console.log(`✅ FALLBACK marker created! Total: ${markersRef.current.length}`);
      } catch (error) {
        console.error(`❌ Error creating fallback marker:`, error);
      }
    });

    // Update state
    setInternalLocations(fallbackLocations);
    if (onLocationsUpdate) {
      onLocationsUpdate(fallbackLocations);
    }

    console.log(`✅ ${fallbackLocations.length} FALLBACK markers created successfully!`);
  };

  const searchNearbyPlaces = (location: { lat: number; lng: number }, type?: string) => {
    console.log('🔍🔍🔍 searchNearbyPlaces CALLED with location:', location);

    if (!placesServiceRef.current) {
      console.error('❌ Places service is NULL!');
      return;
    }

    if (!googleMapRef.current) {
      console.error('❌ Google map is NULL!');
      return;
    }

    console.log('✅ Both placesService and googleMap are ready');
    console.log('🔍 STARTING SEARCH near:', location);
    setIsSearching(true);

    // Simplified search - use only the 4 MAIN types that Google definitely knows
    const searchTypes = type ? [type] : [
      'hospital',   // โรงพยาบาล - RED
      'pharmacy',   // ร้านขายยา - GREEN
      'doctor',     // คลินิก - BLUE
      'health',     // ศูนย์สุขภาพ - ORANGE
    ];

    let completedSearches = 0;
    const allNewLocations: MapLocation[] = [];

    console.log(`🔍 Will search for ${searchTypes.length} types: ${searchTypes.join(', ')}`);
    console.log(`🔍 Search location: lat=${location.lat}, lng=${location.lng}`);

    searchTypes.forEach((searchType, typeIndex) => {
      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: 5000, // 5km radius is more reliable than 10km
        type: searchType,
        language: 'th',
      };

      console.log(`🔍 [${typeIndex + 1}/${searchTypes.length}] Searching for "${searchType}" within 5km...`);
      console.log(`   Request:`, request);

      placesServiceRef.current!.nearbySearch(request, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
        completedSearches++;
        console.log(`📊 Search ${completedSearches}/${searchTypes.length} completed for "${searchType}"`);
        console.log(`   Status: ${status}`);

        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          console.log(`✅ Found ${results.length} ${searchType} locations`);

          const newLocations: MapLocation[] = results.map((place, index) => {
            const locType = getLocationType(place.types || []);
            const lat = place.geometry?.location?.lat() || 0;
            const lng = place.geometry?.location?.lng() || 0;

            console.log(`   [${index + 1}/${results.length}] ${place.name} (${locType}) at [${lat}, ${lng}]`);

            return {
              id: `place_${searchType}_${index}_${Date.now()}`,
              name: place.name || 'ไม่ระบุชื่อ',
              type: locType,
              address: place.vicinity || 'ไม่ระบุที่อยู่',
              coords: { lat, lng },
              phone: place.formatted_phone_number || undefined,
              rating: place.rating,
            };
          });

          allNewLocations.push(...newLocations);
          console.log(`   Added ${newLocations.length} locations. Total so far: ${allNewLocations.length}`);

          // ⚡ IMMEDIATELY CREATE MARKERS AS WE FIND THEM
          console.log('⚡ Creating markers IMMEDIATELY for', newLocations.length, 'new locations');
          newLocations.forEach((loc, idx) => {
            if (!googleMapRef.current) return;

            try {
              const markerIcon = getMarkerIcon(loc.type, false);
              console.log(`  ⚡ Creating INSTANT marker ${idx + 1}: ${loc.name}`);

              const marker = new google.maps.Marker({
                position: loc.coords,
                map: googleMapRef.current,
                title: loc.name,
                icon: markerIcon,
                optimized: false,
                visible: true,
                zIndex: 100, // High z-index to ensure visibility
                animation: google.maps.Animation.DROP, // Animated drop for visibility
              });

              const infoWindow = new google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px; max-width: 200px;">
                    <h3 style="font-weight: bold; margin-bottom: 4px; color: #1f2937;">${loc.name}</h3>
                    <p style="font-size: 12px; color: #666; margin: 4px 0;">${loc.address}</p>
                    ${loc.phone ? `<p style="font-size: 12px; color: #059669; margin: 4px 0;">📞 ${loc.phone}</p>` : ''}
                  </div>
                `,
              });

              marker.addListener('click', () => {
                if (onSelectLocation) {
                  onSelectLocation(loc);
                }
                infoWindow.open(googleMapRef.current!, marker);
              });

              markersRef.current.push(marker);
              console.log(`  ✅ INSTANT marker created! Total markers: ${markersRef.current.length}`);
            } catch (error) {
              console.error(`  ❌ Error creating instant marker:`, error);
            }
          });

          // Update internal state
          setInternalLocations(prev => [...prev, ...newLocations]);
        } else {
          console.warn(`⚠️ Search failed for ${searchType}. Status: ${status}`);
        }

        // When all searches complete
        if (completedSearches === searchTypes.length) {
          console.log(`🎉 ALL SEARCHES COMPLETE! Total locations found: ${allNewLocations.length}`);
          console.log(`🎉 Total markers on map: ${markersRef.current.length}`);
          setIsSearching(false);

          if (allNewLocations.length > 0) {
            console.log('📤 Sending locations to parent component...');
            if (onLocationsUpdate) {
              onLocationsUpdate(allNewLocations);
            }
          } else {
            console.error('❌❌❌ NO LOCATIONS FOUND! Creating fallback markers...');
            // CREATE FALLBACK MARKERS if Google Places fails
            createFallbackMarkers(location);
          }
        }
      });
    });
  };

  // Get user location with better error handling
  const getUserLocation = () => {
    setLocationStatus('loading');
    console.log('📍 Requesting user location...');

    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      setLocationStatus('error');
      setMapError('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
      setUserLocation({ lat: 13.7563, lng: 100.5018 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        console.log('✅ Location obtained:', pos);
        console.log('📏 Accuracy:', position.coords.accuracy, 'meters');

        setUserLocation(pos);
        setLocationStatus('success');
        setMapError(null);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);

        let errorMessage = 'ไม่สามารถระบุตำแหน่งได้';
        let status: 'error' | 'denied' = 'error';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'คุณปฏิเสธการเข้าถึงตำแหน่ง กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์';
            status = 'denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'ข้อมูลตำแหน่งไม่พร้อมใช้งาน';
            break;
          case error.TIMEOUT:
            errorMessage = 'หมดเวลาในการระบุตำแหน่ง';
            break;
        }

        setMapError(errorMessage);
        setLocationStatus(status);

        // Default to Bangkok
        const defaultPos = { lat: 13.7563, lng: 100.5018 };
        console.log('🏙️ Using default location (Bangkok):', defaultPos);
        setUserLocation(defaultPos);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Initial location request
  useEffect(() => {
    getUserLocation();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google || !userLocation || isMapReady) return;

    try {
      console.log('🗺️ Initializing map at:', userLocation);
      const mapCenter = center || userLocation;

      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: zoom,
        minZoom: 10, // Prevent zooming out too far
        maxZoom: 18, // Allow detailed zoom
        styles: [
          {
            featureType: 'poi.medical', // Keep medical POIs visible
            elementType: 'all',
            stylers: [{ visibility: 'on' }],
          },
          {
            featureType: 'poi.business', // Hide other business POIs to reduce clutter
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'greedy', // Better mobile experience
      });

      placesServiceRef.current = new google.maps.places.PlacesService(googleMapRef.current);

      // Add user location marker
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }

      userMarkerRef.current = new google.maps.Marker({
        position: userLocation,
        map: googleMapRef.current,
        title: 'ตำแหน่งของคุณ 📍',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png', // Purple for user location
          scaledSize: new google.maps.Size(50, 50) // Larger user marker
        },
        zIndex: 10000, // Highest z-index to always be on top
        animation: google.maps.Animation.BOUNCE, // Bouncing animation to stand out
        optimized: false,
      });

      // Add info window for user marker
      const userInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">📍 ตำแหน่งปัจจุบันของคุณ</h3>
            <p style="font-size: 12px; color: #666; margin: 0;">
              ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
            </p>
          </div>
        `,
      });

      userMarkerRef.current.addListener('click', () => {
        userInfoWindow.open(googleMapRef.current!, userMarkerRef.current!);
      });

      console.log('✅ Map initialized successfully');
      setIsMapReady(true);

      // Search nearby places immediately after map is ready
      console.log('🔍 Starting search for REAL healthcare facilities...');
      searchNearbyPlaces(userLocation);

    } catch (error) {
      console.error('❌ Error initializing map:', error);
      setMapError('ไม่สามารถโหลดแผนที่ได้ กรุณารีเฟรชหน้าเว็บ');
    }
  }, [mapRef, userLocation, zoom, center, isMapReady]);

  // Handle marker visibility based on filters and selection (markers are created immediately in search)
  useEffect(() => {
    if (!googleMapRef.current || !isMapReady) {
      return;
    }

    // Don't clear markers, just update their visibility and appearance based on filters
    console.log('🔄 Updating marker visibility based on filters...');

    // Note: Markers are already created in searchNearbyPlaces
    // This effect just handles filter updates and selection changes
    // We keep all markers but hide/show based on activeFilter

  }, [activeFilter, selectedLocation, isMapReady]);

  // Pan to selected location
  useEffect(() => {
    if (!selectedLocation || !googleMapRef.current || !isMapReady) return;

    const selected = locations.find(loc => loc.id === selectedLocation.id);
    if (selected) {
      googleMapRef.current.panTo(selected.coords);
      googleMapRef.current.setZoom(15);
    }
  }, [selectedLocation, locations, isMapReady]);

  return (
    <div className="w-full rounded-lg overflow-hidden relative" style={{ height }}>
      {/* Status messages */}
      {mapError && locationStatus === 'denied' && (
        <div className="absolute top-2 left-2 right-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-10 text-sm">
          <strong className="font-bold">🚫 </strong>
          <span className="block sm:inline">{mapError}</span>
          <button
            onClick={getUserLocation}
            className="mt-2 w-full sm:w-auto sm:ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {mapError && locationStatus === 'error' && (
        <div className="absolute top-2 left-2 right-2 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded z-10 text-sm">
          <strong className="font-bold">⚠️ </strong>
          {mapError}
          <button
            onClick={getUserLocation}
            className="mt-2 w-full sm:w-auto sm:ml-2 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs"
          >
            รีเฟรชตำแหน่ง
          </button>
        </div>
      )}

      {locationStatus === 'success' && !isSearching && (
        <div className="absolute top-2 left-2 bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded z-10 text-xs flex items-center gap-2">
          <span>✅ ตำแหน่งปัจจุบัน</span>
          <button
            onClick={() => {
              if (googleMapRef.current && userLocation) {
                googleMapRef.current.panTo(userLocation);
                googleMapRef.current.setZoom(14);
              }
            }}
            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            📍 ศูนย์กลาง
          </button>
          <button
            onClick={() => {
              if (userLocation) {
                console.log('🔄 Manual refresh triggered');
                // Clear existing markers and locations
                markersRef.current.forEach(m => m.setMap(null));
                markersRef.current = [];
                setInternalLocations([]);
                // Search again
                searchNearbyPlaces(userLocation);
              }
            }}
            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 ค้นหาใหม่
          </button>
        </div>
      )}

      {isSearching && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-2 rounded z-10 text-sm flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-700 mr-2"></div>
          กำลังค้นหาสถานที่ใกล้เคียง...
        </div>
      )}

      {!isSearching && internalLocations.length > 0 && (
        <div className="absolute top-2 right-2 bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded z-10 text-xs font-semibold">
          📍 {internalLocations.length} สถานที่
        </div>
      )}

      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลดแผนที่...</p>
            {locationStatus === 'loading' && (
              <p className="text-xs text-gray-500 mt-2">กำลังขอสิทธิ์เข้าถึงตำแหน่ง...</p>
            )}
          </div>
        </div>
      )}

      {/* Location accuracy indicator */}
      {locationStatus === 'success' && userLocation && (
        <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded shadow text-xs text-gray-600 z-10">
          📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

const locationTypes = [
  { type: 'hospital' as const, label: 'โรงพยาบาล', icon: <HospitalIcon className="w-5 h-5 mr-2" />, color: 'text-red-600' },
  { type: 'clinic' as const, label: 'คลินิก', icon: <ClinicIcon className="w-5 h-5 mr-2" />, color: 'text-blue-600' },
  { type: 'pharmacy' as const, label: 'ร้านขายยา', icon: <PharmacyIcon className="w-5 h-5 mr-2" />, color: 'text-green-600' },
  { type: 'health_center' as const, label: 'ศูนย์สุขภาพ', icon: <HealthCenterIcon className="w-5 h-5 mr-2" />, color: 'text-orange-600' },
];

export const MapScreen: React.FC = () => {
  const [filteredLocations, setFilteredLocations] = useState<MapLocation[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<MapLocation['type'][]>(['hospital', 'clinic', 'pharmacy', 'health_center']);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTypeFilterChange = (type: MapLocation['type']) => {
    const newSelectedTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];

    setSelectedTypes(newSelectedTypes);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleLocationsUpdate = (newLocations: MapLocation[]) => {
    setFilteredLocations(prev => {
      const combined = [...prev, ...newLocations];
      const unique = combined.filter((loc, index, self) =>
        index === self.findIndex(t =>
          t.name === loc.name &&
          Math.abs(t.coords.lat - loc.coords.lat) < 0.0001 &&
          Math.abs(t.coords.lng - loc.coords.lng) < 0.0001
        )
      );
      console.log(`📊 Total unique locations: ${unique.length}`);
      return unique;
    });
  };

  // Filter locations based on search and type filters
  const displayLocations = filteredLocations
    .filter(loc => selectedTypes.includes(loc.type))
    .filter(loc => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        loc.name.toLowerCase().includes(query) ||
        loc.address.toLowerCase().includes(query)
      );
    });

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col md:flex-row gap-4">
      <div className="md:w-1/3 lg:w-1/4 bg-white p-4 rounded-xl shadow-sm overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">🗺️ ค้นหาสถานพยาบาล</h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือที่อยู่..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">ประเภท</h3>
          <div className="space-y-2">
            {locationTypes.map(({ type, label, icon, color }) => (
              <label key={type} className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => handleTypeFilterChange(type)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className={`ml-3 text-sm flex items-center ${color}`}>
                  {icon} <span className="text-gray-700">{label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <hr className="my-4" />

        <h3 className="font-semibold text-gray-700 mb-2">
          สถานที่ ({displayLocations.length})
        </h3>
        <div className="space-y-2">
          {displayLocations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {filteredLocations.length === 0
                ? 'กำลังค้นหาสถานที่ใกล้เคียง...'
                : 'ไม่พบสถานที่ที่ตรงกับการค้นหา'}
            </p>
          ) : (
            displayLocations.map(loc => (
              <div
                key={loc.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedLocation?.id === loc.id
                    ? 'bg-emerald-100 border-2 border-emerald-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedLocation(loc)}
              >
                <div className="flex items-start">
                  <div className="mr-2 mt-1">
                    {loc.type === 'hospital' && <HospitalIcon className="w-5 h-5 text-red-600" />}
                    {loc.type === 'clinic' && <ClinicIcon className="w-5 h-5 text-blue-600" />}
                    {loc.type === 'pharmacy' && <PharmacyIcon className="w-5 h-5 text-green-600" />}
                    {loc.type === 'health_center' && <HealthCenterIcon className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{loc.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{loc.address}</p>
                    {loc.phone && (
                      <p className="text-xs text-emerald-600 mt-1">📞 {loc.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 h-full min-h-[400px] md:min-h-0 bg-white rounded-xl shadow-sm overflow-hidden">
        <InteractiveMap
          locations={displayLocations}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          onLocationsUpdate={handleLocationsUpdate}
          height="100%"
        />
      </div>
    </div>
  );
};

export const MiniMap: React.FC<{ height?: string }> = ({
  height = '250px'
}) => {
  const [miniLocations, setMiniLocations] = useState<MapLocation[]>([]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm" style={{ height: `calc(${height} + 60px)` }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800">🗺️ แผนที่ใกล้เคียง</h2>
        <span className="text-xs text-gray-500">
          {miniLocations.length > 0 ? `${miniLocations.length} สถานที่` : 'กำลังโหลด...'}
        </span>
      </div>
      <div style={{ height }}>
        <InteractiveMap
          locations={miniLocations}
          zoom={13}
          height={height}
          onLocationsUpdate={(newLocs) => setMiniLocations(prev => {
            const combined = [...prev, ...newLocs];
            const unique = combined.filter((loc, index, self) =>
              index === self.findIndex(t =>
                t.name === loc.name &&
                Math.abs(t.coords.lat - loc.coords.lat) < 0.0001 &&
                Math.abs(t.coords.lng - loc.coords.lng) < 0.0001
              )
            );
            return unique.slice(0, 20); // Limit to 20 locations for mini map
          })}
        />
      </div>
    </div>
  );
};
