// Register Service Worker for PWA functionality

function handleInstallingWorker(newWorker: ServiceWorker) {
  newWorker.addEventListener('statechange', () => {
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      console.log('[PWA] New version available!');
      showUpdateNotification();
    }
  });
}

function handleUpdateFound(registration: ServiceWorkerRegistration) {
  const newWorker = registration.installing;
  if (newWorker) {
    handleInstallingWorker(newWorker);
  }
}

function handleRegistration(registration: ServiceWorkerRegistration) {
  console.log('[PWA] Service Worker registered successfully:', registration.scope);

  // Check for updates periodically
  setInterval(() => {
    registration.update();
  }, 60000); // Check every minute

  // Listen for new service worker waiting to activate
  registration.addEventListener('updatefound', () => handleUpdateFound(registration));
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    globalThis.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(handleRegistration)
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  }
}

function showUpdateNotification() {
  // Show a notification to the user that an update is available
  if ('Notification' in globalThis && Notification.permission === 'granted') {
    new Notification('Update Available', {
      body: 'A new version of Izara Patient Portal is available. Refresh to update.',
      icon: '/IzaraLogo.png',
      tag: 'app-update',
    });
  }
}

export function requestNotificationPermission() {
  if ('Notification' in globalThis && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      console.log('[PWA] Notification permission:', permission);
    });
  }
}

export async function subscribeToPushNotifications() {
  if ('serviceWorker' in navigator && 'PushManager' in globalThis) {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[PWA] Push notification permission denied');
        return null;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // You would need to generate VAPID keys for production
        applicationServerKey: urlBase64ToUint8Array(
          'YOUR_PUBLIC_VAPID_KEY_HERE'
        ),
      });

      console.log('[PWA] Push notification subscription:', subscription);
      return subscription;
    } catch (error) {
      console.error('[PWA] Failed to subscribe to push notifications:', error);
      return null;
    }
  }
  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/');

  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.codePointAt(i) ?? 0;
  }
  return outputArray;
}

export function clearCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise<void>((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          resolve();
        }
      };

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      } else {
        resolve();
      }
    });
  }
  return Promise.resolve();
}
