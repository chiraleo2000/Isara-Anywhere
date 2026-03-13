import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Calendar,
  Heart, Ruler, Weight, Droplets, AlertCircle, ChevronRight, ChevronLeft,
  UserCircle, Activity
} from 'lucide-react';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'ไม่ทราบ'];
const GENDERS = [
  { value: 'male', label: 'ชาย' },
  { value: 'female', label: 'หญิง' },
  { value: 'other', label: 'อื่นๆ' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    // Basic Info
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    password: '',
    confirmPassword: '',
    // Health Info
    height: '',
    weight: '',
    bloodType: '',
    allergies: '',
    chronicConditions: '',
    currentMedications: '',
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateStep1 = () => {
    if (!form.name || !form.email || !form.phone || !form.dateOfBirth || !form.gender) {
      setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return false;
    }
    if (form.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return false;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      nextStep();
      return;
    }

    setLoading(true);
    try {
      await register({
        ...form,
        height: form.height ? Number.parseFloat(form.height) : undefined,
        weight: form.weight ? Number.parseFloat(form.weight) : undefined,
      } as any);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
        <UserCircle className="w-5 h-5" />
      </div>
      <div className={`w-16 h-1 ${step >= 2 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
        <Activity className="w-5 h-5" />
      </div>
    </div>
  );

  const renderStep1 = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="register-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="ชื่อ นามสกุล"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="register-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-phone" className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="register-phone"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="081-234-5678"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-dob" className="block text-sm font-medium text-gray-700 mb-1">วันเกิด</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="register-dob"
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-gender" className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
          <select
            id="register-gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            required
          >
            <option value="">เลือกเพศ</option>
            {GENDERS.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="register-confirm-password"
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="ยืนยันรหัสผ่าน"
              required
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={nextStep}
        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors mt-4 flex items-center justify-center gap-2"
      >
        ถัดไป: ข้อมูลสุขภาพ
        <ChevronRight className="w-5 h-5" />
      </button>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800">ข้อมูลสุขภาพเบื้องต้น</p>
            <p className="text-xs text-emerald-600">ข้อมูลนี้ช่วยให้แพทย์ดูแลคุณได้ดียิ่งขึ้น</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="register-height" className="block text-sm font-medium text-gray-700 mb-1">ส่วนสูง (ซม.)</label>
          <div className="relative">
            <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="register-height"
              type="number"
              name="height"
              value={form.height}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="165"
              min="50"
              max="250"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-weight" className="block text-sm font-medium text-gray-700 mb-1">น้ำหนัก (กก.)</label>
          <div className="relative">
            <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="register-weight"
              type="number"
              name="weight"
              value={form.weight}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="60"
              min="20"
              max="300"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-bloodtype" className="block text-sm font-medium text-gray-700 mb-1">กรุ๊ปเลือด</label>
          <div className="relative">
            <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              id="register-bloodtype"
              name="bloodType"
              value={form.bloodType}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
            >
              <option value="">เลือกกรุ๊ปเลือด</option>
              {BLOOD_TYPES.map(bt => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="register-allergies" className="block text-sm font-medium text-gray-700 mb-1">
          <AlertCircle className="w-4 h-4 inline mr-1 text-red-500" />
          อาการแพ้ยา/อาหาร
        </label>
        <textarea
          id="register-allergies"
          name="allergies"
          value={form.allergies}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="เช่น แพ้เพนิซิลลิน, แพ้อาหารทะเล (ถ้าไม่มีให้เว้นว่าง)"
          rows={2}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="register-chronic" className="block text-sm font-medium text-gray-700 mb-1">โรคประจำตัว</label>
        <textarea
          id="register-chronic"
          name="chronicConditions"
          value={form.chronicConditions}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="เช่น เบาหวาน, ความดันโลหิตสูง (ถ้าไม่มีให้เว้นว่าง)"
          rows={2}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="register-medications" className="block text-sm font-medium text-gray-700 mb-1">ยาที่ใช้ประจำ</label>
        <textarea
          id="register-medications"
          name="currentMedications"
          value={form.currentMedications}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="เช่น Metformin 500mg วันละ 2 เม็ด (ถ้าไม่มีให้เว้นว่าง)"
          rows={2}
        />
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          ผู้ติดต่อฉุกเฉิน
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="register-emergency-name" className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
            <input
              id="register-emergency-name"
              type="text"
              name="emergencyContactName"
              value={form.emergencyContactName}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="ชื่อผู้ติดต่อ"
            />
          </div>
          <div>
            <label htmlFor="register-emergency-phone" className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
            <input
              id="register-emergency-phone"
              type="tel"
              name="emergencyContactPhone"
              value={form.emergencyContactPhone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="081-234-5678"
            />
          </div>
          <div>
            <label htmlFor="register-emergency-relation" className="block text-sm font-medium text-gray-700 mb-1">ความสัมพันธ์</label>
            <input
              id="register-emergency-relation"
              type="text"
              name="emergencyContactRelation"
              value={form.emergencyContactRelation}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="เช่น พ่อ, แม่, คู่สมรส"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={prevStep}
          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          ย้อนกลับ
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <img src="/IzaraLogo.png" alt="Izara" className="w-16 h-16 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-gray-800">สมัครสมาชิก</h1>
          <p className="text-gray-600 mt-1">
            {step === 1 ? 'ข้อมูลส่วนตัว' : 'ข้อมูลสุขภาพเบื้องต้น'}
          </p>
        </div>

        {renderStepIndicator()}

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {step === 1 ? renderStep1() : renderStep2()}
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              มีบัญชีอยู่แล้ว?{' '}
              <Link to="/login" className="text-emerald-600 font-medium hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
