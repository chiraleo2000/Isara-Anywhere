import React from 'react';
import { Calendar, Clock, Video, MapPin, FileText, Pill, Stethoscope, AlertCircle, ExternalLink } from 'lucide-react';
import { Appointment } from '../../types';

interface LatestAppointmentResultProps {
  appointment: Appointment | null;
  className?: string;
}

export const LatestAppointmentResult: React.FC<LatestAppointmentResultProps> = ({
  appointment,
  className = '',
}) => {
  if (!appointment) {
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Appointment Summary */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-start gap-4">
          <img
            src={appointment.doctorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(appointment.doctorId)}`}
            alt={appointment.doctorName}
            className="w-14 h-14 rounded-full border-2 border-white shadow-sm"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800">{appointment.doctorName}</h4>
            <p className="text-sm text-emerald-600">{appointment.doctorSpecialty}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(appointment.appointmentDate)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {appointment.appointmentTime}
              </span>
              <span className="flex items-center gap-1">
                {appointment.type === 'telehealth' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                {appointment.type === 'telehealth' ? 'ออนไลน์' : 'ที่โรงพยาบาล'}
              </span>
            </div>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            เสร็จสิ้น
          </span>
        </div>
      </div>

      {/* Diagnosis */}
      {appointment.diagnosis && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h5 className="font-medium text-gray-800 flex items-center gap-2 mb-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            การวินิจฉัย
          </h5>
          <p className="text-gray-700">{appointment.diagnosis}</p>
        </div>
      )}

      {/* Treatment Notes */}
      {appointment.notes && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h5 className="font-medium text-gray-800 flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-purple-600" />
            บันทึกการรักษา
          </h5>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{appointment.notes}</p>
        </div>
      )}

      {/* Prescription */}
      {appointment.prescription?.medications && appointment.prescription.medications.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h5 className="font-medium text-gray-800 flex items-center gap-2 mb-3">
            <Pill className="w-5 h-5 text-green-600" />
            ยาที่สั่ง
          </h5>
          <div className="space-y-2">
            {(appointment.prescription.medications || []).map((item: any, index: number) => (
              <div key={item.name || item.drugName || `med-${index}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Pill className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.name || item.drugName}</p>
                  <p className="text-sm text-gray-600">
                    {item.dosage} - {item.frequency}
                  </p>
                  {item.instructions && (
                    <p className="text-xs text-gray-500 mt-1">{item.instructions}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up */}
      {appointment.result?.followUpDate && (
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <h5 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5" />
            นัดติดตามผล
          </h5>
          <p className="text-yellow-700">
            วันที่ {formatDate(appointment.result.followUpDate)}
          </p>
          <a
            href="/appointments"
            className="inline-flex items-center gap-1 mt-2 text-sm text-yellow-800 hover:underline"
          >
            ดูนัดหมาย <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* View Full Details Link */}
      <div className="text-center">
        <a
          href={`/appointments/${appointment.id}`}
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          ดูรายละเอียดทั้งหมด
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
