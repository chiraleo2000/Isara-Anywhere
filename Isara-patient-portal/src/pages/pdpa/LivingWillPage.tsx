import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
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

// Type for language keys
type LangKey = 'en' | 'th';

// i18n labels with proper typing
const labels: Record<string, Record<LangKey, string>> = {
  pageTitle: { en: 'Living Will', th: 'พินัยกรรมชีวิต' },
  backToPrivacy: { en: 'Back to Privacy', th: 'กลับ' },
  save: { en: 'Save', th: 'บันทึก' },
  saving: { en: 'Saving...', th: 'กำลังบันทึก...' },
  step1: { en: 'Healthcare Proxy', th: 'ผู้รับมอบฉันทะดูแลสุขภาพ' },
  step2: { en: 'Treatment Preferences', th: 'การตัดสินใจทางการแพทย์' },
  step3: { en: 'Signature', th: 'ลายเซ็นและยืนยัน' },
  step4: { en: 'Share', th: 'แชร์กับแพทย์' },
  primaryProxy: { en: 'Primary Healthcare Proxy', th: 'ผู้รับมอบฉันทะหลัก' },
  alternateProxy: { en: 'Alternate Proxy (Optional)', th: 'ผู้รับมอบฉันทะสำรอง (ไม่บังคับ)' },
  addAlternate: { en: 'Add Alternate Proxy', th: 'เพิ่มผู้รับมอบฉันทะสำรอง' },
  name: { en: 'Full Name', th: 'ชื่อ-นามสกุล' },
  relationship: { en: 'Relationship', th: 'ความสัมพันธ์' },
  phone: { en: 'Phone Number', th: 'เบอร์โทรศัพท์' },
  email: { en: 'Email', th: 'อีเมล' },
  address: { en: 'Address', th: 'ที่อยู่' },
  cpr: { en: 'CPR', th: 'การกู้ชีพ (CPR)' },
  cprDesc: { en: 'Cardiopulmonary resuscitation if heart stops', th: 'กู้ชีพหากหัวใจหยุดเต้น' },
  mechanicalVentilation: { en: 'Mechanical Ventilation', th: 'เครื่องช่วยหายใจ' },
  mechanicalVentilationDesc: { en: 'Use of breathing machine when unable to breathe independently', th: 'ใช้เครื่องช่วยเมื่อหายใจเองไม่ได้' },
  artificialNutrition: { en: 'Artificial Nutrition', th: 'อาหารทางสายยาง' },
  artificialNutritionDesc: { en: 'Tube feeding when unable to eat normally', th: 'ให้อาหารผ่านสายเมื่อกินเองไม่ได้' },
  dialysis: { en: 'Dialysis', th: 'ฟอกไต' },
  dialysisDesc: { en: 'Dialysis when kidneys fail', th: 'ฟอกไตเมื่อไตวาย' },
  organDonation: { en: 'Organ Donation', th: 'บริจาคอวัยวะ' },
  organDonationDesc: { en: 'Donate organs after death', th: 'บริจาคอวัยวะหลังเสียชีวิต' },
  painManagement: { en: 'Pain Management', th: 'การจัดการความเจ็บปวด' },
  additionalWishes: { en: 'Additional Wishes', th: 'ความประสงค์เพิ่มเติม' },
  religiousPreferences: { en: 'Religious Preferences', th: 'ความต้องการทางศาสนา' },
  signature: { en: 'Your Signature', th: 'ลายเซ็นของคุณ' },
  clearSignature: { en: 'Clear', th: 'ล้าง' },
  shareWithDoctors: { en: 'Share with Doctors', th: 'แชร์กับแพทย์' },
  versionHistory: { en: 'Version History', th: 'ประวัติเวอร์ชัน' },
  currentVersion: { en: 'Current Version', th: 'เวอร์ชันปัจจุบัน' },
  rollback: { en: 'Restore', th: 'กู้คืน' },
  preview: { en: 'Preview', th: 'ดูตัวอย่าง' },
  confirmRollback: { en: 'Are you sure you want to restore this version? The current version will be saved in history.', th: 'คุณต้องการกู้คืนพินัยกรรมชีวิตเวอร์ชันนี้หรือไม่? เวอร์ชันปัจจุบันจะถูกบันทึกไว้ในประวัติ' },
  rollbackSuccess: { en: 'Version restored successfully', th: 'กู้คืนเวอร์ชันสำเร็จ' },
  error: { en: 'An error occurred. Please try again.', th: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
  saveSuccess: { en: 'Living Will saved successfully', th: 'บันทึกพินัยกรรมชีวิตสำเร็จ' },
  loading: { en: 'Loading...', th: 'กำลังโหลด...' },
  noVersions: { en: 'No version history available', th: 'ยังไม่มีประวัติเวอร์ชัน' },
  selectDoctor: { en: 'Select Doctor', th: 'เลือกแพทย์' },
  searchDoctor: { en: 'Search doctor...', th: 'ค้นหาแพทย์...' },
  sharedWith: { en: 'Shared with', th: 'แชร์กับ' },
  noSharing: { en: 'Not shared with any doctor yet', th: 'ยังไม่ได้แชร์กับแพทย์' },
  next: { en: 'Next', th: 'ถัดไป' },
  previous: { en: 'Previous', th: 'ก่อนหน้า' },
  complete: { en: 'Complete', th: 'เสร็จสิ้น' },
};

const RELATIONSHIP_OPTIONS_BILINGUAL: Array<Record<LangKey, string>> = [
  { en: 'Spouse', th: 'คู่สมรส' },
  { en: 'Child', th: 'บุตร' },
  { en: 'Father', th: 'บิดา' },
  { en: 'Mother', th: 'มารดา' },
  { en: 'Sibling', th: 'พี่น้อง' },
  { en: 'Relative', th: 'ญาติ' },
  { en: 'Close Friend', th: 'เพื่อนสนิท' },
  { en: 'Other', th: 'อื่นๆ' },
];

// Helper to safely access labels with language key
function getLabel(key: string, lang: string): string {
  const langKey = (lang === 'th' ? 'th' : 'en') as LangKey;
  return labels[key]?.[langKey] ?? key;
}

// ─── Extracted handler functions (reduce cognitive complexity of main component) ───

function formatDateTimeStr(dateStr: string, language: string): string {
  return new Date(dateStr).toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initCanvasDrawing(
  canvas: HTMLCanvasElement | null,
  setIsDrawing: (v: boolean) => void,
  e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
) {
  if (!canvas) return;
  setIsDrawing(true);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
  const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function performCanvasDraw(
  canvas: HTMLCanvasElement | null,
  isDrawing: boolean,
  e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
) {
  if (!isDrawing) return;
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
}

function clearCanvasSignature(
  canvas: HTMLCanvasElement | null,
  setForm: React.Dispatch<React.SetStateAction<LivingWillData>>
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setForm((prev) => ({ ...prev, digitalSignature: '' }));
}

function saveCanvasSignature(
  canvas: HTMLCanvasElement | null,
  setForm: React.Dispatch<React.SetStateAction<LivingWillData>>
) {
  if (!canvas) return;
  const dataUrl = canvas.toDataURL('image/png');
  setForm((prev) => ({ ...prev, digitalSignature: dataUrl }));
}

interface LoadLivingWillOptions {
  userId: string | undefined;
  patientId: string | undefined;
  setForm: React.Dispatch<React.SetStateAction<LivingWillData>>;
  setHasExisting: (v: boolean) => void;
  setCurrentVersion: (v: number) => void;
  setDoctors: (v: Doctor[]) => void;
  setVersions: (v: LivingWillVersion[]) => void;
  setLoading: (v: boolean) => void;
}

async function loadLivingWillData(opts: LoadLivingWillOptions) {
  const { userId, patientId, setForm, setHasExisting, setCurrentVersion, setDoctors, setVersions, setLoading } = opts;
  if (!userId) {
    setLoading(false);
    return;
  }
  try {
    const pid = patientId || userId;
    const [livingWillData, doctorsData, versionsData] = await Promise.all([
      pdpaService.getLivingWill(pid).catch(() => null),
      doctorService.getAll().catch(() => []),
      pdpaService.getLivingWillVersions(pid).catch(() => []),
    ]);
    if (livingWillData) {
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
}

interface PerformRollbackOptions {
  userId: string | undefined;
  patientId: string | undefined;
  versionId: string;
  language: string;
  reloadData: () => Promise<void>;
  setRollingBack: (v: boolean) => void;
  setShowVersionModal: (v: boolean) => void;
  setShowVersionPreview: (v: boolean) => void;
  setSelectedVersion: (v: LivingWillVersion | null) => void;
}

async function performRollback(opts: PerformRollbackOptions) {
  const { userId, patientId, versionId, language, reloadData, setRollingBack, setShowVersionModal, setShowVersionPreview, setSelectedVersion } = opts;
  if (!userId) return;
  const confirmed = globalThis.confirm('คุณต้องการกู้คืนพินัยกรรมชีวิตเวอร์ชันนี้หรือไม่? เวอร์ชันปัจจุบันจะถูกบันทึกไว้ในประวัติ');
  if (!confirmed) return;
  setRollingBack(true);
  try {
    const pid = patientId || userId;
    const result = await pdpaService.rollbackLivingWill(pid, versionId);
    if (result.success) {
      await reloadData();
      setShowVersionModal(false);
      setShowVersionPreview(false);
      setSelectedVersion(null);
      alert(getLabel('rollbackSuccess', language));
    }
  } catch (e) {
    console.error('Failed to rollback:', e);
    alert(getLabel('error', language));
  } finally {
    setRollingBack(false);
  }
}

async function saveLivingWill(
  userId: string | undefined,
  patientId: string | undefined,
  form: LivingWillData,
  language: string,
  setSaving: (v: boolean) => void,
  setStep: (v: number) => void,
  navigate: (path: string) => void,
) {
  if (!userId) return;
  if (!form.healthcareProxy.primary.name || !form.healthcareProxy.primary.phone) {
    alert(language === 'th' ? 'กรุณากรอกข้อมูลผู้มีอำนาจตัดสินใจหลัก' : 'Please fill in primary healthcare proxy information');
    setStep(1);
    return;
  }
  if (!form.digitalSignature) {
    alert(language === 'th' ? 'กรุณาลงลายมือชื่อดิจิทัล' : 'Please sign your digital signature');
    setStep(3);
    return;
  }
  setSaving(true);
  try {
    const pid = patientId || userId;
    await pdpaService.saveLivingWill(pid, form);
    alert(getLabel('saveSuccess', language));
    navigate('/pdpa');
  } catch (e) {
    console.error('Failed to save living will:', e);
    alert(getLabel('error', language));
  } finally {
    setSaving(false);
  }
}

function toggleFormPreference(
  key: keyof LivingWillData['preferences'],
  form: LivingWillData,
  setForm: React.Dispatch<React.SetStateAction<LivingWillData>>
) {
  if (typeof form.preferences[key] === 'boolean') {
    setForm((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences[key],
      },
    }));
  }
}

function addDoctorToShareList(
  doctor: Doctor,
  form: LivingWillData,
  setForm: React.Dispatch<React.SetStateAction<LivingWillData>>,
  setShowDoctorModal: (v: boolean) => void,
) {
  if ((form.sharedWith || []).includes(doctor.id)) return;
  setForm((prev) => ({
    ...prev,
    sharedWith: [...(prev.sharedWith || []), doctor.id],
  }));
  setShowDoctorModal(false);
}

type CanvasHandler = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;

function LivingWillHeader({ isDark, language, hasExisting, currentVersion, onBack, onShowVersionModal }: Readonly<{
  isDark: boolean;
  language: string;
  hasExisting: boolean;
  currentVersion: number;
  onBack: () => void;
  onShowVersionModal: () => void;
}>) {
  return (
  <div className="flex items-center gap-4 mb-6">
    <button
      onClick={onBack}
      title={language === 'th' ? 'กลับ' : 'Back'}
      className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
    >
      <ChevronLeft className={`w-6 h-6 ${isDark ? 'text-gray-300' : ''}`} />
    </button>
    <div className="flex-1">
      <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{getLabel('pageTitle', language)}</h1>
      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{language === 'th' ? 'หนังสือแสดงเจตนาล่วงหน้าเกี่ยวกับการรักษาพยาบาล' : 'Advance directive for medical treatment'}</p>
    </div>
    <div className="flex items-center gap-2">
      {hasExisting && (
        <>
          <span className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            <Clock className="w-3 h-3" />
            v{currentVersion}
          </span>
          <button
            onClick={onShowVersionModal}
            className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <History className="w-4 h-4" />
            {getLabel('versionHistory', language)}
          </button>
        </>
      )}
      {hasExisting && (
        <span className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}`}>
          <CheckCircle2 className="w-4 h-4" />
          {language === 'th' ? 'มีอยู่แล้ว' : 'Exists'}
        </span>
      )}
    </div>
  </div>
  );
}

function InfoBanner({ isDark }: Readonly<{ isDark: boolean }>) {
  return (
  <div className={`border rounded-2xl p-5 mb-6 ${isDark ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
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
  );
}

function ProgressStepper({ step, isDark, language, onStepClick }: Readonly<{
  step: number;
  isDark: boolean;
  language: string;
  onStepClick: (num: number) => void;
}>) {
  const lang = language as LangKey;
  const stepItems = [
    { num: 1, label: labels.step1[lang] },
    { num: 2, label: labels.step2[lang] },
    { num: 3, label: labels.step3[lang] },
    { num: 4, label: labels.step4[lang] },
  ];

  const getStepBg = (num: number): string => {
    if (step >= num) return 'bg-emerald-600 text-white';
    if (isDark) return 'bg-gray-700 text-gray-400';
    return 'bg-gray-200 text-gray-500';
  };

  const getStepLabelClass = (num: number): string => {
    if (step >= num) return 'text-emerald-600 font-medium';
    if (isDark) return 'text-gray-500';
    return 'text-gray-400';
  };

  const getStepBarClass = (num: number): string => {
    if (step > num) return 'bg-emerald-600';
    if (isDark) return 'bg-gray-700';
    return 'bg-gray-200';
  };

  return (
    <div className="flex items-center gap-2 mb-8">
      {stepItems.map((s, i) => (
        <div key={s.num} className="flex items-center flex-1">
          <button
            onClick={() => onStepClick(s.num)}
            className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all ${getStepBg(s.num)}`}
          >
            {step > s.num ? <Check className="w-5 h-5" /> : s.num}
          </button>
          <span
            className={`ml-2 text-xs hidden lg:block ${getStepLabelClass(s.num)}`}
          >
            {s.label}
          </span>
          {i < 3 && (
            <div
              className={`flex-1 h-1 mx-2 rounded ${getStepBarClass(s.num)}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StepHealthcareProxy({ form, setForm, isDark, language, updateProxy, onNext }: Readonly<{
  form: LivingWillData;
  setForm: React.Dispatch<React.SetStateAction<LivingWillData>>;
  isDark: boolean;
  language: string;
  updateProxy: (type: 'primary' | 'alternate', field: keyof HealthcareProxy, value: string) => void;
  onNext: () => void;
}>) {
  const lang = language as LangKey;
  return (
  <div className="space-y-6">
    <div className={`rounded-2xl border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        <User className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        {labels.primaryProxy[lang]} *
      </h2>
      <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {language === 'th' ? 'บุคคลที่คุณมอบหมายให้ตัดสินใจเรื่องการรักษาพยาบาลแทนคุณ' : 'The person you designate to make healthcare decisions for you'}
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="proxy-primary-name" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {labels.name[lang]} *
          </label>
          <input
            id="proxy-primary-name"
            type="text"
            value={form.healthcareProxy.primary.name}
            onChange={(e) => updateProxy('primary', 'name', e.target.value)}
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200'}`}
            placeholder={labels.name[lang]}
          />
        </div>
        <div>
          <label htmlFor="proxy-primary-relationship" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {labels.relationship[lang]} *
          </label>
          <select
            id="proxy-primary-relationship"
            value={form.healthcareProxy.primary.relationship}
            onChange={(e) => updateProxy('primary', 'relationship', e.target.value)}
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'}`}
          >
            <option value="">{language === 'th' ? 'เลือกความสัมพันธ์' : 'Select relationship'}</option>
            {RELATIONSHIP_OPTIONS_BILINGUAL.map((opt) => (
              <option key={opt.en} value={opt.th}>
                {opt[lang]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="proxy-primary-phone" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {labels.phone[lang]} *
          </label>
          <div className="relative">
            <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              id="proxy-primary-phone"
              type="tel"
              value={form.healthcareProxy.primary.phone}
              onChange={(e) => updateProxy('primary', 'phone', e.target.value)}
              className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              placeholder="0xx-xxx-xxxx"
            />
          </div>
        </div>
        <div>
          <label htmlFor="proxy-primary-email" className="block text-sm font-medium text-gray-700 mb-1">
            อีเมล
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="proxy-primary-email"
              type="email"
              value={form.healthcareProxy.primary.email}
              onChange={(e) => updateProxy('primary', 'email', e.target.value)}
              className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              placeholder="email@example.com"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="proxy-primary-address" className="block text-sm font-medium text-gray-700 mb-1">
            ที่อยู่
          </label>
          <div className="relative">
            <Home className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <textarea
              id="proxy-primary-address"
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

      {form.healthcareProxy.alternate === undefined ? (
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
              <label htmlFor="proxy-alternate-name" className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อ-นามสกุล
              </label>
              <input
                id="proxy-alternate-name"
                type="text"
                value={form.healthcareProxy.alternate?.name || ''}
                onChange={(e) => updateProxy('alternate', 'name', e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl"
                placeholder="ชื่อ นามสกุล"
              />
            </div>
            <div>
              <label htmlFor="proxy-alternate-relationship" className="block text-sm font-medium text-gray-700 mb-1">
                ความสัมพันธ์
              </label>
              <select
                id="proxy-alternate-relationship"
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
              <label htmlFor="proxy-alternate-phone" className="block text-sm font-medium text-gray-700 mb-1">
                เบอร์โทรศัพท์
              </label>
              <input
                id="proxy-alternate-phone"
                type="tel"
                value={form.healthcareProxy.alternate?.phone || ''}
                onChange={(e) => updateProxy('alternate', 'phone', e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl"
                placeholder="0xx-xxx-xxxx"
              />
            </div>
            <div>
              <label htmlFor="proxy-alternate-email" className="block text-sm font-medium text-gray-700 mb-1">
                อีเมล
              </label>
              <input
                id="proxy-alternate-email"
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
      onClick={onNext}
      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
    >
      ถัดไป
    </button>
  </div>
  );
}

function StepMedicalPreferences({ form, setForm, togglePreference, onBack, onNext }: Readonly<{
  form: LivingWillData;
  setForm: React.Dispatch<React.SetStateAction<LivingWillData>>;
  togglePreference: (key: keyof LivingWillData["preferences"]) => void;
  onBack: () => void;
  onNext: () => void;
}>) {
  return (
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
                className={`px-4 py-2 rounded-lg font-medium transition-all ${form.preferences[item.key]
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }`}
              >
                ต้องการ
              </button>
              <button
                onClick={() => togglePreference(item.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${form.preferences[item.key] === false || form.preferences[item.key] === undefined
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
          title={form.preferences.organDonation ? 'ปิดการบริจาคอวัยวะ' : 'เปิดการบริจาคอวัยวะ'}
          className={`relative w-14 h-7 rounded-full transition-colors ${form.preferences.organDonation ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
        >
          <div
            className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${form.preferences.organDonation ? 'translate-x-7' : 'translate-x-0.5'
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
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${form.preferences.painManagement === option.value
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
          <label htmlFor="living-will-religious" className="block text-sm font-medium text-gray-700 mb-2">
            ความต้องการทางศาสนา/จิตวิญญาณ
          </label>
          <textarea
            id="living-will-religious"
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
          <label htmlFor="living-will-additional" className="block text-sm font-medium text-gray-700 mb-2">
            ความต้องการอื่นๆ
          </label>
          <textarea
            id="living-will-additional"
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
        onClick={onBack}
        className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
      >
        ย้อนกลับ
      </button>
      <button
        onClick={onNext}
        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
      >
        ถัดไป
      </button>
    </div>
  </div>
  );
}

function StepSignature({ canvasRef, form, startDrawing, draw, stopDrawing, clearSignature, onBack, onNext }: Readonly<{
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  form: LivingWillData;
  startDrawing: CanvasHandler;
  draw: CanvasHandler;
  stopDrawing: () => void;
  clearSignature: () => void;
  onBack: () => void;
  onNext: () => void;
}>) {
  return (
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
          data-testid="living-will-signature"
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
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
        onClick={onBack}
        className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
      >
        ย้อนกลับ
      </button>
      <button
        onClick={onNext}
        disabled={!form.digitalSignature}
        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        ถัดไป
      </button>
    </div>
  </div>
  );
}

function StepShareDoctors({ form, sharedDoctors, onShowDoctorModal, removeDoctorFromShare, onSave, saving, onBack }: Readonly<{
  form: LivingWillData;
  sharedDoctors: Doctor[];
  onShowDoctorModal: () => void;
  removeDoctorFromShare: (id: string) => void;
  onSave: () => void;
  saving: boolean;
  onBack: () => void;
}>) {
  return (
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
        onClick={onShowDoctorModal}
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
                title="ลบแพทย์"
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
        onClick={onBack}
        className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
      >
        ย้อนกลับ
      </button>
      <button
        onClick={onSave}
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
  );
}

function DoctorSelectionModal({ searchQuery, setSearchQuery, filteredDoctors, sharedWith, addDoctorToShare, onClose }: Readonly<{
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredDoctors: Doctor[];
  sharedWith: string[];
  addDoctorToShare: (doctor: Doctor) => void;
  onClose: () => void;
}>) {
  return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">เลือกแพทย์</h2>
        <button
          onClick={onClose}
          title="ปิด"
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาแพทย์..."
            aria-label="ค้นหาแพทย์"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredDoctors.map((doctor) => (
          <button
            key={doctor.id}
            onClick={() => addDoctorToShare(doctor)}
            disabled={sharedWith.includes(doctor.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${sharedWith.includes(doctor.id)
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
            {sharedWith.includes(doctor.id) && (
              <Check className="w-5 h-5 text-emerald-600" />
            )}
          </button>
        ))}
      </div>
    </div>
  </div>
  );
}

function VersionHistoryModal({ currentVersion, versions, formatDateTime, onRollback, rollingBack, onClose, onPreviewVersion }: Readonly<{
  currentVersion: number;
  versions: LivingWillVersion[];
  formatDateTime: (dateStr: string) => string;
  onRollback: (versionId: string) => void;
  rollingBack: boolean;
  onClose: () => void;
  onPreviewVersion: (version: LivingWillVersion) => void;
}>) {
  return (
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
          onClick={onClose}
          title="ปิด"
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
                      onClick={() => onPreviewVersion(version)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="ดูรายละเอียด"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRollback(version.versionId)}
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
  );
}

function VersionPreviewModal({ selectedVersion, formatDateTime, onRollback, rollingBack, onClose }: Readonly<{
  selectedVersion: LivingWillVersion;
  formatDateTime: (dateStr: string) => string;
  onRollback: (versionId: string) => void;
  rollingBack: boolean;
  onClose: () => void;
}>) {
  return (
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
          onClick={onClose}
          title="ปิด"
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
          onClick={onClose}
          className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
        >
          ปิด
        </button>
        <button
          onClick={() => onRollback(selectedVersion.versionId)}
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
  );
}

export default function LivingWillPage() {
  const { user } = useAuth();
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
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

  const loadData = async () => {
    await loadLivingWillData({
      userId: user?.id,
      patientId: user?.patientId,
      setForm,
      setHasExisting,
      setCurrentVersion,
      setDoctors,
      setVersions,
      setLoading,
    });
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRollback = async (versionId: string) => {
    await performRollback({
      userId: user?.id,
      patientId: user?.patientId,
      versionId,
      language,
      reloadData: loadData,
      setRollingBack,
      setShowVersionModal,
      setShowVersionPreview,
      setSelectedVersion,
    });
  };

  const formatDateTime = (dateStr: string) => formatDateTimeStr(dateStr, language);

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

  const togglePreference = (key: keyof typeof form.preferences) => toggleFormPreference(key, form, setForm);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    initCanvasDrawing(canvasRef.current, setIsDrawing, e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    performCanvasDraw(canvasRef.current, isDrawing, e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveCanvasSignature(canvasRef.current, setForm);
  };

  const clearSignature = () => {
    clearCanvasSignature(canvasRef.current, setForm);
  };

  const addDoctorToShare = (doctor: Doctor) => {
    addDoctorToShareList(doctor, form, setForm, setShowDoctorModal);
  };

  const removeDoctorFromShare = (doctorId: string) => {
    setForm((prev) => ({
      ...prev,
      sharedWith: (prev.sharedWith || []).filter((id) => id !== doctorId),
    }));
  };

  const handleSave = () => {
    saveLivingWill(user?.id, user?.patientId, form, language, setSaving, setStep, navigate);
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sharedDoctors = doctors.filter((d) => (form.sharedWith || []).includes(d.id));

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isDark ? 'bg-gray-900' : ''}`}>
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <LivingWillHeader
        isDark={isDark}
        language={language}
        hasExisting={hasExisting}
        currentVersion={currentVersion}
        onBack={() => navigate('/pdpa')}
        onShowVersionModal={() => setShowVersionModal(true)}
      />

      <InfoBanner isDark={isDark} />

      <ProgressStepper step={step} isDark={isDark} language={language} onStepClick={setStep} />

      {step === 1 && (
        <StepHealthcareProxy
          form={form}
          setForm={setForm}
          isDark={isDark}
          language={language}
          updateProxy={updateProxy}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepMedicalPreferences
          form={form}
          setForm={setForm}
          togglePreference={togglePreference}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepSignature
          canvasRef={canvasRef}
          form={form}
          startDrawing={startDrawing}
          draw={draw}
          stopDrawing={stopDrawing}
          clearSignature={clearSignature}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <StepShareDoctors
          form={form}
          sharedDoctors={sharedDoctors}
          onShowDoctorModal={() => setShowDoctorModal(true)}
          removeDoctorFromShare={removeDoctorFromShare}
          onSave={handleSave}
          saving={saving}
          onBack={() => setStep(3)}
        />
      )}

      {showDoctorModal && (
        <DoctorSelectionModal
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredDoctors={filteredDoctors}
          sharedWith={form.sharedWith || []}
          addDoctorToShare={addDoctorToShare}
          onClose={() => setShowDoctorModal(false)}
        />
      )}

      {showVersionModal && (
        <VersionHistoryModal
          currentVersion={currentVersion}
          versions={versions}
          formatDateTime={formatDateTime}
          onRollback={handleRollback}
          rollingBack={rollingBack}
          onClose={() => setShowVersionModal(false)}
          onPreviewVersion={(version) => {
            setSelectedVersion(version);
            setShowVersionPreview(true);
          }}
        />
      )}

      {showVersionPreview && selectedVersion && (
        <VersionPreviewModal
          selectedVersion={selectedVersion}
          formatDateTime={formatDateTime}
          onRollback={handleRollback}
          rollingBack={rollingBack}
          onClose={() => {
            setShowVersionPreview(false);
            setSelectedVersion(null);
          }}
        />
      )}
    </div>
  );
}
