/**
 * MiniMapWidget v2.0.0 — Compact sidebar widget for quick healthcare facility overview
 * Shows a small static map preview + nearest facility count + live location status
 * Clicking it navigates to the full /map page
 * Positioned above calendar in sidebar (bottom-left area)
 */
import { Link } from 'react-router-dom';
import { MapPin, Building2, Stethoscope, Pill, Heart, Navigation, Loader2 } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useState, useEffect } from 'react';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function MiniMapWidget() {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const [locationReady, setLocationReady] = useState(false);
  const [userLat, setUserLat] = useState(13.7563);
  const [userLng, setUserLng] = useState(100.5018);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setUserLat(p.coords.latitude);
        setUserLng(p.coords.longitude);
        setLocationReady(true);
      },
      () => setLocationReady(true), // fallback to defaults
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }, []);

  // Static map thumbnail
  const staticMapUrl = MAPS_API_KEY
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${userLat},${userLng}&zoom=12&size=280x100&scale=2&maptype=roadmap&markers=color:blue|${userLat},${userLng}&key=${MAPS_API_KEY}`
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
      {/* Mini static map image */}
      {staticMapUrl && (
        <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
          <img
            src={staticMapUrl}
            alt="Map"
            className="w-full h-full object-cover opacity-80"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-1 right-1 flex items-center gap-1 text-white text-[9px] bg-black/40 rounded px-1 py-0.5">
            <Navigation className="w-2.5 h-2.5" />
            15 km
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
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[
            { icon: Building2, label: language === 'th' ? 'โรงพยาบาล' : 'Hospital', color: 'text-red-500' },
            { icon: Stethoscope, label: language === 'th' ? 'คลินิก' : 'Clinic', color: 'text-blue-500' },
            { icon: Pill, label: language === 'th' ? 'ร้านยา' : 'Pharmacy', color: 'text-green-500' },
            { icon: Heart, label: language === 'th' ? 'ศูนย์สุขภาพ' : 'Health', color: 'text-purple-500' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <Icon className={`w-3 h-3 ${color}`} />
              <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
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
