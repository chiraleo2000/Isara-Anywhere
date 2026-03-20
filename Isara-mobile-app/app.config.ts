import type { ExpoConfig, ConfigContext } from 'expo/config';

function createAppConfig({ config }: ConfigContext): ExpoConfig {
  return {
    ...config,
    name: 'Isara Telemedicine',
    slug: 'isara-mobile-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#E6F4FE',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.isara.telemedicine',
      infoPlist: {
        NSCameraUsageDescription: 'Camera is required for video consultations',
        NSMicrophoneUsageDescription: 'Microphone is required for video consultations',
        NSLocationWhenInUseUsageDescription: 'Location is used to find nearby clinics',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#E6F4FE',
      },
      package: 'com.isara.telemedicine',
      permissions: [
        'CAMERA',
        'RECORD_AUDIO',
        'INTERNET',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'VIBRATE',
        'RECEIVE_BOOT_COMPLETED',
      ],
    },
    plugins: [
      'expo-secure-store',
      'expo-location',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#2196F3',
          sounds: [],
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'isara-telemedicine',
      },
    },
  };
}

export default createAppConfig;
