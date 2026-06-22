/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_GCP_PROJECT_ID: string;
  readonly VITE_GCP_REGION: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GCS_BUCKET_AUTH: string;
  readonly VITE_GCS_BUCKET_PATIENT: string;
  readonly VITE_GCS_BUCKET_DOCTOR: string;
  readonly VITE_GCS_BUCKET_APPOINTMENTS: string;
  readonly VITE_GCS_BUCKET_METADATA: string;
  readonly VITE_GOOGLE_CALENDAR_API_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_GEMINI_MODEL: string;
  readonly VITE_PDPA_ENABLED: string;
  readonly VITE_PHR_WEARABLES_ENABLED: string;
  readonly VITE_AI_DOCTOR_ENABLED: string;
  readonly VITE_LIVING_WILL_ENABLED: string;
  readonly VITE_MAP_ENABLED: string;
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_MOCK_DATA_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    gapi?: any;
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
        };
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
      maps: typeof google.maps;
    };
  }
}

export {};
