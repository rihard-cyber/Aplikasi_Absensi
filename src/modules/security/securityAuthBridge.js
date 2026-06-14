/**
 * Bridge auth SaaS → model user JDC.
 * Tidak mengubah session Supabase absensi — hanya mapping profil untuk UI JDC embedded.
 */
import { supabase } from '../../utils/supabaseClient';

const ROLE_TO_JABATAN = {
  SUPER_ADMIN: 'Admin Super',
  TENANT_ADMIN: 'Admin Super',
  SUB_ADMIN: 'SPV',
  EMPLOYEE: 'Anggota',
};

const POSITION_KEYWORDS = [
  { keys: ['admin super', 'super admin'], jabatan: 'Admin Super' },
  { keys: ['manajemen', 'manager', 'supervisor', 'spv'], jabatan: 'Manajemen' },
  { keys: ['danru', 'dan regu'], jabatan: 'Danru' },
  { keys: ['wadanru', 'wakil danru'], jabatan: 'Wadanru' },
  { keys: ['bko'], jabatan: 'BKO' },
  { keys: ['guest'], jabatan: 'Guest Viewer' },
  { keys: ['middle 1', 'md1'], jabatan: 'Middle 1' },
  { keys: ['middle 2', 'md2'], jabatan: 'Middle 2' },
  { keys: ['kh', 'khusus'], jabatan: 'KH (Khusus)' },
];

function mapPositionToJabatan(position, role) {
  const p = (position || '').toLowerCase().trim();
  for (const { keys, jabatan } of POSITION_KEYWORDS) {
    if (keys.some((k) => p.includes(k))) return jabatan;
  }
  return ROLE_TO_JABATAN[(role || '').toUpperCase()] || 'Anggota';
}

/**
 * @param {object} profile
 * @param {object|null} securityPos
 * @returns {object} JDC user shape
 */
export function profileToJdcUser(profile, securityPos = null) {
  if (!profile) return null;
  const role = (profile.role || 'EMPLOYEE').toUpperCase();
  const jabatan = securityPos?.jabatan || mapPositionToJabatan(profile.position, role);
  const regu = securityPos?.regu || '';

  return {
    id: profile.id,
    nrp: profile.nip || String(profile.id).slice(0, 8).toUpperCase(),
    nama: profile.full_name || 'User',
    jabatan,
    regu,
    avatar: profile.avatar_url || '',
    status: 'Aktif',
    email: profile.email || '',
    nomorHp: profile.phone || '',
    _saasProfileId: profile.id,
    _tenantId: profile.tenant_id,
    _saasRole: role,
  };
}

/**
 * Resolve profil SaaS aktif → user JDC (tanpa login PIN kedua).
 */
export async function resolveSaasJdcUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, nip, position, role, tenant_id, avatar_url, phone, division_id, divisions(name)')
    .eq('auth_id', session.user.id)
    .maybeSingle();

  if (error || !profile) return null;

  let securityPos = null;
  try {
    const { data, error: posErr } = await supabase
      .from('security_positions')
      .select('jabatan, regu, is_active')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .maybeSingle();
    if (!posErr && data) securityPos = data;
  } catch {
    // Tabel belum dimigrasi — fallback ke mapping position/role
  }

  return profileToJdcUser(profile, securityPos);
}

export default resolveSaasJdcUser;
