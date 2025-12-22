import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { phrService } from '../../lib/services';
import { Calendar, Pill, Stethoscope, FileText, Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'appointment' | 'medication' | 'lab' | 'procedure' | 'diagnosis';
  title: string;
  description: string;
  date: string;
  provider?: string;
  details?: Record<string, any>;
}

export default function TimelinePage() {
  const { user } = useAuth();
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
        setEvents(data);
      } else {
        setEvents(getMockEvents());
      }
    } catch (e) {
      console.error('Failed to load timeline:', e);
      setEvents(getMockEvents());
    } finally {
      setLoading(false);
    }
  };

  const getMockEvents = (): TimelineEvent[] => [
    {
      id: '1',
      type: 'appointment',
      title: 'ตรวจสุขภาพประจำปี',
      description: 'ตรวจสุขภาพทั่วไป ผลปกติ',
      date: '2024-01-15',
      provider: 'นพ.สมชาย ใจดี',
    },
    {
      id: '2',
      type: 'lab',
      title: 'ผลตรวจเลือด CBC',
      description: 'Complete Blood Count',
      date: '2024-01-15',
      details: { hemoglobin: '14.2 g/dL', wbc: '7,500 /μL' },
    },
    {
      id: '3',
      type: 'medication',
      title: 'รับยา Vitamin D',
      description: 'วิตามินดี 1000 IU ทานวันละ 1 เม็ด',
      date: '2024-01-10',
    },
    {
      id: '4',
      type: 'diagnosis',
      title: 'วินิจฉัย: ภาวะขาดวิตามินดี',
      description: 'Vitamin D Deficiency',
      date: '2024-01-10',
      provider: 'นพ.สมชาย ใจดี',
    },
    {
      id: '5',
      type: 'procedure',
      title: 'ฉีดวัคซีนไข้หวัดใหญ่',
      description: 'Influenza vaccine 2024',
      date: '2023-11-20',
    },
  ];

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
      case 'appointment': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'medication': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'lab': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'procedure': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'diagnosis': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment': return 'นัดหมาย';
      case 'medication': return 'ยา';
      case 'lab': return 'ผลแลบ';
      case 'procedure': return 'หัตถการ';
      case 'diagnosis': return 'วินิจฉัย';
      default: return type;
    }
  };

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const month = new Date(event.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

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
          <h1 className="text-xl font-bold text-gray-800">Medical Timeline</h1>
          <p className="text-sm text-gray-600">ประวัติการรักษาทั้งหมด</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'appointment', 'medication', 'lab', 'procedure', 'diagnosis'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === type
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? 'ทั้งหมด' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {Object.keys(groupedEvents).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>ไม่พบประวัติการรักษา</p>
        </div>
      ) : (
        Object.entries(groupedEvents).map(([month, monthEvents]) => (
          <div key={month}>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">{month}</h2>
            <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
              {monthEvents.map((event) => (
                <div key={event.id} className="relative">
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${getEventColor(event.type)}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-current" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`p-1 rounded ${getEventColor(event.type)}`}>
                            {getEventIcon(event.type)}
                          </span>
                          <h3 className="font-medium text-gray-800">{event.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{event.description}</p>
                        {event.provider && (
                          <p className="text-sm text-gray-500 mt-1">{event.provider}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(event.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </p>
                        {event.details && (
                          <button
                            onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                            className="mt-1 p-1 text-gray-400 hover:text-gray-600"
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
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(event.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-gray-500">{key}: </span>
                              <span className="font-medium">{String(value)}</span>
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
