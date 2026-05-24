import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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

// Ensure root element exists
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Failed to find the root element. Make sure index.html contains <div id="root"></div>'
  );
}

// Create root and render app
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
