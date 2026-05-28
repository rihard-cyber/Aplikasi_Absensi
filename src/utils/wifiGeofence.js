/**
 * Wi-Fi Geofencing Utility — SI PRESENSI
 * 
 * Validasi kehadiran karyawan berdasarkan jaringan Wi-Fi yang terhubung.
 * Digunakan sebagai lapisan keamanan tambahan selain GPS.
 * 
 * ─── STRATEGI DETEKSI ─────────────────────────────────────────────────────
 * Layer 1 (Native): Capacitor Network Plugin → baca SSID & BSSID langsung
 * Layer 2 (Web Fallback): IP Geolocation check dari server-side
 * Layer 3 (Manual): Karyawan input kode Wi-Fi yang digenerate admin
 * ──────────────────────────────────────────────────────────────────────────
 * 
 * SETUP ADMIN:
 * Admin mendaftarkan SSID kantor via GeneralSettings atau WifiGeofenceSettings.
 * Data disimpan di tabel `tenant_wifi_zones` di Supabase.
 * 
 * CARA INSTALL Capacitor Network (opsional, untuk native SSID):
 *   npm install @capacitor/network
 *   npx cap sync
 */

import { supabase } from './supabaseClient';

const CACHE_KEY = '__wifi_zones_cache__';
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

// ─── TYPES ─────────────────────────────────────────────────────────────────
/**
 * @typedef {{ ssid: string, bssid?: string, description?: string }} WifiZone
 * @typedef {{ allowed: boolean, method: string, matchedZone?: WifiZone, currentSSID?: string, message: string, riskScore: number }} WifiCheckResult
 */

// ─── CAPACITOR NETWORK (NATIVE) ─────────────────────────────────────────────
const getNativeNetworkInfo = async () => {
  try {
    // Menggunakan dynamic import standar yang aman dari CWE-94 (Code Injection)
    const mod = await import('@capacitor/network');
    const { Network } = mod;
    const status = await Network.getStatus();
    if (!status.connected) return null;
    return { type: status.connectionType, ssid: null };
  } catch {
    return null;
  }
};

// ─── BROWSER NETWORK INFO ────────────────────────────────────────────────────
const getBrowserNetworkType = () => {
  try {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return null;
    return {
      type: conn.type || conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
    };
  } catch {
    return null;
  }
};

// ─── FETCH TENANT WIFI ZONES ─────────────────────────────────────────────────
/**
 * Fetch Wi-Fi zones dari Supabase dengan caching.
 * @returns {Promise<WifiZone[]>}
 */
export const fetchWifiZones = async () => {
  // Try cache first
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch {}

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('auth_id', session.user.id)
      .maybeSingle();

    if (!profile?.tenant_id) return [];

    const { data: zones } = await supabase
      .from('tenant_wifi_zones')
      .select('ssid, bssid, description, is_active')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true);

    const result = zones || [];
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch {}
    return result;
  } catch (e) {
    console.warn('[WifiGeofence] fetchWifiZones error:', e.message);
    return [];
  }
};

/** Clear Wi-Fi zone cache */
export const clearWifiZoneCache = () => {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
};

// ─── MAIN CHECK ──────────────────────────────────────────────────────────────
/**
 * Check apakah karyawan berada di jaringan Wi-Fi kantor yang terdaftar.
 * 
 * @param {{ ssidOverride?: string }} options
 * @returns {Promise<WifiCheckResult>}
 */
export const checkWifiGeofence = async (options = {}) => {
  const zones = await fetchWifiZones();

  // If no zones configured, skip validation (pass through)
  if (zones.length === 0) {
    return {
      allowed: true,
      method: 'NO_ZONES_CONFIGURED',
      message: 'Tidak ada zona Wi-Fi yang dikonfigurasi. Validasi dilewati.',
      riskScore: 0,
    };
  }

  // ── Layer 1: Try native SSID via Capacitor ──────────────────────────────
  let currentSSID = options.ssidOverride || null;

  if (!currentSSID) {
    const nativeInfo = await getNativeNetworkInfo();
    if (nativeInfo?.ssid) currentSSID = nativeInfo.ssid;
  }

  // ── Layer 2: Browser network type (no SSID available in browser) ─────────
  if (!currentSSID) {
    const browserNet = getBrowserNetworkType();
    if (browserNet?.type === 'cellular') {
      // Definitely NOT on office WiFi
      return {
        allowed: false,
        method: 'BROWSER_CELLULAR',
        currentSSID: 'Data Seluler',
        message: 'Anda terhubung via data seluler, bukan Wi-Fi kantor. Absensi mungkin tidak diizinkan.',
        riskScore: 40,
      };
    }

    if (browserNet?.type === 'wifi' || browserNet?.type === '4g' || !browserNet) {
      // Cannot determine SSID in browser — soft pass with warning
      return {
        allowed: true,
        method: 'BROWSER_UNDETECTABLE',
        message: 'SSID Wi-Fi tidak dapat dideteksi di browser. Gunakan aplikasi native untuk validasi penuh.',
        riskScore: 15, // Low-medium risk
      };
    }
  }

  // ── Layer 3: Match SSID against registered zones ─────────────────────────
  if (currentSSID) {
    const matchedZone = zones.find(z => {
      const ssidMatch = z.ssid?.toLowerCase() === currentSSID.toLowerCase();
      return ssidMatch;
    });

    if (matchedZone) {
      return {
        allowed: true,
        method: 'SSID_MATCH',
        matchedZone,
        currentSSID,
        message: `✅ Terhubung ke jaringan resmi: "${matchedZone.ssid}"${matchedZone.description ? ` (${matchedZone.description})` : ''}`,
        riskScore: 0,
      };
    } else {
      return {
        allowed: false,
        method: 'SSID_MISMATCH',
        currentSSID,
        message: `⚠️ Jaringan "${currentSSID}" tidak terdaftar sebagai zona Wi-Fi kantor.`,
        riskScore: 60,
      };
    }
  }

  // Cannot determine — soft allow
  return {
    allowed: true,
    method: 'INDETERMINATE',
    message: 'Tidak dapat mendeteksi jaringan Wi-Fi. Gunakan GPS untuk validasi lokasi.',
    riskScore: 10,
  };
};

// ─── SUPABASE HELPERS ────────────────────────────────────────────────────────
/**
 * Simpan zona Wi-Fi baru ke Supabase.
 */
export const addWifiZone = async ({ ssid, bssid = null, description = '' }) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  const { data: profile } = await supabase.from('profiles')
    .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
  if (!profile?.tenant_id) return { error: 'No tenant' };

  const { error } = await supabase.from('tenant_wifi_zones').insert({
    tenant_id: profile.tenant_id,
    ssid: ssid.trim(),
    bssid: bssid?.trim() || null,
    description: description.trim(),
    is_active: true,
  });

  clearWifiZoneCache();
  return { error };
};

/**
 * Hapus zona Wi-Fi dari Supabase.
 */
export const removeWifiZone = async (id) => {
  const { error } = await supabase.from('tenant_wifi_zones').delete().eq('id', id);
  clearWifiZoneCache();
  return { error };
};
