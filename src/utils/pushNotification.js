/**
 * Push Notification Utility — Web Push API
 * 
 * Supports two modes:
 * 1. Firebase Cloud Messaging (FCM) — if VITE_FIREBASE_VAPID_KEY is set in .env
 * 2. Native Web Push — works with any push server
 * 
 * Usage:
 *   import { requestPermission, subscribeUser, showLocalNotification } from './pushNotification'
 * 
 * To enable FCM:
 *   1. Create a Firebase project at console.firebase.google.com
 *   2. Add your app and get the VAPID key from Project Settings → Cloud Messaging
 *   3. Add to .env:
 *      VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
 *      VITE_FIREBASE_API_KEY=your_api_key
 *      VITE_FIREBASE_PROJECT_ID=your_project_id
 *      VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
 *      VITE_FIREBASE_APP_ID=your_app_id
 */

import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || null;
const SW_PATH = '/firebase-messaging-sw.js';

/**
 * Convert a base64url VAPID key to Uint8Array for PushManager.
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Check if push notifications are supported in this browser.
 * @returns {boolean}
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

/**
 * Get current notification permission status.
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
export const getPermissionStatus = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Request notification permission from the user.
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export const requestPermission = async () => {
  if (!isPushSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  return result;
};

/**
 * Register the service worker and subscribe to push notifications.
 * Saves the subscription to Supabase push_subscriptions table.
 * 
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const subscribeUser = async () => {
  if (!isPushSupported()) {
    return { success: false, message: 'Browser ini tidak mendukung push notifications.' };
  }

  try {
    // Step 1: Register Service Worker
    let registration;
    try {
      registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      return { success: false, message: 'Gagal mendaftarkan service worker: ' + swErr.message };
    }

    // Step 2: Request permission
    const permission = await requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Izin notifikasi ditolak. Aktifkan di pengaturan browser.' };
    }

    // Step 3: Subscribe to push
    const subscribeOptions = {
      userVisibleOnly: true,
      ...(VAPID_PUBLIC_KEY ? { applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) } : {})
    };

    const subscription = await registration.pushManager.subscribe(subscribeOptions);
    const subscriptionJSON = subscription.toJSON();

    // Step 4: Save to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('auth_id', session.user.id)
        .maybeSingle();

      if (profile) {
        await supabase.from('push_subscriptions').upsert({
          user_id: profile.id,
          tenant_id: profile.tenant_id,
          endpoint: subscriptionJSON.endpoint,
          p256dh: subscriptionJSON.keys?.p256dh,
          auth: subscriptionJSON.keys?.auth,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    }

    // Save to localStorage as fallback indicator
    try { localStorage.setItem('push_subscribed', 'true'); } catch { /* ignore */ }

    return { success: true, message: 'Notifikasi berhasil diaktifkan!' };
  } catch (err) {
    return { success: false, message: 'Gagal berlangganan: ' + err.message };
  }
};

/**
 * Unsubscribe from push notifications and remove from Supabase.
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const unsubscribeUser = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', session.user.id)
        .maybeSingle();
      if (profile) {
        await supabase.from('push_subscriptions').delete().eq('user_id', profile.id);
      }
    }

    try { localStorage.removeItem('push_subscribed'); } catch { /* ignore */ }
    return { success: true, message: 'Notifikasi dinonaktifkan.' };
  } catch (err) {
    return { success: false, message: 'Gagal berhenti berlangganan: ' + err.message };
  }
};

/**
 * Check if the current user is already subscribed.
 * @returns {Promise<boolean>}
 */
export const isSubscribed = async () => {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};

/**
 * Show a local (in-browser) notification immediately — no server needed.
 * Useful for: "Absensi berhasil dicatat", "Izin disetujui", etc.
 * 
 * @param {string} title
 * @param {{ body?: string, icon?: string, badge?: string, tag?: string, data?: object }} options
 */
export const showLocalNotification = async (title, options = {}) => {
  if (!isPushSupported()) return;
  const permission = Notification.permission;
  if (permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body: options.body || '',
      icon: options.icon || '/icons/icon-192x192.png',
      badge: options.badge || '/icons/icon-72x72.png',
      tag: options.tag || 'sipresensi-default',
      data: options.data || {},
      vibrate: [100, 50, 100],
      ...options,
    });
  } catch {
    // Fallback: use Notification constructor directly
    try {
      new Notification(title, { body: options.body || '', icon: options.icon });
    } catch { /* ignore */ }
  }
};

/**
 * Initialize push notification setup at app start.
 * Re-subscribes silently if user was previously subscribed.
 */
export const initPushNotifications = async () => {
  if (!isPushSupported()) return;
  try {
    // Register service worker regardless of subscription status
    await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch (err) {
    console.warn('SW registration failed:', err.message);
  }
};
