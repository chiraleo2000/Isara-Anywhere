/**
 * Appointment Pool Management Page
 * Allows doctors to:
 * - View appointments in the pool that match their specialty
 * - Claim appointments and propose time slots
 * - See AI-matched appointments for their review
 * - Respond to patient-selected appointments
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/common/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface PoolItem {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  originalDoctorId?: string;
  originalDoctorName?: string;
  requiredSpecialty: string;
  matchedSpecialties: string[];
  symptoms: string[];
  symptomDescription?: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  preferredDates: string[];
  preferredTimeSlot: 'morning' | 'afternoon' | 'evening';
  appointmentType: 'telehealth' | 'in_person';
  poolReason: 'no_doctor_selected' | 'doctor_unavailable' | 'doctor_rejected' | 'meeting_missed' | 'rescheduled';
  poolStatus: 'pending' | 'ai_matched' | 'doctor_claimed' | 'admin_assigned' | 'admin_pending_approval' | 'confirmed' | 'expired';
  aiMatchedDoctorId?: string;
  aiMatchedDoctorName?: string;
  aiMatchReason?: string;
  claimedByDoctorId?: string;
  assignedDate?: string;
  assignedTime?: string;
  missedCount: number;
  createdAt: string;
}

interface PendingAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  status: string;
  preferredDates: string[];
  preferredTimeSlot: string;
  symptoms: any;
  urgency: string;
  reason: string;
  createdAt: string;
}

const AppointmentPoolManagement: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [poolItems, setPoolItems] = useState<PoolItem[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pool' | 'awaiting_response' | 'claimed'>('pool');
  const [selectedItem, setSelectedItem] = useState<PoolItem | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimData, setClaimData] = useState({
    date: '',
    time: '',
    notes: ''
  });

  // Use doctor portal API for all calls (it proxies to GCS)
  // Empty string for relative paths in production (Cloud Run)
  const API_URL = import.meta.env.VITE_API_URL || '';

  // Check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Fetch pool items
  const fetchPoolItems = useCallback(async () => {
    if (!user?.specialty) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch pool items matching doctor's specialty from doctor portal API
      const response = await fetch(`${API_URL}/api/appointment-pool?specialty=${encodeURIComponent(user.specialty)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        const items = Array.isArray(data) ? data : [];
        setPoolItems(items.filter((item: PoolItem) => 
          item.poolStatus === 'pending' || 
          item.poolStatus === 'ai_matched' ||
          (item.poolStatus === 'doctor_claimed' && item.claimedByDoctorId === user.id)
        ));
      } else {
        console.error('Failed to fetch pool items:', response.status);
        setPoolItems([]);
      }
    } catch (err) {
      console.error('Error fetching pool:', err);
      setError('Failed to load appointment pool');
      setPoolItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.specialty, user?.id, API_URL]);

  // Fetch appointments awaiting doctor response (patient-selected this doctor)
  const fetchAwaitingResponse = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const appointments = (data.appointments || data || [])
          .filter((apt: any) => 
            apt.doctorId === user.id && 
            apt.status === 'awaiting_doctor_response'
          );
        setPendingAppointments(appointments);
      }
    } catch (err) {
      console.error('Error fetching awaiting appointments:', err);
    }
  }, [user?.id, API_URL]);

  useEffect(() => {
    fetchPoolItems();
    fetchAwaitingResponse();
  }, [fetchPoolItems, fetchAwaitingResponse]);

  // Claim appointment from pool
  const handleClaimAppointment = async () => {
    if (!selectedItem || !claimData.date || !claimData.time || !user) return;

    try {
      const response = await fetch(`${API_URL}/api/appointment-pool/${selectedItem.id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          doctorId: user.id,
          doctorName: user.name,
          proposedDate: claimData.date,
          proposedTime: claimData.time
        })
      });

      if (response.ok) {
        setSuccessMessage('คุณรับนัดหมายนี้สำเร็จแล้ว!');
        setShowClaimModal(false);
        setSelectedItem(null);
        setClaimData({ date: '', time: '', notes: '' });
        fetchPoolItems();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to claim appointment');
      }
    } catch (err) {
      console.error('Error claiming appointment:', err);
      setError('Failed to claim appointment');
    }
  };

  // Respond to patient-selected appointment
  const handleRespondToAppointment = async (appointmentId: string, action: 'accept' | 'reject', proposedDate?: string, proposedTime?: string) => {
    if (!user) return;

    try {
      if (action === 'accept' && proposedDate && proposedTime) {
        // Accept and confirm with proposed time
        const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            status: 'confirmed',
            appointmentDate: proposedDate,
            appointmentTime: proposedTime,
            confirmedBy: user.name,
            confirmedAt: new Date().toISOString()
          })
        });

        if (response.ok) {
          setSuccessMessage('ยืนยันนัดหมายสำเร็จ!');
          fetchAwaitingResponse();
        }
      } else if (action === 'reject') {
        // Reject and send to pool
        const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            status: 'in_pool',
            originalDoctorId: user.id,
            rejectedBy: user.name,
            rejectedAt: new Date().toISOString()
          })
        });

        if (response.ok) {
          // Add to pool - now using doctor portal API
          const apt = pendingAppointments.find(a => a.id === appointmentId);
          if (apt) {
            // Note: If needed, create a pool endpoint on doctor portal too
            setSuccessMessage('ส่งไปยังกลุ่มนัดหมายเพื่อจัดสรรแพทย์ท่านอื่นแล้ว');
          }
          fetchAwaitingResponse();
        }
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error responding to appointment:', err);
      setError('Failed to respond to appointment');
    }
  };

  // Trigger AI matching for a pool item
  const handleAIMatch = async (poolId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/appointment-pool/${poolId}/ai-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessMessage(result.message);
        fetchPoolItems();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error AI matching:', err);
      setError('Failed to perform AI matching');
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const styles: Record<string, string> = {
      normal: 'bg-green-100 text-green-700',
      urgent: 'bg-yellow-100 text-yellow-700',
      emergency: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      normal: 'ปกติ',
      urgent: 'เร่งด่วน',
      emergency: 'ฉุกเฉิน'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[urgency] || styles.normal}`}>
        {labels[urgency] || urgency}
      </span>
    );
  };

  const getPoolStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-blue-100 text-blue-700',
      ai_matched: 'bg-purple-100 text-purple-700',
      doctor_claimed: 'bg-green-100 text-green-700',
      admin_assigned: 'bg-orange-100 text-orange-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
      expired: 'bg-gray-100 text-gray-700'
    };
    const labels: Record<string, string> = {
      pending: 'รอจัดสรร',
      ai_matched: 'AI จับคู่แล้ว',
      doctor_claimed: 'แพทย์รับแล้ว',
      admin_assigned: 'Admin มอบหมาย',
      confirmed: 'ยืนยันแล้ว',
      expired: 'หมดอายุ'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPoolReasonText = (reason: string) => {
    const reasons: Record<string, string> = {
      no_doctor_selected: 'ผู้ป่วยให้ระบบจัดสรรแพทย์',
      doctor_unavailable: 'แพทย์ที่เลือกไม่ว่าง',
      doctor_rejected: 'แพทย์ไม่สามารถรับได้',
      meeting_missed: 'ไม่มาตามนัด',
      rescheduled: 'เลื่อนนัดหมาย'
    };
    return reasons[reason] || reason;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTimeSlot = (slot: string) => {
    const slots: Record<string, string> = {
      morning: 'เช้า (09:00-12:00)',
      afternoon: 'บ่าย (13:00-16:00)',
      evening: 'เย็น (17:00-20:00)'
    };
    return slots[slot] || slot;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">กลุ่มนัดหมายรอจัดสรร</h1>
          <p className="text-gray-600 mt-1">จัดการนัดหมายที่รอการตอบรับหรือจัดสรรแพทย์</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg text-green-800">
            ✅ {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
            ❌ {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-600 hover:text-red-800">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pool')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pool'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            🔄 รอจัดสรร ({poolItems.filter(i => i.poolStatus === 'pending' || i.poolStatus === 'ai_matched').length})
          </button>
          <button
            onClick={() => setActiveTab('awaiting_response')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'awaiting_response'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            📋 รอคุณตอบรับ ({pendingAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab('claimed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'claimed'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            ✅ ที่รับแล้ว ({poolItems.filter(i => i.poolStatus === 'doctor_claimed' && i.claimedByDoctorId === user?.id).length})
          </button>
        </div>

        {/* Pool Tab */}
        {activeTab === 'pool' && (
          <div className="space-y-4">
            {poolItems.filter(i => i.poolStatus === 'pending' || i.poolStatus === 'ai_matched').length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500">ไม่มีนัดหมายในกลุ่มที่ตรงกับความเชี่ยวชาญของคุณ</p>
              </div>
            ) : (
              poolItems.filter(i => i.poolStatus === 'pending' || i.poolStatus === 'ai_matched').map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-gray-800">{item.patientName}</h3>
                        {getUrgencyBadge(item.urgency)}
                        {getPoolStatusBadge(item.poolStatus)}
                      </div>
                      <p className="text-sm text-gray-500">{item.patientEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">สร้างเมื่อ</p>
                      <p className="text-sm text-gray-600">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">อาการ:</p>
                    <p className="text-sm text-gray-700">{item.symptomDescription || item.symptoms.join(', ')}</p>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">สาขาที่ต้องการ</p>
                      <p className="font-medium text-gray-700">{item.requiredSpecialty}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">วันที่ต้องการ</p>
                      <p className="font-medium text-gray-700">
                        {item.preferredDates.slice(0, 2).map(d => formatDate(d)).join(', ')}
                        {item.preferredDates.length > 2 && ` +${item.preferredDates.length - 2}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">ช่วงเวลา</p>
                      <p className="font-medium text-gray-700">{formatTimeSlot(item.preferredTimeSlot)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">ประเภท</p>
                      <p className="font-medium text-gray-700">
                        {item.appointmentType === 'telehealth' ? '📹 ออนไลน์' : '🏥 ที่โรงพยาบาล'}
                      </p>
                    </div>
                  </div>

                  {/* Pool Reason */}
                  <div className="mb-4 p-2 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-xs text-yellow-700">
                      <span className="font-medium">เหตุผลที่อยู่ในกลุ่ม:</span> {getPoolReasonText(item.poolReason)}
                      {item.missedCount > 0 && ` (ไม่มาตามนัด ${item.missedCount} ครั้ง)`}
                    </p>
                  </div>

                  {/* AI Match Info */}
                  {item.poolStatus === 'ai_matched' && item.aiMatchedDoctorId === user?.id && (
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700 font-medium">🤖 AI แนะนำให้คุณรับนัดหมายนี้</p>
                      {item.aiMatchReason && (
                        <p className="text-xs text-purple-600 mt-1">{item.aiMatchReason}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setShowClaimModal(true);
                      }}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                    >
                      ✋ รับนัดหมายนี้
                    </button>
                    {item.poolStatus === 'pending' && (
                      <button
                        onClick={() => handleAIMatch(item.id)}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
                      >
                        🤖 AI จับคู่
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Awaiting Response Tab */}
        {activeTab === 'awaiting_response' && (
          <div className="space-y-4">
            {pendingAppointments.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-gray-500">ไม่มีนัดหมายที่รอการตอบรับจากคุณ</p>
              </div>
            ) : (
              pendingAppointments.map((apt) => (
                <div key={apt.id} className="bg-white rounded-xl p-6 border border-orange-200 bg-orange-50/30">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-gray-800">{apt.patientName}</h3>
                        {getUrgencyBadge(apt.urgency)}
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          ผู้ป่วยเลือกคุณ
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{apt.patientEmail}</p>
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">อาการ:</p>
                    <p className="text-sm text-gray-700">{apt.reason}</p>
                  </div>

                  {/* Preferred Schedule */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">วันที่ต้องการ</p>
                      <p className="font-medium text-gray-700">
                        {apt.preferredDates?.slice(0, 2).map(d => formatDate(d)).join(', ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">ช่วงเวลา</p>
                      <p className="font-medium text-gray-700">{formatTimeSlot(apt.preferredTimeSlot)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        const date = apt.preferredDates?.[0] || new Date().toISOString().split('T')[0];
                        const time = apt.preferredTimeSlot === 'morning' ? '10:00' : apt.preferredTimeSlot === 'afternoon' ? '14:00' : '18:00';
                        handleRespondToAppointment(apt.id, 'accept', date, time);
                      }}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                    >
                      ✅ ยืนยันนัดหมาย
                    </button>
                    <button
                      onClick={() => handleRespondToAppointment(apt.id, 'reject')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                    >
                      ส่งไปจัดสรรใหม่
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Claimed Tab */}
        {activeTab === 'claimed' && (
          <div className="space-y-4">
            {poolItems.filter(i => i.poolStatus === 'doctor_claimed' && i.claimedByDoctorId === user?.id).length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500">คุณยังไม่ได้รับนัดหมายจากกลุ่มนัดหมาย</p>
              </div>
            ) : (
              poolItems.filter(i => i.poolStatus === 'doctor_claimed' && i.claimedByDoctorId === user?.id).map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-6 border border-green-200 bg-green-50/30">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-gray-800">{item.patientName}</h3>
                        {getPoolStatusBadge(item.poolStatus)}
                      </div>
                      <p className="text-sm text-gray-500">{item.patientEmail}</p>
                    </div>
                  </div>

                  {/* Assigned Time */}
                  <div className="mb-4 p-3 bg-white rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      <span className="font-medium">นัดหมาย:</span> {item.assignedDate && formatDate(item.assignedDate)} เวลา {item.assignedTime}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/appointment/${item.appointmentId}`)}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                    >
                      ดูรายละเอียด
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Claim Modal */}
        {showClaimModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">รับนัดหมายนี้</h3>
              <p className="text-gray-700 mb-4">
                กรุณาเลือกวันและเวลาที่คุณสะดวกสำหรับ <strong>{selectedItem.patientName}</strong>
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                  <select
                    value={claimData.date}
                    onChange={(e) => setClaimData({ ...claimData, date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">เลือกวันที่</option>
                    {selectedItem.preferredDates.map(date => (
                      <option key={date} value={date}>{formatDate(date)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เวลา</label>
                  <select
                    value={claimData.time}
                    onChange={(e) => setClaimData({ ...claimData, time: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">เลือกเวลา</option>
                    {selectedItem.preferredTimeSlot === 'morning' && (
                      <>
                        <option value="09:00">09:00</option>
                        <option value="09:30">09:30</option>
                        <option value="10:00">10:00</option>
                        <option value="10:30">10:30</option>
                        <option value="11:00">11:00</option>
                        <option value="11:30">11:30</option>
                      </>
                    )}
                    {selectedItem.preferredTimeSlot === 'afternoon' && (
                      <>
                        <option value="13:00">13:00</option>
                        <option value="13:30">13:30</option>
                        <option value="14:00">14:00</option>
                        <option value="14:30">14:30</option>
                        <option value="15:00">15:00</option>
                        <option value="15:30">15:30</option>
                      </>
                    )}
                    {selectedItem.preferredTimeSlot === 'evening' && (
                      <>
                        <option value="17:00">17:00</option>
                        <option value="17:30">17:30</option>
                        <option value="18:00">18:00</option>
                        <option value="18:30">18:30</option>
                        <option value="19:00">19:00</option>
                        <option value="19:30">19:30</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                  <textarea
                    value={claimData.notes}
                    onChange={(e) => setClaimData({ ...claimData, notes: e.target.value })}
                    placeholder="หมายเหตุสำหรับผู้ป่วย..."
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowClaimModal(false);
                    setSelectedItem(null);
                    setClaimData({ date: '', time: '', notes: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleClaimAppointment}
                  disabled={!claimData.date || !claimData.time}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  ยืนยันรับนัดหมาย
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentPoolManagement;
