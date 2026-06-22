
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App';

if (typeof globalThis !== 'undefined') {
  globalThis.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as Error | undefined;
    const msg = reason?.message || String(event.reason ?? '');
    if (/abort|cancelled|network|fetch failed|socket/i.test(msg)) {
      event.preventDefault();
      if (import.meta.env?.DEV) console.debug('[unhandledrejection]', msg);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'missing-google-client-id'}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
