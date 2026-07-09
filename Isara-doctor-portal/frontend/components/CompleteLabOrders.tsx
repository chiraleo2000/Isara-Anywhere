/**
 * Complete Lab & Imaging Orders
 * Order tests, view results, trend analysis
 */

import React, { useState, useEffect } from 'react';
import { PatientRecord, User } from '../types';
import { getLabTests } from '../services/clinicalDataService';
import { fetchLabOrdersByPatient } from '../services/labOrderApi';

interface LabTest {
  code: string;
  name: string;
  category: string;
}

interface ResultEntry {
  testCode: string;
  testName: string;
  value: string;
  unit: string;
  normalRangeLow: string;
  normalRangeHigh: string;
  flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
  notes: string;
}

// Auto-calculate flag based on value vs normal range
function calculateFlag(value: string, low: string, high: string): ResultEntry['flag'] {
  const v = Number.parseFloat(value);
  const lo = Number.parseFloat(low);
  const hi = Number.parseFloat(high);
  if (Number.isNaN(v) || Number.isNaN(lo) || Number.isNaN(hi)) return 'NORMAL';
  if (v > hi * 1.5 || v < lo * 0.5) return 'CRITICAL';
  if (v > hi) return 'HIGH';
  if (v < lo) return 'LOW';
  return 'NORMAL';
}

function getFlagEmoji(flag: string): string {
  switch (flag) {
    case 'CRITICAL': return '🚨';
    case 'HIGH': return '🔴';
    case 'LOW': return '🔵';
    default: return '✅';
  }
}

// Default units and normal ranges for common tests
const TEST_DEFAULTS: Record<string, { unit: string; low: string; high: string }> = {
  CBC: { unit: 'x10^9/L', low: '4.5', high: '11.0' },
  HbA1c: { unit: '%', low: '4.0', high: '6.5' },
  Lipid: { unit: 'mg/dL', low: '0', high: '200' },
  CMP: { unit: 'mg/dL', low: '70', high: '100' },
  TSH: { unit: 'mIU/L', low: '0.4', high: '4.0' },
  BUN: { unit: 'mg/dL', low: '7', high: '20' },
  Creatinine: { unit: 'mg/dL', low: '0.6', high: '1.2' },
  ALT: { unit: 'U/L', low: '7', high: '56' },
  AST: { unit: 'U/L', low: '10', high: '40' },
  FBS: { unit: 'mg/dL', low: '70', high: '100' },
};

/** Inline result entry form for an uncompleted lab order */
interface LabReportDocument {
  name: string;
  type: string;
  data: string;
  size: number;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result as string;
      const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
      resolve(base64 || '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ResultEntryForm({
  order,
  onResultsSubmitted,
}: Readonly<{
  order: any;
  onResultsSubmitted: () => Promise<void>;
}>) {
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [reportDocuments, setReportDocuments] = useState<LabReportDocument[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initialize entries from the ordered tests
  const initEntries = () => {
    const tests = Array.isArray(order.tests) ? order.tests : [];
    setEntries(
      tests.map((t: any) => {
        const code = t.code || t.testCode || '';
        const defaults = TEST_DEFAULTS[code] || { unit: '', low: '', high: '' };
        return {
          testCode: code,
          testName: t.name || t.testName || code,
          value: '',
          unit: defaults.unit,
          normalRangeLow: defaults.low,
          normalRangeHigh: defaults.high,
          flag: 'NORMAL' as const,
          notes: '',
        };
      })
    );
  };

  const updateEntry = (idx: number, field: keyof ResultEntry, val: string) => {
    setEntries(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      // Auto-calculate flag when value or range changes
      if (field === 'value' || field === 'normalRangeLow' || field === 'normalRangeHigh') {
        const e = next[idx];
        next[idx].flag = calculateFlag(
          field === 'value' ? val : e.value,
          field === 'normalRangeLow' ? val : e.normalRangeLow,
          field === 'normalRangeHigh' ? val : e.normalRangeHigh,
        );
      }
      return next;
    });
  };

  const handleReportFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    const next: LabReportDocument[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setUploadError('Only images (PNG/JPEG) and PDF lab reports are supported');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`${file.name} exceeds 10MB limit`);
        continue;
      }
      const data = await readFileAsBase64(file);
      next.push({
        name: file.name,
        type: file.type,
        data,
        size: file.size,
      });
    }
    if (next.length) {
      setReportDocuments(prev => [...prev, ...next]);
    }
  };

  const handleSubmit = async () => {
    // Validate — at least one result value or attached report image
    const filled = entries.filter(e => e.value.trim() !== '');
    if (filled.length === 0 && reportDocuments.length === 0) {
      alert('Please enter at least one test result or attach a lab report image/PDF');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const results = filled.map(e => ({
        testCode: e.testCode,
        testName: e.testName,
        value: Number.parseFloat(e.value) || e.value,
        unit: e.unit,
        normalRange: { low: Number.parseFloat(e.normalRangeLow) || 0, high: Number.parseFloat(e.normalRangeHigh) || 0 },
        flag: e.flag,
        notes: e.notes,
      }));

      const response = await fetch(`/api/lab-orders/${order.id}/results`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ results, documents: reportDocuments }),
      });

      if (!response.ok) throw new Error('Failed to save results');
      alert('✅ Lab results saved and patient notified!');
      setIsEditing(false);
      setReportDocuments([]);
      await onResultsSubmitted();
    } catch (error) {
      console.error('Result submission error:', error);
      alert('❌ Failed to save results. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => {
          initEntries();
          setIsEditing(true);
        }}
        className="mt-2 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
      >
        Enter Results
      </button>
    );
  }

  return (
    <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-emerald-800">Enter Lab Results</h4>
        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 text-xs">
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((entry, idx) => (
          <div key={entry.testCode} className="p-3 bg-white rounded border border-gray-200">
            <div className="font-medium text-sm text-gray-800 mb-2">
              {entry.testName} ({entry.testCode})
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label htmlFor={`val-${entry.testCode}`} className="block text-xs text-gray-500 mb-0.5">Value *</label>
                <input
                  id={`val-${entry.testCode}`}
                  type="number"
                  step="any"
                  value={entry.value}
                  onChange={e => updateEntry(idx, 'value', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="e.g., 7.2"
                />
              </div>
              <div>
                <label htmlFor={`unit-${entry.testCode}`} className="block text-xs text-gray-500 mb-0.5">Unit</label>
                <input
                  id={`unit-${entry.testCode}`}
                  type="text"
                  value={entry.unit}
                  onChange={e => updateEntry(idx, 'unit', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="e.g., mg/dL"
                />
              </div>
              <div>
                <label htmlFor={`lo-${entry.testCode}`} className="block text-xs text-gray-500 mb-0.5">Normal Low</label>
                <input
                  id={`lo-${entry.testCode}`}
                  type="number"
                  step="any"
                  value={entry.normalRangeLow}
                  onChange={e => updateEntry(idx, 'normalRangeLow', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Low"
                />
              </div>
              <div>
                <label htmlFor={`hi-${entry.testCode}`} className="block text-xs text-gray-500 mb-0.5">Normal High</label>
                <input
                  id={`hi-${entry.testCode}`}
                  type="number"
                  step="any"
                  value={entry.normalRangeHigh}
                  onChange={e => updateEntry(idx, 'normalRangeHigh', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="High"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <label htmlFor={`flag-${entry.testCode}`} className="text-xs text-gray-500">Flag:</label>
                <select
                  id={`flag-${entry.testCode}`}
                  value={entry.flag}
                  onChange={e => updateEntry(idx, 'flag', e.target.value)}
                  className="px-2 py-0.5 border border-gray-300 rounded text-xs"
                >
                  <option value="NORMAL">✅ Normal</option>
                  <option value="HIGH">🔴 High</option>
                  <option value="LOW">🔵 Low</option>
                  <option value="CRITICAL">🚨 Critical</option>
                </select>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={entry.notes}
                  onChange={e => updateEntry(idx, 'notes', e.target.value)}
                  className="w-full px-2 py-0.5 border border-gray-300 rounded text-xs"
                  placeholder="Notes (optional)"
                  aria-label={`Notes for ${entry.testName}`}
                />
              </div>
              <span className="text-lg" title={entry.flag}>{getFlagEmoji(entry.flag)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-white rounded border border-dashed border-emerald-300">
        <label htmlFor={`lab-report-upload-${order.id}`} className="block text-sm font-medium text-emerald-800 mb-2">
          Attach lab report (image/PDF)
        </label>
        <input
          id={`lab-report-upload-${order.id}`}
          type="file"
          data-testid="lab-report-upload-btn"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          multiple
          onChange={e => void handleReportFiles(e.target.files)}
          className="block w-full text-sm text-gray-600"
        />
        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
        {reportDocuments.length > 0 && (
          <ul className="mt-2 text-xs text-gray-600 space-y-1">
            {reportDocuments.map(doc => (
              <li key={`${doc.name}-${doc.size}`}>
                📎 {doc.name} ({Math.round(doc.size / 1024)} KB)
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving & Generating AI Analysis...' : 'Submit Results & Notify Patient'}
      </button>
    </div>
  );
}

function ImagingResultUploadForm({
  orderId,
  onDone,
}: Readonly<{ orderId: string; onDone: () => Promise<void> }>) {
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const documents: LabReportDocument[] = [];
      for (const file of Array.from(files)) {
        const data = await readFileAsBase64(file);
        documents.push({ name: file.name, type: file.type, data, size: file.size });
      }
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch(`/api/imaging-orders/${orderId}/results`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ results: [{ findings: notes }], documents, notes }),
      });
      if (!response.ok) throw new Error('Upload failed');
      await onDone();
    } catch (e) {
      console.error(e);
      alert('Failed to upload imaging results');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-indigo-50 border border-dashed border-indigo-300 rounded-lg">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Findings / report text"
        className="w-full text-sm border rounded p-2 mb-2"
        rows={2}
      />
      <input
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        multiple
        data-testid="imaging-report-upload-btn"
        disabled={uploading}
        onChange={(e) => void handleFiles(e.target.files)}
        className="block w-full text-sm"
      />
    </div>
  );
}

interface CompleteLabOrdersProps {
  doctor: User;
  patient: PatientRecord | null;
  onClose: () => void;
}

export const CompleteLabOrders: React.FC<CompleteLabOrdersProps> = ({
  doctor,
  patient,
  onClose,
}) => {
  const [view, setView] = useState<'order' | 'results' | 'imaging'>('order');
  const [labTestCatalog, setLabTestCatalog] = useState<LabTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [imagingOrders, setImagingOrders] = useState<any[]>([]);
  const [imagingModality, setImagingModality] = useState('xray');
  const [imagingBodyPart, setImagingBodyPart] = useState('');
  const [imagingIndication, setImagingIndication] = useState('');

  const commonPanels = [
    {
      name: 'Complete Blood Count (CBC)',
      tests: ['CBC'],
    },
    {
      name: 'Comprehensive Metabolic Panel (CMP)',
      tests: ['CMP'],
    },
    {
      name: 'Lipid Panel',
      tests: ['Lipid'],
    },
    {
      name: 'HbA1c (Diabetes)',
      tests: ['HbA1c'],
    },
    {
      name: 'Thyroid Function',
      tests: ['TSH'],
    },
  ];

  useEffect(() => {
    async function loadData() {
      const tests = await getLabTests();
      setLabTestCatalog(tests as LabTest[]);

      if (patient) {
        const orders = await fetchLabOrdersByPatient(patient.id);
        setPastOrders(orders as typeof pastOrders);
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        try {
          const imgResp = await fetch(`/api/imaging-orders/patient/${patient.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (imgResp.ok) {
            const imgData = await imgResp.json();
            setImagingOrders(imgData.imagingOrders || []);
          }
        } catch {
          setImagingOrders([]);
        }
      }
    }
    loadData();
  }, [patient]);

  const addTest = (test: LabTest) => {
    if (!selectedTests.some(t => t.code === test.code)) {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const removeTest = (testCode: string) => {
    setSelectedTests(selectedTests.filter(t => t.code !== testCode));
  };

  const addPanel = (panelTests: string[]) => {
    const testsToAdd = labTestCatalog.filter(t => panelTests.includes(t.code));
    const newTests = testsToAdd.filter(t => !selectedTests.some(st => st.code === t.code));
    setSelectedTests([...selectedTests, ...newTests]);
  };

  const handleOrderLabs = async () => {
    if (!patient) {
      alert('Please select a patient first');
      return;
    }

    if (selectedTests.length === 0) {
      alert('Please select at least one test');
      return;
    }

    const labOrder = {
      id: `LAB-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.demographics.name,
      doctorId: doctor.id,
      doctorName: doctor.name,
      appointmentId: patient.lastAppointmentId || undefined,
      orderDate: new Date().toISOString(),
      tests: selectedTests,
      notes: clinicalIndication || 'Routine monitoring',
      clinicalIndication: clinicalIndication || 'Routine monitoring',
      priority: urgency,
      urgency,
      status: 'ordered',
      createdAt: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('/api/lab-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(labOrder),
      });
      if (!response.ok) throw new Error('Failed to create lab order');
      const data = await response.json();
      alert('✅ Lab order placed successfully!');
      if (patient) {
        const orders = await fetchLabOrdersByPatient(patient.id);
        setPastOrders(orders as typeof pastOrders);
      }
      if (data?.labOrder?.id) {
        console.log(`[LAB] Order created: ${data.labOrder.id}`);
      }
    } catch (error) {
      console.error('Lab order error:', error);
      alert('❌ Failed to place lab order. Please try again.');
    }
    setSelectedTests([]);
    setClinicalIndication('');
    setView('results');
  };

  const handleOrderImaging = async () => {
    if (!patient || !imagingBodyPart.trim()) {
      alert('Please select patient and enter body part');
      return;
    }
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const payload = {
      patientId: patient.id,
      doctorId: doctor.id,
      imagingType: imagingModality,
      bodyPart: imagingBodyPart,
      clinicalIndication: imagingIndication || 'Diagnostic imaging',
      priority: urgency,
      status: 'ordered',
    };
    const response = await fetch('/api/imaging-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      alert('Failed to place imaging order');
      return;
    }
    alert('✅ Imaging order placed');
    setImagingBodyPart('');
    setImagingIndication('');
    setView('imaging');
    const imgResp = await fetch(`/api/imaging-orders/patient/${patient.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (imgResp.ok) {
      const imgData = await imgResp.json();
      setImagingOrders(imgData.imagingOrders || []);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Lab & Imaging Orders</h2>
            {patient && (
              <p className="text-sm text-gray-600 mt-1">
                Patient: {patient.demographics.name} • ID: {patient.demographics.idNumber}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50"
            aria-label="Close lab orders"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 p-4 border-b border-gray-200">
          <button
            onClick={() => setView('order')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'order'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Order Tests
          </button>
          <button
            onClick={() => setView('results')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'results'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Lab Results ({pastOrders.length})
          </button>
          <button
            onClick={() => setView('imaging')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'imaging'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Imaging ({imagingOrders.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {view === 'order' && (
            <div className="space-y-6">
              {/* Common Panels */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Common Test Panels
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {commonPanels.map((panel) => (
                    <button
                      key={panel.name}
                      onClick={() => addPanel(panel.tests)}
                      className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg text-left hover:bg-purple-100 hover:border-purple-300 transition-colors"
                    >
                      <div className="font-medium text-purple-900">{panel.name}</div>
                      <div className="text-sm text-purple-600 mt-1">
                        {panel.tests.join(', ')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Tests */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Individual Tests
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {labTestCatalog.map((test) => (
                    <button
                      key={test.code}
                      onClick={() => addTest(test)}
                      disabled={selectedTests.some(t => t.code === test.code)}
                      className="p-2 text-sm bg-gray-100 rounded border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div className="font-medium text-gray-900">{test.code}</div>
                      <div className="text-xs text-gray-600">{test.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Tests */}
              {selectedTests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Selected Tests ({selectedTests.length})
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedTests.map((test) => (
                        <div
                          key={test.code}
                          className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded-full"
                        >
                          <span className="text-sm font-medium">{test.code}</span>
                          <button
                            onClick={() => removeTest(test.code)}
                            className="text-red-600 hover:text-red-700"
                            aria-label={`Remove test ${test.code}`}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label htmlFor="clinical-indication" className="block text-sm font-medium text-gray-700 mb-1">
                          Clinical Indication *
                        </label>
                        <input
                          id="clinical-indication"
                          type="text"
                          value={clinicalIndication}
                          onChange={(e) => setClinicalIndication(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., Routine monitoring, Diagnostic workup"
                        />
                      </div>

                      <div>
                        <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
                          Urgency
                        </label>
                        <select
                          id="urgency"
                          value={urgency}
                          onChange={(e) => setUrgency(e.target.value as any)}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="stat">STAT (Immediate)</option>
                        </select>
                      </div>

                      <button
                        onClick={handleOrderLabs}
                        disabled={!patient}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Place Lab Order
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'results' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Lab Results ({pastOrders.length})
              </h3>

              {pastOrders.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No lab orders found</p>
                  {!patient && (
                    <p className="text-sm mt-1">Select a patient to view their lab results</p>
                  )}
                </div>
              )}

              {pastOrders.map((order) => (
                <div key={order.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">
                        Order #{order.id}
                      </div>
                      <div className="text-sm text-gray-600">
                        Ordered: {new Date(order.orderDate || order.ordered_date).toLocaleDateString()} • Dr. {order.doctorName || order.doctor_name}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {order.priority && order.priority !== 'routine' && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          order.priority === 'stat' ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {order.priority.toUpperCase()}
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${(() => {
                        if (order.status === 'completed') return 'bg-green-100 text-green-700';
                        if (order.status === 'in_progress') return 'bg-blue-100 text-blue-700';
                        return 'bg-yellow-100 text-yellow-700';
                      })()}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700">Tests Ordered:</div>
                    <div className="text-sm text-gray-600">
                      {(Array.isArray(order.tests) ? order.tests : []).map((t: any) => t.name || t.code).join(', ')}
                    </div>
                  </div>

                  {/* Completed: Show results */}
                  {order.status === 'completed' && order.results && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium text-gray-700 mb-2">Results:</div>
                      <div className="space-y-1">
                        {(Array.isArray(order.results) ? order.results : (order.results?.results || [])).map((result: any, i: number) => (
                          <div key={`result-${result.testName || result.testCode}-${i}`} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{result.testName}:</span>
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${(() => {
                                const flag = (result.flag || '').toUpperCase();
                                if (flag === 'CRITICAL') return 'text-red-700 font-bold';
                                if (flag === 'HIGH' || flag === 'LOW') return 'text-red-600';
                                return 'text-gray-900';
                              })()}`}>
                                {result.value} {result.unit}
                              </span>
                              {result.normalRange && (
                                <span className="text-gray-500 text-xs">
                                  ({typeof result.normalRange === 'object'
                                    ? `${result.normalRange.low}-${result.normalRange.high}`
                                    : result.normalRange})
                                </span>
                              )}
                              {result.flag && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${(() => {
                                  const flag = result.flag.toUpperCase();
                                  if (flag === 'CRITICAL') return 'bg-red-600 text-white';
                                  if (flag === 'HIGH') return 'bg-red-100 text-red-700';
                                  if (flag === 'LOW') return 'bg-blue-100 text-blue-700';
                                  return 'bg-green-100 text-green-700';
                                })()}`}>
                                  {getFlagEmoji(result.flag.toUpperCase())} {result.flag.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {order.ai_analysis && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="text-sm font-medium text-blue-800 mb-1">🤖 AI Analysis:</div>
                          <div className="text-sm text-blue-700 whitespace-pre-line">{order.ai_analysis}</div>
                        </div>
                      )}
                      {(() => {
                        const docs = order.results?.documents
                          || (typeof order.results === 'object' && !Array.isArray(order.results) ? order.results.documents : []);
                        if (!docs?.length) return null;
                        return (
                          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                            <div className="text-sm font-medium text-purple-800 mb-2">📎 Attached reports:</div>
                            <ul className="text-sm text-purple-700 space-y-1">
                              {docs.map((doc: { id?: string; name: string; type?: string }) => (
                                <li key={doc.id || doc.name}>{doc.name}{doc.type?.startsWith('image/') ? ' (image)' : ''}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Result entry / re-upload for pending and completed orders */}
                  <ResultEntryForm
                    order={order}
                    onResultsSubmitted={async () => {
                      if (patient) {
                        const orders = await fetchLabOrdersByPatient(patient.id);
                        setPastOrders(orders);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {view === 'imaging' && (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <h3 className="font-semibold text-indigo-900 mb-3">Order Imaging Study</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={imagingModality}
                    onChange={(e) => setImagingModality(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                    aria-label="Imaging modality"
                  >
                    <option value="xray">X-Ray</option>
                    <option value="ct">CT Scan</option>
                    <option value="mri">MRI</option>
                    <option value="ultrasound">Ultrasound</option>
                  </select>
                  <input
                    type="text"
                    value={imagingBodyPart}
                    onChange={(e) => setImagingBodyPart(e.target.value)}
                    placeholder="Body part (e.g. chest)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={imagingIndication}
                    onChange={(e) => setImagingIndication(e.target.value)}
                    placeholder="Clinical indication"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleOrderImaging()}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Place Imaging Order
                </button>
              </div>

              {imagingOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No imaging orders yet</p>
              ) : (
                imagingOrders.map((order: any) => (
                  <div key={order.id} className="p-4 border rounded-lg bg-white">
                    <div className="font-medium">{order.imaging_type?.toUpperCase()} — {order.body_part}</div>
                    <div className="text-sm text-gray-500">Status: {order.status}</div>
                    {order.status !== 'completed' && (
                      <ImagingResultUploadForm
                        orderId={order.id}
                        onDone={async () => {
                          if (!patient) return;
                          const token = localStorage.getItem('token') || localStorage.getItem('authToken');
                          const imgResp = await fetch(`/api/imaging-orders/patient/${patient.id}`, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                          });
                          if (imgResp.ok) {
                            const imgData = await imgResp.json();
                            setImagingOrders(imgData.imagingOrders || []);
                          }
                        }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteLabOrders;
