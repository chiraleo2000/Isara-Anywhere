/**
 * Lab orders — PostgreSQL API client (replaces mock clinicalDataService reads).
 */

export interface LabOrderRecord {
  id: string;
  patientId: string;
  doctorId?: string;
  status: string;
  tests: unknown;
  urgency?: string;
  notes?: string;
  orderDate?: string;
  results?: unknown;
  aiAnalysis?: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchLabOrdersByPatient(patientId: string): Promise<LabOrderRecord[]> {
  const resp = await fetch(`/api/lab-orders/patient/${encodeURIComponent(patientId)}`, {
    headers: authHeaders(),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  const rows = Array.isArray(data) ? data : data.labOrders || data.orders || [];
  return rows.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    patientId: String(row.patient_id || row.patientId || patientId),
    doctorId: row.doctor_id as string | undefined,
    status: String(row.status || 'ordered'),
    tests: row.tests,
    urgency: row.urgency_level as string | undefined,
    notes: row.notes as string | undefined,
    orderDate: (row.ordered_date || row.ordered_at || row.created_at) as string | undefined,
    results: row.results,
    aiAnalysis: row.ai_analysis as string | undefined,
  }));
}

export async function createLabOrder(body: Record<string, unknown>): Promise<Response> {
  return fetch('/api/lab-orders', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}
