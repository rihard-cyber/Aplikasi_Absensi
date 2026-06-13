import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Calendar, Save, ChevronLeft, ChevronRight, Users, RefreshCw, Download, Upload, FileSpreadsheet, Loader, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import {
  SHIFT_CODES, getRoster, saveRoster, saveRosterWithCloud, loadRosterWithCloud, setUserShift,
  getYearMonth, getDatesInMonth, parseExcelToRoster, downloadExcelTemplate
} from '../data/rosterData';

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function RosterManagement({ users, currentUser }) {
  const [yearMonth, setYearMonth] = useState(() => getYearMonth());
  const [saveStatus, setSaveStatus] = useState('');
  const [search, setSearch] = useState('');
  const [excelLoading, setExcelLoading] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelPreview, setExcelPreview] = useState(null);

  // Hanya personil lapangan yang perlu roster
  const fieldUsers = useMemo(() =>
    users.filter(u =>
      ['Danru', 'Wadanru', 'Anggota', 'BKO', 'KH (Khusus)'].includes(u.jabatan) &&
      u.nama?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
      const reguOrder = ['Regu A', 'Regu B', 'Regu C', 'Regu D'];
      const ra = reguOrder.indexOf(a.regu || '');
      const rb = reguOrder.indexOf(b.regu || '');
      if (ra !== rb) return ra - rb;
      return a.nama.localeCompare(b.nama);
    }),
    [users, search]
  );

  const dates = useMemo(() => getDatesInMonth(yearMonth), [yearMonth]);

  // Local state: { [userId]: { [dateStr]: shiftCode } }
  const [rosterLocal, setRosterLocal] = useState(() => getRoster(yearMonth));
  const [cloudSynced, setCloudSynced] = useState(false);

  // Try to load from cloud on mount / month change
  useEffect(() => {
    loadRosterWithCloud(yearMonth).then(cloudData => {
      if (cloudData) {
        setRosterLocal(cloudData);
        setCloudSynced(true);
      }
    }).catch(() => {});
  }, [yearMonth]);

  const loadMonth = useCallback((ym) => {
    setYearMonth(ym);
    setRosterLocal(getRoster(ym));
    loadRosterWithCloud(ym).then(cloudData => {
      if (cloudData) setRosterLocal(cloudData);
    }).catch(() => {});
  }, []);

  const prevMonth = () => {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    loadMonth(getYearMonth(d));
  };

  const nextMonth = () => {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    loadMonth(getYearMonth(d));
  };

  const handleShiftChange = (userId, dateStr, code) => {
    setRosterLocal(prev => {
      const uid = String(userId);
      const updated = {
        ...prev,
        [uid]: { ...(prev[uid] || {}), [dateStr]: code }
      };
      return updated;
    });
  };

  const handleSave = async () => {
    const userId = currentUser?.id || null;
    await saveRosterWithCloud(yearMonth, rosterLocal, userId);
    setSaveStatus('✓ Roster berhasil disimpan' + (cloudSynced ? ' & tersync ke Cloud!' : ''));
    setCloudSynced(true);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleExport = () => {
    const data = { yearMonth, roster: rosterLocal, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster_${yearMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.yearMonth && parsed.roster) {
          setRosterLocal(parsed.roster);
          setYearMonth(parsed.yearMonth);
          setSaveStatus('✓ Import berhasil! Klik Simpan untuk menyimpan.');
        }
      } catch {
        alert('File roster tidak valid!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUploadExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelLoading(true);
    try {
      const result = await parseExcelToRoster(file, users);
      setExcelPreview(result);
      setShowExcelModal(true);
    } catch (err) {
      alert('Gagal membaca file Excel: ' + err.message);
    }
    setExcelLoading(false);
    e.target.value = '';
  };

  const handleApplyExcelRoster = () => {
    if (!excelPreview) return;
    // Merge preview into current roster
    setRosterLocal(prev => {
      const merged = { ...prev };
      Object.entries(excelPreview.rosterData).forEach(([userId, dates]) => {
        if (!merged[userId]) merged[userId] = {};
        Object.entries(dates).forEach(([dateStr, code]) => {
          merged[userId][dateStr] = code;
        });
      });
      return merged;
    });
    setShowExcelModal(false);
    setExcelPreview(null);
    setSaveStatus('✓ Data dari Excel diterapkan! Klik Simpan Roster untuk menyimpan.');
    setTimeout(() => setSaveStatus(''), 4000);
  };

  const getShiftColor = (code) => {
    if (!code || code === 'X') return {};
    const s = SHIFT_CODES[code];
    if (!s) return {};
    return { background: s.bg, color: s.color, fontWeight: 700 };
  };

  const [y, m] = yearMonth.split('-').map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .roster-table { border-collapse: collapse; font-size: 0.7rem; }
        .roster-table th, .roster-table td {
          border: 1px solid var(--border-glass);
          padding: 0.2rem 0.25rem;
          text-align: center;
          white-space: nowrap;
        }
        .roster-table th { background: rgba(255,255,255,0.03); font-weight: 700; color: var(--text-secondary); position: sticky; top: 0; z-index: 2; }
        .roster-table th.name-col { position: sticky; left: 0; z-index: 3; background: var(--bg-card); min-width: 120px; text-align: left; padding-left: 0.5rem; }
        .roster-table td.name-col { position: sticky; left: 0; background: var(--bg-card); text-align: left; padding-left: 0.5rem; font-weight: 600; z-index: 1; }
        .shift-select { border: none; background: transparent; font-size: 0.65rem; font-weight: 700; text-align: center; width: 38px; cursor: pointer; padding: 0.1rem; border-radius: 3px; }
        .shift-select:focus { outline: 1px solid var(--color-primary); }
        .weekend-col { background: rgba(255,255,255,0.01); }
        .today-col { outline: 2px solid var(--color-primary); outline-offset: -1px; }
      `}</style>

      {/* Header & Controls */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} className="text-primary" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Roster Jadwal Kerja Bulanan</h3>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={prevMonth} style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '140px', textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={nextMonth} style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Cari nama..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="modern-input"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', width: '130px' }}
          />
          <button onClick={() => downloadExcelTemplate(yearMonth, users)} style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
            <FileSpreadsheet size={12} /> Contoh Excel
          </button>
          <label style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
            <Upload size={12} /> Upload Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleUploadExcel} style={{ display: 'none' }} />
          </label>
          <label style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
            <RefreshCw size={12} /> Import JSON
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button onClick={handleExport} style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
            <Download size={12} /> Export JSON
          </button>
          <button onClick={handleSave} className="btn-primary" style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
            <Save size={14} /> Simpan Roster
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {cloudSynced && (
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Cloud Sync
            </span>
          )}
          {saveStatus && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>{saveStatus}</span>}
        </div>
      </div>

      {/* Legend */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, marginRight: '0.25rem' }}>KODE SHIFT:</span>
        {Object.entries(SHIFT_CODES).map(([code, info]) => (
          <span key={code} style={{ padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, background: info.bg, color: info.color, border: `1px solid ${info.color}40` }}>
            {code} = {info.label} ({info.jam})
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '0.75rem', overflowX: 'auto' }}>
        <table className="roster-table" style={{ minWidth: `${120 + dates.length * 44}px` }}>
          <thead>
            <tr>
              <th className="name-col">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Users size={12} /> Nama Personil
                </div>
              </th>
              {dates.map(dateStr => {
                const dayIdx = new Date(dateStr).getDay();
                const isWeekend = dayIdx === 0 || dayIdx === 6;
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const dayNum = dateStr.split('-')[2];
                return (
                  <th key={dateStr} className={`${isWeekend ? 'weekend-col' : ''} ${isToday ? 'today-col' : ''}`}>
                    <div style={{ lineHeight: '1.2' }}>
                      <div style={{ color: isWeekend ? '#ef4444' : 'inherit' }}>{HARI[dayIdx]}</div>
                      <div style={{ fontWeight: 800 }}>{parseInt(dayNum, 10)}</div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {fieldUsers.length === 0 ? (
              <tr><td colSpan={dates.length + 1} style={{ padding: '2rem', color: 'var(--text-muted)' }}>Tidak ada personil lapangan ditemukan.</td></tr>
            ) : fieldUsers.map(user => (
              <tr key={user.id}>
                <td className="name-col">
                  <div style={{ fontWeight: 700, fontSize: '0.72rem' }}>{user.nama}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{user.jabatan} · {user.regu || '-'}</div>
                </td>
                {dates.map(dateStr => {
                  const code = rosterLocal[String(user.id)]?.[dateStr] || '';
                  const style = getShiftColor(code);
                  const dayIdx = new Date(dateStr).getDay();
                  const isWeekend = dayIdx === 0 || dayIdx === 6;
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  return (
                    <td key={dateStr} className={`${isWeekend ? 'weekend-col' : ''} ${isToday ? 'today-col' : ''}`} style={style}>
                      <select
                        value={code}
                        onChange={e => handleShiftChange(user.id, dateStr, e.target.value)}
                        className="shift-select"
                        style={{ ...style, width: '38px' }}
                        title={SHIFT_CODES[code]?.label || 'Pilih shift'}
                      >
                        <option value="">-</option>
                        {Object.keys(SHIFT_CODES).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>
        💡 Isi jadwal menggunakan kode shift di atas. Setelah selesai, klik <strong>Simpan Roster</strong>. Data akan otomatis terbaca oleh modul Absensi Harian.
      </div>

      {/* ── Excel Upload Preview Modal ── */}
      {showExcelModal && excelPreview && (
        <div className="modal-overlay" onClick={() => setShowExcelModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowExcelModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <FileSpreadsheet size={20} className="text-primary" /> Preview Upload Excel
            </h3>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div className="glass-panel" style={{ padding: '0.75rem 1rem', flex: 1, minWidth: '120px', background: 'rgba(16,185,129,0.05)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Bulan</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{excelPreview.yearMonth}</div>
              </div>
              <div className="glass-panel" style={{ padding: '0.75rem 1rem', flex: 1, minWidth: '120px', background: 'rgba(59,130,246,0.05)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Personil Terdeteksi</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{excelPreview.matchedRows} / {excelPreview.totalRows}</div>
              </div>
              <div className="glass-panel" style={{ padding: '0.75rem 1rem', flex: 1, minWidth: '120px', background: excelPreview.errors.length > 0 ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Error</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: excelPreview.errors.length > 0 ? '#ef4444' : '#10b981' }}>{excelPreview.errors.length}</div>
              </div>
            </div>

            {excelPreview.errors.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.06)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                  <AlertTriangle size={12} /> Peringatan
                </div>
                {excelPreview.errors.slice(0, 10).map((err, i) => (
                  <div key={i} style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', padding: '0.1rem 0' }}>{err}</div>
                ))}
                {excelPreview.errors.length > 10 && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>...dan {excelPreview.errors.length - 10} error lainnya</div>
                )}
              </div>
            )}

            {excelPreview.matchedRows > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Preview data yang akan diterapkan:</div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '6px', fontSize: '0.65rem', maxHeight: '250px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                        <th style={{ padding: '0.4rem', textAlign: 'left', fontWeight: 700 }}>Nama</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', fontWeight: 700 }}>Jumlah Shift</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', fontWeight: 700 }}>Shift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(excelPreview.rosterData).map(([userId, dates]) => {
                        const user = users.find(u => String(u.id) === userId);
                        const codes = [...new Set(Object.values(dates))];
                        return (
                          <tr key={userId} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                            <td style={{ padding: '0.4rem', fontWeight: 600 }}>{user?.nama || userId}</td>
                            <td style={{ padding: '0.4rem' }}>{Object.keys(dates).length} hari</td>
                            <td style={{ padding: '0.4rem', color: 'var(--text-muted)' }}>{codes.join(', ')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button onClick={() => setShowExcelModal(false)} style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                Batal
              </button>
              <button onClick={handleApplyExcelRoster} className="btn-primary" style={{ padding: '0.55rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                <CheckCircle2 size={15} /> Terapkan ke Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay saat upload */}
      {excelLoading && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader size={32} className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Memproses file Excel...</span>
          </div>
        </div>
      )}
    </div>
  );
}
