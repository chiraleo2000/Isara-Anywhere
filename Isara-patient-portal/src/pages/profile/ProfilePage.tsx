import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { phrService } from '../../lib/services';
import { User, Phone, Mail, MapPin, Calendar, Save, Edit2, Shield, Heart, Camera } from 'lucide-react';
import type { PersonalHealthRecord, User as UserType } from '../../types';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phr, setPhr] = useState<PersonalHealthRecord | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    dateOfBirth: user?.dateOfBirth || '',
    address: user?.address || '',
    emergencyContact: user?.emergencyContact?.name || '',
    emergencyPhone: user?.emergencyContact?.phone || '',
    bloodType: user?.bloodType || '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, หรือ WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setAvatarUrl(base64);
        
        // Update user profile with new avatar
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ avatarUrl: base64 }),
          });
          
          if (response.ok) {
            updateUser({ ...user, avatarUrl: base64 });
          }
        }
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setUploadingAvatar(false);
    }
  };

  const loadProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await phrService.get(user.id);
      if (data) {
        setPhr(data);
        setForm((prev) => ({
          ...prev,
          name: data.demographics?.name || prev.name,
          dateOfBirth: data.demographics?.dateOfBirth || prev.dateOfBirth,
          bloodType: data.demographics?.bloodType || prev.bloodType,
        }));
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updatedUser: UserType = {
        ...user,
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        bloodType: form.bloodType,
        dateOfBirth: form.dateOfBirth,
        emergencyContact: {
          name: form.emergencyContact,
          phone: form.emergencyPhone,
          relationship: '',
        },
      };
      
      if (phr) {
        const updatedPhr: PersonalHealthRecord = {
          ...phr,
          demographics: {
            ...phr.demographics,
            name: form.name,
            dateOfBirth: form.dateOfBirth,
            bloodType: form.bloodType,
          },
        };
        await phrService.update(user.id, updatedPhr);
      }
      
      updateUser(updatedUser);
      setEditing(false);
    } catch (e) {
      console.error('Failed to save profile:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">โปรไฟล์</h1>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            แก้ไข
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
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
                onChange={handleAvatarUpload}
                className="hidden"
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
            <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล</label>
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
                {editing ? (
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-600 mb-1">อีเมล</label>
                {editing ? (
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-600 mb-1">วันเกิด</label>
                {editing ? (
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-600 mb-1">กรุ๊ปเลือด</label>
                {editing ? (
                  <select
                    value={form.bloodType}
                    onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-600 mb-1">ที่อยู่</label>
              {editing ? (
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
            <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล</label>
            {editing ? (
              <input
                type="text"
                value={form.emergencyContact}
                onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-800">{form.emergencyContact || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
            {editing ? (
              <input
                type="tel"
                value={form.emergencyPhone}
                onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
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
