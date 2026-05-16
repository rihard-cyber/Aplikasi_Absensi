import React, { useState, useRef, useCallback, Suspense } from 'react';
import { ShieldAlert, Globe, Activity, Settings, Key, Search, Users, Zap, BarChart3, ShieldCheck, MapPin, Home, Clock, FileText, User, Fingerprint, CheckCircle2, LogOut, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HRISExportWrapper from '../../components/HRISExportWrapper';
import { useSFX } from '../../utils/useSFX';
import { generatePin } from '../../utils/pinUtil';
import { useConfirm } from '../../components/ConfirmDialog';

const GlobalMap = React.lazy(() => import('./components/GlobalMap'));
const LuxuryMetrics = React.lazy(() => import('./components/LuxuryMetrics'));
const SecurityAudit = React.lazy(() => import('./components/SecurityAudit'));
const SaaSManagement = React.lazy(() => import('./components/SaaSManagement'));
const GlobalShiftView = React.lazy(() => import('./components/GlobalShiftView'));
const GlobalFinance = React.lazy(() => import('./components/GlobalFinance'));
const GlobalAudit = React.lazy(() => import('./components/GlobalAudit'));
const SubAdminDashboard = React.lazy(() => import('../SubAdmin/SubAdminDashboard'));

const LSusp = ({ children }) => <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[var(--aurora-3)]" /></div>}>{children}</Suspense>;

const CommandCenter = ({ onImpersonate, onCycleRole, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem('god_active_tab') || 'infrastructure'; } catch { return 'infrastructure'; }
  }); // infrastructure, operations
  const [bypassCode, setBypassCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showGodMenu, setShowGodMenu] = useState(false);
  const navigate = useNavigate();
  const { playClick, playConfirm, playAlert } = useSFX();
  const logoClickTimer = useRef(null);
  const confirm = useConfirm();

  // Prevent background scroll when God Menu is open
  React.useEffect(() => {
    if (showGodMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showGodMenu]);

  const [tenants, setTenants] = useState([]);
  const [selectedTenantBypass, setSelectedTenantBypass] = useState('all');

  React.useEffect(() => {
    try { sessionStorage.setItem('god_active_tab', activeTab); } catch {}
  }, [activeTab]);

  React.useEffect(() => {
    const fetchTenants = async () => {
      const { data } = await supabase.from('tenants').select('id, name');
      if (data) setTenants(data);
    };
    fetchTenants();
  }, []);

  const generateBypassCode = () => {
    const code = generatePin(selectedTenantBypass);
    setBypassCode(code);
    playConfirm();
  };

  const handleLogout = async () => {
    const ok = await confirm('Apakah Anda yakin ingin keluar dari God Mode?', 'Keluar');
    if (ok) {
      supabase.auth.signOut().catch(() => {});
      if (onLogout) onLogout();
    }
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
    <div className="min-h-screen p-3 flex flex-col gap-3 bg-[var(--bg-darker)] text-white relative overflow-x-hidden">
      {/* Background Aurora */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-20%] left-[20%] w-[40%] h-[40%] bg-[var(--aurora-2)] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-[var(--aurora-1)] rounded-full blur-[150px]"></div>
      </div>

      {/* God Mode Navigation Popup - FIXED CENTERED */}
      <AnimatePresence>
        {showGodMenu && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setShowGodMenu(false)}
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="relative z-[10000] w-full max-w-sm"
            >
              <div className="glass-panel p-6 sm:p-8 border border-[var(--warning)]/40 shadow-[0_0_80px_rgba(255,215,0,0.3)]">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--warning)]/10 border border-[var(--warning)]/30 mb-4">
                    <Zap size={14} className="text-[var(--warning)] animate-pulse" />
                    <span className="text-[10px] text-[var(--warning)] uppercase tracking-widest font-black">Authority Override</span>
                  </div>
                  <h2 className="font-serif text-2xl text-white tracking-wide">Navigasi Kilat</h2>
                  <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">Sistem Kendali Pusat</p>
                </div>

                <div className="space-y-4">
                  {navItems.map((item) => (
                    <motion.button
                      key={item.role}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGodNavigate(item.role)}
                      className="w-full flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all group"
                    >
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${item.color}20`, color: item.color, boxShadow: `0 0 20px ${item.color}40` }}
                      >
                        <item.icon size={22} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-white tracking-wide">{item.label}</p>
                        <p className="text-[10px] text-gray-400 mt-1 leading-tight opacity-70">{item.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setShowGodMenu(false)}
                  className="w-full mt-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                >
                  Tutup Sesi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center glass-panel p-3 sm:p-5 z-10 gap-3 lg:gap-0">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-10 w-full lg:w-auto">
          <div
            className="cursor-pointer select-none group active:scale-95"
            onClick={() => onCycleRole && onCycleRole()}
            title="Klik untuk Pindah Dasbor (God Mode)"
          >
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] group-hover:from-[var(--warning)] group-hover:to-[var(--danger)] transition-all duration-300">
              COMMAND CENTER
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 uppercase tracking-widest font-sans">Dasbor SaaS Global</p>
          </div>

          {/* God Mode Navigation Tabs - Desktop */}
          <nav className="hidden lg:flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('infrastructure')}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'infrastructure' ? 'bg-[var(--aurora-3)] text-black' : 'text-gray-500 hover:text-white'}`}
            >
              Infrastructure
            </button>
            <button 
              onClick={() => setActiveTab('operations')}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'operations' ? 'bg-[var(--aurora-1)] text-black' : 'text-gray-500 hover:text-white'}`}
            >
              Global Operations
            </button>
            <button 
              onClick={() => setActiveTab('shifts')}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'shifts' ? 'bg-[var(--warning)] text-black' : 'text-gray-500 hover:text-white'}`}
            >
              📅 Jadwal Global
            </button>
            <button 
              onClick={() => setActiveTab('finance')}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'finance' ? 'bg-[var(--success)] text-black' : 'text-gray-500 hover:text-white'}`}
            >
              💰 Finance
            </button>
            <button 
              onClick={() => setActiveTab('audit')}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-[var(--danger)] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              📋 Global Audit
            </button>
          </nav>
          {/* Mobile Tab Selector */}
          <div className="flex lg:hidden items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5 overflow-x-auto w-full">
            {['infrastructure', 'operations', 'shifts', 'finance', 'audit'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-4 py-3 rounded-lg text-[10px] sm:text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? tab === 'infrastructure' ? 'bg-[var(--aurora-3)] text-black'
                      : tab === 'operations' ? 'bg-[var(--aurora-1)] text-black'
                      : tab === 'shifts' ? 'bg-[var(--warning)] text-black'
                      : tab === 'finance' ? 'bg-[var(--success)] text-black'
                      : 'bg-[var(--danger)] text-white'
                    : 'text-gray-500'
                }`}
              >
                {tab === 'infrastructure' ? 'Infra' : tab === 'operations' ? 'Ops' : 'Jadwal'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 sm:gap-4 items-center w-full lg:w-auto justify-end flex-wrap">
          <HRISExportWrapper className="px-3 sm:px-4 py-2 rounded-xl border border-[var(--warning)]/30 hover:border-[var(--warning)]/50" label="Export" />
          <button
            onClick={() => playAlert()}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)] hover:text-white transition-all shadow-[0_0_15px_rgba(255,0,85,0.2)] text-[11px] sm:text-sm font-semibold"
          >
            <ShieldAlert size={14} className="sm:size-[16]" />
            <span className="hidden sm:inline">Siaran</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-[var(--danger)]/20 hover:text-[var(--danger)] hover:border-[var(--danger)]/50 transition-all text-[11px] sm:text-sm font-semibold"
          >
            <LogOut size={14} className="sm:size-[16]" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
          <div
            onClick={handleLogoClick}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center font-bold shadow-[0_0_20px_rgba(142,45,226,0.6)] border border-white/20 cursor-pointer hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all text-[11px] sm:text-sm"
            title="Klik untuk God Mode"
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
      <AnimatePresence mode="wait">
        {activeTab === 'infrastructure' && (
          <motion.div 
            key="infra" 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 20 }} 
            className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-4 flex-1 z-10 items-start"
          >
            <div className="lg:col-span-8 flex flex-col gap-4">
              <section className="glass-panel p-4 relative flex flex-col">
                <div className="relative z-20 mb-3">
                  <h2 className="font-serif text-lg tracking-wide flex items-center gap-3 text-white">
                    <Globe size={20} className="text-[var(--aurora-3)] animate-pulse" /> Peta Pengawasan Global
                  </h2>
                  <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-1 font-black">Live Satellite Infrastructure</p>
                </div>
                <div className="flex-1 rounded-2xl lg:rounded-3xl overflow-hidden border border-white/10 relative min-h-[300px]">
                  <LSusp><GlobalMap /></LSusp>
                </div>
              </section>
              <section className="glass-panel p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-serif text-lg tracking-wide flex items-center gap-3">
                      <Activity size={20} className="text-[var(--aurora-1)]" /> Analitik Pertumbuhan
                    </h2>
                    <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-1 font-black">Real-time Business Intelligence</p>
                  </div>
                </div>
                <div className="w-full h-[250px]"><LSusp><LuxuryMetrics /></LSusp></div>
              </section>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4">
              <section className="glass-panel p-4 border border-[var(--warning)]/30 bg-[var(--warning)]/[0.02]">
                <h2 className="font-serif text-lg tracking-wide mb-4 flex items-center gap-3 text-[var(--warning)]"><Key size={20} /> Master Bypass Console</h2>
                <div className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Target Entitas (Tenant)</label>
                    <select value={selectedTenantBypass} onChange={(e) => { setSelectedTenantBypass(e.target.value); setBypassCode(''); }} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-[var(--warning)]">
                      <option value="all" className="bg-[#0B0C10]">GLOBAL (Master PIN)</option>
                      {tenants.map(t => (<option key={t.id} value={t.id} className="bg-[#0B0C10]">{t.name}</option>))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active PIN</span>
                    <span className="text-xl font-mono font-bold text-[var(--warning)] tracking-widest">{bypassCode || '------'}</span>
                  </div>
                  <button onClick={generateBypassCode} className="w-full py-3 rounded-xl bg-[var(--warning)]/10 text-[var(--warning)] text-[10px] font-black uppercase tracking-widest border border-[var(--warning)]/20 hover:bg-[var(--warning)] hover:text-black transition-all">GENERATE PIN</button>
                </div>
              </section>
              <section className="glass-panel p-4 flex-1 flex flex-col overflow-visible min-h-[350px]">
                <LSusp><SaaSManagement onImpersonate={onImpersonate} searchQuery={searchQuery} /></LSusp>
              </section>
              <section className="glass-panel p-4 border border-[var(--danger)]/30">
                <h2 className="font-serif text-lg tracking-wide mb-4 flex items-center gap-3 text-[var(--danger)]"><ShieldAlert size={20} /> Audit Keamanan</h2>
                <LSusp><SecurityAudit searchQuery={searchQuery} /></LSusp>
              </section>
            </div>
          </motion.div>
        )}
        {activeTab === 'operations' && (
          <motion.div key="ops" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 z-10">
            <LSusp><SubAdminDashboard isEmbedded={true} initialTab="monitor" /></LSusp>
          </motion.div>
        )}
        {activeTab === 'shifts' && (
          <motion.div key="shifts" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 z-10">
            <LSusp><GlobalShiftView /></LSusp>
          </motion.div>
        )}
        {activeTab === 'finance' && (
          <motion.div key="finance" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 z-10">
            <LSusp><GlobalFinance /></LSusp>
          </motion.div>
        )}
        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 z-10">
            <LSusp><GlobalAudit /></LSusp>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommandCenter;
