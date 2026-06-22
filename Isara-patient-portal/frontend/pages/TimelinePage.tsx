import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { phrService } from '../lib/services';
import { Calendar, Pill, Stethoscope, FileText, Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'appointment' | 'medication' | 'lab' | 'procedure' | 'diagnosis';
  title: string;
  description: string;
  date: string;
  provider?: string;
  details?: Record<string, unknown>;
  appointmentId?: string;
}

export default function TimelinePage() {
  const { user } = useAuth();
  const { theme, t, language } = useSettings();
  const isDark = theme === 'dark';
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await phrService.getTimeline(user.id);
      if (Array.isArray(data)) {
        setEvents(
          data.map((e: Record<string, unknown>) => ({
            id: String(e.id ?? ''),
            type: (e.type as TimelineEvent['type']) || 'appointment',
            title: String(
              language === 'th' ? (e.titleThai ?? e.title) : (e.title ?? ''),
            ),
            description: String(e.description ?? ''),
            date: String(e.date ?? ''),
            provider: String(e.doctorName ?? e.provider ?? '') || undefined,
            details: (e.data ?? e.details) as Record<string, unknown> | undefined,
            appointmentId: String(
              (e.data as Record<string, unknown> | undefined)?.id ?? e.id ?? '',
            ),
          })),
        );
      } else {
        setEvents([]);
      }
    } catch (e) {
      console.error('Failed to load timeline:', e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Stethoscope className="w-4 h-4" />;
      case 'medication': return <Pill className="w-4 h-4" />;
      case 'lab': return <Activity className="w-4 h-4" />;
      case 'procedure': return <FileText className="w-4 h-4" />;
      case 'diagnosis': return <FileText className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'appointment': return isDark ? 'bg-blue-900/50 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-600 border-blue-200';
      case 'medication': return isDark ? 'bg-purple-900/50 text-purple-300 border-purple-700' : 'bg-purple-100 text-purple-600 border-purple-200';
      case 'lab': return isDark ? 'bg-amber-900/50 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-600 border-amber-200';
      case 'procedure': return isDark ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'diagnosis': return isDark ? 'bg-red-900/50 text-red-300 border-red-700' : 'bg-red-100 text-red-600 border-red-200';
      default: return isDark ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; th: string }> = {
      appointment: { en: 'Appointment', th: 'นัดหมาย' },
      medication: { en: 'Medication', th: 'ยา' },
      lab: { en: 'Lab Results', th: 'ผลแลบ' },
      procedure: { en: 'Procedure', th: 'หัตถการ' },
      diagnosis: { en: 'Diagnosis', th: 'วินิจฉัย' },
    };
    return labels[type]?.[language] || type;
  };

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const month = new Date(event.date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  const getFilterLabel = (type: string): string => {
    if (type === 'all') return language === 'th' ? 'ทั้งหมด' : 'All';
    return getTypeLabel(type);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{t('timeline.title')}</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {language === 'th' ? 'ประวัติการรักษาทั้งหมด' : 'Complete Treatment History'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'appointment', 'medication', 'lab', 'procedure', 'diagnosis'].map((type) => {
          let btnClass: string;
          if (filter === type) {
            btnClass = 'bg-emerald-600 text-white';
          } else if (isDark) {
            btnClass = 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700';
          } else {
            btnClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
          }
          return (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${btnClass}`}
          >
            {getFilterLabel(type)}
          </button>
          );
        })}
      </div>

      {Object.keys(groupedEvents).length === 0 ? (
        <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Calendar className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p>{t('timeline.noEvents')}</p>
        </div>
      ) : (
        Object.entries(groupedEvents).map(([month, monthEvents]) => (
          <div key={month}>
            <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{month}</h2>
            <div className={`relative pl-6 border-l-2 space-y-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              {monthEvents.map((event) => (
                <div key={event.id} className="relative">
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${getEventColor(event.type)}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-current" />
                    </div>
                  </div>
                  <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`p-1 rounded ${getEventColor(event.type)}`}>
                            {getEventIcon(event.type)}
                          </span>
                          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{event.title}</h3>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{event.description}</p>
                        {event.provider && (
                          <p className="text-sm mt-1 text-gray-500">{event.provider}</p>
                        )}
                        {event.type === 'appointment' && event.appointmentId && (
                          <Link
                            to={`/phr?appointment=${encodeURIComponent(event.appointmentId)}`}
                            data-testid="timeline-consultation-link"
                            className="inline-block mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 underline"
                          >
                            {language === 'th' ? 'ดูผลการปรึกษา' : 'View consultation results'}
                          </Link>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(event.date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' })}
                        </p>
                        {event.details && (
                          <button
                            onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                            className={`mt-1 p-1 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            {expandedId === event.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {expandedId === event.id && event.details && (
                      <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(event.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-gray-500">{key}: </span>
                              <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
