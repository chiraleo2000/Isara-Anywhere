/**
 * Configuration Service
 * Centralizes all environment variable access
 */

export const config = {
  // Application Info
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Izara Doctor Portal',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    env: import.meta.env.VITE_APP_ENV || 'development',
  },

  // Backend APIs
  // Note: API calls use relative URLs in production (proxied by Nginx)
  api: {
    baseUrl: import.meta.env.VITE_API_URL || '', // Empty = use relative URLs (proxied by Nginx/Vite)
    gcsApiUrl: import.meta.env.VITE_GCS_API_URL || '', // Empty for relative paths
    authUrl: import.meta.env.VITE_AUTH_URL || '', // Empty for relative paths
    doctorUrl: import.meta.env.VITE_DOCTOR_URL || '', // Empty for relative paths
    websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || `${typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host : 'ws://localhost:3011'}/ws`,
  },

  // Google Cloud Platform
  gcp: {
    projectId: import.meta.env.VITE_GCP_PROJECT_ID || 'izara-telemedicine',
    region: import.meta.env.VITE_GCP_REGION || 'asia-southeast1',
  },

  // OAuth 2.0
  oauth: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || 'http://localhost:3001/auth/callback',
  },

  // Google Cloud Storage Buckets - All 5 Izara buckets
  gcs: {
    // Auth bucket - user credentials, session tokens, OAuth
    credentialsBucket: import.meta.env.VITE_GCS_BUCKET_CREDENTIALS || import.meta.env.VITE_GCS_BUCKET_AUTH || 'izara-users-credentials',
    // Doctor bucket - doctor profiles, queue, schedules
    doctorBucket: import.meta.env.VITE_GCS_BUCKET_DOCTOR || 'izara-doctors-data',
    // Patient bucket - patient records, EMRs, prescriptions, lab orders
    patientBucket: import.meta.env.VITE_GCS_BUCKET_PATIENT || 'izara-patients-data',
    // Appointments bucket - all appointment/booking data
    appointmentsBucket: import.meta.env.VITE_GCS_BUCKET_APPOINTMENTS || 'izara-appointments',
    // Metadata bucket - reference data (medications, lab tests, ICD-10 codes)
    metadataBucket: import.meta.env.VITE_GCS_BUCKET_METADATA || 'izara-meta-data',
    // Base URL for GCS
    baseUrl: 'https://storage.googleapis.com',
  },

  // Google APIs
  google: {
    calendarApiKey: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || '',
    meetApiKey: import.meta.env.VITE_GOOGLE_MEET_API_KEY || '',
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  },

  // Gemini AI
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-exp',
    temperature: parseFloat(import.meta.env.VITE_GEMINI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(import.meta.env.VITE_GEMINI_MAX_TOKENS || '8192'),
  },

  // Feature Flags
  features: {
    // PDPA Compliance
    pdpaEnabled: import.meta.env.VITE_PDPA_ENABLED === 'true',
    consentRequired: import.meta.env.VITE_CONSENT_REQUIRED === 'true',
    auditLoggingEnabled: import.meta.env.VITE_AUDIT_LOGGING_ENABLED === 'true',

    // EMR/EHR
    emrPatientAccessControl: import.meta.env.VITE_EMR_PATIENT_ACCESS_CONTROL === 'true',
    emrAutoSaveInterval: parseInt(import.meta.env.VITE_EMR_AUTO_SAVE_INTERVAL || '30000'),
    emrVersionControl: import.meta.env.VITE_EMR_VERSION_CONTROL === 'true',

    // Clinical Features
    ePrescribingEnabled: import.meta.env.VITE_E_PRESCRIBING_ENABLED === 'true',
    drugInteractionCheck: import.meta.env.VITE_DRUG_INTERACTION_CHECK === 'true',
    labOrderingEnabled: import.meta.env.VITE_LAB_ORDERING_ENABLED === 'true',
    imagingOrderingEnabled: import.meta.env.VITE_IMAGING_ORDERING_ENABLED === 'true',

    // AI Features
    aiClinicalAssist: import.meta.env.VITE_AI_CLINICAL_ASSIST === 'true',
    aiVoiceTranscription: import.meta.env.VITE_AI_VOICE_TRANSCRIPTION === 'true',
    aiNoteSummarization: import.meta.env.VITE_AI_NOTE_SUMMARIZATION === 'true',
    aiIcdCodingAssist: import.meta.env.VITE_AI_ICD_CODING_ASSIST === 'true',
    aiDrugInfo: import.meta.env.VITE_AI_DRUG_INFO === 'true',

    // Other Features
    livingWillEnabled: import.meta.env.VITE_LIVING_WILL_ENABLED === 'true',
    phrWearablesEnabled: import.meta.env.VITE_PHR_WEARABLES_ENABLED === 'true',
    videoConsultationEnabled: import.meta.env.VITE_VIDEO_CONSULTATION_ENABLED === 'true',
    queueManagementEnabled: import.meta.env.VITE_QUEUE_MANAGEMENT_ENABLED === 'true',
    realTimeUpdates: import.meta.env.VITE_REAL_TIME_UPDATES === 'true',
  },

  // Security Settings
  security: {
    sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '1800000'), // 30 minutes
    mfaEnabled: import.meta.env.VITE_MFA_ENABLED === 'true',
    encryptionEnabled: import.meta.env.VITE_ENCRYPTION_ENABLED === 'true',
  },

  // Mobile/PWA Settings
  pwa: {
    enabled: import.meta.env.VITE_PWA_ENABLED === 'true',
    offlineModeEnabled: import.meta.env.VITE_OFFLINE_MODE_ENABLED === 'true',
    pushNotificationsEnabled: import.meta.env.VITE_PUSH_NOTIFICATIONS_ENABLED === 'true',
  },
};

// Helper function to check if feature is enabled
export const isFeatureEnabled = (featureName: keyof typeof config.features): boolean => {
  return config.features[featureName] === true;
};

// Bucket type definition
export type GcsBucketType = 'credentials' | 'doctor' | 'patient' | 'appointments' | 'metadata';

// Helper to get GCS bucket name
export const getGcsBucketName = (bucketType: GcsBucketType): string => {
  const bucketMap: Record<GcsBucketType, string> = {
    credentials: config.gcs.credentialsBucket,
    doctor: config.gcs.doctorBucket,
    patient: config.gcs.patientBucket,
    appointments: config.gcs.appointmentsBucket,
    metadata: config.gcs.metadataBucket,
  };
  return bucketMap[bucketType];
};

// Helper to get GCS bucket URL
export const getGcsBucketUrl = (bucketType: GcsBucketType): string => {
  return `${config.gcs.baseUrl}/${getGcsBucketName(bucketType)}`;
};

// Helper to get full GCS object URL
export const getGcsObjectUrl = (bucketType: GcsBucketType, objectPath: string): string => {
  return `${getGcsBucketUrl(bucketType)}/${objectPath}`;
};

// Export for logging (development only)
if (config.app.env === 'development') {
  console.log('🔧 Configuration loaded:', {
    app: config.app,
    api: config.api,
    gcs: config.gcs,
    featuresEnabled: Object.entries(config.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature),
  });
}

export default config;
