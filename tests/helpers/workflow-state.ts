/**
 * Shared state between serial Playwright groups (D → E → F).
 * Persisted to disk so E uses the appointment created in D.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WorkflowState {
  appointmentId?: string;
  meetingId?: string;
  roomName?: string;
  patientId?: string;
  doctorId?: string;
  labOrderId?: string;
  recordingUrl?: string;
  /** Symptom text from booking (G7 queue visibility) */
  symptomText?: string;
}

// Use process.cwd() so all projects and transpiled workers share one canonical file.
const STATE_PATH = path.join(process.cwd(), 'tests', 'e2e', '.workflow-state.json');

export function loadWorkflowState(): WorkflowState {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) as WorkflowState;
    }
  } catch { /* ignore */ }
  return {};
}

export function saveWorkflowState(patch: WorkflowState): WorkflowState {
  const next = { ...loadWorkflowState(), ...patch };
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
  return next;
}

export function clearWorkflowState(): void {
  try {
    if (fs.existsSync(STATE_PATH)) fs.unlinkSync(STATE_PATH);
  } catch { /* ignore */ }
}
