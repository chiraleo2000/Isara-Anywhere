/**
 * Doctor Portal - Main doctor application with nested routing
 */
import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../components/common/AuthProvider';
import { useSettings } from '../hooks/useSettings';
import { PatientRecord, UserPreferences } from '../types';
import { patientDataService } from '../services/patientDataService';

// Components
import { ResponsiveLayout } from '../components/common/ResponsiveLayout';
import DoctorDashboard from './DoctorDashboard';
import PatientManagement from './PatientManagement';
import CompleteSchedule from './CompleteSchedule';
import CompleteEMREditor from '../components/CompleteEMREditor';
import CompletePrescribing from '../components/CompletePrescribing';
import CompleteLabOrders from '../components/CompleteLabOrders';
import GeminiAIStudio from './GeminiAIStudio';
import VirtualMeeting from './VirtualMeeting';
import { PatientRecordViewer } from '../components/PatientRecordViewer';
import ClinicalResources from './ClinicalResources';
import TestHarness from '../components/TestHarness';
// New Pages
import MedicalConsultants from './MedicalConsultants';
import DoctorsManagement from './DoctorsManagement';
import MedicalContent from './MedicalContent';
import HealthMeeting from './HealthMeeting';
import AdminDoctorManagement from './AdminDoctorManagement';
import AdminAppointmentManagement from './AdminAppointmentManagement';
import DoctorProfilePage from './DoctorProfilePage';
// DoctorAvailabilitySettings removed as per requirements

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  language: 'th',
  notifications: { email: true, push: true, sms: false },
};

const DoctorPortal: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, logout, loading } = useAuth();
  useSettings(); // maintain hook call order
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [showEMREditor, setShowEMREditor] = useState(false);
  const [showPrescribing, setShowPrescribing] = useState(false);
  const [showAIStudio, setShowAIStudio] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [showLabOrders, setShowLabOrders] = useState(false);
  const [showPatientRecord, setShowPatientRecord] = useState(false);

  // Verify user access - allow doctors and admins
  useEffect(() => {
    const isUnauthorized = !loading && (!user || user?.id !== userId || (user?.role !== 'doctor' && user?.role !== 'admin'));
    if (isUnauthorized) {
      console.warn('Unauthorized access to doctor portal');
      navigate('/login', { replace: true });
    }
  }, [user, userId, loading, navigate]);

  useEffect(() => {
    if (user && (user.role === 'doctor' || user.role === 'admin')) {
      loadPatients();
    }
  }, [user]);

  const loadPatients = async () => {
    try {
      const data = await patientDataService.getAllPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const handleNavigate = (view: string) => {
    navigate(`/doctor/${userId}/${view}`);
  };

  const getCurrentView = () => {
    const path = globalThis.location.pathname;
    if (path.includes('/schedule')) return 'schedule';
    if (path.includes('/patients')) return 'patients';
    if (path.includes('/medical-consultants')) return 'medical-consultants';
    if (path.includes('/doctors')) return 'doctors';
    if (path.includes('/medical-content')) return 'medical-content';
    if (path.includes('/health-meeting')) return 'health-meeting';
    if (path.includes('/clinical-resources')) return 'clinical-resources';
    if (path.includes('/doctor-management')) return 'doctor-management';
    if (path.includes('/appointment-management')) return 'appointment-management';
    if (path.includes('/profile')) return 'profile';
    return 'dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'doctor' && user.role !== 'admin')) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ResponsiveLayout
      user={user}
      currentView={getCurrentView()}
      onNavigate={handleNavigate}
      onLogout={logout}
    >
      <Routes>
        <Route path="dashboard" element={
          <DoctorDashboard
            doctor={user}
            onStartConsultation={() => setShowMeeting(true)}
            onViewPatient={(patientId) => {
              const patient = patients.find(p => p.id === patientId);
              if (patient) {
                setSelectedPatient(patient);
                navigate(`/doctor/${userId}/patients/${patientId}`);
              }
            }}
            onCreatePrescription={() => setShowPrescribing(true)}
            onOrderLab={() => setShowLabOrders(true)}
          />
        } />

        <Route path="schedule" element={<CompleteSchedule doctor={user} />} />
        
        <Route path="patients" element={
          <PatientManagement
            doctor={user}
            onSelectPatient={(patient) => {
              setSelectedPatient(patient);
              navigate(`/doctor/${userId}/patients/${patient.id}`);
            }}
            onCreateEMR={(patientId) => {
              if (patientId) {
                const patient = patients.find(p => p.id === patientId);
                if (patient) setSelectedPatient(patient);
              }
              setShowEMREditor(true);
            }}
            onCreatePrescription={(patientId) => {
              if (patientId) {
                const patient = patients.find(p => p.id === patientId);
                if (patient) setSelectedPatient(patient);
              }
              setShowPrescribing(true);
            }}
          />
        } />

        <Route path="patients/:patientId" element={
          <PatientDetailView
            patients={patients}
            selectedPatient={selectedPatient}
            setSelectedPatient={setSelectedPatient}
            onBack={() => navigate(`/doctor/${userId}/patients`)}
            onShowPatientRecord={() => setShowPatientRecord(true)}
            onCreateEMR={() => setShowEMREditor(true)}
            onCreatePrescription={() => setShowPrescribing(true)}
            onOrderLab={() => setShowLabOrders(true)}
            onStartConsultation={() => setShowMeeting(true)}
          />
        } />

        {/* New Routes - Medical Consultants, Doctors, Medical Content, Health Meeting (Combined with Queue) */}
        <Route path="medical-consultants" element={<MedicalConsultants />} />
        <Route path="doctors" element={<DoctorsManagement />} />
        <Route path="medical-content" element={<MedicalContent />} />
        <Route path="health-meeting" element={<HealthMeeting doctor={user} />} />

        {/* Admin Only Routes */}
        {(user.isAdmin || user.role === 'admin') && (
          <Route path="doctor-management" element={<AdminDoctorManagement />} />
        )}
        {(user.isAdmin || user.role === 'admin') && (
          <Route path="appointment-management" element={<AdminAppointmentManagement />} />
        )}

        {/* Doctor Availability Settings - REMOVED as per requirements */}

        <Route path="clinical-resources" element={<ClinicalResources />} />
        <Route path="profile" element={<DoctorProfilePage onBack={() => navigate(`/doctor/${userId}/dashboard`)} />} />
        <Route path="test-ui" element={<TestHarness doctor={user} patients={patients} />} />

        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>

      {/* Modals */}
      {showEMREditor && selectedPatient && (
        <CompleteEMREditor
          patient={selectedPatient}
          doctor={user}
          existingEMR={null}
          onSave={async () => {
            setShowEMREditor(false);
            await loadPatients();
          }}
          onClose={() => setShowEMREditor(false)}
        />
      )}

      {showPrescribing && selectedPatient && (
        <CompletePrescribing
          patient={selectedPatient}
          doctor={user}
          onClose={() => setShowPrescribing(false)}
        />
      )}

      {showLabOrders && (
        <CompleteLabOrders
          doctor={user}
          patient={selectedPatient}
          onClose={() => setShowLabOrders(false)}
        />
      )}

      {showAIStudio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-purple-600">Gemini AI Studio</h2>
              <button onClick={() => setShowAIStudio(false)} className="text-gray-400 hover:text-gray-600 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              <GeminiAIStudio />
            </div>
          </div>
        </div>
      )}

      {showMeeting && selectedPatient && (
        <VirtualMeeting
          appointment={{
            id: `APT-${Date.now()}`,
            user: {
              id: selectedPatient.id,
              email: selectedPatient.contact?.email || '',
              name: selectedPatient.demographics?.name || 'Patient',
              role: 'doctor',
              doctorId: user.id,
              medicalLicenseNumber: user.medicalLicenseNumber || '',
              isActive: true,
              emailVerified: true,
              preferences: DEFAULT_PREFERENCES,
            },
            patientId: selectedPatient.id,
            date: new Date(),
            type: 'Telehealth' as any,
            status: 'InProgress' as any,
            symptoms: [],
            notes: '',
          }}
          onClose={() => setShowMeeting(false)}
          onMeetingEnd={async () => {
            setShowMeeting(false);
            await loadPatients();
          }}
        />
      )}

      {showPatientRecord && selectedPatient && (
        <PatientRecordViewer
          patient={selectedPatient}
          onClose={() => setShowPatientRecord(false)}
        />
      )}

      {/* AI Assistant FAB */}
      <button
        onClick={() => setShowAIStudio(true)}
        className="fixed bottom-24 right-6 lg:bottom-6 lg:right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40"
        title="AI Assistant"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
        </svg>
      </button>
    </ResponsiveLayout>
  );
};

// Patient Detail View Component
interface PatientDetailViewProps {
  patients: PatientRecord[];
  selectedPatient: PatientRecord | null;
  setSelectedPatient: (patient: PatientRecord | null) => void;
  onBack: () => void;
  onShowPatientRecord: () => void;
  onCreateEMR: () => void;
  onCreatePrescription: () => void;
  onOrderLab: () => void;
  onStartConsultation: () => void;
}

const PatientDetailView: React.FC<PatientDetailViewProps> = ({
  patients,
  selectedPatient,
  setSelectedPatient,
  onBack,
  onShowPatientRecord,
  onCreateEMR,
  onCreatePrescription,
  onOrderLab,
  onStartConsultation,
}) => {
  const { patientId } = useParams<{ patientId: string }>();

  useEffect(() => {
    if (patientId && selectedPatient?.id !== patientId) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [patientId, patients, selectedPatient, setSelectedPatient]);

  if (!selectedPatient) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Loading patient...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 text-emerald-600 hover:text-emerald-700 font-medium flex items-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Patient List</span>
      </button>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-start space-x-4 mb-6">
          <img
            src={selectedPatient.demographics?.photo || 'https://i.pravatar.cc/150'}
            alt={selectedPatient.demographics?.name}
            className="w-20 h-20 rounded-full object-cover"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedPatient.demographics?.name || 'Unknown Patient'}
            </h2>
            <p className="text-gray-600">
              {selectedPatient.demographics?.age || '-'} years • {selectedPatient.demographics?.gender || '-'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ID: {selectedPatient.demographics?.idNumber || selectedPatient.id}
            </p>
            {selectedPatient.medicalInfo?.chronicConditions?.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">Chronic Conditions:</p>
                <p className="text-sm text-gray-600">
                  {selectedPatient.medicalInfo.chronicConditions.join(', ')}
                </p>
              </div>
            )}
            {selectedPatient.medicalInfo?.allergies?.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-700">Allergies:</p>
                <p className="text-sm text-red-600">
                  {selectedPatient.medicalInfo.allergies.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={onShowPatientRecord}
            className="py-3 px-4 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm"
          >
            View Record
          </button>
          <button
            onClick={onCreateEMR}
            className="py-3 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm"
          >
            Create EMR
          </button>
          <button
            onClick={onCreatePrescription}
            className="py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Prescribe
          </button>
          <button
            onClick={onOrderLab}
            className="py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
          >
            Order Lab
          </button>
          <button
            onClick={onStartConsultation}
            className="py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
          >
            Start Consult
          </button>
        </div>
      </div>
    </div>
  );
};

// Lab & Imaging Page Component
interface LabImagingPageProps {
  doctor: any;
  patients: PatientRecord[];
  selectedPatient: PatientRecord | null;
  setSelectedPatient: (patient: PatientRecord | null) => void;
  onOrderLab: () => void;
}

// Lab status badge class mapping (SonarQube S3358)
const labStatusClasses: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
};
const getLabStatusClass = (status: string) => labStatusClasses[status] || 'bg-yellow-100 text-yellow-700';

const LabImagingPage: React.FC<LabImagingPageProps> = ({
  doctor,
  patients,
  selectedPatient,
  setSelectedPatient,
  onOrderLab,
}) => {
  const [labResults, setLabResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'patients' | 'results' | 'orders'>('patients');

  useEffect(() => {
    if (selectedPatient) {
      loadLabResults(selectedPatient.id);
    }
  }, [selectedPatient]);

  const loadLabResults = async (patientId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/storage/lab-orders/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setLabResults(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading lab results:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🧪 Lab & Imaging</h1>
            <p className="text-sm text-gray-600 mt-1">View lab results and order new tests</p>
          </div>
          <button
            onClick={onOrderLab}
            disabled={!selectedPatient}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + New Lab Order
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'patients'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            👥 Select Patient
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'results'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Lab Results {selectedPatient ? `(${labResults.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📝 Pending Orders
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'patients' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Patient to View Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatient(patient);
                    setActiveTab('results');
                  }}
                  className={`p-4 text-left rounded-lg border-2 transition-all ${
                    selectedPatient?.id === patient.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={patient.demographics?.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(patient.id)}`}
                      alt={patient.demographics?.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{patient.demographics?.name}</h3>
                      <p className="text-sm text-gray-600">
                        {patient.demographics?.age} ปี • {patient.demographics?.gender}
                      </p>
                      <p className="text-xs text-gray-500">ID: {patient.id}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="max-w-4xl mx-auto">
            {selectedPatient ? (
              <>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedPatient.demographics?.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedPatient.id)}`}
                      alt={selectedPatient.demographics?.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold text-purple-900">{selectedPatient.demographics?.name}</h3>
                      <p className="text-sm text-purple-700">
                        {selectedPatient.demographics?.age} ปี • ID: {selectedPatient.id}
                      </p>
                    </div>
                  </div>
                </div>

                {(() => {
                  if (loading) {
                    return (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading lab results...</p>
                      </div>
                    );
                  }
                  if (labResults.length > 0) {
                    return (
                  <div className="space-y-4">
                    {labResults.map((lab) => (
                      <div key={lab.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{lab.testCategory}</h4>
                            <p className="text-sm text-gray-600">
                              Ordered: {new Date(lab.orderDate).toLocaleDateString('th-TH')}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLabStatusClass(lab.status)}`}>
                            {lab.status}
                          </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left p-2">Test</th>
                                <th className="text-left p-2">Result</th>
                                <th className="text-left p-2">Reference</th>
                                <th className="text-left p-2">Flag</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lab.tests?.map((test: any, i: number) => (
                                <tr key={`${lab.id}-${test.name || i}-${test.code || ''}`} className={test.abnormalFlag ? 'bg-red-50' : ''}>
                                  <td className="p-2">{test.name}</td>
                                  <td className="p-2 font-medium">{test.result} {test.unit}</td>
                                  <td className="p-2 text-gray-500">{test.referenceRange}</td>
                                  <td className="p-2">
                                    {test.abnormalFlag && (
                                      <span className="text-red-600 font-bold">{test.abnormalFlag}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {lab.interpretation && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <p className="text-sm"><strong>Interpretation:</strong> {lab.interpretation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                    );
                  }
                  return (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <div className="text-6xl mb-4">🧪</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Lab Results</h3>
                    <p className="text-gray-600 mb-4">No laboratory results found for this patient</p>
                    <button
                      onClick={onOrderLab}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Order Lab Tests
                    </button>
                  </div>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Patient</h3>
                <p className="text-gray-600">Choose a patient from the list to view their lab results</p>
                <button
                  onClick={() => setActiveTab('patients')}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Select Patient
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pending Lab Orders</h3>
              <p className="text-gray-600 mb-4">View and manage pending laboratory orders</p>
              <p className="text-sm text-gray-500">Coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorPortal;
