import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pdpaService, doctorService } from '../../lib/services';
import { Doctor } from '../../types';
import { 
  Shield, Check, AlertCircle, FileText, Clock, ChevronRight, 
  UserPlus, X, Search, Building2, Stethoscope, Eye, EyeOff,
  History, Trash2, CheckCircle2, Info, Lock, Users
} from 'lucide-react';

interface Consent {
  id: string;
  type: string;
  title: string;
  description: string;
  granted: boolean;
  grantedAt?: string;
  required: boolean;
}

interface DoctorConsent {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  hospitalName?: string;
  dataTypes: string[];
  purpose?: string;
  status: 'granted' | 'revoked' | 'expired';
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

interface AuditLogEntry {
  timestamp: string;
  action: string;
  doctorId?: string;
  doctorName?: string;
  dataAccessed?: string;
  consentId?: string;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  demographics: 'ข้อมูลส่วนตัว',
  medical_history: 'ประวัติการรักษา',
  medications: 'ยาที่ใช้',
  allergies: 'ประวัติการแพ้',
  lab_results: 'ผลตรวจทางห้องปฏิบัติการ',
  imaging_results: 'ผลเอกซเรย์/อัลตร้าซาวด์',
  prescriptions: 'ใบสั่งยา',
  vital_signs: 'สัญญาณชีพ',
  phr: 'ข้อมูลสุขภาพส่วนบุคคล',
  emr: 'เวชระเบียนอิเล็กทรอนิกส์',
  living_will: 'พินัยกรรมชีวิต',
  all: 'ข้อมูลทั้งหมด',
};

export default function PDPAPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'consents' | 'doctors' | 'audit'>('consents');
  const [consents, setConsents] = useState<Consent[]>([]);
  const [doctorConsents, setDoctorConsents] = useState<DoctorConsent[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Grant consent modal state
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [consentPurpose, setConsentPurpose] = useState('');
  const [expiryDays, setExpiryDays] = useState(365);
  const [grantingConsent, setGrantingConsent] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const patientId = user.patientId || user.id;
      
      // Load all data in parallel
      const [consentsData, doctorConsentsData, auditData, doctorsData] = await Promise.all([
        pdpaService.getConsents(patientId).catch(() => ({ consents: [] })),
        pdpaService.getDoctorConsents(patientId).catch(() => []),
        pdpaService.getAuditLog(patientId).catch(() => []),
        doctorService.getAll().catch(() => []),
      ]);

      if (consentsData?.consents) {
        setConsents(consentsData.consents);
      } else {
        setConsents(getDefaultConsents());
      }
      
      setDoctorConsents(doctorConsentsData || []);
      setAuditLog(auditData || []);
      setDoctors(doctorsData || []);
    } catch (e) {
      console.error('Failed to load data:', e);
      setConsents(getDefaultConsents());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultConsents = (): Consent[] => [
    {
      id: 'essential',
      type: 'essential',
      title: 'ข้อมูลจำเป็นพื้นฐาน',
      description: 'การเก็บข้อมูลส่วนบุคคลเพื่อการให้บริการทางการแพทย์ รวมถึงชื่อ นามสกุล วันเกิด และข้อมูลติดต่อ',
      granted: true,
      required: true,
    },
    {
      id: 'health_data',
      type: 'health_data',
      title: 'ข้อมูลสุขภาพ',
      description: 'อนุญาตให้บันทึกและเข้าถึงข้อมูลสุขภาพของคุณ เช่น ประวัติการรักษา ผลตรวจ และยาที่ใช้',
      granted: false,
      required: false,
    },
    {
      id: 'data_sharing',
      type: 'data_sharing',
      title: 'แชร์ข้อมูลกับแพทย์ในโครงการ',
      description: 'อนุญาตให้แพทย์ทุกท่านในโครงการ Izara Telemedicine เข้าถึงข้อมูลการรักษาของคุณเมื่อจำเป็น',
      granted: false,
      required: false,
    },
    {
      id: 'analytics',
      type: 'analytics',
      title: 'การวิเคราะห์ข้อมูล',
      description: 'อนุญาตให้ใช้ข้อมูลแบบไม่ระบุตัวตนเพื่อการวิจัยและพัฒนาบริการ',
      granted: false,
      required: false,
    },
    {
      id: 'marketing',
      type: 'marketing',
      title: 'การตลาดและโปรโมชั่น',
      description: 'รับข่าวสารโปรโมชั่นและข้อเสนอพิเศษด้านสุขภาพ',
      granted: false,
      required: false,
    },
  ];

  const handleToggleConsent = async (consentId: string, granted: boolean) => {
    if (!user?.id) return;
    const consent = consents.find((c) => c.id === consentId);
    if (consent?.required && !granted) return;

    setSaving(consentId);
    try {
      const patientId = user.patientId || user.id;
      await pdpaService.updateConsent(patientId, consentId, granted);
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId
            ? { ...c, granted, grantedAt: granted ? new Date().toISOString() : undefined }
            : c
        )
      );
    } catch (e) {
      console.error('Failed to update consent:', e);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(null);
    }
  };

  const handleGrantDoctorConsent = async () => {
    if (!user?.id || !selectedDoctor || selectedDataTypes.length === 0) return;

    setGrantingConsent(true);
    try {
      const patientId = user.patientId || user.id;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const consentData = {
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        hospitalName: selectedDoctor.hospital,
        dataTypes: selectedDataTypes,
        purpose: consentPurpose || 'การรักษาพยาบาล',
        expiresAt: expiresAt.toISOString(),
      };

      await pdpaService.grantConsent(patientId, consentData);
      
      // Refresh doctor consents
      const updatedConsents = await pdpaService.getDoctorConsents(patientId);
      setDoctorConsents(updatedConsents || []);

      // Reset modal
      setShowGrantModal(false);
      setSelectedDoctor(null);
      setSelectedDataTypes([]);
      setConsentPurpose('');
      setExpiryDays(365);
    } catch (e) {
      console.error('Failed to grant consent:', e);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setGrantingConsent(false);
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    if (!user?.id || !confirm('ต้องการเพิกถอนการยินยอมนี้หรือไม่?')) return;

    try {
      const patientId = user.patientId || user.id;
      await pdpaService.revokeConsent(patientId, consentId, 'ผู้ใช้เพิกถอน');
      
      // Update local state
      setDoctorConsents((prev) =>
        prev.map((c) =>
          c.id === consentId
            ? { ...c, status: 'revoked' as const, revokedAt: new Date().toISOString() }
            : c
        )
      );
    } catch (e) {
      console.error('Failed to revoke consent:', e);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hospital?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDataType = (type: string) => {
    setSelectedDataTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">การจัดการข้อมูลส่วนบุคคล</h1>
          <p className="text-gray-600">PDPA และการยินยอมเข้าถึงข้อมูล</p>
        </div>
        <Link
          to="/living-will"
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm"
        >
          <FileText className="w-5 h-5" />
          <span className="hidden sm:inline">พินัยกรรมชีวิต</span>
        </Link>
      </div>

      {/* PDPA Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Info className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-blue-800 font-semibold">พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 (PDPA)</p>
            <p className="text-blue-700 mt-1 text-sm leading-relaxed">
              คุณมีสิทธิ์ในการเลือกว่าจะอนุญาตให้ใครเข้าถึงข้อมูลสุขภาพของคุณ สามารถให้ความยินยอมหรือเพิกถอนได้ตลอดเวลา
              ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัยตามมาตรฐานสากล
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'consents', label: 'การยินยอม', icon: <Shield className="w-4 h-4" /> },
          { id: 'doctors', label: 'แพทย์ที่มีสิทธิ์', icon: <Users className="w-4 h-4" /> },
          { id: 'audit', label: 'ประวัติการเข้าถึง', icon: <History className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'consents' && (
        <div className="space-y-4">
          {/* Consent Cards */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {consents.map((consent) => (
              <div key={consent.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-800">{consent.title}</h3>
                      {consent.required && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">
                          จำเป็น
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{consent.description}</p>
                    {consent.granted && consent.grantedAt && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>ยินยอมเมื่อ {formatDate(consent.grantedAt)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleConsent(consent.id, !consent.granted)}
                    disabled={consent.required || saving === consent.id}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      consent.granted ? 'bg-emerald-500' : 'bg-gray-300'
                    } ${consent.required ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                  >
                    {saving === consent.id ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div
                        className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                          consent.granted ? 'translate-x-7' : 'translate-x-0.5'
                        }`}
                      />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Rights Section */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-800">สิทธิ์ของเจ้าของข้อมูล</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: Eye, text: 'สิทธิ์ในการเข้าถึงข้อมูลส่วนบุคคล' },
                { icon: FileText, text: 'สิทธิ์ในการแก้ไขข้อมูลส่วนบุคคล' },
                { icon: Trash2, text: 'สิทธิ์ในการลบข้อมูลส่วนบุคคล' },
                { icon: EyeOff, text: 'สิทธิ์ในการถอนความยินยอม' },
                { icon: Lock, text: 'สิทธิ์ในการจำกัดการประมวลผล' },
                { icon: AlertCircle, text: 'สิทธิ์ในการร้องเรียน' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <item.icon className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="space-y-6">
          {/* Main Sharing Consent Section */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                แชร์ข้อมูลกับแพทย์
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                อนุญาตให้แพทย์และผู้ดูแลระบบในโครงการ Izara เข้าถึงข้อมูลของคุณ
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Consent Checkbox */}
              <div className={`p-5 rounded-xl border-2 transition-all ${
                consents.find(c => c.id === 'data_sharing')?.granted 
                  ? 'bg-emerald-50 border-emerald-300' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={consents.find(c => c.id === 'data_sharing')?.granted || false}
                      onChange={(e) => handleToggleConsent('data_sharing', e.target.checked)}
                      disabled={saving === 'data_sharing'}
                      className="w-6 h-6 rounded-md border-2 border-emerald-400 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-lg">
                      ยินยอมแชร์ข้อมูลกับแพทย์และผู้ดูแลระบบทุกท่านในโครงการ
                    </p>
                    <p className="text-gray-600 mt-2 leading-relaxed">
                      ข้าพเจ้ายินยอมให้แพทย์และผู้ดูแลระบบทุกท่านในโครงการ Izara Telemedicine 
                      สามารถเข้าถึงข้อมูลสุขภาพของข้าพเจ้าได้ รวมถึง:
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ข้อมูลประวัติการรักษาและการนัดหมาย
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ข้อมูลยาที่ใช้และประวัติการแพ้
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ผลตรวจทางห้องปฏิบัติการและผลเอกซเรย์
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <strong>พินัยกรรมชีวิต (Living Will)</strong> เพื่อการดูแลรักษาตามความประสงค์
                      </li>
                    </ul>
                    
                    {saving === 'data_sharing' && (
                      <div className="mt-3 flex items-center gap-2 text-emerald-600">
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">กำลังบันทึก...</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Status Display */}
              {consents.find(c => c.id === 'data_sharing')?.granted ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">✓ การแชร์ข้อมูลเปิดใช้งานแล้ว</p>
                      <p className="text-sm text-green-700 mt-1">
                        แพทย์และผู้ดูแลระบบทุกท่านในโครงการสามารถเข้าถึงข้อมูลและพินัยกรรมชีวิตของคุณได้
                      </p>
                      {consents.find(c => c.id === 'data_sharing')?.grantedAt && (
                        <p className="text-xs text-green-600 mt-2">
                          ยินยอมเมื่อ: {formatDate(consents.find(c => c.id === 'data_sharing')?.grantedAt || '')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-800">⚠ ยังไม่ได้ให้ความยินยอม</p>
                      <p className="text-sm text-amber-700 mt-1">
                        กรุณาทำเครื่องหมายในช่องด้านบนเพื่อให้ความยินยอมแชร์ข้อมูลกับแพทย์ในโครงการ
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              เงื่อนไขการแชร์ข้อมูล
            </h4>
            <div className="space-y-3 text-sm text-gray-600">
              <p className="p-3 bg-gray-50 rounded-lg">
                <strong>1. วัตถุประสงค์:</strong> ข้อมูลจะถูกใช้เพื่อการดูแลรักษาสุขภาพของผู้ป่วยเท่านั้น
              </p>
              <p className="p-3 bg-gray-50 rounded-lg">
                <strong>2. ผู้ที่สามารถเข้าถึง:</strong> แพทย์และผู้ดูแลระบบที่ลงทะเบียนในโครงการ Izara Telemedicine เท่านั้น
              </p>
              <p className="p-3 bg-gray-50 rounded-lg">
                <strong>3. การบันทึก:</strong> การเข้าถึงข้อมูลทุกครั้งจะถูกบันทึกไว้ในประวัติและสามารถตรวจสอบได้
              </p>
              <p className="p-3 bg-gray-50 rounded-lg">
                <strong>4. การเพิกถอน:</strong> ท่านสามารถเพิกถอนความยินยอมได้ตลอดเวลาโดยยกเลิกเครื่องหมายในช่องด้านบน
              </p>
              <p className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <strong>5. พินัยกรรมชีวิต:</strong> หากท่านมีพินัยกรรมชีวิต (Living Will) และให้ความยินยอมนี้ 
                แพทย์ทุกท่านจะสามารถเข้าถึงเพื่อดำเนินการตามความประสงค์ของท่านได้
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 text-sm">การรักษาความปลอดภัย</p>
                <p className="text-amber-700 text-xs mt-1">
                  การเข้าถึงข้อมูลทุกครั้งจะถูกบันทึกและตรวจสอบได้ หากพบการเข้าถึงที่ไม่เหมาะสม 
                  สามารถแจ้งเจ้าหน้าที่ได้ที่ support@izara.com
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {auditLog.length === 0 ? (
              <div className="p-8 text-center">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">ยังไม่มีประวัติการเข้าถึงข้อมูล</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {auditLog.slice().reverse().map((entry, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        entry.action.includes('REVOKED') 
                          ? 'bg-red-100' 
                          : entry.action.includes('GRANTED') 
                          ? 'bg-green-100'
                          : 'bg-blue-100'
                      }`}>
                        {entry.action.includes('REVOKED') ? (
                          <EyeOff className="w-4 h-4 text-red-600" />
                        ) : entry.action.includes('GRANTED') ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Eye className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {entry.action === 'CONSENT_GRANTED' && 'ให้สิทธิ์เข้าถึงข้อมูล'}
                          {entry.action === 'CONSENT_REVOKED' && 'เพิกถอนสิทธิ์'}
                          {entry.action === 'LIVING_WILL_CREATED' && 'สร้างพินัยกรรมชีวิต'}
                          {entry.action === 'LIVING_WILL_UPDATED' && 'อัปเดตพินัยกรรมชีวิต'}
                          {entry.action === 'DATA_ACCESSED' && 'เข้าถึงข้อมูล'}
                        </p>
                        {entry.doctorName && (
                          <p className="text-sm text-gray-600">
                            แพทย์: {entry.doctorName}
                          </p>
                        )}
                        {entry.dataAccessed && (
                          <p className="text-sm text-gray-500">
                            ข้อมูล: {entry.dataAccessed}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
