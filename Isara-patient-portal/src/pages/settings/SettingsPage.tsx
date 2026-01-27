import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Bell, Lock, Globe, Moon, LogOut, ChevronRight, Shield, X, Eye, EyeOff, Camera, User } from 'lucide-react';

// Helper to get/set localStorage values for notifications only
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

// Password Change Modal Component
function PasswordChangeModal({ 
  isOpen, 
  onClose, 
  darkMode, 
  language 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  darkMode: boolean;
  language: 'th' | 'en';
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const labels = {
    title: language === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password',
    currentPassword: language === 'th' ? 'รหัสผ่านปัจจุบัน' : 'Current Password',
    newPassword: language === 'th' ? 'รหัสผ่านใหม่' : 'New Password',
    confirmPassword: language === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password',
    save: language === 'th' ? 'บันทึก' : 'Save',
    cancel: language === 'th' ? 'ยกเลิก' : 'Cancel',
    passwordMismatch: language === 'th' ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match',
    passwordTooShort: language === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : 'Password must be at least 8 characters',
    successMessage: language === 'th' ? 'เปลี่ยนรหัสผ่านสำเร็จ!' : 'Password changed successfully!',
    errorMessage: language === 'th' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'An error occurred. Please try again',
  };

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
      const token = localStorage.getItem('token');
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

  const inputClass = darkMode 
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`w-full max-w-md rounded-2xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {labels.title}
          </h2>
          <button onClick={onClose} className={`p-1 rounded-full hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}>
            <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
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
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {labels.currentPassword}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {labels.newPassword}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {labels.confirmPassword}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
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

// Profile Image Modal Component
function ProfileImageModal({
  isOpen,
  onClose,
  darkMode,
  language,
  currentImage,
  onImageUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  language: 'th' | 'en';
  currentImage?: string;
  onImageUpdate: (url: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labels = {
    title: language === 'th' ? 'เปลี่ยนรูปโปรไฟล์' : 'Change Profile Picture',
    selectImage: language === 'th' ? 'เลือกรูปภาพ' : 'Select Image',
    removeImage: language === 'th' ? 'ลบรูปภาพ' : 'Remove Image',
    save: language === 'th' ? 'บันทึก' : 'Save',
    cancel: language === 'th' ? 'ยกเลิก' : 'Cancel',
    successMessage: language === 'th' ? 'อัปเดตรูปโปรไฟล์สำเร็จ!' : 'Profile picture updated!',
    errorMessage: language === 'th' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'An error occurred. Please try again',
    fileTooLarge: language === 'th' ? 'ไฟล์ใหญ่เกินไป (สูงสุด 5MB)' : 'File too large (max 5MB)',
    invalidFileType: language === 'th' ? 'รองรับเฉพาะไฟล์รูปภาพ' : 'Only image files are supported',
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(labels.invalidFileType);
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError(labels.fileTooLarge);
      return;
    }

    setError('');
    
    // Create preview
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
      const token = localStorage.getItem('token');
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
      <div className={`w-full max-w-md rounded-2xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {labels.title}
          </h2>
          <button onClick={onClose} className={`p-1 rounded-full hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}>
            <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
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
                <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-100'}`}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className={`w-16 h-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
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
              />

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-4 py-2 border rounded-lg flex items-center justify-center gap-2 ${
                    darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
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
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
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

export default function SettingsPage() {
  const { logout, user } = useAuth();
  // Use the global settings context for theme and language
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

  // Derive darkMode from theme for backward compatibility
  const darkMode = theme === 'dark';
  const setDarkMode = (value: boolean) => {
    setTheme(value ? 'dark' : 'light');
  };

  // Save notifications preference
  useEffect(() => {
    setStoredValue('izara_notifications', notifications);
  }, [notifications]);

  const handleLogout = async () => {
    if (confirm(language === 'th' ? 'ต้องการออกจากระบบหรือไม่?' : 'Do you want to logout?')) {
      await logout();
    }
  };

  // Labels based on language
  const labels = {
    title: language === 'th' ? 'ตั้งค่า' : 'Settings',
    profile: language === 'th' ? 'โปรไฟล์' : 'Profile',
    changeProfilePicture: language === 'th' ? 'เปลี่ยนรูปโปรไฟล์' : 'Change Profile Picture',
    profilePictureDesc: language === 'th' ? 'อัปเดตรูปโปรไฟล์ของคุณ' : 'Update your profile picture',
    notifications: language === 'th' ? 'การแจ้งเตือน' : 'Notifications',
    appointmentReminder: language === 'th' ? 'แจ้งเตือนนัดหมาย' : 'Appointment Reminder',
    appointmentDesc: language === 'th' ? 'รับการแจ้งเตือนก่อนถึงเวลานัดหมาย' : 'Receive reminders before appointments',
    medicationReminder: language === 'th' ? 'แจ้งเตือนยา' : 'Medication Reminder',
    medicationDesc: language === 'th' ? 'รับการแจ้งเตือนเวลาทานยา' : 'Receive reminders to take medication',
    languageDisplay: language === 'th' ? 'ภาษาและการแสดงผล' : 'Language & Display',
    languageLabel: language === 'th' ? 'ภาษา' : 'Language',
    languageDesc: language === 'th' ? 'เลือกภาษาที่ใช้แสดงผล' : 'Select display language',
    darkModeLabel: language === 'th' ? 'โหมดมืด' : 'Dark Mode',
    darkModeDesc: language === 'th' ? 'เปลี่ยนเป็นธีมสีเข้ม' : 'Switch to dark theme',
    security: language === 'th' ? 'ความปลอดภัย' : 'Security',
    changePassword: language === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password',
    logout: language === 'th' ? 'ออกจากระบบ' : 'Logout',
    version: 'Izara Patient Portal v1.0.0',
    comingSoon: language === 'th' ? 'เร็วๆ นี้' : 'Coming soon',
  };

  const cardClass = darkMode 
    ? 'bg-gray-800 border-gray-700' 
    : 'bg-white border-gray-100';
  
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const subTextClass = darkMode ? 'text-gray-400' : 'text-gray-500';
  const dividerClass = darkMode ? 'divide-gray-700 border-gray-700' : 'divide-gray-100 border-gray-100';

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${darkMode ? 'text-white' : ''}`}>
      <h1 className={`text-2xl font-bold ${textClass}`}>{labels.title}</h1>

      {/* Profile Section */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b ${dividerClass}`}>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className={`font-semibold ${textClass}`}>{labels.profile}</h2>
          </div>
        </div>
        <div className={`px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-100'}`}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                )}
              </div>
              <div>
                <p className={`font-medium ${textClass}`}>{user?.name || (language === 'th' ? 'ผู้ใช้' : 'User')}</p>
                <p className={`text-sm ${subTextClass}`}>{user?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={() => setShowProfileImageModal(true)}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
              title={labels.changeProfilePicture}
            >
              <Camera className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b ${dividerClass}`}>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h2 className={`font-semibold ${textClass}`}>{labels.notifications}</h2>
          </div>
        </div>
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
      </div>

      {/* Language & Display Section */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b ${dividerClass}`}>
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-emerald-600" />
            <h2 className={`font-semibold ${textClass}`}>{labels.languageDisplay}</h2>
          </div>
        </div>
        <div className={`divide-y ${dividerClass}`}>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className={`font-medium ${textClass}`}>{labels.languageLabel}</p>
              <p className={`text-sm ${subTextClass}`}>{labels.languageDesc}</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'th')}
              className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-800'
              }`}
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
      </div>

      {/* Security Section */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b ${dividerClass}`}>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className={`font-semibold ${textClass}`}>{labels.security}</h2>
          </div>
        </div>
        <div className={`divide-y ${dividerClass}`}>
          <LinkItem
            icon={<Lock className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />}
            label={labels.changePassword}
            onClick={() => setShowPasswordModal(true)}
            darkMode={darkMode}
          />
        </div>
      </div>

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
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
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

function ToggleItem({
  label,
  description,
  checked,
  onChange,
  icon,
  darkMode = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
  darkMode?: boolean;
}) {
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const subTextClass = darkMode ? 'text-gray-400' : 'text-gray-500';

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
        className={`w-12 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  darkMode?: boolean;
}) {
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
