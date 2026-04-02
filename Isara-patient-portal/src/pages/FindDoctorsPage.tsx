/**
 * Find Doctors Page - Patient Portal
 * Shows available specialist consultants from the database
 * Read-only view: search, filter, view profiles
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const API_BASE = '';

// ─── Types ───

interface Consultant {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  phone: string;
  email: string;
  avatarUrl: string;
  rating: number;
  available: boolean;
  experience: number;
  languages: string[];
  bio?: string;
}

// ─── Icons ───

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const StarIcon: React.FC<{ className?: string; filled?: boolean }> = ({ className, filled }) => (
  <svg className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const PhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const EnvelopeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ─── Helpers ───

function t(language: string, th: string, en: string): string {
  return language === 'th' ? th : en;
}

function StarRating({ rating }: Readonly<{ rating: number }>) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon
          key={s}
          filled={s <= Math.round(rating)}
          className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Doctor Profile Modal ───

function DoctorProfileModal({
  doctor,
  language,
  onClose,
}: Readonly<{
  doctor: Consultant;
  language: string;
  onClose: () => void;
}>) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t(language, 'ข้อมูลแพทย์', 'Doctor Profile')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <img
              src={doctor.avatarUrl}
              alt={doctor.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-emerald-100"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=10b981&color=fff&size=80`;
              }}
            />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{doctor.name}</h3>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">{doctor.specialty}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{doctor.hospital || t(language, 'ไม่ระบุสถานพยาบาล', 'Hospital not specified')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t(language, 'คะแนน', 'Rating')}</p>
              <StarRating rating={doctor.rating} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t(language, 'ประสบการณ์', 'Experience')}</p>
                <p className="font-semibold text-gray-900 dark:text-white">{doctor.experience} {t(language, 'ปี', 'years')}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t(language, 'สถานะ', 'Status')}</p>
                <p className={`font-semibold ${doctor.available ? 'text-green-600' : 'text-gray-500'}`}>
                  {doctor.available ? t(language, 'พร้อมให้บริการ', 'Available') : t(language, 'ไม่พร้อม', 'Busy')}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t(language, 'ภาษา', 'Languages')}</p>
              <p className="text-gray-900 dark:text-white">{doctor.languages?.join(', ') || 'Thai'}</p>
            </div>

            {doctor.bio && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t(language, 'ประวัติ', 'Biography')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{doctor.bio}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {doctor.email && (
                <a
                  href={`mailto:${doctor.email}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  {t(language, 'อีเมล', 'Email')}
                </a>
              )}
              {doctor.phone && (
                <a
                  href={`tel:${doctor.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 transition-colors text-sm"
                >
                  <PhoneIcon className="w-4 h-4" />
                  {t(language, 'โทรหา', 'Call')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Doctor Card ───

function DoctorCard({
  doctor,
  language,
  onViewProfile,
}: Readonly<{
  doctor: Consultant;
  language: string;
  onViewProfile: (d: Consultant) => void;
}>) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-100 dark:border-gray-700">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <img
            src={doctor.avatarUrl}
            alt={doctor.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-emerald-100 flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=10b981&color=fff&size=56`;
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{doctor.name}</h3>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium truncate">{doctor.specialty}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{doctor.hospital || t(language, 'คลินิกออนไลน์', 'Online Clinic')}</p>
              </div>
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                doctor.available ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {doctor.available ? t(language, 'พร้อม', 'Available') : t(language, 'ไม่พร้อม', 'Busy')}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <StarRating rating={doctor.rating} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {doctor.experience} {t(language, 'ปี', 'yrs')}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {(doctor.languages || ['Thai']).slice(0, 3).map((lang) => (
            <span key={lang} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
              {lang}
            </span>
          ))}
        </div>

        <button
          onClick={() => onViewProfile(doctor)}
          className="mt-4 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t(language, 'ดูโปรไฟล์', 'View Profile')}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───

const SPECIALTY_OPTIONS = [
  { value: '', label_en: 'All Specialties', label_th: 'ทุกสาขา' },
  { value: 'Cardiology', label_en: 'Cardiology', label_th: 'หัวใจ' },
  { value: 'Neurology', label_en: 'Neurology', label_th: 'ประสาทวิทยา' },
  { value: 'Oncology', label_en: 'Oncology', label_th: 'มะเร็งวิทยา' },
  { value: 'Nephrology', label_en: 'Nephrology', label_th: 'โรคไต' },
  { value: 'Dermatology', label_en: 'Dermatology', label_th: 'ผิวหนัง' },
  { value: 'Gastroenterology', label_en: 'Gastroenterology', label_th: 'ทางเดินอาหาร' },
  { value: 'Pulmonology', label_en: 'Pulmonology', label_th: 'ปอด' },
  { value: 'Endocrinology', label_en: 'Endocrinology', label_th: 'ต่อมไร้ท่อ' },
  { value: 'Rheumatology', label_en: 'Rheumatology', label_th: 'โรคข้อ' },
  { value: 'Psychiatry', label_en: 'Psychiatry', label_th: 'จิตเวช' },
  { value: 'Pediatrics', label_en: 'Pediatrics', label_th: 'กุมารเวชศาสตร์' },
  { value: 'Gynecology', label_en: 'Gynecology', label_th: 'สูตินรีเวช' },
  { value: 'Orthopedics', label_en: 'Orthopedics', label_th: 'ออร์โธปิดิกส์' },
  { value: 'General Surgery', label_en: 'General Surgery', label_th: 'ศัลยกรรมทั่วไป' },
  { value: 'Internal Medicine', label_en: 'Internal Medicine', label_th: 'อายุรศาสตร์' },
  { value: 'General Practice', label_en: 'General Practice', label_th: 'เวชศาสตร์ทั่วไป' },
];

export default function FindDoctorsPage() {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';

  const [doctors, setDoctors] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Consultant | null>(null);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE}/api/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load doctors');
      const data = await res.json();
      setDoctors(Array.isArray(data) ? data : data.consultants || data.doctors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return doctors.filter((d) => {
      const matchSearch = !term
        || d.name.toLowerCase().includes(term)
        || d.specialty.toLowerCase().includes(term)
        || (d.hospital || '').toLowerCase().includes(term)
        || (d.bio || '').toLowerCase().includes(term);
      const matchSpecialty = !selectedSpecialty || d.specialty === selectedSpecialty;
      const matchAvail = !showAvailableOnly || d.available;
      return matchSearch && matchSpecialty && matchAvail;
    });
  }, [doctors, searchTerm, selectedSpecialty, showAvailableOnly]);

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">👨‍⚕️</span>
          {t(language, 'ค้นหาแพทย์', 'Find a Doctor')}
        </h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {t(language, 'รายชื่อแพทย์เชี่ยวชาญสำหรับการส่งต่อ', 'Browse available specialist consultants for referral')}
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className={`rounded-xl shadow p-4 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t(language, 'ค้นหาชื่อ ความเชี่ยวชาญ หรือโรงพยาบาล...', 'Search by name, specialty or hospital...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
              }`}
            />
          </div>
          <select
            aria-label={t(language, 'กรองตามความเชี่ยวชาญ', 'Filter by specialty')}
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm ${
              isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white'
            }`}
          >
            {SPECIALTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {language === 'th' ? opt.label_th : opt.label_en}
              </option>
            ))}
          </select>
          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
              className="rounded text-emerald-600"
            />
            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {t(language, 'พร้อมให้บริการเท่านั้น', 'Available only')}
            </span>
          </label>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && !error && (
        <div className={`text-sm mb-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {t(language, `พบแพทย์ ${filtered.length} คน`, `${filtered.length} ${filtered.length === 1 ? 'doctor' : 'doctors'} found`)}
          {filtered.some(d => d.available) && (
            <span className="ml-3 text-green-600 dark:text-green-400">
              • {filtered.filter(d => d.available).length} {t(language, 'พร้อมให้บริการ', 'available')}
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {t(language, 'กำลังโหลดข้อมูลแพทย์...', 'Loading doctors...')}
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-5xl mb-4">⚠️</div>
          <p className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {t(language, 'ไม่สามารถโหลดข้อมูลได้', 'Failed to load doctors')}
          </p>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={fetchDoctors}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {t(language, 'ลองใหม่', 'Try Again')}
          </button>
        </div>
      )}

      {/* Doctors Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              language={language}
              onViewProfile={setSelectedDoctor}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {t(language, 'ไม่พบแพทย์ที่ตรงกัน', 'No doctors found')}
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t(language, 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง', 'Try adjusting your search or filter')}
          </p>
        </div>
      )}

      {/* Doctor Profile Modal */}
      {selectedDoctor && (
        <DoctorProfileModal
          doctor={selectedDoctor}
          language={language}
          onClose={() => setSelectedDoctor(null)}
        />
      )}
    </div>
  );
}
