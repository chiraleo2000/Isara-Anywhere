import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pdpaService, doctorService } from '../../lib/services';
import { Doctor } from '../../types';
import {
  ChevronLeft, Save, Check, Heart, 
  User, Phone, Mail, Home, Users, Stethoscope, Plus, X,
  PenTool, Trash2, Info, Shield, CheckCircle2, Search,
  History, RotateCcw, Clock, Eye
} from 'lucide-react';

interface HealthcareProxy {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
}

interface LivingWillData {
  id?: string;
  patientId?: string;
  version?: number;
  healthcareProxy: {
    primary: HealthcareProxy;
    alternate?: HealthcareProxy;
  };
  preferences: {
    cpr: boolean;
    mechanicalVentilation: boolean;
    artificialNutrition: boolean;
    dialysis: boolean;
    organDonation: boolean;
    painManagement: string;
    additionalWishes: string;
  };
  religiousPreferences: string;
  digitalSignature: string;
  witnessSignatures: string[];
  sharedWith: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface LivingWillVersion {
  versionId: string;
  version: number;
  data: LivingWillData;
  createdAt: string;
  note?: string;
}

const RELATIONSHIP_OPTIONS = [
  'คู่สมรส',
  'บุตร',
  'บิดา',
  'มารดา',
  'พี่น้อง',
  'ญาติ',
  'เพื่อนสนิท',
  'อื่นๆ',
];

export default function LivingWillPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [step, setStep] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Version history
  const [versions, setVersions] = useState<LivingWillVersion[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<LivingWillVersion | null>(null);
  const [showVersionPreview, setShowVersionPreview] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number>(1);

  const [form, setForm] = useState<LivingWillData>({
    healthcareProxy: {
      primary: {
        name: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
      },
      alternate: undefined,
    },
    preferences: {
      cpr: true,
      mechanicalVentilation: true,
      artificialNutrition: true,
      dialysis: true,
      organDonation: false,
      painManagement: 'comfort',
      additionalWishes: '',
    },
    religiousPreferences: '',
    digitalSignature: '',
    witnessSignatures: [],
    sharedWith: [],
  });

  useEffect(() => {
    loadData();
  }, [user]); // Add user as dependency

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false); // Stop loading if no user
      return;
    }
    try {
      const patientId = user.patientId || user.id;
      const [livingWillData, doctorsData, versionsData] = await Promise.all([
        pdpaService.getLivingWill(patientId).catch(() => null),
        doctorService.getAll().catch(() => []),
        pdpaService.getLivingWillVersions(patientId).catch(() => []),
      ]);

      if (livingWillData) {
        // Merge with defaults to ensure all fields exist
        setForm(prev => ({
          ...prev,
          ...livingWillData,
          sharedWith: livingWillData.sharedWith || [],
          witnessSignatures: livingWillData.witnessSignatures || [],
        }));
        setHasExisting(true);
        setCurrentVersion(livingWillData.version || 1);
      }
      setDoctors(doctorsData || []);
      setVersions(versionsData || []);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!user?.id) return;
    
    const confirmed = window.confirm('คุณต้องการกู้คืนพินัยกรรมชีวิตเวอร์ชันนี้หรือไม่? เวอร์ชันปัจจุบันจะถูกบันทึกไว้ในประวัติ');
    if (!confirmed) return;

    setRollingBack(true);
    try {
      const patientId = user.patientId || user.id;
      const result = await pdpaService.rollbackLivingWill(patientId, versionId);
      
      if (result.success) {
        // Reload all data
        await loadData();
        setShowVersionModal(false);
        setShowVersionPreview(false);
        setSelectedVersion(null);
        alert('กู้คืนเวอร์ชันสำเร็จ');
      }
    } catch (e) {
      console.error('Failed to rollback:', e);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setRollingBack(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const updateProxy = (
    type: 'primary' | 'alternate',
    field: keyof HealthcareProxy,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      healthcareProxy: {
        ...prev.healthcareProxy,
        [type]: {
          ...(prev.healthcareProxy[type] || {
            name: '',
            relationship: '',
            phone: '',
            email: '',
            address: '',
          }),
          [field]: value,
        },
      },
    }));
  };

  const togglePreference = (key: keyof typeof form.preferences) => {
    if (typeof form.preferences[key] === 'boolean') {
      setForm((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          [key]: !prev.preferences[key],
        },
      }));
    }
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveSignature();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setForm((prev) => ({ ...prev, digitalSignature: '' }));
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    setForm((prev) => ({ ...prev, digitalSignature: dataUrl }));
  };

  const addDoctorToShare = (doctor: Doctor) => {
    if ((form.sharedWith || []).includes(doctor.id)) return;
    setForm((prev) => ({
      ...prev,
      sharedWith: [...(prev.sharedWith || []), doctor.id],
    }));
    setShowDoctorModal(false);
  };

  const removeDoctorFromShare = (doctorId: string) => {
    setForm((prev) => ({
      ...prev,
      sharedWith: (prev.sharedWith || []).filter((id) => id !== doctorId),
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    // Validate
    if (!form.healthcareProxy.primary.name || !form.healthcareProxy.primary.phone) {
      alert('กรุณากรอกข้อมูลผู้มีอำนาจตัดสินใจหลัก');
      setStep(1);
      return;
    }
    
    if (!form.digitalSignature) {
      alert('กรุณาลงลายมือชื่อดิจิทัล');
      setStep(3);
      return;
    }

    setSaving(true);
    try {
      const patientId = user.patientId || user.id;
      await pdpaService.saveLivingWill(patientId, form);
      alert('บันทึกพินัยกรรมชีวิตเรียบร้อยแล้ว');
      navigate('/pdpa');
    } catch (e) {
      console.error('Failed to save living will:', e);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sharedDoctors = doctors.filter((d) => (form.sharedWith || []).includes(d.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/pdpa')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">พินัยกรรมชีวิต</h1>
          <p className="text-gray-600">หนังสือแสดงเจตนาล่วงหน้าเกี่ยวกับการรักษาพยาบาล</p>
        </div>
        <div className="flex items-center gap-2">
          {hasExisting && (
            <>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" />
                v{currentVersion}
              </span>
              <button
                onClick={() => setShowVersionModal(true)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg flex items-center gap-1.5 hover:bg-gray-200 transition-colors"
              >
                <History className="w-4 h-4" />
                ประวัติ
              </button>
            </>
          )}
          {hasExisting && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              มีอยู่แล้ว
            </span>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Info className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-amber-800 font-semibold">พินัยกรรมชีวิตคืออะไร?</p>
            <p className="text-amber-700 mt-1 text-sm leading-relaxed">
              พินัยกรรมชีวิตเป็นเอกสารที่แสดงเจตนาล่วงหน้าของคุณเกี่ยวกับการรักษาพยาบาลในกรณีที่คุณไม่สามารถสื่อสารได้ด้วยตัวเอง
              เอกสารนี้จะช่วยให้ครอบครัวและแพทย์เข้าใจความต้องการของคุณ
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { num: 1, label: 'ผู้มีอำนาจตัดสินใจ' },
          { num: 2, label: 'ความต้องการ' },
          { num: 3, label: 'ลายมือชื่อ' },
          { num: 4, label: 'แชร์กับแพทย์' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <button
              onClick={() => setStep(s.num)}
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all ${
                step >= s.num
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > s.num ? <Check className="w-5 h-5" /> : s.num}
            </button>
            <span
              className={`ml-2 text-xs hidden lg:block ${
                step >= s.num ? 'text-emerald-600 font-medium' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
            {i < 3 && (
              <div
                className={`flex-1 h-1 mx-2 rounded ${
                  step > s.num ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Healthcare Proxy */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              ผู้มีอำนาจตัดสินใจหลัก *
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              บุคคลที่คุณมอบหมายให้ตัดสินใจเรื่องการรักษาพยาบาลแทนคุณ
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  value={form.healthcareProxy.primary.name}
                  onChange={(e) => updateProxy('primary', 'name', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="ชื่อ นามสกุล"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ความสัมพันธ์ *
                </label>
                <select
                  value={form.healthcareProxy.primary.relationship}
                  onChange={(e) => updateProxy('primary', 'relationship', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">เลือกความสัมพันธ์</option>
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เบอร์โทรศัพท์ *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={form.healthcareProxy.primary.phone}
                    onChange={(e) => updateProxy('primary', 'phone', e.target.value)}
                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="0xx-xxx-xxxx"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมล
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={form.healthcareProxy.primary.email}
                    onChange={(e) => updateProxy('primary', 'email', e.target.value)}
                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ที่อยู่
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={form.healthcareProxy.primary.address}
                    onChange={(e) => updateProxy('primary', 'address', e.target.value)}
                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none h-20"
                    placeholder="ที่อยู่"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Alternate Proxy */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              ผู้มีอำนาจตัดสินใจสำรอง (ถ้ามี)
            </h2>

            {!form.healthcareProxy.alternate ? (
              <button
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    healthcareProxy: {
                      ...prev.healthcareProxy,
                      alternate: {
                        name: '',
                        relationship: '',
                        phone: '',
                        email: '',
                        address: '',
                      },
                    },
                  }))
                }
                className="flex items-center gap-2 text-emerald-600 hover:underline"
              >
                <Plus className="w-5 h-5" />
                เพิ่มผู้มีอำนาจสำรอง
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        healthcareProxy: {
                          ...prev.healthcareProxy,
                          alternate: undefined,
                        },
                      }))
                    }
                    className="text-red-600 text-sm hover:underline"
                  >
                    ลบผู้มีอำนาจสำรอง
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      type="text"
                      value={form.healthcareProxy.alternate?.name || ''}
                      onChange={(e) => updateProxy('alternate', 'name', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl"
                      placeholder="ชื่อ นามสกุล"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ความสัมพันธ์
                    </label>
                    <select
                      value={form.healthcareProxy.alternate?.relationship || ''}
                      onChange={(e) => updateProxy('alternate', 'relationship', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl"
                    >
                      <option value="">เลือกความสัมพันธ์</option>
                      {RELATIONSHIP_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="tel"
                      value={form.healthcareProxy.alternate?.phone || ''}
                      onChange={(e) => updateProxy('alternate', 'phone', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl"
                      placeholder="0xx-xxx-xxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      value={form.healthcareProxy.alternate?.email || ''}
                      onChange={(e) => updateProxy('alternate', 'email', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
          >
            ถัดไป
          </button>
        </div>
      )}

      {/* Step 2: Medical Preferences */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              การรักษาพยาบาลในระยะสุดท้าย
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              กรุณาเลือกว่าคุณต้องการหรือไม่ต้องการการรักษาต่อไปนี้
              ในกรณีที่คุณอยู่ในระยะสุดท้ายของชีวิตหรือไม่สามารถฟื้นตัวได้
            </p>

            <div className="space-y-4">
              {[
                {
                  key: 'cpr' as const,
                  title: 'การช่วยฟื้นคืนชีพ (CPR)',
                  description: 'การกดหน้าอกและการใช้เครื่อง AED เพื่อกู้ชีพ',
                },
                {
                  key: 'mechanicalVentilation' as const,
                  title: 'เครื่องช่วยหายใจ',
                  description: 'การใช้เครื่องช่วยหายใจเมื่อไม่สามารถหายใจได้เอง',
                },
                {
                  key: 'artificialNutrition' as const,
                  title: 'การให้อาหารทางสายยาง',
                  description: 'การให้อาหารและน้ำผ่านทางสายยางหรือทางหลอดเลือด',
                },
                {
                  key: 'dialysis' as const,
                  title: 'การล้างไต',
                  description: 'การฟอกเลือดด้วยเครื่องไตเทียมเมื่อไตวาย',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-800">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePreference(item.key)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        form.preferences[item.key]
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      ต้องการ
                    </button>
                    <button
                      onClick={() => togglePreference(item.key)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        !form.preferences[item.key]
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      ไม่ต้องการ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              การบริจาคอวัยวะ
            </h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-800">
                  ฉันยินดีบริจาคอวัยวะเมื่อเสียชีวิต
                </p>
                <p className="text-sm text-gray-600">
                  อวัยวะของคุณสามารถช่วยชีวิตผู้อื่นได้
                </p>
              </div>
              <button
                onClick={() => togglePreference('organDonation')}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  form.preferences.organDonation ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    form.preferences.organDonation ? 'translate-x-7' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              การจัดการความเจ็บปวด
            </h2>
            <div className="space-y-3">
              {[
                {
                  value: 'comfort',
                  label: 'เน้นความสุขสบาย',
                  desc: 'ให้ยาแก้ปวดเพื่อลดความทุกข์ทรมานแม้อาจทำให้ง่วงซึม',
                },
                {
                  value: 'minimal',
                  label: 'ให้ยาน้อยที่สุด',
                  desc: 'ต้องการรู้สึกตัวมากที่สุด แม้จะมีความเจ็บปวดบ้าง',
                },
                {
                  value: 'balanced',
                  label: 'สมดุล',
                  desc: 'ปรับยาตามสถานการณ์โดยให้แพทย์ตัดสินใจ',
                },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        painManagement: option.value,
                      },
                    }))
                  }
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    form.preferences.painManagement === option.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-800">{option.label}</p>
                  <p className="text-sm text-gray-600">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              ความต้องการเพิ่มเติม
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ความต้องการทางศาสนา/จิตวิญญาณ
                </label>
                <textarea
                  value={form.religiousPreferences}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      religiousPreferences: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl resize-none h-24"
                  placeholder="เช่น ต้องการให้พระสงฆ์สวดมนต์, ต้องการพิธีทางศาสนา..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ความต้องการอื่นๆ
                </label>
                <textarea
                  value={form.preferences.additionalWishes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        additionalWishes: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl resize-none h-24"
                  placeholder="ข้อความหรือความต้องการอื่นๆ ที่ต้องการให้ครอบครัวหรือแพทย์ทราบ..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Digital Signature */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-emerald-600" />
              ลายมือชื่อดิจิทัล
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              กรุณาลงลายมือชื่อของคุณในกรอบด้านล่าง เพื่อยืนยันความถูกต้องของเอกสาร
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-2 mb-4 bg-gray-50">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full bg-white rounded-lg cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {form.digitalSignature ? '✓ ลายมือชื่อถูกบันทึกแล้ว' : 'ลากเมาส์หรือนิ้วเพื่อลงลายมือชื่อ'}
              </p>
              <button
                onClick={clearSignature}
                className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                ล้างลายมือชื่อ
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">ข้อกำหนดทางกฎหมาย</p>
                <p className="text-sm text-blue-700 mt-1">
                  ลายมือชื่อดิจิทัลนี้มีผลผูกพันทางกฎหมายตาม พ.ร.บ.ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์
                  พ.ศ. 2544 และฉบับแก้ไขเพิ่มเติม
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!form.digitalSignature}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Share with Doctors */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              แชร์พินัยกรรมชีวิตกับแพทย์
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              เลือกแพทย์ที่คุณต้องการให้เข้าถึงพินัยกรรมชีวิตของคุณ
              เพื่อให้แพทย์สามารถปฏิบัติตามความต้องการของคุณได้
            </p>

            <button
              onClick={() => setShowDoctorModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 font-medium hover:bg-emerald-100 mb-4"
            >
              <Plus className="w-5 h-5" />
              เพิ่มแพทย์
            </button>

            {sharedDoctors.length > 0 ? (
              <div className="space-y-3">
                {sharedDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={doctor.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(doctor.id)}`}
                        alt={doctor.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{doctor.name}</p>
                        <p className="text-sm text-gray-600">{doctor.specialty}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeDoctorFromShare(doctor.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>ยังไม่ได้เลือกแพทย์</p>
                <p className="text-sm">คุณสามารถเพิ่มภายหลังได้</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">สรุปข้อมูล</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ผู้มีอำนาจตัดสินใจหลัก</span>
                <span className="font-medium">{form.healthcareProxy.primary.name || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">การช่วยฟื้นคืนชีพ</span>
                <span className={form.preferences.cpr ? 'text-emerald-600' : 'text-red-600'}>
                  {form.preferences.cpr ? 'ต้องการ' : 'ไม่ต้องการ'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">เครื่องช่วยหายใจ</span>
                <span className={form.preferences.mechanicalVentilation ? 'text-emerald-600' : 'text-red-600'}>
                  {form.preferences.mechanicalVentilation ? 'ต้องการ' : 'ไม่ต้องการ'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">บริจาคอวัยวะ</span>
                <span className={form.preferences.organDonation ? 'text-emerald-600' : 'text-gray-500'}>
                  {form.preferences.organDonation ? 'ยินดี' : 'ไม่ยินดี'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ลายมือชื่อ</span>
                <span className={form.digitalSignature ? 'text-emerald-600' : 'text-red-600'}>
                  {form.digitalSignature ? '✓ ลงลายมือชื่อแล้ว' : 'ยังไม่ได้ลงลายมือชื่อ'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">แชร์กับแพทย์</span>
                <span>{sharedDoctors.length} คน</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  บันทึกพินัยกรรมชีวิต
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Doctor Selection Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">เลือกแพทย์</h2>
              <button
                onClick={() => setShowDoctorModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาแพทย์..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredDoctors.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => addDoctorToShare(doctor)}
                  disabled={(form.sharedWith || []).includes(doctor.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    (form.sharedWith || []).includes(doctor.id)
                      ? 'bg-gray-100 opacity-50'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <img
                    src={doctor.avatarUrl || `https://i.pravatar.cc/150?u=${doctor.id}`}
                    alt={doctor.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{doctor.name}</p>
                    <p className="text-sm text-gray-600">{doctor.specialty}</p>
                  </div>
                  {(form.sharedWith || []).includes(doctor.id) && (
                    <Check className="w-5 h-5 text-emerald-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <History className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">ประวัติเวอร์ชัน</h2>
                  <p className="text-sm text-gray-500">เวอร์ชันปัจจุบัน: v{currentVersion}</p>
                </div>
              </div>
              <button
                onClick={() => setShowVersionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {versions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">ยังไม่มีประวัติเวอร์ชันก่อนหน้า</p>
                  <p className="text-sm text-gray-400 mt-1">เมื่อคุณอัปเดตพินัยกรรมชีวิต เวอร์ชันก่อนหน้าจะถูกบันทึกไว้ที่นี่</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.slice().reverse().map((version) => (
                    <div
                      key={version.versionId}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              v{version.version}
                            </span>
                            {version.note && (
                              <span className="text-xs text-gray-500">{version.note}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDateTime(version.createdAt)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ผู้ตัดสินใจ: {version.data?.healthcareProxy?.primary?.name || '-'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedVersion(version);
                              setShowVersionPreview(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRollback(version.versionId)}
                            disabled={rollingBack}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            title="กู้คืนเวอร์ชันนี้"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Version Preview Modal */}
      {showVersionPreview && selectedVersion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">รายละเอียดเวอร์ชัน {selectedVersion.version}</h2>
                  <p className="text-sm text-gray-500">{formatDateTime(selectedVersion.createdAt)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowVersionPreview(false);
                  setSelectedVersion(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  ผู้มีอำนาจตัดสินใจหลัก
                </h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">ชื่อ:</span> {selectedVersion.data?.healthcareProxy?.primary?.name || '-'}</p>
                  <p><span className="text-gray-500">ความสัมพันธ์:</span> {selectedVersion.data?.healthcareProxy?.primary?.relationship || '-'}</p>
                  <p><span className="text-gray-500">โทรศัพท์:</span> {selectedVersion.data?.healthcareProxy?.primary?.phone || '-'}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  ความต้องการการรักษา
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedVersion.data?.preferences?.cpr ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span>CPR: {selectedVersion.data?.preferences?.cpr ? 'ต้องการ' : 'ไม่ต้องการ'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedVersion.data?.preferences?.mechanicalVentilation ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span>เครื่องช่วยหายใจ: {selectedVersion.data?.preferences?.mechanicalVentilation ? 'ต้องการ' : 'ไม่ต้องการ'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedVersion.data?.preferences?.artificialNutrition ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span>อาหารทางสาย: {selectedVersion.data?.preferences?.artificialNutrition ? 'ต้องการ' : 'ไม่ต้องการ'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedVersion.data?.preferences?.dialysis ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span>ล้างไต: {selectedVersion.data?.preferences?.dialysis ? 'ต้องการ' : 'ไม่ต้องการ'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedVersion.data?.preferences?.organDonation ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <span>บริจาคอวัยวะ: {selectedVersion.data?.preferences?.organDonation ? 'ยินดี' : 'ไม่ยินดี'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowVersionPreview(false);
                  setSelectedVersion(null);
                }}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
              >
                ปิด
              </button>
              <button
                onClick={() => handleRollback(selectedVersion.versionId)}
                disabled={rollingBack}
                className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rollingBack ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    กู้คืนเวอร์ชันนี้
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
