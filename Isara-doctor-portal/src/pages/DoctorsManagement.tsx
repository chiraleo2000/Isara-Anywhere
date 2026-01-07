/**
 * Doctors Management Page - List and manage all doctors in the system
 * For administrator doctors to manage doctor accounts
 */

import React, { useState, useEffect } from 'react';
import { fetchAllDoctors } from '../services/gcsDataService';
import {
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  SearchIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '../assets/NewSvgIcons';

// ============================================================================
// INTERFACES
// ============================================================================

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  hospital: string;
  phone: string;
  email: string;
  photo: string;
  licenseNumber: string;
  status: 'active' | 'inactive' | 'on-leave';
  joinDate: string;
  languages: string[];
  experience: number;
  patientsHandled: number;
  isVerified: boolean;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockDoctors: Doctor[] = [
  {
    id: 'doc-001',
    name: 'Dr. Apirak Chaiyasit',
    specialty: 'General Practice',
    department: 'Primary Care',
    hospital: 'Izara Health Center',
    phone: '+66-2-xxx-1111',
    email: 'apirak.c@izara.health',
    photo: 'https://i.pravatar.cc/150?img=68',
    licenseNumber: 'TH-12345',
    status: 'active',
    joinDate: '2023-01-15',
    languages: ['Thai', 'English'],
    experience: 8,
    patientsHandled: 1250,
    isVerified: true,
  },
  {
    id: 'doc-002',
    name: 'Dr. Malee Srisombat',
    specialty: 'Internal Medicine',
    department: 'Internal Medicine',
    hospital: 'Izara Health Center',
    phone: '+66-2-xxx-2222',
    email: 'malee.s@izara.health',
    photo: 'https://i.pravatar.cc/150?img=45',
    licenseNumber: 'TH-23456',
    status: 'active',
    joinDate: '2022-06-20',
    languages: ['Thai', 'English', 'Chinese'],
    experience: 12,
    patientsHandled: 2100,
    isVerified: true,
  },
  {
    id: 'doc-003',
    name: 'Dr. Thanakorn Wongprasert',
    specialty: 'Pediatrics',
    department: 'Pediatrics',
    hospital: 'Izara Health Center',
    phone: '+66-2-xxx-3333',
    email: 'thanakorn.w@izara.health',
    photo: 'https://i.pravatar.cc/150?img=52',
    licenseNumber: 'TH-34567',
    status: 'on-leave',
    joinDate: '2021-03-10',
    languages: ['Thai', 'English'],
    experience: 15,
    patientsHandled: 3400,
    isVerified: true,
  },
  {
    id: 'doc-004',
    name: 'Dr. Siriwan Tangsri',
    specialty: 'Family Medicine',
    department: 'Family Care',
    hospital: 'Izara Health Center',
    phone: '+66-2-xxx-4444',
    email: 'siriwan.t@izara.health',
    photo: 'https://i.pravatar.cc/150?img=39',
    licenseNumber: 'TH-45678',
    status: 'active',
    joinDate: '2024-02-01',
    languages: ['Thai', 'English'],
    experience: 5,
    patientsHandled: 450,
    isVerified: true,
  },
  {
    id: 'doc-005',
    name: 'Dr. Pattarapong Meesuk',
    specialty: 'Emergency Medicine',
    department: 'Emergency',
    hospital: 'Izara Health Center',
    phone: '+66-2-xxx-5555',
    email: 'pattarapong.m@izara.health',
    photo: 'https://i.pravatar.cc/150?img=59',
    licenseNumber: 'TH-56789',
    status: 'inactive',
    joinDate: '2020-08-15',
    languages: ['Thai', 'English'],
    experience: 10,
    patientsHandled: 5600,
    isVerified: false,
  },
  {
    id: 'doc-006',
    name: 'Dr. Kanya Rattanaporn',
    specialty: 'Obstetrics & Gynecology',
    department: 'OB-GYN',
    hospital: 'Izara Health Center',
    phone: '+66-2-xxx-6666',
    email: 'kanya.r@izara.health',
    photo: 'https://i.pravatar.cc/150?img=12',
    licenseNumber: 'TH-67890',
    status: 'active',
    joinDate: '2024-03-12',
    languages: ['Thai', 'English'],
    experience: 9,
    patientsHandled: 1900,
    isVerified: true,
  },
];

const departments = [
  'All Departments',
  'Primary Care',
  'Internal Medicine',
  'Pediatrics',
  'Family Care',
  'Emergency',
  'Surgery',
  'OB-GYN',
];

const specialties = [
  'General Practice',
  'Internal Medicine',
  'Pediatrics',
  'Family Medicine',
  'Emergency Medicine',
  'Surgery',
  'Obstetrics & Gynecology',
  'Psychiatry',
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DoctorsManagement: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>(mockDoctors);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on-leave'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for adding new doctor
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    department: '',
    phone: '',
    email: '',
    licenseNumber: '',
    languages: '',
    experience: '',
  });

  // Load from shared GCS so admin and doctor tabs stay in sync
  useEffect(() => {
    (async () => {
      try {
        const loaded = await fetchAllDoctors();
        if (Array.isArray(loaded) && loaded.length > 0) {
          const normalized = loaded.map((d: any, idx: number) => ({
            id: d.id || `doc-${idx + 1}`,
            name: d.name || d.fullName || 'Unknown Doctor',
            specialty: d.specialty || d.department || 'General Practice',
            department: d.department || 'Primary Care',
            hospital: d.hospital || 'Izara Health Center',
            phone: d.phone || d.contact?.phone || '',
            email: d.email || d.contact?.email || '',
            photo: d.photo || d.avatarUrl || `https://i.pravatar.cc/150?u=${d.id || idx}`,
            licenseNumber: d.medicalLicenseNumber || d.licenseNumber || 'N/A',
            status: d.status || (d.isActive === false ? 'inactive' : 'active'),
            joinDate: d.joinDate || new Date().toISOString().split('T')[0],
            languages: d.languages || ['Thai'],
            experience: d.experience || 0,
            patientsHandled: d.patientsHandled || 0,
            isVerified: d.isVerified ?? d.approvalStatus === 'approved',
          })) as Doctor[];
          setDoctors(normalized);
        }
      } catch (err) {
        console.error('Failed to load doctors from GCS, using mock data', err);
        setDoctors(mockDoctors);
      }
    })();
  }, []);

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      selectedDepartment === 'All Departments' || doctor.department === selectedDepartment;
    const matchesStatus = statusFilter === 'all' || doctor.status === statusFilter;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const handleAddDoctor = () => {
    if (!newDoctor.name || !newDoctor.specialty || !newDoctor.email || !newDoctor.licenseNumber) {
      alert('Please fill in required fields');
      return;
    }

    const doctor: Doctor = {
      id: `doc-${Date.now()}`,
      name: newDoctor.name,
      specialty: newDoctor.specialty,
      department: newDoctor.department || 'Primary Care',
      hospital: 'Izara Health Center',
      phone: newDoctor.phone,
      email: newDoctor.email,
      photo: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
      licenseNumber: newDoctor.licenseNumber,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      languages: newDoctor.languages.split(',').map((l) => l.trim()),
      experience: parseInt(newDoctor.experience) || 0,
      patientsHandled: 0,
      isVerified: false,
    };

    setDoctors([...doctors, doctor]);
    setShowAddModal(false);
    setNewDoctor({
      name: '',
      specialty: '',
      department: '',
      phone: '',
      email: '',
      licenseNumber: '',
      languages: '',
      experience: '',
    });
  };

  // API URL for backend operations
  const AUTH_API_URL = import.meta.env.VITE_AUTH_URL || '';

  const handleVerifyDoctor = async (doctorId: string) => {
    try {
      // Update in GCS via auth API
      const response = await fetch(`${AUTH_API_URL}/admin/update-doctor-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: doctorId,
          updates: { isVerified: true }
        })
      });
      
      if (response.ok) {
        setDoctors(
          doctors.map((doc) =>
            doc.id === doctorId ? { ...doc, isVerified: true } : doc
          )
        );
      }
    } catch (err) {
      console.error('Failed to verify doctor:', err);
      // Still update UI for better UX
      setDoctors(
        doctors.map((doc) =>
          doc.id === doctorId ? { ...doc, isVerified: true } : doc
        )
      );
    }
  };

  // Toggle status - IMPORTANT: preserve isVerified status
  const handleToggleStatus = async (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor) return;
    
    const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
    
    try {
      // Update in GCS via auth API - preserve isVerified!
      const response = await fetch(`${AUTH_API_URL}/admin/update-doctor-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: doctorId,
          updates: { 
            isActive: newStatus === 'active',
            status: newStatus,
            // Explicitly preserve verified status - DO NOT RESET
            isVerified: doctor.isVerified 
          }
        })
      });
      
      if (response.ok) {
        setDoctors(
          doctors.map((doc) =>
            doc.id === doctorId
              ? { ...doc, status: newStatus, isVerified: doc.isVerified } // Preserve isVerified
              : doc
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle doctor status:', err);
      // Still update UI
      setDoctors(
        doctors.map((doc) =>
          doc.id === doctorId
            ? { ...doc, status: newStatus, isVerified: doc.isVerified }
            : doc
        )
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-red-100 text-red-700';
      case 'on-leave':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserGroupIcon className="w-8 h-8 text-emerald-600" />
            Doctors Management
          </h1>
          <p className="text-gray-600 mt-1">Manage all doctors in the system</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Doctor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="text-3xl font-bold text-emerald-600">{doctors.length}</div>
          <div className="text-sm text-gray-600">Total Doctors</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="text-3xl font-bold text-green-600">
            {doctors.filter((d) => d.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="text-3xl font-bold text-yellow-600">
            {doctors.filter((d) => d.status === 'on-leave').length}
          </div>
          <div className="text-sm text-gray-600">On Leave</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="text-3xl font-bold text-blue-600">
            {doctors.filter((d) => d.isVerified).length}
          </div>
          <div className="text-sm text-gray-600">Verified</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, specialty, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on-leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* Doctors Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  License
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={doctor.photo}
                        alt={doctor.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{doctor.name}</span>
                          {doctor.isVerified && (
                            <CheckCircleIcon className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{doctor.specialty}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{doctor.department}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{doctor.licenseNumber}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        doctor.status
                      )}`}
                    >
                      {doctor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {doctor.patientsHandled.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => (window.location.href = `mailto:${doctor.email}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Send Email"
                      >
                        <EnvelopeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => (window.location.href = `tel:${doctor.phone}`)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Call"
                      >
                        <PhoneIcon className="w-4 h-4" />
                      </button>
                      {!doctor.isVerified && (
                        <button
                          onClick={() => handleVerifyDoctor(doctor.id)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleStatus(doctor.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          doctor.status === 'active'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {doctor.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDoctors.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg mt-4">
          <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No doctors found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add New Doctor</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Dr. Name Surname"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialty *
                    </label>
                    <select
                      value={newDoctor.specialty}
                      onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Specialty</option>
                      {specialties.map((specialty) => (
                        <option key={specialty} value={specialty}>
                          {specialty}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={newDoctor.department}
                      onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Department</option>
                      {departments.slice(1).map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical License Number *
                  </label>
                  <input
                    type="text"
                    value={newDoctor.licenseNumber}
                    onChange={(e) => setNewDoctor({ ...newDoctor, licenseNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="TH-XXXXX"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newDoctor.phone}
                      onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="+66-xxx-xxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newDoctor.email}
                      onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="doctor@izara.health"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Languages (comma separated)
                    </label>
                    <input
                      type="text"
                      value={newDoctor.languages}
                      onChange={(e) => setNewDoctor({ ...newDoctor, languages: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Thai, English"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={newDoctor.experience}
                      onChange={(e) => setNewDoctor({ ...newDoctor, experience: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddDoctor}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Add Doctor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsManagement;
