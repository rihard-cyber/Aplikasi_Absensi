import React, { useState, useRef, useCallback } from 'react';
import { ShieldAlert, Globe, Activity, Settings, Key, Search, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GlobalMap from './components/GlobalMap';
import LuxuryMetrics from './components/LuxuryMetrics';
import SecurityAudit from './components/SecurityAudit';
import SaaSManagement from './components/SaaSManagement';
import { useSFX } from '../../utils/useSFX';

const CommandCenter = ({ onImpersonate }) => {
  const [bypassCode, setBypassCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showGodMenu, setShowGodMenu] = useState(false);
  const navigate = useNavigate();
  const { playClick, playConfirm, playAlert } = useSFX();
  const logoClickTimer = useRef(null);

  const generateBypassCode = () => {
    const code = 'BYPASS-' + Math.floor(1000 + Math.random() * 9000);
    setBypassCode(code);
    playConfirm();
  };

  // God Mode Logo Double-Click Navigation
  const handleLogoClick = useCallback(() => {
    playClick();
    setLogoClickCount(prev => {
      const next = prev + 1;
      if (logoClickTimer.current) clearTimeout(logoClickTimer.current);

      if (next >= 2) {
        setShowGodMenu(true);
        playAlert();
        logoClickTimer.current = null;
        return 0;
      }

      logoClickTimer.current = setTimeout(() => setLogoClickCount(0), 600);
      return next;
    });
  }, [playClick, playAlert]);

  const handleGodNavigate = (role) => {
    playConfirm();
    setShowGodMenu(false);
    onImpersonate(role);
    if (role === 'TENANT_ADMIN') navigate('/tenantadmin');
    else if (role === 'EMPLOYEE') navigate('/');
  };

  const navItems = [
    { label: 'Dasbor Tenant Admin', icon: Settings, role: 'TENANT_ADMIN', color: 'var(--aurora-1)', desc: 'Kelola payroll, persetujuan & audit' },
    { label: 'Dasbor Karyawan', icon: Users, role: 'EMPLOYEE', color: 'var(--aurora-3)', desc: 'Cek absensi & profil karyawan' },
  ];

  return (
    <div className="min-h-screen p-6 lg:p-8 flex flex-col gap-6 bg-[var(--bg-darker)] text-white relative overflow-hidden">
      {/* Background Aurora */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-20%] left-[20%] w-[40%] h-[40%] bg-[var(--aurora-2)] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-[var(--aurora-1)] rounded-full blur-[150px]"></div>
      </div>

      {/* God Mode Navigation Popup */}
      <AnimatePresence>
        {showGodMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowGodMenu(false)}
            />
            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
            >
              <div className="glass-panel p-6 border border-[var(--warning)]/40 shadow-[0_0_60px_rgba(255,215,0,0.2)]">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--warning)]/10 border border-[var(--warning)]/30 mb-3">
                    <Zap size={12} className="text-[var(--warning)] animate-pulse" />
                    <span className="text-[10px] text-[var(--warning)] uppercase tracking-widest font-bold">God Mode Aktif</span>
                  </div>
                  <h3 className="font-serif text-xl text-white tracking-wide">Navigasi Kilat</h3>
                  <p className="text-xs text-gray-400 mt-1">Pilih dasbor tujuan Anda</p>
                </div>

                <div className="space-y-3">
                  {navItems.map((item) => (
                    <motion.button
                      key={item.role}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGodNavigate(item.role)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-left transition-all group"
                      style={{ '--item-color': item.color }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${item.color}20`, color: item.color, boxShadow: `0 0 15px ${item.color}40` }}
                      >
                        <item.icon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white tracking-wide">{item.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setShowGodMenu(false)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex justify-between items-center glass-panel p-5 z-10">
        <div
          className="cursor-pointer select-none group"
          onClick={handleLogoClick}
          title="Klik 2x untuk God Mode Navigation"
        >
          <h1 className="text-3xl font-serif font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] group-hover:from-[var(--warning)] group-hover:to-[var(--danger)] transition-all duration-300">
            COMMAND CENTER
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-sans">
            Dasbor Infrastruktur SaaS Global
            {logoClickCount === 1 && <span className="text-[var(--warning)] ml-2 animate-pulse">· klik sekali lagi...</span>}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => playAlert()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)] hover:text-white transition-all shadow-[0_0_15px_rgba(255,0,85,0.2)] text-sm font-semibold"
          >
            <ShieldAlert size={16} /> Siaran Sistem
          </button>
          <div
            onClick={handleLogoClick}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center font-bold shadow-[0_0_20px_rgba(142,45,226,0.6)] border border-white/20 cursor-pointer hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all"
            title="Klik 2x untuk God Mode"
          >
            SA
          </div>
        </div>
      </header>

      {/* Global Search Bar */}
      <div className="relative z-10">
        <div className="relative glass-panel rounded-2xl overflow-hidden border border-white/5 hover:border-[var(--aurora-3)]/30 transition-all focus-within:border-[var(--aurora-3)]/50 focus-within:shadow-[0_0_20px_rgba(0,201,255,0.1)]">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama perusahaan, nama karyawan, NIP, atau jenis ancaman keamanan..."
            className="w-full bg-transparent py-4 pl-12 pr-5 text-white placeholder-gray-600 text-sm outline-none font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors text-xs font-bold tracking-widest"
            >
              CLEAR
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-[var(--aurora-3)] mt-2 ml-1 font-sans">
            Memfilter hasil untuk: <span className="font-bold">"{searchQuery}"</span>
          </p>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 z-10">

        {/* Left Column: Map & Analytics */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <section className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-6 left-6 z-10">
              <h2 className="font-serif text-xl tracking-wide flex items-center gap-3">
                <Globe size={22} className="text-[var(--aurora-3)]" /> Peta Persebaran Global
              </h2>
            </div>
            <div className="w-full h-[420px] mt-12 rounded-2xl overflow-hidden border border-white/10 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0C10] z-10 pointer-events-none opacity-50"></div>
              <GlobalMap />
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="font-serif text-xl tracking-wide mb-6 flex items-center gap-3">
              <Activity size={22} className="text-[var(--aurora-1)]" /> Metrik Pertumbuhan Bisnis
            </h2>
            <div className="w-full h-[300px]">
              <LuxuryMetrics />
            </div>
          </section>
        </div>

        {/* Right Column: Management & Security */}
        <div className="flex flex-col gap-6">
          {/* Master Bypass Code */}
          <section className="glass-panel p-5 border border-[var(--warning)]/30">
            <h2 className="font-serif text-lg tracking-wide mb-3 flex items-center gap-3 text-[var(--warning)]">
              <Key size={20} /> Master Bypass Code
            </h2>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">Kode darurat untuk akses tanpa OTP jika sistem email sedang gangguan.</p>
            <div className="flex gap-3 items-center">
              <button
                onClick={generateBypassCode}
                className="bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20 border border-[var(--warning)]/30 px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs transition-all whitespace-nowrap"
              >
                Generate Kode
              </button>
              <AnimatePresence>
                {bypassCode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#1A1C23] border border-[var(--warning)]/30 px-4 py-2.5 rounded-xl flex-1 text-center text-[var(--warning)] font-mono tracking-widest text-sm shadow-[0_0_15px_rgba(255,215,0,0.1)]"
                  >
                    {bypassCode}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* SaaS Management */}
          <section className="glass-panel p-5 flex-1">
            <h2 className="font-serif text-lg tracking-wide mb-4 flex items-center gap-3">
              <Settings size={20} className="text-[var(--aurora-2)]" /> Manajemen SaaS
            </h2>
            <SaaSManagement onImpersonate={onImpersonate} searchQuery={searchQuery} />
          </section>

          {/* Security Audit */}
          <section className="glass-panel p-5 border border-[var(--danger)]/30 shadow-[0_0_30px_rgba(255,0,85,0.05)]">
            <h2 className="font-serif text-lg tracking-wide mb-4 flex items-center gap-3 text-[var(--danger)]">
              <ShieldAlert size={20} /> Audit Keamanan
            </h2>
            <SecurityAudit searchQuery={searchQuery} />
          </section>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
