/**
 * Settings Page - Patient Portal
 * User settings: profile, notifications, language, security, logout
 * 
 * Refactored: Extracted theme classes and labels to reduce cognitive complexity (S3776)
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Bell, Lock, Globe, Moon, LogOut, ChevronRight, Shield, X, Eye, EyeOff, Camera, User } from 'lucide-react';

// ─── Helpers ───

const getStoredValue = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStoredValue = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

// ─── Shared theme class helpers (reduce per-component CC) ───

function getModalClasses(darkMode: boolean) {
  return {
    modalBg: darkMode ? 'bg-gray-800' : 'bg-white',
    headerBorder: darkMode ? 'border-gray-700' : 'border-gray-200',
    titleText: darkMode ? 'text-white' : 'text-gray-800',
    closeBtn: darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
    closeBtnFull: `p-1 rounded-full hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`,
    closeIcon: darkMode ? 'text-gray-400' : 'text-gray-500',
    labelText: darkMode ? 'text-gray-300' : 'text-gray-700',
    inputCls: darkMode
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400',
    cancelBtn: darkMode
      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
      : 'border-gray-300 text-gray-700 hover:bg-gray-50',
    previewBorder: darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-100',
    userIcon: darkMode ? 'text-gray-500' : 'text-gray-400',
  };
}

// ─── i18n labels (module-level to reduce function CC from ternaries) ───

const PASSWORD_LABELS = {
  th: {
    title: 'เปลี่ยนรหัสผ่าน',
    currentPassword: 'รหัสผ่านปัจจุบัน', // NOSONAR
    newPassword: 'รหัสผ่านใหม่', // NOSONAR
    confirmPassword: 'ยืนยันรหัสผ่านใหม่', // NOSONAR
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    passwordMismatch: 'รหัสผ่านไม่ตรงกัน', // NOSONAR
    passwordTooShort: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    successMessage: 'เปลี่ยนรหัสผ่านสำเร็จ!',
    errorMessage: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
  },
  en: {
    title: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    save: 'Save',
    cancel: 'Cancel',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 8 characters',
    successMessage: 'Password changed successfully!',
    errorMessage: 'An error occurred. Please try again',
  },
};

function getPasswordLabels(language: 'th' | 'en') {
  return PASSWORD_LABELS[language];
}

const PROFILE_IMAGE_LABELS = {
  th: {
    title: 'เปลี่ยนรูปโปรไฟล์',
    selectImage: 'เลือกรูปภาพ',
    removeImage: 'ลบรูปภาพ',
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    successMessage: 'อัปเดตรูปโปรไฟล์สำเร็จ!',
    errorMessage: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
    fileTooLarge: 'ไฟล์ใหญ่เกินไป (สูงสุด 5MB)',
    invalidFileType: 'รองรับเฉพาะไฟล์รูปภาพ',
  },
  en: {
    title: 'Change Profile Picture',
    selectImage: 'Select Image',
    removeImage: 'Remove Image',
    save: 'Save',
    cancel: 'Cancel',
    successMessage: 'Profile picture updated!',
    errorMessage: 'An error occurred. Please try again',
    fileTooLarge: 'File too large (max 5MB)',
    invalidFileType: 'Only image files are supported',
  },
};

function getProfileImageLabels(language: 'th' | 'en') {
  return PROFILE_IMAGE_LABELS[language];
}

const SETTINGS_LABELS = {
  th: {
    title: 'ตั้งค่า',
    profile: 'โปรไฟล์',
    changeProfilePicture: 'เปลี่ยนรูปโปรไฟล์',
    profilePictureDesc: 'อัปเดตรูปโปรไฟล์ของคุณ',
    notifications: 'การแจ้งเตือน',
    appointmentReminder: 'แจ้งเตือนนัดหมาย',
    appointmentDesc: 'รับการแจ้งเตือนก่อนถึงเวลานัดหมาย',
    medicationReminder: 'แจ้งเตือนยา',
    medicationDesc: 'รับการแจ้งเตือนเวลาทานยา',
    languageDisplay: 'ภาษาและการแสดงผล',
    languageLabel: 'ภาษา',
    languageDesc: 'เลือกภาษาที่ใช้แสดงผล',
    darkModeLabel: 'โหมดมืด',
    darkModeDesc: 'เปลี่ยนเป็นธีมสีเข้ม',
    security: 'ความปลอดภัย',
    changePassword: 'เปลี่ยนรหัสผ่าน', // NOSONAR
    logout: 'ออกจากระบบ',
    version: 'Izara Patient Portal v1.0.0',
    comingSoon: 'เร็วๆ นี้',
    logoutConfirm: 'ต้องการออกจากระบบหรือไม่?',
    defaultUser: 'ผู้ใช้',
  },
  en: {
    title: 'Settings',
    profile: 'Profile',
    changeProfilePicture: 'Change Profile Picture',
    profilePictureDesc: 'Update your profile picture',
    notifications: 'Notifications',
    appointmentReminder: 'Appointment Reminder',
    appointmentDesc: 'Receive reminders before appointments',
    medicationReminder: 'Medication Reminder',
    medicationDesc: 'Receive reminders to take medication',
    languageDisplay: 'Language & Display',
    languageLabel: 'Language',
    languageDesc: 'Select display language',
    darkModeLabel: 'Dark Mode',
    darkModeDesc: 'Switch to dark theme',
    security: 'Security',
    changePassword: 'Change Password',
    logout: 'Logout',
    version: 'Izara Patient Portal v1.0.0',
    comingSoon: 'Coming soon',
    logoutConfirm: 'Do you want to logout?',
    defaultUser: 'User',
  },
};

function getSettingsLabels(language: 'th' | 'en') {
  return SETTINGS_LABELS[language];
}

// ─── Password Field Sub-component ───

function PasswordField({ id, label, value, onChange, show, onToggleShow, inputClass, labelClass }: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  show: boolean;
  onToggleShow: () => void;
  inputClass: string;
  labelClass: string;
}>) {
  return (
    <div>
      <label htmlFor={id} className={`block text-sm font-medium mb-1 ${labelClass}`}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
          required
          minLength={8}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          aria-label={show ? 'Hide password' : 'Show password'}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
        </button>
      </div>
    </div>
  );
}

// ─── Password Change Modal Component ───

function PasswordChangeModal({
  isOpen,
  onClose,
  darkMode,
  language
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  language: 'th' | 'en';
}>) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const labels = getPasswordLabels(language);
  const cls = getModalClasses(darkMode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(labels.passwordMismatch);
      return;
    }

    if (newPassword.length < 8) {
      setError(labels.passwordTooShort);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || labels.errorMessage);
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || labels.errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`w-full max-w-md rounded-2xl shadow-xl ${cls.modalBg}`}>
        <div className={`flex items-center justify-between p-4 border-b ${cls.headerBorder}`}>
          <h2 className={`text-lg font-semibold ${cls.titleText}`}>
            {labels.title}
          </h2>
          <button onClick={onClose} className={cls.closeBtnFull} aria-label="Close" title="Close">
            <X className={`w-5 h-5 ${cls.closeIcon}`} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {success ? (
            <div className="p-4 bg-green-100 text-green-800 rounded-lg text-center">
              ✅ {labels.successMessage}
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <PasswordField
                id="settings-current-password"
                label={labels.currentPassword}
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrentPassword}
                onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
                inputClass={cls.inputCls}
                labelClass={cls.labelText}
              />

              <PasswordField
                id="settings-new-password"
                label={labels.newPassword}
                value={newPassword}
                onChange={setNewPassword}
                show={showNewPassword}
                onToggleShow={() => setShowNewPassword(!showNewPassword)}
                inputClass={cls.inputCls}
                labelClass={cls.labelText}
              />

              <PasswordField
                id="settings-confirm-password"
                label={labels.confirmPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
                inputClass={cls.inputCls}
                labelClass={cls.labelText}
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 px-4 py-2 rounded-lg border ${cls.cancelBtn}`}
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? '...' : labels.save}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Profile Image Modal Component ───

function ProfileImageModal({
  isOpen,
  onClose,
  darkMode,
  language,
  currentImage,
  onImageUpdate,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  language: 'th' | 'en';
  currentImage?: string;
  onImageUpdate: (url: string) => void;
}>) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labels = getProfileImageLabels(language);
  const cls = getModalClasses(darkMode);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(labels.invalidFileType);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(labels.fileTooLarge);
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!previewUrl) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id || 'unknown';

      const response = await fetch(`/api/phr/profile/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageData: previewUrl,
          contentType: 'image/png'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || labels.errorMessage);
      }

      setSuccess(true);
      onImageUpdate(previewUrl);

      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || labels.errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`w-full max-w-md rounded-2xl shadow-xl ${cls.modalBg}`}>
        <div className={`flex items-center justify-between p-4 border-b ${cls.headerBorder}`}>
          <h2 className={`text-lg font-semibold ${cls.titleText}`}>
            {labels.title}
          </h2>
          <button onClick={onClose} className={cls.closeBtnFull} aria-label="Close" title="Close">
            <X className={`w-5 h-5 ${cls.closeIcon}`} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {success ? (
            <div className="p-4 bg-green-100 text-green-800 rounded-lg text-center">
              ✅ {labels.successMessage}
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Preview */}
              <div className="flex flex-col items-center">
                <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${cls.previewBorder}`}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className={`w-16 h-16 ${cls.userIcon}`} />
                    </div>
                  )}
                </div>
              </div>

              {/* File input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Select profile image"
              />

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-4 py-2 border rounded-lg flex items-center justify-center gap-2 ${cls.cancelBtn}`}
                >
                  <Camera className="w-4 h-4" />
                  {labels.selectImage}
                </button>

                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="w-full px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    {labels.removeImage}
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 px-4 py-2 rounded-lg border ${cls.cancelBtn}`}
                >
                  {labels.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !previewUrl}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? '...' : labels.save}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section Card wrapper (reduces CC of main SettingsPage) ───

function SectionCard({ icon, title, darkMode, children }: Readonly<{
  icon: React.ReactNode;
  title: string;
  darkMode: boolean;
  children: React.ReactNode;
}>) {
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const dividerClass = darkMode ? 'divide-gray-700 border-gray-700' : 'divide-gray-100 border-gray-100';

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
      <div className={`px-6 py-4 border-b ${dividerClass}`}>
        <div className="flex items-center gap-3">
          {icon}
          <h2 className={`font-semibold ${textClass}`}>{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main Settings Page ───

export default function SettingsPage() {
  const { logout, user } = useAuth();
  const { theme, language, setTheme, setLanguage } = useSettings();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileImageModal, setShowProfileImageModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>(user?.avatarUrl);

  const [notifications, setNotifications] = useState(() =>
    getStoredValue('izara_notifications', {
      appointments: true,
      medications: true,
    })
  );

  const darkMode = theme === 'dark';
  const setDarkMode = (value: boolean) => {
    setTheme(value ? 'dark' : 'light');
  };

  useEffect(() => {
    setStoredValue('izara_notifications', notifications);
  }, [notifications]);

  const labels = getSettingsLabels(language as 'th' | 'en');

  const handleLogout = async () => {
    if (confirm(labels.logoutConfirm)) {
      await logout();
    }
  };

  // Pre-compute theme classes
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const subTextClass = darkMode ? 'text-gray-400' : 'text-gray-500';
  const dividerClass = darkMode ? 'divide-gray-700 border-gray-700' : 'divide-gray-100 border-gray-100';
  const profileBorder = darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-100';
  const profileIconCls = darkMode ? 'text-gray-500' : 'text-gray-400';
  const hoverBg = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const cameraIcon = darkMode ? 'text-gray-400' : 'text-gray-500';
  const selectCls = darkMode
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-200 text-gray-800';

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${darkMode ? 'text-white' : ''}`}>
      <h1 className={`text-2xl font-bold ${textClass}`}>{labels.title}</h1>

      {/* Profile Section */}
      <SectionCard icon={<User className="w-5 h-5 text-emerald-600" />} title={labels.profile} darkMode={darkMode}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${profileBorder}`}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className={`w-8 h-8 ${profileIconCls}`} />
                  </div>
                )}
              </div>
              <div>
                <p className={`font-medium ${textClass}`}>{user?.name || labels.defaultUser}</p>
                <p className={`text-sm ${subTextClass}`}>{user?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={() => setShowProfileImageModal(true)}
              className={`p-2 rounded-lg ${hoverBg} transition-colors`}
              title={labels.changeProfilePicture}
            >
              <Camera className={`w-5 h-5 ${cameraIcon}`} />
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Notifications Section */}
      <SectionCard icon={<Bell className="w-5 h-5 text-emerald-600" />} title={labels.notifications} darkMode={darkMode}>
        <div className={`divide-y ${dividerClass}`}>
          <ToggleItem
            label={labels.appointmentReminder}
            description={labels.appointmentDesc}
            checked={notifications.appointments}
            onChange={(v) => setNotifications({ ...notifications, appointments: v })}
            darkMode={darkMode}
          />
          <ToggleItem
            label={labels.medicationReminder}
            description={labels.medicationDesc}
            checked={notifications.medications}
            onChange={(v) => setNotifications({ ...notifications, medications: v })}
            darkMode={darkMode}
          />
        </div>
      </SectionCard>

      {/* Language & Display Section */}
      <SectionCard icon={<Globe className="w-5 h-5 text-emerald-600" />} title={labels.languageDisplay} darkMode={darkMode}>
        <div className={`divide-y ${dividerClass}`}>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className={`font-medium ${textClass}`}>{labels.languageLabel}</p>
              <p className={`text-sm ${subTextClass}`}>{labels.languageDesc}</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'th')}
              className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${selectCls}`}
              aria-label="Select language"
              title="Select language"
            >
              <option value="th">ไทย</option>
              <option value="en">English</option>
            </select>
          </div>
          <ToggleItem
            label={labels.darkModeLabel}
            description={labels.darkModeDesc}
            checked={darkMode}
            onChange={setDarkMode}
            icon={<Moon className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-gray-400'}`} />}
            darkMode={darkMode}
          />
        </div>
      </SectionCard>

      {/* Security Section */}
      <SectionCard icon={<Shield className="w-5 h-5 text-emerald-600" />} title={labels.security} darkMode={darkMode}>
        <div className={`divide-y ${dividerClass}`}>
          <LinkItem
            icon={<Lock className="w-5 h-5 text-gray-400" />}
            label={labels.changePassword}
            onClick={() => setShowPasswordModal(true)}
            darkMode={darkMode}
          />
        </div>
      </SectionCard>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        darkMode={darkMode}
        language={language as 'th' | 'en'}
      />

      {/* Profile Image Modal */}
      <ProfileImageModal
        isOpen={showProfileImageModal}
        onClose={() => setShowProfileImageModal(false)}
        darkMode={darkMode}
        language={language as 'th' | 'en'}
        currentImage={profileImage}
        onImageUpdate={(url) => setProfileImage(url)}
      />

      {/* Logout Section */}
      <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <button
          onClick={handleLogout}
          className="w-full px-6 py-4 flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{labels.logout}</span>
        </button>
      </div>

      <p className={`text-center text-sm ${subTextClass}`}>
        {labels.version}
      </p>
    </div>
  );
}

// ─── Shared Sub-Components ───

function ToggleItem({
  label,
  description,
  checked,
  onChange,
  icon,
  darkMode = false,
}: Readonly<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
  darkMode?: boolean;
}>) {
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const subTextClass = darkMode ? 'text-gray-400' : 'text-gray-500';

  const getToggleBg = (): string => {
    if (checked) return 'bg-emerald-500';
    if (darkMode) return 'bg-gray-600';
    return 'bg-gray-300';
  };

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className={`font-medium ${textClass}`}>{label}</p>
          <p className={`text-sm ${subTextClass}`}>{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-colors ${getToggleBg()}`}
        aria-label={label}
        title={label}
        role="switch"
        aria-checked={checked}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function LinkItem({
  icon,
  label,
  onClick,
  darkMode = false,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  darkMode?: boolean;
}>) {
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const hoverClass = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  return (
    <button onClick={onClick} className={`w-full px-6 py-4 flex items-center justify-between ${hoverClass} transition-colors`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className={`font-medium ${textClass}`}>{label}</span>
      </div>
      <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
    </button>
  );
}
