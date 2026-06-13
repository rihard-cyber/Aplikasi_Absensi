/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, X, ChevronRight, CheckCircle2, Star, Users, Clock, DollarSign, 
  ShieldCheck, Camera, MapPin, QrCode, Smartphone, FileText, Calculator, 
  CreditCard, Gift, TrendingUp, Building2, 
  MessageSquare, ChevronDown, Sparkles, Send, Loader2, Phone, Mail, 
  CheckSquare, Zap, Globe, UserCheck, Briefcase, Calendar, 
  RefreshCw, Headphones, Route, Truck, AlertTriangle, 
  Shuffle, Home, Layers, Fingerprint, Wifi, Eye, ArrowRight
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import DeveloperWatermark from '../components/DeveloperWatermark';

const publicAsset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
/** @type {(s: string) => string} Passthrough i18n - app is monolingual Indonesian */
const i18n = (s) => s;

const FEATURE_CATEGORIES = [
  {
    id: 'absensi',
    title: 'Absensi & Kehadiran AI',
    tagline: 'Lacak kehadiran real-time dengan akurasi 99.9% anti-curang.',
    icon: <Camera size={22} />,
    color: '#00C9FF',
    image: publicAsset('/feature_absensi.png'),
    features: [
      { icon: <Camera size={20} />, name: 'Face Camera Check-in', desc: 'Selfie real-time dengan face recognition + liveness detection. Anti-fake photo!' },
      { icon: <MapPin size={20} />, name: 'GPS Geofencing Cerdas', desc: 'Radius presisi per unit/proyek. Hanya bisa absen jika berada dalam area kerja.' },
      { icon: <Wifi size={20} />, name: 'Jaringan WiFi Zone Check', desc: 'Verifikasi SSID & BSSID WiFi kantor. Jaminan karyawan benar-benar di dalam gedung.' },
      { icon: <QrCode size={20} />, name: 'QR Code Multi-Scan', desc: 'Scan barcode unik di pintu masuk. Alternatif absen secepat kilat.' },
      { icon: <Fingerprint size={20} />, name: 'Device Hardware Binding', desc: 'Kunci 1 akun ke 1 smartphone. Mencegah titip absen antar rekan kerja.' },
      { icon: <Smartphone size={20} />, name: 'Offline Clock-in', desc: 'Absen tanpa sinyal internet. Data otomatis tersinkronisasi saat kembali online.' },
    ]
  },
  {
    id: 'payroll',
    title: 'Automated Payroll & Pajak',
    tagline: 'Proses penggajian bulanan 100+ karyawan selesai dalam 15 menit.',
    icon: <Calculator size={22} />,
    color: '#00FF87',
    image: publicAsset('/feature_payroll.png'),
    features: [
      { icon: <Calculator size={20} />, name: 'Kalkulator Gaji 1-Klik', desc: 'Hitung otomatis gaji pokok, potongan absen, klaim, hingga kasbon tanpa spreadsheet.' },
      { icon: <DollarSign size={20} />, name: 'Lembur Multi-Tarif', desc: 'Penghitungan otomatis lembur hari kerja, akhir pekan, & hari libur sesuai UU.' },
      { icon: <FileText size={20} />, name: 'Slip Gaji Digital HP', desc: 'Slip gaji modern terkirim otomatis ke aplikasi karyawan lengkap dengan rincian TER.' },
      { icon: <Gift size={20} />, name: 'THR & Bonus Otomatis', desc: 'Simulasi dan eksekusi THR proporsional sesuai masa kerja hanya dalam sekali klik.' },
      { icon: <CreditCard size={20} />, name: 'Export Bank Transfer 20+', desc: 'Format auto-credit BCA, Mandiri, BNI, BRI, BSI untuk upload langsung ke internet banking.' },
      { icon: <TrendingUp size={20} />, name: 'PPh 21 TER Terkini & BPJS', desc: 'Selalu update dengan peraturan TER terbaru. Hitung BPJS Kesehatan & Ketenagakerjaan instan.' },
    ]
  },
  {
    id: 'helpdesk',
    title: 'Helpdesk & Building Facility',
    tagline: 'Optimalkan operasional gedung, aset, dan keluhan tenant/karyawan.',
    icon: <Headphones size={22} />,
    color: '#FFD700',
    image: publicAsset('/feature_helpdesk.png'),
    features: [
      { icon: <MessageSquare size={20} />, name: 'Ticketing Multi-Kategori', desc: 'Keluhan AC, listrik, kebersihan, IT dengan foto, tingkat urgensi, dan tracking status.' },
      { icon: <Building2 size={20} />, name: 'Booking Fasilitas Kantor', desc: 'Reservasi ruang rapat, kendaraan operasional, inventaris dengan kalender real-time.' },
      { icon: <Users size={20} />, name: 'Visitor Management System', desc: 'Pre-registrasi tamu, generate QR pass digital, & notifikasi instan saat tamu tiba.' },
      { icon: <Briefcase size={20} />, name: 'Work Order Maintenance', desc: 'Tugaskan teknisi, lampirkan check-list kerja, input foto before/after, & TTD digital.' },
    ]
  },
  {
    id: 'patroli',
    title: 'Security Smart Patrol',
    tagline: 'Pantau kinerja satpam secara real-time dengan jaminan rute patroli lengkap.',
    icon: <Route size={22} />,
    color: '#FF6B6B',
    image: publicAsset('/feature_patroli.png'),
    features: [
      { icon: <QrCode size={20} />, name: 'QR Code Checkpoint', desc: 'Tempel barcode tangguh di titik krusial. Satpam wajib scan untuk verifikasi kedatangan.' },
      { icon: <MapPin size={20} />, name: 'Rute GPS Guard Tracking', desc: 'Visualisasikan rute pergerakan satpam di peta digital secara live selama jam patroli.' },
      { icon: <AlertTriangle size={20} />, name: 'Missed Guard Alert', desc: 'Notifikasi otomatis jika satpam melewatkan checkpoint dalam jadwal waktu tertentu.' },
      { icon: <FileText size={20} />, name: 'Laporan Insiden Foto + K3', desc: 'Satpam bisa laporkan temuan bahaya (kebocoran, pintu terbuka, K3) dengan foto instan.' },
    ]
  },
  {
    id: 'flexible',
    title: 'Hybrid Work & Tukar Shift',
    tagline: 'Manajemen kerja fleksibel, jadwalkan shift rumit seefisien mungkin.',
    icon: <Shuffle size={22} />,
    color: '#8E2DE2',
    image: publicAsset('/feature_wfh.png'),
    features: [
      { icon: <Home size={20} />, name: 'Hybrid Work Mode', desc: 'Pisahkan absen WFH (verifikasi alamat rumah), WFO (WiFi zone), & WFA (GPS bebas).' },
      { icon: <RefreshCw size={20} />, name: 'Shift Swap Peer-to-Peer', desc: 'Karyawan bisa ajukan tukar shift mandiri lewat aplikasi dengan persetujuan atasan.' },
      { icon: <Calendar size={20} />, name: 'Dynamic Shift Scheduler', desc: 'Buat pola shift mingguan/bulanan, rotasi otomatis, & upload jadwal excel masal.' },
      { icon: <Clock size={20} />, name: 'Timesheet & Cuti Cepat', desc: 'Pengajuan cuti, sakit, izin, reimburse langsung dari HP dengan persetujuan bertingkat.' },
    ]
  }
];

const STATS_DATA = [
  { icon: <Building2 size={28} />, value: 120, suffix: '+', label: 'Perusahaan Aktif', color: '#00C9FF' },
  { icon: <Users size={28} />, value: 25800, suffix: '+', label: 'Karyawan Terkelola', color: '#00FF87' },
  { icon: <Clock size={28} />, value: 15, suffix: ' Menit', label: 'Rata-rata Payroll', color: '#FFD700' },
  { icon: <DollarSign size={28} />, value: 8, suffix: 'M+', label: 'Gaji Diproses/Bulan', color: '#8E2DE2' },
];

const ROI_TIERS = [
  { range: [1, 20], hours: 16, money: 3200000 },
  { range: [21, 50], hours: 40, money: 8500000 },
  { range: [51, 100], hours: 82, money: 18200000 },
  { range: [101, 250], hours: 180, money: 42000000 },
  { range: [251, 1000], hours: 450, money: 98000000 },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [activeTab, setActiveTab] = useState('absensi');
  const [roiEmployees, setRoiEmployees] = useState(45);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.title = 'SI PRESENSI PRO MAX — Sistem Absensi, Payroll & Manajemen Operasional Gedung No. 1 Indonesia';
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fitur Auto-Play Tab: Berganti otomatis setiap 5 detik
  useEffect(() => {
    let timer;
    if (!isHovered) { // Pause otomatis jika kursor user sedang berada di atas elemen
      timer = setInterval(() => {
        setActiveTab((prev) => {
          const currentIndex = FEATURE_CATEGORIES.findIndex(cat => cat.id === prev);
          const nextIndex = (currentIndex + 1) % FEATURE_CATEGORIES.length;
          return FEATURE_CATEGORIES[nextIndex].id;
        });
      }, 5000); // 5000ms = 5 detik
    }
    return () => clearInterval(timer);
  }, [activeTab, isHovered]);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  const getRoiData = (employees) => {
    const tier = ROI_TIERS.find(t => employees >= t.range[0] && employees <= t.range[1]) || ROI_TIERS[4];
    const multiplier = employees / ((tier.range[0] + tier.range[1]) / 2 || employees);
    return {
      hoursSaved: Math.round(tier.hours * multiplier),
      moneySaved: Math.round(tier.money * multiplier),
    };
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const roi = getRoiData(roiEmployees);

  const fadeIn = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-50px' }, transition: { duration: 0.6 } };
  const fadeInLeft = { initial: { opacity: 0, x: -40 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true, margin: '-50px' }, transition: { duration: 0.6 } };
  const fadeInRight = { initial: { opacity: 0, x: 40 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true, margin: '-50px' }, transition: { duration: 0.6 } };

  const Counter = ({ value, suffix = '' }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    useEffect(() => {
      if (!isInView) return;
      const duration = 1500;
      const steps = 50;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) { setCount(value); clearInterval(timer); }
        else setCount(Math.floor(current));
      }, duration / steps);
      return () => clearInterval(timer);
    }, [isInView, value]);
    return <span ref={ref} className="text-4xl md:text-5xl font-bold font-mono text-white">{count.toLocaleString('id-ID')}{suffix}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-white font-sans overflow-x-hidden">
      
      {/* 24/7 WA Floating Button */}
      <a 
        href="https://wa.me/6281234567890?text=Halo%20saya%20tertarik%20dengan%20SI%20PRESENSI%20Pro%20Max%20serta%20modul-modulnya." 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[999] bg-[#25D366] hover:bg-[#20ba5a] text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group duration-300"
      >
        <span className="absolute right-full mr-3 bg-black/80 backdrop-blur-sm border border-white/10 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">{i18n("Tanya Via WhatsApp")}</span>
        <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-45 -z-10" />
        <MessageSquare size={24} className="fill-white text-[#25D366]" />
      </a>

      {/* STICKY NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-300 ${scrollY > 50 ? 'bg-[#0B0C10]/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollTo('hero')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-lg font-serif shadow-lg shadow-purple-500/20">{i18n("SP")}</div>
              <div>
                <span className="font-bold text-sm tracking-wide text-white block leading-none">{i18n("SI PRESENSI")}</span>
                <span className="text-[7px] text-[var(--success)] uppercase tracking-[0.2em] font-extrabold block mt-1">{i18n("PRO MAX v3.2")}</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {['Fitur', 'Solusi', 'Kalkulator', 'Harga', 'FAQ'].map(item => (
                <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="text-xs text-gray-400 hover:text-white tracking-wider uppercase font-bold transition-all hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{item}</button>
              ))}
              <span className="w-[1px] h-4 bg-white/10" />
              <button onClick={() => navigate('/login')} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all">{i18n("Masuk Portal")}</button>
              <button onClick={() => setShowModal(true)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105 active:scale-95">{i18n("Uji Coba Demo")}</button>
            </div>
            <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-[#0B0C10]/95 backdrop-blur-xl border-b border-white/10">
              <div className="px-4 py-6 space-y-3">
                {['Fitur', 'Solusi', 'Kalkulator', 'Harga', 'FAQ'].map(item => (
                  <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="block text-sm text-gray-400 hover:text-white w-full text-left py-2 font-semibold">{item}</button>
                ))}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button onClick={() => navigate('/login')} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/20 text-white text-xs font-bold uppercase">{i18n("Masuk")}</button>
                  <button onClick={() => setShowModal(true)} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold uppercase">{i18n("Demo Gratis")}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO SECTION - ATTENTION */}
      <section id="hero" className="min-h-screen flex items-center relative overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--aurora-1)] rounded-full blur-[200px] opacity-15" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--aurora-3)] rounded-full blur-[200px] opacity-15" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[250px] opacity-10" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Copywriting Column */}
            <motion.div 
              initial={{ opacity: 0, x: -40 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.8 }}
              className="lg:col-span-6 text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--success)]/10 to-[var(--aurora-3)]/10 border border-[var(--success)]/25 mb-6">
                <Sparkles size={14} className="text-[var(--success)] animate-pulse" />
                <span className="text-[9px] text-[var(--success)] font-extrabold uppercase tracking-widest">{i18n("🔥 SOLUSI KELAS ENTERPRISE ALL-IN-ONE")}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold leading-[1.1] mb-6 text-white tracking-tight">{i18n("1 Dashboard Super.")}<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--aurora-3)] via-[var(--success)] to-[var(--aurora-1)]">{i18n("Ratusan Urusan")}</span><br />{i18n("Operasional Beres. ")}</h1>
              <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-xl leading-relaxed">{i18n("Platform ERP HR & Building Management nomor 1 di Indonesia. Satukan divisi HRD, tim Security, tim Maintenance, Cleaning Service, hingga logistik armada dalam 1 login super. ")}<span className="text-white font-bold">{i18n("Instan, anti-fake GPS, dan otomatis PPh 21 TER.")}</span>
              </p>
              
              {/* CTAs */}
              <div className="flex flex-wrap gap-4 mb-10">
                <button onClick={() => setShowModal(true)} className="px-8 py-4.5 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-3 hover:shadow-[0_0_30px_rgba(142,45,226,0.4)] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20">{i18n("Konsultasi Demo Gratis ")}<ChevronRight size={16} />
                </button>
                <button onClick={() => scrollTo('fitur')} className="px-8 py-4.5 rounded-2xl border border-white/10 hover:border-white/30 text-white font-bold text-xs uppercase tracking-wider bg-white/[0.02] hover:bg-white/5 transition-all hover:scale-105 active:scale-95">{i18n("Eksplorasi Fitur Asli ")}</button>
              </div>

              {/* Trusts & Accreditations */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                <div>
                  <p className="text-lg font-bold font-mono text-[var(--success)]">{i18n("15+ Modul")}</p>
                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">{i18n("Terintegrasi Penuh")}</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-mono text-[var(--aurora-3)]">{i18n("99.9% Up")}</p>
                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">{i18n("SLA Real-time Cloud")}</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-mono text-[var(--warning)]">{i18n("24/7 WA")}</p>
                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">{i18n("Dukungan Premium")}</p>
                </div>
              </div>
            </motion.div>

            {/* Desktop Dashboard Showcase Column */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-6 relative"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-3xl blur-[40px] opacity-15 group-hover:opacity-25 transition-opacity" />
                <div className="glass-panel p-2.5 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden bg-black/40">
                  <div className="relative overflow-hidden rounded-2xl bg-[#090A0F]">
                    <img 
                      src={publicAsset('/hero_dashboard.png')} 
                      alt="SI PRESENSI Premium Dashboard Screenshot" 
                      className="w-full h-auto object-cover transform hover:scale-102 transition-transform duration-700" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full aspect-[16/10] bg-gradient-to-br from-gray-900 to-black hidden flex-col items-center justify-center border-t border-white/5">
                      <Sparkles size={32} className="text-gray-600 mb-3" />
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">{i18n("DASHBOARD PREVIEW")}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Live overlay badges */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-ping" />
                        <span className="text-[9px] text-white font-extrabold uppercase tracking-widest font-mono">{i18n("Live Demo Workspace")}</span>
                      </div>
                      <span className="text-[9px] bg-white/10 backdrop-blur-md text-gray-300 px-3 py-1.5 rounded-xl border border-white/5 font-bold uppercase tracking-wider">{i18n("SaaS Platform")}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Absolute Badge Widget - Face camera count */}
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="absolute -top-6 -right-6 glass-panel p-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 bg-[#0B0C10]/90 max-w-[200px]"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
                  <UserCheck size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none">{i18n("Anti-Fraud")}</p>
                  <p className="text-[8px] text-gray-500 mt-1 leading-tight">{i18n("Liveness & GPS Geofence aktif")}</p>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-12 border-t border-white/5 bg-[#0B0C10]/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS_DATA.map((s, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.02]"
              >
                <div className="flex justify-center mb-3" style={{ color: s.color }}>{s.icon}</div>
                <div className="flex items-center justify-center">
                  <Counter value={s.value} suffix={s.suffix} />
                </div>
                <p className="text-[10px] text-gray-500 mt-2.5 uppercase tracking-wider font-extrabold">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT SCREENSHOT SHOWCASE & INTEREST SECTION */}
      <section id="fitur" className="py-24 border-t border-white/5 bg-[#0B0C10]/80 relative">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          
          <motion.div 
            initial={fadeIn.initial} 
            whileInView={fadeIn.whileInView} 
            viewport={fadeIn.viewport} 
            transition={fadeIn.transition} 
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 mb-4">
              <Eye size={14} className="text-[var(--aurora-3)]" />
              <span className="text-[9px] text-[var(--aurora-3)] font-extrabold uppercase tracking-widest">{i18n("MODUL KELAS ENTERPRISE")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">{i18n("Eksplorasi Modul ")}<span className="text-[var(--aurora-3)]">{i18n("Lebih Dalam")}</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm">{i18n("Pelajari seluruh fitur canggih yang kami rancang khusus untuk kemudahan operasional perusahaan Anda tanpa ribet.")}</p>
          </motion.div>

          {/* Interactive Feature Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-12">
            {FEATURE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === cat.id 
                    ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white shadow-lg shadow-purple-500/25 scale-102' 
                    : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat.icon}
                <span>{cat.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Panel */}
          <AnimatePresence mode="wait">
            {FEATURE_CATEGORIES.map((cat) => cat.id === activeTab && (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="max-w-6xl mx-auto"
              >
                <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                  {/* Bagian Kiri: Teks & Fitur */}
                  <div className="lg:col-span-6 space-y-8">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: cat.color }}>{i18n("Modul Utama")}</span>
                      <h3 className="text-3xl sm:text-4xl font-serif font-bold text-white mt-3 mb-4">{cat.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{cat.tagline}</p>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      {cat.features.map((f, fi) => (
                        <div key={fi} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3" style={{ color: cat.color }}>
                            {f.icon}
                          </div>
                          <h4 className="text-xs font-bold text-white mb-1.5">{f.name}</h4>
                          <p className="text-[10px] text-gray-500 leading-relaxed">{f.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/10 hover:border-white/20 transition-all group">
                        <span>{i18n("Coba demo modul ")}{cat.title.split(' ')[0]}</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Bagian Kanan: Gambar/Screenshot */}
                  <div className="lg:col-span-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-tr rounded-3xl blur-[50px] opacity-20 pointer-events-none" style={{ backgroundImage: `linear-gradient(to top right, ${cat.color}40, transparent, ${cat.color}80)` }} />
                    <div className="glass-panel p-2.5 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden bg-black/40">
                      <div className="relative overflow-hidden rounded-2xl bg-[#090A0F]">
                        <img 
                          src={cat.image} 
                          alt={`${cat.title} Screenshot - SI PRESENSI Pro Max`} 
                          className="w-full h-auto object-cover transform hover:scale-102 transition-transform duration-700" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        {/* Fallback Jika Gambar Tidak Ditemukan */}
                        <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-900 to-black hidden flex-col items-center justify-center border-t border-white/5 text-center p-6">
                          <Sparkles size={32} className="text-gray-600 mb-3" />
                          <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{i18n("ILUSTRASI MODUL")}</span>
                          <span className="text-gray-500 text-[10px] mt-2 max-w-[250px]">{i18n("Gambar ")} <code className="text-gray-400">{cat.image.split('/').pop()}</code> {i18n(" sedang diproses.")}</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

        </div>
      </section>

      {/* SOLUSI PER DIVISI - INTERACTIVE DETAILS */}
      <section id="solusi" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45%] h-[45%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[300px] opacity-5" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <motion.div 
            initial={fadeIn.initial} 
            whileInView={fadeIn.whileInView} 
            viewport={fadeIn.viewport} 
            transition={fadeIn.transition} 
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30 mb-4">
              <Users size={14} className="text-[var(--success)]" />
              <span className="text-[9px] text-[var(--success)] font-extrabold uppercase tracking-widest">{i18n("SATU APLIKASI UNTUK SEMUA DEPARTEMEN")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">{i18n("Solusi Terpadu ")}<span className="text-[var(--success)]">{i18n("Lintas Divisi")}</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm">{i18n("Tak perlu lagi membayar lisensi 5 aplikasi berbeda untuk HRD, Keamanan, Teknisi, & Operasional. Kami menyatukan semuanya dalam satu atap data. ")}</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: <Briefcase size={26} />, 
                title: 'Tim HR & Finance', 
                items: [
                  'Absensi GPS & Face Liveness',
                  'Proses Gaji (Payroll) 1-Klik',
                  'Kalkulasi PPh 21 TER & BPJS',
                  'Penyusunan THR H-7 Lebaran',
                  'Slip Gaji PDF Terkirim ke HP',
                  'Pencairan Pinjaman & Reimburse'
                ], 
                color: '#00C9FF',
                desc: 'Hemat waktu administrasi bulanan hingga 85%.' 
              },
              { 
                icon: <ShieldCheck size={26} />, 
                title: 'Security (Satpam)', 
                items: [
                  'Patroli Rute GPS Terpantau',
                  'Scan QR Checkpoint Aman',
                  'Deteksi Instan Checkpoint Bolos',
                  'Tukar Jadwal Shift Mandiri',
                  'Laporan Insiden & Kerusakan',
                  'Buku Tamu Digital Terintegrasi'
                ], 
                color: '#FF6B6B',
                desc: 'Kontrol keamanan area kerja 24 jam penuh.' 
              },
              { 
                icon: <Headphones size={26} />, 
                title: 'Teknisi & Maintenance', 
                items: [
                  'Helpdesk Tiket Kerusakan Gedung',
                  'SLA Respon & Notifikasi Teknisi',
                  'Work Order Checklist Detail',
                  'Foto Bukti Before & After Kerja',
                  'Catatan Material & Suku Cadang',
                  'Tanda Tangan Digital Tenant/Staf'
                ], 
                color: '#FFD700',
                desc: 'Selesaikan keluhan 3x lipat lebih cepat.' 
              },
              { 
                icon: <Truck size={26} />, 
                title: 'Operasional & Armada', 
                items: [
                  'Fleet Log & Peringatan STNK/BBM',
                  'Manajemen Stok Suku Cadang/Gedung',
                  'Booking Mobil & Ruang Kerja',
                  'Verifikasi Pengunjung Tamu',
                  'Audit Trail Setiap Tindakan',
                  'Laporan Real-time Siap Ekspor'
                ], 
                color: '#00FF87',
                desc: 'Efisiensi total biaya operasional aset.' 
              },
            ].map((d, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 25 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-6 relative overflow-hidden group hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: d.color }} />
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4.5" style={{ background: `${d.color}15`, color: d.color }}>
                    {d.icon}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 leading-tight">{d.title}</h3>
                  <p className="text-[10px] text-gray-500 mb-4 font-semibold">{d.desc}</p>
                  
                  <ul className="space-y-2 mb-6">
                    {d.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[11px] text-gray-400">
                        <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" style={{ color: d.color }} />
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button onClick={() => setShowModal(true)} className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider transition-all">{i18n("Konsultasi Modul ")}</button>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* SAVINGS ROI CALCULATOR - DESIRE */}
      <section id="kalkulator" className="py-24 border-t border-white/5 bg-[#0B0C10]/60 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="glass-panel p-8 sm:p-10 border border-white/10 relative overflow-hidden bg-black/40">
            <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-[var(--aurora-3)] rounded-full blur-[180px] opacity-10" />
            
            <div className="text-center mb-8">
              <span className="text-[10px] text-[var(--success)] font-extrabold uppercase tracking-widest block mb-2">{i18n("KALKULATOR PRESTASI OPERASIONAL")}</span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-3">{i18n("Lihat Berapa Banyak Anda Hemat")}</h3>
              <p className="text-xs sm:text-sm text-gray-400">{i18n("Pindahkan slider sesuai jumlah karyawan perusahaan Anda dan hitung waktu & pengeluaran yang berhasil dipangkas per bulan. ")}</p>
            </div>

            <div className="space-y-8">
              {/* Slider widget */}
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-400">{i18n("Jumlah Karyawan Operasional:")}</span>
                  <span className="text-xl font-bold font-mono text-[var(--aurora-3)]">{roiEmployees}{i18n(" Orang")}</span>
                </div>
                
                <input 
                  type="range" 
                  min="5" 
                  max="500" 
                  value={roiEmployees}
                  onChange={(e) => setRoiEmployees(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--aurora-3)]" 
                />
                
                <div className="flex justify-between text-[9px] text-gray-600 mt-2 font-bold uppercase tracking-wider">
                  <span>{i18n("5 Orang")}</span>
                  <span>{i18n("100 Orang")}</span>
                  <span>{i18n("250 Orang")}</span>
                  <span>{i18n("500 Orang")}</span>
                </div>
              </div>

              {/* ROI Results */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1.5">{i18n("Waktu Kerja HR & Admin Hemat:")}</span>
                  <p className="text-3xl sm:text-4xl font-bold font-mono text-[var(--success)]">{roi.hoursSaved}{i18n(" Jam / Bulan")}</p>
                  <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">{i18n("Dapat dialokasikan untuk training & rekrutmen strategis.")}</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1.5">{i18n("Total Penghematan Biaya Operasional:")}</span>
                  <p className="text-3xl sm:text-4xl font-bold font-mono text-[var(--warning)]">{formatRupiah(roi.moneySaved)}{i18n(" / Bulan")}</p>
                  <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">{i18n("Berdasarkan audit biaya paperwork, fake-GPS, dan inefisiensi lembur.")}</p>
                </div>
              </div>

              <div className="text-center pt-2">
                <button onClick={() => setShowModal(true)} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold uppercase tracking-wider hover:scale-103 active:scale-97 transition-all">{i18n("Ambil Penghematan Ini Sekarang ")}</button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* PARTNER WHITE-LABEL & RESELLER - EXTREME PROFIT OPPORTUNITY */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden bg-[#07080C]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[40%] h-[60%] bg-[var(--aurora-1)] rounded-full blur-[250px] opacity-5" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <motion.div 
            initial={fadeIn.initial} 
            whileInView={fadeIn.whileInView} 
            viewport={fadeIn.viewport} 
            transition={fadeIn.transition} 
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] border border-[var(--aurora-1)]/30 mb-4">
              <Layers size={14} className="text-[var(--aurora-3)]" />
              <span className="text-[9px] text-[var(--aurora-3)] font-extrabold uppercase tracking-widest">{i18n("PELUANG BISNIS DASYAT")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">{i18n("Miliki Aplikasi Ini dengan ")}<span className="text-[var(--aurora-3)]">{i18n("Brand Anda Sendiri")}</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm">{i18n("Untuk Software House, Konsultan HR, Agensi IT, atau Penyedia Jasa Security. Jual solusi canggih ini ke client Anda dengan nama, logo, domain, & harga Anda sendiri! ")}</p>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-8 items-stretch mb-12">
            
            {/* Why join column */}
            <motion.div 
              initial={fadeInLeft.initial} 
              whileInView={fadeInLeft.whileInView} 
              viewport={fadeInLeft.viewport} 
              transition={fadeInLeft.transition} 
              className="lg:col-span-6 glass-panel p-8 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-serif font-bold text-white mb-2">{i18n("🚀 Mengapa Menjadi Partner SaaS Kami?")}</h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">{i18n("Kami mengurus semua infrastruktur teknis, database backup, pembaharuan regulasi PPh 21, hingga maintenance server. Anda fokus melakukan branding & marketing dengan profit 100% milik Anda. ")}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: <Zap size={16} />, label: '100% Brand Anda', desc: 'Custom domain, logo, nama aplikasi, & favicon.' },
                    { icon: <DollarSign size={16} />, label: 'Margin Profit Bebas', desc: 'Tentukan harga jual sendiri ke client tanpa campur tangan kami.' },
                    { icon: <Globe size={16} />, label: 'Database Terisolasi', desc: 'Teknologi RLS multi-tenant menjamin data client Anda aman & terpisah.' },
                    { icon: <Headphones size={16} />, label: 'Layanan White-label Support', desc: 'Kami mendukung Anda di balik layar dengan SLA tangguh.' },
                  ].map((b, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center gap-2 mb-1.5 text-[var(--aurora-3)]">
                        {b.icon} 
                        <span className="text-[11px] font-bold text-white">{b.label}</span>
                      </div>
                      <p className="text-[9px] text-gray-500 leading-relaxed">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button onClick={() => setShowBookModal(true)} className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all">{i18n("Pelajari Skema Kemitraan ")}<ChevronRight size={14} />
                </button>
              </div>
            </motion.div>

            {/* Partnerships schemes column */}
            <motion.div 
              initial={fadeInRight.initial} 
              whileInView={fadeInRight.whileInView} 
              viewport={fadeInRight.viewport} 
              transition={fadeInRight.transition} 
              className="lg:col-span-6 glass-panel p-8 border-[var(--aurora-3)]/30 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-serif font-bold text-white mb-2">{i18n("💼 Pilihan Kerja Sama & Bagi Hasil")}</h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">{i18n("Pilih skema yang paling sesuai dengan target pasar & modal usaha yang Anda inginkan. ")}</p>

                <div className="space-y-4">
                  <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{i18n("1. Skema Reseller Komisi")}</span>
                      <span className="text-xs font-extrabold font-mono text-[var(--success)]">{i18n("30% - 50% Share")}</span>
                    </div>
                    <p className="text-[9px] text-gray-500 leading-relaxed">{i18n("Tanpa biaya setup. Cukup referensikan client ke kami, dapatkan bagi hasil bulanan dari total billing client Anda selama mereka aktif berlangganan. ")}</p>
                  </div>
                  
                  <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{i18n("2. Skema White-Label SaaS")}</span>
                      <span className="text-xs font-extrabold font-mono text-[var(--aurora-3)]">{i18n("Sekali Bayar Setup")}</span>
                    </div>
                    <p className="text-[9px] text-gray-500 leading-relaxed">{i18n("Deploy platform ini di VPS/Cloud khusus. Domain, email server, & logo diganti total milik Anda. Client membayar langsung ke rekening perusahaan Anda. ")}</p>
                  </div>

                  <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/5 border-l-2" style={{ borderLeftColor: 'var(--warning)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{i18n("3. Integrasi Enterprise On-Premise")}</span>
                      <span className="text-xs font-extrabold font-mono text-[var(--warning)]">{i18n("VPS Khusus")}</span>
                    </div>
                    <p className="text-[9px] text-gray-500 leading-relaxed">{i18n("Untuk perusahaan holding skala raksasa yang ingin meletakkan server absensi di data center lokal milik internal untuk kebutuhan kepatuhan PDP. ")}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 text-center lg:text-left">
                <span className="text-[10px] text-gray-500 font-semibold">{i18n("Hubungi tim kemitraan kami: ")}</span>
                <a href="https://wa.me/6281234567890?text=Halo%20saya%20tertarik%20mengenai%20kemitraan%20white-label%20SaaS" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--aurora-3)] font-bold hover:underline">{i18n("0812-3456-7890 (WA)")}</a>
              </div>
            </motion.div>

          </div>

        </div>
      </section>

      {/* PRICING SECTION - ACTION */}
      <section id="harga" className="py-24 relative overflow-hidden bg-[#0B0C10]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[40%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[250px] opacity-5" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <motion.div 
            initial={fadeIn.initial} 
            whileInView={fadeIn.whileInView} 
            viewport={fadeIn.viewport} 
            transition={fadeIn.transition} 
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--warning)]/10 border border-[var(--warning)]/30 mb-4">
              <Calculator size={14} className="text-[var(--warning)]" />
              <span className="text-[9px] text-[var(--warning)] font-extrabold uppercase tracking-widest">{i18n("HARGA JUJUR TANPA TERSEMBUNYI")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">{i18n("Investasi Mulai Dari ")}<span className="text-[var(--aurora-3)]">{i18n("Rp 7.000")}</span>{i18n(" / Karyawan ")}</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">{i18n("Satu harga mencakup seluruh 15+ modul. Tidak ada batasan akses menu. Tidak ada biaya tambahan di tengah jalan. ")}</p>
          </motion.div>

          {/* Monthly / Annual Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-xs font-bold transition-colors ${!annualBilling ? 'text-white' : 'text-gray-500'}`}>{i18n("Ditagih Bulanan")}</span>
            <button 
              onClick={() => setAnnualBilling(!annualBilling)} 
              className={`relative w-14 h-8 rounded-full transition-all duration-300 ${annualBilling ? 'bg-[var(--aurora-3)]' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${annualBilling ? 'left-8' : 'left-1'}`} />
            </button>
            <span className={`text-xs font-bold transition-colors ${annualBilling ? 'text-[var(--aurora-3)]' : 'text-gray-500'}`}>{i18n("Ditagih Tahunan ")}<span className="text-[var(--success)] text-[10px] font-extrabold bg-[var(--success)]/10 border border-[var(--success)]/30 px-2 py-0.5 rounded-full ml-1">{i18n("Hemat 20%")}</span>
            </span>
          </div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch w-full pt-6 lg:pt-8 pb-4 lg:pb-8">
            {[
              { 
                name: 'Bronze', 
                priceMonthly: 'Gratis', 
                priceAnnual: 'Gratis',
                period: '', 
                users: 'Evaluasi awal — s/d 10 Karyawan', 
                features: [
                  'Seluruh 15+ Modul Siap Pakai',
                  'Absensi Kamera Selfie & GPS',
                  '1 Proyek / Geofence Kantor',
                  'Slip Gaji HP Standard',
                  'Dukungan via Tiket / Email'
                ], 
                popular: false, 
                cta: 'Daftar Uji Coba',
                color: '#94A3B8'
              },
              { 
                name: 'Silver', 
                priceMonthly: 'Rp 15.000', 
                priceAnnual: 'Rp 12.000',
                period: '/karyawan/bln', 
                users: 'Usaha berkembang — 11-50 Karyawan', 
                features: [
                  'Seluruh Fitur Bronze',
                  'Integrasi PPh 21 TER 2024+',
                  'Ekspor format 20+ Bank Lokal',
                  'Klaim Pinjaman & Reimbursement',
                  'Multi-Proyek GPS Geofence',
                  'Dukungan WA Group Khusus'
                ], 
                popular: true, 
                cta: 'Mulai Silver',
                color: 'var(--aurora-3)'
              },
              { 
                name: 'Gold', 
                priceMonthly: 'Rp 10.000', 
                priceAnnual: 'Rp 8.000',
                period: '/karyawan/bln', 
                users: 'Skala menengah — 51-200 Karyawan', 
                features: [
                  'Seluruh Fitur Silver',
                  'Kalkulasi THR Otomatis',
                  'Modul Penilaian Kinerja (KPI)',
                  'Dashboard Keuangan & Audit',
                  'Helpdesk, Patroli, & Armada',
                  'Dedicated Support Manager'
                ], 
                popular: false, 
                cta: 'Mulai Gold',
                color: '#FFD700'
              },
              { 
                name: 'Platinum', 
                priceMonthly: 'Rp 7.000', 
                priceAnnual: 'Rp 5.600',
                period: '/karyawan/bln', 
                users: 'Skala besar — 200+ Karyawan', 
                features: [
                  'Seluruh Fitur Gold',
                  'Opsi Server On-Premise / VPS',
                  'Akses API / Kustom Integrasi',
                  'White-Label dengan Domain Sendiri',
                  'Dukungan SLA Kesiapan 99.9%',
                  'Sesi Training Tatap Muka Staf'
                ], 
                popular: false, 
                cta: 'Hubungi Sales',
                color: '#00FF87'
              },
            ].map((p, i) => {
              const displayPrice = annualBilling ? p.priceAnnual : p.priceMonthly;
              const periodLabel = p.priceMonthly === 'Gratis' ? '' : (annualBilling ? '/karyawan/bln (tahunan)' : p.period);
              
              return (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ delay: i * 0.1 }}
                  className={`glass-panel p-6 lg:p-7 relative flex flex-col justify-between bg-black/40 ${
                    p.popular ? 'border-[var(--aurora-3)]/50 shadow-[0_0_40px_rgba(0,201,255,0.15)] ring-1 ring-[var(--aurora-3)]/30 lg:scale-105 z-10' : 'border-white/5'
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest whitespace-nowrap shadow-lg shadow-purple-500/25 z-20">{i18n("⭐ PALING BANYAK DIPILIH ")}</div>
                  )}

                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-500">{i18n("Plan Pilihan")}</span>
                    <h3 className="text-xl font-bold text-white mt-1 mb-0.5">{p.name}</h3>
                    <p className="text-[9px] text-gray-500 mb-5 leading-tight">{p.users}</p>
                    
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-2xl xl:text-3xl font-bold text-white font-mono">{displayPrice}</span>
                        <span className="text-[10px] text-gray-500 font-bold">{periodLabel}</span>
                      </div>
                      
                      {annualBilling && p.priceAnnual !== 'Gratis' && (
                        <p className="text-[9px] text-[var(--success)] font-bold mt-1">{i18n("Hemat 20% dibandingkan bulanan ")}</p>
                      )}
                    </div>

                    <span className="block w-full h-[1px] bg-white/5 mb-6" />

                    <ul className="space-y-3 mb-8">
                      {p.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-xs text-gray-400">
                          <CheckCircle2 size={13} className="text-[var(--success)] mt-0.5 flex-shrink-0" />
                          <span className="leading-tight">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button 
                    onClick={() => {
                      if (p.name === 'Bronze') {
                        navigate('/login');
                      } else {
                        setShowModal(true);
                      }
                    }} 
                    className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${
                      p.popular 
                        ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white hover:shadow-xl' 
                        : 'border border-white/10 hover:border-white/30 text-white bg-white/[0.01] hover:bg-white/5'
                    }`}
                  >
                    {p.cta}
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12 text-[10px] text-gray-600 font-bold uppercase tracking-wider">
            <span>{i18n("✅ Uji coba gratis 30 hari")}</span>
            <span>{i18n("✅ Tanpa ikatan kontrak")}</span>
            <span>{i18n("✅ Dukungan teknis WhatsApp")}</span>
            <span>{i18n("✅ Jaminan PDP Data Lokal")}</span>
          </div>

        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 border-t border-white/5 bg-[#07080C]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <motion.div 
            initial={fadeIn.initial} 
            whileInView={fadeIn.whileInView} 
            viewport={fadeIn.viewport} 
            transition={fadeIn.transition} 
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 mb-4">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[9px] text-yellow-400 font-extrabold uppercase tracking-widest">{i18n("RATING TERTINGGI 4.9 DARI HRD")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">{i18n("Apa Kata ")}<span className="text-yellow-400">{i18n("HRD & Operasional")}</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">{i18n("Pengalaman nyata dari manajer operasional dan profesional HRD di berbagai daerah Indonesia. ")}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                name: 'Rina Wijaya', 
                role: 'HR Manager — PT. Provices Project', 
                text: 'Dulu kami butuh waktu 5 hari penuh untuk rekap absensi & hitung lembur. Sekarang dengan payroll 1-klik, 15 menit beres! Fitur helpdesk & patroli sangat membantu koordinasi di lapangan.' 
              },
              { 
                name: 'Andi Pratama', 
                role: 'Finance Director — CV. Maju Jaya', 
                text: 'Laporan PPh 21 TER 2024 terbaru & laporan BPJS sudah otomatis jadi. Export bank ke BCA & Mandiri berjalan lancar. Fleet management logistiknya juga menghemat konsumsi BBM armada kami.' 
              },
              { 
                name: 'Siti Nurhaliza', 
                role: 'Supervisor Operasional — PT. Bina Karya', 
                text: 'Fitur missed guard alert pada modul patroli security benar-benar memastikan satpam kami disiplin meronda. Tukar shift karyawan juga tak perlu manual via WhatsApp lagi.' 
              },
            ].map((t, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-6 bg-black/30 hover:border-white/10 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={13} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 italic leading-relaxed mb-6">{`"${t.text}"`}</p>
                </div>
                
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-xs font-bold text-white shadow-md">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[9px] text-gray-500 font-semibold">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 border-t border-white/5 bg-[#0B0C10]/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <motion.div 
            initial={fadeIn.initial} 
            whileInView={fadeIn.whileInView} 
            viewport={fadeIn.viewport} 
            transition={fadeIn.transition} 
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">{i18n("Pertanyaan yang Sering Diajukan ")}</h2>
            <p className="text-gray-400 text-sm">{i18n("Semua yang perlu Anda ketahui sebelum melangkah bersama kami. ")}</p>
          </motion.div>

          <div className="space-y-4">
            {[
              { 
                q: 'Apakah semua modul benar-benar termasuk dalam satu harga?', 
                a: 'Ya, betul sekali. Bronze, Silver, Gold, dan Platinum mencakup seluruh 15+ modul operasional. Yang membedakan antar paket hanyalah batas jumlah karyawan aktif, dukungan WA grup, kustom server, integrasi API, & white-label brand sendiri.' 
              },
              { 
                q: 'Bagaimana cara mendeteksi karyawan yang curang dengan GPS palsu?', 
                a: 'Aplikasi seluler kami dilengkapi dengan deteksi Liveness Face Recognition multi-layer untuk mencegah manipulasi foto, dikombinasikan dengan sistem anti Fake-GPS bawaan yang akan menolak absensi jika mendeteksi penggunaan mock-location.' 
              },
              { 
                q: 'Apakah PPh 21 TER 2024 sudah didukung secara akurat?', 
                a: 'Sangat akurat. Sistem payroll kami secara konstan diperbarui sesuai dengan regulasi TER (Tarif Efektif Rata-Rata) PPh 21 terbaru dari Direktorat Jenderal Pajak RI, meminimalkan resiko salah kalkulasi pajak.' 
              },
              { 
                q: 'Apakah saya bisa menjual kembali aplikasi ini dengan nama saya?', 
                a: 'Bisa. Platinum plan kami menyediakan infrastruktur white-label lengkap. Kami akan membantu mendeploy aplikasi absensi & operasional ini dengan logo, favicon, warna identitas, & domain kustom Anda sendiri.' 
              },
              { 
                q: 'Seberapa aman data perusahaan kami?', 
                a: 'Data Anda dijamin 100% aman. Sistem database menggunakan keamanan setingkat bank (bank-grade security) dengan Row-Level Security (RLS) di Supabase terisolasi per tenant. Semua data dienkripsi selama pengiriman & penyimpanan.' 
              },
            ].map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>

        </div>
      </section>

      {/* FINAL CALL-TO-ACTION */}
      <section className="py-24 relative overflow-hidden bg-[#07080C] border-t border-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] h-[55%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[300px] opacity-10" />
        </div>
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div 
            initial={fadeIn.initial} 
            whileInView={fadeIn.whileInView} 
            viewport={fadeIn.viewport} 
            transition={fadeIn.transition}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-6">{i18n("Siap Menghemat Waktu & Operasional Perusahaan Anda? ")}</h2>
            <p className="text-gray-400 mb-10 max-w-lg mx-auto text-sm leading-relaxed">{i18n("Mulai uji coba gratis 30 hari sekarang. Setup hanya butuh 15 menit. Rasakan kedisiplinan & efisiensi maksimal mulai besok pagi. ")}</p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => setShowModal(true)} 
                className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-3 hover:shadow-2xl hover:shadow-purple-500/40 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
              >{i18n("Jadwalkan Demo Gratis ")}<ChevronRight size={18} />
              </button>
              <a 
                href="https://wa.me/6281234567890?text=Halo%20saya%20ingin%20tanya%20mengenai%20SI%20PRESENSI%20Pro%20Max" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-10 py-5 rounded-2xl border border-[var(--success)]/30 text-[var(--success)] font-extrabold text-xs uppercase tracking-wider flex items-center gap-3 bg-[var(--success)]/5 hover:bg-[var(--success)]/10 hover:border-[var(--success)]/50 transition-all hover:scale-105 active:scale-95"
              >
                <MessageSquare size={16} />{i18n(" Konsultasi via WhatsApp ")}</a>
            </div>
            
            <div className="flex justify-center gap-6 mt-10 text-[9px] text-gray-600 font-bold uppercase tracking-wider">
              <span>{i18n("🚀 30 hari gratis")}</span>
              <span>{i18n("🔒 100% aman")}</span>
              <span>{i18n("📈 ROI Terbukti")}</span>
              <span>{i18n("👥 Setup dibantu tim ahli")}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-16 bg-[#07080C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-xs font-serif shadow-md">{i18n("SP")}</div>
                <span className="text-xs font-bold text-white tracking-wide">{i18n("SI PRESENSI")}</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed max-w-xs">{i18n("Satu-satunya sistem ERP operasional terlengkap untuk perusahaan, pengelola properti, & penyedia jasa keamanan di Indonesia. ")}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-extrabold text-white uppercase tracking-widest mb-4.5">{i18n("Menu Modul")}</h4>
              <div className="space-y-2.5 text-[10px] text-gray-500 font-semibold">
                <p className="hover:text-white transition-colors cursor-pointer" onClick={() => scrollTo('fitur')}>{i18n("Absensi & Geofence")}</p>
                <p className="hover:text-white transition-colors cursor-pointer" onClick={() => scrollTo('fitur')}>{i18n("Payroll & TER 2024")}</p>
                <p className="hover:text-white transition-colors cursor-pointer" onClick={() => scrollTo('fitur')}>{i18n("Helpdesk & Teknisi")}</p>
                <p className="hover:text-white transition-colors cursor-pointer" onClick={() => scrollTo('fitur')}>{i18n("Security Patrol & K3")}</p>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-extrabold text-white uppercase tracking-widest mb-4.5">{i18n("Program Kemitraan")}</h4>
              <div className="space-y-2.5 text-[10px] text-gray-500 font-semibold">
                <p className="hover:text-white transition-colors cursor-pointer" onClick={() => setShowBookModal(true)}>{i18n("White-Label SaaS")}</p>
                <p className="hover:text-white transition-colors cursor-pointer" onClick={() => setShowBookModal(true)}>{i18n("Reseller Afiliasi")}</p>
                <p className="hover:text-white transition-colors cursor-pointer" onClick={() => setShowBookModal(true)}>{i18n("On-Premise Holding")}</p>
                <p className="hover:text-white transition-colors cursor-pointer" onClick={() => setShowBookModal(true)}>{i18n("Integrasi Kustom API")}</p>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-extrabold text-white uppercase tracking-widest mb-4.5">{i18n("Hubungi Kami")}</h4>
              <div className="space-y-2.5 text-[10px] text-gray-500 font-semibold">
                <div className="flex items-center gap-2"><Mail size={12} />{i18n(" hello@sipresensi.com")}</div>
                <div className="flex items-center gap-2"><Phone size={12} />{i18n(" 0812-3456-7890")}</div>
                <div className="flex items-center gap-2"><MessageSquare size={12} />{i18n(" WA: 0812-3456-7890")}</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col items-center gap-3 w-full md:w-auto md:items-start">
              <span className="text-[9px] text-gray-600 font-semibold">{i18n("SI PRESENSI PRO MAX. © 2026 Seluruh Hak Cipta Dilindungi.")}</span>
              <DeveloperWatermark />
            </div>
            <div className="flex items-center gap-6 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
              <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">{i18n("Portal Login")}</button>
              <button onClick={() => setShowModal(true)} className="hover:text-white transition-colors">{i18n("Pesan Demo")}</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Request Modal */}
      <AnimatePresence>
        {showModal && <DemoRequestModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
      
      {/* Partner Booking Modal */}
      <AnimatePresence>
        {showBookModal && <PartnerBookingModal onClose={() => setShowBookModal(false)} />}
      </AnimatePresence>

    </div>
  );
};

const FaqItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-panel overflow-hidden border border-white/5 bg-black/20 hover:border-white/10 transition-all">
      <button 
        onClick={() => setOpen(!open)} 
        className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.01] transition-colors"
      >
        <span className="text-xs sm:text-sm font-bold text-white leading-tight">{question}</span>
        <ChevronDown size={15} className={`text-gray-500 transition-all duration-300 flex-shrink-0 ${open ? 'rotate-180 text-white' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-[11px] sm:text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-3">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DemoRequestModal = ({ onClose }) => {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', employees: '11-50', interest: 'all', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;
    setSending(true);
    try {
      await supabase.from('audit_logs').insert({ action: 'DEMO_REQUEST', details: { ...form } });
      await new Promise(r => setTimeout(r, 800));
      setSent(true);
      setTimeout(() => onClose(), 2000);
    } catch { 
      setSent(true); 
      setTimeout(() => onClose(), 2000); 
    } finally { 
      setSending(false); 
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      onClick={onClose} 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 15 }} 
        onClick={e => e.stopPropagation()} 
        className="w-full max-w-md glass-panel p-6 sm:p-8 relative max-h-[calc(100dvh-2rem)] overflow-y-auto bg-black/70 border border-white/10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X size={18} />
        </button>
        
        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={32} className="text-[var(--success)]" />
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2">{i18n("Permintaan Dikirim! 🎉")}</h3>
            <p className="text-xs text-gray-400">{i18n("Tim spesialis kami akan menghubungi Anda via WhatsApp dalam 1x24 jam.")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-sm">{i18n("SP")}</div>
              <div>
                <h3 className="text-sm sm:text-base font-serif font-bold text-white leading-tight">{i18n("Uji Coba Demo Gratis")}</h3>
                <p className="text-[9px] text-gray-500">{i18n("Jelajahi seluruh menu modul operasional kami")}</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Nama Lengkap")}</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Nama Perusahaan")}</label>
                  <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="PT. Sukses Mulia" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Email Kantor")}</label>
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="nama@company.com" />
                </div>
                <div>
                  <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Nomor WhatsApp")}</label>
                  <input type="tel" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="0812xxxx" />
                </div>
              </div>
              
              <div>
                <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Rentang Jumlah Karyawan")}</label>
                <select value={form.employees} onChange={e => setForm({ ...form, employees: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none">
                  <option>{i18n("1 - 10 Orang")}</option>
                  <option>{i18n("11 - 50 Orang")}</option>
                  <option>{i18n("51 - 100 Orang")}</option>
                  <option>{i18n("101 - 500 Orang")}</option>
                  <option>{i18n("500+ Orang")}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Modul Utama Paling Diminati")}</label>
                <select value={form.interest} onChange={e => setForm({ ...form, interest: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none">
                  <option value="all">{i18n("Seluruh Modul (All-in-One)")}</option>
                  <option value="payroll">{i18n("Modul Gaji & Pajak PPh 21")}</option>
                  <option value="helpdesk">{i18n("Modul Helpdesk & Booking Gedung")}</option>
                  <option value="security">{i18n("Modul Security Patroli Satpam")}</option>
                  <option value="witelabel">{i18n("Program White-Label SaaS")}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Pesan Tambahan (Opsional)")}</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={2.5} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="Beritahu kami tantangan operasional terbesar Anda..." />
              </div>
              
              <button type="submit" disabled={sending} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-xl disabled:opacity-50">
                {sending ? (
                  <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />{i18n(" Mengirimkan...")}</span>
                ) : (
                  <span className="flex items-center gap-2"><Send size={14} />{i18n(" Dapatkan Demo Gratis")}</span>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

const PartnerBookingModal = ({ onClose }) => {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', type: 'witelabel', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;
    setSending(true);
    try {
      await supabase.from('audit_logs').insert({ action: 'PARTNER_REQUEST', details: { ...form } });
      await new Promise(r => setTimeout(r, 800));
      setSent(true);
      setTimeout(() => onClose(), 2000);
    } catch { 
      setSent(true); 
      setTimeout(() => onClose(), 2000); 
    } finally { 
      setSending(false); 
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      onClick={onClose} 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 15 }} 
        onClick={e => e.stopPropagation()} 
        className="w-full max-w-md glass-panel p-6 sm:p-8 relative max-h-[calc(100dvh-2rem)] overflow-y-auto bg-black/70 border border-white/10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X size={18} />
        </button>
        
        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={32} className="text-[var(--success)]" />
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2">{i18n("Terima Kasih! 🎉")}</h3>
            <p className="text-xs text-gray-400">{i18n("Tim Kemitraan kami akan segera menghubungi Anda dengan penawaran & brosur khusus.")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-sm">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-serif font-bold text-white leading-tight">{i18n("Pengajuan Mitra Partner")}</h3>
                <p className="text-[9px] text-gray-500">{i18n("Miliki solusi SaaS ERP dengan Brand & Domain Sendiri")}</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Nama Lengkap")}</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Nama Perusahaan / Organisasi")}</label>
                  <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="PT. Sukses Mitra" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Email Kontak")}</label>
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="partner@company.com" />
                </div>
                <div>
                  <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Nomor WhatsApp HP")}</label>
                  <input type="tel" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="0812xxxx" />
                </div>
              </div>
              
              <div>
                <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Model Kemitraan yang Diminati")}</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none">
                  <option value="witelabel">{i18n("Program White-Label (100% Brand Anda)")}</option>
                  <option value="reseller">{i18n("Program Reseller / Afiliasi Komisi")}</option>
                  <option value="integrasi">{i18n("Kustom Integrasi Enterprise Server")}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-extrabold mb-1">{i18n("Deskripsikan Rencana Anda")}</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" placeholder="Jelaskan target pasar atau jumlah client potensial yang Anda miliki..." />
              </div>
              
              <button type="submit" disabled={sending} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-xl disabled:opacity-50">
                {sending ? (
                  <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />{i18n(" Mengirimkan...")}</span>
                ) : (
                  <span className="flex items-center gap-2"><Send size={14} />{i18n(" Daftarkan Kemitraan")}</span>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;
