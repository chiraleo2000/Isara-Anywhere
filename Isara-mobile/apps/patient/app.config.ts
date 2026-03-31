import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_STAGING = process.env.APP_ENV === 'staging';

const getAppName = () => {
  if (IS_DEV) return 'Izara Patient (Dev)';
  if (IS_STAGING) return 'Izara Patient (Staging)';
  return 'Izara Patient';
};

const getBundleId = () => {
  if (IS_DEV) return 'com.izara.patient.dev';
  if (IS_STAGING) return 'com.izara.patient.staging';
  return 'com.izara.patient';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'izara-patient',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'izara-patient',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0ea5e9',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: getBundleId(),
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: 'กรุณาอนุญาตการใช้กล้องเพื่อถ่ายรูปเอกสารทางการแพทย์และอาการ',
      NSMicrophoneUsageDescription: 'กรุณาอนุญาตการใช้ไมโครโฟนสำหรับการปรึกษาแพทย์ทางวิดีโอ',
      NSPhotoLibraryUsageDescription: 'กรุณาอนุญาตการเข้าถึงรูปภาพเพื่ออัปโหลดเอกสารทางการแพทย์',
      NSLocationWhenInUseUsageDescription: 'กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อค้นหาสถานพยาบาลใกล้เคียง',
      NSFaceIDUsageDescription: 'ใช้ Face ID เพื่อเข้าสู่ระบบอย่างปลอดภัย',
      NSCalendarsUsageDescription: 'เพิ่มนัดหมายแพทย์ลงในปฏิทินของคุณ',
      NSHealthShareUsageDescription: 'อ่านข้อมูลสุขภาพจาก Apple Health เพื่อบันทึกสัญญาณชีพ',
      NSHealthUpdateUsageDescription: 'บันทึกข้อมูลสุขภาพลงใน Apple Health',
      UIBackgroundModes: ['fetch', 'remote-notification', 'voip'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0ea5e9',
    },
    package: getBundleId(),
    versionCode: 1,
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'USE_BIOMETRIC',
      'VIBRATE',
      'READ_CALENDAR',
      'WRITE_CALENDAR',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'ACTIVITY_RECOGNITION',
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
        color: '#0ea5e9',
        defaultChannel: 'default',
        sounds: ['./assets/sounds/notification.wav'],
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Izara to access your camera for document scanning.',
        microphonePermission: 'Allow Izara to access your microphone for video consultations.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow Izara to use your location to find nearby healthcare facilities.',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow Izara to use Face ID for secure login.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Izara to access your photos for uploading medical documents.',
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
      projectId: 'izara-patient-project-id',
    },
    API_BASE_URL: process.env.API_BASE_URL ?? 'https://api.izara-anywhere.com',
    PATIENT_API_PORT: process.env.PATIENT_API_PORT ?? '3005',
    MEETING_SERVER_URL: process.env.MEETING_SERVER_URL ?? 'https://meet.izara-anywhere.com',
  },
});
