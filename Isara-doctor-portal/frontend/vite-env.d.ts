/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GCP_PROJECT_ID: string
  readonly VITE_GCP_REGION: string
  readonly VITE_API_URL: string
  readonly VITE_AUTH_URL: string
  readonly VITE_DOCTOR_URL: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_GEMINI_MODEL: string
  readonly GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_API_KEY: string
  readonly VITE_STORAGE_BUCKET_MEDICAL: string
  readonly VITE_STORAGE_BUCKET_PRESCRIPTIONS: string
  readonly VITE_STORAGE_BUCKET_LAB: string
  readonly VITE_STORAGE_BUCKET_UPLOADS: string
  readonly VITE_STORAGE_BUCKET_RECORDINGS: string
  readonly [key: string]: string | boolean | undefined
}

declare global {
  interface Window {
    ENV?: Record<string, string | undefined>
    google?: any
    gapi?: any
    googleMapsLoaded?: boolean
    gapiLoaded?: boolean
    gisLoaded?: boolean
    GOOGLE_CONFIG?: any
  }
}

export {}
