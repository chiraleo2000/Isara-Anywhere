/**
 * Admin Doctor Management Page
 * Allows admin to view all doctor accounts and manage their status
 * Now includes privilege/role management functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/common/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';

interface DoctorUser {
  id: string;
  email: string;
  name: string;
  specialty?: string;
  medicalLicenseNumber?: string;
  phone?: string;
  createdAt: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  isAdmin?: boolean;
  role?: 'doctor' | 'admin';
  qualifications?: string[];
  experience?: string;
  hospital?: string;
  lastLogin?: string | null;
}

interface ApprovalHistory {
  id: string;
  email: string;
  name: string;
  approvalStatus: 'approved' | 'rejected';
  processedAt: string;
  processedBy: string;
}

// ---------- Helpers ----------

const isDoctorAdmin = (d: DoctorUser): boolean =>
  Boolean(d.isAdmin) || d.role === 'admin';

const getApprovalBadge = (status: string): { style: string; label: string } => {
  const map: Record<string, { style: string; label: string }> = {
    approved: { style: 'bg-green-100 text-green-800', label: '✓ Approved' },
    rejected: { style: 'bg-red-100 text-red-800', label: '✕ Rejected' },
  };
  return map[status] ?? { style: 'bg-yellow-100 text-yellow-800', label: '⏳ Pending' };
};

const TAB_ACTIVE_STYLES: Record<string, string> = {
  all: 'border-indigo-500 text-indigo-600 bg-indigo-50/50',
  pending: 'border-yellow-500 text-yellow-600 bg-yellow-50/50',
  approved: 'border-green-500 text-green-600 bg-green-50/50',
  rejected: 'border-red-500 text-red-600 bg-red-50/50',
  admins: 'border-purple-500 text-purple-600 bg-purple-50/50',
};

const TAB_INACTIVE_STYLE = 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';

const getTabClass = (activeTab: string, tab: string) =>
  `px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? TAB_ACTIVE_STYLES[tab] : TAB_INACTIVE_STYLE}`;

const buildThemeClasses = (dark: boolean) => ({
  page: dark ? 'min-h-screen bg-gray-900 p-6' : 'min-h-screen bg-gray-50 p-6',
  heading: `text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'} flex items-center gap-3`,
  subtitle: dark ? 'text-gray-400 mt-2' : 'text-gray-600 mt-2',
  card: dark
    ? 'bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700'
    : 'bg-white rounded-xl shadow-sm p-6 border border-gray-100',
  cardLabel: dark ? 'text-gray-400 text-sm' : 'text-gray-500 text-sm',
  tableWrap: dark
    ? 'bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden'
    : 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden',
  tableBorder: dark ? 'border-b border-gray-700' : 'border-b border-gray-200',
});

// ---------- Modal Sub-Components ----------

interface DoctorDetailsModalProps {
  doctor: DoctorUser;
  onClose: () => void;
  onApprove: (d: DoctorUser) => void;
  onReject: (d: DoctorUser) => void;
  formatDate: (d: string) => string;
}

const DoctorDetailsModal: React.FC<DoctorDetailsModalProps> = ({
  doctor, onClose, onApprove, onReject, formatDate,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Doctor Details</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {doctor.name?.charAt(0) || 'D'}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{doctor.name}</h3>
            <p className="text-gray-600">{doctor.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Specialty</span>
            <p className="font-medium">{doctor.specialty || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Medical License</span>
            <p className="font-medium">{doctor.medicalLicenseNumber || 'Not provided'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Phone</span>
            <p className="font-medium">{doctor.phone || 'Not provided'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Registered On</span>
            <p className="font-medium">{formatDate(doctor.createdAt)}</p>
          </div>
          {doctor.experience && (
            <div>
              <span className="text-sm text-gray-500">Experience</span>
              <p className="font-medium">{doctor.experience}</p>
            </div>
          )}
          {doctor.hospital && (
            <div>
              <span className="text-sm text-gray-500">Hospital/Clinic</span>
              <p className="font-medium">{doctor.hospital}</p>
            </div>
          )}
        </div>
        {doctor.qualifications && doctor.qualifications.length > 0 && (
          <div className="mt-6">
            <span className="text-sm text-gray-500">Qualifications</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {doctor.qualifications.map((qual) => (
                <span key={qual} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                  {qual}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
        <button onClick={() => onReject(doctor)} className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200">Reject</button>
        <button onClick={() => onApprove(doctor)} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Approve</button>
      </div>
    </div>
  </div>
);

interface ConfirmActionModalProps {
  action: 'approve' | 'reject';
  doctor: DoctorUser;
  processing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  action, doctor, processing, onClose, onConfirm,
}) => {
  const isApprove = action === 'approve';
  const confirmLabel = isApprove ? 'Yes, Approve' : 'Yes, Reject';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${isApprove ? 'bg-green-100' : 'bg-red-100'}`}>
            <svg className={`w-8 h-8 ${isApprove ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isApprove
                ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'} />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
            {isApprove ? 'Approve Doctor?' : 'Reject Doctor?'}
          </h3>
          <p className="text-center text-gray-600">
            {isApprove
              ? `Are you sure you want to approve ${doctor.name}? They will receive an email notification and can start using the platform.`
              : `Are you sure you want to reject ${doctor.name}? They will be notified of this decision.`}
          </p>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={processing}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
          >
            {processing ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Processing...</>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface RoleChangeModalProps {
  doctor: DoctorUser;
  newRole: 'doctor' | 'admin';
  setNewRole: (r: 'doctor' | 'admin') => void;
  processing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  doctor, newRole, setNewRole, processing, onClose, onConfirm,
}) => {
  const isPromote = newRole === 'admin';
  const confirmLabel = isPromote ? '⬆️ Promote to Admin' : '⬇️ Demote to Doctor';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${isPromote ? 'bg-purple-100' : 'bg-orange-100'}`}>
            <svg className={`w-8 h-8 ${isPromote ? 'text-purple-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPromote
                ? 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                : 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'} />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
            {isPromote ? 'Promote to Admin?' : 'Demote to Doctor?'}
          </h3>
          <p className="text-center text-gray-600">
            {isPromote
              ? `Are you sure you want to promote ${doctor.name} to Admin? They will gain access to administrative functions including doctor approval and appointment management.`
              : `Are you sure you want to demote ${doctor.name} to regular Doctor? They will lose access to administrative functions.`}
          </p>
          <div className="mt-6 space-y-3">
            <label aria-label="Doctor role" className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="radio" name="role" value="doctor" checked={newRole === 'doctor'} onChange={() => setNewRole('doctor')} className="w-4 h-4 text-blue-600" />
              <div className="ml-3">
                <span className="font-medium text-gray-900">🩺 Doctor</span>
                <p className="text-sm text-gray-500">Standard doctor privileges - patient care, appointments, EMR access</p>
              </div>
            </label>
            <label aria-label="Admin role" className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="radio" name="role" value="admin" checked={newRole === 'admin'} onChange={() => setNewRole('admin')} className="w-4 h-4 text-purple-600" />
              <div className="ml-3">
                <span className="font-medium text-gray-900">👑 Admin</span>
                <p className="text-sm text-gray-500">Full administrative access - doctor approval, appointment pool, user management</p>
              </div>
            </label>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={processing}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${isPromote ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'} disabled:opacity-50`}
          >
            {processing ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Processing...</>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface RemoveAdminModalProps {
  doctor: DoctorUser;
  action: 'demote' | 'remove';
  processing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const RemoveAdminModal: React.FC<RemoveAdminModalProps> = ({
  doctor, action, processing, onClose, onConfirm,
}) => {
  const isRemove = action === 'remove';
  const confirmLabel = isRemove ? '🗑️ Remove from Platform' : '⬇️ Demote to Doctor';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${isRemove ? 'bg-red-100' : 'bg-orange-100'}`}>
            <svg className={`w-8 h-8 ${isRemove ? 'text-red-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRemove
                ? 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                : 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'} />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
            {isRemove ? '🗑️ Remove Admin from Platform?' : '⬇️ Demote Admin to Doctor?'}
          </h3>
          <p className="text-center text-gray-600 mb-4">
            {isRemove
              ? `Are you sure you want to completely remove ${doctor.name} from the platform? Their account will be deactivated and they will not be able to access the system.`
              : `Are you sure you want to demote ${doctor.name} from Admin to Doctor? They will lose all administrative privileges but can still access doctor functions.`}
          </p>
          <div className={`p-4 rounded-lg ${isRemove ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
            <div className="flex items-start gap-2">
              <svg className={`w-5 h-5 mt-0.5 ${isRemove ? 'text-red-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className={`text-sm ${isRemove ? 'text-red-700' : 'text-orange-700'}`}>
                {isRemove
                  ? 'This action will deactivate the account. The user will need to contact support to regain access.'
                  : 'This action can be reversed by promoting them back to admin from the admin management page.'}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={processing}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${isRemove ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'} disabled:opacity-50`}
          >
            {processing ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Processing...</>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Tab Panel Sub-Components ----------

interface PendingTabPanelProps {
  doctors: DoctorUser[];
  processing: string | null;
  formatDate: (d: string) => string;
  onViewDetails: (d: DoctorUser) => void;
  onReject: (d: DoctorUser) => void;
  onApprove: (d: DoctorUser) => void;
}

const PendingTabPanel: React.FC<PendingTabPanelProps> = ({
  doctors, processing, formatDate, onViewDetails, onReject, onApprove,
}) => {
  if (doctors.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
        <p className="text-gray-500">All doctor registrations have been processed.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {doctors.map((doctor) => (
        <div key={doctor.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                {doctor.name?.charAt(0) || 'D'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{doctor.name}</h3>
                <p className="text-gray-600">{doctor.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {doctor.specialty && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {doctor.specialty}
                    </span>
                  )}
                  {doctor.medicalLicenseNumber && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      License: {doctor.medicalLicenseNumber}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending Since: {formatDate(doctor.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onViewDetails(doctor)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">View Details</button>
              <button onClick={() => onReject(doctor)} disabled={processing === doctor.id} className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">Reject</button>
              <button
                onClick={() => onApprove(doctor)}
                disabled={processing === doctor.id}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processing === doctor.id ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Processing...</>
                ) : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface DoctorsTabPanelProps {
  doctors: DoctorUser[];
  processing: string | null;
  currentUserId?: string;
  onViewDetails: (d: DoctorUser) => void;
  onPromote: (d: DoctorUser) => void;
  onDemote: (d: DoctorUser) => void;
  onReject: (d: DoctorUser) => void;
  onApprove: (d: DoctorUser) => void;
}

const DoctorsTabPanel: React.FC<DoctorsTabPanelProps> = ({
  doctors, processing, currentUserId, onViewDetails, onPromote, onDemote, onReject, onApprove,
}) => {
  if (doctors.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
        <p className="text-gray-500">Try adjusting your search or filters.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {doctors.map((doctor) => {
        const isAdmin = isDoctorAdmin(doctor);
        const badge = getApprovalBadge(doctor.approvalStatus);
        return (
          <div
            key={doctor.id}
            className={`border rounded-lg p-6 hover:shadow-md transition-shadow bg-white ${
              isAdmin ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold ${
                  isAdmin
                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                }`}>
                  {doctor.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{doctor.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isAdmin ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isAdmin ? '👑 Admin' : '🩺 Doctor'}
                    </span>
                  </div>
                  <p className="text-gray-600">{doctor.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doctor.specialty && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {doctor.specialty}
                      </span>
                    )}
                    {doctor.medicalLicenseNumber && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        License: {doctor.medicalLicenseNumber}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.style}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onViewDetails(doctor)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">View Details</button>
                {doctor.approvalStatus === 'approved' && (
                  <button
                    onClick={() => isAdmin ? onDemote(doctor) : onPromote(doctor)}
                    disabled={processing === doctor.id || doctor.id === currentUserId}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      isAdmin ? 'text-orange-700 bg-orange-100 hover:bg-orange-200' : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                    }`}
                    title={doctor.id === currentUserId ? "Cannot change your own role" : "Change role"}
                  >
                    {isAdmin ? '⬇️ Demote to Doctor' : '⬆️ Promote to Admin'}
                  </button>
                )}
                {doctor.approvalStatus === 'pending' && (
                  <>
                    <button onClick={() => onReject(doctor)} disabled={processing === doctor.id} className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">Reject</button>
                    <button onClick={() => onApprove(doctor)} disabled={processing === doctor.id} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">Approve</button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface AdminsTabPanelProps {
  doctors: DoctorUser[];
  processing: string | null;
  currentUserId?: string;
  formatDate: (d: string) => string;
  onViewDetails: (d: DoctorUser) => void;
  onDemote: (d: DoctorUser) => void;
  onRemove: (d: DoctorUser) => void;
}

const AdminsTabPanel: React.FC<AdminsTabPanelProps> = ({
  doctors, processing, currentUserId, formatDate, onViewDetails, onDemote, onRemove,
}) => {
  if (doctors.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Admins Found</h3>
        <p className="text-gray-500">No users have been promoted to admin role yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-purple-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Admin Management</span>
        </div>
        <p className="text-sm text-purple-600 mt-1">
          You can demote admins back to doctor role or completely remove them from the platform if they leave.
        </p>
      </div>
      {doctors.map((doctor) => (
        <div key={doctor.id} className="border border-purple-300 rounded-lg p-6 hover:shadow-md transition-shadow bg-purple-50/30">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                {doctor.name?.charAt(0) || 'A'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{doctor.name}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">👑 Admin</span>
                  {doctor.id === currentUserId && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">You</span>
                  )}
                </div>
                <p className="text-gray-600">{doctor.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {doctor.specialty && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{doctor.specialty}</span>
                  )}
                  {doctor.medicalLicenseNumber && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">License: {doctor.medicalLicenseNumber}</span>
                  )}
                  {doctor.lastLogin && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Last login: {formatDate(doctor.lastLogin)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onViewDetails(doctor)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">View Details</button>
              {doctor.id !== currentUserId && (
                <>
                  <button onClick={() => onDemote(doctor)} disabled={processing === doctor.id} className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50">⬇️ Demote to Doctor</button>
                  <button onClick={() => onRemove(doctor)} disabled={processing === doctor.id} className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">🗑️ Remove from Platform</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface HistoryTabPanelProps {
  history: ApprovalHistory[];
  formatDate: (d: string) => string;
}

const HistoryTabPanel: React.FC<HistoryTabPanelProps> = ({ history, formatDate }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Approval History</h3>
        <p className="text-gray-500">No doctor registrations have been processed yet.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed By</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {history.map((item) => {
            const badge = getApprovalBadge(item.approvalStatus);
            return (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                      {item.name?.charAt(0) || 'D'}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.style}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.processedBy}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.processedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ---------- Main Component ----------

const AdminDoctorManagement: React.FC = () => {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const cx = buildThemeClasses(isDark);

  // i18n labels
  const labels = {
    pageTitle: { en: 'Doctor Management', th: 'จัดการแพทย์' },
    addDoctor: { en: 'Add Doctor', th: 'เพิ่มแพทย์' },
    allDoctors: { en: 'All Doctors', th: 'แพทย์ทั้งหมด' },
    pending: { en: 'Pending', th: 'รอดำเนินการ' },
    approved: { en: 'Approved', th: 'อนุมัติแล้ว' },
    rejected: { en: 'Rejected', th: 'ปฏิเสธแล้ว' },
    admins: { en: 'Admins', th: 'ผู้ดูแลระบบ' },
    search: { en: 'Search doctors...', th: 'ค้นหาแพทย์...' },
    approve: { en: 'Approve', th: 'อนุมัติ' },
    reject: { en: 'Reject', th: 'ปฏิเสธ' },
    manageRole: { en: 'Manage Role', th: 'จัดการบทบาท' },
    doctor: { en: 'Doctor', th: 'แพทย์' },
    admin: { en: 'Admin', th: 'ผู้ดูแลระบบ' },
    email: { en: 'Email', th: 'อีเมล' },
    specialty: { en: 'Specialty', th: 'ความเชี่ยวชาญ' },
    status: { en: 'Status', th: 'สถานะ' },
    actions: { en: 'Actions', th: 'การดำเนินการ' },
    loading: { en: 'Loading...', th: 'กำลังโหลด...' },
    noResults: { en: 'No doctors found', th: 'ไม่พบแพทย์' },
  };
  const label = (key: keyof typeof labels) => labels[key][language] || labels[key].en;

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [allDoctors, setAllDoctors] = useState<DoctorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'admins'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorUser | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{ action: 'approve' | 'reject'; doctor: DoctorUser } | null>(null);
  
  // Role management state
  const [showRoleModal, setShowRoleModal] = useState<DoctorUser | null>(null);
  const [newRole, setNewRole] = useState<'doctor' | 'admin'>('doctor');
  
  // Admin removal state
  const [showRemoveAdminModal, setShowRemoveAdminModal] = useState<{ doctor: DoctorUser; action: 'demote' | 'remove' } | null>(null);

  // Check if user is admin - wait for auth loading to complete first
  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) {
      return;
    }
    
    if (isAuthenticated && user) {
      // Check admin access
      const isAdmin = user.isAdmin || user.role === 'admin';
      if (!isAdmin) {
        // Navigate back - non-admin users shouldn't access this page
        navigate(-1);
      }
    } else {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Use main API URL for API calls (not AUTH_URL)
  const API_URL = import.meta.env.VITE_API_URL || '';

  // Fetch all doctors - use /api/admin/users endpoint
  const fetchAllDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all users with role=doctor from admin API
      const [usersResponse, pendingResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/users?role=doctor`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        }),
        fetch(`${API_URL}/api/admin/pending-doctors`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        })
      ]);

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const usersData = await usersResponse.json();
      // Consume pending response body (data merged into main users endpoint)
      if (pendingResponse.ok) await pendingResponse.json();
      
      // Map users to DoctorUser interface
      const doctors: DoctorUser[] = (usersData.users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        specialty: u.specialty || 'General Practice',
        medicalLicenseNumber: u.medical_license_number,
        phone: u.phone_number,
        createdAt: u.created_at,
        approvalStatus: u.approval_status || (u.is_approved ? 'approved' : 'pending'),
        isActive: u.is_active,
        isAdmin: u.is_admin,
        role: u.role,
        qualifications: u.qualifications,
        experience: u.experience,
        hospital: u.hospital,
        lastLogin: u.last_login_at
      }));
      
      setAllDoctors(doctors);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctor accounts');
      setAllDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchAllDoctors();
  }, [fetchAllDoctors]);

  // Handle approve doctor
  const handleApprove = async (doctor: DoctorUser) => {
    try {
      setProcessing(doctor.id);
      setError(null);

      const response = await fetch(`${API_URL}/api/admin/approve-doctor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          userId: doctor.id,
          adminId: user?.id,
          adminEmail: user?.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to approve doctor');
      }

      setSuccessMessage(`Successfully approved Dr. ${doctor.name}. They will receive an email notification.`);
      setShowConfirmModal(null);

      // Refresh list
      fetchAllDoctors();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to approve doctor');
    } finally {
      setProcessing(null);
    }
  };

  // Handle reject doctor
  const handleReject = async (doctor: DoctorUser) => {
    try {
      setProcessing(doctor.id);
      setError(null);

      const response = await fetch(`${API_URL}/api/admin/reject-doctor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          userId: doctor.id,
          adminId: user?.id,
          reason: 'Application reviewed and declined by administrator'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reject doctor');
      }

      setSuccessMessage(`Doctor ${doctor.name}'s registration has been rejected.`);
      setShowConfirmModal(null);

      // Refresh list
      fetchAllDoctors();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to reject doctor');
    } finally {
      setProcessing(null);
    }
  };

  // Handle role change
  const handleRoleChange = async (doctor: DoctorUser, role: 'doctor' | 'admin') => {
    try {
      setProcessing(doctor.id);
      setError(null);

      const response = await fetch(`${API_URL}/api/admin/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          userId: doctor.id,
          adminId: user?.id,
          role: role,
          isAdmin: role === 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update role');
      }

      setSuccessMessage(`${doctor.name}'s role has been updated to ${role.toUpperCase()}.`);
      setShowRoleModal(null);
      setNewRole('doctor');

      // Refresh list
      fetchAllDoctors();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setProcessing(null);
    }
  };

  // Filter doctors based on search and active tab
  const filteredDoctors = allDoctors.filter((doctor: DoctorUser) => {
    const matchesSearch = 
      doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    const tabFilter: Record<string, boolean> = {
      all: true,
      pending: doctor.approvalStatus === 'pending',
      approved: doctor.approvalStatus === 'approved',
      rejected: doctor.approvalStatus === 'rejected',
      admins: isDoctorAdmin(doctor),
    };
    return tabFilter[activeTab] ?? true;
  });

  // Count by status
  const pendingCount = allDoctors.filter(d => d.approvalStatus === 'pending').length;
  const approvedCount = allDoctors.filter(d => d.approvalStatus === 'approved').length;
  const rejectedCount = allDoctors.filter(d => d.approvalStatus === 'rejected').length;
  const adminCount = allDoctors.filter(isDoctorAdmin).length;

  // Handle admin removal/demotion
  const handleRemoveAdmin = async (doctor: DoctorUser, action: 'demote' | 'remove') => {
    try {
      setProcessing(doctor.id);
      setError(null);

      const response = await fetch(`${API_URL}/api/admin/remove-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          targetUserId: doctor.id,
          adminId: user?.id,
          action: action
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} admin`);
      }

      const removeMessages: Record<string, string> = {
        demote: `${doctor.name} has been demoted to doctor role.`,
        remove: `${doctor.name} has been removed from the platform.`,
      };
      setSuccessMessage(removeMessages[action]);
      setShowRemoveAdminModal(null);

      // Refresh list
      fetchAllDoctors();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || `Failed to ${action} admin`);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // Check admin access
  const isAdmin = user?.isAdmin || user?.role === 'admin';
  if (!isAdmin) {
    return null;
  }

  return (
    <div className={cx.page}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={cx.heading}>
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {label('pageTitle')}
        </h1>
        <p className={cx.subtitle}>
          Review and approve doctor registration requests
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-700">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-500 hover:text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className={cx.card}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cx.cardLabel}>Total Doctors</p>
              <p className="text-3xl font-bold text-indigo-600">{allDoctors.length}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className={cx.card}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cx.cardLabel}>Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className={cx.card}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cx.cardLabel}>Approved</p>
              <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className={cx.card}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cx.cardLabel}>Rejected</p>
              <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={cx.tableWrap}>
        <div className={cx.tableBorder}>
          <nav className="flex flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={getTabClass(activeTab, 'all')}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                All Doctors
                <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {allDoctors.length}
                </span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={getTabClass(activeTab, 'pending')}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending
                {pendingCount > 0 && (
                  <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={getTabClass(activeTab, 'approved')}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Approved
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {approvedCount}
                </span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={getTabClass(activeTab, 'rejected')}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Rejected
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {rejectedCount}
                </span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={getTabClass(activeTab, 'admins')}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                👑 Admins
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {adminCount}
                </span>
              </span>
            </button>
          </nav>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          )}
          {!loading && activeTab === 'pending' && (
            <PendingTabPanel
              doctors={filteredDoctors}
              processing={processing}
              formatDate={formatDate}
              onViewDetails={setSelectedDoctor}
              onReject={(d) => setShowConfirmModal({ action: 'reject', doctor: d })}
              onApprove={(d) => setShowConfirmModal({ action: 'approve', doctor: d })}
            />
          )}
          {!loading && (activeTab === 'all' || activeTab === 'approved' || activeTab === 'rejected') && (
            <DoctorsTabPanel
              doctors={filteredDoctors}
              processing={processing}
              currentUserId={user?.id}
              onViewDetails={setSelectedDoctor}
              onPromote={(d) => { setShowRoleModal(d); setNewRole('admin'); }}
              onDemote={(d) => { setShowRoleModal(d); setNewRole('doctor'); }}
              onReject={(d) => setShowConfirmModal({ action: 'reject', doctor: d })}
              onApprove={(d) => setShowConfirmModal({ action: 'approve', doctor: d })}
            />
          )}
          {!loading && activeTab === 'admins' && (
            <AdminsTabPanel
              doctors={filteredDoctors}
              processing={processing}
              currentUserId={user?.id}
              formatDate={formatDate}
              onViewDetails={setSelectedDoctor}
              onDemote={(d) => setShowRemoveAdminModal({ doctor: d, action: 'demote' })}
              onRemove={(d) => setShowRemoveAdminModal({ doctor: d, action: 'remove' })}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedDoctor && (
        <DoctorDetailsModal
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onApprove={(d) => { setShowConfirmModal({ action: 'approve', doctor: d }); setSelectedDoctor(null); }}
          onReject={(d) => { setShowConfirmModal({ action: 'reject', doctor: d }); setSelectedDoctor(null); }}
          formatDate={formatDate}
        />
      )}
      {showConfirmModal && (
        <ConfirmActionModal
          action={showConfirmModal.action}
          doctor={showConfirmModal.doctor}
          processing={processing !== null}
          onClose={() => setShowConfirmModal(null)}
          onConfirm={() => showConfirmModal.action === 'approve'
            ? handleApprove(showConfirmModal.doctor)
            : handleReject(showConfirmModal.doctor)
          }
        />
      )}
      {showRoleModal && (
        <RoleChangeModal
          doctor={showRoleModal}
          newRole={newRole}
          setNewRole={setNewRole}
          processing={processing !== null}
          onClose={() => { setShowRoleModal(null); setNewRole('doctor'); }}
          onConfirm={() => handleRoleChange(showRoleModal, newRole)}
        />
      )}
      {showRemoveAdminModal && (
        <RemoveAdminModal
          doctor={showRemoveAdminModal.doctor}
          action={showRemoveAdminModal.action}
          processing={processing !== null}
          onClose={() => setShowRemoveAdminModal(null)}
          onConfirm={() => handleRemoveAdmin(showRemoveAdminModal.doctor, showRemoveAdminModal.action)}
        />
      )}
    </div>
  );
};

export default AdminDoctorManagement;
