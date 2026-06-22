/**
 * Storage Services - GCS Only
 * All data is stored in and retrieved from Google Cloud Storage
 * NO localStorage fallback - data must persist in GCS
 */

import { ChatSession, StorageFile, StorageUploadOptions, Appointment, HealthRecord, Herb, Doctor } from '../types';
import * as authService from './authServices';
import config from './config';
import {
  fetchAllDoctors,
  fetchAllAppointments,
  saveAllAppointments,
  fetchFromGCS,
  writeToGCS,
} from './gcsDataService';

// API base URL (proxied through Vite to GCS API server)
const API_BASE_URL = '';

// GCS Buckets from configuration
const BUCKETS = {
  doctor: config.gcs.doctorBucket,
  patient: config.gcs.patientBucket,
  appointments: config.gcs.appointmentsBucket,
  metadata: config.gcs.metadataBucket,
};

// ============================================================================
// USER FOLDER MANAGEMENT
// ============================================================================
export class UserFolderService {
  private static instance: UserFolderService;

  private constructor() { }

  static getInstance(): UserFolderService {
    if (!UserFolderService.instance) {
      UserFolderService.instance = new UserFolderService();
    }
    return UserFolderService.instance;
  }

  /**
   * Get user-specific folder path
   */
  getUserFolder(userId: string, subfolder?: string): string {
    const basePath = `users/${userId}`;
    return subfolder ? `${basePath}/${subfolder}` : basePath;
  }

  /**
   * Get folder structure for different data types
   */
  getFolders(userId: string) {
    return {
      // Recordings bucket
      recordings: this.getUserFolder(userId, 'consultations/recordings'),
      transcriptions: this.getUserFolder(userId, 'consultations/transcriptions'),
      analytics: this.getUserFolder(userId, 'consultations/analytics'),

      // Medical bucket
      medicalImages: this.getUserFolder(userId, 'images'),
      reports: this.getUserFolder(userId, 'reports'),

      // Prescriptions bucket
      prescriptions: this.getUserFolder(userId, 'prescriptions'),

      // Lab bucket
      labResults: this.getUserFolder(userId, 'lab-results'),

      // Uploads bucket
      documents: this.getUserFolder(userId, 'documents'),
      appointments: this.getUserFolder(userId, 'appointments'),
      chats: this.getUserFolder(userId, 'chats'),
    };
  }
}

// ============================================================================
// RECORDING STORAGE SERVICE
// ============================================================================
export class RecordingStorageService {
  private static instance: RecordingStorageService;
  private readonly BUCKET_NAME = BUCKETS.doctor; // Store doctor's recordings in doctor bucket

  private constructor() { }

  static getInstance(): RecordingStorageService {
    if (!RecordingStorageService.instance) {
      RecordingStorageService.instance = new RecordingStorageService();
    }
    return RecordingStorageService.instance;
  }

  /**
   * Upload consultation video recording
   */
  async uploadRecording(
    file: File,
    appointmentId: string,
    userId: string,
    metadata?: any
  ): Promise<StorageFile> {
    if (!this.BUCKET_NAME) {
      throw new Error('Recordings bucket not configured');
    }

    const userFolderService = UserFolderService.getInstance();
    const folder = userFolderService.getFolders(userId).recordings;

    const timestamp = Date.now();
    const filename = `recording_${appointmentId}_${timestamp}.webm`;

    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('bucket', this.BUCKET_NAME);
    formData.append('folder', folder);
    formData.append('makePublic', 'false');
    formData.append('metadata', JSON.stringify({
      appointmentId,
      userId,
      recordingType: 'video',
      uploadedAt: new Date().toISOString(),
      ...metadata
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Recording uploaded successfully:', data.url);

      return {
        name: data.name,
        url: data.url,
        bucket: data.bucket,
        contentType: data.contentType,
        size: data.size,
        uploadedAt: new Date(data.uploadedAt),
        metadata: data.metadata
      };
    } catch (error: any) {
      console.error('❌ Recording upload error:', error);
      // NO localStorage fallback - throw error to inform caller
      throw new Error(`Recording upload failed: ${error.message}. Ensure the GCS API server is running.`);
    }
  }

  /**
   * Upload transcription file
   */
  async uploadTranscription(
    transcriptionData: any,
    appointmentId: string,
    userId: string
  ): Promise<StorageFile> {
    if (!this.BUCKET_NAME) {
      throw new Error('Recordings bucket not configured');
    }

    const userFolderService = UserFolderService.getInstance();
    const folder = userFolderService.getFolders(userId).transcriptions;

    const timestamp = Date.now();
    const filename = `transcription_${appointmentId}_${timestamp}.json`;

    const jsonData = JSON.stringify(transcriptionData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', this.BUCKET_NAME);
    formData.append('folder', folder);
    formData.append('makePublic', 'false');
    formData.append('metadata', JSON.stringify({
      appointmentId,
      userId,
      dataType: 'transcription',
      uploadedAt: new Date().toISOString()
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Transcription uploaded successfully');

      return {
        name: data.name,
        url: data.url,
        bucket: data.bucket,
        contentType: data.contentType,
        size: data.size,
        uploadedAt: new Date(data.uploadedAt),
      };
    } catch (error) {
      console.error('❌ Transcription upload error:', error);
      throw error;
    }
  }

  /**
   * Upload analytics/report data
   */
  async uploadAnalytics(
    analyticsData: any,
    appointmentId: string,
    userId: string
  ): Promise<StorageFile> {
    if (!this.BUCKET_NAME) {
      throw new Error('Recordings bucket not configured');
    }

    const userFolderService = UserFolderService.getInstance();
    const folder = userFolderService.getFolders(userId).analytics;

    const timestamp = Date.now();
    const filename = `analytics_${appointmentId}_${timestamp}.json`;

    const jsonData = JSON.stringify(analyticsData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', this.BUCKET_NAME);
    formData.append('folder', folder);
    formData.append('makePublic', 'false');
    formData.append('metadata', JSON.stringify({
      appointmentId,
      userId,
      dataType: 'analytics',
      uploadedAt: new Date().toISOString()
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Analytics uploaded successfully');

      return {
        name: data.name,
        url: data.url,
        bucket: data.bucket,
        contentType: data.contentType,
        size: data.size,
        uploadedAt: new Date(data.uploadedAt),
      };
    } catch (error) {
      console.error('❌ Analytics upload error:', error);
      throw error;
    }
  }

  /**
   * Get all recordings for a user
   */
  async getUserRecordings(userId: string): Promise<StorageFile[]> {
    if (!this.BUCKET_NAME) return [];

    const userFolderService = UserFolderService.getInstance();
    const folder = userFolderService.getFolders(userId).recordings;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/storage/list?folder=${folder}&bucket=${this.BUCKET_NAME}`,
        {
          headers: authService.getAuthHeaders(),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error listing recordings:', error);
      return [];
    }
  }

  /**
   * Get transcriptions for a user
   */
  async getUserTranscriptions(userId: string): Promise<StorageFile[]> {
    if (!this.BUCKET_NAME) return [];

    const userFolderService = UserFolderService.getInstance();
    const folder = userFolderService.getFolders(userId).transcriptions;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/storage/list?folder=${folder}&bucket=${this.BUCKET_NAME}`,
        {
          headers: authService.getAuthHeaders(),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error listing transcriptions:', error);
      return [];
    }
  }

  /**
   * Get analytics for a user
   */
  async getUserAnalytics(userId: string): Promise<StorageFile[]> {
    if (!this.BUCKET_NAME) return [];

    const userFolderService = UserFolderService.getInstance();
    const folder = userFolderService.getFolders(userId).analytics;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/storage/list?folder=${folder}&bucket=${this.BUCKET_NAME}`,
        {
          headers: authService.getAuthHeaders(),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error listing analytics:', error);
      return [];
    }
  }

  /**
   * Get recording by appointment ID
   */
  async getRecordingByAppointment(appointmentId: string, userId: string): Promise<StorageFile | null> {
    const recordings = await this.getUserRecordings(userId);
    return recordings.find(r => r.metadata?.appointmentId === appointmentId) || null;
  }

  /**
   * Get transcription by appointment ID
   */
  async getTranscriptionByAppointment(appointmentId: string, userId: string): Promise<any> {
    const transcriptions = await this.getUserTranscriptions(userId);
    const transcriptionFile = transcriptions.find(t => t.name.includes(appointmentId));

    if (!transcriptionFile) return null;

    try {
      const response = await fetch(transcriptionFile.url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading transcription:', error);
      return null;
    }
  }

  /**
   * Get analytics by appointment ID
   */
  async getAnalyticsByAppointment(appointmentId: string, userId: string): Promise<any> {
    const analytics = await this.getUserAnalytics(userId);
    const analyticsFile = analytics.find(a => a.name.includes(appointmentId));

    if (!analyticsFile) return null;

    try {
      const response = await fetch(analyticsFile.url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading analytics:', error);
      return null;
    }
  }

  /**
   * Delete recording
   */
  async deleteRecording(path: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/storage/delete`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ path, bucket: this.BUCKET_NAME }),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      console.log('✅ Recording deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting recording:', error);
    }
  }
}

// ============================================================================
// CHAT STORAGE SERVICE - GCS ONLY
// ============================================================================
export class ChatStorageService {
  private static instance: ChatStorageService;
  private sessionsCache: ChatSession[] = [];
  private cacheLoaded: boolean = false;

  private constructor() { }

  static getInstance(): ChatStorageService {
    if (!ChatStorageService.instance) {
      ChatStorageService.instance = new ChatStorageService();
    }
    return ChatStorageService.instance;
  }

  /**
   * Save all chat sessions to GCS
   */
  async saveSessions(sessions: ChatSession[]): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      console.warn('⚠️ No user logged in, cannot save chat sessions');
      return;
    }

    try {
      const path = `doctors/${user.id}/chat-sessions.json`;
      await writeToGCS('doctor', path, sessions);
      this.sessionsCache = sessions;
      console.log('✅ Chat sessions saved to GCS');
    } catch (error) {
      console.error('❌ Error saving chat sessions to GCS:', error);
      throw error;
    }
  }

  /**
   * Load all chat sessions from GCS
   */
  async loadSessions(): Promise<ChatSession[]> {
    const user = authService.getCurrentUser();
    if (!user) {
      console.warn('⚠️ No user logged in, cannot load chat sessions');
      return [];
    }

    // Return cached data if already loaded
    if (this.cacheLoaded) {
      return this.sessionsCache;
    }

    try {
      const path = `doctors/${user.id}/chat-sessions.json`;
      const data = await fetchFromGCS<ChatSession[]>('doctor', path);

      if (!data) {
        this.sessionsCache = [];
        this.cacheLoaded = true;
        return [];
      }

      // Parse dates
      const sessions = data.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));

      this.sessionsCache = sessions;
      this.cacheLoaded = true;
      console.log(`✅ Loaded ${sessions.length} chat sessions from GCS`);
      return sessions;
    } catch (error) {
      console.error('❌ Error loading chat sessions from GCS:', error);
      return [];
    }
  }

  /**
   * Save a single session (add or update)
   */
  async saveSession(session: ChatSession): Promise<void> {
    const sessions = await this.loadSessions();
    const index = sessions.findIndex(s => s.id === session.id);

    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }

    await this.saveSessions(sessions);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.loadSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await this.saveSessions(filtered);
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    await this.saveSessions([]);
    this.sessionsCache = [];
    console.log('✅ All chat sessions cleared from GCS');
  }

  /**
   * Clear local cache (force reload from GCS on next load)
   */
  clearCache(): void {
    this.sessionsCache = [];
    this.cacheLoaded = false;
  }
}

// ============================================================================
// APPOINTMENT STORAGE SERVICE - GCS ONLY
// ============================================================================
export class AppointmentStorageService {
  private static instance: AppointmentStorageService;
  private appointmentsCache: Appointment[] = [];
  private cacheLoaded: boolean = false;

  private constructor() { }

  static getInstance(): AppointmentStorageService {
    if (!AppointmentStorageService.instance) {
      AppointmentStorageService.instance = new AppointmentStorageService();
    }
    return AppointmentStorageService.instance;
  }

  /**
   * Save appointments to GCS (izara-appointments bucket)
   */
  async saveAppointments(appointments: Appointment[]): Promise<boolean> {
    try {
      // Use gcsDataService to save appointments
      const result = await saveAllAppointments(appointments);

      if (result.success) {
        this.appointmentsCache = appointments;
        console.log('✅ Appointments saved to GCS');
        return true;
      } else {
        console.error('❌ Failed to save appointments to GCS:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving appointments:', error);
      return false;
    }
  }

  /**
   * Load appointments from GCS (izara-appointments bucket)
   */
  async loadAppointments(): Promise<Appointment[]> {
    // Return cached data if already loaded
    if (this.cacheLoaded) {
      return this.appointmentsCache;
    }

    try {
      // Use gcsDataService to fetch appointments
      const appointments = await fetchAllAppointments();

      // Parse dates
      const parsedAppointments = appointments.map((apt: any) => ({
        ...apt,
        date: new Date(apt.date),
        createdAt: apt.createdAt ? new Date(apt.createdAt) : undefined,
        updatedAt: apt.updatedAt ? new Date(apt.updatedAt) : undefined,
        confirmedAt: apt.confirmedAt ? new Date(apt.confirmedAt) : undefined,
      }));

      this.appointmentsCache = parsedAppointments;
      this.cacheLoaded = true;

      console.log(`✅ Loaded ${parsedAppointments.length} appointments from GCS`);
      return parsedAppointments;
    } catch (error) {
      console.error('❌ Error loading appointments from GCS:', error);
      return [];
    }
  }

  /**
   * Get all appointments (no merging with mock data - all data is in GCS)
   */
  async getMergedAppointments(): Promise<Appointment[]> {
    const appointments = await this.loadAppointments();
    return appointments.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Clear appointments from GCS
   */
  async clearAppointments(): Promise<void> {
    try {
      await this.saveAppointments([]);
      this.appointmentsCache = [];
      console.log('✅ Appointments cleared from GCS');
    } catch (error) {
      console.error('❌ Error clearing appointments:', error);
    }
  }

  /**
   * Clear local cache (force reload from GCS on next load)
   */
  clearCache(): void {
    this.appointmentsCache = [];
    this.cacheLoaded = false;
  }
}

// ============================================================================
// MOCK DATA SERVICE - GCS ONLY
// @deprecated Data should come from PostgreSQL API endpoints, not GCS buckets.
// This service mixes stale GCS data with live PostgreSQL data.
// ============================================================================
export class MockDataService {
  private static instance: MockDataService;
  private cache: {
    doctors?: Doctor[];
    appointments?: any[];
    herbs?: Herb[];
    records?: HealthRecord[];
  } = {};
  private cacheTimestamps: {
    doctors?: number;
    appointments?: number;
    herbs?: number;
    records?: number;
  } = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private constructor() { }

  /** @deprecated Use PostgreSQL API instead. */
  static getInstance(): MockDataService {
    console.warn('⚠️ MockDataService.getInstance() is deprecated — data should come from PostgreSQL API endpoints');
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService();
    }
    return MockDataService.instance;
  }

  private isCacheValid(key: keyof typeof this.cache): boolean {
    const timestamp = this.cacheTimestamps[key];
    if (!timestamp) return false;
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Get doctors from GCS (izara-doctors-data bucket)
   * @deprecated Use PostgreSQL API /api/consultants instead
   */
  async getDoctors(): Promise<Doctor[]> {
    console.warn('⚠️ MockDataService.getDoctors() is deprecated — use /api/consultants endpoint');
    if (this.cache.doctors && this.isCacheValid('doctors')) {
      return this.cache.doctors;
    }

    try {
      console.log('📥 Fetching doctors from GCS...');
      const doctors = await fetchAllDoctors();
      this.cache.doctors = doctors as Doctor[];
      this.cacheTimestamps.doctors = Date.now();
      console.log(`✅ Loaded ${doctors.length} doctors from GCS`);
      return doctors as Doctor[];
    } catch (error) {
      console.error('❌ Error fetching doctors from GCS:', error);
      // NO fallback - return empty array if GCS fails
      return [];
    }
  }

  /**
   * Get appointments from GCS (izara-appointments bucket)
   * @deprecated Use PostgreSQL API /api/appointments instead
   */
  async getAppointments(): Promise<Appointment[]> {
    console.warn('⚠️ MockDataService.getAppointments() is deprecated — use /api/appointments endpoint');
    if (this.cache.appointments && this.isCacheValid('appointments')) {
      return this.parseAppointments(this.cache.appointments);
    }

    try {
      console.log('📥 Fetching appointments from GCS...');
      const appointments = await fetchAllAppointments();
      this.cache.appointments = appointments;
      this.cacheTimestamps.appointments = Date.now();
      console.log(`✅ Loaded ${appointments.length} appointments from GCS`);
      return this.parseAppointments(appointments);
    } catch (error) {
      console.error('❌ Error fetching appointments from GCS:', error);
      // NO fallback - return empty array if GCS fails
      return [];
    }
  }

  /**
   * Get herbs from GCS (izara-meta-data bucket)
   */
  async getHerbs(): Promise<Herb[]> {
    if (this.cache.herbs && this.isCacheValid('herbs')) {
      return this.cache.herbs;
    }

    try {
      console.log('📥 Fetching herbs from GCS...');
      const herbs = await fetchFromGCS<Herb[]>('metadata', 'herbs.json');
      if (herbs) {
        this.cache.herbs = herbs;
        this.cacheTimestamps.herbs = Date.now();
        console.log(`✅ Loaded ${herbs.length} herbs from GCS`);
        return herbs;
      }
      return [];
    } catch (error) {
      console.error('❌ Error fetching herbs from GCS:', error);
      return [];
    }
  }

  /**
   * Get health records from GCS (izara-patients-data bucket)
   */
  async getRecords(): Promise<HealthRecord[]> {
    if (this.cache.records && this.isCacheValid('records')) {
      return this.cache.records;
    }

    try {
      console.log('📥 Fetching health records from GCS...');
      const records = await fetchFromGCS<HealthRecord[]>('patient', 'health-records.json');
      if (records) {
        this.cache.records = records;
        this.cacheTimestamps.records = Date.now();
        console.log(`✅ Loaded ${records.length} health records from GCS`);
        return records;
      }
      return [];
    } catch (error) {
      console.error('❌ Error fetching health records from GCS:', error);
      return [];
    }
  }

  private parseAppointments(appointments: any[]): Appointment[] {
    return appointments.map(apt => ({
      ...apt,
      date: new Date(apt.date),
      createdAt: apt.createdAt ? new Date(apt.createdAt) : undefined,
      updatedAt: apt.updatedAt ? new Date(apt.updatedAt) : undefined,
      confirmedAt: apt.confirmedAt ? new Date(apt.confirmedAt) : undefined,
    }));
  }

  clearCache(): void {
    this.cache = {};
    this.cacheTimestamps = {};
    console.log('🗑️ MockDataService cache cleared');
  }
}

// ============================================================================
// CLOUD STORAGE SERVICE - GCS ONLY
// ============================================================================
export class CloudStorageService {
  private static instance: CloudStorageService;

  private constructor() { }

  static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  /**
   * Upload chat sessions to GCS
   */
  async uploadChatSessions(sessions: ChatSession[]): Promise<boolean> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        console.warn('⚠️ No user logged in');
        return false;
      }

      // Use gcsDataService to write directly
      const path = `doctors/${user.id}/chat-sessions.json`;
      const result = await writeToGCS('doctor', path, sessions);

      if (result.success) {
        console.log('✅ Chat sessions uploaded to GCS');
        return true;
      } else {
        console.error('❌ Failed to upload chat sessions:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error uploading chat sessions:', error);
      return false;
    }
  }

  /**
   * Download chat sessions from GCS
   */
  async downloadChatSessions(): Promise<ChatSession[] | null> {
    try {
      const user = authService.getCurrentUser();
      if (!user) return null;

      // Use gcsDataService to fetch directly
      const path = `doctors/${user.id}/chat-sessions.json`;
      const sessions = await fetchFromGCS<ChatSession[]>('doctor', path);

      if (sessions) {
        console.log('✅ Chat sessions downloaded from GCS');
        return sessions;
      }

      return null;
    } catch (error) {
      console.error('❌ Error downloading chat sessions:', error);
      return null;
    }
  }

  /**
   * Sync chat sessions to GCS (no localStorage)
   */
  async syncChatSessions(sessions: ChatSession[]): Promise<void> {
    const success = await this.uploadChatSessions(sessions);
    if (success) {
      console.log('✅ Chat sessions synced to GCS');
    } else {
      throw new Error('Failed to sync chat sessions to GCS');
    }
  }
}

// ============================================================================
// FILE STORAGE SERVICE - GCS ONLY
// ============================================================================
export class StorageService {
  private readonly buckets = BUCKETS;

  /**
   * Upload file to GCS - NO localStorage fallback
   */
  async uploadFile(
    file: File,
    options?: StorageUploadOptions
  ): Promise<StorageFile> {
    if (!options) {
      options = { bucket: this.buckets.doctor };
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', options.bucket);

    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.makePublic !== undefined) {
      formData.append('makePublic', String(options.makePublic));
    }
    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ File uploaded successfully to GCS:', data.url);

      return {
        name: data.name,
        url: data.url,
        bucket: data.bucket,
        contentType: data.contentType,
        size: data.size,
        uploadedAt: new Date(data.uploadedAt),
      };
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      // NO localStorage fallback - throw error
      throw new Error(`File upload failed: ${error.message}. Ensure the GCS API server is running (npm run api).`);
    }
  }

  async uploadMedicalImage(file: File, patientId: string): Promise<StorageFile> {
    const userFolderService = UserFolderService.getInstance();
    const folder = userFolderService.getFolders(patientId).medicalImages;

    return this.uploadFile(file, {
      bucket: this.buckets.patient, // Store patient medical images in patient bucket
      folder: folder,
      makePublic: false,
    });
  }

  async uploadConsultationRecording(
    file: File,
    appointmentId: string,
    patientId: string
  ): Promise<StorageFile> {
    const recordingStorage = RecordingStorageService.getInstance();
    return recordingStorage.uploadRecording(file, appointmentId, patientId);
  }

  async deleteFile(path: string, bucket?: string): Promise<void> {
    try {
      const targetBucket = bucket || this.buckets.doctor;
      const response = await fetch(`${API_BASE_URL}/api/storage/delete`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ path, bucket: targetBucket }),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      console.log('✅ File deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting file:', error);
    }
  }

  async listFiles(folder: string, bucket?: string): Promise<StorageFile[]> {
    try {
      const targetBucket = bucket || this.buckets.doctor;
      const response = await fetch(
        `${API_BASE_URL}/api/storage/list?folder=${folder}&bucket=${targetBucket}`,
        {
          headers: authService.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('List failed');
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('❌ Error listing files:', error);
      return [];
    }
  }

  getBucketName(type: 'doctor' | 'patient' | 'appointments' | 'metadata'): string {
    return this.buckets[type] || '';
  }

  isConfigured(): boolean {
    return Object.values(this.buckets).some(bucket => !!bucket);
  }

  getConfigStatus(): {
    doctor: boolean;
    patient: boolean;
    appointments: boolean;
    metadata: boolean;
  } {
    return {
      doctor: !!this.buckets.doctor,
      patient: !!this.buckets.patient,
      appointments: !!this.buckets.appointments,
      metadata: !!this.buckets.metadata,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCES
// ============================================================================
export const userFolderService = UserFolderService.getInstance();
export const recordingStorage = RecordingStorageService.getInstance();
export const chatStorage = ChatStorageService.getInstance();
export const appointmentStorage = AppointmentStorageService.getInstance();
export const cloudStorage = CloudStorageService.getInstance();
export const storageService = new StorageService();
export const mockDataService = MockDataService.getInstance();