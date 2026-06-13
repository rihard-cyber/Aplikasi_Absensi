import React, { useState } from 'react';
import { MessageSquare, CheckCircle, AlertTriangle, Clock, Filter, Search, Send, Phone, Building, MapPin, User, FileText, X, ChevronRight, QrCode, Copy, Download, Printer } from 'lucide-react';
import { exportTableToPdf, formatDateForFile, formatDateTimeId, getFirstPhoto } from '../utils/exportPdf';

const DEPARTMENTS = ['Teknisi', 'Cleaning', 'Keamanan'];

const STATUS_OPTIONS = ['Baru', 'Diterima', 'Diproses', 'Selesai'];

export default function ComplaintAdmin({ complaints, onUpdateComplaint, onDeleteComplaint }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const [customBaseUrl, setCustomBaseUrl] = useState(() => {
    const saved = localStorage.getItem('smpjdc_custom_complaint_url');
    if (saved) return saved;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('::1') || origin.startsWith('file:')) {
      return 'https://rihard-cyber.github.io/SMP-JDC/';
    }
    return origin + pathname;
  });

  const complaintUrl = customBaseUrl + (customBaseUrl.includes('?') ? '&' : '?') + 'complaint';
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(complaintUrl)}`;
  const isUrlLocalhost = customBaseUrl.includes('localhost') || customBaseUrl.includes('127.0.0.1') || customBaseUrl.includes('::1');

  const statusColor = (s) => ({
    Baru: '#3b82f6', Diterima: '#f59e0b', Diproses: '#8b5cf6', Selesai: '#10b981'
  })[s] || '#6b7280';

  const filtered = complaints.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.ticketId.toLowerCase().includes(search.toLowerCase()) && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.tenant.toLowerCase().includes(search.toLowerCase()) && !(c.location || '').toLowerCase().includes(search.toLowerCase()) && !(c.phone || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const stats = {
    all: complaints.length,
    Baru: complaints.filter(c => c.status === 'Baru').length,
    Diproses: complaints.filter(c => c.status === 'Diproses' || c.status === 'Diterima').length,
    Selesai: complaints.filter(c => c.status === 'Selesai').length
  };

  const handleUpdateStatus = (id, newStatus) => {
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;
    const history = [...(complaint.history || []), { status: newStatus, timestamp: new Date().toISOString(), note: `Status diubah ke ${newStatus}` }];
    onUpdateComplaint(id, { status: newStatus, history, updatedAt: new Date().toISOString() });
  };

  const handleDispatch = (id, dept) => {
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;
    const history = [...(complaint.history || []), { status: 'Diproses', timestamp: new Date().toISOString(), note: `Didisposisikan ke ${dept}` }];
    onUpdateComplaint(id, { department: dept, status: 'Diproses', history, waStatus: `Terkirim (${dept})`, waSentAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB', updatedAt: new Date().toISOString() });
  };

  const handleExportComplaintPDF = () => {
    const ok = exportTableToPdf({
      title: 'Tiketing Komplain / Pengaduan Tenant, Pengunjung',
      fileName: `tiket-komplain-smpjdc-${formatDateForFile()}`,
      meta: [
        { label: 'Filter Status', value: filter === 'all' ? 'Semua' : filter },
        { label: 'Pencarian', value: search || '-' },
        { label: 'Total Data', value: filtered.length },
        { label: 'Sumber', value: 'Komplain Tenant' }
      ],
      columns: [
        { header: 'NO', width: '4%' },
        { header: 'JAM/TGGL KOMPLEN', width: '11%' },
        { header: 'NAMA LENGKAP', width: '9%' },
        { header: 'NO TELEPON', width: '9%' },
        { header: 'NAMA TENANT/SORUM/PENGUNJUNG', width: '13%' },
        { header: 'LOKASI', width: '8%' },
        { header: 'KATEGORI KOMPLAIN', width: '10%' },
        { header: 'DESKRIPSI KOMPLAIN', width: '15%' },
        { header: 'FOTO', width: '9%' },
        { header: 'STATUS (OPOSISI)', width: '8%' },
        { header: 'KETERANGAN', width: '8%' }
      ],
      rows: filtered.map((c, idx) => [
        idx + 1,
        formatDateTimeId(c.createdAt),
        c.name || '-',
        c.phone || '-',
        c.tenant || '-',
        c.location || c.floor || '-',
        c.category || '-',
        { text: c.description || '-', className: 'text-left' },
        { image: getFirstPhoto(c.photos), text: c.photos?.length ? `${c.photos.length} foto` : '-' },
        c.department ? `DI TERUSKAN KE ${String(c.department).toUpperCase()}` : (c.status || '-'),
        c.remarks || (c.status === 'Selesai' ? 'DONE' : (c.waStatus || '-'))
      ])
    });
    if (!ok) alert('Popup export PDF diblokir browser. Izinkan popup untuk aplikasi ini.');
  };

  return (
    <div>
      {/* Stats */}
      <div className="complaint-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total', value: stats.all, color: '#3b82f6' },
          { label: 'Baru', value: stats.Baru, color: '#3b82f6' },
          { label: 'Diproses', value: stats.Diproses, color: '#8b5cf6' },
          { label: 'Selesai', value: stats.Selesai, color: '#10b981' }
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.15rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* QR Code Button */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setShowQR(!showQR)} className="btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <QrCode size={14} /> {showQR ? 'Tutup' : 'QR Code Form Komplain'}
        </button>
        {showQR && (
          <div className="glass-panel" style={{ marginTop: '0.75rem', padding: '1.25rem', textAlign: 'center' }}>
            {isUrlLocalhost && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px dashed rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.72rem',
                marginBottom: '0.85rem',
                textAlign: 'left',
                lineHeight: '1.4'
              }}>
                <strong>⚠️ Peringatan Host Localhost:</strong> URL komplain saat ini mengarah ke <code>localhost</code> (kemungkinan karena dijalankan di Android/Simulator). Jika dicetak/discan oleh tenant menggunakan handphone mereka, halaman tidak akan bisa dibuka. Silakan sesuaikan <strong>URL Base Website Publik</strong> di bawah agar mengarah ke domain hosting online Anda (seperti Github Pages atau Vercel).
              </div>
            )}
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
              SCAN QR CODE UNTUK MEMBUKA FORM KOMPLAIN
            </p>
            <img src={qrApiUrl} alt="QR Code Komplain" style={{ width: 180, height: 180, borderRadius: '8px', border: '1px solid var(--border-glass)', marginBottom: '0.75rem' }} />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: '0.5rem' }}>
              <code>{complaintUrl}</code>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <button onClick={() => { navigator.clipboard?.writeText(complaintUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Copy size={12} /> {copied ? 'Tersalin!' : 'Salin Link'}
              </button>
              <a href={qrApiUrl} download="smpjdc-complaint-qr.png" className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
                <Download size={12} /> Download QR
              </a>
            </div>

            <div style={{ padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                URL BASE WEBSITE PUBLIK (Untuk QR Code)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomBaseUrl(val);
                    localStorage.setItem('smpjdc_custom_complaint_url', val);
                  }}
                  placeholder="https://rihard-cyber.github.io/SMP-JDC/"
                  className="modern-input"
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const defaultUrl = 'https://rihard-cyber.github.io/SMP-JDC/';
                    setCustomBaseUrl(defaultUrl);
                    localStorage.setItem('smpjdc_custom_complaint_url', defaultUrl);
                  }}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                >
                  Reset Default
                </button>
              </div>
              <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                * Tautan komplain di atas akan otomatis disesuaikan dan diakhiri dengan <code>?complaint</code>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 140px', minWidth: 120 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari tiket/nama/tenant..." className="modern-input" style={{ paddingLeft: '2rem', fontSize: '0.78rem' }} />
        </div>
        <div className="filter-tabs-wrap">
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {['all', 'Baru', 'Diterima', 'Diproses', 'Selesai'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700,
                border: `1.5px solid ${filter === f ? 'var(--color-primary)' : 'var(--border-glass)'}`,
                background: filter === f ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: filter === f ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)'
              }}>{f === 'all' ? 'Semua' : f}</button>
            ))}
          </div>
        </div>
        <button onClick={handleExportComplaintPDF} className="btn-primary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Printer size={12} /> Export PDF</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <FileText size={40} style={{ opacity: 0.2, marginBottom: '0.75rem', color: 'var(--text-muted)' }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Belum ada komplain masuk.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(c => (
            <div key={c.id} className="glass-panel" style={{
              padding: '0.75rem', transition: 'var(--transition-smooth)',
              borderLeft: `3px solid ${statusColor(c.status)}`,
              background: detail?.id === c.id ? 'rgba(59,130,246,0.05)' : undefined
            }}>
              <div
                onClick={() => setDetail(detail?.id === c.id ? null : c)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.02em', color: 'var(--color-primary)' }}>{c.ticketId}</span>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>{c.name}</span>
                  </div>
                  <span style={{
                    fontSize: '0.6rem', padding: '0.12rem 0.5rem', borderRadius: '20px', fontWeight: 700, whiteSpace: 'nowrap',
                    background: `${statusColor(c.status)}20`, color: statusColor(c.status)
                  }}>{c.status}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Building size={10} /> {c.tenant}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={10} /> {c.location || c.floor}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><AlertTriangle size={10} /> {c.category}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={10} /> {new Date(c.createdAt).toLocaleDateString('id-ID', { dateStyle: 'short' })}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', marginTop: '0.3rem' }}>{c.description}</p>

                {c.department && <div style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '0.2rem' }}>Disposisi: {c.department}</div>}
              </div>

              {/* Detail panel */}
              {detail?.id === c.id && (
                <div onClick={e => e.stopPropagation()} style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-glass)' }}>
                  {c.photos?.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem' }}>FOTO BUKTI</p>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {c.photos.map((p, i) => (
                          <a key={i} href={p} target="_blank" rel="noreferrer">
                            <img src={p} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-glass)' }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  {c.phone && (
                    <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
                      <Phone size={12} style={{ color: 'var(--color-success)' }} />
                      <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-success)', fontWeight: 600 }}>{c.phone}</a>
                    </div>
                  )}

                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem' }}>KETERANGAN ADMIN / HASIL AKHIR</p>
                    <textarea
                      defaultValue={c.remarks || ''}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value !== (c.remarks || '')) {
                          onUpdateComplaint(c.id, { remarks: value, updatedAt: new Date().toISOString() });
                        }
                      }}
                      placeholder="Contoh: DONE / Sudah ditindaklanjuti / Menunggu konfirmasi"
                      className="modern-input"
                      style={{ minHeight: '58px', height: '58px', resize: 'vertical', fontSize: '0.75rem', padding: '0.5rem' }}
                    />
                  </div>

                  {/* Timeline */}
                  {c.history?.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem' }}>RIWAYAT STATUS</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {c.history.map((h, i) => (
                          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(h.status), marginTop: 3, flexShrink: 0 }} />
                            <div style={{ fontSize: '0.68rem' }}>
                              <span style={{ fontWeight: 700, color: statusColor(h.status) }}>{h.status}</span>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{new Date(h.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                              {h.note && <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{h.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Status update */}
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem' }}>UBAH STATUS</p>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {STATUS_OPTIONS.filter(s => s !== c.status).map(s => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); handleUpdateStatus(c.id, s); }} style={{
                            padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, minHeight: '40px',
                            border: `1.5px solid ${statusColor(s)}`, background: `${statusColor(s)}15`,
                            color: statusColor(s), cursor: 'pointer', fontFamily: 'var(--font-sans)', touchAction: 'manipulation'
                          }}>{s}</button>
                        ))}
                      </div>
                    </div>

                    {/* Dispatch to department */}
                    {c.status !== 'Selesai' && (
                      <div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem' }}>DISPOSISI KE</p>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {DEPARTMENTS.map(d => (
                            <button key={d} onClick={(e) => { e.stopPropagation(); handleDispatch(c.id, d); }} style={{
                              padding: '0.4rem 0.7rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, minHeight: '44px',
                              border: `1.5px solid ${c.department === d ? 'var(--color-success)' : 'var(--border-glass)'}`,
                              background: c.department === d ? 'rgba(16,185,129,0.1)' : 'transparent',
                              color: c.department === d ? 'var(--color-success)' : 'var(--text-secondary)',
                              cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '0.2rem',
                              touchAction: 'manipulation'
                            }}><Send size={12} /> {d}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {onDeleteComplaint && (
                      <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.5rem' }}>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteComplaint(c.id); }} style={{
                          padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                          border: '1.5px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.08)',
                          color: '#ef4444', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                          display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}>
                          Hapus Tiket Komplain
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
