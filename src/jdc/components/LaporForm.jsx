/**
 * =======================================================
 *   SMPJDC SECURITY MANAGEMENT SYSTEM
 *   Module: Fast Report Form (Laporan Cepat)
 *   Signed by: Richard Meha (by -Richard)
 *   Last Maintained: 2026-06-07
 *   Description: Fast report submission for security guards,
 *                integrating compressed photos and GPS coordinates.
 * =======================================================
 */

import React, { useState } from 'react';
import { Send, Camera, MapPin, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { generateAntiFraudData } from '../utils/security';
import { compressImage } from '../utils/image';

export default function LaporForm({ currentUser, areas, posList = [], onAddReport, onAddLog }) {
  const [jenis, setJenis] = useState('patroli');
  const [areaId, setAreaId] = useState('');
  const [kondisi, setKondisi] = useState('Aman dan Kondusif');
  const [kondisiCustom, setKondisiCustom] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [foto, setFoto] = useState(null);
  const [katMutasi, setKatMutasi] = useState('informasi');
  const [katMutasiLainnya, setKatMutasiLainnya] = useState('');
  const [lokasiMutasi, setLokasiMutasi] = useState('');
  const [lokasiCustom, setLokasiCustom] = useState('');
  const [isCustomLokasi, setIsCustomLokasi] = useState(false);
  const [uraianMutasi, setUraianMutasi] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});

  const KATEGORI_MUTASI = [
    { id: 'informasi', label: 'Informasi', color: '#3b82f6' },
    { id: 'kehilangan', label: 'Kehilangan', color: '#f59e0b' },
    { id: 'kerusakan', label: 'Kerusakan', color: '#ef4444' },
    { id: 'gangguan', label: 'Gangguan', color: '#dc2626' },
    { id: 'emergency', label: 'Emergency', color: '#7c3aed' },
    { id: '__lainnya__', label: 'Lainnya...', color: '#6b7280' }
  ];

  const KONDISI_OPTIONS = [
    'Aman dan Kondusif', 'Ada Aktivitas', 'Renovasi',
    'Kebocoran Air', 'Kerusakan Lampu', 'Kerusakan Fasilitas',
    'Pintu Terbuka', 'Orang Mencurigakan', 'Lainnya'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (jenis === 'patroli' && !areaId) {
      setErrors({ area: 'Pilih titik patroli terlebih dahulu' });
      return;
    }
    if (jenis === 'mutasi' && !lokasiMutasi.trim()) {
      setErrors({ lokasi: 'Lokasi / pos harus diisi' });
      return;
    }
    if (jenis === 'mutasi' && !uraianMutasi.trim()) {
      setErrors({ uraian: 'Uraian kejadian harus diisi' });
      return;
    }

    setLoading(true);
    const fraudData = await generateAntiFraudData(currentUser.id);

    if (jenis === 'patroli') {
      const area = areas.find(a => a.id === areaId);
      const finalKondisi = kondisi === 'Lainnya' && kondisiCustom.trim() ? kondisiCustom.trim() : kondisi;
      const isAman = finalKondisi === 'Aman dan Kondusif' || finalKondisi === 'Ada Aktivitas' || finalKondisi === 'Renovasi';
      onAddReport({
        timestamp: new Date().toISOString(),
        timestampEnd: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.nama,
        areaId: area.id,
        gedung: area.gedung || 'SMPJDC',
        lantai: area.lantai,
        zona: area.zona,
        titik: area.titik,
        shift: '-',
        kategori: isAman ? '-' : finalKondisi,
        kodeTemuan: '-',
        temuan: isAman ? 'Normal' : finalKondisi,
        status: isAman ? 'normal' : 'temuan',
        kondisi: finalKondisi,
        severity: isAman ? 'Rendah' : 'Sedang',
        keterangan: keterangan,
        foto: foto,
        antiFraud: fraudData
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      onAddLog({
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        jamKejadian: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        lokasi: lokasiMutasi,
        uraian: uraianMutasi,
        kategori: katMutasi === '__lainnya__' ? `Lainnya: ${katMutasiLainnya.trim() || 'Custom'}` : katMutasi,
        foto: foto,
        petugas: currentUser.nama,
        nrp: currentUser.nrp,
        tanggal: today,
        pelapor: currentUser.nama,
        antiFraud: fraudData
      });
    }

    setLoading(false);
    setDone(true);
    setKeterangan('');
    setKondisi('Aman dan Kondusif');
    setKondisiCustom('');
    setUraianMutasi('');
    setLokasiMutasi('');
    setLokasiCustom('');
    setIsCustomLokasi(false);
    setFoto(null);
    setAreaId('');
    setKatMutasi('informasi'); setKatMutasiLainnya('');
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} className="text-primary" />
          <span>Form Laporan Cepat</span>
        </h3>

        {done ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Laporan Terkirim!</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{currentUser.nama}</strong> — laporan berhasil disimpan.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Jenis Laporan */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setJenis('patroli')} style={{
                flex: 1, padding: '0.6rem 0.5rem', minHeight: '48px', borderRadius: '8px', border: `2px solid ${jenis === 'patroli' ? 'var(--color-primary)' : 'var(--border-glass)'}`,
                background: jenis === 'patroli' ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: jenis === 'patroli' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                transition: 'all 0.2s'
              }}>
                <MapPin size={14} /> Laporan Patroli
              </button>
              <button type="button" onClick={() => setJenis('mutasi')} style={{
                flex: 1, padding: '0.6rem 0.5rem', minHeight: '48px', borderRadius: '8px', border: `2px solid ${jenis === 'mutasi' ? 'var(--color-primary)' : 'var(--border-glass)'}`,
                background: jenis === 'mutasi' ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: jenis === 'mutasi' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                transition: 'all 0.2s'
              }}>
                <AlertTriangle size={14} /> Mutasi / Kejadian
              </button>
            </div>

            {/* ── LAPORAN PATROLI ── */}
            {jenis === 'patroli' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TITIK PATROLI</label>
                  <select value={areaId} onChange={e => setAreaId(e.target.value)} className="modern-select" required>
                    <option value="">— Pilih Titik —</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.titik} ({a.lantai === '1'||a.lantai === '2'||a.lantai === '3'||a.lantai === '4'||a.lantai === '5'||a.lantai === '6' ? `Lt.${a.lantai}` : a.lantai})</option>
                    ))}
                  </select>
                  {errors.area && <span style={{ fontSize: '0.72rem', color: 'var(--color-danger)' }}>{errors.area}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>KONDISI</label>
                  <select value={kondisi} onChange={e => { setKondisi(e.target.value); if (e.target.value !== 'Lainnya') setKondisiCustom(''); }} className="modern-select">
                    {KONDISI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  {kondisi === 'Lainnya' && (
                    <input type="text" value={kondisiCustom} onChange={e => setKondisiCustom(e.target.value)}
                      placeholder="Ketik kondisi..." className="modern-input" style={{ marginTop: '0.3rem', fontSize: '0.8rem' }} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>KETERANGAN <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opsional)</span></label>
                  <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Tulis keterangan tambahan..." className="modern-input" style={{ height: '70px', resize: 'vertical', fontSize: '0.8rem', padding: '0.5rem' }} />
                </div>
              </>
            )}

            {/* ── MUTASI / KEJADIAN ── */}
            {jenis === 'mutasi' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>KATEGORI</label>
                  <div className="mutasi-kategori-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
                    {KATEGORI_MUTASI.map(k => (
                      <button key={k.id} type="button" onClick={() => { setKatMutasi(k.id); if (k.id !== '__lainnya__') setKatMutasiLainnya(''); }}
                        className={`mutasi-kat-btn ${katMutasi === k.id ? 'active' : ''}`}
                        style={{
                          '--kat-color': k.color,
                          borderColor: katMutasi === k.id ? k.color : 'var(--border-glass)',
                          background: katMutasi === k.id ? `${k.color}1A` : 'transparent',
                          color: katMutasi === k.id ? k.color : 'var(--text-secondary)'
                        }}>{k.label}</button>
                    ))}
                  </div>
                  {katMutasi === '__lainnya__' && (
                    <input type="text" value={katMutasiLainnya} onChange={e => setKatMutasiLainnya(e.target.value)}
                      placeholder="Ketik kategori lain..." className="modern-input" style={{ marginTop: '0.3rem', fontSize: '0.8rem' }} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>PLOTTING POS / LOKASI</label>
                  {!isCustomLokasi ? (
                    <select value={lokasiMutasi} onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setIsCustomLokasi(true);
                        setLokasiMutasi('');
                      } else {
                        setLokasiMutasi(val);
                      }
                    }} className="modern-select" style={{ fontSize: '0.82rem', padding: '0.5rem' }} required>
                      <option value="">-- Pilih Pos Jaga --</option>
                      {posList.map(p => (
                        <option key={p.id} value={p.titik}>{p.titik}</option>
                      ))}
                      <option value="__custom__">-- Lainnya (Ketik Manual) --</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <input type="text" value={lokasiCustom} onChange={e => {
                        setLokasiCustom(e.target.value);
                        setLokasiMutasi(e.target.value);
                      }} placeholder="Ketik lokasi manual..." className="modern-input" style={{ fontSize: '0.82rem' }} required />
                      <button type="button" onClick={() => { setIsCustomLokasi(false); setLokasiCustom(''); setLokasiMutasi(''); }}
                        style={{ alignSelf: 'flex-start', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        ← Kembali ke daftar Pos
                      </button>
                    </div>
                  )}
                  {errors.lokasi && <span style={{ fontSize: '0.72rem', color: 'var(--color-danger)' }}>{errors.lokasi}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>URAIAN KEJADIAN</label>
                  <textarea value={uraianMutasi} onChange={e => setUraianMutasi(e.target.value)} placeholder="Jelaskan kejadian secara detail..." className="modern-input" style={{ height: '100px', resize: 'vertical', fontSize: '0.8rem', padding: '0.5rem' }} required />
                  {errors.uraian && <span style={{ fontSize: '0.72rem', color: 'var(--color-danger)' }}>{errors.uraian}</span>}
                </div>
              </>
            )}

            {/* Foto (opsional) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>FOTO BUKTI <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opsional)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {foto ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={foto} alt="preview" style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-glass)' }} />
                    <button type="button" onClick={() => setFoto(null)} style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--color-danger)', border: 'none', borderRadius: '50%', color: 'white', width: '18px', height: '18px', fontSize: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <label className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                      <Camera size={14} /> 📷 Kamera
                      <input type="file" accept="image/*" capture="environment" onChange={e => {
                        const f = e.target.files[0];
                        if (f) { const r = new FileReader(); r.onloadend = () => { compressImage(r.result).then(compressed => setFoto(compressed)); }; r.readAsDataURL(f); }
                        e.target.value = '';
                      }} hidden />
                    </label>
                    <label className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', background: 'rgba(255,255,255,0.04)' }}>
                      <Camera size={14} /> 🖼 Galeri
                      <input type="file" accept="image/*" onChange={e => {
                        const f = e.target.files[0];
                        if (f) { const r = new FileReader(); r.onloadend = () => { compressImage(r.result).then(compressed => setFoto(compressed)); }; r.readAsDataURL(f); }
                        e.target.value = '';
                      }} hidden />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Info Pelapor */}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.6rem', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
              <FileText size={12} />
              <span>Melapor sebagai: <strong style={{ color: 'var(--text-primary)' }}>{currentUser.nama}</strong> ({currentUser.nrp})</span>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Send size={16} /> {loading ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
