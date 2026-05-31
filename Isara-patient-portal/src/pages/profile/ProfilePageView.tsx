import { RefObject } from 'react';
import { User, Phone, Mail, MapPin, Calendar, Save, Edit2, Shield, Heart, Camera } from 'lucide-react';
import type { User as UserType } from '../../types';

export interface ProfileFormState {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  bloodType: string;
}

export interface ProfilePageViewProps {
  user: UserType | null;
  editing: boolean;
  saving: boolean;
  uploadingAvatar: boolean;
  form: ProfileFormState;
  setForm: (next: ProfileFormState) => void;
  avatarUrl: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSave: () => void;
  onStartEdit: () => void;
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfilePageLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function ProfilePageView(props: Readonly<ProfilePageViewProps>) {
  const {
    user,
    editing,
    saving,
    uploadingAvatar,
    form,
    setForm,
    avatarUrl,
    fileInputRef,
    onSave,
    onStartEdit,
    onAvatarUpload,
  } = props;
  const updateForm = (patch: Partial<ProfileFormState>) => setForm({ ...form, ...patch });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">โปรไฟล์</h1>
        {editing ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartEdit}
            className="flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            แก้ไข
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden">
                {avatarUrl || user?.avatarUrl ? (
                  <img
                    src={avatarUrl || user?.avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                  title="เปลี่ยนรูปโปรไฟล์"
                >
                  {uploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onAvatarUpload}
                className="hidden"
                aria-label="Upload profile photo"
              />
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{form.name}</h2>
              <p className="text-emerald-100">ID: {user?.id || 'ไม่ระบุ'}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล</label>
            {editing ? (
              <input
                id="profile-name"
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-xl">{form.name || '-'}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-2" />
              <div className="flex-1">
                <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
                {editing ? (
                  <input
                    id="profile-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm({ phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-800">{form.phone || '-'}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-2" />
              <div className="flex-1">
                <label htmlFor="profile-email" className="block text-sm font-medium text-gray-600 mb-1">อีเมล</label>
                {editing ? (
                  <input
                    id="profile-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm({ email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-800">{form.email || '-'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-2" />
              <div className="flex-1">
                <label htmlFor="profile-dob" className="block text-sm font-medium text-gray-600 mb-1">วันเกิด</label>
                {editing ? (
                  <input
                    id="profile-dob"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => updateForm({ dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-800">{form.dateOfBirth || '-'}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-gray-400 mt-2" />
              <div className="flex-1">
                <label htmlFor="profile-bloodtype" className="block text-sm font-medium text-gray-600 mb-1">กรุ๊ปเลือด</label>
                {editing ? (
                  <select
                    id="profile-bloodtype"
                    value={form.bloodType}
                    onChange={(e) => updateForm({ bloodType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">เลือกกรุ๊ปเลือด</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                ) : (
                  <p className="text-gray-800">{form.bloodType || '-'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-2" />
            <div className="flex-1">
              <label htmlFor="profile-address" className="block text-sm font-medium text-gray-600 mb-1">ที่อยู่</label>
              {editing ? (
                <textarea
                  id="profile-address"
                  value={form.address}
                  onChange={(e) => updateForm({ address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-800">{form.address || '-'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-800">ผู้ติดต่อฉุกเฉิน</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-emergency-name" className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล</label>
            {editing ? (
              <input
                id="profile-emergency-name"
                type="text"
                value={form.emergencyContact}
                onChange={(e) => updateForm({ emergencyContact: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-800">{form.emergencyContact || '-'}</p>
            )}
          </div>
          <div>
            <label htmlFor="profile-emergency-phone" className="block text-sm font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
            {editing ? (
              <input
                id="profile-emergency-phone"
                type="tel"
                value={form.emergencyPhone}
                onChange={(e) => updateForm({ emergencyPhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-800">{form.emergencyPhone || '-'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
