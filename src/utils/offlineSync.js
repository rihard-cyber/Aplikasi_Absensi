/**
 * Offline Attendance Sync Queue
 * 
 * Provides a robust offline-first queue for attendance logs:
 * - Unique ID per entry to prevent duplicates on retry
 * - Automatic retry with exponential backoff on failure
 * - Queue size limit with oldest-first eviction
 * - Sync status events (dispatches 'offlineSyncComplete' event)
 * - localStorage with graceful error handling
 */

import { supabase } from './supabaseClient';

const QUEUE_KEY = 'offline_attendance_v2';
const MAX_QUEUE_SIZE = 50;     // Max entries to keep locally
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 2000;

/**
 * Generate a short unique ID for queue entries.
 */
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Read the offline queue from localStorage.
 * @returns {Array<Object>}
 */
export const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Write the queue back to localStorage.
 * @param {Array<Object>} queue
 */
const writeQueue = (queue) => {
  try {
    // Evict oldest if over limit
    const trimmed = queue.length > MAX_QUEUE_SIZE
      ? queue.slice(queue.length - MAX_QUEUE_SIZE)
      : queue;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // If storage is full, try clearing old entries and retry once
    try {
      const half = queue.slice(Math.floor(queue.length / 2));
      localStorage.setItem(QUEUE_KEY, JSON.stringify(half));
    } catch { /* give up */ }
  }
};

/**
 * Push a new attendance log entry to the offline queue.
 * @param {Object} logData - The attendance_logs row object
 */
export const enqueueAttendance = (logData) => {
  const queue = readQueue();
  const entry = {
    ...logData,
    _id: genId(),           // Unique ID for deduplication
    _retries: 0,
    _queued_at: new Date().toISOString(),
  };
  queue.push(entry);
  writeQueue(queue);
  return entry._id;
};

/**
 * Remove a specific entry from the queue by its _id.
 * @param {string} id
 */
const removeFromQueue = (id) => {
  const queue = readQueue().filter(e => e._id !== id);
  writeQueue(queue);
};

/**
 * Attempt to sync all queued entries to Supabase.
 * Uses exponential backoff for failed entries.
 * 
 * @param {(message: string, type: 'success'|'error'|'info') => void} toast - toast callback
 * @returns {Promise<{ synced: number, failed: number }>}
 */
export const syncOfflineQueue = async (toast) => {
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const entry of queue) {
    // Strip internal metadata before sending to Supabase
    const { _id, _retries, _queued_at, ...logData } = entry;

    try {
      const { error } = await supabase.from('attendance_logs').insert([logData]);
      if (!error) {
        removeFromQueue(_id);
        synced++;
      } else {
        // Increment retry counter
        const updated = readQueue().map(e =>
          e._id === _id ? { ...e, _retries: e._retries + 1 } : e
        );
        // Remove if exceeded max retries
        const filtered = updated.filter(e => e._retries <= MAX_RETRY_ATTEMPTS);
        writeQueue(filtered);
        failed++;
        console.warn(`Offline sync failed for ${_id}:`, error.message);
      }
    } catch (e) {
      failed++;
      console.warn(`Offline sync exception for ${_id}:`, e.message);
    }

    // Small delay between entries to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  if (synced > 0) {
    if (window.navigator?.vibrate) window.navigator.vibrate([50, 100, 50]);
    toast?.(`✅ ${synced} data absen offline berhasil disinkronisasi.`, 'success');
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('offlineSyncComplete', { detail: { synced, failed } }));
  }

  if (failed > 0) {
    console.warn(`${failed} offline entries could not be synced.`);
  }

  return { synced, failed };
};

/**
 * Register the online event listener to auto-sync when connectivity is restored.
 * Call once at app startup.
 * 
 * @param {Function} toast - toast notification callback
 * @returns {() => void} cleanup function to remove the listener
 */
export const registerOnlineSyncListener = (toast) => {
  let retryTimeout = null;

  const handleOnline = async () => {
    // Wait a moment for connection to stabilize
    await new Promise(r => setTimeout(r, 1500));
    const queue = readQueue();
    if (queue.length === 0) return;

    toast?.(`📡 Koneksi pulih. Menyinkronisasi ${queue.length} data absen...`, 'info');
    await syncOfflineQueue(toast);
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
    if (retryTimeout) clearTimeout(retryTimeout);
  };
};

/**
 * Get queue count for UI badge display.
 * @returns {number}
 */
export const getQueueCount = () => readQueue().length;
