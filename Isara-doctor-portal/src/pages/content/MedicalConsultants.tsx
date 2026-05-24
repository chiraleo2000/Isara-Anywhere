/**
 * Medical Consultants Page - Specialist Contacts Management
 * 
 * Features:
 * - Admin: Full CRUD (Create, Read, Update, Delete consultants)
 * - Doctor: Read-only access with ability to rate consultants
 * - Real-time availability status
 * - Search and filter by specialty
 * - Persisted data via GCS API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  SearchIcon,
  XMarkIcon,
  TrashIcon,
} from '../../assets/NewSvgIcons';
import { useAuth } from '../../components/common/AuthProvider';
import { useSettings } from '../../hooks/useSettings';

// ============================================================================
// API BASE URL - Use VITE_API_URL for main API endpoints (consultants, etc.)
// Empty string for relative paths in production (Cloud Run)
// ============================================================================
const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================================
// CUSTOM ICONS
// ============================================================================
const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// ============================================================================
// INTERFACES
// ============================================================================

interface ConsultantReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

interface Consultant {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  phone: string;
  email: string;
  photo: string;
  available: boolean;
  languages: string[];
  experience: number;
  rating: number;
  reviewCount?: number;
  bio?: string;
  certifications?: string[];
  consultationFee?: number | null;
  availableSlots?: string[];
  notes?: string;
  reviews?: ConsultantReview[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
}

// Default specialties list
const DEFAULT_SPECIALTIES = [
  'All Specialties',
  'Cardiology',
  'Neurology',
  'Oncology',
  'Orthopedics',
  'Dermatology',
  'Gastroenterology',
  'Pulmonology',
  'Endocrinology',
  'Rheumatology',
  'Nephrology',
  'Urology',
  'Ophthalmology',
  'ENT',
  'Psychiatry',
  'Pediatrics',
  'Gynecology',
  'General Surgery',
  'Plastic Surgery',
  'Internal Medicine'
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
  </div>
);

const StarRating: React.FC<{
  rating: number;
  onRate?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}> = ({ rating, onRate, size = 'md', interactive = false }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hoverRating || rating);
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && onRate?.(star)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <StarIcon
              className={`${sizeClasses[size]} ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        );
      })}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// i18n labels for Medical Consultants page
const _labels = {
  pageTitle: { en: 'Medical Consultants', th: 'แพทย์ที่ปรึกษา' },
  subtitle: { en: 'Specialist Contacts & Referrals', th: 'ผู้เชี่ยวชาญและการส่งต่อ' },
  searchConsultants: { en: 'Search consultants...', th: 'ค้นหาแพทย์ที่ปรึกษา...' },
  addConsultant: { en: 'Add Consultant', th: 'เพิ่มแพทย์ที่ปรึกษา' },
  allSpecialties: { en: 'All Specialties', th: 'ทุกสาขา' },
  availableOnly: { en: 'Available Only', th: 'พร้อมให้บริการเท่านั้น' },
  viewProfile: { en: 'View Profile', th: 'ดูโปรไฟล์' },
  contact: { en: 'Contact', th: 'ติดต่อ' },
  rating: { en: 'Rating', th: 'คะแนน' },
  experience: { en: 'Experience', th: 'ประสบการณ์' },
  years: { en: 'years', th: 'ปี' },
};

// Helper: Dark mode aware class names
const darkText = (isDark: boolean) => isDark ? 'text-white' : 'text-gray-900';
const darkSubtext = (isDark: boolean) => isDark ? 'text-gray-400' : 'text-gray-600';
const darkCard = (isDark: boolean) => isDark ? 'bg-gray-800' : 'bg-white';

// Helper: get no-results message
const getNoResultsMessage = (hasConsultants: boolean, isAdmin: boolean): string => {
  if (hasConsultants) return 'Try adjusting your search or filter criteria';
  if (isAdmin) return 'Add your first consultant to get started';
  return 'No consultants have been added yet';
};

// Helper: get save button text
const getSaveButtonText = (actionLoading: boolean, isAdd: boolean): string => {
  if (actionLoading) return 'Saving...';
  return isAdd ? 'Add Consultant' : 'Save Changes';
};

// Extracted consultant card component to reduce cognitive complexity
const ConsultantCard: React.FC<{
  consultant: Consultant;
  isDark: boolean;
  isAdmin: boolean;
  onToggleAvailability: (c: Consultant) => void;
  onSendEmail: (email: string) => void;
  onCall: (phone: string) => void;
  onViewDetail: (c: Consultant) => void;
  onRate: (c: Consultant) => void;
  onEdit: (c: Consultant) => void;
  onDelete: (c: Consultant) => void;
}> = ({ consultant, isDark, isAdmin, onToggleAvailability, onSendEmail, onCall, onViewDetail, onRate, onEdit, onDelete }) => (
  <div className={`rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${darkCard(isDark)}`}>
    <div className="p-6">
      <div className="flex items-start gap-4">
        <img
          src={consultant.photo}
          alt={consultant.name}
          className="w-16 h-16 rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(consultant.name)}&background=10b981&color=fff`;
          }}
        />
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold truncate ${darkText(isDark)}`}>{consultant.name}</h3>
          <p className="text-emerald-600 font-medium">{consultant.specialty}</p>
          <p className="text-sm text-gray-500 truncate">{consultant.hospital || 'No hospital'}</p>
        </div>
        <button
          onClick={() => isAdmin && onToggleAvailability(consultant)}
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            consultant.available
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          } ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
          disabled={!isAdmin}
          title={isAdmin ? 'Click to toggle availability' : ''}
        >
          {consultant.available ? 'Available' : 'Busy'}
        </button>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="font-medium">Experience:</span>
          <span>{consultant.experience} years</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Languages:</span>
          <span>{consultant.languages?.join(', ') || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Rating:</span>
          <StarRating rating={Number(consultant.rating) || 0} size="sm" />
          <span className="ml-1">
            {(Number(consultant.rating) || 0).toFixed(1)} ({consultant.reviewCount || 0})
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          onClick={() => onSendEmail(consultant.email)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors min-w-0"
        >
          <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Email</span>
        </button>
        <button
          onClick={() => onCall(consultant.phone)}
          disabled={!consultant.phone}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
        >
          <PhoneIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Call</span>
        </button>
        <button
          onClick={() => onViewDetail(consultant)}
          className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          title="View Details"
        >
          <EyeIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="mt-3 pt-3 border-t flex gap-2">
        {!isAdmin && (
          <button
            onClick={() => onRate(consultant)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <StarIcon className="w-4 h-4" />
            Rate
          </button>
        )}
        {isAdmin && (
          <>
            <button
              onClick={() => onEdit(consultant)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <EditIcon className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onDelete(consultant)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              title="Remove Consultant"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  </div>
);

const MedicalConsultants: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useSettings();
  const isDark = theme === 'dark';
  const isAdmin = user?.email?.includes('admin') || user?.role === 'admin' || user?.isAdmin;

  // Data states
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [specialties, setSpecialties] = useState<string[]>(DEFAULT_SPECIALTIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    hospital: '',
    phone: '',
    email: '',
    languages: '',
    experience: '',
    bio: '',
    notes: '',
  });

  // Rating form state
  const [ratingData, setRatingData] = useState({ rating: 0, comment: '' });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []); // Empty deps - token is read from localStorage each call

  const fetchConsultants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/consultants`, { headers });
      if (!response.ok) throw new Error('Failed to fetch consultants');
      const data = await response.json();
      setConsultants(data.consultants || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching consultants:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchSpecialties = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/consultants/specialties/list`, { headers });
      if (response.ok) {
        const data = await response.json();
        setSpecialties(['All Specialties', ...(data.specialties || [])]);
      }
    } catch (err) {
      console.error('Error fetching specialties:', err);
    }
  }, [getAuthHeaders]);

  // Load data on mount only
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (mounted) await fetchConsultants();
      if (mounted) await fetchSpecialties();
    };
    loadData();
    return () => { mounted = false; };
  }, []);

  // ============================================================================
  // DATA NORMALIZATION (DB rows → frontend Consultant shape)
  // ============================================================================
  const normalizeConsultant = (raw: Record<string, unknown>): Consultant => ({
    id: raw.id as string,
    name: raw.name as string,
    specialty: raw.specialty as string,
    hospital: (raw.hospital as string) || '',
    phone: (raw.phone as string) || '',
    email: (raw.email as string) || '',
    photo: (raw.photo as string) || (raw.avatar_url as string) || `https://ui-avatars.com/api/?name=${encodeURIComponent(raw.name as string)}&background=10b981&color=fff`,
    available: (raw.available ?? raw.is_available ?? true) as boolean,
    languages: (raw.languages as string[]) || ['Thai'],
    experience: (raw.experience as number) || (raw.experience_years as number) || 0,
    rating: (raw.rating as number) || 0,
    reviewCount: (raw.reviewCount as number) || 0,
    bio: raw.bio as string | undefined,
    notes: (raw.notes as string) || (raw.admin_notes as string) || undefined,
    createdBy: raw.createdBy as string | undefined,
    createdAt: raw.createdAt as string | undefined,
    updatedAt: raw.updatedAt as string | undefined,
  });

  // ============================================================================
  // FILTERING
  // ============================================================================
  const filteredConsultants = consultants.filter((consultant) => {
    const matchesSearch =
      searchTerm === '' ||
      consultant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultant.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (consultant.hospital || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty =
      selectedSpecialty === 'All Specialties' || consultant.specialty === selectedSpecialty;
    const matchesAvailability = !showAvailableOnly || consultant.available;
    return matchesSearch && matchesSpecialty && matchesAvailability;
  });

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================
  const handleAddConsultant = async () => {
    if (!formData.name || !formData.specialty || !formData.email) {
      alert('Please fill in required fields (Name, Specialty, Email)');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE}/api/consultants`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          languages: formData.languages.split(',').map(l => l.trim()).filter(Boolean),
          experience: Number.parseInt(formData.experience, 10) || 0,
          userId: user?.id,
          userName: user?.name || user?.email || 'Admin',
          isAdmin: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to add consultant');
      }

      const result = await response.json();
      const raw = result.consultant || result;
      const addedConsultant = normalizeConsultant(raw as Record<string, unknown>);
      setConsultants(prev => [...prev, addedConsultant]);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error adding consultant:', err);
      alert(err instanceof Error ? err.message : 'Failed to add consultant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateConsultant = async () => {
    if (!selectedConsultant) return;

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE}/api/consultants/${selectedConsultant.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          languages: formData.languages.split(',').map(l => l.trim()).filter(Boolean),
          experience: Number.parseInt(formData.experience, 10) || 0,
          userId: user?.id,
          userName: user?.name || user?.email || 'Admin',
          isAdmin: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to update consultant');

      const result = await response.json();
      const raw = result.consultant || result;
      const updated = normalizeConsultant(raw as Record<string, unknown>);
      setConsultants(prev =>
        prev.map(c => (c.id === updated.id ? updated : c))
      );
      setShowEditModal(false);
      setSelectedConsultant(null);
      resetForm();
    } catch (err) {
      console.error('Error updating consultant:', err);
      alert('Failed to update consultant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConsultant = async () => {
    if (!selectedConsultant) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE}/api/consultants/${selectedConsultant.id}?isAdmin=true`,
        { method: 'DELETE', headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error('Failed to delete consultant');

      setConsultants(prev => prev.filter(c => c.id !== selectedConsultant.id));
      setShowDeleteConfirm(false);
      setSelectedConsultant(null);
    } catch (err) {
      console.error('Error deleting consultant:', err);
      alert('Failed to delete consultant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAvailability = async (consultant: Consultant) => {
    if (!isAdmin) return;

    try {
      const response = await fetch(`${API_BASE}/api/consultants/${consultant.id}/availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          available: !consultant.available,
          userId: user?.id,
          userName: user?.name || user?.email || 'Admin',
          isAdmin: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to update availability');

      const data = await response.json();
      const rawC = data.consultant || data;
      const normalized = normalizeConsultant(rawC as Record<string, unknown>);
      setConsultants(prev =>
        prev.map(c => (c.id === normalized.id ? normalized : c))
      );
    } catch (err) {
      console.error('Error toggling availability:', err);
      // Optimistic update if API fails (toggle locally)
      setConsultants(prev =>
        prev.map(c => (c.id === consultant.id ? { ...c, available: !c.available } : c))
      );
    }
  };

  const handleRateConsultant = async () => {
    if (!selectedConsultant || ratingData.rating === 0) {
      alert('Please select a rating');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE}/api/consultants/${selectedConsultant.id}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rating: ratingData.rating,
          comment: ratingData.comment,
          userId: user?.id,
          userName: user?.name || user?.email || 'Doctor',
        }),
      });

      if (!response.ok) throw new Error('Failed to submit rating');

      const data = await response.json();
      const rawR = data.consultant || data;
      const ratedConsultant = normalizeConsultant(rawR as Record<string, unknown>);
      setConsultants(prev =>
        prev.map(c => (c.id === ratedConsultant.id ? ratedConsultant : c))
      );
      setShowRateModal(false);
      setRatingData({ rating: 0, comment: '' });
      setSelectedConsultant(null);
    } catch (err) {
      console.error('Error rating consultant:', err);
      alert('Failed to submit rating');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================
  const resetForm = () => {
    setFormData({
      name: '',
      specialty: '',
      hospital: '',
      phone: '',
      email: '',
      languages: '',
      experience: '',
      bio: '',
      notes: '',
    });
  };

  const openEditModal = (consultant: Consultant) => {
    setFormData({
      name: consultant.name,
      specialty: consultant.specialty,
      hospital: consultant.hospital || '',
      phone: consultant.phone || '',
      email: consultant.email,
      languages: consultant.languages?.join(', ') || '',
      experience: consultant.experience?.toString() || '',
      bio: consultant.bio || '',
      notes: consultant.notes || '',
    });
    setSelectedConsultant(consultant);
    setShowEditModal(true);
  };

  const handleSendEmail = (email: string) => {
    globalThis.location.href = `mailto:${email}`;
  };

  const handleCall = (phone: string) => {
    globalThis.location.href = `tel:${phone}`;
  };

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-500 mt-4">Loading consultants...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - MAIN
  // ============================================================================
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${darkText(isDark)}`}>
            <UserGroupIcon className="w-8 h-8 text-emerald-600" />
            Medical Consultants
          </h1>
          <p className={`mt-1 ${darkSubtext(isDark)}`}>
            {isAdmin 
              ? 'Manage specialist contacts for patient referrals' 
              : 'Find specialists for patient referrals'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Consultant
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={fetchConsultants} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <div className={`rounded-xl shadow-lg p-4 mb-6 ${darkCard(isDark)}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, specialty, or hospital..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
              aria-label="Search consultants"
            />
          </div>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
            aria-label="Filter by specialty"
          >
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`} htmlFor="available-only-checkbox">
            <input
              id="available-only-checkbox"
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className={`text-sm whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Available only</span>
          </label>
        </div>
      </div>

      {/* Stats Bar */}
      <div className={`flex gap-4 mb-6 text-sm ${darkSubtext(isDark)}`}>
        <span>{filteredConsultants.length} consultant{filteredConsultants.length === 1 ? '' : 's'} found</span>
        <span>•</span>
        <span className="text-green-600">
          {filteredConsultants.filter(c => c.available).length} available
        </span>
      </div>

      {/* Consultants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredConsultants.map((consultant) => (
          <ConsultantCard
            key={consultant.id}
            consultant={consultant}
            isDark={isDark}
            isAdmin={isAdmin}
            onToggleAvailability={handleToggleAvailability}
            onSendEmail={handleSendEmail}
            onCall={handleCall}
            onViewDetail={(c) => { setSelectedConsultant(c); setShowDetailModal(true); }}
            onRate={(c) => { setSelectedConsultant(c); setRatingData({ rating: 0, comment: '' }); setShowRateModal(true); }}
            onEdit={openEditModal}
            onDelete={(c) => { setSelectedConsultant(c); setShowDeleteConfirm(true); }}
          />
        ))}
      </div>

      {filteredConsultants.length === 0 && (
        <div className="text-center py-12">
          <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No consultants found</h3>
          <p className="text-gray-600">
            {getNoResultsMessage(consultants.length > 0, isAdmin)}
          </p>
          {isAdmin && consultants.length === 0 && (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Add First Consultant
            </button>
          )}
        </div>
      )}

      {/* ============================================================================ */}
      {/* ADD/EDIT CONSULTANT MODAL */}
      {/* ============================================================================ */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {showAddModal ? 'Add New Consultant' : 'Edit Consultant'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedConsultant(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Close consultant form"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="consultant-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="consultant-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Dr. Name Surname"
                  />
                </div>

                <div>
                  <label htmlFor="consultant-specialty" className="block text-sm font-medium text-gray-700 mb-1">
                    Specialty *
                  </label>
                  <select
                    id="consultant-specialty"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Specialty</option>
                    {specialties.slice(1).map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="consultant-hospital" className="block text-sm font-medium text-gray-700 mb-1">
                    Hospital/Institution
                  </label>
                  <input
                    id="consultant-hospital"
                    type="text"
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Hospital name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="consultant-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      id="consultant-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="+66-xxx-xxx"
                    />
                  </div>
                  <div>
                    <label htmlFor="consultant-email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      id="consultant-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="email@hospital.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="consultant-languages" className="block text-sm font-medium text-gray-700 mb-1">
                    Languages (comma separated)
                  </label>
                  <input
                    id="consultant-languages"
                    type="text"
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Thai, English"
                  />
                </div>

                <div>
                  <label htmlFor="consultant-experience" className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    id="consultant-experience"
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="10"
                    min="0"
                  />
                </div>

                <div>
                  <label htmlFor="consultant-bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    id="consultant-bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Brief description..."
                    rows={3}
                  />
                </div>

                {isAdmin && (
                  <div>
                    <label htmlFor="consultant-notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Notes (Admin only)
                    </label>
                    <textarea
                      id="consultant-notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Notes about this consultant..."
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedConsultant(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={showAddModal ? handleAddConsultant : handleUpdateConsultant}
                    disabled={actionLoading || !formData.name || !formData.specialty || !formData.email}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {getSaveButtonText(actionLoading, showAddModal)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* DETAIL MODAL */}
      {/* ============================================================================ */}
      {showDetailModal && selectedConsultant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Consultant Details</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedConsultant(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Close consultant details"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <img
                  src={selectedConsultant.photo}
                  alt={selectedConsultant.name}
                  className="w-20 h-20 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedConsultant.name)}&background=10b981&color=fff`;
                  }}
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedConsultant.name}</h3>
                  <p className="text-emerald-600 font-medium">{selectedConsultant.specialty}</p>
                  <p className="text-gray-500">{selectedConsultant.hospital}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="font-semibold">{selectedConsultant.experience} years</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Availability</p>
                    <p className={`font-semibold ${selectedConsultant.available ? 'text-green-600' : 'text-gray-500'}`}>
                      {selectedConsultant.available ? 'Available' : 'Busy'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Rating</p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={Number(selectedConsultant.rating) || 0} />
                    <span className="font-semibold">
                      {(Number(selectedConsultant.rating) || 0).toFixed(1)} ({selectedConsultant.reviewCount || 0} reviews)
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">Languages</p>
                  <p className="font-semibold">{selectedConsultant.languages?.join(', ') || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">Contact</p>
                  <p className="font-semibold">{selectedConsultant.email}</p>
                  <p className="text-gray-600">{selectedConsultant.phone || 'No phone'}</p>
                </div>

                {selectedConsultant.bio && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Bio</p>
                    <p className="text-gray-700">{selectedConsultant.bio}</p>
                  </div>
                )}

                {isAdmin && selectedConsultant.notes && (
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-700 font-medium">Admin Notes</p>
                    <p className="text-gray-700">{selectedConsultant.notes}</p>
                  </div>
                )}

                {/* Recent Reviews */}
                {selectedConsultant.reviews && selectedConsultant.reviews.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Recent Reviews</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedConsultant.reviews.slice(-3).reverse().map((review) => (
                        <div key={review.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <StarRating rating={review.rating} size="sm" />
                            <span className="text-sm text-gray-500">by {review.userName}</span>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-gray-600">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isAdmin && selectedConsultant.updatedAt && (
                  <div className="text-xs text-gray-400 pt-4 border-t">
                    Last updated: {new Date(selectedConsultant.updatedAt).toLocaleString()}
                    {selectedConsultant.updatedByName && ` by ${selectedConsultant.updatedByName}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* RATE CONSULTANT MODAL */}
      {/* ============================================================================ */}
      {showRateModal && selectedConsultant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Rate Consultant</h2>
                <button
                  onClick={() => {
                    setShowRateModal(false);
                    setSelectedConsultant(null);
                    setRatingData({ rating: 0, comment: '' });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Close rating form"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">How would you rate</p>
                <p className="font-semibold text-lg">{selectedConsultant.name}?</p>
              </div>

              <div className="flex justify-center mb-6">
                <StarRating
                  rating={ratingData.rating}
                  onRate={(rating) => setRatingData({ ...ratingData, rating })}
                  size="lg"
                  interactive
                />
              </div>

              <div className="mb-6">
                <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-1">
                  Comment (optional)
                </label>
                <textarea
                  id="review-comment"
                  value={ratingData.comment}
                  onChange={(e) => setRatingData({ ...ratingData, comment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Share your experience..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRateModal(false);
                    setSelectedConsultant(null);
                    setRatingData({ rating: 0, comment: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRateConsultant}
                  disabled={actionLoading || ratingData.rating === 0}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================================ */}
      {showDeleteConfirm && selectedConsultant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Consultant?</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to remove "{selectedConsultant.name}" from the consultants list?
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedConsultant(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConsultant}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalConsultants;
