import React, { useState } from 'react';
import { UserPlus, User, Shield, Smartphone, Hash, Users, Search, ChevronDown, ChevronRight, Save, MessageSquare, Edit3, X, Check, Trash2, RefreshCw, AlertCircle, CloudOff, Cloud } from 'lucide-react';
import { getWAContacts, saveWAContacts } from '../data/waContacts';
import { addUserToFirestore } from '../utils/supabase';


const ROLE_OPTIONS = [
  'Admin Super', 'Manajemen', 'SPV', 'Danru', 'Wadanru', 'Middle 1', 'Middle 2', 'Anggota', 'BKO', 'KH (Khusus)', 'Guest Viewer'
];

const REGU_PRESETS = ['Regu A', 'Regu B', 'Regu C', 'Regu D'];

const ROLE_COLORS = {
  'Admin Super': '#ef4444',
  'Manajemen': '#3b82f6',
  'SPV': '#f59e0b',
  'Danru': '#06b6d4',
  'Wadanru': '#14b8a6',
  'Middle 1': '#10b981',
  'Middle 2': '#06b6d4',
  'Anggota': '#10b981',
  'BKO': '#f97316',
  'KH (Khusus)': '#a855f7',
  'Guest Viewer': '#8b5cf6'
};

export default function UserManagement({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, onSaveWAContacts }) {
  const [reguPilih, setReguPilih] = useState('Regu B');
  const [reguKustom, setReguKustom] = useState('');
  const [anggotaInput, setAnggotaInput] = useState('');
  const [role, setRole] = useState('Anggota');
  const [search, setSearch] = useState('');
  const [reguBuka, setReguBuka] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editRegu, setEditRegu] = useState('');
  const [waContacts, setWaContacts] = useState(() => getWAContacts());
  const [saveStatus, setSaveStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);


  const allowedRoles = currentUser?.jabatan === 'Admin Super'
    ? ROLE_OPTIONS
    : ['Danru', 'Wadanru'].includes(currentUser?.jabatan || '')
      ? ['Anggota', 'BKO', 'KH (Khusus)', 'Middle 1', 'Middle 2']
      : ROLE_OPTIONS.filter(r => r !== 'Admin Super');

  const updateWAField = (dept, field, value) => {
    setWaContacts(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        [field]: value
      }
    }));
  };

  const handleWASave = (e) => {
    e.preventDefault();
    saveWAContacts(waContacts);
    if (onSaveWAContacts) onSaveWAContacts(waContacts);
    setSaveStatus('✓ Pengaturan nomor WhatsApp berhasil disimpan!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const isReguKustom = reguPilih === '__LAINNYA__';

  const anggotaList = anggotaInput.split('\n').map(s => s.trim()).filter(Boolean);

  const existingNrp = users.map(u => parseInt(u.nrp, 10)).filter(n => !isNaN(n));
  const nextNrp = existingNrp.length > 0 ? Math.max(...existingNrp) + 1 : 10001;

  const generateNrp = () => String(nextNrp).padStart(5, '0');

  const handleSubmit = (e) => {
    e.preventDefault();
    const regu = isReguKustom ? reguKustom.trim() : reguPilih;
    if (!regu) { alert('Pilih atau tulis nama Regu!'); return; }
    if (anggotaList.length === 0) { alert('Masukkan minimal 1 nama anggota!'); return; }

    let nrpCounter = nextNrp;
    anggotaList.forEach(nama => {
      const nrp = String(nrpCounter++).padStart(5, '0');
      onAddUser({
        nama,
        nrp,
        jabatan: role,
        regu,
        pin: nrp.slice(-4),
        status: 'Aktif'
      });
    });

    setAnggotaInput('');
  };

  // Force sync semua user ke Supabase
  const handleForceSyncFirebase = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    let synced = 0, failed = 0;
    const errors = [];
    for (const u of users) {
      if (u.supabaseId) { synced++; continue; }
      try {
        const sid = await addUserToFirestore({ ...u, pin: undefined });
        if (sid) {
          synced++;
        } else {
          failed++;
          errors.push(`${u.nama}: returned null`);
        }
      } catch(e) {
        failed++;
        errors.push(`${u.nama}: ${e.message || e}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
    setIsSyncing(false);
    setSyncResult({ synced, failed, total: users.length, errors });
    if (errors.length > 0) console.error('[Sync Errors]', errors);
    setTimeout(() => setSyncResult(null), 15000);
  };


  const visibleUsers = users.filter(u => {
    // Sembunyikan 'Admin Super' dari seluruh role selain 'Admin Super' itu sendiri
    if (currentUser?.jabatan !== 'Admin Super' && u.jabatan === 'Admin Super') {
      return false;
    }
    return true;
  });

  const filteredUsers = visibleUsers.filter(u =>
    u.nama.toLowerCase().includes(search.toLowerCase()) ||
    u.nrp.toLowerCase().includes(search.toLowerCase()) ||
    u.jabatan.toLowerCase().includes(search.toLowerCase()) ||
    (u.regu || '').toLowerCase().includes(search.toLowerCase())
  );

  const HIERARCHY_LABELS = { 'Admin Super': 'Admin', 'Manajemen': 'Manajemen', 'SPV': 'SPV' };
  const HIERARCHY_ORDER = ['Admin', 'Manajemen', 'SPV', 'BKO', 'KH (Khusus)', 'Regu A', 'Regu B', 'Regu C', 'Regu D'];

  const groupedByHierarchy = {};
  filteredUsers.forEach(u => {
    // Jika role BKO atau KH, grup berdasarkan role-nya sendiri, bukan regu
    if (u.jabatan === 'BKO' || u.jabatan === 'KH (Khusus)') {
      const g = u.jabatan;
      if (!groupedByHierarchy[g]) groupedByHierarchy[g] = [];
      groupedByHierarchy[g].push(u);
      return;
    }
    let g = HIERARCHY_LABELS[u.jabatan];
    if (!g) {
      const raw = u.regu || '';
      g = raw.startsWith('Regu ') ? raw : (raw ? `Regu ${raw}` : 'Lainnya');
    }
    if (!groupedByHierarchy[g]) groupedByHierarchy[g] = [];
    groupedByHierarchy[g].push(u);
  });
  const hierarchyKeys = Object.keys(groupedByHierarchy).sort((a, b) => {
    const ia = HIERARCHY_ORDER.indexOf(a);
    const ib = HIERARCHY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        .user-action-btn {
          padding: 0.45rem 0.5rem;
          border-radius: 6px;
          border: 2px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: manipulation;
          position: relative;
          z-index: 10;
        }
        .user-action-btn:active {
          transform: scale(0.92);
        }
        .user-action-btn.edit {
          color: #94a3b8;
        }
        .user-action-btn.edit:hover {
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.2);
          background: rgba(59, 130, 246, 0.1);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
        }
        .user-action-btn.delete {
          color: #ef4444;
        }
        .user-action-btn.delete:hover {
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
        }
      `}</style>

      {/* ── Panel Status Sinkronisasi Firebase ─────────────────────────── */}
      {currentUser?.jabatan === 'Admin Super' && (() => {
        const unsyncedCount = users.filter(u => !u.supabaseId).length;
        const syncedCount = users.length - unsyncedCount;
        return (
          <div className="glass-panel" style={{
            padding: '1rem 1.25rem',
            border: unsyncedCount > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)',
            background: unsyncedCount > 0 ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)',
            display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {unsyncedCount > 0
                  ? <AlertCircle size={16} style={{ color: '#ef4444' }} />
                  : <Cloud size={16} style={{ color: '#10b981' }} />}
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                  {unsyncedCount > 0
                    ? `⚠️ ${unsyncedCount} user BELUM tersync ke Cloud`
                    : `✅ Semua ${users.length} user sudah tersync ke Firebase`}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '1.5rem' }}>
                <span>Total user: <strong style={{ color: 'var(--text-primary)' }}>{users.length}</strong></span>
                <span>Tersync (Cloud): <strong style={{ color: '#10b981' }}>{syncedCount}</strong></span>
                <span>Belum sync: <strong style={{ color: unsyncedCount > 0 ? '#ef4444' : '#10b981' }}>{unsyncedCount}</strong></span>
              </div>
              {unsyncedCount > 0 && (
                <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.15rem' }}>
                  💡 User yang belum sync tidak akan muncul di browser/perangkat lain. Klik Force Sync untuk memperbaiki.
                </div>
              )}
              {syncResult && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                    ✓ Sync selesai: {syncResult.synced} berhasil
                    {syncResult.failed > 0 ? `, ${syncResult.failed} gagal` : ''}
                  </div>
                  {syncResult.errors?.length > 0 && (
                    <details style={{ marginTop: '0.3rem' }}>
                      <summary style={{ fontSize: '0.65rem', color: '#ef4444', cursor: 'pointer' }}>
                        Lihat {syncResult.errors.length} error
                      </summary>
                      <div style={{ fontSize: '0.6rem', color: '#f87171', maxHeight: '120px', overflowY: 'auto', background: 'rgba(239,68,68,0.05)', padding: '0.3rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                        {syncResult.errors.slice(0, 10).map((err, i) => (
                          <div key={i} style={{ marginBottom: '0.15rem' }}>{err}</div>
                        ))}
                        {syncResult.errors.length > 10 && <div>...dan {syncResult.errors.length - 10} lainnya</div>}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleForceSyncFirebase}
              disabled={isSyncing}
              style={{
                padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none',
                background: isSyncing ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.9)',
                color: 'white', cursor: isSyncing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.82rem',
                boxShadow: isSyncing ? 'none' : '0 0 12px rgba(59,130,246,0.4)'
              }}
            >
              <RefreshCw size={15} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
              {isSyncing ? 'Mengupload...' : 'Force Sync ke Cloud'}
            </button>
          </div>
        );
      })()}

      {/* Form Tambah Anggota per Regu */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} className="text-primary" />
          <span>Tambah Anggota per Regu</span>
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>REGU</label>
              <div className="login-input-wrap">
                <Users size={16} />
                <select value={reguPilih} onChange={e => setReguPilih(e.target.value)} className="modern-select" style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.8rem', padding: '0.45rem 0' }}>
                  {REGU_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
                  <option value="__LAINNYA__">Lainnya...</option>
                </select>
              </div>
              {isReguKustom && (
                <input type="text" value={reguKustom} onChange={e => setReguKustom(e.target.value)} placeholder="Tulis nama Regu" className="modern-input" style={{ marginTop: '0.3rem', fontSize: '0.8rem' }} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ROLE</label>
              <div className="login-input-wrap">
                <Shield size={16} />
                <select value={role} onChange={e => setRole(e.target.value)} className="modern-select" style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.8rem', padding: '0.45rem 0' }}>
                  {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>NAMA ANGGOTA <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(1 nama per baris)</span></label>
            <textarea
              value={anggotaInput}
              onChange={e => setAnggotaInput(e.target.value)}
              placeholder={`Wahyudi\nFaizal Tanjung`}
              className="modern-input"
              style={{ height: '100px', resize: 'vertical', fontSize: '0.8rem', padding: '0.5rem' }}
              required
            />
            {anggotaList.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div>Akan mendaftarkan <strong>{anggotaList.length} anggota</strong> ke <strong>{isReguKustom ? reguKustom || '...' : reguPilih}</strong> dengan role <strong>{role}</strong></div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  NRP: {generateNrp()} – {String(nextNrp + anggotaList.length - 1).padStart(5, '0')}
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
            <UserPlus size={16} /> Daftarkan {anggotaList.length > 0 ? `${anggotaList.length} Anggota` : 'Anggota'}
          </button>
        </form>
      </div>

      {/* Panel Pengaturan Nomor WA Disposisi */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={18} className="text-primary" />
          <span>Pengaturan Disposisi WhatsApp</span>
        </h3>
        
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
          Tentukan nama, nomor WhatsApp penerima, dan emoji untuk masing-masing departemen tindak lanjut. 
          Pastikan nomor menggunakan format kode negara tanpa tanda <code>+</code> atau <code>0</code> di awal (contoh: <code>6281234567890</code>).
        </p>

        <form onSubmit={handleWASave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Keamanan */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{waContacts.Keamanan.emoji || '🛡️'}</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Departemen Keamanan</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>NAMA PENERIMA</label>
                  <input 
                    type="text" 
                    value={waContacts.Keamanan.nama} 
                    onChange={e => updateWAField('Keamanan', 'nama', e.target.value)}
                    className="modern-input" 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>NOMOR WHATSAPP</label>
                  <input 
                    type="text" 
                    value={waContacts.Keamanan.nomor} 
                    onChange={e => updateWAField('Keamanan', 'nomor', e.target.value)}
                    className="modern-input" 
                    required 
                  />
                </div>
              </div>
            </div>

            {/* Teknisi */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{waContacts.Teknisi.emoji || '🛠️'}</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Departemen Engineering / Teknisi</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>NAMA PENERIMA</label>
                  <input 
                    type="text" 
                    value={waContacts.Teknisi.nama} 
                    onChange={e => updateWAField('Teknisi', 'nama', e.target.value)}
                    className="modern-input" 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>NOMOR WHATSAPP</label>
                  <input 
                    type="text" 
                    value={waContacts.Teknisi.nomor} 
                    onChange={e => updateWAField('Teknisi', 'nomor', e.target.value)}
                    className="modern-input" 
                    required 
                  />
                </div>
              </div>
            </div>

            {/* Cleaning Service */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{waContacts.Cleaning.emoji || '🧹'}</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Departemen Cleaning Service</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>NAMA PENERIMA</label>
                  <input 
                    type="text" 
                    value={waContacts.Cleaning.nama} 
                    onChange={e => updateWAField('Cleaning', 'nama', e.target.value)}
                    className="modern-input" 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>NOMOR WHATSAPP</label>
                  <input 
                    type="text" 
                    value={waContacts.Cleaning.nomor} 
                    onChange={e => updateWAField('Cleaning', 'nomor', e.target.value)}
                    className="modern-input" 
                    required 
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            {saveStatus && (
              <span style={{ 
                fontSize: '0.75rem', 
                color: '#10b981', 
                background: 'rgba(16, 185, 129, 0.1)', 
                padding: '0.35rem 0.75rem', 
                borderRadius: '6px',
                fontWeight: 600
              }}>
                {saveStatus}
              </span>
            )}
            <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.5rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={14} /> Simpan Pengaturan WA
            </button>
          </div>
        </form>
      </div>

      {/* Daftar User per Regu */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} className="text-primary" />
            <span>Daftar User ({visibleUsers.length})</span>
          </h3>
          <div className="login-input-wrap" style={{ width: '220px', maxWidth: '100%' }}>
            <Search size={14} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / NRP / role / regu..." className="modern-input" style={{ fontSize: '0.75rem' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {hierarchyKeys.map(key => {
            const members = groupedByHierarchy[key];
            const isRegu = key.startsWith('Regu ');
            return (
            <div key={key} className="glass-panel" style={{ padding: '0', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
              <div
                onClick={() => setReguBuka(prev => ({ ...prev, [key]: !prev[key] }))}
                style={{ padding: '0.65rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: isRegu ? 'rgba(6,182,212,0.06)' : 'rgba(59,130,246,0.05)' }}
              >
                {reguBuka[key] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Shield size={14} className="text-primary" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{key}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{members.length} anggota</span>
              </div>
              {reguBuka[key] && members.map(u => (
                <div key={u.id} style={{ padding: '0.5rem 1rem 0.5rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <img src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40'} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(59,130,246,0.2)' }} />
                  
                  {editingUser === u.id ? (
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', marginRight: '0.5rem' }}>{u.nama}</span>
                      <select value={editRole} onChange={e => setEditRole(e.target.value)} className="modern-select" style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem', border: '1px solid var(--border-glass)', borderRadius: '4px', background: 'transparent', color: 'var(--text-primary)' }}>
                        {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select value={editRegu} onChange={e => setEditRegu(e.target.value)} className="modern-select" style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem', border: '1px solid var(--border-glass)', borderRadius: '4px', background: 'transparent', color: 'var(--text-primary)' }}>
                        {REGU_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
                        <option value="-">-</option>
                      </select>
                      <button onClick={() => {
                        onUpdateUser && onUpdateUser(u.id, { jabatan: editRole, regu: editRegu });
                        setEditingUser(null);
                      }} style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--color-success)', background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Check size={12}/>
                      </button>
                      <button onClick={() => setEditingUser(null)} style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <X size={12}/>
                      </button>
                    </div>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{u.nama}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>NRP: {u.nrp}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.05rem 0.35rem', borderRadius: '3px', fontSize: '0.6rem', fontWeight: 700, background: `${ROLE_COLORS[u.jabatan] || '#666'}20`, color: ROLE_COLORS[u.jabatan] || '#666' }}>
                          {u.jabatan}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {editingUser !== u.id && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      {allowedRoles.includes(u.jabatan) && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('[UserMgmt] Edit clicked:', u?.id, u?.nama);
                            setEditingUser(u.id);
                            setEditRole(u.jabatan); 
                            setEditRegu(u.regu || '-'); 
                          }} 
                          className="user-action-btn edit" 
                          title="Ubah role/regu"
                        >
                          <Edit3 size={16}/>
                        </button>
                      )}
                      {allowedRoles.includes(u.jabatan) && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('[UserMgmt] Delete clicked:', u?.id, u?.nama);
                            if (window.confirm(`Yakin hapus ${u.nama}?`)) {
                              if (onDeleteUser) onDeleteUser(u.id);
                            }
                          }} 
                          className="user-action-btn delete" 
                          title="Hapus user"
                        >
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {!reguBuka[key] && (
                <div style={{ padding: '0.4rem 1rem 0.4rem 2.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {members.slice(0, 3).map(m => m.nama).join(', ')}{members.length > 3 ? `, +${members.length - 3} lagi` : ''}
                </div>
              )}
            </div>
          );
          })}
          {hierarchyKeys.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {search ? 'Tidak ada user yang cocok.' : 'Belum ada user terdaftar.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
