/**
 * MCP Context Service
 *
 * Client-side service for interacting with the OpenClaw MCP Server (port 3016)
 * and the Omnichannel Webhook Server consent API (port 3015).
 *
 * Provides:
 *  - Patient session context retrieval
 *  - Care-team brief generation and Telegram dispatch
 *  - Referral document generation
 *  - PDPA consent management (check / revoke)
 */

import { config } from './config';

// ─── Base URLs ───────────────────────────────────────────────────────────────
// In production these are proxied by Nginx; in dev they hit the local servers.

const MCP_BASE = config.mcp?.url || '/mcp';
const WEBHOOK_BASE = config.omnichannel?.webhookUrl || '/omnichannel';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MCPVitalSigns {
  temperature?: number | null;
  heartRate?: number | null;
  bloodPressure?: string | null;
  oxygenSaturation?: number | null;
}

export interface MCPHPI {
  onset?: string | null;
  duration?: string | null;
  severity?: string | null;
  associatedFactors?: string[];
}

export interface MCPInvestigation {
  name: string;
  type: 'lab' | 'radiology' | 'pathology';
  orderedAt: string;
  status: 'pending' | 'completed';
  result?: string;
}

export interface MCPAssessment {
  icd10?: string;
  description: string;
  confidence?: number;
  timestamp: string;
}

export interface MCPRawMessage {
  messageId?: string;
  channel: string;
  text: string;
  timestamp: string;
}

export interface MCPSession {
  patientId: string;
  channel: string;
  symptoms: string[];
  vitalSigns: MCPVitalSigns;
  historyOfPresentIllness: MCPHPI;
  medications: string[];
  allergies: string[];
  chronicConditions: string[];
  investigations: MCPInvestigation[];
  assessments: MCPAssessment[];
  messages: MCPRawMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface MCPSessionSummary {
  patientId: string;
  channel: string;
  symptomCount: number;
  messageCount: number;
  updatedAt: string;
}

export interface ReferralDocument {
  referralDate: string;
  patientId: string;
  targetFacility: string;
  reasonForReferral: string;
  clinicalSummary: string;
  currentMedications: string[];
  allergies: string[];
  investigationsPerformed: MCPInvestigation[];
  urgency: 'routine' | 'urgent' | 'emergency';
  requestedBy?: string;
}

export interface ConsentRecord {
  userId: string;
  channel: string;
  consentedAt: string;
  pdpaVersion: string;
  scope: string[];
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function mcpFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${MCP_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MCP API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

async function webhookFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${WEBHOOK_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Webhook API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── MCP Context API ──────────────────────────────────────────────────────────

/**
 * Retrieve the full MCP session context for a patient.
 */
export async function getPatientContext(patientId: string): Promise<MCPSession> {
  const data = await mcpFetch<{ success: boolean; context: MCPSession }>(
    `/context/${encodeURIComponent(patientId)}`
  );
  return data.context;
}

/**
 * List all active MCP session summaries.
 */
export async function getActiveSessions(): Promise<MCPSessionSummary[]> {
  const data = await mcpFetch<{ success: boolean; sessions: MCPSessionSummary[] }>('/sessions');
  return data.sessions;
}

/**
 * Request a care-team brief for a patient and dispatch it to Telegram.
 *
 * @param patientId  - MCP patient ID (e.g. "line_Uxxx")
 * @param question   - Specific consult question from the doctor
 * @param requestedBy - Doctor's display name (for Telegram message attribution)
 */
export async function requestTeamBrief(
  patientId: string,
  question: string,
  requestedBy: string
): Promise<{ brief: string }> {
  return mcpFetch<{ success: boolean; brief: string }>(
    `/team-brief/${encodeURIComponent(patientId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ question, requestedBy })
    }
  );
}

/**
 * Generate a referral document for a patient from their MCP context.
 *
 * @param patientId      - MCP patient ID
 * @param targetFacility - Name of the receiving facility
 * @param requestedBy    - Doctor's display name
 */
export async function generateReferral(
  patientId: string,
  targetFacility: string,
  requestedBy: string
): Promise<ReferralDocument> {
  const data = await mcpFetch<{ success: boolean; referral: ReferralDocument }>(
    `/referral/${encodeURIComponent(patientId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ targetFacility, requestedBy })
    }
  );
  return data.referral;
}

/**
 * Delete a patient's MCP session (used on consent revocation).
 */
export async function deleteMCPSession(patientId: string): Promise<void> {
  await mcpFetch(`/context/${encodeURIComponent(patientId)}`, { method: 'DELETE' });
}

// ─── Consent API ──────────────────────────────────────────────────────────────

/**
 * Check PDPA consent status for a channel user.
 */
export async function checkConsent(
  channel: string,
  userId: string
): Promise<{ userId: string; channel: string; consented: boolean }> {
  return webhookFetch<{ userId: string; channel: string; consented: boolean }>(
    `/api/consent/${encodeURIComponent(channel)}/${encodeURIComponent(userId)}`
  );
}

/**
 * Revoke PDPA consent for a channel user.
 * This also purges their MCP session context.
 */
export async function revokeConsent(channel: string, userId: string): Promise<void> {
  await webhookFetch(
    `/api/consent/${encodeURIComponent(channel)}/${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export const mcpContextService = {
  getPatientContext,
  getActiveSessions,
  requestTeamBrief,
  generateReferral,
  deleteMCPSession,
  checkConsent,
  revokeConsent
};

export default mcpContextService;
