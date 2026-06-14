import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, CheckCircle2, XCircle, ArrowLeft, Loader2, MapPin, 
  AlertTriangle, Users, Send, Camera, ClipboardList, Route, 
  ShieldCheck, History, ThumbsUp, Check, Info, Shield, Calendar, 
  FileText, Clock, Trash2, Eye 
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';
import { Html5Qrcode } from 'html5-qrcode';

/** @type {(s: string) => string} Passthrough i18n — app is monolingual Indonesian */
const t = (s) => s;

const KATEGORI_TEMUAN = [
  {
    id: 'tenant',
    nama: 'Tenant & Ruang Sewa',
    items: [
      { kode: 'T001', nama: 'Renovasi Sesuai Aturan' },
      { kode: 'T002', nama: 'Renovasi Melanggar Aturan' },
      { kode: 'T003', nama: 'Overtime Tenant' },
      { kode: 'T004', nama: 'Pintu Tidak Terkunci' },
    ]
  },
  {
    id: 'fasilitas',
    nama: 'Fasilitas Gedung',
    items: [
      { kode: 'F001', nama: 'Service AHU' },
      { kode: 'F002', nama: 'Service Chiller' },
      { kode: 'F003', nama: 'Lift Maintenance' },
      { kode: 'F004', nama: 'Eskalator Maintenance' },
      { kode: 'F005', nama: 'Instalasi Listrik' },
      { kode: 'F006', nama: 'Pipa' },
    ]
  },
  {
    id: 'gangguan',
    nama: 'Gangguan Operasional',
    items: [
      { kode: 'G001', nama: 'Air Bocor' },
      { kode: 'G002', nama: 'Alarm Bunyi' },
      { kode: 'G003', nama: 'Lampu Mati' },
      { kode: 'G004', className: 'text-red-500', nama: 'Keributan' },
      { kode: 'G005', nama: 'Demonstrasi' },
      { kode: 'G006', nama: 'Listrik Mati' },
      { kode: 'G007', nama: 'Bau Asap' },
      { kode: 'G008', nama: 'Api' },
    ]
  },
  {
    id: 'event',
    nama: 'Event & Aktivitas Khusus',
    items: [
      { kode: 'E001', nama: 'Pameran Tenant' },
      { kode: 'E002', nama: 'Event Tenant' },
      { kode: 'E003', nama: 'Aktivitas Khusus Tenant' },
    ]
  },
  {
    id: 'lainnya',
    nama: 'Lain-Lain',
    items: [
      { kode: 'O001', nama: 'Temuan Lainnya' },
      { kode: 'O002', nama: 'Kondisi Tidak Normal' },
      { kode: 'O003', nama: 'Catatan Petugas' },
    ]
  }
];

const KATEGORI_MUTASI = [
  { id: 'informasi', label: 'Informasi', color: 'text-blue-400' },
  { id: 'kehilangan', label: 'Kehilangan', color: 'text-amber-500' },
  { id: 'kerusakan', label: 'Kerusakan', color: 'text-red-400' },
  { id: 'gangguan', label: 'Gangguan', color: 'text-red-600' },
  { id: 'emergency', label: 'Emergency', color: 'text-purple-500' },
  { id: '__lainnya__', label: 'Lainnya...', color: 'text-gray-400' }
];

const PatrolScan = ({ onBack, initialTab }) => {
  const [profile, setProfile] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'patroli'); // patroli, lapor, mutasi, handover, riwayat
  
  // Patrol step: 1 = Start, 2 = Scan, 3 = Decision/Form, 4 = Success
  const [step, setStep] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  
  // Scanned checkpoint data
  const [area, setArea] = useState(null);
  const [timeScan, setTimeScan] = useState(null);
  const [mode, setMode] = useState(null); // 'normal' | 'temuan'
  const [severity, setSeverity] = useState('medium');
  const [kategori, setKategori] = useState('');
  const [temuan, setTemuan] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [foto, setFoto] = useState(null);

  // Forms
  const [submitting, setSubmitting] = useState(false);
  const [gpsPosition, setGpsPosition] = useState(null);
  
  // Database States
  const [checkpoints, setCheckpoints] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [scannedIds, setScannedIds] = useState([]);
  const [guards, setGuards] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [mutasiLogs, setMutasiLogs] = useState([]);
  const [handoverLogs, setHandoverLogs] = useState([]);
  
  // Sub-forms states
  const [laporForm, setLaporForm] = useState({ checkpoint_id: '', kategori: '', temuan: '', severity: 'medium', description: '', photo: null });
  const [mutasiForm, setMutasiForm] = useState({ 
    tanggal_kejadian: new Date().toISOString().split('T')[0],
    jam_kejadian: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'),
    kategori: 'informasi',
    kategori_lainnya: '',
    lokasi: '',
    lokasi_custom: '',
    is_custom_lokasi: false,
    uraian: '',
    photo: null
  });
  const [handoverForm, setHandoverForm] = useState({ to_profile_id: '', notes: '' });
  
  const toast = useToast();

  const getDetectedShift = () => {
    const currentHour = new Date().getHours();
    return currentHour >= 7 && currentHour < 19 ? 'Pagi (07:00 - 19:00)' : 'Malam (19:00 - 07:00)';
  };

  const currentRoute = useMemo(() => routes[0] || null, [routes]);
  const routeCheckpoints = useMemo(() => {
    if (!currentRoute) return [];
    return (currentRoute.patrol_route_checkpoints || []).sort((a, b) => a.order_index - b.order_index);
  }, [currentRoute]);

  const todayLogs = useMemo(() => {
    return logs.filter(l => new Date(l.scan_time).toDateString() === new Date().toDateString());
  }, [logs]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: p } = await supabase.from('profiles').select('id, tenant_id, full_name').eq('auth_id', session.user.id).maybeSingle();
        if (p) {
          setProfile(p);
          setTenantId(p.tenant_id);
          await loadData(p.id, p.tenant_id);
        }
      } catch (e) { console.error('Fetch profile error:', e); }
    };
    fetchProfile();
    startGps();
  }, []);

  // Sync geoloc permissions when scanning
  useEffect(() => {
    if (step === 2 && activeTab === 'patroli') {
      setScanning(true);
      startGps();
    } else {
      setScanning(false);
    }
  }, [step, activeTab]);

  // html5-qrcode camera scanner hook
  useEffect(() => {
    let html5QrCode;
    const elementId = "reader";
    
    if (scanning && step === 2 && activeTab === 'patroli') {
      setScanLoading(true);
      setScanError('');
      
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode(elementId);
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 }
            },
            (decodedText) => {
              handleBarcodeScannedSuccessfully(decodedText);
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(err => console.error(err));
              }
            },
            () => {
              // scanning...
            }
          ).then(() => {
            setScanLoading(false);
          }).catch(err => {
            console.warn("Kamera scanner gagal aktif:", err);
            setScanLoading(false);
            setScanning(false);
            setScanError(`Gagal akses kamera: ${err.message || err}. Gunakan input manual.`);
          });
        } catch (e) {
          console.error("Html5Qrcode scanner failed to initialize:", e);
          setScanLoading(false);
          setScanError(`Scanner Error: ${e.message || e}`);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error(err));
        }
      };
    }
  }, [scanning, step, activeTab]);

  const startGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const loadData = async (uid, tid) => {
    try {
      const [cpData, rData, lData, pData, iData, mData, divData, hoData] = await Promise.all([
        supabase.from('patrol_checkpoints').select('*').eq('tenant_id', tid).eq('is_active', true).order('name'),
        supabase.from('patrol_routes').select('*, patrol_route_checkpoints(*, patrol_checkpoints(*))').eq('tenant_id', tid).eq('is_active', true),
        supabase.from('patrol_logs').select('*').eq('profile_id', uid).eq('tenant_id', tid).order('scan_time', { ascending: false }),
        supabase.from('profiles').select('id, full_name, nip, role, division_id').eq('tenant_id', tid),
        supabase.from('patrol_incidents').select('*, patrol_logs(*)').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('mutasi_logs').select('*, profiles(*)').eq('profile_id', uid).eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('divisions').select('id, name').eq('tenant_id', tid),
        supabase.from('patrol_shift_handovers').select('*, from_profile:profiles!patrol_shift_handovers_from_profile_id_fkey(full_name), to_profile:profiles!patrol_shift_handovers_to_profile_id_fkey(full_name)').eq('tenant_id', tid).or(`from_profile_id.eq.${uid},to_profile_id.eq.${uid}`).order('handover_time', { ascending: false })
      ]);
      if (cpData.data) setCheckpoints(cpData.data);
      if (rData.data?.length) setRoutes(rData.data);
      if (lData.data) {
        setLogs(lData.data);
        const todayStr = new Date().toDateString();
        const todayScans = lData.data.filter(l => new Date(l.scan_time).toDateString() === todayStr);
        setScannedIds(todayScans.map(l => l.checkpoint_id));
      }
      
      let filteredGuards = [];
      if (pData.data) {
        const secDivIds = (divData.data || []).filter(d => /security|satpam/i.test(d.name)).map(d => d.id);
        filteredGuards = pData.data.filter(p => 
          p.id !== uid && 
          (
            ['security', 'satpam'].includes(p.role) || 
            secDivIds.includes(p.division_id)
          )
        );
      }
      setGuards(filteredGuards);

      if (iData.data) setIncidents(iData.data.filter(inc => inc.patrol_logs?.profile_id === uid));
      if (mData.data) setMutasiLogs(mData.data);
      if (hoData.data) setHandoverLogs(hoData.data);
    } catch (e) { console.error('Load data error:', e); }
  };

  const uploadFileToStorage = async (file, folder) => {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const path = `${folder}/${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn('Gagal memutar bip suara:', e);
    }
  };

  const handleBarcodeScannedSuccessfully = (val) => {
    const cleanVal = val.trim();
    if (!cleanVal) return;

    const found = checkpoints.find(cp =>
      cp.qr_code.toLowerCase() === cleanVal.toLowerCase() ||
      cp.id.toLowerCase() === cleanVal.toLowerCase()
    );

    if (found) {
      playBeepSound();
      setArea(found);
      setTimeScan(new Date());
      setStep(3);
      setScanning(false);
      setScanError('');
      setManualCode('');
    } else {
      setScanError(`QR Code "${cleanVal}" tidak terdaftar di checkpoint.`);
      setTimeout(() => setScanError(''), 4000);
    }
  };

  const handleBarcodeScanSubmit = () => {
    handleBarcodeScannedSuccessfully(manualCode);
  };

  const resetLaporan = () => {
    setStep(1);
    setArea(null);
    setTimeScan(null);
    setMode(null);
    setKategori('');
    setTemuan('');
    setSeverity('medium');
    setDeskripsi('');
    setFoto(null);
    setManualCode('');
    setScanError('');
  };

  const handleNormal = async () => {
    setSubmitting(true);
    try {
      const { data: logData, error: logErr } = await supabase.from('patrol_logs').insert({
        tenant_id: tenantId,
        profile_id: profile.id,
        checkpoint_id: area.id,
        scan_time: timeScan ? timeScan.toISOString() : new Date().toISOString(),
        latitude: gpsPosition?.latitude || null,
        longitude: gpsPosition?.longitude || null,
      }).select().single();

      if (logErr) throw logErr;

      logAudit('PATROL_SCAN', { checkpoint: area.name, status: 'Normal' });
      toast(`Checkpoint "${area.name}" tercatat normal!`, 'success');
      setMode('normal');
      setStep(4);
      await loadData(profile.id, tenantId);
    } catch (e) {
      toast('Gagal mencatat patroli: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTemuanSubmit = async (e) => {
    e.preventDefault();
    if (!kategori || !temuan) {
      toast('Pilih kategori dan jenis temuan!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      let photo_url = null;
      if (foto) {
        photo_url = await uploadFileToStorage(foto, 'patrol_incidents');
      }

      // 1. Insert checkpoint patrol log
      const { data: logData, error: logErr } = await supabase.from('patrol_logs').insert({
        tenant_id: tenantId,
        profile_id: profile.id,
        checkpoint_id: area.id,
        scan_time: timeScan ? timeScan.toISOString() : new Date().toISOString(),
        latitude: gpsPosition?.latitude || null,
        longitude: gpsPosition?.longitude || null,
      }).select().single();

      if (logErr) throw logErr;

      const matchedKat = KATEGORI_TEMUAN.find(k => k.id === kategori);
      const matchedTemuan = matchedKat?.items.find(t => t.kode === temuan);

      // 2. Insert patrol incident linked to log id
      const { error: incErr } = await supabase.from('patrol_incidents').insert({
        tenant_id: tenantId,
        patrol_log_id: logData.id,
        incident_type: `[${temuan}] ${matchedTemuan?.nama || 'Temuan'}`,
        description: deskripsi || `Temuan kategori ${matchedKat?.nama || ''} di pos ${area.name}.`,
        severity: severity,
        photo_url,
      });

      if (incErr) throw incErr;

      logAudit('PATROL_INCIDENT', { checkpoint: area.name, type: temuan, severity });
      toast(`Insiden temuan di "${area.name}" telah dilaporkan!`, 'warning');
      setMode('temuan');
      setStep(4);
      await loadData(profile.id, tenantId);
    } catch (e) {
      toast('Gagal menyimpan temuan: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStandaloneTemuanSubmit = async (e) => {
    e.preventDefault();
    if (!laporForm.checkpoint_id || !laporForm.kategori || !laporForm.temuan) {
      toast('Lengkapi data form temuan!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      let photo_url = null;
      if (laporForm.photo) {
        photo_url = await uploadFileToStorage(laporForm.photo, 'patrol_incidents');
      }

      const selectedCp = checkpoints.find(c => c.id === laporForm.checkpoint_id);

      // 1. Create dummy patrol log to bind to checkpoint
      const { data: logData, error: logErr } = await supabase.from('patrol_logs').insert({
        tenant_id: tenantId,
        profile_id: profile.id,
        checkpoint_id: laporForm.checkpoint_id,
        scan_time: new Date().toISOString(),
        latitude: gpsPosition?.latitude || null,
        longitude: gpsPosition?.longitude || null,
      }).select().single();

      if (logErr) throw logErr;

      const matchedKat = KATEGORI_TEMUAN.find(k => k.id === laporForm.kategori);
      const matchedTemuan = matchedKat?.items.find(t => t.kode === laporForm.temuan);

      // 2. Create Incident entry linked to the new log
      const { error: incErr } = await supabase.from('patrol_incidents').insert({
        tenant_id: tenantId,
        patrol_log_id: logData.id,
        incident_type: `[${laporForm.temuan}] ${matchedTemuan?.nama || 'Temuan'}`,
        description: laporForm.description || `Laporan temuan untuk ${selectedCp?.name || 'Checkpoint'}.`,
        severity: laporForm.severity,
        photo_url,
      });

      if (incErr) throw incErr;

      logAudit('PATROL_INCIDENT', { checkpoint: selectedCp?.name, type: laporForm.temuan, severity: laporForm.severity });
      toast('Laporan temuan berhasil dikirim!', 'success');
      setLaporForm({ checkpoint_id: '', kategori: '', temuan: '', severity: 'medium', description: '', photo: null });
      await loadData(profile.id, tenantId);
    } catch (e) {
      toast('Gagal mengirim temuan: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMutasiSubmit = async (e) => {
    e.preventDefault();
    const finalLokasi = mutasiForm.is_custom_lokasi ? mutasiForm.lokasi_custom : mutasiForm.lokasi;
    const finalKategori = mutasiForm.kategori === '__lainnya__' ? mutasiForm.kategori_lainnya : mutasiForm.kategori;

    if (!finalLokasi.trim() || !finalKategori.trim() || !mutasiForm.uraian.trim()) {
      toast('Lengkapi form Buku Mutasi!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      let photo_url = null;
      if (mutasiForm.photo) {
        photo_url = await uploadFileToStorage(mutasiForm.photo, 'mutasi_logs');
      }

      const shift = getDetectedShift();

      const { error } = await supabase.from('mutasi_logs').insert({
        tenant_id: tenantId,
        profile_id: profile.id,
        tanggal: new Date().toISOString().split('T')[0],
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':'),
        tanggal_kejadian: mutasiForm.tanggal_kejadian,
        jam_kejadian: mutasiForm.jam_kejadian,
        lokasi: finalLokasi,
        uraian: mutasiForm.uraian,
        kategori: finalKategori,
        foto: photo_url,
        shift
      });

      if (error) throw error;

      logAudit('PATROL_MUTASI_LOG', { kategori: finalKategori, lokasi: finalLokasi });
      toast('Catatan Buku Mutasi disimpan!', 'success');
      setMutasiForm({
        tanggal_kejadian: new Date().toISOString().split('T')[0],
        jam_kejadian: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'),
        kategori: 'informasi',
        kategori_lainnya: '',
        lokasi: '',
        lokasi_custom: '',
        is_custom_lokasi: false,
        uraian: '',
        photo: null
      });
      await loadData(profile.id, tenantId);
    } catch (e) {
      toast('Gagal mencatat mutasi: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    if (!handoverForm.to_profile_id) {
      toast('Pilih petugas pengganti!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('patrol_shift_handovers').insert({
        tenant_id: tenantId,
        from_profile_id: profile.id,
        to_profile_id: handoverForm.to_profile_id,
        handover_time: new Date().toISOString(),
        notes: handoverForm.notes || null,
      });

      if (error) throw error;

      logAudit('PATROL_HANDOVER', { to: handoverForm.to_profile_id });
      toast('Shift Handover berhasil dicatat!', 'success');
      setHandoverForm({ to_profile_id: '', notes: '' });
      await loadData(profile.id, tenantId);
    } catch (e) {
      toast('Gagal memproses handover: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter lists based on selected categories
  const dropdownTemuans = useMemo(() => {
    const cat = KATEGORI_TEMUAN.find(k => k.id === kategori);
    return cat ? cat.items : [];
  }, [kategori]);

  const standaloneDropdownTemuans = useMemo(() => {
    const cat = KATEGORI_TEMUAN.find(k => k.id === laporForm.kategori);
    return cat ? cat.items : [];
  }, [laporForm.kategori]);

  const [riwayatFilter, setRiwayatFilter] = useState('patroli');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-5 pb-8 relative">
      {/* Top Header Row */}
      <div className="flex items-center justify-between z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit text-sm">
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Patrol Connected</span>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="glass-panel p-1 rounded-2xl flex border border-white/10 z-10 w-full overflow-x-auto select-none gap-0.5 scrollbar-none">
        {[
          { id: 'patroli', label: 'Patroli Checkpoint', icon: Route },
          { id: 'lapor', label: 'Lapor Temuan', icon: AlertTriangle },
          { id: 'mutasi', label: 'Buku Mutasi', icon: ClipboardList },
          { id: 'handover', label: 'Handover Jaga', icon: Users },
          { id: 'riwayat', label: 'Riwayat', icon: History }
        ].map(tb => {
          const Icon = tb.icon;
          const active = activeTab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => {
                setActiveTab(tb.id);
                if (tb.id === 'patroli') resetLaporan();
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 ${
                active 
                  ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} /> {tb.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: PATROLI CHECKPOINT */}
      {activeTab === 'patroli' && (
        <div className="w-full space-y-4">
          
          {/* STEP 1: Mulai Patroli */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              {currentRoute && (
                <div className="glass-panel p-5 rounded-[24px] border border-[var(--aurora-3)]/20 bg-gradient-to-br from-[var(--aurora-3)]/5 to-transparent">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center">
                      <Route size={20} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">{currentRoute.name}</h3>
                      <p className="text-[10px] text-gray-500">{scannedIds.length} dari {routeCheckpoints.length || checkpoints.length} checkpoint hari ini</p>
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full transition-all" 
                         style={{ width: `${routeCheckpoints.length ? Math.min((scannedIds.length / routeCheckpoints.length) * 100, 100) : 0}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3.5">
                    {routeCheckpoints.map((rc, idx) => {
                      const scanned = scannedIds.includes(rc.checkpoint_id);
                      return (
                        <div key={rc.id} className="flex items-center gap-1">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold ${
                            scanned 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                              : 'bg-white/5 text-gray-500 border border-white/10'
                          }`}>
                            {scanned ? <Check size={12} strokeWidth={3} /> : idx + 1}
                          </div>
                          <span className="text-[9px] text-gray-500 hidden sm:inline">{rc.patrol_checkpoints?.name}</span>
                          {idx < routeCheckpoints.length - 1 && <span className="text-gray-600 text-[8px]">→</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info Card */}
              <div className="glass-panel p-5 rounded-[24px] border border-white/10 space-y-4 bg-gradient-to-br from-white/[0.02] to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--aurora-1)]/10 text-[var(--aurora-1)] flex items-center justify-center">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Status Penugasan</h4>
                    <p className="text-[10px] text-gray-500">Informasi dinas regu & jadwal aktif</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider block">Regu Jaga</span>
                    <strong className="text-white text-xs">{profile?.regu || 'Regu Utama'}</strong>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider block">Shift Aktif</span>
                    <strong className="text-white text-xs">{getDetectedShift()}</strong>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
                  <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Sistem akan menyinkronkan scan log & temuan secara real-time ke Dashboard Monitoring Manajemen. Pastikan GPS aktif.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(142,45,226,0.35)]"
              >
                MULAI SCAN CHECKPOINT
              </button>
            </div>
          )}

          {/* STEP 2: Kamera Pemindai */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h3 className="text-white font-bold text-sm">Kamera Pemindai Checkpoint</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Arahkan kamera perangkat ke QR Code checkpoint</p>
              </div>

              {/* Video Scanner Element */}
              <div className="relative w-full min-h-[240px] rounded-3xl overflow-hidden bg-black/40 border-2 border-[var(--aurora-3)]/30 shadow-[0_0_30px_rgba(0,201,255,0.15)] flex flex-col items-center justify-center">
                <div id="reader" className="w-full min-h-[240px] z-0"></div>

                {scanning && !scanLoading && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-[var(--aurora-3)]"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-[var(--aurora-3)]"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-[var(--aurora-3)]"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-[var(--aurora-3)]"></div>
                    
                    {/* Pulsing Scanning Line */}
                    <div className="absolute left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[var(--aurora-3)] to-transparent shadow-[0_0_15px_var(--aurora-3)] animate-pulse" 
                         style={{
                           animation: 'scan-line-anim 2s linear infinite',
                           top: '50%'
                         }} />
                  </div>
                )}

                {scanLoading && (
                  <div className="absolute z-20 flex flex-col items-center gap-2 text-[var(--aurora-3)] font-bold text-xs">
                    <Loader2 size={32} className="animate-spin" />
                    <span>Mengaktifkan Lensa Kamera...</span>
                  </div>
                )}
                
                {scanError && (
                  <div className="absolute bottom-4 left-4 right-4 bg-rose-500/90 backdrop-blur-md text-white border border-rose-500/30 p-2.5 rounded-xl text-center text-[10px] font-bold z-20 shadow-lg animate-bounce">
                    ⚠️ {scanError}
                  </div>
                )}
              </div>

              {/* Fallback Manual QR Code */}
              <div className="glass-panel p-4 rounded-[20px] border border-white/10">
                <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1.5">Input Manual Barcode</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualCode} 
                    onChange={e => { setManualCode(e.target.value); setScanError(''); }}
                    placeholder="Masukkan kode unik..." 
                    onKeyDown={e => e.key === 'Enter' && handleBarcodeScanSubmit()}
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-[var(--aurora-3)] hover:border-white/40 transition-colors"
                  />
                  <button 
                    onClick={handleBarcodeScanSubmit}
                    className="px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
                  >
                    Verifikasi
                  </button>
                </div>
              </div>

              {/* Simulated Click Option */}
              <div className="space-y-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block ml-1">Simulasi Pilih Checkpoint:</span>
                <div className="max-h-[110px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {checkpoints.map(cp => (
                    <button
                      key={cp.id}
                      onClick={() => handleBarcodeScannedSuccessfully(cp.qr_code)}
                      className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-[var(--aurora-3)] rounded-xl text-left text-xs text-white transition-all hover:bg-white/[0.08]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{cp.name}</p>
                        <p className="text-[9px] text-gray-500 font-mono truncate">{cp.qr_code}</p>
                      </div>
                      <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 uppercase font-black tracking-wider shrink-0 ml-2">Pilih</span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={resetLaporan}
                className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider"
              >
                Kembali
              </button>
            </div>
          )}

          {/* STEP 3: Form Lapor */}
          {step === 3 && area && (
            <div className="space-y-4 animate-slide-up">
              <div className="glass-panel p-5 rounded-[24px] border border-[var(--aurora-3)]/20 bg-gradient-to-br from-[var(--aurora-3)]/5 to-transparent">
                <span className="text-[8px] text-[var(--aurora-3)] font-black uppercase tracking-widest block mb-1">Checkpoint Terscan</span>
                <h4 className="text-white font-serif font-bold text-base leading-tight">{area.name}</h4>
                {area.location_description && (
                  <p className="text-[10px] text-gray-400 mt-1">{area.location_description}</p>
                )}
                {timeScan && (
                  <div className="mt-3.5 pt-3.5 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-1.5">
                      <Clock size={12} /> Waktu Kunjungan
                    </span>
                    <strong className="text-white text-xs font-mono">{timeScan.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</strong>
                  </div>
                )}
              </div>

              {!mode ? (
                <div className="space-y-4">
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block ml-1">Pilih Status Kondisi Checkpoint:</span>
                  
                  <button 
                    onClick={handleNormal}
                    disabled={submitting}
                    className="w-full p-6 bg-emerald-500/10 border-2 border-emerald-500/30 hover:border-emerald-500/80 rounded-2xl text-center flex flex-col items-center gap-2 group transition-all"
                  >
                    {submitting ? (
                      <Loader2 size={32} className="animate-spin text-emerald-400" />
                    ) : (
                      <ThumbsUp size={32} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                    )}
                    <div>
                      <strong className="text-white text-sm tracking-wide block uppercase font-black">AMAN & KONDUSIF (NORMAL)</strong>
                      <span className="text-[9px] text-gray-400 mt-1 block">Tidak ada kendala, situasi aman</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => setMode('temuan')}
                    className="w-full p-6 bg-amber-500/10 border-2 border-amber-500/30 hover:border-amber-500/80 rounded-2xl text-center flex flex-col items-center gap-2 group transition-all"
                  >
                    <AlertTriangle size={32} className="text-amber-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <strong className="text-white text-sm tracking-wide block uppercase font-black">ADA TEMUAN / MASALAH</strong>
                      <span className="text-[9px] text-gray-400 mt-1 block">Terdapat kerusakan, bahaya, atau anomali</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider"
                  >
                    Kembali ke Scanner
                  </button>
                </div>
              ) : mode === 'temuan' && (
                <form onSubmit={handleTemuanSubmit} className="glass-panel p-5 rounded-[24px] border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 font-serif font-bold text-sm">
                    <AlertTriangle size={16} /> <span>FORM LAPOR TEMUAN</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Kategori Temuan</label>
                      <select 
                        value={kategori} 
                        onChange={e => { setKategori(e.target.value); setTemuan(''); }}
                        required
                        className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {KATEGORI_TEMUAN.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Jenis Temuan</label>
                      <select 
                        value={temuan} 
                        onChange={e => setTemuan(e.target.value)}
                        required
                        disabled={!kategori}
                        className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)] disabled:opacity-50"
                      >
                        <option value="">-- Pilih Jenis --</option>
                        {dropdownTemuans.map(t => <option key={t.kode} value={t.kode}>[{t.kode}] {t.nama}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-2">Tingkat Bahaya (Severity)</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'low', label: 'Rendah', colorClass: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
                          { id: 'medium', label: 'Sedang', colorClass: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
                          { id: 'high', label: 'Tinggi', colorClass: 'border-red-500/40 text-red-400 bg-red-500/10' },
                          { id: 'critical', label: 'Kritis', colorClass: 'border-purple-500/40 text-purple-400 bg-purple-500/10' }
                        ].map(sv => {
                          const active = severity === sv.id;
                          return (
                            <button
                              key={sv.id}
                              type="button"
                              onClick={() => setSeverity(sv.id)}
                              className={`py-2 px-1.5 rounded-xl border text-[9px] uppercase font-black tracking-wide text-center transition-all ${
                                active ? sv.colorClass + ' ring-1 ring-white/20 scale-105' : 'border-white/10 text-gray-500 hover:text-white'
                              }`}
                            >
                              {sv.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Deskripsi Temuan</label>
                      <textarea 
                        value={deskripsi} 
                        onChange={e => setDeskripsi(e.target.value)}
                        placeholder="Tuliskan keterangan detail temuan..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none focus:border-[var(--aurora-3)] hover:border-white/40 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Lampiran Foto</label>
                      {foto ? (
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/20">
                          <img src={URL.createObjectURL(foto)} alt="Temuan Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => setFoto(null)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-xs"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 p-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                          <Camera size={18} className="text-gray-400" />
                          <span className="text-xs text-gray-400">Upload foto bukti...</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={e => setFoto(e.target.files[0])} 
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setMode(null)} 
                      className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting || !kategori || !temuan}
                      className="flex-2 py-3.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Kirim Laporan
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STEP 4: Success Screen */}
          {step === 4 && (
            <div className="glass-panel p-8 text-center border border-white/10 rounded-[32px] space-y-5 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Check size={36} strokeWidth={3} />
              </div>
              
              <div>
                <h3 className="text-white font-serif font-bold text-lg">Patroli Tersimpan!</h3>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-mono">Data Terkirim ke Monitoring Dashboard</p>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 text-left border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Pos Checkpoint:</span><strong className="text-white">{area?.name}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">Status Kondisi:</span>
                  <strong className={mode === 'temuan' ? 'text-amber-400' : 'text-emerald-400'}>
                    {mode === 'temuan' ? 'Ada Temuan (Incidents)' : 'Normal (Aman)'}
                  </strong>
                </div>
                {mode === 'temuan' && (
                  <>
                    <div className="flex justify-between"><span className="text-gray-500">Jenis:</span><strong className="text-white">{temuan}</strong></div>
                    <div className="flex justify-between"><span className="text-gray-500">Severity:</span><strong className="text-white uppercase font-mono">{severity}</strong></div>
                  </>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <button 
                  onClick={() => { resetLaporan(); setStep(2); }} 
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(142,45,226,0.3)]"
                >
                  Scan Checkpoint Berikutnya
                </button>
                <button 
                  onClick={resetLaporan} 
                  className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider"
                >
                  Selesai Patroli
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: LAPOR TEMUAN (STANDALONE) */}
      {activeTab === 'lapor' && (
        <form onSubmit={handleStandaloneTemuanSubmit} className="glass-panel p-5 rounded-[24px] border border-white/10 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between text-amber-400 font-serif font-bold text-sm mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} /> <span>LAPOR TEMUAN MANDIRI</span>
            </div>
            <button 
              type="button" 
              onClick={() => { setActiveTab('riwayat'); setRiwayatFilter('temuan'); }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-sans text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <History size={12} /> Lihat Riwayat
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Pilih Lokasi Checkpoint</label>
              <select 
                value={laporForm.checkpoint_id} 
                onChange={e => setLaporForm({ ...laporForm, checkpoint_id: e.target.value })}
                required
                className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
              >
                <option value="">-- Pilih Pos Jaga --</option>
                {checkpoints.map(cp => <option key={cp.id} value={cp.id}>{cp.name} [{cp.qr_code}]</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Kategori</label>
              <select 
                value={laporForm.kategori} 
                onChange={e => setLaporForm({ ...laporForm, kategori: e.target.value, temuan: '' })}
                required
                className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
              >
                <option value="">-- Pilih Kategori --</option>
                {KATEGORI_TEMUAN.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Jenis Temuan</label>
              <select 
                value={laporForm.temuan} 
                onChange={e => setLaporForm({ ...laporForm, temuan: e.target.value })}
                required
                disabled={!laporForm.kategori}
                className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)] disabled:opacity-50"
              >
                <option value="">-- Pilih Jenis --</option>
                {standaloneDropdownTemuans.map(t => <option key={t.kode} value={t.kode}>[{t.kode}] {t.nama}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-2">Tingkat Bahaya (Severity)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'low', label: 'Rendah', colorClass: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
                  { id: 'medium', label: 'Sedang', colorClass: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
                  { id: 'high', label: 'Tinggi', colorClass: 'border-red-500/40 text-red-400 bg-red-500/10' },
                  { id: 'critical', label: 'Kritis', colorClass: 'border-purple-500/40 text-purple-400 bg-purple-500/10' }
                ].map(sv => {
                  const active = laporForm.severity === sv.id;
                  return (
                    <button
                      key={sv.id}
                      type="button"
                      onClick={() => setLaporForm({ ...laporForm, severity: sv.id })}
                      className={`py-2 px-1.5 rounded-xl border text-[9px] uppercase font-black tracking-wide text-center transition-all ${
                        active ? sv.colorClass + ' ring-1 ring-white/20 scale-105' : 'border-white/10 text-gray-500 hover:text-white'
                      }`}
                    >
                      {sv.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Deskripsi Uraian</label>
              <textarea 
                value={laporForm.description} 
                onChange={e => setLaporForm({ ...laporForm, description: e.target.value })}
                placeholder="Tuliskan keterangan detail temuan..."
                rows={3}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none focus:border-[var(--aurora-3)] hover:border-white/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Lampiran Foto Bukti</label>
              {laporForm.photo ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/20">
                  <img src={URL.createObjectURL(laporForm.photo)} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setLaporForm({ ...laporForm, photo: null })}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-xs"
                  >
                    X
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <Camera size={18} className="text-gray-400" />
                  <span className="text-xs text-gray-400">Upload foto bukti...</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setLaporForm({ ...laporForm, photo: e.target.files[0] })} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting || !laporForm.checkpoint_id || !laporForm.kategori || !laporForm.temuan}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_35px_rgba(142,45,226,0.2)]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} KIRIM LAPORAN TEMUAN
          </button>
        </form>
      )}

      {/* TAB CONTENT: BUKU MUTASI */}
      {activeTab === 'mutasi' && (
        <form onSubmit={handleMutasiSubmit} className="glass-panel p-5 rounded-[24px] border border-white/10 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between text-white font-serif font-bold text-sm mb-2">
            <div className="flex items-center gap-2">
              <span>📝 CATAT BUKU MUTASI JAGA</span>
            </div>
            <button 
              type="button" 
              onClick={() => { setActiveTab('riwayat'); setRiwayatFilter('mutasi'); }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-sans text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <History size={12} /> Lihat Riwayat
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Tanggal Kejadian</label>
                <input 
                  type="date" 
                  value={mutasiForm.tanggal_kejadian} 
                  onChange={e => setMutasiForm({ ...mutasiForm, tanggal_kejadian: e.target.value })}
                  className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" 
                />
              </div>
              <div>
                <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Jam Kejadian</label>
                <input 
                  type="time" 
                  value={mutasiForm.jam_kejadian} 
                  onChange={e => setMutasiForm({ ...mutasiForm, jam_kejadian: e.target.value })}
                  className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Plotting Pos / Lokasi</label>
              {!mutasiForm.is_custom_lokasi ? (
                <select 
                  value={mutasiForm.lokasi} 
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setMutasiForm({ ...mutasiForm, is_custom_lokasi: true, lokasi: '' });
                    } else {
                      setMutasiForm({ ...mutasiForm, lokasi: e.target.value });
                    }
                  }} 
                  required
                  className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
                >
                  <option value="">-- Pilih Pos Jaga --</option>
                  {checkpoints.map(cp => <option key={cp.id} value={cp.name}>{cp.name}</option>)}
                  <option value="__custom__">-- Ketik Lokasi Lain (Custom) --</option>
                </select>
              ) : (
                <div className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    value={mutasiForm.lokasi_custom} 
                    onChange={e => setMutasiForm({ ...mutasiForm, lokasi_custom: e.target.value })} 
                    placeholder="Masukkan lokasi kustom..." 
                    required
                    className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
                  />
                  <button 
                    type="button" 
                    onClick={() => setMutasiForm({ ...mutasiForm, is_custom_lokasi: false, lokasi: '', lokasi_custom: '' })} 
                    className="text-[10px] text-gray-400 hover:text-white underline text-left w-fit self-start"
                  >
                    ← Kembali ke pilihan pos
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-2">Kategori Kejadian</label>
              <div className="grid grid-cols-2 gap-2">
                {KATEGORI_MUTASI.map(k => (
                  <button 
                    key={k.id} 
                    type="button" 
                    onClick={() => setMutasiForm({ ...mutasiForm, kategori: k.id })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      mutasiForm.kategori === k.id 
                        ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white shadow' 
                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                    }`}
                  >
                    <span className={k.colorClass}>{k.label}</span>
                  </button>
                ))}
              </div>
              {mutasiForm.kategori === '__lainnya__' && (
                <input 
                  type="text" 
                  value={mutasiForm.kategori_lainnya} 
                  onChange={e => setMutasiForm({ ...mutasiForm, kategori_lainnya: e.target.value })} 
                  placeholder="Ketik kategori lainnya..." 
                  required
                  className="mt-2 w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" 
                />
              )}
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Uraian Kejadian</label>
              <textarea 
                value={mutasiForm.uraian} 
                onChange={e => setMutasiForm({ ...mutasiForm, uraian: e.target.value })}
                placeholder="Tuliskan catatan uraian laporan..."
                rows={4}
                required
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none focus:border-[var(--aurora-3)] hover:border-white/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Bukti Foto</label>
              {mutasiForm.photo ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/20">
                  <img src={URL.createObjectURL(mutasiForm.photo)} alt="Mutasi Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setMutasiForm({ ...mutasiForm, photo: null })}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-xs"
                  >
                    X
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <Camera size={18} className="text-gray-400" />
                  <span className="text-xs text-gray-400">Lampirkan foto kejadian (opsional)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setMutasiForm({ ...mutasiForm, photo: e.target.files[0] })} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_35px_rgba(142,45,226,0.2)]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} SIMPAN CATATAN MUTASI
          </button>
        </form>
      )}

      {/* TAB CONTENT: HANDOVER JAGA */}
      {activeTab === 'handover' && (
        <form onSubmit={handleHandoverSubmit} className="glass-panel p-5 rounded-[24px] border border-white/10 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between text-[var(--aurora-3)] font-serif font-bold text-sm mb-2">
            <div className="flex items-center gap-2">
              <Users size={16} /> <span>SHIFT HANDOVER (SERAH TERIMA JAGA)</span>
            </div>
            <button 
              type="button" 
              onClick={() => { setActiveTab('riwayat'); setRiwayatFilter('handover'); }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-sans text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <History size={12} /> Lihat Riwayat
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Petugas Penerima (Pengganti)</label>
              <select 
                value={handoverForm.to_profile_id} 
                onChange={e => setHandoverForm({ ...handoverForm, to_profile_id: e.target.value })}
                required
                className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
              >
                <option value="">-- Pilih Rekan Satpam --</option>
                {guards.map(g => <option key={g.id} value={g.id}>{g.full_name} ({g.nip || '—'})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Catatan Inventaris / Serah Terima</label>
              <textarea 
                value={handoverForm.notes} 
                onChange={e => setHandoverForm({ ...handoverForm, notes: e.target.value })}
                placeholder="Tuliskan catatan penting serah terima (e.g. Alkon lengkap, HT aman, dll)..."
                rows={5}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none focus:border-[var(--aurora-3)] hover:border-white/40 transition-colors"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_35px_rgba(142,45,226,0.2)]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} LAKUKAN SERAH TERIMA JAGA
          </button>
        </form>
      )}

      {/* TAB CONTENT: RIWAYAT */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4 animate-slide-up">
          {/* Sub-tab selection */}
          <div className="flex gap-2 border-b border-white/10 pb-2.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'patroli', label: 'Scan Log' },
              { id: 'temuan', label: 'Incidents' },
              { id: 'mutasi', label: 'Mutasi Jaga' },
              { id: 'handover', label: 'Handover Jaga' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setRiwayatFilter(f.id)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  riwayatFilter === f.id ? 'bg-[var(--aurora-3)]/20 text-[var(--aurora-3)] border border-[var(--aurora-3)]/30' : 'text-gray-500 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List display */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            
            {riwayatFilter === 'patroli' && (
              <>
                {todayLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    <ShieldCheck size={28} className="mx-auto text-gray-600 mb-2" />
                    Belum ada scan patroli hari ini.
                  </div>
                ) : (
                  todayLogs.map(l => {
                    const cp = checkpoints.find(c => c.id === l.checkpoint_id);
                    return (
                      <div key={l.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                          </div>
                          <div>
                            <p className="text-white text-xs font-bold">{cp?.name || '—'}</p>
                            <p className="text-[9px] text-gray-500">{new Date(l.scan_time).toLocaleTimeString('id-ID')} WIB</p>
                          </div>
                        </div>
                        {l.latitude && l.longitude && (
                          <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">📍 GPS Verified</span>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            {riwayatFilter === 'temuan' && (
              <>
                {incidents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    <AlertTriangle size={28} className="mx-auto text-gray-600 mb-2" />
                    Belum ada temuan insiden tercatat.
                  </div>
                ) : (
                  incidents.map(inc => {
                    const cp = checkpoints.find(c => c.id === inc.patrol_logs?.checkpoint_id);
                    return (
                      <div key={inc.id} className="bg-white/5 border border-[var(--danger)]/20 p-4 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                              <AlertTriangle size={16} />
                            </div>
                            <div>
                              <p className="text-white text-xs font-bold">{inc.incident_type}</p>
                              <p className="text-[9px] text-gray-500">{new Date(inc.created_at).toLocaleString('id-ID')} WIB</p>
                            </div>
                          </div>
                          <span className="text-[8px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold uppercase tracking-wider">
                            {inc.severity || 'Medium'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">{inc.description}</p>
                        {cp && (
                          <div className="text-[9px] text-[var(--aurora-3)] font-medium">📍 Pos Checkpoint: {cp.name}</div>
                        )}
                        {inc.photo_url && (
                          <a href={inc.photo_url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 mt-1 block">
                            <img src={inc.photo_url} alt="" className="w-full h-full object-cover" />
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            {riwayatFilter === 'mutasi' && (
              <>
                {mutasiLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    <ClipboardList size={28} className="mx-auto text-gray-600 mb-2" />
                    Belum ada log buku mutasi terdaftar.
                  </div>
                ) : (
                  mutasiLogs.map(m => (
                    <div key={m.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-[var(--aurora-3)]/15 text-[var(--aurora-3)] font-bold text-[8px] uppercase tracking-wide">
                          {m.kategori}
                        </span>
                        <span className="text-[9px] text-gray-500">{m.tanggal_kejadian} {m.jam_kejadian} WIB</span>
                      </div>
                      <div className="text-[11px] text-gray-400 font-bold">📍 Pos Jaga: {m.lokasi}</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{m.uraian}</p>
                      {m.foto && (
                        <a href={m.foto} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 mt-1 block">
                          <img src={m.foto} alt="" className="w-full h-full object-cover" />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </>
            )}

            {riwayatFilter === 'handover' && (
              <>
                {handoverLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    <Users size={28} className="mx-auto text-gray-600 mb-2" />
                    Belum ada serah terima jaga tercatat.
                  </div>
                ) : (
                  handoverLogs.map(m => (
                    <div key={m.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-[var(--aurora-2)]/15 text-[var(--aurora-2)] font-bold text-[8px] uppercase tracking-wide flex items-center gap-1">
                          <Users size={10} /> Handover
                        </span>
                        <span className="text-[9px] text-gray-500">{new Date(m.handover_time).toLocaleString('id-ID')} WIB</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs py-1 border-y border-white/5">
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">Petugas Lama</span>
                          <strong className="text-gray-300">{m.from_profile?.full_name || 'Petugas'}</strong>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">Penerima Jaga</span>
                          <strong className="text-white">{m.to_profile?.full_name || 'Rekan'}</strong>
                        </div>
                      </div>
                      {m.notes && (
                        <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                          <span className="text-[8px] text-gray-500 uppercase block mb-0.5">Catatan Inventaris / Serah Terima:</span>
                          <p className="bg-[#13151A] p-2.5 rounded-xl border border-white/5">{m.notes}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PatrolScan;
