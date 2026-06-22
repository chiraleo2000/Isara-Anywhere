import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { phrService } from '../lib/services';
import type { PersonalHealthRecord, User as UserType } from '../types';
import {
  ProfilePageLoading,
  ProfilePageView,
  type ProfileFormState,
} from './profile/ProfilePageView';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [phr, setPhr] = useState<PersonalHealthRecord | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileFormState>({
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
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setAvatarUrl(base64);

        const token = localStorage.getItem('auth_token');
        if (token) {
          const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
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
          name: data.demographics?.name || user?.name || prev.name,
          phone: data.demographics?.phone || user?.phone || prev.phone,
          address: data.demographics?.address || user?.address || prev.address,
          emergencyContact:
            data.demographics?.emergencyContactName ||
            data.demographics?.emergencyContact?.name ||
            user?.emergencyContact?.name ||
            prev.emergencyContact,
          emergencyPhone:
            data.demographics?.emergencyContactPhone ||
            data.demographics?.emergencyContact?.phone ||
            user?.emergencyContact?.phone ||
            prev.emergencyPhone,
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
    setSaveError(null);
    setSaveSuccess(false);
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
          relationship: user.emergencyContact?.relationship || '',
        },
      };

      const token = localStorage.getItem('auth_token');
      if (token) {
        const profileResp = await fetch(`/api/phr/profile/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            address: form.address,
            emergencyContactName: form.emergencyContact,
            emergencyContactPhone: form.emergencyPhone,
          }),
        });
        if (!profileResp.ok) {
          const errBody = await profileResp.json().catch(() => ({}));
          throw new Error(
            (errBody as { message?: string; error?: string }).message
              || (errBody as { error?: string }).error
              || 'Failed to save profile',
          );
        }
      }

      const demographics: PersonalHealthRecord['demographics'] = {
        ...(phr?.demographics || {
          name: form.name,
          dateOfBirth: form.dateOfBirth || '',
          gender: user.gender || 'other',
        }),
        name: form.name,
        phone: form.phone,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        bloodType: form.bloodType,
        emergencyContactName: form.emergencyContact,
        emergencyContactPhone: form.emergencyPhone,
        emergencyContact: {
          name: form.emergencyContact,
          phone: form.emergencyPhone,
        },
      };

      const updatedPhr: PersonalHealthRecord = phr
        ? { ...phr, demographics, updatedAt: new Date() }
        : {
            id: user.id,
            patientId: user.patientId || user.id,
            demographics,
            vitalSignsHistory: [],
            lifestyle: {
              dietType: 'regular',
              exerciseFrequency: 'none',
              sleepHours: 7,
              smokingStatus: 'never',
              alcoholConsumption: 'never',
            },
            updatedAt: new Date(),
          };
      await phrService.update(user.id, updatedPhr);

      updateUser(updatedUser);
      setPhr(updatedPhr);
      setEditing(false);
      setSaveSuccess(true);
    } catch (e) {
      console.error('Failed to save profile:', e);
      setSaveError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ProfilePageLoading />;
  }

  return (
    <ProfilePageView
      user={user}
      editing={editing}
      saving={saving}
      saveError={saveError}
      saveSuccess={saveSuccess}
      uploadingAvatar={uploadingAvatar}
      form={form}
      setForm={setForm}
      avatarUrl={avatarUrl}
      fileInputRef={fileInputRef}
      onSave={handleSave}
      onStartEdit={() => {
        setSaveError(null);
        setSaveSuccess(false);
        setEditing(true);
      }}
      onAvatarUpload={handleAvatarUpload}
    />
  );
}
