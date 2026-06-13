// ─── Shared WA Contacts Config ─────────────────────────────────────────────
// Nomor telepon disimpan di localStorage agar bisa diubah oleh Admin tanpa
// perlu rebuild aplikasi. Format nomor: kode negara tanpa + (cth: 6281234567890)

const LS_KEY = 'smpjdc_wa_contacts';

export const WA_DEFAULTS = {
  Teknisi: {
    nama:  'Kepala Teknisi (Engineering)',
    nomor: '6281234567890',
    emoji: '🛠️',
    color: '#3b82f6',
  },
  Cleaning: {
    nama:  'Kepala Cleaning Service',
    nomor: '6281112223334',
    emoji: '🧹',
    color: '#7c3aed',
  },
  Keamanan: {
    nama:  'Kepala Security / Danru',
    nomor: '6289876543210',
    emoji: '🛡️',
    color: '#f59e0b',
  },
};

/** Baca kontak dari localStorage, fallback ke default */
export function getWAContacts() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return { ...WA_DEFAULTS };
    const parsed = JSON.parse(saved);
    // Merge: pastikan semua key ada
    return {
      Teknisi:  { ...WA_DEFAULTS.Teknisi,  ...parsed.Teknisi  },
      Cleaning: { ...WA_DEFAULTS.Cleaning, ...parsed.Cleaning },
      Keamanan: { ...WA_DEFAULTS.Keamanan, ...parsed.Keamanan },
    };
  } catch {
    return { ...WA_DEFAULTS };
  }
}

/** Simpan perubahan nomor/nama ke localStorage */
export function saveWAContacts(contacts) {
  localStorage.setItem(LS_KEY, JSON.stringify(contacts));
}

/**
 * Buat teks pesan WA standar untuk satu temuan
 * @param {object} finding - objek temuan
 * @param {string} dept    - 'Teknisi' | 'Cleaning' | 'Keamanan'
 * @param {object} [contacts] - override contacts (opsional)
 */
export function buildWAMessage(finding, dept, contacts) {
  const c = (contacts || getWAContacts())[dept] || WA_DEFAULTS.Keamanan;
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
  return (
    `*📋 LAPORAN TEMUAN - SMPJDC*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${c.emoji} *Disposisi ke: ${c.nama}*\n\n` +
    `🆔 *ID Tiket:* \`${finding.id}\`\n` +
    `📌 *Kategori:* ${finding.kategori}\n` +
    `📍 *Lokasi:* ${finding.area}\n` +
    `⚠️ *Tingkat:* ${finding.severity || 'Rendah'}\n` +
    `🕐 *Waktu Temuan:* ${new Date(finding.tanggal).toLocaleString('id-ID')} WIB\n` +
    `👮 *Dilaporkan oleh:* ${finding.pelapor}\n\n` +
    `📝 *Keterangan:*\n"${finding.detail}"\n\n` +
    `⚡ *Mohon segera ditindaklanjuti!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Sistem Manajemen Keamanan JDC_\n` +
    `_Dikirim: ${now}_`
  );
}

/**
 * Buat link WA siap klik
 */
export function buildWALink(finding, dept, contacts) {
  const c = (contacts || getWAContacts())[dept] || WA_DEFAULTS.Keamanan;
  const msg = buildWAMessage(finding, dept, contacts);
  return `https://api.whatsapp.com/send?phone=${c.nomor}&text=${encodeURIComponent(msg)}`;
}

/**
 * Buat pesan rekap semua tiket open untuk satu departemen
 */
export function buildWARekap(openItems, dept, contacts) {
  const c = (contacts || getWAContacts())[dept] || WA_DEFAULTS.Keamanan;
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
  return (
    `*${c.emoji} REKAP TIKET OPEN - SMPJDC*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Yth. ${c.nama},\n\n` +
    `Berikut tiket aktif yang perlu ditindaklanjuti:\n\n` +
    openItems.map((f, i) =>
      `${i + 1}. [${f.severity || 'Rendah'}] ${f.kategori}\n   📍 ${f.area}\n   📋 ${f.detail}\n`
    ).join('\n') +
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Total: *${openItems.length} tiket aktif*\n` +
    `_Sistem Manajemen Keamanan JDC_\n` +
    `_Dikirim: ${now}_`
  );
}
