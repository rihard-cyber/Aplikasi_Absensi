/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight, CheckCircle2, Star, Users, Clock, DollarSign, ShieldCheck, Camera, MapPin, QrCode, Smartphone, FileText, Calculator, CreditCard, Gift, TrendingUp, BarChart3, Building2, Award, Download, MessageSquare, ChevronDown, Sparkles, Send, Loader2, Phone, Mail, CheckSquare, Activity, Zap, Globe, UserCheck, Briefcase, Calendar, PieChart, RefreshCw, Headphones, Route, Truck, Package, AlertTriangle, Shuffle, Home, Layers, Fingerprint, Wifi, Eye } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const FEATURE_CATEGORIES = [
  {
    title: 'Absensi & Kehadiran',
    icon: <Camera size={22} />,
    color: '#00C9FF',
    features: [
      { icon: <Camera size={20} />, name: 'Face Camera Check-in', desc: 'Selfie real-time + liveness detection. Anti-fake dengan validasi multi-layer.' },
      { icon: <MapPin size={20} />, name: 'GPS Geofencing Cerdas', desc: 'Radius absensi per proyek. Hanya bisa absen di lokasi kerja. Anti fake-GPS.' },
      { icon: <Wifi size={20} />, name: 'WiFi Zone Check', desc: 'Verifikasi jaringan WiFi kantor. Lapisan keamanan ekstra untuk WFO.' },
      { icon: <QrCode size={20} />, name: 'QR Code Scan', desc: 'Scan QR di pintu masuk. Alternatif cepat tanpa GPS.' },
      { icon: <Fingerprint size={20} />, name: 'Device Binding', desc: 'Akun terkunci ke 1 HP. Mencegah absen dari jarak jauh.' },
      { icon: <Smartphone size={20} />, name: 'Offline Mode', desc: 'Absen tanpa internet. Auto-sync saat online kembali.' },
    ]
  },
  {
    title: 'Payroll & Finance',
    icon: <Calculator size={22} />,
    color: '#00FF87',
    features: [
      { icon: <Calculator size={20} />, name: 'Payroll 1-Klik', desc: 'Hitungan lembur, BPJS Kesehatan, BPJS TK, PPh 21 TER, pinjaman — 15 menit selesai.' },
      { icon: <DollarSign size={20} />, name: 'Lembur Multi-Tarif', desc: 'Rate berbeda untuk weekday, weekend, & hari libur. Hitung otomatis dari jam absen.' },
      { icon: <FileText size={20} />, name: 'Slip Gaji Digital', desc: 'Karyawan lihat & download slip gaji sendiri via HP. PDF + Excel.' },
      { icon: <Gift size={20} />, name: 'THR Otomatis', desc: 'Hitungan THR sesuai UU Ketenagakerjaan. Siap H-7 lebaran.' },
      { icon: <CreditCard size={20} />, name: 'Export Bank 20+ Bank', desc: 'Format BCA, Mandiri, BNI, BRI, BSI, Danamon. Upload langsung ke internet banking.' },
      { icon: <TrendingUp size={20} />, name: 'Laporan PPh 21 & BPJS', desc: 'TER 2024+ otomatis. Patuh regulasi pajak terbaru. Siap audit.' },
    ]
  },
  {
    title: 'Operasional & Helpdesk',
    icon: <Headphones size={22} />,
    color: '#FFD700',
    features: [
      { icon: <MessageSquare size={20} />, name: 'Helpdesk Ticketing', desc: 'Multi-unit (listrik, AC, plumbing, IT, kebersihan). Foto, prioritas, notifikasi real-time.' },
      { icon: <Route size={20} />, name: 'Patroli Management', desc: 'Checkpoint QR, GPS route tracking, auto-detect missed guard, laporan patroli.' },
      { icon: <Building2 size={20} />, name: 'Facility Booking', desc: 'Booking ruangan, kendaraan, peralatan. Kalender availability. Request + approval.' },
      { icon: <Users size={20} />, name: 'Visitor Management', desc: 'Pre-register tamu, QR pass, host notification, check-in/out, blacklist.' },
      { icon: <Briefcase size={20} />, name: 'Work Order Maintenance', desc: 'Teknisi assignment, checklist, tracking material, foto before/after, TTD digital.' },
    ]
  },
  {
    title: 'Logistik & K3',
    icon: <Truck size={22} />,
    color: '#8E2DE2',
    features: [
      { icon: <Truck size={20} />, name: 'Fleet Management', desc: 'Tracking kendaraan, trip logs, STNK/insurance expiry alert, konsumsi BBM.' },
      { icon: <Package size={20} />, name: 'Inventory Stock', desc: 'Tracking stok barang, low stock alert, mutasi masuk/keluar dengan referensi.' },
      { icon: <AlertTriangle size={20} />, name: 'Incident Reporting K3', desc: '6 jenis insiden, severity level, corrective action, foto. Patuh SMK3.' },
    ]
  },
  {
    title: 'Flexible Work',
    icon: <Shuffle size={22} />,
    color: '#FF6B6B',
    features: [
      { icon: <Home size={20} />, name: 'Hybrid Work WFH/WFA/WFO', desc: 'Multi-mode clock-in. WFA tanpa GPS, WFH pake alamat rumah, WFO dengan WiFi + face.' },
      { icon: <RefreshCw size={20} />, name: 'Shift Swap', desc: 'Tukar shift dengan rekan kerja. Preview jadwal 14 hari. Approval admin.' },
      { icon: <Clock size={20} />, name: 'Timesheet Digital', desc: 'Export CSV / PDF. Synopsis absensi per periode. Verifikasi sebelum payroll.' },
    ]
  }
];

const STATS_DATA = [
  { icon: <Building2 size={28} />, value: 10, suffix: '+', label: 'Perusahaan Aktif', color: '#00C9FF' },
  { icon: <Users size={28} />, value: 1280, suffix: '+', label: 'Karyawan Terkelola', color: '#00FF87' },
  { icon: <Clock size={28} />, value: 15, suffix: ' Menit', label: 'Proses Payroll', color: '#FFD700' },
  { icon: <DollarSign size={28} />, value: 2, suffix: 'M+', label: 'Payroll Diproses', color: '#8E2DE2' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.title = 'SI PRESENSI PRO MAX — All-in-One HR & Facility Management untuk Perusahaan Indonesia';
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  const fadeIn = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-50px' }, transition: { duration: 0.6 } };
  const fadeInLeft = { initial: { opacity: 0, x: -30 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true, margin: '-50px' }, transition: { duration: 0.6 } };
  const fadeInRight = { initial: { opacity: 0, x: 30 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true, margin: '-50px' }, transition: { duration: 0.6 } };

  const Counter = ({ value, suffix = '' }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    useEffect(() => {
      if (!isInView) return;
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) { setCount(value); clearInterval(timer); }
        else setCount(Math.floor(current));
      }, duration / steps);
      return () => clearInterval(timer);
    }, [isInView, value]);
    return <span ref={ref} className="text-4xl md:text-5xl font-bold font-mono text-white">{count}{suffix}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-white font-sans overflow-x-hidden">
      {/* STICKY NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-300 ${scrollY > 50 ? 'bg-[#0B0C10]/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollTo('hero')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-base font-serif shadow-lg shadow-purple-500/20">SP</div>
              <div><span className="font-bold text-sm tracking-wide text-white">SI PRESENSI</span><p className="text-[7px] text-gray-600 uppercase tracking-[0.2em] font-bold">Pro Max</p></div>
            </div>
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {['Fitur', 'Solusi', 'Harga', 'Testimoni', 'FAQ'].map(item => (
                <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="text-xs text-gray-400 hover:text-white tracking-wider uppercase font-bold transition-all hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{item}</button>
              ))}
              <button onClick={() => navigate('/login')} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all">Masuk</button>
              <button onClick={() => setShowModal(true)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105 active:scale-95">Demo Gratis</button>
            </div>
            <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-[#0B0C10]/95 backdrop-blur-xl border-b border-white/10">
              <div className="px-4 py-6 space-y-3">
                {['Fitur', 'Solusi', 'Harga', 'Testimoni', 'FAQ'].map(item => (
                  <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="block text-sm text-gray-400 hover:text-white w-full text-left py-2">{item}</button>
                ))}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button onClick={() => navigate('/login')} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/20 text-white text-xs font-bold uppercase">Masuk</button>
                  <button onClick={() => setShowModal(true)} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold uppercase">Demo</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO */}
      <section id="hero" className="min-h-screen flex items-center relative overflow-hidden pt-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] bg-[var(--aurora-1)] rounded-full blur-[300px] opacity-10" />
          <div className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] bg-[var(--aurora-3)] rounded-full blur-[300px] opacity-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[350px] opacity-5" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--success)]/10 to-[var(--aurora-3)]/10 border border-[var(--success)]/30 mb-6">
                <Sparkles size={14} className="text-[var(--success)]" />
                <span className="text-[9px] text-[var(--success)] font-bold uppercase tracking-wider">🔥 Solusi HR & Building Management All-in-One</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif font-bold leading-[1.05] mb-6">
                1 Aplikasi untuk<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--aurora-1)] via-[var(--aurora-3)] to-[var(--aurora-1)]">Semua Divisi</span><br />
                <span className="text-2xl sm:text-3xl lg:text-4xl text-gray-400">Absensi, Payroll, Helpdesk, Patroli, Aset</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-400 mb-8 max-w-lg leading-relaxed">
                Satu platform untuk HR, security, teknisi, cleaning service, supir, & logistik. 
                <span className="text-white font-bold"> 15+ modul terintegrasi. Setup 15 menit.</span>
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => setShowModal(true)} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20">
                  Jadwalkan Demo <ChevronRight size={18} />
                </button>
                <button onClick={() => scrollTo('fitur')} className="px-8 py-4 rounded-2xl border-2 border-white/20 text-white font-bold text-sm uppercase tracking-wider hover:bg-white/5 hover:border-white/40 transition-all hover:scale-105 active:scale-95">
                  Lihat Semua Fitur
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-5 mt-8 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500"><CheckCircle2 size={14} className="text-[var(--success)]" /> Trial 30 hari</span>
                <span className="flex items-center gap-1.5 text-gray-500"><CheckCircle2 size={14} className="text-[var(--success)]" /> No credit card</span>
                <span className="flex items-center gap-1.5 text-gray-500"><CheckCircle2 size={14} className="text-[var(--success)]" /> Custom branding</span>
                <span className="flex items-center gap-1.5 text-gray-500"><CheckCircle2 size={14} className="text-[var(--success)]" /> Support WA 24/7</span>
              </div>
            </motion.div>

            {/* Dashboard Preview */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="hidden lg:block">
              <div className="relative">
                <div className="glass-panel p-2 rounded-[24px] shadow-[0_0_80px_rgba(142,45,226,0.2)] border border-white/10">
                  <div className="bg-[#0B0C10] rounded-[22px] p-5 space-y-4">
                    {/* Top bar */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" /></div>
                      <span className="text-[10px] text-[var(--success)] font-mono flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" /> live</span>
                    </div>
                    {/* Dashboard header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold">SP</div>
                        <div><p className="text-sm font-bold">SI PRESENSI</p><p className="text-[9px] text-gray-500">Dashboard • All Modules Active</p></div>
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30">
                        <span className="text-[9px] text-[var(--success)] font-bold">● 15 Modul</span>
                      </div>
                    </div>
                    {/* Module grid */}
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: 'Absensi', color: '#00C9FF' },
                        { label: 'Payroll', color: '#00FF87' },
                        { label: 'Helpdesk', color: '#FFD700' },
                        { label: 'Patroli', color: '#FF6B6B' },
                        { label: 'Booking', color: '#8E2DE2' },
                        { label: 'Visitor', color: '#00C9FF' },
                        { label: 'Gedung', color: '#00FF87' },
                        { label: 'Armada', color: '#FFD700' },
                        { label: 'Stock', color: '#FF6B6B' },
                        { label: 'Insiden', color: '#8E2DE2' },
                        { label: 'WFH', color: '#00C9FF' },
                        { label: 'Tukar Shift', color: '#00FF87' },
                        { label: 'Gaji', color: '#FFD700' },
                        { label: 'Cuti', color: '#FF6B6B' },
                        { label: 'Laporan', color: '#8E2DE2' },
                      ].map((m, i) => (
                        <div key={i} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                          <p className="text-[7px] font-bold uppercase tracking-wider" style={{ color: m.color }}>{m.label}</p>
                        </div>
                      ))}
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Karyawan', value: '1.280+', color: '#00C9FF' },
                        { label: 'Data Diproses', value: '45RB+', color: '#00FF87' },
                        { label: 'Rating', value: '4.9★', color: '#FFD700' },
                      ].map((s, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                          <p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                          <p className="text-[7px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    {/* Quick actions */}
                    <div className="grid grid-cols-4 gap-2">
                      {['Absen','Payroll','Helpdesk','Patroli'].map((a, i) => (
                        <div key={i} className="py-2 rounded-lg text-center text-[8px] font-bold text-gray-400 bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all cursor-default">{a}</div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Rating badge */}
                <div className="absolute -bottom-4 -right-4 glass-panel p-3.5 rounded-2xl shadow-xl border border-yellow-500/20">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-0.5">{Array.from({length:5}).map((_,i) => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}</div>
                    <div><p className="text-sm font-bold">4.9</p><p className="text-[8px] text-gray-500">45+ HR Manager</p></div>
                  </div>
                </div>
                {/* White label badge */}
                <div className="absolute -top-4 -left-4 glass-panel p-2.5 rounded-2xl shadow-xl border border-[var(--aurora-3)]/20">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-[var(--aurora-3)]" />
                    <span className="text-[8px] font-bold text-white">Ready White-label</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS COUNTER */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS_DATA.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all group">
                <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform" style={{ color: s.color }}>{s.icon}</div>
                <div className="flex items-center justify-center"><Counter value={s.value} suffix={s.suffix} /></div>
                <p className="text-xs text-gray-500 mt-2 uppercase tracking-wider font-bold">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — ALL 11+ MODULES */}
      <section id="fitur" className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-[var(--aurora-1)]/10 to-[var(--aurora-3)]/10 border border-[var(--aurora-1)]/30 mb-4">
              <Sparkles size={12} className="text-[var(--aurora-1)]" />
              <span className="text-[9px] text-[var(--aurora-1)] font-bold uppercase tracking-wider">27+ Fitur Unggulan</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">Semua <span className="text-[var(--aurora-3)]">Terintegrasi</span> dalam 1 Platform</h2>
            <p className="text-gray-400 max-w-3xl mx-auto text-sm">Tidak perlu aplikasi terpisah untuk HR, security, teknisi, cleaning, & logistik. Cukup 1 login, semua fitur siap pakai dengan data real-time.</p>
          </motion.div>

          {FEATURE_CATEGORIES.map((cat, ci) => (
            <motion.div key={ci} {...fadeIn} transition={{ duration: 0.6, delay: ci * 0.1 }} className="mb-12 last:mb-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${cat.color}33, ${cat.color}11)`, border: `1px solid ${cat.color}44`, color: cat.color }}>{cat.icon}</div>
                <h3 className="text-xl font-serif font-bold text-white">{cat.title}</h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.features.map((f, fi) => (
                  <motion.div key={fi} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: fi * 0.03 }}
                    className="relative group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/20 transition-all cursor-default">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform" style={{ color: cat.color }}>{f.icon}</div>
                      <div>
                        <h4 className="text-xs font-bold text-white mb-0.5">{f.name}</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SOLUSI PER DIVISI */}
      <section id="solusi" className="py-20 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[40%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[250px] opacity-5" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div {...fadeIn} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30 mb-4">
              <Users size={12} className="text-[var(--success)]" />
              <span className="text-[9px] text-[var(--success)] font-bold uppercase tracking-wider">Satu Login, Semua Tercover</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">Solusi untuk <span className="text-[var(--success)]">Setiap Divisi</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm">Setiap divisi punya tools khusus — tapi dalam satu ekosistem terpadu. Data langsung sinkron antar departemen.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Briefcase size={24} />, title: 'HR & Finance', items: ['Absensi GPS/Face', 'Payroll 1-Klik', 'PPh 21 & BPJS', 'Pinjaman & Reimburse', 'THR Otomatis', 'Slip Gaji Digital'], color: '#00C9FF' },
              { icon: <ShieldCheck size={24} />, title: 'Security / Satpam', items: ['Patroli QR Checkpoint', 'Shift Swap', 'Missed Guard Alert', 'Incident Report', 'Handover Log', 'GPS Tracking'], color: '#FFD700' },
              { icon: <Headphones size={24} />, title: 'Helpdesk & Teknisi', items: ['Ticketing Multi-unit', 'Prioritas Otomatis', 'Foto & Dokumentasi', 'Work Order', 'Checklist Tugas', 'Material Tracking'], color: '#FF6B6B' },
              { icon: <Truck size={24} />, title: 'Logistik & Operasional', items: ['Fleet Management', 'Inventory Stock', 'Visitor Management', 'Facility Booking', 'K3 Incident', 'Laporan Harian'], color: '#00FF87' },
            ].map((d, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-panel p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: d.color }} />
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${d.color}22`, color: d.color }}>{d.icon}</div>
                <h3 className="text-base font-bold text-white mb-3">{d.title}</h3>
                <ul className="space-y-2">
                  {d.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-[11px] text-gray-400"><CheckCircle2 size={12} className="flex-shrink-0" style={{ color: d.color }} />{item}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHITE-LABEL / WITELABEL — BAGI YANG MAU JUALAN PAKAI BRAND SENDIRI */}
      <section className="py-20 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[30%] h-[50%] bg-[var(--aurora-3)] rounded-full blur-[200px] opacity-5" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div {...fadeIn} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-[var(--aurora-3)]/10 to-[var(--aurora-1)]/10 border border-[var(--aurora-3)]/30 mb-4">
              <Layers size={12} className="text-[var(--aurora-3)]" />
              <span className="text-[9px] text-[var(--aurora-3)] font-bold uppercase tracking-wider">Peluang Bisnis — White-label & Witelabel</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">Jual Produk Ini dengan <span className="text-[var(--aurora-3)]">Brand Anda</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm">Tanpa perlu ngoding, tanpa hire tim IT. Kami urus teknis, Anda tinggal jual ke client.</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-10">
            <motion.div {...fadeInLeft} className="glass-panel p-6 lg:p-8">
              <h3 className="text-lg font-bold text-white mb-2">✨ Kenapa Jadi Partner?</h3>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {[
                  { icon: <Zap size={16} />, label: 'Zero Coding', desc: 'Tidak perlu tim IT. Setup 1-2 hari.' },
                  { icon: <DollarSign size={16} />, label: 'Margin Besar', desc: 'Jual Rp 15-25rb/org, dapat 50-70%' },
                  { icon: <Globe size={16} />, label: 'Custom Brand', desc: 'Domain, logo, warna — 100% brand Anda' },
                  { icon: <Headphones size={16} />, label: 'Support Penuh', desc: 'Kami bantu teknis & migrasi data' },
                ].map((b, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--aurora-3)' }}>{b.icon} <span className="text-xs font-bold text-white">{b.label}</span></div>
                    <p className="text-[9px] text-gray-500">{b.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeInRight} className="glass-panel p-6 lg:p-8 border-[var(--aurora-3)]/30">
              <h3 className="text-lg font-bold text-white mb-4">💼 Skema Kerjasama</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">Setup Fee</span>
                    <span className="text-lg font-bold font-mono text-[var(--aurora-3)]">Rp 5-15jt</span>
                  </div>
                  <p className="text-[9px] text-gray-500">Sekali bayar. Termasuk domain, logo, branding, database tenant terisolasi, dokumentasi API.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">Monthly Minimum</span>
                    <span className="text-lg font-bold font-mono text-[var(--success)]">Rp 2-5jt</span>
                  </div>
                  <p className="text-[9px] text-gray-500">Sudah termasuk hosting, maintenance, support infrastruktur. Cocok untuk partner established.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 border-l-2" style={{ borderLeftColor: 'var(--aurora-3)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">Atau Revenue Share</span>
                    <span className="text-lg font-bold font-mono text-[var(--warning)]">30-50%</span>
                  </div>
                  <p className="text-[9px] text-gray-500">Cocok untuk partner baru. Dapat 30-50% dari harga jual ke end client. Contoh: jual Rp 15rb/org → Anda dapat Rp 7.500/org/bulan.</p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div {...fadeIn} className="text-center">
            <button onClick={() => setShowBookModal(true)} className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 mx-auto hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20">
              <Layers size={18} /> Gabung Jadi Partner <ChevronRight size={18} />
            </button>
            <p className="text-[10px] text-gray-500 mt-3">Free consultation — kami jelasin hitungan bisnisnya.</p>
          </motion.div>
        </div>
      </section>

      {/* HARGA — dengan toggle Bulanan/Tahunan */}
      <section id="harga" className="py-20 relative">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[40%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[250px] opacity-8" /></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div {...fadeIn} className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[var(--warning)]/10 border border-[var(--warning)]/30 mb-4">
              <Calculator size={12} className="text-[var(--warning)]" />
              <span className="text-[9px] text-[var(--warning)] font-bold uppercase tracking-wider">Harga Transparan — Semua Modul Include</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">Investasi Mulai <span className="text-[var(--aurora-1)]">Rp 7.000</span>/karyawan</h2>
            <p className="text-gray-400 max-w-xl mx-auto">1 harga untuk 15+ modul. Tidak ada biaya tersembunyi. Tidak ada upsell fitur.</p>
          </motion.div>

          {/* Annual / Monthly Toggle */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className={`text-xs font-bold transition-colors ${!annualBilling ? 'text-white' : 'text-gray-500'}`}>Bulanan</span>
            <button onClick={() => setAnnualBilling(!annualBilling)} className={`relative w-14 h-7 rounded-full transition-all ${annualBilling ? 'bg-[var(--aurora-3)]' : 'bg-gray-600'}`}>
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${annualBilling ? 'left-8' : 'left-1'}`} />
            </button>
            <span className={`text-xs font-bold transition-colors ${annualBilling ? 'text-[var(--aurora-3)]' : 'text-gray-500'}`}>
              Tahunan <span className="text-[var(--success)]">(Hemat 20%)</span>
            </span>
          </div>

                {/* Comparison bar */}
                <motion.div {...fadeIn} className="mb-10 p-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)]/5 via-[var(--aurora-3)]/5 to-[var(--aurora-1)]/5 border border-white/5">
                  <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10px] text-gray-400">
                    <span className="text-white font-bold flex items-center gap-1">💡 Produk ini setara <span className="text-[var(--aurora-3)]">5 aplikasi terpisah</span></span>
                    <span>Absensi <span className="text-gray-600">~Rp 15rb</span></span>
                    <span>+ Payroll <span className="text-gray-600">~Rp 25rb</span></span>
                    <span>+ Helpdesk <span className="text-gray-600">~Rp 10rb</span></span>
                    <span>+ Patroli <span className="text-gray-600">~Rp 8rb</span></span>
                    <span>+ Fleet <span className="text-gray-600">~Rp 7rb</span></span>
                    <span className="text-[var(--success)] font-bold">= <span className="line-through text-gray-600">Rp 65rb</span> /org</span>
                  </div>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                  {[
                    { 
                      name:'Bronze', 
                      priceMonthly: 'Gratis', 
                      priceAnnual: 'Gratis',
                      period: '', 
                      users:'14 hari — 10 karyawan', 
                      features:['Semua 15+ modul aktif', 'Absensi GPS + Face + QR', 'Payroll & slip gaji', '1 proyek'], 
                      popular:false, 
                      cta:'Coba Gratis',
                      color: '#6B7280'
                    },
                    { 
                      name:'Silver', 
                      priceMonthly: 'Rp 15.000', 
                      priceAnnual: 'Rp 12.000',
                      period: '/karyawan/bln', 
                      users:'1 — 50 karyawan', 
                      features:['Semua modul tanpa batas', 'BPJS + PPh21 TER 2024+', 'Export 20+ bank', 'Pinjaman & reimburse', 'Multi-proyek', 'Support prioritas WA'], 
                      popular:true, 
                      cta:'Mulai Sekarang',
                      color: 'var(--aurora-3)'
                    },
                    { 
                      name:'Gold', 
                      priceMonthly: 'Rp 10.000', 
                      priceAnnual: 'Rp 8.000',
                      period: '/karyawan/bln', 
                      users:'51 — 200 karyawan', 
                      features:['Semua fitur Silver', 'THR otomatis H-7', 'Performance appraisal', 'Dashboard finance + audit', 'Helpdesk, patroli, fleet, dll', 'Account manager dedicated'], 
                      popular:false, 
                      cta:'Hubungi Kami',
                      color: '#FFD700'
                    },
                    { 
                      name:'Platinum', 
                      priceMonthly: 'Rp 7.000', 
                      priceAnnual: 'Rp 5.600',
                      period: '/karyawan/bln', 
                      users:'200+ karyawan', 
                      features:['Semua fitur Gold', 'On-Premise / VPS sendiri', 'Custom integration API', 'White-label siap pakai', 'Dedicated support + SLA 99.9%', 'Training HR & teknisi'], 
                      popular:false, 
                      cta:'Hubungi Kami',
                      color: '#00FF87'
                    },
                  ].map((p, i) => {
                    const isAnnual = annualBilling;
                    const displayPrice = isAnnual && p.priceAnnual ? p.priceAnnual : p.priceMonthly;
                    const suffix = isAnnual && p.priceAnnual ? '/karyawan/thn (ditagih tahunan)' : p.period;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                        className={`glass-panel p-6 relative flex flex-col ${p.popular ? 'border-[var(--aurora-3)]/40 shadow-[0_0_50px_rgba(0,201,255,0.2)] ring-1 ring-[var(--aurora-3)]/30 scale-105' : ''}`}>
                        {p.popular && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[8px] font-bold uppercase tracking-widest whitespace-nowrap shadow-lg shadow-purple-500/40">⭐ Paling Laris</div>}
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
                          <p className="text-[10px] text-gray-500 mb-4">{p.users}</p>
                          <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-bold text-white">{displayPrice}</span>
                              <span className="text-xs text-gray-500">{suffix}</span>
                            </div>
                            {isAnnual && p.priceAnnual && p.priceMonthly && p.priceAnnual !== 'Gratis' && (
                              <p className="text-[9px] text-[var(--success)] mt-1">Hemat Rp {(Number(p.priceMonthly.replace(/\D/g,'')) - Number(p.priceAnnual.replace(/\D/g,''))) * 12}rb/tahun</p>
                            )}
                          </div>
                          <ul className="space-y-3 mb-8">{p.features.map((f,j) => (
                            <li key={j} className="flex items-start gap-2 text-xs text-gray-400"><CheckCircle2 size={14} className="text-[var(--success)] mt-0.5 flex-shrink-0" /> {f}</li>
                          ))}</ul>
                        </div>
                        <button onClick={() => { p.name === 'Bronze' ? navigate('/login') : setShowModal(true); }} className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${p.popular ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white hover:shadow-xl hover:shadow-purple-500/30' : 'border-2 border-white/20 text-white hover:bg-white/5'}`}>{p.cta}</button>
                      </motion.div>
                    );
                  })}
                </div>

          {/* Garansi & bottom badges */}
          <motion.div {...fadeIn} className="flex flex-wrap justify-center gap-6 mt-10 text-[10px] text-gray-600">
            <span className="flex items-center gap-1.5">✅ No credit card required</span>
            <span className="flex items-center gap-1.5">🔄 Cancel anytime</span>
            <span className="flex items-center gap-1.5">📞 Support WhatsApp 24/7</span>
            <span className="flex items-center gap-1.5">🚀 Semua modul aktif dari hari 1</span>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONI */}
      <section id="testimoni" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-4">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider">Rating 4.9 dari 45+ Perusahaan</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">Dipercaya oleh</h2>
            <p className="text-gray-400">Para HR Professional & Manajer Operasional di Indonesia</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name:'Rina Wijaya', role:'HR Manager — PT. Provices Project', text:'Dulu kami butuh 5 hari untuk payroll. Sekarang 15 menit. Fitur helpdesk & patroli juga sangat membantu operasional gedung.' },
              { name:'Andi Pratama', role:'Finance Director — CV. Maju Jaya', text:'Laporan PPh 21 dan BPJS langsung jadi. Fitur fleet management & inventory sangat kami butuhkan.' },
              { name:'Siti Nurhaliza', role:'Supervisor Operasional — PT. Bina Karya', text:'Missed guard auto-detect & shift swap sudah seperti aplikasi terpisah. Semua dalam 1 login. Brilliant!' },
              { name:'Bambang Susilo', role:'IT Manager — PT. Teknologi Mandiri', text:'Kami pakai white-label untuk dijual ke client. Setup cepat, support responsif. Recommended untuk penyedia jasa HR.' },
              { name:'Dewi Lestari', role:'HR Supervisor — CV. Karya Bersama', text:'Mode WFH/WFA sangat membantu di era hybrid. Face verification anti-fake GPS benar-benar work.' },
              { name:'Hendra Gunawan', role:'Building Manager — PT. Properti Nusantara', text:'Satu aplikasi untuk satpam, teknisi, cleaning, & tenant. Visitor management + booking ruangan sangat efektif.' },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="glass-panel p-6">
                <div className="flex gap-0.5 mb-4">{Array.from({length:5}).map((_,j) => <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />)}</div>
                <p className="text-sm text-gray-300 mb-6 leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-xs font-bold text-white shadow-lg">{t.name.charAt(0)}</div>
                  <div><p className="text-xs font-bold text-white">{t.name}</p><p className="text-[9px] text-gray-500">{t.role}</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">Pertanyaan Umum</h2>
            <p className="text-gray-400">Yang sering ditanyakan sebelum memulai.</p>
          </motion.div>
          <div className="space-y-3">
            {[
              { q:'Apakah semua modul sudah termasuk dalam 1 harga?', a:'Ya. Bronze, Silver, Gold, dan Enterprise mencakup SEMUA modul. Yang membedakan hanya jumlah karyawan, fitur tambahan seperti THR, performance appraisal, white-label, dan dukungan.' },
              { q:'Apakah bisa dipakai tanpa internet?', a:'Ya. Absen tetap jalan di mode offline. Data otomatis tersinkronisasi saat internet kembali.' },
              { q:'Berapa lama setup awal?', a:'Cuma 15 menit. Upload data karyawan via CSV, atur shift, dan karyawan langsung bisa absen. Untuk modul tambahan seperti patroli & helpdesk, setup di hari yang sama.' },
              { q:'Apakah data aman?', a:'100%. Database diisolasi per tenant (RLS). Device binding mencegah akun dipakai orang lain. Semua data dienkripsi di Supabase Infrastructure.' },
              { q:'Apakah support witelabel / white-label?', a:'Tentu. Enterprise plan sudah termasuk white-label. Custom domain, logo, favicon, warna — semua bisa disesuaikan. Cocok untuk dijual kembali ke client Anda.' },
              { q:'Ada trial gratis?', a:'Tentu. 30 hari gratis, 10 karyawan, semua fitur lengkap. Tanpa komitmen. Tim kami akan bantu setup.' },
              { q:'Bisa dipasang di server perusahaan sendiri?', a:'Bisa. Enterprise plan menyediakan opsi On-Premise di VPS perusahaan. Cocok untuk kepatuhan PDP dan perusahaan dengan kebijakan data ketat.' },
              { q:'Apakah ada pelatihan untuk tim HR?', a:'Ya. Gold & Enterprise plan mencakup sesi training untuk tim HR, teknisi, dan admin. Video tutorial juga tersedia.' },
            ].map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[300px] opacity-10" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div {...fadeIn}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-6">Siap Transformasi Perusahaan Anda?</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto text-lg">Gratis 30 hari. Setup 15 menit. Semua modul aktif. Karyawan & tim langsung bisa pakai besok pagi.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => setShowModal(true)} className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:shadow-2xl hover:shadow-purple-500/40 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20">
                Jadwalkan Demo Gratis <ChevronRight size={18} />
              </button>
              <button onClick={() => window.open('https://wa.me/6281234567890?text=Halo%20saya%20tertarik%20dengan%20SI%20PRESENSI%20Pro%20Max', '_blank')} className="px-10 py-5 rounded-2xl border-2 border-[var(--success)]/30 text-[var(--success)] font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:bg-[var(--success)]/5 hover:border-[var(--success)]/60 transition-all hover:scale-105 active:scale-95">
                <MessageSquare size={16} /> Tanya via WhatsApp
              </button>
            </div>
            <div className="flex justify-center gap-6 mt-8 text-[10px] text-gray-600">
              <span>✅ No credit card</span><span>✅ Cancel anytime</span><span>✅ Support 24/7</span><span>✅ 15+ modul aktif</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-xs font-serif">SP</div>
                <span className="text-xs font-bold text-white">SI PRESENSI</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">All-in-One HR & Building Management Platform untuk perusahaan Indonesia. 15+ modul, 1 login.</p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-3">Produk</h4>
              <div className="space-y-2 text-[10px] text-gray-500">
                <p>Absensi & Payroll</p>
                <p>Helpdesk & Patroli</p>
                <p>Fleet & Inventory</p>
                <p>Visitor & Booking</p>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-3">Perusahaan</h4>
              <div className="space-y-2 text-[10px] text-gray-500">
                <p>Tentang Kami</p>
                <p>Kebijakan Privasi</p>
                <p>Syarat & Ketentuan</p>
                <p>Partner Program</p>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-3">Kontak</h4>
              <div className="space-y-2 text-[10px] text-gray-500">
                <div className="flex items-center gap-2"><Mail size={12} /> hello@sipresensi.com</div>
                <div className="flex items-center gap-2"><Phone size={12} /> 0812-3456-7890</div>
                <div className="flex items-center gap-2"><MessageSquare size={12} /> WA: 0812-3456-7890</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-600">SI PRESENSI PRO MAX — By Richard Meha. © 2026 All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4 text-[9px] text-gray-600">
              <button onClick={() => navigate('/login')} className="hover:text-gray-400 transition-colors">Masuk</button>
              <button onClick={() => setShowModal(true)} className="hover:text-gray-400 transition-colors">Demo Gratis</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <AnimatePresence>{showModal && <DemoRequestModal onClose={() => setShowModal(false)} />}</AnimatePresence>
      {/* Book Demo Modal */}
      <AnimatePresence>{showBookModal && <PartnerBookingModal onClose={() => setShowBookModal(false)} />}</AnimatePresence>
    </div>
  );
};

const FaqItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-panel overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors">
        <span className="text-sm font-bold text-white">{question}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-all duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{answer}</p></motion.div>}</AnimatePresence>
    </div>
  );
};

const DemoRequestModal = ({ onClose }) => {
  const [form, setForm] = useState({ name:'', company:'', email:'', phone:'', employees:'11-50', interest:'all', message:'' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSending(true);
    try {
      await supabase.from('audit_logs').insert({ action:'DEMO_REQUEST', details:{...form} });
      await new Promise(r => setTimeout(r, 1000));
      setSent(true);
      setTimeout(() => onClose(), 2000);
    } catch { setSent(true); setTimeout(() => onClose(), 2000); }
    finally { setSending(false); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={e => e.stopPropagation()} className="w-full max-w-md glass-panel p-6 sm:p-8 relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center mx-auto mb-4"><CheckSquare size={32} className="text-[var(--success)]" /></div>
            <h3 className="text-xl font-serif font-bold text-white mb-2">Pesan Terkirim! 🎉</h3>
            <p className="text-sm text-gray-400">Tim kami akan menghubungi Anda dalam 1x24 jam via WhatsApp.</p>
            <p className="text-xs text-gray-500 mt-2">Atau hubungi langsung: <span className="text-[var(--success)]">0812-3456-7890</span></p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-sm">SP</div>
              <div><h3 className="text-lg font-serif font-bold text-white">Demo Gratis 30 Menit</h3><p className="text-[10px] text-gray-500">Konsultasi via Zoom/WA — lihat semua modul</p></div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Nama</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="John Doe" /></div>
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Perusahaan</label><input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="PT. Contoh" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Email</label><input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="email@company.com" /></div>
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">No. WA</label><input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none" placeholder="0812xxxx" /></div>
              </div>
              <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Jumlah Karyawan</label>
                <select value={form.employees} onChange={e => setForm({...form, employees: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                  <option>1-10</option><option>11-50</option><option>51-100</option><option>101-500</option><option>500+</option>
                </select>
              </div>
              <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Modul yang Diminati</label>
                <select value={form.interest} onChange={e => setForm({...form, interest: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                  <option value="all">Semua Modul</option>
                  <option value="payroll">Payroll & Pajak</option>
                  <option value="helpdesk">Helpdesk & Operasional</option>
                  <option value="security">Security & Patroli</option>
                  <option value="logistic">Logistik & Inventory</option>
                  <option value="witelabel">White-label / Witelabel</option>
                </select>
              </div>
              <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Pesan (opsional)</label>
                <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="Ceritakan kebutuhan perusahaan Anda..." />
              </div>
              <button type="submit" disabled={sending} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-50">
                {sending ? <><Loader2 size={16} className="animate-spin" /> Mengirim...</> : <><Send size={16} /> Kirim & Jadwalkan Demo</>}
              </button>
              <p className="text-[8px] text-gray-600 text-center">Atau hubungi langsung <span className="text-[var(--success)]">0812-3456-7890 (WA)</span></p>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

const PartnerBookingModal = ({ onClose }) => {
  const [form, setForm] = useState({ name:'', company:'', email:'', phone:'', type:'witelabel', message:'' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSending(true);
    try {
      await supabase.from('audit_logs').insert({ action:'PARTNER_REQUEST', details:{...form} });
      await new Promise(r => setTimeout(r, 1000));
      setSent(true);
      setTimeout(() => onClose(), 2000);
    } catch { setSent(true); setTimeout(() => onClose(), 2000); }
    finally { setSending(false); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={e => e.stopPropagation()} className="w-full max-w-md glass-panel p-6 sm:p-8 relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center mx-auto mb-4"><CheckSquare size={32} className="text-[var(--success)]" /></div>
            <h3 className="text-xl font-serif font-bold text-white mb-2">Terima Kasih! 🎉</h3>
            <p className="text-sm text-gray-400">Tim partner kami akan menghubungi dalam 1x12 jam dengan brosur & penawaran khusus.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-sm"><Layers size={18} /></div>
              <div><h3 className="text-lg font-serif font-bold text-white">Gabung Jadi Partner</h3><p className="text-[10px] text-gray-500">White-label / Witelabel / Reseller</p></div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Nama</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="John" /></div>
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Perusahaan</label><input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="PT. Partner" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Email</label><input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="email@company.com" /></div>
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">No. HP</label><input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none" placeholder="0812xxxx" /></div>
              </div>
              <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Tipe Kerjasama</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                  <option value="witelabel">White-label / Brand Sendiri</option>
                  <option value="reseller">Reseller / Jual Kembali</option>
                  <option value="integrasi">Integrasi ke Sistem Kami</option>
                  <option value="investor">Investor / Strategic Partnership</option>
                </select>
              </div>
              <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Pesan</label>
                <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="Ceritakan rencana kerjasama Anda..." />
              </div>
              <button type="submit" disabled={sending} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-50">
                {sending ? <><Loader2 size={16} className="animate-spin" /> Mengirim...</> : <><Send size={16} /> Kirim Permintaan</>}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;
