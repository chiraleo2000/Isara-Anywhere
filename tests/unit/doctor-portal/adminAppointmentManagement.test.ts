/**
 * ═══════════════════════════════════════════════════════════════════════
 * Admin Appointment Management Logic Tests
 * Tests: Queue management, assignment, bulk operations, stats
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface QueuedAppointment {
  id: string;
  patientName: string;
  requestedDate: string;
  requestedTime: string;
  urgencyLevel: 'normal' | 'urgent' | 'emergency';
  status: 'pending' | 'confirmed' | 'assigned' | 'completed' | 'cancelled';
  doctorId?: string;
  specialty?: string;
}

interface AssignmentRequest {
  appointmentId: string;
  doctorId: string;
  assignedBy: string;
}

// --- Functions ---

function sortQueueByUrgency(appointments: QueuedAppointment[]): QueuedAppointment[] {
  const priority: Record<string, number> = { emergency: 0, urgent: 1, normal: 2 };
  return [...appointments].sort((a, b) => {
    const pDiff = (priority[a.urgencyLevel] ?? 3) - (priority[b.urgencyLevel] ?? 3);
    if (pDiff !== 0) return pDiff;
    return new Date(a.requestedDate + 'T' + a.requestedTime).getTime() -
           new Date(b.requestedDate + 'T' + b.requestedTime).getTime();
  });
}

function filterQueueByStatus(appointments: QueuedAppointment[], status: string): QueuedAppointment[] {
  return appointments.filter(a => a.status === status);
}

function getUnassignedAppointments(appointments: QueuedAppointment[]): QueuedAppointment[] {
  return appointments.filter(a => !a.doctorId && a.status === 'pending');
}

function validateAssignment(
  appointment: QueuedAppointment,
  availableDoctorIds: string[],
  request: AssignmentRequest
): { valid: boolean; error?: string } {
  if (appointment.status === 'cancelled') {
    return { valid: false, error: 'Cannot assign cancelled appointment' };
  }
  if (appointment.status === 'completed') {
    return { valid: false, error: 'Cannot assign completed appointment' };
  }
  if (!availableDoctorIds.includes(request.doctorId)) {
    return { valid: false, error: 'Doctor not available' };
  }
  return { valid: true };
}

function getQueueStats(appointments: QueuedAppointment[]): {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  unassigned: number;
  emergencies: number;
} {
  return {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    unassigned: appointments.filter(a => !a.doctorId && a.status === 'pending').length,
    emergencies: appointments.filter(a => a.urgencyLevel === 'emergency').length,
  };
}

function formatQueueSummary(stats: ReturnType<typeof getQueueStats>): string {
  return `คิว: ${stats.total} รายการ | รอ: ${stats.pending} | ฉุกเฉิน: ${stats.emergencies} | ยังไม่มอบหมาย: ${stats.unassigned}`;
}

// --- Test Data ---
const SAMPLE_QUEUE: QueuedAppointment[] = [
  { id: '1', patientName: 'Patient A', requestedDate: '2026-03-20', requestedTime: '09:00', urgencyLevel: 'normal', status: 'pending' },
  { id: '2', patientName: 'Patient B', requestedDate: '2026-03-20', requestedTime: '10:00', urgencyLevel: 'emergency', status: 'pending' },
  { id: '3', patientName: 'Patient C', requestedDate: '2026-03-20', requestedTime: '11:00', urgencyLevel: 'urgent', status: 'confirmed', doctorId: 'doc1' },
  { id: '4', patientName: 'Patient D', requestedDate: '2026-03-20', requestedTime: '14:00', urgencyLevel: 'normal', status: 'completed', doctorId: 'doc2' },
  { id: '5', patientName: 'Patient E', requestedDate: '2026-03-20', requestedTime: '15:00', urgencyLevel: 'normal', status: 'cancelled' },
  { id: '6', patientName: 'Patient F', requestedDate: '2026-03-20', requestedTime: '08:00', urgencyLevel: 'urgent', status: 'pending' },
];

// --- Tests ---

describe('Admin Appointment Queue — Sorting', () => {
  it('AQ01 — emergency comes first', () => {
    const sorted = sortQueueByUrgency(SAMPLE_QUEUE);
    expect(sorted[0].urgencyLevel).toBe('emergency');
  });

  it('AQ02 — same urgency sorted by time', () => {
    const sorted = sortQueueByUrgency(SAMPLE_QUEUE);
    const normals = sorted.filter(a => a.urgencyLevel === 'normal');
    if (normals.length > 1) {
      expect(normals[0].requestedTime <= normals[1].requestedTime).toBe(true);
    }
  });

  it('AQ03 — sort preserves all items', () => {
    expect(sortQueueByUrgency(SAMPLE_QUEUE)).toHaveLength(SAMPLE_QUEUE.length);
  });
});

describe('Admin Appointment Queue — Filtering', () => {
  it('AQ04 — filter pending', () => {
    expect(filterQueueByStatus(SAMPLE_QUEUE, 'pending')).toHaveLength(3);
  });

  it('AQ05 — filter completed', () => {
    expect(filterQueueByStatus(SAMPLE_QUEUE, 'completed')).toHaveLength(1);
  });

  it('AQ06 — unassigned appointments', () => {
    const unassigned = getUnassignedAppointments(SAMPLE_QUEUE);
    expect(unassigned).toHaveLength(3); // #1, #2, #6 are pending without doctor
  });
});

describe('Admin Appointment Queue — Assignment', () => {
  it('AQ07 — valid assignment to available doctor', () => {
    const result = validateAssignment(SAMPLE_QUEUE[0], ['doc1', 'doc2'], { appointmentId: '1', doctorId: 'doc1', assignedBy: 'admin' });
    expect(result.valid).toBe(true);
  });

  it('AQ08 — cannot assign to unavailable doctor', () => {
    const result = validateAssignment(SAMPLE_QUEUE[0], ['doc1'], { appointmentId: '1', doctorId: 'doc99', assignedBy: 'admin' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not available');
  });

  it('AQ09 — cannot assign cancelled appointment', () => {
    const result = validateAssignment(SAMPLE_QUEUE[4], ['doc1'], { appointmentId: '5', doctorId: 'doc1', assignedBy: 'admin' });
    expect(result.valid).toBe(false);
  });

  it('AQ10 — cannot assign completed appointment', () => {
    const result = validateAssignment(SAMPLE_QUEUE[3], ['doc2'], { appointmentId: '4', doctorId: 'doc2', assignedBy: 'admin' });
    expect(result.valid).toBe(false);
  });
});

describe('Admin Appointment Queue — Stats', () => {
  it('AQ11 — correct total', () => {
    expect(getQueueStats(SAMPLE_QUEUE).total).toBe(6);
  });

  it('AQ12 — correct pending count', () => {
    expect(getQueueStats(SAMPLE_QUEUE).pending).toBe(3);
  });

  it('AQ13 — correct emergency count', () => {
    expect(getQueueStats(SAMPLE_QUEUE).emergencies).toBe(1);
  });

  it('AQ14 — correct unassigned count', () => {
    expect(getQueueStats(SAMPLE_QUEUE).unassigned).toBe(3);
  });
});

describe('Admin Appointment Queue — Thai Summary', () => {
  it('AQ15 — summary contains Thai labels', () => {
    const stats = getQueueStats(SAMPLE_QUEUE);
    const summary = formatQueueSummary(stats);
    expect(summary).toContain('คิว:');
    expect(summary).toContain('ฉุกเฉิน:');
    expect(summary).toContain('ยังไม่มอบหมาย:');
  });
});
