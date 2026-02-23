/**
 * OmnichannelMonitor — React Component
 *
 * Healthcare Team monitoring panel for omnichannel patient messages.
 *
 * Features:
 *  - Real-time live message feed (Socket.io)
 *  - Channel filter bar (LINE / WhatsApp / Telegram / All)
 *  - Patient context panel — shows parsed MCP data (symptoms, HPI, meds)
 *  - AI Action panel — approve / reject AI-suggested prescriptions & lab orders
 *  - Reply composer — send message via patient's channel
 *  - Consent status badges
 *  - RBAC guard (roles: doctor, nurse, admin)
 *
 * Responsive layout:
 *  - Desktop: two-column (feed | context + actions)
 *  - Tablet:  tabbed (Messages | Context | Actions)
 *  - Mobile:  stacked single-column
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  omnichannelService,
  subscribeToMessages,
  replyToPatient,
  getSessions,
  type OmnichannelMessage,
  type OmnichannelSession,
  type OmnichannelChannel,
  CHANNEL_LABELS,
  CHANNEL_COLORS
} from '../services/omnichannelService';
import {
  getPatientContext,
  requestTeamBrief,
  generateReferral,
  type MCPSession
} from '../services/mcpContextService';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ChannelBadgeProps {
  channel: OmnichannelChannel;
}

function ChannelBadge({ channel }: ChannelBadgeProps) {
  const color = CHANNEL_COLORS[channel] || '#6B7280';
  const label = CHANNEL_LABELS[channel] || channel;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

interface ConsentBadgeProps {
  status?: 'consented' | 'pending' | 'revoked';
}

function ConsentBadge({ status }: ConsentBadgeProps) {
  const map = {
    consented: { label: 'Consented ✓', className: 'bg-green-100 text-green-800' },
    pending: { label: 'Consent Pending ⏳', className: 'bg-yellow-100 text-yellow-800' },
    revoked: { label: 'Consent Revoked ✗', className: 'bg-red-100 text-red-800' }
  };
  const config = map[status ?? 'pending'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

// ─── Channel Filter Bar ────────────────────────────────────────────────────────

interface ChannelFilterBarProps {
  activeChannel: OmnichannelChannel;
  onChange: (channel: OmnichannelChannel) => void;
}

function ChannelFilterBar({ activeChannel, onChange }: ChannelFilterBarProps) {
  const channels: OmnichannelChannel[] = ['all', 'line', 'whatsapp', 'telegram', 'messages'];
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {channels.map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => onChange(ch)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeChannel === ch
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {CHANNEL_LABELS[ch]}
        </button>
      ))}
    </div>
  );
}

// ─── Message Feed ─────────────────────────────────────────────────────────────

interface MessageFeedProps {
  messages: OmnichannelMessage[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
}

function MessageFeed({ messages, selectedPatientId, onSelectPatient }: MessageFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <p className="text-lg">No messages yet</p>
        <p className="text-sm">Waiting for patient messages…</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full space-y-2 pr-1">
      {messages.map((msg) => (
        <button
          key={msg.id}
          type="button"
          onClick={() => onSelectPatient(msg.patientId)}
          className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
            selectedPatientId === msg.patientId
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <ChannelBadge channel={msg.channel} />
                <ConsentBadge status={msg.consentStatus} />
                {msg.direction === 'inbound' && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="New inbound message" />
                )}
              </div>
              <p className="text-sm text-gray-800 truncate">{msg.text}</p>
              {msg.entities?.symptoms && msg.entities.symptoms.length > 0 && (
                <p className="text-xs text-blue-600 mt-0.5">
                  🔬 {msg.entities.symptoms.slice(0, 3).join(', ')}
                  {msg.entities.symptoms.length > 3 && ` +${msg.entities.symptoms.length - 3} more`}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate">ID: {msg.patientId}</p>
        </button>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Patient Context Panel ────────────────────────────────────────────────────

interface PatientContextPanelProps {
  patientId: string | null;
  context: MCPSession | null;
  loading: boolean;
}

function PatientContextPanel({ patientId, context, loading }: PatientContextPanelProps) {
  if (!patientId) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Select a patient to view their clinical context
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-full" />
        ))}
      </div>
    );
  }

  if (!context) {
    return (
      <div className="text-sm text-gray-500">No context found for patient {patientId}</div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="font-semibold text-gray-700 mb-1">Symptoms</h4>
        {context.symptoms.length > 0 ? (
          <ul className="list-disc list-inside text-gray-600 space-y-0.5">
            {context.symptoms.map((s) => <li key={s}>{s}</li>)}
          </ul>
        ) : (
          <p className="text-gray-400 italic">None recorded</p>
        )}
      </div>

      {Object.keys(context.vitalSigns).some((k) => context.vitalSigns[k as keyof typeof context.vitalSigns] !== null) && (
        <div>
          <h4 className="font-semibold text-gray-700 mb-1">Vital Signs</h4>
          <div className="grid grid-cols-2 gap-1 text-gray-600">
            {context.vitalSigns.temperature != null && (
              <span>🌡 {context.vitalSigns.temperature}°C</span>
            )}
            {context.vitalSigns.heartRate != null && (
              <span>❤ {context.vitalSigns.heartRate} bpm</span>
            )}
            {context.vitalSigns.bloodPressure != null && (
              <span>💉 {context.vitalSigns.bloodPressure}</span>
            )}
            {context.vitalSigns.oxygenSaturation != null && (
              <span>🫁 SpO₂ {context.vitalSigns.oxygenSaturation}%</span>
            )}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold text-gray-700 mb-1">Current Medications</h4>
        {context.medications.length > 0 ? (
          <p className="text-gray-600">{context.medications.join(', ')}</p>
        ) : (
          <p className="text-gray-400 italic">None recorded</p>
        )}
      </div>

      <div>
        <h4 className="font-semibold text-gray-700 mb-1">Allergies</h4>
        {context.allergies.length > 0 ? (
          <p className="text-red-600">{context.allergies.join(', ')}</p>
        ) : (
          <p className="text-gray-400 italic">NKDA</p>
        )}
      </div>

      {context.historyOfPresentIllness?.onset && (
        <div>
          <h4 className="font-semibold text-gray-700 mb-1">History of Present Illness</h4>
          <div className="text-gray-600 space-y-0.5">
            {context.historyOfPresentIllness.onset && <p>Onset: {context.historyOfPresentIllness.onset}</p>}
            {context.historyOfPresentIllness.duration && <p>Duration: {context.historyOfPresentIllness.duration}</p>}
            {context.historyOfPresentIllness.severity && <p>Severity: {context.historyOfPresentIllness.severity}</p>}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">Last updated: {new Date(context.updatedAt).toLocaleString('th-TH')}</p>
    </div>
  );
}

// ─── AI Action Panel ──────────────────────────────────────────────────────────

interface AIActionPanelProps {
  patientId: string | null;
  userRole: string;
  onTeamBrief: (patientId: string) => void;
  onReferral: (patientId: string) => void;
}

function AIActionPanel({ patientId, userRole, onTeamBrief, onReferral }: AIActionPanelProps) {
  const canApprove = userRole === 'doctor' || userRole === 'admin';
  const canConsult = userRole === 'doctor' || userRole === 'nurse' || userRole === 'admin';

  if (!patientId) return null;

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-700 text-sm">AI Actions</h4>

      {canConsult && (
        <button
          type="button"
          onClick={() => onTeamBrief(patientId)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors"
        >
          📋 Request Team Consult (Telegram)
        </button>
      )}

      {canApprove && (
        <button
          type="button"
          onClick={() => onReferral(patientId)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition-colors"
        >
          📄 Generate Referral Package
        </button>
      )}
    </div>
  );
}

// ─── Reply Composer ────────────────────────────────────────────────────────────

interface ReplyComposerProps {
  patientId: string | null;
  channel: OmnichannelChannel | null;
  onSent: (text: string) => void;
}

function ReplyComposer({ patientId, channel, onSent }: ReplyComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    if (!patientId || !channel || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await replyToPatient({ patientId, channel, text: text.trim() });
      setText('');
      onSent(text);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }, [patientId, channel, text, onSent]);

  if (!patientId) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-gray-700 text-sm">Reply to Patient</h4>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={`Message via ${channel ? CHANNEL_LABELS[channel] : 'channel'}…`}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sending}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// ─── Main OmnichannelMonitor Component ────────────────────────────────────────

interface OmnichannelMonitorProps {
  /** Current user's role — used for RBAC gating of AI actions */
  userRole: 'doctor' | 'nurse' | 'admin';
  /** Current user's display name — used for Telegram attribution */
  userName?: string;
}

export default function OmnichannelMonitor({ userRole, userName = 'Care Team Member' }: OmnichannelMonitorProps) {
  const [activeChannel, setActiveChannel] = useState<OmnichannelChannel>('all');
  const [messages, setMessages] = useState<OmnichannelMessage[]>([]);
  const [sessions, setSessions] = useState<OmnichannelSession[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<OmnichannelChannel | null>(null);
  const [context, setContext] = useState<MCPSession | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'context' | 'actions'>('messages');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(true);

  // ── Load initial sessions ──────────────────────────────────────────────────
  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => setServiceAvailable(false));
  }, []);

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToMessages((msg: OmnichannelMessage) => {
      setMessages((prev) => {
        // Deduplicate by id
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [msg, ...prev].slice(0, 200); // keep last 200
      });
    });
    return unsubscribe;
  }, []);

  // ── Channel filter ────────────────────────────────────────────────────────
  const filteredMessages = activeChannel === 'all'
    ? messages
    : messages.filter((m) => m.channel === activeChannel);

  // ── Patient selection → load MCP context ─────────────────────────────────
  const handleSelectPatient = useCallback(async (patientId: string) => {
    setSelectedPatientId(patientId);
    const msg = messages.find((m) => m.patientId === patientId);
    setSelectedChannel(msg?.channel ?? null);
    setActiveTab('context');
    setContextLoading(true);
    setContext(null);
    try {
      const ctx = await getPatientContext(patientId);
      setContext(ctx);
    } catch {
      setContext(null);
    } finally {
      setContextLoading(false);
    }
  }, [messages]);

  // ── Team brief ─────────────────────────────────────────────────────────────
  const handleTeamBrief = useCallback(async (patientId: string) => {
    setStatusMessage('Generating team brief and sending to Telegram…');
    try {
      const question = window.prompt('Consult question (optional):') ?? '';
      await requestTeamBrief(patientId, question, userName);
      setStatusMessage('✅ Team brief sent to Telegram care-team group');
    } catch (err: unknown) {
      setStatusMessage(`❌ ${err instanceof Error ? err.message : 'Failed to send team brief'}`);
    }
    setTimeout(() => setStatusMessage(null), 5000);
  }, [userName]);

  // ── Referral ───────────────────────────────────────────────────────────────
  const handleReferral = useCallback(async (patientId: string) => {
    const facility = window.prompt('Receiving facility name:');
    if (!facility) return;
    setStatusMessage('Generating referral document…');
    try {
      const referral = await generateReferral(patientId, facility, userName);
      console.log('[OmnichannelMonitor] Referral generated:', referral);
      setStatusMessage(`✅ Referral created for ${facility} — check patient records`);
    } catch (err: unknown) {
      setStatusMessage(`❌ ${err instanceof Error ? err.message : 'Failed to generate referral'}`);
    }
    setTimeout(() => setStatusMessage(null), 5000);
  }, [userName]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Omnichannel Monitor</h2>
            <p className="text-xs text-gray-500">
              {sessions.length} active sessions · Real-time patient messages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${serviceAvailable ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-500">
              {serviceAvailable ? 'Online' : 'Service unavailable'}
            </span>
          </div>
        </div>

        {!serviceAvailable && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            ⚠️ Omnichannel service is unavailable. Please check the webhook server.
          </div>
        )}

        {statusMessage && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Channel filter */}
      <div className="px-4 pt-3">
        <ChannelFilterBar activeChannel={activeChannel} onChange={setActiveChannel} />
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Desktop: two-column layout ── */}
        <div className="hidden lg:flex flex-1 gap-0 overflow-hidden">
          {/* Left: message feed */}
          <div className="w-1/2 xl:w-3/5 border-r border-gray-200 p-3 overflow-hidden flex flex-col">
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Messages ({filteredMessages.length})
            </p>
            <div className="flex-1 overflow-hidden">
              <MessageFeed
                messages={filteredMessages}
                selectedPatientId={selectedPatientId}
                onSelectPatient={handleSelectPatient}
              />
            </div>
          </div>

          {/* Right: context + actions + reply */}
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">
                {selectedPatientId ? `Patient Context — ${selectedPatientId}` : 'Patient Context'}
              </h3>
              <PatientContextPanel
                patientId={selectedPatientId}
                context={context}
                loading={contextLoading}
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <AIActionPanel
                patientId={selectedPatientId}
                userRole={userRole}
                onTeamBrief={handleTeamBrief}
                onReferral={handleReferral}
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <ReplyComposer
                patientId={selectedPatientId}
                channel={selectedChannel}
                onSent={(text) => console.log('[OmnichannelMonitor] Reply sent:', text)}
              />
            </div>
          </div>
        </div>

        {/* ── Mobile/Tablet: tabbed layout ── */}
        <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-200 bg-white">
            {(['messages', 'context', 'actions'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 p-3 overflow-y-auto">
            {activeTab === 'messages' && (
              <MessageFeed
                messages={filteredMessages}
                selectedPatientId={selectedPatientId}
                onSelectPatient={handleSelectPatient}
              />
            )}
            {activeTab === 'context' && (
              <PatientContextPanel
                patientId={selectedPatientId}
                context={context}
                loading={contextLoading}
              />
            )}
            {activeTab === 'actions' && (
              <div className="space-y-4">
                <AIActionPanel
                  patientId={selectedPatientId}
                  userRole={userRole}
                  onTeamBrief={handleTeamBrief}
                  onReferral={handleReferral}
                />
                <ReplyComposer
                  patientId={selectedPatientId}
                  channel={selectedChannel}
                  onSent={(text) => console.log('[OmnichannelMonitor] Reply sent:', text)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
