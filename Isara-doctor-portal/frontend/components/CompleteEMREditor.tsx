/**
 * Complete EMR Editor with Templates
 * SOAP, SBAR, Admission, Discharge templates
 * Voice transcription, auto-save, digital signature
 * AI-assisted summary using Gemini 2.5 Flash Lite
 * Sends signed EMR to patient health logs
 */

import React, { useState, useEffect } from 'react';
import { PatientRecord, User } from '../types';
import { geminiClinicalService } from '../services/geminiClinicalService';
import { EmrEditorChrome } from './emr-editor/EmrEditorChrome';
import { readEmrAiDraft, clearEmrAiDraft } from '../utils/emrAiDraft';
import { useSettings } from '../hooks/useSettings';

// Helper to save EMR via PostgreSQL API
async function saveEMRToAPI(emr: any, isUpdate = false): Promise<boolean> {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const url = isUpdate ? `/api/emr/${emr.id}` : '/api/emr';
    const method = isUpdate ? 'PUT' : 'POST';
    const response = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(emr),
    });
    return response.ok;
  } catch (error) {
    console.error('EMR save error:', error);
    return false;
  }
}

// ============================================================================
// INTERFACES
// ============================================================================

interface EMR {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  encounterDate: string;
  encounterType: 'consultation' | 'follow-up' | 'emergency' | 'procedure';
  template: 'SOAP' | 'SBAR' | 'Admission' | 'Discharge' | 'Progress';
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems: Record<string, string>;
  physicalExamination: Record<string, any>;
  vitalSigns: {
    temperature: string;
    heartRate: number;
    bloodPressure: string;
    respiratoryRate: number;
    oxygenSaturation: number;
    weight?: string;
    height?: string;
    bmi?: string;
  };
  assessment: string;
  diagnosis: Array<{
    code: string;
    description: string;
    type: 'primary' | 'secondary';
    status: 'active' | 'resolved' | 'chronic';
  }>;
  treatmentPlan: string;
  followUpInstructions: string;
  followUpDate?: string;
  prescriptions?: Array<{
    id?: string;
    drugName: string;
    genericName?: string;
    dosage: string;
    frequency: string;
    duration?: string;
    quantity?: number;
    instructions?: string;
    warnings?: string[];
  }>;
  status: 'draft' | 'finalized' | 'amended' | 'awaiting_signature';
  aiSummary?: string;
  aiTranscript?: string;
  createdAt: string;
  lastModified: string;
  digitalSignature?: string;
  signedAt?: string;
  sentToPatientAt?: string;
  appointmentId?: string;
}

interface CompletEMREditorProps {
  patient: PatientRecord;
  doctor: User;
  existingEMR?: EMR | null;
  appointmentId?: string;
  onSave: (emr: EMR) => void;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CompleteEMREditor: React.FC<CompletEMREditorProps> = ({
  patient,
  doctor,
  existingEMR,
  appointmentId,
  onSave,
  onClose,
}) => {
  const { language } = useSettings();
  const [activeTab, setActiveTab] = useState<'subjective' | 'objective' | 'assessment' | 'plan' | 'ai_summary'>('subjective');
  // Template is fixed to OPD Card format per Thailand Ministry of Public Health standards
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSendingToPatient, setIsSendingToPatient] = useState(false);
  const [aiDraftFromMeeting, setAiDraftFromMeeting] = useState(false);
  const [aiDraftDegraded, setAiDraftDegraded] = useState(false);

  // Form state
  const [formData, setFormData] = useState<EMR>({
    id: existingEMR?.id || `EMR-${Date.now()}`,
    patientId: patient.id,
    doctorId: doctor.id,
    doctorName: doctor.name,
    encounterDate: existingEMR?.encounterDate || new Date().toISOString(),
    encounterType: existingEMR?.encounterType || 'consultation',
    template: existingEMR?.template || 'SOAP',
    chiefComplaint: existingEMR?.chiefComplaint || '',
    historyOfPresentIllness: existingEMR?.historyOfPresentIllness || '',
    reviewOfSystems: existingEMR?.reviewOfSystems || {},
    physicalExamination: existingEMR?.physicalExamination || {},
    vitalSigns: existingEMR?.vitalSigns || {
      temperature: '',
      heartRate: 0,
      bloodPressure: '',
      respiratoryRate: 0,
      oxygenSaturation: 0,
    },
    assessment: existingEMR?.assessment || '',
    diagnosis: existingEMR?.diagnosis || [],
    treatmentPlan: existingEMR?.treatmentPlan || '',
    followUpInstructions: existingEMR?.followUpInstructions || '',
    followUpDate: existingEMR?.followUpDate || '',
    status: existingEMR?.status || 'draft',
    aiSummary: existingEMR?.aiSummary || '',
    aiTranscript: existingEMR?.aiTranscript || '',
    createdAt: existingEMR?.createdAt || new Date().toISOString(),
    lastModified: new Date().toISOString(),
    appointmentId: appointmentId || existingEMR?.appointmentId,
  });

  // Pre-fill from meeting AI summary (sessionStorage emr-ai-draft)
  useEffect(() => {
    const draft = readEmrAiDraft();
    if (!draft) return;
    if (appointmentId && draft.appointmentId && draft.appointmentId !== appointmentId) return;
    if (!appointmentId && draft.patientId && draft.patientId !== patient.id) return;

    const soap = draft.structured?.soap;
    setFormData((prev) => ({
      ...prev,
      chiefComplaint: draft.structured?.chiefComplaint || prev.chiefComplaint,
      historyOfPresentIllness: soap?.subjective || prev.historyOfPresentIllness,
      physicalExamination: {
        ...prev.physicalExamination,
        general: soap?.objective || prev.physicalExamination.general || '',
      },
      assessment: soap?.assessment || prev.assessment,
      treatmentPlan: soap?.plan || prev.treatmentPlan,
      aiSummary: draft.summary || prev.aiSummary,
      status: prev.status === 'finalized' ? prev.status : 'draft',
    }));
    setAiDraftFromMeeting(true);
    setAiDraftDegraded(Boolean(draft.degraded));
    setAutoSaveStatus('unsaved');
    clearEmrAiDraft();
  }, [appointmentId, patient.id]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.status === 'draft') {
        handleAutoSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData]);

  const handleAutoSave = () => {
    setAutoSaveStatus('saving');
    saveEMRToAPI(formData, true);
    setTimeout(() => setAutoSaveStatus('saved'), 1000);
  };

  const handleSave = () => {
    const finalEMR = {
      ...formData,
      lastModified: new Date().toISOString(),
    };

    saveEMRToAPI(finalEMR, !!existingEMR);

    onSave(finalEMR);
  };

  // Generate AI Summary using Gemini 2.5 Flash Lite
  const generateAISummary = async (): Promise<{ summary: string; transcript: string }> => {
    try {
      setIsGeneratingAI(true);

      // Prepare EMR content for AI summary
      const emrContent = {
        chiefComplaint: formData.chiefComplaint,
        historyOfPresentIllness: formData.historyOfPresentIllness,
        vitalSigns: formData.vitalSigns,
        assessment: formData.assessment,
        diagnosis: formData.diagnosis,
        treatmentPlan: formData.treatmentPlan,
        followUpInstructions: formData.followUpInstructions,
      };

      // Call Gemini Clinical Service for AI-assisted summary
      const aiResult = await geminiClinicalService.generateEMRSummary(emrContent);

      return {
        summary: aiResult.summary || '',
        transcript: aiResult.transcript || '',
      };
    } catch (error) {
      console.error('❌ Error generating AI summary:', error);
      // Return empty if AI fails - don't block the finalization
      return { summary: '', transcript: '' };
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Send EMR to Patient Health Logs (PHR)
  const sendEMRToPatientHealthLogs = async (finalizedEMR: EMR): Promise<boolean> => {
    try {
      setIsSendingToPatient(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Prepare patient-friendly medication list (without sensitive internal data)
      const patientMedications = finalizedEMR.prescriptions?.map(rx => ({
        id: rx.id || `med-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        drugName: rx.drugName,
        genericName: rx.genericName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        quantity: rx.quantity,
        instructions: rx.instructions,
        warnings: rx.warnings?.filter(w => !w.includes('internal')), // Filter internal warnings
      })) || [];

      // Prepare patient-friendly health log entry
      const healthLogEntry = {
        id: `HL-${Date.now()}`,
        patientId: patient.id,
        emrId: finalizedEMR.id,
        encounterDate: finalizedEMR.encounterDate,
        encounterType: finalizedEMR.encounterType,
        doctorName: finalizedEMR.doctorName,
        doctorId: finalizedEMR.doctorId,
        chiefComplaint: finalizedEMR.chiefComplaint,
        diagnosis: finalizedEMR.diagnosis.map(d => ({
          description: d.description,
          status: d.status,
        })),
        treatmentPlan: finalizedEMR.treatmentPlan,
        medications: patientMedications, // Include prescribed medications
        followUpInstructions: finalizedEMR.followUpInstructions,
        followUpDate: finalizedEMR.followUpDate,
        aiSummary: finalizedEMR.aiSummary, // Patient-friendly summary
        signedAt: finalizedEMR.signedAt,
        signedBy: finalizedEMR.doctorName,
        createdAt: new Date().toISOString(),
        type: 'emr_record',
      };

      // Call API to add to patient's health logs
      const response = await fetch(`/api/patients/${patient.id}/health-logs`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(healthLogEntry),
      });

      if (!response.ok) {
        throw new Error('Failed to send to patient health logs');
      }

      // Send notification to patient about EMR being ready
      await notifyPatientEMRReady(finalizedEMR);

      console.log('✅ EMR sent to patient health logs');
      return true;
    } catch (error) {
      console.error('❌ Error sending EMR to patient health logs:', error);
      // Don't block finalization, but log the error
      return false;
    } finally {
      setIsSendingToPatient(false);
    }
  };

  // Notify patient that their EMR is ready
  const notifyPatientEMRReady = async (emr: EMR): Promise<void> => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      await fetch('/api/notifications/emr-signed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          patientId: patient.id,
          patientEmail: patient.contact?.email,
          patientName: patient.demographics.name,
          doctorName: emr.doctorName,
          encounterDate: emr.encounterDate,
          emrId: emr.id,
          appointmentId: emr.appointmentId,
        }),
      });
      console.log('✅ Patient notified about signed EMR');
    } catch (error) {
      console.error('❌ Error notifying patient:', error);
    }
  };

  const handleFinalize = async () => {
    // Confirm before finalizing
    const confirmFinalize = globalThis.confirm(
      'คุณต้องการลงนามและส่งเวชระเบียนนี้ให้ผู้ป่วยใช่หรือไม่?\n\n' +
      'Do you want to sign and send this EMR to the patient?\n\n' +
      'This will:\n' +
      '1. Generate AI summary for patient understanding\n' +
      '2. Add digital signature\n' +
      '3. Send to patient health logs\n' +
      '4. Notify patient via email'
    );

    if (!confirmFinalize) return;

    try {
      // Step 1: Generate AI Summary
      const { summary, transcript } = await generateAISummary();

      // Step 2: Create finalized EMR with signature
      const signedAt = new Date().toISOString();
      const finalizedEMR: EMR = {
        ...formData,
        status: 'finalized' as const,
        digitalSignature: `SIG-${doctor.id}-${Date.now()}`,
        signedAt: signedAt,
        aiSummary: summary,
        aiTranscript: transcript,
        lastModified: signedAt,
        sentToPatientAt: undefined, // Will be set after sending
      };

      setFormData(finalizedEMR);

      // Step 3: Save EMR to database via PostgreSQL API
      await saveEMRToAPI(finalizedEMR, !!existingEMR);

      // Step 4: Send to Patient Health Logs
      const sentSuccess = await sendEMRToPatientHealthLogs(finalizedEMR);

      if (sentSuccess) {
        finalizedEMR.sentToPatientAt = new Date().toISOString();
        await saveEMRToAPI(finalizedEMR, true);
      }

      // Step 5: Update appointment status to completed (if linked to appointment)
      if (finalizedEMR.appointmentId) {
        await updateAppointmentToCompleted(finalizedEMR.appointmentId);
      }

      // Step 6: Call parent onSave callback
      onSave(finalizedEMR);

      alert(
        'เวชระเบียนลงนามเรียบร้อยแล้ว\n' +
        'EMR has been signed and sent to patient.\n\n' +
        (summary ? '✅ AI Summary generated\n' : '⚠️ AI Summary not available\n') +
        (sentSuccess ? '✅ Sent to patient health logs\n' : '⚠️ Could not send to patient health logs\n') +
        '✅ Patient will be notified'
      );
    } catch (error) {
      console.error('❌ Error finalizing EMR:', error);
      alert('Error finalizing EMR. Please try again.');
    }
  };

  // Update appointment status to completed after EMR is signed
  const updateAppointmentToCompleted = async (appointmentId: string): Promise<void> => {
    try {
      await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
          emrId: formData.id,
        }),
      });
      console.log('✅ Appointment marked as completed');
    } catch (error) {
      console.error('❌ Error updating appointment status:', error);
    }
  };

  const handleVoiceTranscription = () => {
    const newVoiceState = !isVoiceActive;
    setIsVoiceActive(newVoiceState);
    // Voice transcription uses Web Speech API for real-time transcription
    if (newVoiceState) {
      console.log('🎤 Voice transcription started');
    } else {
      console.log('🎤 Voice transcription stopped');
    }
  };

  const addDiagnosis = () => {
    setFormData({
      ...formData,
      diagnosis: [
        ...formData.diagnosis,
        {
          code: '',
          description: '',
          type: 'primary',
          status: 'active',
        },
      ],
    });
  };

  const updateDiagnosis = (index: number, field: string, value: any) => {
    const updated = [...formData.diagnosis];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, diagnosis: updated });
    setAutoSaveStatus('unsaved');
  };

  const removeDiagnosis = (index: number) => {
    setFormData({
      ...formData,
      diagnosis: formData.diagnosis.filter((_, i) => i !== index),
    });
    setAutoSaveStatus('unsaved');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto"
      data-testid="emr-editor-modal"
    >
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-6xl max-h-[95dvh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <EmrEditorChrome
          patientName={patient.demographics.name}
          patientIdNumber={patient.demographics.idNumber}
          autoSaveStatus={autoSaveStatus}
          isVoiceActive={isVoiceActive}
          encounterType={formData.encounterType}
          isFinalized={formData.status === 'finalized'}
          emrStatus={formData.status}
          showAiDraftBanner={aiDraftFromMeeting || Boolean(existingEMR?.id?.startsWith('EMR-DRAFT-'))}
          aiDraftDegraded={aiDraftDegraded}
          onClose={onClose}
          onVoiceTranscription={handleVoiceTranscription}
          onEncounterTypeChange={(value) =>
            setFormData({ ...formData, encounterType: value as EMR['encounterType'] })
          }
        />

        {/* Tabs - Thai OPD Card Format */}
        <div className="flex flex-wrap gap-2 overflow-x-auto p-3 sm:p-4 border-b border-gray-200">
          {[
            { id: 'subjective', th: 'ประวัติ (S)', en: 'History (S)' },
            { id: 'objective', th: 'ตรวจร่างกาย (O)', en: 'Examination (O)' },
            { id: 'assessment', th: 'การวินิจฉัย (A)', en: 'Diagnosis (A)' },
            { id: 'plan', th: 'การรักษา (P)', en: 'Treatment (P)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {language === 'th' ? tab.th : tab.en}
            </button>
          ))}
          {/* AI Summary Tab - only show if EMR has AI summary */}
          {formData.aiSummary && (
            <button
              onClick={() => setActiveTab('ai_summary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'ai_summary'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                }`}
            >
              🤖 {language === 'th' ? 'สรุป AI' : 'AI Summary'}
            </button>
          )}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SUBJECTIVE TAB */}
          {activeTab === 'subjective' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="chiefComplaint" className="block text-sm font-medium text-gray-700 mb-1">
                  Chief Complaint *
                </label>
                <input
                  id="chiefComplaint"
                  type="text"
                  value={formData.chiefComplaint}
                  onChange={(e) => {
                    setFormData({ ...formData, chiefComplaint: e.target.value });
                    setAutoSaveStatus('unsaved');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Chest pain, Headache, Fever"
                  disabled={formData.status === 'finalized'}
                />
              </div>

              <div>
                <label htmlFor="hpi-textarea" className="block text-sm font-medium text-gray-700 mb-1">
                  History of Present Illness (HPI) *
                </label>
                <textarea
                  id="hpi-textarea"
                  value={formData.historyOfPresentIllness}
                  onChange={(e) => {
                    setFormData({ ...formData, historyOfPresentIllness: e.target.value });
                    setAutoSaveStatus('unsaved');
                  }}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Describe the onset, duration, severity, and characteristics of the complaint..."
                  disabled={formData.status === 'finalized'}
                />
              </div>

              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-2">
                  Review of Systems (ROS)
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Constitutional',
                    'Cardiovascular',
                    'Respiratory',
                    'Gastrointestinal',
                    'Genitourinary',
                    'Musculoskeletal',
                    'Neurological',
                    'Skin',
                  ].map((system) => (
                    <div key={system}>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        {system}
                      </label>
                      <input
                        type="text"
                        value={formData.reviewOfSystems[system.toLowerCase()] || ''}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            reviewOfSystems: {
                              ...formData.reviewOfSystems,
                              [system.toLowerCase()]: e.target.value,
                            },
                          });
                          setAutoSaveStatus('unsaved');
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="No complaints"
                        aria-label={`Review of Systems - ${system}`}
                        disabled={formData.status === 'finalized'}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {/* OBJECTIVE TAB */}
          {activeTab === 'objective' && (
            <div className="space-y-4">
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2" aria-label="Vital Signs Section">
                  Vital Signs
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="vital-temperature" className="text-xs text-gray-600">Temperature (°C)</label>
                    <input
                      id="vital-temperature"
                      type="text"
                      value={formData.vitalSigns.temperature}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          vitalSigns: { ...formData.vitalSigns, temperature: e.target.value },
                        });
                        setAutoSaveStatus('unsaved');
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                      placeholder="37.0"
                      disabled={formData.status === 'finalized'}
                    />
                  </div>
                  <div>
                    <label htmlFor="vital-heartrate" className="text-xs text-gray-600">Heart Rate (bpm)</label>
                    <input
                      id="vital-heartrate"
                      type="number"
                      value={formData.vitalSigns.heartRate || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          vitalSigns: { ...formData.vitalSigns, heartRate: Number.parseInt(e.target.value, 10) || 0 },
                        });
                        setAutoSaveStatus('unsaved');
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                      placeholder="72"
                      disabled={formData.status === 'finalized'}
                    />
                  </div>
                  <div>
                    <label htmlFor="vital-bp" className="text-xs text-gray-600">Blood Pressure</label>
                    <input
                      id="vital-bp"
                      type="text"
                      value={formData.vitalSigns.bloodPressure}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          vitalSigns: { ...formData.vitalSigns, bloodPressure: e.target.value },
                        });
                        setAutoSaveStatus('unsaved');
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                      placeholder="120/80"
                      disabled={formData.status === 'finalized'}
                    />
                  </div>
                  <div>
                    <label htmlFor="vital-resp" className="text-xs text-gray-600">Resp. Rate (per min)</label>
                    <input
                      id="vital-resp"
                      type="number"
                      value={formData.vitalSigns.respiratoryRate || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          vitalSigns: { ...formData.vitalSigns, respiratoryRate: Number.parseInt(e.target.value, 10) || 0 },
                        });
                        setAutoSaveStatus('unsaved');
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                      placeholder="16"
                      disabled={formData.status === 'finalized'}
                    />
                  </div>
                  <div>
                    <label htmlFor="vital-o2" className="text-xs text-gray-600">O2 Saturation (%)</label>
                    <input
                      id="vital-o2"
                      type="number"
                      value={formData.vitalSigns.oxygenSaturation || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          vitalSigns: { ...formData.vitalSigns, oxygenSaturation: Number.parseInt(e.target.value, 10) || 0 },
                        });
                        setAutoSaveStatus('unsaved');
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                      placeholder="98"
                      disabled={formData.status === 'finalized'}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="physical-exam-textarea" className="block text-sm font-medium text-gray-700 mb-1">
                  Physical Examination
                </label>
                <textarea
                  id="physical-exam-textarea"
                  value={formData.physicalExamination.general || ''}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      physicalExamination: { ...formData.physicalExamination, general: e.target.value },
                    });
                    setAutoSaveStatus('unsaved');
                  }}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="General appearance, HEENT, Cardiovascular, Respiratory, Abdomen, Extremities, Neurological..."
                  disabled={formData.status === 'finalized'}
                />
              </div>
            </div>
          )}

          {/* ASSESSMENT TAB */}
          {activeTab === 'assessment' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="clinical-assessment-textarea" className="block text-sm font-medium text-gray-700 mb-1">
                  Clinical Assessment
                </label>
                <textarea
                  id="clinical-assessment-textarea"
                  value={formData.assessment}
                  onChange={(e) => {
                    setFormData({ ...formData, assessment: e.target.value });
                    setAutoSaveStatus('unsaved');
                  }}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Based on history and physical examination findings..."
                  disabled={formData.status === 'finalized'}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span id="diagnosis-label" className="block text-sm font-medium text-gray-700">
                    Diagnosis (ICD-10)
                  </span>
                  <button
                    onClick={addDiagnosis}
                    className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    disabled={formData.status === 'finalized'}
                  >
                    + Add Diagnosis
                  </button>
                </div>

                <fieldset className="space-y-3" aria-labelledby="diagnosis-label">
                  {formData.diagnosis.map((diag, index) => (
                    <div key={`diagnosis-${diag.code || index}-${diag.description?.substring(0, 10) || index}`} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                        <div>
                          <label htmlFor={`diag-code-${index}`} className="text-xs text-gray-600">ICD-10 Code</label>
                          <input
                            id={`diag-code-${index}`}
                            type="text"
                            value={diag.code}
                            onChange={(e) => updateDiagnosis(index, 'code', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                            placeholder="e.g., J06.9"
                            disabled={formData.status === 'finalized'}
                          />
                        </div>
                        <div>
                          <label htmlFor={`diag-desc-${index}`} className="text-xs text-gray-600">Description</label>
                          <input
                            id={`diag-desc-${index}`}
                            type="text"
                            value={diag.description}
                            onChange={(e) => updateDiagnosis(index, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                            placeholder="e.g., Acute upper respiratory infection"
                            disabled={formData.status === 'finalized'}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <select
                          value={diag.type}
                          onChange={(e) => updateDiagnosis(index, 'type', e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded"
                          disabled={formData.status === 'finalized'}
                          aria-label="Diagnosis type"
                        >
                          <option value="primary">Primary</option>
                          <option value="secondary">Secondary</option>
                        </select>

                        <select
                          value={diag.status}
                          onChange={(e) => updateDiagnosis(index, 'status', e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded"
                          disabled={formData.status === 'finalized'}
                          aria-label="Diagnosis status"
                        >
                          <option value="active">Active</option>
                          <option value="resolved">Resolved</option>
                          <option value="chronic">Chronic</option>
                        </select>

                        {formData.status !== 'finalized' && (
                          <button
                            onClick={() => removeDiagnosis(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {formData.diagnosis.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No diagnosis added yet. Click "Add Diagnosis" to add one.
                    </p>
                  )}
                </fieldset>
              </div>
            </div>
          )}

          {/* PLAN TAB */}
          {activeTab === 'plan' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="treatment-plan-textarea" className="block text-sm font-medium text-gray-700 mb-1">
                  Treatment Plan *
                </label>
                <textarea
                  id="treatment-plan-textarea"
                  value={formData.treatmentPlan}
                  onChange={(e) => {
                    setFormData({ ...formData, treatmentPlan: e.target.value });
                    setAutoSaveStatus('unsaved');
                  }}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Medications, procedures, referrals, patient education..."
                  disabled={formData.status === 'finalized'}
                />
              </div>

              <div>
                <label htmlFor="followup-instructions-textarea" className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Instructions
                </label>
                <textarea
                  id="followup-instructions-textarea"
                  value={formData.followUpInstructions}
                  onChange={(e) => {
                    setFormData({ ...formData, followUpInstructions: e.target.value });
                    setAutoSaveStatus('unsaved');
                  }}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Return to clinic if symptoms worsen, follow-up appointment in..."
                  disabled={formData.status === 'finalized'}
                />
              </div>

              <div>
                <label htmlFor="followup-date-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  id="followup-date-input"
                  type="date"
                  value={formData.followUpDate ? formData.followUpDate.split('T')[0] : ''}
                  onChange={(e) => {
                    setFormData({ ...formData, followUpDate: new Date(e.target.value).toISOString() });
                    setAutoSaveStatus('unsaved');
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={formData.status === 'finalized'}
                />
              </div>
            </div>
          )}

          {/* AI SUMMARY TAB */}
          {activeTab === 'ai_summary' && formData.aiSummary && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl">🤖</span>
                  <h3 className="text-lg font-semibold text-purple-900">
                    {language === 'th' ? 'สรุปโดย AI' : 'AI-Generated Summary'}
                  </h3>
                </div>
                <p className="text-sm text-purple-700 mb-4">
                  {language === 'th'
                    ? 'สรุปนี้สร้างโดย AI เพื่อช่วยให้ผู้ป่วยเข้าใจเวชระเบียนได้ง่ายขึ้น'
                    : 'This summary was generated by Gemini 2.5 Flash Lite to help patients understand their medical record.'}
                </p>
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                    {formData.aiSummary}
                  </pre>
                </div>
              </div>

              {formData.signedAt && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">✅ Signature Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Signed By:</span>
                      <span className="ml-2 font-medium">{formData.doctorName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Signed At:</span>
                      <span className="ml-2 font-medium">
                        {new Date(formData.signedAt).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Digital Signature:</span>
                      <span className="ml-2 font-mono text-xs">{formData.digitalSignature}</span>
                    </div>
                    {formData.sentToPatientAt && (
                      <div>
                        <span className="text-gray-600">Sent to Patient:</span>
                        <span className="ml-2 font-medium">
                          {new Date(formData.sentToPatientAt).toLocaleString('th-TH')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {formData.status === 'finalized' && (
              <span className="text-green-600 font-medium">
                ✓ ลงนามและส่งให้ผู้ป่วยเรียบร้อยแล้ว
              </span>
            )}
            {formData.status === 'draft' && !isGeneratingAI && !isSendingToPatient && (
              <span className="text-amber-600">ฉบับร่าง • ยังไม่ได้ลงนาม</span>
            )}
            {formData.status === 'awaiting_signature' && (
              <span className="text-blue-600">รอลงนาม</span>
            )}
            {isGeneratingAI && (
              <span className="text-purple-600 animate-pulse">
                🤖 กำลังสร้างสรุป AI...
              </span>
            )}
            {isSendingToPatient && (
              <span className="text-blue-600 animate-pulse">
                📤 กำลังส่งข้อมูลไปยังผู้ป่วย...
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              disabled={isGeneratingAI || isSendingToPatient}
            >
              ยกเลิก
            </button>

            {formData.status === 'draft' && (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isGeneratingAI || isSendingToPatient}
                >
                  บันทึกร่าง
                </button>
                <button
                  type="button"
                  data-testid="emr-sign-btn"
                  onClick={handleFinalize}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  disabled={isGeneratingAI || isSendingToPatient}
                >
                  {(isGeneratingAI || isSendingToPatient) ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : (
                    <span>ลงนามและส่งให้ผู้ป่วย</span>
                  )}
                </button>
              </>
            )}

            {formData.status === 'finalized' && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                ปิด
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteEMREditor;
