/** Completed telehealth rows for post-meeting summary (not included in upcoming). */
export function getRecentCompletedAppointments(appointments: any[]) {
  return appointments
    .filter((apt: any) => apt.status === 'completed' || apt.status === 'Completed')
    .sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.appointmentDate || a.confirmed_at || a.updated_at || 0).getTime();
      const dateB = new Date(b.date || b.appointmentDate || b.confirmed_at || b.updated_at || 0).getTime();
      return dateB - dateA;
    });
}
