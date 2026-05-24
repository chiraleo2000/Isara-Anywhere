import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { phrService, labOrderService, imagingOrderService } from '../lib/services';
import { PersonalHealthRecord, VitalSigns, Medication, User, LifestyleData } from '../types';
import { Heart, Activity, Pill, AlertTriangle, Plus, Edit3, Save, X, TrendingUp, TrendingDown, Minus, Scale, Thermometer, Droplet, User as UserIcon, FileText, FlaskConical, Image as ImageIcon } from 'lucide-react';
import { normalizeAllergiesList } from '../utils/healthListNormalize';

type TabId = 'overview' | 'vitals' | 'medications' | 'allergies' | 'lab-imaging' | 'profile';

type SetState<T> = Dispatch<SetStateAction<T>>;

type NewVitalsState = {
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  weight: string;
  temperature: string;
  bloodGlucose: string;
  oxygenSaturation: string;
};

type NewMedicationState = {
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
};

type ProfileDataState = {
  height: string;
  weight: string;
  bloodType: string;
  chronicConditions: string[];
  newCondition: string;
};

type LifestyleState = {
  diet: string;
  exercise: string;
  sleep: string;
  smokingStatus: string;
  alcoholConsumption: string;
  supplements: string;
  otherTreatments: string;
};

const DIET_LABELS: Record<string, string> = {
  Unknown: 'ไม่ระบุ',
  regular: 'ปกติ / ทั่วไป',
  vegetarian: 'มังสวิรัติ',
  vegan: 'วีแกน',
  'low-carb': 'ลดคาร์โบไฮเดรต',
  'low-fat': 'ลดไขมัน',
  'low-sodium': 'ลดเกลือ',
  diabetic: 'สำหรับผู้เป็นเบาหวาน',
  halal: 'ฮาลาล',
  other: 'อื่นๆ'
};

const EXERCISE_LABELS: Record<string, string> = {
  none: 'ไม่ออกกำลังกาย',
  light: 'เบา (1-2 วัน/สัปดาห์)',
  moderate: 'ปานกลาง (3-4 วัน/สัปดาห์)',
  active: 'บ่อย (5-6 วัน/สัปดาห์)',
  'very-active': 'มาก (ทุกวัน)'
};

const SMOKING_LABELS: Record<string, string> = {
  never: 'ไม่เคยสูบ',
  former: 'เคยสูบ (เลิกแล้ว)',
  current: 'สูบอยู่',
  occasional: 'สูบเป็นครั้งคราว'
};

const ALCOHOL_LABELS: Record<string, string> = {
  never: 'ไม่ดื่ม',
  occasional: 'ดื่มเป็นครั้งคราว',
  moderate: 'ดื่มปานกลาง',
  frequent: 'ดื่มบ่อย',
  former: 'เคยดื่ม (เลิกแล้ว)'
};

const getLabel = (value: string, map: Record<string, string>) => map[value] ?? value;

/** Build VitalSigns object from form state — extracted to reduce handleAddVitals complexity */
function buildVitalsData(newVitals: NewVitalsState): VitalSigns {
  const data: VitalSigns = { measuredAt: new Date() };

  if (newVitals.bloodPressureSystolic && newVitals.bloodPressureDiastolic) {
    data.bloodPressure = {
      systolic: Number.parseInt(newVitals.bloodPressureSystolic, 10),
      diastolic: Number.parseInt(newVitals.bloodPressureDiastolic, 10),
      unit: 'mmHg'
    };
  }
  if (newVitals.heartRate) {
    data.heartRate = { value: Number.parseInt(newVitals.heartRate, 10), unit: 'bpm' };
  }
  if (newVitals.weight) {
    data.weight = { value: Number.parseFloat(newVitals.weight), unit: 'kg' };
  }
  if (newVitals.temperature) {
    data.temperature = { value: Number.parseFloat(newVitals.temperature), unit: 'celsius' };
  }
  if (newVitals.bloodGlucose) {
    data.bloodGlucose = { value: Number.parseFloat(newVitals.bloodGlucose), unit: 'mg/dL', testType: 'random' };
  }
  if (newVitals.oxygenSaturation) {
    data.oxygenSaturation = { value: Number.parseFloat(newVitals.oxygenSaturation), unit: '%' };
  }

  return data;
}

/** Build demographics update payload — extracted to reduce handleSaveProfile complexity */
function buildDemographicsUpdate(
  phr: PersonalHealthRecord | null,
  user: User | null,
  height: string
): PersonalHealthRecord['demographics'] {
  return {
    name: phr?.demographics?.name || user?.name || '',
    dateOfBirth: phr?.demographics?.dateOfBirth || user?.dateOfBirth || '',
    gender: phr?.demographics?.gender || user?.gender || 'other',
    bloodType: phr?.demographics?.bloodType,
    weight: phr?.demographics?.weight,
    ethnicity: phr?.demographics?.ethnicity,
    occupation: phr?.demographics?.occupation,
    height: Number.parseFloat(height)
  };
}

/** Compute theme-dependent CSS classes for OverviewTab — extracted to reduce cognitive complexity */
function getOverviewThemeClasses(isDark: boolean) {
  return {
    text: isDark ? 'text-white' : 'text-gray-800',
    mutedText: isDark ? 'text-gray-400' : 'text-gray-500',
    dimText: isDark ? 'text-gray-400' : 'text-gray-600',
    boldText: isDark ? 'text-white' : '',
    cardBg: isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100',
    actionCardBg: isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white',
    actionText: isDark ? 'text-gray-300' : 'text-gray-600',
    tagBg: isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-50 text-yellow-700',
    noDataText: isDark ? 'text-gray-400' : 'text-gray-500',
    quickActionBg: isDark
      ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-800'
      : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200',
    quickActionTitle: isDark ? 'text-emerald-300' : 'text-emerald-800',
    heartCardBg: isDark
      ? 'bg-gradient-to-br from-red-900/30 to-pink-900/30 border-red-800'
      : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-100',
    pulseCardBg: isDark
      ? 'bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-800'
      : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100',
    weightCardBg: isDark
      ? 'bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-800'
      : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100',
    tempCardBg: isDark
      ? 'bg-gradient-to-br from-orange-900/30 to-amber-900/30 border-orange-800'
      : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100',
  };
}

/** Theme classes for VitalsTab — extracted to reduce cognitive complexity */
function getVitalsThemeClasses(isDark: boolean) {
  return {
    cardBg: isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100',
    titleText: isDark ? 'text-white' : '',
    formBg: isDark ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50',
    formTitle: isDark ? 'text-emerald-300' : 'text-emerald-800',
    labelText: isDark ? 'text-gray-300' : 'text-gray-600',
    inputBg: isDark ? 'bg-gray-700 border-gray-600 text-white' : '',
    cancelBtn: isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    emptyText: isDark ? 'text-gray-400' : 'text-gray-500',
    rowBg: isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100',
    dateText: isDark ? 'text-gray-300' : 'text-gray-600',
    vitalsText: isDark ? 'text-gray-200' : '',
  };
}

/** Theme classes for MedicationsTab — extracted to reduce cognitive complexity */
function getMedsThemeClasses(isDark: boolean) {
  return {
    cardBg: isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100',
    titleText: isDark ? 'text-white' : '',
    formBg: isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50',
    formTitle: isDark ? 'text-blue-300' : 'text-blue-800',
    labelText: isDark ? 'text-gray-300' : 'text-gray-600',
    inputBg: isDark ? 'bg-gray-700 border-gray-600 text-white' : '',
    cancelBtn: isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    emptyText: isDark ? 'text-gray-400' : 'text-gray-500',
    medCardBg: isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100',
    medName: isDark ? 'text-white' : 'text-gray-800',
    medDosage: isDark ? 'text-gray-300' : 'text-gray-600',
    medPurpose: isDark ? 'text-gray-400' : 'text-gray-500',
    activeStatus: isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700',
    inactiveStatus: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600',
  };
}

const getVitalKey = (vital: VitalSigns) => {
  if (vital.measuredAt) {
    return new Date(vital.measuredAt).toISOString();
  }
  return [
    vital.bloodPressure?.systolic,
    vital.bloodPressure?.diastolic,
    vital.heartRate?.value,
    vital.weight?.value,
    vital.temperature?.value,
    vital.bloodGlucose?.value,
    vital.oxygenSaturation?.value
  ]
    .map((value) => value ?? 'na')
    .join('-');
};

const calculateBMI = (heightCm?: number, weightKg?: number) => {
  if (heightCm && weightKg) {
    const heightM = heightCm / 100;
    return (weightKg / (heightM * heightM)).toFixed(1);
  }
  return null;
};

const getBPStatus = (systolic?: number, diastolic?: number) => {
  if (!systolic || !diastolic) return { label: '-', color: 'gray' };
  if (systolic < 120 && diastolic < 80) return { label: 'ปกติ', color: 'green' };
  if (systolic < 130 && diastolic < 80) return { label: 'สูงเล็กน้อย', color: 'yellow' };
  if (systolic < 140 || diastolic < 90) return { label: 'ความดันสูงระยะ 1', color: 'orange' };
  return { label: 'ความดันสูงระยะ 2', color: 'red' };
};

type TrendIconProps = Readonly<{ current?: number; previous?: number }>;

function TrendIcon({ current, previous }: TrendIconProps) {
  if (!current || !previous) return null;
  if (current > previous) return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (current < previous) return <TrendingDown className="w-4 h-4 text-green-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

type OverviewTabProps = Readonly<{
  latestVital?: VitalSigns;
  previousVital?: VitalSigns;
  phr: PersonalHealthRecord | null;
  user: User | null;
  onOpenVitals: () => void;
  onOpenMedication: () => void;
  onOpenAllergy: () => void;
  onOpenProfile: () => void;
}>;
function OverviewTab({
  latestVital,
  previousVital,
  phr,
  user,
  onOpenVitals,
  onOpenMedication,
  onOpenAllergy,
  onOpenProfile
}: OverviewTabProps) {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const tc = getOverviewThemeClasses(isDark);
  
  const labels = {
    bloodPressure: { en: 'Blood Pressure', th: 'ความดันโลหิต' },
    heartRate: { en: 'Heart Rate (bpm)', th: 'ชีพจร (bpm)' },
    weight: { en: 'Weight (kg)', th: 'น้ำหนัก (กก.)' },
    temperature: { en: 'Temperature (°C)', th: 'อุณหภูมิ (°C)' },
    basicInfo: { en: 'Basic Information', th: 'ข้อมูลพื้นฐาน' },
    bloodType: { en: 'Blood Type', th: 'หมู่เลือด' },
    height: { en: 'Height', th: 'ส่วนสูง' },
    latestWeight: { en: 'Latest Weight', th: 'น้ำหนักล่าสุด' },
    chronicConditions: { en: 'Chronic Conditions', th: 'โรคประจำตัว' },
    none: { en: 'None', th: 'ไม่มี' },
    recordHealth: { en: 'Record Health Data', th: 'บันทึกข้อมูลสุขภาพ' },
    vitals: { en: 'Vital Signs', th: 'สัญญาณชีพ' },
    medications: { en: 'Medications', th: 'ยาที่ใช้' },
    allergies: { en: 'Allergies', th: 'การแพ้' },
    editProfile: { en: 'Edit Profile', th: 'แก้ไขข้อมูล' },
    cm: { en: ' cm', th: ' ซม.' },
    kg: { en: ' kg', th: ' กก.' },
  };
  
  // Use weight from PHR demographics or latest vital
  const currentWeight = phr?.demographics?.weight || latestVital?.weight?.value;
  const bmi = calculateBMI(phr?.demographics?.height, currentWeight);
  const bpStatus = getBPStatus(latestVital?.bloodPressure?.systolic, latestVital?.bloodPressure?.diastolic);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`rounded-xl p-4 border ${tc.heartCardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-red-500" />
            <TrendIcon current={latestVital?.bloodPressure?.systolic} previous={previousVital?.bloodPressure?.systolic} />
          </div>
          <p className={`text-2xl font-bold ${tc.text}`}>
            {latestVital?.bloodPressure ? `${latestVital.bloodPressure.systolic}/${latestVital.bloodPressure.diastolic}` : '-'}
          </p>
          <p className={`text-xs ${tc.mutedText}`}>{labels.bloodPressure[language]}</p>
          {latestVital?.bloodPressure && (
            <p className={`text-xs mt-1 text-${bpStatus.color}-${isDark ? '400' : '600'}`}>
              {bpStatus.label}
            </p>
          )}
        </div>

        <div className={`rounded-xl p-4 border ${tc.pulseCardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-purple-500" />
            <TrendIcon current={latestVital?.heartRate?.value} previous={previousVital?.heartRate?.value} />
          </div>
          <p className={`text-2xl font-bold ${tc.text}`}>
            {latestVital?.heartRate?.value || '-'}
          </p>
          <p className={`text-xs ${tc.mutedText}`}>{labels.heartRate[language]}</p>
        </div>

        <div className={`rounded-xl p-4 border ${tc.weightCardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <Scale className="w-5 h-5 text-blue-500" />
            <TrendIcon current={latestVital?.weight?.value} previous={previousVital?.weight?.value} />
          </div>
          <p className={`text-2xl font-bold ${tc.text}`}>
            {latestVital?.weight?.value || '-'}
          </p>
          <p className={`text-xs ${tc.mutedText}`}>{labels.weight[language]}</p>
          {bmi && (
            <p className={`text-xs mt-1 ${tc.dimText}`}>BMI: {bmi}</p>
          )}
        </div>

        <div className={`rounded-xl p-4 border ${tc.tempCardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <Thermometer className="w-5 h-5 text-orange-500" />
          </div>
          <p className={`text-2xl font-bold ${tc.text}`}>
            {latestVital?.temperature?.value || '-'}
          </p>
          <p className={`text-xs ${tc.mutedText}`}>{labels.temperature[language]}</p>
        </div>
      </div>

      {/* Basic Info & Conditions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`rounded-xl p-5 border ${tc.cardBg}`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${tc.boldText}`}>
            <Heart className="w-5 h-5 text-red-500" /> {labels.basicInfo[language]}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={tc.dimText}>{labels.bloodType[language]}</span>
              <span className={`font-medium ${tc.boldText}`}>{phr?.demographics?.bloodType || user?.bloodType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className={tc.dimText}>{labels.height[language]}</span>
              <span className={`font-medium ${tc.boldText}`}>{phr?.demographics?.height ? `${phr.demographics.height}${labels.cm[language]}` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className={tc.dimText}>{labels.latestWeight[language]}</span>
              <span className={`font-medium ${tc.boldText}`}>{phr?.demographics?.weight || latestVital?.weight?.value ? `${phr?.demographics?.weight || latestVital?.weight?.value}${labels.kg[language]}` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className={tc.dimText}>BMI</span>
              <span className={`font-medium ${tc.boldText}`}>{bmi || '-'}</span>
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-5 border ${tc.cardBg}`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${tc.boldText}`}>
            <AlertTriangle className="w-5 h-5 text-yellow-500" /> {labels.chronicConditions[language]}
          </h2>
          {user?.chronicConditions?.length ? (
            <div className="flex flex-wrap gap-2">
              {user.chronicConditions.map((condition) => (
                <span key={condition} className={`px-3 py-1 rounded-full text-sm ${tc.tagBg}`}>{condition}</span>
              ))}
            </div>
          ) : (
            <p className={tc.noDataText}>{labels.none[language]}</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`rounded-xl p-6 border ${tc.quickActionBg}`}>
        <h3 className={`font-semibold mb-4 ${tc.quickActionTitle}`}>{labels.recordHealth[language]}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={onOpenVitals}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl hover:shadow-md transition-all ${tc.actionCardBg}`}
          >
            <Activity className="w-6 h-6 text-emerald-600" />
            <span className={`text-sm ${tc.actionText}`}>{labels.vitals[language]}</span>
          </button>
          <button
            onClick={onOpenMedication}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl hover:shadow-md transition-all ${tc.actionCardBg}`}
          >
            <Pill className="w-6 h-6 text-blue-600" />
            <span className={`text-sm ${tc.actionText}`}>{labels.medications[language]}</span>
          </button>
          <button
            onClick={onOpenAllergy}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl hover:shadow-md transition-all ${tc.actionCardBg}`}
          >
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span className={`text-sm ${tc.actionText}`}>{labels.allergies[language]}</span>
          </button>
          <button
            onClick={onOpenProfile}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl hover:shadow-md transition-all ${tc.actionCardBg}`}
          >
            <UserIcon className="w-6 h-6 text-purple-600" />
            <span className={`text-sm ${tc.actionText}`}>{labels.editProfile[language]}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

type VitalsTabProps = Readonly<{
  vitals: VitalSigns[];
  showAddVitals: boolean;
  setShowAddVitals: SetState<boolean>;
  newVitals: NewVitalsState;
  setNewVitals: SetState<NewVitalsState>;
  saving: boolean;
  onAddVitals: () => void;
}>;
function VitalsTab({
  vitals,
  showAddVitals,
  setShowAddVitals,
  newVitals,
  setNewVitals,
  saving,
  onAddVitals
}: VitalsTabProps) {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const tc = getVitalsThemeClasses(isDark);
  const locale = language === 'th' ? 'th-TH' : 'en-US';
  
  const labels = {
    title: { en: 'Vital Signs', th: 'สัญญาณชีพ' },
    record: { en: 'Record', th: 'บันทึก' },
    newRecord: { en: 'Record New Vital Signs', th: 'บันทึกสัญญาณชีพใหม่' },
    systolic: { en: 'Systolic BP (mmHg)', th: 'ความดันบน (mmHg)' },
    diastolic: { en: 'Diastolic BP (mmHg)', th: 'ความดันล่าง (mmHg)' },
    heartRate: { en: 'Heart Rate (bpm)', th: 'ชีพจร (bpm)' },
    weight: { en: 'Weight (kg)', th: 'น้ำหนัก (กก.)' },
    temperature: { en: 'Temperature (°C)', th: 'อุณหภูมิ (°C)' },
    bloodGlucose: { en: 'Blood Glucose (mg/dL)', th: 'น้ำตาลในเลือด (mg/dL)' },
    oxygen: { en: 'Oxygen Saturation (%)', th: 'ออกซิเจนในเลือด (%)' },
    normalRange: { en: 'Normal range: 36.1-37.2°C', th: 'ช่วงปกติ: 36.1-37.2°C' },
    save: { en: 'Save', th: 'บันทึก' },
    cancel: { en: 'Cancel', th: 'ยกเลิก' },
    noData: { en: 'No vital signs data yet', th: 'ยังไม่มีข้อมูลสัญญาณชีพ' },
    addData: { en: '+ Add vital signs data', th: '+ เพิ่มข้อมูลสัญญาณชีพ' },
    tempValidation: { en: 'Temperature must be between 35.0-42.0°C', th: 'อุณหภูมิต้องอยู่ระหว่าง 35.0-42.0°C' },
  };
  
  return (
    <div className={`rounded-xl p-5 border ${tc.cardBg}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold flex items-center gap-2 ${tc.titleText}`}><Activity className="w-5 h-5 text-emerald-600" /> {labels.title[language]}</h2>
        <button onClick={() => setShowAddVitals(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> {labels.record[language]}
        </button>
      </div>

      {showAddVitals && (
        <div className={`p-4 rounded-xl mb-4 ${tc.formBg}`}>
          <h3 className={`font-medium mb-4 ${tc.formTitle}`}>{labels.newRecord[language]}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="vitals-systolic" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.systolic[language]}</label>
              <input
                id="vitals-systolic"
                type="number"
                value={newVitals.bloodPressureSystolic}
                onChange={(e) => setNewVitals({ ...newVitals, bloodPressureSystolic: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder="120"
              />
            </div>
            <div>
              <label htmlFor="vitals-diastolic" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.diastolic[language]}</label>
              <input
                id="vitals-diastolic"
                type="number"
                value={newVitals.bloodPressureDiastolic}
                onChange={(e) => setNewVitals({ ...newVitals, bloodPressureDiastolic: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder="80"
              />
            </div>
            <div>
              <label htmlFor="vitals-heart-rate" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.heartRate[language]}</label>
              <input
                id="vitals-heart-rate"
                type="number"
                value={newVitals.heartRate}
                onChange={(e) => setNewVitals({ ...newVitals, heartRate: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder="72"
              />
            </div>
            <div>
              <label htmlFor="vitals-weight" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.weight[language]}</label>
              <input
                id="vitals-weight"
                type="number"
                step="0.1"
                value={newVitals.weight}
                onChange={(e) => setNewVitals({ ...newVitals, weight: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder="70"
              />
            </div>
            <div>
              <label htmlFor="vitals-temperature" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.temperature[language]}</label>
              <input
                id="vitals-temperature"
                type="number"
                step="0.1"
                min="35"
                max="42"
                value={newVitals.temperature}
                onChange={(e) => {
                  setNewVitals({ ...newVitals, temperature: e.target.value });
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value !== '') {
                    const num = Number.parseFloat(value);
                    if (Number.isNaN(num) || num < 35 || num > 42) {
                      alert(labels.tempValidation[language]);
                      setNewVitals({ ...newVitals, temperature: '' });
                    }
                  }
                }}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder="36.5"
              />
              <p className="text-xs mt-1 text-gray-400">{labels.normalRange[language]}</p>
            </div>
            <div>
              <label htmlFor="vitals-blood-glucose" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.bloodGlucose[language]}</label>
              <input
                id="vitals-blood-glucose"
                type="number"
                value={newVitals.bloodGlucose}
                onChange={(e) => setNewVitals({ ...newVitals, bloodGlucose: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder="100"
              />
            </div>
            <div>
              <label htmlFor="vitals-oxygen" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.oxygen[language]}</label>
              <input
                id="vitals-oxygen"
                type="number"
                value={newVitals.oxygenSaturation}
                onChange={(e) => setNewVitals({ ...newVitals, oxygenSaturation: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder="98"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onAddVitals} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
              {labels.save[language]}
            </button>
            <button onClick={() => setShowAddVitals(false)} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${tc.cancelBtn}`}>
              <X className="w-4 h-4" /> {labels.cancel[language]}
            </button>
          </div>
        </div>
      )}

      {vitals.length === 0 ? (
        <div className={`text-center py-8 ${tc.emptyText}`}>
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>{labels.noData[language]}</p>
          <button onClick={() => setShowAddVitals(true)} className="mt-4 text-emerald-600 hover:underline">
            {labels.addData[language]}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {vitals.slice(0, 10).map((v) => (
            <div key={getVitalKey(v)} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${tc.rowBg}`}>
              <span className={`text-sm font-medium ${tc.dateText}`}>
                {v.measuredAt ? new Date(v.measuredAt).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '-'}
              </span>
              <div className={`flex flex-wrap gap-4 text-sm ${tc.vitalsText}`}>
                {v.bloodPressure && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-400" />
                    {v.bloodPressure.systolic}/{v.bloodPressure.diastolic}
                  </span>
                )}
                {v.heartRate && (
                  <span className="flex items-center gap-1">
                    <Activity className="w-4 h-4 text-purple-400" />
                    {v.heartRate.value} bpm
                  </span>
                )}
                {v.weight && (
                  <span className="flex items-center gap-1">
                    <Scale className="w-4 h-4 text-blue-400" />
                    {v.weight.value} kg
                  </span>
                )}
                {v.temperature && (
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-4 h-4 text-orange-400" />
                    {v.temperature.value}°C
                  </span>
                )}
                {v.bloodGlucose && (
                  <span className="flex items-center gap-1">
                    <Droplet className="w-4 h-4 text-pink-400" />
                    {v.bloodGlucose.value} mg/dL
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type MedicationsTabProps = Readonly<{
  medications?: Medication[];
  showAddMedication: boolean;
  setShowAddMedication: SetState<boolean>;
  newMedication: NewMedicationState;
  setNewMedication: SetState<NewMedicationState>;
  saving: boolean;
  onAddMedication: () => void;
}>;
function MedicationsTab({
  medications,
  showAddMedication,
  setShowAddMedication,
  newMedication,
  setNewMedication,
  saving,
  onAddMedication
}: MedicationsTabProps) {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const tc = getMedsThemeClasses(isDark);
  
  const labels = {
    title: { en: 'Current Medications', th: 'ยาที่ใช้ประจำ' },
    add: { en: 'Add Medication', th: 'เพิ่มยา' },
    addTitle: { en: 'Add Medication', th: 'เพิ่มยาที่ใช้' },
    name: { en: 'Medication Name *', th: 'ชื่อยา *' },
    dosage: { en: 'Dosage *', th: 'ขนาดยา *' },
    frequency: { en: 'Frequency', th: 'ความถี่' },
    purpose: { en: 'Purpose', th: 'วัตถุประสงค์' },
    save: { en: 'Save', th: 'บันทึก' },
    cancel: { en: 'Cancel', th: 'ยกเลิก' },
    active: { en: 'Active', th: 'ใช้อยู่' },
    stopped: { en: 'Stopped', th: 'หยุดใช้' },
    noMeds: { en: 'No current medications', th: 'ไม่มียาที่ใช้ประจำ' },
    addMeds: { en: '+ Add medication', th: '+ เพิ่มยาที่ใช้' },
    namePlaceholder: { en: 'e.g. Paracetamol', th: 'เช่น Paracetamol' },
    dosagePlaceholder: { en: 'e.g. 500mg', th: 'เช่น 500mg' },
    frequencyPlaceholder: { en: 'e.g. 3 times daily', th: 'เช่น วันละ 3 ครั้ง' },
    purposePlaceholder: { en: 'e.g. Fever relief, pain relief', th: 'เช่น ลดไข้ บรรเทาปวด' },
    purposeLabel: { en: 'Purpose:', th: 'วัตถุประสงค์:' },
  };

  return (
    <div className={`rounded-xl p-5 border ${tc.cardBg}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold flex items-center gap-2 ${tc.titleText}`}><Pill className="w-5 h-5 text-blue-500" /> {labels.title[language]}</h2>
        <button onClick={() => setShowAddMedication(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> {labels.add[language]}
        </button>
      </div>

      {showAddMedication && (
        <div className={`p-4 rounded-xl mb-4 ${tc.formBg}`}>
          <h3 className={`font-medium mb-4 ${tc.formTitle}`}>{labels.addTitle[language]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="medication-name" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.name[language]}</label>
              <input
                id="medication-name"
                type="text"
                value={newMedication.name}
                onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder={labels.namePlaceholder[language]}
              />
            </div>
            <div>
              <label htmlFor="medication-dosage" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.dosage[language]}</label>
              <input
                id="medication-dosage"
                type="text"
                value={newMedication.dosage}
                onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder={labels.dosagePlaceholder[language]}
              />
            </div>
            <div>
              <label htmlFor="medication-frequency" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.frequency[language]}</label>
              <input
                id="medication-frequency"
                type="text"
                value={newMedication.frequency}
                onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder={labels.frequencyPlaceholder[language]}
              />
            </div>
            <div>
              <label htmlFor="medication-purpose" className={`block text-sm mb-1 ${tc.labelText}`}>{labels.purpose[language]}</label>
              <input
                id="medication-purpose"
                type="text"
                value={newMedication.purpose}
                onChange={(e) => setNewMedication({ ...newMedication, purpose: e.target.value })}
                className={`w-full p-2 border rounded-lg ${tc.inputBg}`}
                placeholder={labels.purposePlaceholder[language]}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onAddMedication} disabled={saving || !newMedication.name || !newMedication.dosage} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
              {labels.save[language]}
            </button>
            <button onClick={() => setShowAddMedication(false)} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${tc.cancelBtn}`}>
              <X className="w-4 h-4" /> {labels.cancel[language]}
            </button>
          </div>
        </div>
      )}

      {medications?.length ? (
        <div className="space-y-3">
          {medications.map((med) => (
            <div key={med.id} className={`p-4 rounded-lg border ${tc.medCardBg}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-medium ${tc.medName}`}>{med.name}</p>
                  <p className={`text-sm ${tc.medDosage}`}>{med.dosage} - {med.frequency}</p>
                  {med.purpose && <p className={`text-xs mt-1 ${tc.medPurpose}`}>{labels.purposeLabel[language]} {med.purpose}</p>}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${med.status === 'active' ? tc.activeStatus : tc.inactiveStatus}`}>
                  {med.status === 'active' ? labels.active[language] : labels.stopped[language]}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 ${tc.emptyText}`}>
          <Pill className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>{labels.noMeds[language]}</p>
          <button onClick={() => setShowAddMedication(true)} className="mt-4 text-blue-600 hover:underline">
            {labels.addMeds[language]}
          </button>
        </div>
      )}
    </div>
  );
}

type AllergiesTabProps = Readonly<{
  allergies?: string[];
  showAddAllergy: boolean;
  setShowAddAllergy: SetState<boolean>;
  newAllergy: string;
  setNewAllergy: SetState<string>;
  saving: boolean;
  onAddAllergy: () => void;
}>;
function AllergiesTab({
  allergies,
  showAddAllergy,
  setShowAddAllergy,
  newAllergy,
  setNewAllergy,
  saving,
  onAddAllergy
}: AllergiesTabProps) {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const allergyList = normalizeAllergiesList(allergies);
  
  const labels = {
    title: { en: 'Allergies', th: 'การแพ้' },
    add: { en: 'Add', th: 'เพิ่ม' },
    addTitle: { en: 'Add Allergy', th: 'เพิ่มการแพ้' },
    save: { en: 'Save', th: 'บันทึก' },
    placeholder: { en: 'e.g. Penicillin, Seafood, Nuts', th: 'เช่น Penicillin, อาหารทะเล, ถั่ว' },
    noAllergies: { en: 'No allergy history', th: 'ไม่มีประวัติการแพ้' },
    addAllergy: { en: '+ Add allergy', th: '+ เพิ่มการแพ้' },
  };
  
  return (
    <div className={`rounded-xl p-5 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : ''}`}><AlertTriangle className="w-5 h-5 text-red-500" /> {labels.title[language]}</h2>
        <button onClick={() => setShowAddAllergy(true)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
          <Plus className="w-4 h-4" /> {labels.add[language]}
        </button>
      </div>

      {showAddAllergy && (
        <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50'}`}>
          <h3 className={`font-medium mb-4 ${isDark ? 'text-red-300' : 'text-red-800'}`}>{labels.addTitle[language]}</h3>
          <div className="flex gap-2">
            <label htmlFor="allergy-input" className="sr-only">{labels.addTitle[language]}</label>
            <input
              id="allergy-input"
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              className={`flex-1 p-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              placeholder={labels.placeholder[language]}
            />
            <button onClick={onAddAllergy} disabled={saving || !newAllergy.trim()} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
              {labels.save[language]}
            </button>
            <button onClick={() => { setShowAddAllergy(false); setNewAllergy(''); }} className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} aria-label="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {allergyList.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {allergyList.map((allergy) => (
            <span key={allergy} className={`px-4 py-2 rounded-full border flex items-center gap-2 ${isDark ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'}`}>
              <AlertTriangle className="w-4 h-4" />
              {allergy}
            </span>
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>{labels.noAllergies[language]}</p>
          <button onClick={() => setShowAddAllergy(true)} className="mt-4 text-red-600 hover:underline">
            {labels.addAllergy[language]}
          </button>
        </div>
      )}
    </div>
  );
}

type PersonalInfoSectionProps = Readonly<{
  editingProfile: boolean;
  phr: PersonalHealthRecord | null;
  user: User | null;
  profileData: ProfileDataState;
  setProfileData: SetState<ProfileDataState>;
  removeChronicCondition: (condition: string) => void;
  addChronicCondition: () => void;
}>;

function PersonalInfoSection({
  editingProfile,
  phr,
  user,
  profileData,
  setProfileData,
  removeChronicCondition,
  addChronicCondition
}: PersonalInfoSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="profile-height" className="block text-sm font-medium text-gray-700 mb-1">ส่วนสูง (ซม.)</label>
          {editingProfile ? (
            <input
              id="profile-height"
              type="number"
              value={profileData.height}
              onChange={(e) => setProfileData({ ...profileData, height: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="เช่น 170"
            />
          ) : (
            <p className="p-2 bg-gray-50 rounded-lg">{phr?.demographics?.height || '-'} ซม.</p>
          )}
        </div>
        <div>
          <label htmlFor="profile-blood-type" className="block text-sm font-medium text-gray-700 mb-1">หมู่เลือด</label>
          {editingProfile ? (
            <select
              id="profile-blood-type"
              value={profileData.bloodType}
              onChange={(e) => setProfileData({ ...profileData, bloodType: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">เลือกหมู่เลือด</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          ) : (
            <p className="p-2 bg-gray-50 rounded-lg">{user?.bloodType || '-'}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="profile-new-condition" className="block text-sm font-medium text-gray-700 mb-2">โรคประจำตัว</label>
        {editingProfile ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {profileData.chronicConditions.map((condition) => (
                <span key={condition} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center gap-1">
                  {condition}
                  <button onClick={() => removeChronicCondition(condition)} className="hover:text-red-600" aria-label={`Remove ${condition}`}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                id="profile-new-condition"
                type="text"
                value={profileData.newCondition}
                onChange={(e) => setProfileData({ ...profileData, newCondition: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addChronicCondition()}
                className="flex-1 p-2 border rounded-lg"
                placeholder="เพิ่มโรคประจำตัว"
              />
              <button onClick={addChronicCondition} className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600" aria-label="Add chronic condition">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2 bg-gray-50 rounded-lg">
            {user?.chronicConditions?.length ? (
              <div className="flex flex-wrap gap-2">
                {user.chronicConditions.map((condition) => (
                  <span key={condition} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">{condition}</span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">ไม่มี</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type LifestyleFieldProps = Readonly<{
  label: string;
  htmlFor: string;
  editing: boolean;
  type: 'select' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  labelMap?: Record<string, string>;
}>;

function LifestyleField({
  label,
  htmlFor,
  editing,
  type,
  value,
  onChange,
  options,
  placeholder,
  labelMap
}: LifestyleFieldProps) {
  // Extracted to avoid nested ternary
  const renderEditingInput = () => {
    if (type === 'select') {
      return (
        <select
          id={htmlFor}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    return (
      <textarea
        id={htmlFor}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
        placeholder={placeholder}
        rows={2}
      />
    );
  };

  const displayValue = type === 'select' && labelMap ? getLabel(value, labelMap) : value || 'ไม่มี';

  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-emerald-700 mb-1">{label}</label>
      {editing ? renderEditingInput() : (
        <p className="p-2 bg-emerald-50 rounded-lg text-gray-700">{displayValue}</p>
      )}
    </div>
  );
}

type ProfileTabProps = Readonly<{
  phr: PersonalHealthRecord | null;
  user: User | null;
  editingProfile: boolean;
  setEditingProfile: SetState<boolean>;
  saving: boolean;
  profileData: ProfileDataState;
  setProfileData: SetState<ProfileDataState>;
  addChronicCondition: () => void;
  removeChronicCondition: (condition: string) => void;
  onSaveProfile: () => void;
  lifestyleData: LifestyleState;
  setLifestyleData: SetState<LifestyleState>;
  editingLifestyle: boolean;
  setEditingLifestyle: SetState<boolean>;
  onSaveLifestyle: () => void;
}>;

function ProfileTab({
  phr,
  user,
  editingProfile,
  setEditingProfile,
  saving,
  profileData,
  setProfileData,
  addChronicCondition,
  removeChronicCondition,
  onSaveProfile,
  lifestyleData,
  setLifestyleData,
  editingLifestyle,
  setEditingLifestyle,
  onSaveLifestyle
}: ProfileTabProps) {
  return (
    <>
      <div className="bg-white rounded-xl p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><UserIcon className="w-5 h-5 text-purple-500" /> ข้อมูลส่วนตัว</h2>
          <div className="flex gap-2">
            {editingProfile ? (
              <>
                <button onClick={onSaveProfile} disabled={saving} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
                  บันทึก
                </button>
                <button onClick={() => setEditingProfile(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2">
                  <X className="w-4 h-4" /> ยกเลิก
                </button>
              </>
            ) : (
              <button onClick={() => setEditingProfile(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                <Edit3 className="w-4 h-4" /> แก้ไข
              </button>
            )}
          </div>
        </div>

        <PersonalInfoSection
          editingProfile={editingProfile}
          phr={phr}
          user={user}
          profileData={profileData}
          setProfileData={setProfileData}
          removeChronicCondition={removeChronicCondition}
          addChronicCondition={addChronicCondition}
        />
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-100 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-500" /> ข้อมูลสุขภาพส่วนตัว (Self-entered Data)
          </h2>
          <div className="flex gap-2">
            {editingLifestyle ? (
              <>
                <button onClick={onSaveLifestyle} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
                  บันทึก
                </button>
                <button onClick={() => setEditingLifestyle(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2">
                  <X className="w-4 h-4" /> ยกเลิก
                </button>
              </>
            ) : (
              <button onClick={() => setEditingLifestyle(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                <Edit3 className="w-4 h-4" /> แก้ไข
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">ข้อมูลเหล่านี้จะถูกส่งไปยังแพทย์เพื่อช่วยในการวินิจฉัยและวางแผนการรักษา</p>

        <div className="space-y-4">
          <LifestyleField
            label="การกินอาหาร"
            htmlFor="lifestyle-diet"
            editing={editingLifestyle}
            type="select"
            value={lifestyleData.diet}
            onChange={(val) => setLifestyleData({ ...lifestyleData, diet: val })}
            options={Object.entries(DIET_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            labelMap={DIET_LABELS}
          />

          <LifestyleField
            label="การออกกำลังกาย"
            htmlFor="lifestyle-exercise"
            editing={editingLifestyle}
            type="select"
            value={lifestyleData.exercise}
            onChange={(val) => setLifestyleData({ ...lifestyleData, exercise: val })}
            options={Object.entries(EXERCISE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            labelMap={EXERCISE_LABELS}
          />

          <LifestyleField
            label="การนอน (ชั่วโมงต่อวัน)"
            htmlFor="lifestyle-sleep"
            editing={editingLifestyle}
            type="select"
            value={lifestyleData.sleep}
            onChange={(val) => setLifestyleData({ ...lifestyleData, sleep: val })}
            options={[
              { value: 'Unknown', label: 'ไม่ระบุ' },
              { value: '4', label: 'น้อยกว่า 4 ชั่วโมง' },
              { value: '5', label: '4-5 ชั่วโมง' },
              { value: '6', label: '5-6 ชั่วโมง' },
              { value: '7', label: '6-7 ชั่วโมง' },
              { value: '8', label: '7-8 ชั่วโมง' },
              { value: '9', label: 'มากกว่า 8 ชั่วโมง' }
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LifestyleField
              label="การสูบบุหรี่"
              htmlFor="lifestyle-smoking"
              editing={editingLifestyle}
              type="select"
              value={lifestyleData.smokingStatus}
              onChange={(val) => setLifestyleData({ ...lifestyleData, smokingStatus: val })}
              options={Object.entries(SMOKING_LABELS).map(([k, v]) => ({ value: k, label: v }))}
              labelMap={SMOKING_LABELS}
            />

            <LifestyleField
              label="การดื่มแอลกอฮอล์"
              htmlFor="lifestyle-alcohol"
              editing={editingLifestyle}
              type="select"
              value={lifestyleData.alcoholConsumption}
              onChange={(val) => setLifestyleData({ ...lifestyleData, alcoholConsumption: val })}
              options={Object.entries(ALCOHOL_LABELS).map(([k, v]) => ({ value: k, label: v }))}
              labelMap={ALCOHOL_LABELS}
            />
          </div>

          <LifestyleField
            label="การใช้อาหารเสริม / วิตามิน"
            htmlFor="lifestyle-supplements"
            editing={editingLifestyle}
            type="textarea"
            value={lifestyleData.supplements}
            onChange={(val) => setLifestyleData({ ...lifestyleData, supplements: val })}
            placeholder="เช่น วิตามินซี 500mg วันละ 1 เม็ด, น้ำมันปลา 1000mg วันละ 1 เม็ด"
          />

          <LifestyleField
            label="การรักษาอื่น (แพทย์ทางเลือก / แพทย์แผนไทย)"
            htmlFor="lifestyle-other-treatments"
            editing={editingLifestyle}
            type="textarea"
            value={lifestyleData.otherTreatments}
            onChange={(val) => setLifestyleData({ ...lifestyleData, otherTreatments: val })}
            placeholder="เช่น นวดแผนไทย, ฝังเข็ม, สมุนไพร"
          />
        </div>
      </div>
    </>
  );
}

// ============ Lab & Imaging Tab - Helpers ============
function getLabResultStatusClass(status: string): string {
  if (status === 'normal') return 'bg-green-100 text-green-800';
  if (status === 'critical') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
}

function getLabStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    ordered: 'bg-yellow-100 text-yellow-800',
    collected: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
    scheduled: 'bg-indigo-100 text-indigo-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getLabStatusLabel(status: string, language: string): string {
  if (language === 'th') {
    const thLabels: Record<string, string> = {
      completed: 'เสร็จสิ้น', processing: 'กำลังตรวจ', ordered: 'สั่งแล้ว',
      collected: 'เก็บตัวอย่างแล้ว', cancelled: 'ยกเลิก', scheduled: 'นัดหมายแล้ว',
    };
    return thLabels[status] || status;
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function LabPriorityBadge({ priority }: Readonly<{ priority: string }>) {
  if (priority === 'stat') return <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">STAT</span>;
  if (priority === 'urgent') return <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded">URGENT</span>;
  return null;
}

function formatLabDate(d: string | Date, language: string): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============ Order Detail View ============
function OrderDetailView({ order, onBack, isDark, language }: Readonly<{
  order: Record<string, any>;
  onBack: () => void;
  isDark: boolean;
  language: string;
}>) {
  const cardClass = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-gray-200' : 'text-gray-800';
  const subTextClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const isLab = !!order.test_name;

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-emerald-600 hover:underline">
        <X className="w-4 h-4" /> {language === 'th' ? 'กลับ' : 'Back'}
      </button>
      <div className={`p-6 rounded-xl border ${cardClass}`}>
        <h3 className={`text-xl font-bold mb-2 ${textClass}`}>
          {isLab ? (order.test_name || 'Lab Test') : (order.imaging_type?.toUpperCase() + ' - ' + order.body_part)}
          <LabPriorityBadge priority={order.priority} />
        </h3>
        <div className={`grid grid-cols-2 gap-4 mt-4 ${subTextClass}`}>
          <div><span className="font-medium">{language === 'th' ? 'แพทย์' : 'Doctor'}:</span> {order.doctor_name || '-'}</div>
          <div><span className="font-medium">{language === 'th' ? 'วันที่สั่ง' : 'Order Date'}:</span> {formatLabDate(order.order_date, language)}</div>
          <div><span className="font-medium">{language === 'th' ? 'สถานะ' : 'Status'}:</span> <span className={`px-2 py-0.5 rounded text-xs ${getLabStatusColor(order.status)}`}>{getLabStatusLabel(order.status, language)}</span></div>
          {order.instructions && <div className="col-span-2"><span className="font-medium">{language === 'th' ? 'คำสั่ง' : 'Instructions'}:</span> {order.instructions}</div>}
        </div>
        {isLab && order.results && (
          <LabResultsTable results={order.results} testName={order.test_name} isDark={isDark} language={language} />
        )}
        {!isLab && order.result && (
          <ImagingResultView result={order.result} language={language} cardClass={cardClass} textClass={textClass} />
        )}
      </div>
    </div>
  );
}

function LabResultsTable({ results, testName, isDark, language }: Readonly<{
  results: any;
  testName: string;
  isDark: boolean;
  language: string;
}>) {
  const textClass = isDark ? 'text-gray-200' : 'text-gray-800';
  const rows = Array.isArray(results) ? results : [results];
  return (
    <div className="mt-6">
      <h4 className={`text-lg font-semibold mb-3 ${textClass}`}>{language === 'th' ? 'ผลตรวจ' : 'Results'}</h4>
      <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <table className="w-full text-sm">
          <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
            <tr>
              <th className="px-4 py-2 text-left">{language === 'th' ? 'รายการ' : 'Test'}</th>
              <th className="px-4 py-2 text-left">{language === 'th' ? 'ผล' : 'Value'}</th>
              <th className="px-4 py-2 text-left">{language === 'th' ? 'หน่วย' : 'Unit'}</th>
              <th className="px-4 py-2 text-left">{language === 'th' ? 'ค่าปกติ' : 'Normal'}</th>
              <th className="px-4 py-2 text-left">{language === 'th' ? 'สถานะ' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.testName || r.test_name || `result-${r.value}`} className={isDark ? 'border-t border-gray-700' : 'border-t border-gray-200'}>
                <td className="px-4 py-2">{r.testName || r.test_name || testName}</td>
                <td className="px-4 py-2 font-medium">{r.value ?? '-'}</td>
                <td className="px-4 py-2">{r.unit || '-'}</td>
                <td className="px-4 py-2">{r.normalRange || r.normal_range || '-'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${getLabResultStatusClass(r.status)}`}>
                    {r.status || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImagingResultView({ result, language, cardClass, textClass }: Readonly<{
  result: any;
  language: string;
  cardClass: string;
  textClass: string;
}>) {
  return (
    <div className="mt-6">
      <h4 className={`text-lg font-semibold mb-3 ${textClass}`}>{language === 'th' ? 'ผลการตรวจ' : 'Findings'}</h4>
      <div className={`p-4 rounded-lg border ${cardClass}`}>
        <p><span className="font-medium">{language === 'th' ? 'ผลอ่าน' : 'Findings'}:</span> {result.findings || '-'}</p>
        <p className="mt-2"><span className="font-medium">{language === 'th' ? 'สรุป' : 'Impression'}:</span> {result.impression || '-'}</p>
        {result.radiologist_name && <p className="mt-2 text-sm">{language === 'th' ? 'รังสีแพทย์' : 'Radiologist'}: {result.radiologist_name}</p>}
      </div>
    </div>
  );
}

// ============ Lab & Imaging Tab ============
function LabImagingTab() {
  const { user } = useAuth();
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [imagingOrders, setImagingOrders] = useState<any[]>([]);
  const [loadingLab, setLoadingLab] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (user) {
      loadLabOrders();
      loadImagingOrders();
    }
  }, [user]);

  const loadLabOrders = async () => {
    try {
      const res = await labOrderService.getOrders(user!.id);
      setLabOrders(res?.labOrders || []);
    } catch (e) {
      console.error('Failed to load lab orders', e);
      setLabOrders([]);
    } finally {
      setLoadingLab(false);
    }
  };

  const loadImagingOrders = async () => {
    try {
      const res = await imagingOrderService.getOrders(user!.id);
      setImagingOrders(res?.imagingOrders || []);
    } catch {
      setImagingOrders([]);
    }
  };

  if (loadingLab) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
  }

  const cardClass = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-gray-200' : 'text-gray-800';
  const subTextClass = isDark ? 'text-gray-400' : 'text-gray-500';

  if (selectedOrder) {
    return <OrderDetailView order={selectedOrder} onBack={() => setSelectedOrder(null)} isDark={isDark} language={language} />;
  }

  return (
    <div className="space-y-6">
      {/* Lab Orders Section */}
      <div>
        <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${textClass}`}>
          <FlaskConical className="w-5 h-5 text-emerald-600" />
          {language === 'th' ? 'ผลตรวจทางห้องปฏิบัติการ' : 'Lab Results'}
        </h2>
        {labOrders.length === 0 ? (
          <div className={`p-8 text-center rounded-xl border ${cardClass}`}>
            <FlaskConical className={`w-12 h-12 mx-auto mb-3 ${subTextClass}`} />
            <p className={subTextClass}>{language === 'th' ? 'ยังไม่มีผลตรวจทางห้องปฏิบัติการ' : 'No lab orders yet'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {labOrders.map((order: any) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`w-full text-left p-4 rounded-xl border transition-colors hover:border-emerald-400 ${cardClass}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-medium ${textClass}`}>{order.test_name || 'Lab Test'}</span>
                    <LabPriorityBadge priority={order.priority} />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${getLabStatusColor(order.status)}`}>{getLabStatusLabel(order.status, language)}</span>
                </div>
                <div className={`flex gap-4 mt-1 text-sm ${subTextClass}`}>
                  <span>{language === 'th' ? 'แพทย์' : 'Dr.'}: {order.doctor_name || '-'}</span>
                  <span>{formatLabDate(order.order_date, language)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Imaging Orders Section */}
      <div>
        <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${textClass}`}>
          <ImageIcon className="w-5 h-5 text-blue-600" />
          {language === 'th' ? 'ผลตรวจทางรังสีวิทยา' : 'Imaging Results'}
        </h2>
        {imagingOrders.length === 0 ? (
          <div className={`p-8 text-center rounded-xl border ${cardClass}`}>
            <ImageIcon className={`w-12 h-12 mx-auto mb-3 ${subTextClass}`} />
            <p className={subTextClass}>{language === 'th' ? 'ยังไม่มีผลตรวจทางรังสีวิทยา' : 'No imaging orders yet'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {imagingOrders.map((order: any) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`w-full text-left p-4 rounded-xl border transition-colors hover:border-blue-400 ${cardClass}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-medium ${textClass}`}>{order.imaging_type?.toUpperCase()} - {order.body_part}</span>
                    <LabPriorityBadge priority={order.priority} />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${getLabStatusColor(order.status)}`}>{getLabStatusLabel(order.status, language)}</span>
                </div>
                <div className={`flex gap-4 mt-1 text-sm ${subTextClass}`}>
                  <span>{language === 'th' ? 'แพทย์' : 'Dr.'}: {order.doctor_name || '-'}</span>
                  <span>{formatLabDate(order.order_date, language)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PHRPage() {
  const { user, updateUser } = useAuth();
  const { theme, t, language } = useSettings();
  const isDark = theme === 'dark';
  const [phr, setPhr] = useState<PersonalHealthRecord | null>(null);
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>('overview');
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [newVitals, setNewVitals] = useState<NewVitalsState>({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    weight: '',
    temperature: '',
    bloodGlucose: '',
    oxygenSaturation: ''
  });
  const [newMedication, setNewMedication] = useState<NewMedicationState>({
    name: '',
    dosage: '',
    frequency: '',
    purpose: ''
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [profileData, setProfileData] = useState<ProfileDataState>({
    height: '',
    weight: '',
    bloodType: '',
    chronicConditions: [],
    newCondition: ''
  });
  // Lifestyle data state for self-entered health data
  const [lifestyleData, setLifestyleData] = useState<LifestyleState>({
    diet: 'Unknown',
    exercise: 'moderate',
    sleep: 'Unknown',
    smokingStatus: 'never',
    alcoholConsumption: 'never',
    supplements: '',
    otherTreatments: ''
  });
  const [editingLifestyle, setEditingLifestyle] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  useEffect(() => {
    if (phr || user) {
      setProfileData({
        height: phr?.demographics?.height?.toString() || '',
        weight: vitals[0]?.weight?.value?.toString() || '',
        bloodType: user?.bloodType || '',
        chronicConditions: user?.chronicConditions || [],
        newCondition: ''
      });
      // Load lifestyle data from PHR
      setLifestyleData({
        diet: phr?.lifestyle?.diet || phr?.lifestyle?.dietType || 'Unknown',
        exercise: phr?.lifestyle?.exerciseFrequency || phr?.lifestyle?.exercise || 'moderate',
        sleep: phr?.lifestyle?.sleepHours ? `${phr.lifestyle.sleepHours} ชั่วโมง` : 'Unknown',
        smokingStatus: phr?.lifestyle?.smokingStatus || 'never',
        alcoholConsumption: phr?.lifestyle?.alcoholConsumption || 'never',
        supplements: phr?.lifestyle?.supplements || '',
        otherTreatments: phr?.lifestyle?.otherTreatments || ''
      });
    }
  }, [phr, user, vitals]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [phrData, vitalsData] = await Promise.all([
        phrService.get(user.id).catch((err: unknown) => { console.error('[PHRPage] PHR fetch failed:', err); return null; }),
        phrService.getVitals(user.id).catch((err: unknown) => { console.error('[PHRPage] Vitals fetch failed:', err); return []; }),
      ]);
      setPhr(phrData);
      // Sort vitals by date, newest first
      const sortedVitals = Array.isArray(vitalsData)
        ? vitalsData.sort((a: VitalSigns, b: VitalSigns) => {
            const dateA = new Date(a.measuredAt || 0).getTime();
            const dateB = new Date(b.measuredAt || 0).getTime();
            return dateB - dateA;
          })
        : [];
      setVitals(sortedVitals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  const handleAddVitals = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const vitalsData = buildVitalsData(newVitals);

      await phrService.addVitals(user.id, vitalsData);
      setShowAddVitals(false);
      setNewVitals({
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        heartRate: '',
        weight: '',
        temperature: '',
        bloodGlucose: '',
        oxygenSaturation: ''
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedication = async () => {
    if (!user || !newMedication.name || !newMedication.dosage) return;
    setSaving(true);
    try {
      const currentMedications = phr?.currentMedications || [];
      const newMed: Medication = {
        id: `med_${Date.now()}`,
        name: newMedication.name,
        dosage: newMedication.dosage,
        frequency: newMedication.frequency,
        purpose: newMedication.purpose,
        route: 'oral',
        startDate: new Date(),
        status: 'active'
      };

      await phrService.update(user.id, {
        ...phr,
        currentMedications: [...currentMedications, newMed],
        updatedAt: new Date()
      });

      setShowAddMedication(false);
      setNewMedication({ name: '', dosage: '', frequency: '', purpose: '' });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAllergy = async () => {
    if (!user || !newAllergy.trim()) return;
    setSaving(true);
    try {
      const trimmed = newAllergy.trim();
      const currentAllergies = normalizeAllergiesList(phr?.allergies ?? user?.allergies);
      if (currentAllergies.includes(trimmed)) {
        alert('มีการแพ้นี้อยู่แล้ว');
        return;
      }

      const updatedAllergies = [...currentAllergies, trimmed];
      await phrService.update(user.id, {
        ...phr,
        allergies: updatedAllergies,
        updatedAt: new Date(),
      });

      if (updateUser) {
        updateUser({ ...user, allergies: updatedAllergies });
      }

      setShowAddAllergy(false);
      setNewAllergy('');
      await loadData();
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update PHR with height
      if (profileData.height) {
        await phrService.update(user.id, {
          ...phr,
          demographics: buildDemographicsUpdate(phr, user, profileData.height),
          updatedAt: new Date()
        });
      }

      // Update user with blood type and chronic conditions
      if (updateUser) {
        updateUser({
          ...user,
          bloodType: profileData.bloodType,
          chronicConditions: profileData.chronicConditions
        });
      }

      setEditingProfile(false);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLifestyle = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update PHR with lifestyle data
      await phrService.update(user.id, {
        ...phr,
        lifestyle: {
          diet: lifestyleData.diet,
          dietType: lifestyleData.diet as LifestyleData['dietType'],
          exerciseFrequency: lifestyleData.exercise as LifestyleData['exerciseFrequency'],
          exercise: lifestyleData.exercise,
          sleepHours: lifestyleData.sleep === 'Unknown' ? 0 : Number.parseInt(lifestyleData.sleep, 10) || 0,
          smokingStatus: lifestyleData.smokingStatus as LifestyleData['smokingStatus'],
          alcoholConsumption: lifestyleData.alcoholConsumption as LifestyleData['alcoholConsumption'],
          supplements: lifestyleData.supplements,
          otherTreatments: lifestyleData.otherTreatments
        },
        updatedAt: new Date()
      });

      setEditingLifestyle(false);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const addChronicCondition = () => {
    if (profileData.newCondition.trim() && !profileData.chronicConditions.includes(profileData.newCondition.trim())) {
      setProfileData({
        ...profileData,
        chronicConditions: [...profileData.chronicConditions, profileData.newCondition.trim()],
        newCondition: ''
      });
    }
  };

  const removeChronicCondition = (condition: string) => {
    setProfileData({
      ...profileData,
      chronicConditions: profileData.chronicConditions.filter(c => c !== condition)
    });
  };

  // Get latest vital for quick display
  const latestVital = vitals[0];
  const previousVital = vitals[1];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;

  const tabs = [
    { id: 'overview', label: t('phr.overview') || (language === 'th' ? 'ภาพรวม' : 'Overview'), icon: FileText },
    { id: 'vitals', label: t('phr.vitalSigns'), icon: Activity },
    { id: 'medications', label: t('phr.medications'), icon: Pill },
    { id: 'allergies', label: t('phr.allergies'), icon: AlertTriangle },
    { id: 'lab-imaging', label: language === 'th' ? 'ผลตรวจ' : 'Lab & Imaging', icon: FlaskConical },
    { id: 'profile', label: t('phr.personalInfo'), icon: UserIcon },
  ] as const;

  const getTabClass = (isActive: boolean) => {
    if (isActive) return 'bg-emerald-600 text-white';
    return isDark
      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200';
  };

  const tabPanels: Record<TabId, JSX.Element> = {
    overview: (
      <OverviewTab
        latestVital={latestVital}
        previousVital={previousVital}
        phr={phr}
        user={user}
        onOpenVitals={() => { setTab('vitals'); setShowAddVitals(true); }}
        onOpenMedication={() => { setTab('medications'); setShowAddMedication(true); }}
        onOpenAllergy={() => { setTab('allergies'); setShowAddAllergy(true); }}
        onOpenProfile={() => { setTab('profile'); setEditingProfile(true); }}
      />
    ),
    vitals: (
      <VitalsTab
        vitals={vitals}
        showAddVitals={showAddVitals}
        setShowAddVitals={setShowAddVitals}
        newVitals={newVitals}
        setNewVitals={setNewVitals}
        saving={saving}
        onAddVitals={handleAddVitals}
      />
    ),
    medications: (
      <MedicationsTab
        medications={phr?.medications || phr?.currentMedications}
        showAddMedication={showAddMedication}
        setShowAddMedication={setShowAddMedication}
        newMedication={newMedication}
        setNewMedication={setNewMedication}
        saving={saving}
        onAddMedication={handleAddMedication}
      />
    ),
    allergies: (
      <AllergiesTab
        allergies={normalizeAllergiesList(phr?.allergies ?? user?.allergies)}
        showAddAllergy={showAddAllergy}
        setShowAddAllergy={setShowAddAllergy}
        newAllergy={newAllergy}
        setNewAllergy={setNewAllergy}
        saving={saving}
        onAddAllergy={handleAddAllergy}
      />
    ),
    'lab-imaging': (
      <LabImagingTab />
    ),
    profile: (
      <ProfileTab
        phr={phr}
        user={user}
        editingProfile={editingProfile}
        setEditingProfile={setEditingProfile}
        saving={saving}
        profileData={profileData}
        setProfileData={setProfileData}
        addChronicCondition={addChronicCondition}
        removeChronicCondition={removeChronicCondition}
        onSaveProfile={handleSaveProfile}
        lifestyleData={lifestyleData}
        setLifestyleData={setLifestyleData}
        editingLifestyle={editingLifestyle}
        setEditingLifestyle={setEditingLifestyle}
        onSaveLifestyle={handleSaveLifestyle}
      />
    )
  };
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{t('phr.title')}</h1>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${getTabClass(tab === tabItem.id)}`}
          >
            <tabItem.icon className="w-4 h-4" /> {tabItem.label}
          </button>
        ))}
      </div>

      {tabPanels[tab]}
    </div>
  );
}

export default PHRPage;

