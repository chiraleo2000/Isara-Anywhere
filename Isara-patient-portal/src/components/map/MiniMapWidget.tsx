/**
 * MiniMapWidget v3.0.0 — Compact sidebar widget showing REAL nearby healthcare counts
 * Fetches data from /api/map/nearby (Overpass API) for real counts
 * Clicking navigates to the full /map page
 */
import { Link } from 'react-router-dom';
import { MapPin, Building2, Stethoscope, Pill, Heart, Navigation, Loader2 } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useState, useEffect } from 'react';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface Counts { hospital: number; clinic: number; pharmacy: number; health_center: number; total: number; }

export default function MiniMapWidget() {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const [locationReady, setLocationReady] = useState(false);
  const [userLat, setUserLat] = useState(13.7563);
  const [userLng, setUserLng] = useState(100.5018);
  const [counts, setCounts] = useState<Counts>({ hospital: 0, clinic: 0, pharmacy: 0, health_center: 0, total: 0 });

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      let lat = 13.7563, lng = 100.5018;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* use default */ }
      if (cancel) return;
      setUserLat(lat);
      setUserLng(lng);
      setLocationReady(true);
      // Fetch real counts from server
      try {
        const token =
          localStorage.getItem('token') ||
          localStorage.getItem('authToken') ||
          localStorage.getItem('auth_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const resp = await fetch(`/api/map/nearby?lat=${lat}&lng=${lng}&radius=5&lang=${language}`, { headers, signal: AbortSignal.timeout(15000) });
        if (resp.ok) {
          const data = await resp.json();
          const facilities = data.facilities || [];
          const c: Counts = { hospital: 0, clinic: 0, pharmacy: 0, health_center: 0, total: facilities.length };
          for (const f of facilities) {
            if (f.type in c) (c as any)[f.type]++;
          }
          if (!cancel) setCounts(c);
        }
      } catch { /* silent — widget is supplemental */ }
    };
    load();
    return () => { cancel = true; };
  }, [language]);

  const staticMapUrl = MAPS_API_KEY
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${userLat},${userLng}&zoom=13&size=280x100&scale=2&maptype=roadmap&markers=color:blue|${userLat},${userLng}&key=${MAPS_API_KEY}`
    : '';

  return (
    <Link
      to="/map"
      className={`block rounded-xl overflow-hidden transition-all hover:shadow-md ${
        isDark
          ? 'bg-gradient-to-br from-orange-900/40 to-red-900/40 hover:from-orange-900/60 hover:to-red-900/60'
          : 'bg-gradient-to-br from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100'
      }`}
    >
      {staticMapUrl && (
        <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
          <img src={staticMapUrl} alt="Map" className="w-full h-full object-cover opacity-80" loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-1 right-1 flex items-center gap-1 text-white text-[9px] bg-black/40 rounded px-1 py-0.5">
            <Navigation className="w-2.5 h-2.5" /> 5 km
          </div>
        </div>
      )}
      <div className="p-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center">
            <MapPin className="w-3 h-3 text-white" />
          </div>
          <span className={`text-xs font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {language === 'th' ? 'สถานพยาบาลใกล้เคียง' : 'Nearby Healthcare'}
          </span>
          {!locationReady && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
          {locationReady && counts.total > 0 && (
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
              {counts.total}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {([
            { icon: Building2, key: 'hospital' as const, label: language === 'th' ? 'โรงพยาบาล' : 'Hospital', color: 'text-red-500' },
            { icon: Stethoscope, key: 'clinic' as const, label: language === 'th' ? 'คลินิก' : 'Clinic', color: 'text-blue-500' },
            { icon: Pill, key: 'pharmacy' as const, label: language === 'th' ? 'ร้านยา' : 'Pharmacy', color: 'text-green-500' },
            { icon: Heart, key: 'health_center' as const, label: language === 'th' ? 'ศูนย์สุขภาพ' : 'Health', color: 'text-purple-500' },
          ] as const).map(({ icon: Icon, key, label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <Icon className={`w-3 h-3 ${color}`} />
              <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
              {counts[key] > 0 && (
                <span className={`text-[9px] font-bold ${color}`}>{counts[key]}</span>
              )}
            </div>
          ))}
        </div>
        <p className={`text-[9px] mt-1.5 text-center font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
          {language === 'th' ? 'แตะเพื่อค้นหาสถานพยาบาล →' : 'Tap to find healthcare →'}
        </p>
      </div>
    </Link>
  );
}
