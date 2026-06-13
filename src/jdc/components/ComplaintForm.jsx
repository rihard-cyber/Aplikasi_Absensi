/**
 * =======================================================
 *   SMPJDC SECURITY MANAGEMENT SYSTEM
 *   Module: Tenant Complaint Form (Form Komplain)
 *   Signed by: Richard Meha (by -Richard)
 *   Last Maintained: 2026-06-07
 *   Description: Tenant request submission form with built-in
 *                image compressor and ticket tracking system.
 * =======================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Camera, User, Building, MapPin, FileText, AlertTriangle, CheckCircle, X, QrCode, ChevronRight } from 'lucide-react';
import { compressImage } from '../utils/image';
import { registerBackHandler } from '../utils/navigation';

const CATEGORIES = [
  { id: 'Fasilitas', label: 'Fasilitas', icon: Building, color: '#3b82f6' },
  { id: 'Engineering', label: 'Engineering', icon: AlertTriangle, color: '#f59e0b' },
  { id: 'Cleaning', label: 'Cleaning', icon: AlertTriangle, color: '#10b981' },
  { id: 'Satpam', label: 'Satpam / Security', icon: AlertTriangle, color: '#8b5cf6' },
  { id: 'Lainnya', label: 'Lainnya', icon: FileText, color: '#6b7280' }
];

const FLOORS = [
  'Basement', 'Lt.1', 'Lt.2', 'Lt.3', 'Lt.4', 'Lt.5', 'Lt.6',
  'Halaman Depan', 'Halaman Belakang', 'Halaman Samping Kanan', 'Halaman Samping Kiri', 'Lainnya'
];

export default function ComplaintForm({ onAddComplaint }) {
  const [step, setStep] = useState('splash');
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [floor, setFloor] = useState('');
  const [location, setLocation] = useState('');
  const [tenant, setTenant] = useState('');
  const [category, setCategory] = useState('');
  const [categoryCustom, setCategoryCustom] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [trackMode, setTrackMode] = useState(false);
  const [trackId, setTrackId] = useState('');
  const [trackData, setTrackData] = useState(null);

  // Ref ke hidden file input untuk kamera Android
  const photoInputRef = useRef(null);

  // Splash animation
  useEffect(() => {
    if (step !== 'splash') return;
    const t1 = setTimeout(() => setProgress(30), 200);
    const t2 = setTimeout(() => setProgress(70), 500);
    const t3 = setTimeout(() => setProgress(100), 800);
    const t4 = setTimeout(() => setStep('form'), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [step]);

  // Handle back button to go back from track mode to main form
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (trackMode) {
        setTrackMode(false);
        setTrackData(null);
        return true;
      }
      return false;
    });
    return unregister;
  }, [trackMode]);

  const handlePhotoCapture = () => {
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
      photoInputRef.current.click();
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => {
        compressImage(reader.result).then(compressed => {
          setPhotos(prev => [...prev, compressed]);
        });
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!name.trim()) errs.name = 'Nama wajib diisi';
    if (!floor) errs.floor = 'Pilih lantai';
    if (!tenant.trim()) errs.tenant = 'Nama tenant / unit wajib diisi';
    if (!category) errs.category = 'Pilih kategori komplain';
    if (category === 'Lainnya' && !categoryCustom.trim()) errs.category = 'Tulis kategori komplain';
    if (!description.trim()) errs.description = 'Deskripsi komplain wajib diisi';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const count = JSON.parse(localStorage.getItem('smpjdc_complaints') || '[]').length + 1;
    const id = `CMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(count).padStart(3, '0')}`;
    const finalCategory = category === 'Lainnya' && categoryCustom.trim() ? categoryCustom.trim() : category;
    const complaint = {
      id: `cmp-${Date.now()}`,
      ticketId: id,
      name: name.trim(),
      phone: phone.trim(),
      floor,
      location: location.trim(),
      tenant: tenant.trim(),
      category: finalCategory,
      description: description.trim(),
      photos,
      status: 'Baru',
      department: '',
      remarks: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{ status: 'Baru', timestamp: new Date().toISOString(), note: 'Komplain dibuat' }],
      waStatus: 'Belum Dikirim'
    };
    // Simpan langsung ke localStorage sebagai jaring pengaman
    try {
      const existing = JSON.parse(localStorage.getItem('smpjdc_complaints') || '[]');
      existing.unshift(complaint);
      localStorage.setItem('smpjdc_complaints', JSON.stringify(existing));
    } catch (e) {
      console.warn('[Form] Gagal simpan langsung:', e);
    }
    onAddComplaint(complaint);
    setTicketId(id);
    setSubmitted(true);
  };

  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    const data = JSON.parse(localStorage.getItem('smpjdc_complaints') || '[]');
    const found = data.find(c => c.ticketId === trackId.trim().toUpperCase() || c.name.toLowerCase().includes(trackId.trim().toLowerCase()));
    setTrackData(found || 'notfound');
  };

  const statusColor = (s) => ({
    Baru: '#3b82f6', Diterima: '#f59e0b', Diproses: '#8b5cf6', Selesai: '#10b981'
  })[s] || '#6b7280';

  if (step === 'splash') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        position: 'relative', overflow: 'hidden', width: '100%'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMjBtMC0xOC41YTE4LjUgMTguNSAwIDEgMCAwIDM3IDE4LjUgMTguNSAwIDEgMCAwLTM3eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDU5LDEzMCwyNDYsMC4wNykiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9zdmc+)', opacity: 0.3 }} />
        <div className="cyber-grid" style={{ position: 'absolute', inset: 0, opacity: 0.15 }}></div>
        <div style={{ textAlign: 'center', zIndex: 1, padding: '2rem' }}>
          <div style={{
            width: 100, height: 100, margin: '0 auto 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', background: 'rgba(59,130,246,0.1)',
            border: '2px solid rgba(59,130,246,0.2)',
            animation: 'pulse 2s infinite'
          }}>
            <img src="./jdc-logo.png" alt="SMPJDC" className="logo-3d-spin" style={{ width: 60, height: 'auto' }} />
          </div>
          <div className="hud-ring ring-outer" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 200, height: 200, opacity: 0.2 }}></div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            SMPJDC
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>
            Sistem Komplain Terpadu
          </p>
          <div style={{ width: 200, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, margin: '0 auto', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.75rem', letterSpacing: '0.1em' }}>
            LOADING {progress}%
          </p>
          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', marginTop: '1rem' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: `bounce 1.4s ${i * 0.2}s infinite` }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        padding: '2rem', width: '100%'
      }}>
        <div className="glass-panel" style={{ maxWidth: 420, width: '100%', padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 1rem', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={36} style={{ color: '#10b981' }} />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Komplain Terkirim!</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Laporan Anda akan segera ditindaklanjuti.</p>
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem', background: 'rgba(59,130,246,0.05)' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Nomor Tiket</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.05em' }}>{ticketId}</p>
          </div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Simpan nomor tiket untuk melacak status komplain Anda.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setStep('form'); setSubmitted(false); setName(''); setPhone(''); setFloor(''); setLocation(''); setTenant(''); setCategory(''); setCategoryCustom(''); setDescription(''); setPhotos([]); setErrors({}); }} className="btn-primary" style={{ flex: 1, padding: '0.65rem', fontSize: '0.8rem', minHeight: '44px', touchAction: 'manipulation' }}>
              Buat Komplain Baru
            </button>
            <button onClick={() => { setStep('form'); setSubmitted(false); setTrackMode(true); }} className="btn-secondary" style={{ flex: 1, padding: '0.65rem', fontSize: '0.8rem' }}>
              Lacak Tiket
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (trackMode) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        padding: '2rem', width: '100%'
      }}>
        <div className="glass-panel" style={{ maxWidth: 500, width: '100%', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button onClick={() => { setTrackMode(false); setTrackData(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Lacak Komplain</h3>
          </div>

          <form onSubmit={handleTrack} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="step-field">
              <label>CARI NOMOR TIKET / NAMA</label>
              <input type="text" value={trackId} onChange={e => setTrackId(e.target.value)} placeholder="Cth: CMP-20260605-001" className="modern-input" style={{ fontSize: '0.85rem' }} />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0.6rem', fontSize: '0.8rem' }}>Cari</button>
          </form>

          {trackData === 'notfound' && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              <AlertTriangle size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>Tiket tidak ditemukan. Periksa kembali nomor tiket atau nama Anda.</p>
            </div>
          )}

          {trackData && trackData !== 'notfound' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TIKET</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.03em' }}>{trackData.ticketId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>STATUS</span>
                  <span style={{
                    fontSize: '0.7rem', padding: '0.15rem 0.6rem', borderRadius: '20px', fontWeight: 700,
                    background: `${statusColor(trackData.status)}20`, color: statusColor(trackData.status)
                  }}>{trackData.status}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
                <div className="preview-row"><span className="preview-label">Pelapor</span><span className="preview-value">{trackData.name}</span></div>
                {trackData.phone && <div className="preview-row"><span className="preview-label">Telepon</span><span className="preview-value">{trackData.phone}</span></div>}
                <div className="preview-row"><span className="preview-label">Lantai</span><span className="preview-value">{trackData.floor}</span></div>
                {trackData.location && <div className="preview-row"><span className="preview-label">Lokasi</span><span className="preview-value">{trackData.location}</span></div>}
                <div className="preview-row"><span className="preview-label">Tenant</span><span className="preview-value">{trackData.tenant}</span></div>
                <div className="preview-row"><span className="preview-label">Kategori</span><span className="preview-value">{trackData.category}</span></div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>DESKRIPSI</p>
                <p>{trackData.description}</p>
              </div>

              {trackData.photos?.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.4rem' }}>FOTO</p>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {trackData.photos.map((p, i) => (
                      <img key={i} src={p} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-glass)' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>RIWAYAT STATUS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {trackData.history?.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor(h.status), flexShrink: 0 }} />
                        {i < trackData.history.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border-glass)', minHeight: 16 }} />}
                      </div>
                      <div style={{ fontSize: '0.72rem' }}>
                        <span style={{ fontWeight: 700, color: statusColor(h.status) }}>{h.status}</span>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{new Date(h.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        {h.note && <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', marginTop: '0.1rem' }}>{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button onClick={() => { setTrackMode(false); setTrackData(null); }} className="btn-secondary btn-full" style={{ marginTop: '1rem', padding: '0.5rem', fontSize: '0.75rem' }}>
            Kembali ke Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      padding: '2rem 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%'
    }}>
      <div className="glass-panel" style={{ maxWidth: 520, width: '100%', padding: '1.5rem 1.75rem', position: 'relative', overflow: 'hidden' }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(59,130,246,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(139,92,246,0.05)', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <img src="./jdc-logo.png" alt="SMPJDC" className="logo-3d" style={{ height: 32, width: 'auto' }} />
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1.2 }}>SMPJDC</h2>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sistem Komplain Terpadu</p>
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Sampaikan komplain, saran, atau laporan Anda tanpa perlu login.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', position: 'relative', zIndex: 1 }}>
          {/* Name */}
          <div className="step-field">
            <label>NAMA LENGKAP <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <div className="scan-input-group">
              <User size={16} style={{ color: 'var(--text-muted)', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="text" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                placeholder="Masukkan nama Anda" className="modern-input" style={{ paddingLeft: '2rem', fontSize: '0.82rem' }} />
            </div>
            {errors.name && <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{errors.name}</span>}
          </div>

          {/* Phone (optional) */}
          <div className="step-field">
            <label>NO. TELEPON <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opsional — untuk notifikasi)</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Cth: 08123456789" className="modern-input" style={{ fontSize: '0.82rem' }} />
          </div>

          {/* Floor */}
          <div className="step-field">
            <label>LANTAI <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select value={floor} onChange={e => { setFloor(e.target.value); setErrors(p => ({ ...p, floor: '' })); }} className="modern-select" style={{ fontSize: '0.82rem' }}>
              <option value="">— Pilih Lantai —</option>
              {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            {errors.floor && <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{errors.floor}</span>}
          </div>

          {/* Tenant */}
          <div className="step-field">
            <label>LOKASI DETAIL <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opsional)</span></label>
            <div className="scan-input-group">
              <MapPin size={16} style={{ color: 'var(--text-muted)', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Cth: Depan Lobby / Koridor Lt. 2" className="modern-input" style={{ paddingLeft: '2rem', fontSize: '0.82rem' }} />
            </div>
          </div>

          {/* Tenant */}
          <div className="step-field">
            <label>NAMA TENANT / UNIT / ANA SORUM <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <div className="scan-input-group">
              <Building size={16} style={{ color: 'var(--text-muted)', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="text" value={tenant} onChange={e => { setTenant(e.target.value); setErrors(p => ({ ...p, tenant: '' })); }}
                placeholder="Cth: PT Maju Jaya / Ana Sorum" className="modern-input" style={{ paddingLeft: '2rem', fontSize: '0.82rem' }} />
            </div>
            {errors.tenant && <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{errors.tenant}</span>}
          </div>

          {/* Category */}
          <div className="step-field">
            <label>KATEGORI KOMPLAIN <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <div className="complaint-cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem' }}>
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => { setCategory(c.id); setCategoryCustom(''); setErrors(p => ({ ...p, category: '' })); }} style={{
                  padding: '0.6rem 0.45rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, minHeight: '48px',
                  border: `1.5px solid ${category === c.id ? c.color : 'var(--border-glass)'}`,
                  background: category === c.id ? `${c.color}18` : 'transparent',
                  color: category === c.id ? c.color : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s', touchAction: 'manipulation'
                }}>{c.label}</button>
              ))}
            </div>
            {category === 'Lainnya' && (
              <input type="text" value={categoryCustom} onChange={e => setCategoryCustom(e.target.value)}
                placeholder="Ketik kategori lain..." className="modern-input" style={{ marginTop: '0.3rem', fontSize: '0.8rem' }} />
            )}
            {errors.category && <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{errors.category}</span>}
          </div>

          {/* Description */}
          <div className="step-field">
            <label>DESKRIPSI KOMPLAIN <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea value={description} onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
              placeholder="Jelaskan detail komplain Anda..." className="modern-input"
              style={{ height: '90px', resize: 'vertical', fontSize: '0.82rem', padding: '0.5rem' }} />
            {errors.description && <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{errors.description}</span>}
          </div>

          {/* Photos */}
          <div className="step-field">
            <label>FOTO BUKTI <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opsional, max 3)</span></label>
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                    <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < 3 && (
              <>
                {/* Hidden file input — dikontrol via ref agar kompatibel dengan Android WebView */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={handlePhotoCapture} className="btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', width: 'fit-content' }}>
                  <Camera size={14} /> {photos.length > 0 ? 'Tambah Foto' : 'Ambil / Upload Foto'}
                </button>
              </>
            )}
          </div>

          <button type="submit" className="btn-primary" style={{
            width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            fontSize: '0.85rem', marginTop: '0.25rem'
          }}>
            <Send size={16} /> Kirim Komplain
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <button onClick={() => setTrackMode(true)} style={{
            background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-sans)',
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
          }}>
            <QrCode size={13} /> Lacak Tiket Komplain
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '1rem', position: 'relative', zIndex: 1 }}>
          SMPJDC — Sistem Management Keamanan JDC &copy; 2026
        </p>
      </div>
    </div>
  );
}
