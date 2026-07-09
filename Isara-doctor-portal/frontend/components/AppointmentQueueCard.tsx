/**
 * Rich appointment queue card — patient booking details + pool actions
 */
import React from 'react';
import { CalendarIcon } from '../assets/NewSvgIcons';

export interface QueueRequest {
  id: string;
  patientId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  urgency?: string;
  status?: string;
  reason?: string;
  symptomDescription?: string;
  requestedDate?: string;
  preferredTime?: string;
  preferredDates?: string[];
  requiredSpecialty?: string;
  suggestedSpecialty?: string;
  preferredTimeSlot?: string;
  appointmentType?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  createdAt?: string;
  aiMatchReason?: string;
  poolStatus?: string;
}

interface AppointmentQueueCardProps {
  request: QueueRequest;
  isAdmin?: boolean;
  canConfirm?: boolean;
  onConfirm?: () => void;
  onAssign?: () => void;
  onDecline?: () => void;
  onContact?: () => void;
  onClaim?: () => void;
  onAiMatch?: () => void;
  children?: React.ReactNode;
}

function urgencyBadge(urgency?: string) {
  const u = (urgency || 'normal').toLowerCase();
  if (u === 'urgent' || u === 'stat') return 'bg-red-100 text-red-800';
  if (u === 'high') return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-700';
}

export function AppointmentQueueCard({
  request,
  isAdmin,
  canConfirm,
  onConfirm,
  onAssign,
  onDecline,
  onContact,
  onClaim,
  onAiMatch,
  children,
}: AppointmentQueueCardProps) {
  const preferredDates = request.preferredDates || [];
  const showPoolActions = request.status === 'in_pool' || request.status === 'pending';

  return (
    <div
      data-testid={`queue-item-${request.id}`}
      data-queue-status={request.status || 'pending'}
      className="border-2 rounded-xl p-4 border-amber-200 bg-amber-50/40"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-lg">👤</div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{request.patientName}</h3>
              <div className="text-sm text-gray-600">
                {request.patientEmail || 'No email'}
                {request.patientPhone && ` • ${request.patientPhone}`}
              </div>
            </div>
            <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold uppercase ${urgencyBadge(request.urgency)}`}>
              {request.urgency || 'normal'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-semibold text-blue-900 flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" /> Preferred dates
              </div>
              <p className="text-blue-700 mt-1">
                {preferredDates.length > 0
                  ? preferredDates.slice(0, 3).map((d) => d.split('T')[0]).join(', ')
                  : request.requestedDate?.split('T')[0] || 'Flexible'}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-semibold text-purple-900">Time slot</div>
              <p className="text-purple-700 mt-1">{request.preferredTimeSlot || request.preferredTime || 'Any'}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg">
              <div className="font-semibold text-emerald-900">Specialty</div>
              <p className="text-emerald-700 mt-1">{request.requiredSpecialty || request.suggestedSpecialty || 'General'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-semibold text-gray-900">Type</div>
              <p className="text-gray-700 mt-1">
                {request.appointmentType === 'telehealth' ? '📹 Telehealth' : '🏥 In-person'}
              </p>
            </div>
          </div>

          {(request.reason || request.symptomDescription) && (
            <div className="bg-gray-50 p-3 rounded-lg mb-3 text-sm text-gray-700">
              <span className="font-semibold">Reason: </span>
              {request.reason || String(request.symptomDescription).slice(0, 300)}
            </div>
          )}

          {request.poolStatus === 'ai_matched' && request.aiMatchReason && (
            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
              🤖 AI match: {request.aiMatchReason}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 rounded-full bg-white border">{request.status?.replaceAll('_', ' ')}</span>
            {request.assignedDoctorName && <span>Assigned: Dr. {request.assignedDoctorName}</span>}
            {request.createdAt && <span>Requested: {new Date(request.createdAt).toLocaleDateString()}</span>}
            <span className="sr-only">Appointment ID: {request.id}</span>
            <span data-appointment-id={request.id} className="text-gray-400">{request.id}</span>
          </div>

          {children}
        </div>

        <div className="flex flex-col gap-2 min-w-[160px]">
          {canConfirm && onConfirm && (
            <button type="button" data-testid="queue-confirm-btn" onClick={onConfirm} className="px-4 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm">
              ✓ Confirm
            </button>
          )}
          {showPoolActions && onClaim && (
            <button type="button" data-testid="queue-claim-btn" onClick={onClaim} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
              ✋ Claim
            </button>
          )}
          {showPoolActions && onAiMatch && (
            <button type="button" data-testid="queue-ai-match-btn" onClick={onAiMatch} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
              🤖 AI Match
            </button>
          )}
          {isAdmin && onAssign && (
            <button type="button" data-testid="queue-assign-btn" onClick={onAssign} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
              👨‍⚕️ Assign
            </button>
          )}
          {onDecline && (
            <button type="button" data-testid="queue-decline-btn" onClick={onDecline} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
              ✗ Decline
            </button>
          )}
          {onContact && (
            <button type="button" data-testid="queue-contact-btn" onClick={onContact} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
              ✉️ Contact
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppointmentQueueCard;
