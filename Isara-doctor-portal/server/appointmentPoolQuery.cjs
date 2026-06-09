/**
 * Query helpers for appointment pool / queue list filtering.
 * Extracted for testability and consistent pending vs accepted visibility.
 */

const PENDING_POOL_STATUSES = Object.freeze(['in_pool', 'pending', 'awaiting_doctor_response', 'assigned']);
const ACCEPTED_POOL_STATUSES = Object.freeze(['confirmed']);
/** Confirmed appointments stay visible in pool/accepted lists for this many days. */
const ACCEPTED_VISIBILITY_DAYS = 7;

function buildPoolStatusList(includeAccepted = false) {
  if (includeAccepted) {
    return [...PENDING_POOL_STATUSES, ...ACCEPTED_POOL_STATUSES];
  }
  return [...PENDING_POOL_STATUSES];
}

function isSameUtcDay(value) {
  if (!value) return true;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear()
    && d.getUTCMonth() === now.getUTCMonth()
    && d.getUTCDate() === now.getUTCDate()
  );
}

/** Whether a confirmed row is still shown in accepted pool sections (default 7 days). */
function isWithinAcceptedWindow(value, days = ACCEPTED_VISIBILITY_DAYS) {
  if (!value) return true;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return d.getTime() >= cutoff;
}

/**
 * Whether a row belongs in the pool response for the given mode.
 */
function matchesPoolFilter(row, includeAccepted = false) {
  const status = row?.status || 'pending';
  if (PENDING_POOL_STATUSES.includes(status)) return true;
  if (!includeAccepted) return false;
  if (status === 'confirmed') {
    return isWithinAcceptedWindow(row.confirmed_at || row.updated_at || row.created_at);
  }
  return false;
}

/** De-dupe pool cards by appointment id (last wins). */
function mergePoolItemsById(items) {
  const map = new Map();
  for (const item of items || []) {
    if (item?.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

/** Whether a row is visible to a doctor in pool/queue lists (pending + accepted traceability). */
function isUnassignedPendingRow(row) {
  const status = row?.status || 'pending';
  const rowDoctorId = row.doctor_id || row.doctorId || null;
  return PENDING_POOL_STATUSES.includes(status) && !rowDoctorId;
}

function isAssignedToDoctor(row, doctorId, doctorEmail) {
  const rowDoctorId = row.doctor_id || row.doctorId || null;
  if (!rowDoctorId) return false;
  if (doctorId && rowDoctorId === doctorId) return true;
  return Boolean(doctorEmail && rowDoctorId === doctorEmail);
}

function isConfirmedForDoctor(row, doctorId, doctorEmail) {
  if (row?.status !== 'confirmed') return false;
  const rowDoctorId = row.doctor_id || row.doctorId || null;
  const confirmedBy = row.confirmed_by || row.confirmedBy || row.acceptedBy || null;
  const confirmedByEmail = row.confirmed_by_email || row.confirmedByEmail || row.acceptedByEmail || null;
  if (rowDoctorId && doctorId && rowDoctorId === doctorId) return true;
  if (confirmedBy && doctorId && confirmedBy === doctorId) return true;
  if (confirmedByEmail && doctorEmail && confirmedByEmail === doctorEmail) return true;
  if (confirmedBy && doctorEmail && confirmedBy === doctorEmail) return true;
  return false;
}

function matchesDoctorPoolAccess(row, { doctorId, doctorEmail } = {}) {
  if (!row) return false;
  const status = row.status || 'pending';
  if (isUnassignedPendingRow(row)) return true;
  if (isAssignedToDoctor(row, doctorId, doctorEmail)) return true;
  if (status === 'awaiting_doctor_response' && isAssignedToDoctor(row, doctorId, doctorEmail)) {
    return true;
  }
  if (isConfirmedForDoctor(row, doctorId, doctorEmail)) return true;
  return false;
}

/**
 * SQL fragment + params for doctor-scoped pool queries (pending unassigned + own assignments + accepted).
 * Returns { clause: string, extraParams: unknown[] }.
 */
function buildDoctorPoolSqlFilter(doctorId, doctorEmail, startParamIdx = 2) {
  const idx = startParamIdx;
  const emailIdx = startParamIdx + 1;
  const clause = ` AND (
    (a.doctor_id IS NULL AND a.status IN ('in_pool', 'pending', 'awaiting_doctor_response', 'assigned'))
    OR a.doctor_id = $${idx}
    OR (a.status = 'assigned' AND a.doctor_id = $${idx})
    OR (
      a.status = 'confirmed'
      AND (
        a.doctor_id = $${idx}
        OR a.confirmed_by = $${idx}
        OR a.confirmed_by_email = $${emailIdx}
        OR a.confirmed_by = $${emailIdx}
      )
    )
    OR (a.status = 'awaiting_doctor_response' AND a.doctor_id = $${idx})
  )`;
  return { clause, extraParams: [doctorId, doctorEmail || ''] };
}

function toPoolAccessRow(apt) {
  return {
    status: apt.status,
    doctor_id: apt.doctorId || apt.doctor_id || apt.assignedDoctorId,
    confirmed_by: apt.confirmedBy || apt.acceptedBy,
    confirmed_by_email: apt.confirmedByEmail || apt.acceptedByEmail,
  };
}

function isVisibleToDoctorInQueue(apt, { isAdmin, doctorId, doctorEmail } = {}) {
  if (isAdmin) return true;
  const unassigned = !apt.doctorId && !apt.doctor_id && !apt.assignedDoctorId;
  if (unassigned) return true;
  return matchesDoctorPoolAccess(toPoolAccessRow(apt), { doctorId, doctorEmail });
}

function confirmedTimestamp(apt) {
  return apt.confirmedAt || apt.confirmed_at || apt.acceptedAt || apt.updatedAt || apt.updated_at;
}

/**
 * Client-side queue visibility for Health Meeting pending + accepted sections.
 */
function splitQueueSections(appointments, ctx = {}) {
  const pendingStatuses = new Set([...PENDING_POOL_STATUSES, 'assigned']);
  const pending = [];
  const accepted = [];
  const seenPending = new Set();
  const seenAccepted = new Set();

  for (const apt of appointments || []) {
    const id = apt.id || apt.appointmentId;
    if (!id) continue;

    const visible = isVisibleToDoctorInQueue(apt, ctx);

    if (pendingStatuses.has(apt.status) && visible && !seenPending.has(id)) {
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

module.exports = {
  PENDING_POOL_STATUSES,
  ACCEPTED_POOL_STATUSES,
  ACCEPTED_VISIBILITY_DAYS,
  buildPoolStatusList,
  isSameUtcDay,
  isWithinAcceptedWindow,
  matchesPoolFilter,
  mergePoolItemsById,
  matchesDoctorPoolAccess,
  buildDoctorPoolSqlFilter,
  splitQueueSections,
};
