/**
 * EMR editor route — /doctor/:userId/emr/:appointmentId
 * Loads patient from appointment and opens CompleteEMREditor (reads emr-ai-draft from sessionStorage).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../components/common/AuthProvider';
import CompleteEMREditor from '../../components/CompleteEMREditor';
import { PatientRecord } from '../../types';
import { patientDataService } from '../../services/patientDataService';
import { getToken } from '../../services/authServices';

async function resolvePatientForEmr(
  appointmentId: string,
  doctorUserId: string | undefined,
): Promise<PatientRecord> {
  const token = getToken();
  const aptRes = await fetch(`/api/appointments/${appointmentId}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!aptRes.ok) throw new Error('Appointment not found');
  const apt = await aptRes.json();
  const patientId = apt.patientId || apt.patient_id;
  if (!patientId) throw new Error('Patient not linked to appointment');

  let record: PatientRecord | null = null;
  if (doctorUserId) {
    try {
      record = await patientDataService.getPatientDetails(patientId, doctorUserId);
    } catch {
      /* consent gate — fall back to list lookup */
    }
  }
  if (!record) {
    const all = await patientDataService.getAllPatients();
    record = all.find((p) => p.id === patientId) || null;
  }
  if (!record) throw new Error('Patient record not found');
  return record;
}

const EmrAppointmentPage: React.FC = () => {
  const { userId, appointmentId } = useParams<{ userId: string; appointmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const record = await resolvePatientForEmr(appointmentId, user?.id);
        if (cancelled) return;
        setPatient(record);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load EMR context');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, user?.id]);

  if (!user || !appointmentId || !userId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-6 bg-white rounded-xl shadow text-center">
        <p className="text-red-600 mb-4">{error || 'Unable to open EMR'}</p>
        <button
          type="button"
          onClick={() => navigate(`/doctor/${userId}/health-meeting`)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Back to Health Meeting
        </button>
      </div>
    );
  }

  return (
    <CompleteEMREditor
      patient={patient}
      doctor={user}
      appointmentId={appointmentId}
      onSave={() => navigate(`/doctor/${userId}/health-meeting`)}
      onClose={() => navigate(`/doctor/${userId}/health-meeting`)}
    />
  );
};

export default EmrAppointmentPage;
