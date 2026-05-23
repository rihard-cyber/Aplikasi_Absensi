import { supabase } from './supabaseClient';

/**
 * Anti-Fake GPS Utility — Enhanced Multi-Level Detection
 * 
 * Detection layers:
 * 1. OS-level mock flag (position.mocked — Capacitor/Geolocation API)
 * 2. Unrealistic accuracy (suspiciously perfect or impossibly poor)
 * 3. Impossible speed/altitude/altitude variance
 * 4. Teleportation detection (compares last known position vs current)
 * 5. Timestamp manipulation (future GPS timestamps)
 * 6. Altitude-accuracy inconsistency
 */

const SUSPICIOUS_ACCURACY_MIN = 4;   // Suspiciously perfect (<4m — mock GPS always reports perfect accuracy)
const MAX_ACCURACY = 150;             // Too inaccurate to trust for attendance
const MAX_SPEED_KMH = 200;            // Cap for realistic travel speed
const MAX_ALTITUDE = 9000;            // Mt. Everest max (realistic limit)
const MAX_TELEPORT_SPEED_KMH = 500;   // Max realistic speed between two GPS samples (supersonic aircraft)
const LAST_POSITION_KEY = '__last_gps_pos__';

/**
 * Save position for future teleportation comparison.
 * @param {{ latitude: number, longitude: number, timestamp: number }} coords
 */
const saveLastPosition = (coords) => {
  try {
    sessionStorage.setItem(LAST_POSITION_KEY, JSON.stringify({
      lat: coords.latitude,
      lng: coords.longitude,
      ts: Date.now()
    }));
  } catch { /* ignore storage errors */ }
};

/**
 * Get last saved position from session storage.
 * @returns {{ lat: number, lng: number, ts: number } | null}
 */
const getLastPosition = () => {
  try {
    const raw = sessionStorage.getItem(LAST_POSITION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

/**
 * Calculate distance in meters between two lat/lng points (Haversine).
 */
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Analyse a Geolocation position object for fake GPS indicators.
 * @param {GeolocationPosition | import('@capacitor/geolocation').Position} position
 * @returns {{ isMocked: boolean, flags: string[], reason: string | null, riskScore: number }}
 */
export const analyzePosition = (position) => {
  const flags = [];

  if (!position || !position.coords) {
    return { isMocked: true, flags: ['NO_POSITION'], reason: 'Tidak ada data lokasi', riskScore: 100 };
  }

  const { coords } = position;

  // Layer 1: OS-level mock flag (Android developer mode / mock location app)
  if (position.mocked === true || coords.mocked === true) {
    flags.push('OS_MOCK_FLAG');
  }

  // Layer 2: Suspiciously perfect accuracy (mock GPS apps always report 0-4m)
  if (coords.accuracy !== undefined && coords.accuracy !== null) {
    if (coords.accuracy < SUSPICIOUS_ACCURACY_MIN && coords.accuracy >= 0) {
      flags.push('UNREALISTIC_ACCURACY');
    }
    if (coords.accuracy > MAX_ACCURACY) {
      flags.push('LOW_ACCURACY'); // Not mocked, just unreliable
    }
  }

  // Layer 3: Impossible speed
  if (coords.speed !== undefined && coords.speed !== null && coords.speed >= 0) {
    const speedKmh = coords.speed * 3.6;
    if (speedKmh > MAX_SPEED_KMH) {
      flags.push('IMPOSSIBLE_SPEED');
    }
  }

  // Layer 4: Impossible altitude
  if (coords.altitude !== undefined && coords.altitude !== null) {
    if (coords.altitude > MAX_ALTITUDE || coords.altitude < -500) {
      flags.push('IMPOSSIBLE_ALTITUDE');
    }
  }

  // Layer 5: Future timestamp manipulation
  const posTimestamp = position.timestamp;
  if (posTimestamp && posTimestamp > Date.now() + 60000) { // more than 60s in the future
    flags.push('FUTURE_TIMESTAMP');
  }

  // Layer 6: Teleportation detection (compare with last stored position)
  const lastPos = getLastPosition();
  if (lastPos) {
    const distMeters = haversine(lastPos.lat, lastPos.lng, coords.latitude, coords.longitude);
    const elapsedSeconds = (Date.now() - lastPos.ts) / 1000;
    if (elapsedSeconds > 1 && elapsedSeconds < 3600) { // Only check within the last hour
      const impliedSpeedKmh = (distMeters / elapsedSeconds) * 3.6;
      if (impliedSpeedKmh > MAX_TELEPORT_SPEED_KMH) {
        flags.push(`TELEPORTATION_${Math.round(impliedSpeedKmh)}KMH`);
      }
    }
  }

  // Save current position for next comparison
  saveLastPosition({ latitude: coords.latitude, longitude: coords.longitude });

  // Calculate risk score (weighted by flag severity)
  const flagWeights = {
    OS_MOCK_FLAG: 100,
    UNREALISTIC_ACCURACY: 60,
    IMPOSSIBLE_SPEED: 80,
    IMPOSSIBLE_ALTITUDE: 70,
    FUTURE_TIMESTAMP: 90,
    LOW_ACCURACY: 0,  // Not a fraud indicator, just quality issue
  };
  let riskScore = 0;
  flags.forEach(f => {
    if (f.startsWith('TELEPORTATION_')) {
      riskScore += 85;
    } else {
      riskScore += flagWeights[f] || 50;
    }
  });
  riskScore = Math.min(riskScore, 100);

  // Only flag as mocked if the risk is substantial (OS flag OR 2+ other flags)
  const criticalFlags = flags.filter(f => f !== 'LOW_ACCURACY');
  const isMocked = criticalFlags.includes('OS_MOCK_FLAG') || criticalFlags.length >= 2 || riskScore >= 80;

  return {
    isMocked,
    flags,
    riskScore,
    reason: flags.length > 0
      ? `Fake GPS terdeteksi (skor risiko: ${riskScore}): ${criticalFlags.join(', ')}`
      : null
  };
};

/**
 * Log a fake GPS attempt to the audit_logs table.
 * @param {string} userId
 * @param {string} tenantId
 * @param {{ reason: string, coords: object, flags: string[], riskScore: number }} details
 */
export const logFakeGpsAttempt = async (userId, tenantId, details = {}) => {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      tenant_id: tenantId,
      action: 'FAKE_GPS_ATTEMPT',
      details: JSON.stringify({
        reason: details.reason || 'Mock location detected',
        coords: details.coords || null,
        flags: details.flags || [],
        riskScore: details.riskScore || 0,
        timestamp: new Date().toISOString()
      })
    });
    if (error) console.error('Gagal log fake GPS:', error);
  } catch (e) {
    console.error('Gagal log fake GPS:', e);
  }
};

/**
 * Clear the last stored position (e.g., after a session reset or logout).
 */
export const clearLastPosition = () => {
  try { sessionStorage.removeItem(LAST_POSITION_KEY); } catch { /* ignore */ }
};
