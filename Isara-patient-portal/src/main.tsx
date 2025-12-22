import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker, requestNotificationPermission } from './utils/registerSW';

// Register service worker for PWA functionality
registerServiceWorker();

// Request notification permission (optional, user can enable in settings)
setTimeout(() => {
  requestNotificationPermission();
}, 5000); // Wait 5 seconds after page load

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
