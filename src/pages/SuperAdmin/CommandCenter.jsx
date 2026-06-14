import React, { useState, useRef, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, Globe, Activity, Settings, Search, Users, Zap, BarChart3, ShieldCheck, MapPin, Home, Clock, FileText, User, Fingerprint, CheckCircle2, LogOut, Loader2, Sparkles, DollarSign, Menu, Sun, Moon, Bell, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import HRISExportWrapper from '../../components/HRISExportWrapper';
import { useSFX } from '../../utils/useSFX';
import { useConfirm } from '../../components/ConfirmDialog';
import DeveloperWatermark from '../../components/DeveloperWatermark';
import BottomNav from '../../components/BottomNav';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../components/Notifications';

const bottomNavItems = [
  { id: 'infrastructure', label: 'Infra', icon: Globe },
  { id: 'operations', label: 'Operations', icon: Activity },
  { id: 'shifts', label: 'Jadwal', icon: Clock },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'menu', label: 'Menu', icon: Menu, isMenu: true }
];
import GlobalHeader from '../../components/GlobalHeader';
import DeveloperWatermarkBackground from '../../components/DeveloperWatermarkBackground';

const GlobalMap = React.lazy(() => import('./components/GlobalMap'));
const LuxuryMetrics = React.lazy(() => import('./components/LuxuryMetrics'));
const SecurityAudit = React.lazy(() => import('./components/SecurityAudit'));
const SaaSManagement = React.lazy(() => import('./components/SaaSManagement'));
const GlobalShiftView = React.lazy(() => import('./components/GlobalShiftView'));
const GlobalFinance = React.lazy(() => import('./components/GlobalFinance'));
const GlobalAudit = React.lazy(() => import('./components/GlobalAudit'));
const SubAdminDashboard = React.lazy(() => import('../SubAdmin/SubAdminDashboard'));
const DemoApproval = React.lazy(() => import('./components/DemoApproval'));
const TenantAuthorityControl = React.lazy(() => import('./components/TenantAuthorityControl'));

const LSusp = ({ children }) => <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[var(--aurora-3)]" /></div>}>{children}</Suspense>;

const CommandCenter = ({ onImpersonate, onCycleRole, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, setShowPanel } = useNotifications();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={18} className="text-orange-500 animate-pulse" />;
      case 'aurora': return <Zap size={18} className="text-purple-400" />;
      case 'neon': return <Activity size={18} className="text-cyan-400 animate-pulse" />;
      default: return <Moon size={18} className="text-blue-400" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Mode Terang';
      case 'aurora': return 'Mode Aurora';
      case 'neon': return 'Mode Neon';
      default: return 'Mode Gelap';
    }
  };

  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem('god_active_tab') || 'infrastructure'; } catch { return 'infrastructure'; }
  }); // infrastructure, operations
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showGodMenu, setShowGodMenu] = useState(false);
  const navigate = useNavigate();
  const { playClick, playConfirm, playAlert } = useSFX();
  const logoClickTimer = useRef(null);
  const confirm = useConfirm();
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [metrics, setMetrics] = useState({ activeTenants: 4, totalTenants: 5, activeUsers: 4800, maxUsers: 7800, validLicenses: 4 });

  const fetchSaaSMetrics = useCallback(async () => {
    try {
      const { data: tenantData } = await supabase.from('tenants').select('is_active, max_users, days_left');
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      if (tenantData) {
        const total = tenantData.length;
        const active = tenantData.filter(t => t.is_active).length;
        const maxUsrs = tenantData.reduce((acc, t) => acc + (t.max_users || 0), 0);
        const validLics = tenantData.filter(t => t.days_left > 30).length;
        
        setMetrics({
          activeTenants: active,
          totalTenants: total || 1,
          activeUsers: totalUsers || 0,
          maxUsers: maxUsrs || 100,
          validLicenses: validLics
        });
      }
    } catch (err) {
      console.warn("Metrics fetch failed", err);
    }
  }, []);

  React.useEffect(() => {
    fetchSaaSMetrics();
  }, [fetchSaaSMetrics]);

  React.useEffect(() => {
    const fetchTerminalLogs = async () => {
      try {
        const { data: auditData } = await supabase
          .from('audit_logs')
          .select('id, action, details, created_at, user_id')
          .order('created_at', { ascending: false })
          .limit(10);
          
        const { data: attendanceData } = await supabase
          .from('attendance_logs')
          .select('id, action, status, timestamp, user_id, profiles(full_name)')
          .order('timestamp', { ascending: false })
          .limit(10);
          
        let logsList = [];
        
        if (auditData) {
          for (const log of auditData) {
            let userName = 'Sistem';
            if (log.user_id) {
              const { data: prof } = await supabase.from('profiles').select('full_name').eq('auth_id', log.user_id).maybeSingle();
              if (prof) userName = prof.full_name;
            }
            logsList.push({
              time: new Date(log.created_at).toLocaleTimeString('id-ID'),
              timestamp: new Date(log.created_at).getTime(),
              text: `⚙️ [AUDIT] Aksi ${log.action}: ${log.details || ''} oleh ${userName}`,
              color: log.action.includes('DEACTIVATE') || log.action.includes('KILL') ? '#FF0055' : log.action.includes('ACTIVATE') || log.action.includes('EXTEND') ? '#00FF87' : '#00C9FF'
            });
          }
        }
        
        if (attendanceData) {
          attendanceData.forEach(log => {
            logsList.push({
              time: new Date(log.timestamp).toLocaleTimeString('id-ID'),
              timestamp: new Date(log.timestamp).getTime(),
              text: `👤 [ABSENSI] ${log.profiles?.full_name || 'Karyawan'} - ${log.action === 'CLOCK_IN' ? 'CLOCK IN' : 'CLOCK OUT'} (${log.status})`,
              color: log.status === 'LATE' ? '#FFD700' : log.status === 'OUT_OF_RANGE' ? '#FF0055' : '#00FF87'
            });
          });
        }
        
        logsList.sort((a, b) => b.timestamp - a.timestamp);
        setTerminalLogs(logsList.slice(0, 15));
      } catch (err) {
        console.warn("Terminal logs initial fetch failed", err);
      }
    };

    fetchTerminalLogs();

    const auditChannel = supabase
      .channel('realtime:audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, async (payload) => {
        const newLog = payload.new;
        let userName = 'Sistem';
        if (newLog.user_id) {
          const { data: prof } = await supabase.from('profiles').select('full_name').eq('auth_id', newLog.user_id).maybeSingle();
          if (prof) userName = prof.full_name;
        }
        const now = new Date(newLog.created_at).toLocaleTimeString('id-ID');
        const text = `⚙️ [AUDIT] Aksi ${newLog.action}: ${newLog.details || ''} oleh ${userName}`;
        const color = newLog.action.includes('DEACTIVATE') || newLog.action.includes('KILL') ? '#FF0055' : newLog.action.includes('ACTIVATE') || newLog.action.includes('EXTEND') ? '#00FF87' : '#00C9FF';
        
        setTerminalLogs(prev => [
          { time: now, text, color, timestamp: new Date(newLog.created_at).getTime() },
          ...prev
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15));
        fetchSaaSMetrics();
      })
      .subscribe();

    const attendanceChannel = supabase
      .channel('realtime:attendance_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, async (payload) => {
        const newLog = payload.new;
        let userName = 'Karyawan';
        if (newLog.user_id) {
          const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', newLog.user_id).maybeSingle();
          if (prof) userName = prof.full_name;
        }
        const now = new Date(newLog.timestamp).toLocaleTimeString('id-ID');
        const text = `👤 [ABSENSI] ${userName} - ${newLog.action === 'CLOCK_IN' ? 'CLOCK IN' : 'CLOCK OUT'} (${newLog.status})`;
        const color = newLog.status === 'LATE' ? '#FFD700' : newLog.status === 'OUT_OF_RANGE' ? '#FF0055' : '#00FF87';
        
        setTerminalLogs(prev => [
          { time: now, text, color, timestamp: new Date(newLog.timestamp).getTime() },
          ...prev
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15));
        fetchSaaSMetrics();
      })
      .subscribe();

    const profileChannel = supabase
      .channel('realtime:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newProf = payload.new;
          const now = new Date(newProf.created_at).toLocaleTimeString('id-ID');
          const text = `🆕 [PENGGUNA] Akun baru terdaftar: ${newProf.full_name} (${newProf.nip || 'Tanpa NIP'}) - ${newProf.position || 'Staff'}`;
          const color = '#8E2DE2';
          
          setTerminalLogs(prev => [
            { time: now, text, color, timestamp: new Date(newProf.created_at).getTime() },
            ...prev
          ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15));
        }
        fetchSaaSMetrics();
      })
      .subscribe();

    const tenantChannel = supabase
      .channel('realtime:tenants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newT = payload.new;
          const now = new Date(newT.created_at).toLocaleTimeString('id-ID');
          const text = `🏢 [SaaS] Tenant Baru Terdaftar: ${newT.name} (${newT.tier})`;
          const color = '#00C9FF';
          
          setTerminalLogs(prev => [
            { time: now, text, color, timestamp: new Date(newT.created_at).getTime() },
            ...prev
          ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15));
        }
        fetchSaaSMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(auditChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(tenantChannel);
    };
  }, [fetchSaaSMetrics]);

  // Prevent background scroll when God Menu is open
  React.useEffect(() => {
    if (showGodMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showGodMenu]);

  React.useEffect(() => {
    try { sessionStorage.setItem('god_active_tab', activeTab); } catch {}
  }, [activeTab]);

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

  const superNavItems = [
    { key: 'infrastructure', label: 'Infrastructure', icon: Globe, color: 'var(--aurora-3)' },
    { key: 'operations', label: 'Global Operations', icon: Activity, color: 'var(--aurora-1)' },
    { key: 'authority', label: 'Otoritas & Tenant', icon: Shield, color: 'var(--warning)' },
    { key: 'shifts', label: 'Jadwal Global', icon: Clock, color: 'var(--warning)' },
    { key: 'finance', label: 'Finance', icon: DollarSign, color: 'var(--success)' },
    { key: 'audit', label: 'Global Audit', icon: FileText, color: 'var(--danger)' },
    { key: 'demos', label: 'Demo', icon: Sparkles, color: 'var(--success)' },
  ];

  const SUPER_NAV_BTN = (active) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
      ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5 font-bold'
      : 'text-gray-400 hover:bg-white/5 hover:text-white'}`;

  const getTabTitle = () => {
    switch (activeTab) {
      case 'infrastructure': return 'SaaS Infrastructure';
      case 'operations': return 'Global Operations';
      case 'authority': return 'Otoritas & Tenant';
      case 'shifts': return 'Jadwal Global';
      case 'finance': return 'Keuangan Global';
      case 'audit': return 'Global Audit Trail';
      case 'demos': return 'Demo & Uji Coba';
      default: return 'Super Admin Panel';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-darker)] flex text-white relative overflow-hidden">
      <DeveloperWatermarkBackground theme="dark" />
      {/* Background Aurora */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-20%] left-[20%] w-[40%] h-[40%] bg-[var(--aurora-2)] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-[var(--aurora-1)] rounded-full blur-[150px]"></div>
      </div>

      {/* God Mode Navigation Popup - FIXED CENTERED */}
      {createPortal(
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
                className="relative z-10 w-full max-w-sm overflow-y-auto max-h-[90vh] custom-scrollbar"
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
        </AnimatePresence>,
        document.body
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed lg:relative top-0 left-0 z-[90] h-full lg:h-[calc(100vh-32px)] w-[85vw] max-w-sm lg:w-72 m-0 lg:m-4 transition-all duration-500 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full bg-white/5 backdrop-blur-lg border border-white/10 p-6 flex flex-col gap-2 rounded-none lg:rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          {/* Logo */}
          <div className="mb-8 lg:mb-10 px-2 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center font-serif font-bold text-white text-2xl logo-3d-spin shadow-[0_0_15px_rgba(142,45,226,0.4)] shrink-0">
              SA
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-sm font-bold leading-tight tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 truncate">
                COMMAND CENTER
              </h2>
              <span className="text-[8px] text-[var(--aurora-3)] uppercase tracking-widest font-black block mt-0.5">GLOBAL SAAS CONTROL</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-1 min-h-0">
            {superNavItems.map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setIsSidebarOpen(false); playClick(); }}
                  className={SUPER_NAV_BTN(activeTab === item.key)}
                >
                  <IconComp size={18} style={{ color: activeTab === item.key ? item.color : undefined }} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:bg-white/5 hover:text-white">
              {getThemeIcon()}<span className="text-sm">{getThemeLabel()}</span>
            </button>
            <button onClick={() => { setIsSidebarOpen(false); setShowPanel(true); }} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-gray-400 hover:bg-white/5 hover:text-white">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-gray-400" />
                <span className="text-sm">Notifikasi</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold shadow-lg">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setIsSidebarOpen(false); setShowGodMenu(true); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-cyan-400 hover:bg-white/5 hover:text-cyan-300"
            >
              <Settings size={18} className="animate-[spin_8s_linear_infinite] text-cyan-400" />
              <span className="text-sm">Pengaturan God Mode</span>
            </button>
            <HRISExportWrapper className="w-full justify-start py-3 border-none bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white" label="Export Database" />
            <button
              onClick={() => { setIsSidebarOpen(false); handleLogoClick(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:bg-white/5 hover:text-[var(--warning)]"
            >
              <Zap size={18} className="text-[var(--warning)] animate-pulse" />
              <span className="text-sm">Authority override</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              <LogOut size={18} />
              <span className="text-sm uppercase font-bold">Keluar</span>
            </button>
            
            {/* Developer Watermark Signature */}
            <DeveloperWatermark />
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] lg:hidden" />}

      {/* Main Content Area */}
      <main id="main-scroll-container" className="flex-1 p-0 z-10 overflow-y-auto flex flex-col">
        <GlobalHeader 
          title={getTabTitle()} 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        <div className="w-full max-w-7xl mx-auto px-4 flex-1 mt-2 sm:mt-4 flex flex-col gap-4 pb-24 lg:pb-10">
      {/* Main Grid Layout */}
      <AnimatePresence mode="wait">
        {activeTab === 'infrastructure' && (
          <div className="flex flex-col gap-4 w-full">
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

            {/* Premium JDC-Inspired Cyber HUD Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 z-10 relative mb-4">
              {/* Concentric Gauge */}
              <div className="glass-panel p-5 border border-white/10 flex flex-col justify-between">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-2 mb-3">
                  <Activity size={12} className="text-[var(--aurora-3)] animate-pulse" />
                  Kesehatan SaaS Global
                </div>
                <div className="flex items-center justify-between gap-4">
                  <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="30" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="20" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    
                    {/* Outer Ring: Tenant Active */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--aurora-3)" strokeWidth="6" 
                      strokeDasharray="251.3" strokeDashoffset={251.3 - (Math.min(100, (metrics.activeTenants / metrics.totalTenants) * 100) / 100) * 251.3} 
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                    
                    {/* Middle Ring: User Utilization */}
                    <circle cx="50" cy="50" r="30" fill="transparent" stroke="var(--aurora-1)" strokeWidth="6" 
                      strokeDasharray="188.5" strokeDashoffset={188.5 - (Math.min(100, (metrics.activeUsers / metrics.maxUsers) * 100) / 100) * 188.5} 
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                    
                    {/* Inner Ring: Valid License */}
                    <circle cx="50" cy="50" r="20" fill="transparent" stroke="var(--success)" strokeWidth="6" 
                      strokeDasharray="125.7" strokeDashoffset={125.7 - (Math.min(100, (metrics.validLicenses / metrics.totalTenants) * 100) / 100) * 125.7} 
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                  </svg>
                  <div className="flex flex-col gap-1.5 text-[11px] text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--aurora-3)' }} />
                      <span>Tenant: <strong>{Math.round((metrics.activeTenants / metrics.totalTenants) * 100)}%</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--aurora-1)' }} />
                      <span>Util: <strong>{Math.round((metrics.activeUsers / metrics.maxUsers) * 100)}%</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
                      <span>License: <strong>{Math.round((metrics.validLicenses / metrics.totalTenants) * 100)}%</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Capacity Growth Capsule */}
              <div className="glass-panel p-5 border border-white/10 flex flex-col justify-between">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-2">
                  <Users size={12} className="text-[var(--aurora-1)]" />
                  Utilisasi Kapasitas User
                </div>
                <div className="flex items-center justify-between gap-4 mt-2">
                  <div className="text-[11px] text-gray-400 flex flex-col gap-1">
                    <div>Total Limit: <strong className="text-white">{metrics.maxUsers.toLocaleString()}</strong></div>
                    <div>Digunakan: <strong className="text-[var(--aurora-3)]">{metrics.activeUsers.toLocaleString()}</strong></div>
                    <div>Sisa Kuota: <strong className="text-[var(--success)]">{(metrics.maxUsers - metrics.activeUsers).toLocaleString()}</strong></div>
                  </div>
                  
                  <div style={{ position: 'relative', width: '100px', height: '50px', flexShrink: 0 }}>
                    <svg width="100" height="50" viewBox="0 0 120 60">
                      <defs>
                        <linearGradient id="userCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--aurora-3)" />
                          <stop offset="100%" stopColor="var(--aurora-1)" />
                        </linearGradient>
                      </defs>
                      <path d="M 25,10 H 95 A 18,18 0 0,1 113,28 A 18,18 0 0,1 95,46 H 25 A 18,18 0 0,1 7,28 A 18,18 0 0,1 25,10 Z"
                        fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                      <path d="M 25,10 H 95 A 18,18 0 0,1 113,28 A 18,18 0 0,1 95,46 H 25 A 18,18 0 0,1 7,28 A 18,18 0 0,1 25,10 Z"
                        fill="transparent" stroke="url(#userCapGrad)" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray="265" strokeDashoffset={265 - (Math.min(100, (metrics.activeUsers / metrics.maxUsers) * 100) / 100) * 265}
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                    </svg>
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                      fontSize: '11px', fontWeight: 800, color: 'white'
                    }}>
                      {Math.round((metrics.activeUsers / metrics.maxUsers) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Monospace Activity Console Log */}
              <div className="glass-panel p-5 border border-white/10 md:col-span-2 flex flex-col bg-[#090d16]/90">
                <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 201, 255, 0.1)', paddingBottom: '0.4rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontFamily: 'Consolas, monospace', fontSize: '10px', fontWeight: 'bold', color: 'var(--aurora-3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--aurora-3)] animate-ping" />
                    SYSTEM CORE ACTIVITY LOG
                  </span>
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>SECURE CHANNEL ACTIVE</span>
                </div>
                <div className="custom-scrollbar flex-1 overflow-y-auto max-h-[80px]" style={{ fontFamily: 'Consolas, monospace', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {terminalLogs.map((log, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', color: '#8892b0', lineHeight: '1.3' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }}>[{log.time}]</span>
                      <span style={{ color: log.color }}>{log.text}</span>
                    </div>
                  ))}
                  {terminalLogs.length === 0 && (
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', textAlign: 'center', paddingTop: '10px' }}>
                      Menunggu log aktivitas core...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Summary Banner */}
            <div className="glass-panel p-4 z-10 relative mb-4" style={{
              background: 'linear-gradient(135deg, rgba(142,45,226,0.08) 0%, rgba(0,201,255,0.08) 100%)',
              border: '1px solid rgba(0,201,255,0.2)'
            }}>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[var(--aurora-3)]" />
                  <h4 className="text-xs font-black uppercase tracking-[0.1em] text-white">AI SaaS Performance Summary</h4>
                </div>
                <span className="text-[9px] text-[var(--aurora-3)] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Zap size={10} className="animate-pulse" /> Auto-Generated
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed italic m-0">
                "Ringkasan SaaS Core: Pengawasan global mengidentifikasi {metrics.activeTenants} dari {metrics.totalTenants} tenant beroperasi aktif ({Math.round((metrics.activeTenants/metrics.totalTenants)*100)}% uptime). Total limit pengguna terdaftar mencapai {metrics.maxUsers} akun dengan rasio utilisasi {Math.round((metrics.activeUsers/metrics.maxUsers)*100)}%. Sistem mencatat {metrics.validLicenses} tenant memiliki lisensi sehat (&gt;30 hari). Log audit core mendeteksi anomali 0% ancaman keamanan eksternal."
              </p>
            </div>

            <motion.div 
              key="infra" 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 20 }} 
              className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-4 flex-1 z-10 items-start"
            >
            <div className="lg:col-span-8 flex flex-col gap-4">
              <section className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative flex flex-col overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--aurora-3)]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="relative z-20 mb-3">
                  <h2 className="font-serif text-lg tracking-wide flex items-center gap-3 text-white">
                    <span className="w-8 h-8 rounded-lg bg-[var(--aurora-3)]/10 flex items-center justify-center shadow-[0_0_12px_rgba(0,201,255,0.2)]"><Globe size={16} className="text-[var(--aurora-3)]" /></span>
                    Peta Pengawasan Global
                  </h2>
                  <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-1 font-black">Live Satellite Infrastructure</p>
                </div>
                <div className="flex-1 rounded-2xl lg:rounded-3xl overflow-hidden border border-white/10 relative min-h-[300px] bg-black/20">
                  <LSusp><GlobalMap /></LSusp>
                </div>
              </section>
              <section className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-48 h-48 bg-[var(--aurora-1)]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-serif text-lg tracking-wide flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[var(--aurora-1)]/10 flex items-center justify-center shadow-[0_0_12px_rgba(142,45,226,0.2)]"><Activity size={16} className="text-[var(--aurora-1)]" /></span>
                      Analitik Pertumbuhan
                    </h2>
                    <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-1 font-black">Real-time Business Intelligence</p>
                  </div>
                </div>
                <div className="w-full h-[250px]"><LSusp><LuxuryMetrics /></LSusp></div>
              </section>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4">
              <section className="bg-white/5 backdrop-blur-lg border border-amber-500/30 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--warning)]/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />
                <h2 className="font-serif text-lg tracking-wide mb-4 flex items-center gap-3 text-amber-400">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.2)]"><ShieldCheck size={16} className="text-amber-400" /></span>
                  Otorisasi Export
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Export HRIS memakai role profil Supabase dan RLS database. PIN deterministik dan master bypass sudah dinonaktifkan untuk mode rilis.
                </p>
                <div className="mt-4 w-full h-px bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent" />
              </section>
              <section className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex-1 flex flex-col overflow-visible min-h-[350px] relative">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent pointer-events-none" />
                <LSusp><SaaSManagement onImpersonate={onImpersonate} searchQuery={searchQuery} /></LSusp>
              </section>
              <section className="bg-white/5 backdrop-blur-lg border border-rose-500/30 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent pointer-events-none" />
                <h2 className="font-serif text-lg tracking-wide mb-4 flex items-center gap-3 text-rose-400">
                  <span className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.2)]"><ShieldAlert size={16} className="text-rose-400" /></span>
                  Audit Keamanan
                </h2>
                <LSusp><SecurityAudit searchQuery={searchQuery} /></LSusp>
              </section>
            </div>
          </motion.div>
          </div>
        )}
        {activeTab === 'operations' && (
          <motion.div key="ops" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 z-10">
            <LSusp><SubAdminDashboard isEmbedded={true} initialTab="monitor" /></LSusp>
          </motion.div>
        )}
        {activeTab === 'authority' && (
          <motion.div key="authority" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 z-10">
            <LSusp><TenantAuthorityControl searchQuery={searchQuery} /></LSusp>
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
        {activeTab === 'demos' && (
          <motion.div key="demos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 z-10">
            <LSusp><DemoApproval searchQuery={searchQuery} /></LSusp>
          </motion.div>
        )}
      </AnimatePresence>
        </div>

        {/* Clean JDC-Style centered footer */}
        <footer className="app-footer pb-28 lg:pb-8">
          <span>© 2026 <strong className="text-[var(--aurora-3)]">Aplikasi Absensi</strong>. Hak Cipta Dilindungi.</span>
          <DeveloperWatermark />
        </footer>
      </main>

      {/* Bottom Navigation for Mobile */}
      <BottomNav
        currentTab={activeTab}
        onNavClick={(tab) => setActiveTab(tab)}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        isSidebarOpen={isSidebarOpen}
        items={bottomNavItems}
      />
    </div>
  );
};

export default CommandCenter;
