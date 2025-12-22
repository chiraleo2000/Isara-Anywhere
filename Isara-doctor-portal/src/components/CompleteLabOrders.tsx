/**
 * Complete Lab & Imaging Orders
 * Order tests, view results, trend analysis
 */

import React, { useState, useEffect } from 'react';
import { PatientRecord, User } from '../types';
import { getLabTests, getPatientLabOrders, addMockDataRecord } from '../services/mockDataService';

interface LabTest {
  code: string;
  name: string;
  category: string;
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
  const [view, setView] = useState<'order' | 'results'>('order');
  const [labTestCatalog, setLabTestCatalog] = useState<LabTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [pastOrders, setPastOrders] = useState<any[]>([]);

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
        const orders = await getPatientLabOrders(patient.id);
        setPastOrders(orders);
      }
    }
    loadData();
  }, [patient]);

  const addTest = (test: LabTest) => {
    if (!selectedTests.find(t => t.code === test.code)) {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const removeTest = (testCode: string) => {
    setSelectedTests(selectedTests.filter(t => t.code !== testCode));
  };

  const addPanel = (panelTests: string[]) => {
    const testsToAdd = labTestCatalog.filter(t => panelTests.includes(t.code));
    const newTests = testsToAdd.filter(t => !selectedTests.find(st => st.code === t.code));
    setSelectedTests([...selectedTests, ...newTests]);
  };

  const handleOrderLabs = () => {
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
      orderDate: new Date().toISOString(),
      tests: selectedTests,
      clinicalIndication: clinicalIndication || 'Routine monitoring',
      urgency,
      status: 'ordered',
      createdAt: new Date().toISOString(),
    };

    addMockDataRecord('lab-orders.json', labOrder);
    alert('✅ Lab order placed successfully!');
    setSelectedTests([]);
    setClinicalIndication('');
    setView('results');
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
            View Results ({pastOrders.length})
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
                  {commonPanels.map((panel, index) => (
                    <button
                      key={index}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Clinical Indication *
                        </label>
                        <input
                          type="text"
                          value={clinicalIndication}
                          onChange={(e) => setClinicalIndication(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., Routine monitoring, Diagnostic workup"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Urgency
                        </label>
                        <select
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

              {pastOrders.map((order, index) => (
                <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">
                        Order #{order.id}
                      </div>
                      <div className="text-sm text-gray-600">
                        Ordered: {new Date(order.orderDate).toLocaleDateString()} • Dr. {order.doctorName}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700">Tests Ordered:</div>
                    <div className="text-sm text-gray-600">
                      {order.tests.map((t: any) => t.name || t.code).join(', ')}
                    </div>
                  </div>

                  {order.results && order.results.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium text-gray-700 mb-2">Results:</div>
                      <div className="space-y-1">
                        {order.results.map((result: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{result.testName}:</span>
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${
                                result.flag === 'high' || result.flag === 'low'
                                  ? 'text-red-600'
                                  : result.flag === 'critical'
                                  ? 'text-red-700 font-bold'
                                  : 'text-gray-900'
                              }`}>
                                {result.value} {result.unit}
                              </span>
                              <span className="text-gray-500 text-xs">
                                ({result.normalRange})
                              </span>
                              {result.flag && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  {result.flag.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!order.results && (
                    <div className="text-sm text-gray-500 italic">
                      Results pending...
                    </div>
                  )}
                </div>
              ))}
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
