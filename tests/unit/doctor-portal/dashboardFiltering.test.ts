/**
 * ═══════════════════════════════════════════════════════════════════════
 * DOCTOR PORTAL — Dashboard Filtering Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: DoctorDashboard.tsx helper functions — getAppointmentDate,
 *        getDoctorAppointments, getUpcomingAppointments, getTodaysMeetings,
 *        getPendingConfirmationsCount, getAssignedPatients, getPatientsByAppointmentStatus
 *
 * These functions were updated to handle both camelCase and snake_case
 * fields from PostgreSQL, and to include additional appointment statuses
 * (awaiting_doctor_response, pending, assigned) alongside confirmed/scheduled.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ── Replicate the exact helper functions from DoctorDashboard.tsx ────────

const getAppointmentDate = (appointment: any): string | null => {
  const rawDate = appointment?.appointmentDate || appointment?.appointment_date
    || appointment?.confirmed_date || appointment?.confirmedDate
    || appointment?.requested_date || appointment?.requestedDate
    || appointment?.scheduledDate || appointment?.scheduled_date
    || appointment?.date;
  if (!rawDate) return null;
  return typeof rawDate === 'string' ? rawDate.split('T')[0] : null;
};

const getDoctorAppointments = (appointments: any[], doctorId: string) => {
  return appointments.filter((apt: any) =>
    apt.doctorId === doctorId ||
    apt.doctor_id === doctorId ||
    apt.assignedDoctorId === doctorId ||
    apt.adminAssignedDoctorId === doctorId ||
    apt.confirmedBy === doctorId ||
    (!apt.doctorId && !apt.doctor_id)
  );
};

const getPendingConfirmationsCount = (appointments: any[]) => {
  return appointments.filter((apt: any) =>
    apt.status === 'awaiting_doctor_response' ||
    apt.status === 'assigned' ||
    (apt.status === 'pending' && (apt.assignedDoctorId || apt.adminAssignedDoctorId))
  ).length;
};

const getAssignedPatients = (patients: any[], appointments: any[]) => {
  const appointmentPatientIds = new Set(appointments.map((apt: any) => apt.patientId || apt.patient_id));
  return patients.filter((patient: any) => appointmentPatientIds.has(patient.id));
};

const getPatientsByAppointmentStatus = (
  patients: any[],
  appointments: any[],
  statuses: string[]
) => {
  const statusSet = new Set(statuses);
  const patientIds = new Set(
    appointments.filter((apt: any) => statusSet.has(apt.status)).map((apt: any) => apt.patientId || apt.patient_id)
  );
  return patients.filter((patient: any) => patientIds.has(patient.id));
};

const getUpcomingAppointments = (appointments: any[], today: string) => {
  return appointments
    .filter((apt: any) => {
      const aptDate = getAppointmentDate(apt);
      const isActiveStatus = ['confirmed', 'scheduled', 'pending', 'awaiting_doctor_response', 'assigned'].includes(apt.status);
      return isActiveStatus && aptDate && aptDate >= today;
    })
    .sort((a: any, b: any) => {
      const dateA = getAppointmentDate(a) || '';
      const dateB = getAppointmentDate(b) || '';
      return dateA.localeCompare(dateB);
    });
};

const getTodaysMeetings = (appointments: any[], today: string) => {
  return appointments.filter((apt: any) => {
    const aptDate = getAppointmentDate(apt);
    const isActiveStatus = ['confirmed', 'scheduled', 'pending', 'awaiting_doctor_response', 'assigned'].includes(apt.status);
    return isActiveStatus && aptDate === today;
  });
};

// ── Tests ────────────────────────────────────────────────────────────────

describe('Doctor Portal — Dashboard Filtering', () => {

  // ── A — getAppointmentDate ──────────────────────────────────────────

  describe('A — getAppointmentDate', () => {
    it('A01 — extracts date from camelCase appointmentDate', () => {
      expect(getAppointmentDate({ appointmentDate: '2026-06-15T10:00:00Z' })).toBe('2026-06-15');
    });

    it('A02 — extracts date from snake_case appointment_date', () => {
      expect(getAppointmentDate({ appointment_date: '2026-06-15' })).toBe('2026-06-15');
    });

    it('A03 — extracts date from confirmed_date', () => {
      expect(getAppointmentDate({ confirmed_date: '2026-06-20T14:30:00Z' })).toBe('2026-06-20');
    });

    it('A04 — extracts date from requested_date', () => {
      expect(getAppointmentDate({ requested_date: '2026-07-01' })).toBe('2026-07-01');
    });

    it('A05 — returns null for missing date', () => {
      expect(getAppointmentDate({})).toBeNull();
      expect(getAppointmentDate(null)).toBeNull();
      expect(getAppointmentDate(undefined)).toBeNull();
    });

    it('A06 — priority: appointmentDate > appointment_date > confirmed_date', () => {
      expect(getAppointmentDate({
        appointmentDate: '2026-01-01',
        appointment_date: '2026-02-02',
        confirmed_date: '2026-03-03',
      })).toBe('2026-01-01');
    });

    it('A07 — falls back through chain when earlier fields missing', () => {
      expect(getAppointmentDate({
        confirmed_date: '2026-03-03',
        requested_date: '2026-04-04',
      })).toBe('2026-03-03');
    });
  });

  // ── B — getDoctorAppointments ───────────────────────────────────────

  describe('B — getDoctorAppointments', () => {
    const doctorId = 'DOC-001';
    const appointments = [
      { id: 'A1', doctorId: 'DOC-001', status: 'confirmed' },
      { id: 'A2', doctor_id: 'DOC-001', status: 'pending' },
      { id: 'A3', assignedDoctorId: 'DOC-001', status: 'assigned' },
      { id: 'A4', adminAssignedDoctorId: 'DOC-001', status: 'awaiting_doctor_response' },
      { id: 'A5', confirmedBy: 'DOC-001', status: 'confirmed' },
      { id: 'A6', doctorId: 'DOC-002', status: 'confirmed' },
      { id: 'A7', status: 'pending' }, // unassigned — should be included
    ];

    it('B01 — matches camelCase doctorId', () => {
      const result = getDoctorAppointments(appointments, doctorId);
      expect(result.find(a => a.id === 'A1')).toBeTruthy();
    });

    it('B02 — matches snake_case doctor_id', () => {
      const result = getDoctorAppointments(appointments, doctorId);
      expect(result.find(a => a.id === 'A2')).toBeTruthy();
    });

    it('B03 — matches assignedDoctorId', () => {
      const result = getDoctorAppointments(appointments, doctorId);
      expect(result.find(a => a.id === 'A3')).toBeTruthy();
    });

    it('B04 — matches adminAssignedDoctorId', () => {
      const result = getDoctorAppointments(appointments, doctorId);
      expect(result.find(a => a.id === 'A4')).toBeTruthy();
    });

    it('B05 — matches confirmedBy', () => {
      const result = getDoctorAppointments(appointments, doctorId);
      expect(result.find(a => a.id === 'A5')).toBeTruthy();
    });

    it('B06 — excludes other doctor appointments', () => {
      const result = getDoctorAppointments(appointments, doctorId);
      expect(result.find(a => a.id === 'A6')).toBeFalsy();
    });

    it('B07 — includes unassigned (pool) appointments', () => {
      const result = getDoctorAppointments(appointments, doctorId);
      expect(result.find(a => a.id === 'A7')).toBeTruthy();
    });

    it('B08 — returns 6 of 7 for DOC-001 (excl DOC-002)', () => {
      const result = getDoctorAppointments(appointments, doctorId);
      expect(result).toHaveLength(6);
    });
  });

  // ── C — getUpcomingAppointments ─────────────────────────────────────

  describe('C — getUpcomingAppointments', () => {
    const today = '2026-06-15';
    const appointments = [
      { id: 'U1', appointment_date: '2026-06-16', status: 'confirmed' },
      { id: 'U2', appointment_date: '2026-06-17', status: 'scheduled' },
      { id: 'U3', appointment_date: '2026-06-18', status: 'pending' },
      { id: 'U4', appointment_date: '2026-06-19', status: 'awaiting_doctor_response' },
      { id: 'U5', appointment_date: '2026-06-20', status: 'assigned' },
      { id: 'U6', appointment_date: '2026-06-01', status: 'confirmed' },  // past date
      { id: 'U7', appointment_date: '2026-06-21', status: 'completed' },  // inactive status
      { id: 'U8', appointment_date: '2026-06-22', status: 'cancelled' },  // cancelled
    ];

    it('C01 — includes confirmed appointments', () => {
      const result = getUpcomingAppointments(appointments, today);
      expect(result.find(a => a.id === 'U1')).toBeTruthy();
    });

    it('C02 — includes scheduled appointments', () => {
      const result = getUpcomingAppointments(appointments, today);
      expect(result.find(a => a.id === 'U2')).toBeTruthy();
    });

    it('C03 — includes pending appointments', () => {
      const result = getUpcomingAppointments(appointments, today);
      expect(result.find(a => a.id === 'U3')).toBeTruthy();
    });

    it('C04 — includes awaiting_doctor_response appointments', () => {
      const result = getUpcomingAppointments(appointments, today);
      expect(result.find(a => a.id === 'U4')).toBeTruthy();
    });

    it('C05 — includes assigned appointments', () => {
      const result = getUpcomingAppointments(appointments, today);
      expect(result.find(a => a.id === 'U5')).toBeTruthy();
    });

    it('C06 — excludes past-date confirmed appointments', () => {
      const result = getUpcomingAppointments(appointments, today);
      expect(result.find(a => a.id === 'U6')).toBeFalsy();
    });

    it('C07 — excludes completed appointments', () => {
      const result = getUpcomingAppointments(appointments, today);
      expect(result.find(a => a.id === 'U7')).toBeFalsy();
    });

    it('C08 — excludes cancelled appointments', () => {
      const result = getUpcomingAppointments(appointments, today);
      expect(result.find(a => a.id === 'U8')).toBeFalsy();
    });

    it('C09 — returns 5 active future appointments', () => {
      const result = getUpcomingAppointments(appointments, today);
      expect(result).toHaveLength(5);
    });

    it('C10 — sorted by date ascending', () => {
      const result = getUpcomingAppointments(appointments, today);
      for (let i = 1; i < result.length; i++) {
        const prev = getAppointmentDate(result[i - 1]) || '';
        const curr = getAppointmentDate(result[i]) || '';
        expect(prev <= curr).toBe(true);
      }
    });
  });

  // ── D — getTodaysMeetings ───────────────────────────────────────────

  describe('D — getTodaysMeetings', () => {
    const today = '2026-06-15';
    const appointments = [
      { id: 'T1', appointment_date: '2026-06-15', status: 'confirmed' },
      { id: 'T2', appointment_date: '2026-06-15', status: 'awaiting_doctor_response' },
      { id: 'T3', appointment_date: '2026-06-15', status: 'pending' },
      { id: 'T4', appointment_date: '2026-06-16', status: 'confirmed' },  // tomorrow
      { id: 'T5', appointment_date: '2026-06-15', status: 'completed' },  // completed
      { id: 'T6', appointment_date: '2026-06-15', status: 'cancelled' },  // cancelled
    ];

    it('D01 — includes today confirmed', () => {
      const result = getTodaysMeetings(appointments, today);
      expect(result.find(a => a.id === 'T1')).toBeTruthy();
    });

    it('D02 — includes today awaiting_doctor_response', () => {
      const result = getTodaysMeetings(appointments, today);
      expect(result.find(a => a.id === 'T2')).toBeTruthy();
    });

    it('D03 — includes today pending', () => {
      const result = getTodaysMeetings(appointments, today);
      expect(result.find(a => a.id === 'T3')).toBeTruthy();
    });

    it('D04 — excludes tomorrow', () => {
      const result = getTodaysMeetings(appointments, today);
      expect(result.find(a => a.id === 'T4')).toBeFalsy();
    });

    it('D05 — excludes completed', () => {
      const result = getTodaysMeetings(appointments, today);
      expect(result.find(a => a.id === 'T5')).toBeFalsy();
    });

    it('D06 — excludes cancelled', () => {
      const result = getTodaysMeetings(appointments, today);
      expect(result.find(a => a.id === 'T6')).toBeFalsy();
    });

    it('D07 — returns 3 active today appointments', () => {
      const result = getTodaysMeetings(appointments, today);
      expect(result).toHaveLength(3);
    });
  });

  // ── E — getPendingConfirmationsCount ────────────────────────────────

  describe('E — getPendingConfirmationsCount', () => {
    it('E01 — counts awaiting_doctor_response', () => {
      const apts = [{ status: 'awaiting_doctor_response' }];
      expect(getPendingConfirmationsCount(apts)).toBe(1);
    });

    it('E02 — counts assigned', () => {
      const apts = [{ status: 'assigned' }];
      expect(getPendingConfirmationsCount(apts)).toBe(1);
    });

    it('E03 — counts pending with assignedDoctorId', () => {
      const apts = [{ status: 'pending', assignedDoctorId: 'DOC-001' }];
      expect(getPendingConfirmationsCount(apts)).toBe(1);
    });

    it('E04 — does NOT count pure pending (no assignment)', () => {
      const apts = [{ status: 'pending' }];
      expect(getPendingConfirmationsCount(apts)).toBe(0);
    });

    it('E05 — does NOT count confirmed', () => {
      const apts = [{ status: 'confirmed' }];
      expect(getPendingConfirmationsCount(apts)).toBe(0);
    });

    it('E06 — mixed statuses counted correctly', () => {
      const apts = [
        { status: 'awaiting_doctor_response' },
        { status: 'assigned' },
        { status: 'pending', adminAssignedDoctorId: 'DOC-001' },
        { status: 'confirmed' },
        { status: 'completed' },
        { status: 'pending' },
      ];
      expect(getPendingConfirmationsCount(apts)).toBe(3);
    });
  });

  // ── F — getAssignedPatients (snake_case support) ────────────────────

  describe('F — getAssignedPatients', () => {
    const patients = [
      { id: 'PAT-001', name: 'Patient 1' },
      { id: 'PAT-002', name: 'Patient 2' },
      { id: 'PAT-003', name: 'Patient 3' },
    ];

    it('F01 — matches camelCase patientId', () => {
      const apts = [{ patientId: 'PAT-001', status: 'confirmed' }];
      const result = getAssignedPatients(patients, apts);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('PAT-001');
    });

    it('F02 — matches snake_case patient_id', () => {
      const apts = [{ patient_id: 'PAT-002', status: 'pending' }];
      const result = getAssignedPatients(patients, apts);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('PAT-002');
    });

    it('F03 — returns empty for no matching patients', () => {
      const apts = [{ patient_id: 'PAT-999', status: 'confirmed' }];
      const result = getAssignedPatients(patients, apts);
      expect(result).toHaveLength(0);
    });
  });

  // ── G — getPatientsByAppointmentStatus ──────────────────────────────

  describe('G — getPatientsByAppointmentStatus', () => {
    const patients = [
      { id: 'PAT-001', name: 'Patient 1' },
      { id: 'PAT-002', name: 'Patient 2' },
      { id: 'PAT-003', name: 'Patient 3' },
    ];
    const appointments = [
      { patient_id: 'PAT-001', status: 'pending' },
      { patient_id: 'PAT-001', status: 'confirmed' },
      { patientId: 'PAT-002', status: 'assigned' },
      { patient_id: 'PAT-003', status: 'completed' },
    ];

    it('G01 — filters by single status (snake_case)', () => {
      const result = getPatientsByAppointmentStatus(patients, appointments, ['pending']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('PAT-001');
    });

    it('G02 — filters by multiple statuses', () => {
      const result = getPatientsByAppointmentStatus(patients, appointments, ['pending', 'assigned', 'confirmed']);
      expect(result).toHaveLength(2); // PAT-001 (pending+confirmed) and PAT-002 (assigned)
    });

    it('G03 — handles camelCase patientId', () => {
      const result = getPatientsByAppointmentStatus(patients, appointments, ['assigned']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('PAT-002');
    });

    it('G04 — returns empty for non-matching status', () => {
      const result = getPatientsByAppointmentStatus(patients, appointments, ['cancelled']);
      expect(result).toHaveLength(0);
    });
  });

  // ── H — Dashboard Queue Population ─────────────────────────────────

  describe('H — Dashboard Queue Population', () => {
    it('H01 — queue with active statuses is non-empty', () => {
      const queueStatuses = ['pending', 'awaiting_doctor_response', 'assigned', 'confirmed', 'scheduled'];
      const appointments = [
        { id: 'A1', patient_id: 'P1', status: 'pending', appointment_date: '2026-06-15' },
        { id: 'A2', patient_id: 'P2', status: 'confirmed', appointment_date: '2026-06-16' },
        { id: 'A3', patient_id: 'P3', status: 'completed', appointment_date: '2026-06-14' },
        { id: 'A4', patient_id: 'P4', status: 'cancelled', appointment_date: '2026-06-17' },
      ];
      const queue = appointments.filter(a => queueStatuses.includes(a.status));
      expect(queue).toHaveLength(2); // A1 (pending) + A2 (confirmed)
    });

    it('H02 — queue excludes completed and cancelled', () => {
      const queueStatuses = ['pending', 'awaiting_doctor_response', 'assigned', 'confirmed', 'scheduled'];
      const appointments = [
        { id: 'A1', status: 'completed' },
        { id: 'A2', status: 'cancelled' },
        { id: 'A3', status: 'no_show' },
      ];
      const queue = appointments.filter(a => queueStatuses.includes(a.status));
      expect(queue).toHaveLength(0);
    });

    it('H03 — queue includes awaiting_doctor_response', () => {
      const queueStatuses = ['pending', 'awaiting_doctor_response', 'assigned', 'confirmed', 'scheduled'];
      const appointments = [
        { id: 'A1', status: 'awaiting_doctor_response', patient_id: 'P1' },
      ];
      const queue = appointments.filter(a => queueStatuses.includes(a.status));
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('A1');
    });
  });

  // ── I — getPendingCount SQL Logic ───────────────────────────────────

  describe('I — getPendingCount SQL Logic', () => {
    // Simulates the SQL: WHERE (doctor_id = $1 OR doctor_id IS NULL)
    //   AND status IN ('pending', 'awaiting_doctor_response', 'assigned')
    const filterPendingCount = (appointments: any[], doctorId: string) => {
      return appointments.filter(a =>
        (a.doctor_id === doctorId || !a.doctor_id) &&
        ['pending', 'awaiting_doctor_response', 'assigned'].includes(a.status)
      ).length;
    };

    it('I01 — counts pending for specific doctor', () => {
      const apts = [
        { doctor_id: 'DOC-001', status: 'pending' },
        { doctor_id: 'DOC-001', status: 'awaiting_doctor_response' },
        { doctor_id: 'DOC-002', status: 'pending' },
      ];
      expect(filterPendingCount(apts, 'DOC-001')).toBe(2);
    });

    it('I02 — includes unassigned (NULL doctor_id) appointments', () => {
      const apts = [
        { doctor_id: null, status: 'pending' },
        { doctor_id: undefined, status: 'assigned' },
      ];
      expect(filterPendingCount(apts, 'DOC-001')).toBe(2);
    });

    it('I03 — excludes confirmed/completed from pending count', () => {
      const apts = [
        { doctor_id: 'DOC-001', status: 'confirmed' },
        { doctor_id: 'DOC-001', status: 'completed' },
        { doctor_id: 'DOC-001', status: 'cancelled' },
      ];
      expect(filterPendingCount(apts, 'DOC-001')).toBe(0);
    });
  });
});
