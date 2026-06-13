import { createClient } from '@supabase/supabase-js';
import supabaseConfig, { isSupabaseConfigured } from './supabaseConfig';

let supabase = null;

export const initSupabase = () => {
  if (supabase) return supabase;
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] Tidak dikonfigurasi — fallback ke localStorage');
    return null;
  }
  try {
    supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    console.log('[Supabase] Terhubung:', supabaseConfig.url);
  } catch (e) {
    console.warn('[Supabase] Gagal init:', e);
    supabase = null;
  }
  return supabase;
};

// ─── Helpers: snake_case ↔ camelCase ───
function toSnake(str) {
  return str.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}

function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeDoc(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  if (doc instanceof Date) return doc.toISOString();
  if (Array.isArray(doc)) return doc.map(normalizeDoc);
  const { supabase_id, ...rest } = doc;
  const result = { supabaseId: supabase_id, firebaseId: supabase_id };
  for (const [key, value] of Object.entries(rest)) {
    result[toCamel(key)] = normalizeDoc(value);
  }
  return result;
}

const KNOWN_TABLE_COLUMNS = {
  users: new Set(['id', 'nrp', 'nama', 'jabatan', 'regu', 'avatar', 'status', 'email', 'nomor_hp', 'last_active', 'firebase_saved_at', 'created_at', 'updated_at']),
  patrol_reports: new Set(['id', 'user_id', 'user_name', 'nrp', 'nomor_hp', 'shift', 'regu', 'area_id', 'gedung', 'lantai', 'zona', 'titik', 'kondisi', 'keterangan', 'foto', 'severity', 'timestamp', 'timestamp_end', 'date', 'time', 'kategori', 'kode_temuan', 'temuan', 'status', 'anti_fraud', 'jabatan', 'created_at', 'firebase_saved_at', 'updated_at']),
  findings: new Set(['id', 'report_id', 'kategori', 'area', 'tanggal', 'pelapor', 'nrp', 'nomor_hp', 'shift', 'regu', 'status', 'severity', 'detail', 'foto', 'department', 'wa_status', 'wa_sent_at', 'created_at', 'firebase_saved_at', 'updated_at']),
  attendance_logs: new Set(['id', 'tanggal', 'shift', 'regu', 'details', 'created_at', 'firebase_saved_at', 'updated_at']),
  mutasi_logs: new Set(['id', 'tanggal', 'shift', 'regu', 'waktu', 'tanggal_kejadian', 'jam_kejadian', 'lokasi', 'uraian', 'kategori', 'foto', 'petugas', 'nrp', 'nomor_hp', 'tindak_lanjut', 'pelapor', 'anti_fraud', 'petugas_masuk', 'petugas_keluar', 'catatan', 'created_at', 'firebase_saved_at', 'updated_at']),
  complaints: new Set(['id', 'ticket_id', 'name', 'phone', 'tenant', 'floor', 'location', 'category', 'description', 'department', 'status', 'remarks', 'wa_status', 'wa_sent_at', 'photos', 'history', 'created_at', 'firebase_saved_at', 'updated_at']),
  areas: new Set(['id', 'gedung', 'lantai', 'nomor_titik', 'zona', 'titik', 'qr_code', 'created_at', 'firebase_saved_at', 'updated_at']),
  pos_list: new Set(['id', 'lantai', 'titik', 'keterangan', 'kode', 'created_at', 'firebase_saved_at', 'updated_at']),
  rosters: new Set(['year_month', 'roster_data', 'updated_by', 'created_at', 'updated_at']),
  config: new Set(['key', 'data', 'updated_at']),
};

function prepareData(data, tableName) {
  const { supabaseId, firebaseId, ...rest } = data || {};
  const result = {};
  const allowed = KNOWN_TABLE_COLUMNS[tableName];
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined) continue;
    const snakeKey = toSnake(key);
    if (allowed && !allowed.has(snakeKey)) continue;
    result[snakeKey] = value;
  }
  return result;
}

// ─── Factory: real-time subscriber ───
const createSubscriber = (tableName, callback, orderField = 'created_at', opts = {}) => {
  const client = initSupabase();
  if (!client) { callback(null); return () => {}; }

  let unsubscribed = false;
  const channelName = `${tableName}-changes-${Date.now()}`;

  const fetchData = async () => {
    if (unsubscribed) return;
    let query = client.from(tableName).select('*');
    const orderCol = toSnake(orderField);
    query = query.order(orderCol, { ascending: false, nullsFirst: false });
    if (opts.limit) query = query.limit(opts.limit);

    const { data, error } = await query;
    if (error) {
      console.warn(`[Supabase] Gagal baca ${tableName}:`, error);
      callback(null);
      return;
    }
    callback((data || []).map(normalizeDoc));
  };

  fetchData();

  const channel = client.channel(channelName)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      () => { fetchData(); }
    )
    .subscribe();

  return () => {
    unsubscribed = true;
    client.removeChannel(channel);
  };
};

// ─── Factory: CRUD ───
const createAdder = (tableName) => async (data) => {
  const client = initSupabase();
  if (!client) return null;
  const dbData = prepareData(data, tableName);
  if (!dbData.created_at) dbData.created_at = new Date().toISOString();
  dbData.firebase_saved_at = new Date().toISOString();

  // Coba upsert dulu (jika UNIQUE constraint ada di DB)
  // Jika gagal karena constraint tidak ada, fallback ke insert biasa
  try {
    if (dbData.id) {
      // Cek apakah record dengan id ini sudah ada
      const { data: existing } = await client
        .from(tableName)
        .select('supabase_id')
        .eq('id', dbData.id)
        .maybeSingle();

      if (existing) {
        // Update record yang sudah ada
        const { data: updated, error: updateErr } = await client
          .from(tableName)
          .update(dbData)
          .eq('id', dbData.id)
          .select('supabase_id')
          .single();
        if (updateErr) throw updateErr;
        return updated?.supabase_id;
      }
    }

    // Insert baru
    const { data: result, error } = await client
      .from(tableName)
      .insert(dbData)
      .select('supabase_id')
      .single();
    if (error) throw error;
    return result?.supabase_id;
  } catch (e) {
    // Jika insert duplikat (race condition), anggap sukses
    if (e?.code === '23505') {
      console.warn(`[Supabase] Duplicate ${tableName}.id — skipped:`, dbData.id);
      return null;
    }
    throw e;
  }
};


const createUpdater = (tableName) => async (supabaseId, updates) => {
  const client = initSupabase();
  if (!client) return;
  try {
    const dbData = prepareData(updates, tableName);
    dbData.updated_at = new Date().toISOString();
    await client.from(tableName).update(dbData).eq('supabase_id', supabaseId);
  } catch (e) {
    console.warn(`[Supabase] Gagal update ${tableName}:`, e);
  }
};

const createDeleter = (tableName) => async (supabaseId) => {
  const client = initSupabase();
  if (!client) return;
  const { error } = await client.from(tableName).delete().eq('supabase_id', supabaseId);
  if (error) throw error;
};

const createLoader = (tableName, orderField = 'created_at') => async () => {
  const client = initSupabase();
  if (!client) return null;
  try {
    const orderCol = toSnake(orderField);
    const { data, error } = await client.from(tableName).select('*').order(orderCol, { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data || []).map(normalizeDoc);
  } catch (e) {
    console.warn(`[Supabase] Gagal load ${tableName}:`, e);
    return null;
  }
};

// ─── Factory: bulk operations ───
const createBulkDeleter = (tableName) => async () => {
  const client = initSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from(tableName).delete().neq('supabase_id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn(`[Supabase] Gagal hapus semua ${tableName}:`, e);
    return false;
  }
};

// ─── Complaints ───
export const subscribeComplaints = (callback, opts = {}) =>
  createSubscriber('complaints', callback, 'created_at', opts);
export const addComplaintToFirestore = createAdder('complaints');
export const updateComplaintInFirestore = createUpdater('complaints');
export const deleteComplaintFromFirestore = createDeleter('complaints');
export const loadAllComplaintsFromFirestore = createLoader('complaints');

// ─── Patrol Reports ───
export const subscribeReports = (callback, opts = {}) =>
  createSubscriber('patrol_reports', callback, 'timestamp', opts);
export const addReportToFirestore = createAdder('patrol_reports');
export const updateReportInFirestore = createUpdater('patrol_reports');
export const deleteReportFromFirestore = createDeleter('patrol_reports');

// ─── Findings ───
export const subscribeFindings = (callback, opts = {}) =>
  createSubscriber('findings', callback, 'created_at', opts);
export const addFindingToFirestore = createAdder('findings');
export const updateFindingInFirestore = createUpdater('findings');
export const deleteFindingFromFirestore = createDeleter('findings');

// ─── Attendance Logs ───
export const subscribeAttendanceLogs = (callback, opts = {}) =>
  createSubscriber('attendance_logs', callback, 'tanggal', opts);
export const addAttendanceLogToFirestore = createAdder('attendance_logs');
export const updateAttendanceLogInFirestore = createUpdater('attendance_logs');
export const deleteAttendanceLogFromFirestore = createDeleter('attendance_logs');

// ─── Mutasi Logs ───
export const subscribeMutasiLogs = (callback, opts = {}) =>
  createSubscriber('mutasi_logs', callback, 'created_at', opts);
export const addMutasiLogToFirestore = createAdder('mutasi_logs');
export const updateMutasiLogInFirestore = createUpdater('mutasi_logs');
export const deleteMutasiLogFromFirestore = createDeleter('mutasi_logs');

// ─── Users ───
export const subscribeUsers = (callback, opts = {}) =>
  createSubscriber('users', callback, 'nrp', opts);
export const addUserToFirestore = createAdder('users');
export const updateUserInFirestore = createUpdater('users');
export const deleteUserFromFirestore = createDeleter('users');

export const resetUsersInFirestore = async (defaultUsers) => {
  const client = initSupabase();
  if (!client) return false;
  try {
    await client.from('users').delete().neq('supabase_id', '00000000-0000-0000-0000-000000000000');
    for (const u of defaultUsers) {
      const { firebaseId, ...userData } = u;
      const dbData = prepareData(userData, 'users');
      dbData.created_at = new Date().toISOString();
      dbData.firebase_saved_at = new Date().toISOString();
      const { error } = await client.from('users').insert(dbData);
      if (error) console.warn('[Supabase] Gagal insert user:', error);
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Gagal reset users:', e);
    return false;
  }
};

// ─── Areas / Checkpoints ───
export const subscribeAreas = (callback, opts = {}) =>
  createSubscriber('areas', callback, 'created_at', opts);
export const addAreaToFirestore = createAdder('areas');
export const updateAreaInFirestore = createUpdater('areas');
export const deleteAreaFromFirestore = createDeleter('areas');

// ─── Pos List ───
export const subscribePosList = (callback, opts = {}) =>
  createSubscriber('pos_list', callback, 'created_at', opts);
export const addPosToFirestore = createAdder('pos_list');
export const updatePosInFirestore = createUpdater('pos_list');
export const deletePosFromFirestore = createDeleter('pos_list');

// ─── WA Contacts (single row in config table) ───
export const subscribeWAContacts = (callback) => {
  const client = initSupabase();
  if (!client) { callback(null); return () => {}; }
  let unsubscribed = false;
  const channelName = `wa-contacts-${Date.now()}`;

  const fetchWA = async () => {
    if (unsubscribed) return;
    const { data, error } = await client.from('config').select('*').eq('key', 'wa_contacts').single();
    if (error) { callback(null); return; }
    callback(data?.data || null);
  };

  fetchWA();

  const channel = client.channel(channelName)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'config', filter: `key=eq.wa_contacts` },
      () => { fetchWA(); }
    )
    .subscribe();

  return () => {
    unsubscribed = true;
    client.removeChannel(channel);
  };
};

export const saveWAContactsToFirestore = async (contacts) => {
  const client = initSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('config').upsert({
      key: 'wa_contacts',
      data: contacts,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[Supabase] Gagal simpan WA contacts:', e);
    return false;
  }
};

// ─── Roster ───
export const saveRosterToFirestore = async (yearMonth, rosterData, userId) => {
  const client = initSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('rosters').upsert({
      year_month: yearMonth,
      roster_data: rosterData,
      updated_by: userId || 'unknown',
      updated_at: new Date().toISOString()
    }, { onConflict: 'year_month' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[Supabase] Gagal simpan roster:', e);
    return false;
  }
};

export const loadRosterFromFirestore = async (yearMonth) => {
  const client = initSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client.from('rosters').select('*').eq('year_month', yearMonth).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.roster_data || null;
  } catch (e) {
    console.warn('[Supabase] Gagal baca roster:', e);
    return null;
  }
};

export const subscribeRoster = (yearMonth, callback) => {
  const client = initSupabase();
  if (!client) { callback(null); return () => {}; }
  let unsubscribed = false;
  const channelName = `roster-${yearMonth}-${Date.now()}`;

  const fetchRoster = async () => {
    if (unsubscribed) return;
    const { data, error } = await client.from('rosters').select('*').eq('year_month', yearMonth).single();
    if (error && error.code !== 'PGRST116') { callback(null); return; }
    callback(data?.roster_data || null);
  };

  fetchRoster();

  const channel = client.channel(channelName)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'rosters', filter: `year_month=eq.${yearMonth}` },
      () => { fetchRoster(); }
    )
    .subscribe();

  return () => {
    unsubscribed = true;
    client.removeChannel(channel);
  };
};

// ─── Bulk Operations ───
export const clearAllPatrolDataInFirestore = async () => {
  const client = initSupabase();
  if (!client) return false;
  const tables = ['patrol_reports', 'findings', 'mutasi_logs', 'attendance_logs', 'complaints'];
  try {
    for (const table of tables) {
      const { error } = await client.from(table).delete().neq('supabase_id', '00000000-0000-0000-0000-000000000000');
      if (error) console.warn(`[Supabase] Gagal hapus ${table}:`, error);
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Gagal membersihkan data:', e);
    return false;
  }
};

export const deleteOldDataInFirestore = async (olderThanDays = 90) => {
  const client = initSupabase();
  if (!client) return { success: false, count: 0 };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffStr = cutoff.toISOString();
  const collections = [
    { name: 'patrol_reports', dateField: 'timestamp' },
    { name: 'findings', dateField: 'created_at' },
    { name: 'mutasi_logs', dateField: 'created_at' },
    { name: 'attendance_logs', dateField: 'tanggal' },
    { name: 'complaints', dateField: 'created_at' }
  ];
  let totalDeleted = 0;
  try {
    for (const { name, dateField } of collections) {
      const { data, error } = await client.from(name).select('supabase_id,' + dateField);
      if (error) continue;
      const toDelete = (data || []).filter(row => {
        const dateVal = row[dateField];
        if (!dateVal) return false;
        return new Date(dateVal) < cutoff;
      }).map(row => row.supabase_id);
      if (toDelete.length > 0) {
        const { error: delError } = await client.from(name).delete().in('supabase_id', toDelete);
        if (!delError) totalDeleted += toDelete.length;
      }
    }
    return { success: true, count: totalDeleted };
  } catch (e) {
    console.warn('[Supabase] Gagal hapus data lama:', e);
    return { success: false, count: totalDeleted };
  }
};

// ─── Storage: Photo Upload ───
const PHOTO_BUCKET = 'photos';

export const uploadPhoto = async (base64Str, filePath) => {
  const client = initSupabase();
  if (!client) return base64Str;
  try {
    const res = await fetch(base64Str);
    const blob = await res.blob();
    const { error } = await client.storage.from(PHOTO_BUCKET).upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (error) throw error;
    const { data: urlData } = client.storage.from(PHOTO_BUCKET).getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (e) {
    console.warn('[Supabase] Gagal upload foto, fallback base64:', e);
    return base64Str;
  }
};
