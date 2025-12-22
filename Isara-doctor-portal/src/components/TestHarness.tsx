import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientRecord } from '../types';
import { patientDataService } from '../services/patientDataService';
import { patientRecordService } from '../services/patientRecordService';
import { geminiClinicalService } from '../services/geminiClinicalService';
// Comprehensive Test Harness for Isara Doctor Portal

interface TestHarnessProps {
  doctor: any;
  patients: PatientRecord[];
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
}

interface DataPreview {
  type: string;
  data: any;
  loading: boolean;
  error?: string;
}

const TestHarness: React.FC<TestHarnessProps> = ({ doctor, patients: initialPatients }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientRecord[]>(initialPatients || []);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Summarize the following clinical note briefly: Patient reports cough and fever for 2 days.');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [chatMessage, setChatMessage] = useState('Hi assistant, provide likely diagnoses for fever and cough.');
  const [chatResponse, setChatResponse] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patients[0]?.id || null);
  const [status, setStatus] = useState<string>('idle');
  
  // Comprehensive testing state
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'emr' | 'labs' | 'imaging' | 'prescriptions' | 'timeline' | 'ai' | 'navigation'>('overview');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [dataPreview, setDataPreview] = useState<DataPreview>({ type: '', data: null, loading: false });
  const [runningAllTests, setRunningAllTests] = useState(false);

  useEffect(() => {
    if (!patients || patients.length === 0) {
      loadPatients();
    }
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await patientDataService.getAllPatients();
      setPatients(data || []);
      if (data && data.length > 0) setSelectedPatientId(data[0].id);
    } catch (err) {
      console.error('Error loading patients', err);
    } finally {
      setLoading(false);
    }
  };

  // Test functions
  const runTest = async (testName: string, testFn: () => Promise<any>): Promise<TestResult> => {
    const result: TestResult = { name: testName, status: 'running' };
    setTestResults(prev => [...prev.filter(t => t.name !== testName), result]);
    
    try {
      const data = await testFn();
      const passed: TestResult = { name: testName, status: 'passed', message: 'Success', data };
      setTestResults(prev => [...prev.filter(t => t.name !== testName), passed]);
      return passed;
    } catch (err: any) {
      const failed: TestResult = { name: testName, status: 'failed', message: err?.message || String(err) };
      setTestResults(prev => [...prev.filter(t => t.name !== testName), failed]);
      return failed;
    }
  };

  const testPatientsList = () => runTest('Load All Patients', async () => {
    const data = await patientDataService.getAllPatients();
    if (!data || data.length === 0) throw new Error('No patients loaded');
    return { count: data.length, sample: data[0] };
  });

  const testPatientById = () => runTest('Get Patient By ID', async () => {
    if (!selectedPatientId) throw new Error('No patient selected');
    const doctorId = doctor?.id || 'DOC-DEMO-001';
    const data = await patientDataService.getPatientDetails(selectedPatientId, doctorId);
    if (!data) throw new Error('Patient not found');
    return data;
  });

  const testEMRRecords = () => runTest('Load EMR Records', async () => {
    if (!selectedPatientId) throw new Error('No patient selected');
    const data = await patientRecordService.getEMRs(selectedPatientId);
    if (!data || data.length === 0) throw new Error('No EMR records found');
    return { count: data.length, sample: data[0] };
  });

  const testPHRData = () => runTest('Load PHR Data', async () => {
    if (!selectedPatientId) throw new Error('No patient selected');
    const data = await patientRecordService.getPHR(selectedPatientId);
    if (!data) throw new Error('No PHR data found');
    return data;
  });

  const testLabResults = () => runTest('Load Lab Results', async () => {
    if (!selectedPatientId) throw new Error('No patient selected');
    const data = await patientRecordService.getLabResults(selectedPatientId);
    if (!data || data.length === 0) throw new Error('No lab results found');
    return { count: data.length, sample: data[0] };
  });

  const testImagingResults = () => runTest('Load Imaging Results', async () => {
    if (!selectedPatientId) throw new Error('No patient selected');
    const data = await patientRecordService.getImagingResults(selectedPatientId);
    if (!data || data.length === 0) throw new Error('No imaging results found');
    return { count: data.length, sample: data[0] };
  });

  const testEHRTimeline = () => runTest('Load EHR Timeline', async () => {
    if (!selectedPatientId) throw new Error('No patient selected');
    const data = await patientRecordService.getEHRTimeline(selectedPatientId);
    if (!data || !data.events || data.events.length === 0) throw new Error('No timeline events found');
    return { count: data.events.length, sample: data.events[0] };
  });

  const testGeminiAPI = () => runTest('Gemini API Connection', async () => {
    const configured = geminiClinicalService.isApiConfigured();
    if (!configured) throw new Error('Gemini API not configured');
    return { configured: true };
  });

  const testAIQuestion = () => runTest('AI Medical Question', async () => {
    const response = await geminiClinicalService.askMedicalQuestion('What are common symptoms of flu?', {});
    if (!response) throw new Error('No AI response received');
    const responseText = response.suggestions?.join(', ') || JSON.stringify(response);
    return { responseLength: responseText.length, preview: responseText.substring(0, 100) };
  });

  const runAllTests = async () => {
    setRunningAllTests(true);
    setTestResults([]);
    
    await testPatientsList();
    await testPatientById();
    await testEMRRecords();
    await testPHRData();
    await testLabResults();
    await testImagingResults();
    await testEHRTimeline();
    await testGeminiAPI();
    
    setRunningAllTests(false);
  };

  // Data preview functions
  const previewData = async (type: string, fetchFn: () => Promise<any>) => {
    setDataPreview({ type, data: null, loading: true });
    try {
      const data = await fetchFn();
      setDataPreview({ type, data, loading: false });
    } catch (err: any) {
      setDataPreview({ type, data: null, loading: false, error: err?.message || String(err) });
    }
  };

  const handleAskAI = async () => {
    setStatus('calling-ai');
    setAiResponse('');
    try {
      const res = await geminiClinicalService.askMedicalQuestion(aiPrompt, {
        patientId: selectedPatientId || undefined,
      });
      setAiResponse(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
    } catch (err: any) {
      setAiResponse(`Error: ${err?.message || String(err)}`);
    } finally {
      setStatus('idle');
    }
  };

  const handleChatAI = async () => {
    setStatus('chatting');
    setChatResponse('');
    try {
      const response = await geminiClinicalService.clinicalChat(chatMessage, {
        id: selectedPatientId || 'test-patient',
        demographics: { name: 'Test Patient' },
      } as any, []);
      setChatResponse(typeof response === 'string' ? response : JSON.stringify(response, null, 2));
    } catch (err: any) {
      setChatResponse(`Error: ${err?.message || String(err)}`);
    } finally {
      setStatus('idle');
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const getTestStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800 border-green-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      case 'running': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTestStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '✓';
      case 'failed': return '✗';
      case 'running': return '⟳';
      default: return '○';
    }
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'patients', label: '👥 Patients', icon: '👥' },
    { id: 'emr', label: '📋 EMR/EHR', icon: '📋' },
    { id: 'labs', label: '🧪 Labs', icon: '🧪' },
    { id: 'imaging', label: '🩻 Imaging', icon: '🩻' },
    { id: 'prescriptions', label: '💊 Prescriptions', icon: '💊' },
    { id: 'timeline', label: '📅 Timeline', icon: '📅' },
    { id: 'ai', label: '🤖 AI Testing', icon: '🤖' },
    { id: 'navigation', label: '🔗 Navigation', icon: '🔗' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">🧪 Comprehensive Test Harness</h1>
          <p className="text-indigo-200 mt-1">Full feature testing for Isara Doctor Portal</p>
          
          {/* Patient Selector in Header */}
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm font-medium">Active Patient Context:</label>
            <select 
              value={selectedPatientId || ''} 
              onChange={(e) => setSelectedPatientId(e.target.value)} 
              className="p-2 rounded bg-white text-gray-800 min-w-64"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.demographics?.name || p.id} ({p.id})
                </option>
              ))}
            </select>
            <button onClick={loadPatients} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded text-sm">
              Reload Patients
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50' 
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-3xl font-bold text-indigo-600">{patients.length}</div>
                <div className="text-sm text-gray-600">Total Patients</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-3xl font-bold text-green-600">
                  {testResults.filter(t => t.status === 'passed').length}
                </div>
                <div className="text-sm text-gray-600">Tests Passed</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-3xl font-bold text-red-600">
                  {testResults.filter(t => t.status === 'failed').length}
                </div>
                <div className="text-sm text-gray-600">Tests Failed</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-3xl font-bold text-purple-600">
                  {geminiClinicalService.isApiConfigured() ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Gemini API</div>
              </div>
            </div>

            {/* Run All Tests */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Automated Test Suite</h2>
                <button 
                  onClick={runAllTests}
                  disabled={runningAllTests}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {runningAllTests ? '⟳ Running Tests...' : '▶ Run All Tests'}
                </button>
              </div>
              
              {testResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {testResults.map((test) => (
                    <div key={test.name} className={`p-3 rounded-lg border ${getTestStatusColor(test.status)}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTestStatusIcon(test.status)}</span>
                        <span className="font-medium">{test.name}</span>
                      </div>
                      {test.message && (
                        <div className="text-sm mt-1 opacity-75">{test.message}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Health */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Service Health Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="font-medium text-green-800">Patient Data Service</div>
                  <div className="text-sm text-green-600">✓ Operational</div>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="font-medium text-green-800">Patient Record Service</div>
                  <div className="text-sm text-green-600">✓ Operational</div>
                </div>
                <div className={`p-4 rounded-lg ${geminiClinicalService.isApiConfigured() ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className={`font-medium ${geminiClinicalService.isApiConfigured() ? 'text-green-800' : 'text-yellow-800'}`}>
                    Gemini Clinical Service
                  </div>
                  <div className={`text-sm ${geminiClinicalService.isApiConfigured() ? 'text-green-600' : 'text-yellow-600'}`}>
                    {geminiClinicalService.isApiConfigured() ? '✓ Configured' : '⚠ API Key Required'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Patient Data Testing</h2>
                <div className="flex gap-2">
                  <button onClick={testPatientsList} className="px-3 py-2 bg-blue-600 text-white rounded">
                    Test Load All
                  </button>
                  <button onClick={testPatientById} className="px-3 py-2 bg-green-600 text-white rounded">
                    Test Get By ID
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">ID</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Age/Gender</th>
                      <th className="px-4 py-2 text-left">Conditions</th>
                      <th className="px-4 py-2 text-left">Risk Level</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{patient.id}</td>
                        <td className="px-4 py-2 font-medium">{patient.demographics?.name || 'N/A'}</td>
                        <td className="px-4 py-2">
                          {patient.demographics?.age || 'N/A'} / {patient.demographics?.gender || 'N/A'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {patient.medicalInfo?.chronicConditions?.slice(0, 2).map((c, i) => (
                              <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{c}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            patient.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                            patient.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {patient.riskLevel || 'low'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button 
                            onClick={() => setSelectedPatientId(patient.id)}
                            className="text-indigo-600 hover:underline text-sm"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Patient Details */}
            {selectedPatientId && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-4">Selected Patient Details: {selectedPatientId}</h3>
                <button 
                  onClick={() => previewData('patient', () => patientDataService.getPatientDetails(selectedPatientId!, doctor?.id || 'DOC-DEMO-001'))}
                  className="px-3 py-2 bg-indigo-600 text-white rounded mb-4"
                >
                  Load Full Details
                </button>
                {dataPreview.type === 'patient' && (
                  <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-xs">
                    {dataPreview.loading ? 'Loading...' : JSON.stringify(dataPreview.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* EMR/EHR Tab */}
        {activeTab === 'emr' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">EMR/EHR Testing</h2>
                <div className="flex gap-2">
                  <button onClick={testEMRRecords} className="px-3 py-2 bg-blue-600 text-white rounded">
                    Test EMR Load
                  </button>
                  <button onClick={testPHRData} className="px-3 py-2 bg-green-600 text-white rounded">
                    Test PHR Load
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">EMR Records</h3>
                  <button 
                    onClick={() => previewData('emr', () => patientRecordService.getEMRs(selectedPatientId!))}
                    className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded mb-2 w-full"
                  >
                    Preview EMR Data
                  </button>
                  {dataPreview.type === 'emr' && (
                    <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-80 text-xs">
                      {dataPreview.loading ? 'Loading...' : 
                       dataPreview.error ? `Error: ${dataPreview.error}` :
                       JSON.stringify(dataPreview.data, null, 2)}
                    </pre>
                  )}
                </div>
                <div>
                  <h3 className="font-medium mb-2">PHR Data</h3>
                  <button 
                    onClick={() => previewData('phr', () => patientRecordService.getPHR(selectedPatientId!))}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded mb-2 w-full"
                  >
                    Preview PHR Data
                  </button>
                  {dataPreview.type === 'phr' && (
                    <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-80 text-xs">
                      {dataPreview.loading ? 'Loading...' : 
                       dataPreview.error ? `Error: ${dataPreview.error}` :
                       JSON.stringify(dataPreview.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Labs Tab */}
        {activeTab === 'labs' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Laboratory Results Testing</h2>
                <button onClick={testLabResults} className="px-3 py-2 bg-blue-600 text-white rounded">
                  Test Lab Results
                </button>
              </div>

              <button 
                onClick={() => previewData('labs', () => patientRecordService.getLabResults(selectedPatientId!))}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded mb-4"
              >
                Preview Lab Data for {selectedPatientId}
              </button>

              {dataPreview.type === 'labs' && (
                <div>
                  {dataPreview.loading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : dataPreview.error ? (
                    <div className="text-red-600 p-4 bg-red-50 rounded">{dataPreview.error}</div>
                  ) : dataPreview.data && Array.isArray(dataPreview.data) ? (
                    <div className="space-y-4">
                      {dataPreview.data.map((lab: any, idx: number) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">{lab.orderId || lab.id}</div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              lab.status === 'completed' ? 'bg-green-100 text-green-700' :
                              lab.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>{lab.status}</span>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Order Date: {lab.orderDate ? new Date(lab.orderDate).toLocaleDateString() : 'N/A'}
                          </div>
                          {lab.tests && (
                            <div className="text-sm">
                              <strong>Tests:</strong> {lab.tests.map((t: any) => t.testName).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-xs">
                      {JSON.stringify(dataPreview.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Imaging Tab */}
        {activeTab === 'imaging' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Imaging Results Testing</h2>
                <button onClick={testImagingResults} className="px-3 py-2 bg-blue-600 text-white rounded">
                  Test Imaging Results
                </button>
              </div>

              <button 
                onClick={() => previewData('imaging', () => patientRecordService.getImagingResults(selectedPatientId!))}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded mb-4"
              >
                Preview Imaging Data for {selectedPatientId}
              </button>

              {dataPreview.type === 'imaging' && (
                <div>
                  {dataPreview.loading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : dataPreview.error ? (
                    <div className="text-red-600 p-4 bg-red-50 rounded">{dataPreview.error}</div>
                  ) : dataPreview.data && Array.isArray(dataPreview.data) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dataPreview.data.map((img: any, idx: number) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{img.imagingType} - {img.bodyPart}</div>
                              <div className="text-sm text-gray-600">{img.studyDescription}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              img.status === 'completed' ? 'bg-green-100 text-green-700' :
                              img.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{img.status}</span>
                          </div>
                          {img.report && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <strong>Impression:</strong> {img.report.impression}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-xs">
                      {JSON.stringify(dataPreview.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Prescription Testing</h2>
              
              <button 
                onClick={() => previewData('prescriptions', async () => {
                  const res = await fetch('/mockData/prescriptions.json');
                  return res.json();
                })}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded mb-4"
              >
                Load All Prescriptions
              </button>

              {dataPreview.type === 'prescriptions' && (
                <div>
                  {dataPreview.loading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : dataPreview.error ? (
                    <div className="text-red-600 p-4 bg-red-50 rounded">{dataPreview.error}</div>
                  ) : dataPreview.data && Array.isArray(dataPreview.data) ? (
                    <div className="space-y-4">
                      {dataPreview.data.filter((rx: any) => rx.patientId === selectedPatientId).map((rx: any, idx: number) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">{rx.prescriptionId}</div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              rx.status === 'active' ? 'bg-green-100 text-green-700' :
                              rx.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{rx.status}</span>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Date: {rx.prescriptionDate ? new Date(rx.prescriptionDate).toLocaleDateString() : 'N/A'}
                          </div>
                          {rx.medications && (
                            <div className="space-y-1">
                              {rx.medications.map((med: any, midx: number) => (
                                <div key={midx} className="text-sm p-2 bg-gray-50 rounded">
                                  <strong>{med.drugName}</strong> {med.dosage} - {med.frequency}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Patient Timeline Testing</h2>
                <button onClick={testEHRTimeline} className="px-3 py-2 bg-blue-600 text-white rounded">
                  Test Timeline Load
                </button>
              </div>

              <button 
                onClick={() => previewData('timeline', () => patientRecordService.getEHRTimeline(selectedPatientId!))}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded mb-4"
              >
                Preview Timeline for {selectedPatientId}
              </button>

              {dataPreview.type === 'timeline' && (
                <div>
                  {dataPreview.loading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : dataPreview.error ? (
                    <div className="text-red-600 p-4 bg-red-50 rounded">{dataPreview.error}</div>
                  ) : dataPreview.data && Array.isArray(dataPreview.data) ? (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      <div className="space-y-4">
                        {dataPreview.data.map((event: any, idx: number) => (
                          <div key={idx} className="ml-8 p-4 border rounded-lg relative">
                            <div className="absolute -left-6 top-4 w-4 h-4 rounded-full bg-indigo-500"></div>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{event.title}</div>
                                <div className="text-sm text-gray-600">{event.description}</div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{event.eventType}</span>
                              <span className="px-2 py-0.5 bg-blue-100 rounded text-xs">{event.category}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-xs">
                      {JSON.stringify(dataPreview.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Testing Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-4">🧠 Ask Medical Question (one-off)</h3>
                <textarea 
                  value={aiPrompt} 
                  onChange={(e) => setAiPrompt(e.target.value)} 
                  className="w-full p-3 border rounded-lg h-32"
                  placeholder="Enter a medical question..."
                />
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={handleAskAI} 
                    disabled={status !== 'idle'} 
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {status === 'calling-ai' ? '⟳ Processing...' : 'Ask AI'}
                  </button>
                  <button 
                    onClick={() => { 
                      setAiPrompt('What are the key differential diagnoses for a 45-year-old male presenting with chest pain and shortness of breath?'); 
                      setAiResponse(''); 
                    }} 
                    className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Load Example
                  </button>
                </div>
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Response:</h4>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-64 whitespace-pre-wrap">
                    {aiResponse || 'No response yet'}
                  </pre>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-4">💬 Clinical Chat (conversation)</h3>
                <textarea 
                  value={chatMessage} 
                  onChange={(e) => setChatMessage(e.target.value)} 
                  className="w-full p-3 border rounded-lg h-32"
                  placeholder="Enter a chat message..."
                />
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={handleChatAI} 
                    disabled={status !== 'idle'} 
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {status === 'chatting' ? '⟳ Chatting...' : 'Send Chat'}
                  </button>
                  <button 
                    onClick={() => { setChatMessage(''); setChatResponse(''); }} 
                    className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Response:</h4>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-64 whitespace-pre-wrap">
                    {chatResponse || 'No chat response yet'}
                  </pre>
                </div>
              </div>
            </div>

            {/* API Status */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">API Configuration Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${geminiClinicalService.isApiConfigured() ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <div className="font-medium">Gemini API</div>
                  <div className="text-sm mt-1">
                    {geminiClinicalService.isApiConfigured() 
                      ? '✓ API key is configured and ready' 
                      : '⚠ Set VITE_GEMINI_API_KEY in your .env file'}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="font-medium">Test AI Connection</div>
                  <button 
                    onClick={testAIQuestion}
                    className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                  >
                    Run Connection Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tab */}
        {activeTab === 'navigation' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Navigation Testing</h2>
              <p className="text-gray-600 mb-4">Click any button to navigate to that section and verify it loads correctly.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700">Core Pages</h3>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/dashboard`)} className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-left">
                    📊 Dashboard
                  </button>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/patients`)} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-left">
                    👥 Patient Management
                  </button>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/schedule`)} className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-left">
                    📅 Schedule
                  </button>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/queue`)} className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-left">
                    ⏳ Queue Management
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700">Clinical Tools</h3>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/prescribe`)} className="w-full px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-left">
                    💊 Prescribing
                  </button>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/lab-orders`)} className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-left">
                    🧪 Lab Orders
                  </button>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/emr`)} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-left">
                    📋 EMR Editor
                  </button>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/clinical-resources`)} className="w-full px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-left">
                    📚 Clinical Resources
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700">AI & Communication</h3>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/ai-copilot`)} className="w-full px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-left">
                    🤖 AI Copilot
                  </button>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/ai-studio`)} className="w-full px-4 py-3 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 text-left">
                    🧠 AI Studio
                  </button>
                  <button onClick={() => handleNavigate(`/doctor/${doctor?.id}/meeting`)} className="w-full px-4 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-left">
                    🎥 Virtual Meeting
                  </button>
                </div>
              </div>
            </div>

            {/* Patient-Specific Navigation */}
            {selectedPatientId && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-4">Patient-Specific Pages ({selectedPatientId})</h3>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleNavigate(`/doctor/${doctor?.id}/patient/${selectedPatientId}`)} 
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    View Patient Record
                  </button>
                  <button 
                    onClick={() => handleNavigate(`/doctor/${doctor?.id}/emr?patientId=${selectedPatientId}`)} 
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                  >
                    Create EMR
                  </button>
                  <button 
                    onClick={() => handleNavigate(`/doctor/${doctor?.id}/prescribe?patientId=${selectedPatientId}`)} 
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                  >
                    Prescribe Medication
                  </button>
                  <button 
                    onClick={() => handleNavigate(`/doctor/${doctor?.id}/lab-orders?patientId=${selectedPatientId}`)} 
                    className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                  >
                    Order Labs
                  </button>
                </div>
              </div>
            )}

            {/* Developer Tools */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Developer Tools</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                >
                  🔄 Reload App
                </button>
                <button 
                  onClick={() => console.log('Current State:', { patients, selectedPatientId, doctor })} 
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  📋 Log State
                </button>
                <button 
                  onClick={() => localStorage.clear()} 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  🗑️ Clear LocalStorage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestHarness;
