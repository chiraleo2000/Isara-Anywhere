import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_STAGING = process.env.APP_ENV === 'staging';

const getAppName = () => {
  if (IS_DEV) return 'Izara Anywhere (Dev)';
  if (IS_STAGING) return 'Izara Anywhere (Staging)';
  return 'Izara Anywhere';
};

const getBundleId = () => {
  if (IS_DEV) return 'com.izara.anywhere.dev';
  if (IS_STAGING) return 'com.izara.anywhere.staging';
  return 'com.izara.anywhere';
};

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  return {
  ...config,
  name: getAppName(),
  slug: 'izara-anywhere',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'izara-anywhere',
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
      NSSpeechRecognitionUsageDescription: 'ใช้การรู้จำเสียงพูดสำหรับการถอดเสียงระหว่างการปรึกษา',
      UIBackgroundModes: ['fetch', 'remote-notification', 'voip'],
    },
    config: { usesNonExemptEncryption: false },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0ea5e9',
    },
    package: getBundleId(),
    versionCode: 1,
    permissions: [
      'CAMERA', 'RECORD_AUDIO', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION',
      'USE_BIOMETRIC', 'VIBRATE', 'READ_CALENDAR', 'WRITE_CALENDAR',
      'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'ACTIVITY_RECOGNITION',
      'FOREGROUND_SERVICE',
    ],
    googleServicesFile: IS_DEV ? './google-services-dev.json' : './google-services.json',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    ['expo-notifications', {
      icon: './assets/notification-icon.png',
      color: '#0ea5e9',
      defaultChannel: 'default',
      sounds: ['./assets/sounds/notification.wav'],
    }],
    ['expo-camera', {
      cameraPermission: 'Allow Izara to access your camera for document scanning.',
      microphonePermission: 'Allow Izara to access your microphone for video consultations.',
      recordAudioAndroid: true,
    }],
    ['expo-location', {
      locationAlwaysAndWhenInUsePermission: 'Allow Izara to use your location to find nearby healthcare facilities.',
    }],
    ['expo-local-authentication', {
      faceIDPermission: 'Allow Izara to use Face ID for secure login.',
    }],
    ['expo-image-picker', {
      photosPermission: 'Allow Izara to access your photos for uploading medical documents.',
    }],
    'expo-sqlite',
  ],
  experiments: { typedRoutes: true },
  extra: {
    router: { origin: false },
    eas: { projectId: 'izara-anywhere-project-id' },
    // Patient Portal
    PATIENT_API_URL: process.env.PATIENT_API_URL ?? (IS_DEV ? 'http://localhost:3005' : 'https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app'),
    // Doctor Portal
    DOCTOR_API_URL: process.env.DOCTOR_API_URL ?? (IS_DEV ? 'http://localhost:3010' : 'https://izara-doctor-portal-dev-testing-hvht4obouq-as.a.run.app'),
    DOCTOR_AUTH_PORT: process.env.DOCTOR_AUTH_PORT ?? '3011',
    DOCTOR_API_PORT: process.env.DOCTOR_API_PORT ?? '3009',
    DOCTOR_GCS_PORT: process.env.DOCTOR_GCS_PORT ?? '3012',
    // Meeting Server
    MEETING_SERVER_URL: process.env.MEETING_SERVER_URL ?? (IS_DEV ? 'http://localhost:3020' : 'https://izara-meeting-server-dev-testing-hvht4obouq-as.a.run.app'),
  },
  };
}
