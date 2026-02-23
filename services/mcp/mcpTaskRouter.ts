/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — MCP Task Router
 * ═══════════════════════════════════════════════════════════════════════
 * Routes clinical tasks (1–5) through the MCP protocol for execution.
 * Maps doctor AI task types to structured API calls.
 * ═══════════════════════════════════════════════════════════════════════
 */

export type ClinicalTaskType =
  | 'history_taking'
  | 'physical_exam'
  | 'team_consult'
  | 'investigation_request'
  | 'prescription'
  | 'follow_up'
  | 'referral';

export interface ClinicalTask {
  type: ClinicalTaskType;
  patientId: string;
  requestedBy: string;
  channel: string;
  data: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
}

export interface TaskResult {
  success: boolean;
  taskId?: string;
  type: ClinicalTaskType;
  data?: Record<string, unknown>;
  error?: string;
  statusCode: number;
}

const TASK_TO_DOCTOR_AI_MAP: Record<ClinicalTaskType, number> = {
  history_taking: 1,
  physical_exam: 1,
  team_consult: 2,
  investigation_request: 3,
  prescription: 4,
  follow_up: 4,
  referral: 5,
};

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export function mapTaskToDoctorAI(taskType: ClinicalTaskType): number {
  const mapping = TASK_TO_DOCTOR_AI_MAP[taskType];
  if (mapping === undefined) {
    throw new Error(`Unknown task type: ${taskType}`);
  }
  return mapping;
}

export function validateClinicalTask(task: Partial<ClinicalTask>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!task.type || typeof task.type !== 'string') {
    errors.push('Task type is required');
  } else if (!Object.keys(TASK_TO_DOCTOR_AI_MAP).includes(task.type)) {
    errors.push(`Invalid task type: ${task.type}`);
  }

  if (!task.patientId || typeof task.patientId !== 'string') {
    errors.push('Patient ID is required');
  }

  if (!task.requestedBy || typeof task.requestedBy !== 'string') {
    errors.push('Requested by (doctor ID) is required');
  }

  if (!task.channel || typeof task.channel !== 'string') {
    errors.push('Channel is required');
  }

  if (task.priority && !VALID_PRIORITIES.includes(task.priority as typeof VALID_PRIORITIES[number])) {
    errors.push(`Invalid priority: ${task.priority}`);
  }

  return { valid: errors.length === 0, errors };
}

export function createClinicalTask(
  type: ClinicalTaskType,
  patientId: string,
  requestedBy: string,
  channel: string,
  data: Record<string, unknown> = {},
  priority: ClinicalTask['priority'] = 'medium',
): ClinicalTask {
  const validation = validateClinicalTask({ type, patientId, requestedBy, channel, priority });
  if (!validation.valid) {
    throw new Error(`Invalid task: ${validation.errors.join(', ')}`);
  }

  return {
    type,
    patientId,
    requestedBy,
    channel,
    data,
    priority,
    createdAt: new Date().toISOString(),
  };
}

export function buildTaskPayload(task: ClinicalTask): Record<string, unknown> {
  return {
    task_type: task.type,
    doctor_ai_task: mapTaskToDoctorAI(task.type),
    patient_id: task.patientId,
    requested_by: task.requestedBy,
    channel: task.channel,
    data: task.data,
    priority: task.priority,
    created_at: task.createdAt,
  };
}

export function parseTaskResult(
  statusCode: number,
  body: Record<string, unknown> | null,
  taskType: ClinicalTaskType,
): TaskResult {
  if (statusCode === 0 || body === null) {
    return {
      success: false,
      type: taskType,
      error: 'Task service unreachable',
      statusCode: 502,
    };
  }

  if (statusCode >= 200 && statusCode < 300) {
    return {
      success: true,
      taskId: body.task_id as string | undefined,
      type: taskType,
      data: (body.result as Record<string, unknown>) || body,
      statusCode,
    };
  }

  if (statusCode === 422) {
    return {
      success: false,
      type: taskType,
      error: (body.error as string) || 'Task validation failed',
      statusCode,
    };
  }

  return {
    success: false,
    type: taskType,
    error: (body.error as string) || `Task failed with status ${statusCode}`,
    statusCode,
  };
}
