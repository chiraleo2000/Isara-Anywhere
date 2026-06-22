/**
 * Complete Schedule Management
 * Calendar view with appointments — PostgreSQL-backed
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { fetchAllAppointments } from '../../services/apiDataService';
import { resolveAppointmentSchedule } from '../../utils/appointmentSchedule';

type MonthCell = { day: number | null; dateStr: string | null; cellKey: string };

const appointmentStatusClasses: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  assigned: 'bg-amber-100 text-amber-700',
};
const getAppointmentStatusClass = (status: string) => appointmentStatusClasses[status] || 'bg-blue-100 text-blue-700';

const getViewButtonClass = (isActive: boolean, isDark: boolean): string => {
  if (isActive) return 'bg-emerald-600 text-white';
  return isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
};

function coerceString(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function matchesDoctor(apt: Record<string, unknown>, doctorId: string): boolean {
  return (
    apt.doctorId === doctorId ||
    apt.doctor_id === doctorId ||
    apt.assignedDoctorId === doctorId ||
    apt.assigned_doctor_id === doctorId ||
    apt.adminAssignedDoctorId === doctorId ||
    apt.admin_assigned_doctor_id === doctorId
  );
}

function aptPatientName(apt: Record<string, unknown>): string {
  return coerceString(apt.patientName ?? apt.patient_name, 'Patient');
}

function aptMeetingLink(apt: Record<string, unknown>): string | null {
  const link = apt.meetingLink ?? apt.meeting_link ?? apt.meet_link;
  return typeof link === 'string' && link.length > 0 ? link : null;
}

function aptReason(apt: Record<string, unknown>): string {
  return coerceString(apt.reason ?? apt.chief_complaint ?? apt.symptom_description, 'General consultation');
}

function aptStatus(apt: Record<string, unknown>): string {
  return coerceString(apt.status, '');
}

function aptId(apt: Record<string, unknown>): string {
  return coerceString(apt.id, '');
}

function aptDuration(apt: Record<string, unknown>): string {
  return coerceString(apt.duration, '30');
}

function getAppointmentCardClass(variant: 'today' | 'upcoming', isDark: boolean): string {
  if (variant === 'today') {
    return 'p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200';
  }
  const hover = isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100';
  const surface = isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200';
  return `p-4 rounded-lg border transition-colors ${surface} ${hover}`;
}

function getTimeDisplayClass(variant: 'today' | 'upcoming', isDark: boolean): string {
  if (variant === 'today') return 'font-semibold text-lg text-gray-900';
  return `font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`;
}

function getMonthDayCellClass(isToday: boolean, isDark: boolean): string {
  if (isToday) return 'bg-emerald-500 text-white font-bold';
  if (isDark) return 'text-gray-300 hover:bg-gray-700';
  return 'text-gray-700 hover:bg-gray-50';
}

function buildMonthGrid(year: number, month: number): MonthCell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: MonthCell[] = [];
  for (let pad = 0; pad < firstDay; pad++) {
    cells.push({ day: null, dateStr: null, cellKey: `schedule-pad-${year}-${month + 1}-${pad}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr, cellKey: dateStr });
  }
  return cells;
}

function isActiveAppointment(apt: Record<string, unknown>): boolean {
  return ['confirmed', 'scheduled'].includes(aptStatus(apt));
}

function filterDoctorAppointments(
  allAppointments: Record<string, unknown>[] | null | undefined,
  doctorId: string,
): Record<string, unknown>[] {
  return (allAppointments || []).filter(
    (apt) => matchesDoctor(apt, doctorId) && isActiveAppointment(apt),
  );
}

function partitionAppointments(appointments: Record<string, unknown>[], todayStr: string) {
  const todayAppointments = appointments.filter((apt) => resolveAppointmentSchedule(apt).date === todayStr);
  const upcomingAppointments = appointments
    .filter((apt) => resolveAppointmentSchedule(apt).date > todayStr)
    .sort((a, b) => resolveAppointmentSchedule(a).date.localeCompare(resolveAppointmentSchedule(b).date));
  return { todayAppointments, upcomingAppointments };
}

function AppointmentCard({ apt, variant, isDark }: Readonly<{
  apt: Record<string, unknown>;
  variant: 'today' | 'upcoming';
  isDark: boolean;
}>) {
  const { date, time } = resolveAppointmentSchedule(apt);
  const meetingLink = aptMeetingLink(apt);
  const id = aptId(apt);
  const status = aptStatus(apt);

  return (
    <div data-testid={`schedule-appointment-${id}`} className={getAppointmentCardClass(variant, isDark)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {variant === 'upcoming' && (
              <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>📅 {date}</div>
            )}
            <div className={getTimeDisplayClass(variant, isDark)}>⏰ {time}</div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getAppointmentStatusClass(status)}`}>
              {status.toUpperCase()}
            </span>
          </div>
          <div className="mt-2">
            <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>👤 {aptPatientName(apt)}</div>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>📋 {aptReason(apt)}</div>
          </div>
          {meetingLink && (
            <div className="mt-3">
              <a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="schedule-meeting-link"
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                Join Video Meeting →
              </a>
              <div className="text-xs text-gray-500 mt-1">{meetingLink}</div>
            </div>
          )}
        </div>
        {variant === 'today' && <div className="text-sm text-gray-500">{aptDuration(apt)} min</div>}
      </div>
    </div>
  );
}

function MonthCalendar({
  currentDate,
  todayStr,
  appointmentDays,
  isDark,
  onPrevMonth,
  onNextMonth,
}: Readonly<{
  currentDate: Date;
  todayStr: string;
  appointmentDays: Set<string>;
  isDark: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}>) {
  const monthGrid = useMemo(
    () => buildMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate],
  );

  return (
    <div className={`rounded-xl shadow-sm p-6 mb-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={onPrevMonth} className={`px-3 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>←</button>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <button type="button" onClick={onNextMonth} className={`px-3 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium mb-2 text-gray-500">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {monthGrid.map((cell) => {
          if (!cell.day || !cell.dateStr) return <div key={cell.cellKey} />;
          const hasAppt = appointmentDays.has(cell.dateStr);
          const isToday = cell.dateStr === todayStr;
          return (
            <div
              key={cell.cellKey}
              data-testid={hasAppt ? 'schedule-month-appointment-day' : undefined}
              className={`py-2 rounded text-sm relative ${getMonthDayCellClass(isToday, isDark)}`}
            >
              {cell.day}
              {hasAppt && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentListSection({
  title,
  appointments,
  variant,
  isDark,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  title: string;
  appointments: Record<string, unknown>[];
  variant: 'today' | 'upcoming';
  isDark: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}>) {
  const panelClass = `rounded-xl shadow-sm p-6 mb-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`;
  const showEmpty = appointments.length === 0 && emptyTitle;

  return (
    <div className={panelClass}>
      <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      {showEmpty ? (
        <div className={`text-center py-8 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{emptyTitle}</h3>
          {emptyDescription && (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{emptyDescription}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <AppointmentCard key={aptId(apt)} apt={apt} variant={variant} isDark={isDark} />
          ))}
        </div>
      )}
    </div>
  );
}

export const CompleteSchedule: React.FC<Readonly<{ doctor: User }>> = ({ doctor }) => {
  const { theme } = useSettings();
  const isDark = theme === 'dark';
  const [appointments, setAppointments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    async function loadAppointments() {
      try {
        setLoading(true);
        const doctorAppointments = filterDoctorAppointments(await fetchAllAppointments(), doctor.id);
        if (!cancelled) {
          setAppointments(doctorAppointments);
          console.log('[Schedule] Loaded appointments:', doctorAppointments.length);
        }
      } catch (error) {
        console.error('Error loading appointments:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAppointments();
    return () => { cancelled = true; };
  }, [doctor.id]);

  const todayStr = new Date().toISOString().split('T')[0];
  const { todayAppointments, upcomingAppointments } = partitionAppointments(appointments, todayStr);
  const appointmentDays = useMemo(() => {
    const days = new Set<string>();
    for (const apt of appointments) days.add(resolveAppointmentSchedule(apt).date);
    return days;
  }, [appointments]);

  const shiftMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className={`p-6 max-w-7xl mx-auto ${isDark ? 'bg-gray-900' : ''}`} data-testid="doctor-schedule-page">
      <div className="mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>📅 Schedule</h1>
        <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>View and manage your appointments</p>
      </div>

      <div className="flex space-x-2 mb-6">
        {(['day', 'week', 'month'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg font-medium ${getViewButtonClass(view === v, isDark)}`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto" />
          <p className="text-gray-500 mt-4">Loading appointments...</p>
        </div>
      )}

      {!loading && view === 'month' && (
        <MonthCalendar
          currentDate={currentDate}
          todayStr={todayStr}
          appointmentDays={appointmentDays}
          isDark={isDark}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
        />
      )}

      {!loading && (view === 'day' || view === 'week') && (
        <AppointmentListSection
          title={`📆 Today — ${todayLabel}`}
          appointments={todayAppointments}
          variant="today"
          isDark={isDark}
          emptyTitle="No Appointments Today"
          emptyDescription="Confirmed telehealth visits appear here after you approve them."
        />
      )}

      {!loading && upcomingAppointments.length > 0 && (
        <AppointmentListSection
          title={`📋 Upcoming Appointments (${upcomingAppointments.length})`}
          appointments={upcomingAppointments}
          variant="upcoming"
          isDark={isDark}
        />
      )}
    </div>
  );
};

export default CompleteSchedule;
