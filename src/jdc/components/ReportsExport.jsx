import React, { useState, useEffect } from 'react';
import { registerBackHandler } from '../utils/navigation';
import { 
  FileSpreadsheet, 
  FileText, 
  AlertTriangle,
  Eye,
  Filter,
  Clock
} from 'lucide-react';
import { buildWALink } from '../data/waContacts';
import POS_LIST from '../data/posList';
import { exportTableToPdf, formatDateForFile, formatDateTimeId, getFirstPhoto } from '../utils/exportPdf';

// Unique positions from posList sorted by lantai
const POS_OPTIONS = POS_LIST.reduce((acc, pos) => {
  if (!acc.find(p => p.titik === pos.titik)) {
    acc.push({ titik: pos.titik, lantai: pos.lantai });
  }
  return acc;
}, []).sort((a, b) => a.lantai.localeCompare(b.lantai));

export default function ReportsExport({ reports, findings, users, onUpdateFindingStatus, onDispatchFinding, onDeleteReport }) {
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (!selectedLog) return;
    const unregister = registerBackHandler(() => {
      setSelectedLog(null);
      return true;
    });
    return unregister;
  }, [selectedLog]);

  const generateWALink = (find, dept) => {
    return buildWALink(find, dept);
  };
  
  // SLA Timer helper
  const getSLATimer = (startDateStr, status) => {
    if (status === 'Closed') {
      return "Selesai < 2.5 Jam (SLA Hijau)";
    }
    const diffMs = Math.abs(new Date() - new Date(startDateStr));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const hrsVal = diffHrs > 0 ? `${diffHrs} Jam ` : '';
    return `SLA Aktif: ${hrsVal}${diffMins} Menit`;
  };

  // Filter States
  const [filterShift, setFilterShift] = useState('All');
  const [filterPost, setFilterPost] = useState('All');
  const [filterOfficer, setFilterOfficer] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [filterKondisi, setFilterKondisi] = useState('All');
  const [filterKategori, setFilterKategori] = useState('All');

  const filteredReports = reports.filter(r => {
    const matchShift = filterShift === 'All' || r.shift === filterShift;
    const matchPost = filterPost === 'All' || r.titik === filterPost;
    const matchOfficer = filterOfficer === 'All' || r.userName === filterOfficer;
    const matchDate = !filterDate || r.timestamp?.startsWith(filterDate);
    const matchKategori = filterKategori === 'All' || (r.kategori || '') === filterKategori;
    const matchKondisi = filterKondisi === 'All' || 
      (filterKondisi === 'Aman' && r.kondisi === 'Aman dan Kondusif') ||
      (filterKondisi === 'Temuan' && r.kondisi !== 'Aman dan Kondusif');

    return matchShift && matchPost && matchOfficer && matchDate && matchKategori && matchKondisi;
  });

  // Export to CSV/Excel
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Waktu,Petugas,Gedung,Lantai,Zona,Titik,Shift,Kategori,Kode Temuan,Temuan,Status,Keterangan,GPS Valid,Device,IP\n";

    filteredReports.forEach(r => {
      const row = [
        r.id,
        r.timestamp,
        r.userName,
        r.gedung,
        r.lantai,
        r.zona,
        r.titik,
        r.shift,
        r.kategori || '-',
        r.kodeTemuan || '-',
        r.temuan || r.kondisi || '-',
        r.status || '-',
        `"${r.keterangan || ''}"`,
        r.antiFraud?.gpsValid ? "YES" : "NO",
        r.antiFraud?.device || '-',
        r.antiFraud?.ip || '-'
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_keamanan_smpjdc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF with a dedicated print table
  const handleExportPDF = () => {
    const ok = exportTableToPdf({
      title: 'Hasil Patroli Barcode',
      fileName: `hasil-patroli-barcode-smpjdc-${formatDateForFile()}`,
      meta: [
        { label: 'Shift', value: filterShift },
        { label: 'Pos/Titik', value: filterPost },
        { label: 'Petugas', value: filterOfficer },
        { label: 'Total Scan', value: filteredReports.length }
      ],
      columns: [
        { header: 'NO', width: '4%' },
        { header: 'JAM/TGGL SCAN', width: '12%' },
        { header: 'PETUGAS', width: '9%' },
        { header: 'GEDUNG', width: '11%' },
        { header: 'LANTAI/ZONA', width: '8%' },
        { header: 'TITIK BARCODE', width: '12%' },
        { header: 'SHIFT', width: '6%' },
        { header: 'KATEGORI', width: '9%' },
        { header: 'TEMUAN/KONDISI', width: '11%' },
        { header: 'STATUS', width: '7%' },
        { header: 'KETERANGAN', width: '12%' },
        { header: 'FOTO', width: '8%' }
      ],
      rows: filteredReports.map((r, idx) => [
        idx + 1,
        formatDateTimeId(r.timestamp),
        r.userName || '-',
        r.gedung || '-',
        `${r.lantai || '-'} / ${r.zona || '-'}`,
        r.titik || '-',
        r.shift || '-',
        r.kategori || '-',
        r.temuan || r.kondisi || '-',
        r.status === 'critical' ? 'Critical' : r.status === 'temuan' ? 'Temuan' : 'Normal',
        { text: `${r.keterangan || '-'}\nGPS: ${r.antiFraud?.gpsValid ? 'Valid' : '-'}\nDevice: ${r.antiFraud?.device || '-'}`, className: 'text-left' },
        { image: r.foto, text: r.foto ? 'Foto bukti' : '-' }
      ])
    });
    if (!ok) alert('Popup export PDF diblokir browser. Izinkan popup untuk aplikasi ini.');
  };

  const handleExportFindingsPDF = () => {
    const ok = exportTableToPdf({
      title: 'Tiket Temuan & Tindak Lanjut',
      fileName: `tiket-temuan-smpjdc-${formatDateForFile()}`,
      meta: [
        { label: 'Total Temuan', value: findings.length },
        { label: 'Open', value: findings.filter(f => f.status !== 'Closed').length },
        { label: 'Closed', value: findings.filter(f => f.status === 'Closed').length },
        { label: 'Sumber', value: 'Temuan Patroli' }
      ],
      columns: [
        { header: 'NO', width: '4%' },
        { header: 'JAM/TGGL TEMUAN', width: '12%' },
        { header: 'PELAPOR', width: '9%' },
        { header: 'AREA/LOKASI', width: '12%' },
        { header: 'KATEGORI', width: '10%' },
        { header: 'DETAIL TEMUAN', width: '17%' },
        { header: 'SEVERITY', width: '7%' },
        { header: 'DISPOSISI', width: '8%' },
        { header: 'STATUS', width: '8%' },
        { header: 'WA STATUS', width: '8%' },
        { header: 'FOTO', width: '8%' }
      ],
      rows: findings.map((f, idx) => [
        idx + 1,
        formatDateTimeId(f.tanggal || f.createdAt),
        f.pelapor || '-',
        f.area || '-',
        f.kategori || '-',
        { text: f.detail || '-', className: 'text-left' },
        f.severity || '-',
        f.department || '-',
        f.status || '-',
        f.waStatus || '-',
        { image: getFirstPhoto(f.foto), text: f.foto ? 'Foto bukti' : '-' }
      ])
    });
    if (!ok) alert('Popup export PDF diblokir browser. Izinkan popup untuk aplikasi ini.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. FILTER CONTROLLER BAR */}
      <div className="glass-panel panel-body">
        <h4 className="section-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
          <Filter size={16} /> Filter & Cari Laporan
        </h4>
        
        <div className="form-grid-6">
          <div className="form-field">
            <span className="form-label">SHIFT</span>
            <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)} className="form-select form-select-sm">
              <option value="All">Semua Shift</option>
              <option value="Pagi">Pagi (06:00-14:00)</option>
              <option value="Siang">Siang (14:00-22:00)</option>
              <option value="Malam">Malam (22:00-06:00)</option>
            </select>
          </div>

          <div className="form-field">
            <span className="form-label">POS / TITIK</span>
            <select value={filterPost} onChange={(e) => setFilterPost(e.target.value)} className="form-select form-select-sm">
              <option value="All">Semua Pos</option>
              {POS_OPTIONS.map(p => (
                <option key={p.titik} value={p.titik}>
                  {p.titik} ({p.lantai})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <span className="form-label">PETUGAS</span>
            <select value={filterOfficer} onChange={(e) => setFilterOfficer(e.target.value)} className="form-select form-select-sm">
              <option value="All">Semua Petugas</option>
              {users.filter(u => ['Danru', 'Wadanru', 'Anggota'].includes(u.jabatan)).map(u => (
                <option key={u.id} value={u.nama}>{u.nama}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <span className="form-label">TANGGAL</span>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="form-input form-input-sm" />
          </div>

          <div className="form-field">
            <span className="form-label">KATEGORI</span>
            <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="form-select form-select-sm">
              <option value="All">Semua Kategori</option>
              <option value="Tenant & Ruang Sewa">Tenant & Ruang Sewa</option>
              <option value="Fasilitas Gedung">Fasilitas Gedung</option>
              <option value="Gangguan Operasional">Gangguan Operasional</option>
              <option value="Event & Aktivitas Khusus">Event & Aktivitas</option>
              <option value="Lain-Lain">Lain-Lain</option>
            </select>
          </div>

          <div className="form-field">
            <span className="form-label">STATUS</span>
            <select value={filterKondisi} onChange={(e) => setFilterKondisi(e.target.value)} className="form-select form-select-sm">
              <option value="All">Semua Status</option>
              <option value="Aman">Aman</option>
              <option value="Temuan">Temuan</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. FINDINGS TICKETS BOARD (Tindak Lanjut Notifikasi) */}
      <div className="glass-panel panel-padding">
        <div className="flex-between" style={{ marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)' }}>
            <AlertTriangle size={18} /> Tindak Lanjut Notifikasi Temuan
          </h3>
          <button onClick={handleExportFindingsPDF} className="btn-secondary btn-full" style={{ maxWidth: '190px' }}><FileText size={16} /> Export PDF Temuan</button>
        </div>
        
        <div className="form-grid-2">
          {findings.map(find => {
            const statusBorderColor = find.status === 'Open' ? 'var(--color-danger)' : find.status === 'On Progress' ? 'var(--color-warning)' : 'var(--color-success)';
            return (
              <div key={find.id} className="glass-panel finding-card" style={{ borderLeft: `4px solid ${statusBorderColor}` }}>
                {find.foto && <img src={find.foto} alt={find.kategori} className="finding-card-img" />}
                <div className="finding-card-content">
                  <div className="flex-between">
                    <div className="flex-row" style={{ gap: '0.3rem' }}>
                      <span className={`badge badge-${find.status === 'Open' ? 'danger' : find.status === 'On Progress' ? 'warning' : 'success'}`} style={{ fontSize: '0.65rem' }}>{find.status}</span>
                      <span className={`badge badge-${find.severity === 'Tinggi' ? 'danger' : find.severity === 'Sedang' ? 'warning' : 'info'}`} style={{ fontSize: '0.65rem', fontWeight: 700 }}>{find.severity || 'Rendah'}</span>
                    </div>
                    <span className="text-muted-sm">{new Date(find.tanggal).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h4 className="finding-card-title">{find.kategori}</h4>
                  <p className="finding-card-area">{find.area}</p>
                  <p className="finding-card-detail">"{find.detail}"</p>
                  <div className={`finding-card-timer ${find.status === 'Closed' ? 'timer-success' : 'timer-warning'}`}>
                    <Clock size={12} />
                    <span>{getSLATimer(find.tanggal, find.status)}</span>
                  </div>
                  <p className="finding-card-pelapor">Pelapor: {find.pelapor}</p>
                  <div className="finding-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="finding-card-actions-label">Ubah Status:</span>
                      <select value={find.status} onChange={(e) => onUpdateFindingStatus(find.id, e.target.value)} className="form-select form-select-sm" style={{ width: '110px' }}>
                        <option value="Open">Open</option>
                        <option value="On Progress">On Progress</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="finding-card-actions-label" style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>Disposisi Dept:</span>
                      <select 
                        value={find.department || 'Keamanan'} 
                        onChange={(e) => onDispatchFinding(find.id, e.target.value)} 
                        className="form-select form-select-sm" 
                        style={{ width: '110px' }}
                      >
                        <option value="Teknisi">🛠️ Teknisi</option>
                        <option value="Cleaning">🧹 Cleaning</option>
                        <option value="Keamanan">🛡️ Keamanan</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Status Forward WA:</span>
                      <span style={{ fontWeight: 700, color: find.waStatus?.startsWith('Terkirim') ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {find.waStatus || 'Belum Dikirim'}
                      </span>
                    </div>

                    <a 
                      href={generateWALink(find, find.department || 'Keamanan')}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        onDispatchFinding(find.id, find.department || 'Keamanan');
                      }}
                      className="btn-success"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        padding: '0.4rem',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        marginTop: '0.2rem',
                        background: '#25d366',
                        border: 'none',
                        textAlign: 'center'
                      }}
                    >
                      📲 Forward ke WA Kepala {find.department || 'Keamanan'}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
          {findings.length === 0 && (
            <div className="empty-state" style={{ gridColumn: 'span 2' }}>Tidak ada temuan kendala aktif.</div>
          )}
        </div>
      </div>

      {/* 3. REPORTS DATA TABLE */}
      <div className="glass-panel panel-body">
        <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Log Laporan Patroli Keamanan ({filteredReports.length})</h3>
          <div className="flex-row" style={{ gap: '0.5rem' }}>
            <button onClick={handleExportCSV} className="btn-secondary btn-full"><FileSpreadsheet size={16} /> Export Excel (CSV)</button>
            <button onClick={handleExportPDF} className="btn-primary btn-full"><FileText size={16} /> Export PDF Patroli</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table-data">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Petugas</th>
                <th>Lokasi</th>
                <th>Kategori</th>
                <th>Temuan</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, idx) => (
                <tr key={report.id} className={idx % 2 === 0 ? 'row-even' : ''}>
                  <td>
                    <div className="td-label">{new Date(report.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</div>
                    <div className="td-sub">{new Date(report.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <span className="td-meta">Shift {report.shift}</span>
                  </td>
                  <td>
                    <span className="td-label">{report.userName}</span>
                    <div className="td-meta">Shift {report.shift}</div>
                  </td>
                  <td>
                    <div className="td-mono">{report.titik}</div>
                    <span className="td-meta">{['1','2','3','4','5','6'].includes(report.lantai) ? `Lt. ${report.lantai}` : report.lantai} ({report.zona})</span>
                  </td>
                  <td>
                    <span className="td-primary">{report.kategori || '-'}</span>
                    {report.kodeTemuan && <div className="td-meta">{report.kodeTemuan}</div>}
                  </td>
                  <td style={{ maxWidth: '150px' }}>
                    <span>{report.temuan || report.kondisi || '-'}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${report.status === 'critical' ? 'danger' : report.status === 'temuan' ? 'warning' : 'success'}`}>
                      {report.status === 'critical' ? 'Critical' : report.status === 'temuan' ? 'Temuan' : 'Normal'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setSelectedLog(report)} className="btn-icon-primary" style={{ fontSize: '0.75rem' }}>
                      <Eye size={12} /> Lihat
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">Tidak ada laporan ditemukan dengan filter tersebut.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DETAILED LOG MODAL */}
      {selectedLog && (
        <div className="modal-overlay">
          <div className="glass-panel modal-panel">
            <h3 className="modal-title">Detail Patroli #{selectedLog.id}</h3>
            
            <div className="modal-body">
              <div className="modal-row">
                <span className="modal-label">Waktu Scan:</span>
                <span className="modal-value">{new Date(selectedLog.timestamp).toLocaleString('id-ID')} WIB</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Petugas Patroli:</span>
                <span className="modal-value">{selectedLog.userName}</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Area Pos:</span>
                <span className="modal-value">{selectedLog.titik} ({['1','2','3','4','5','6'].includes(selectedLog.lantai) ? `Lt.${selectedLog.lantai}` : selectedLog.lantai} {selectedLog.zona})</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Kategori:</span>
                <span className="td-primary">{selectedLog.kategori || '-'}</span>
              </div>
              {selectedLog.kodeTemuan && (
                <div className="modal-row">
                  <span className="modal-label">Kode Temuan:</span>
                  <span className="modal-value" style={{ fontFamily: 'monospace' }}>{selectedLog.kodeTemuan}</span>
                </div>
              )}
              <div className="modal-row">
                <span className="modal-label">Temuan:</span>
                <span className="modal-value" style={{ fontWeight: 700 }}>{selectedLog.temuan || selectedLog.kondisi || '-'}</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Status:</span>
                <span className={`badge badge-${selectedLog.status === 'critical' ? 'danger' : selectedLog.status === 'temuan' ? 'warning' : 'success'}`}>
                  {selectedLog.status === 'critical' ? 'Critical' : selectedLog.status === 'temuan' ? 'Temuan' : 'Normal'}
                </span>
              </div>
              <div className="modal-keterangan">
                <span className="modal-label-sm">Keterangan Laporan:</span>
                <p className="modal-keterangan-text">"{selectedLog.keterangan || '-'}"</p>
              </div>
            </div>

            {selectedLog.foto && (
              <div>
                <span className="modal-label-sm">Bukti Foto Temuan:</span>
                <img src={selectedLog.foto} alt="Bukti temuan" className="modal-foto" />
              </div>
            )}

            <div className="modal-audit">
              <h5 className="modal-audit-title">Audit Anti-Kecurangan</h5>
              <div className="modal-audit-body">
                <div>GPS Validation: <span className="audit-ok">{selectedLog.antiFraud?.radius ? `RADIUS OK (${selectedLog.antiFraud.radius} meter)` : 'Tidak tersedia'}</span></div>
                <div>Token Lokasi: <span className="audit-mono">{selectedLog.antiFraud?.dynamicToken || '-'}</span></div>
                <div>Spesifikasi HP: <span>{selectedLog.antiFraud?.device || '-'}</span></div>
                <div>IP & Jaringan: <span>{selectedLog.antiFraud?.ip || '-'}</span></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={() => setSelectedLog(null)} className="btn-primary" style={{ flex: 1 }}>
                Tutup Rincian
              </button>
              {onDeleteReport && (
                <button onClick={() => { const id = selectedLog.id; setSelectedLog(null); onDeleteReport(id); }} className="btn-danger" style={{ flex: '0 0 auto', padding: '0.65rem 1rem' }}>
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
