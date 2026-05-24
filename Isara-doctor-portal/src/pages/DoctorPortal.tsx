/**
 * Doctor Portal - Main doctor application with nested routing
 */
import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../components/common/AuthProvider';
import { useSettings } from '../hooks/useSettings';
import { PatientRecord } from '../types';
import { patientDataService } from '../services/patientDataService';

// Components
import { ResponsiveLayout } from '../components/common/ResponsiveLayout';
import DoctorDashboard from './DoctorDashboard';
import PatientManagement from './patients/PatientManagement';
import CompleteSchedule from './schedule/CompleteSchedule';
import CompleteEMREditor from '../components/CompleteEMREditor';
import CompletePrescribing from '../components/CompletePrescribing';
import CompleteLabOrders from '../components/CompleteLabOrders';
import GeminiAIStudio from './GeminiAIStudio';
import VirtualMeeting from './meetings/VirtualMeeting';
import { PatientRecordViewer } from '../components/PatientRecordViewer';
import ClinicalResources from './content/ClinicalResources';
import TestHarness from '../components/TestHarness';
// New Pages
import MedicalConsultants from './content/MedicalConsultants';
import DoctorsManagement from './content/DoctorsManagement';
import MedicalContent from './content/MedicalContent';
import HealthMeeting from './meetings/HealthMeeting';
import MeetingRoom from './meetings/MeetingRoom';
import MeetingResultsPage from './meetings/MeetingResultsPage';
import AdminDoctorManagement from './admin/AdminDoctorManagement';
import AdminAppointmentManagement from './admin/AdminAppointmentManagement';
import AppointmentPoolManagement from './admin/AppointmentPoolManagement';
import DoctorProfilePage from './DoctorProfilePage';
// DoctorAvailabilitySettings removed as per requirements

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
    if (path.includes('/appointment-pool')) return 'appointment-pool';
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

        {/* New Routes - Doctors, Medical Content, Health Meeting (Combined with Queue) */}
        {/* Phase 1: Medical Consultants route disabled — to be rebuilt in Phase 2. */}
        <Route path="medical-consultants" element={<Navigate to={`/doctor/${userId}/dashboard`} replace />} />
        <Route path="doctors" element={<DoctorsManagement />} />
        <Route path="medical-content" element={<MedicalContent />} />
        <Route path="health-meeting" element={<HealthMeeting doctor={user} />} />
        <Route path="appointment-pool" element={<AppointmentPoolManagement />} />
        <Route path="meeting/:appointmentId" element={<MeetingRoom />} />
        <Route path="meeting/:appointmentId/results" element={<MeetingResultsPage />} />
        <Route path="virtual-meeting/:appointmentId" element={<VirtualMeeting />} />

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

        {/* Short aliases for convenience */}
        <Route path="content" element={<Navigate to={`/doctor/${userId}/medical-content`} replace />} />
        <Route path="resources" element={<Navigate to={`/doctor/${userId}/clinical-resources`} replace />} />
        {/* Phase 1: Medical Consultants disabled — alias also redirects to dashboard. */}
        <Route path="consultants" element={<Navigate to={`/doctor/${userId}/dashboard`} replace />} />
        <Route path="ai-studio" element={<Navigate to={`/doctor/${userId}/dashboard`} replace />} />

        {/* Admin short aliases */}
        <Route path="admin/doctors" element={<Navigate to={`/doctor/${userId}/doctor-management`} replace />} />
        <Route path="admin/directory" element={<Navigate to={`/doctor/${userId}/doctors`} replace />} />
        <Route path="admin/pool" element={<Navigate to={`/doctor/${userId}/appointment-pool`} replace />} />
        <Route path="admin/appointments" element={<Navigate to={`/doctor/${userId}/appointment-management`} replace />} />

        {/* Catch-all: use ABSOLUTE path to prevent infinite /dashboard append loop */}
        <Route path="*" element={<Navigate to={`/doctor/${userId}/dashboard`} replace />} />
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
              <button onClick={() => setShowAIStudio(false)} className="text-gray-400 hover:text-gray-600 p-2" title="ปิด AI Studio" aria-label="ปิด AI Studio">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <GeminiAIStudio />
            </div>
          </div>
        </div>
      )}

      {showMeeting && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md text-center">
            <p className="text-gray-700 mb-4">กรุณาใช้หน้า Health Meeting เพื่อเริ่มการประชุมกับผู้ป่วย</p>
            <button onClick={() => { setShowMeeting(false); navigate(`/doctor/${user.id}/health-meeting`); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">ไปหน้า Health Meeting</button>
            <button onClick={() => setShowMeeting(false)} className="ml-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">ปิด</button>
          </div>
        </div>
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

export default DoctorPortal;
