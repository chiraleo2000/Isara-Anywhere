/**
 * MiniMapWidget — Compact sidebar widget for quick healthcare facility overview
 * Shows a small static map preview + nearest facility count
 * Clicking it navigates to the full /map page
 */
import { Link } from 'react-router-dom';
import { MapPin, Building2, Stethoscope, Pill, Heart } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

export default function MiniMapWidget() {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';

  return (
    <Link
      to="/map"
      className={`block rounded-xl p-3 transition-colors ${
        isDark
          ? 'bg-gradient-to-br from-orange-900/40 to-red-900/40 hover:from-orange-900/60 hover:to-red-900/60'
          : 'bg-gradient-to-br from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
          <MapPin className="w-3.5 h-3.5 text-white" />
        </div>
        <span className={`text-xs font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
          {language === 'th' ? 'สถานพยาบาลใกล้เคียง' : 'Nearby Healthcare'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { icon: Building2, label: language === 'th' ? 'โรงพยาบาล' : 'Hospital', color: 'text-red-500' },
          { icon: Stethoscope, label: language === 'th' ? 'คลินิก' : 'Clinic', color: 'text-blue-500' },
          { icon: Pill, label: language === 'th' ? 'ร้านยา' : 'Pharmacy', color: 'text-green-500' },
          { icon: Heart, label: language === 'th' ? 'ศูนย์สุขภาพ' : 'Health Center', color: 'text-purple-500' },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className={`w-3 h-3 ${color}`} />
            <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
          </div>
        ))}
      </div>
      <p className={`text-[10px] mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
        {language === 'th' ? 'แตะเพื่อเปิดแผนที่' : 'Tap to open map'} →
      </p>
    </Link>
  );
}
