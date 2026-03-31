/**
 * Mock Data Service - GCS Only
 * Centralized service for loading data from Google Cloud Storage buckets
 * All data is stored in and retrieved from GCS - NO local storage fallback
 *
 * Data source mapping:
 * - doctors.json, queue.json → izara-doctors-data bucket
 * - patients.json, emrs.json, prescriptions.json, etc. → izara-patients-data bucket
 * - medications.json, lab-tests.json, icd10-codes.json → izara-meta-data bucket
 * - appointments.json → izara-appointments bucket
 */

import {
  fetchAllDoctors,
  fetchAllPatients,
  fetchAllEMRs,
  fetchAllPrescriptions,
  fetchAllLabOrders,
  fetchAllImagingOrders,
  fetchAllAppointments,
  fetchPatientQueue,
  fetchMedications,
  fetchLabTests,
  fetchICD10Codes,
  saveAllEMRs,
  saveAllPrescriptions,
  saveAllLabOrders,
  saveAllImagingOrders,
  saveDoctors,
  saveAllPatients,
  savePatientQueue,
  clearCache as clearGcsCache,
} from './gcsDataService';

// Cache for transformed data (e.g., date parsing)
const dataCache: Record<string, any> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps: Record<string, number> = {};

function isCacheValid(key: string): boolean {
  const timestamp = cacheTimestamps[key];
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Load data from GCS bucket
 * @deprecated Use specific fetch functions from gcsDataService instead
 */
async function loadMockData<T>(fileName: string): Promise<T[]> {
  // Check cache first
  if (dataCache[fileName] && isCacheValid(fileName)) {
    console.log(`📦 Cache hit: ${fileName}`);
    return dataCache[fileName];
  }

  console.log(`🌐 Loading from GCS: ${fileName}`);

  try {
    let data: T[] = [];

    // Route to appropriate GCS bucket based on file name
    switch (fileName) {
      case 'doctors.json':
        data = await fetchAllDoctors() as T[];
        break;
      case 'patients.json':
        data = await fetchAllPatients() as T[];
        break;
      case 'emrs.json':
        data = await fetchAllEMRs() as T[];
        break;
      case 'prescriptions.json':
        data = await fetchAllPrescriptions() as T[];
        break;
      case 'lab-orders.json':
        data = await fetchAllLabOrders() as T[];
        break;
      case 'imaging-orders.json':
        data = await fetchAllImagingOrders() as T[];
        break;
      case 'appointments.json':
        data = await fetchAllAppointments() as T[];
        break;
      case 'queue.json':
        data = await fetchPatientQueue() as T[];
        break;
      case 'medications.json':
        data = await fetchMedications() as T[];
        break;
      case 'lab-tests.json':
        data = await fetchLabTests() as T[];
        break;
      case 'icd10-codes.json':
        data = await fetchICD10Codes() as T[];
        break;
      default:
        console.warn(`⚠️ Unknown file: ${fileName}, returning empty array`);
        return [];
    }

    // Cache the data
    dataCache[fileName] = data;
    cacheTimestamps[fileName] = Date.now();

    console.log(`✅ Loaded ${data.length} records from GCS: ${fileName}`);
    return data;
  } catch (error) {
    console.error(`❌ Error loading ${fileName} from GCS:`, error);
    return [];
  }
}

/**
 * Clear all caches (both local and GCS)
 */
export function clearMockDataCache() {
  Object.keys(dataCache).forEach(key => delete dataCache[key]);
  Object.keys(cacheTimestamps).forEach(key => delete cacheTimestamps[key]);
  clearGcsCache(); // Also clear GCS cache
  console.log('🗑️ All caches cleared');
}

/**
 * Save data to GCS
 * Routes to appropriate bucket based on file name
 */
export async function saveMockData<T>(fileName: string, data: T[]): Promise<boolean> {
  console.log(`💾 Saving ${fileName} to GCS (${data.length} records)...`);

  try {
    switch (fileName) {
      case 'doctors.json':
        await saveDoctors(data as any[]);
        break;
      case 'patients.json':
        await saveAllPatients(data as any[]);
        break;
      case 'emrs.json':
        await saveAllEMRs(data as any[]);
        break;
      case 'prescriptions.json':
        await saveAllPrescriptions(data as any[]);
        break;
      case 'lab-orders.json':
        await saveAllLabOrders(data as any[]);
        break;
      case 'imaging-orders.json':
        await saveAllImagingOrders(data as any[]);
        break;
      case 'queue.json':
        await savePatientQueue(data as any[]);
        break;
      default:
        console.warn(`⚠️ Unknown file for save: ${fileName}`);
        return false;
    }

    // Update local cache
    dataCache[fileName] = data;
    cacheTimestamps[fileName] = Date.now();

    console.log(`✅ Saved ${fileName} to GCS (${data.length} records)`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${fileName} to GCS:`, error);
    return false;
  }
}

/**
 * Add a single record and save to GCS
 */
export async function addMockDataRecord<T extends { id: string }>(fileName: string, record: T): Promise<boolean> {
  const currentData = await loadMockData<T>(fileName);
  currentData.push(record);
  console.log(`➕ Adding record to ${fileName}: ${record.id}`);
  return saveMockData(fileName, currentData);
}

/**
 * Update a single record and save to GCS
 */
export async function updateMockDataRecord<T extends { id: string }>(
  fileName: string,
  recordId: string,
  updates: Partial<T>
): Promise<boolean> {
  const currentData = await loadMockData<T>(fileName);
  const index = currentData.findIndex((r: any) => r.id === recordId);

  if (index === -1) {
    console.warn(`⚠️ Record ${recordId} not found in ${fileName}`);
    return false;
  }

  currentData[index] = { ...currentData[index], ...updates };
  console.log(`📝 Updating record in ${fileName}: ${recordId}`);
  return saveMockData(fileName, currentData);
}

/**
 * Delete a record and save to GCS
 */
export async function deleteMockDataRecord(fileName: string, recordId: string): Promise<boolean> {
  const currentData = await loadMockData<any>(fileName);
  const filteredData = currentData.filter((r: any) => r.id !== recordId);

  if (filteredData.length === currentData.length) {
    console.warn(`⚠️ Record ${recordId} not found in ${fileName}`);
    return false;
  }

  console.log(`🗑️ Deleting record from ${fileName}: ${recordId}`);
  return saveMockData(fileName, filteredData);
}

// ============================================================================
// SPECIFIC DATA LOADERS
// ============================================================================

export async function getDoctors() {
  return loadMockData('doctors.json');
}

export async function getPatients() {
  return loadMockData('patients.json');
}

export async function getAppointments() {
  return loadMockData('appointments.json');
}

export async function getEMRs() {
  return loadMockData('emrs.json');
}

export async function getPrescriptions() {
  return loadMockData('prescriptions.json');
}

export async function getLabOrders() {
  return loadMockData('lab-orders.json');
}

export async function getImagingOrders() {
  return loadMockData('imaging-orders.json');
}

export async function getQueue() {
  return loadMockData('queue.json');
}

export async function getMedications() {
  return loadMockData('medications.json');
}

export async function getLabTests() {
  return loadMockData('lab-tests.json');
}

// ============================================================================
// FILTERED QUERIES
// ============================================================================

export async function getPatientEMRs(patientId: string) {
  const emrs = await getEMRs();
  return emrs.filter((emr: any) => emr.patientId === patientId);
}

export async function getDoctorAppointments(doctorId: string, startDate?: Date, endDate?: Date) {
  const appointments = await getAppointments();
  let filtered = appointments.filter((apt: any) => apt.doctorId === doctorId);

  if (startDate) {
    filtered = filtered.filter((apt: any) => new Date(apt.dateTime) >= startDate);
  }

  if (endDate) {
    filtered = filtered.filter((apt: any) => new Date(apt.dateTime) <= endDate);
  }

  return filtered;
}

export async function getTodayAppointments(doctorId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getDoctorAppointments(doctorId, today, tomorrow);
}

export async function getPatientPrescriptions(patientId: string) {
  const prescriptions = await getPrescriptions();
  return prescriptions.filter((rx: any) => rx.patientId === patientId);
}

export async function getPatientLabOrders(patientId: string) {
  const labOrders = await getLabOrders();
  return labOrders.filter((lab: any) => lab.patientId === patientId);
}

export async function getPatientImagingOrders(patientId: string) {
  const imagingOrders = await getImagingOrders();
  return imagingOrders.filter((img: any) => img.patientId === patientId);
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

export async function searchPatients(query: string) {
  const patients = await getPatients();
  const lowerQuery = query.toLowerCase();

  return patients.filter((patient: any) => {
    return (
      patient.demographics.name.toLowerCase().includes(lowerQuery) ||
      patient.demographics.idNumber.includes(lowerQuery) ||
      patient.contact.email.toLowerCase().includes(lowerQuery) ||
      patient.contact.phone.includes(lowerQuery)
    );
  });
}

export async function searchMedications(query: string) {
  const medications = await getMedications();
  const lowerQuery = query.toLowerCase();

  return medications.filter((med: any) => {
    return (
      med.name.toLowerCase().includes(lowerQuery) ||
      med.generic.toLowerCase().includes(lowerQuery)
    );
  });
}

export default {
  loadMockData,
  clearMockDataCache,
  saveMockData,
  addMockDataRecord,
  updateMockDataRecord,
  deleteMockDataRecord,
  getDoctors,
  getPatients,
  getAppointments,
  getEMRs,
  getPrescriptions,
  getLabOrders,
  getImagingOrders,
  getQueue,
  getMedications,
  getLabTests,
  getPatientEMRs,
  getDoctorAppointments,
  getTodayAppointments,
  getPatientPrescriptions,
  getPatientLabOrders,
  getPatientImagingOrders,
  searchPatients,
  searchMedications,
};
