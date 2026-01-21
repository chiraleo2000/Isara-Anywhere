/**
 * Patient Management with PDPA Consent
 * Search, List, Detail View, Consent Management
 * 
 * Updated: Only shows patients assigned to this doctor via appointments
 * Updated: Supports category filter from Health Studio buttons
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PatientRecord, User, ConsentRecord } from '../types';
import { patientDataService } from '../services/patientDataService';
// PostgreSQL-backed API service - NO GCS!
import { fetchAllAppointments } from '../services/apiDataService';
import config, { isFeatureEnabled } from '../services/config';
import { useResponsive } from '../hooks/useResponsive';
import { Card, ResponsiveGrid, ResponsiveContainer } from '../components/common/ResponsiveLayout';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
} from '../assets/NewSvgIcons';

// ============================================================================
// INTERFACES
// ============================================================================

interface PatientManagementProps {
  doctor: User;
  onSelectPatient: (patient: PatientRecord) => void;
  onCreateEMR: (patientId: string) => void;
  onCreatePrescription: (patientId: string) => void;
}

interface SearchFilters {
  query: string;
  ageMin?: number;
  ageMax?: number;
  gender?: 'male' | 'female' | 'other' | '';
  riskLevel?: 'low' | 'medium' | 'high' | '';
  hasConsent?: boolean;
}

// ============================================================================
// PDPA CONSENT BADGE
// ============================================================================

interface ConsentBadgeProps {
  hasConsent: boolean;
  onClick?: () => void;
}

const ConsentBadge: React.FC<ConsentBadgeProps> = ({ hasConsent, onClick }) => {
  if (!isFeatureEnabled('pdpaEnabled')) return null;

  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        hasConsent
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      {hasConsent ? '✓ Consent' : '✗ No Consent'}
    </button>
  );
};

// ============================================================================
// CONSENT DIALOG
// ============================================================================

interface ConsentDialogProps {
  patient: PatientRecord;
  doctor: User;
  onClose: () => void;
  onRequestConsent: () => void;
}

const ConsentDialog: React.FC<ConsentDialogProps> = ({
  patient,
  doctor,
  onClose,
  onRequestConsent,
}) => {
  const consent = patient.consentStatus;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">PDPA Consent Status</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Patient Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              <img
                src={patient.demographics.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(patient.id)}`}
                alt={patient.demographics.name}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-semibold text-gray-900">{patient.demographics.name}</p>
                <p className="text-sm text-gray-600">
                  {patient.demographics.age} years • {patient.demographics.gender}
                </p>
              </div>
            </div>
          </div>

          {/* Consent Status */}
          {consent.hasConsent ? (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                <span className="font-semibold text-green-700">Consent Granted</span>
              </div>

              {/* Data Access Permissions */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">You have access to:</p>
                <div className="space-y-1">
                  {consent.dataTypesAllowed?.map((dataType) => (
                    <div key={dataType} className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      <span>{dataType}</span>
                    </div>
                  ))}
                </div>
                {consent.expiresAt && (
                  <p className="text-xs text-gray-500 mt-3">
                    Expires: {new Date(consent.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold text-red-700">No Consent</span>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-3">
                  You need patient consent to access their medical records under PDPA regulations.
                </p>
                <button
                  onClick={onRequestConsent}
                  className="w-full py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Request Consent
                </button>
              </div>
            </div>
          )}

          {/* PDPA Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-blue-900 mb-2">About PDPA Compliance</p>
            <p className="text-blue-800 text-xs leading-relaxed">
              Under the Personal Data Protection Act (PDPA), doctors must obtain explicit consent
              before accessing patient health records. This ensures patient privacy and data protection.
            </p>
          </div>
        </div>

        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PATIENT CARD
// ============================================================================

interface PatientCardProps {
  patient: PatientRecord;
  doctor: User;
  onClick: () => void;
  onShowConsent: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, doctor, onClick, onShowConsent }) => {
  const riskColors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  };

  return (
    <Card padding="md" onClick={onClick}>
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <img
          src={patient.demographics.photo || 'https://i.pravatar.cc/150'}
          alt={patient.demographics.name}
          className="w-14 h-14 rounded-full flex-shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{patient.demographics.name}</h3>
            {patient.riskLevel && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskColors[patient.riskLevel]}`}>
                {patient.riskLevel}
              </span>
            )}
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>{patient.demographics.age} years • {patient.demographics.gender}</p>
            {patient.medicalInfo.chronicConditions.length > 0 && (
              <p className="truncate">
                <span className="font-medium">Conditions:</span>{' '}
                {patient.medicalInfo.chronicConditions.join(', ')}
              </p>
            )}
            {patient.lastVisit && (
              <p className="flex items-center text-xs">
                <ClockIcon className="w-3 h-3 mr-1" />
                Last visit: {new Date(patient.lastVisit).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Consent Badge */}
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <ConsentBadge
              hasConsent={patient.consentStatus.hasConsent}
              onClick={onShowConsent}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

// ============================================================================
// MAIN PATIENT MANAGEMENT COMPONENT
// ============================================================================

export const PatientManagement: React.FC<PatientManagementProps> = ({
  doctor,
  onSelectPatient,
  onCreateEMR,
  onCreatePrescription,
}) => {
  const { isMobile } = useResponsive();
  const [searchParams] = useSearchParams();
  
  // Get category filter from URL (from Health Studio buttons)
  const categoryFromUrl = searchParams.get('category');

  // State
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(categoryFromUrl || 'all');

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    gender: '',
    riskLevel: '',
  });

  // Update category when URL changes
  useEffect(() => {
    if (categoryFromUrl) {
      setActiveCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  // Load patients
  useEffect(() => {
    loadPatients();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [filters, patients]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      
      // Load both patients and appointments
      const [allPatients, allAppointments] = await Promise.all([
        patientDataService.getAllPatients(),
        fetchAllAppointments()
      ]);

      // Filter appointments for this doctor
      const doctorAppointments = allAppointments.filter((apt: any) => {
        return apt.doctorId === doctor.id || 
               apt.assignedDoctorId === doctor.id ||
               apt.adminAssignedDoctorId === doctor.id;
      });

      console.log('[PatientManagement] Doctor appointments:', doctorAppointments.length);
      console.log('[PatientManagement] Doctor ID:', doctor.id);

      // Get unique patient IDs from doctor's appointments (both current and historical)
      const assignedPatientIds = new Set(
        doctorAppointments.map((apt: any) => apt.patientId)
      );

      // Filter patients to only those assigned to this doctor
      // Admin can see all patients
      let filteredData: PatientRecord[];
      if (doctor.role === 'admin' || doctor.isAdmin) {
        filteredData = allPatients;
        console.log('[PatientManagement] Admin view - showing all patients');
      } else {
        filteredData = allPatients.filter((p: PatientRecord) => assignedPatientIds.has(p.id));
        console.log('[PatientManagement] Doctor view - showing assigned patients only:', filteredData.length);
      }

      setPatients(filteredData);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...patients];

    // Search query
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.demographics.name.toLowerCase().includes(query) ||
          p.contact.email.toLowerCase().includes(query) ||
          p.contact.phone.includes(query) ||
          p.demographics.idNumber.includes(query)
      );
    }

    // Age filter
    if (filters.ageMin) {
      filtered = filtered.filter((p) => p.demographics.age >= filters.ageMin!);
    }
    if (filters.ageMax) {
      filtered = filtered.filter((p) => p.demographics.age <= filters.ageMax!);
    }

    // Gender filter
    if (filters.gender) {
      filtered = filtered.filter((p) => p.demographics.gender === filters.gender);
    }

    // Risk level filter
    if (filters.riskLevel) {
      filtered = filtered.filter((p) => p.riskLevel === filters.riskLevel);
    }

    // Consent filter
    if (filters.hasConsent !== undefined) {
      filtered = filtered.filter((p) => p.consentStatus.hasConsent === filters.hasConsent);
    }

    setFilteredPatients(filtered);
  };

  const handleShowConsent = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setShowConsentDialog(true);
  };

  const handleRequestConsent = async () => {
    if (selectedPatient) {
      await patientDataService.requestConsent(
        selectedPatient.id,
        doctor.id,
        ['phr-access', 'ehr-access', 'prescription-access']
      );
      alert('Consent request sent to patient');
      setShowConsentDialog(false);
    }
  };

  if (loading) {
    return (
      <ResponsiveContainer>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer className="py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Patient Management</h1>
        <p className="text-gray-600 mt-1">Search and manage your patients</p>
      </div>

      {/* Search and Filters */}
      <Card padding="md" className="mb-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, ID, email, or phone..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-emerald-600 font-medium hover:text-emerald-700"
          >
            {showFilters ? '▼ Hide Filters' : '▶ Show Filters'}
          </button>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({ ...filters, gender: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                <select
                  value={filters.riskLevel}
                  onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age Min</label>
                <input
                  type="number"
                  value={filters.ageMin || ''}
                  onChange={(e) => setFilters({ ...filters, ageMin: parseInt(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Min age"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age Max</label>
                <input
                  type="number"
                  value={filters.ageMax || ''}
                  onChange={(e) => setFilters({ ...filters, ageMax: parseInt(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Max age"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Health Records Category Tabs (from Health Studio) */}
      {activeCategory && activeCategory !== 'all' && (
        <Card padding="sm" className="mb-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-teal-700">📊 Health Logs Filter:</span>
            {[
              { id: 'all', label: 'All Records', icon: '📋' },
              { id: 'diagnosis', label: 'Diagnosis', icon: '🔍' },
              { id: 'treatment', label: 'Treatment Plan', icon: '💊' },
              { id: 'medical-record', label: 'Medical Record', icon: '📊' },
              { id: 'radiology', label: 'Radiology', icon: '🩻' },
              { id: 'laboratory', label: 'Laboratory', icon: '🧪' },
              { id: 'pathology', label: 'Pathology', icon: '🔬' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  activeCategory === cat.id
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-teal-700 border border-teal-300 hover:bg-teal-100'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          {activeCategory !== 'all' && (
            <p className="mt-2 text-xs text-teal-600">
              Showing patients with {activeCategory} records. Click on a patient to view their health logs.
            </p>
          )}
        </Card>
      )}

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          <span className="font-semibold">{filteredPatients.length}</span> patients found
        </p>
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No patients found</p>
          </div>
        </Card>
      ) : (
        <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap={4}>
          {filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              doctor={doctor}
              onClick={() => onSelectPatient(patient)}
              onShowConsent={() => handleShowConsent(patient)}
            />
          ))}
        </ResponsiveGrid>
      )}

      {/* Consent Dialog */}
      {showConsentDialog && selectedPatient && (
        <ConsentDialog
          patient={selectedPatient}
          doctor={doctor}
          onClose={() => setShowConsentDialog(false)}
          onRequestConsent={handleRequestConsent}
        />
      )}
    </ResponsiveContainer>
  );
};

export default PatientManagement;
