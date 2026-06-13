// ─── Roster Data Engine ─────────────────────────────────────────────────────
// Menyimpan jadwal bulanan individu (bukan per regu).
// Format key localStorage: smpjdc_roster_YYYY-MM
// Format data: { [userId]: { [date: 'YYYY-MM-DD']: shiftCode } }
//
// Cloud sync: otomatis sync ke Firebase Firestore (collection 'rosters')
// saat user menyimpan, dan fallback baca dari cloud saat init.

const LS_KEY_PREFIX = 'smpjdc_roster_';

// ── Definisi semua kode shift yang valid ──────────────────────────────────────
export const SHIFT_CODES = {
  P:   { label: 'Pagi',      jam: '06:00 - 14:00', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  S:   { label: 'Siang',     jam: '14:00 - 22:00', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  M:   { label: 'Malam',     jam: '22:00 - 06:00', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  MD1: { label: 'Middle 1',  jam: '10:00 - 18:00', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  MD2: { label: 'Middle 2',  jam: '11:30 - 19:30', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  KH1: { label: 'Khusus 1',  jam: '08:00 - 17:00', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  KH2: { label: 'Khusus 2',  jam: '10:00 - 19:00', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  BKO: { label: 'BKO',       jam: '20:00 - 05:00', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  X:   { label: 'Libur / Off', jam: '-',            color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
};

// ── Baca roster untuk bulan tertentu ─────────────────────────────────────────
// returns { [userId]: { [dateStr]: shiftCode } }
export function getRoster(yearMonth) {
  try {
    const saved = localStorage.getItem(LS_KEY_PREFIX + yearMonth);
    if (!saved) return {};
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

// ── Simpan roster untuk bulan tertentu ───────────────────────────────────────
export function saveRoster(yearMonth, data) {
  try {
    localStorage.setItem(LS_KEY_PREFIX + yearMonth, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// ── Set kode shift untuk satu user di satu tanggal ───────────────────────────
export function setUserShift(yearMonth, userId, dateStr, shiftCode) {
  const roster = getRoster(yearMonth);
  if (!roster[userId]) roster[userId] = {};
  if (shiftCode === null || shiftCode === undefined) {
    delete roster[userId][dateStr];
  } else {
    roster[userId][dateStr] = shiftCode;
  }
  saveRoster(yearMonth, roster);
}

// ── Ambil kode shift user pada tanggal tertentu ──────────────────────────────
export function getUserShiftOnDate(yearMonth, userId, dateStr) {
  const roster = getRoster(yearMonth);
  return roster[userId]?.[dateStr] || null;
}

// ── Ambil semua user yang jadwalnya sesuai kode di satu tanggal ──────────────
// Returns array of { userId, shiftCode }
export function getUsersByShiftOnDate(yearMonth, dateStr, shiftCodeFilter = null) {
  const roster = getRoster(yearMonth);
  const result = [];
  Object.entries(roster).forEach(([userId, dates]) => {
    const code = dates[dateStr];
    if (!code || code === 'X') return;
    if (shiftCodeFilter && code !== shiftCodeFilter) return;
    result.push({ userId: parseInt(userId, 10) || userId, shiftCode: code });
  });
  return result;
}

// ── Ambil semua shift yang aktif di satu tanggal (unik) ─────────────────────
export function getActiveShiftsOnDate(yearMonth, dateStr) {
  const roster = getRoster(yearMonth);
  const shifts = new Set();
  Object.values(roster).forEach(dates => {
    const code = dates[dateStr];
    if (code && code !== 'X') shifts.add(code);
  });
  return Array.from(shifts);
}

// ── Helper: format YYYY-MM dari Date ─────────────────────────────────────────
export function getYearMonth(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ── Helper: generate array tanggal dari suatu bulan ─────────────────────────
export function getDatesInMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    return `${year}-${String(month).padStart(2, '0')}-${d}`;
  });
}

// ── Cloud Sync dengan Firebase ──────────────────────────────────────────────
export async function saveRosterWithCloud(yearMonth, data, userId) {
  saveRoster(yearMonth, data);
  try {
    const { saveRosterToFirestore } = await import('../utils/supabase');
    await saveRosterToFirestore(yearMonth, data, userId);
  } catch (e) {
    // Firebase tidak dikonfigurasi — tidak masalah
  }
}

export async function loadRosterWithCloud(yearMonth) {
  try {
    const { loadRosterFromFirestore } = await import('../utils/supabase');
    const cloud = await loadRosterFromFirestore(yearMonth);
    if (cloud) {
      const local = getRoster(yearMonth);
      const merged = { ...cloud };
      Object.entries(local).forEach(([uid, dates]) => {
        if (!merged[uid]) merged[uid] = {};
        Object.entries(dates).forEach(([d, c]) => { merged[uid][d] = c; });
      });
      saveRoster(yearMonth, merged);
      return merged;
    }
  } catch (e) {
    // Firebase tidak dikonfigurasi
  }
  return getRoster(yearMonth);
}

// ── Dynamic load SheetJS library ────────────────────────────────────────────
function loadXLSX() {
  if (typeof XLSX !== 'undefined') return Promise.resolve(XLSX);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.onload = () => resolve(XLSX);
    s.onerror = () => reject(new Error('Gagal memuat library Excel'));
    document.head.appendChild(s);
  });
}

// ── Parse uploaded Excel file into roster data ──────────────────────────────
export async function parseExcelToRoster(file, users) {
  const XLSX = await loadXLSX();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (rows.length === 0) throw new Error('File Excel kosong');

  const headers = Object.keys(rows[0]);
  const nrpKey = headers.find(h => /nrp|nik|nip|^id$/i.test(h)) || headers[0];
  const namaKey = headers.find(h => /nama|name/i.test(h)) || (headers.length > 1 ? headers[1] : null);
  const dateKeys = headers.filter(h => {
    if (h === nrpKey || h === namaKey) return false;
    if (/^\d{1,2}$/.test(h.trim())) return true;
    if (/^\d{4}-\d{2}-\d{2}$/.test(h.trim())) return true;
    return false;
  });
  if (dateKeys.length === 0) throw new Error('Tidak ditemukan kolom tanggal (header angka 1-31)');

  let year = new Date().getFullYear(), month = new Date().getMonth() + 1;
  const fullDateSample = dateKeys.find(h => /^\d{4}-\d{2}-\d{2}$/.test(h));
  if (fullDateSample) {
    const p = fullDateSample.split('-').map(Number);
    year = p[0]; month = p[1];
  }
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  const dateMap = {};
  dateKeys.forEach(h => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(h)) dateMap[h] = h;
    else dateMap[h] = `${yearMonth}-${String(parseInt(h, 10)).padStart(2, '0')}`;
  });

  const userByNrp = {};
  users.forEach(u => { if (u.nrp) userByNrp[String(u.nrp).trim()] = u; });

  const roster = {};
  const errors = [];
  let matched = 0;

  rows.forEach((row, i) => {
    const nrp = String(row[nrpKey] || '').trim();
    const nama = String(row[namaKey] || '').trim();
    if (!nrp && !nama) { errors.push(`Baris ${i + 2}: kosong`); return; }
    let user = userByNrp[nrp];
    if (!user) user = users.find(u => u.nama.toLowerCase() === nama.toLowerCase());
    if (!user) { errors.push(`Baris ${i + 2}: "${nrp || nama}" tidak ditemukan`); return; }
    matched++;
    const uid = String(user.id);
    if (!roster[uid]) roster[uid] = {};
    dateKeys.forEach(h => {
      const val = String(row[h] || '').trim().toUpperCase();
      if (val && val !== '-' && val !== '') roster[uid][dateMap[h]] = val;
    });
  });

  return { yearMonth, rosterData: roster, errors, totalRows: rows.length, matchedRows: matched };
}

// ── Download Excel template ─────────────────────────────────────────────────
export async function downloadExcelTemplate(yearMonth, users) {
  const XLSX = await loadXLSX();
  const [year, month] = yearMonth.split('-').map(Number);
  const days = new Date(year, month, 0).getDate();

  const headers = ['NRP', 'Nama'];
  for (let d = 1; d <= days; d++) headers.push(String(d));

  const fieldUsers = users.filter(u =>
    ['Danru', 'Wadanru', 'Anggota', 'BKO', 'KH (Khusus)'].includes(u.jabatan)
  );

  const data = [headers];
  fieldUsers.forEach(u => {
    const row = [u.nrp || '', u.nama];
    for (let d = 1; d <= days; d++) row.push('');
    data.push(row);
  });

  const legend = [
    ['KODE', 'SHIFT', 'JAM DINAS'],
    ['P', 'Pagi', '06:00 - 14:00'],
    ['S', 'Siang', '14:00 - 22:00'],
    ['M', 'Malam', '22:00 - 06:00'],
    ['MD1', 'Middle 1', '10:00 - 18:00'],
    ['MD2', 'Middle 2', '11:30 - 19:30'],
    ['KH1', 'Khusus 1', '08:00 - 17:00'],
    ['KH2', 'Khusus 2', '10:00 - 19:00'],
    ['BKO', 'BKO', '20:00 - 05:00'],
    ['X', 'Libur / Off', '-'],
    [],
    ['CARA PAKAI:'],
    ['1. Isi kode shift (P/S/M/MD1/MD2/KH1/KH2/BKO/X) di kolom tanggal'],
    ['2. Jangan ubah kolom NRP — digunakan untuk mencocokkan personil'],
    ['3. Simpan file Excel, lalu upload kembali ke halaman ini'],
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(data);
  const ws2 = XLSX.utils.aoa_to_sheet(legend);
  ws1['!cols'] = [{ wch: 12 }, { wch: 28 }, ...Array(days).fill({ wch: 6 })];
  XLSX.utils.book_append_sheet(wb, ws1, 'Roster');
  XLSX.utils.book_append_sheet(wb, ws2, 'Petunjuk');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roster_template_${yearMonth}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
