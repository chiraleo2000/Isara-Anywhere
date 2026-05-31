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

      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`/api/phr/profile/${user.id}`, {
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
      }

      const demographics: PersonalHealthRecord['demographics'] = {};
      if (phr?.demographics) {
        Object.assign(demographics, phr.demographics);
      }
      demographics.name = form.name;
      demographics.phone = form.phone;
      demographics.address = form.address;
      demographics.dateOfBirth = form.dateOfBirth;
      demographics.bloodType = form.bloodType;
      demographics.emergencyContactName = form.emergencyContact;
      demographics.emergencyContactPhone = form.emergencyPhone;
      demographics.emergencyContact = {
        name: form.emergencyContact,
        phone: form.emergencyPhone,
      };

      const updatedPhr: PersonalHealthRecord = phr
        ? { ...phr, demographics }
        : { id: user.id, demographics };
      await phrService.update(user.id, updatedPhr);

      updateUser(updatedUser);
      setEditing(false);
    } catch (e) {
      console.error('Failed to save profile:', e);
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
      uploadingAvatar={uploadingAvatar}
      form={form}
      setForm={setForm}
      avatarUrl={avatarUrl}
      fileInputRef={fileInputRef}
      onSave={handleSave}
      onStartEdit={() => setEditing(true)}
      onAvatarUpload={handleAvatarUpload}
    />
  );
}
