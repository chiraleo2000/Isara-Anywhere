import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar, Clock, Video, MapPin, FileText, Pill, Stethoscope,
  AlertCircle, ExternalLink, ChevronDown, ChevronUp, Filter, History,
  ClipboardList, Brain, Activity
} from 'lucide-react';
import { Appointment } from '../../types';
import { healthLogsService, HealthLogEntry } from '../../lib/services';
import { useAuth } from '../../contexts/AuthContext';

type FilterType = 'last5' | '6months' | '1year' | 'all';
type ViewType = 'appointments' | 'emr' | 'all';

interface TreatmentResultsProps {
  appointments: Appointment[];
  className?: string;
}

export const TreatmentResults: React.FC<TreatmentResultsProps> = ({
  appointments,
  className = '',
}) => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>('last5');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<ViewType>('all');
  const [healthLogs, setHealthLogs] = useState<HealthLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [healthLogsError, setHealthLogsError] = useState<string | null>(null);

  // Fetch health logs from EMR
  useEffect(() => {
    if (user) {
      fetchHealthLogs();
    }
  }, [user]);

  const fetchHealthLogs = async () => {
    if (!user?.patientId && !user?.id) return;

    setLoadingLogs(true);
    setHealthLogsError(null);
    try {
      const response = await healthLogsService.getHealthLogs(user.patientId || user.id);
      setHealthLogs(response.entries || []);
    } catch (error) {
      console.error('Error fetching health logs:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'ไม่สามารถโหลดข้อมูล EMR ได้ กรุณาลองใหม่อีกครั้ง';
      setHealthLogsError(message);
      setHealthLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const filters: { id: FilterType; label: string; shortLabel: string }[] = [
    { id: 'last5', label: '5 ครั้งล่าสุด', shortLabel: '5 ครั้ง' },
    { id: '6months', label: '6 เดือน', shortLabel: '6 เดือน' },
    { id: '1year', label: '1 ปี', shortLabel: '1 ปี' },
    { id: 'all', label: 'ทั้งหมด', shortLabel: 'ทั้งหมด' },
  ];

  // Filter appointments based on selected filter
  const filteredAppointments = useMemo(() => {
    const completed = appointments
      .filter((a) => a.status === 'completed')
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

    const now = new Date();

    switch (activeFilter) {
      case 'last5':
        return completed.slice(0, 5);
      case '6months': {
        const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
        return completed.filter((a) => new Date(a.appointmentDate) >= sixMonthsAgo);
      }
      case '1year': {
        const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
        return completed.filter((a) => new Date(a.appointmentDate) >= oneYearAgo);
      }
      case 'all':
      default:
        return completed;
    }
  }, [appointments, activeFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const telehealth = filteredAppointments.filter((a) => a.type === 'telehealth').length;
    const inPerson = total - telehealth;
    const uniqueDoctors = new Set(filteredAppointments.map((a) => a.doctorId)).size;
    const withMedications = filteredAppointments.filter(
      (a) => (a.prescription as any)?.medications?.length > 0
    ).length;

    return { total, telehealth, inPerson, uniqueDoctors, withMedications };
  }, [filteredAppointments]);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFullDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (appointments.filter((a) => a.status === 'completed').length === 0 && healthLogs.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-2">ยังไม่มีผลการรักษา</p>
        <p className="text-sm text-gray-400">
          เมื่อพบแพทย์แล้ว ผลการรักษาจะแสดงที่นี่
        </p>
        <a
          href="/appointments/book"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          นัดหมายแพทย์
        </a>
      </div>
    );
  }

  // View type tabs
  const viewTypes: { id: ViewType; label: string; icon: any }[] = [
    { id: 'all', label: 'ทั้งหมด', icon: Activity },
    { id: 'appointments', label: 'นัดหมาย', icon: Calendar },
    { id: 'emr', label: 'EMR', icon: ClipboardList },
  ];

  // Render EMR entry card
  const renderEMRCard = (entry: HealthLogEntry) => {
    const isExpanded = expandedId === `emr-${entry.id}`;

    return (
      <div
        key={`emr-${entry.id}`}
        className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border transition-all ${isExpanded ? 'border-blue-300' : 'border-blue-100'
          }`}
      >
        <button
          type="button"
          onClick={() => setExpandedId(isExpanded ? null : `emr-${entry.id}`)}
          className="p-3 cursor-pointer w-full text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm flex-shrink-0 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-800 truncate">บันทึกการรักษา (EMR)</p>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  จากแพทย์
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>{entry.doctorName}</span>
                <span>•</span>
                <span>{formatDate(entry.encounterDate || entry.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {entry.aiSummary && (
                <span className="p-1 bg-purple-100 rounded-full" title="มี AI Summary">
                  <Brain className="w-3 h-3 text-purple-600" />
                </span>
              )}
              {entry.diagnosis && entry.diagnosis.length > 0 && (
                <span className="p-1 bg-blue-100 rounded-full">
                  <Stethoscope className="w-3 h-3 text-blue-600" />
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Brief Summary when collapsed */}
          {!isExpanded && entry.chiefComplaint && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-1 pl-13">
              อาการ: {entry.chiefComplaint}
            </p>
          )}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-blue-200 pt-3">
            {/* Date */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatFullDate(entry.encounterDate || entry.createdAt)}
              </span>
            </div>

            {/* Chief Complaint */}
            {entry.chiefComplaint && (
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <h5 className="font-medium text-gray-800 flex items-center gap-2 mb-1 text-sm">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  อาการสำคัญ
                </h5>
                <p className="text-sm text-gray-700">{entry.chiefComplaint}</p>
              </div>
            )}

            {/* AI Summary */}
            {entry.aiSummary && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                <h5 className="font-medium text-purple-800 flex items-center gap-2 mb-1 text-sm">
                  <Brain className="w-4 h-4 text-purple-600" />
                  AI สรุปผลการรักษา
                </h5>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.aiSummary}</p>
              </div>
            )}

            {/* Diagnosis */}
            {entry.diagnosis && entry.diagnosis.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <h5 className="font-medium text-gray-800 flex items-center gap-2 mb-2 text-sm">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  การวินิจฉัย
                </h5>
                <div className="space-y-1.5">
                  {entry.diagnosis.map((d) => (
                    <div key={`${d.description}-${d.status}`} className="flex items-center gap-2 text-sm">
                      <div className={`w-1.5 h-1.5 rounded-full ${d.status === 'primary' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                      <span className="text-gray-800">{d.description}</span>
                      <span className="text-xs text-gray-500">({d.status})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Treatment Plan */}
            {entry.treatmentPlan && (
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <h5 className="font-medium text-gray-800 flex items-center gap-2 mb-1 text-sm">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  แผนการรักษา
                </h5>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.treatmentPlan}</p>
              </div>
            )}

            {/* Medications/Prescriptions */}
            {entry.medications && entry.medications.length > 0 && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <h5 className="font-medium text-green-800 flex items-center gap-2 mb-2 text-sm">
                  <Pill className="w-4 h-4 text-green-600" />
                  ยาที่สั่ง ({entry.medications.length} รายการ)
                </h5>
                <div className="space-y-2">
                  {entry.medications.map((med: any, index: number) => (
                    <div key={med.id || index} className="bg-white rounded-lg p-2.5 border border-green-100">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Pill className="w-3 h-3 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{med.drugName}</p>
                          {med.genericName && (
                            <p className="text-xs text-gray-500">({med.genericName})</p>
                          )}
                          <p className="text-xs text-gray-600 mt-0.5">
                            {med.dosage} - {med.frequency}
                            {med.duration && ` • ${med.duration}`}
                          </p>
                          {med.instructions && (
                            <p className="text-xs text-blue-600 mt-1">💊 {med.instructions}</p>
                          )}
                          {med.warnings && med.warnings.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {med.warnings.map((warning: string, wIdx: number) => (
                                <span key={`${warning}-${wIdx}`} className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                  ⚠️ {warning}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {med.quantity && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 flex-shrink-0">
                            {med.quantity} หน่วย
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up */}
            {entry.followUpDate && (
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <h5 className="font-medium text-yellow-800 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  นัดติดตามผล: {formatDate(entry.followUpDate)}
                </h5>
                {entry.followUpInstructions && (
                  <p className="text-sm text-yellow-700 mt-1">{entry.followUpInstructions}</p>
                )}
              </div>
            )}

            {/* Signed info */}
            {entry.signedAt && (
              <div className="text-xs text-gray-500 text-right">
                ลงนามโดย {entry.signedBy} เมื่อ {formatDate(entry.signedAt)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {healthLogsError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">โหลดข้อมูล EMR ไม่สำเร็จ</p>
            <p className="text-xs mt-0.5 text-red-700">{healthLogsError}</p>
          </div>
          <button
            type="button"
            onClick={fetchHealthLogs}
            className="text-xs font-medium px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 whitespace-nowrap"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* View Type Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-100 mb-2">
        {viewTypes.map((vt) => {
          const Icon = vt.icon;
          let count: number;
          if (vt.id === 'appointments') {
            count = filteredAppointments.length;
          } else if (vt.id === 'emr') {
            count = healthLogs.length;
          } else {
            count = filteredAppointments.length + healthLogs.length;
          }
          return (
            <button
              key={vt.id}
              onClick={() => setViewType(vt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${viewType === vt.id
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {vt.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${viewType === vt.id ? 'bg-emerald-200' : 'bg-gray-200'
                }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeFilter === filter.id
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {filter.shortLabel}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
          <p className="text-lg font-bold text-blue-700">{stats.total}</p>
          <p className="text-xs text-blue-600">ครั้ง</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2.5 text-center border border-purple-100">
          <p className="text-lg font-bold text-purple-700">{stats.uniqueDoctors}</p>
          <p className="text-xs text-purple-600">แพทย์</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2.5 text-center border border-green-100">
          <p className="text-lg font-bold text-green-700">{stats.telehealth}</p>
          <p className="text-xs text-green-600">ออนไลน์</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-2.5 text-center border border-orange-100">
          <p className="text-lg font-bold text-orange-700">{stats.withMedications}</p>
          <p className="text-xs text-orange-600">มียา</p>
        </div>
      </div>

      {/* Appointment List */}
      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
        {/* Show loading state for EMR logs */}
        {loadingLogs && viewType !== 'appointments' && (
          <div className="text-center py-4">
            <div className="animate-pulse flex space-x-4 items-center justify-center">
              <div className="h-2 w-2 bg-emerald-600 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="h-2 w-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">กำลังโหลดข้อมูล EMR...</p>
          </div>
        )}

        {/* Show EMR entries */}
        {(viewType === 'emr' || viewType === 'all') && !loadingLogs && healthLogs.length > 0 && (
          <>
            {viewType === 'all' && healthLogs.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <ClipboardList className="w-4 h-4" />
                <span>EMR Records ({healthLogs.length})</span>
              </div>
            )}
            {healthLogs.map((entry) => renderEMRCard(entry))}
          </>
        )}

        {/* Show appointments */}
        {(viewType === 'appointments' || viewType === 'all') && (
          <>
            {viewType === 'all' && filteredAppointments.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 mt-4">
                <Calendar className="w-4 h-4" />
                <span>นัดหมาย ({filteredAppointments.length})</span>
              </div>
            )}
            {filteredAppointments.length === 0 && viewType === 'appointments' ? (
              <div className="text-center py-6 text-gray-500">
                <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">ไม่มีข้อมูลนัดหมายในช่วงเวลานี้</p>
              </div>
            ) : (
              filteredAppointments.map((apt) => {
                const isExpanded = expandedId === apt.id;
                const hasPrescription = (apt.prescription as any)?.medications?.length > 0;

                return (
                  <div
                    key={apt.id}
                    className={`bg-gray-50 rounded-xl border transition-all ${isExpanded ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-100'
                      }`}
                  >
                    {/* Collapsed View */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : apt.id)}
                      className="p-3 cursor-pointer w-full text-left"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={apt.doctorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(apt.doctorId)}`}
                          alt={apt.doctorName}
                          className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800 truncate">{apt.doctorName}</p>
                            {apt.type === 'telehealth' ? (
                              <Video className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span>{apt.doctorSpecialty}</span>
                            <span>•</span>
                            <span>{formatDate(apt.appointmentDate)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasPrescription && (
                            <span className="p-1 bg-green-100 rounded-full">
                              <Pill className="w-3 h-3 text-green-600" />
                            </span>
                          )}
                          {apt.diagnosis && (
                            <span className="p-1 bg-blue-100 rounded-full">
                              <Stethoscope className="w-3 h-3 text-blue-600" />
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Brief Summary when collapsed */}
                      {!isExpanded && apt.diagnosis && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-1 pl-13">
                          {apt.diagnosis}
                        </p>
                      )}
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-3 border-t border-gray-200 pt-3">
                        {/* Date & Time */}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatFullDate(apt.appointmentDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {apt.appointmentTime}
                          </span>
                        </div>

                        {/* Diagnosis */}
                        {apt.diagnosis && (
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <h5 className="font-medium text-gray-800 flex items-center gap-2 mb-1 text-sm">
                              <Stethoscope className="w-4 h-4 text-blue-600" />
                              การวินิจฉัย
                            </h5>
                            <p className="text-sm text-gray-700">{apt.diagnosis}</p>
                          </div>
                        )}

                        {/* Treatment Notes */}
                        {apt.notes && (
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <h5 className="font-medium text-gray-800 flex items-center gap-2 mb-1 text-sm">
                              <FileText className="w-4 h-4 text-purple-600" />
                              บันทึกการรักษา
                            </h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{apt.notes}</p>
                          </div>
                        )}

                        {/* Prescription */}
                        {hasPrescription && (
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <h5 className="font-medium text-gray-800 flex items-center gap-2 mb-2 text-sm">
                              <Pill className="w-4 h-4 text-green-600" />
                              ยาที่สั่ง ({(apt.prescription as any).medications.length} รายการ)
                            </h5>
                            <div className="space-y-1.5">
                              {((apt.prescription as any).medications || []).slice(0, 3).map((item: any, index: number) => (
                                <div key={item.name || item.drugName || `med-${index}`} className="flex items-center gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                  <span className="font-medium text-gray-800">{item.name || item.drugName}</span>
                                  <span className="text-gray-500">{item.dosage}</span>
                                </div>
                              ))}
                              {(apt.prescription as any).medications.length > 3 && (
                                <p className="text-xs text-gray-500 ml-3">
                                  +{(apt.prescription as any).medications.length - 3} รายการเพิ่มเติม
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Follow-up */}
                        {(apt as any).followUpDate && (
                          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                            <h5 className="font-medium text-yellow-800 flex items-center gap-2 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              นัดติดตามผล: {formatDate((apt as any).followUpDate)}
                            </h5>
                          </div>
                        )}

                        {/* View Full Details */}
                        <a
                          href={`/appointments/${apt.id}`}
                          className="flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          ดูรายละเอียดทั้งหมด
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* Empty state when no data */}
        {!loadingLogs &&
          ((viewType === 'emr' && healthLogs.length === 0) ||
            (viewType === 'all' && healthLogs.length === 0 && filteredAppointments.length === 0)) && (
            <div className="text-center py-6 text-gray-500">
              <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">ไม่มีข้อมูลในช่วงเวลานี้</p>
            </div>
          )}
      </div>

      {/* View All Link */}
      {(filteredAppointments.length > 0 || healthLogs.length > 0) && (
        <div className="text-center pt-2 border-t border-gray-100">
          <a
            href="/appointments"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
          >
            ดูประวัตินัดหมายทั้งหมด
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
};

