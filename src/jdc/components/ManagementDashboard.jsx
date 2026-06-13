import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Check,
  BarChart3, 
  AlertOctagon,
  AlertTriangle,
  Sparkles,
  Zap,
  Activity,
  ClipboardList,
  Send,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Phone,
  Shield,
  FileText
} from 'lucide-react';
import { getWAContacts, buildWAMessage, buildWALink } from '../data/waContacts';
import { hapticMedium, hapticSuccess, hapticError, hapticWarning } from '../utils/haptics';
import { exportTableToPdf, formatDateForFile, formatDateTimeId, getFirstPhoto } from '../utils/exportPdf';

const SEVERITY_COLOR = {
  Kritis: '#dc2626',
  Tinggi: '#ef4444',
  Sedang: '#f59e0b',
  Rendah: '#3b82f6',
};

const STATUS_COLOR = {
  Open:        { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Open' },
  'In Progress': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'In Progress' },
  Closed:      { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Selesai' },
};

const DEPARTMENTS = ['Teknisi', 'Cleaning', 'Keamanan'];
const COMPLAINT_STATUS_COLOR = {
  Baru: '#3b82f6', Diterima: '#f59e0b', Diproses: '#8b5cf6', Selesai: '#10b981'
};

export default function ManagementDashboard({ 
  theme = 'dark',
  reports, 
  findings, 
  areas, 
  users, 
  attendanceLogs = [], 
  mutasiLogs = [], 
  complaints = [], 
  onUpdateStatus, 
  onDispatchFinding, 
  onUpdateComplaint, 
  onDeleteComplaint,
  onDeleteFinding,
  onArchiveOldData 
}) {
  const [graphFilter, setGraphFilter] = useState('hari');
  const [selectedFloor, setSelectedFloor] = useState('Basement');
  const [activeTab, setActiveTab] = useState('semua'); // 'semua' | 'Teknisi' | 'Cleaning' | 'Keamanan'
  const [expandedFinding, setExpandedFinding] = useState(null);
  const [showWASent, setShowWASent] = useState({});
  const [selectedFindings, setSelectedFindings] = useState([]);
  const [complaintFilter, setComplaintFilter] = useState('all');
  const [expandedComplaint, setExpandedComplaint] = useState(null);
  const [activeCommandTab, setActiveCommandTab] = useState('temuan');

  const STATUS_OPTIONS = ['Baru', 'Diterima', 'Diproses', 'Selesai'];

  const filteredComplaints = [...complaints]
    .filter(c => complaintFilter === 'all' || c.status === complaintFilter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Load WA contacts dynamically from localStorage
  const WA_CONTACTS = getWAContacts();

  // ── Kalkulasi KPI ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const reportsToday = reports.filter(r => r.timestamp?.startsWith(today));
  const totalPatrolsToday = reportsToday.length;
  const patrolledAreasToday = new Set(reportsToday.map(r => r.areaId));
  
  // ── Multi-shift: ambil semua log absensi hari ini (dari semua shift) ─────────
  const todayAllLogs = attendanceLogs ? attendanceLogs.filter(log => log.tanggal === today) : [];
  const todayAttendance = todayAllLogs.length > 0 ? todayAllLogs[0] : null; // tetap ada untuk backward compat

  let kpiHadir = 0, kpiAlpha = 0, kpiSakit = 0, kpiIzin = 0;
  if (todayAllLogs.length > 0) {
    // Agregasi semua shift hari ini — hindari duplikat personil yang sama lintas shift
    const seen = new Set();
    todayAllLogs.forEach(log => {
      (log.details || []).forEach(d => {
        const key = String(d.personilId || d.userId);
        if (seen.has(key)) return;
        seen.add(key);
        if (d.status === 'Hadir' || d.status === 'Tukar Shift') kpiHadir++;
        else if (d.status === 'Sakit') kpiSakit++;
        else if (d.status === 'Cuti') kpiIzin++;
        else if (d.status === 'Tidak Hadir' || d.status === 'Mangkir') kpiAlpha++;
      });
    });
  } else {
    kpiHadir = users.filter(u => ['Danru', 'Wadanru', 'Anggota'].includes(u.jabatan)).length;
  }

  const dispositionedComplaintsAsFindings = useMemo(() => complaints
    .filter(c => c.department && c.status !== 'Baru')
    .map(c => ({
      id: `complaint-${c.id}`,
      isFromComplaint: true,
      originalId: c.id,
      department: c.department,
      status: c.status === 'Selesai' ? 'Closed' : c.status === 'Diproses' ? 'In Progress' : 'Open',
      severity: 'Sedang',
      waStatus: c.waStatus || '',
      tanggal: c.createdAt,
      kategori: c.category || 'Komplain Tenant',
      detail: c.description,
      area: `${c.floor || ''} - ${c.tenant || ''}`,
      pelapor: c.name,
      waSentAt: c.waSentAt,
      foto: c.photos && c.photos.length > 0 ? c.photos[0] : null,
      complaintData: c
    })), [complaints]);

  const combinedFindings = useMemo(() => [...findings, ...dispositionedComplaintsAsFindings].sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0)), [findings, dispositionedComplaintsAsFindings]);

  const totalFindingsOpen = combinedFindings.filter(f => f.status !== 'Closed').length;
  const unvisitedAreas = areas.filter(a => !patrolledAreasToday.has(a.id));
  const missedAreas = unvisitedAreas.slice(0, 4);

  // ── Findings berdasarkan dept ──────────────────────────────────────────────
  const findingsByDept = useMemo(() => ({
    Teknisi:  combinedFindings.filter(f => f.department === 'Teknisi'),
    Cleaning: combinedFindings.filter(f => f.department === 'Cleaning'),
    Keamanan: combinedFindings.filter(f => f.department === 'Keamanan'),
  }), [combinedFindings]);
  const filteredFindings = useMemo(() => activeTab === 'semua' ? combinedFindings : findingsByDept[activeTab] || [], [activeTab, combinedFindings, findingsByDept]);

  // WA already sent count
  const waSentCount = dept => combinedFindings.filter(f => f.department === dept && f.waStatus?.startsWith('Terkirim')).length;

  // ── Dispatch handler ───────────────────────────────────────────────────────
  const handleDispatch = (finding, dept) => {
    hapticMedium();
    if (finding.isFromComplaint) {
      const history = [...(finding.complaintData.history || []), { status: 'Diproses', timestamp: new Date().toISOString(), note: `Didisposisikan ulang ke ${dept} dari Dashboard` }];
      if (onUpdateComplaint) {
        onUpdateComplaint(finding.originalId, {
          department: dept, status: 'Diproses', history,
          waStatus: `Terkirim (${dept})`,
          waSentAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      if (onDispatchFinding) onDispatchFinding(finding.id, dept);
    }
    setShowWASent(prev => ({ ...prev, [finding.id]: dept }));
    window.open(buildWALink(finding, dept), '_blank', 'noopener');
  };

  // ── Graph Data (dari data real) ──────────────────────────────────────────────
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const hariNames = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const graphMinggu = last7Days.map(date => {
    const dayReports = reports.filter(r => r.timestamp?.startsWith(date));
    const dayFindings = combinedFindings.filter(f => f.tanggal?.startsWith(date));
    return { label: hariNames[new Date(date).getDay()], patrols: dayReports.length, findings: dayFindings.length };
  });
  const graphBulan = Array.from({length: 4}, (_, i) => {
    const week = i + 1;
    const weekReports = reports.filter(r => {
      if (!r.timestamp) return false;
      const d = new Date(r.timestamp);
      const weekOfMonth = Math.ceil(d.getDate() / 7);
      return weekOfMonth === week;
    });
    return { label: `M${week}`, patrols: weekReports.length, findings: 0 };
  });
  const graphData = {
    hari:   { labels: ['00:00','04:00','08:00','12:00','16:00','20:00'], patrols: [2,1,8,12,10,4], findings: [0,0,1,2,1,0] },
    minggu: { labels: graphMinggu.map(g => g.label), patrols: graphMinggu.map(g => g.patrols), findings: graphMinggu.map(g => g.findings) },
    bulan:  { labels: graphBulan.map(g => g.label), patrols: graphBulan.map(g => g.patrols), findings: graphBulan.map(g => g.findings) },
    tahun:  { labels: ['Jan','Mar','Mei','Jul','Sep','Nov'],              patrols: [520,610,680,590,710,800], findings: [45,52,38,41,62,50] },
  };
  const activeGraph = graphData[graphFilter];
  const maxPatrolVal = Math.max(...activeGraph.patrols) * 1.15;

  // ── Attendance per Regu (aggregate all shifts) ──────────────────────────────
  const reguList = ['Regu A', 'Regu B', 'Regu C', 'Regu D'];
  const reguAttendance = reguList.map(regu => {
    const members = users.filter(u => u.regu === regu && ['Danru', 'Wadanru', 'Anggota'].includes(u.jabatan));
    const total = members.length;
    let hadir = 0, alpha = 0, sakit = 0, izin = 0;
    const seen = new Set();
    todayAllLogs.forEach(log => {
      (log.details || []).forEach(d => {
        const uid = d.personilId || d.userId;
        if (!uid) return;
        const user = members.find(u => u.id === uid);
        if (!user) return;
        const key = String(uid);
        if (seen.has(key)) return;
        seen.add(key);
        if (d.status === 'Hadir' || d.status === 'Tukar Shift') hadir++;
        else if (d.status === 'Tidak Hadir' || d.status === 'Mangkir') alpha++;
        else if (d.status === 'Sakit') sakit++;
        else if (d.status === 'Cuti') izin++;
      });
    });
    return { regu, total, hadir, alpha, sakit, izin, pct: total > 0 ? Math.round((hadir / total) * 100) : 0 };
  });

  // ── Patrol performance per Regu ────────────────────────────────────────────
  const reguPatrol = reguList.map(regu => {
    const memberIds = users.filter(u => u.regu === regu && ['Danru', 'Wadanru', 'Anggota'].includes(u.jabatan)).map(u => u.id);
    const patrolCount = reportsToday.filter(r => memberIds.includes(r.userId)).length;
    const coveredAreas = new Set(reportsToday.filter(r => memberIds.includes(r.userId)).map(r => r.areaId));
    return { regu, patrolCount, coveredAreas: coveredAreas.size };
  });

  // ── Security Health Score ───────────────────────────────────────────────────
  const patrolPct = areas.length > 0 ? (patrolledAreasToday.size / areas.length) * 100 : 0;
  const attendancePct = (kpiHadir + kpiAlpha + kpiSakit + kpiIzin) > 0
    ? (kpiHadir / (kpiHadir + kpiAlpha + kpiSakit + kpiIzin)) * 100 : 100;
  const findingsClosed = combinedFindings.length > 0 ? (combinedFindings.filter(f => f.status === 'Closed').length / combinedFindings.length) * 100 : 100;
  const complaintsResolved = complaints.length > 0 ? (complaints.filter(c => c.status === 'Selesai').length / complaints.length) * 100 : 100;
  const healthScore = Math.round(
    (patrolPct * 0.30) + (attendancePct * 0.25) + (findingsClosed * 0.25) + (complaintsResolved * 0.20)
  );
  const healthLabel = healthScore >= 90 ? 'Sangat Baik' : healthScore >= 75 ? 'Baik' : healthScore >= 60 ? 'Cukup' : 'Perlu Perhatian';
  const healthColor = healthScore >= 90 ? '#10b981' : healthScore >= 75 ? '#3b82f6' : healthScore >= 60 ? '#f59e0b' : '#ef4444';

  const generateAISummary = () => {
    const unresolved = combinedFindings.filter(f => f.status !== 'Closed').length;
    const critical = combinedFindings.filter(f => f.severity === 'Kritis' && f.status !== 'Closed').length;
    const waSent = combinedFindings.filter(f => f.waStatus?.startsWith('Terkirim')).length;
    return `Ringkasan SMPJDC: Hari ini tercatat ${totalPatrolsToday} scan patroli. ` +
      `${patrolledAreasToday.size} dari ${areas.length} area telah dijamah (${areas.length > 0 ? Math.round((patrolledAreasToday.size/areas.length)*100) : 0}% kepatuhan). ` +
      `Terdapat ${unresolved} tiket temuan aktif${critical > 0 ? `, ${critical} di antaranya KRITIS` : ''}. ` +
      `${waSent} tiket telah diteruskan via WhatsApp. ` +
      `${unvisitedAreas.length > 0 ? `${unvisitedAreas.length} area masih belum dipatroli hari ini.` : 'Seluruh area telah dipatroli. '}`;
  };

  const handleExportCommandFindingsPDF = () => {
    const ok = exportTableToPdf({
      title: 'Tiket Temuan & Disposisi Operasional',
      fileName: `dashboard-temuan-disposisi-smpjdc-${formatDateForFile()}`,
      meta: [
        { label: 'Filter Dept', value: activeTab === 'semua' ? 'Semua' : activeTab },
        { label: 'Total Tiket', value: filteredFindings.length },
        { label: 'Open', value: filteredFindings.filter(f => f.status !== 'Closed').length },
        { label: 'WA Terkirim', value: filteredFindings.filter(f => f.waStatus?.startsWith('Terkirim')).length }
      ],
      columns: [
        { header: 'NO', width: '4%' },
        { header: 'JAM/TGGL', width: '12%' },
        { header: 'PELAPOR', width: '10%' },
        { header: 'AREA/LOKASI', width: '13%' },
        { header: 'KATEGORI', width: '10%' },
        { header: 'DETAIL', width: '18%' },
        { header: 'SEVERITY', width: '7%' },
        { header: 'DISPOSISI', width: '8%' },
        { header: 'STATUS', width: '8%' },
        { header: 'WA STATUS', width: '8%' },
        { header: 'FOTO', width: '8%' }
      ],
      rows: filteredFindings.map((f, idx) => [
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

  const handleExportDashboardComplaintsPDF = () => {
    const ok = exportTableToPdf({
      title: 'Tiketing Komplain / Pengaduan Tenant, Pengunjung',
      fileName: `dashboard-komplain-tenant-smpjdc-${formatDateForFile()}`,
      meta: [
        { label: 'Filter Status', value: complaintFilter === 'all' ? 'Semua' : complaintFilter },
        { label: 'Total Komplain', value: filteredComplaints.length },
        { label: 'Selesai', value: filteredComplaints.filter(c => c.status === 'Selesai').length },
        { label: 'Sumber', value: 'Dashboard Manajemen' }
      ],
      columns: [
        { header: 'NO', width: '4%' },
        { header: 'JAM/TGGL KOMPLEN', width: '12%' },
        { header: 'NAMA LENGKAP', width: '10%' },
        { header: 'NO TELEPON', width: '9%' },
        { header: 'NAMA TENANT/SORUM/PENGUNJUNG', width: '13%' },
        { header: 'LOKASI', width: '9%' },
        { header: 'KATEGORI KOMPLAIN', width: '10%' },
        { header: 'DESKRIPSI KOMPLAIN', width: '16%' },
        { header: 'FOTO', width: '8%' },
        { header: 'STATUS (OPOSISI)', width: '9%' },
        { header: 'KETERANGAN', width: '8%' }
      ],
      rows: filteredComplaints.map((c, idx) => [
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

  // ── Area Status ────────────────────────────────────────────────────────────
  const getAreaStatus = (areaId) => {
    const ar = reportsToday.filter(r => r.areaId === areaId);
    if (!ar.length) return 'unvisited';
    const hasActive = combinedFindings.some(f => f.reportId === ar[0].id && f.status !== 'Closed');
    return hasActive ? 'problematic' : 'patrolled';
  };

  // ── Dept Tab style ─────────────────────────────────────────────────────────
  const tabStyle = (tab) => ({
    border: 'none',
    background: activeTab === tab ? (tab === 'semua' ? 'rgba(99,102,241,0.2)' : `${WA_CONTACTS[tab]?.color || '#6366f1'}22`) : 'transparent',
    color: activeTab === tab ? (tab === 'semua' ? '#818cf8' : WA_CONTACTS[tab]?.color) : 'var(--text-secondary)',
    padding: '0.45rem 1rem', fontSize: '0.82rem', borderRadius: '8px',
    cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
    borderBottom: activeTab === tab ? `2px solid ${tab === 'semua' ? '#818cf8' : WA_CONTACTS[tab]?.color}` : '2px solid transparent'
  });

  // ── Presence keaktifan status calculation ──────────────────────────────────
  const statsKeaktifan = users.filter(u => ['Danru', 'Wadanru', 'Anggota', 'BKO', 'KH (Khusus)'].includes(u.jabatan)).map(member => {
    let isOnline = false;
    if (member.lastActive) {
      const diffMs = new Date() - new Date(member.lastActive);
      isOnline = diffMs < 300000; // 5 minutes threshold
    }
    return isOnline;
  });
  const totalOnline = statsKeaktifan.filter(x => x).length;
  const totalOffline = statsKeaktifan.filter(x => !x).length;
  const totalActiveStaff = totalOnline + totalOffline || 1;
  const onlinePct = (totalOnline / totalActiveStaff) * 100;

  // ── Calculations for Widget 5 (Category Doughnut) ─────────────────────────
  const catsCount = {
    Fasilitas: findings.filter(f => f.kategori === 'Fasilitas').length + complaints.filter(c => c.category === 'Fasilitas').length,
    Engineering: findings.filter(f => f.kategori === 'Engineering').length + complaints.filter(c => c.category === 'Engineering').length,
    Cleaning: findings.filter(f => f.kategori === 'Cleaning').length + complaints.filter(c => c.category === 'Cleaning').length,
    Keamanan: findings.filter(f => f.kategori === 'Keamanan').length + complaints.filter(c => c.category === 'Satpam').length,
    Lainnya: findings.filter(f => f.kategori === '-' || f.kategori === 'Lainnya').length + complaints.filter(c => c.category === 'Lainnya').length
  };
  const totalCatSum = catsCount.Fasilitas + catsCount.Engineering + catsCount.Cleaning + catsCount.Keamanan + catsCount.Lainnya || 1;
  const p1 = Math.round((catsCount.Fasilitas / totalCatSum) * 100);
  const p2 = Math.round((catsCount.Engineering / totalCatSum) * 100);
  const p3 = Math.round((catsCount.Cleaning / totalCatSum) * 100);
  const p4 = Math.round((catsCount.Keamanan / totalCatSum) * 100);

  const c1 = '#ec4899'; // Fasilitas
  const c2 = '#8b5cf6'; // Engineering
  const c3 = '#00f0ff'; // Cleaning
  const c4 = '#3b82f6'; // Keamanan
  const c5 = '#64748b'; // Lainnya

  const doughnutGradientStr = `conic-gradient(
    ${c1} 0% ${p1}%,
    ${c2} ${p1}% ${p1+p2}%,
    ${c3} ${p1+p2}% ${p1+p2+p3}%,
    ${c4} ${p1+p2+p3}% ${p1+p2+p3+p4}%,
    ${c5} ${p1+p2+p3+p4}% 100%
  )`;

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapInstanceRef = useRef(null);
  const markerGroupRef = useRef(null);

  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletLoaded || activeCommandTab !== 'patroli') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerGroupRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      const mapEl = document.getElementById('leaflet-map');
      if (!mapEl) return;

      const defaultLat = -6.2023;
      const defaultLng = 106.7996;

      let map = mapInstanceRef.current;
      if (!map) {
        map = window.L.map('leaflet-map').setView([defaultLat, defaultLng], 15);
        mapInstanceRef.current = map;

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const jdcIcon = window.L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color:#3b82f6; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #3b82f6;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        window.L.marker([defaultLat, defaultLng], { icon: jdcIcon }).addTo(map)
          .bindPopup('<b>Jakarta Design Center (JDC)</b><br/>Gedung Pusat Keamanan').openPopup();

        markerGroupRef.current = window.L.layerGroup().addTo(map);
      }

      if (markerGroupRef.current) {
        markerGroupRef.current.clearLayers();

        reports.forEach(r => {
          const coords = r.antiFraud?.coords || r.anti_fraud?.coords;
          if (coords && coords.latitude && coords.longitude) {
            const lat = parseFloat(coords.latitude);
            const lng = parseFloat(coords.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              const isAman = r.kondisi === 'Aman dan Kondusif' || r.kondisi === 'Ada Aktivitas' || r.kondisi === 'Renovasi';
              const color = isAman ? '#10b981' : '#ef4444';
              const markerIcon = window.L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color:${color}; width:10px; height:10px; border-radius:50%; border:2px solid white; box-shadow: 0 0 8px ${color};"></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5]
              });
              window.L.marker([lat, lng], { icon: markerIcon })
                .bindPopup(`<b>Patroli: ${r.titik || '-'}</b><br/>Petugas: ${r.userName || '-'}<br/>Kondisi: ${r.kondisi || '-'}<br/>Waktu: ${new Date(r.timestamp).toLocaleTimeString()}`)
                .addTo(markerGroupRef.current);
            }
          }
        });
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [leafletLoaded, activeCommandTab, reports]);

  const getLast7DaysStats = useMemo(() => {
    const days = [];
    const scanCounts = [];
    const complaintCounts = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const countScans = reports.filter(r => r.timestamp?.startsWith(dateStr)).length;
      const countComplaints = complaints.filter(c => c.createdAt?.startsWith(dateStr) || c.created_at?.startsWith(dateStr)).length;
      
      const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      days.push(label);
      scanCounts.push(countScans);
      complaintCounts.push(countComplaints);
    }
    
    return { days, scanCounts, complaintCounts };
  }, [reports, complaints]);

  const liveTerminalLogs = useMemo(() => {
    const logs = [];
    
    reports.forEach(r => {
      logs.push({
        time: new Date(r.timestamp),
        timeStr: new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: `📍 [SCAN PATROLI] Petugas ${r.userName || 'System'} di ${r.titik || 'Pos Jaga'} (${r.lantai || '-'}). Status: ${r.kondisi || '-'}`,
        color: r.kondisi === 'Aman dan Kondusif' ? '#10b981' : '#f59e0b'
      });
    });
    
    mutasiLogs.forEach(m => {
      const logTime = m.createdAt || m.created_at || m.tanggal;
      logs.push({
        time: new Date(logTime),
        timeStr: new Date(logTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: `📝 [BUKU MUTASI] Petugas ${m.petugas || 'System'} mencatat: "${m.uraian || '-'}" di ${m.lokasi || '-'}`,
        color: '#8b5cf6'
      });
    });
    
    complaints.forEach(c => {
      const logTime = c.createdAt || c.created_at;
      logs.push({
        time: new Date(logTime),
        timeStr: new Date(logTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: `📩 [KOMPLAIN TENANT] Tiket #${c.ticketId || c.id} dibuat oleh ${c.name || 'Tenant'}: "${c.description || '-'}"`,
        color: '#ef4444'
      });
    });
    
    return logs.sort((a, b) => b.time - a.time).slice(0, 30);
  }, [reports, mutasiLogs, complaints]);

  const renderSVGChart = () => {
    const { days, scanCounts, complaintCounts } = getLast7DaysStats;
    const maxVal = Math.max(...scanCounts, ...complaintCounts, 5);
    
    const width = 500;
    const height = 150;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const getPointsStr = (counts) => {
      return counts.map((val, idx) => {
        const x = padding + (idx * chartWidth) / 6;
        const y = padding + chartHeight - (val * chartHeight) / maxVal;
        return `${x},${y}`;
      }).join(' ');
    };
    
    const scanPoints = getPointsStr(scanCounts);
    const complaintPoints = getPointsStr(complaintCounts);
    
    return (
      <div className="cyber-card" style={{ flex: 1, minWidth: '280px' }}>
        <div className="cyber-title" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Activity size={12} className="cyber-title-accent"/> Tren Aktivitas 7 Hari Terakhir
        </div>
        <div style={{ position: 'relative', height: '180px', width: '100%', marginTop: '0.5rem' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = padding + chartHeight * ratio;
              return (
                <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid-line" strokeWidth="1" />
              );
            })}
            
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              points={scanPoints}
              style={{ filter: 'drop-shadow(0px 0px 4px rgba(59, 130, 246, 0.5))' }}
            />
            {scanCounts.map((val, idx) => {
              const x = padding + (idx * chartWidth) / 6;
              const y = padding + chartHeight - (val * chartHeight) / maxVal;
              return (
                <g key={idx}>
                  <circle cx={x} cy={y} r="4" fill="#3b82f6" className="chart-dot-stroke" strokeWidth="1.5" />
                  <text x={x} y={y - 8} fill="#3b82f6" fontSize="7" fontWeight="bold" textAnchor="middle">{val}</text>
                </g>
              );
            })}
            
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              points={complaintPoints}
              style={{ filter: 'drop-shadow(0px 0px 4px rgba(239, 68, 68, 0.5))' }}
            />
            {complaintCounts.map((val, idx) => {
              const x = padding + (idx * chartWidth) / 6;
              const y = padding + chartHeight - (val * chartHeight) / maxVal;
              return (
                <g key={idx}>
                  <circle cx={x} cy={y} r="4" fill="#ef4444" className="chart-dot-stroke" strokeWidth="1.5" />
                  <text x={x} y={y - 8} fill="#ef4444" fontSize="7" fontWeight="bold" textAnchor="middle">{val}</text>
                </g>
              );
            })}
            
            {days.map((day, idx) => {
              const x = padding + (idx * chartWidth) / 6;
              return (
                <text key={idx} x={x} y={height - 2} className="chart-axis-text" fontSize="7" textAnchor="middle">{day}</text>
              );
            })}
          </svg>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', fontSize: '0.68rem', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '4px', background: '#3b82f6', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Scan QR Patroli</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '4px', background: '#ef4444', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Keluhan Tenant</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLiveTerminal = () => {
    return (
      <div className="cyber-card" style={{ flex: 1, minWidth: '280px', background: '#090d16', border: '1px solid rgba(0, 240, 255, 0.15)', padding: '1rem', borderRadius: '12px', boxShadow: '0 0 15px rgba(0, 240, 255, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 240, 255, 0.1)', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
          <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.72rem', fontWeight: 'bold', color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f0ff', display: 'inline-block' }} />
            SYSTEM CORE ACTIVITY LOG
          </span>
          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>SECURE CHANNEL ACTIVE</span>
        </div>
        <div style={{
          maxHeight: '160px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '0.72rem',
          padding: '0.25rem 0'
        }}>
          {liveTerminalLogs.map((log, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', color: '#8892b0', lineHeight: '1.4' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }}>[{log.timeStr}]</span>
              <span style={{ color: log.color }}>{log.text}</span>
            </div>
          ))}
          {liveTerminalLogs.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
              No system activity logs found. Waiting for reports...
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="management-dashboard-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <style>{`
        /* Futuristic layout styles for Dashboard Hub */
        .cyber-grid-container {
          display: grid;
          grid-template-columns: 2.2fr 1.2fr;
          gap: 1.5rem;
          width: 100%;
        }
        .cyber-left-col {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .cyber-right-col {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .cyber-row-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .cyber-card {
          background: #111625;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }
        .cyber-card:hover {
          /* HAPUS transform: translateY — membuat stacking context yang memblokir scroll!
             Gunakan box-shadow + border saja */
          box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5), 0 0 15px rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.3);
        }
        .cyber-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.03) 0%, transparent 70%);
          pointer-events: none;
        }
        .cyber-title {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #94a3b8;
          margin-bottom: 1.2rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .cyber-title-accent {
          color: var(--color-primary);
        }
        .cyber-radial-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .cyber-radial-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .cyber-info-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .cyber-color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        /* Premium Light Theme overrides for cyber-card and contents */
        .theme-light .cyber-card {
          background: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04) !important;
        }
        .theme-light .cyber-card:hover {
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08), 0 0 12px rgba(37, 99, 235, 0.12) !important;
          border-color: rgba(37, 99, 235, 0.25) !important;
        }
        .theme-light .cyber-card::after {
          background: radial-gradient(circle at 100% 0%, rgba(37, 99, 235, 0.02) 0%, transparent 70%) !important;
        }
        .theme-light .cyber-title {
          color: #334155 !important;
        }
        .theme-light .cyber-radial-info {
          color: #475569 !important;
        }
        .theme-light .cyber-info-item span {
          color: #475569 !important;
        }
        .theme-light .cyber-card span {
          color: #475569 !important;
        }
        .theme-light .cyber-card strong {
          color: #0f172a !important;
        }
        
        /* Concentric ring track overrides in Light theme */
        .cyber-track-ring {
          stroke: #1c203a;
        }
        .theme-light .cyber-track-ring {
          stroke: #e2e8f0 !important;
        }

        /* SVG Chart Grid lines and Axis Texts */
        .chart-grid-line {
          stroke: rgba(255, 255, 255, 0.05);
        }
        .theme-light .chart-grid-line {
          stroke: rgba(0, 0, 0, 0.06) !important;
        }
        .chart-axis-text {
          fill: rgba(255, 255, 255, 0.4);
        }
        .theme-light .chart-axis-text {
          fill: rgba(15, 23, 42, 0.6) !important;
        }
        .chart-dot-stroke {
          stroke: #111625;
        }
        .theme-light .chart-dot-stroke {
          stroke: #ffffff !important;
        }
        
        /* Command Tab Panels styling */
        .command-tab-bar {
          display: flex;
          gap: 0.4rem;
          background: rgba(19, 27, 46, 0.6);
          padding: 0.25rem;
          border-radius: 12px;
          border: 1px solid var(--border-glass);
          margin-bottom: 1rem;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .command-tab-bar::-webkit-scrollbar {
          display: none;
        }
        .command-tab-btn {
          flex: 1;
          padding: 0.65rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          font-weight: 700;
          font-size: 0.8rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          transition: all 0.25s ease;
          white-space: nowrap;
        }
        .command-tab-btn.active {
          background: var(--color-primary);
          color: white;
          box-shadow: 0 0 12px var(--color-primary-glow);
        }
        .command-tab-btn:hover:not(.active) {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        /* Light theme overrides for tabs bar */
        .theme-light .command-tab-bar {
          background: #e2e8f0 !important;
          border-color: #cbd5e1 !important;
        }
        .theme-light .command-tab-btn {
          color: #475569 !important;
        }
        .theme-light .command-tab-btn.active {
          background: #2563eb !important;
          color: white !important;
          box-shadow: 0 0 12px rgba(37, 99, 235, 0.25) !important;
        }
        .theme-light .command-tab-btn:hover:not(.active) {
          background: rgba(0, 0, 0, 0.03) !important;
          color: #0f172a !important;
        }

        /* Slide-in animation for tab changes */
        @keyframes slide-in-tab {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .command-tab-content {
          animation: slide-in-tab 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (max-width: 1024px) {
          .cyber-grid-container {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .cyber-row-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ── AESTHETICS DASHBOARD GRIDS ── */}
      <div className="cyber-grid-container">
        
        {/* Left Column Section */}
        <div className="cyber-left-col">
          
          {/* Row 1: concentric circles and attendance loop progress */}
          <div className="cyber-row-grid">
            
            {/* Widget 1: Concentric rings */}
            <div className="cyber-card">
              <div className="cyber-title"><Activity size={12} className="cyber-title-accent"/> Persentase Operasional JDC</div>
              <div className="cyber-radial-container">
                <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" className="cyber-track-ring" strokeWidth="6" />
                  <circle cx="50" cy="50" r="30" fill="transparent" className="cyber-track-ring" strokeWidth="6" />
                  <circle cx="50" cy="50" r="20" fill="transparent" className="cyber-track-ring" strokeWidth="6" />
                  
                  {/* Rings */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ec4899" strokeWidth="6" 
                    strokeDasharray="251.3" strokeDashoffset={251.3 - (patrolPct / 100) * 251.3} 
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                  <circle cx="50" cy="50" r="30" fill="transparent" stroke="#00f0ff" strokeWidth="6" 
                    strokeDasharray="188.5" strokeDashoffset={188.5 - (attendancePct / 100) * 188.5} 
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                  <circle cx="50" cy="50" r="20" fill="transparent" stroke="#8b5cf6" strokeWidth="6" 
                    strokeDasharray="125.7" strokeDashoffset={125.7 - (findingsClosed / 100) * 125.7} 
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                </svg>
                <div className="cyber-radial-info">
                  <div className="cyber-info-item">
                    <div className="cyber-color-dot" style={{ background: '#ec4899' }} />
                    <span>Patroli: <strong>{Math.round(patrolPct)}%</strong></span>
                  </div>
                  <div className="cyber-info-item">
                    <div className="cyber-color-dot" style={{ background: '#00f0ff' }} />
                    <span>Absen: <strong>{Math.round(attendancePct)}%</strong></span>
                  </div>
                  <div className="cyber-info-item">
                    <div className="cyber-color-dot" style={{ background: '#8b5cf6' }} />
                    <span>Temuan: <strong>{Math.round(findingsClosed)}%</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 2: Attendance capsule loop */}
            <div className="cyber-card">
              <div className="cyber-title"><Users size={12} className="cyber-title-accent"/> Status Absensi & Kehadiran</div>
              {(() => {
                const totalAttendanceSum = kpiHadir + kpiAlpha + kpiSakit + kpiIzin || 1;
                const presentPercentage = (kpiHadir / totalAttendanceSum) * 100;
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexGrow: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <div className="cyber-info-item">
                        <div className="cyber-color-dot" style={{ background: '#00f0ff' }} />
                        <span>Hadir: <strong style={{ color: '#00f0ff' }}>{kpiHadir}</strong></span>
                      </div>
                      <div className="cyber-info-item">
                        <div className="cyber-color-dot" style={{ background: '#fbbf24' }} />
                        <span>Sakit/Izin: <strong style={{ color: '#fbbf24' }}>{kpiSakit + kpiIzin}</strong></span>
                      </div>
                      <div className="cyber-info-item">
                        <div className="cyber-color-dot" style={{ background: '#ec4899' }} />
                        <span>Alpha: <strong style={{ color: '#ec4899' }}>{kpiAlpha}</strong></span>
                      </div>
                    </div>
                    
                    <div style={{ position: 'relative', width: '110px', height: '55px', flexShrink: 0 }}>
                      <svg width="110" height="55" viewBox="0 0 120 60">
                        <defs>
                          <linearGradient id="capsuleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00f0ff" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                        <path d="M 25,10 H 95 A 18,18 0 0,1 113,28 A 18,18 0 0,1 95,46 H 25 A 18,18 0 0,1 7,28 A 18,18 0 0,1 25,10 Z"
                          fill="transparent" className="cyber-track-ring" strokeWidth="6" />
                        <path d="M 25,10 H 95 A 18,18 0 0,1 113,28 A 18,18 0 0,1 95,46 H 25 A 18,18 0 0,1 7,28 A 18,18 0 0,1 25,10 Z"
                          fill="transparent" stroke="url(#capsuleGrad)" strokeWidth="6" strokeLinecap="round"
                          strokeDasharray="265" strokeDashoffset={265 - (presentPercentage / 100) * 265}
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                      </svg>
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        fontSize: '0.75rem', fontWeight: 800, color: 'white'
                      }}>
                        {Math.round(presentPercentage)}%
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Row 2: Slanted Weekly Activity */}
          <div className="cyber-card">
            <div className="cyber-title"><BarChart3 size={12} className="cyber-title-accent"/> Aktivitas & Tren Patroli Mingguan</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', height: '125px', marginTop: '0.25rem' }}>
              {graphMinggu.map((g, idx) => {
                const heightPct = maxPatrolVal > 0 ? (g.patrols / maxPatrolVal) * 100 : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: '26px',
                      height: '95px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      position: 'relative',
                      transform: 'skewX(-12deg)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-glass)'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${Math.max(heightPct, 4)}%`,
                        background: 'linear-gradient(to top, #db2777 0%, #ec4899 100%)',
                        boxShadow: '0 0 10px #ec4899',
                        borderRadius: '4px',
                        transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.4rem', fontWeight: 700 }}>
                      {g.label}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: '#ec4899', fontWeight: 800 }}>
                      {g.patrols}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3: Target Kepatuhan & Connection Arcs */}
          <div className="cyber-row-grid">
            
            {/* Widget 6: Target semi-circle gauge */}
            <div className="cyber-card">
              <div className="cyber-title"><CheckCircle size={12} className="cyber-title-accent"/> Pencapaian Target Kepatuhan</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexGrow: 1 }}>
                <div style={{ position: 'relative', width: '110px', height: '70px', flexShrink: 0 }}>
                  <svg width="110" height="70" viewBox="0 0 120 70">
                    <defs>
                      <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <path d="M 10,65 A 50,50 0 0,1 110,65" fill="none" className="cyber-track-ring" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 10,65 A 50,50 0 0,1 110,65" fill="none" stroke="url(#arcGrad)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray="157" strokeDashoffset={157 - (Math.min(patrolPct, 100) / 100) * 157}
                      style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                  </svg>
                  <div style={{
                    position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
                    fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)'
                  }}>
                    {Math.round(patrolPct)}%
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <div>Dipatroli: <strong>{patrolledAreasToday.size}</strong> pos</div>
                  <div>Sisa: <strong style={{ color: '#ef4444' }}>{areas.length - patrolledAreasToday.size}</strong> pos</div>
                  <div>Target: <strong style={{ color: '#00f0ff' }}>90%</strong></div>
                </div>
              </div>
            </div>

            {/* Widget 7: Opposite curves */}
            <div className="cyber-card">
              <div className="cyber-title"><Zap size={12} className="cyber-title-accent"/> Kinerja & Keaktifan Regu</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexGrow: 1 }}>
                <div style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
                  <svg width="70" height="70" viewBox="0 0 80 80">
                    <path d="M 25,15 A 25,25 0 0,0 25,65" fill="none" className="cyber-track-ring" strokeWidth="5" strokeLinecap="round" />
                    <path d="M 25,15 A 25,25 0 0,0 25,65" fill="none" stroke="#00f0ff" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray="78.5" strokeDashoffset={78.5 - (onlinePct / 100) * 78.5} />
                      
                    <path d="M 55,65 A 25,25 0 0,0 55,15" fill="none" className="cyber-track-ring" strokeWidth="5" strokeLinecap="round" />
                    <path d="M 55,65 A 25,25 0 0,0 55,15" fill="none" stroke="#ec4899" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray="78.5" strokeDashoffset={78.5 - ((100 - onlinePct) / 100) * 78.5} />
                  </svg>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900, color: healthColor }}>{healthScore}</div>
                    <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <div className="cyber-info-item">
                    <div className="cyber-color-dot" style={{ background: '#00f0ff' }} />
                    <span>Aktif: <strong style={{ color: 'var(--text-primary)' }}>{totalOnline}</strong></span>
                  </div>
                  <div className="cyber-info-item">
                    <div className="cyber-color-dot" style={{ background: '#ec4899' }} />
                    <span>Pasif: <strong style={{ color: 'var(--text-primary)' }}>{totalOffline}</strong></span>
                  </div>
                  <div style={{ fontSize: '0.65rem' }}>Indeks: <strong style={{ color: healthColor }}>{healthLabel}</strong></div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column Section */}
        <div className="cyber-right-col">
          
          {/* Widget 3: Horizontal Progress Pills */}
          <div className="cyber-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="cyber-title"><Shield size={12} className="cyber-title-accent"/> Kepatuhan Patroli Per Regu</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center', flex: 1 }}>
              {reguPatrol.map((r) => {
                const totalAreas = areas.length || 1;
                const covered = r.coveredAreas;
                const pct = Math.min(Math.round((covered / totalAreas) * 100), 100);
                return (
                  <div key={r.regu} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.regu}</span>
                      <span style={{ color: '#00f0ff', fontWeight: 800 }}>{pct}%</span>
                    </div>
                    <div style={{
                      height: '14px',
                      borderRadius: '999px',
                      background: 'var(--bg-tertiary)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-glass)',
                      position: 'relative'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.max(pct, 5)}%`,
                        background: 'linear-gradient(90deg, #3b82f6 0%, #00f0ff 100%)',
                        boxShadow: '0 0 6px #00f0ff',
                        borderRadius: '999px',
                        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Widget 5: Category Doughnut chart */}
          <div className="cyber-card">
            <div className="cyber-title"><AlertTriangle size={12} className="cyber-title-accent"/> Kategori Temuan & Komplain</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div style={{ 
                position: 'relative', width: '105px', height: '105px', borderRadius: '50%', 
                background: doughnutGradientStr, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                boxShadow: '0 0 15px rgba(0,0,0,0.5)', flexShrink: 0
              }}>
                <div style={{ 
                  width: '75px', height: '75px', borderRadius: '50%', background: 'var(--bg-secondary)', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {findings.length + complaints.length}
                  </span>
                  <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Laporan
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.35rem', width: '100%', justifyContent: 'space-between', fontSize: '0.62rem', flexWrap: 'wrap' }}>
                <div className="cyber-info-item">
                  <div className="cyber-color-dot" style={{ background: c1 }} />
                  <span>Fas: <strong>{catsCount.Fasilitas}</strong></span>
                </div>
                <div className="cyber-info-item">
                  <div className="cyber-color-dot" style={{ background: c2 }} />
                  <span>Eng: <strong>{catsCount.Engineering}</strong></span>
                </div>
                <div className="cyber-info-item">
                  <div className="cyber-color-dot" style={{ background: c3 }} />
                  <span>Cln: <strong>{catsCount.Cleaning}</strong></span>
                </div>
                <div className="cyber-info-item">
                  <div className="cyber-color-dot" style={{ background: c4 }} />
                  <span>Kmn: <strong>{catsCount.Keamanan}</strong></span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── AI SUMMARY SUMMARY CARD ── */}
      <div className="glass-panel" style={{
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.08) 100%)',
        border: '1px solid rgba(59,130,246,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} style={{ color: '#60a5fa' }} />
            <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Security Summary - SMPJDC</h4>
          </div>
          <span style={{ fontSize: '0.6rem', color: '#60a5fa', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Zap size={10} /> Auto-Generated
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.5', fontStyle: 'italic', margin: 0 }}>
          "{generateAISummary()}"
        </p>
      </div>

      {/* ── COMMAND HUB & REAL-TIME OPERASIONAL TABS (Bottom Section) ── */}
      <div>
        <div className="command-tab-bar">
          <button className={`command-tab-btn ${activeCommandTab === 'temuan' ? 'active' : ''}`} onClick={() => setActiveCommandTab('temuan')}>
            📋 Tiket Temuan & Disposisi ({combinedFindings.length})
          </button>
          <button className={`command-tab-btn ${activeCommandTab === 'komplain' ? 'active' : ''}`} onClick={() => setActiveCommandTab('komplain')}>
            📩 Komplain Tenant ({complaints.length})
          </button>
          <button className={`command-tab-btn ${activeCommandTab === 'patroli' ? 'active' : ''}`} onClick={() => setActiveCommandTab('patroli')}>
            🗺️ Heatmap & Live Feed
          </button>
          <button className={`command-tab-btn ${activeCommandTab === 'mutasi' ? 'active' : ''}`} onClick={() => setActiveCommandTab('mutasi')}>
            📝 Log Buku Mutasi ({mutasiLogs.length})
          </button>
          <button className={`command-tab-btn ${activeCommandTab === 'arsip' ? 'active' : ''}`} onClick={() => setActiveCommandTab('arsip')}>
            ⚙️ Pengaturan & Arsip
          </button>
        </div>

        {/* Tab 1: Tiket Temuan & Disposisi */}
        {activeCommandTab === 'temuan' && (
          <div className="command-tab-content glass-panel finding-section-panel" style={{ padding: '1.5rem' }}>
            {/* Filter Tabs & Bulk Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white' }}>
                  Daftar Temuan Keamanan & Fasilitas
                </h4>
                <button onClick={handleExportCommandFindingsPDF} className="btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><FileText size={12} /> Export PDF</button>
                {selectedFindings.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{selectedFindings.length} terpilih</span>
                    {Object.entries(WA_CONTACTS).filter(([dept]) => dept !== 'semua').map(([dept, info]) => (
                      <button key={dept} onClick={() => {
                        selectedFindings.forEach((id, idx) => {
                          const f = combinedFindings.find(fi => fi.id === id);
                          if (f) {
                            if (f.isFromComplaint) {
                              const history = [...(f.complaintData.history || []), { status: 'Diproses', timestamp: new Date().toISOString(), note: `Didisposisikan ke ${dept} dari Dashboard Bulk` }];
                              if (onUpdateComplaint) {
                                onUpdateComplaint(f.originalId, {
                                  department: dept, status: 'Diproses', history,
                                  waStatus: `Terkirim (${dept})`,
                                  waSentAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
                                  updatedAt: new Date().toISOString()
                                });
                              }
                            } else {
                              if (onDispatchFinding) onDispatchFinding(f.id, dept);
                            }
                            setShowWASent(prev => ({ ...prev, [f.id]: dept }));
                            setTimeout(() => window.open(buildWALink(f, dept), '_blank', 'noopener'), idx * 300);
                          }
                        });
                        setSelectedFindings([]);
                      }} style={{
                        padding: '0.25rem 0.5rem', fontSize: '0.62rem', borderRadius: '6px', fontWeight: 700,
                        border: `1px solid ${info.color}44`, background: `${info.color}12`, color: info.color,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontFamily: 'var(--font-sans)'
                      }}>
                        <Send size={9}/> Forward {selectedFindings.length} ke {dept}
                      </button>
                    ))}
                    <button onClick={() => setSelectedFindings([])} style={{
                      padding: '0.25rem 0.4rem', fontSize: '0.62rem', borderRadius: '6px', fontWeight: 600,
                      border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)'
                    }}>Batal</button>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '10px' }}>
                {['semua', 'Teknisi', 'Cleaning', 'Keamanan'].map(tab => (
                  <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
                    {tab === 'semua' ? '🗂 Semua' : `${WA_CONTACTS[tab]?.emoji} ${tab}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Table / List */}
            {filteredFindings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }}/>
                <p style={{ fontSize: '0.9rem' }}>Tidak ada tiket temuan{activeTab !== 'semua' ? ` untuk departemen ${activeTab}` : ''} saat ini.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredFindings.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    <div onClick={() => {
                      if (selectedFindings.length === filteredFindings.length) {
                        setSelectedFindings([]);
                      } else {
                        setSelectedFindings(filteredFindings.map(f => f.id));
                      }
                    }} style={{
                      width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, cursor: 'pointer',
                      border: `2px solid ${selectedFindings.length === filteredFindings.length ? 'var(--color-primary)' : 'var(--border-glass)'}`,
                      background: selectedFindings.length === filteredFindings.length ? 'var(--color-primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                    }}>
                      {selectedFindings.length === filteredFindings.length && <Check size={10} color="white" strokeWidth={3}/>}
                    </div>
                    <span>Pilih semua ({filteredFindings.length} tiket)</span>
                  </div>
                )}
                {filteredFindings.map(finding => {
                  const dept = finding.department || 'Keamanan';
                  const contact = WA_CONTACTS[dept] || WA_CONTACTS.Keamanan;
                  const statusCfg = STATUS_COLOR[finding.status] || STATUS_COLOR['Open'];
                  const sevColor = SEVERITY_COLOR[finding.severity] || '#3b82f6';
                  const isExpanded = expandedFinding === finding.id;
                  const waAlreadySent = finding.waStatus?.startsWith('Terkirim');

                  return (
                    <div
                      key={finding.id}
                      className="finding-ticket"
                      style={{
                        borderLeft: `4px solid ${contact.color}`,
                        borderRadius: '8px',
                        background: isExpanded ? 'rgba(255,255,255,0.01)' : 'transparent',
                        border: `1px solid ${waAlreadySent ? 'rgba(16,185,129,0.15)' : 'var(--border-glass)'}`,
                        marginBottom: '0.4rem'
                      }}
                    >
                      <div
                        className="finding-ticket-header"
                        onClick={(e) => {
                          if (e.target.closest('.finding-checkbox')) return;
                          setExpandedFinding(isExpanded ? null : finding.id);
                        }}
                        style={{
                          padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: '0.5rem', cursor: 'pointer', flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '200px' }}>
                          <div className="finding-checkbox" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFindings(prev =>
                              prev.includes(finding.id) ? prev.filter(id => id !== finding.id) : [...prev, finding.id]
                            );
                          }} style={{
                            width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                            border: `2px solid ${selectedFindings.includes(finding.id) ? 'var(--color-primary)' : 'var(--border-glass)'}`,
                            background: selectedFindings.includes(finding.id) ? 'var(--color-primary)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}>
                            {selectedFindings.includes(finding.id) && <Check size={12} color="white" strokeWidth={3}/>}
                          </div>
                          <span className="finding-ticket-badge" style={{ color: contact.color, background: `${contact.color}15`, fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            {contact.emoji} {dept}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>#{String(finding.id).slice(-6)}</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>{finding.kategori}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: sevColor, background: `${sevColor}12`, padding: '0.15rem 0.45rem', borderRadius: '99px' }}>
                            {finding.severity || 'Rendah'}
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: statusCfg.color, background: statusCfg.bg, padding: '0.15rem 0.5rem', borderRadius: '99px' }}>
                            {statusCfg.label}
                          </span>
                          {waAlreadySent && (
                            <span style={{ fontSize: '0.65rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                              <CheckCircle2 size={11}/> Sent
                            </span>
                          )}
                          {isExpanded ? <ChevronUp size={15} color="var(--text-muted)"/> : <ChevronDown size={15} color="var(--text-muted)"/>}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border-glass)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.15)' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: 2, minWidth: '180px' }}>
                              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 700 }}>DETAIL LAPORAN</p>
                              <p style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>"{finding.detail}"</p>
                              {finding.area && <p style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginTop: '0.4rem' }}>📍 Lokasi: {finding.area}</p>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '120px' }}>
                              <div><strong>Pelapor:</strong> {finding.pelapor}</div>
                              <div><strong>Tanggal:</strong> {new Date(finding.tanggal).toLocaleDateString('id-ID')}</div>
                              <div><strong>Disposisi:</strong> {dept}</div>
                              {finding.waSentAt && <div style={{ color: '#10b981' }}><strong>Sent WA:</strong> {finding.waSentAt}</div>}
                            </div>
                          </div>

                          {finding.foto && (
                            <div>
                              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>FOTO BUKTI</p>
                              <img src={finding.foto} alt="" style={{ maxWidth: '160px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}/>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {['Open', 'In Progress', 'Closed'].map(s => (
                                <button
                                  key={s}
                                  onClick={() => {
                                    if (finding.isFromComplaint) {
                                      const mappedStatus = s === 'Closed' ? 'Selesai' : s === 'In Progress' ? 'Diproses' : 'Diterima';
                                      const history = [...(finding.complaintData.history || []), { status: mappedStatus, timestamp: new Date().toISOString(), note: `Status diubah ke ${mappedStatus} dari Dashboard Temuan` }];
                                      if (onUpdateComplaint) {
                                        onUpdateComplaint(finding.originalId, { status: mappedStatus, history, updatedAt: new Date().toISOString() });
                                      }
                                    } else {
                                      if (onUpdateStatus) onUpdateStatus(finding.id, s);
                                    }
                                  }}
                                  style={{
                                    padding: '0.25rem 0.6rem', fontSize: '0.68rem', borderRadius: '5px',
                                    border: finding.status === s ? `1.5px solid ${STATUS_COLOR[s]?.color}` : '1px solid var(--border-glass)',
                                    background: finding.status === s ? STATUS_COLOR[s]?.bg : 'transparent',
                                    color: finding.status === s ? STATUS_COLOR[s]?.color : 'var(--text-secondary)',
                                    cursor: 'pointer', fontWeight: finding.status === s ? 700 : 500
                                  }}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>

                            <div style={{ flex: 1 }}/>

                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {Object.keys(WA_CONTACTS).filter(d => d !== dept).map(d => (
                                <button
                                  key={d}
                                  onClick={() => handleDispatch({ ...finding, department: d }, d)}
                                  style={{
                                    padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '5px',
                                    border: `1px solid ${WA_CONTACTS[d].color}33`,
                                    background: `${WA_CONTACTS[d].color}08`,
                                    color: WA_CONTACTS[d].color,
                                    cursor: 600, display: 'flex', alignItems: 'center', gap: '0.2rem'
                                  }}
                                >
                                  <Send size={9}/> Forward {d}
                                </button>
                              ))}
                            </div>

                            <button
                              onClick={() => handleDispatch(finding, dept)}
                              className="btn-primary"
                              style={{
                                padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '6px',
                                background: waAlreadySent ? 'rgba(16,185,129,0.1)' : undefined,
                                border: waAlreadySent ? '1px solid #10b981' : undefined,
                                color: waAlreadySent ? '#10b981' : undefined
                              }}
                            >
                              <MessageCircle size={13}/> {waAlreadySent ? 'Kirim Ulang WA' : `Kirim WA ke Ka. ${dept}`}
                            </button>
                            {onDeleteFinding && !finding.isFromComplaint && (
                              <button
                                onClick={() => onDeleteFinding(finding.id)}
                                style={{
                                  padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '5px',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  background: 'rgba(239,68,68,0.08)',
                                  color: '#ef4444', cursor: 'pointer', fontWeight: 600,
                                  display: 'flex', alignItems: 'center', gap: '0.2rem'
                                }}
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Komplain Tenant */}
        {activeCommandTab === 'komplain' && (
          <div className="command-tab-content glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white' }}>
                Tiket Komplain & Pengaduan Tenant / Pengunjung
              </h4>
              <button onClick={handleExportDashboardComplaintsPDF} className="btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}><FileText size={12} /> Export PDF</button>
              <div style={{ display: 'flex', gap: '0.3rem', fontSize: '0.7rem' }}>
                {['all', 'Baru', 'Diproses', 'Selesai'].map(s => (
                  <button key={s} onClick={() => setComplaintFilter(s)} style={{
                    border: 'none', background: complaintFilter === s ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: complaintFilter === s ? '#818cf8' : 'var(--text-secondary)',
                    padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontWeight: complaintFilter === s ? 700 : 500
                  }}>
                    {s === 'all' ? `Semua (${complaints.length})` : `${s} (${s === 'Diproses' ? complaints.filter(c => c.status === 'Diproses' || c.status === 'Diterima').length : complaints.filter(c => c.status === s).length})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredComplaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} style={{ opacity: 0.25, marginBottom: '0.5rem' }}/>
                <p style={{ fontSize: '0.85rem' }}>Tidak ada komplain dengan status ini.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {filteredComplaints.map(c => {
                  const sc = COMPLAINT_STATUS_COLOR[c.status] || '#6b7280';
                  const isExpanded = expandedComplaint === c.id;
                  return (
                    <div key={c.id} style={{
                      borderRadius: '8px', border: `1px solid ${c.status === 'Baru' ? 'rgba(59,130,246,0.3)' : 'var(--border-glass)'}`,
                      background: c.status === 'Baru' ? 'rgba(59,130,246,0.02)' : 'transparent',
                      overflow: 'hidden'
                    }}>
                      <div onClick={() => setExpandedComplaint(isExpanded ? null : c.id)} style={{
                        padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap',
                        borderBottom: isExpanded ? '1px solid var(--border-glass)' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                            background: `${sc}12`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <MessageCircle size={13} color={sc}/>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-primary)' }}>{c.ticketId}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{c.name}</span>
                              <span style={{
                                  fontSize: '0.58rem', padding: '0.08rem 0.4rem', borderRadius: '99px', fontWeight: 700,
                                  background: `${sc}20`, color: sc
                                }}>{c.status}</span>
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.tenant} • {c.floor} • {c.category || 'Lainnya'}{c.department ? ` → ${c.department}` : ''}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {new Date(c.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                          </span>
                          {isExpanded ? <ChevronUp size={15} color="var(--text-muted)"/> : <ChevronDown size={15} color="var(--text-muted)"/>}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.15)' }}>
                          <div>
                            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>DESKRIPSI PENGADUAN</p>
                            <p style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>"{c.description}"</p>
                          </div>

                          {c.photos && c.photos.length > 0 && (
                            <div>
                              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>FOTO BUKTI ({c.photos.length})</p>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {c.photos.map((ph, idx) => (
                                  <img key={idx} src={ph} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-glass)' }}/>
                                ))}
                              </div>
                            </div>
                          )}

                          {c.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}>
                              <Phone size={12} style={{ color: 'var(--color-success)' }} />
                              <span style={{ color: 'var(--text-muted)' }}>Kontak Tenant:</span>
                              <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-success)', fontWeight: 700 }}>{c.phone}</a>
                            </div>
                          )}

                          {c.history && c.history.length > 0 && (
                            <div>
                              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>RIWAYAT STATUS</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {c.history.map((h, i) => (
                                  <div key={i} style={{ display: 'flex', gap: '0.45rem', alignItems: 'flex-start', fontSize: '0.68rem' }}>
                                    <div style={{
                                      width: '6px', height: '6px', borderRadius: '50%', marginTop: '0.25rem', flexShrink: 0,
                                      background: COMPLAINT_STATUS_COLOR[h.status] || '#6b7280'
                                    }}/>
                                    <div>
                                      <span style={{ fontWeight: 700, color: COMPLAINT_STATUS_COLOR[h.status] || 'var(--text-primary)' }}>{h.status}</span>
                                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                                        {new Date(h.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {h.note && <p style={{ color: 'var(--text-secondary)', marginTop: '0.05rem', fontSize: '0.65rem' }}>{h.note}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {STATUS_OPTIONS.filter(s => s !== c.status).map(s => (
                                <button key={s} onClick={() => {
                                  const history = [...(c.history || []), { status: s, timestamp: new Date().toISOString(), note: `Status diubah ke ${s} dari Dashboard` }];
                                  onUpdateComplaint && onUpdateComplaint(c.id, { status: s, history, updatedAt: new Date().toISOString() });
                                }} style={{
                                  padding: '0.25rem 0.55rem', fontSize: '0.68rem', borderRadius: '5px', fontWeight: 600,
                                  border: `1px solid ${COMPLAINT_STATUS_COLOR[s]}33`,
                                  background: `${COMPLAINT_STATUS_COLOR[s]}08`,
                                  color: COMPLAINT_STATUS_COLOR[s],
                                  cursor: 'pointer'
                                }}>
                                  {s}
                                </button>
                              ))}
                            </div>

                            <div style={{ flex: 1 }}/>

                            {c.status !== 'Selesai' && (
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '0.1rem' }}>
                                  Disposisi:
                                </span>
                                {DEPARTMENTS.map(d => {
                                  const contact = WA_CONTACTS[d] || WA_CONTACTS.Keamanan;
                                  return (
                                    <button key={d} onClick={() => {
                                      const history = [...(c.history || []), { status: 'Diproses', timestamp: new Date().toISOString(), note: `Didisposisikan ke ${d} dari Dashboard` }];
                                      onUpdateComplaint && onUpdateComplaint(c.id, {
                                        department: d, status: 'Diproses', history,
                                        waStatus: `Terkirim (${d})`,
                                        waSentAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
                                        updatedAt: new Date().toISOString()
                                      });
                                      const waMsg = encodeURIComponent(
                                        `*📋 KOMPLAIN MASUK JDC*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n${contact.emoji} *Disposisi ke: Ka. ${d}*\n\n🆔 *Tiket:* ${c.ticketId}\n🏢 *Tenant:* ${c.tenant} • Lt.${c.floor}\n📝 *Deskripsi:* ${c.description}\n\n⚡ *Mohon segera ditindaklanjuti!*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Sistem Manajemen Keamanan JDC_`
                                      );
                                      window.open(`https://api.whatsapp.com/send?phone=${contact.nomor}&text=${waMsg}`, '_blank', 'noopener');
                                    }} style={{
                                      padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '5px', fontWeight: 700,
                                      border: '1px solid var(--border-glass)', cursor: 'pointer',
                                      background: 'transparent', color: 'var(--text-secondary)',
                                      display: 'flex', alignItems: 'center', gap: '0.2rem'
                                    }}>
                                      <Send size={9}/> {d}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            <div style={{ flex: 1 }}/>
                            {onDeleteComplaint && (
                              <button
                                onClick={() => onDeleteComplaint(c.id)}
                                style={{
                                  padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '5px',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  background: 'rgba(239,68,68,0.08)',
                                  color: '#ef4444', cursor: 'pointer', fontWeight: 600,
                                  display: 'flex', alignItems: 'center', gap: '0.2rem'
                                }}
                              >
                                Hapus Tiket
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Heatmap & Live Feed */}
        {activeCommandTab === 'patroli' && (
          <div className="command-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white' }}>
                  <MapPin size={16} className="text-primary"/> Denah & Heatmap Kunjungan Patroli Gedung
                </h4>
                <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '8px', overflowX: 'auto', maxWidth: '100%', gap: '2px', whiteSpace: 'nowrap' }}>
                  {['Basement','1','2','3','4','5','6','Halaman Depan','Halaman Samping Kanan','Halaman Belakang','Halaman Samping Kiri'].map(floor => (
                    <button key={floor} onClick={() => setSelectedFloor(floor)} style={{
                      border: 'none', background: selectedFloor === floor ? 'var(--bg-tertiary)' : 'transparent',
                      color: selectedFloor === floor ? 'var(--color-primary)' : 'var(--text-secondary)',
                      padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer',
                      fontWeight: 700, flexShrink: 0
                    }}>
                      {['1','2','3','4','5','6'].includes(floor) ? `Lt. ${floor}` : floor}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-responsive" style={{ alignItems: 'center', width: '100%' }}>
                <div style={{ flex: 2, background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <div className="grid-cols-4" style={{ gap: '0.65rem' }}>
                    {areas.filter(a => a.lantai === selectedFloor).map(area => {
                      const status = getAreaStatus(area.id);
                      let colorClass = '#ef4444';
                      let statusText = 'Belum Dipatroli';
                      if (status === 'patrolled') { colorClass = '#10b981'; statusText = 'Aman / Sudah Dipatroli'; }
                      else if (status === 'problematic') { colorClass = '#f59e0b'; statusText = 'Ada Temuan / Masalah'; }
                      return (
                        <div key={area.id} className="heatmap-cell" style={{
                          background: `${colorClass}15`, border: `2px solid ${colorClass}`,
                          color: colorClass, height: '70px', display: 'flex', flexDirection: 'column',
                          justifyContent: 'center', alignItems: 'center', borderRadius: '8px',
                          textAlign: 'center', padding: '0.2rem'
                        }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>{area.zona}</span>
                          <span style={{ fontSize: '0.58rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{area.titik}</span>
                          <div className="tooltip"><strong>{area.titik}</strong>{`Status: ${statusText}\nZona: ${area.zona}`}</div>
                        </div>
                      );
                    })}
                    {areas.filter(a => a.lantai === selectedFloor).length === 0 && (
                      <div style={{ gridColumn: 'span 4', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.8rem' }}>
                        Tidak ada area yang terdaftar di lantai ini.
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'transparent' }}>
                    <h5 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Keterangan</h5>
                    {[['#10b981', 'Sudah Dipatroli (Aman)'], ['#f59e0b', 'Ada Laporan Temuan'], ['#ef4444', 'Belum Dikunjungi']].map(([c, l]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: c }}/><span>{l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="glass-panel" style={{ padding: '0.75rem', fontSize: '0.75rem', background: 'transparent' }}>
                    <p style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'white' }}>Detail Lantai {selectedFloor}</p>
                    {[
                      ['Total Checkpoint', areas.filter(a => a.lantai === selectedFloor).length, null],
                      ['Selesai Dikunjungi', areas.filter(a => a.lantai === selectedFloor && getAreaStatus(a.id) !== 'unvisited').length, 'var(--color-success)'],
                    ].map(([l, v, c]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', padding: '0.25rem 0' }}>
                        <span>{l}:</span><span style={{ fontWeight: 700, color: c || 'inherit' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white', marginBottom: '1rem' }}>
                <MapPin size={16} className="text-primary"/> Pemetaan GPS Real-Time Pos Keamanan
              </h4>
              <div id="leaflet-map" style={{ height: '300px', width: '100%', borderRadius: '12px', border: '1px solid var(--border-glass)', zIndex: 1 }}></div>
            </div>

            <div className="grid-cols-2">
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white' }}>
                    <Clock size={15} className="text-primary"/> Log Aktivitas Patroli Masuk
                  </h4>
                  <span className="badge badge-info pulse-primary" style={{ fontSize: '0.55rem' }}>Live Feed</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '280px' }}>
                  {reports.slice(0, 10).map(report => (
                    <div key={report.id} style={{
                      padding: '0.65rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)',
                      borderLeft: `3px solid ${
                        report.kondisi === 'Aman dan Kondusif' ? 'var(--color-success)' :
                        report.kondisi === 'Ada Aktivitas' ? 'var(--color-warning)' : 'var(--color-danger)'
                      }`,
                      border: '1px solid var(--border-glass)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 700, color: 'white' }}>{report.userName}</span>
                        <span>{new Date(report.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', marginTop: '0.15rem', fontWeight: 600 }}>
                        📍 {report.titik} ({report.lantai})
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Kondisi: {report.keterangan || report.kondisi}</span>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.8rem' }}>
                      Belum ada data laporan masuk.
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444' }}>
                    <AlertOctagon size={15}/> Zona Belum Terjamah Hari Ini
                  </h4>
                  <span className="badge badge-danger" style={{ fontSize: '0.55rem' }}>{unvisitedAreas.length} Terlewat</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '280px' }}>
                  {unvisitedAreas.slice(0, 10).map(area => (
                    <div key={area.id} style={{
                      padding: '0.65rem', borderRadius: '6px', background: 'rgba(239,68,68,0.02)',
                      border: '1px solid rgba(239,68,68,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <h5 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>{area.titik}</h5>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Lt. {area.lantai} ({area.zona})</span>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>Belum Scan</span>
                    </div>
                  ))}
                  {unvisitedAreas.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <CheckCircle size={24} color="var(--color-success)" style={{ marginBottom: '0.5rem' }}/>
                      <p style={{ fontSize: '0.8rem', textAlign: 'center' }}>Hebat! Seluruh pos telah terpatroli.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid-cols-2" style={{ gap: '1.5rem' }}>
              {renderSVGChart()}
              {renderLiveTerminal()}
            </div>
          </div>
        )}

        {/* Tab 4: Mutasi & Absensi */}
        {activeCommandTab === 'mutasi' && (
          <div className="command-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white' }}>
                <ClipboardList size={16} className="text-primary"/> Log Buku Mutasi Penjagaan Terbaru
              </h4>
              {mutasiLogs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '350px' }}>
                  {mutasiLogs.slice(0, 20).map((log, idx) => (
                    <div key={log.id || idx} style={{
                      padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-glass)',
                      borderLeft: `3px solid ${
                        log.kategori === 'Emergency' ? '#ef4444' :
                        log.kategori === 'Kehilangan' ? '#f59e0b' :
                        log.kategori === 'Kerusakan' ? '#f97316' : '#3b82f6'
                      }`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, color: 'white' }}>{log.pelapor || log.petugas || '-'}</span>
                        <span className="badge" style={{
                          fontSize: '0.58rem', padding: '0.08rem 0.35rem',
                          background: log.kategori === 'Emergency' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                          color: log.kategori === 'Emergency' ? '#ef4444' : '#3b82f6'
                        }}>{log.kategori || 'Informasi'}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{log.uraian || log.deskripsi}</p>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        🕒 {log.jamLaporan || log.jamKejadian || '-'} • 📍 {log.lokasi || log.pos || '-'} • 📅 {log.tanggal || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Belum ada log mutasi terdaftar harian.
                </div>
              )}
            </div>

            <div className="grid-cols-2">
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <Users size={16}/> Kehadiran Harian Anggota Per Regu
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {reguAttendance.map(r => (
                    <div key={r.regu}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, color: 'white' }}>{r.regu}</span>
                        <span style={{ color: r.pct >= 80 ? 'var(--color-success)' : r.pct >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                          {r.hadir}/{r.total} ({r.pct}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${r.pct}%`, borderRadius: '99px', transition: 'width 0.5s',
                          background: r.pct >= 80 ? 'var(--color-success)' : r.pct >= 60 ? '#f59e0b' : '#ef4444' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <Activity size={16}/> Beban & Titik Patroli Per Regu
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {reguPatrol.map(r => {
                    const maxPatrol = Math.max(...reguPatrol.map(x => x.patrolCount), 1);
                    const pct = Math.round((r.patrolCount / maxPatrol) * 100);
                    return (
                      <div key={r.regu}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: 'white' }}>{r.regu}</span>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                            {r.patrolCount} scan • {r.coveredAreas} area
                          </span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: '99px',
                            background: 'linear-gradient(90deg, #3b82f6, #6366f1)', transition: 'width 0.5s' }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Pengaturan & Arsip */}
        {activeCommandTab === 'arsip' && (
          <div className="command-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white' }}>
                <MessageCircle size={16} className="text-primary"/> Penerusan & Rekap Tugas Kepala Departemen
              </h4>
              <div className="grid-cols-3" style={{ gap: '1rem' }}>
                {Object.entries(WA_CONTACTS).map(([dept, info]) => {
                  const total = findingsByDept[dept].length;
                  const open = findingsByDept[dept].filter(f => f.status !== 'Closed').length;
                  const sent = waSentCount(dept);
                  return (
                    <div key={dept} className="kpi-card" style={{ borderLeft: `3px solid ${info.color}`, background: 'rgba(255,255,255,0.01)', padding: '1rem', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                      <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: info.color }}>{info.emoji} {dept}</h5>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>Ka. Dept: {info.nama}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.72rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total Laporan:</span>
                          <strong>{total}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Aktif (Open):</span>
                          <strong style={{ color: open > 0 ? '#ef4444' : '#10b981' }}>{open}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>WA Terkirim:</span>
                          <strong style={{ color: '#10b981' }}>{sent}</strong>
                        </div>
                      </div>
                      {open > 0 && (
                        <button
                          onClick={() => {
                            const openItems = findingsByDept[dept].filter(f => f.status !== 'Closed');
                            const summaryMsg = 
                              `*${info.emoji} REKAP TIKET OPEN - SMPJDC*\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `Yth. ${info.nama},\n\n` +
                              `Berikut daftar temuan aktif yang memerlukan tindakan:\n\n` +
                              openItems.map((f,i) =>
                                `${i+1}. [${f.severity}] ${f.kategori}\n   📍 ${f.area}\n   📋 ${f.detail}\n`
                              ).join('\n') +
                              `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `Total: ${openItems.length} tiket aktif\n_Sistem Manajemen Keamanan JDC_`;
                            window.open(`https://api.whatsapp.com/send?phone=${info.nomor}&text=${encodeURIComponent(summaryMsg)}`, '_blank', 'noopener');
                          }}
                          className="btn-primary"
                          style={{ width: '100%', marginTop: '0.75rem', padding: '0.4rem', fontSize: '0.7rem', background: `${info.color}12`, border: `1px solid ${info.color}33`, color: info.color }}
                        >
                          Kirim Rekap WA ke Ka. {dept}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {onArchiveOldData && (
              <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444' }}>
                  <AlertTriangle size={16}/> Pembersihan Data Lama JDC (&gt; 90 Hari)
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Pembersihan otomatis data log patroli, laporan temuan, mutasi harian, data absensi regu, dan komplain tenant yang telah berusia **lebih dari 90 hari** agar kapasitas penyimpanan cloud tetap efisien dan performa loading dashboard tetap responsif.
                </p>
                <button onClick={onArchiveOldData} className="btn-danger" style={{ width: '100%', padding: '0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Sparkles size={14}/> Lakukan Pembersihan Data Lama (&gt; 90 Hari)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
