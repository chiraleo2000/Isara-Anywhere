/**
 * Standalone route for post-meeting results (E2E / deep links).
 * Path: /doctor/:userId/meeting/:appointmentId/results
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MeetingResults from './MeetingResults';

const MeetingResultsPage: React.FC = () => {
  const { userId, appointmentId } = useParams<{ userId: string; appointmentId: string }>();
  const navigate = useNavigate();

  if (!appointmentId || !userId) {
    return null;
  }

  return (
    <MeetingResults
      meetingId={appointmentId}
      appointmentId={appointmentId}
      onClose={() => navigate(`/doctor/${userId}/health-meeting`)}
      onNavigateToEMR={(aptId) => navigate(`/doctor/${userId}/emr/${aptId}`)}
      onNavigateToPrescription={(aptId, patientId) =>
        navigate(`/doctor/${userId}/prescribing/${aptId}/${patientId}`)
      }
      onNavigateToLabOrder={(aptId, patientId) =>
        navigate(`/doctor/${userId}/lab/${aptId}/${patientId}`)
      }
      onNavigateToNewAppointment={(patientId) =>
        navigate(`/doctor/${userId}/health-meeting`, { state: { patientId } })
      }
    />
  );
};

export default MeetingResultsPage;
