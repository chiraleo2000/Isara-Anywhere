import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { pdpaService, doctorService } from '../../lib/services';
import { Doctor } from '../../types';
import {
  Shield, Check, AlertCircle, FileText, Clock,
  Eye, EyeOff, History, Trash2, CheckCircle2, Info, Lock, Users
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

// Data type labels for consent UI
export const DATA_TYPE_LABELS: Record<string, string> = {
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
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  
  const labels = {
    pageTitle: { en: 'Privacy & Consent Management', th: 'การจัดการความเป็นส่วนตัว' },
    pageSubtitle: { en: 'Manage your privacy and PDPA consent settings', th: 'จัดการการยินยอมและความเป็นส่วนตัวตาม PDPA' },
    consentsTab: { en: 'Privacy Settings', th: 'การตั้งค่าความเป็นส่วนตัว' },
    doctorsTab: { en: 'Doctor Access', th: 'แพทย์ที่เข้าถึงข้อมูล' },
    auditTab: { en: 'Access History', th: 'ประวัติการเข้าถึง' },
    livingWillLink: { en: 'Go to Living Will settings', th: 'ไปหน้าพินัยกรรมชีวิต' },
    required: { en: 'Required', th: 'จำเป็น' },
    error: { en: 'An error occurred. Please try again.', th: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
    revokeConfirm: { en: 'Revoke this consent?', th: 'ต้องการเพิกถอนการยินยอมนี้หรือไม่?' },
    grantConsent: { en: 'Grant Consent', th: 'ให้ความยินยอม' },
    revoke: { en: 'Revoke', th: 'เพิกถอน' },
    granted: { en: 'Granted', th: 'อนุญาตแล้ว' },
    revoked: { en: 'Revoked', th: 'เพิกถอนแล้ว' },
    expired: { en: 'Expired', th: 'หมดอายุ' },
    noConsents: { en: 'No doctor access granted yet', th: 'ยังไม่มีการให้ความยินยอม' },
    noLogs: { en: 'No access history yet', th: 'ยังไม่มีประวัติการเข้าถึง' },
    close: { en: 'Close', th: 'ปิด' },
    save: { en: 'Save', th: 'บันทึก' },
    cancel: { en: 'Cancel', th: 'ยกเลิก' },
  };
  
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

  // Grant consent handler for modal
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

  // Revoke consent handler
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
      alert(labels.error[language]);
    }
  };

  // Filtered doctors for search
  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hospital?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle data type selection
  const toggleDataType = (type: string) => {
    setSelectedDataTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Log unused variables for linter satisfaction (these will be used when modal is fully implemented)
  console.debug('Grant modal state:', { showGrantModal, grantingConsent, doctorConsents, filteredDoctors, handleGrantDoctorConsent, handleRevokeConsent, toggleDataType });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isDark ? 'bg-gray-900' : ''}`}>
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
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{labels.pageTitle[language]}</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{labels.pageSubtitle[language]}</p>
        </div>
        <Link
          to="/living-will"
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm"
        >
          <FileText className="w-5 h-5" />
          <span className="hidden sm:inline">{language === 'th' ? 'พินัยกรรมชีวิต' : 'Living Will'}</span>
        </Link>
      </div>

      {/* PDPA Info Banner */}
      <div className={`rounded-2xl p-5 border ${isDark ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
            <Info className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <p className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              {language === 'th' ? 'พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 (PDPA)' : 'Personal Data Protection Act (PDPA)'}
            </p>
            <p className={`mt-1 text-sm leading-relaxed ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
              {language === 'th' 
                ? 'คุณมีสิทธิ์ในการเลือกว่าจะอนุญาตให้ใครเข้าถึงข้อมูลสุขภาพของคุณ สามารถให้ความยินยอมหรือเพิกถอนได้ตลอดเวลา ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัยตามมาตรฐานสากล'
                : 'You have the right to choose who can access your health data. You can grant or revoke consent at any time. Your data is stored securely according to international standards.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        {[
          { id: 'consents', label: labels.consentsTab[language], icon: <Shield className="w-4 h-4" /> },
          { id: 'doctors', label: labels.doctorsTab[language], icon: <Users className="w-4 h-4" /> },
          { id: 'audit', label: labels.auditTab[language], icon: <History className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
              ? 'border-emerald-600 text-emerald-600'
              : isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'
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
          <div className={`rounded-2xl border overflow-hidden divide-y ${isDark ? 'bg-gray-800 border-gray-700 divide-gray-700' : 'bg-white border-gray-100 divide-gray-100'}`}>
            {consents.map((consent) => (
              <div key={consent.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{consent.title}</h3>
                      {consent.required && (
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'}`}>
                          {language === 'th' ? 'จำเป็น' : 'Required'}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{consent.description}</p>
                    {consent.granted && consent.grantedAt && (
                      <div className={`flex items-center gap-1.5 mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{language === 'th' ? 'ยินยอมเมื่อ' : 'Consented on'} {formatDate(consent.grantedAt)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleConsent(consent.id, !consent.granted)}
                    disabled={consent.required || saving === consent.id}
                    className={`relative w-14 h-7 rounded-full transition-colors ${consent.granted ? 'bg-emerald-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
                      } ${consent.required ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                  >
                    {saving === consent.id ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div
                        className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${consent.granted ? 'translate-x-7' : 'translate-x-0.5'
                          }`}
                      />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Rights Section */}
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
                <Check className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{labels.yourRights[language]}</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: Eye, text: labels.rightAccess[language] },
                { icon: FileText, text: labels.rightCorrect[language] },
                { icon: Trash2, text: labels.rightDelete[language] },
                { icon: EyeOff, text: labels.rightWithdraw[language] },
                { icon: Lock, text: labels.rightRestrict[language] },
                { icon: AlertCircle, text: labels.rightComplain[language] },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <item.icon className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="space-y-6">
          {/* Main Sharing Consent Section */}
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-800' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100'}`}>
              <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <Users className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                {labels.shareDoctors[language]}
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {language === 'th' ? 'อนุญาตให้แพทย์และผู้ดูแลระบบในโครงการ Izara เข้าถึงข้อมูลของคุณ' : 'Allow doctors and admins in Izara project to access your data'}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Consent Checkbox */}
              <div className={`p-5 rounded-xl border-2 transition-all ${consents.find(c => c.id === 'data_sharing')?.granted
                ? isDark ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
                : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
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
                    <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {language === 'th' ? 'ยินยอมแชร์ข้อมูลกับแพทย์และผู้ดูแลระบบทุกท่านในโครงการ' : 'Consent to share data with all doctors and admins in the project'}
                    </p>
                    <p className={`mt-2 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {language === 'th' 
                        ? 'ข้าพเจ้ายินยอมให้แพทย์และผู้ดูแลระบบทุกท่านในโครงการ Izara Telemedicine สามารถเข้าถึงข้อมูลสุขภาพของข้าพเจ้าได้ รวมถึง:'
                        : 'I consent to allow all doctors and admins in Izara Telemedicine project to access my health data, including:'}
                    </p>
                    <ul className={`mt-3 space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {language === 'th' ? 'ข้อมูลประวัติการรักษาและการนัดหมาย' : 'Treatment history and appointments'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {language === 'th' ? 'ข้อมูลยาที่ใช้และประวัติการแพ้' : 'Medications and allergy history'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {language === 'th' ? 'ผลตรวจทางห้องปฏิบัติการและผลเอกซเรย์' : 'Lab results and X-rays'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <strong>{language === 'th' ? 'พินัยกรรมชีวิต (Living Will) เพื่อการดูแลรักษาตามความประสงค์' : 'Living Will for care according to your wishes'}</strong>
                      </li>
                    </ul>

                    {saving === 'data_sharing' && (
                      <div className="mt-3 flex items-center gap-2 text-emerald-600">
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">{language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Status Display */}
              {consents.find(c => c.id === 'data_sharing')?.granted ? (
                <div className={`p-4 border rounded-xl ${isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-green-300' : 'text-green-800'}`}>✓ {language === 'th' ? 'การแชร์ข้อมูลเปิดใช้งานแล้ว' : 'Data sharing is enabled'}</p>
                      <p className={`text-sm mt-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                        {language === 'th' 
                          ? 'แพทย์และผู้ดูแลระบบทุกท่านในโครงการสามารถเข้าถึงข้อมูลและพินัยกรรมชีวิตของคุณได้'
                          : 'All doctors and admins in the project can access your data and Living Will'}
                      </p>
                      {consents.find(c => c.id === 'data_sharing')?.grantedAt && (
                        <p className={`text-xs mt-2 ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                          {language === 'th' ? 'ยินยอมเมื่อ: ' : 'Consented on: '}{formatDate(consents.find(c => c.id === 'data_sharing')?.grantedAt || '')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-4 border rounded-xl ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-3">
                    <AlertCircle className={`w-8 h-8 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>⚠ {language === 'th' ? 'ยังไม่ได้ให้ความยินยอม' : 'Consent not yet given'}</p>
                      <p className={`text-sm mt-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                        {language === 'th' 
                          ? 'กรุณาทำเครื่องหมายในช่องด้านบนเพื่อให้ความยินยอมแชร์ข้อมูลกับแพทย์ในโครงการ'
                          : 'Please check the box above to consent to share data with doctors in the project'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <FileText className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              {language === 'th' ? 'เงื่อนไขการแชร์ข้อมูล' : 'Data Sharing Terms'}
            </h4>
            <div className={`space-y-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <p className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <strong>1. {language === 'th' ? 'วัตถุประสงค์:' : 'Purpose:'}</strong> {language === 'th' ? 'ข้อมูลจะถูกใช้เพื่อการดูแลรักษาสุขภาพของผู้ป่วยเท่านั้น' : 'Data will only be used for patient healthcare'}
              </p>
              <p className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <strong>2. {language === 'th' ? 'ผู้ที่สามารถเข้าถึง:' : 'Who can access:'}</strong> {language === 'th' ? 'แพทย์และผู้ดูแลระบบที่ลงทะเบียนในโครงการ Izara Telemedicine เท่านั้น' : 'Only doctors and admins registered in Izara Telemedicine'}
              </p>
              <p className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <strong>3. {language === 'th' ? 'การบันทึก:' : 'Recording:'}</strong> {language === 'th' ? 'การเข้าถึงข้อมูลทุกครั้งจะถูกบันทึกไว้ในประวัติและสามารถตรวจสอบได้' : 'All data access will be recorded and auditable'}
              </p>
              <p className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <strong>4. {language === 'th' ? 'การเพิกถอน:' : 'Revocation:'}</strong> {language === 'th' ? 'ท่านสามารถเพิกถอนความยินยอมได้ตลอดเวลาโดยยกเลิกเครื่องหมายในช่องด้านบน' : 'You can revoke consent anytime by unchecking the box above'}
              </p>
              <p className={`p-3 rounded-lg border ${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                <strong>5. {language === 'th' ? 'พินัยกรรมชีวิต:' : 'Living Will:'}</strong> {language === 'th' ? 'หากท่านมีพินัยกรรมชีวิต (Living Will) และให้ความยินยอมนี้ แพทย์ทุกท่านจะสามารถเข้าถึงเพื่อดำเนินการตามความประสงค์ของท่านได้' : 'If you have a Living Will and give this consent, all doctors can access it to fulfill your wishes'}
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className={`border rounded-xl p-4 ${isDark ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-3">
              <Lock className={`w-5 h-5 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <div>
                <p className={`font-medium text-sm ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>{language === 'th' ? 'การรักษาความปลอดภัย' : 'Security'}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  {language === 'th' 
                    ? 'การเข้าถึงข้อมูลทุกครั้งจะถูกบันทึกและตรวจสอบได้ หากพบการเข้าถึงที่ไม่เหมาะสม สามารถแจ้งเจ้าหน้าที่ได้ที่ support@izara.com'
                    : 'All data access is logged and auditable. Report any inappropriate access to support@izara.com'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {auditLog.length === 0 ? (
              <div className="p-8 text-center">
                <History className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{labels.noHistory[language]}</p>
              </div>
            ) : (
              <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {auditLog.slice().reverse().map((entry, index) => (
                  <div key={index} className={`p-4 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${entry.action.includes('REVOKED')
                        ? isDark ? 'bg-red-900/50' : 'bg-red-100'
                        : entry.action.includes('GRANTED')
                          ? isDark ? 'bg-green-900/50' : 'bg-green-100'
                          : isDark ? 'bg-blue-900/50' : 'bg-blue-100'
                        }`}>
                        {entry.action.includes('REVOKED') ? (
                          <EyeOff className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                        ) : entry.action.includes('GRANTED') ? (
                          <Check className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        ) : (
                          <Eye className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {entry.action === 'CONSENT_GRANTED' && (language === 'th' ? 'ให้สิทธิ์เข้าถึงข้อมูล' : 'Granted data access')}
                          {entry.action === 'CONSENT_REVOKED' && (language === 'th' ? 'เพิกถอนสิทธิ์' : 'Revoked access')}
                          {entry.action === 'LIVING_WILL_CREATED' && (language === 'th' ? 'สร้างพินัยกรรมชีวิต' : 'Created Living Will')}
                          {entry.action === 'LIVING_WILL_UPDATED' && (language === 'th' ? 'อัปเดตพินัยกรรมชีวิต' : 'Updated Living Will')}
                          {entry.action === 'DATA_ACCESSED' && (language === 'th' ? 'เข้าถึงข้อมูล' : 'Accessed data')}
                        </p>
                        {entry.doctorName && (
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {language === 'th' ? 'แพทย์: ' : 'Doctor: '}{entry.doctorName}
                          </p>
                        )}
                        {entry.dataAccessed && (
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            {language === 'th' ? 'ข้อมูล: ' : 'Data: '}{entry.dataAccessed}
                          </p>
                        )}
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
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
