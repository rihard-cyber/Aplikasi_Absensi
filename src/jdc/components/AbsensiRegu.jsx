import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Users, MapPin, Clock, CheckCircle2, UserCheck, RefreshCw, 
  ClipboardList, HelpCircle, MessageSquare, Phone, AlertTriangle, Check, 
  User, ExternalLink, Shield, Activity, Edit2, Save, X, BookOpen, Search,
  FileText
} from 'lucide-react';
import { SHIFT_CODES, getRoster, getYearMonth } from '../data/rosterData';
import { exportTableToPdf, formatDateForFile, formatDateOnlyId } from '../utils/exportPdf';

export default function AbsensiRegu({ 
  users, 
  areas,
  posList = [],
  attendanceLogs, 
  onAddAttendance,
  currentUser,
  onUpdateUser,
  reports = []
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [hari, setHari] = useState(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
  });
  
  // Default to currentUser's regu if available, otherwise Regu A
  const [selectedRegu, setSelectedRegu] = useState(() => {
    return currentUser?.regu || 'Regu A';
  });
  
  const [selectedShift, setSelectedShift] = useState('P'); // 'P' | 'S' | 'M' | 'Md' etc
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'form' | 'history'
  const [selectedLemburMonth, setSelectedLemburMonth] = useState(() => getYearMonth());
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedAddMemberId, setSelectedAddMemberId] = useState('');
  
  // For phone number editing
  const [phoneInputs, setPhoneInputs] = useState({});
  const [editingPhoneId, setEditingPhoneId] = useState(null);

  // Authorization check for Danru/Wadanru/Admin
  const isAuthorizedFiller = useMemo(() => {
    const role = currentUser?.jabatan || '';
    return ['Admin Super', 'admin', 'Admin', 'Danru', 'Wadanru'].includes(role);
  }, [currentUser]);

  // All patrol users — Danru/Wadanru can pick from anyone
  const allPatrolUsers = useMemo(() =>
    users.filter(u => ['Danru', 'Wadanru', 'Anggota', 'BKO', 'KH (Khusus)', 'Middle 1', 'Middle 2'].includes(u.jabatan)),
  [users]);

  // Filter by regu
  const reguMembers = useMemo(() => {
    if (!selectedRegu || selectedRegu === 'Semua Regu') return allPatrolUsers;
    return allPatrolUsers.filter(u => u.regu === selectedRegu);
  }, [allPatrolUsers, selectedRegu]);

  // Filter and compile all overtime (Lembur) entries
  const lemburanRows = useMemo(() => {
    const list = [];
    attendanceLogs.forEach(log => {
      if (!log.tanggal || !log.tanggal.startsWith(selectedLemburMonth)) return;
      (log.details || []).forEach(d => {
        const isLemburRow = d.isLembur === true || 
                            d.alasan?.toLowerCase().includes('lembur') || 
                            d.alasan?.toLowerCase().includes('backup') || 
                            d.status === 'Tukar Shift';
        
        // If regu filter is active, check if either the log regu or personil's regu matches
        if (selectedRegu !== 'Semua Regu' && log.regu !== selectedRegu && d.regu !== selectedRegu) return;

        if (isLemburRow) {
          list.push({
            logId: log.id,
            tanggal: log.tanggal,
            hari: log.hari || ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(log.tanggal).getDay()],
            regu: log.regu,
            shift: log.shift,
            detail: d
          });
        }
      });
    });
    return list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [attendanceLogs, selectedLemburMonth, selectedRegu]);

  const lemburStats = useMemo(() => {
    let totalJam = 0;
    const uniquePersonnel = new Set();
    lemburanRows.forEach(row => {
      const jam = parseInt(row.detail.jamLembur, 10) || 8;
      totalJam += jam;
      uniquePersonnel.add(row.detail.personilId || row.detail.nama);
    });
    return {
      totalJam,
      totalKegiatan: lemburanRows.length,
      totalPersonil: uniquePersonnel.size
    };
  }, [lemburanRows]);

  const handleExportLemburPDF = () => {
    if (lemburanRows.length === 0) {
      alert('Belum ada data lemburan untuk diexport.');
      return;
    }

    const ok = exportTableToPdf({
      title: 'Laporan Rekapitulasi Lemburan Keamanan JDC',
      fileName: `rekap-lembur-smpjdc-${selectedLemburMonth}`,
      meta: [
        { label: 'Bulan Rekap', value: selectedLemburMonth },
        { label: 'Regu Pantau', value: selectedRegu },
        { label: 'Total Jam Lembur', value: `${lemburStats.totalJam} Jam` },
        { label: 'Total Personil', value: `${lemburStats.totalPersonil} Orang` }
      ],
      columns: [
        { header: 'NO', width: '4%' },
        { header: 'TANGGAL', width: '9%' },
        { header: 'NAMA PERSONIL', width: '13%' },
        { header: 'NRP', width: '7%' },
        { header: 'REGU / JABATAN', width: '10%' },
        { header: 'SHIFT LEMBUR', width: '7%' },
        { header: 'DURASI', width: '6%' },
        { header: 'JAM MASUK/PULANG', width: '10%' },
        { header: 'VERIFIKASI GPS', width: '13%' },
        { header: 'FOTO SELFIE', width: '12%' },
        { header: 'KEPERLUAN / ALASAN', width: '10%' }
      ],
      rows: lemburanRows.map((row, idx) => {
        const d = row.detail;
        const checkInOutStr = `${d.checkInTime || '-'}\n${d.checkOutTime || '-'}`;
        const gpsStr = (d.lat && d.lng) ? `Lat: ${Number(d.lat).toFixed(4)}\nLong: ${Number(d.lng).toFixed(4)}` : '-';
        
        return [
          idx + 1,
          formatDateOnlyId(row.tanggal),
          d.nama || '-',
          d.nrp || '-',
          `${d.regu || '-'} / ${d.jabatan || '-'}`,
          `Shift ${row.shift}`,
          `${parseInt(d.jamLembur, 10) || 8} Jam`,
          checkInOutStr,
          gpsStr,
          d.fotoSelfie ? { image: d.fotoSelfie, text: d.nama || '' } : '-',
          d.alasan || 'Lembur / Backup'
        ];
      })
    });

    if (!ok) alert('Ekspor PDF gagal. Pastikan browser tidak memblokir pop-up.');
  };

  // Rows state for table editing
  const [rows, setRows] = useState([]);

  // Available users to add from other squads (cross-regu)
  const availableToAddUsers = useMemo(() => {
    const activeIds = new Set(rows.map(r => r.personilId));
    return allPatrolUsers.filter(u => !activeIds.has(u.id));
  }, [allPatrolUsers, rows]);

  // Filtered rows for table search (decoupled from master rows)
  const displayedRows = useMemo(() => {
    if (!memberSearch.trim()) return rows;
    const q = memberSearch.trim().toLowerCase();
    return rows.filter(row =>
      row.nama?.toLowerCase().includes(q) ||
      row.nrp?.toLowerCase().includes(q) ||
      row.jabatan?.toLowerCase().includes(q) ||
      row.regu?.toLowerCase().includes(q)
    );
  }, [rows, memberSearch]);

  // Get time string by shift code (all JDC codes)
  const getJamDinas = (shiftCode) => {
    const info = SHIFT_CODES[shiftCode];
    if (info) return info.jam.replace(':', '.').replace(' - ', ' - ').replace(/:(\d{2})/g, '.$1');
    return '-';
  };

  // Re-generate table rows when Regu or Shift or attendanceLogs changes
  useEffect(() => {
    const existingLog = attendanceLogs.find(
      log => log.tanggal === todayStr && log.regu === selectedRegu && log.shift === selectedShift
    );

    if (existingLog) {
      setRows(existingLog.details);
    } else {
      const defaultRows = reguMembers.map((member, index) => {
        const posIndex = index % (posList.length || 1);
        const defaultPos = posList[posIndex] ? posList[posIndex].titik : '';
        
        return {
          personilId: member.id,
          nama: member.nama,
          nrp: member.nrp,
          regu: member.regu,
          jabatan: member.jabatan,
          status: 'Hadir',
          alasan: '',
          penggantiId: '',
          posPlotting: defaultPos,
          jamDinas: getJamDinas(selectedShift)
        };
      });
      setRows(defaultRows);
    }
  }, [selectedRegu, selectedShift, reguMembers, attendanceLogs]);

  const handleRowChangeById = (personilId, field, value) => {
    setRows(prev => prev.map((row) => {
      if (row.personilId !== personilId) return row;
      
      const updated = { ...row, [field]: value };
      
      if (field === 'status') {
        if (value === 'Hadir') {
          updated.alasan = '';
          updated.penggantiId = '';
        } else if (value === 'Tukar Shift') {
          updated.alasan = 'Tukar Shift';
        } else if (value === 'Sakit') {
          updated.alasan = 'Sakit';
          updated.posPlotting = '-';
        } else if (value === 'Cuti') {
          updated.alasan = 'Cuti';
          updated.posPlotting = '-';
        } else if (value === 'Mangkir') {
          updated.alasan = 'Mangkir';
          updated.posPlotting = '-';
        } else if (value === 'Tidak Hadir') {
          updated.alasan = 'Tidak Hadir';
          updated.posPlotting = '-';
        }
      }
      return updated;
    }));
  };

  const handleAddMember = (userId) => {
    if (!userId) return;
    const user = allPatrolUsers.find(u => String(u.id) === String(userId));
    if (!user) return;

    const posIndex = rows.length % (posList.length || 1);
    const defaultPos = posList[posIndex] ? posList[posIndex].titik : '';

    const newRow = {
      personilId: user.id,
      nama: user.nama,
      nrp: user.nrp,
      regu: user.regu,
      jabatan: user.jabatan,
      status: 'Hadir',
      alasan: '',
      penggantiId: '',
      posPlotting: defaultPos,
      jamDinas: getJamDinas(selectedShift)
    };

    setRows(prev => [...prev, newRow]);
    setSelectedAddMemberId('');
  };

  const handleRemoveRowById = (personilId) => {
    setRows(prev => prev.filter(row => row.personilId !== personilId));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (rows.length === 0) {
      alert('Tidak ada anggota regu untuk diabsensi.');
      return;
    }

    onAddAttendance({
      tanggal: todayStr,
      hari,
      regu: selectedRegu,
      shift: selectedShift,
      jamDinas: getJamDinas(selectedShift),
      details: rows
    });
    
    // Automatically switch to dashboard after saving to view the status
    setActiveTab('dashboard');
  };

  // Get substitute options — all patrol users (cross-regu)
  const substituteOptions = users.filter(u => ['Danru', 'Wadanru', 'Anggota', 'BKO', 'KH (Khusus)', 'Middle 1', 'Middle 2'].includes(u.jabatan));

  // Find if plotting has been saved today for the selected regu
  // Aggregates from both traditional and roster-based logs
  const todayAttendance = (() => {
    const tradLog = attendanceLogs.find(
      log => log.tanggal === todayStr && log.regu === selectedRegu
    );
    const rosterDetails = [];
    attendanceLogs.forEach(log => {
      if (log.tanggal === todayStr && log.isRosterBased) {
        (log.details || []).forEach(d => {
          const user = users.find(u => u.id === d.personilId);
          if (user && user.regu === selectedRegu) rosterDetails.push(d);
        });
      }
    });
    if (tradLog) {
      if (rosterDetails.length === 0) return tradLog;
      const seen = new Set((tradLog.details || []).map(d => String(d.personilId || d.userId)));
      const merged = [...(tradLog.details || [])];
      rosterDetails.forEach(d => {
        const key = String(d.personilId || d.userId);
        if (!seen.has(key)) { seen.add(key); merged.push(d); }
      });
      return { ...tradLog, details: merged };
    }
    if (rosterDetails.length === 0) return null;
    return {
      tanggal: todayStr, regu: selectedRegu, shift: 'Roster', jamDinas: '-',
      details: rosterDetails
    };
  })();

  // Helper to determine status and counts for today
  const getMemberStatus = (member) => {
    const memberDetail = todayAttendance?.details?.find(d => d.personilId === member.id);
    const reportsToday = reports.filter(
      r => r.userId === member.id && r.timestamp?.startsWith(todayStr)
    );
    const patrolCount = reportsToday.length;

    let isOnline = false;
    let lastActiveText = 'Offline';
    if (member.lastActive) {
      const lastActiveDate = new Date(member.lastActive);
      const diffMs = new Date() - lastActiveDate;
      const diffMins = Math.floor(diffMs / 60000);
      isOnline = diffMs < 300000; // 5 minutes threshold
      
      if (diffMins < 1) {
        lastActiveText = 'Aktif';
      } else if (diffMins < 60) {
        lastActiveText = `${diffMins}m lalu`;
      } else {
        lastActiveText = `${Math.floor(diffMins / 60)}j lalu`;
      }
    }

    let statusLabel = 'Offline';
    let statusColor = 'var(--text-muted)';
    let statusIndicator = '⚪';
    let statusKey = 'offline';

    if (memberDetail && memberDetail.status !== 'Hadir') {
      statusLabel = memberDetail.status;
      statusColor = 'var(--color-danger)';
      statusIndicator = '❌';
      statusKey = 'absent';
    } else {
      if (patrolCount > 0) {
        statusLabel = `Patroli (${patrolCount} area)`;
        statusColor = 'var(--color-success)';
        statusIndicator = '🟢';
        statusKey = 'patroli';
      } else if (isOnline) {
        statusLabel = 'Standby / Login';
        statusColor = 'var(--color-warning)';
        statusIndicator = '🟡';
        statusKey = 'login';
      }
    }

    return {
      statusLabel,
      statusColor,
      statusIndicator,
      statusKey,
      patrolCount,
      lastActiveText,
      isOnline,
      plottingPos: memberDetail?.posPlotting || '-',
      shiftCode: todayAttendance?.shift || '-',
      jamDinas: todayAttendance?.jamDinas || '-'
    };
  };

  const generateWALink = (member, statusInfo) => {
    const hp = member.nomorHp || '';
    let cleanHp = hp.replace(/\D/g, '');
    if (cleanHp.startsWith('0')) {
      cleanHp = '62' + cleanHp.slice(1);
    }
    
    const hariTanggal = `${hari}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    const text = `🛡️ *NOTIFIKASI PLOTTING PENJAGAAN JDC* 🛡️

Halo *${member.nama}*, berikut adalah detail plotting dinas Anda hari ini:

📅 Hari/Tanggal: *${hariTanggal}*
👥 Regu: *${selectedRegu}*
⏱️ Shift: *Shift ${statusInfo.shiftCode} (${statusInfo.jamDinas})*
📍 Pos Jaga: *${statusInfo.plottingPos}*
🟢 Status Kehadiran: *${statusInfo.statusLabel}*

Harap standby di pos masing-masing dan lakukan patroli berkala menggunakan aplikasi JDC.

_Sistem Manajemen Keamanan JDC_`;

    const encodedText = encodeURIComponent(text);
    if (cleanHp) {
      return `https://wa.me/${cleanHp}?text=${encodedText}`;
    } else {
      return `https://api.whatsapp.com/send?text=${encodedText}`;
    }
  };

  const handlePhoneInputChange = (memberId, value) => {
    setPhoneInputs(prev => ({
      ...prev,
      [memberId]: value
    }));
  };

  const handlePhoneSave = (memberId) => {
    const raw = phoneInputs[memberId];
    if (raw === undefined) return;
    const val = raw.trim();
    if (!val && raw !== '') return;
    
    if (onUpdateUser) {
      onUpdateUser(memberId, { nomorHp: val || '-' });
      setEditingPhoneId(null);
    }
  };

  const handleExportAttendancePDF = () => {
    const sourceLogs = [];
    if (attendanceLogs && attendanceLogs.length > 0) {
      sourceLogs.push(...attendanceLogs);
    } else if (todayAttendance) {
      sourceLogs.push(todayAttendance);
    }
    if (sourceLogs.length === 0) {
      alert('Belum ada data absensi untuk diexport.');
      return;
    }
    const rowsForExport = [];
    sourceLogs.forEach((log) => {
      if (!log) return;
      (log.details || []).forEach((detail) => {
        const substitute = users.find(u => String(u.id) === String(detail.penggantiId));
        rowsForExport.push({ log, detail, substitute });
      });
    });

    const ok = exportTableToPdf({
      title: 'Absensi & Plotting Penjagaan',
      fileName: `absensi-plotting-smpjdc-${formatDateForFile()}`,
      meta: [
        { label: 'Regu Aktif', value: selectedRegu },
        { label: 'Shift Aktif', value: selectedShift },
        { label: 'Total Log', value: sourceLogs.length },
        { label: 'Total Personil', value: rowsForExport.length }
      ],
      columns: [
        { header: 'NO', width: '4%' },
        { header: 'TANGGAL', width: '8%' },
        { header: 'HARI', width: '6%' },
        { header: 'REGU', width: '7%' },
        { header: 'SHIFT', width: '5%' },
        { header: 'JAM DINAS', width: '8%' },
        { header: 'NAMA PERSONIL', width: '11%' },
        { header: 'NRP', width: '6%' },
        { header: 'JABATAN', width: '8%' },
        { header: 'STATUS HADIR', width: '8%' },
        { header: 'KETERANGAN', width: '9%' },
        { header: 'PLOTTING POS', width: '11%' },
        { header: 'PENGGANTI', width: '9%' }
      ],
      rows: rowsForExport.map(({ log, detail, substitute }, idx) => [
        idx + 1,
        formatDateOnlyId(log.tanggal),
        log.hari || '-',
        log.regu || detail.regu || '-',
        log.shift || '-',
        log.jamDinas || detail.jamDinas || '-',
        detail.nama || '-',
        detail.nrp || '-',
        detail.jabatan || '-',
        detail.status || '-',
        detail.alasan || '-',
        detail.posPlotting || '-',
        substitute ? `${substitute.nama} (${substitute.regu || '-'})` : '-'
      ])
    });
    if (!ok) alert('Popup export PDF diblokir browser. Izinkan popup untuk aplikasi ini.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Tab Switcher */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '1px solid var(--border-glass)', 
        paddingBottom: '0.75rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {[{ id: 'roster-daily', icon: <BookOpen size={16}/>, label: '📅 Absensi Harian (Roster)' },
          { id: 'dashboard',    icon: <Activity size={16}/>,     label: 'Dashboard Regu' },
          { id: 'form',         icon: <ClipboardList size={16}/>, label: 'Form Absensi Manual' },
          { id: 'history',      icon: <UserCheck size={16}/>,     label: 'Histori Absensi' },
          { id: 'lemburan',     icon: <Clock size={16}/>,         label: '⏱️ Rekap Lemburan' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '8px',
              border: activeTab === tab.id ? '1px solid var(--color-primary)' : '1px solid transparent',
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem',
              cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', fontFamily: 'var(--font-sans)'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* REGU & METADATA BAR */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>MEMANTAU REGU</span>
            <select 
              value={selectedRegu} 
              onChange={e => setSelectedRegu(e.target.value)} 
              className="modern-select"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', minWidth: '150px' }}
            >
              <option value="Semua Regu">Semua Regu</option>
              {['Regu A', 'Regu B', 'Regu C', 'Regu D', 'Non-Regu'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SHIFT OPERASIONAL</span>
            <select 
              value={selectedShift} 
              onChange={e => setSelectedShift(e.target.value)} 
              className="modern-select"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', minWidth: '200px' }}
            >
              {Object.entries(SHIFT_CODES).filter(([c]) => c !== 'X').map(([code, info]) => (
                <option key={code} value={code}>{code} ({info.label}: {info.jam})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Hari Ini:</span>{' '}
            <strong style={{ color: 'var(--color-primary)' }}>{hari}, {todayStr}</strong>
          </div>
          <button type="button" onClick={handleExportAttendancePDF} className="btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileText size={14} /> Export PDF Absensi
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 0: ABSENSI HARIAN BERDASARKAN ROSTER */}
      {/* ========================================== */}
      {activeTab === 'roster-daily' && (
        <AbsensiRosterHarian
          users={users}
          posList={posList}
          attendanceLogs={attendanceLogs}
          onAddAttendance={onAddAttendance}
          reports={reports}
          todayStr={todayStr}
          getJamDinas={getJamDinas}
        />
      )}

      {/* ========================================== */}
      {/* TAB 1: DASHBOARD REGU */}
      {/* ========================================== */}
      {activeTab === 'dashboard' && (
        <>
          {!todayAttendance ? (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed rgba(239, 68, 68, 0.25)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={32} />
              </div>
              <div style={{ maxWidth: '450px' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>PLOTTING HARI INI BELUM DIISI!</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Absensi & pos penugasan untuk <strong>{selectedRegu}</strong> hari ini belum ditentukan. Anda harus membuat plotting terlebih dahulu agar dapat memantau status keaktifan personil secara real-time.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setActiveTab('form')} 
                className="btn-primary" 
                style={{ padding: '0.75rem 2rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                <ClipboardList size={16} /> Mulai Isi Absensi & Plotting
              </button>
            </div>
          ) : (
            <>
              {/* KPI CARDS */}
              <div className="grid-cols-3" style={{ gap: '1rem' }}>
                {/* Kehadiran */}
                {(() => {
                  const total = reguMembers.length;
                  const hadir = todayAttendance.details.filter(d => d.status === 'Hadir').length;
                  const tukar = todayAttendance.details.filter(d => d.status === 'Tukar Shift').length;
                  const nonHadir = total - hadir - tukar;
                  
                  return (
                    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                        <UserCheck size={14} className="text-primary" /> STATUS KEHADIRAN REGU
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {hadir + tukar} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {total} Personil</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Hadir: <strong>{hadir}</strong> • Tukar: <strong>{tukar}</strong> • Absen: <strong style={{ color: nonHadir > 0 ? 'var(--color-danger)' : 'inherit' }}>{nonHadir}</strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Keaktifan / Login */}
                {(() => {
                  const stats = reguMembers.map(m => getMemberStatus(m));
                  const onlineCount = stats.filter(s => s.isOnline && s.statusKey !== 'absent').length;
                  const offlineCount = stats.filter(s => !s.isOnline && s.statusKey === 'offline').length;
                  
                  return (
                    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-warning)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                        <Users size={14} className="text-warning" /> STATUS KONEKSI (LOGIN)
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {onlineCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Online JDC</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Active: <strong>{onlineCount}</strong> • Standby/Offline: <strong>{offlineCount}</strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Patrol progress */}
                {(() => {
                  const stats = reguMembers.map(m => getMemberStatus(m));
                  const patrolActive = stats.filter(s => s.patrolCount > 0).length;
                  const totalScans = stats.reduce((acc, curr) => acc + curr.patrolCount, 0);
                  
                  return (
                    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-success)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                        <Activity size={14} className="text-success" /> PROGRESS PATROLI
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {patrolActive} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Petugas Patroli</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Total Checkpoint Terscan Hari Ini: <strong>{totalScans} Area</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* DETAILED MEMBERS LIST */}
              <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Shield size={16} className="text-primary" />
                    <span>Pemantauan Personil {selectedRegu} — Shift {todayAttendance.shift}</span>
                  </h4>
                  <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '0.35rem 0.75rem' }}>
                    Jam Dinas: {todayAttendance.jamDinas}
                  </span>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                  <table className="absensi-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>No</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nama Personil</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jabatan</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Plotting Pos</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Keaktifan (Real-time)</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Progress Patroli</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nomor WhatsApp</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Kirim Notif WA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reguMembers.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Tidak ada personil terdaftar di regu ini.
                          </td>
                        </tr>
                      ) : (
                        reguMembers.map((member, idx) => {
                          const statusInfo = getMemberStatus(member);
                          
                          return (
                            <tr key={member.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                              <td style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1}</td>
                              
                              <td style={{ padding: '0.9rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <img 
                                    src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40'} 
                                    alt="" 
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(59,130,246,0.3)' }} 
                                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40'; }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{member.nama}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>NRP: {member.nrp}</div>
                                  </div>
                                </div>
                              </td>
                              
                              <td style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {member.jabatan}
                              </td>
                              
                              <td style={{ padding: '0.9rem 1rem' }}>
                                <span className="badge badge-info" style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
                                  📍 {statusInfo.plottingPos}
                                </span>
                              </td>
                              
                              <td style={{ padding: '0.9rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                                  <span>{statusInfo.statusIndicator}</span>
                                  <span style={{ color: statusInfo.statusColor, fontWeight: 700 }}>
                                    {statusInfo.statusLabel}
                                  </span>
                                  {statusInfo.statusKey !== 'absent' && (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.2rem' }}>
                                      ({statusInfo.lastActiveText})
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td style={{ padding: '0.9rem 1rem' }}>
                                {statusInfo.patrolCount > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-success)' }}>
                                      {statusInfo.patrolCount} Area Terscan
                                    </div>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                      Terakhir: {(() => {
                                        const sorted = reports.filter(r => r.userId === member.id && r.timestamp?.startsWith(todayStr)).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
                                        if (sorted.length > 0) {
                                          return new Date(sorted[0].timestamp).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'});
                                        }
                                        return '-';
                                      })()} WIB
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Belum patroli</span>
                                )}
                              </td>

                              <td style={{ padding: '0.9rem 1rem' }}>
                                {editingPhoneId === member.id ? (
                                  <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                                    <input 
                                      type="text" 
                                      value={phoneInputs[member.id] !== undefined ? phoneInputs[member.id] : (member.nomorHp || '')} 
                                      onChange={e => handlePhoneInputChange(member.id, e.target.value)}
                                      placeholder="Cth: 0812..." 
                                      className="modern-input" 
                                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem', width: '110px' }}
                                    />
                                    <button type="button" onClick={() => handlePhoneSave(member.id)} style={{ border: '1px solid var(--color-success)', background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer', display: 'flex' }}><Check size={11} /></button>
                                    <button type="button" onClick={() => setEditingPhoneId(null)} style={{ border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-muted)', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer', display: 'flex' }}><X size={11} /></button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    {member.nomorHp ? (
                                      <>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{member.nomorHp}</span>
                                        <button type="button" onClick={() => { setEditingPhoneId(member.id); handlePhoneInputChange(member.id, member.nomorHp); }} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', opacity: 0.6 }} title="Ubah HP"><Edit2 size={11} /></button>
                                      </>
                                    ) : (
                                      <button type="button" onClick={() => { setEditingPhoneId(member.id); handlePhoneInputChange(member.id, ''); }} style={{ border: '1px dashed rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#f87171', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
                                        + Hubungkan HP
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                                <a 
                                  href={generateWALink(member, statusInfo)}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    border: '1.5px solid rgba(16, 185, 129, 0.35)',
                                    color: '#10b981',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    boxShadow: '0 0 8px rgba(16,185,129,0.08)'
                                  }}
                                  title="Kirim plotting ke WhatsApp petugas"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#10b981';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.boxShadow = '0 0 15px #10b981';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                                    e.currentTarget.style.color = '#10b981';
                                    e.currentTarget.style.boxShadow = '0 0 8px rgba(16,185,129,0.08)';
                                  }}
                                >
                                  <MessageSquare size={14} />
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ========================================== */}
      {/* TAB 2: FORM ABSENSI & PLOTTING */}
      {/* ========================================== */}
      {activeTab === 'form' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} className="text-primary" />
            <span>Form Isian Absensi Regu & Plotting Penjagaan</span>
          </h3>

          {!isAuthorizedFiller ? (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed rgba(239, 68, 68, 0.25)', borderRadius: '8px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={26} />
              </div>
              <div style={{ maxWidth: '420px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Akses Dibatasi</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Hanya <strong>Danru, Wadanru, atau Admin</strong> yang diperkenankan untuk mengisi atau memperbarui data absensi manual / plotting penjagaan regu.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Metadata Parameters */}
              <div className="grid-cols-3" style={{ gap: '1rem' }}>
                <div className="step-field">
                  <label><Calendar size={12} /> HARI</label>
                  <select value={hari} onChange={e => setHari(e.target.value)} className="modern-select">
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                
                <div className="step-field">
                  <label><Clock size={12} /> SHIFT JAGA (Pilih Shift)</label>
                  <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="modern-select">
                    <option value="P">Pagi (06:00 - 14:00)</option>
                    <option value="S">Siang (14:00 - 22:00)</option>
                    <option value="M">Malam (22:00 - 06:00)</option>
                  </select>
                </div>

                <div className="step-field">
                  <label><Users size={12} /> REGU (Filter)</label>
                  <select value={selectedRegu} onChange={e => setSelectedRegu(e.target.value)} className="modern-select">
                    {['Regu A', 'Regu B', 'Regu C', 'Regu D'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search & Add Members */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div className="step-field">
                  <label><Search size={12} /> CARI ANGGOTA (Filter Nama/NRP/Jabatan/Regu)</label>
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Ketik nama, NRP, jabatan, atau regu..."
                    className="modern-input"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="step-field">
                  <label><UserCheck size={12} /> TAMBAH ANGGOTA LINTAS REGU</label>
                  <select
                    value={selectedAddMemberId}
                    onChange={e => {
                      setSelectedAddMemberId(e.target.value);
                      handleAddMember(e.target.value);
                    }}
                    className="modern-select"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Pilih Anggota untuk Ditambahkan --</option>
                    {availableToAddUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.nama} ({u.jabatan} - {u.regu || 'Non-Regu'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Members Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                <table className="absensi-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>No</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nama</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>NRP</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Regu</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jabatan</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Keterangan Hadir</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jika Tidak Hadir Karena</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nama Pengganti (Tukar Shift / Backup)</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Plotting Pos (Pilih)</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jam Dinas</th>
                      <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan="11" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Tidak ada personil yang cocok dengan filter pencarian atau regu ini.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row, idx) => (
                        <tr key={row.personilId} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}>{row.nama}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.nrp || '-'}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{row.regu || '-'}</span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.jabatan}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <select 
                              value={row.status} 
                              onChange={e => handleRowChangeById(row.personilId, 'status', e.target.value)} 
                              className="modern-select"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', minWidth: '110px' }}
                            >
                              <option value="Hadir">Hadir</option>
                              <option value="Tidak Hadir">Tidak Hadir</option>
                              <option value="Tukar Shift">Tukar Shift</option>
                              <option value="Sakit">Sakit</option>
                              <option value="Cuti">Cuti</option>
                              <option value="Mangkir">Mangkir</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <input 
                              type="text" 
                              value={row.alasan} 
                              onChange={e => handleRowChangeById(row.personilId, 'alasan', e.target.value)} 
                              placeholder="-" 
                              disabled={row.status === 'Hadir'}
                              className="modern-input" 
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <select 
                              value={row.penggantiId} 
                              onChange={e => handleRowChangeById(row.personilId, 'penggantiId', e.target.value)} 
                              disabled={row.status !== 'Tukar Shift' && row.status !== 'Tidak Hadir'}
                              className="modern-select"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                            >
                              <option value="">-- Tidak Ada --</option>
                              {substituteOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.nama} ({opt.jabatan} - {opt.regu})</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <select 
                              value={row.posPlotting} 
                              onChange={e => handleRowChangeById(row.personilId, 'posPlotting', e.target.value)} 
                              disabled={['Sakit', 'Cuti', 'Mangkir'].includes(row.status)}
                              className="modern-select"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                            >
                              <option value="-">-</option>
                              {posList.map(p => (
                                <option key={p.id} value={p.titik}>{p.titik}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {row.jamDinas}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveRowById(row.personilId)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-danger)',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.8,
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 1}
                              onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
                              title="Hapus dari daftar"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-primary" style={{ padding: '0.65rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} /> Simpan Absensi & Plotting
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: HISTORI ABSENSI */}
      {/* ========================================== */}
      {activeTab === 'history' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={20} className="text-primary" />
            <span>Histori Absensi & Plotting Terdaftar</span>
          </h3>
          
          <div className="grid-cols-3" style={{ gap: '1rem' }}>
            {attendanceLogs.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                Belum ada log absensi terdaftar. Silakan buat absensi baru di atas.
              </div>
            ) : (
              [...attendanceLogs].reverse().map((log, index) => {
                const presentCount = log.details.filter(d => d.status === 'Hadir' || d.status === 'Tukar Shift').length;
                return (
                  <div key={log.id || index} className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800 }}>{log.regu}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.hari}, {log.tanggal}</p>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>Shift {log.shift}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Jam Dinas:</span>
                        <span style={{ fontWeight: 600 }}>{log.jamDinas}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Kepatuhan Plotting:</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{presentCount} / {log.details.length} Personil</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: REKAP & LAPORAN LEMBURAN */}
      {/* ========================================== */}
      {activeTab === 'lemburan' && (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} className="text-primary" />
              <span>Rekapitulasi Lemburan & Penambahan Personil Dadakan</span>
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="month" 
                value={selectedLemburMonth} 
                onChange={e => setSelectedLemburMonth(e.target.value)} 
                className="modern-input"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', fontFamily: 'var(--font-sans)', width: '150px' }}
              />
              <button 
                type="button" 
                onClick={handleExportLemburPDF} 
                className="btn-primary" 
                style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <FileText size={14} /> Ekspor PDF Lemburan
              </button>
            </div>
          </div>

          {/* KPI Mini Grid */}
          <div className="grid-cols-3" style={{ gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TOTAL AKUMULASI LEMBUR</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {lemburStats.totalJam} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Jam</span>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--color-success)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TOTAL KEGIATAN LEMBUR</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {lemburStats.totalKegiatan} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tugas</span>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--color-warning)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PERSONIL YANG LEMBUR</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {lemburStats.totalPersonil} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Orang</span>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
            <table className="absensi-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>No</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tanggal</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nama Personil</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Shift</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Durasi</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jam Masuk/Pulang</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Verifikasi GPS</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Foto Selfie</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Alasan / Keperluan</th>
                </tr>
              </thead>
              <tbody>
                {lemburanRows.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ditemukan riwayat lemburan untuk filter regu/bulan yang dipilih.
                    </td>
                  </tr>
                ) : (
                  lemburanRows.map((row, idx) => {
                    const d = row.detail;
                    return (
                      <tr key={`${row.logId}-${idx}`} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 700 }}>{row.hari}</span>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{row.tanggal}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img 
                              src={d.fotoSelfie || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40'} 
                              alt="" 
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(124,58,237,0.3)' }}
                              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40'; }}
                            />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.78rem' }}>{d.nama}</div>
                              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>NRP: {d.nrp} · {d.regu}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.75rem' }}>
                          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Shift {row.shift}</span>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {parseInt(d.jamLembur, 10) || 8} Jam
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.72rem', lineHeight: '1.4' }}>
                          <div>🟢 {d.checkInTime || '-'}</div>
                          {d.checkOutTime && <div style={{ color: 'var(--color-danger)' }}>🔴 {d.checkOutTime}</div>}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.68rem', fontFamily: 'monospace', lineHeight: '1.3' }}>
                          {d.lat && d.lng ? (
                            <>
                              <div>Lat: {Number(d.lat).toFixed(4)}</div>
                              <div>Long: {Number(d.lng).toFixed(4)}</div>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {d.fotoSelfie ? (
                            <img 
                              src={d.fotoSelfie} 
                              alt="Selfie" 
                              style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-glass)', cursor: 'pointer' }}
                              onClick={() => {
                                const w = window.open();
                                if (w) {
                                  w.document.write(`<img src="${d.fotoSelfie}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                  w.document.close();
                                }
                              }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {d.alasan || 'Lembur / Backup'}
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
  );
}


// ─── Sub-komponen: Absensi Harian Berbasis Roster ────────────────────────────
function AbsensiRosterHarian({ users, posList, attendanceLogs, onAddAttendance, reports, todayStr, getJamDinas }) {
  const yearMonth = getYearMonth(new Date(todayStr));
  const rosterData = getRoster(yearMonth);

  const scheduledByShift = useMemo(() => {
    const map = {};
    Object.entries(rosterData).forEach(([userId, dates]) => {
      const code = dates[todayStr];
      if (!code || code === 'X') return;
      const user = users.find(u => String(u.id) === String(userId));
      if (!user) return;
      if (!map[code]) map[code] = [];
      map[code].push({ user, shiftCode: code });
    });
    return map;
  }, [rosterData, users, todayStr]);

  const activeShifts = useMemo(() => Object.keys(scheduledByShift).sort(), [scheduledByShift]);
  const [selectedShift, setSelectedShift] = useState(() => activeShifts[0] || 'P');
  const [extraUsers, setExtraUsers] = useState([]);
  const [rows, setRows] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const shift = selectedShift;
    const existingLog = attendanceLogs.find(
      l => l.tanggal === todayStr && l.shift === shift && l.isRosterBased
    );
    if (existingLog) {
      setRows(existingLog.details);
      setExtraUsers([]);
    } else {
      const scheduled = (scheduledByShift[shift] || []).map(({ user }) => ({
        personilId: user.id,
        nama: user.nama,
        jabatan: user.jabatan,
        regu: user.regu || '-',
        status: 'Hadir',
        alasan: '',
        penggantiId: '',
        posPlotting: posList[0]?.titik || '-',
        jamDinas: getJamDinas(shift)
      }));
      setRows(scheduled);
      setExtraUsers([]);
    }
  }, [selectedShift, scheduledByShift, attendanceLogs, todayStr, posList]);

  const handleRowChange = (idx, field, value) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      if (field === 'status') {
        if (['Sakit', 'Cuti', 'Mangkir', 'Tidak Hadir'].includes(value)) { updated.posPlotting = '-'; updated.alasan = value; }
        else if (value === 'Hadir') { updated.alasan = ''; }
      }
      return updated;
    }));
  };

  const handleAddExtra = () => {
    const noSchedule = users.filter(u => {
      const code = rosterData[String(u.id)]?.[todayStr];
      return (!code || code === 'X') && ['Danru','Wadanru','Anggota','BKO','KH (Khusus)'].includes(u.jabatan);
    });
    setExtraUsers(noSchedule);
  };

  const handleAddExtraUser = (userId) => {
    const user = users.find(u => String(u.id) === String(userId));
    if (!user || rows.find(r => String(r.personilId) === String(userId))) return;
    setRows(prev => [...prev, {
      personilId: user.id, nama: user.nama, jabatan: user.jabatan, regu: user.regu || '-',
      status: 'Tukar Shift', alasan: 'Backup / Lembur', penggantiId: '',
      posPlotting: posList[0]?.titik || '-', jamDinas: getJamDinas(selectedShift)
    }]);
    setExtraUsers([]);
  };

  const handleSave = () => {
    if (rows.length === 0) { alert('Tidak ada personil yang dijadwalkan.'); return; }
    onAddAttendance({
      tanggal: todayStr,
      hari: ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(todayStr).getDay()],
      regu: `Roster-${selectedShift}`,
      shift: selectedShift,
      jamDinas: getJamDinas(selectedShift),
      isRosterBased: true,
      details: rows
    });
    setSaveStatus('✓ Absensi harian berhasil disimpan!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  if (activeShifts.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '2.5rem' }}>📅</div>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Belum Ada Roster Hari Ini</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '400px', lineHeight: '1.5' }}>
          Jadwal kerja untuk hari ini (<strong>{todayStr}</strong>) belum diinput di Roster Jadwal Bulanan. Minta Admin/SPV untuk mengisinya.
        </p>
      </div>
    );
  }

  const shiftInfo = SHIFT_CODES[selectedShift] || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {activeShifts.map(code => {
            const info = SHIFT_CODES[code] || {};
            return (
              <button key={code} onClick={() => setSelectedShift(code)} style={{
                padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
                border: `2px solid ${selectedShift === code ? (info.color || 'var(--color-primary)') : 'var(--border-glass)'}`,
                background: selectedShift === code ? (info.bg || 'rgba(59,130,246,0.12)') : 'transparent',
                color: selectedShift === code ? (info.color || 'var(--color-primary)') : 'var(--text-secondary)', cursor: 'pointer'
              }}>
                {code} — {info.label || code} ({info.jam || '-'}) · {(scheduledByShift[code] || []).length} org
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📅 {todayStr}</span>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={16} style={{ color: shiftInfo.color || 'var(--color-primary)' }} />
            Shift {selectedShift} — {shiftInfo.label} ({shiftInfo.jam})
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{rows.length} personil terjadwal</span>
          </h4>
          <button onClick={handleAddExtra} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px dashed var(--color-primary)', background: 'rgba(59,130,246,0.08)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            + Tambah Ekstra / Lembur
          </button>
        </div>

        {extraUsers.length > 0 && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(59,130,246,0.07)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Pilih personil ekstra:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {extraUsers.map(u => (
                <button key={u.id} onClick={() => handleAddExtraUser(u.id)} style={{ padding: '0.25rem 0.6rem', borderRadius: '5px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.72rem' }}>
                  {u.nama} ({u.jabatan})
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
                {['No', 'Nama', 'Jabatan / Regu', 'Status Hadir', 'Keterangan', 'Plotting Pos', 'Jam Dinas'].map(h => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada personil dijadwalkan untuk shift ini.</td></tr>
              ) : rows.map((row, idx) => (
                <tr key={`${row.personilId}-${idx}`} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>{row.nama}</td>
                  <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{row.jabatan} · {row.regu}</td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <select value={row.status} onChange={e => handleRowChange(idx, 'status', e.target.value)} className="modern-select" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>
                      {['Hadir', 'Tukar Shift', 'Sakit', 'Cuti', 'Mangkir', 'Tidak Hadir'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <input type="text" value={row.alasan} onChange={e => handleRowChange(idx, 'alasan', e.target.value)} className="modern-input" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }} placeholder="-" />
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <select value={row.posPlotting} onChange={e => handleRowChange(idx, 'posPlotting', e.target.value)} className="modern-select" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} disabled={['Sakit','Cuti','Mangkir'].includes(row.status)}>
                      <option value="-">-</option>
                      {posList.map(p => <option key={p.id} value={p.titik}>{p.titik}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{row.jamDinas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '1rem', alignItems: 'center' }}>
          {saveStatus && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>{saveStatus}</span>}
          <button onClick={handleSave} className="btn-primary" style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={15} /> Simpan Absensi Shift {selectedShift}
          </button>
        </div>
      </div>
    </div>
  );
}
