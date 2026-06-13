import React, { useState, useEffect } from 'react';
import { registerBackHandler } from '../utils/navigation';
import { Clock, MapPin, FileText, Camera, Send, History, Trash2, Info, Search, AlertTriangle, Wrench, Radio, X, Printer } from 'lucide-react';
import { compressImage } from '../utils/image';
import { exportTableToPdf, formatDateForFile, formatDateOnlyId } from '../utils/exportPdf';

const KATEGORI_MUTASI = [
  { id: 'informasi', label: 'Informasi', icon: Info, color: '#3b82f6' },
  { id: 'kehilangan', label: 'Kehilangan', icon: Search, color: '#f59e0b' },
  { id: 'kerusakan', label: 'Kerusakan', icon: Wrench, color: '#ef4444' },
  { id: 'gangguan', label: 'Gangguan', icon: AlertTriangle, color: '#dc2626' },
  { id: 'emergency', label: 'Emergency', icon: Radio, color: '#7c3aed' },
  { id: '__lainnya__', label: 'Lainnya...', icon: X, color: '#6b7280' }
];

export default function MutasiPenjagaan({ currentUser, logs, onAddLog, onDeleteLog, areas, posList = [], canViewResults }) {
  const [jamKejadian, setJamKejadian] = useState(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  const [tanggalKejadian, setTanggalKejadian] = useState(new Date().toISOString().split('T')[0]);
  const [lokasi, setLokasi] = useState('');
  const [lokasiCustom, setLokasiCustom] = useState('');
  const [isCustomLokasi, setIsCustomLokasi] = useState(false);
  const [uraian, setUraian] = useState('');
  const [kategori, setKategori] = useState('informasi');
  const [kategoriLainnya, setKategoriLainnya] = useState('');
  const [foto, setFoto] = useState(null);
  const [search, setSearch] = useState('');
  const [filterKat, setFilterKat] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (!selectedPhoto) return;
    const unregister = registerBackHandler(() => {
      setSelectedPhoto(null);
      return true;
    });
    return unregister;
  }, [selectedPhoto]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!uraian.trim() || !lokasi.trim()) {
      alert('Lokasi dan uraian wajib diisi!');
      return;
    }
    const now = new Date();
    const jamLapor = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const today = now.toISOString().split('T')[0];
    onAddLog({
      waktu: jamLapor,
      tanggalKejadian,
      jamKejadian,
      lokasi,
      uraian: uraian.trim(),
      kategori: kategori === '__lainnya__' ? `Lainnya: ${kategoriLainnya.trim() || 'Custom'}` : kategori,
      foto,
      petugas: currentUser.nama,
      nrp: currentUser.nrp,
      tanggal: today
    });
    setUraian('');
    setLokasi('');
    setLokasiCustom('');
    setIsCustomLokasi(false);
    setKategori('informasi');
    setKategoriLainnya('');
    setFoto(null);
    setJamKejadian(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    setTanggalKejadian(new Date().toISOString().split('T')[0]);
  };

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.uraian.toLowerCase().includes(search.toLowerCase()) || l.lokasi.toLowerCase().includes(search.toLowerCase()) || l.petugas.toLowerCase().includes(search.toLowerCase());
    const matchKat = !filterKat || l.kategori === filterKat;
    return matchSearch && matchKat;
  });

  const getKategoriLabel = (value) => {
    const found = KATEGORI_MUTASI.find(k => k.id === value);
    return found?.label || value || '-';
  };

  const handleExportMutasiPDF = () => {
    const ok = exportTableToPdf({
      title: 'Mutasi / Pelaporan Kejadian Penjagaan',
      fileName: `mutasi-pelaporan-smpjdc-${formatDateForFile()}`,
      meta: [
        { label: 'Filter Kategori', value: filterKat ? getKategoriLabel(filterKat) : 'Semua' },
        { label: 'Pencarian', value: search || '-' },
        { label: 'Total Laporan', value: filtered.length },
        { label: 'Sumber', value: 'Mutasi Penjagaan' }
      ],
      columns: [
        { header: 'NO', width: '4%' },
        { header: 'TANGGAL', width: '8%' },
        { header: 'TGL. KEJADIAN', width: '8%' },
        { header: 'JAM LAPORAN', width: '7%' },
        { header: 'JAM KEJADIAN', width: '7%' },
        { header: 'NAMA PETUGAS', width: '10%' },
        { header: 'NRP', width: '7%' },
        { header: 'LOKASI / POS', width: '10%' },
        { header: 'KATEGORI', width: '8%' },
        { header: 'URAIAN LAPORAN / KEJADIAN / PERISTIWA', width: '22%' },
        { header: 'FOTO', width: '9%' },
        { header: 'AKSI / TINDAK LANJUT', width: '8%' }
      ],
      rows: filtered.map((log, idx) => [
        idx + 1,
        formatDateOnlyId(log.tanggal),
        log.tanggalKejadian ? formatDateOnlyId(log.tanggalKejadian) : formatDateOnlyId(log.tanggal) || '-',
        log.waktu || '-',
        log.jamKejadian || log.waktu || '-',
        log.petugas || log.pelapor || '-',
        log.nrp || '-',
        log.lokasi || '-',
        getKategoriLabel(log.kategori),
        { text: log.uraian || log.deskripsi || '-', className: 'text-left' },
        { image: log.foto, text: log.foto ? 'Foto bukti' : '-' },
        log.tindakLanjut || '-'
      ])
    });
    if (!ok) alert('Popup export PDF diblokir browser. Izinkan popup untuk aplikasi ini.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="grid-cols-3" style={{ gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* FORM INPUT MUTASI */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} className="text-primary" />
            <span>Input Catatan Mutasi</span>
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="step-field">
                <label><Clock size={12} /> TANGGAL KEJADIAN</label>
                <input type="date" value={tanggalKejadian} onChange={e => setTanggalKejadian(e.target.value)} className="modern-input" />
              </div>
              <div className="step-field">
                <label><Clock size={12} /> JAM KEJADIAN</label>
                <input type="time" value={jamKejadian} onChange={e => setJamKejadian(e.target.value)} className="modern-input" />
              </div>
            </div>
            
            <div className="step-field">
              <label><MapPin size={12} /> PLOTTING POS / LOKASI</label>
              {!isCustomLokasi ? (
                <select value={lokasi} onChange={e => {
                  const val = e.target.value;
                  if (val === '__custom__') {
                    setIsCustomLokasi(true);
                    setLokasi('');
                  } else {
                    setLokasi(val);
                  }
                }} className="modern-select" required>
                  <option value="">-- Pilih Pos Jaga --</option>
                  {posList.map(p => <option key={p.id} value={p.titik}>{p.titik}</option>)}
                  <option value="__custom__">-- Lainnya (Ketik Manual) --</option>
                </select>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <input type="text" value={lokasiCustom} onChange={e => {
                    setLokasiCustom(e.target.value);
                    setLokasi(e.target.value);
                  }} placeholder="Ketik lokasi manual..." className="modern-input" style={{ fontSize: '0.82rem' }} required />
                  <button type="button" onClick={() => { setIsCustomLokasi(false); setLokasiCustom(''); setLokasi(''); }}
                    style={{ alignSelf: 'flex-start', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0', textDecoration: 'underline', minHeight: '36px', touchAction: 'manipulation' }}>
                    ← Kembali ke pilihan pos
                  </button>
                </div>
              )}
            </div>
            
            <div className="step-field">
              <label>KATEGORI LAPORAN</label>
              <div className="mutasi-kategori-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {KATEGORI_MUTASI.map(k => {
                  const Icon = k.icon;
                  return (
                    <button key={k.id} type="button" onClick={() => { setKategori(k.id); if (k.id !== '__lainnya__') setKategoriLainnya(''); }}
                      className={`mutasi-kat-btn ${kategori === k.id ? 'active' : ''}`}
                      style={{ 
                        '--kat-color': k.color, 
                        borderColor: kategori === k.id ? k.color : 'var(--border-glass)', 
                        background: kategori === k.id ? `${k.color}1A` : 'transparent', 
                        color: kategori === k.id ? k.color : 'var(--text-secondary)',
                        padding: '0.6rem 0.45rem',
                        minHeight: '48px',
                        fontSize: '0.78rem'
                      }}>
                      <Icon size={14} /><span>{k.label}</span>
                    </button>
                  );
                })}
              </div>
              {kategori === '__lainnya__' && (
                <input type="text" value={kategoriLainnya} onChange={e => setKategoriLainnya(e.target.value)}
                  placeholder="Ketik kategori lain..." className="modern-input" style={{ marginTop: '0.4rem', fontSize: '0.8rem' }} />
              )}
            </div>
            
            <div className="step-field">
              <label>URAIAN KEJADIAN / PERISTIWA</label>
              <textarea value={uraian} onChange={e => setUraian(e.target.value)} className="modern-input form-textarea" rows={3} placeholder="Tuliskan detail kejadian di pos jaga..." required />
            </div>
            
            <div className="step-field">
              <label>LAMPIRAN FOTO (OPSIONAL)</label>
              {foto ? <div className="photo-preview"><img src={foto} alt="" /><button type="button" onClick={() => setFoto(null)} className="photo-remove">X</button></div>
                : <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <label className="photo-upload-btn"><Camera size={14} /> 📷 Kamera
                      <input type="file" accept="image/*" capture="environment" onChange={e => { const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=> { compressImage(r.result).then(compressed => setFoto(compressed)); }; r.readAsDataURL(f)} e.target.value=''; }} hidden />
                    </label>
                    <label className="photo-upload-btn" style={{ background: 'rgba(255,255,255,0.04)' }}><Camera size={14} /> 🖼 Galeri
                      <input type="file" accept="image/*" onChange={e => { const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=> { compressImage(r.result).then(compressed => setFoto(compressed)); }; r.readAsDataURL(f)} e.target.value=''; }} hidden />
                    </label>
                  </div>}
            </div>
            
            <button type="submit" className="btn-primary btn-full" style={{ padding: '0.65rem' }}><Send size={16} /> Catat Ke Mutasi</button>
          </form>
        </div>

        {/* TABEL MUTASI / LAPORAN */}
        {canViewResults && (
        <div className="glass-panel grid-span-2" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} className="text-primary" />
              <span>Tabel Mutasi / Laporan (Kejadian / Peristiwa)</span>
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari laporan..." className="modern-input" style={{ width: '150px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', maxWidth: '100%' }} />
              <select value={filterKat} onChange={e => setFilterKat(e.target.value)} className="modern-select" style={{ width: '100px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', maxWidth: '100%' }}>
                <option value="">Semua Kategori</option>
                {KATEGORI_MUTASI.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
              <button onClick={handleExportMutasiPDF} className="btn-primary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Printer size={14} /> Export PDF</button>
              </div>
            </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
            <table className="mutasi-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', width: '50px' }}>No</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', width: '100px' }}>Jam (Laporan)</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', width: '100px' }}>Jam Kejadian</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Uraian Laporan / Kejadian / Peristiwa</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', width: '100px' }}>Foto (Bukti)</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', width: '60px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Belum ada catatan mutasi atau kejadian terdaftar.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log, idx) => {
                    const kat = KATEGORI_MUTASI.find(k => k.id === log.kategori);
                    return (
                      <tr key={log.id || idx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 600 }}>{log.waktu}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{log.tanggal}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                          <div>{log.jamKejadian || log.waktu}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>{log.tanggalKejadian ? formatDateOnlyId(log.tanggalKejadian) : log.tanggal}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                            <span className="badge" style={{ background: `${kat?.color || '#3b82f6'}1A`, color: kat?.color || '#3b82f6', fontSize: '0.55rem', padding: '0.05rem 0.25rem' }}>
                              {kat?.label || log.kategori}
                            </span>
                            <span>{log.lokasi}</span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{log.uraian}</p>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Petugas: <strong>{log.petugas} (NRP: {log.nrp || '-'})</strong>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {log.foto ? (
                            <img 
                              src={log.foto} 
                              alt="Bukti" 
                              onClick={() => setSelectedPhoto(log.foto)}
                              style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border-glass)' }} 
                            />
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tidak ada</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          {onDeleteLog && (
                            <button 
                              onClick={() => onDeleteLog(log.id)} 
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
                              title="Hapus Catatan"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {/* LIGHTBOX MODAL UNTUK PREVIEW FOTO */}
      {selectedPhoto && (
        <div 
          onClick={() => setSelectedPhoto(null)} 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPhoto(null)} 
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.9rem'
              }}
            >
              <X size={18} /> Tutup
            </button>
            <img src={selectedPhoto} alt="Bukti Kejadian" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', border: '2px solid var(--border-glass)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
