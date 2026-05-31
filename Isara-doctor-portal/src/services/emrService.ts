/**
 * EMR Service - Electronic Medical Record Management
 *
 * Uses GCS bucket: izara-patients-data
 * - emr/{patientId}.json - Patient EMR index
 * - emr/{patientId}/{emrId}.json - Individual EMR records
 *
 * Features:
 * - EMR creation with clinical templates
 * - Auto-save with version control
 * - Digital signatures
 * - PDF export
 * - Vital signs auto-population
 */

import { EMR, ClinicalTemplate, VitalSigns } from '../types';
import config from './config';
import {
  fetchPatientEMRs,
  savePatientEMR,
  fetchPatientVitals,
  GCSWriteResult,
} from './gcsDataService';

// ============================================================================
// EMR SERVICE CLASS
// ============================================================================

class EMRService {
  private static instance: EMRService;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private readonly autoSaveDelay = config.features.emrAutoSaveInterval; // From config

  private constructor() { }

  static getInstance(): EMRService {
    if (!EMRService.instance) {
      EMRService.instance = new EMRService();
    }
    return EMRService.instance;
  }

  // ===========================================================================
  // CLINICAL TEMPLATES
  // ===========================================================================

  /**
   * Get available clinical templates
   */
  getClinicalTemplates(): ClinicalTemplate[] {
    return [
      {
        id: 'soap',
        name: 'SOAP Note',
        type: 'soap',
        content: {
          sections: [
            { id: '1', title: 'Subjective', content: '', order: 1, required: true },
            { id: '2', title: 'Objective', content: '', order: 2, required: true },
            { id: '3', title: 'Assessment', content: '', order: 3, required: true },
            { id: '4', title: 'Plan', content: '', order: 4, required: true },
          ],
        },
        createdBy: 'system',
        isDefault: true,
      },
      {
        id: 'sbar',
        name: 'SBAR Note',
        type: 'sbar',
        content: {
          sections: [
            { id: '1', title: 'Situation', content: '', order: 1, required: true },
            { id: '2', title: 'Background', content: '', order: 2, required: true },
            { id: '3', title: 'Assessment', content: '', order: 3, required: true },
            { id: '4', title: 'Recommendation', content: '', order: 4, required: true },
          ],
        },
        createdBy: 'system',
        isDefault: true,
      },
      {
        id: 'admission',
        name: 'Admission Note',
        type: 'admission',
        content: {
          sections: [
            { id: '1', title: 'Chief Complaint', content: '', order: 1, required: true },
            { id: '2', title: 'History of Present Illness', content: '', order: 2, required: true },
            { id: '3', title: 'Past Medical History', content: '', order: 3, required: false },
            { id: '4', title: 'Medications', content: '', order: 4, required: false },
            { id: '5', title: 'Allergies', content: '', order: 5, required: true },
            { id: '6', title: 'Social History', content: '', order: 6, required: false },
            { id: '7', title: 'Family History', content: '', order: 7, required: false },
            { id: '8', title: 'Review of Systems', content: '', order: 8, required: true },
            { id: '9', title: 'Physical Examination', content: '', order: 9, required: true },
            { id: '10', title: 'Assessment and Plan', content: '', order: 10, required: true },
          ],
        },
        createdBy: 'system',
        isDefault: true,
      },
      {
        id: 'discharge',
        name: 'Discharge Summary',
        type: 'discharge',
        content: {
          sections: [
            { id: '1', title: 'Admission Date', content: '', order: 1, required: true },
            { id: '2', title: 'Discharge Date', content: '', order: 2, required: true },
            { id: '3', title: 'Principal Diagnosis', content: '', order: 3, required: true },
            { id: '4', title: 'Secondary Diagnoses', content: '', order: 4, required: false },
            { id: '5', title: 'Hospital Course', content: '', order: 5, required: true },
            { id: '6', title: 'Discharge Medications', content: '', order: 6, required: true },
            { id: '7', title: 'Follow-up Instructions', content: '', order: 7, required: true },
            { id: '8', title: 'Discharge Condition', content: '', order: 8, required: true },
          ],
        },
        createdBy: 'system',
        isDefault: true,
      },
      {
        id: 'progress',
        name: 'Progress Note',
        type: 'progress',
        content: {
          sections: [
            { id: '1', title: 'Interval History', content: '', order: 1, required: true },
            { id: '2', title: 'Current Status', content: '', order: 2, required: true },
            { id: '3', title: 'Assessment', content: '', order: 3, required: true },
            { id: '4', title: 'Plan', content: '', order: 4, required: true },
          ],
        },
        createdBy: 'system',
        isDefault: true,
      },
    ];
  }

  // ===========================================================================
  // CREATE EMR
  // ===========================================================================

  /**
   * Create a new EMR
   */
  createNewEMR(patientId: string, doctorId: string, doctorName: string): EMR {
    const emrId = `emr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    return {
      id: emrId,
      patientId,
      doctorId,
      doctorName,
      encounterDate: new Date(),
      encounterType: 'consultation',
      chiefComplaint: '',
      historyOfPresentIllness: '',
      reviewOfSystems: {},
      physicalExamination: {
        generalAppearance: '',
        vitalSigns: {
          measuredAt: new Date(),
        },
      },
      vitalSigns: {
        measuredAt: new Date(),
      },
      assessment: '',
      diagnosis: [],
      treatmentPlan: '',
      prescriptions: [],
      investigations: [],
      followUpInstructions: '',
      createdAt: new Date(),
      lastModified: new Date(),
      status: 'draft',
      version: 1,
      previousVersions: [],
    };
  }

  // ===========================================================================
  // SAVE EMR (GCS)
  // ===========================================================================

  /**
   * Save EMR to GCS
   */
  async saveEMR(emr: EMR): Promise<GCSWriteResult> {
    console.log(`💾 Saving EMR to GCS: ${emr.id}`);

    // Update last modified
    emr.lastModified = new Date();

    const result = await savePatientEMR(emr.patientId, emr.id, emr);

    if (result.success) {
      console.log(`✅ EMR saved to GCS: ${emr.id}`);
    } else {
      console.error(`❌ Failed to save EMR: ${result.error}`);
    }

    return result;
  }

  // ===========================================================================
  // AUTO-SAVE
  // ===========================================================================

  /**
   * Start auto-save for an EMR
   */
  startAutoSave(emr: EMR, callback?: () => void): void {
    if (this.autoSaveInterval) {
      this.stopAutoSave();
    }

    console.log(`🔄 Starting auto-save for EMR: ${emr.id}`);

    this.autoSaveInterval = globalThis.setInterval(async () => {
      try {
        const result = await this.saveEMR(emr);
        if (result.success) {
          console.log('🔄 Auto-saved EMR');
          if (callback) callback();
        }
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, this.autoSaveDelay);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('⏹️ Auto-save stopped');
    }
  }

  // ===========================================================================
  // RETRIEVE EMR
  // ===========================================================================

  /**
   * Get EMRs for a patient
   */
  async getEMRByPatient(patientId: string): Promise<EMR[]> {
    console.log(`📋 Fetching EMRs for patient: ${patientId}`);
    const emrs = await fetchPatientEMRs(patientId);
    console.log(`✅ Found ${emrs.length} EMRs`);
    return emrs as EMR[];
  }

  /**
   * Get EMR by ID
   */
  async getEMRById(patientId: string, emrId: string): Promise<EMR | null> {
    const emrs = await this.getEMRByPatient(patientId);
    return emrs.find(e => e.id === emrId) || null;
  }

  // ===========================================================================
  // FINALIZE EMR
  // ===========================================================================

  /**
   * Finalize an EMR (lock it from further editing)
   */
  async finalizeEMR(emr: EMR, digitalSignature?: string): Promise<GCSWriteResult> {
    console.log(`✅ Finalizing EMR: ${emr.id}`);

    emr.status = 'finalized';
    emr.digitalSignature = digitalSignature || `Dr. ${emr.doctorName} - ${new Date().toISOString()}`;
    emr.lastModified = new Date();

    return this.saveEMR(emr);
  }

  // ===========================================================================
  // AMEND EMR
  // ===========================================================================

  /**
   * Create an amendment to a finalized EMR
   */
  async amendEMR(emr: EMR): Promise<{ emr: EMR; result: GCSWriteResult }> {
    console.log(`📝 Creating amendment for EMR: ${emr.id}`);

    // Store previous version
    const previousVersion = JSON.stringify(emr);

    const amendedEMR: EMR = {
      ...emr,
      id: `${emr.id}_v${emr.version + 1}`,
      version: emr.version + 1,
      previousVersions: [...(emr.previousVersions || []), previousVersion],
      status: 'amended',
      lastModified: new Date(),
      digitalSignature: undefined, // Needs new signature
    };

    const result = await this.saveEMR(amendedEMR);

    console.log(`✅ EMR amended, new version: ${amendedEMR.version}`);

    return { emr: amendedEMR, result };
  }

  /**
   * Restore a previous version
   */
  restorePreviousVersion(emr: EMR, versionIndex: number): EMR | null {
    if (!emr.previousVersions || versionIndex >= emr.previousVersions.length) {
      console.error('❌ Version not found');
      return null;
    }

    try {
      const previousEMR: EMR = JSON.parse(emr.previousVersions[versionIndex]);
      console.log(`🔄 Restored version ${versionIndex + 1}`);
      return previousEMR;
    } catch (error) {
      console.error('❌ Failed to restore version:', error);
      return null;
    }
  }

  // ===========================================================================
  // VITAL SIGNS AUTO-POPULATE
  // ===========================================================================

  /**
   * Auto-populate vital signs from patient's latest PHR data
   */
  async autoPopulateVitalSigns(emr: EMR, patientId: string): Promise<VitalSigns | null> {
    console.log(`💓 Auto-populating vital signs for patient: ${patientId}`);

    const vitals = await fetchPatientVitals(patientId);

    if (!vitals) {
      console.warn('⚠️ No vital signs found for patient');
      return null;
    }

    // Auto-populate
    emr.vitalSigns = vitals;
    emr.physicalExamination.vitalSigns = vitals;

    console.log('✅ Vital signs auto-populated');
    return vitals;
  }

  // ===========================================================================
  // EXPORT EMR
  // ===========================================================================

  /**
   * Export EMR to PDF
   */
  exportEMRToPDF(emr: EMR): void {
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
      console.error('❌ Failed to open print window');
      return;
    }

    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>EMR - ${emr.patientId}</title>
        <style>
          body {
            font-family: 'Sarabun', Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
          }
          h1 { color: #059669; margin-bottom: 10px; }
          h2 { color: #0d9488; margin-top: 20px; border-bottom: 1px solid #0d9488; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 20px; }
          .section { margin: 20px 0; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #1f2937; }
          .diagnosis { background: #f0fdf4; padding: 10px; border-radius: 5px; margin: 5px 0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .signature { margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Electronic Medical Record</h1>
          <p>Izara Telemedicine Platform</p>
        </div>

        <div class="section">
          <table>
            <tr>
              <th>Patient ID</th><td>${emr.patientId}</td>
              <th>EMR ID</th><td>${emr.id}</td>
            </tr>
            <tr>
              <th>Doctor</th><td>${emr.doctorName}</td>
              <th>Date</th><td>${formatDate(emr.encounterDate)}</td>
            </tr>
            <tr>
              <th>Encounter Type</th><td>${emr.encounterType}</td>
              <th>Status</th><td>${emr.status.toUpperCase()}</td>
            </tr>
          </table>
        </div>

        <h2>Chief Complaint</h2>
        <div class="section">
          <p class="value">${emr.chiefComplaint || 'N/A'}</p>
        </div>

        <h2>History of Present Illness</h2>
        <div class="section">
          <p class="value">${emr.historyOfPresentIllness || 'N/A'}</p>
        </div>

        ${emr.vitalSigns ? `
        <h2>Vital Signs</h2>
        <div class="section">
          <table>
            <tr>
              <th>Blood Pressure</th>
              <td>${this.formatBloodPressure(emr.vitalSigns.bloodPressure)}</td>
              <th>Heart Rate</th>
              <td>${this.formatVitalValue(emr.vitalSigns.heartRate, 'bpm')}</td>
            </tr>
            <tr>
              <th>Temperature</th>
              <td>${this.formatVitalValue(emr.vitalSigns.temperature, '°C')}</td>
              <th>SpO2</th>
              <td>${this.formatVitalValue(emr.vitalSigns.oxygenSaturation, '%')}</td>
            </tr>
          </table>
        </div>
        ` : ''}

        <h2>Assessment</h2>
        <div class="section">
          <p class="value">${emr.assessment || 'N/A'}</p>
        </div>

        <h2>Diagnosis</h2>
        <div class="section">
          ${emr.diagnosis.length > 0 ? emr.diagnosis.map(d => `
            <div class="diagnosis">
              <span class="label">${d.code}</span>: ${d.description}
              <span style="color: ${d.type === 'primary' ? '#059669' : '#6b7280'}">
                (${d.type})
              </span>
            </div>
          `).join('') : '<p>No diagnosis recorded</p>'}
        </div>

        <h2>Treatment Plan</h2>
        <div class="section">
          <p class="value">${emr.treatmentPlan || 'N/A'}</p>
        </div>

        ${emr.prescriptions.length > 0 ? `
        <h2>Prescriptions</h2>
        <div class="section">
          <table>
            <tr>
              <th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th>
            </tr>
            ${emr.prescriptions.map(p => `
              <tr>
                <td>${p.medication}</td>
                <td>${p.dosage}</td>
                <td>${p.frequency}</td>
                <td>${p.duration}</td>
              </tr>
            `).join('')}
          </table>
        </div>
        ` : ''}

        <h2>Follow-up Instructions</h2>
        <div class="section">
          <p class="value">${emr.followUpInstructions || 'N/A'}</p>
        </div>

        <div class="footer">
          <div class="signature">
            <p><span class="label">Digital Signature:</span> ${emr.digitalSignature || 'Unsigned'}</p>
            <p><span class="label">Version:</span> ${emr.version}</p>
            <p><span class="label">Last Modified:</span> ${formatDate(emr.lastModified)}</p>
          </div>
        </div>

        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="globalThis.print()" style="padding: 10px 20px; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    printWindow.location.href = url;
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      URL.revokeObjectURL(url);
    };
  }

  /**
   * Format blood pressure for display
   */
  private formatBloodPressure(bp: { systolic: number; diastolic: number } | undefined): string {
    return bp ? `${bp.systolic}/${bp.diastolic} mmHg` : 'N/A';
  }

  /**
   * Format vital sign value with unit
   */
  private formatVitalValue(vital: { value: number } | undefined, unit: string): string {
    return vital ? `${vital.value}${unit}` : 'N/A';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const emrService = EMRService.getInstance();
export default emrService;
