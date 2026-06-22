/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GCP_PROJECT_ID: string
  readonly VITE_GCP_REGION: string
  readonly VITE_API_URL: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_API_KEY: string
  readonly VITE_STORAGE_BUCKET_MEDICAL: string
  readonly VITE_STORAGE_BUCKET_PRESCRIPTIONS: string
  readonly VITE_STORAGE_BUCKET_LAB: string
  readonly VITE_STORAGE_BUCKET_UPLOADS: string
  readonly VITE_STORAGE_BUCKET_RECORDINGS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    ENV?: {
      VITE_GCP_PROJECT_ID?: string
      VITE_GCP_REGION?: string
      VITE_API_URL?: string
      VITE_GOOGLE_MAPS_API_KEY?: string
      VITE_GEMINI_API_KEY?: string
      VITE_GOOGLE_CLIENT_ID?: string
      VITE_GOOGLE_API_KEY?: string
      VITE_STORAGE_BUCKET_MEDICAL?: string
      VITE_STORAGE_BUCKET_PRESCRIPTIONS?: string
      VITE_STORAGE_BUCKET_LAB?: string
      VITE_STORAGE_BUCKET_UPLOADS?: string
      VITE_STORAGE_BUCKET_RECORDINGS?: string
    }
    google?: any
    gapi?: any
    googleMapsLoaded?: boolean
    gapiLoaded?: boolean
    gisLoaded?: boolean
    GOOGLE_CONFIG?: any
  }
}

export {}