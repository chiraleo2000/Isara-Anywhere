/**
 * Admin Doctor Management Page
 * Allows admin to view all doctor accounts and manage their status
 * Now includes privilege/role management functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/common/AuthProvider';
import { useNavigate } from 'react-router-dom';

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

const AdminDoctorManagement: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [allDoctors, setAllDoctors] = useState<DoctorUser[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
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

  // Use environment variable for production deployments
  // Empty string for relative paths in Cloud Run (Nginx proxies /auth/ to auth server)
  const AUTH_API_URL = import.meta.env.VITE_AUTH_URL || '';

  // Check if user is admin - wait for auth loading to complete first
  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) {
      return;
    }
    
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    
    // Check admin access
    const isAdmin = user.isAdmin || user.role === 'admin';
    if (!isAdmin) {
      // Navigate back - non-admin users shouldn't access this page
      navigate(-1);
      return;
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Fetch all doctors
  const fetchAllDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${AUTH_API_URL}/admin/pending-doctors`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const data = await response.json();
      setAllDoctors(data.doctors || []);
      setApprovalHistory(data.history || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctor accounts');
      setAllDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllDoctors();
  }, [fetchAllDoctors]);

  // Handle approve doctor
  const handleApprove = async (doctor: DoctorUser) => {
    try {
      setProcessing(doctor.id);
      setError(null);

      const response = await fetch(`${AUTH_API_URL}/admin/approve-doctor`, {
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

      const response = await fetch(`${AUTH_API_URL}/admin/reject-doctor`, {
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

      const response = await fetch(`${AUTH_API_URL}/admin/update-role`, {
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
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'pending') return matchesSearch && doctor.approvalStatus === 'pending';
    if (activeTab === 'approved') return matchesSearch && doctor.approvalStatus === 'approved';
    if (activeTab === 'rejected') return matchesSearch && doctor.approvalStatus === 'rejected';
    if (activeTab === 'admins') return matchesSearch && (doctor.isAdmin || doctor.role === 'admin');
    return matchesSearch;
  });

  // Count by status
  const pendingCount = allDoctors.filter(d => d.approvalStatus === 'pending').length;
  const approvedCount = allDoctors.filter(d => d.approvalStatus === 'approved').length;
  const rejectedCount = allDoctors.filter(d => d.approvalStatus === 'rejected').length;
  const adminCount = allDoctors.filter(d => d.isAdmin || d.role === 'admin').length;

  // Handle admin removal/demotion
  const handleRemoveAdmin = async (doctor: DoctorUser, action: 'demote' | 'remove') => {
    try {
      setProcessing(doctor.id);
      setError(null);

      const response = await fetch(`${AUTH_API_URL}/admin/remove-admin`, {
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

      setSuccessMessage(
        action === 'demote' 
          ? `${doctor.name} has been demoted to doctor role.`
          : `${doctor.name} has been removed from the platform.`
      );
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
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Doctor Approval
        </h1>
        <p className="text-gray-600 mt-2">
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
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Doctors</p>
              <p className="text-3xl font-bold text-indigo-600">{allDoctors.length}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Approved</p>
              <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Rejected</p>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-yellow-500 text-yellow-600 bg-yellow-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'approved'
                  ? 'border-green-500 text-green-600 bg-green-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'rejected'
                  ? 'border-red-500 text-red-600 bg-red-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'admins'
                  ? 'border-purple-500 text-purple-600 bg-purple-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
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
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : activeTab === 'pending' ? (
            filteredDoctors.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
                <p className="text-gray-500">All doctor registrations have been processed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
                  >
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
                        <button
                          onClick={() => setSelectedDoctor(doctor)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => setShowConfirmModal({ action: 'reject', doctor })}
                          disabled={processing === doctor.id}
                          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => setShowConfirmModal({ action: 'approve', doctor })}
                          disabled={processing === doctor.id}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {processing === doctor.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Processing...
                            </>
                          ) : (
                            'Approve'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'all' || activeTab === 'approved' || activeTab === 'rejected' ? (
            /* All Doctors / Approved / Rejected Tabs - Show doctors with role management */
            filteredDoctors.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
                <p className="text-gray-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className={`border rounded-lg p-6 hover:shadow-md transition-shadow bg-white ${
                      doctor.isAdmin || doctor.role === 'admin' ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold ${
                          doctor.isAdmin || doctor.role === 'admin' 
                            ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
                            : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                        }`}>
                          {doctor.name?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">{doctor.name}</h3>
                            {/* Role Badge */}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              doctor.isAdmin || doctor.role === 'admin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {doctor.isAdmin || doctor.role === 'admin' ? '👑 Admin' : '🩺 Doctor'}
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              doctor.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                              doctor.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doctor.approvalStatus === 'approved' ? '✓ Approved' :
                               doctor.approvalStatus === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedDoctor(doctor)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          View Details
                        </button>
                        {/* Role Management Button - Only for approved doctors */}
                        {doctor.approvalStatus === 'approved' && (
                          <button
                            onClick={() => {
                              setShowRoleModal(doctor);
                              setNewRole(doctor.isAdmin || doctor.role === 'admin' ? 'doctor' : 'admin');
                            }}
                            disabled={processing === doctor.id || doctor.id === user?.id}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                              doctor.isAdmin || doctor.role === 'admin'
                                ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                                : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                            }`}
                            title={doctor.id === user?.id ? "Cannot change your own role" : "Change role"}
                          >
                            {doctor.isAdmin || doctor.role === 'admin' ? '⬇️ Demote to Doctor' : '⬆️ Promote to Admin'}
                          </button>
                        )}
                        {doctor.approvalStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => setShowConfirmModal({ action: 'reject', doctor })}
                              disabled={processing === doctor.id}
                              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setShowConfirmModal({ action: 'approve', doctor })}
                              disabled={processing === doctor.id}
                              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'admins' ? (
            /* Admins Tab - Show all admins with removal/demotion controls */
            filteredDoctors.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Admins Found</h3>
                <p className="text-gray-500">No users have been promoted to admin role yet.</p>
              </div>
            ) : (
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
                
                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="border border-purple-300 rounded-lg p-6 hover:shadow-md transition-shadow bg-purple-50/30"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                          {doctor.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">{doctor.name}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                              👑 Admin
                            </span>
                            {doctor.id === user?.id && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                You
                              </span>
                            )}
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
                            {doctor.lastLogin && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Last login: {formatDate(doctor.lastLogin)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedDoctor(doctor)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          View Details
                        </button>
                        {/* Admin Controls - Cannot modify yourself */}
                        {doctor.id !== user?.id && (
                          <>
                            <button
                              onClick={() => setShowRemoveAdminModal({ doctor, action: 'demote' })}
                              disabled={processing === doctor.id}
                              className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                            >
                              ⬇️ Demote to Doctor
                            </button>
                            <button
                              onClick={() => setShowRemoveAdminModal({ doctor, action: 'remove' })}
                              disabled={processing === doctor.id}
                              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              🗑️ Remove from Platform
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Default / History Tab */
            approvalHistory.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Approval History</h3>
                <p className="text-gray-500">No doctor registrations have been processed yet.</p>
              </div>
            ) : (
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
                    {approvalHistory.map((item, index) => (
                      <tr key={index}>
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.approvalStatus === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.approvalStatus === 'approved' ? '✓ Approved' : '✕ Rejected'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.processedBy}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.processedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Doctor Details Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Doctor Details</h2>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedDoctor.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedDoctor.name}</h3>
                  <p className="text-gray-600">{selectedDoctor.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Specialty</label>
                  <p className="font-medium">{selectedDoctor.specialty || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Medical License</label>
                  <p className="font-medium">{selectedDoctor.medicalLicenseNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-medium">{selectedDoctor.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Registered On</label>
                  <p className="font-medium">{formatDate(selectedDoctor.createdAt)}</p>
                </div>
                {selectedDoctor.experience && (
                  <div>
                    <label className="text-sm text-gray-500">Experience</label>
                    <p className="font-medium">{selectedDoctor.experience}</p>
                  </div>
                )}
                {selectedDoctor.hospital && (
                  <div>
                    <label className="text-sm text-gray-500">Hospital/Clinic</label>
                    <p className="font-medium">{selectedDoctor.hospital}</p>
                  </div>
                )}
              </div>

              {selectedDoctor.qualifications && selectedDoctor.qualifications.length > 0 && (
                <div className="mt-6">
                  <label className="text-sm text-gray-500">Qualifications</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDoctor.qualifications.map((qual, idx) => (
                      <span key={idx} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                        {qual}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedDoctor(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal({ action: 'reject', doctor: selectedDoctor });
                  setSelectedDoctor(null);
                }}
                className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal({ action: 'approve', doctor: selectedDoctor });
                  setSelectedDoctor(null);
                }}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                showConfirmModal.action === 'approve' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {showConfirmModal.action === 'approve' ? (
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                {showConfirmModal.action === 'approve' ? 'Approve Doctor?' : 'Reject Doctor?'}
              </h3>
              <p className="text-center text-gray-600">
                {showConfirmModal.action === 'approve'
                  ? `Are you sure you want to approve ${showConfirmModal.doctor.name}? They will receive an email notification and can start using the platform.`
                  : `Are you sure you want to reject ${showConfirmModal.doctor.name}? They will be notified of this decision.`
                }
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={processing !== null}
              >
                Cancel
              </button>
              <button
                onClick={() => showConfirmModal.action === 'approve'
                  ? handleApprove(showConfirmModal.doctor)
                  : handleReject(showConfirmModal.doctor)
                }
                disabled={processing !== null}
                className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                  showConfirmModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {processing !== null ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  showConfirmModal.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                newRole === 'admin' ? 'bg-purple-100' : 'bg-orange-100'
              }`}>
                {newRole === 'admin' ? (
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                {newRole === 'admin' ? 'Promote to Admin?' : 'Demote to Doctor?'}
              </h3>
              <p className="text-center text-gray-600">
                {newRole === 'admin'
                  ? `Are you sure you want to promote ${showRoleModal.name} to Admin? They will gain access to administrative functions including doctor approval and appointment management.`
                  : `Are you sure you want to demote ${showRoleModal.name} to regular Doctor? They will lose access to administrative functions.`
                }
              </p>
              
              {/* Role Selection */}
              <div className="mt-6 space-y-3">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value="doctor"
                    checked={newRole === 'doctor'}
                    onChange={() => setNewRole('doctor')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">🩺 Doctor</span>
                    <p className="text-sm text-gray-500">Standard doctor privileges - patient care, appointments, EMR access</p>
                  </div>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={newRole === 'admin'}
                    onChange={() => setNewRole('admin')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">👑 Admin</span>
                    <p className="text-sm text-gray-500">Full administrative access - doctor approval, appointment pool, user management</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(null);
                  setNewRole('doctor');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={processing !== null}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRoleChange(showRoleModal, newRole)}
                disabled={processing !== null}
                className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                  newRole === 'admin'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                } disabled:opacity-50`}
              >
                {processing !== null ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  newRole === 'admin' ? '⬆️ Promote to Admin' : '⬇️ Demote to Doctor'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Removal/Demotion Modal */}
      {showRemoveAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                showRemoveAdminModal.action === 'remove' ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                {showRemoveAdminModal.action === 'remove' ? (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                {showRemoveAdminModal.action === 'remove' ? '🗑️ Remove Admin from Platform?' : '⬇️ Demote Admin to Doctor?'}
              </h3>
              <p className="text-center text-gray-600 mb-4">
                {showRemoveAdminModal.action === 'remove'
                  ? `Are you sure you want to completely remove ${showRemoveAdminModal.doctor.name} from the platform? Their account will be deactivated and they will not be able to access the system.`
                  : `Are you sure you want to demote ${showRemoveAdminModal.doctor.name} from Admin to Doctor? They will lose all administrative privileges but can still access doctor functions.`
                }
              </p>
              
              {/* Warning Box */}
              <div className={`p-4 rounded-lg ${
                showRemoveAdminModal.action === 'remove' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
              }`}>
                <div className="flex items-start gap-2">
                  <svg className={`w-5 h-5 mt-0.5 ${showRemoveAdminModal.action === 'remove' ? 'text-red-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className={`text-sm ${showRemoveAdminModal.action === 'remove' ? 'text-red-700' : 'text-orange-700'}`}>
                    {showRemoveAdminModal.action === 'remove'
                      ? 'This action will deactivate the account. The user will need to contact support to regain access.'
                      : 'This action can be reversed by promoting them back to admin from the admin management page.'
                    }
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowRemoveAdminModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={processing !== null}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveAdmin(showRemoveAdminModal.doctor, showRemoveAdminModal.action)}
                disabled={processing !== null}
                className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                  showRemoveAdminModal.action === 'remove'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                } disabled:opacity-50`}
              >
                {processing !== null ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  showRemoveAdminModal.action === 'remove' ? '🗑️ Remove from Platform' : '⬇️ Demote to Doctor'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctorManagement;
