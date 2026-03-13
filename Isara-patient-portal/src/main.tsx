import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker, requestNotificationPermission } from './lib/registerSW';

// Register service worker for PWA functionality
registerServiceWorker();

// Request notification permission (optional, user can enable in settings)
setTimeout(() => {
  requestNotificationPermission();
}, 5000); // Wait 5 seconds after page load

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
