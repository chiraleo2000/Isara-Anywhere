import React, { useState, useEffect } from 'react';
import { Activity, Heart, TrendingUp, Brain, Sparkles, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { phrService, appointmentService } from '../../lib/services';
import { TreatmentResults } from './TreatmentResults';
import { MedicalContent } from './MedicalContent';
import { Appointment, PersonalHealthRecord } from '../../types';

interface HealthStudioProps {
  className?: string;
}

export const HealthStudio: React.FC<HealthStudioProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'results' | 'content'>('overview');
  const [vitals, setVitals] = useState<any>(null);
  const [phr, setPhr] = useState<PersonalHealthRecord | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [vitalsData, phrData, appointmentsData] = await Promise.all([
        phrService.getVitals(user!.id).catch(() => []),
        phrService.get(user!.id).catch(() => null),
        appointmentService.getByPatient(user!.patientId || user!.id).catch(() => []),
      ]);

      // Get latest vitals (sorted newest first)
      if (Array.isArray(vitalsData) && vitalsData.length > 0) {
        const sortedVitals = vitalsData.sort((a: any, b: any) => {
          const dateA = new Date(a.measuredAt || 0).getTime();
          const dateB = new Date(b.measuredAt || 0).getTime();
          return dateB - dateA;
        });
        setVitals(sortedVitals[0]);
      }

      // Store PHR for height/BMI calculation
      setPhr(phrData);

      // Store all appointments
      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error('Error loading health studio data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate BMI from height and latest weight (same logic as PHRPage)
  const calculateBMI = () => {
    const height = phr?.demographics?.height;
    const weight = vitals?.weight?.value;
    if (height && weight) {
      const heightM = height / 100;
      const bmiValue = weight / (heightM * heightM);
      return {
        value: parseFloat(bmiValue.toFixed(1)),
        category: getBMICategory(bmiValue)
      };
    }
    // Fallback to stored BMI in vitals if available
    if (vitals?.bmi?.value) {
      return vitals.bmi;
    }
    return null;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return 'น้ำหนักน้อย';
    if (bmi < 23) return 'ปกติ';
    if (bmi < 25) return 'น้ำหนักเกิน';
    if (bmi < 30) return 'อ้วนระดับ 1';
    return 'อ้วนระดับ 2';
  };

  // Get stats for overview
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const upcomingCount = appointments.filter((a) => 
    a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.appointmentDate) >= new Date()
  ).length;

  // Get calculated BMI
  const bmiData = calculateBMI();

  const tabs = [
    { id: 'overview', label: 'ภาพรวมสุขภาพ', icon: Activity },
    { id: 'results', label: 'ผลการรักษา', icon: FileText },
    { id: 'content', label: 'เนื้อหาสุขภาพ', icon: Brain },
  ];

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Health Studio</h2>
            <p className="text-emerald-100 text-sm">ศูนย์กลางข้อมูลสุขภาพของคุณ</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Quick Health Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-gray-600">ความดันโลหิต</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                      {vitals?.bloodPressure
                        ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`
                        : '--/--'}
                    </p>
                    <p className="text-xs text-gray-500">mmHg</p>
                  </div>

                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-pink-500" />
                      <span className="text-sm text-gray-600">ชีพจร</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                      {vitals?.heartRate?.value || '--'}
                    </p>
                    <p className="text-xs text-gray-500">bpm</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-gray-600">BMI</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                      {bmiData?.value?.toFixed(1) || '--'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {bmiData?.category || 'kg/m²'}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm text-gray-600">การรักษา</span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      {completedCount} ครั้ง
                    </p>
                    <p className="text-xs text-gray-500">{upcomingCount} นัดรออยู่</p>
                  </div>
                </div>

                {/* AI Health Insight */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1">AI Health Insight</h4>
                      <p className="text-sm text-gray-600">
                        {vitals
                          ? 'ค่าสุขภาพของคุณอยู่ในเกณฑ์ปกติ ควรดื่มน้ำให้เพียงพอและออกกำลังกายสม่ำเสมอ'
                          : 'บันทึกค่าสุขภาพเพื่อรับคำแนะนำจาก AI'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <a
                    href="/phr"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    ดูประวัติสุขภาพ
                  </a>
                  <a
                    href="/ai-doctor"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Brain className="w-4 h-4" />
                    ปรึกษา AI
                  </a>
                </div>
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <TreatmentResults appointments={appointments} />
            )}

            {/* Medical Content Tab */}
            {activeTab === 'content' && <MedicalContent />}
          </>
        )}
      </div>
    </div>
  );
};
