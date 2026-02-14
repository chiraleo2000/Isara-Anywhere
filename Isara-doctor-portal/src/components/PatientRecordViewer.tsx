/**
 * Patient Record Viewer - PHR, EMR, EHR
 * Matches doctor-ui/Doctor-UI02.png, Doctor-UI03.png, Doctor-UI04.png
 */

import React, { useState, useEffect } from 'react';
import { PatientRecord } from '../types';
import {
  PHRData,
  EMRRecord,
  EHRTimeline,
  LabResult,
  ImagingResult,
  LivingWillForDoctorView,
  patientRecordService
} from '../services/patientRecordService';

interface PatientRecordViewerProps {
  patient: PatientRecord;
  onClose: () => void;
}

export const PatientRecordViewer: React.FC<PatientRecordViewerProps> = ({
  patient,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'phr' | 'emr' | 'ehr'>('phr');
  const [phrData, setPhrData] = useState<PHRData | null>(null);
  const [livingWill, setLivingWill] = useState<LivingWillForDoctorView | null>(null);
  const [emrRecords, setEmrRecords] = useState<EMRRecord[]>([]);
  const [ehrTimeline, setEhrTimeline] = useState<EHRTimeline | null>(null);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [imagingResults, setImagingResults] = useState<ImagingResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientData();
  }, [patient.id]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const [phr, lw, emrs, ehr, labs, imaging] = await Promise.all([
        patientRecordService.getPHR(patient.id),
        patientRecordService.getLivingWill(patient.id),
        patientRecordService.getEMRs(patient.id),
        patientRecordService.getEHRTimeline(patient.id),
        patientRecordService.getLabResults(patient.id),
        patientRecordService.getImagingResults(patient.id)
      ]);

      setPhrData(phr);
      setLivingWill(lw);
      setEmrRecords(emrs);
      setEhrTimeline(ehr);
      setLabResults(labs);
      setImagingResults(imaging);
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Patient Record - {patient.demographics.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Top Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('phr')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'phr'
                ? 'bg-yellow-50 text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Personal Health Record
          </button>
          <button
            onClick={() => setActiveTab('emr')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'emr'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Electronic Medical Record
          </button>
          <button
            onClick={() => setActiveTab('ehr')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'ehr'
                ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Electronic Health Record
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 p-4">
            <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              บันทึกประวัติ
            </button>
            <div className="mt-4 space-y-2">
              {activeTab === 'emr' && emrRecords.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-gray-700 mb-2">Timelines</p>
                  {emrRecords.map((emr, idx) => (
                    <button
                      key={emr.id}
                      className="w-full text-left p-2 hover:bg-blue-50 rounded border border-blue-200 mb-1"
                    >
                      <p className="text-xs text-gray-500">
                        {new Date(emr.encounterDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-700">{emr.encounterType}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'phr' && <PHRView phrData={phrData} patient={patient} livingWill={livingWill} />}
                {activeTab === 'emr' && <EMRView emrRecords={emrRecords} />}
                {activeTab === 'ehr' && <EHRView timeline={ehrTimeline} labs={labResults} imaging={imagingResults} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LIVING WILL CARD COMPONENT
// ============================================================================

const LivingWillCard: React.FC<{ livingWill: LivingWillForDoctorView | null }> = ({ livingWill }) => {
  const [expanded, setExpanded] = useState(false);

  const getPreferenceLabel = (pref: string) => {
    switch (pref) {
      case 'accept': return { text: 'ยอมรับ', color: 'bg-green-100 text-green-800' };
      case 'refuse': return { text: 'ปฏิเสธ', color: 'bg-red-100 text-red-800' };
      case 'conditional': return { text: 'มีเงื่อนไข', color: 'bg-yellow-100 text-yellow-800' };
      default: return { text: pref, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getTreatmentLabel = (key: string) => {
    const labels: Record<string, string> = {
      cpr: 'การปั๊มหัวใจ (CPR)',
      mechanicalVentilation: 'เครื่องช่วยหายใจ',
      artificialNutrition: 'การให้อาหารทางสาย',
      dialysis: 'การฟอกไต',
      antibiotics: 'ยาปฏิชีวนะ',
      painManagement: 'การจัดการความเจ็บปวด',
      organDonation: 'การบริจาคอวัยวะ',
    };
    return labels[key] || key;
  };

  if (!livingWill) {
    return (
      <div className="bg-gray-50 rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700">หนังสือแสดงเจตนา (Living Will)</h3>
            <p className="text-sm text-gray-500">ผู้ป่วยยังไม่มีหนังสือแสดงเจตนา หรือยังไม่ได้อนุญาตให้แพทย์เข้าถึง</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow-sm p-6 mb-6 border-2 border-purple-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-purple-900">หนังสือแสดงเจตนา (Living Will)</h3>
            <p className="text-sm text-purple-600">
              สถานะ: <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                livingWill.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {livingWill.status === 'active' ? 'ใช้งาน' : livingWill.status}
              </span>
              {' | '}เวอร์ชัน {livingWill.version}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1"
        >
          {expanded ? 'ย่อ' : 'ดูรายละเอียด'}
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Quick Summary - Always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 bg-white rounded-lg">
          <div className="text-xs text-gray-500">CPR</div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPreferenceLabel(livingWill.treatments.cpr.preference).color}`}>
            {getPreferenceLabel(livingWill.treatments.cpr.preference).text}
          </span>
        </div>
        <div className="text-center p-2 bg-white rounded-lg">
          <div className="text-xs text-gray-500">เครื่องช่วยหายใจ</div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPreferenceLabel(livingWill.treatments.mechanicalVentilation.preference).color}`}>
            {getPreferenceLabel(livingWill.treatments.mechanicalVentilation.preference).text}
          </span>
        </div>
        <div className="text-center p-2 bg-white rounded-lg">
          <div className="text-xs text-gray-500">ความเจ็บปวด</div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPreferenceLabel(livingWill.treatments.painManagement.preference).color}`}>
            {getPreferenceLabel(livingWill.treatments.painManagement.preference).text}
          </span>
        </div>
        <div className="text-center p-2 bg-white rounded-lg">
          <div className="text-xs text-gray-500">บริจาคอวัยวะ</div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPreferenceLabel(livingWill.treatments.organDonation.preference).color}`}>
            {getPreferenceLabel(livingWill.treatments.organDonation.preference).text}
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-4 border-t border-purple-200 pt-4">
          {/* All Treatment Preferences */}
          <div>
            <h4 className="text-sm font-semibold text-purple-800 mb-2">ความต้องการการรักษาทั้งหมด</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(livingWill.treatments).map(([key, treatment]) => {
                if (key === 'otherTreatments') return null;
                const t = treatment as { treatmentType: string; preference: string; conditions?: string };
                return (
                  <div key={key} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="text-sm text-gray-700">{getTreatmentLabel(key)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPreferenceLabel(t.preference).color}`}>
                        {getPreferenceLabel(t.preference).text}
                      </span>
                      {t.conditions && (
                        <span className="text-xs text-gray-500" title={t.conditions}>📝</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personal Statement */}
          {livingWill.personalStatement && (
            <div>
              <h4 className="text-sm font-semibold text-purple-800 mb-1">คำแถลงส่วนตัว</h4>
              <p className="text-sm text-gray-700 bg-white p-3 rounded">{livingWill.personalStatement}</p>
            </div>
          )}

          {/* Additional Instructions */}
          {livingWill.additionalInstructions && (
            <div>
              <h4 className="text-sm font-semibold text-purple-800 mb-1">คำสั่งเพิ่มเติม</h4>
              <p className="text-sm text-gray-700 bg-white p-3 rounded">{livingWill.additionalInstructions}</p>
            </div>
          )}

          {/* Representative */}
          {livingWill.mainRepresentative && (
            <div>
              <h4 className="text-sm font-semibold text-purple-800 mb-1">ผู้แทนในการตัดสินใจ</h4>
              <div className="bg-white p-3 rounded">
                <p className="text-sm font-medium">{livingWill.mainRepresentative.name}</p>
                <p className="text-xs text-gray-500">
                  {livingWill.mainRepresentative.relationship} | โทร: {livingWill.mainRepresentative.phone}
                  {livingWill.mainRepresentative.email && ` | ${livingWill.mainRepresentative.email}`}
                </p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 flex justify-between pt-2 border-t border-purple-100">
            <span>มีผลตั้งแต่: {new Date(livingWill.effectiveDate).toLocaleDateString('th-TH')}</span>
            <span>อัปเดตล่าสุด: {new Date(livingWill.lastUpdated).toLocaleDateString('th-TH')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getExerciseLabel(exercise: string | undefined): string {
  const labels: Record<string, string> = {
    'none': 'ไม่ออกกำลังกาย',
    'light': 'เบา (1-2 วัน/สัปดาห์)',
    'moderate': 'ปานกลาง (3-4 วัน/สัปดาห์)',
    'active': 'บ่อย (5-6 วัน/สัปดาห์)',
    'very-active': 'มาก (ทุกวัน)',
  };
  return exercise ? (labels[exercise] || exercise) : 'ไม่ระบุ';
}

function getSmokingLabel(smoking: boolean | string | undefined): string {
  if (smoking === true || smoking === 'current') return 'สูบอยู่';
  if (smoking === 'former') return 'เคยสูบ (เลิกแล้ว)';
  if (smoking === 'occasional') return 'สูบเป็นครั้งคราว';
  if (smoking === false || smoking === 'never') return 'ไม่สูบ';
  return 'ไม่ระบุ';
}

function getAlcoholLabel(alcohol: boolean | string | undefined): string {
  if (alcohol === true) return 'ดื่ม';
  if (alcohol === 'occasional') return 'ดื่มเป็นครั้งคราว';
  if (alcohol === 'moderate') return 'ดื่มปานกลาง';
  if (alcohol === 'frequent') return 'ดื่มบ่อย';
  if (alcohol === 'former') return 'เคยดื่ม (เลิกแล้ว)';
  if (alcohol === false || alcohol === 'never') return 'ไม่ดื่ม';
  return 'ไม่ระบุ';
}

function getEventTypeClass(type: string): string {
  const classes: Record<string, string> = {
    'consultation': 'bg-blue-100 text-blue-700',
    'lab': 'bg-purple-100 text-purple-700',
    'prescription': 'bg-green-100 text-green-700',
  };
  return classes[type] || 'bg-gray-100 text-gray-700';
}

function getTestFlagClass(flag: string): string {
  const classes: Record<string, string> = {
    'critical': 'bg-red-100 text-red-700',
    'high': 'bg-yellow-100 text-yellow-700',
  };
  return classes[flag] || 'bg-blue-100 text-blue-700';
}

// ============================================================================
// PHR VIEW
// ============================================================================

const PHRView: React.FC<{ phrData: PHRData | null; patient: PatientRecord; livingWill: LivingWillForDoctorView | null }> = ({ phrData, patient, livingWill }) => {
  if (!phrData) {
    return (
      <div className="space-y-6">
        {/* Always show Living Will section even if PHR is empty */}
        <LivingWillCard livingWill={livingWill} />
        <div className="text-center text-gray-500">No PHR data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Living Will Card - Prominent at top */}
      <LivingWillCard livingWill={livingWill} />
      
      {/* Patient Demographics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
          Patient demographics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Name :</span>
            <p className="font-medium">{phrData.demographics.name}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Age :</span>
            <p className="font-medium">{phrData.demographics.age} years</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Sex :</span>
            <p className="font-medium">{phrData.demographics.sex}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Weight :</span>
            <p className="font-medium">{phrData.demographics.weight} kg</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Height :</span>
            <p className="font-medium">{phrData.demographics.height} cm</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">BMI :</span>
            <p className="font-medium">{phrData.demographics.bmi}</p>
          </div>
        </div>
      </div>

      {/* Data from EMR/EHR */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
          Data from EMR / EHR
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-emerald-600">ประวัติการรักษา :</span>
            <p className="text-gray-700">{phrData.chronicConditions.join(', ') || 'None'}</p>
          </div>
          <div>
            <span className="text-sm text-emerald-600">ผลตรวจ :</span>
            <p className="text-gray-700">Recent vitals recorded</p>
          </div>
          <div>
            <span className="text-sm text-emerald-600">การวินิจฉัยโรค :</span>
            <p className="text-gray-700">{phrData.chronicConditions.join(', ')}</p>
          </div>
          <div>
            <span className="text-sm text-emerald-600">รายการยา :</span>
            <p className="text-gray-700">{phrData.currentMedications.map(m => m.name).join(', ')}</p>
          </div>
        </div>
      </div>

      {/* Self-entered Data */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
          Self-entered Data (ข้อมูลที่ผู้ป่วยกรอกเอง)
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-emerald-600">การกินอาหาร :</span>
            <p className="text-gray-700">{phrData.lifestyle.diet || 'ไม่ระบุ'}</p>
          </div>
          <div>
            <span className="text-sm text-emerald-600">การออกกำลังกาย :</span>
            <p className="text-gray-700">{getExerciseLabel(phrData.lifestyle.exercise)}</p>
          </div>
          <div>
            <span className="text-sm text-emerald-600">การนอน :</span>
            <p className="text-gray-700">{phrData.lifestyle.sleep || 'ไม่ระบุ'}</p>
          </div>
          <div>
            <span className="text-sm text-emerald-600">สูบบุหรี่/ดื่มแอลกอฮอล์ :</span>
            <p className="text-gray-700">
              สูบบุหรี่: {getSmokingLabel(phrData.lifestyle.smoking)}, ดื่มแอลกอฮอล์: {getAlcoholLabel(phrData.lifestyle.alcohol)}
            </p>
          </div>
          <div>
            <span className="text-sm text-emerald-600">การใช้อาหารเสริม :</span>
            <p className="text-gray-700">{phrData.lifestyle.supplements || 'ไม่มี'}</p>
          </div>
          <div>
            <span className="text-sm text-emerald-600">การรักษาอื่น :</span>
            <p className="text-gray-700">{phrData.lifestyle.otherTreatments || 'ไม่มี'}</p>
          </div>
        </div>
      </div>

      {/* Wearable/Device Data */}
      {phrData.wearableData && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-emerald-500 pb-2">
            Wearable/Device Data
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-emerald-600">ระดับน้ำตาลในเลือด :</span>
              <p className="text-gray-700">{phrData.vitalSigns[0]?.bloodGlucose || 'N/A'} mg/dL</p>
            </div>
            <div>
              <span className="text-sm text-emerald-600">ค่าความดันโลหิต :</span>
              <p className="text-gray-700">
                {phrData.vitalSigns[0]?.bloodPressure.systolic}/{phrData.vitalSigns[0]?.bloodPressure.diastolic} mmHg
              </p>
            </div>
            <div>
              <span className="text-sm text-emerald-600">อัตราการเดินของหัวใจ :</span>
              <p className="text-gray-700">{phrData.wearableData.steps} steps</p>
            </div>
            <div>
              <span className="text-sm text-emerald-600">จำนวนก้าวเดิน :</span>
              <p className="text-gray-700">{phrData.wearableData.steps} steps</p>
            </div>
            <div>
              <span className="text-sm text-emerald-600">คุณภาพการนอนหลับ :</span>
              <p className="text-gray-700">{phrData.wearableData.sleepHours} hours</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EMR VIEW
// ============================================================================

const EMRView: React.FC<{ emrRecords: EMRRecord[] }> = ({ emrRecords }) => {
  const [selectedEMR] = useState<EMRRecord | null>(
    emrRecords.length > 0 ? emrRecords[0] : null
  );

  if (emrRecords.length === 0) {
    return <div className="text-center text-gray-500">No EMR records available</div>;
  }

  const emr = selectedEMR || emrRecords[0];

  return (
    <div className="space-y-4">
      {/* Patient Demographics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-blue-500 pb-2">
          Patient demographics
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Name: _______________</div>
          <div>Age: ___</div>
          <div>Sex: ___</div>
          <div>Weight: ___</div>
          <div>Height: ___</div>
          <div>BMI: ___</div>
        </div>
      </div>

      {/* Date & Medical History */}
      <div className="bg-blue-50 rounded-lg p-6">
        <p className="text-sm mb-2"><strong>Date:</strong> {new Date(emr.encounterDate).toLocaleDateString()}</p>

        <div className="mb-4">
          <h4 className="font-bold text-orange-600 mb-2">Medical History</h4>
          <div>
            <span className="text-sm">CC :</span>
            <p className="text-gray-700 ml-4">{emr.chiefComplaint}</p>
          </div>
          <div className="mt-2">
            <span className="text-sm">PI :</span>
            <p className="text-gray-700 ml-4">{emr.historyOfPresentIllness}</p>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-bold text-orange-600 mb-2">Clinical Note</h4>
          <div>
            <span className="text-sm text-green-600">Vital sign :</span>
            <p className="text-gray-700 ml-4">
              BP {emr.physicalExamination.vitalSigns.bp}, HR {emr.physicalExamination.vitalSigns.hr},
              RR {emr.physicalExamination.vitalSigns.rr}, Temp {emr.physicalExamination.vitalSigns.temp}
            </p>
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">PE :</span>
            <p className="text-gray-700 ml-4">{emr.physicalExamination.general}</p>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-bold text-orange-600 mb-2">Investigation</h4>
          <div>
            <span className="text-sm text-green-600">LAB :</span>
            <p className="text-gray-700 ml-4">{emr.labOrders.map(l => l.test).join(', ') || 'None'}</p>
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">X-ray :</span>
            <p className="text-gray-700 ml-4">{emr.imagingOrders.map(i => i.modality).join(', ') || 'None'}</p>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-bold text-orange-600 mb-2">Diagnosis :</h4>
          <p className="text-gray-700 ml-4">{emr.diagnosis.map(d => `${d.code} - ${d.description}`).join('; ')}</p>
        </div>

        <div className="mb-4">
          <h4 className="font-bold text-orange-600 mb-2">Treatment</h4>
          <div>
            <span className="text-sm text-green-600">Prescription :</span>
            <p className="text-gray-700 ml-4">
              {emr.prescriptions.map(p => `${p.medication} ${p.dosage} ${p.frequency}`).join('; ')}
            </p>
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">Operation :</span>
            <p className="text-gray-700 ml-4">None</p>
          </div>
        </div>
      </div>

      {/* Last Visit & Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-red-300">
        <h4 className="font-bold text-red-600 mb-2">Last visit :</h4>
        <p className="text-gray-700">{new Date(emr.encounterDate).toLocaleString()}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-purple-300">
        <h4 className="font-bold text-purple-600 mb-2">Summary :</h4>
        <p className="text-gray-700">{emr.assessment}</p>
        <p className="text-gray-700 mt-2"><strong>Plan:</strong> {emr.plan}</p>
      </div>

      {emr.followUpDate && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="font-bold text-green-600 mb-2">Last prescription :</h4>
          <p className="text-gray-700">
            Follow-up: {new Date(emr.followUpDate).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EHR VIEW (Timeline)
// ============================================================================

const EHRView: React.FC<{
  timeline: EHRTimeline | null;
  labs: LabResult[];
  imaging: ImagingResult[];
}> = ({ timeline, labs, imaging }) => {
  const [ehrSubTab, setEhrSubTab] = useState<'internal' | 'external'>('internal');

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Electronic Health Record</h3>

      {/* EHR Sub-tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setEhrSubTab('internal')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            ehrSubTab === 'internal'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Internal Records (EMR Data)
          </span>
        </button>
        <button
          onClick={() => setEhrSubTab('external')}
          disabled
          className={`px-4 py-2 font-medium text-sm transition-colors cursor-not-allowed opacity-60 ${
            ehrSubTab === 'external'
              ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
              : 'text-gray-400 hover:text-gray-500'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            From Other Hospitals
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-normal">
              Future Update!
            </span>
          </span>
        </button>
      </div>

      {/* EHR Content based on sub-tab */}
      {ehrSubTab === 'internal' ? (
        <>
          {(!timeline || timeline.events.length === 0) ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-700 mb-2">No EHR Data Available</h4>
              <p className="text-gray-500">Patient health timeline will be populated from EMR records.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeline.events.map((event) => (
                <div key={event.id} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-emerald-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEventTypeClass(event.type)}`}>
                          {event.type.toUpperCase()}
                        </span>
                        <p className="text-sm text-gray-500">
                          {new Date(event.date).toLocaleDateString()}
                        </p>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">{event.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      <p className="text-sm text-gray-700">{event.summary}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Provider: {event.provider} | Facility: {event.facility}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lab Results */}
          {labs.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="font-bold text-gray-900 mb-4">Recent Lab Results</h4>
              {labs.map((lab) => (
                <div key={lab.id} className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {new Date(lab.completedDate).toLocaleDateString()} - {lab.summary}
                  </p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Test</th>
                        <th className="text-left p-2">Value</th>
                        <th className="text-left p-2">Normal Range</th>
                        <th className="text-left p-2">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lab.tests.map((test, idx) => (
                        <tr key={`test-${test.name}`} className="border-t">
                          <td className="p-2">{test.name}</td>
                          <td className="p-2">{test.value} {test.unit}</td>
                          <td className="p-2">{test.normalRange}</td>
                          <td className="p-2">
                            {test.flag && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getTestFlagClass(test.flag)}`}>
                                {test.flag.toUpperCase()}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* External Records - Future Update */
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-12 text-center border-2 border-dashed border-purple-200">
          <svg className="w-20 h-20 text-purple-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
          <h4 className="text-xl font-bold text-purple-700 mb-2">Coming Soon!</h4>
          <p className="text-purple-600 mb-4">External Hospital Records Integration</p>
          <p className="text-gray-500 max-w-md mx-auto">
            This feature will allow viewing medical records from other hospitals and healthcare facilities 
            through health information exchange (HIE) integration.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Feature Under Development
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecordViewer;
