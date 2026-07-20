/**
 * Shared state between serial Playwright groups (D → E → F).
 * Persisted to disk so E uses the appointment created in D.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface WorkflowState {
  appointmentId?: string;
  meetingId?: string;
  roomName?: string;
  patientId?: string;
  doctorId?: string;
  labOrderId?: string;
  recordingUrl?: string;
  offlineAppointmentId?: string;
  /** Symptom text from booking (G7 queue visibility) */
  symptomText?: string;
}

// Keep cloud and local D → E → F chains independent when both suites run concurrently.
// Preserve the canonical filename for local scripts that clear/inspect this artifact.
const STATE_FILENAME = process.env.TEST_ENV === 'cloud'
  ? '.workflow-state.cloud.json'
  : '.workflow-state.json';
const STATE_PATH = path.resolve(__dirname, '..', 'e2e', STATE_FILENAME);

let memoryCache: WorkflowState | null = null;

function readDiskState(): WorkflowState {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) as WorkflowState;
    }
  } catch { /* ignore */ }
  return {};
}

function writeDiskState(state: WorkflowState): void {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  const payload = JSON.stringify(state, null, 2);
  const fd = fs.openSync(STATE_PATH, 'w');
  try {
    fs.writeFileSync(fd, payload);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

/** Force disk re-read (Playwright project workers do not share module memory). */
export function reloadWorkflowStateFromDisk(): WorkflowState {
  memoryCache = readDiskState();
  return { ...memoryCache };
}

export function loadWorkflowState(): WorkflowState {
  const disk = readDiskState();
  memoryCache = { ...disk, ...(memoryCache || {}) };
  return { ...memoryCache };
}

export function saveWorkflowState(patch: WorkflowState): WorkflowState {
  const disk = readDiskState();
  const next = { ...disk, ...patch };
  if (patch.recordingUrl === '' || patch.recordingUrl === null) {
    delete next.recordingUrl;
  }
  // Keep Q lifecycle keys when D patches only offline/symptom fields after a meeting ran.
  if (
    disk.meetingId &&
    disk.recordingUrl &&
    !patch.meetingId &&
    !patch.recordingUrl &&
    (patch.offlineAppointmentId || patch.symptomText || (patch.appointmentId && patch.appointmentId !== disk.appointmentId))
  ) {
    next.meetingId = disk.meetingId;
    next.recordingUrl = disk.recordingUrl;
    next.appointmentId = disk.appointmentId;
    if (disk.roomName) next.roomName = disk.roomName;
  }
  memoryCache = next;
  writeDiskState(next);
  return next;
}

export function clearWorkflowState(): void {
  memoryCache = {};
  try {
    if (fs.existsSync(STATE_PATH)) fs.unlinkSync(STATE_PATH);
  } catch { /* ignore */ }
}
