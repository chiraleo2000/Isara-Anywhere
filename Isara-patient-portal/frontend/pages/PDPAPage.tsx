import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { pdpaService, doctorService } from '../lib/services';
import { Doctor } from '../types';
import {
  Shield, Check, AlertCircle, FileText, Clock,
  Eye, EyeOff, History, Trash2, CheckCircle2, Info, Lock, Users
} from 'lucide-react';
import { formatLocaleDateTime, parseValidDate } from '../utils/formatLocaleDate';

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
  granted?: boolean;
  status: 'granted' | 'revoked' | 'expired';
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt?: string;
}

interface AuditLogEntry {
  timestamp: string;
  action: string;
  doctorId?: string;
  doctorName?: string;
  dataAccessed?: string;
  consentId?: string;
}

function coerceDbString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return fallback;
}

function pickTimestamp(row: Record<string, unknown>): string | undefined {
  const raw = row.timestamp ?? row.created_at ?? row.createdAt ?? row.updated_at ?? row.updatedAt;
  if (raw == null || raw === '') return undefined;
  const iso = raw instanceof Date ? raw.toISOString() : coerceDbString(raw);
  return parseValidDate(iso) ? iso : undefined;
}

function normalizeAuditEntry(row: Record<string, unknown>): AuditLogEntry {
  let details: Record<string, unknown> | string | null = row.details as string | null;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details) as Record<string, unknown>;
    } catch {
      details = null;
    }
  }

  let action = coerceDbString(row.action, 'DATA_ACCESSED');
  if (action.startsWith('{')) {
    try {
      const parsed = JSON.parse(action) as Record<string, unknown>;
      action = coerceDbString(parsed.action ?? parsed.type, 'DATA_ACCESSED');
    } catch {
      action = 'DATA_ACCESSED';
    }
  }

  const detailObj = details && typeof details === 'object' ? details : {};
  const timestamp = pickTimestamp(row) || new Date().toISOString();

  return {
    timestamp,
    action,
    doctorId: (detailObj.doctorId || detailObj.doctor_id || row.doctor_id) as string | undefined,
    doctorName: (detailObj.doctorName || detailObj.doctor_name || row.doctor_name) as string | undefined,
    dataAccessed: (detailObj.dataAccessed || detailObj.data_types) as string | undefined,
    consentId: (detailObj.consentId || detailObj.consent_id) as string | undefined,
  };
}

function formatGrantedAt(grantedAtRaw: unknown, fallback?: string): string | undefined {
  if (grantedAtRaw == null) return fallback;
  const asString =
    grantedAtRaw instanceof Date ? grantedAtRaw.toISOString() : coerceDbString(grantedAtRaw);
  return parseValidDate(asString) ? asString : fallback;
}

function mergeConsentsWithDefaults(apiRows: Array<Record<string, unknown>>, defaults: Consent[]): Consent[] {
  const TYPE_ALIASES: Record<string, string> = {
    dataProcessing: 'health_data',
    data_processing: 'health_data',
    research: 'analytics',
    essential_data: 'essential',
  };

  const byKey = new Map<string, Record<string, unknown>>();
  for (const row of apiRows) {
    const raw = coerceDbString(row.type ?? row.consent_type ?? row.id);
    const key = TYPE_ALIASES[raw] || raw;
    if (key) byKey.set(key, row);
  }

  return defaults.map((def) => {
    const row =
      byKey.get(def.id) ||
      byKey.get(def.type) ||
      [...byKey.values()].find((r) => {
        const t = coerceDbString(r.consent_type ?? r.type);
        return t === def.id || TYPE_ALIASES[t] === def.id;
      });
    if (!row) return def;

    const grantedAtRaw = row.grantedAt ?? row.granted_at ?? row.updatedAt ?? row.updated_at;
    const grantedAt = formatGrantedAt(grantedAtRaw, def.grantedAt);

    return {
      ...def,
      granted: typeof row.granted === 'boolean' ? row.granted : def.granted,
      grantedAt: row.granted ? grantedAt : undefined,
    };
  });
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

function getPdpaClasses(isDark: boolean) {
  const dark = {
    loadingBg: 'bg-gray-900',
    heading: 'text-white',
    subtitle: 'text-gray-400',
    bodyText: 'text-gray-300',
    mutedText: 'text-gray-500',
    infoBanner: 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-700',
    infoIconBg: 'bg-blue-900/50',
    infoIcon: 'text-blue-400',
    infoTitle: 'text-blue-300',
    infoDesc: 'text-blue-200',
    tabBorder: 'border-gray-700',
    tabInactive: 'border-transparent text-gray-400 hover:text-gray-200',
    cardBg: 'bg-gray-800 border-gray-700',
    cardBgDivide: 'bg-gray-800 border-gray-700 divide-gray-700',
    requiredBadge: 'bg-red-900/50 text-red-400',
    toggleOff: 'bg-gray-600',
    surfaceBg: 'bg-gray-700',
    surfaceBgBorder: 'bg-gray-700 border-gray-600',
    emeraldIconBg: 'bg-emerald-900/50',
    emeraldIcon: 'text-emerald-400',
    sharingHeader: 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-800',
    consentChecked: 'bg-emerald-900/30 border-emerald-700',
    successBg: 'bg-green-900/30 border-green-700',
    successIcon: 'text-green-400',
    successTitle: 'text-green-300',
    successDesc: 'text-green-400',
    successDate: 'text-green-500',
    greenBg: 'bg-green-900/50',
    warningBg: 'bg-amber-900/30 border-amber-700',
    warningIcon: 'text-amber-400',
    warningTitle: 'text-amber-300',
    warningDesc: 'text-amber-400',
    securityBg: 'bg-amber-900/20 border-amber-700',
    blueIcon: 'text-blue-400',
    blueBg: 'bg-blue-900/50',
    blueHighlight: 'bg-blue-900/30 border-blue-700',
    redIcon: 'text-red-400',
    redBg: 'bg-red-900/50',
    auditEmptyIcon: 'text-gray-600',
    auditEmptyText: 'text-gray-400',
    auditDivide: 'divide-gray-700',
    auditHover: 'hover:bg-gray-700',
  };

  const light = {
    loadingBg: '',
    heading: 'text-gray-800',
    subtitle: 'text-gray-600',
    bodyText: 'text-gray-700',
    mutedText: 'text-gray-400',
    infoBanner: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
    infoIconBg: 'bg-blue-100',
    infoIcon: 'text-blue-600',
    infoTitle: 'text-blue-800',
    infoDesc: 'text-blue-700',
    tabBorder: 'border-gray-200',
    tabInactive: 'border-transparent text-gray-500 hover:text-gray-700',
    cardBg: 'bg-white border-gray-100',
    cardBgDivide: 'bg-white border-gray-100 divide-gray-100',
    requiredBadge: 'bg-red-100 text-red-600',
    toggleOff: 'bg-gray-300',
    surfaceBg: 'bg-gray-50',
    surfaceBgBorder: 'bg-gray-50 border-gray-200',
    emeraldIconBg: 'bg-emerald-100',
    emeraldIcon: 'text-emerald-600',
    sharingHeader: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100',
    consentChecked: 'bg-emerald-50 border-emerald-300',
    successBg: 'bg-green-50 border-green-200',
    successIcon: 'text-green-600',
    successTitle: 'text-green-800',
    successDesc: 'text-green-700',
    successDate: 'text-green-600',
    greenBg: 'bg-green-100',
    warningBg: 'bg-amber-50 border-amber-200',
    warningIcon: 'text-amber-600',
    warningTitle: 'text-amber-800',
    warningDesc: 'text-amber-700',
    securityBg: 'bg-amber-50 border-amber-200',
    blueIcon: 'text-blue-600',
    blueBg: 'bg-blue-100',
    blueHighlight: 'bg-blue-50 border-blue-200',
    redIcon: 'text-red-600',
    redBg: 'bg-red-100',
    auditEmptyIcon: 'text-gray-300',
    auditEmptyText: 'text-gray-500',
    auditDivide: 'divide-gray-100',
    auditHover: 'hover:bg-gray-50',
  };

  return isDark ? dark : light;
}

type PdpaClasses = ReturnType<typeof getPdpaClasses>;

function tl(language: string, th: string, en: string): string {
  return language === 'th' ? th : en;
}

function AuditEntryIcon({ action, iconClass }: Readonly<{ action: string; iconClass: string }>) {
  if (action.includes('REVOKED')) {
    return <EyeOff className={`w-4 h-4 ${iconClass}`} />;
  }
  if (action.includes('GRANTED')) {
    return <Check className={`w-4 h-4 ${iconClass}`} />;
  }
  return <Eye className={`w-4 h-4 ${iconClass}`} />;
}

interface TabLabels {
  [key: string]: Record<string, string>;
}

interface ConsentsTabProps {
  consents: Consent[];
  saving: string | null;
  handleToggleConsent: (id: string, granted: boolean) => void;
  labels: TabLabels;
  language: string;
  cls: PdpaClasses;
  formatDate: (dateStr: string) => string;
}

function ConsentsTab({ consents, saving, handleToggleConsent, labels, language, cls, formatDate }: Readonly<ConsentsTabProps>) {
  const lastUpdated = consents.reduce<string | undefined>((latest, c) => {
    if (!c.grantedAt || !parseValidDate(c.grantedAt)) return latest;
    if (!latest || new Date(c.grantedAt) > new Date(latest)) return c.grantedAt;
    return latest;
  }, undefined);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 ${cls.infoBanner}`} data-testid="pdpa-current-consent-snapshot">
        <h3 className={`font-bold mb-2 flex items-center gap-2 ${cls.infoTitle}`}>
          <Info className="w-5 h-5" />
          {tl(language, 'สถานะความยินยอมปัจจุบัน', 'Current Consent Status')}
        </h3>
        <p className={`text-sm mb-3 ${cls.infoDesc}`}>
          {tl(language,
            'แสดงการตั้งค่าล่าสุดที่บันทึกไว้ — ไม่ต้องตั้งค่าใหม่หากไม่ต้องการเปลี่ยนแปลง',
            'Shows your latest saved settings — no need to reconfigure unless you want to change something')}
        </p>
        {lastUpdated && (
          <p className={`text-xs mb-3 ${cls.mutedText}`}>
            {tl(language, 'อัปเดตล่าสุด: ', 'Last updated: ')}{formatDate(lastUpdated)}
          </p>
        )}
        <ul className="space-y-1.5 text-sm">
          {consents.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3">
              <span className={cls.bodyText}>{c.title}</span>
              <span className={c.granted ? 'text-emerald-600 font-medium' : cls.mutedText}>
                {c.granted
                  ? tl(language, 'ยินยอมแล้ว', 'Granted')
                  : tl(language, 'ยังไม่ยินยอม', 'Not granted')}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`rounded-2xl border overflow-hidden divide-y ${cls.cardBgDivide}`}>
        {consents.map((consent) => (
          <div key={consent.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className={`font-semibold ${cls.heading}`}>{consent.title}</h3>
                  {consent.required && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${cls.requiredBadge}`}>
                      {tl(language, 'จำเป็น', 'Required')}
                    </span>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${cls.subtitle}`}>{consent.description}</p>
                {consent.granted && consent.grantedAt && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{tl(language, 'ยินยอมเมื่อ', 'Consented on')} {formatDate(consent.grantedAt)}</span>
                  </div>
                )}
              </div>
              <button
                data-testid={`pdpa-consent-toggle-${consent.id}`}
                onClick={() => handleToggleConsent(consent.id, !consent.granted)}
                disabled={consent.required || saving === consent.id}
                className={`relative w-14 h-7 rounded-full transition-colors ${consent.granted ? 'bg-emerald-500' : cls.toggleOff
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

      <div className={`rounded-2xl border p-6 ${cls.cardBg}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${cls.emeraldIconBg}`}>
            <Check className={`w-5 h-5 ${cls.emeraldIcon}`} />
          </div>
          <h3 className={`font-semibold ${cls.heading}`}>{labels.yourRights[language]}</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: Eye, text: labels.rightAccess[language] },
            { icon: FileText, text: labels.rightCorrect[language] },
            { icon: Trash2, text: labels.rightDelete[language] },
            { icon: EyeOff, text: labels.rightWithdraw[language] },
            { icon: Lock, text: labels.rightRestrict[language] },
            { icon: AlertCircle, text: labels.rightComplain[language] },
          ].map((item) => (
            <div key={item.text} className={`flex items-center gap-3 p-3 rounded-xl ${cls.surfaceBg}`}>
              <item.icon className={`w-4 h-4 ${cls.emeraldIcon}`} />
              <span className={`text-sm ${cls.bodyText}`}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DoctorsTabProps {
  consents: Consent[];
  saving: string | null;
  handleToggleConsent: (id: string, granted: boolean) => void;
  labels: TabLabels;
  language: string;
  cls: PdpaClasses;
  formatDate: (dateStr: string) => string;
  // Per-doctor access control
  doctorAccessList: DoctorConsent[];
  pendingRequests: any[];
  onRevokeDoctorAccess: (doctorId: string) => void;
  onGrantDoctorAccess: () => void;
  onRespondToRequest: (notificationId: string, doctorId: string, action: 'grant' | 'deny') => void;
  onDownloadConsentHistory: () => void;
}

function DoctorsTab({ consents, saving, handleToggleConsent, labels, language, cls, formatDate, doctorAccessList, pendingRequests, onRevokeDoctorAccess, onGrantDoctorAccess, onRespondToRequest, onDownloadConsentHistory }: Readonly<DoctorsTabProps>) {
  const dataSharingConsent = consents.find(c => c.id === 'data_sharing');

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border overflow-hidden ${cls.cardBg}`}>
        <div className={`px-6 py-4 border-b ${cls.sharingHeader}`}>
          <h3 className={`font-bold flex items-center gap-2 ${cls.heading}`}>
            <Users className={`w-5 h-5 ${cls.emeraldIcon}`} />
            {labels.shareDoctors[language]}
          </h3>
          <p className={`text-sm mt-1 ${cls.subtitle}`}>
            {tl(language, 'อนุญาตให้แพทย์และผู้ดูแลระบบในโครงการ Izara เข้าถึงข้อมูลของคุณ', 'Allow doctors and admins in Izara project to access your data')}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className={`p-5 rounded-xl border-2 transition-all ${dataSharingConsent?.granted
            ? cls.consentChecked
            : cls.surfaceBgBorder
            }`}>
            <label className="flex items-start gap-4 cursor-pointer">
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={dataSharingConsent?.granted || false}
                  onChange={(e) => handleToggleConsent('data_sharing', e.target.checked)}
                  disabled={saving === 'data_sharing'}
                  className="w-6 h-6 rounded-md border-2 border-emerald-400 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-lg ${cls.heading}`}>
                  {tl(language, 'ยินยอมแชร์ข้อมูลกับแพทย์และผู้ดูแลระบบทุกท่านในโครงการ', 'Consent to share data with all doctors and admins in the project')}
                </p>
                <p className={`mt-2 leading-relaxed ${cls.subtitle}`}>
                  {tl(language,
                    'ข้าพเจ้ายินยอมให้แพทย์และผู้ดูแลระบบทุกท่านในโครงการ Izara Telemedicine สามารถเข้าถึงข้อมูลสุขภาพของข้าพเจ้าได้ รวมถึง:',
                    'I consent to allow all doctors and admins in Izara Telemedicine project to access my health data, including:')}
                </p>
                <ul className={`mt-3 space-y-2 text-sm ${cls.bodyText}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {tl(language, 'ข้อมูลประวัติการรักษาและการนัดหมาย', 'Treatment history and appointments')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {tl(language, 'ข้อมูลยาที่ใช้และประวัติการแพ้', 'Medications and allergy history')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {tl(language, 'ผลตรวจทางห้องปฏิบัติการและผลเอกซเรย์', 'Lab results and X-rays')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <strong>{tl(language, 'พินัยกรรมชีวิต (Living Will) เพื่อการดูแลรักษาตามความประสงค์', 'Living Will for care according to your wishes')}</strong>
                  </li>
                </ul>

                {saving === 'data_sharing' && (
                  <div className="mt-3 flex items-center gap-2 text-emerald-600">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">{tl(language, 'กำลังบันทึก...', 'Saving...')}</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {dataSharingConsent?.granted ? (
            <div className={`p-4 border rounded-xl ${cls.successBg}`}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`w-8 h-8 ${cls.successIcon}`} />
                <div>
                  <p className={`font-semibold ${cls.successTitle}`}>✓ {tl(language, 'การแชร์ข้อมูลเปิดใช้งานแล้ว', 'Data sharing is enabled')}</p>
                  <p className={`text-sm mt-1 ${cls.successDesc}`}>
                    {tl(language,
                      'แพทย์และผู้ดูแลระบบทุกท่านในโครงการสามารถเข้าถึงข้อมูลและพินัยกรรมชีวิตของคุณได้',
                      'All doctors and admins in the project can access your data and Living Will')}
                  </p>
                  {dataSharingConsent?.grantedAt && (
                    <p className={`text-xs mt-2 ${cls.successDate}`}>
                      {tl(language, 'ยินยอมเมื่อ: ', 'Consented on: ')}{formatDate(dataSharingConsent.grantedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-4 border rounded-xl ${cls.warningBg}`}>
              <div className="flex items-center gap-3">
                <AlertCircle className={`w-8 h-8 ${cls.warningIcon}`} />
                <div>
                  <p className={`font-semibold ${cls.warningTitle}`}>⚠ {tl(language, 'ยังไม่ได้ให้ความยินยอม', 'Consent not yet given')}</p>
                  <p className={`text-sm mt-1 ${cls.warningDesc}`}>
                    {tl(language,
                      'กรุณาทำเครื่องหมายในช่องด้านบนเพื่อให้ความยินยอมแชร์ข้อมูลกับแพทย์ในโครงการ',
                      'Please check the box above to consent to share data with doctors in the project')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border p-6 ${cls.cardBg}`}>
        <h4 className={`font-semibold mb-4 flex items-center gap-2 ${cls.heading}`}>
          <FileText className={`w-5 h-5 ${cls.blueIcon}`} />
          {tl(language, 'เงื่อนไขการแชร์ข้อมูล', 'Data Sharing Terms')}
        </h4>
        <div className={`space-y-3 text-sm ${cls.subtitle}`}>
          <p className={`p-3 rounded-lg ${cls.surfaceBg}`}>
            <strong>1. {tl(language, 'วัตถุประสงค์:', 'Purpose:')}</strong> {tl(language, 'ข้อมูลจะถูกใช้เพื่อการดูแลรักษาสุขภาพของผู้ป่วยเท่านั้น', 'Data will only be used for patient healthcare')}
          </p>
          <p className={`p-3 rounded-lg ${cls.surfaceBg}`}>
            <strong>2. {tl(language, 'ผู้ที่สามารถเข้าถึง:', 'Who can access:')}</strong> {tl(language, 'แพทย์และผู้ดูแลระบบที่ลงทะเบียนในโครงการ Izara Telemedicine เท่านั้น', 'Only doctors and admins registered in Izara Telemedicine')}
          </p>
          <p className={`p-3 rounded-lg ${cls.surfaceBg}`}>
            <strong>3. {tl(language, 'การบันทึก:', 'Recording:')}</strong> {tl(language, 'การเข้าถึงข้อมูลทุกครั้งจะถูกบันทึกไว้ในประวัติและสามารถตรวจสอบได้', 'All data access will be recorded and auditable')}
          </p>
          <p className={`p-3 rounded-lg ${cls.surfaceBg}`}>
            <strong>4. {tl(language, 'การเพิกถอน:', 'Revocation:')}</strong> {tl(language, 'ท่านสามารถเพิกถอนความยินยอมได้ตลอดเวลาโดยยกเลิกเครื่องหมายในช่องด้านบน', 'You can revoke consent anytime by unchecking the box above')}
          </p>
          <p className={`p-3 rounded-lg border ${cls.blueHighlight}`}>
            <strong>5. {tl(language, 'พินัยกรรมชีวิต:', 'Living Will:')}</strong> {tl(language, 'หากท่านมีพินัยกรรมชีวิต (Living Will) และให้ความยินยอมนี้ แพทย์ทุกท่านจะสามารถเข้าถึงเพื่อดำเนินการตามความประสงค์ของท่านได้', 'If you have a Living Will and give this consent, all doctors can access it to fulfill your wishes')}
          </p>
        </div>
      </div>

      <div className={`border rounded-xl p-4 ${cls.securityBg}`}>
        <div className="flex items-start gap-3">
          <Lock className={`w-5 h-5 mt-0.5 ${cls.warningIcon}`} />
          <div>
            <p className={`font-medium text-sm ${cls.warningTitle}`}>{tl(language, 'การรักษาความปลอดภัย', 'Security')}</p>
            <p className={`text-xs mt-1 ${cls.warningDesc}`}>
              {tl(language,
                'การเข้าถึงข้อมูลทุกครั้งจะถูกบันทึกและตรวจสอบได้ หากพบการเข้าถึงที่ไม่เหมาะสม สามารถแจ้งเจ้าหน้าที่ได้ที่ support@izara.com',
                'All data access is logged and auditable. Report any inappropriate access to support@izara.com')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Pending Consent Requests ── */}
      {pendingRequests.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden ${cls.cardBg}`}>
          <div className="px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30">
            <h3 className={`font-bold flex items-center gap-2 ${cls.heading}`}>
              <AlertCircle className="w-5 h-5 text-amber-500" />
              {tl(language, 'คำขอเข้าถึงข้อมูล', 'Pending Access Requests')}
              <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">{pendingRequests.length}</span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pendingRequests.map((req: any) => {
              let data: Record<string, unknown> = {};
              try {
                data = typeof req.data === 'string' ? JSON.parse(req.data) : (req.data || {});
              } catch {
                data = {};
              }
              const doctorName = coerceDbString(data.doctor_name ?? data.doctorName);
              const doctorId = coerceDbString(data.doctor_id ?? data.doctorId);
              return (
                <div key={req.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className={`font-medium ${cls.heading}`}>
                      {doctorName || tl(language, 'แพทย์', 'Doctor')}
                    </p>
                    <p className={`text-sm ${cls.subtitle}`}>
                      {req.message_thai && language === 'th' ? req.message_thai : req.message}
                    </p>
                    <p className={`text-xs mt-1 ${cls.mutedText}`}>
                      {formatDate(req.created_at || req.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onRespondToRequest(req.id, doctorId, 'grant')}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      {tl(language, 'อนุญาต', 'Grant')}
                    </button>
                    <button
                      onClick={() => onRespondToRequest(req.id, doctorId, 'deny')}
                      className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                    >
                      {tl(language, 'ปฏิเสธ', 'Deny')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Per-Doctor Access List ── */}
      <div className={`rounded-2xl border overflow-hidden ${cls.cardBg}`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${cls.sharingHeader}`}>
          <h3 className={`font-bold flex items-center gap-2 ${cls.heading}`}>
            <Shield className={`w-5 h-5 ${cls.blueIcon}`} />
            {tl(language, 'แพทย์ที่ได้รับสิทธิ์เข้าถึงเวชระเบียน', 'Doctors with Medical Record Access')}
          </h3>
          <button
            onClick={onGrantDoctorAccess}
            data-testid="pdpa-grant-doctor-access-btn"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <span>+</span> {tl(language, 'ให้สิทธิ์แพทย์', 'Grant Access')}
          </button>
        </div>
        {doctorAccessList.length === 0 ? (
          <div className="p-8 text-center">
            <Users className={`w-10 h-10 mx-auto mb-2 ${cls.mutedText}`} />
            <p className={cls.mutedText}>{tl(language, 'ยังไม่มีแพทย์ที่ได้รับสิทธิ์เข้าถึง', 'No doctors have been granted access yet')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {doctorAccessList.map((dc) => (
              <div
                key={dc.id}
                data-testid={`pdpa-doctor-access-row-${dc.doctorId}`}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <p className={`font-medium ${cls.heading}`}>{dc.doctorName}</p>
                  {dc.doctorSpecialty && <p className={`text-sm ${cls.subtitle}`}>{dc.doctorSpecialty}</p>}
                  {(dc.grantedAt || dc.createdAt) && parseValidDate(dc.grantedAt || dc.createdAt) && (
                    <p className={`text-xs mt-1 ${cls.mutedText}`}>
                      {tl(language, 'อนุญาตเมื่อ: ', 'Granted: ')}
                      {formatDate(dc.grantedAt || dc.createdAt!)}
                    </p>
                  )}
                  {dc.status === 'revoked' && dc.revokedAt && parseValidDate(dc.revokedAt) && (
                    <p className="text-xs text-red-500">
                      {tl(language, 'เพิกถอนเมื่อ: ', 'Revoked: ')}{formatDate(dc.revokedAt)}
                    </p>
                  )}
                </div>
                {dc.status === 'granted' && dc.granted && (
                  <button
                    onClick={() => onRevokeDoctorAccess(dc.doctorId)}
                    className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                  >
                    {tl(language, 'เพิกถอน', 'Revoke')}
                  </button>
                )}
                {dc.status === 'revoked' && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full dark:bg-gray-700 dark:text-gray-400">
                    {tl(language, 'เพิกถอนแล้ว', 'Revoked')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Download Consent History ── */}
      <div className="flex justify-end">
        <button
          onClick={onDownloadConsentHistory}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <FileText className="w-4 h-4" />
          {tl(language, 'ดาวน์โหลดประวัติการยินยอม', 'Download Consent History')}
        </button>
      </div>
    </div>
  );
}

function getAuditEntryClasses(action: string, cls: PdpaClasses) {
  if (action.includes('REVOKED')) return { bg: cls.redBg, icon: cls.redIcon };
  if (action.includes('GRANTED')) return { bg: cls.greenBg, icon: cls.successIcon };
  return { bg: cls.blueBg, icon: cls.blueIcon };
}

interface AuditTabProps {
  auditLog: AuditLogEntry[];
  labels: TabLabels;
  language: string;
  cls: PdpaClasses;
  formatDate: (dateStr: string) => string;
}

function AuditTab({ auditLog, labels, language, cls, formatDate }: Readonly<AuditTabProps>) {
  return (
    <div className="space-y-4" data-testid="pdpa-audit-log">
      <div className={`rounded-2xl border overflow-hidden ${cls.cardBg}`}>
        {auditLog.length === 0 ? (
          <div className="p-8 text-center">
            <History className={`w-12 h-12 mx-auto mb-3 ${cls.auditEmptyIcon}`} />
            <p className={cls.auditEmptyText}>{labels.noHistory[language]}</p>
          </div>
        ) : (
          <div className={`divide-y ${cls.auditDivide}`}>
            {auditLog.slice().reverse().map((entry) => {
              const entryClasses = getAuditEntryClasses(entry.action, cls);
              return (
                <div key={`${entry.timestamp}-${entry.action}`} className={`p-4 ${cls.auditHover}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${entryClasses.bg}`}>
                      <AuditEntryIcon action={entry.action} iconClass={entryClasses.icon} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${cls.heading}`}>
                        {entry.action === 'CONSENT_GRANTED' && tl(language, 'ให้สิทธิ์เข้าถึงข้อมูล', 'Granted data access')}
                        {entry.action === 'CONSENT_REVOKED' && tl(language, 'เพิกถอนสิทธิ์', 'Revoked access')}
                        {entry.action === 'CONSENT_REQUEST_GRANTED' && tl(language, 'อนุมัติคำขอเข้าถึงข้อมูล', 'Approved access request')}
                        {entry.action === 'CONSENT_REQUEST_DENIED' && tl(language, 'ปฏิเสธคำขอเข้าถึงข้อมูล', 'Denied access request')}
                        {entry.action === 'LIVING_WILL_CREATED' && tl(language, 'สร้างพินัยกรรมชีวิต', 'Created Living Will')}
                        {entry.action === 'LIVING_WILL_UPDATED' && tl(language, 'อัปเดตพินัยกรรมชีวิต', 'Updated Living Will')}
                        {entry.action === 'DATA_ACCESSED' && tl(language, 'เข้าถึงข้อมูล', 'Accessed data')}
                        {!['CONSENT_GRANTED', 'CONSENT_REVOKED', 'CONSENT_REQUEST_GRANTED', 'CONSENT_REQUEST_DENIED', 'LIVING_WILL_CREATED', 'LIVING_WILL_UPDATED', 'DATA_ACCESSED'].includes(entry.action) &&
                          (entry.action.replaceAll('_', ' ') || tl(language, 'กิจกรรมความยินยอม', 'Consent activity'))}
                      </p>
                      {entry.doctorName && (
                        <p className={`text-sm ${cls.subtitle}`}>
                          {tl(language, 'แพทย์: ', 'Doctor: ')}{entry.doctorName}
                        </p>
                      )}
                      {entry.dataAccessed && (
                        <p className="text-sm text-gray-500">
                          {tl(language, 'ข้อมูล: ', 'Data: ')}{entry.dataAccessed}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${cls.mutedText}`}>
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PDPAPage() {
  const { user } = useAuth();
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const cls = getPdpaClasses(isDark);
  
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
    yourRights: { en: 'Your Rights', th: 'สิทธิ์ของคุณ' },
    rightAccess: { en: 'Right to access your data', th: 'สิทธิ์ในการเข้าถึงข้อมูล' },
    rightCorrect: { en: 'Right to correct your data', th: 'สิทธิ์ในการแก้ไขข้อมูล' },
    rightDelete: { en: 'Right to delete your data', th: 'สิทธิ์ในการลบข้อมูล' },
    rightWithdraw: { en: 'Right to withdraw consent', th: 'สิทธิ์ในการถอนความยินยอม' },
    rightRestrict: { en: 'Right to restrict processing', th: 'สิทธิ์ในการจำกัดการประมวลผล' },
    rightComplain: { en: 'Right to file a complaint', th: 'สิทธิ์ในการร้องเรียน' },
    shareDoctors: { en: 'Share Data with Doctors', th: 'แชร์ข้อมูลกับแพทย์' },
    noHistory: { en: 'No access history yet', th: 'ยังไม่มีประวัติการเข้าถึง' },
  };
  
  const [activeTab, setActiveTab] = useState<'consents' | 'doctors' | 'audit'>('consents');
  const [consents, setConsents] = useState<Consent[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  // Per-doctor access control state
  const [doctorAccessList, setDoctorAccessList] = useState<DoctorConsent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Grant consent modal state
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
      const [consentsData, auditData, doctorsData, doctorAccessData, pendingRequestsData] = await Promise.all([
        pdpaService.getConsents(patientId).catch((err: unknown) => { console.error('[PDPA] Consents fetch failed:', err); return { consents: [] }; }),
        pdpaService.getAuditLog(patientId).catch((err: unknown) => { console.error('[PDPA] Audit log fetch failed:', err); return []; }),
        doctorService.getAll().catch((err: unknown) => { console.error('[PDPA] Doctors fetch failed:', err); return []; }),
        pdpaService.getDoctorAccess().catch((err: unknown) => { console.error('[PDPA] Doctor access fetch failed:', err); return []; }),
        pdpaService.getPendingRequests().catch((err: unknown) => { console.error('[PDPA] Pending requests fetch failed:', err); return []; }),
      ]);

      if (consentsData?.consents && Array.isArray(consentsData.consents) && consentsData.consents.length > 0) {
        setConsents(mergeConsentsWithDefaults(consentsData.consents, getDefaultConsents()));
      } else {
        setConsents(getDefaultConsents());
      }

      const auditRows = Array.isArray(auditData) ? auditData : [];
      setAuditLog(auditRows.map((row) => normalizeAuditEntry(row as Record<string, unknown>)));
      setDoctors(doctorsData || []);
      setDoctorAccessList(doctorAccessData || []);
      setPendingRequests(pendingRequestsData || []);
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

  // Filtered doctors for search
  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hospital?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableDoctorsForGrant = filteredDoctors.filter(
    (d) => !doctorAccessList.some((dc) => dc.doctorId === d.id && dc.status === 'granted' && dc.granted)
  );

  // Per-doctor access: revoke medical_record_access
  const handleRevokeDoctorAccess = async (doctorId: string) => {
    if (!user?.id || !confirm(tl(language, 'ต้องการเพิกถอนสิทธิ์เข้าถึงเวชระเบียนของแพทย์ท่านนี้หรือไม่?', 'Revoke this doctor\'s medical record access?'))) return;
    try {
      await pdpaService.revokeDoctorAccess(doctorId);
      const updated = await pdpaService.getDoctorAccess();
      setDoctorAccessList(updated || []);
    } catch (e) {
      console.error('Failed to revoke doctor access:', e);
      alert(labels.error[language]);
    }
  };

  // Per-doctor access: grant medical_record_access via modal
  const handleGrantDoctorAccessModal = () => {
    setShowGrantModal(true);
  };

  // Per-doctor access: grant to selected doctor from modal
  const handleGrantDoctorAccessConfirm = async (doctorId: string) => {
    if (!user?.id) return;
    setGrantingConsent(true);
    try {
      await pdpaService.grantDoctorAccess(doctorId);
      const updated = await pdpaService.getDoctorAccess();
      setDoctorAccessList(updated || []);
      setShowGrantModal(false);
      setSearchQuery('');
    } catch (e) {
      console.error('Failed to grant doctor access:', e);
      alert(labels.error[language]);
    } finally {
      setGrantingConsent(false);
    }
  };

  // Respond to consent request (from pending requests)
  const handleRespondToRequest = async (notificationId: string, doctorId: string, action: 'grant' | 'deny') => {
    if (!user?.id) return;
    try {
      await pdpaService.respondToRequest(notificationId, doctorId, action);
      // Refresh both lists
      const [updatedAccess, updatedRequests] = await Promise.all([
        pdpaService.getDoctorAccess().catch(() => []),
        pdpaService.getPendingRequests().catch(() => []),
      ]);
      setDoctorAccessList(updatedAccess || []);
      setPendingRequests(updatedRequests || []);
    } catch (e) {
      console.error('Failed to respond to consent request:', e);
      alert(labels.error[language]);
    }
  };

  // Download consent history as printable page
  const handleDownloadConsentHistory = async () => {
    if (!user?.id) return;
    try {
      const patientId = user.patientId || user.id;
      const auditData = await pdpaService.getAuditLog(patientId);
      const entries = auditData || [];
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PDPA Consent History</title>
        <style>body{font-family:sans-serif;padding:2rem}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}h1{color:#333}</style></head>
        <body><h1>PDPA Consent History — ${user.name || patientId}</h1><p>Generated: ${new Date().toLocaleString('th-TH')}</p>
        <table><thead><tr><th>Date</th><th>Action</th><th>Details</th></tr></thead><tbody>
        ${entries.map((e: any) => `<tr><td>${new Date(e.created_at).toLocaleString('th-TH')}</td><td>${e.action}</td><td>${typeof e.details === 'string' ? e.details : JSON.stringify(e.details || {})}</td></tr>`).join('')}
        </tbody></table></body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const w = window.open(blobUrl, '_blank');
      if (w) {
        w.addEventListener('load', () => {
          w.print();
          URL.revokeObjectURL(blobUrl);
        }, { once: true });
      }
    } catch (e) {
      console.error('Failed to download consent history:', e);
    }
  };

  const formatDate = (dateStr: string | undefined) =>
    formatLocaleDateTime(dateStr, language);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${cls.loadingBg}`}>
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
          <h1 className={`text-2xl font-bold ${cls.heading}`}>{labels.pageTitle[language]}</h1>
          <p className={cls.subtitle}>{labels.pageSubtitle[language]}</p>
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
      <div className={`rounded-2xl p-5 border ${cls.infoBanner}`}>
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-xl ${cls.infoIconBg}`}>
            <Info className={`w-6 h-6 ${cls.infoIcon}`} />
          </div>
          <div>
            <p className={`font-semibold ${cls.infoTitle}`}>
              {language === 'th' ? 'พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 (PDPA)' : 'Personal Data Protection Act (PDPA)'}
            </p>
            <p className={`mt-1 text-sm leading-relaxed ${cls.infoDesc}`}>
              {language === 'th' 
                ? 'คุณมีสิทธิ์ในการเลือกว่าจะอนุญาตให้ใครเข้าถึงข้อมูลสุขภาพของคุณ สามารถให้ความยินยอมหรือเพิกถอนได้ตลอดเวลา ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัยตามมาตรฐานสากล'
                : 'You have the right to choose who can access your health data. You can grant or revoke consent at any time. Your data is stored securely according to international standards.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 border-b ${cls.tabBorder}`}>
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
              : cls.tabInactive
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'consents' && (
        <ConsentsTab
          consents={consents}
          saving={saving}
          handleToggleConsent={handleToggleConsent}
          labels={labels}
          language={language}
          cls={cls}
          formatDate={formatDate}
        />
      )}

      {activeTab === 'doctors' && (
        <DoctorsTab
          consents={consents}
          saving={saving}
          handleToggleConsent={handleToggleConsent}
          labels={labels}
          language={language}
          cls={cls}
          formatDate={formatDate}
          doctorAccessList={doctorAccessList}
          pendingRequests={pendingRequests}
          onRevokeDoctorAccess={handleRevokeDoctorAccess}
          onGrantDoctorAccess={handleGrantDoctorAccessModal}
          onRespondToRequest={handleRespondToRequest}
          onDownloadConsentHistory={handleDownloadConsentHistory}
        />
      )}

      {activeTab === 'audit' && (
        <AuditTab
          auditLog={auditLog}
          labels={labels}
          language={language}
          cls={cls}
          formatDate={formatDate}
        />
      )}

      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" data-testid="pdpa-grant-doctor-modal">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border ${cls.cardBg} max-h-[85vh] flex flex-col`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${cls.sharingHeader}`}>
              <h3 className={`font-bold ${cls.heading}`}>
                {tl(language, 'ให้สิทธิ์แพทย์เข้าถึงเวชระเบียน', 'Grant Doctor Medical Record Access')}
              </h3>
              <button
                onClick={() => { setShowGrantModal(false); setSearchQuery(''); }}
                className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${cls.mutedText}`}
                aria-label={labels.close[language]}
              >
                ✕
              </button>
            </div>
            <div className="p-4 border-b">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tl(language, 'ค้นหาแพทย์ ชื่อ หรือสาขา...', 'Search doctor name or specialty...')}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm ${cls.surfaceBg} ${cls.heading}`}
                data-testid="pdpa-grant-doctor-search"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {availableDoctorsForGrant.length === 0 ? (
                <p className={`p-6 text-center text-sm ${cls.mutedText}`}>
                  {tl(language, 'ไม่พบแพทย์ที่สามารถให้สิทธิ์ได้', 'No doctors available to grant access')}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {availableDoctorsForGrant.map((doctor) => (
                    <li key={doctor.id}>
                      <button
                        type="button"
                        disabled={grantingConsent}
                        onClick={() => handleGrantDoctorAccessConfirm(doctor.id)}
                        data-testid={`pdpa-grant-doctor-option-${doctor.id}`}
                        className={`w-full text-left p-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50`}
                      >
                        <p className={`font-medium ${cls.heading}`}>{doctor.name}</p>
                        {doctor.specialty && <p className={`text-sm ${cls.subtitle}`}>{doctor.specialty}</p>}
                        {doctor.hospital && <p className={`text-xs ${cls.mutedText}`}>{doctor.hospital}</p>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => { setShowGrantModal(false); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg border text-sm ${cls.tabInactive}`}
              >
                {labels.cancel[language]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
