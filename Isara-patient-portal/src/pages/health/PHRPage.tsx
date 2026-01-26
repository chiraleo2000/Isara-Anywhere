import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { phrService } from '../../lib/services';
import { PersonalHealthRecord, VitalSigns, Medication, User, LifestyleData } from '../../types';
import { Heart, Activity, Pill, AlertTriangle, Plus, Edit3, Save, X, TrendingUp, TrendingDown, Minus, Scale, Thermometer, Droplet, User as UserIcon, FileText } from 'lucide-react';

type TabId = 'overview' | 'vitals' | 'medications' | 'allergies' | 'profile';

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
  const bmi = calculateBMI(phr?.demographics?.height, latestVital?.weight?.value);
  const bpStatus = getBPStatus(latestVital?.bloodPressure?.systolic, latestVital?.bloodPressure?.diastolic);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-red-500" />
            <TrendIcon current={latestVital?.bloodPressure?.systolic} previous={previousVital?.bloodPressure?.systolic} />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {latestVital?.bloodPressure ? `${latestVital.bloodPressure.systolic}/${latestVital.bloodPressure.diastolic}` : '-'}
          </p>
          <p className="text-xs text-gray-500">ความดันโลหิต</p>
          {latestVital?.bloodPressure && (
            <p className={`text-xs mt-1 text-${bpStatus.color}-600`}>
              {bpStatus.label}
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-purple-500" />
            <TrendIcon current={latestVital?.heartRate?.value} previous={previousVital?.heartRate?.value} />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {latestVital?.heartRate?.value || '-'}
          </p>
          <p className="text-xs text-gray-500">ชีพจร (bpm)</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <Scale className="w-5 h-5 text-blue-500" />
            <TrendIcon current={latestVital?.weight?.value} previous={previousVital?.weight?.value} />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {latestVital?.weight?.value || '-'}
          </p>
          <p className="text-xs text-gray-500">น้ำหนัก (กก.)</p>
          {bmi && (
            <p className="text-xs mt-1 text-gray-600">BMI: {bmi}</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center justify-between mb-2">
            <Thermometer className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {latestVital?.temperature?.value || '-'}
          </p>
          <p className="text-xs text-gray-500">อุณหภูมิ (°C)</p>
        </div>
      </div>

      {/* Basic Info & Conditions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" /> ข้อมูลพื้นฐาน
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">หมู่เลือด</span>
              <span className="font-medium">{user?.bloodType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ส่วนสูง</span>
              <span className="font-medium">{phr?.demographics?.height ? `${phr.demographics.height} ซม.` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">น้ำหนักล่าสุด</span>
              <span className="font-medium">{latestVital?.weight?.value ? `${latestVital.weight.value} กก.` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">BMI</span>
              <span className="font-medium">{bmi || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" /> โรคประจำตัว
          </h2>
          {user?.chronicConditions?.length ? (
            <div className="flex flex-wrap gap-2">
              {user.chronicConditions.map((condition) => (
                <span key={condition} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm">{condition}</span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">ไม่มี</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
        <h3 className="font-semibold text-emerald-800 mb-4">บันทึกข้อมูลสุขภาพ</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={onOpenVitals}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl hover:shadow-md transition-all"
          >
            <Activity className="w-6 h-6 text-emerald-600" />
            <span className="text-sm text-gray-600">สัญญาณชีพ</span>
          </button>
          <button
            onClick={onOpenMedication}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl hover:shadow-md transition-all"
          >
            <Pill className="w-6 h-6 text-blue-600" />
            <span className="text-sm text-gray-600">ยาที่ใช้</span>
          </button>
          <button
            onClick={onOpenAllergy}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl hover:shadow-md transition-all"
          >
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span className="text-sm text-gray-600">การแพ้</span>
          </button>
          <button
            onClick={onOpenProfile}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl hover:shadow-md transition-all"
          >
            <UserIcon className="w-6 h-6 text-purple-600" />
            <span className="text-sm text-gray-600">แก้ไขข้อมูล</span>
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
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-600" /> สัญญาณชีพ</h2>
        <button onClick={() => setShowAddVitals(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> บันทึก
        </button>
      </div>

      {showAddVitals && (
        <div className="p-4 bg-emerald-50 rounded-xl mb-4">
          <h3 className="font-medium text-emerald-800 mb-4">บันทึกสัญญาณชีพใหม่</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="vitals-systolic" className="block text-sm text-gray-600 mb-1">ความดันบน (mmHg)</label>
              <input
                id="vitals-systolic"
                type="number"
                value={newVitals.bloodPressureSystolic}
                onChange={(e) => setNewVitals({ ...newVitals, bloodPressureSystolic: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="120"
              />
            </div>
            <div>
              <label htmlFor="vitals-diastolic" className="block text-sm text-gray-600 mb-1">ความดันล่าง (mmHg)</label>
              <input
                id="vitals-diastolic"
                type="number"
                value={newVitals.bloodPressureDiastolic}
                onChange={(e) => setNewVitals({ ...newVitals, bloodPressureDiastolic: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="80"
              />
            </div>
            <div>
              <label htmlFor="vitals-heart-rate" className="block text-sm text-gray-600 mb-1">ชีพจร (bpm)</label>
              <input
                id="vitals-heart-rate"
                type="number"
                value={newVitals.heartRate}
                onChange={(e) => setNewVitals({ ...newVitals, heartRate: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="72"
              />
            </div>
            <div>
              <label htmlFor="vitals-weight" className="block text-sm text-gray-600 mb-1">น้ำหนัก (กก.)</label>
              <input
                id="vitals-weight"
                type="number"
                step="0.1"
                value={newVitals.weight}
                onChange={(e) => setNewVitals({ ...newVitals, weight: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="70"
              />
            </div>
            <div>
              <label htmlFor="vitals-temperature" className="block text-sm text-gray-600 mb-1">อุณหภูมิ (°C)</label>
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
                  // Validate on blur - must be between 35-42
                  const value = e.target.value;
                  if (value !== '') {
                    const num = Number.parseFloat(value);
                    if (Number.isNaN(num) || num < 35 || num > 42) {
                      alert('อุณหภูมิต้องอยู่ระหว่าง 35.0-42.0°C');
                      setNewVitals({ ...newVitals, temperature: '' });
                    }
                  }
                }}
                className="w-full p-2 border rounded-lg"
                placeholder="36.5"
              />
              <p className="text-xs text-gray-400 mt-1">ช่วงปกติ: 36.1-37.2°C</p>
            </div>
            <div>
              <label htmlFor="vitals-blood-glucose" className="block text-sm text-gray-600 mb-1">น้ำตาลในเลือด (mg/dL)</label>
              <input
                id="vitals-blood-glucose"
                type="number"
                value={newVitals.bloodGlucose}
                onChange={(e) => setNewVitals({ ...newVitals, bloodGlucose: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="100"
              />
            </div>
            <div>
              <label htmlFor="vitals-oxygen" className="block text-sm text-gray-600 mb-1">ออกซิเจนในเลือด (%)</label>
              <input
                id="vitals-oxygen"
                type="number"
                value={newVitals.oxygenSaturation}
                onChange={(e) => setNewVitals({ ...newVitals, oxygenSaturation: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="98"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onAddVitals} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
              บันทึก
            </button>
            <button onClick={() => setShowAddVitals(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2">
              <X className="w-4 h-4" /> ยกเลิก
            </button>
          </div>
        </div>
      )}

      {vitals.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>ยังไม่มีข้อมูลสัญญาณชีพ</p>
          <button onClick={() => setShowAddVitals(true)} className="mt-4 text-emerald-600 hover:underline">
            + เพิ่มข้อมูลสัญญาณชีพ
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {vitals.slice(0, 10).map((v) => (
            <div key={getVitalKey(v)} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="text-sm text-gray-600 font-medium">
                {v.measuredAt ? new Date(v.measuredAt).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '-'}
              </span>
              <div className="flex flex-wrap gap-4 text-sm">
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
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Pill className="w-5 h-5 text-blue-500" /> ยาที่ใช้ประจำ</h2>
        <button onClick={() => setShowAddMedication(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> เพิ่มยา
        </button>
      </div>

      {showAddMedication && (
        <div className="p-4 bg-blue-50 rounded-xl mb-4">
          <h3 className="font-medium text-blue-800 mb-4">เพิ่มยาที่ใช้</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="medication-name" className="block text-sm text-gray-600 mb-1">ชื่อยา *</label>
              <input
                id="medication-name"
                type="text"
                value={newMedication.name}
                onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="เช่น Paracetamol"
              />
            </div>
            <div>
              <label htmlFor="medication-dosage" className="block text-sm text-gray-600 mb-1">ขนาดยา *</label>
              <input
                id="medication-dosage"
                type="text"
                value={newMedication.dosage}
                onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="เช่น 500mg"
              />
            </div>
            <div>
              <label htmlFor="medication-frequency" className="block text-sm text-gray-600 mb-1">ความถี่</label>
              <input
                id="medication-frequency"
                type="text"
                value={newMedication.frequency}
                onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="เช่น วันละ 3 ครั้ง"
              />
            </div>
            <div>
              <label htmlFor="medication-purpose" className="block text-sm text-gray-600 mb-1">วัตถุประสงค์</label>
              <input
                id="medication-purpose"
                type="text"
                value={newMedication.purpose}
                onChange={(e) => setNewMedication({ ...newMedication, purpose: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="เช่น ลดไข้ บรรเทาปวด"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onAddMedication} disabled={saving || !newMedication.name || !newMedication.dosage} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
              บันทึก
            </button>
            <button onClick={() => setShowAddMedication(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2">
              <X className="w-4 h-4" /> ยกเลิก
            </button>
          </div>
        </div>
      )}

      {medications?.length ? (
        <div className="space-y-3">
          {medications.map((med) => (
            <div key={med.id} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{med.name}</p>
                  <p className="text-sm text-gray-600">{med.dosage} - {med.frequency}</p>
                  {med.purpose && <p className="text-xs text-gray-500 mt-1">วัตถุประสงค์: {med.purpose}</p>}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${med.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {med.status === 'active' ? 'ใช้อยู่' : 'หยุดใช้'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Pill className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>ไม่มียาที่ใช้ประจำ</p>
          <button onClick={() => setShowAddMedication(true)} className="mt-4 text-blue-600 hover:underline">
            + เพิ่มยาที่ใช้
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
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> การแพ้</h2>
        <button onClick={() => setShowAddAllergy(true)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
          <Plus className="w-4 h-4" /> เพิ่ม
        </button>
      </div>

      {showAddAllergy && (
        <div className="p-4 bg-red-50 rounded-xl mb-4">
          <h3 className="font-medium text-red-800 mb-4">เพิ่มการแพ้</h3>
          <div className="flex gap-2">
            <label htmlFor="allergy-input" className="sr-only">เพิ่มการแพ้</label>
            <input
              id="allergy-input"
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
              placeholder="เช่น Penicillin, อาหารทะเล, ถั่ว"
            />
            <button onClick={onAddAllergy} disabled={saving || !newAllergy.trim()} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
              บันทึก
            </button>
            <button onClick={() => { setShowAddAllergy(false); setNewAllergy(''); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {allergies?.length ? (
        <div className="flex flex-wrap gap-2">
          {allergies.map((allergy) => (
            <span key={allergy} className="px-4 py-2 bg-red-50 text-red-700 rounded-full border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {allergy}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>ไม่มีประวัติการแพ้</p>
          <button onClick={() => setShowAddAllergy(true)} className="mt-4 text-red-600 hover:underline">
            + เพิ่มการแพ้
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
                  <button onClick={() => removeChronicCondition(condition)} className="hover:text-red-600">
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
              <button onClick={addChronicCondition} className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600">
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

function PHRPage() {
  const { user, updateUser } = useAuth();
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
    try {
      const [phrData, vitalsData] = await Promise.all([
        phrService.get(user!.id).catch(() => null),
        phrService.getVitals(user!.id).catch(() => []),
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
      const vitalsData: VitalSigns = {
        measuredAt: new Date(),
      };

      // Only add fields that have values
      if (newVitals.bloodPressureSystolic && newVitals.bloodPressureDiastolic) {
        vitalsData.bloodPressure = {
          systolic: Number.parseInt(newVitals.bloodPressureSystolic, 10),
          diastolic: Number.parseInt(newVitals.bloodPressureDiastolic, 10),
          unit: 'mmHg'
        };
      }
      if (newVitals.heartRate) {
        vitalsData.heartRate = { value: Number.parseInt(newVitals.heartRate, 10), unit: 'bpm' };
      }
      if (newVitals.weight) {
        vitalsData.weight = { value: Number.parseFloat(newVitals.weight), unit: 'kg' };
      }
      if (newVitals.temperature) {
        vitalsData.temperature = { value: Number.parseFloat(newVitals.temperature), unit: 'celsius' };
      }
      if (newVitals.bloodGlucose) {
        vitalsData.bloodGlucose = { value: Number.parseFloat(newVitals.bloodGlucose), unit: 'mg/dL', testType: 'random' };
      }
      if (newVitals.oxygenSaturation) {
        vitalsData.oxygenSaturation = { value: Number.parseFloat(newVitals.oxygenSaturation), unit: '%' };
      }

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
      const currentAllergies = user.allergies || [];
      if (currentAllergies.includes(newAllergy.trim())) {
        alert('มีการแพ้นี้อยู่แล้ว');
        setSaving(false);
        return;
      }

      // Update user allergies
      if (updateUser) {
        updateUser({ ...user, allergies: [...currentAllergies, newAllergy.trim()] });
      }

      setShowAddAllergy(false);
      setNewAllergy('');
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
          demographics: {
            name: phr?.demographics?.name || user?.name || '',
            dateOfBirth: phr?.demographics?.dateOfBirth || user?.dateOfBirth || '',
            gender: phr?.demographics?.gender || user?.gender || 'other',
            bloodType: phr?.demographics?.bloodType,
            weight: phr?.demographics?.weight,
            ethnicity: phr?.demographics?.ethnicity,
            occupation: phr?.demographics?.occupation,
            height: Number.parseFloat(profileData.height)
          },
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
          diet: lifestyleData.diet as LifestyleData['diet'],
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
    { id: 'overview', label: 'ภาพรวม', icon: FileText },
    { id: 'vitals', label: 'สัญญาณชีพ', icon: Activity },
    { id: 'medications', label: 'ยาที่ใช้', icon: Pill },
    { id: 'allergies', label: 'การแพ้', icon: AlertTriangle },
    { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: UserIcon },
  ] as const;

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
        medications={phr?.currentMedications}
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
        allergies={user?.allergies}
        showAddAllergy={showAddAllergy}
        setShowAddAllergy={setShowAddAllergy}
        newAllergy={newAllergy}
        setNewAllergy={setNewAllergy}
        saving={saving}
        onAddAllergy={handleAddAllergy}
      />
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
        <h1 className="text-2xl font-bold text-gray-800">ประวัติสุขภาพส่วนบุคคล</h1>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tabPanels[tab]}
    </div>
  );
}

export default PHRPage;

