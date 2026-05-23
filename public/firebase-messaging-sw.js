/**
 * Firebase Cloud Messaging (FCM) Service Worker
 * SI PRESENSI — Push Notification Handler
 * 
 * This file handles:
 * 1. Background push messages from FCM / Web Push server
 * 2. Notification click events (open app to relevant page)
 * 3. Fallback local notification display if payload has no notification object
 * 
 * SETUP INSTRUCTIONS:
 * ===================
 * To enable Firebase Cloud Messaging (FCM):
 * 
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project or use existing one
 * 3. Add a Web app to your project
 * 4. Go to Project Settings → Cloud Messaging tab
 * 5. Copy the VAPID Key (Web Push Certificates section)
 * 6. Add to your .env file:
 *    VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
 *    VITE_FIREBASE_API_KEY=your_api_key
 *    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
 *    VITE_FIREBASE_PROJECT_ID=your_project_id
 *    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
 *    VITE_FIREBASE_APP_ID=your_app_id
 * 
 * 7. To send a push notification from your backend/Supabase Edge Function:
 *    POST to https://fcm.googleapis.com/fcm/send with your server key
 *    Or use the Firebase Admin SDK in a Supabase Edge Function
 * 
 * NOTE: This service worker also works WITHOUT Firebase, using native Web Push API.
 */

// =============================================
// OPTIONAL: Firebase imports — uncomment if using FCM
// =============================================
// importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
// 
// firebase.initializeApp({
//   apiKey: self.__FIREBASE_CONFIG?.apiKey,
//   authDomain: self.__FIREBASE_CONFIG?.authDomain,
//   projectId: self.__FIREBASE_CONFIG?.projectId,
//   messagingSenderId: self.__FIREBASE_CONFIG?.messagingSenderId,
//   appId: self.__FIREBASE_CONFIG?.appId,
// });
// const messaging = firebase.messaging();
// messaging.onBackgroundMessage((payload) => {
//   handlePushPayload(payload.notification || {}, payload.data || {});
// });
// =============================================

const APP_NAME = 'SI PRESENSI';
const DEFAULT_ICON = '/icons/icon-192x192.png';
const DEFAULT_BADGE = '/icons/icon-72x72.png';

/**
 * Show a notification from a push payload.
 */
const handlePushPayload = (notification = {}, data = {}) => {
  const title = notification.title || APP_NAME;
  const options = {
    body: notification.body || 'Anda memiliki notifikasi baru.',
    icon: notification.icon || DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: data.tag || 'sipresensi-' + Date.now(),
    data: { url: data.url || '/', ...data },
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction === 'true' || false,
    actions: data.action1 ? [
      { action: 'open', title: data.action1 || 'Buka Aplikasi' },
      { action: 'dismiss', title: 'Tutup' }
    ] : [],
  };
  return self.registration.showNotification(title, options);
};

// =============================================
// NATIVE WEB PUSH: push event handler
// =============================================
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { notification: { body: event.data?.text() || 'Notifikasi baru.' } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  event.waitUntil(handlePushPayload(notification, data));
});

// =============================================
// NOTIFICATION CLICK: open relevant page
// =============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  if (action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Find existing open window and focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // No window found — open new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// =============================================
// SERVICE WORKER LIFECYCLE
// =============================================
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate new SW immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Take control of all clients immediately
});
