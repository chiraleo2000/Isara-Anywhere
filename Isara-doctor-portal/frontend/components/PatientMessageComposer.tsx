/**
 * Doctor → patient async message composer (email + in-app notification)
 */
import React, { useState } from 'react';
import { PatientRecord, User } from '../types';

interface PatientMessageComposerProps {
  patient: PatientRecord;
  doctor: User;
  onClose: () => void;
  onSent?: () => void;
}

export const PatientMessageComposer: React.FC<PatientMessageComposerProps> = ({
  patient,
  doctor,
  onClose,
  onSent,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<'email' | 'in_app' | 'both'>('both');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('กรุณากรอกหัวข้อและข้อความ');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch(`/api/patients/${patient.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          channel,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }
      onSent?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ส่งข้อความไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="patient-message-composer">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            ส่งข้อความถึง {patient.demographics?.name || 'ผู้ป่วย'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="msg-subject" className="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
            <input
              id="msg-subject"
              data-testid="patient-message-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="เช่น ผลการตรวจ / คำแนะนำหลังพบแพทย์"
            />
          </div>
          <div>
            <label htmlFor="msg-body" className="block text-sm font-medium text-gray-700 mb-1">ข้อความ</label>
            <textarea
              id="msg-body"
              data-testid="patient-message-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="พิมพ์ข้อความถึงผู้ป่วย..."
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">ช่องทาง</span>
            <div className="flex gap-3 text-sm">
              {(['both', 'email', 'in_app'] as const).map((c) => (
                <label key={c} className="flex items-center gap-1">
                  <input type="radio" name="channel" checked={channel === c} onChange={() => setChannel(c)} />
                  {c === 'both' ? 'อีเมล + แอป' : c === 'email' ? 'อีเมล' : 'แจ้งเตือนในแอป'}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            ยกเลิก
          </button>
          <button
            type="button"
            data-testid="patient-message-send-btn"
            onClick={() => void handleSend()}
            disabled={sending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {sending ? 'กำลังส่ง...' : 'ส่งข้อความ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientMessageComposer;
