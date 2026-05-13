import { supabase } from './supabaseClient';

const SUSPICIOUS_ACCURACY = 5;
const MAX_ACCURACY = 100;
const MAX_SPEED_KMH = 150;

export const analyzePosition = (position) => {
  const flags = [];

  if (!position || !position.coords) {
    return { isMocked: true, flags: ['NO_POSITION'], reason: 'Tidak ada data lokasi' };
  }

  const { coords } = position;

  if (position.mocked === true) {
    flags.push('MOCKED_FLAG');
  }

  if (coords.accuracy !== undefined && coords.accuracy !== null) {
    if (coords.accuracy < SUSPICIOUS_ACCURACY && coords.accuracy > 0) {
      flags.push('UNREALISTIC_ACCURACY');
    }
    if (coords.accuracy > MAX_ACCURACY) {
      flags.push('LOW_ACCURACY');
    }
  }

  if (coords.speed !== undefined && coords.speed !== null && coords.speed >= 0) {
    const speedKmh = coords.speed * 3.6;
    if (speedKmh > MAX_SPEED_KMH) {
      flags.push('IMPOSSIBLE_SPEED');
    }
  }

  if (coords.altitude !== undefined && coords.altitude !== null) {
    if (coords.altitude > 9000) {
      flags.push('IMPOSSIBLE_ALTITUDE');
    }
  }

  return {
    isMocked: flags.length > 0,
    flags,
    reason: flags.length > 0 ? `Fake GPS terdeteksi: ${flags.join(', ')}` : null
  };
};

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
        timestamp: new Date().toISOString()
      })
    });
    if (error) console.error('Gagal log fake GPS:', error);
  } catch (e) {
    console.error('Gagal log fake GPS:', e);
  }
};
