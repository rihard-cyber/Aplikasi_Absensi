/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight, CheckCircle2, Star, Users, Clock, DollarSign, ShieldCheck, Camera, MapPin, QrCode, Smartphone, FileText, Calculator, CreditCard, Gift, TrendingUp, BarChart3, Building2, Award, Download, MessageSquare, ChevronDown, Sparkles, Send, Loader2, Phone, Mail, CheckSquare, Activity, Zap, Globe, UserCheck, Briefcase, Calendar, PieChart } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const FEATURES = [
  { icon: <Camera size={24} />, title: 'Face Camera Check-in', desc: 'Selfie real-time saat clock-in. Anti-fake dengan validasi multi-layer.', color: '#00C9FF' },
  { icon: <MapPin size={24} />, title: 'GPS Geofencing', desc: 'Radius absensi per proyek. Karyawan hanya bisa absen di lokasi kerja.', color: '#00FF87' },
  { icon: <QrCode size={24} />, title: 'QR Code Scan', desc: 'Scan QR di pintu masuk. Alternatif cepat tanpa GPS.', color: '#FFD700' },
  { icon: <Smartphone size={24} />, title: 'Offline Mode', desc: 'Absen tanpa internet. Auto-sync saat online kembali.', color: '#8E2DE2' },
  { icon: <DollarSign size={24} />, title: 'Payroll 1-Klik', desc: 'Hitungan lembur, BPJS, PPh21, pinjaman — 15 menit selesai.', color: '#00FF87' },
  { icon: <FileText size={24} />, title: 'Slip Gaji Digital', desc: 'Karyawan lihat & download slip gaji sendiri via HP.', color: '#00C9FF' },
  { icon: <Calculator size={24} />, title: 'PPh 21 & BPJS', desc: 'TER 2024+ otomatis. Patuh regulasi. Update tiap tahun.', color: '#FFD700' },
  { icon: <CreditCard size={24} />, title: 'Export Bank', desc: 'Format BCA, Mandiri, BSI. Tinggal upload ke internet banking.', color: '#8E2DE2' },
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

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    document.title = 'SI PRESENSI PRO MAX — Solusi HR & Payroll All-in-One untuk Perusahaan Indonesia';
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); };
  const fadeIn = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-50px' }, transition: { duration: 0.6 } };

  // Stats counter animation
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

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-300 ${scrollY > 50 ? 'bg-[#0B0C10]/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollTo('hero')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-base font-serif shadow-lg shadow-purple-500/20">SP</div>
              <div><span className="font-bold text-sm tracking-wide text-white">SI PRESENSI</span><p className="text-[7px] text-gray-600 uppercase tracking-[0.2em] font-bold">Pro Max</p></div>
            </div>
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {['Fitur', 'Harga', 'Testimoni', 'FAQ'].map(item => (
                <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="text-xs text-gray-400 hover:text-white tracking-wider uppercase font-bold transition-all hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{item}</button>
              ))}
              <button onClick={() => navigate('/login')} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105 active:scale-95">Masuk</button>
              <button onClick={() => setShowModal(true)} className="px-5 py-2.5 rounded-xl border-2 border-[var(--aurora-3)]/50 text-[var(--aurora-3)] text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--aurora-3)]/10 transition-all hover:scale-105 active:scale-95">Demo Gratis</button>
            </div>
            <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-[#0B0C10]/95 backdrop-blur-xl border-b border-white/10">
              <div className="px-4 py-6 space-y-3">
                {['Fitur','Harga','Testimoni','FAQ'].map(item => (
                  <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="block text-sm text-gray-400 hover:text-white w-full text-left py-2">{item}</button>
                ))}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button onClick={() => navigate('/login')} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold uppercase">Masuk</button>
                  <button onClick={() => setShowModal(true)} className="flex-1 py-3.5 rounded-xl border-2 border-[var(--aurora-3)]/50 text-[var(--aurora-3)] text-xs font-bold uppercase">Demo</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO */}
      <section id="hero" className="min-h-screen flex items-center relative overflow-hidden pt-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] bg-[var(--aurora-1)] rounded-full blur-[250px] opacity-15" />
          <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] bg-[var(--aurora-3)] rounded-full blur-[250px] opacity-15" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[300px] opacity-5" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--success)]/10 to-[var(--aurora-3)]/10 border border-[var(--success)]/30 mb-6">
                <Sparkles size={14} className="text-[var(--success)]" />
                <span className="text-[9px] text-[var(--success)] font-bold uppercase tracking-wider">🔥 All-in-One HR & Payroll — 🇮🇩 Indonesia</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif font-bold leading-[1.05] mb-6">
                Kelola <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--aurora-1)] via-[var(--aurora-3)] to-[var(--aurora-1)]">128 Karyawan</span><br />
                <span className="text-3xl sm:text-4xl lg:text-5xl text-gray-400">Payroll & Pajak dari 1 HP</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-400 mb-8 max-w-lg leading-relaxed">
                Absensi GPS + Face Camera, payroll otomatis, BPJS, PPh 21 — semua terintegrasi. 
                <span className="text-white font-bold"> Setup 15 menit, langsung bisa dipakai.</span>
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => setShowModal(true)} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20">
                  Coba Gratis <ChevronRight size={18} />
                </button>
                <button onClick={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 rounded-2xl border-2 border-white/20 text-white font-bold text-sm uppercase tracking-wider hover:bg-white/5 hover:border-white/40 transition-all hover:scale-105 active:scale-95">
                  Lihat Preview
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-5 mt-8 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500"><CheckCircle2 size={14} className="text-[var(--success)]" /> No credit card</span>
                <span className="flex items-center gap-1.5 text-gray-500"><CheckCircle2 size={14} className="text-[var(--success)]" /> 30 hari trial</span>
                <span className="flex items-center gap-1.5 text-gray-500"><CheckCircle2 size={14} className="text-[var(--success)]" /> Setup 15 menit</span>
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
                        <div><p className="text-sm font-bold">SI PRESENSI</p><p className="text-[9px] text-gray-500">Dashboard • Kamis, 15 Mei 2026</p></div>
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30">
                        <span className="text-[9px] text-[var(--success)] font-bold">● Online</span>
                      </div>
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Karyawan', value: '128', color: '#00C9FF' },
                        { label: 'Hadir', value: '98', color: '#00FF87' },
                        { label: 'Terlambat', value: '5', color: '#FFD700' },
                        { label: 'Cuti', value: '3', color: '#8E2DE2' },
                      ].map((s, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                          <p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                          <p className="text-[8px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    {/* Chart mockup */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Kehadiran Minggu Ini</span>
                        <TrendingUp size={14} className="text-[var(--success)]" />
                      </div>
                      <div className="flex items-end gap-1.5 h-16">
                        {[65, 75, 60, 80, 90, 70, 85].map((h, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-gradient-to-t from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-t" style={{ height: `${h}%` }} />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1 text-[7px] text-gray-600">{[...'SenSelRabKamJumSabMin'].reduce((r, c, i) => { if (i%3===0) r.push(c); return r; }, []).map((d,i) => <span key={i}>{['Sen','Sel','Rab','Kam','Jum','Sab','Min'][i]}</span>)}</div>
                    </div>
                    {/* Quick actions */}
                    <div className="grid grid-cols-4 gap-2">
                      {['Absen','Cuti','Gaji','Izin'].map((a, i) => (
                        <div key={i} className="py-2 rounded-lg text-center text-[9px] font-bold text-gray-400 bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all cursor-default">{a}</div>
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
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS COUNTER */}
      <section id="preview" className="py-16 border-t border-white/5">
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

      {/* APP PREVIEW SECTION */}
      <section className="py-20 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[30%] h-[40%] bg-[var(--aurora-3)] rounded-full blur-[200px] opacity-5" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">Lihat <span className="text-[var(--aurora-3)]">Aplikasi</span> dalam Aksi</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Dashboard real-time yang digunakan HR Manager setiap hari. Semua data langsung terupdate otomatis.</p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Card 1: Dashboard */}
            <motion.div {...fadeIn} className="glass-panel p-5 lg:col-span-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[var(--aurora-1)]/10 to-transparent rounded-full blur-3xl" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">📊 Dashboard Admin</h3>
                <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Live Preview</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total Karyawan', value: '128', color: '#00C9FF' },
                  { label: 'Hadir Hari Ini', value: '98', color: '#00FF87' },
                  { label: 'Pending Approvals', value: '12', color: '#FFD700' },
                ].map((c, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-lg font-bold font-mono" style={{ color: c.color }}>{c.value}</p>
                    <p className="text-[8px] text-gray-500 uppercase tracking-wider mt-1">{c.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-2">Kehadiran Bulan Ini</p>
                  <div className="flex items-end gap-1 h-12">
                    {[40,55,70,45,60,80,50,65,75,55,70,85].map((h,i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-t opacity-70" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-2">Divisi Terbesar</p>
                  <div className="space-y-2">
                    {[{name:'Security',pct:75},{name:'Staff',pct:60},{name:'Supervisor',pct:30}].map((d,i) => (
                      <div key={i}><div className="flex justify-between text-[9px] text-gray-400 mb-0.5"><span>{d.name}</span><span>{d.pct}%</span></div><div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)]" style={{width:`${d.pct}%`}}/></div></div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Stats */}
            <motion.div {...fadeIn} transition={{ duration: 0.6, delay: 0.1 }} className="glass-panel p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--aurora-3)]/10 to-transparent rounded-full blur-3xl" />
              <h3 className="text-sm font-bold text-white mb-4">💰 Payroll Bulan Ini</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--aurora-1)]/10 to-[var(--aurora-3)]/10 border border-white/10">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">Total Gaji</p>
                  <p className="text-3xl font-bold font-mono text-white">Rp 450jt</p>
                  <div className="flex items-center gap-2 mt-1"><TrendingUp size={12} className="text-[var(--success)]" /><span className="text-[10px] text-[var(--success)]">+12% dari bulan lalu</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-[9px] text-gray-500">Lembur</p><p className="text-lg font-bold font-mono text-[var(--warning)]">Rp 12jt</p></div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-[9px] text-gray-500">BPJS</p><p className="text-lg font-bold font-mono text-[var(--aurora-3)]">Rp 8jt</p></div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-2">Proses Payroll</p>
                  <div className="flex items-center gap-3"><div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden"><div className="w-[95%] h-full bg-gradient-to-r from-[var(--success)] to-emerald-400 rounded-full" /></div><span className="text-xs font-bold text-[var(--success)]">95%</span></div>
                  <p className="text-[10px] text-gray-500 mt-1">128/128 karyawan diproses ✅</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FITUR */}
      <section id="fitur" className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-[var(--aurora-1)]/10 to-[var(--aurora-3)]/10 border border-[var(--aurora-1)]/30 mb-4">
              <Sparkles size={12} className="text-[var(--aurora-1)]" />
              <span className="text-[9px] text-[var(--aurora-1)] font-bold uppercase tracking-wider">41 Fitur Lengkap</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">Semua <span className="text-[var(--aurora-3)]">Terintegrasi</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Absensi, payroll, pajak, pinjaman, THR, aset, penilaian kinerja — semua dalam satu platform. Tanpa aplikasi terpisah.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                className="glass-panel p-5 hover:bg-white/[0.04] transition-all group cursor-default border-l-2" style={{ borderLeftColor: f.color }}>
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-white/10 transition-all" style={{ color: f.color }}>{f.icon}</div>
                <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HARGA */}
      <section id="harga" className="py-20 relative">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[40%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[250px] opacity-8" /></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">Harga <span className="text-[var(--aurora-1)]">Transparan</span></h2>
            <p className="text-gray-400">Mulai gratis. Tanpa biaya tersembunyi. Cancel kapan saja.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { name:'Bronze', price:'Gratis', period:'30 hari', users:'10 karyawan', features:['Semua fitur absensi','Payroll dasar','Slip gaji','1 proyek'], popular:false, cta:'Coba Gratis' },
              { name:'Silver', price:'Rp 5.000', period:'/karyawan/bln', users:'11-100 karyawan', features:['Semua fitur Bronze','BPJS + PPh21','Export Bank','Pinjaman & Reimburse','Multi-proyek','Support prioritas'], popular:true, cta:'Mulai Sekarang' },
              { name:'Gold', price:'Rp 4.000', period:'/karyawan/bln', users:'101-500 karyawan', features:['Semua fitur Silver','THR otomatis','Performance appraisal','Dashboard finance','Onboarding','Account manager'], popular:false, cta:'Hubungi Kami' },
              { name:'Enterprise', price:'Rp 3.000', period:'/karyawan/bln', users:'500+ karyawan', features:['Semua fitur Gold','On-Premise','Custom integration','Dedicated support','SLA 99.9%','Training HR'], popular:false, cta:'Hubungi Kami' },
            ].map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`glass-panel p-6 relative flex flex-col ${p.popular ? 'border-[var(--aurora-3)]/40 shadow-[0_0_50px_rgba(0,201,255,0.2)] ring-1 ring-[var(--aurora-3)]/30 scale-105' : ''}`}>
                {p.popular && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[8px] font-bold uppercase tracking-widest whitespace-nowrap shadow-lg shadow-purple-500/40">⭐ Paling Laris</div>}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
                  <p className="text-[10px] text-gray-500 mb-4">{p.users}</p>
                  <div className="mb-6"><span className="text-3xl font-bold text-white">{p.price}</span><span className="text-xs text-gray-500 ml-1">{p.period}</span></div>
                  <ul className="space-y-3 mb-8">{p.features.map((f,j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-400"><CheckCircle2 size={14} className="text-[var(--success)] mt-0.5 flex-shrink-0" /> {f}</li>
                  ))}</ul>
                </div>
                <button onClick={() => navigate('/login')} className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${p.popular ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white hover:shadow-xl hover:shadow-purple-500/30' : 'border-2 border-white/20 text-white hover:bg-white/5'}`}>{p.cta}</button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONI */}
      <section id="testimoni" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">Dipercaya oleh</h2>
            <p className="text-gray-400">Para HR Professional di Indonesia</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name:'Rina Wijaya', role:'HR Manager — PT. Provices Project', text:'Dulu kami butuh 5 hari untuk payroll. Sekarang 15 menit. Ini game changer!' },
              { name:'Andi Pratama', role:'Finance Director — CV. Maju Jaya', text:'Laporan PPh 21 dan BPJS langsung jadi. Tidak perlu hitung manual lagi.' },
              { name:'Siti Nurhaliza', role:'HR Supervisor — PT. Bina Karya', text:'Fitur anti-fake GPS dan device binding sangat membantu. Tidak khawatir manipulasi absensi.' },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-panel p-6">
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
              { q:'Apakah bisa dipakai tanpa internet?', a:'Ya. Absen tetap jalan di mode offline. Data otomatis tersinkronisasi saat internet kembali.' },
              { q:'Berapa lama setup awal?', a:'Cuma 15 menit. Upload data karyawan via CSV, atur shift, dan karyawan langsung bisa absen.' },
              { q:'Apakah data aman?', a:'100%. Database diisolasi per tenant (RLS). Device binding mencegah akun dipakai orang lain.' },
              { q:'Bisa dipasang di server perusahaan sendiri?', a:'Bisa. Kami sediakan opsi On-Premise untuk VPS perusahaan. Cocok untuk kepatuhan PDP.' },
              { q:'Ada trial gratis?', a:'Tentu. 30 hari gratis, 10 karyawan, semua fitur lengkap. Tanpa komitmen.' },
            ].map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full blur-[300px] opacity-10" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div {...fadeIn}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-6">Siap Efisiensi HR Perusahaan Anda?</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto text-lg">Gratis 30 hari. Setup 15 menit. Karyawan langsung bisa absen besok pagi.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => setShowModal(true)} className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:shadow-2xl hover:shadow-purple-500/40 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20">
                🚀 Mulai Gratis <ChevronRight size={18} />
              </button>
              <a href="mailto:hello@sipresensi.com" className="px-10 py-5 rounded-2xl border-2 border-white/20 text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 hover:border-white/40 transition-all hover:scale-105 active:scale-95">
                <MessageSquare size={16} /> Hubungi Kami
              </a>
            </div>
            <div className="flex justify-center gap-8 mt-8 text-[10px] text-gray-600">
              <span>✅ No credit card</span><span>✅ Cancel anytime</span><span>✅ Support 24/7</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-xs font-serif">SP</div>
              <span className="text-xs text-gray-500">SI PRESENSI PRO MAX — By Richard Meha</span>
            </div>
            <div className="flex items-center gap-6 text-[10px] text-gray-600">
              <button onClick={() => navigate('/login')} className="hover:text-gray-400 transition-colors">Masuk</button>
              <span className="hover:text-gray-400 transition-colors cursor-default">Privacy Policy</span>
              <span className="hover:text-gray-400 transition-colors cursor-default">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <AnimatePresence>{showModal && <DemoRequestModal onClose={() => setShowModal(false)} />}</AnimatePresence>
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
  const [form, setForm] = useState({ name:'', company:'', email:'', phone:'', employees:'11-50', message:'' });
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
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={e => e.stopPropagation()} className="w-full max-w-md glass-panel p-6 sm:p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center mx-auto mb-4"><CheckSquare size={32} className="text-[var(--success)]" /></div>
            <h3 className="text-xl font-serif font-bold text-white mb-2">Pesan Terkirim! 🎉</h3>
            <p className="text-sm text-gray-400">Tim kami akan menghubungi Anda dalam 1x24 jam.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-sm">SP</div>
              <div><h3 className="text-lg font-serif font-bold text-white">Demo Gratis</h3><p className="text-[10px] text-gray-500">Konsultasi 30 menit via Zoom/WA</p></div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Nama</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="John" /></div>
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Perusahaan</label><input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="PT. Contoh" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Email</label><input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="email@company.com" /></div>
                <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">No. HP</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none" placeholder="0812xxxx" /></div>
              </div>
              <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Jumlah Karyawan</label>
                <select value={form.employees} onChange={e => setForm({...form, employees: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                  <option>1-10</option><option>11-50</option><option>51-100</option><option>101-500</option><option>500+</option>
                </select>
              </div>
              <div><label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Pesan (opsional)</label>
                <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)]" placeholder="Ceritakan kebutuhan Anda..." />
              </div>
              <button type="submit" disabled={sending} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-50">
                {sending ? <><Loader2 size={16} className="animate-spin" /> Mengirim...</> : <><Send size={16} /> Kirim Permintaan Demo</>}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;
