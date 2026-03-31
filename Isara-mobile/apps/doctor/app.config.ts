import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_STAGING = process.env.APP_ENV === 'staging';

const getAppName = () => {
  if (IS_DEV) return 'Izara Doctor (Dev)';
  if (IS_STAGING) return 'Izara Doctor (Staging)';
  return 'Izara Doctor';
};

const getBundleId = () => {
  if (IS_DEV) return 'com.izara.doctor.dev';
  if (IS_STAGING) return 'com.izara.doctor.staging';
  return 'com.izara.doctor';
};

const createExpoConfig = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'izara-doctor',
  version: '2.0.0',
  orientation: 'default', // Allow both portrait and landscape for doctors
  icon: './assets/icon.png',
  scheme: 'izara-doctor',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1e40af',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: getBundleId(),
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: 'กรุณาอนุญาตการใช้กล้องสำหรับการปรึกษาทางวิดีโอกับผู้ป่วย',
      NSMicrophoneUsageDescription: 'กรุณาอนุญาตการใช้ไมโครโฟนสำหรับการปรึกษาทางวิดีโอกับผู้ป่วย',
      NSPhotoLibraryUsageDescription: 'กรุณาอนุญาตการเข้าถึงรูปภาพเพื่ออัปโหลดเอกสารทางการแพทย์',
      NSFaceIDUsageDescription: 'ใช้ Face ID เพื่อเข้าสู่ระบบอย่างปลอดภัย',
      NSSpeechRecognitionUsageDescription: 'ใช้สำหรับถอดเสียงการปรึกษาเป็นข้อความ',
      UIBackgroundModes: ['fetch', 'remote-notification', 'voip', 'audio'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1e40af',
    },
    package: getBundleId(),
    versionCode: 1,
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'USE_BIOMETRIC',
      'VIBRATE',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'FOREGROUND_SERVICE',
    ],
    googleServicesFile: IS_DEV
      ? './google-services-dev.json'
      : './google-services.json',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#1e40af',
        defaultChannel: 'default',
        sounds: ['./assets/sounds/notification.wav', './assets/sounds/urgent.wav'],
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Izara Doctor to access your camera for video consultations.',
        microphonePermission: 'Allow Izara Doctor to access your microphone for video consultations.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow Izara Doctor to use Face ID for secure login.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Izara Doctor to access your photos for uploading medical documents.',
      },
    ],
    'expo-sqlite',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: 'izara-doctor-project-id',
    },
    API_BASE_URL: process.env.API_BASE_URL ?? 'https://api.izara-anywhere.com',
    DOCTOR_AUTH_PORT: process.env.DOCTOR_AUTH_PORT ?? '3011',
    DOCTOR_API_PORT: process.env.DOCTOR_API_PORT ?? '3009',
    DOCTOR_GCS_PORT: process.env.DOCTOR_GCS_PORT ?? '3012',
    MEETING_SERVER_URL: process.env.MEETING_SERVER_URL ?? 'https://meet.izara-anywhere.com',
  },
});

export default createExpoConfig;
