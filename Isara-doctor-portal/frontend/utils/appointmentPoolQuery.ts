/**
 * Client queue helpers for Health Meeting pending + accepted sections.
 * Standalone frontend implementation (sync with backend pool query for visibility rules).
 */

export const ACCEPTED_VISIBILITY_DAYS = 7;

const PENDING_POOL_STATUSES = new Set([
  'in_pool',
  'pending',
  'awaiting_doctor_response',
  'assigned',
]);

type PoolRow = {
  id?: string;
  appointmentId?: string;
  status?: string;
  doctorId?: string | null;
  doctor_id?: string | null;
  assignedDoctorId?: string | null;
  confirmedAt?: string;
  confirmed_at?: string;
  acceptedAt?: string;
  updatedAt?: string;
  updated_at?: string;
};

type QueueContext = {
  isAdmin?: boolean;
  doctorId?: string;
  doctorEmail?: string;
};

function isWithinAcceptedWindow(value: string | undefined, days = ACCEPTED_VISIBILITY_DAYS): boolean {
  if (!value) return true;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return d.getTime() >= cutoff;
}

function toPoolAccessRow(apt: PoolRow) {
  return {
    status: apt.status,
    doctor_id: apt.doctorId || apt.doctor_id || apt.assignedDoctorId,
    confirmed_by: (apt as Record<string, unknown>).confirmedBy || (apt as Record<string, unknown>).acceptedBy,
    confirmed_by_email:
      (apt as Record<string, unknown>).confirmedByEmail || (apt as Record<string, unknown>).acceptedByEmail,
  };
}

function isUnassignedPendingRow(row: ReturnType<typeof toPoolAccessRow>): boolean {
  const status = row.status || 'pending';
  const rowDoctorId = row.doctor_id || null;
  return PENDING_POOL_STATUSES.has(status) && !rowDoctorId;
}

function isAssignedToDoctor(
  row: ReturnType<typeof toPoolAccessRow>,
  doctorId?: string,
  doctorEmail?: string,
): boolean {
  const rowDoctorId = row.doctor_id || null;
  if (!rowDoctorId) return false;
  if (doctorId && rowDoctorId === doctorId) return true;
  return Boolean(doctorEmail && rowDoctorId === doctorEmail);
}

function isConfirmedForDoctor(
  row: ReturnType<typeof toPoolAccessRow>,
  doctorId?: string,
  doctorEmail?: string,
): boolean {
  if (row.status !== 'confirmed') return false;
  const rowDoctorId = row.doctor_id || null;
  const confirmedBy = row.confirmed_by as string | undefined;
  const confirmedByEmail = row.confirmed_by_email as string | undefined;
  if (rowDoctorId && doctorId && rowDoctorId === doctorId) return true;
  if (confirmedBy && doctorId && confirmedBy === doctorId) return true;
  if (confirmedByEmail && doctorEmail && confirmedByEmail === doctorEmail) return true;
  if (confirmedBy && doctorEmail && confirmedBy === doctorEmail) return true;
  return false;
}

function matchesDoctorPoolAccess(row: ReturnType<typeof toPoolAccessRow>, ctx: QueueContext = {}): boolean {
  const { doctorId, doctorEmail } = ctx;
  if (!row) return false;
  const status = row.status || 'pending';
  if (isUnassignedPendingRow(row)) return true;
  if (isAssignedToDoctor(row, doctorId, doctorEmail)) return true;
  if (status === 'awaiting_doctor_response' && isAssignedToDoctor(row, doctorId, doctorEmail)) return true;
  if (isConfirmedForDoctor(row, doctorId, doctorEmail)) return true;
  return false;
}

function isVisibleToDoctorInQueue(apt: PoolRow, ctx: QueueContext = {}): boolean {
  if (ctx.isAdmin) return true;
  const unassigned = !apt.doctorId && !apt.doctor_id && !apt.assignedDoctorId;
  if (unassigned) return true;
  return matchesDoctorPoolAccess(toPoolAccessRow(apt), ctx);
}

function confirmedTimestamp(apt: PoolRow): string | undefined {
  return apt.confirmedAt || apt.confirmed_at || apt.acceptedAt || apt.updatedAt || apt.updated_at;
}

/** Client-side queue visibility for Health Meeting pending + accepted sections. */
export function splitQueueSections<T extends PoolRow>(appointments: T[] | undefined, ctx: QueueContext = {}) {
  const pending: T[] = [];
  const accepted: T[] = [];
  const seenPending = new Set<string>();
  const seenAccepted = new Set<string>();

  for (const apt of appointments || []) {
    const id = apt.id || apt.appointmentId;
    if (!id) continue;

    const visible = isVisibleToDoctorInQueue(apt, ctx);

    if (apt.status && PENDING_POOL_STATUSES.has(apt.status) && visible && !seenPending.has(id)) {
      pending.push(apt);
      seenPending.add(id);
    }

    if (
      apt.status === 'confirmed'
      && isWithinAcceptedWindow(confirmedTimestamp(apt))
      && visible
      && !seenAccepted.has(id)
    ) {
      accepted.push(apt);
      seenAccepted.add(id);
    }
  }

  return { pending, accepted };
}
