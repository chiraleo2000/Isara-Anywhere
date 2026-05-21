import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
import { registerServiceWorker, requestNotificationPermission } from './lib/registerSW';

// Register service worker for PWA functionality
registerServiceWorker();

// Request notification permission (optional, user can enable in settings)
setTimeout(() => {
  requestNotificationPermission();
}, 5000); // Wait 5 seconds after page load

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}
